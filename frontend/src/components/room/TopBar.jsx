import React, { useState, useEffect } from 'react';
import { CheckCircle2, Play, Send, Users, Timer, Square, PanelLeftClose, Save, FolderCheck, CircleStop } from 'lucide-react';
import { AppToast } from '../AppToast';
import { SaveWorkNameModal } from '../SaveWorkNameModal';

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
  setIsSplitView,
  project,
  isProjectOwner,
  projectBusy,
  projectNotice,
  onSaveProject,
  onEndProject,
  onSaveWork,
  onLoginRequired
}) {
  const [timeLeft, setTimeLeft] = useState("");
  const [isSavingWork, setIsSavingWork] = useState(false);
  const [saveWorkMessage, setSaveWorkMessage] = useState("");
  const [saveWorkError, setSaveWorkError] = useState("");
  const [showSaveNameModal, setShowSaveNameModal] = useState(false);
  const [toast, setToast] = useState({ message: "", tone: "info" });
  const projectSaved = /saved/i.test(projectNotice || "");

  function describeSavedWork(work) {
    const storageLabel = work?.storage?.label || (work?.storage?.mode === "firestore" ? "Real Firestore" : "local/mock storage");
    const savedTime = new Date(work?.storage?.savedAt || work?.updatedAt || Date.now()).toLocaleString();
    return `Saved to ${storageLabel} at ${savedTime}`;
  }

  function requestSaveWork() {
    if (!onSaveWork || isSavingWork) return;
    setSaveWorkMessage("");
    setSaveWorkError("");
    setShowSaveNameModal(true);
  }

  async function handleSaveWork(projectName) {
    if (!onSaveWork || isSavingWork) return;
    setIsSavingWork(true);
    setSaveWorkMessage("");
    setSaveWorkError("");
    const result = await onSaveWork(projectName);
    if (result.success) {
      const saveDetail = describeSavedWork(result.work);
      setSaveWorkMessage("Saved!");
      setSaveWorkError(saveDetail);
      setToast({ message: saveDetail, tone: "success" });
      setShowSaveNameModal(false);
    } else {
      const message = result.error || "Failed to save work";
      const needsLogin = result.authRequired || /sign in|login/i.test(message);
      setSaveWorkMessage(needsLogin ? "Login" : "Error");
      setSaveWorkError(message);
      setToast({ message, tone: needsLogin ? "warning" : "error" });
      if (needsLogin && onLoginRequired) {
        onLoginRequired();
      } else {
        alert(message);
      }
    }
    setIsSavingWork(false);
    setTimeout(() => {
      setSaveWorkMessage("");
      setSaveWorkError("");
      setToast({ message: "", tone: "info" });
    }, 3000);
  }

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
      <AppToast message={toast.message} tone={toast.tone} />
      <SaveWorkNameModal
        open={showSaveNameModal}
        defaultName={room?.name || `Project in ${room?.id || "room"}`}
        isSaving={isSavingWork}
        onClose={() => setShowSaveNameModal(false)}
        onSave={handleSaveWork}
      />
      {/* Room details */}
      <div className="room-heading" style={{ display: "flex", alignItems: "center", gap: "16px", minWidth: 0 }}>
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
      <div className="top-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {project && (
          <span
            className="mobile-hidden"
            title={project.status === 'completed' ? 'Completed room project' : 'Active room project'}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: project.status === 'completed' ? '#94a3b8' : '#38bdf8', fontSize: '11px', fontWeight: '700', whiteSpace: 'nowrap' }}
          >
            <FolderCheck size={14} /> {project.status === 'completed' ? 'Completed' : 'Project active'}
          </span>
        )}

        {isProjectOwner && project?.status !== 'completed' && (
          <>
            <button
              className="button compact secondary mobile-hidden"
              onClick={onSaveProject}
              disabled={projectBusy}
              title={projectSaved ? 'Project saved' : (project ? 'Save a project checkpoint to your profile (Ctrl+Shift+S)' : 'Start this room project and save it to your profile (Ctrl+Shift+S)')}
              style={{
                height: '32px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '0 10px',
                opacity: projectBusy ? 0.65 : 1,
                borderColor: projectSaved ? 'rgba(34, 197, 94, 0.75)' : undefined,
                color: projectSaved ? '#86efac' : undefined,
                background: projectSaved ? 'rgba(34, 197, 94, 0.12)' : undefined
              }}
            >
              {projectSaved ? <CheckCircle2 size={13} /> : <Save size={13} />}
              {projectBusy ? 'Saving...' : (projectSaved ? 'Saved' : (project ? 'Save Project' : 'Start Project'))}
            </button>
            {project && (
              <button
                className="button compact secondary mobile-hidden"
                onClick={onEndProject}
                disabled={projectBusy}
                title="Save a final read-only snapshot and end this project"
                style={{ height: '32px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '6px', padding: '0 10px', borderColor: 'rgba(248, 113, 113, 0.55)', color: '#fca5a5', opacity: projectBusy ? 0.65 : 1 }}
              >
                <CircleStop size={13} /> End Project
              </button>
            )}
          </>
        )}

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

        {permissions?.canEdit && onSaveWork && (
          <button
            className="button compact secondary"
            style={{ height: '32px', borderRadius: '6px', background: 'transparent', border: '1px solid rgba(255, 255, 255, 0.15)', color: saveWorkMessage === 'Saved!' ? 'var(--success)' : saveWorkMessage === 'Error' ? 'var(--error)' : '#fff', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '500', cursor: isSavingWork ? 'not-allowed' : 'pointer', padding: '0 12px', opacity: isSavingWork ? 0.6 : 1 }}
            onClick={requestSaveWork}
            disabled={isSavingWork}
            title={isSavingWork ? 'Saving work...' : saveWorkError || saveWorkMessage || 'Save Work (Ctrl+S)'}
          >
            <Save size={13} />
            <span className="mobile-hidden">{isSavingWork ? 'Saving...' : saveWorkMessage || 'Save Work'}</span>
          </button>
        )}

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
