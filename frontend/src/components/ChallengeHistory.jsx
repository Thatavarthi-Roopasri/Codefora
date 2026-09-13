import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { saveHostToken, saveInviteCode } from '../lib/navigation';

export function ChallengeHistory({ user }) {
  const navigate = useNavigate();
  const [attempts, setAttempts] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [filter, setFilter] = useState('all');
  const [snapshot, setSnapshot] = useState(null);
  async function inspect(id) {
    try { setSnapshot(await api.request(`/api/challenge/attempts/${id}`)); }
    catch (err) { setError(err.message); }
  }
  useEffect(() => {
    let active = true;
    setAttempts([]); setSnapshot(null); setError('');
    if (!user?.uid) return;
    api.request('/api/challenge/work').then(data => { if (active) setAttempts(data.attempts); }).catch(err => { if (active) setError(err.message); });
    return () => { active = false; };
  }, [user?.uid]);
  async function resume(attempt) {
    setBusy(attempt.id); setError('');
    try {
      const [draft, target] = await Promise.all([api.request(`/api/challenge/work/${attempt.id}`), api.request(`/api/challenge/targets/${attempt.challengeId}`)]);
      const room = await api.createRoom({ name: `UI Practice ${Date.now().toString(36)}`, username: user.displayName || 'Developer', userId: user.uid, visibility: 'private', isChallenge: true, problemId: 'ui-battle', initialLanguage: 'html', files: draft.files, challengeId: target.challengeId, targetImage: target.targetImage, challengeDifficulty: target.difficulty });
      saveHostToken(room.id, room.hostToken); if (room.inviteCode) saveInviteCode(room.id, room.inviteCode);
      navigate(`/code/${room.id}`, { state: { challengeMode: true } });
    } catch (err) { setError(err.message); } finally { setBusy(''); }
  }
  if (!user?.uid) return null;
  return <section className="challenge-history">
    <header><div><h2>Your practice</h2><p>Saved drafts, submitted attempts, and personal bests.</p></div><label>Status <select value={filter} onChange={event => setFilter(event.target.value)}><option value="all">All attempts</option><option value="draft">In progress</option><option value="submitted">Submitted</option></select></label></header>
    {error && <p role="alert">{error}</p>}
    {!attempts.length && !error && <p>Start a frontend challenge to save your first practice session.</p>}
    <div className="challenge-history-grid">{attempts.filter(attempt => filter === 'all' || (filter === 'draft' ? !attempt.history?.length : attempt.history?.length)).map(attempt => <article key={attempt.id}>
      <span className="challenge-eyebrow">{attempt.difficulty} · {attempt.skill || 'UI layout'}</span><h3>{attempt.title}</h3>
      <p>{attempt.history?.length || 0} submissions · Best {attempt.bestScore == null ? '—' : `${attempt.bestScore}/100`}</p>
      <p>Saved {new Date(attempt.updatedAt).toLocaleString()}</p>
      {attempt.history?.length > 0 && <details><summary>Past submissions</summary>{attempt.history.map(item => <p key={item.id}><button onClick={() => inspect(item.id)}>{item.score}/100 · {new Date(item.submittedAt).toLocaleString()}</button></p>)}</details>}
      <button disabled={Boolean(busy)} onClick={() => resume(attempt)}>{busy === attempt.id ? 'Opening…' : 'Continue attempt'}</button>
    </article>)}</div>
    {snapshot && <section aria-label="Saved submission"><h3>Submitted snapshot · {snapshot.score}/100</h3><button onClick={() => setSnapshot(null)}>Close snapshot</button>{snapshot.files.map(file => <details key={file.name}><summary>{file.name}</summary><pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{file.code}</pre></details>)}</section>}
  </section>;
}
