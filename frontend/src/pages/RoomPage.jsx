import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useBlocker, useLocation } from "react-router-dom";
import { Loader2, AlertTriangle, MessageSquare, X as XIcon, ArrowLeft, PanelLeftClose } from "lucide-react";
import { useRoomSession } from "../hooks/useRoomSession";
import { TopBar } from "../components/room/TopBar";
import { EditorPanel } from "../components/room/EditorPanel";
import { InfoModal } from "../components/room/InfoModal";
import { Navbar } from "../components/Navbar";
import { UsersPanel } from "../components/room/UsersPanel";
import { CommsPanel } from "../components/room/CommsPanel";
import { ConsolePanel } from "../components/room/ConsolePanel";
import { FloatingProblem } from "../components/room/FloatingProblem";
import { ProblemPanel } from "../components/room/ProblemPanel";
import { FilesPanel } from "../components/room/FilesPanel";
import { NotesModal } from "../components/room/NotesModal";
import { copyToClipboard } from "../lib/clipboard";
import { TimeTravelModal } from "../components/room/TimeTravelModal";
import { LeftNavBar } from "../components/room/LeftNavBar";
import { FooterBar } from "../components/room/FooterBar";
import { SettingsPanel } from "../components/room/SettingsPanel";
import { WebPreviewFull } from "../components/room/WebPreviewFull";
import { problems } from "../data/problems";
import { getUsername, saveUsername } from "../lib/navigation";
import { useAuth } from "../hooks/useAuth";
import { api } from "../api/client";
import loopsbg from "../../assets/loopsbgimage.jpeg";
import { TargetViewer } from "../components/room/TargetViewer";
import { ScoreModal } from "../components/room/ScoreModal";

