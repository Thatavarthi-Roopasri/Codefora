import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useBlocker } from "react-router-dom";
import { Loader2, AlertTriangle, MessageSquare, X } from "lucide-react";
import { useRoomSession } from "../hooks/useRoomSession";
import { TopBar } from "../components/room/TopBar";
import { EditorPanel } from "../components/room/EditorPanel";
import { Navbar } from "../components/Navbar";
import { UsersPanel } from "../components/room/UsersPanel";
import { CommsPanel } from "../components/room/CommsPanel";
import { ConsolePanel } from "../components/room/ConsolePanel";
import { FloatingProblem } from "../components/room/FloatingProblem";
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
  const [activeCommsTab, setActiveCommsTab] = useState("chat");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [showFloatingProblem, setShowFloatingProblem] = useState(false);

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
  const consoleResizeStart = useRef({ y: 0, height: 280 });
  const usersResizeStart = useRef({ x: 0, width: 222 });

  // --- Leave Room Navigation Blocker ---
  const [showLeavePrompt, setShowLeavePrompt] = useState(false);
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
    if (permissions.isHost) {
      actions.endRoom(true); 
    }
    if (blocker.state === "blocked") {
      blocker.proceed();
    } else {
      navigate("/rooms");
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
  };

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    window.addEventListener("mouseup", stopUsersResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
      window.removeEventListener("mouseup", stopUsersResizing);
    };
  }, [isResizing, isResizingUsers]);

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
      <div className="workspace layout-v2" style={{ flex: 1, height: 'auto' }}>
        <div ref={audioHost} style={{ display: "none" }} />

        <div className="floating-notifications">
          {floatingMsgs.map(msg => (
            <div key={msg.floatId} className="float-msg" onClick={() => dismissFloat(msg.floatId)}>
              <strong>{msg.user}:</strong> {msg.stickerId ? "sent a sticker" : msg.text}
            </div>
          ))}
        </div>

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
          onToggleProblem={() => setShowFloatingProblem(!showFloatingProblem)}
        />

        {showFloatingProblem && activeProblem && (
          <FloatingProblem 
            problem={activeProblem} 
            onClose={() => setShowFloatingProblem(false)} 
          />
        )}

        <div
          className={`workspace-main ${isResizingUsers ? "is-resizing-users" : ""}`}
          style={{ "--users-panel-width": `${usersPanelWidth}px` }}
        >
          <UsersPanel
            room={room}
            roomId={resolvedRoomId}
            users={users}
            permissions={permissions}
            onRoleChange={actions.updateRole}
            onKickUser={actions.kickUser}
          />
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
              files={files}
              activeFile={activeFile}
              activeName={activeName}
              setActiveName={setActiveName}
              users={users}
              typing={typing}
              typingCursors={typingCursors}
              permissions={permissions}
              onChange={actions.updateCode}
              onCreateFile={actions.createFile}
              onDeleteFile={actions.deleteActiveFile}
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
              onRun={() => actions.runCode(stdin)}
            />
          </div>
        </div>

        <button
          type="button"
          className="floating-chat-button"
          onClick={() => {
            setIsChatOpen(!isChatOpen);
            if (!isChatOpen) setFloatingMsgs([]);
          }}
          aria-label={isChatOpen ? "Close chat" : "Open room chat and AI chat"}
        >
          {isChatOpen ? <X size={22} /> : <MessageSquare size={22} />}
        </button>

        <CommsPanel
          messages={messages}
          aiMessages={aiMessages}
          me={permissions.me}
          suggestion={suggestion}
          aiThinking={aiThinking}
          permissions={permissions}
          onSendChat={actions.sendChat}
          onSendSticker={actions.sendSticker}
          onAskAi={actions.askAi}
          onClearNotifications={() => setFloatingMsgs([])}
          activeTab={activeCommsTab}
          onSelectTab={setActiveCommsTab}
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
        />

        <FooterBar />

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
