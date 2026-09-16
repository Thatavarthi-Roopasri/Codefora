import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  BadgeCheck,
  Bug,
  CheckCircle2,
  Code,
  Copy,
  Eye,
  Globe2,
  LayoutGrid,
  Loader2,
  LockKeyhole,
  Minus,
  Monitor,
  PanelsTopLeft,
  Play,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Sword,
  Trophy,
  UserPlus
} from "lucide-react";
import { api } from "../api/client";
import { Navbar } from "../components/Navbar";
import { useAuth } from "../hooks/useAuth";
import { useServerClock } from "../hooks/useServerClock";
import { WarCountdown } from "../components/WarCountdown";
import { copyToClipboard } from "../lib/clipboard";
import { socket } from "../lib/socket";
import { getHostToken, getInviteCode, saveHostToken, saveInviteCode, saveUsername } from "../lib/navigation";

const battleTypes = [
  [Code, "programming", "Programming"],
  [BadgeCheck, "html-css", "HTML / CSS"],
  [Sparkles, "react", "React"],
  [Bug, "debugging", "Debugging"],
  [PanelsTopLeft, "full-stack", "Full Stack"],
  [Monitor, "ui-clone", "UI Clone"],
  [CheckCircle2, "mcqs", "MCQs"],
  [ShieldCheck, "saboteur", "Saboteur"]
];

const languageByBattle = {
  programming: ["Java", "Python", "C", "C++", "JavaScript"],
  "html-css": ["HTML/CSS"],
  react: ["React/JavaScript"],
  debugging: ["Java", "Python", "C++", "JavaScript"],
  "full-stack": ["JavaScript"],
  "ui-clone": ["HTML/CSS"],
  mcqs: ["Web Fundamentals", "JavaScript", "HTML/CSS", "React", "DSA"],
  saboteur: ["JavaScript"]
};

const customTimeBounds = { min: 5, max: 120, step: 5 };
const customTimePresets = [10, 20, 40, 75, 120];

const recommendedCustomTimes = {
  programming: { Easy: 20, Medium: 35, Hard: 50 },
  "html-css": { Easy: 25, Medium: 40, Hard: 55 },
  react: { Easy: 30, Medium: 45, Hard: 60 },
  debugging: { Easy: 15, Medium: 30, Hard: 45 },
  "full-stack": { Easy: 45, Medium: 60, Hard: 90 },
  "ui-clone": { Easy: 30, Medium: 45, Hard: 60 },
  mcqs: { Easy: 10, Medium: 15, Hard: 20 },
  saboteur: { Easy: 20, Medium: 30, Hard: 45 }
};

function formatBattleType(value) {
  return battleTypes.find(([, id]) => id === value)?.[2] || "Programming";
}

function secondsFromLimit(value, customMinutes) {
  if (value === "custom") return clampCustomMinutes(customMinutes) * 60;
  return Number(value) * 60;
}

function clampCustomMinutes(value) {
  const minutes = Number(value);
  if (!Number.isFinite(minutes)) return 30;
  return Math.max(customTimeBounds.min, Math.min(Math.round(minutes), customTimeBounds.max));
}

function smartCustomMinutes(battleType, difficulty) {
  return recommendedCustomTimes[battleType]?.[difficulty] || 30;
}

function roundToStep(minutes) {
  return Math.round(minutes / customTimeBounds.step) * customTimeBounds.step;
}

function smartTimeSuggestions(battleType, difficulty) {
  const recommended = smartCustomMinutes(battleType, difficulty);
  return [
    ["Quick", clampCustomMinutes(roundToStep(recommended * 0.65))],
    ["Recommended", clampCustomMinutes(recommended)],
    ["Deep Work", clampCustomMinutes(roundToStep(recommended * 1.35))]
  ];
}

function formatDuration(seconds) {
  const minutes = Math.round((Number(seconds) || 0) / 60);
  return `${minutes} Minutes`;
}

