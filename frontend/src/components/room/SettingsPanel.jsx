import React, { useState, useEffect } from 'react';
import { Lock, Unlock, Copy } from 'lucide-react';

export function SettingsPanel({ room, users, timer, permissions, actions }) {
  const [localMaxMembers, setLocalMaxMembers] = useState(room?.max || 7);
  const [isTourRunning, setIsTourRunning] = useState(false);

  useEffect(() => {
    setLocalMaxMembers(room?.max || 7);
  }, [room?.max]);

  useEffect(() => {
    window.setTourToggleState = setIsTourRunning;
    return () => {
      delete window.setTourToggleState;
    }
  }, []);

  return (
    <div className="sidebar-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'transparent', borderRight: '1px solid var(--glass-border)' }}>
      <div className="sidebar-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
        <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: '#fff' }}>Room Settings</h2>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {!permissions?.isHost && (
          <p style={{ margin: 0, fontSize: "12px", color: "var(--primary-orange)", background: "rgba(255, 122, 24, 0.1)", padding: "10px", borderRadius: "6px" }}>
            Only the host can change these settings.
          </p>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "8px", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "16px" }}>
          <label style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: "bold" }}>Clock Mode</label>
          <div style={{ display: "flex", gap: "8px" }}>
            <button 
              disabled={!permissions?.isHost}
              onClick={() => actions.setTimerMode("timer")}
              style={{ flex: 1, padding: "8px", background: (!timer?.mode || timer.mode === "timer") ? "rgba(255, 145, 0, 0.2)" : "rgba(255,255,255,0.05)", border: (!timer?.mode || timer.mode === "timer") ? "1px solid var(--primary-orange)" : "1px solid rgba(255,255,255,0.1)", color: (!timer?.mode || timer.mode === "timer") ? "var(--primary-orange)" : "#fff", borderRadius: "6px", fontSize: "12px", cursor: permissions?.isHost ? "pointer" : "not-allowed" }}
            >
              Timer
            </button>
            <button 
              disabled={!permissions?.isHost}
              onClick={() => actions.setTimerMode("stopwatch")}
              style={{ flex: 1, padding: "8px", background: timer?.mode === "stopwatch" ? "rgba(59, 130, 246, 0.2)" : "rgba(255,255,255,0.05)", border: timer?.mode === "stopwatch" ? "1px solid #3b82f6" : "1px solid rgba(255,255,255,0.1)", color: timer?.mode === "stopwatch" ? "#3b82f6" : "#fff", borderRadius: "6px", fontSize: "12px", cursor: permissions?.isHost ? "pointer" : "not-allowed" }}
            >
              Stop Watch
            </button>
          </div>
          {permissions?.isHost && (
            <div style={{ display: "flex", gap: "8px", marginTop: "12px", alignItems: "center" }}>
              {(!timer?.mode || timer.mode === "timer") && (
                <>
                  <input 
                    type="number" 
                    id="timer-mins-input"
                    placeholder="Minutes"
                    min="1"
                    max="60"
                    defaultValue="5"
                    disabled={timer?.isRunning}
                    style={{ flex: 1, padding: "8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", borderRadius: "6px", width: "60px" }}
                  />
                  {!timer?.isRunning ? (
                    <button 
                      onClick={() => {
                        const mins = parseInt(document.getElementById("timer-mins-input").value) || 5;
                        actions.startTimer(mins * 60);
                      }}
                      style={{ padding: "8px 16px", background: "var(--primary-orange)", border: "none", color: "#fff", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}
                    >
                      Start Timer
                    </button>
                  ) : (
                    <button 
                      onClick={() => actions.stopTimer()}
                      style={{ padding: "8px 16px", background: "#ef4444", border: "none", color: "#fff", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}
                    >
                      Stop
                    </button>
                  )}
                </>
              )}
              {timer?.mode === "stopwatch" && (
                <>
                  {!timer?.isRunning ? (
                    <button 
                      onClick={() => actions.startTimer(0, "stopwatch")}
                      style={{ width: "100%", padding: "8px 16px", background: "#3b82f6", border: "none", color: "#fff", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}
                    >
                      Start Stopwatch
                    </button>
                  ) : (
                    <button 
                      onClick={() => actions.stopTimer()}
                      style={{ width: "100%", padding: "8px 16px", background: "#ef4444", border: "none", color: "#fff", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}
                    >
                      Stop Stopwatch
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <label style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: "bold" }}>Visibility</label>
          <div style={{ display: "flex", gap: "8px" }}>
            <button 
              disabled={!permissions?.isHost}
              onClick={() => actions.updateRoomSettings({ visibility: "public" })}
              style={{ flex: 1, padding: "8px", background: room?.visibility === "public" ? "rgba(16, 185, 129, 0.2)" : "rgba(255,255,255,0.05)", border: room?.visibility === "public" ? "1px solid #10b981" : "1px solid rgba(255,255,255,0.1)", color: room?.visibility === "public" ? "#10b981" : "#fff", borderRadius: "6px", fontSize: "12px", cursor: permissions?.isHost ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
            >
              <Unlock size={14} /> Public
            </button>
            <button 
              disabled={!permissions?.isHost}
              onClick={() => actions.updateRoomSettings({ visibility: "private" })}
              style={{ flex: 1, padding: "8px", background: room?.visibility === "private" ? "rgba(239, 68, 68, 0.2)" : "rgba(255,255,255,0.05)", border: room?.visibility === "private" ? "1px solid #ef4444" : "1px solid rgba(255,255,255,0.1)", color: room?.visibility === "private" ? "#ef4444" : "#fff", borderRadius: "6px", fontSize: "12px", cursor: permissions?.isHost ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
            >
              <Lock size={14} /> Private
            </button>
          </div>
        </div>

        {room?.visibility === "private" && room?.inviteCode && (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: "bold" }}>Invite Code</label>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(255,255,255,0.05)", padding: "8px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.1)" }}>
              <span style={{ fontSize: "14px", fontFamily: "monospace", color: "var(--primary-orange)", flex: 1, letterSpacing: "1px", textAlign: "center" }}>
                {room.inviteCode}
              </span>
              <button
                onClick={() => navigator.clipboard.writeText(room.inviteCode)}
                style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer", padding: "4px" }}
                title="Copy Invite Code"
              >
                <Copy size={14} />
              </button>
            </div>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
          <label style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: "bold" }}>Max Capacity</label>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <input 
                type="range" 
                className="custom-slider"
                min={users?.length || 1} 
                max="7" 
                step="1"
                value={localMaxMembers}
                onChange={(e) => setLocalMaxMembers(parseInt(e.target.value))}
                onMouseUp={() => actions.updateRoomSettings({ max: localMaxMembers })}
                onTouchEnd={() => actions.updateRoomSettings({ max: localMaxMembers })}
                disabled={!permissions?.isHost}
                style={{ 
                  flex: 1, 
                  cursor: permissions?.isHost ? "pointer" : "not-allowed",
                  background: `linear-gradient(to right, var(--primary-orange) ${(users?.length || 1) >= 7 ? 100 : ((localMaxMembers - (users?.length || 1)) / (7 - (users?.length || 1))) * 100}%, rgba(255, 255, 255, 0.1) ${(users?.length || 1) >= 7 ? 100 : ((localMaxMembers - (users?.length || 1)) / (7 - (users?.length || 1))) * 100}%)`
                }}
              />
              <span style={{ fontSize: "16px", fontWeight: "bold", color: "#fff", minWidth: "20px" }}>{localMaxMembers}</span>
          </div>
          <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Current members: {users?.length || 0}</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "8px" }}>
          <label style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: "bold" }}>Anti-Cheat</label>
          <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: permissions?.isHost ? "pointer" : "not-allowed", fontSize: "13px", color: "#fff" }}>
            <input
              type="checkbox"
              disabled={!permissions?.isHost}
              checked={room?.allowAi !== false}
              onChange={(e) => actions.updateRoomSettings({ allowAi: e.target.checked })}
              style={{ margin: 0, width: "16px", height: "16px", cursor: permissions?.isHost ? "pointer" : "not-allowed" }}
            />
            Allow AI Usage
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: permissions?.isHost ? "pointer" : "not-allowed", fontSize: "13px", color: "#fff" }}>
            <input
              type="checkbox"
              disabled={!permissions?.isHost}
              checked={room?.allowCopyPaste !== false}
              onChange={(e) => actions.updateRoomSettings({ allowCopyPaste: e.target.checked })}
              style={{ margin: 0, width: "16px", height: "16px", cursor: permissions?.isHost ? "pointer" : "not-allowed" }}
            />
            Allow Copy & Paste
          </label>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "16px", marginTop: "8px" }}>
          <label style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: "bold" }}>Your Preferences</label>
          <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontSize: "13px", color: "#fff" }}>
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
                    style={{ margin: 0, width: "16px", height: "16px", cursor: "pointer" }}
                  />
                  Room Tour Guide
                </label>
              </div>
      </div>
    </div>
  );
}
