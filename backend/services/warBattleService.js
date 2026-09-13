import fs from 'node:fs/promises';
import { toPublicProblem } from './problemJudgeService.js';
import crypto from 'node:crypto';
import { challengeStore } from './challengeStore.js';
import { generateGrokMcqQuestions } from './grokQuestionService.js';

const problemsUrl = new URL('../data/problems.json', import.meta.url);
const normalize = value => String(value ?? '').trim().replace(/\r/g, '').split(/\n/).map(line => line.trim()).join('\n');

const WEB_QUIZ_QUESTIONS = [
  { id: 'script-tag', topic: 'Web Fundamentals', prompt: 'Which HTML tag loads JavaScript?', options: ['style', 'script', 'link', 'meta'], answer: 'B' },
  { id: 'grid-display', topic: 'Web Fundamentals', prompt: 'Which declaration creates a CSS Grid container?', options: ['display: grid', 'position: grid', 'align: grid', 'float: grid'], answer: 'A' },
  { id: 'const-binding', topic: 'Web Fundamentals', prompt: 'Which keyword creates a block-scoped binding that cannot be reassigned?', options: ['var', 'let', 'const', 'static'], answer: 'C' },
  { id: 'flex-axis', topic: 'Web Fundamentals', prompt: 'Which property changes the main axis of a flex container?', options: ['align-items', 'flex-direction', 'justify-content', 'place-items'], answer: 'B' },
  { id: 'semantic-main', topic: 'Web Fundamentals', prompt: 'Which element represents the dominant content of a document?', options: ['aside', 'footer', 'main', 'nav'], answer: 'C' },
  { id: 'js-strict', topic: 'JavaScript', prompt: 'Which operator checks value and type equality?', options: ['==', '===', '=', '!='], answer: 'B' },
  { id: 'js-map', topic: 'JavaScript', prompt: 'Which method creates a new array by transforming every item?', options: ['filter', 'reduce', 'map', 'find'], answer: 'C' },
  { id: 'js-promise', topic: 'JavaScript', prompt: 'Which state means a Promise completed successfully?', options: ['pending', 'fulfilled', 'rejected', 'cancelled'], answer: 'B' },
  { id: 'js-json', topic: 'JavaScript', prompt: 'Which method converts a JavaScript value to JSON text?', options: ['JSON.parse', 'JSON.stringify', 'JSON.toText', 'JSON.encode'], answer: 'B' },
  { id: 'js-closure', topic: 'JavaScript', prompt: 'What lets a function remember variables from its outer scope?', options: ['Closure', 'Prototype', 'Hoisting', 'Casting'], answer: 'A' },
  { id: 'html-label', topic: 'HTML/CSS', prompt: 'Which attribute connects a label to a form control?', options: ['for', 'target', 'connect', 'name'], answer: 'A' },
  { id: 'css-box', topic: 'HTML/CSS', prompt: 'Which area is outside an element border?', options: ['Padding', 'Content', 'Margin', 'Outline'], answer: 'C' },
  { id: 'css-position', topic: 'HTML/CSS', prompt: 'Which position value removes an element from normal flow?', options: ['static', 'relative', 'absolute', 'sticky-only'], answer: 'C' },
  { id: 'css-media', topic: 'HTML/CSS', prompt: 'Which rule targets different viewport sizes?', options: ['@font-face', '@media', '@supports-only', '@viewport-size'], answer: 'B' },
  { id: 'html-alt', topic: 'HTML/CSS', prompt: 'Which image attribute provides alternative text?', options: ['title', 'alt', 'caption', 'description'], answer: 'B' },
  { id: 'react-component', topic: 'React', prompt: 'What does a React component return?', options: ['SQL', 'JSX or elements', 'CSS only', 'A database row'], answer: 'B' },
  { id: 'react-state', topic: 'React', prompt: 'Which hook stores local component state?', options: ['useMemo', 'useState', 'useRoute', 'useStoreOnly'], answer: 'B' },
  { id: 'react-key', topic: 'React', prompt: 'Why are keys used when rendering lists?', options: ['To style rows', 'To identify items', 'To fetch data', 'To enable CSS'], answer: 'B' },
  { id: 'react-effect', topic: 'React', prompt: 'Which hook runs side effects after rendering?', options: ['useEffect', 'useRender', 'useSide', 'useAfter'], answer: 'A' },
  { id: 'react-props', topic: 'React', prompt: 'How are values passed from a parent to a child component?', options: ['Props', 'Reducers', 'Routes', 'Schemas'], answer: 'A' },
  { id: 'dsa-stack', topic: 'DSA', prompt: 'Which principle describes a stack?', options: ['FIFO', 'LIFO', 'Random first', 'Priority only'], answer: 'B' },
  { id: 'dsa-queue', topic: 'DSA', prompt: 'Which principle describes a standard queue?', options: ['LIFO', 'FIFO', 'Divide and conquer', 'Last minimum'], answer: 'B' },
  { id: 'dsa-binary', topic: 'DSA', prompt: 'What is binary search complexity on a sorted array?', options: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'], answer: 'B' },
  { id: 'dsa-map', topic: 'DSA', prompt: 'What is the average lookup complexity of a hash map?', options: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'], answer: 'A' },
  { id: 'dsa-merge', topic: 'DSA', prompt: 'What is the typical time complexity of merge sort?', options: ['O(log n)', 'O(n)', 'O(n log n)', 'O(n²)'], answer: 'C' }
];

export async function assignWarProblem(arena) {
  if (arena.battleType === 'programming') {
    const all = JSON.parse(await fs.readFile(problemsUrl, 'utf8'));
    const eligible = all.filter(p => p.published !== false && p.tests?.length && p.difficulty?.toLowerCase() === arena.difficulty.toLowerCase());
    if (!eligible.length) throw new Error('No judged problems are available for this difficulty.');
    const selected = eligible[Math.floor(Math.random() * eligible.length)];
    const publicProblem = toPublicProblem(selected);
    // Only explicitly public fields cross the boundary. Never expose solutions or hidden tests.
    arena.problem = { id: selected.id, title: selected.title, difficulty: selected.difficulty, statement: selected.statement, constraints: selected.constraints || [], tests: publicProblem.tests, testSummary: publicProblem.testSummary };
    arena.judgingMode = 'automatic';
    return;
  }
  if (['debugging', 'saboteur'].includes(arena.battleType)) {
    arena.problem = { id: 'arena-sum', title: 'Repair the Array Sum', difficulty: arena.difficulty, statement: 'Read N on the first line and N space-separated integers on the second line. Print their sum. Repair the starter solution so it includes every value, including negative values.', constraints: ['1 <= N <= 1000', '-10000 <= each value <= 10000'], tests: [{ input: '3\n1 2 3', output: '6' }] };
    arena.judgingMode = 'automatic';
  } else if (arena.battleType === 'mcqs') {
    const requestedTopic = String(arena.language || '').trim();
    const requestedCount = Math.max(5, Math.min(Number(arena.questionCount) || 5, 15));
    const generated = await generateGrokMcqQuestions({ topic: requestedTopic, count: requestedCount, difficulty: arena.difficulty });
    const topicQuestions = WEB_QUIZ_QUESTIONS.filter(question => question.topic === requestedTopic);
    const remainingQuestions = WEB_QUIZ_QUESTIONS.filter(question => question.topic !== requestedTopic);
    const selected = generated || [...topicQuestions, ...remainingQuestions].slice(0, requestedCount);
    arena.mcqAnswers = selected.map(question => question.answer);
    arena.problem = { id: 'arena-web-quiz', title: `${requestedTopic || 'Mixed Topics'} Quiz`, difficulty: arena.difficulty, statement: `Choose one answer for every question. This ${selected.length}-question ${requestedTopic || 'mixed topics'} quiz is judged when you submit.`, constraints: ['Choose one option per question.', 'Use Next and Previous to move between questions.', 'Submit before the battle timer ends.'], questions: selected.map(({ id, prompt, options }) => ({ id, prompt, options })), tests: [] };
    arena.judgingMode = 'automatic';
  } else if (['html-css', 'react', 'full-stack', 'ui-clone'].includes(arena.battleType)) {
    const buildProblems = {
      'html-css': { title: 'Responsive HTML/CSS Landing Page', statement: 'Build a semantic landing page with a heading, primary action, and responsive styling.', constraints: ['Use semantic HTML.', 'Include a heading and primary button.', 'Add responsive CSS.'] },
      react: { title: 'Interactive React Feedback Panel', statement: 'Build an interactive React feedback panel with controlled input, visible feedback, and an accessible submit action.', constraints: ['Export a React component.', 'Use state or controlled input.', 'Render feedback and a submit action.'] },
      'full-stack': { title: 'Feedback API Contract', statement: 'Implement feedback validation, a submit operation, and a response or rendered result that exposes saved feedback.', constraints: ['Validate empty input.', 'Expose a submit or API operation.', 'Return or render saved feedback.'] },
      'ui-clone': { title: 'Pixel-Matched UI Clone', statement: 'Recreate the target panel with semantic structure, a primary action, and responsive layout rules.', constraints: ['Use semantic structure.', 'Include the primary action.', 'Support responsive layout.'] }
    };
    arena.problem = { id: `arena-${arena.battleType}`, ...buildProblems[arena.battleType], difficulty: arena.difficulty, tests: [] };
    arena.judgingMode = 'automatic';
  } else {
    arena.judgingMode = 'review';
    arena.problem = { id: `practice-${arena.battleType}`, title: 'Team Build Challenge', difficulty: arena.difficulty, statement: 'Build the assigned team solution and submit it for review.', constraints: ['Support desktop and mobile layouts.', 'Use accessible labels and keyboard controls.'], tests: [] };
  }
}

function judgeBuildSubmission(battleType, code) {
  const requirements = {
    'html-css': [['semantic main section', /<main\b/i], ['heading', /<h[1-6]\b/i], ['primary action', /<(button|a)\b/i], ['responsive styling', /(@media|flex|grid|viewport)/i]],
    react: [['React component export', /(export\s+default|function\s+[A-Z]\w*|const\s+[A-Z]\w*\s*=)/], ['state or controlled input', /(useState|value\s*=|onChange\s*=)/], ['rendered feedback', /(feedback|message|submitted)/i], ['submit action', /(onSubmit|onClick|type\s*=\s*["']submit["'])/i]],
    'full-stack': [['input validation', /(validate|required|empty|trim\(\))/i], ['submit or API operation', /(fetch\s*\(|express|router|submit\w*|POST)/i], ['response or rendered result', /(response|res\.json|JSON\.stringify|render|map\s*\()/i], ['feedback data', /(feedback|message|comment)/i]],
    'ui-clone': [['semantic structure', /<(main|section|header|nav)\b/i], ['heading', /<h[1-6]\b/i], ['primary action', /<(button|a)\b/i], ['responsive layout', /(@media|flex|grid|viewport)/i]]
  }[battleType] || [];
  const checks = requirements.map(([name, pattern]) => ({ name, passed: pattern.test(String(code || '')) }));
  const passed = checks.filter(check => check.passed).length;
  return { passed, total: checks.length, verdict: passed === checks.length ? 'accepted' : 'wrong_answer', summary: `${passed}/${checks.length} build requirements passed.`, checks };
}

export function activateWarBattle(arena, now = Date.now()) {
  if (!arena || arena.status !== 'COUNTDOWN' || !arena.startsAt || now < arena.startsAt || now >= arena.endsAt) return false;
  arena.status = 'ACTIVE';
  return true;
}

export function finishWarBattle(arena, now = Date.now()) {
  if (!arena || !['ACTIVE', 'COUNTDOWN', 'JUDGING'].includes(arena.status) || !arena.endsAt || now < arena.endsAt) return false;
  if ((arena.pendingSubmissions || 0) > 0) { arena.status = 'JUDGING'; return false; }
  const best = team => (arena.participants || []).filter(p => p.team === team).reduce((result, p) => {
    const score = Number(p.score) || 0;
    const at = p.bestSubmittedAt || Infinity;
    return score > result.score || (score === result.score && at < result.at) ? { score, at } : result;
  }, { score: 0, at: Infinity });
  const loop = best('LOOP'), sider = best('SIDER');
  arena.status = 'COMPLETED';
  arena.completedAt = now;
  arena.winningTeam = arena.judgingMode === 'review' ? null : loop.score !== sider.score ? (loop.score > sider.score ? 'LOOP' : 'SIDER') : loop.score > 0 && loop.at !== sider.at ? (loop.at < sider.at ? 'LOOP' : 'SIDER') : null;
  arena.resultReason = arena.judgingMode === 'review' ? 'Review-based practice completed. Compare submissions together.' : `Highest verified score wins; ties use the earliest submission earning that score. ${arena.winningTeam ? `Team ${arena.winningTeam} wins.` : 'Draw.'}`;
  return true;
}

export function createWarBattleController({ roomRepository, roomService, profileController = null, judge, runner, publish = () => {}, attemptStore = challengeStore }) {
  const inFlight = new Set();
  const recordCompletedBattle = async (room) => {
    const arena = room?.warArena;
    if (!arena || arena.status !== 'COMPLETED' || arena.statsRecordedAt || !profileController?.recordCompetitiveResult) return;
    arena.statsRecordedAt = Date.now();
    const mode = arena.battleType === 'mcqs' ? 'blind' : 'battles';
    await Promise.all((arena.participants || []).map((participant) => profileController.recordCompetitiveResult(participant.userId, {
      mode,
      matchId: `battle:${room.id}`,
      won: Boolean(arena.winningTeam && participant.team === arena.winningTeam)
    })));
  };
  return {
    history: async (req, res) => {
      const room = roomRepository.findById(req.params.id);
      if (room?.warArena?.status === 'COMPLETED' && room.warArena.participants?.some(participant => participant.userId === req.firebaseUser.uid)) {
        const attempts = await Promise.all((room.warArena.submissions || []).map(item => attemptStore.get('warAttempts', item.id)));
        return res.json({ attempts: attempts.filter(Boolean).sort((a, b) => b.receivedAt - a.receivedAt) });
      }
      const attempts = await attemptStore.list('warAttempts', req.firebaseUser.uid);
      res.json({ attempts: attempts.filter(item => item.roomId === req.params.id).sort((a, b) => b.receivedAt - a.receivedAt) });
    },
    submit: async (req, res) => {
      const room = roomRepository.findById(req.params.id);
      const arena = room?.warArena;
      const participant = arena?.participants?.find(p => p.userId === req.firebaseUser?.uid);
      if (!participant || !['LOOP', 'SIDER'].includes(participant.team)) return res.status(403).json({ error: 'Join a team before submitting.' });
      if (activateWarBattle(arena)) { await roomRepository.save(room); publish(roomService.snapshot(room)); }
      if (finishWarBattle(arena)) { await recordCompletedBattle(room); await roomRepository.save(room); publish(roomService.snapshot(room)); }
      const receivedAt = Date.now();
      if (arena.status !== 'ACTIVE' || receivedAt < arena.startsAt || receivedAt >= arena.endsAt) return res.status(409).json({ error: 'This battle is not accepting submissions.' });
      const isStructuredQuiz = arena.battleType === 'mcqs' && Array.isArray(req.body?.answers);
      const code = isStructuredQuiz ? req.body.answers.join('\n') : req.body?.code;
      if (typeof code !== 'string' || !code.trim() || Buffer.byteLength(code, 'utf8') > 200000) return res.status(400).json({ error: 'Submit non-empty code or answers, up to 200 KB.' });
      const key = `${room.id}:${participant.id}`;
      if (inFlight.has(key)) return res.status(409).json({ error: 'Your previous submission is still being judged.' });
      inFlight.add(key);
      arena.pendingSubmissions = (arena.pendingSubmissions || 0) + 1;
      let counted = true;
      try {
        let result;
        if (arena.battleType === 'programming') {
          const language = ({ Java: 'java', Python: 'python', C: 'c', 'C++': 'cpp', JavaScript: 'javascript' })[arena.language];
          result = await judge.judge({ problemId: arena.problem.id, language, code });
        } else if (arena.battleType === 'mcqs') {
          let answers = isStructuredQuiz ? req.body.answers : normalize(code).toUpperCase().split('\n');
          answers = answers.map(answer => String(answer || '').trim().toUpperCase()).slice(0, arena.mcqAnswers?.length || 0);
          const expected = Array.isArray(arena.mcqAnswers) ? arena.mcqAnswers : ['B', 'A'];
          const judgedExpected = isStructuredQuiz ? expected : expected.slice(0, answers.length);
          const passed = judgedExpected.filter((answer, index) => answers[index] === answer).length;
          result = { passed, total: judgedExpected.length, verdict: passed === judgedExpected.length && answers.length === judgedExpected.length ? 'accepted' : 'wrong_answer' };
        } else if (['debugging', 'saboteur'].includes(arena.battleType)) {
          const language = ({ Java: 'java', Python: 'python', 'C++': 'cpp', JavaScript: 'javascript' })[arena.language];
          const cases = [['3\n1 2 3', '6'], ['1\n-4', '-4'], ['5\n-3 0 9 -8 2', '0'], ['4\n0 0 0 0', '0']];
          result = { passed: 0, total: cases.length, verdict: 'accepted', executionTime: 0 };
          for (const [input, expected] of cases) {
            const execution = await runner.run({ language, code, input, timeLimitMs: 2000 });
            result.executionTime += Number(execution.executionTime) || 0;
            if (execution.status !== 'success') { result.verdict = 'runtime_error'; break; }
            if (normalize(execution.stdout) === expected) result.passed++; else result.verdict = 'wrong_answer';
          }
        } else if (['html-css', 'react', 'full-stack', 'ui-clone'].includes(arena.battleType)) {
          result = judgeBuildSubmission(arena.battleType, code);
        } else {
          result = { verdict: 'review_required', message: 'Saved for team review. This mode does not award automatic scores.' };
        }
        if (result.verdict === 'judge_error') throw new Error('The judging service is unavailable. Please retry; your score has not changed.');
        const score = result.total ? Math.round(100 * result.passed / result.total) : null;
        const submissionId = crypto.randomUUID();
        await attemptStore.set('warAttempts', submissionId, { id: submissionId, ownerId: participant.userId, roomId: room.id, team: participant.team, receivedAt, code, result, score });
        participant.attempts = (participant.attempts || 0) + 1;
        if (score !== null && (score > (participant.score || 0) || !participant.bestSubmittedAt)) {
          participant.score = score;
          participant.bestSubmittedAt = receivedAt;
        }
        participant.progress = Math.max(participant.progress || 0, score ?? 100);
        participant.status = result.verdict === 'accepted' ? 'Accepted' : result.verdict.replaceAll('_', ' ');
        arena.submissions = [...(arena.submissions || []), { id: submissionId, userId: participant.userId, team: participant.team, receivedAt, verdict: result.verdict, score }].slice(-50);
        arena.activity = [...(arena.activity || []), { id: crypto.randomUUID(), text: `${participant.name} submitted for Team ${participant.team}: ${result.verdict.replaceAll('_', ' ')}${score === null ? '' : ` (${score}/100)`}`, createdAt: Date.now() }].slice(-80);
        arena.pendingSubmissions--;
        counted = false;
        finishWarBattle(arena);
        await recordCompletedBattle(room);
        await roomRepository.save(room);
        publish(roomService.snapshot(room));
        return res.json({ ...result, score, attempts: participant.attempts });
      } catch (error) {
        if (counted) arena.pendingSubmissions--;
        finishWarBattle(arena);
        await recordCompletedBattle(room);
        await roomRepository.save(room);
        publish(roomService.snapshot(room));
        return res.status(503).json({ error: error.message || 'Judging is unavailable. Retry shortly.' });
      } finally { inFlight.delete(key); }
    }
  };
}
