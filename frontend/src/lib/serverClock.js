// Anchor server time to a monotonic clock so device clock changes cannot skip a countdown.
export function createServerClock({ monotonicNow = () => performance.now(), wallNow = () => Date.now() } = {}) {
  let anchor = { server: wallNow(), local: monotonicNow() };
  let bestRoundTrip = Infinity;
  let lastSampleAt = -Infinity;
  let observed = false;
  return {
    now: () => anchor.server + monotonicNow() - anchor.local,
    observe(serverNow) {
      if (!Number.isFinite(serverNow) || observed) return;
      anchor = { server: serverNow, local: monotonicNow() };
      observed = true;
    },
    sample(serverNow, sentAt, receivedAt = monotonicNow()) {
      const roundTrip = receivedAt - sentAt;
      if (!Number.isFinite(serverNow) || !Number.isFinite(roundTrip) || roundTrip < 0) return;
      // Prefer the least delayed reply; refresh the estimate after reconnects/sleep.
      if (roundTrip > bestRoundTrip && receivedAt - lastSampleAt < 20000) return;
      anchor = { server: serverNow + roundTrip / 2, local: receivedAt };
      bestRoundTrip = roundTrip;
      lastSampleAt = receivedAt;
      observed = true;
    }
  };
}

export const serverClock = createServerClock();

export function warCountdownSeconds(startsAt, now) {
  return startsAt ? Math.min(5, Math.max(0, Math.ceil((startsAt - now) / 1000))) : 5;
}
