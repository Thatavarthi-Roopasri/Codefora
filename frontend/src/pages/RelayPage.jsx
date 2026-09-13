import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useBlocker, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { ArrowLeft, CheckCircle2, Code2, Copy, FileCode2, GitBranch, Info, LogIn, MessageCircle, Mic, MicOff, Monitor, MoreVertical, PanelLeftClose, Play, Send, StickyNote, Target, Terminal, TerminalSquare, UserPlus, Users, X } from 'lucide-react';
import { NotesModal } from '../components/room/NotesModal';
import { Navbar } from '../components/Navbar';
import { useAuth } from '../hooks/useAuth';
import { api } from '../api/client';
import { copyToClipboard } from '../lib/clipboard';
import { logoutUser } from '../lib/firebase';
import { getInviteCode, saveInviteCode } from '../lib/navigation';
import { isGuestUser } from '../lib/userAccess';
import { socket } from '../lib/socket';
import './relay.css';

function relayDisplayName(name = '') {
  return String(name).replace(/('s Relay)\s+[a-z0-9]{6,}$/i, '$1');
}

function relayModeLabel(mode) {
  return mode === 'dsa' ? 'DSA Functions' : mode === 'backend' ? 'Backend APIs' : 'Frontend Sections';
}

export default function RelayPage() {
  const { roomId } = useParams();
  const [search] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const uid = !isGuestUser(user) ? user?.uid || user?.id : '';
  const returnTo = `${location.pathname}${location.search}`;
  const invite = search.get('inviteCode') || getInviteCode(roomId) || '';
  const inviteJoin = search.get('join') === '1';
  const [room, setRoom] = useState(null);
  const [drafts, setDrafts] = useState({});
  const draftsRef = useRef({});
  const [selected, setSelected] = useState('');
  const [editVersion, setEditVersion] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [result, setResult] = useState(null);
  const [existingInviteMember, setExistingInviteMember] = useState(false);
  const [workspacePanel, setWorkspacePanel] = useState('');
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [consoleTab, setConsoleTab] = useState('console');
  const [consoleInput, setConsoleInput] = useState('');
  const [chatOpen, setChatOpen] = useState(false);
  const [chatText, setChatText] = useState('');
  const [chatBusy, setChatBusy] = useState(false);
  const [relayNotes, setRelayNotes] = useState({ text: '', draws: [] });
  const [relayMicBusy, setRelayMicBusy] = useState(false);
  const [relayMicOn, setRelayMicOn] = useState(false);
  const relayMicStream = useRef(null);
  const relayPeerConnections = useRef(new Map());
  const relayEditorRef = useRef(null);
  const relayMonacoRef = useRef(null);
  const relayCursorDecorations = useRef(new Map());
  const [showLeavePrompt, setShowLeavePrompt] = useState(false);
  const leaveBypassRef = useRef(false);
  const [tick, setTick] = useState(Date.now());
  const offset = useRef(0);
  const requestId = useRef(0);
  const acceptedId = useRef(0);
  const relayCodeTimer = useRef(null);
  const joinedRef = useRef(false);
  const putDrafts = useCallback(next => { draftsRef.current = next; setDrafts(next); }, []);
  const accept = useCallback((snapshot, id) => {
    if (id < acceptedId.current) return;
    acceptedId.current = id;
    offset.current = snapshot.serverNow - Date.now();
    setRoom(snapshot);
    const next = {};
    for (const file of snapshot.files || []) {
      const previous = draftsRef.current[file.id];
      const keepLivePreview = previous?.remotePreview && previous.revision === file.revision;
      next[file.id] = previous && (previous.dirty || previous.revision > file.revision || keepLivePreview)
        ? { ...previous, readOnly: file.readOnly, remotePreview: keepLivePreview, conflict: previous.conflict || (previous.dirty && file.revision !== previous.revision) }
        : { ...file, dirty: false, conflict: false };
    }
    putDrafts(next);
    setSelected(current => next[current] ? current : snapshot.files[0]?.id || '');
  }, [putDrafts]);
  const call = useCallback(async (body, run = false) => {
    const id = ++requestId.current;
    const response = await api.request(`/api/rooms/${encodeURIComponent(roomId)}/relay${run ? '/run' : ''}`, body ? { method: 'POST', body: JSON.stringify(body) } : undefined);
    if (!run && body?.action !== 'leave') accept(response, id);
    return response;
  }, [roomId, accept]);

  useEffect(() => {
    if (!loading && !uid) {
      navigate(`/?returnTo=${encodeURIComponent(returnTo)}`, { replace: true, state: { returnTo } });
    }
  }, [loading, uid, navigate, returnTo]);

  useEffect(() => {
    if (!uid) return undefined;
    let active = true, timer;
    joinedRef.current = false;
    putDrafts({}); setRoom(null); setError('');
    const poll = async () => {
      try {
        if (!busyRef.current) {
          const id = ++requestId.current;
          const joined = joinedRef.current;
          const endpoint = `/api/rooms/${encodeURIComponent(roomId)}`;
          const snapshot = !joined && inviteJoin
            ? await api.request(`${endpoint}?inviteCode=${encodeURIComponent(invite)}`)
            : await api.request(`/api/rooms/${encodeURIComponent(roomId)}/relay`, !joined ? { method: 'POST', body: JSON.stringify({ action: 'join', inviteCode: invite }) } : undefined);
          if (active) {
            if (!joined && inviteJoin && snapshot.joinedNow === false) setExistingInviteMember(true);
            if (!inviteJoin || snapshot.relay?.members?.some(item => item.userId === uid)) joinedRef.current = true;
            setError(''); accept(snapshot, id); if (invite) saveInviteCode(roomId, invite);
          }
        }
      } catch (err) { if (active) setError(err.message); }
      if (active) timer = setTimeout(() => poll(), 1000);
    };
    poll();
    return () => { active = false; clearTimeout(timer); };
  }, [roomId, uid, invite, inviteJoin, accept, putDrafts]);

  useEffect(() => {
    if (!uid || !roomId) return undefined;
    let active = true;
    const refresh = async () => {
      try {
        const id = ++requestId.current;
        const snapshot = await api.request(`/api/rooms/${encodeURIComponent(roomId)}/relay`);
        if (active) accept(snapshot, id);
      } catch { /* the polling loop will surface a durable error if the room is unavailable */ }
    };
    const joinPresence = () => socket.emit('relay:join', { roomId, userId: uid }, response => { if (response?.error && active) setError(response.error); });
    const heartbeat = () => socket.emit('relay:heartbeat', { roomId, userId: uid });
    const onRelayState = payload => { if (payload?.roomId === roomId) refresh(); };
    socket.on('connect', joinPresence);
    socket.on('relay:state', onRelayState);
    if (socket.connected) joinPresence(); else socket.connect();
    const heartbeatTimer = setInterval(heartbeat, 10000);
    return () => {
      active = false;
      clearInterval(heartbeatTimer);
      clearTimeout(relayCodeTimer.current);
      socket.off('connect', joinPresence);
      socket.off('relay:state', onRelayState);
      socket.emit('relay:detach', { roomId, userId: uid });
    };
  }, [roomId, uid, accept]);

  useEffect(() => {
    if (!uid || !roomId) return undefined;
    const onRelayCodeUpdate = payload => {
      if (payload?.roomId !== roomId || !payload.taskId || typeof payload.code !== 'string') return;
      const current = draftsRef.current[payload.taskId];
      if (!current) return;
      // Preserve local work if both teammates are editing a shared leftover task.
      if (current.dirty) {
        putDrafts({ ...draftsRef.current, [payload.taskId]: { ...current, conflict: true } });
        return;
      }
      putDrafts({ ...draftsRef.current, [payload.taskId]: { ...current, code: payload.code, remotePreview: true, conflict: false } });
    };
    socket.on('relay:code:update', onRelayCodeUpdate);
    return () => socket.off('relay:code:update', onRelayCodeUpdate);
  }, [roomId, uid, putDrafts]);

  const broadcastRelayCode = (taskId, code) => {
    clearTimeout(relayCodeTimer.current);
    relayCodeTimer.current = setTimeout(() => {
      socket.emit('relay:code:update', { roomId, taskId, code });
    }, 120);
  };

  useEffect(() => {
    const interval = setInterval(() => setTick(Date.now()), 200);
    const warn = event => {
      if (Object.values(draftsRef.current).some(file => file.dirty)) { event.preventDefault(); event.returnValue = ''; }
    };
    window.addEventListener('beforeunload', warn);
    return () => { clearInterval(interval); window.removeEventListener('beforeunload', warn); };
  }, []);

  const save = useCallback(async id => {
    const draft = draftsRef.current[id];
    if (!draft?.dirty) return draft;
    if (draft.conflict) throw new Error('Shared work changed. Copy your draft before loading the latest version.');
    // Keep edits made while this request is in flight. Only the submitted text becomes saved.
    const request = ++requestId.current;
    const snapshot = await api.request(`/api/rooms/${encodeURIComponent(roomId)}/relay`, { method: 'POST', body: JSON.stringify({ action: 'save', taskId: id, code: draft.code, revision: draft.revision }) });
    const saved = snapshot.files.find(file => file.id === id);
    const current = draftsRef.current[id];
    if (saved && current) putDrafts({ ...draftsRef.current, [id]: { ...saved, code: current.code, dirty: current.code !== draft.code, conflict: false } });
    accept(snapshot, request);
    return draftsRef.current[id];
  }, [roomId, accept, putDrafts]);

  const perform = useCallback(async operation => {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setError('');
    try { await operation(); }
    catch (err) { setError(err.message); }
    finally { busyRef.current = false; setBusy(false); }
  }, []);

  useEffect(() => {
    if (busy || error || !Object.values(draftsRef.current).some(file => file.dirty && !file.conflict && !file.readOnly)) return undefined;
    const timer = setTimeout(() => perform(async () => {
      for (const file of Object.values(draftsRef.current)) if (file.dirty && !file.conflict && !file.readOnly) await save(file.id);
    }), 1200);
    return () => clearTimeout(timer);
  }, [editVersion, busy, error, perform, save]);

  const reload = () => perform(async () => {
    const latest = await api.request(`/api/rooms/${encodeURIComponent(roomId)}/relay`);
    const file = latest.files.find(item => item.id === selected);
    if (file) putDrafts({ ...draftsRef.current, [selected]: { ...file, dirty: false, conflict: false } });
  });
  const run = individual => perform(async () => {
    for (const file of Object.values(draftsRef.current)) if (file.dirty) await save(file.id);
    setResult(await call({ ...(individual ? { taskId: selected } : {}), width: 800 }, true));
  });
  const phase = room?.relay.status;
  const member = room?.relay.members.find(item => item.userId === uid);
  const host = room?.ownerUserId === uid;
  const shareInvite = room?.inviteCode || invite;
  const file = drafts[selected];
  const seconds = Math.max(0, Math.ceil(((room?.relay.selectionEndsAt || 0) - tick - offset.current) / 1000));
  const ready = room && room.relay.members.length === room.max && room.relay.members.every(item => item.ready);
  const dirty = Object.values(drafts).some(item => item.dirty);
  const switchAccount = () => perform(async () => {
    await logoutUser();
    navigate(`/?returnTo=${encodeURIComponent(returnTo)}`, { replace: true, state: { returnTo } });
  });
  const inWorkspace = ['BUILDING', 'SUBMITTED'].includes(phase);
  const relayActive = Boolean(room && phase !== 'ENDED');
  const blocker = useBlocker(({ currentLocation, nextLocation }) => relayActive && !leaveBypassRef.current && currentLocation.pathname !== nextLocation.pathname);
  useEffect(() => {
    if (blocker.state === 'blocked') setShowLeavePrompt(true);
  }, [blocker.state]);
  const finishExit = () => {
    leaveBypassRef.current = true;
    setShowLeavePrompt(false);
    socket.emit('relay:detach', { roomId, userId: uid });
    if (blocker.state === 'blocked') blocker.proceed();
    else navigate('/challenges');
  };
  const cancelExit = () => {
    setShowLeavePrompt(false);
    if (blocker.state === 'blocked') blocker.reset();
  };
  const saveBeforeExit = () => perform(async () => {
    for (const draft of Object.values(draftsRef.current)) {
      if (draft.dirty && !draft.conflict && !draft.readOnly) await save(draft.id);
    }
    await call({ action: 'leave' });
    finishExit();
  });
  const endRelay = () => perform(async () => {
    for (const draft of Object.values(draftsRef.current)) {
      if (draft.dirty && !draft.conflict && !draft.readOnly) await save(draft.id);
    }
    await call({ action: 'end' });
    finishExit();
  });
  const closeRelayPeer = peerId => {
    const peer = relayPeerConnections.current.get(peerId);
    if (peer) peer.close();
    relayPeerConnections.current.delete(peerId);
    document.querySelectorAll('audio[data-relay-peer]').forEach(audio => { if (audio.dataset.relayPeer === peerId) { audio.srcObject = null; audio.remove(); } });
  };
  const createRelayPeer = async (peerId, initiator = false) => {
    if (!peerId || peerId === uid || !relayMicStream.current || !window.RTCPeerConnection) return;
    let peer = relayPeerConnections.current.get(peerId);
    if (!peer) {
      peer = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
      relayPeerConnections.current.set(peerId, peer);
      relayMicStream.current.getTracks().forEach(track => peer.addTrack(track, relayMicStream.current));
      peer.onicecandidate = event => { if (event.candidate) socket.emit('relay:voice:signal', { roomId, userId: uid, targetUserId: peerId, type: 'candidate', candidate: event.candidate }); };
      peer.onconnectionstatechange = () => { if (['failed', 'closed', 'disconnected'].includes(peer.connectionState)) closeRelayPeer(peerId); };
      peer.ontrack = event => {
        const audio = document.createElement('audio');
        audio.autoplay = true;
        audio.setAttribute('playsinline', '');
        audio.dataset.relayPeer = peerId;
        audio.srcObject = event.streams[0];
        document.body.appendChild(audio);
        audio.onended = () => audio.remove();
      };
    }
    if (initiator && peer.signalingState === 'stable') {
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      socket.emit('relay:voice:signal', { roomId, userId: uid, targetUserId: peerId, type: 'offer', sdp: offer });
    }
    return peer;
  };
  useEffect(() => {
    const onVoiceSignal = async payload => {
      if (!payload || payload.roomId !== roomId || payload.targetUserId !== uid) return;
      if (payload.type === 'leave') { closeRelayPeer(payload.userId); return; }
      if (!relayMicStream.current) return;
      try {
        const peer = await createRelayPeer(payload.userId, false);
        if (!peer) return;
        if (payload.type === 'offer') {
          await peer.setRemoteDescription(payload.sdp);
          const answer = await peer.createAnswer();
          await peer.setLocalDescription(answer);
          socket.emit('relay:voice:signal', { roomId, userId: uid, targetUserId: payload.userId, type: 'answer', sdp: answer });
        } else if (payload.type === 'answer' && peer.signalingState !== 'stable') await peer.setRemoteDescription(payload.sdp);
        else if (payload.type === 'candidate' && payload.candidate) await peer.addIceCandidate(payload.candidate);
      } catch (voiceError) { console.warn('Relay voice negotiation failed', voiceError); closeRelayPeer(payload.userId); }
    };
    socket.on('relay:voice:signal', onVoiceSignal);
    return () => socket.off('relay:voice:signal', onVoiceSignal);
  }, [roomId, uid]);
  useEffect(() => {
    const onRemoteCursor = payload => {
      if (!payload || payload.roomId !== roomId || payload.taskId !== selected || !relayEditorRef.current || !relayMonacoRef.current) return;
      const editor = relayEditorRef.current;
      const monaco = relayMonacoRef.current;
      const range = payload.selection ? new monaco.Range(payload.selection.startLineNumber, payload.selection.startColumn, payload.selection.endLineNumber, payload.selection.endColumn) : new monaco.Range(payload.position.lineNumber, payload.position.column, payload.position.lineNumber, payload.position.column);
      const className = `relay-remote-selection-${String(payload.userId).replace(/[^a-z0-9]/gi, '').slice(-8)}`;
      const cursorClass = `relay-remote-caret-${String(payload.userId).replace(/[^a-z0-9]/gi, '').slice(-8)}`;
      const visibleRange = payload.selection && (payload.selection.startLineNumber !== payload.selection.endLineNumber || payload.selection.startColumn !== payload.selection.endColumn)
        ? range
        : new monaco.Range(payload.position.lineNumber, payload.position.column, payload.position.lineNumber, payload.position.column + 1);
      const decoration = { range: visibleRange, options: { className, beforeContentClassName: cursorClass, afterContentClassName: cursorClass, hoverMessage: { value: `${payload.name || 'Teammate'} is editing` } } };
      const previous = relayCursorDecorations.current.get(payload.userId) || [];
      relayCursorDecorations.current.set(payload.userId, editor.deltaDecorations(previous, [decoration]));
      const cursorKey = String(payload.userId).replace(/[^a-z0-9]/gi, '').slice(-8);
      const styleId = `relay-cursor-style-${cursorKey}`;
      let style = document.getElementById(styleId);
      if (!style) { style = document.createElement('style'); style.id = styleId; document.head.appendChild(style); }
      const color = payload.color || '#22d3ee';
      style.textContent = `.${className}{background:${color}33!important;border-bottom:1px solid ${color}!important}.relay-remote-caret-${cursorKey}{display:inline-block;width:2px;height:1.2em;border-left:2px solid ${color};margin-left:-1px;box-shadow:0 0 8px ${color}}`;
    };
    socket.on('relay:cursor:update', onRemoteCursor);
    return () => {
      socket.off('relay:cursor:update', onRemoteCursor);
      if (relayEditorRef.current) relayCursorDecorations.current.forEach(decoration => relayEditorRef.current.deltaDecorations(decoration, []));
      relayCursorDecorations.current.clear();
    };
  }, [roomId, selected]);
  const toggleRelayMic = async () => {
    if (relayMicBusy) return;
    if (relayMicStream.current) {
      socket.emit('relay:voice:signal', { roomId, userId: uid, type: 'leave' });
      relayPeerConnections.current.forEach(peer => peer.close());
      relayPeerConnections.current.clear();
      relayMicStream.current.getTracks().forEach(track => track.stop());
      relayMicStream.current = null;
      setRelayMicOn(false);
      socket.emit('relay:mic:update', { roomId, userId: uid, mic: false, speaking: false });
      return;
    }
    setRelayMicBusy(true);
    setError('');
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Microphone requires HTTPS or localhost.');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false });
      relayMicStream.current = stream;
      if (!window.RTCPeerConnection) throw new Error('Live voice is not supported by this browser.');
      setRelayMicOn(true);
      room.relay.members.filter(item => item.userId !== uid && item.online !== false).forEach(item => { createRelayPeer(item.userId, true).catch(() => {}); });
      stream.getTracks().forEach(track => { track.onended = () => { relayMicStream.current = null; setRelayMicOn(false); socket.emit('relay:mic:update', { roomId, userId: uid, mic: false, speaking: false }); }; });
      socket.emit('relay:mic:update', { roomId, userId: uid, mic: true, speaking: false });
    } catch (failure) {
      relayMicStream.current?.getTracks().forEach(track => track.stop());
      relayMicStream.current = null;
      setRelayMicOn(false);
      setError(failure.name === 'NotAllowedError' ? 'Allow microphone access in your browser, then try again.' : failure.message || 'Could not start the microphone.');
    } finally {
      setRelayMicBusy(false);
    }
  };
  const sendRelayChat = event => {
    event?.preventDefault();
    const text = chatText.trim();
    if (!text || chatBusy || !socket.connected) return;
    setChatBusy(true);
    socket.emit('relay:chat:send', { roomId, userId: uid, text }, response => {
      setChatBusy(false);
      if (!response?.error) setChatText('');
      else setError(response.error);
    });
  };
  useEffect(() => {
    if (room?.relay?.notes) setRelayNotes(room.relay.notes);
  }, [room?.relay?.notes]);
  const updateRelayNotes = text => {
    const next = { ...relayNotes, text };
    setRelayNotes(next);
    socket.emit('relay:notes:update', { roomId, userId: uid, text });
  };
  const drawRelayNote = draw => {
    const next = draw === 'clear' ? { ...relayNotes, draws: [] } : { ...relayNotes, draws: [...(relayNotes.draws || []), draw] };
    setRelayNotes(next);
    socket.emit('relay:notes:draw', { roomId, userId: uid, draw });
  };
  useEffect(() => () => {
    socket.emit('relay:voice:signal', { roomId, userId: uid, type: 'leave' });
    relayPeerConnections.current.forEach(peer => peer.close());
    relayPeerConnections.current.clear();
    relayMicStream.current?.getTracks().forEach(track => track.stop());
    setRelayMicOn(false);
    socket.emit('relay:mic:update', { roomId, userId: uid, mic: false, speaking: false });
  }, [roomId, uid]);
  return <main className={`problems-shell relay-page ${inWorkspace ? 'relay-room-mode' : phase === 'LOBBY' ? 'relay-lobby-mode' : ''}`}>
    {!inWorkspace && <Navbar />}
    <section className={`relay-shell ${inWorkspace ? 'relay-room-shell' : ''}`}>
    {phase === 'SELECTING' && <header className="relay-heading"><div><span className="relay-eyebrow">CHALLENGES / RELAY</span><h1>{relayDisplayName(room?.name) || 'Team Relay'}</h1><p>Choose your task. Build your part. Finish together.</p></div>
      {dirty ? <span>Save your edits before leaving.</span> : <Link to="/challenges">Back to challenges</Link>}
    </header>}
    {error && !inWorkspace && <div role="alert" className="relay-error">{error}</div>}
    {!uid && !loading && <p role="status">Opening sign in so you can join this Relay…</p>}
    {!room && uid && !error && <p role="status">Joining your team…</p>}
    {room && <>
      {phase === 'SELECTING' && <section className="relay-panel relay-status"><strong>{room.relay.mode === 'dsa' ? 'DSA · JavaScript functions' : room.relay.mode === 'backend' ? 'Backend · Node.js APIs' : 'Frontend · HTML/CSS sections'}</strong><span>{phase}</span><span>{room.relay.members.length}/{room.max} teammates</span></section>}
      {phase === 'LOBBY' && <RelayLobby room={room} uid={uid} member={member} host={host} ready={ready} busy={busy} shareInvite={shareInvite} existingInviteMember={existingInviteMember} switchAccount={switchAccount} onJoin={async () => { const response = await call({ action: 'join', inviteCode: invite }); joinedRef.current = true; return response; }} onLeave={() => setShowLeavePrompt(true)} perform={perform} call={call} />}
      {phase === 'SELECTING' && <section className="relay-panel"><h2>Choose your preferred task <span className="relay-countdown" role="timer">{seconds}s</span></h2><p>You can change your choice until the timer ends. Each task belongs to one person. If you miss selection, a task is assigned automatically. Leftovers become shared.</p>
        <div className="relay-task-grid">{room.relay.tasks.map(task => <article key={task.id}><h3>{task.title}</h3><p>{task.description}</p><button disabled={busy || !seconds || Boolean(task.ownerId && task.ownerId !== uid)} onClick={() => perform(() => call({ action: 'claim', taskId: task.id }))}>{task.ownerId === uid ? 'Your choice ✓' : task.ownerName ? `Chosen by ${task.ownerName}` : 'Choose task'}</button></article>)}</div>
        {!seconds && <p role="status">Opening your workspace…</p>}
      </section>}
      {['BUILDING', 'SUBMITTED'].includes(phase) && <div className={`relay-room-layout ${['files', 'problems', 'team', 'details'].includes(workspacePanel) ? 'panel-open' : ''}`}>
        <RelayRoomRail activePanel={consoleOpen ? 'console' : workspacePanel} setActivePanel={panel => { setConsoleOpen(false); setWorkspacePanel(panel); }} micOn={relayMicOn} micBusy={relayMicBusy} onToggleMic={toggleRelayMic} onTarget={() => { setConsoleOpen(false); setWorkspacePanel('problems'); }} onPreview={() => { setConsoleOpen(false); setWorkspacePanel('target'); run(true); }} onConsole={() => { setWorkspacePanel(''); setConsoleOpen(value => !value); }} onNotes={() => { setConsoleOpen(false); setWorkspacePanel('notes'); }} onBack={() => setShowLeavePrompt(true)} />
        {['files', 'problems', 'team', 'details'].includes(workspacePanel) && <RelayWorkspaceSidebar panel={workspacePanel} room={room} uid={uid} host={host} busy={busy} result={result} drafts={drafts} selected={selected} setSelected={setSelected} close={() => setWorkspacePanel('')} onAction={action => perform(() => call(action))} />}
        <div className={`relay-room-main ${consoleOpen ? 'console-open' : ''}`}>
          <header className="relay-room-toolbar">
            <div className="relay-room-identity"><strong>{relayDisplayName(room.name)} <span className="relay-file-badge">{file?.fileName || 'No file selected'}</span></strong><span>{room.relay.members.filter(item => item.online !== false).length} online · {host ? 'Host' : 'Teammate'} · {room.relay.tasks.filter(task => task.done).length}/{room.relay.tasks.length} tasks done</span></div>
            <div className="relay-room-toolbar-actions"><span className="relay-project-active"><i /> Relay active</span><button type="button" onClick={() => setWorkspacePanel('team')}><Users size={15} /> View Users</button><span className="relay-language-badge">{String(file?.language || 'code').toUpperCase()}</span><button disabled={busy || !file?.id || file.conflict} onClick={() => perform(() => run(true))}><Play size={15} /> Run Code</button>{host && phase !== 'SUBMITTED' && <button className="relay-primary" disabled={busy || dirty || room.relay.tasks.some(task => !task.done || !task.validation?.passed)} onClick={() => perform(() => call({ action: 'submit' }))}>Submit</button>}</div>
          </header>
          {workspacePanel === 'notes' && <div className="relay-notes-pane"><NotesModal isOpen inline onClose={() => setWorkspacePanel('')} notes={relayNotes} onUpdateText={updateRelayNotes} onDraw={drawRelayNote} permissions={{ canEdit: true }} /></div>}
          {error && <div role="alert" className="relay-error relay-room-error">{error}</div>}
          <section className={`relay-workspace ${workspacePanel === 'target' ? 'target-open' : ''}`} aria-label="Relay workspace">
          <aside className="relay-target-pane">
            <div className="relay-pane-heading"><div><span>TARGET</span><strong>{file?.title || 'Select a file'}</strong></div><span>{file?.ownerId === null ? 'Shared task' : 'Your task'}</span></div>
            {file && (room.relay.mode === 'frontend' ? <FrontendRelayTarget taskId={file.id} /> : <DsaRelayTarget file={file} mode={room.relay.mode} />)}
            {file && <div className="relay-target-copy"><strong>{file.description}</strong><p>{file.ownerId === null ? 'This leftover task is shared with the whole team.' : 'Only you can view and edit this assigned source.'}</p></div>}
          </aside>
          <section className="relay-editor-pane">
            <div className="relay-pane-heading"><div><span>CODE EDITOR</span><strong>{file?.fileName || 'No file selected'}</strong></div><span role="status">{busy ? 'Working…' : file?.conflict ? 'Conflict' : file?.remotePreview ? 'Live teammate edit' : file?.dirty ? 'Unsaved' : 'Saved'}</span></div>
            {file && <div className="relay-editor-body">{file.signature && <pre>{file.signature} {'{'} <small>edit the function body below</small></pre>}
              <Editor height="min(54vh, 570px)" theme="vs-dark" path={`relay/${roomId}/${uid}/${file.id}`} language={file.language} value={file.code} onMount={(editor, monaco) => { relayEditorRef.current = editor; relayMonacoRef.current = monaco; editor.onDidChangeCursorSelection(event => { const position = event.selection.getPosition(); socket.emit('relay:cursor:update', { roomId, userId: uid, taskId: selected, position, selection: event.selection }); }); }} onChange={code => { const nextCode = code ?? ''; putDrafts({ ...draftsRef.current, [selected]: { ...draftsRef.current[selected], code: nextCode, dirty: true, remotePreview: false } }); broadcastRelayCode(selected, nextCode); setEditVersion(version => version + 1); setResult(null); }} options={{ readOnly: file.readOnly || file.done || busy, minimap: { enabled: false }, fontSize: 15, wordWrap: 'on', automaticLayout: true }} />
              {file.signature && <pre>{'}'}</pre>}
              {file.conflict && <div className="relay-error">A newer version was saved. Your draft is preserved in this editor. Copy it before loading the latest version. <button disabled={busy} onClick={reload}>Discard draft and load latest</button></div>}
              <div className="relay-editor-actions"><button disabled={busy || file.readOnly || file.conflict} onClick={() => perform(async () => { const saved = await save(selected); await call({ action: 'done', taskId: selected, revision: saved.revision, done: !saved.done }); })}>{file.done ? 'Reopen task' : 'Mark done'}</button></div>
            </div>}
          </section>
          {consoleOpen && <section className="relay-console-bottom" aria-label="Relay compiler console"><div className="relay-console-topbar"><div className="relay-console-tabs"><button type="button" className={consoleTab === 'console' ? 'active' : ''} onClick={() => setConsoleTab('console')}>〉_ Console</button><button type="button" className={consoleTab === 'preview' ? 'active' : ''} onClick={() => setConsoleTab('preview')}>◉ Web Preview</button></div><div className="relay-console-actions"><button type="button" disabled={busy || !file?.id || file.conflict} onClick={() => perform(() => run(true))}>Run</button><button type="button" onClick={() => setConsoleInput('')}>Clear</button><button type="button" className="relay-console-close" onClick={() => setConsoleOpen(false)} aria-label="Close console">×</button></div></div>{consoleTab === 'console' ? <div className="relay-console-split"><section><strong>CUSTOM INPUT (STDIN)</strong><textarea value={consoleInput} onChange={event => setConsoleInput(event.target.value)} placeholder="Type or paste sample inputs here…" /></section><section><strong>OUTPUT</strong><div className="relay-console-output">{result ? <><p>{result.message || 'Run completed.'}</p>{result.results && <ul>{result.results.map(item => <li key={item.taskId}>{item.title}: {item.passed}/{item.total} — {item.status}</li>)}</ul>}</> : <p>Ready.</p>}</div></section></div> : <div className="relay-console-preview-wrap">{result?.image ? <img className="relay-console-preview" src={result.image} alt="Preview of your Relay implementation" /> : <p>Run Preview to render your implementation.</p>}</div>}</section>}
          </section>
          {result && <section className="relay-panel relay-room-result" aria-live="polite"><p>{result.message}</p>{result.image && <img className="relay-preview" src={result.image} alt="Rendered Relay page" />}{result.results && <ul>{result.results.map(item => <li key={item.taskId}>{item.title}: {item.passed}/{item.total} — {item.status}</li>)}</ul>}</section>}
          {room.relay.result && <section className="relay-panel relay-room-result relay-final-result" aria-labelledby="relay-final-result-title"><h2 id="relay-final-result-title">Relay result</h2><p><strong>{room.relay.result.score}% overall</strong> - {room.relay.result.passed}/{room.relay.result.total} tasks passed.</p><ul>{room.relay.result.tasks.map(item => <li key={item.taskId}><strong>{item.title}</strong><span>{item.passed ? 'Passed' : 'Failed'} - {item.score}% - {item.summary}</span></li>)}</ul></section>}
        </div>
        <section className={`relay-room-chat ${chatOpen ? 'open' : ''}`} aria-label="Relay team chat">
          {chatOpen && <div className="relay-room-chat-panel"><header><div><span>TEAM CHAT</span><strong>{room.relay.members.length} room members</strong></div><button type="button" onClick={() => setChatOpen(false)} aria-label="Close team chat"><X size={17} /></button></header><div className="relay-room-chat-messages" role="log" aria-live="polite">{(room.relay.chat || []).length === 0 ? <p className="relay-room-chat-empty">Say hello to your teammates.</p> : (room.relay.chat || []).map(message => <article key={message.id} className={message.userId === uid ? 'mine' : ''}><div><strong>{message.userId === uid ? 'You' : message.name}</strong><time>{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time></div><p>{message.text}</p></article>)}</div><form onSubmit={sendRelayChat}><input value={chatText} onChange={event => setChatText(event.target.value)} placeholder="Message your team…" maxLength={500} aria-label="Message your team" /><button type="submit" disabled={!chatText.trim() || chatBusy} aria-label="Send message"><Send size={16} /></button></form></div>}
          <button type="button" className="relay-room-chat-toggle" onClick={() => setChatOpen(value => !value)} aria-label={chatOpen ? 'Close team chat' : 'Open team chat'}>{chatOpen ? <X size={22} /> : <MessageCircle size={22} />}</button>
        </section>
      </div>}
      {phase === 'ENDED' && <section className="relay-panel relay-ended"><GitBranch size={34} /><h2>This Relay has ended</h2><p>The host ended the room for everyone. Its private task source is no longer available.</p><Link to="/challenges">Back to challenges</Link></section>}
    </>}
    {showLeavePrompt && <RelayLeaveDialog host={host} busy={busy} dirty={dirty} cancel={cancelExit} exit={saveBeforeExit} end={endRelay} />}
    </section>
  </main>;
}

function RelayRoomRail({ activePanel, setActivePanel, micOn, micBusy, onToggleMic, onTarget, onPreview, onConsole, onNotes, onBack }) {
  const select = panel => setActivePanel(panel);
  return <nav className="relay-room-rail" aria-label="Relay room tools">
    <div className="relay-room-brand"><Code2 size={19} /><strong>Codefora</strong><button type="button" onClick={() => setActivePanel('')} aria-label="Collapse Relay navigation"><PanelLeftClose size={18} /></button></div>
    <div className="relay-room-nav-main">
      <button type="button" className={`relay-mic-off ${micOn ? 'mic-on' : ''}`} disabled={micBusy} onClick={onToggleMic} aria-label={micOn ? 'Turn microphone off' : 'Turn microphone on'}>{micOn ? <Mic size={19} /> : <MicOff size={19} />}<span>{micBusy ? 'Mic…' : micOn ? 'Mic On' : 'Mic Off'}</span></button>
      <button type="button" className={activePanel === 'files' ? 'active' : ''} onClick={() => select('files')}><FileCode2 size={19} /><span>Explorer</span></button>
      <button type="button" className={activePanel === 'problems' ? 'active' : ''} onClick={onTarget}><Target size={19} /><span>Problem</span></button>
      <button type="button" className={activePanel === 'team' ? 'active' : ''} onClick={() => select('team')}><Users size={19} /><span>Users</span></button>
      <button type="button" className={activePanel === 'notes' ? 'active' : ''} onClick={onNotes}><StickyNote size={19} /><span>Notes</span></button>
      <button type="button" className={activePanel === 'target' ? 'active' : ''} onClick={onPreview}><Monitor size={19} /><span>Preview</span></button>
      <button type="button" className={activePanel === 'console' ? 'active' : ''} onClick={onConsole}><TerminalSquare size={19} /><span>Console</span></button>
    </div>
    <div className="relay-room-nav-bottom">
      <button type="button" className="relay-room-leave" onClick={onBack}><ArrowLeft size={19} /><span>Leave</span></button>
    </div>
  </nav>;
}

function RelayWorkspaceSidebar({ panel, room, uid, host, busy, result, drafts, selected, setSelected, close, onRun, onAction }) {
  return <aside className="relay-workspace-sidebar">
    <header><div><span>{panel === 'files' ? 'RELAY FILES' : panel === 'problems' ? 'RELAY PROBLEMS' : panel === 'team' ? `USERS (${room.relay.members.length})` : panel === 'console' ? 'RELAY CONSOLE' : 'RELAY NOTES'}</span><strong>{panel === 'files' ? `${Object.keys(drafts).length} accessible` : panel === 'problems' ? `${Object.keys(drafts).length} problems` : relayDisplayName(room.name)}</strong></div><button type="button" onClick={close} aria-label="Close side panel"><PanelLeftClose size={18} /></button></header>
    {(panel === 'files' || panel === 'problems') && <div className="relay-sidebar-files">{Object.values(drafts).map(item => <button type="button" key={item.id} className={selected === item.id ? 'active' : ''} onClick={() => setSelected(item.id)}><FileCode2 size={18} /><span><strong>{item.title || item.fileName}{item.dirty ? ' *' : ''}</strong><small>{item.ownerId === null ? 'SHARED PROBLEM' : 'YOUR PROBLEM'} · {item.done ? 'DONE' : 'OPEN'}</small></span>{item.done && <CheckCircle2 size={16} />}</button>)}</div>}
    {panel === 'team' && <div className="relay-sidebar-team">{room.relay.members.map(item => { const assignment = room.relay.tasks.find(task => task.ownerId === item.userId); return <article key={item.userId} className={item.userId === uid ? 'current' : ''}><div>{item.name?.charAt(0)?.toUpperCase() || 'U'}</div><span><strong>{item.name}{item.userId === uid ? ' (you)' : ''}</strong><small>{item.userId === room.ownerUserId ? 'HOST' : 'TEAMMATE'} · {item.online === false ? 'Offline' : 'Online'} · {item.mic ? 'Mic on' : 'Mic off'} · {assignment?.title || 'Shared work'}</small></span><i /><details className="relay-user-menu"><summary aria-label={`Actions for ${item.name || 'user'}`}><MoreVertical size={18} /></summary><div className="relay-user-menu-popover"><span>{item.userId === uid ? 'Your permissions' : host ? 'Host permissions' : 'Member options'}</span>{host && item.userId !== uid ? <><button type="button" disabled={busy} onClick={() => onAction({ action: 'transfer_host', targetUserId: item.userId })}>Make host</button><button type="button" disabled={busy} onClick={() => onAction({ action: 'remove', targetUserId: item.userId })}>Remove member</button></> : <small>{item.userId === uid ? 'You are in this Relay.' : 'Only the host can manage members.'}</small>}</div></details></article>; })}</div>}
    {panel === 'details' && <div className="relay-sidebar-details"><div><span>Mode</span><strong>{relayModeLabel(room.relay.mode)}</strong></div><div><span>Team</span><strong>{room.relay.members.length}/{room.max}</strong></div><div><span>Access</span><strong>Private assignments</strong></div><div><span>Status</span><strong>{room.relay.status}</strong></div><h3>Recent activity</h3><ul className="relay-activity-list">{(room.relay.activity || []).slice(-8).reverse().map(item => <li key={item.id}>{item.text}</li>)}</ul></div>}
    {panel === 'console' && <div className="relay-sidebar-console"><div className="relay-compiler-settings"><span>COMPILER SETTINGS</span><label>Language<select value={String(room.relay.mode === 'dsa' ? 'JavaScript' : room.relay.mode === 'backend' ? 'Node.js' : 'HTML / CSS')} disabled><option>{room.relay.mode === 'dsa' ? 'JavaScript' : room.relay.mode === 'backend' ? 'Node.js' : 'HTML / CSS'}</option></select></label><label>Mode<select value={room.relay.mode} disabled><option>{room.relay.mode === 'frontend' ? 'Frontend section' : room.relay.mode === 'backend' ? 'Backend API' : 'JavaScript function'}</option></select></label><button type="button" disabled={busy || !selected} onClick={onRun}>Run tests</button></div><div className="relay-console-status"><i /> {result ? 'Latest run output' : 'Ready'}</div></div>}
    <div className="relay-private-card"><Terminal size={17} /><div><strong>Private Relay</strong><span>Your assigned source is hidden from teammates.</span></div></div>
  </aside>;
}

function RelayLeaveDialog({ host, busy, dirty, cancel, exit, end }) {
  const cancelRef = useRef(null);
  useEffect(() => {
    cancelRef.current?.focus();
    const onKeyDown = event => { if (event.key === 'Escape') cancel(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [cancel]);
  return <div className="relay-dialog-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) cancel(); }}>
    <section className="relay-leave-dialog" role="dialog" aria-modal="true" aria-labelledby="relay-leave-title">
      <div className="relay-leave-icon"><ArrowLeft size={22} /></div>
      <h2 id="relay-leave-title">{host ? 'Leave or end this Relay?' : 'Exit this Relay?'}</h2>
      <p>{host ? 'Exit keeps the Relay open so you can return. End Relay closes the workspace for every teammate.' : 'Your saved changes stay in the Relay, and you can return with the same invitation while it remains open.'}</p>
      {dirty && <span className="relay-leave-saving">Your latest edits will be saved before leaving.</span>}
      <div>
        <button ref={cancelRef} type="button" disabled={busy} onClick={cancel}>Cancel</button>
        <button type="button" disabled={busy} onClick={exit}>{busy ? 'Saving…' : host ? 'Exit and keep open' : 'Exit Relay'}</button>
        {host && <button type="button" className="relay-end-button" disabled={busy} onClick={end}>{busy ? 'Ending…' : 'End Relay for everyone'}</button>}
      </div>
    </section>
  </div>;
}

function FrontendRelayTarget({ taskId }) {
  const previews = {
    navigation: <div className="relay-mock-nav"><b>Northstar</b><div><span>Home</span><span>Work</span><span>Contact</span></div><button>Join</button></div>,
    hero: <div className="relay-mock-hero"><span>BUILD TOGETHER</span><h2>Ship better ideas with your team.</h2><p>A focused workspace for turning ambitious concepts into polished products.</p><button>Start building</button></div>,
    features: <div className="relay-mock-features">{['Fast setup', 'Private work', 'Shared finish'].map((label, index) => <article key={label}><i>{index + 1}</i><strong>{label}</strong><span>Clear, reliable tools for every teammate.</span></article>)}</div>,
    pricing: <div className="relay-mock-pricing">{['Starter', 'Team', 'Studio'].map((label, index) => <article key={label} className={index === 1 ? 'featured' : ''}><span>{label}</span><strong>${[12, 29, 59][index]}</strong><small>per month</small><button>Choose plan</button></article>)}</div>,
    footer: <div className="relay-mock-footer"><div><strong>Northstar</strong><p>Thoughtful tools for modern teams.</p></div><div><b>Product</b><span>Features</span><span>Pricing</span></div><div><b>Company</b><span>About</span><span>Contact</span></div><small>© 2026 Northstar</small></div>
  };
  return <div className={`relay-target-canvas relay-target-${taskId}`} aria-label={`${taskId} visual target`}>{previews[taskId] || previews.hero}</div>;
}

function DsaRelayTarget({ file, mode }) {
  return <div className="relay-dsa-target">
    <span>{mode === 'backend' ? 'API CONTRACT' : 'FUNCTION CHALLENGE'}</span>
    <h2>{file.signature || file.fileName}</h2>
    <div><strong>Input</strong><p>{mode === 'backend' ? 'A request handler with authentication and validated input.' : 'An array of numbers named values.'}</p></div>
    <div><strong>Expected</strong><p>{file.description}</p></div>
    <div><strong>Edge cases</strong><p>{mode === 'backend' ? 'Cover unauthorized requests, invalid input, failures, and stable JSON responses.' : 'Handle empty arrays, zero, and negative values.'}</p></div>
  </div>;
}

function RelayLobby({ room, uid, member, host, ready, busy, shareInvite, existingInviteMember, switchAccount, onJoin, onLeave, perform, call }) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [joining, setJoining] = useState(false);
  const copyTimerRef = useRef(null);
  useEffect(() => () => clearTimeout(copyTimerRef.current), []);
  const members = room.relay.members || [];
  const readyCount = members.filter(item => item.ready).length;
  const slots = Array.from({ length: room.max }, (_, index) => members[index] || null);
  const inviteUrl = `${window.location.origin}/relay/${room.id}?inviteCode=${encodeURIComponent(shareInvite || '')}&join=1`;
  const modeLabel = relayModeLabel(room.relay.mode);
  const waitingCount = Math.max(0, room.max - members.length);
  const startReason = ready
    ? 'All teammates are ready'
    : waitingCount
      ? `Waiting for ${waitingCount} teammate${waitingCount === 1 ? '' : 's'} to join`
      : `Waiting for ${members.filter(item => !item.ready).length} teammate${members.filter(item => !item.ready).length === 1 ? '' : 's'} to be ready`;
  const copyWithFeedback = (value, type) => perform(async () => {
    await copyToClipboard(value);
    setCopied(type);
    clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopied(''), 1800);
  });
  const joinRelay = async event => {
    event.preventDefault();
    if (joining) return;
    let code = joinCode.trim();
    try {
      if (/^https?:\/\//i.test(code)) code = new URL(code).searchParams.get('inviteCode') || '';
    } catch {
      code = '';
    }
    code = code.replace(/^#/, '').replace(/\s+/g, '').toUpperCase();
    if (!code) {
      setJoinError('Enter a Relay join code.');
      return;
    }
    setJoining(true);
    setJoinError('');
    try {
      const target = await api.getRoomByInviteCode(code);
      if (!target?.relay) throw new Error('That code is not for a Relay room.');
      if (target.relay.status === 'ENDED') throw new Error('This Relay has ended.');
      saveInviteCode(target.id, code);
      navigate(`/relay/${target.id}?inviteCode=${encodeURIComponent(code)}&join=1`);
    } catch (err) {
      setJoinError(err.message || 'Could not find that Relay.');
    } finally {
      setJoining(false);
    }
  };

  return <section className="relay-lobby" aria-label="Relay lobby">
    <header className="relay-lobby-header">
      <div className="relay-lobby-title">
        <GitBranch size={44} />
        <div>
          <h1>{relayDisplayName(room.name)}</h1>
          <span className="relay-lobby-status"><span /> Waiting for teammates</span>
        </div>
      </div>
      <div className="relay-room-code-group">
        <div className="relay-room-code">
          <span>{shareInvite || room.id}</span>
          <button type="button" className={copied === 'code' ? 'copied' : ''} onClick={() => copyWithFeedback(shareInvite || room.id, 'code')} aria-label={copied === 'code' ? 'Join code copied' : 'Copy Relay join code'}>{copied === 'code' ? <><CheckCircle2 size={16} /> Copied</> : <Copy size={17} />}</button>
        </div>
        {shareInvite && <button type="button" className={`relay-copy-link ${copied === 'link' ? 'copied' : ''}`} onClick={() => copyWithFeedback(inviteUrl, 'link')}>{copied === 'link' ? <><CheckCircle2 size={16} /> Copied</> : 'Copy Link'}</button>}
        <form className="relay-lobby-join relay-lobby-search" onSubmit={joinRelay}>
          <input
            value={joinCode}
            onChange={event => { setJoinCode(event.target.value); setJoinError(''); }}
            placeholder="Search by join code"
            aria-label="Search Relay by join code"
            autoComplete="off"
            spellCheck="false"
            maxLength={240}
          />
          <button type="submit" disabled={joining || !joinCode.trim()}>{joining ? 'Joining…' : <><LogIn size={15} /> Join Relay</>}</button>
          {joinError && <span role="alert">{joinError}</span>}
        </form>
      </div>
    </header>

    {existingInviteMember && <div className="relay-account-notice" role="status">
      <div><strong>You are already in this Relay as {member?.name || 'this user'}.</strong><span>To fill another teammate slot, open the invite with a different Codefora account.</span></div>
      <button type="button" disabled={busy} onClick={switchAccount}>Switch account</button>
    </div>}

    <div className="relay-lobby-grid">
      <div className="relay-lobby-main">
            <section className="relay-team-panel">
          <div className="relay-team-heading">
            <h2><Users size={20} /> Relay Team</h2>
            <span>{members.length} / {room.max}</span>
          </div>
          <p className="relay-team-intro">When everyone is ready, the host opens a 15-second task selection. Missed choices are assigned automatically and leftover tasks become shared.</p>
          <div className="relay-member-slots">
            {slots.map((item, index) => <article key={item?.userId || index} className={item ? 'filled' : 'empty-slot'}>
              {item ? <>
                <div className="relay-member-avatar">{item.name?.charAt(0)?.toUpperCase() || 'U'}</div>
                <strong>{item.name}{item.userId === uid ? ' (you)' : ''}</strong>
                <span>{item.userId === room.ownerUserId ? 'Host' : 'Teammate'} · {item.ready ? 'Ready' : 'Not ready'}</span>
                {item.ready ? <CheckCircle2 className="relay-member-ready" size={20} /> : <span className="relay-member-waiting" />}{host && item.userId !== uid && <div className="relay-member-controls"><button type="button" disabled={busy} onClick={() => perform(() => call({ action: 'transfer_host', targetUserId: item.userId }))}>Make host</button><button type="button" disabled={busy} onClick={() => perform(() => call({ action: 'remove', targetUserId: item.userId }))}>Remove</button></div>}
              </> : <>
                <div className="relay-empty-avatar"><UserPlus size={19} /></div>
                <div className="relay-open-slot-copy"><strong>Open team slot</strong><span>Available to join</span></div>
                {!member && index === members.length && <button type="button" className="relay-occupy-slot" disabled={busy} onClick={() => perform(onJoin)}><UserPlus size={14} /> Occupy slot</button>}
              </>}
            </article>)}
              </div>
            </section>
            <section className="relay-ready-card relay-ready-card-inline">
              <header className="relay-ready-heading">
                <div><span>TEAM STATUS</span><h2>Ready Check</h2></div>
                <strong>{readyCount}/{room.max} ready</strong>
              </header>
              {!member && <div className="relay-join-required"><p>Select the highlighted open team slot above to join the Relay.</p></div>}
              {member && <>
              <div className="relay-ready-summary"><p>{readyCount === room.max ? 'Everyone is ready to begin.' : `${Math.max(0, room.max - readyCount)} teammate${room.max - readyCount === 1 ? '' : 's'} still need${room.max - readyCount === 1 ? 's' : ''} to get ready.`}</p><span>{members.length}/{room.max} slots occupied</span></div>
              <div className="relay-ready-bar" role="progressbar" aria-valuenow={readyCount} aria-valuemin="0" aria-valuemax={room.max}><span style={{ width: `${room.max ? (readyCount / room.max) * 100 : 0}%` }} /></div>
              <div className="relay-ready-list">
                {members.map(item => <span key={item.userId}><span>{item.name}</span>{item.ready ? <CheckCircle2 size={17} /> : <span className="relay-ready-empty" />}</span>)}
              </div>
              <div className="relay-ready-actions"><button type="button" disabled={busy} onClick={() => perform(() => call({ action: 'ready', ready: !member?.ready }))}>{member?.ready ? 'Cancel Ready' : "I'm Ready"}</button>{host && <button type="button" className={`relay-start-button ${ready ? 'armed' : ''}`} disabled={busy || !ready} onClick={() => perform(() => call({ action: 'start' }))}><Play size={16} /> Start Selection</button>}<small>{host ? startReason : 'Only the host can start selection'}</small></div>
              </>}
            </section>
            <button type="button" className="relay-leave-link" onClick={onLeave}>Leave Room</button>
          </div>

      <aside className="relay-lobby-sidebar">
        <section className="relay-summary-card">
          <h2><Info size={18} /> Room Summary</h2>
          <div><span>Challenge</span><strong>Relay</strong></div>
          <div><span>Mode</span><strong>{modeLabel}</strong></div>
          <div><span>Team size</span><strong>{room.max} players</strong></div>
          <div><span>Selection</span><strong>15 seconds</strong></div>
          <div><span>Source access</span><strong>Private</strong></div>
        </section>
      </aside>
    </div>
  </section>;
}
