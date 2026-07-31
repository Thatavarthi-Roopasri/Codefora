import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Users, StickyNote, Info, Settings, MessageSquare, ArrowLeft, FileCode2, Target, PanelLeftClose, PanelLeftOpen, Monitor, Timer, Square, LogOut, Lock, Unlock, Copy, TerminalSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function LeftNavBar({ 
  activeTab,
  micOn, 
  onToggleMic, 
  onLeave,
  onEndRoom,
  onShowFiles,
  onShowProblem,
  onShowUsers,
  onShowNotes,
  showPreviewButton,
  onShowFullPreview,
  isConsoleOpen,
  onToggleConsole,
  onShowInfo,
  onShowSettings,
  room,
  users,
  permissions,
  actions,
  isAnyMicOn
}) {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(!activeTab);

  useEffect(() => {
    if (activeTab) {
      setIsExpanded(false);
    } else {
      setIsExpanded(true);
    }
  }, [activeTab]);

  return (
    <div className={`left-nav-bar ${isExpanded ? 'expanded' : ''}`} style={{ background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(12px)' }}>
      <div className="nav-logo-container">
        {isExpanded && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", userSelect: "none" }}>
            <img src="/codefora.png" alt="Codefora Logo" style={{ height: "24px", width: "auto", objectFit: "contain", borderRadius: "4px" }} />
            <span style={{ fontSize: "16px", fontWeight: "800", color: "var(--primary-orange)", letterSpacing: "-0.02em" }}>Codefora</span>
          </div>
        )}
        {!isExpanded && (
          <div style={{ display: "flex", alignItems: "center", width: "100%", justifyContent: "center" }}>
            <button onClick={() => setIsExpanded(true)} className="nav-expand-btn" style={{ padding: "4px", height: "auto" }} title="Expand">
              <PanelLeftOpen size={16} />
            </button>
          </div>
        )}
        {isExpanded && (
          <button onClick={() => setIsExpanded(false)} className="nav-expand-btn" title="Collapse">
            <PanelLeftClose size={20} />
          </button>
        )}
      </div>

      <div className="nav-items-top">
        <button className={`nav-item ${!micOn ? 'mic-off' : ''}`} onClick={onToggleMic} title={micOn ? 'Mute Mic (Ctrl+Shift+M)' : 'Unmute Mic (Ctrl+Shift+M)'}>
          {micOn ? <Mic size={20} /> : <MicOff size={20} />}
          <span>{micOn ? 'Mic On' : 'Mic Off'}</span>
        </button>
        <button className={`nav-item ${activeTab === 'files' ? 'active' : ''}`} onClick={onShowFiles} title="Explorer">
          <div className="icon-wrapper"><FileCode2 size={20} /></div>
          <span>Explorer</span>
        </button>
        <button className={`nav-item ${activeTab === 'problem' ? 'active' : ''}`} onClick={onShowProblem} title="Problem">
          <div className="icon-wrapper"><Target size={20} /></div>
          <span>Problem</span>
        </button>
        <button 
          className={`nav-item ${activeTab === 'users' ? 'active' : ''}`} 
          onClick={onShowUsers} 
          title="Users"
          style={isAnyMicOn ? {
            boxShadow: "0 0 15px rgba(80, 250, 123, 0.4)",
            border: "1px solid rgba(80, 250, 123, 0.4)",
            color: "#50FA7B"
          } : {}}
        >
          <div className="icon-wrapper"><Users size={20} /></div>
          <span>Users</span>
        </button>
        <button className={`nav-item ${activeTab === 'notes' ? 'active' : ''}`} onClick={onShowNotes} title="Notes">
          <div className="icon-wrapper"><StickyNote size={20} /></div>
          <span>Notes</span>
        </button>
        {showPreviewButton && (
          <button className={`nav-item ${activeTab === 'preview' ? 'active' : ''}`} onClick={onShowFullPreview} title="Full Preview">
            <div className="icon-wrapper"><Monitor size={20} /></div>
            <span>Preview</span>
          </button>
        )}
        <button className={`nav-item ${isConsoleOpen ? 'active' : ''}`} onClick={onToggleConsole} title="Console">
          <div className="icon-wrapper"><TerminalSquare size={20} /></div>
          <span>Console</span>
        </button>
      </div>

      <div className="nav-items-bottom">
        <button className="nav-item" onClick={onShowInfo} title="Information">
          <Info size={20} />
          <span>Info</span>
        </button>
        
        <button className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={onShowSettings} title="Settings">
          <div className="icon-wrapper"><Settings size={20} /></div>
          <span>Settings</span>
        </button>


        <button className="nav-item leave-btn" onClick={onLeave} title="Leave Room (Ctrl+Shift+V)">
          <ArrowLeft size={20} />
          <span>Leave</span>
        </button>
      </div>
    </div>
  );
}
