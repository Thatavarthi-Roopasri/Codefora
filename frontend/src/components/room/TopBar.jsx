import { Code2, LogOut, Mic, MicOff, Users, X, BookOpen, Info, StickyNote, Timer, Play, Square, RotateCcw, ExternalLink, Settings, Lock, Unlock, Copy } from "lucide-react";
import { useEffect, useState, useRef } from "react";

export function TopBar({ room, users, files, runFile, setRunFile, micOn, permissions, onMic, actions, onLeaveRequest, onToggleProblem, onShowInfo, onShowNotes, onShowUsersModal, hasProblem, timer }) {
  const [timeLeft, setTimeLeft] = useState("");
  const [customMin, setCustomMin] = useState(25);
  const [customSec, setCustomSec] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [localMaxMembers, setLocalMaxMembers] = useState(room?.max || 7);
  const [isTourRunning, setIsTourRunning] = useState(false);
  const settingsRef = useRef(null);

  // Bulletproof sync: TourManager will directly call this function to update the toggle!
  useEffect(() => {
    window.setTourToggleState = setIsTourRunning;
    return () => {
      delete window.setTourToggleState;
    };
  }, []);

  useEffect(() => {
    setLocalMaxMembers(room?.max || 7);
  }, [room?.max]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) {
        setShowSettings(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!timer.isRunning || (!timer.endTime && !timer.startTime)) {
      setTimeLeft("");
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      let diff = 0;
      
      if (timer.mode === "stopwatch") {
        diff = now - timer.startTime;
      } else {
        diff = timer.endTime - now;
        if (diff <= 0) {
          setTimeLeft("00:00");
          clearInterval(interval);
          return;
        }
      }

      const totalSeconds = Math.floor(diff / 1000);
      const mins = Math.floor(totalSeconds / 60);
      const secs = totalSeconds % 60;
      setTimeLeft(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [timer.isRunning, timer.endTime, timer.startTime, timer.mode]);

  return (
    <header className="topbar" style={{ height: "52px", background: "var(--bg-secondary)", borderBottom: "1px solid var(--glass-border)", padding: "0 16px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, position: "relative", zIndex: 1000 }}>
      {/* Brand logo & Problem Info */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px", minWidth: 0 }}>
        <div 
          onClick={onLeaveRequest} 
          style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", userSelect: "none", flexShrink: 0 }}
        >
          <img 
            src="/codefora.png" 
            alt="Codefora Logo" 
            style={{ height: "24px", width: "auto", objectFit: "contain", borderRadius: "4px" }} 
          />
          <span style={{ fontSize: "18px", fontWeight: "800", color: "var(--primary-orange)", letterSpacing: "-0.02em" }}>
            Codefora
          </span>
        </div>

        {/* Separator Line */}
        <div style={{ width: "1px", height: "24px", background: "var(--glass-border)", flexShrink: 0 }} />

        {/* Room details */}
        <div style={{ display: "flex", flexDirection: "column", minWidth: 0, gap: "2px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h1 style={{ margin: 0, fontSize: "14px", fontWeight: "600", color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "250px" }}>
              {room?.name || "Room"} <span style={{ color: "var(--text-muted)", fontSize: "12px", marginLeft: "4px" }}>({room?.id})</span>
            </h1>
            {hasProblem && (
              <button 
                onClick={onShowUsersModal}
                className="tour-room-users-btn"
                style={{ 
                  display: "flex", alignItems: "center", gap: "6px", height: "26px", padding: "0 10px",
                  background: "rgba(255, 255, 255, 0.08)", border: "1px solid rgba(255, 255, 255, 0.15)",
                  color: "#fff", fontSize: "11px", fontWeight: "bold", borderRadius: "4px", cursor: "pointer",
                  transition: "all 0.2s", flexShrink: 0
                }}
              >
                <Users size={12} /> 
                <span>View Users</span>
              </button>
            )}
          </div>
          <span style={{ fontSize: "11px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {users.length} online • Host: {room?.hostName || "N/A"}
          </span>
        </div>
      </div>

      {/* Center Pomodoro Timer Badge */}
      <div 
        style={{ 
          display: "flex", 
          alignItems: "center", 
          gap: "6px",
          background: "rgba(0, 0, 0, 0.25)",
          height: "26px",
          padding: "0 10px",
          boxSizing: "border-box",
          borderRadius: "6px",
          border: "1px solid var(--glass-border)",
          fontFamily: '"Cascadia Code", "Fira Code", monospace',
          flexShrink: 0,
          margin: "0 12px"
        }}
      >
        <Timer size={13} style={{ color: "var(--primary-orange)" }} />
        {timer.isRunning ? (
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "12px", fontWeight: "bold", color: "#fff", minWidth: "36px", textAlign: "center" }}>
              {timeLeft}
            </span>
            {permissions.isHost && (
              <button 
                onClick={() => actions.stopTimer()}
                style={{ 
                  background: "rgba(239, 68, 68, 0.15)", 
                  border: "1px solid rgba(239, 68, 68, 0.3)", 
                  borderRadius: "4px",
                  color: "#ef4444", 
                  cursor: "pointer", 
                  width: "18px",
                  height: "18px",
                  boxSizing: "border-box",
                  display: "grid", 
                  placeItems: "center",
                  padding: 0,
                  transition: "all 0.2s"
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "rgba(239, 68, 68, 0.3)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "rgba(239, 68, 68, 0.15)"}
                title="Stop Timer"
              >
                <Square size={6} fill="#ef4444" style={{ color: "#ef4444" }} />
              </button>
            )}
          </div>
        ) : permissions.isHost ? (
          <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
            {timer.mode === "stopwatch" ? (
              <span style={{ fontSize: "12px", fontWeight: "bold", color: "var(--text-muted)", minWidth: "36px", textAlign: "center", margin: "0 4px" }}>
                00:00
              </span>
            ) : (
              <>
                <input 
                  type="text" 
                  inputMode="numeric"
                  value={customMin} 
                  onChange={(e) => setCustomMin(Math.max(0, parseInt(e.target.value.replace(/\D/g, '')) || 0))}
                  style={{ 
                    width: "22px", 
                    height: "18px",
                    boxSizing: "border-box",
                    background: "rgba(255, 255, 255, 0.05)", 
                    border: "1px solid rgba(255, 255, 255, 0.12)", 
                    borderRadius: "4px",
                    color: "#fff", 
                    fontSize: "11px", 
                    textAlign: "center", 
                    outline: "none", 
                    fontWeight: "bold",
                    padding: 0
                  }}
                  title="Minutes"
                />
                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>:</span>
                <input 
                  type="text" 
                  inputMode="numeric"
                  value={customSec.toString().padStart(2, '0')} 
                  onChange={(e) => setCustomSec(Math.max(0, Math.min(59, parseInt(e.target.value.replace(/\D/g, '')) || 0)))}
                  style={{ 
                    width: "22px", 
                    height: "18px",
                    boxSizing: "border-box",
                    background: "rgba(255, 255, 255, 0.05)", 
                    border: "1px solid rgba(255, 255, 255, 0.12)", 
                    borderRadius: "4px",
                    color: "#fff", 
                    fontSize: "11px", 
                    textAlign: "center", 
                    outline: "none", 
                    fontWeight: "bold",
                    padding: 0
                  }}
                  title="Seconds"
                />
              </>
            )}
            <button 
              onClick={() => actions.startTimer(customMin * 60 + customSec)}
              style={{ 
                background: "rgba(16, 185, 129, 0.15)", 
                border: "1px solid rgba(16, 185, 129, 0.3)", 
                borderRadius: "4px",
                color: "var(--success)", 
                cursor: "pointer", 
                width: "18px",
                height: "18px",
                boxSizing: "border-box",
                display: "grid",
                placeItems: "center",
                padding: 0,
                marginLeft: "3px",
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "rgba(16, 185, 129, 0.3)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "rgba(16, 185, 129, 0.15)"}
              title="Start Timer"
            >
              <Play size={8} fill="var(--success)" style={{ color: "var(--success)" }} />
            </button>
          </div>
        ) : (
          <span style={{ fontSize: "12px", fontWeight: "bold", color: "var(--text-muted)" }}>
            00:00
          </span>
        )}
      </div>

      {/* Right side Actions */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
        {/* Mic Toggle pill */}
        <button
          className="tour-mic-button"
          onClick={onMic}
          disabled={!permissions.canSpeak}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            height: "30px",
            padding: "0 12px",
            borderRadius: "6px",
            background: micOn ? "rgba(16, 185, 129, 0.1)" : "rgba(255, 255, 255, 0.04)",
            border: micOn ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid rgba(255, 255, 255, 0.06)",
            color: micOn ? "#10b981" : "var(--text-muted)",
            fontSize: "11px",
            fontWeight: "bold",
            cursor: permissions.canSpeak ? "pointer" : "not-allowed",
            outline: "none"
          }}
        >
          {micOn ? <Mic size={14} /> : <MicOff size={14} />}
          <span>{micOn ? "Mic On" : "Mic Off"}</span>
        </button>

        {/* Notes Toggle pill */}
        <button
          className="tour-notes-button"
          onClick={onShowNotes}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            height: "30px",
            padding: "0 12px",
            borderRadius: "6px",
            background: "rgba(255, 255, 255, 0.04)",
            border: "1px solid rgba(255, 255, 255, 0.06)",
            color: "var(--text-muted)",
            fontSize: "11px",
            fontWeight: "bold",
            cursor: "pointer",
            outline: "none"
          }}
          title="Rough Notes & Scratchpad"
        >
          <StickyNote size={14} />
          <span>Notes</span>
        </button>

        {/* Info Toggle pill */}
        <button
          onClick={onShowInfo}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            height: "30px",
            padding: "0 12px",
            borderRadius: "6px",
            background: "rgba(255, 255, 255, 0.04)",
            border: "1px solid rgba(255, 255, 255, 0.06)",
            color: "var(--text-muted)",
            fontSize: "11px",
            fontWeight: "bold",
            cursor: "pointer",
            outline: "none"
          }}
          title="Room Information"
        >
          <Info size={14} />
          <span>Info</span>
        </button>

        {/* Room Settings Pill */}
        <div style={{ position: "relative" }} ref={settingsRef}>
          <button
            className="tour-settings-button"
            onClick={() => setShowSettings(!showSettings)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              height: "30px",
              padding: "0 12px",
              borderRadius: "6px",
              background: showSettings ? "rgba(255, 255, 255, 0.1)" : "rgba(255, 255, 255, 0.04)",
              border: showSettings ? "1px solid rgba(255, 255, 255, 0.15)" : "1px solid rgba(255, 255, 255, 0.06)",
              color: "var(--text-muted)",
              fontSize: "11px",
              fontWeight: "bold",
              cursor: "pointer",
              outline: "none"
            }}
            title="Room Settings"
          >
            <Settings size={14} />
            <span>Settings</span>
          </button>
          
          {showSettings && (
            <div style={{
              position: "absolute",
              top: "100%",
              right: 0,
              marginTop: "8px",
              width: "220px",
              background: "#0f172a",
              border: "1px solid var(--glass-border)",
              borderRadius: "8px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
              padding: "16px",
              zIndex: 100,
              display: "flex",
              flexDirection: "column",
              gap: "16px"
            }}>
              <h3 style={{ margin: 0, fontSize: "14px", color: "#fff" }}>Room Settings</h3>
              
              {!permissions.isHost ? (
                <p style={{ margin: 0, fontSize: "12px", color: "var(--primary-orange)" }}>
                  Only the host can change these settings.
                </p>
              ) : null}

                <div style={{ display: "flex", flexDirection: "column", gap: "8px", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "12px", marginBottom: "4px" }}>
                  <label style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: "bold" }}>Clock Mode</label>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button 
                      disabled={!permissions.isHost}
                      onClick={() => actions.setTimerMode("timer")}
                      style={{ flex: 1, padding: "6px", background: (!timer.mode || timer.mode === "timer") ? "rgba(255, 145, 0, 0.2)" : "rgba(255,255,255,0.05)", border: (!timer.mode || timer.mode === "timer") ? "1px solid var(--primary-orange)" : "1px solid rgba(255,255,255,0.1)", color: (!timer.mode || timer.mode === "timer") ? "var(--primary-orange)" : "#fff", borderRadius: "4px", fontSize: "11px", cursor: permissions.isHost ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}
                    >
                      Timer
                    </button>
                    <button 
                      disabled={!permissions.isHost}
                      onClick={() => actions.setTimerMode("stopwatch")}
                      style={{ flex: 1, padding: "6px", background: timer.mode === "stopwatch" ? "rgba(59, 130, 246, 0.2)" : "rgba(255,255,255,0.05)", border: timer.mode === "stopwatch" ? "1px solid #3b82f6" : "1px solid rgba(255,255,255,0.1)", color: timer.mode === "stopwatch" ? "#3b82f6" : "#fff", borderRadius: "4px", fontSize: "11px", cursor: permissions.isHost ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}
                    >
                      Stop Watch
                    </button>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <label style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: "bold" }}>Visibility</label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button 
                    disabled={!permissions.isHost}
                    onClick={() => actions.updateRoomSettings({ visibility: "public" })}
                    style={{ flex: 1, padding: "6px", background: room?.visibility === "public" ? "rgba(16, 185, 129, 0.2)" : "rgba(255,255,255,0.05)", border: room?.visibility === "public" ? "1px solid #10b981" : "1px solid rgba(255,255,255,0.1)", color: room?.visibility === "public" ? "#10b981" : "#fff", borderRadius: "4px", fontSize: "11px", cursor: permissions.isHost ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}
                  >
                    <Unlock size={12} /> Public
                  </button>
                  <button 
                    disabled={!permissions.isHost}
                    onClick={() => actions.updateRoomSettings({ visibility: "private" })}
                    style={{ flex: 1, padding: "6px", background: room?.visibility === "private" ? "rgba(239, 68, 68, 0.2)" : "rgba(255,255,255,0.05)", border: room?.visibility === "private" ? "1px solid #ef4444" : "1px solid rgba(255,255,255,0.1)", color: room?.visibility === "private" ? "#ef4444" : "#fff", borderRadius: "4px", fontSize: "11px", cursor: permissions.isHost ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}
                  >
                    <Lock size={12} /> Private
                  </button>
                </div>
              </div>

              {room?.visibility === "private" && room?.inviteCode && (
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: "bold" }}>Invite Code</label>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(255,255,255,0.05)", padding: "6px", borderRadius: "4px", border: "1px solid rgba(255,255,255,0.1)" }}>
                    <span style={{ fontSize: "12px", fontFamily: "monospace", color: "var(--primary-orange)", flex: 1, letterSpacing: "1px", textAlign: "center" }}>
                      {room.inviteCode}
                    </span>
                    <button
                      onClick={() => navigator.clipboard.writeText(room.inviteCode)}
                      style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer", padding: "2px" }}
                      title="Copy Invite Code"
                    >
                      <Copy size={12} />
                    </button>
                  </div>
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <label style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: "bold" }}>Max Capacity</label>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <input 
                      type="range" 
                      className="custom-slider"
                      min={users.length} 
                      max="7" 
                      step="1"
                      value={localMaxMembers}
                      onChange={(e) => setLocalMaxMembers(parseInt(e.target.value))}
                      onMouseUp={() => actions.updateRoomSettings({ max: localMaxMembers })}
                      onTouchEnd={() => actions.updateRoomSettings({ max: localMaxMembers })}
                      disabled={!permissions.isHost}
                      style={{ 
                        flex: 1, 
                        cursor: permissions.isHost ? "pointer" : "not-allowed",
                        background: `linear-gradient(to right, var(--primary-orange) ${users.length >= 7 ? 100 : ((localMaxMembers - users.length) / (7 - users.length)) * 100}%, rgba(255, 255, 255, 0.1) ${users.length >= 7 ? 100 : ((localMaxMembers - users.length) / (7 - users.length)) * 100}%)`
                      }}
                    />
                    <span style={{ fontSize: "14px", fontWeight: "bold", color: "#fff", minWidth: "20px" }}>{localMaxMembers}</span>
                </div>
                <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>Current members: {users.length}</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <label style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: "bold" }}>Anti-Cheat</label>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: permissions.isHost ? "pointer" : "not-allowed", fontSize: "12px", color: "#fff" }}>
                  <input
                    type="checkbox"
                    disabled={!permissions.isHost}
                    checked={room?.allowAi !== false}
                    onChange={(e) => actions.updateRoomSettings({ allowAi: e.target.checked })}
                    style={{ margin: 0, width: "14px", height: "14px", cursor: permissions.isHost ? "pointer" : "not-allowed" }}
                  />
                  Allow AI Usage
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: permissions.isHost ? "pointer" : "not-allowed", fontSize: "12px", color: "#fff" }}>
                  <input
                    type="checkbox"
                    disabled={!permissions.isHost}
                    checked={room?.allowCopyPaste !== false}
                    onChange={(e) => actions.updateRoomSettings({ allowCopyPaste: e.target.checked })}
                    style={{ margin: 0, width: "14px", height: "14px", cursor: permissions.isHost ? "pointer" : "not-allowed" }}
                  />
                  Allow Copy & Paste
                </label>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "12px", marginTop: "4px" }}>
                <label style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: "bold" }}>Your Preferences</label>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "12px", color: "#fff" }}>
                  <input
                    id="tour-toggle-checkbox"
                    type="checkbox"
                    checked={isTourRunning}
                    onChange={(e) => {
                      setIsTourRunning(e.target.checked);
                      if (e.target.checked) {
                        window.dispatchEvent(new Event('manual-start-tour'));
                      } else {
                        window.dispatchEvent(new Event('manual-stop-tour'));
                      }
                    }}
                    style={{ margin: 0, width: "14px", height: "14px", cursor: "pointer" }}
                  />
                  Room Tour Guide
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Leave Room Pill */}
        <button
          className="tour-leave-button"
          onClick={onLeaveRequest}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            height: "30px",
            padding: "0 12px",
            borderRadius: "6px",
            background: "transparent",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            color: "#fff",
            fontSize: "11px",
            fontWeight: "bold",
            cursor: "pointer",
            outline: "none"
          }}
        >
          <LogOut size={12} />
          <span>Leave Room</span>
        </button>

        {/* End Room Pill */}
        {permissions.isHost && (
          <button
            className="tour-end-button"
            onClick={() => actions.endRoom()}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              height: "30px",
              padding: "0 12px",
              borderRadius: "6px",
              background: "#ef4444",
              border: "none",
              color: "#fff",
              fontSize: "11px",
              fontWeight: "bold",
              cursor: "pointer",
              outline: "none"
            }}
          >
            <LogOut size={12} style={{ transform: "rotate(180deg)" }} />
            <span>End Room</span>
          </button>
        )}
      </div>
    </header>
  );
}
