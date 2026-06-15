import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useBlocker } from "react-router-dom";
import { Loader2, AlertTriangle, MessageSquare, X } from "lucide-react";
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
import { NotesModal } from "../components/room/NotesModal";
import { TimeTravelModal } from "../components/room/TimeTravelModal";
import { FooterBar } from "../components/room/FooterBar";
import { problems } from "../data/problems";
import { getUsername, saveUsername } from "../lib/navigation";
import { useAuth } from "../hooks/useAuth";

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
  const [showFloatingProblem, setShowFloatingProblem] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showTimeTravel, setShowTimeTravel] = useState(false);

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

  const [floatingMsgs, setFloatingMsgs] = useState([]);
  const [consoleHeight, setConsoleHeight] = useState(280);
  const [usersPanelWidth, setUsersPanelWidth] = useState(222);
  const [isResizing, setIsResizing] = useState(false);
  const [isResizingUsers, setIsResizingUsers] = useState(false);
  const [consoleMode, setConsoleMode] = useState("output");
  const consoleResizeStart = useRef({ y: 0, height: 280 });
  const usersResizeStart = useRef({ x: 0, width: 222 });

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
      // blocker.proceed() might not handle search params if we just proceed, 
      // but usually we want to navigate explicitly if we want params.
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

  // Auto-populate stdin with the first sample testcase's input when problem is loaded
  useEffect(() => {
    if (activeProblem && activeProblem.tests && activeProblem.tests[0]) {
      setStdin(activeProblem.tests[0].input);
    }
  }, [activeProblem]);

  // --- Tab Close Protection ---
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = ""; 
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);
  // -------------------------------------

  // --- Anti-Cheat Copy/Paste Protection ---
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
      width: usersPanelWidth
    };
    setIsResizingUsers(true);
  };
  const stopResizing = () => setIsResizing(false);
  const stopUsersResizing = () => setIsResizingUsers(false);
  const resize = (e) => {
    if (isResizing) {
      const delta = e.clientY - consoleResizeStart.current.y;
      const newHeight = consoleResizeStart.current.height - delta;
      const maxHeight = Math.max(180, Math.floor(window.innerHeight * 0.62));
      setConsoleHeight(Math.min(Math.max(newHeight, 150), maxHeight));
    }

    if (isResizingUsers) {
      const delta = e.clientX - usersResizeStart.current.x;
      const newWidth = usersResizeStart.current.width + delta;
      setUsersPanelWidth(Math.min(Math.max(newWidth, 150), 320));
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
    window.addEventListener("mouseup", handleUsersModalDragEnd);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
      window.removeEventListener("mouseup", stopUsersResizing);
      window.removeEventListener("mouseup", handleUsersModalDragEnd);
    };
  }, [isResizing, isResizingUsers, isDraggingUsersModal]);

  // Handle floating messages
  useEffect(() => {
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      // Only float messages from others
      if (lastMsg.user !== permissions.me?.name) {
        const id = Math.random();
        setFloatingMsgs(prev => [...prev, { ...lastMsg, floatId: id }]);
        setTimeout(() => {
          setFloatingMsgs(prev => prev.filter(m => m.floatId !== id));
        }, 6000); // 6 seconds
      }
    }
  }, [messages, permissions.me?.name]);

  const dismissFloat = (id) => {
    setFloatingMsgs(prev => prev.filter(m => m.floatId !== id));
  };

  // Persist username locally (used by session hook)
  useEffect(() => {
    if (joinName && joinName.trim()) saveUsername(joinName.trim());
  }, [joinName]);

  // Show Info Modal on first join
  useEffect(() => {
    if (room && !infoShownRef.current) {
      setShowInfoModal(true);
      infoShownRef.current = true;
    }
  }, [room]);

  /* ── Loading state ── */
  if (!room && !joinError) {
    return (
      <div className="room-loading">
        <Loader2 size={40} className="animate-spin" />
        <p>Connecting to room…</p>
      </div>
    );
  }

  /* ── Error state ── */
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
        <button className="button primary" onClick={() => navigate("/rooms")}>
          Back to Rooms
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {(isResizing || isResizingUsers) && <div style={{ position: 'fixed', inset: 0, zIndex: 9999, cursor: isResizing ? 'row-resize' : 'col-resize' }} />}
      <div className="workspace layout-v2" style={{ flex: 1, height: 'auto' }}>
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

        <TopBar 
          room={room}
          users={users}
          files={files}
          runFile={runFile}
          setRunFile={setRunFile}
          micOn={micOn}
          permissions={permissions}
          onMic={actions.toggleMic}
          actions={actions}
          onLeaveRequest={handleLeaveRequest}
          onShowInfo={() => setShowInfoModal(true)}
          onShowNotes={() => setShowNotes(true)}
          onShowProblem={() => setShowFloatingProblem(true)}
          onShowUsersModal={() => setShowUsersModal(true)}
          timer={timer}
          hasProblem={!!room.problemId}
        />

        <NotesModal 
          isOpen={showNotes}
          onClose={() => setShowNotes(false)}
          notes={notes}
          onUpdateText={actions.updateNotes}
          onDraw={actions.drawNote}
          permissions={permissions}
        />

        {showTimeTravel && (
          <TimeTravelModal 
            isOpen={showTimeTravel}
            onClose={() => setShowTimeTravel(false)}
            history={history}
            files={files}
          />
        )}

        {showFloatingProblem && activeProblem && (
          <FloatingProblem 
            problem={activeProblem} 
            onClose={() => setShowFloatingProblem(false)} 
            onSubmit={async () => {
              const success = await actions.submitCode(activeProblem);
              setShowTimeTravel(true); // Open the Time Travel modal on submission success/failure!
              return success;
            }}
          />
        )}

        <div
          className={`workspace-main ${isResizingUsers ? "is-resizing-users" : ""}`}
          style={{ "--users-panel-width": `${usersPanelWidth}px` }}
        >
          {room.problemId ? (
            <div style={{ height: "100%", overflowY: "auto", borderRight: "1px solid var(--glass-border)", background: "rgba(0,0,0,0.2)" }}>
              <ProblemPanel problem={activeProblem} />
            </div>
          ) : (
            <UsersPanel
              room={room}
              roomId={resolvedRoomId}
              users={users}
              permissions={permissions}
              onRoleChange={actions.updateRole}
              onKickUser={actions.kickUser}
            />
          )}
          <button
            type="button"
            className="users-resize-handle"
            onMouseDown={startUsersResizing}
            onDoubleClick={() => setUsersPanelWidth(222)}
            aria-label="Resize members panel"
            title="Drag to resize members panel"
          />

          <div className="middle-column">
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
              onChange={actions.updateCode}
              onUpdateFileCode={actions.updateFileCode}
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
                    return;
                  }
                }
                setConsoleMode("output");
                actions.runCode(stdin);
              }}
              onSubmit={() => {
                actions.submitCode(activeProblem);
                setShowTimeTravel(true);
              }}
              isRunningCode={compiler.isRunningCode}
              isSubmittingCode={compiler.isSubmittingCode}
              canSubmit={!!activeProblem && compiler.compilerStatus === "Ready"}
            />
            <ConsolePanel
              output={output}
              preview={preview}
              stdin={stdin}
              setStdin={setStdin}
              style={{ height: `${consoleHeight}px`, flex: "0 0 auto" }}
              onResizeStart={startResizing}
              onClear={actions.clearOutput}
              files={files}
              runFile={runFile}
              setRunFile={setRunFile}
              isRunningCode={compiler.isRunningCode}
              isSubmittingCode={compiler.isSubmittingCode}
              panelMode={consoleMode}
              setPanelMode={setConsoleMode}
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
                actions.submitCode(activeProblem);
                setShowTimeTravel(true);
              }}
              activeProblem={activeProblem}
              canSubmit={permissions.canEdit}
            />
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
      </div>
    </div>
  );
}
