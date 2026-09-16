import { useEffect, useState } from 'react';
import { socket } from '../lib/socket';
import { serverClock } from '../lib/serverClock';

export function useServerClock({ active = true, serverNow, intervalMs = 100 } = {}) {
  const [now, setNow] = useState(() => serverClock.now());

  useEffect(() => {
    serverClock.observe(serverNow);
    setNow(serverClock.now());
  }, [serverNow]);

  useEffect(() => {
    if (!active) return undefined;
    let disposed = false;
    const samples = new Set();
    const sample = () => {
      if (disposed || !socket.connected) return;
      const sentAt = performance.now();
      socket.timeout(2000).emit('war:clock', (error, payload) => {
        if (disposed || error) return;
        serverClock.sample(payload?.serverNow, sentAt);
        setNow(serverClock.now());
      });
    };
    const synchronize = () => {
      samples.forEach(clearTimeout);
      samples.clear();
      sample();
      for (const delay of [150, 450]) {
        const timer = setTimeout(() => { samples.delete(timer); sample(); }, delay);
        samples.add(timer);
      }
      setNow(serverClock.now());
    };
    const onVisible = () => { if (document.visibilityState === 'visible') synchronize(); };
    socket.on('connect', synchronize);
    document.addEventListener('visibilitychange', onVisible);
    synchronize();
    const syncTimer = setInterval(sample, 30000);
    const tickTimer = setInterval(() => setNow(serverClock.now()), intervalMs);
    return () => {
      disposed = true;
      socket.off('connect', synchronize);
      document.removeEventListener('visibilitychange', onVisible);
      samples.forEach(clearTimeout);
      clearInterval(syncTimer);
      clearInterval(tickTimer);
    };
  }, [active, intervalMs]);

  return now;
}