function getSessionId(roomCode) {
  const key = `codefora_session_${roomCode}`;
  let sessionId = sessionStorage.getItem(key);
  if (!sessionId) {
    sessionId = `sess-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(key, sessionId);
  }
  return sessionId;
}

function summarizeArena(arena, fallbackName = "") {
  const problemTypeByBattle = {
    programming: "Algorithm",
    "html-css": "Responsive UI",
    react: "Component Build",
    debugging: "Bug Fixing",
    "full-stack": "API + UI",
    "ui-clone": "Pixel Match",
    mcqs: "Quiz",
    saboteur: "Sabotage Hunt"
  };
  return {
    roomName: arena?.roomName || fallbackName || "Code War Arena",
    battleType: formatBattleType(arena?.battleType),
    language: arena?.language || "Java",
    difficulty: arena?.difficulty || "Medium",
    teamSize: `${arena?.teamSize || 1} vs ${arena?.teamSize || 1}`,
    timeLimit: formatDuration(arena?.timeLimitSeconds || 1800),
    visibility: arena?.visibility === "private" ? "Private" : "Public",
    problemType: problemTypeByBattle[arena?.battleType] || "Algorithm",
    aiHints: arena?.aiHintsEnabled === false ? "Disabled" : "Enabled",
    voiceChat: arena?.voiceChatEnabled === false ? "Disabled" : "Enabled",
    spectators: arena?.spectatorsAllowed === false ? "Not allowed" : "Allowed",
    ...(arena?.battleType === "mcqs" ? { questionCount: `${arena?.questionCount || 5} Questions` } : {})
  };
}

function labelize(value) {
  return String(value || "")
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (char) => char.toUpperCase());
}

export function WarArenaPage({ mode = "create" }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { roomCode } = useParams();
  const { user, loading: authLoading } = useAuth();
  const [roomName, setRoomName] = useState("");
  const [teamSize] = useState(1);
  const [battleType, setBattleType] = useState("programming");
  const [battleTypeSearch, setBattleTypeSearch] = useState("");
  const [language, setLanguage] = useState("Java");
  const [questionCount, setQuestionCount] = useState(5);
  const [difficulty, setDifficulty] = useState("Medium");
  const [timeLimit, setTimeLimit] = useState("30");
  const [customMinutes, setCustomMinutes] = useState(30);
  const [visibility, setVisibility] = useState("public");
  const [aiHintsEnabled, setAiHintsEnabled] = useState(true);
  const [voiceChatEnabled, setVoiceChatEnabled] = useState(true);
  const [spectatorsAllowed, setSpectatorsAllowed] = useState(true);
  const [creating, setCreating] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joiningByCode, setJoiningByCode] = useState(false);
  const [joinCodeError, setJoinCodeError] = useState("");
  const [room, setRoom] = useState(null);
  const [arena, setArena] = useState(null);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");
  const countdownNow = useServerClock({ active: mode === 'room', serverNow: arena?.serverNow });

  const languageOptions = languageByBattle[battleType] || languageByBattle.programming;
  const customMinutesValue = clampCustomMinutes(customMinutes);
  const customSuggestions = smartTimeSuggestions(battleType, difficulty);
  const visibleBattleTypes = useMemo(() => {
    const query = battleTypeSearch.trim().toLowerCase();
    if (!query) return battleTypes;
    return battleTypes.filter(([, value, label]) => `${value} ${label}`.toLowerCase().includes(query));
  }, [battleTypeSearch]);
  const createSummary = summarizeArena({
    roomName: roomName.trim() || "Code War Arena",
    battleType,
    language,
    difficulty,
    teamSize,
    timeLimitSeconds: secondsFromLimit(timeLimit, customMinutesValue),
    visibility,
    aiHintsEnabled,
    voiceChatEnabled,
    spectatorsAllowed,
    ...(battleType === "mcqs" ? { questionCount } : {})
  });

  useEffect(() => {
    if (!languageOptions.includes(language)) {
      setLanguage(languageOptions[0]);
    }
  }, [battleType, language, languageOptions]);

  useEffect(() => {
    if (mode !== "room" || !roomCode || (authLoading && !user)) return undefined;
    let active = true;
    let joinLobby;
    async function bootstrapLobby() {
      try {
        const query = new URLSearchParams(location.search);
        const linkInviteCode = query.get("inviteCode") || query.get("code");
        if (linkInviteCode) saveInviteCode(roomCode, linkInviteCode);
        const payload = await api.getWarRoom(roomCode, linkInviteCode || getInviteCode(roomCode), getHostToken(roomCode));
        if (!active) return;
        if (payload.warArena?.status === 'CANCELLED') { navigate('/rooms', { replace: true }); return; }
        setRoom(payload);
        setArena(payload.warArena);
        const displayName = user?.displayName || user?.username || user?.email?.split("@")[0] || localStorage.getItem("codefora_username") || "Developer";
        const joinData = {
          roomId: payload.id,
          username: displayName,
          inviteCode: getInviteCode(payload.id),
          hostToken: getHostToken(payload.id),
          userId: user?.uid || user?.id || localStorage.getItem("codefora_user_id") || null,
          sessionId: getSessionId(payload.id)
        };
        saveUsername(displayName);
        socket.connect();
        joinLobby = () => socket.emit("room:join", joinData);
        socket.on("connect", joinLobby);
        if (socket.connected) joinLobby();
      } catch (err) {
        setError(err.message || "Could not open this war room.");
      }
    }
    bootstrapLobby();

    const handleRoomState = (payload) => {
      setRoom(payload);
      if (payload?.warArena) setArena(payload.warArena);
    };
    const handleWarState = (payload) => setArena(payload);
    const handleWarError = (payload) => setToast(payload?.message || "Arena action failed.");
    socket.on("room:state", handleRoomState);
    socket.on("war:state", handleWarState);
    socket.on("war:error", handleWarError);

    return () => {
      active = false;
      socket.off("room:state", handleRoomState);
      socket.off("war:state", handleWarState);
      socket.off("war:error", handleWarError);
      if (joinLobby) socket.off("connect", joinLobby);
    };
  }, [mode, navigate, roomCode, user, authLoading, location.search]);

  useEffect(() => {
    if (mode === 'room') {
      // Fetch the editor while players assemble, before the countdown begins.
      import('./CodeWarBattlePage').catch(() => {});
    }
  }, [mode]);

  useEffect(() => {
    if (mode !== 'room' || !room?.id) return;
    const countdownFinished = arena?.status === 'COUNTDOWN' && arena.startsAt && countdownNow >= arena.startsAt;
    if (!countdownFinished && !['ACTIVE', 'JUDGING', 'COMPLETED'].includes(arena?.status)) return;
    const inviteCode = getInviteCode(room.id);
    navigate(`/war-arena/battle/${room.id}${inviteCode ? `?inviteCode=${encodeURIComponent(inviteCode)}` : ''}`, { replace: true });
  }, [mode, room?.id, arena?.status, arena?.startsAt, countdownNow, navigate]);

  function selectBattleType(nextBattleType) {
    setBattleType(nextBattleType);
    if (timeLimit === "custom") {
      setCustomMinutes(smartCustomMinutes(nextBattleType, difficulty));
    }
  }

  function selectDifficulty(nextDifficulty) {
    setDifficulty(nextDifficulty);
    if (timeLimit === "custom") {
      setCustomMinutes(smartCustomMinutes(battleType, nextDifficulty));
    }
  }

  function selectTimeLimit(nextLimit) {
    setTimeLimit(nextLimit);
    if (nextLimit === "custom") {
      setCustomMinutes(smartCustomMinutes(battleType, difficulty));
    }
  }

  function adjustCustomMinutes(delta) {
    setTimeLimit("custom");
    setCustomMinutes((minutes) => clampCustomMinutes((Number(minutes) || 30) + delta));
  }

  function updateCustomMinutes(value) {
    const digits = String(value).replace(/[^\d]/g, "");
    setCustomMinutes(digits ? Number(digits) : "");
  }

  function commitCustomMinutes() {
    setCustomMinutes((minutes) => clampCustomMinutes(minutes));
  }

  async function createWarRoom() {
    const cleanName = roomName.trim();
    if (!cleanName) {
      setError("Room name is required.");
      return;
    }
    if (creating) return;
    const displayName = user?.displayName || user?.username || user?.email?.split("@")[0] || "Developer";
    setCreating(true);
    setError("");
    try {
      saveUsername(displayName);
      const payload = await api.createRoom({
        name: cleanName,
        username: displayName,
        visibility,
        max: teamSize * 2,
        userId: user?.uid || user?.id || null,
        problemId: "codewars",
        initialLanguage: language,
        warArena: {
          roomName: cleanName,
          battleType,
          language,
          difficulty,
          teamSize,
          timeLimitSeconds: secondsFromLimit(timeLimit, customMinutesValue),
          ...(battleType === "mcqs" ? { questionCount } : {}),
          visibility,
          aiHintsEnabled,
          voiceChatEnabled,
          spectatorsAllowed,
        }
      });
      saveHostToken(payload.id, payload.hostToken);
      saveInviteCode(payload.id, payload.inviteCode);
      const params = payload.inviteCode ? `?inviteCode=${encodeURIComponent(payload.inviteCode)}` : "";
      navigate(`/war-arena/room/${payload.id}${params}`);
    } catch (err) {
      setError(err.message || "Failed to create war room.");
    } finally {
      setCreating(false);
    }
  }

  async function joinWarRoomByCode(event) {
    event?.preventDefault();
    const cleanCode = joinCode.replace(/^#/, "").replace(/\s+/g, "").trim().toUpperCase();
    if (!cleanCode) {
      setJoinCodeError("Enter a Code War room code.");
      return;
    }
    if (joiningByCode) return;
    setJoiningByCode(true);
    setJoinCodeError("");
    try {
      let payload;
      try {
        payload = await api.getRoom(cleanCode);
      } catch {
        payload = await api.getRoomByInviteCode(cleanCode);
      }
      if (!payload?.warArena) {
        throw new Error("That code is not a Code War room.");
      }
      if (payload.inviteCode) saveInviteCode(payload.id, payload.inviteCode);
      const params = payload.inviteCode ? `?inviteCode=${encodeURIComponent(payload.inviteCode)}` : "";
      navigate(`/war-arena/room/${payload.id}${params}`);
    } catch (err) {
      setJoinCodeError(err.message || "Could not find that Code War room.");
    } finally {
      setJoiningByCode(false);
    }
  }

  if (mode === "room") {
    return <WarArenaLobby room={room} arena={arena} error={error} toast={toast} setToast={setToast} countdownNow={countdownNow} />;
  }

  return (
    <main className="problems-shell war-arena-shell">
      <Navbar />
      <section className="codewars-room-builder war-arena-builder" aria-label="Create Code War Arena room">
        <div className="codewars-builder-main">
          <header className="codewars-builder-header">
            <Sword size={48} />
            <h1>Create War Room</h1>
          </header>
          {error && <div className="codewars-error">{error}</div>}
          <form className="codewars-join-card" onSubmit={joinWarRoomByCode}>
            <label>
              <span><Search size={16} /> Join Existing Code War</span>
              <div>
                <input
                  value={joinCode}
                  onChange={(event) => {
                    setJoinCode(event.target.value.toUpperCase().replace(/\s+/g, "").slice(0, 20));
                    setJoinCodeError("");
                  }}
                  placeholder="Search by CWA room code"
                  aria-label="Search by Code War room code"
                  autoCapitalize="characters"
                  autoComplete="off"
                  spellCheck="false"
                />
                <button type="submit" disabled={joiningByCode || !joinCode.trim()}>
                  {joiningByCode ? <Loader2 size={18} className="spin" /> : "Join Lobby"}
                </button>
              </div>
            </label>
            <div className="codewars-join-meta">
              <span>Paste a code such as <strong>CWA-XOHO</strong>; spaces and # are accepted.</span>
              {joinCode && <button type="button" onClick={() => { setJoinCode(""); setJoinCodeError(""); }}>Clear</button>}
            </div>
            {joinCodeError && <small>{joinCodeError}</small>}
          </form>
          <div className="codewars-top-row codewars-top-row-single">
            <label className="codewars-field codewars-room-name">
              <span><LayoutGrid size={16} /> Room Name</span>
              <input maxLength={30} list="war-room-name-suggestions" value={roomName} onChange={(event) => setRoomName(event.target.value)} placeholder="Search or enter a room name" autoComplete="off" />
              <datalist id="war-room-name-suggestions">
                <option value="Frontend Sprint" />
                <option value="DSA Practice" />
                <option value="Weekend Code War" />
              </datalist>
              <small>{roomName.length} / 30</small>
            </label>
          </div>
          <section className="codewars-section">
            <div className="codewars-section-heading">
              <h2><Sword size={18} /> Battle Type</h2>
              <label className="codewars-mode-search">
                <Search size={15} aria-hidden="true" />
                <input value={battleTypeSearch} onChange={(event) => setBattleTypeSearch(event.target.value)} placeholder="Search modes" aria-label="Search battle types" />
                {battleTypeSearch && <button type="button" onClick={() => setBattleTypeSearch("")} aria-label="Clear battle type search">×</button>}
              </label>
            </div>
            <div className="codewars-battle-grid">
              {visibleBattleTypes.map(([Icon, value, label]) => (
                <button key={value} type="button" className={battleType === value ? "active" : ""} onClick={() => selectBattleType(value)}>
                  <Icon size={42} />
                  <span>{label}</span>
                  {value === "saboteur" && <strong>NEW</strong>}
                </button>
              ))}
            </div>
            {!visibleBattleTypes.length && <p className="codewars-search-empty">No battle modes match “{battleTypeSearch}”. Try Programming, React, MCQs, or DSA.</p>}
          </section>
          <section className="codewars-settings-strip" aria-label="War room settings">
            <label className="codewars-select-field">
              <span><Code size={16} /> Language</span>
              <select value={language} onChange={(event) => setLanguage(event.target.value)}>
                {languageOptions.map((option) => <option key={option}>{option}</option>)}
              </select>
            </label>
            {battleType === "mcqs" && (
              <label className="codewars-select-field">
                <span><CheckCircle2 size={16} /> Number of questions</span>
                <select value={questionCount} onChange={(event) => setQuestionCount(Number(event.target.value))}>
                  {[5, 10, 15].map((count) => <option key={count} value={count}>{count} questions</option>)}
                </select>
              </label>
            )}
            <div className="codewars-option-group">
              <span>Difficulty</span>
              <div>
                {["Easy", "Medium", "Hard"].map((level) => (
                  <button key={level} type="button" className={difficulty === level ? "active" : ""} onClick={() => selectDifficulty(level)}>
                    <span className={`codewars-dot ${level.toLowerCase()}`} /> {level}
                  </button>
                ))}
              </div>
            </div>
            <div className="codewars-option-group">
              <span>Time Limit</span>
              <div>
                {["15", "30", "45", "60", "90"].map((limit) => (
                  <button key={limit} type="button" className={timeLimit === limit ? "active" : ""} onClick={() => selectTimeLimit(limit)}>
                    {limit} min
                  </button>
                ))}
                <button type="button" className={timeLimit === "custom" ? "active" : ""} onClick={() => selectTimeLimit("custom")}>
                  Custom <small>{customMinutesValue}m</small>
                </button>
              </div>
              {timeLimit === "custom" && (
                <div className="war-custom-time-panel">
                  <div className="war-smart-time-row">
                    {customSuggestions.map(([label, minutes]) => (
                      <button
                        key={label}
                        type="button"
                        className={customMinutesValue === minutes ? "active" : ""}
                        onClick={() => setCustomMinutes(minutes)}
                      >
                        <span>{label}</span>
                        <strong>{minutes}m</strong>
                      </button>
                    ))}
                  </div>
                  <div className="war-custom-stepper" aria-label="Custom time limit">
                    <button type="button" onClick={() => adjustCustomMinutes(-customTimeBounds.step)} aria-label="Decrease custom time"><Minus size={16} /></button>
                    <label>
                      <input
                        type="number"
                        min={customTimeBounds.min}
                        max={customTimeBounds.max}
                        value={customMinutes}
                        onChange={(event) => updateCustomMinutes(event.target.value)}
                        onBlur={commitCustomMinutes}
                        aria-label="Custom time limit in minutes"
                      />
                      <span>minutes</span>
                    </label>
                    <button type="button" onClick={() => adjustCustomMinutes(customTimeBounds.step)} aria-label="Increase custom time"><Plus size={16} /></button>
                  </div>
                  <input
                    className="war-custom-slider"
                    type="range"
                    min={customTimeBounds.min}
                    max={customTimeBounds.max}
                    step={customTimeBounds.step}
                    value={customMinutesValue}
                    onChange={(event) => setCustomMinutes(Number(event.target.value))}
                    aria-label="Custom time slider"
                  />
                  <div className="war-custom-presets">
                    {customTimePresets.map((minutes) => (
                      <button key={minutes} type="button" className={customMinutesValue === minutes ? "active" : ""} onClick={() => setCustomMinutes(minutes)}>
                        {minutes}m
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
          <section className="codewars-section">
            <h2><Globe2 size={18} /> Room Visibility</h2>
            <div className="codewars-visibility-layout">
              <div className="codewars-visibility-grid">
                <button type="button" className={visibility === "public" ? "active" : ""} onClick={() => setVisibility("public")}><Globe2 size={30} /> Public</button>
                <button type="button" className={visibility === "private" ? "active" : ""} onClick={() => setVisibility("private")}><LockKeyhole size={28} /> Private</button>
              </div>
              <div className="war-option-toggles" aria-label="Optional settings">
                {[
                  ["AI Hints", aiHintsEnabled, setAiHintsEnabled],
                  ["Voice Chat", voiceChatEnabled, setVoiceChatEnabled],
                  ["Spectators", spectatorsAllowed, setSpectatorsAllowed]
                ].map(([label, checked, setter]) => (
                  <label key={label}>
                    <input type="checkbox" checked={checked} onChange={(event) => setter(event.target.checked)} />
                    <span className="war-toggle-check" aria-hidden="true" />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>
          </section>
          <button className="codewars-next-button" type="button" onClick={createWarRoom} disabled={creating || !roomName.trim()}>
            {creating ? <><Loader2 size={22} className="spin" /> Creating War Room...</> : <span className="codewars-next-label">Next <span aria-hidden="true">-&gt;</span></span>}
            <small>Continue to Lobby</small>
          </button>
        </div>
        <WarArenaPreview summary={createSummary} />
      </section>
    </main>
  );
}

function WarArenaPreview({ summary }) {
  return (
    <aside className="codewars-preview-panel">
      <h2><Eye size={22} /> War Room Preview</h2>
      <div className="codewars-arena-preview" aria-hidden="true">
        <div className="codewars-fighter codewars-fighter-loop"><span>LOOP</span></div>
        <strong>VS</strong>
        <div className="codewars-fighter codewars-fighter-sider"><span>SIDER</span></div>
      </div>
      <section className="codewars-summary-card">
        <h3>Room Summary</h3>
        {Object.entries(summary).map(([label, value]) => (
          <div className="codewars-summary-row" key={label}>
            <span>{labelize(label)}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </section>
      <section className="codewars-win-card">
        <h3><Trophy size={20} /> Winner will be determined by</h3>
        {["Server-verified correctness", "Earliest best submission for ties", "Build modes require team review"].map((item) => (
          <p key={item}><CheckCircle2 size={17} /> {item}</p>
        ))}
      </section>
    </aside>
  );
}

function WarArenaLobby({ room, arena, error, toast, setToast, countdownNow }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [inviteStates, setInviteStates] = useState({});
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [inviteFriends, setInviteFriends] = useState([]);
  const summary = summarizeArena(arena, room?.name);
  const participants = arena?.participants || [];
  const loop = getTeamParticipants(arena, "LOOP");
  const sider = getTeamParticipants(arena, "SIDER");
  const required = (arena?.teamSize || 1) * 2;
  const readyCount = [...loop, ...sider].filter((player) => player.isReady).length;
  const readiness = getLobbyReadiness(arena);
  const currentParticipant = useMemo(() => {
    const localUserId = localStorage.getItem("codefora_user_id");
    const sessionId = room?.id ? sessionStorage.getItem(`codefora_session_${room.id}`) : null;
    return participants.find((item) => item.userId === localUserId || item.sessionId === sessionId);
  }, [participants, room?.id]);
  const isHost = currentParticipant?.role === "HOST" || Boolean(room?.id && getHostToken(room.id));
  const battleCanBeStarted = arena?.status === "READY_CHECK" && isHost && readiness.canStart;
  const startDisabled = !battleCanBeStarted || arena?.status === "COUNTDOWN" || arena?.status === "ACTIVE";
  const currentUserId = user?.uid || user?.id || localStorage.getItem("codefora_user_id") || "";

  useEffect(() => {
    if (!room?.id || !currentUserId || currentUserId.startsWith("guest-")) {
      setInviteFriends([]);
      setFriendsLoading(false);
      return undefined;
    }

    let active = true;
    async function refreshFriends() {
      setFriendsLoading(true);
      try {
        const profile = await api.getProfile(currentUserId);
        const friends = Array.isArray(profile?.friends) ? profile.friends : [];
        const friendProfiles = await Promise.all(friends.map(async (friend) => {
          const friendProfile = await api.getProfile(friend.id).catch(() => null);
          return normalizeInviteFriend(friend, friendProfile);
        }));
        if (active) setInviteFriends(friendProfiles.filter(Boolean));
      } catch {
        if (active) setInviteFriends([]);
      } finally {
        if (active) setFriendsLoading(false);
      }
    }

    refreshFriends();
    socket.on("friends:refresh", refreshFriends);
    socket.on("presence:changed", refreshFriends);
    return () => {
      active = false;
      socket.off("friends:refresh", refreshFriends);
      socket.off("presence:changed", refreshFriends);
    };
  }, [room?.id, currentUserId]);

  function joinTeam(team) {
    socket.emit("war:team:join", { roomId: room.id, team });
  }

  function setReady() {
    socket.emit("war:ready", { roomId: room.id, ready: !currentParticipant?.isReady });
  }

  function startCountdown() {
    socket.emit("war:start_countdown", { roomId: room.id });
  }

  async function copyRoomCode() {
    try {
      await copyToClipboard(room.id);
      setToast("Room code copied");
    } catch {
      setToast("Could not copy room code");
    } finally {
      setTimeout(() => setToast(""), 1800);
    }
  }

  async function copyInviteLink() {
    const inviteCode = room.inviteCode || getInviteCode(room.id);
    const inviteUrl = new URL(`/war-arena/room/${room.id}`, window.location.origin);
    if (inviteCode) inviteUrl.searchParams.set("inviteCode", inviteCode);
    try {
      await copyToClipboard(inviteUrl.toString());
      setToast("Invite link copied");
    } catch {
      setToast("Could not copy invite link");
    } finally {
      setTimeout(() => setToast(""), 1800);
    }
  }

  async function inviteFriend(friend) {
    if (!room?.id || inviteStates[friend.id] === "sending" || inviteStates[friend.id] === "invited") return;
    setInviteStates((states) => ({ ...states, [friend.id]: "sending" }));
    try {
      await api.sendRoomInvite({ targetUserId: friend.id, roomId: room.id });
      setInviteStates((states) => ({ ...states, [friend.id]: "invited" }));
      setToast(`Invited ${friend.name}`);
    } catch {
      setInviteStates((states) => ({ ...states, [friend.id]: "failed" }));
      setToast(`Could not invite ${friend.name}`);
    } finally {
      setTimeout(() => setToast(""), 1800);
    }
  }

  if (error) {
    return <main className="problems-shell war-arena-shell"><Navbar /><section className="war-lobby-empty">{error}</section></main>;
  }

  if (!room || !arena) {
    return <main className="problems-shell war-arena-shell"><Navbar /><section className="war-lobby-empty"><Loader2 className="spin" /> Loading arena...</section></main>;
  }

  return (
    <main className="problems-shell war-arena-shell">
      <Navbar />
      {['COUNTDOWN', 'ACTIVE'].includes(arena.status) && (
        <WarCountdown arena={arena} now={countdownNow} team={currentParticipant?.team} loop={loop} sider={sider} />
      )}
      <section className="war-lobby" inert={['COUNTDOWN', 'ACTIVE'].includes(arena.status) ? '' : undefined}>
        <header className="war-lobby-header">
          <div className="war-lobby-title">
            <Sword size={44} />
            <div>
              <h1>Code War Arena</h1>
              <span className="war-status-pill"><span /> {arena.status === "ACTIVE" ? "Battle active" : arena.status === "COUNTDOWN" ? "Starting battle" : "Waiting for players"}</span>
            </div>
          </div>
          <div className="war-room-code-group">
            <div className="war-room-code">
              <span>#{room.id}</span>
              <button type="button" onClick={copyRoomCode} aria-label="Copy room code"><Copy size={17} /></button>
            </div>
            <button type="button" className="war-link-copy" onClick={copyInviteLink}>Copy Link</button>
          </div>
        </header>
        {toast && <div className="war-toast">{toast}</div>}
        <div className="war-lobby-grid">
          <div className="war-lobby-main">
            <div className="war-versus-grid">
              <section className="war-team-panel war-team-loop">
                <div className="war-team-heading">
                  <h2><Sword size={19} /> Team Loop</h2>
                  <span>{loop.length} / {arena.teamSize}</span>
                </div>
                <TeamSlots players={loop} capacity={arena.teamSize} onEmptySlot={() => joinTeam("LOOP")} />
                <button type="button" onClick={() => joinTeam("LOOP")} disabled={arena.status !== "READY_CHECK" && arena.status !== "WAITING"}>Join Loop</button>
              </section>
              <div className="war-vs-mark" aria-hidden="true">VS</div>
              <section className="war-team-panel war-team-sider">
                <div className="war-team-heading">
                  <h2><ShieldCheck size={19} /> Team Sider</h2>
                  <span>{sider.length} / {arena.teamSize}</span>
                </div>
                <TeamSlots players={sider} capacity={arena.teamSize} onEmptySlot={() => joinTeam("SIDER")} />
                <button type="button" onClick={() => joinTeam("SIDER")} disabled={arena.status !== "READY_CHECK" && arena.status !== "WAITING"}>Join Sider</button>
              </section>
            </div>
            <section className="war-ready-card war-ready-card-inline">
              <h2>Ready Check</h2>
              <p>{readyCount} / {required} Ready</p>
              <div className="war-ready-bar"><span style={{ width: `${required ? (readyCount / required) * 100 : 0}%` }} /></div>
              <div className="war-ready-list">
                {[...loop, ...sider, ...participants.filter((player) => !player.team || player.team === "NONE")].slice(0, 10).map((player) => (
                  <span key={player.id}>
                    <span>{player.name}</span>
                    {player.isReady ? <CheckCircle2 size={16} /> : <span className="war-ready-empty" />}
                  </span>
                ))}
              </div>
              <button type="button" onClick={setReady} disabled={!currentParticipant?.team || currentParticipant.team === "NONE" || arena.status === "COUNTDOWN" || arena.status === "ACTIVE"}>
                {currentParticipant?.isReady ? "Cancel Ready" : "I'm Ready"}
              </button>
              <button type="button" className={`war-start-button ${battleCanBeStarted ? "armed" : ""}`} onClick={startCountdown} disabled={startDisabled} title={battleCanBeStarted ? "Start Code War" : readiness.reason}>
                <Play size={16} /> Start Battle
              </button>
              <small>{isHost ? readiness.reason : "Only host can start battle"}</small>
            </section>
            <button type="button" className="war-leave-button" onClick={() => navigate("/rooms")}>Leave Room</button>
            <InviteFriends friends={inviteFriends} loading={friendsLoading} canInvite={Boolean(currentUserId && !currentUserId.startsWith("guest-"))} inviteStates={inviteStates} onInvite={inviteFriend} />
          </div>
          <aside className="war-lobby-sidebar">
            <section className="war-summary-panel">
              <h2><InfoIcon /> Room Summary</h2>
              {Object.entries(summary).map(([label, value]) => (
                <div key={label}><span>{labelize(label)}</span><strong>{value}</strong></div>
              ))}
            </section>
            <section className="war-activity-panel">
              <h2>Recent Activity</h2>
              {(arena.activity || []).slice(-6).reverse().map((item) => <p key={item.id}>{item.text}</p>)}
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}

function InfoIcon() {
  return <Eye size={16} aria-hidden="true" />;
}

function InviteFriends({ friends, loading, canInvite, inviteStates, onInvite }) {
  return (
    <section className="war-invite-panel">
      <h2><UserPlus size={18} /> Invite Friends</h2>
      {loading ? (
        <div className="war-invite-empty"><Loader2 size={18} className="spin" /> Loading friends...</div>
      ) : !canInvite ? (
        <div className="war-invite-empty">Sign in to invite your real friends.</div>
      ) : friends.length === 0 ? (
        <div className="war-invite-empty">No friends found. Add friends from the navbar, then invite them here.</div>
      ) : (
        <div className="war-invite-list">
          {friends.map((friend) => {
          const state = inviteStates[friend.id] || "invite";
          return (
            <article key={friend.id}>
              <div className="war-invite-avatar">
                {friend.photoURL ? <img src={friend.photoURL} alt="" /> : friend.name.charAt(0)?.toUpperCase() || "U"}
              </div>
              <strong>{friend.name}</strong>
              <span><span className={friend.presence === "online" || friend.presence === "in-room" ? "online" : ""} /> {friend.presenceLabel}</span>
              <small>{friend.detail}</small>
              <button type="button" onClick={() => onInvite(friend)} disabled={state === "sending" || state === "invited"}>
                {state === "sending" ? "Sending" : state === "invited" ? "Invited" : state === "failed" ? "Retry" : "Invite"}
              </button>
            </article>
          );
          })}
        </div>
      )}
    </section>
  );
}

function normalizeInviteFriend(friend, profile) {
  if (!friend?.id) return null;
  const stats = profile?.stats || {};
  const solved = Number(stats.problemsSolved) || 0;
  const roomsJoined = Number(stats.roomsJoined) || 0;
  const displayName = profile?.displayName || friend.name || "Friend";
  const presence = profile?.presence || "offline";
  return {
    id: friend.id,
    name: displayName,
    friendCode: profile?.friendCode || friend.friendCode || "",
    photoURL: profile?.photoURL || friend.photoURL || "",
    presence,
    presenceLabel: presence === "in-room" ? "In room" : presence === "online" ? "Online" : "Offline",
    detail: profile?.friendCode ? `ID ${profile.friendCode}` : `${solved} solved | ${roomsJoined} rooms`
  };
}

function TeamSlots({ players, capacity, onEmptySlot }) {
  const slots = Array.from({ length: capacity }, (_, index) => players[index] || null);
  return (
    <div className="war-team-slots">
      {slots.map((player, index) => (
        <article key={player?.id || index} className={player ? "filled" : ""}>
          {player ? (
            <>
              <div>{player.name?.charAt(0)?.toUpperCase() || "U"}</div>
              <strong>{player.name}</strong>
              <span>{player.isOnline ? "Online" : "Offline"} | {player.isReady ? "Ready" : "Not ready"} {player.role === "HOST" ? "| Host" : ""}</span>
            </>
          ) : (
            <>
              <button type="button" className="war-empty-slot-button" onClick={onEmptySlot} aria-label="Join empty team slot"><UserPlus size={18} /></button>
              <span>Waiting for player...</span>
            </>
          )}
        </article>
      ))}
    </div>
  );
}

function getTeamParticipants(arena, team) {
  const participants = arena?.participants || [];
  return (arena?.teams?.[team] || []).map((id) => participants.find((item) => item.id === id)).filter(Boolean);
}

function getLobbyReadiness(arena) {
  if (!arena) return { canStart: false, reason: "Loading room" };
  const capacity = arena.teamSize || 1;
  const loop = getTeamParticipants(arena, "LOOP");
  const sider = getTeamParticipants(arena, "SIDER");
  if (loop.length < capacity) return { canStart: false, reason: "Waiting for Team Loop to fill" };
  if (sider.length < capacity) return { canStart: false, reason: "Waiting for Team Sider to fill" };
  const players = [...loop, ...sider];
  if (players.some((player) => !player.isOnline)) return { canStart: false, reason: "A player is offline" };
  const readyMissing = players.filter((player) => !player.isReady).length;
  if (readyMissing) return { canStart: false, reason: `Waiting for ${readyMissing} players to be ready` };
  return { canStart: true, reason: "All players ready" };
}
