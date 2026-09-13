import { challengeStore, validateChallengeFiles, withChallengeLock } from '../services/challengeStore.js';

export const challengeWorkController = {
  attempt: async (req, res) => {
    const attempt = await challengeStore.get('challengeAttempts', req.params.id);
    if (!attempt || attempt.ownerId !== req.firebaseUser.uid) return res.status(404).json({ error: 'Attempt not found.' });
    res.json(attempt);
  },
  list: async (req, res) => {
    const drafts = await challengeStore.list('challengeDrafts', req.firebaseUser.uid);
    res.json({ attempts: drafts.sort((a, b) => b.updatedAt - a.updatedAt).map(({ files: _files, ...draft }) => draft) });
  },
  get: async (req, res) => {
    const draft = await challengeStore.get('challengeDrafts', req.params.id);
    if (!draft || draft.ownerId !== req.firebaseUser.uid) return res.status(404).json({ error: 'Attempt not found.' });
    res.json(draft);
  },
  save: async (req, res) => {
    try {
      const files = validateChallengeFiles(req.body?.files);
      await withChallengeLock(req.params.id, async () => {
        const draft = await challengeStore.get('challengeDrafts', req.params.id);
        if (!draft || draft.ownerId !== req.firebaseUser.uid) { res.status(404).json({ error: 'Attempt not found.' }); return; }
        const updated = { ...draft, files, updatedAt: Date.now() };
        await challengeStore.set('challengeDrafts', draft.id, updated);
        res.json({ savedAt: updated.updatedAt });
      });
    } catch (error) { res.status(400).json({ error: error.message }); }
  }
};
