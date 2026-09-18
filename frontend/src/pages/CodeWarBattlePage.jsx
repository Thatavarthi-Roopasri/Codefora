import { useEffect, useMemo, useRef, useState } from "react";
import { useServerClock } from '../hooks/useServerClock';
import { serverClock } from '../lib/serverClock';
import { useWarVoice } from '../hooks/useWarVoice';
import { WarTeamChat, WarProblem, WarActivity, WarQuiz } from '../components/WarBattlePanels';
import '../components/warBattlePanels.css';
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Editor from "@monaco-editor/react";
import {
  Clock3,
  Copy,
  Loader2,
  Play,
  Send,
  Swords,
  Trophy,
  Users
} from "lucide-react";
import { api } from "../api/client";
import { auth } from "../lib/firebase";
import { useAuth } from "../hooks/useAuth";
import { copyToClipboard } from "../lib/clipboard";
import { getHostToken, getInviteCode, saveInviteCode, saveUsername } from "../lib/navigation";
import { socket } from "../lib/socket";
import { LeftNavBar } from "../components/room/LeftNavBar";

function getSessionId(roomCode) {
  const key = `codefora_session_${roomCode}`;
  let sessionId = sessionStorage.getItem(key);
  if (!sessionId) {
    sessionId = `sess-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(key, sessionId);
  }
  return sessionId;
}

function languageId(language) {
  const clean = String(language || "").toLowerCase();
  if (clean.includes("no language")) return "plaintext";
  if (clean.includes("python")) return "python";
  if (clean.includes("c++")) return "cpp";
  if (clean === "c") return "c";
  if (clean.includes("html")) return "html";
  if (clean.includes("react") || clean.includes("javascript")) return "javascript";
  return "java";
}

function fileNameFor(language) {
  const id = languageId(language);
  if (id === "plaintext") return "answers.txt";
  if (id === "python") return "solution.py";
  if (id === "cpp") return "main.cpp";
  if (id === "c") return "main.c";
  if (id === "html") return "index.html";
  if (id === "javascript") return "main.js";
  return "main.java";
}

function formatTime(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = String(total % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function teamPlayers(arena, team) {
  const ids = new Set(arena?.teams?.[team] || []);
  return (arena?.participants || []).filter((player) => ids.has(player.id) || player.team === team);
}

function scoreFor(players, serverStats = null) {
  const fallback = {
    score: Math.max(...players.map((player) => Number(player.score) || 0)),
    attempts: players.reduce((sum, player) => sum + (Number(player.attempts) || 0), 0),
    progress: Math.max(...players.map(player => Number(player.progress) || 0))
  };
  if (!players.length && !serverStats) return { score: 0, attempts: 0, progress: 0 };
  return {
    score: Number(serverStats?.score ?? fallback.score) || 0,
    attempts: Number(serverStats?.attempts ?? fallback.attempts) || 0,
    progress: Math.max(0, Math.min(100, Number(serverStats?.progress ?? fallback.progress) || 0))
  };
}

function problemCopy(arena) {
  if (arena?.problem?.title) {
    return {
      title: arena.problem.title,
      difficulty: arena.problem.difficulty || arena.difficulty,
      statement: arena.problem.statement || "",
      constraints: arena.problem.constraints || [],
      tests: arena.problem.tests || [],
      questions: Array.isArray(arena.problem.questions) ? arena.problem.questions : [],
      bullets: []
    };
  }
  if (arena?.battleType === "debugging") {
    return {
      title: "Fix the Broken Solution",
      bullets: ["Find the failing logic.", "Keep the input/output contract unchanged.", "Submit when sample behavior is correct.", "Fastest accepted team wins tie breaks."]
    };
  }
  if (arena?.battleType === "html-css" || arena?.battleType === "ui-clone") {
    return {
      title: "Build a Simple Landing Page",
      bullets: ["Create a hero section with a heading.", "Add a button labeled Launch room.", "Use semantic HTML.", "Make the page responsive."]
    };
  }
  return {
    title: "Solve the Arena Challenge",
    bullets: ["Read input from stdin.", "Return the correct output.", "Optimize for time and memory.", "Submit before the timer ends."]
  };
}

function requiredLanguageMessage(language) {
  if (languageId(language) === "plaintext") return "This mode does not need code. Write your answers in the answer pad.";
  return `You should write in ${language}.`;
}

function detectWrongLanguage(code, selectedLanguage) {
  const source = String(code || "").trim();
  if (!source) return null;
  const selected = languageId(selectedLanguage);
  if (selected === "plaintext") return null;
  const signals = {
    python: [/\bdef\s+\w+\s*\(/, /\bimport\s+sys\b/, /\bfrom\s+\w+\s+import\b/, /print\s*\(/, /:\s*\n\s{2,}\S/],
    java: [/\bpublic\s+class\s+\w+/, /\bpublic\s+static\s+void\s+main\b/, /\bSystem\.out\.print/, /\bimport\s+java\./],
    cpp: [/#include\s*<bits\/stdc\+\+\.h>/, /#include\s*<iostream>/, /\busing\s+namespace\s+std\b/, /\bcout\s*<</],
    c: [/#include\s*<stdio\.h>/, /\bprintf\s*\(/, /\bscanf\s*\(/],
    javascript: [/\bfunction\s+\w+\s*\(/, /\bconst\s+\w+\s*=/, /\blet\s+\w+\s*=/, /console\.log\s*\(/],
    html: [/<!doctype\s+html/i, /<html[\s>]/i, /<body[\s>]/i, /<div[\s>]/i]
  };
  const detected = Object.entries(signals).find(([lang, patterns]) => lang !== selected && patterns.some((pattern) => pattern.test(source)))?.[0];
  return detected || null;
}

export function CodeWarBattlePage() {
  const { roomCode } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [room, setRoom] = useState(null);
  const [arena, setArena] = useState(null);
  const [team, setTeam] = useState("");
  const [code, setCode] = useState("");
  const [messages, setMessages] = useState([]);
  const [chatText, setChatText] = useState("");
  const [stdin, setStdin] = useState("");
  const [output, setOutput] = useState("Ready to run.");
  const [activeTab, setActiveTab] = useState("output");
  const [busy, setBusy] = useState("");
  const [toast, setToast] = useState("");
  const [attempts, setAttempts] = useState([]);
  const [sidePanel, setSidePanel] = useState('Room');
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(socket.connected);
  const [exitPrompt, setExitPrompt] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const exitDialog = useRef(null);
  useEffect(() => { if (exitPrompt) exitDialog.current?.showModal(); }, [exitPrompt]);
  const now = useServerClock({ serverNow: arena?.serverNow, intervalMs: 100 });
  const emitTimer = useRef(null);
  const lastRemoteCode = useRef("");
  const teamRef = useRef("");
  useEffect(() => {
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onConnectError = () => setConnected(false);
    socket.on('connect', onConnect); socket.on('disconnect', onDisconnect); socket.on('connect_error', onConnectError);
    setConnected(socket.connected);
    return () => { socket.off('connect', onConnect); socket.off('disconnect', onDisconnect); socket.off('connect_error', onConnectError); window.clearTimeout(emitTimer.current); };
  }, []);
  useEffect(() => {
    if (!room?.id || arena?.status !== 'COMPLETED') return;
    let active = true;
    api.request(`/api/rooms/${room.id}/war/history`).then(data => { if (active) setAttempts(data.attempts); }).catch(error => { if (active) setToast(error.message); });
    return () => { active = false; };
  }, [room?.id, arena?.status]);

  useEffect(() => {
    if (authLoading && !user) return undefined;
    let active = true;
    let joinBattle;
    async function bootstrap() {
      try {
        const params = new URLSearchParams(location.search);
        const linkInviteCode = params.get("inviteCode") || params.get("code");
        if (linkInviteCode) saveInviteCode(roomCode, linkInviteCode);
        const payload = await api.getWarRoom(roomCode, linkInviteCode || getInviteCode(roomCode), getHostToken(roomCode));
        if (!payload?.warArena) {
          navigate(`/code/${payload.id}`);
          return;
        }
        if (!active) return;
        if (payload.warArena.status === 'CANCELLED') { navigate('/rooms', { replace: true }); return; }
        setRoom(payload);
        setArena(payload.warArena);
        api.request(`/api/rooms/${payload.id}/war/history`).then(data => { if (active) setAttempts(data.attempts); }).catch(error => { if (active) setToast(error.message); });
        const displayName = user?.displayName || user?.username || user?.email?.split("@")[0] || localStorage.getItem("codefora_username") || "Developer";
        saveUsername(displayName);
        if (auth?.currentUser) {
          try {
            const token = await auth.currentUser.getIdToken(false);
            socket.auth = { token };
          } catch {
            // ignore
          }
        }
        socket.connect();
        const joinData = {
          roomId: payload.id,
          username: displayName,
          inviteCode: linkInviteCode || getInviteCode(payload.id),
          hostToken: getHostToken(payload.id),
          userId: user?.uid || user?.id || localStorage.getItem("codefora_user_id") || null,
          sessionId: getSessionId(payload.id)
        };
        joinBattle = () => socket.emit("room:join", joinData);
        socket.on("connect", joinBattle);
        if (socket.connected) joinBattle();
      } catch (error) {
        setToast(error.message || "Could not open Code War battle.");
      }
    }
    bootstrap();

    const handleRoomState = (payload) => {
      setRoom(payload);
      if (payload?.warArena) setArena(payload.warArena);
    };
    const handleWarState = (payload) => setArena(payload);
    const handleTeamCode = (payload) => {
      if (payload?.roomId && payload.roomId !== roomCode) return;
      if (payload?.team && teamRef.current && payload.team !== teamRef.current) return;
      if (payload?.team) teamRef.current = payload.team;
      setTeam(payload.team);
      lastRemoteCode.current = payload.code || "";
      setCode(payload.code || "");
      setMessages(payload.messages || []);
    };
    const handleTeamMessage = (message) => {
      if (message?.roomId && message.roomId !== roomCode) return;
      if (message?.team && teamRef.current && message.team !== teamRef.current) return;
      setMessages((items) => items.some(item => item.id === message.id) ? items : [...items, message].slice(-80));
    };
    const handleWarError = payload => setToast(payload?.message || 'Arena action failed.');
    const handleEnded = payload => { if (payload.roomId === roomCode) navigate('/rooms', { replace: true }); };
    socket.on('war:ended', handleEnded);
    socket.on("room:state", handleRoomState);
    socket.on("war:state", handleWarState);
    socket.on("war:team_code", handleTeamCode);
    socket.on("war:team_message", handleTeamMessage);
    socket.on("war:error", handleWarError);

    return () => {
      active = false;
      if (joinBattle) socket.off("connect", joinBattle);
      socket.off("room:state", handleRoomState);
      socket.off("war:state", handleWarState);
      socket.off("war:team_code", handleTeamCode);
      socket.off("war:team_message", handleTeamMessage);
      socket.off("war:error", handleWarError);
      socket.off('war:ended', handleEnded);
    };
  }, [location.search, navigate, roomCode, user, authLoading]);

  useEffect(() => {
    if (!roomCode) return undefined;
    let active = true;
    const refresh = async () => {
      try {
        const query = new URLSearchParams(location.search);
        const payload = await api.getWarRoom(roomCode, query.get('inviteCode') || query.get('code') || getInviteCode(roomCode), getHostToken(roomCode));
        if (!active || !payload?.warArena) return;
        if (payload.warArena.status === 'CANCELLED') { navigate('/rooms', { replace: true }); return; }
        setRoom(payload); setArena(payload.warArena);
      } catch { if (active) setToast('Reconnecting to the Codewars battle…'); }
    };
    const onConnect = () => { refresh(); };
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    socket.on('connect', onConnect);
    document.addEventListener('visibilitychange', onVisible);
    return () => { active = false; socket.off('connect', onConnect); document.removeEventListener('visibilitychange', onVisible); };
  }, [roomCode, location.search, navigate]);

  useEffect(() => {
    if (!room?.id || !['WAITING', 'READY_CHECK', 'COUNTDOWN'].includes(arena?.status)) return;
    // A direct battle URL must not bypass the lobby or replay a completed countdown.
    if (arena.status === 'COUNTDOWN' && arena.startsAt && now >= arena.startsAt) return;
    navigate(`/war-arena/room/${room.id}${location.search}`, { replace: true });
  }, [room?.id, arena?.status, arena?.startsAt, now, location.search, navigate]);

  const localUserId = user?.uid || user?.id || localStorage.getItem("codefora_user_id");
  const sessionId = room?.id ? sessionStorage.getItem(`codefora_session_${room.id}`) : null;
  const currentParticipant = useMemo(() => (
    (arena?.participants || []).find((player) => player.userId === localUserId || player.sessionId === sessionId)
  ), [arena?.participants, localUserId, sessionId]);
  const myTeam = team || currentParticipant?.team || "";
  const opponentTeam = myTeam === "LOOP" ? "SIDER" : "LOOP";
  const myPlayers = teamPlayers(arena, myTeam);
  const opponentPlayers = teamPlayers(arena, opponentTeam);
  const myScore = scoreFor(myPlayers, arena?.teamStats?.[myTeam]);
  const opponentScore = scoreFor(opponentPlayers, arena?.teamStats?.[opponentTeam]);
  const problem = problemCopy(arena);
  const isMcqMode = arena?.battleType === 'mcqs';
  useEffect(() => { setQuizAnswers({}); setQuizIndex(0); setQuizSubmitted(false); }, [arena?.problem?.id]);
  const languageWarning = detectWrongLanguage(code, arena?.language) ? requiredLanguageMessage(arena.language) : "";
  const timeLeft = arena?.endsAt ? formatTime(arena.endsAt - now) : formatTime((arena?.timeLimitSeconds || 1800) * 1000);
  const editorLanguage = languageId(arena?.language);
  const activeFileName = fileNameFor(arena?.language);
  const isAnswerOnlyMode = editorLanguage === "plaintext";
  const isBuildMode = ['html-css', 'react', 'full-stack', 'ui-clone'].includes(arena?.battleType);
  const battleActive = arena?.status === 'ACTIVE' && now >= arena.startsAt && now < arena.endsAt;
  const voice = useWarVoice(room?.id, Boolean(battleActive && myTeam && arena.voiceChatEnabled !== false), myTeam);
  const isHost = currentParticipant?.role === 'HOST' || room?.ownerUserId === localUserId;
  const sharedNavTab = ({ Room: null, Problem: 'problem', Console: 'console', Players: 'users', Goals: 'notes', Stats: 'preview', Activity: 'info', Chat: 'users' })[sidePanel];
  async function exitBattle() {
    setExiting(true);
    window.clearTimeout(emitTimer.current);
    try {
      const reply = await socket.timeout(8000).emitWithAck(isHost ? 'war:end' : 'war:leave', { roomId: room.id });
      if (reply.error) throw new Error(reply.error);
      navigate('/rooms', { replace: true });
    } catch (error) { setToast(error.message || 'Could not leave. Please retry.'); setExitPrompt(false); }
    finally { setExiting(false); }
  }

  function updateCode(nextCode = "") {
    if (arena?.status !== 'ACTIVE' || serverClock.now() < arena.startsAt || serverClock.now() >= arena.endsAt) return;
    setCode(nextCode);
    if (lastRemoteCode.current === nextCode) return;
    window.clearTimeout(emitTimer.current);
    emitTimer.current = window.setTimeout(() => {
      socket.emit("war:code:update", { roomId: room.id, code: nextCode });
      lastRemoteCode.current = nextCode;
    }, 180);
  }

  async function copyRoomCode() {
    try {
      await copyToClipboard(room.id);
      setToast("Room code copied");
    } catch {
      setToast("Could not copy room code");
    }
  }

  async function runCode() {
    if (!battleActive || !code.trim() || busy) return;
    if (isBuildMode) {
      const message = 'Build mode checks your requirements when you submit.';
      setOutput(message);
      setToast(message);
      return;
    }
    if (isAnswerOnlyMode) {
      const message = requiredLanguageMessage(arena.language);
      setOutput(message);
      setToast(message);
      return;
    }
    const wrongLanguage = detectWrongLanguage(code, arena?.language);
    if (wrongLanguage) {
      const message = requiredLanguageMessage(arena.language);
      setOutput(message);
      setToast(message);
      return;
    }
    setBusy("run");
    setActiveTab('output');
    setOutput("Running...");
    try {
      const result = await api.runCode({ language: editorLanguage, code, input: stdin });
      const text = [result.output, result.stderr, result.error].filter(Boolean).join("\n") || "Finished with no output.";
      setOutput(text);
    } catch (error) {
      setOutput(error.message || "Run failed.");
    } finally {
      setBusy("");
    }
  }

  async function submitCode() {
    if (!battleActive || !room?.id || busy) return;
    const quizAnswersList = isMcqMode ? (problem.questions || []).map(question => quizAnswers[question.id] || '') : null;
    if (isMcqMode && (!quizAnswersList.length || quizAnswersList.some(answer => !answer))) {
      setToast('Answer every question before submitting.');
      return;
    }
    const wrongLanguage = isMcqMode ? null : detectWrongLanguage(code, arena?.language);
    if (wrongLanguage) {
      const message = requiredLanguageMessage(arena.language);
      setOutput(message);
      setToast(message);
      return;
    }
    setBusy('submit');
    try {
      const result = await api.request(`/api/rooms/${room.id}/war/submit`, { method: 'POST', body: JSON.stringify(isMcqMode ? { code: quizAnswersList.join('\n'), answers: quizAnswersList } : { code }) });
      setOutput([result.label || result.verdict.replaceAll('_', ' '), result.total ? `${result.passed}/${result.total} tests passed. Score: ${result.score}/100.` : result.message, result.executionTime != null ? `Measured execution time: ${result.executionTime} ms` : '', result.failedTestCase ? JSON.stringify(result.failedTestCase, null, 2) : ''].filter(Boolean).join('\n'));
      setToast(result.verdict === 'accepted' ? 'Accepted by the judge' : 'Submission evaluated');
      if (isMcqMode) setQuizSubmitted(true);
      setActiveTab('output');
      const history = await api.request(`/api/rooms/${room.id}/war/history`);
      setAttempts(history.attempts);
    } catch (error) { setOutput(error.message); setToast('Submission could not be evaluated'); }
    finally { setBusy(''); }
  }

  async function sendTeamMessage(event) {
    event.preventDefault();
    const text = chatText.trim();
    if (!text || sending) return;
    if (!socket.connected) {
      setConnected(false);
      socket.connect();
      setToast('Reconnecting to team chat…');
      return;
    }
    setSending(true);
    try {
      const reply = await socket.timeout(5000).emitWithAck('war:team_message', { roomId: room.id, text });
      if (reply.error) throw new Error(reply.error);
      setChatText('');
    } catch (error) { setToast(error.message || 'Message was not confirmed. Check your connection.'); }
    finally { setSending(false); }
  }

  if (!room || !arena) {
    return <main className="codewar-battle-shell"><div className="codewar-loading">{toast ? <><strong role="alert">{toast}</strong><button type="button" onClick={() => navigate(`/war-arena/room/${roomCode}${location.search}`)}>Back to Lobby</button></> : <><Loader2 className="spin" /> Loading Code War battle...</>}</div></main>;
  }

  if (!["LOOP", "SIDER"].includes(myTeam)) {
    return (
      <main className="codewar-battle-shell">
        <section className="codewar-loading">
          <Swords size={42} />
          <strong>Join a team before entering battle.</strong>
          <button type="button" onClick={() => navigate(`/war-arena/room/${room.id}`)}>Back to Lobby</button>
        </section>
      </main>
    );
  }

  return (
    <main className={`codewar-battle-shell codewar-panel-${sidePanel.toLowerCase()} codewar-own-${myTeam.toLowerCase()} ${sharedNavTab ? 'codewar-nav-collapsed' : 'codewar-nav-expanded'}`}>
      <LeftNavBar
        activeTab={sharedNavTab}
        micOn={voice.micOn}
        onToggleMic={() => {
          if (!battleActive) { setToast('Team voice becomes available when the battle starts.'); return; }
          if (arena.voiceChatEnabled === false) { setToast('Voice chat is disabled for this Code War.'); return; }
          if (myPlayers.length < 2) { setToast(`Team ${myTeam} needs at least two teammates for voice chat.`); return; }
          if (!voice.pending) voice.toggle();
        }}
        onLeave={() => setExitPrompt(true)}
        onShowFiles={() => setSidePanel('Room')}
        onShowProblem={() => setSidePanel('Problem')}
        onShowUsers={() => setSidePanel('Players')}
        onShowNotes={() => setSidePanel('Chat')}
        showPreviewButton={false}
        onShowFullPreview={() => setSidePanel('Stats')}
         isConsoleOpen={false}
         onToggleConsole={() => document.querySelector('.codewar-center-console')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })}
        onShowInfo={() => setSidePanel('Activity')}
        onShowSettings={() => setSidePanel('Goals')}
        isAnyMicOn={voice.micOn}
      />
      <aside className="codewar-side">
         {voice.error && <p role="alert">{voice.error}</p>}
        {voice.micOn && <p className="codewar-panel-hint">Team {myTeam} voice · {voice.members.length} connected. Mic off leaves voice.</p>}
        {sidePanel === 'Problem' && <WarProblem problem={problem} />}
        {sidePanel === 'Chat' && <section><h2>Team Chat</h2><WarTeamChat messages={messages} text={chatText} setText={setChatText} onSend={sendTeamMessage} sending={sending} connected={connected} team={myTeam} /></section>}
        {sidePanel === 'Activity' && <section><h2>Live Activity</h2><WarActivity activity={arena.activity} /></section>}
        {sidePanel === 'Goals' && <section><h2>Battle Goals</h2><p>{problem.title}</p><ul><li>Read the problem and sample tests.</li><li>Build and run your team's solution.</li><li>Submit before the timer reaches zero.</li><li>{arena.judgingMode === 'review' ? 'Submit for team review.' : 'Pass the judge tests to increase your score.'}</li></ul><p>Verified progress: {myScore.progress}%</p></section>}
         {sidePanel === 'Stats' && <section><h2>Battle Stats</h2><p>Submissions: {myScore.attempts}</p><p>Best score: {myScore.score}/100</p><ProgressRow label="Verified progress" value={myScore.progress} tone={myTeam.toLowerCase()} /><button type="button" onClick={() => { setActiveTab('history'); document.querySelector('.codewar-center-console')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }}>View submission history</button></section>}
         {['Room', 'Players'].includes(sidePanel) && <>
        <section className={`codewar-team-card ${myTeam.toLowerCase()}`}>
          <h1>{myTeam === "LOOP" ? "Loop Room" : "Sider Room"}</h1>
          <p>{arena.teamSize} vs {arena.teamSize} Battle</p>
          {myPlayers.map((player) => (
            <article key={player.id}>
              <div>{player.name?.charAt(0)?.toUpperCase() || "U"}</div>
              <strong>{player.name}{player.id === currentParticipant?.id && <span>You</span>}</strong>
              <small>{player.isOnline ? "Online" : "Offline"} | {player.status || "Working"}</small>
            </article>
          ))}
        </section>
        {sidePanel === 'Players' && <section><h2>Team {opponentTeam}</h2>{opponentPlayers.map(player => <p key={player.id}>{player.name} · {player.isOnline ? 'Online' : 'Offline'}</p>)}</section>}
        <section className="codewar-room-copy">
          <span>Room Code</span>
          <button type="button" onClick={copyRoomCode}>{room.id}<Copy size={16} /></button>
        </section>
        </>}
      </aside>
      <section className="codewar-main">
        <header className="codewar-topbar">
          <div>
            <strong>{room.id}</strong>
            <span>{room.visibility === "private" ? "Private Room" : "Public Room"}</span>
          </div>
          <div><Clock3 size={18} /><span>Time Left</span><strong>{timeLeft}</strong></div>
          <div><span>Language</span><strong>{arena.language}</strong></div>
          <div><span>Difficulty</span><strong>{arena.difficulty}</strong></div>
           <button type="button" onClick={runCode} disabled={!battleActive || Boolean(busy) || isAnswerOnlyMode || arena.judgingMode === 'review'}><Play size={16} /> {isMcqMode ? 'Quiz mode' : isBuildMode ? 'Check build' : arena.judgingMode === 'review' ? 'Review mode' : 'Run Code'}</button>
          <button type="button" className="submit" onClick={submitCode} disabled={Boolean(busy) || !battleActive || (isMcqMode && quizSubmitted)}><Send size={16} /> {busy === 'submit' ? 'Judging…' : isMcqMode ? 'Submit Quiz' : 'Submit'}</button>
        </header>
        {toast && <div className="codewar-toast">{toast}</div>}
        {arena.judgingMode === 'review' && <p className="challenge-battle-result">Review-based practice: submissions are saved for team review. No automatic score or ranked winner is assigned.</p>}
        {['COMPLETED', 'JUDGING'].includes(arena.status) && <section className="challenge-battle-result" role="status"><h2>{arena.status === 'JUDGING' ? 'Time is up — finishing submitted evaluations' : arena.winningTeam ? `Team ${arena.winningTeam} wins` : 'Battle complete'}</h2><p>{arena.resultReason || 'Submissions received before the deadline are being evaluated.'}</p><p>Loop: {scoreFor(teamPlayers(arena, 'LOOP'), arena.teamStats?.LOOP).score} · Sider: {scoreFor(teamPlayers(arena, 'SIDER'), arena.teamStats?.SIDER).score}</p></section>}
        <div className="codewar-workspace">
          <section className="codewar-editor-card">
            {isMcqMode ? <WarQuiz questions={problem.questions || []} answers={quizAnswers} currentIndex={quizIndex} onAnswer={(id, answer) => setQuizAnswers(previous => ({ ...previous, [id]: answer }))} onNext={() => setQuizIndex(index => Math.min(index + 1, (problem.questions?.length || 1) - 1))} onPrevious={() => setQuizIndex(index => Math.max(0, index - 1))} onSubmit={submitCode} disabled={!battleActive || Boolean(busy)} submitted={quizSubmitted} /> : <>
              <div className="codewar-tabs"><button className="active">{activeFileName}</button><span>Team sync: {myTeam}</span></div>
              {languageWarning && <div className="codewar-language-warning">{languageWarning}</div>}
               <Editor height="calc(100vh - 430px)" theme="vs-dark" language={editorLanguage} value={code} onChange={(value) => updateCode(value || "")} options={{ readOnly: !battleActive, minimap: { enabled: false }, fontSize: 15, wordWrap: "on", scrollBeyondLastLine: false, automaticLayout: true }} />
              <small><span /> Saved for Team {myTeam}</small>
            </>}
          </section>
           <section className="codewar-center-console" aria-label="Code War console">
            <div className="codewar-panel-tabs">
              {['input', 'output', 'history'].map(tab => <button key={tab} type="button" className={activeTab === tab ? 'active' : ''} onClick={() => setActiveTab(tab)}>{tab}</button>)}
            </div>
            {activeTab === 'input' && <textarea value={stdin} onChange={(event) => setStdin(event.target.value)} placeholder="Custom input (stdin)" aria-label="Custom input" />}
            {activeTab === 'output' && <pre>{output}</pre>}
            {activeTab === 'history' && <div className="codewar-history-panel"><h3>{arena.status === 'COMPLETED' ? 'Battle submissions for review' : 'Your submitted snapshots'}</h3>{!attempts.length && <p>No submissions yet.</p>}{attempts.map(attempt => <details key={attempt.id}><summary>Team {attempt.team} · {new Date(attempt.receivedAt).toLocaleString()} · {attempt.result.verdict.replaceAll('_', ' ')} · {attempt.score == null ? 'Review required' : `${attempt.score}/100`}</summary><pre>{attempt.code}</pre></details>)}</div>}
           </section>
        </div>
      </section>
      <aside className="codewar-status">
        <section>
          <h2><Swords size={18} /> Duel Status</h2>
          <WarScore title={myTeam === "LOOP" ? "Team Loop" : "Team Sider"} players={myPlayers} score={myScore} tone={myTeam.toLowerCase()} />
          <div className="codewar-vs-small">VS</div>
          <WarScore title={opponentTeam === "LOOP" ? "Team Loop" : "Team Sider"} players={opponentPlayers} score={opponentScore} tone={opponentTeam.toLowerCase()} />
        </section>
        <section>
          <h2><Trophy size={18} /> Live Progress</h2>
          <ProgressRow label="Your team" value={myScore.progress} tone={myTeam.toLowerCase()} />
          <ProgressRow label="Opponent" value={opponentScore.progress} tone={opponentTeam.toLowerCase()} />
          <p className="codewar-panel-hint">Progress updates after judged submissions.</p>
        </section>
        <section className="codewar-stats">
          <h2><Users size={18} /> Battle Stats</h2>
          <div><span>Attempts</span><strong>{myScore.attempts}</strong></div>
          <div><span>Best Score</span><strong>{myScore.score}</strong></div>
          <div><span>Progress</span><strong>{myScore.progress}%</strong></div>
        </section>
      </aside>
      {exitPrompt && <dialog ref={exitDialog} onCancel={event => { event.preventDefault(); if (!exiting) setExitPrompt(false); }} aria-labelledby="codewar-exit-title" className="codewar-exit-dialog">
        <h2 id="codewar-exit-title">{isHost ? 'End Codewar for everyone?' : 'Leave this room?'}</h2>
        <p>{isHost ? 'This closes the battle for both teams and stops voice chat. Existing submissions are retained; no winner is awarded for an ended battle.' : 'You will leave team chat and voice. The battle continues for the other players.'}</p>
        <button type="button" autoFocus disabled={exiting} onClick={() => setExitPrompt(false)}>Stay in battle</button>
        <button type="button" disabled={exiting} onClick={exitBattle}>{exiting ? 'Please wait…' : isHost ? 'End Codewar' : 'Leave Room'}</button>
      </dialog>}
    </main>
  );
}

function WarScore({ title, players, score, tone }) {
  return (
    <article className={`codewar-score-card ${tone}`}>
      <div>{title.charAt(5)}</div>
      <strong>{title}</strong>
      <span>{players.filter(player => player.isOnline).length} online</span>
      <small>Score <b>{score.score}</b></small>
      <small>Attempts <b>{score.attempts}</b></small>
    </article>
  );
}

function ProgressRow({ label, value, tone }) {
  return (
    <div className={`codewar-progress-row ${tone}`}>
      <span>{label}<strong>{value}%</strong></span>
      <div><i style={{ width: `${value}%` }} /></div>
    </div>
  );
}
