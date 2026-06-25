import React, { useState, useEffect } from 'react';
import { Play, Send, Users, Timer, Square, PanelLeftClose } from 'lucide-react';

export function TopBar({ 
  room, 
  users, 
  onShowUsersModal, 
  hasProblem, 
  onRun, 
  onSubmit, 
  isRunningCode, 
  isSubmittingCode, 
  canSubmit,
  timer,
  permissions,
  actions,
  activeMainTab,
  activeFile,
  isSplitView,
  setIsSplitView
}) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    if (!timer?.isRunning || (!timer.endTime && !timer.startTime)) {
      setTimeLeft("");
      return;
    }
    const interval = setInterval(() => {
      const now = Date.now();
      let diff = timer.mode === "stopwatch" ? now - timer.startTime : timer.endTime - now;
      if (timer.mode !== "stopwatch" && diff <= 0) {
        setTimeLeft("00:00");
        clearInterval(interval);
        return;
      }
      const totalSeconds = Math.floor(diff / 1000);
      const mins = Math.floor(totalSeconds / 60);
      const secs = totalSeconds % 60;
      setTimeLeft(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [timer?.isRunning, timer?.endTime, timer?.startTime, timer?.mode]);
  return (
    <header className="topbar" style={{ height: "52px", padding: "0 16px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, position: "relative", zIndex: 1000, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(12px)' }}>
      {/* Room details */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px", minWidth: 0 }}>
        <div style={{ display: "flex", flexDirection: "column", minWidth: 0, gap: "2px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h1 style={{ margin: 0, fontSize: "14px", fontWeight: "600", color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "450px", display: "flex", alignItems: "center", gap: "10px" }}>
              <span>{room?.name || "Room"} <span style={{ color: "var(--text-muted)", fontSize: "12px", marginLeft: "4px" }}>({room?.id})</span></span>
              {activeFile && (
                <span className="mobile-hidden" style={{ background: "rgba(255, 122, 24, 0.15)", border: "1px solid rgba(255, 122, 24, 0.3)", color: "var(--primary-orange)", padding: "2px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "bold", display: "flex", alignItems: "center" }}>
                  {activeFile.name}
                </span>
              )}
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
                <span className="mobile-hidden">View Users</span>
              </button>
            )}
          </div>
          <span className="mobile-hidden" style={{ fontSize: "11px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {users?.length || 0} online • Host: {room?.hostName || "N/A"}
          </span>
        </div>
      </div>

      {timer?.isRunning && (
        <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.3)', padding: '4px 12px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <Timer size={14} style={{ color: "var(--primary-orange)" }} />
          <span style={{ fontFamily: 'monospace', fontSize: '14px', fontWeight: 'bold', color: '#fff', letterSpacing: '1px' }}>{timeLeft}</span>
          {permissions?.isHost && (
            <button 
              onClick={actions?.stopTimer}
              style={{ background: 'transparent', border: 'none', padding: '2px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              title="Stop Timer"
            >
              <Square size={12} fill="currentColor" style={{ color: "#ef4444" }} />
            </button>
          )}
        </div>
      )}

      {/* Right Side Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        
        {/* Split View Toggle */}
        {activeMainTab && activeMainTab !== 'editor' && (
          <button 
            className="mobile-hidden"
            onClick={() => setIsSplitView(!isSplitView)}
            style={{
              height: '32px',
              borderRadius: '6px',
              background: isSplitView ? 'rgba(255,255,255,0.1)' : 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0 12px',
              fontSize: '12px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            title="Toggle Split View"
          >
            <PanelLeftClose size={14} style={{ transform: isSplitView ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            {isSplitView ? "Full View" : "Split View"}
          </button>
        )}

        {/* Portal target for Language Selector */}
        <div id="topbar-language-selector"></div>

        <button 
          className="button compact secondary tour-run-button"
          style={{
            height: '32px',
            borderRadius: '6px',
            background: 'transparent',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            fontWeight: '500',
            cursor: isRunningCode ? 'not-allowed' : 'pointer',
            padding: '0 12px',
            opacity: isRunningCode ? 0.6 : 1
          }}
          onClick={onRun}
          disabled={isRunningCode}
          title="Run Code (Ctrl+`)"
        >
          <Play size={13} />
          <span className="mobile-hidden">{isRunningCode ? "Running..." : "Run Code"}</span>
        </button>

        <button 
          className="button compact tour-submit-button"
          style={{
            height: '32px',
            borderRadius: '6px',
            background: 'var(--primary-orange)',
            border: 'none',
            color: '#000',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            fontWeight: 'bold',
            cursor: (!canSubmit || isSubmittingCode) ? 'not-allowed' : 'pointer',
            padding: '0 16px',
            opacity: isSubmittingCode ? 0.6 : 1
          }}
          onClick={onSubmit}
          disabled={isSubmittingCode || !canSubmit}
          title={!canSubmit ? "Viewers cannot submit solutions" : "Submit Code (Ctrl+Shift+Enter)"}
        >
          <Send size={13} style={{ color: '#000' }} />
          <span className="mobile-hidden">{isSubmittingCode ? "Submitting..." : "Submit"}</span>
        </button>
      </div>
    </header>
  );
}
