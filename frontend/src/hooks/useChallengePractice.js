import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';

export function useChallengePractice({ challengeId, room, files, user, snapshot }) {
  const [status, setStatus] = useState('');
  const [history, setHistory] = useState([]);
  const [mobileImage, setMobileImage] = useState(null);
  const latest = useRef({ files, snapshot });
  latest.current = { files, snapshot };
  const queue = useRef(Promise.resolve());
  const lastSaved = useRef(new Map());
  const enabled = Boolean(challengeId && room?.challengeId === challengeId && user?.uid === room?.ownerUserId);
  function saveNow() {
    if (!enabled) return Promise.resolve();
    const currentFiles = latest.current.snapshot?.() || latest.current.files;
    const serialized = JSON.stringify(currentFiles);
    if (serialized === lastSaved.current.get(challengeId)) return queue.current;
    setStatus('Saving draft…');
    queue.current = queue.current.catch(() => {}).then(async () => {
      try {
        await api.request(`/api/challenge/work/${challengeId}`, { method: 'PATCH', body: JSON.stringify({ files: currentFiles }) });
        lastSaved.current.set(challengeId, serialized);
        setStatus('Draft saved to your account');
      } catch (error) { setStatus(`Draft not saved: ${error.message}`); throw error; }
    });
    return queue.current;
  }
  useEffect(() => {
    let active = true;
    setHistory([]); setMobileImage(null);
    if (!enabled) return;
    api.request(`/api/challenge/work/${challengeId}`).then(draft => { if (active) setHistory(draft.history || []); }).catch(error => { if (active) setStatus(error.message); });
    api.request(`/api/challenge/targets/${challengeId}`).then(target => { if (active) setMobileImage(target.mobileImage); }).catch(error => { if (active) setStatus(error.message); });
    const timer = setInterval(() => { saveNow().catch(() => {}); }, 5000);
    return () => { active = false; clearInterval(timer); };
    // The timer reads live editor content through latest rather than restarting on every keystroke.
  }, [challengeId, enabled]);
  return { status, history, mobileImage, saveNow, record: result => setHistory(items => [...items, { id: result.attemptId, score: result.score, submittedAt: Date.now() }]) };
}
