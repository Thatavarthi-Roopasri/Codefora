import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { saveHostToken, saveInviteCode } from '../lib/navigation';

export function CuratedChallenges({ user }) {
  const [items, setItems] = useState([]), [skill, setSkill] = useState('All');
  const [busy, setBusy] = useState(''), [error, setError] = useState(''), [preview, setPreview] = useState(null);
  const navigate = useNavigate();
  useEffect(() => { let active = true; api.request('/api/challenge/catalog').then(data => { if (active) setItems(data.items); }).catch(err => { if (active) setError(err.message); }); return () => { active = false; }; }, []);
  async function prepare(item) {
    if (!user?.uid) { navigate('/'); return; }
    setBusy(item.id); setError('');
    try { const target = await api.request('/api/challenge/generate', { method: 'POST', body: JSON.stringify({ templateId: item.id, difficulty: item.difficulty }) }); setPreview({ ...target, title: item.title }); }
    catch (err) { setError(err.message); } finally { setBusy(''); }
  }
  async function open() {
    setBusy('open'); setError('');
    try {
      const draft = await api.request(`/api/challenge/work/${preview.challengeId}`);
      const room = await api.createRoom({ name: `${preview.title} ${Date.now().toString(36)}`, username: user.displayName || 'Developer', userId: user.uid, visibility: 'private', problemId: 'ui-battle', initialLanguage: 'html', isChallenge: true, challengeId: preview.challengeId, targetImage: preview.targetImage, challengeDifficulty: preview.difficulty, files: draft.files });
      saveHostToken(room.id, room.hostToken); if (room.inviteCode) saveInviteCode(room.id, room.inviteCode);
      navigate(`/code/${room.id}`, { state: { challengeMode: true } });
    } catch (err) { setError(err.message); } finally { setBusy(''); }
  }
  return <section className="challenge-history"><header><div><h2>Practice a specific skill</h2><p>Curated targets with desktop and mobile layouts. Preview before opening the editor.</p></div><label>Skill <select value={skill} onChange={event => setSkill(event.target.value)}>{['All', ...new Set(items.map(item => item.skill))].map(value => <option key={value}>{value}</option>)}</select></label></header>
    {error && <p role="alert">{error}</p>}
    <div className="challenge-history-grid">{items.filter(item => skill === 'All' || skill === item.skill).map(item => <article key={item.id}><span className="challenge-eyebrow">{item.skill} · {item.difficulty}</span><h3>{item.title}</h3><p>{item.description}</p><button disabled={Boolean(busy)} onClick={() => prepare(item)}>{busy === item.id ? 'Preparing…' : 'Preview target'}</button></article>)}</div>
    {preview && <section aria-label="Challenge brief"><h3>{preview.title}</h3><p>HTML/CSS only · 800px desktop and 375px mobile · no expiry. Scoring uses pixel and structural similarity. External assets and JavaScript are excluded. You can continue this draft from Your practice.</p><img src={preview.targetImage} alt={`${preview.title} target preview`} style={{ display: 'block', maxWidth: '100%', maxHeight: 400, objectFit: 'contain', marginBottom: 16 }} /><button disabled={Boolean(busy)} onClick={open}>{busy === 'open' ? 'Opening…' : 'Open editor'}</button> <button onClick={() => setPreview(null)}>Close preview</button></section>}
  </section>;
}