export function RoomPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [stdin, setStdin] = useState("");
  const { user } = useAuth();
  function generateGuestName() { return `Guest-${Math.random().toString(36).slice(2, 6).toUpperCase()}`; }
  const initialName = getUsername() || user?.displayName || user?.email?.split("@")[0] || generateGuestName();
  const [joinName, setJoinName] = useState(() => initialName);
  const [joinNameError, setJoinNameError] = useState("");
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [feedbackType, setFeedbackType] = useState('general');
  const infoShownRef = useRef(false);
  const [activeCommsTab, setActiveCommsTab] = useState("chat");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showTimeTravel, setShowTimeTravel] = useState(false);
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const [activeMainTab, setActiveMainTab] = useState("editor"); // "editor", "preview", "notes"

  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const isNotesView = searchParams.get("view") === "notes";


  const [problemSearch, setProblemSearch] = useState("");
  const [problemDifficulty, setProblemDifficulty] = useState("All");
  const [previewProblemId, setPreviewProblemId] = useState(null);

  const previewProblem = previewProblemId ? problems.find(p => p.id === previewProblemId) : null;
  const filteredProblems = problems.filter(p => {
    if (problemDifficulty !== "All" && p.difficulty !== problemDifficulty) return false;
    if (problemSearch && !p.title.toLowerCase().includes(problemSearch.toLowerCase()) && !(p.tags || []).some(t => t.toLowerCase().includes(problemSearch.toLowerCase()))) return false;
    return true;
  });

  // Tell TourManager when chat opens so it can dynamically inject chat-related tour steps!
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('chat-toggled', { detail: { isOpen: isChatOpen } }));
  }, [isChatOpen]);

  const isBypassingBlocker = useRef(false);

  const {
    room,
    files,
    activeFile,
    activeName,
    setActiveName,
    runFile,
    setRunFile,
    users,
    messages,
    aiMessages,
    output,
    notes,
    timer,
    history,
    typing,
    typingCursors,
    suggestion,
    aiThinking,
    micOn,
    audioHost,
    roomId: resolvedRoomId,
    joinError,
    permissions,
    preview,
    compiler,
    actions
  } = useRoomSession(roomId, joinName, user?.uid, isBypassingBlocker);

  const isChallenge = room?.isChallenge || location.state?.challengeMode;
  const targetImage = room?.targetImage || location.state?.targetImage;
  const difficulty = location.state?.difficulty || 'easy';
  const [isScoring, setIsScoring] = useState(false);
  const [isGeneratingChallenge, setIsGeneratingChallenge] = useState(false);
  const [scoreData, setScoreData] = useState(null);

  const handleGenerateNewChallenge = async () => {
    setIsGeneratingChallenge(true);
    try {
      const targetPayload = await api.request("/api/challenge/generate", {
        method: "POST",
        body: JSON.stringify({ difficulty })
      });
      if (targetPayload.targetImage) {
        actions.setProblem("ui-battle", targetPayload.targetImage);
      }
    } catch (err) {
      alert("Failed to generate new challenge: " + err.message);
    } finally {
      setIsGeneratingChallenge(false);
    }
  };

  const handleChallengeSubmit = async () => {
    setIsScoring(true);
    try {
      const htmlFile = files.find(f => f.name.endsWith('.html'));
      const cssFile = files.find(f => f.name.endsWith('.css'));
      let userCode = htmlFile?.code || '';
      if (cssFile?.code) {
        if (userCode.includes('</head>')) {
          userCode = userCode.replace('</head>', `<style>${cssFile.code}</style></head>`);
        } else {
          userCode += `<style>${cssFile.code}</style>`;
        }
      }

      const data = await api.request("/api/challenge/submit", {
        method: 'POST',
        body: JSON.stringify({ userCode, targetImage })
      });
      setScoreData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsScoring(false);
    }
  };

  const [floatingMsgs, setFloatingMsgs] = useState([]);
  const [consoleHeight, setConsoleHeight] = useState(280);
  const [sidebarWidths, setSidebarWidths] = useState({ problem: 450, users: 250, files: 250 });
  const [isResizing, setIsResizing] = useState(false);
  const [isResizingUsers, setIsResizingUsers] = useState(false);
  const [consoleMode, setConsoleMode] = useState("output");
  const [rightPanelWidth, setRightPanelWidth] = useState(400);
  const [isResizingRightPanel, setIsResizingRightPanel] = useState(false);
  const [isSplitView, setIsSplitView] = useState(false);
  const consoleResizeStart = useRef({ y: 0, height: 280 });
  const usersResizeStart = useRef({ x: 0, width: 250 });
  const rightPanelResizeStart = useRef({ x: 0, width: 400 });

  // Sidebar state
  const [activeSidebarTab, setActiveSidebarTab] = useState(null);

  const prevProblemId = useRef(room?.problemId);
  const hasInitializedSidebar = useRef(false);

  useEffect(() => {
    if (room && !hasInitializedSidebar.current) {
      hasInitializedSidebar.current = true;
      setActiveSidebarTab(room.problemId ? "problem" : "users");
    }
    
    if (room?.problemId && room.problemId !== prevProblemId.current && hasInitializedSidebar.current) {
      setActiveSidebarTab("problem");
    }
    prevProblemId.current = room?.problemId;
  }, [room]);

  // Join sound and toast
  const previousUsersCount = useRef(0);
  useEffect(() => {
    if (users.length > previousUsersCount.current && previousUsersCount.current > 0) {
      const newUsers = users.slice(previousUsersCount.current);
      newUsers.forEach(nu => {
        if (nu.socketId === permissions.me?.socketId) return;
        
        try {
          const audioContext = new (window.AudioContext || window.webkitAudioContext)();
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
          oscillator.frequency.exponentialRampToValueAtTime(1046.50, audioContext.currentTime + 0.1); // C6
          gainNode.gain.setValueAtTime(0, audioContext.currentTime);
          gainNode.gain.linearRampToValueAtTime(0.05, audioContext.currentTime + 0.05);
          gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.3);
        } catch(e) {}
        
        const id = Date.now() + Math.random();
        setFloatingMsgs(prev => [...prev, { floatId: id, user: "System", text: `${nu.name} joined the room`, isSystem: true }]);
        setTimeout(() => setFloatingMsgs(prev => prev.filter(m => m.floatId !== id)), 4000);
      });
    }
    previousUsersCount.current = users.length;
  }, [users, permissions.me]);

  // --- Leave Room Navigation Blocker ---
  const [showLeavePrompt, setShowLeavePrompt] = useState(false);
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [usersModalPos, setUsersModalPos] = useState({ x: 200, y: 100 });
  const [isDraggingUsersModal, setIsDraggingUsersModal] = useState(false);
  const usersModalDragStart = useRef({ x: 0, y: 0, initialX: 0, initialY: 0 });
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      !isBypassingBlocker.current && !showLeavePrompt && currentLocation.pathname !== nextLocation.pathname
  );

  useEffect(() => {
    if (blocker.state === "blocked") {
      setShowLeavePrompt(true);
    }
  }, [blocker]);

  const confirmLeave = () => {
    setShowLeavePrompt(false);
    isBypassingBlocker.current = true;
    if (permissions.isHost) {
      actions.endRoom(true);
    }
    const feedbackUrl = `/rooms?feedback=true&username=${encodeURIComponent(joinName)}`;
    if (blocker.state === "blocked") {
      blocker.proceed();
      navigate(feedbackUrl);
    } else {
      navigate(feedbackUrl);
    }
  };


  const cancelLeave = () => {
    setShowLeavePrompt(false);
    if (blocker.state === "blocked") {
      blocker.reset();
    }
  };

  const handleLeaveRequest = () => {
    setShowLeavePrompt(true);
  };
  

  const getActiveProblem = () => {
    if (room?.problemId) return problems.find(p => p.id === room.problemId);
    if (room?.name && room.name.includes("Problem Room: ")) {
      const title = room.name.replace("Problem Room: ", "").trim();
      return problems.find(p => p.title === title);
    }
    return null;
  };

  const activeProblem = getActiveProblem();

  useEffect(() => {
    if (activeProblem && activeProblem.tests && activeProblem.tests[0]) {
      setStdin(activeProblem.tests[0].input);
    }
  }, [activeProblem]);

  useEffect(() => {
    if (activeFile) {
      localStorage.setItem("current_code", activeFile.code || "");
      localStorage.setItem("current_language", activeFile.language || "");
      localStorage.setItem("current_problem_title", `Room File: ${activeFile.name}`);
    }
  }, [activeFile]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = ""; 
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  useEffect(() => {
    if (room?.allowCopyPaste === false) {
      const handleCopyPaste = (e) => {
        e.preventDefault();
      };
      document.addEventListener("copy", handleCopyPaste, { capture: true });
      document.addEventListener("cut", handleCopyPaste, { capture: true });
      document.addEventListener("paste", handleCopyPaste, { capture: true });
      return () => {
        document.removeEventListener("copy", handleCopyPaste, { capture: true });
        document.removeEventListener("cut", handleCopyPaste, { capture: true });
        document.removeEventListener("paste", handleCopyPaste, { capture: true });
      };
    }
  }, [room?.allowCopyPaste]);

  const startResizing = (event) => {
    event?.preventDefault?.();
    consoleResizeStart.current = {
      y: event?.clientY || 0,
      height: consoleHeight
    };
    setIsResizing(true);
  };
  const startUsersResizing = (event) => {
    event?.preventDefault?.();
    usersResizeStart.current = {
      x: event?.clientX || 0,
      width: sidebarWidths[activeSidebarTab] || 250
    };
    setIsResizingUsers(true);
  };
  const startRightResizing = (event) => {
    event?.preventDefault?.();
    rightPanelResizeStart.current = {
      x: event?.clientX || 0,
      width: rightPanelWidth
    };
    setIsResizingRightPanel(true);
  };
  const stopResizing = () => setIsResizing(false);
  const stopUsersResizing = () => setIsResizingUsers(false);
  const stopRightResizing = () => setIsResizingRightPanel(false);
  const resize = (e) => {
    if (isResizing) {
      const delta = e.clientY - consoleResizeStart.current.y;
      const newHeight = consoleResizeStart.current.height - delta;
      const maxHeight = Math.max(180, Math.floor(window.innerHeight * 0.62));
      setConsoleHeight(Math.min(Math.max(newHeight, 150), maxHeight));
    }

    if (isResizingUsers && activeSidebarTab) {
      const delta = e.clientX - usersResizeStart.current.x;
      const newWidth = usersResizeStart.current.width + delta;
      const maxWidth = Math.min(800, window.innerWidth * 0.6);
      setSidebarWidths(prev => ({
        ...prev,
        [activeSidebarTab]: Math.min(Math.max(newWidth, 200), maxWidth)
      }));
    }

    if (isResizingRightPanel && activeMainTab !== 'editor') {
      const delta = rightPanelResizeStart.current.x - e.clientX;
      const newWidth = rightPanelResizeStart.current.width + delta;
      const maxWidth = Math.min(800, window.innerWidth * 0.6);
      setRightPanelWidth(Math.min(Math.max(newWidth, 250), maxWidth));
    }

    if (isDraggingUsersModal) {
      setUsersModalPos({
        x: usersModalDragStart.current.initialX + (e.clientX - usersModalDragStart.current.x),
        y: usersModalDragStart.current.initialY + (e.clientY - usersModalDragStart.current.y)
      });
    }
  };

  const handleUsersModalDragStart = (e) => {
    setIsDraggingUsersModal(true);
    usersModalDragStart.current = {
      x: e.clientX,
      y: e.clientY,
      initialX: usersModalPos.x,
      initialY: usersModalPos.y
    };
  };
  const handleUsersModalDragEnd = () => setIsDraggingUsersModal(false);

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    window.addEventListener("mouseup", stopUsersResizing);
    window.addEventListener("mouseup", stopRightResizing);
    window.addEventListener("mouseup", handleUsersModalDragEnd);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
      window.removeEventListener("mouseup", stopUsersResizing);
      window.removeEventListener("mouseup", stopRightResizing);
      window.removeEventListener("mouseup", handleUsersModalDragEnd);
    };
  }, [isResizing, isResizingUsers, isResizingRightPanel, isDraggingUsersModal]);

  useEffect(() => {
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.user !== permissions.me?.name) {
        const id = Math.random();
        setFloatingMsgs(prev => [...prev, { ...lastMsg, floatId: id }]);
        setTimeout(() => {
          setFloatingMsgs(prev => prev.filter(m => m.floatId !== id));
        }, 6000);
      }
    }
  }, [messages, permissions.me?.name]);

  const dismissFloat = (id) => {
    setFloatingMsgs(prev => prev.filter(m => m.floatId !== id));
  };

  useEffect(() => {
    if (joinName && joinName.trim()) saveUsername(joinName.trim());
  }, [joinName]);

  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      // Ctrl + ` -> Run Code
      if (e.ctrlKey && e.key === '`') {
        e.preventDefault();
        setConsoleMode("output");
        setIsConsoleOpen(true);
        actions.runCode(stdin);
        return;
      }
      // Ctrl + Enter -> Submit Solution
      if (e.ctrlKey && !e.shiftKey && e.key === 'Enter') {
        e.preventDefault();
        if (activeProblem) {
          setIsConsoleOpen(true);
          actions.submitCode(activeProblem);
          setShowTimeTravel(true);
        }
        return;
      }
      // Ctrl + Shift + Enter -> Run All Test Cases
      if (e.ctrlKey && e.shiftKey && e.key === 'Enter') {
        e.preventDefault();
        if (activeProblem) {
          setIsConsoleOpen(true);
          actions.submitCode(activeProblem);
          setShowTimeTravel(true);
        }
        return;
      }
      // Ctrl + R -> Run Sample Test Cases
      if (e.ctrlKey && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        setConsoleMode("output");
        setIsConsoleOpen(true);
        actions.runCode(stdin);
        return;
      }
      // Ctrl + S -> Save Code
      if (e.ctrlKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (actions.saveWork) actions.saveWork(`Project in ${room?.id || roomId}`);
        return;
      }
      // Ctrl + Shift + M -> Mute / Unmute Mic
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        actions.toggleMic();
        return;
      }
      // Ctrl + Shift + V -> Join / Leave Voice Chat (proxy to leave room for now or toggle mic)
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        handleLeaveRequest();
        return;
      }
      // Ctrl + Shift + C -> Copy Room Invite Link
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        copyToClipboard(window.location.href).then(() => {
          alert("Invite link copied!");
        }).catch(() => {
          alert("Failed to copy invite link.");
        });
        return;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleGlobalKeyDown, { capture: true });
  }, [actions, activeProblem, stdin, room, roomId]);

  useEffect(() => {
    if (room && !infoShownRef.current) {
      setShowInfoModal(true);
      infoShownRef.current = true;
    }
  }, [room]);

  if (!room && !joinError) {
    return (
      <div className="room-loading">
        <Loader2 size={40} className="animate-spin" />
        <p>Connecting to room…</p>
      </div>
    );
  }

  if (joinError) {
    if (joinError.reason === "already_in_room") {
      return (
        <div className="room-loading">
          <AlertTriangle size={40} />
          <p>You are already in another room. You can only be active in one room at a time.</p>
          <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
            <button className="button secondary" onClick={() => navigate("/rooms")}>Cancel</button>
            <button className="button primary" onClick={() => actions.forceJoin()}>Leave previous room & Join</button>
          </div>
        </div>
      );
    }
    return (
      <div className="room-loading">
        <AlertTriangle size={40} />
        <p>Could not join room: {joinError.reason || "unknown error"}</p>
        <button className="comms-close-cyber" onClick={() => setShowUsersModal(false)} aria-label="Close Users">
          <XIcon size={16}/>
        </button>
      </div>
    );
  }

  if (isNotesView) {
    return (
      <div style={{ height: "100vh", width: "100vw", background: "var(--bg-primary)", display: "flex", flexDirection: "column" }}>
        <NotesModal 
          isOpen={true} 
          onClose={() => window.close()} 
          notes={notes} 
          onUpdateText={actions.updateNotes} 
          onDraw={actions.drawNote} 
          permissions={permissions} 
          inline={true} 
        />
      </div>
    );
  }

  const topBarComponent = (
    <TopBar 
      room={room}
      users={users}
      onShowUsersModal={() => setActiveSidebarTab(activeSidebarTab === 'users' ? null : 'users')}
      hasProblem={!!room.problemId}
      onRun={() => {
        if (activeFile && (activeFile.name.endsWith('.html') || activeFile.name.endsWith('.css'))) {
          if (activeFile.name.endsWith('.html')) {
            actions.setPreviewTarget(activeFile.name);
          }
          if (preview?.showPreview) {
            setConsoleMode("preview");
            setIsConsoleOpen(true);
            return;
          }
        }
        setConsoleMode("output");
        setIsConsoleOpen(true);
        actions.runCode(stdin);
      }}
      onSubmit={() => {
        if (isChallenge) {
          handleChallengeSubmit();
        } else {
          setIsConsoleOpen(true);
          actions.submitCode(activeProblem);
          setShowTimeTravel(true);
        }
      }}
      isRunningCode={compiler.isRunningCode}
      isSubmittingCode={compiler.isSubmittingCode || isScoring}
      canSubmit={(!!activeProblem || isChallenge) && !compiler.isRunningCode && !compiler.isSubmittingCode}
      timer={timer}
      permissions={permissions}
      actions={actions}
      activeMainTab={activeMainTab}
      activeFile={activeFile}
      isSplitView={isSplitView}
      setIsSplitView={setIsSplitView}
    />
  );

  return (
    <div className="room-layout-wrapper" style={{ display: 'flex', flexDirection: 'row', height: '100vh', overflow: 'hidden', backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.3), rgba(15, 23, 42, 0.6)), url(${loopsbg})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}>
      {(isResizing || isResizingUsers) && <div style={{ position: 'fixed', inset: 0, zIndex: 9999, cursor: isResizing ? 'row-resize' : 'col-resize' }} />}
      
      <LeftNavBar 
        activeTab={activeMainTab === 'preview' ? 'preview' : activeMainTab === 'notes' ? 'notes' : activeSidebarTab}
        micOn={micOn}
        onToggleMic={actions.toggleMic}
        onLeave={handleLeaveRequest}
        onShowFiles={() => {
          setActiveMainTab('editor');
          setActiveSidebarTab(activeSidebarTab === 'files' ? null : 'files');
        }}
        onShowProblem={() => {
          setActiveMainTab('editor');
          setActiveSidebarTab(activeSidebarTab === 'problem' ? null : 'problem');
        }}
        onShowUsers={() => {
          setActiveMainTab('editor');
          setActiveSidebarTab(activeSidebarTab === 'users' ? null : 'users');
        }}
        onShowNotes={() => {
          setActiveSidebarTab(null);
          setActiveMainTab(activeMainTab === 'notes' ? 'editor' : 'notes');
        }}
        showPreviewButton={preview?.showPreview}
        onShowFullPreview={() => {
          setActiveSidebarTab(null);
          setActiveMainTab(activeMainTab === 'preview' ? 'editor' : 'preview');
        }}
        isConsoleOpen={isConsoleOpen}
        onToggleConsole={() => {
          setIsConsoleOpen(!isConsoleOpen);
          if (!isConsoleOpen && activeMainTab !== 'editor' && !isSplitView) {
            setActiveMainTab('editor'); // Auto switch to editor if we open console and it's full view
          }
        }}
        onShowInfo={() => setShowInfoModal(true)}
        onShowSettings={() => setActiveSidebarTab(activeSidebarTab === 'settings' ? null : 'settings')}
        room={room}
        users={users}
        permissions={permissions}
        actions={actions}
        isAnyMicOn={users.some(u => u.mic)}
      />

      {activeSidebarTab && (
        <>
          <div 
            className={`workspace-sidebar ${isResizingUsers ? "is-resizing-users" : ""}`}
            style={{ width: `${sidebarWidths[activeSidebarTab] || 250}px`, flexShrink: 0, display: 'flex', flexDirection: 'column', borderRight: "1px solid var(--glass-border)", background: "transparent" }}
          >
            {activeSidebarTab === "problem" ? (
              <div style={{ height: "100%", overflowY: "auto", position: 'relative', display: 'flex', flexDirection: 'column' }}>
                <button 
                  onClick={() => setActiveSidebarTab(null)}
                  style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', borderRadius: '4px', cursor: 'pointer', zIndex: 10, padding: '4px' }}
                >
                  <PanelLeftClose size={16} />
                </button>
                {activeProblem || isChallenge ? (
                  <>
                    {isChallenge ? (
                      <TargetViewer targetImage={targetImage} difficulty={difficulty} />
                    ) : (
                      <ProblemPanel problem={activeProblem} />
                    )}
                    {permissions.isHost && (
                      <div style={{ padding: "16px", borderTop: "1px solid rgba(255,255,255,0.1)", background: 'transparent', marginTop: 'auto' }}>
                        {isChallenge ? (
                          <button 
                            className="button secondary" 
                            style={{ width: "100%" }}
                            disabled={isGeneratingChallenge}
                            onClick={handleGenerateNewChallenge}
                          >
                            {isGeneratingChallenge ? "Generating..." : "New Challenge"}
                          </button>
                        ) : (
                          <button 
                            className="button secondary" 
                            style={{ width: "100%" }}
                            onClick={() => actions.setProblem(null)}
                          >
                            Change Problem
                          </button>
                        )}
                      </div>
                    )}
                  </>
                ) : previewProblem ? (
                  <>
                    <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.1)", display: 'flex', alignItems: 'center', marginTop: '30px' }}>
                      <button 
                        onClick={() => setPreviewProblemId(null)}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'transparent', border: 'none', color: 'var(--primary-orange)', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}
                      >
                        <ArrowLeft size={16} /> Back
                      </button>
                    </div>
                    <ProblemPanel problem={previewProblem} />
                    {permissions.isHost && (
                      <div style={{ padding: "16px", borderTop: "1px solid rgba(255,255,255,0.1)", background: 'transparent', marginTop: 'auto' }}>
                        <button 
                          className="button primary" 
                          style={{ width: "100%", background: 'var(--primary-orange)', color: '#000', fontWeight: 'bold' }}
                          onClick={() => {
                            actions.setProblem(previewProblem.id);
                            setPreviewProblemId(null);
                          }}
                        >
                          Solve in Room
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ padding: "48px 16px 16px 16px", display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <h3 style={{ margin: 0, fontSize: '12px', fontWeight: 'bold', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: "16px", flexShrink: 0 }}>
                      Select a Problem
                    </h3>
                    
                    <div style={{ marginBottom: "16px", display: "flex", flexDirection: "column", gap: "8px", flexShrink: 0 }}>
                      <input 
                        type="text" 
                        placeholder="Search problems or topics..." 
                        value={problemSearch}
                        onChange={e => setProblemSearch(e.target.value)}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: '#fff', fontSize: '13px', outline: 'none' }}
                      />
                      <select 
                        value={problemDifficulty}
                        onChange={e => setProblemDifficulty(e.target.value)}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: '#fff', fontSize: '13px', outline: 'none' }}
                      >
                        <option value="All">All Difficulties</option>
                        <option value="Easy">Easy</option>
                        <option value="Medium">Medium</option>
                        <option value="Hard">Hard</option>
                      </select>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
                      {filteredProblems.map(p => (
                        <div 
                          key={p.id}
                          style={{
                            padding: "12px",
                            background: "rgba(255,255,255,0.02)",
                            border: "1px solid rgba(255,255,255,0.05)",
                            borderRadius: "8px",
                            transition: "all 0.2s"
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                          }}
                        >
                          <h4 style={{ margin: "0 0 8px 0", color: "#fff", fontSize: "14px" }}>{p.title}</h4>
                          <div style={{ display: "flex", gap: "8px", fontSize: "12px", marginBottom: "12px" }}>
                            <span style={{ color: p.difficulty === "Easy" ? "#4ade80" : p.difficulty === "Medium" ? "#facc15" : "#f87171" }}>
                              {p.difficulty}
                            </span>
                          </div>
                          
                          <div style={{ display: "flex", gap: "8px" }}>
                            <button 
                              onClick={() => setPreviewProblemId(p.id)}
                              style={{ flex: 1, padding: "6px", background: "rgba(255,255,255,0.1)", color: "#fff", border: "none", borderRadius: "4px", fontSize: "12px", cursor: "pointer", fontWeight: "bold" }}
                            >
                              View
                            </button>
                            {permissions.isHost && (
                              <button 
                                onClick={() => actions.setProblem(p.id)}
                                style={{ flex: 1, padding: "6px", background: "var(--primary-orange)", color: "#000", border: "none", borderRadius: "4px", fontSize: "12px", cursor: "pointer", fontWeight: "bold" }}
                              >
                                Solve
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                      {filteredProblems.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '20px', color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>
                          No problems found.
                        </div>
                      )}
                    </div>
                    {!permissions.isHost && (
                      <p style={{ marginTop: "16px", fontSize: "12px", color: "var(--primary-orange)", textAlign: "center", fontStyle: "italic", opacity: 0.8, flexShrink: 0 }}>
                        Only the host can start a problem.
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : activeSidebarTab === "users" ? (
              <div style={{ height: "100%", position: 'relative' }}>
                <button 
                  onClick={() => setActiveSidebarTab(null)}
                  style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', borderRadius: '4px', cursor: 'pointer', zIndex: 10, padding: '4px' }}
                >
                  <PanelLeftClose size={16} />
                </button>
                <UsersPanel
                  room={room}
                  roomId={resolvedRoomId}
                  users={users}
                  permissions={permissions}
                  onRoleChange={actions.updateRole}
                  onKickUser={actions.kickUser}
                />
              </div>
            ) : activeSidebarTab === "files" ? (
              <div style={{ height: "100%", position: 'relative' }}>
                <button 
                  onClick={() => setActiveSidebarTab(null)}
                  style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', borderRadius: '4px', cursor: 'pointer', zIndex: 10, padding: '4px' }}
                >
                  <PanelLeftClose size={16} />
                </button>
                <FilesPanel
                  roomId={resolvedRoomId}
                  files={files}
                  activeFile={activeFile}
                  activeName={activeName}
                  setActiveName={setActiveName}
                  permissions={permissions}
                  onCreateFile={actions.createFile}
                  onExpectActiveName={actions.setExpectedActiveName}
                  onDeleteFile={actions.deleteActiveFile}
                  onChangeLanguage={actions.changeFileLanguage}
                  onSaveWork={actions.saveWork}
                />
              </div>
            ) : activeSidebarTab === "settings" ? (
              <div style={{ height: "100%", position: 'relative' }}>
                <button 
                  onClick={() => setActiveSidebarTab(null)}
                  style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', borderRadius: '4px', cursor: 'pointer', zIndex: 10, padding: '4px' }}
                >
                  <PanelLeftClose size={16} />
                </button>
                <SettingsPanel
                  room={room}
                  users={users}
                  timer={timer}
                  permissions={permissions}
                  actions={actions}
                />
              </div>
            ) : null}
          </div>
          <button
            type="button"
            className="users-resize-handle"
            onMouseDown={startUsersResizing}
            onDoubleClick={() => setSidebarWidths(prev => ({ ...prev, [activeSidebarTab]: activeSidebarTab === 'problem' ? 450 : 250 }))}
            aria-label="Resize sidebar"
            title="Drag to resize sidebar"
          />
        </>
      )}

      <div className="workspace layout-v2" style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', minWidth: 0, gap: 0 }}>
        <div ref={audioHost} style={{ display: "none" }} />

        <div className="floating-notifications">
          {floatingMsgs.map(msg => (
            <div key={msg.floatId} className="float-msg" onClick={() => dismissFloat(msg.floatId)}>
              <strong>{msg.user}:</strong> {msg.stickerId ? "sent a sticker" : msg.text}
            </div>
          ))}
        </div>

        <InfoModal 
          isOpen={showInfoModal} 
          onClose={() => setShowInfoModal(false)} 
        />

        {showTimeTravel && (
          <TimeTravelModal 
            isOpen={showTimeTravel}
            onClose={() => setShowTimeTravel(false)}
            history={history}
            files={files}
          />
        )}

        {/* Global TopBar if left side is completely hidden (Full screen Notes/Preview) */}
        {!( (!activeMainTab || activeMainTab === 'editor' || isSplitView) ) && topBarComponent}

        <div
          className={`workspace-main-v3`}
          style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', borderRadius: 0 }}
        >
          <div className="middle-column" style={{ flex: 1, display: 'flex', flexDirection: isSplitView ? 'row' : 'column', minHeight: 0 }}>
            {/* Left side: Editor and Console */}
            {(!activeMainTab || activeMainTab === 'editor' || isSplitView) && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0 }}>
                {topBarComponent}
              <EditorPanel
                roomId={resolvedRoomId}
                allowCopyPaste={room?.allowCopyPaste}
                files={files}
                activeFile={activeFile}
                activeName={activeName}
                setActiveName={setActiveName}
                users={users}
                typing={typing}
                typingCursors={typingCursors}
                permissions={permissions}
                onChange={(val) => {
                  localStorage.setItem("current_code", val || "");
                  localStorage.setItem("current_language", activeFile?.language || "");
                  localStorage.setItem("current_problem_title", `Room File: ${activeName}`);
                  actions.updateCode(val);
                }}
                onUpdateFileCode={(filename, code) => {
                  if (filename === activeName) {
                    localStorage.setItem("current_code", code || "");
                    localStorage.setItem("current_language", activeFile?.language || "");
                    localStorage.setItem("current_problem_title", `Room File: ${filename}`);
                  }
                  actions.updateFileCode(filename, code);
                }}
                onCreateFile={actions.createFile}
                onExpectActiveName={actions.setExpectedActiveName}
                onDeleteFile={actions.deleteActiveFile}
                onChangeLanguage={actions.changeFileLanguage}
                onSaveWork={actions.saveWork}
                onRun={() => {
                  if (activeFile && (activeFile.name.endsWith('.html') || activeFile.name.endsWith('.css'))) {
                    if (activeFile.name.endsWith('.html')) {
                      actions.setPreviewTarget(activeFile.name);
                    }
                    if (preview?.showPreview) {
                      setConsoleMode("preview");
                      setIsConsoleOpen(true);
                      return;
                    }
                  }
                  setConsoleMode("output");
                  setIsConsoleOpen(true);
                  actions.runCode(stdin);
                }}
                onSubmit={() => {
                  if (isChallenge) {
                    handleChallengeSubmit();
                  } else {
                    setIsConsoleOpen(true);
                    actions.submitCode(activeProblem);
                    setShowTimeTravel(true);
                  }
                }}
                isRunningCode={compiler.isRunningCode}
                isSubmittingCode={compiler.isSubmittingCode || isScoring}
                canSubmit={(!!activeProblem || isChallenge) && !compiler.isRunningCode && !compiler.isSubmittingCode}
              />
              {isConsoleOpen && (
                <ConsolePanel
                  output={output}
                  preview={preview}
                  stdin={stdin}
                  setStdin={setStdin}
                  style={{ height: `${consoleHeight}px`, flex: "0 0 auto", borderTop: "1px solid var(--glass-border)", background: "rgba(0,0,0,0.5)", backdropFilter: "blur(10px)" }}
                  onResizeStart={startResizing}
                  onClear={actions.clearOutput}
                  files={files}
                  runFile={runFile}
                  setRunFile={setRunFile}
                  isRunningCode={compiler.isRunningCode}
                  isSubmittingCode={compiler.isSubmittingCode}
                  panelMode={consoleMode}
                  setPanelMode={setConsoleMode}
                  onOpenSplitPreview={() => {
                    setActiveMainTab('preview');
                    setIsSplitView(true);
                    setIsConsoleOpen(false);
                  }}
                  onOpenFullPreview={() => {
                    setActiveMainTab('preview');
                    setIsSplitView(false);
                    setIsConsoleOpen(false);
                  }}
                  onClose={() => setIsConsoleOpen(false)}
                  onRun={() => {
                    if (activeFile && (activeFile.name.endsWith('.html') || activeFile.name.endsWith('.css'))) {
                      if (activeFile.name.endsWith('.html')) {
                        actions.setPreviewTarget(activeFile.name);
                      }
                      if (preview?.showPreview) {
                        setConsoleMode("preview");
                        return;
                      }
                    }
                    setConsoleMode("output");
                    actions.runCode(stdin);
                  }}
                  onSubmit={() => {
                    if (isChallenge) {
                      handleChallengeSubmit();
                    } else {
                      actions.submitCode(activeProblem);
                      setShowTimeTravel(true);
                    }
                  }}
                  activeProblem={activeProblem}
                  canSubmit={permissions.canEdit}
                  isSubmitting={isScoring}
                />
              )}
            </div>
            )}

            {/* Right side: Preview or Notes */}
            {activeMainTab !== 'editor' && (
              <>
                {isSplitView && (
                  <div
                    className="right-resize-handle"
                    onMouseDown={startRightResizing}
                    style={{ width: "8px", cursor: "col-resize", flexShrink: 0, zIndex: 20, background: "rgba(255,255,255,0.02)" }}
                  />
                )}
                <div className="right-panel" style={{ width: isSplitView ? `${rightPanelWidth}px` : '100%', flex: isSplitView ? '0 0 auto' : 1, display: 'flex', flexDirection: 'column', minHeight: 0, borderLeft: isSplitView ? "1px solid var(--glass-border)" : "none", background: "rgba(15, 23, 42, 0.3)", backdropFilter: "blur(8px)" }}>
                  {activeMainTab === 'preview' ? (
                    <WebPreviewFull 
                      previewDoc={preview.previewDoc} 
                      onClose={() => setActiveMainTab('editor')} 
                    />
                  ) : activeMainTab === 'notes' ? (
                    <NotesModal 
                      isOpen={true} 
                      onClose={() => setActiveMainTab('editor')} 
                      notes={notes} 
                      onUpdateText={actions.updateNotes} 
                      onDraw={actions.drawNote} 
                      permissions={permissions} 
                      inline={true} 
                    />
                  ) : null}
                </div>
              </>
            )}
          </div>
        </div>

        {showUsersModal && room.problemId && (
          <div 
            style={{ 
              position: "fixed", 
              zIndex: 10000,
              left: `${usersModalPos.x}px`,
              top: `${usersModalPos.y}px`,
              width: "300px", 
              maxWidth: "90vw", 
              maxHeight: "80vh", 
              display: "flex", 
              flexDirection: "column",
              background: "#0f172a",
              border: "1px solid var(--glass-border)",
              borderRadius: "12px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
            }} 
          >
            <div 
              style={{ 
                marginBottom: "16px", display: "flex", justifyContent: "space-between", 
                alignItems: "center", padding: "16px", cursor: "grab", 
                borderBottom: "1px solid var(--glass-border)",
                userSelect: "none"
              }}
              onMouseDown={handleUsersModalDragStart}
            >
              <h3 style={{ margin: 0, fontSize: "14px", color: "#fff" }}>Room Users</h3>
              <button 
                onMouseDown={(e) => e.stopPropagation()} 
                onClick={() => setShowUsersModal(false)} 
                style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 0 }}
              >
                <X size={16}/>
              </button>
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: "0", padding: "0 16px 16px 16px" }} onMouseDown={(e) => e.stopPropagation()}>
              <UsersPanel
                room={room}
                roomId={resolvedRoomId}
                users={users}
                permissions={permissions}
                onRoleChange={actions.updateRole}
                onKickUser={actions.kickUser}
              />
            </div>
          </div>
        )}

        <CommsPanel
          messages={messages}
          aiMessages={aiMessages}
          me={permissions.me}
          permissions={permissions}
          aiThinking={aiThinking}
          onSendChat={actions.sendChat}
          onSendSticker={actions.sendSticker}
          onAskAi={actions.askAi}
          onClearNotifications={() => setFloatingMsgs([])}
          activeTab={activeCommsTab}
          onSelectTab={setActiveCommsTab}
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          participantsCount={users.length}
        />

        <button
          type="button"
          className="floating-chat-button tour-chat-button"
          onClick={() => setIsChatOpen(!isChatOpen)}
          title="Toggle Chat & AI"
        >
          <MessageSquare size={24} />
        </button>

        {showLeavePrompt && (
          <div className="profile-modal-overlay" role="dialog" aria-modal="true" aria-label="Leave Room Confirmation">
            <div className="profile-modal-card">
              <div className="profile-modal-header">
                <h3>Leave Room?</h3>
              </div>
              <div className="profile-content" style={{ padding: "20px" }}>
                {permissions.isHost ? (
                  <p>You are the <strong>Host</strong>. Leaving will instantly <strong>end the room</strong> for everyone else. Are you sure you want to leave?</p>
                ) : (
                  <p>Are you sure you want to leave this room? You can rejoin later if you have the code.</p>
                )}
              </div>
              <div className="profile-modal-footer">
                <button className="button secondary" onClick={cancelLeave}>Cancel</button>
                <button className="button danger" onClick={confirmLeave}>{permissions.isHost ? "End & Leave" : "Leave"}</button>
              </div>
            </div>
          </div>
        )}
        
        {/* Challenge Score Modal */}
        {scoreData && (
          <ScoreModal 
            isOpen={!!scoreData}
            onClose={() => setScoreData(null)}
            score={scoreData.score}
            feedback={scoreData.feedback}
            userImage={scoreData.userImage}
            targetImage={targetImage}
          />
        )}
      </div>
    </div>
  );
}
