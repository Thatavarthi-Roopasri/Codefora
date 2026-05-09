import { Code2, LogOut, Mic, MicOff, Users, X, BookOpen } from "lucide-react";

export function TopBar({ room, users, files, runFile, setRunFile, micOn, permissions, onMic, actions, onLeaveRequest, onToggleProblem }) {

  return (
    <header className="topbar">
      <div className="room-heading">
        <button className="icon-button orange" onClick={onLeaveRequest} aria-label="Back to rooms" style={{ padding: 0, overflow: 'hidden' }}>
          <img src="/codefora.png" alt="Codefora" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </button>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0 }}>{room?.name || "Room"}</h1>
            {(room?.problemId || (room?.name && room.name.includes("Problem Room:"))) && (
              <button 
                className="button-pill-sm" 
                onClick={onToggleProblem}
                title="View Problem Description"
                style={{ 
                  background: '#f97316', 
                  color: 'white',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 12px',
                  borderRadius: '100px',
                  fontSize: '12px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(249, 115, 22, 0.3)',
                  transition: 'all 0.2s'
                }}
              >
                <BookOpen size={14} /> <span>View Problem</span>
              </button>
            )}
          </div>
          <span style={{ marginTop: '4px' }}>
            <Users size={14} /> {users.length} online — {permissions.me?.role || "Member"}
          </span>
        </div>
      </div>

      <div className="top-actions">
        <button
          className={`button compact ${micOn ? "primary mic-live" : "secondary"}`}
          disabled={!permissions.canSpeak}
          onClick={onMic}
          style={micOn ? { background: "#f97316", border: "none" } : {}}
        >
          {micOn ? <Mic size={16} style={{ color: "#000" }} /> : <MicOff size={16} />}
          <span style={micOn ? { color: "#000", fontWeight: "800" } : {}}>{micOn ? "Mic Live" : "Mic Off"}</span>
        </button>

        <button className="button compact secondary" onClick={onLeaveRequest}>
          <LogOut size={16} /> Leave
        </button>

        {permissions.isHost && (
          <button className="button compact danger" onClick={actions.endRoom}>
            <X size={16} /> End Lab
          </button>
        )}
      </div>
    </header>
  );
}
