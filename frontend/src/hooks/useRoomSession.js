import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { getHostToken, getInviteCode, getUsername, saveHostToken, saveInviteCode } from "../lib/navigation";
import { buildPreview } from "../lib/preview";
import { socket } from "../lib/socket";

export function useRoomSession(roomId, usernameOverride = "", userIdOverride = "", bypassBlockerRef = null) {
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [resolvedRoomId, setResolvedRoomId] = useState(roomId);
  const [files, setFiles] = useState([]);
  const [activeName, setActiveName] = useState("");
  const [runFile, setRunFile] = useState("");
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [aiMessages, setAiMessages] = useState([]);
  const [output, setOutput] = useState("Ready.");
  const [compilerStatus, setCompilerStatus] = useState("ready");
  const [isRunningCode, setIsRunningCode] = useState(false);
  const [joinError, setJoinError] = useState(null);
  const [typing, setTyping] = useState("");
  const [typingCursors, setTypingCursors] = useState([]);
  const [suggestion, setSuggestion] = useState("Ask for an explanation, fix, or improvement. Suggestions require Accept or Decline.");
  const [aiThinking, setAiThinking] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const remoteUpdate = useRef(false);
  const runRequestId = useRef(0);
  const typingTimer = useRef(null);
  const localStream = useRef(null);
  const peers = useRef(new Map());
  const audioHost = useRef(null);
  const canSpeakRef = useRef(false);
  const typingTimers = useRef(new Map());
  const activeRoomId = resolvedRoomId || roomId;
  const activeUsername = (usernameOverride || getUsername() || "").trim();
  const activeUserId = (userIdOverride || "").trim() || null;

  const username = activeUsername || "Guest";
  const activeFile = files.find((file) => file.name === activeName) || files[0];
  const hasHost = users.some((user) => user.role === "Host");
  const localHostToken = getHostToken(activeRoomId);
  const localFallbackUser = room && !hasHost && localHostToken && room.hostName === username
    ? { socketId: socket.id || "local-host", name: username, role: "Host", mic: false, speaking: false, color: "#FF7A18" }
    : null;
  const visibleUsers = useMemo(() => {
    const list = localFallbackUser ? [...users, localFallbackUser] : users;
    return list.map(u => {
      // Find if this specific user (by unique socketId) is typing
      const activeCursor = u.socketId ? typingCursors.find(c => c.cursorId === u.socketId) : null;
      return {
        ...u,
        isTyping: activeCursor?.isTyping || false,
        currentFile: activeCursor?.fileName ? `${activeCursor.fileName}${activeCursor.position?.lineNumber ? ` : ${activeCursor.position.lineNumber}` : ""}` : null
      };
    });
  }, [users, localFallbackUser, typingCursors]);
  const me = users.find((user) => user.socketId === socket.id) || localFallbackUser;
  const isHost = me?.role === "Host";
  const canEdit = me?.role !== "Viewer";
  const canSpeak = Boolean(me && me.role !== "Viewer");
  const canChat = Boolean(me);
  const canUseAi = Boolean(room);
  const showPreview = files.some((file) => file.name.endsWith(".html"));
  const previewDoc = useMemo(() => buildPreview(files), [files]);

  useEffect(() => {
    canSpeakRef.current = canSpeak;
    if (micOn && localStream.current) {
      users.filter((user) => user.socketId !== socket.id && user.role !== "Viewer").forEach((user) => createPeer(user.socketId, true));
    }
  }, [canSpeak, micOn, users]);

  useEffect(() => {
    const activeTyping = typingCursors[0];
    setTyping(activeTyping ? `${activeTyping.user} is typing in ${activeTyping.fileName}...` : "");
  }, [typingCursors]);

  useEffect(() => {
    if (!activeUsername) return;

    let cancelled = false;
    setJoinError(null);
    setRoom(null);
    const initialRoomId = decodeURIComponent(roomId || "").trim();
    setResolvedRoomId(initialRoomId);

    const handleJoinFailed = (payload) => {
      setJoinError(payload);
      if (payload && payload.reason) setOutput(`Join failed: ${payload.reason}`);
    };

    const handleChatMessage = (message) => {
      setMessages((items) => {
        if (message.clientId) {
          const optimisticIndex = items.findIndex((item) => item.clientId === message.clientId);
          if (optimisticIndex !== -1) {
            const nextItems = [...items];
            nextItems[optimisticIndex] = { ...nextItems[optimisticIndex], ...message, optimistic: false };
            return nextItems;
          }
        }
        if (items.some(m => m.id === message.id)) return items;
        return [...items, message];
      });
    };

    const handleTyping = ({ user, userId, socketId, color, fileName, position, isTyping }) => {
      const cursorId = socketId || userId || user || `typing-${Math.random().toString(36).slice(2, 6)}`;
      if (!position) return;

      setTypingCursors((items) => {
        const existing = items.find((item) => item.cursorId === cursorId);
        // If we get a "viewing" update (isTyping=false) but the user was JUST typing (within 1s),
        // keep them as "typing" so the status doesn't flicker between Editing and Viewing.
        const effectiveIsTyping = isTyping || (existing?.isTyping && (Date.now() - existing.updatedAt < 1000));
        
        const nextItems = items.filter((item) => item.cursorId !== cursorId);
        nextItems.unshift({
          cursorId,
          user,
          color,
          fileName,
          position,
          isTyping: effectiveIsTyping,
          updatedAt: Date.now()
        });
        return nextItems;
      });

      const previousTimer = typingTimers.current.get(cursorId);
      if (previousTimer) clearTimeout(previousTimer);

      const nextTimer = setTimeout(() => {
        setTypingCursors((items) => items.filter((item) => item.cursorId !== cursorId));
        typingTimers.current.delete(cursorId);
      }, 2000);

      typingTimers.current.set(cursorId, nextTimer);
    };

    const bootstrap = async () => {
      let targetRoomId = initialRoomId;
      let targetInviteCode = normalizeInvite(getInviteCode(initialRoomId));
      let hostToken = getHostToken(initialRoomId);

      try {
        const snapshot = await api.getRoom(initialRoomId, targetInviteCode, hostToken);
        if (cancelled) return;
        targetRoomId = snapshot.id;
        setResolvedRoomId(snapshot.id);
        handleRoomState(snapshot);
      } catch {
        try {
          const snapshot = await api.getRoomByInviteCode(initialRoomId);
          if (cancelled) return;
          targetRoomId = snapshot.id;
          targetInviteCode = normalizeInvite(initialRoomId);
          setResolvedRoomId(snapshot.id);
          saveInviteCode(snapshot.id, targetInviteCode);
          handleRoomState(snapshot);
        } catch (error) {
          if (!cancelled) {
            setJoinError({ reason: "not_found", roomId: initialRoomId });
            setOutput("Could not join the room.");
          }
          return;
        }
      }

      if (cancelled) return;

      socket.connect();
      socket.on("room:join:failed", handleJoinFailed);
      socket.on("room:state", handleRoomState);
      socket.on("presence:update", setUsers);
      socket.on("chat:message", handleChatMessage);
      socket.on("typing", handleTyping);
      socket.on("cursor:update", handleTyping);
      socket.on("file:update", handleRemoteFileUpdate);
      socket.on("files:update", handleFilesUpdate);
      socket.on("host:token", ({ roomId: tokenRoomId, hostToken }) => {
        if (tokenRoomId && hostToken) saveHostToken(tokenRoomId, hostToken);
      });
      socket.on("voice:signal", handleVoiceSignal);
      socket.on("room:ended", () => {
        if (bypassBlockerRef) bypassBlockerRef.current = true;
        navigate("/rooms?message=Room ended by host");
      });
      socket.on("room:kicked", () => {
        if (bypassBlockerRef) bypassBlockerRef.current = true;
        navigate("/rooms?message=You have been removed from the room");
      });
      socket.on("room:error", (err) => {
        console.error("Room Error:", err);
        setOutput(err);
      });

      // Use sessionStorage to track this specific tab's session
      // This persists across reloads but is unique per tab.
      let sessionId = sessionStorage.getItem(`codefora_session_${targetRoomId}`);
      if (!sessionId) {
        sessionId = `sess-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        sessionStorage.setItem(`codefora_session_${targetRoomId}`, sessionId);
      }

      // Fetch full profile if authenticated
      let userProfile = null;
      if (activeUserId) {
        try {
          userProfile = await api.getProfile(activeUserId);
        } catch (e) {
          console.warn("Failed to fetch profile for user", e);
        }
      }

      console.log(`Joining room ${targetRoomId} as ${username} (Session: ${sessionId})`);
      socket.emit("room:join", {
        roomId: targetRoomId,
        username,
        inviteCode: targetInviteCode,
        hostToken: getHostToken(targetRoomId),
        userId: activeUserId,
        sessionId,
        profile: userProfile,
        emotionId: userProfile?.emotionId || null
      });
    };


    bootstrap();

    return () => {
      cancelled = true;
      stopMic();
      socket.disconnect();
      socket.off("room:join:failed", handleJoinFailed);
      socket.off("room:state", handleRoomState);
      socket.off("presence:update", setUsers);
      socket.off("chat:message", handleChatMessage);
      socket.off("typing", handleTyping);
      socket.off("cursor:update", handleTyping);
      socket.off("file:update", handleRemoteFileUpdate);
      socket.off("files:update", handleFilesUpdate);
      socket.off("host:token");
      socket.off("voice:signal", handleVoiceSignal);
      socket.off("room:error");
      socket.off("room:ended");
      socket.off("room:kicked");
    };
  }, [roomId, activeUsername, activeUserId]);

  function handleRoomState(snapshot) {
    setJoinError(null); // Clear error on successful state receive
    setRoom(snapshot);
    handleFilesUpdate(snapshot.files);
    setMessages(snapshot.messages || []);
    setUsers(snapshot.usersList || []);
    setTypingCursors([]);
  }

  function handleFilesUpdate(nextFiles) {
    setFiles(nextFiles);
    setActiveName((current) => nextFiles.some((file) => file.name === current) ? current : nextFiles[0]?.name || "");
    setRunFile((current) => nextFiles.some((file) => file.name === current) ? current : nextFiles.find((file) => file.name.endsWith(".js"))?.name || nextFiles[0]?.name || "");
  }

  function handleRemoteFileUpdate({ fileName, code }) {
    remoteUpdate.current = true;
    setFiles((items) => items.map((file) => file.name === fileName ? { ...file, code } : file));
    setTimeout(() => {
      remoteUpdate.current = false;
    }, 50);
  }

  function updateCode(value) {
    if (!activeFile || remoteUpdate.current || !canEdit) return;
    const code = value ?? "";
    setFiles((items) => items.map((file) => file.name === activeFile.name ? { ...file, code } : file));
    socket.emit("file:update", { roomId: activeRoomId, fileName: activeFile.name, code });
  }

  function sendChat(text) {
    if (!text.trim() || !canChat) return;
    const clientId = `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const optimisticMessage = {
      id: clientId,
      clientId,
      user: me?.name || username,
      text: text.trim(),
      createdAt: Date.now(),
      optimistic: true
    };
    setMessages((items) => [...items, optimisticMessage]);
    socket.emit("chat:send", { roomId: activeRoomId, text, clientId });
  }

  function sendSticker(stickerId) {
    const cleanStickerId = String(stickerId || "").trim();
    if (!cleanStickerId || !canChat) return;
    const clientId = `sticker-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const optimisticMessage = {
      id: clientId,
      clientId,
      user: me?.name || username,
      text: "",
      stickerId: cleanStickerId,
      type: "sticker",
      createdAt: Date.now(),
      optimistic: true
    };
    setMessages((items) => [...items, optimisticMessage]);
    socket.emit("chat:send", { roomId: activeRoomId, text: "", stickerId: cleanStickerId, clientId });
  }

  function endRoom(skipConfirm = false) {
    if (!me || me.role !== "Host") return;
    if (skipConfirm || window.confirm("Are you sure you want to end this lab for everyone? This will permanently delete the room.")) {
      socket.emit("room:end", { roomId: activeRoomId });
    }
  }

  function createFile(fileName, language) {
    if (!fileName.trim() || !canEdit) return;
    socket.emit("file:create", { roomId: activeRoomId, fileName, language });
  }

  function deleteActiveFile(fileName = activeFile?.name) {
    if (!fileName || !canEdit || files.length <= 1) return;
    socket.emit("file:delete", { roomId: activeRoomId, fileName });
  }

  function updateRole(targetSocketId, role) {
    socket.emit("role:update", { roomId: activeRoomId, targetSocketId, role });
  }

  function kickUser(targetSocketId) {
    socket.emit("room:kick", { roomId: activeRoomId, targetSocketId, hostToken: getHostToken(activeRoomId) });
  }

  async function runCode(stdin) {
    const file = files.find((item) => item.name === runFile);
    if (!file) return;
    const requestId = runRequestId.current + 1;
    runRequestId.current = requestId;
    const language = normalizeCompilerLanguage(file.language || file.name);
    setIsRunningCode(true);
    setCompilerStatus("running");
    setOutput("Running...");
    try {
      const result = await api.runCode({
        language,
        version: undefined,
        code: file.code,
        input: stdin
      });
      const nextStatus = result.status === "compilation_error"
        ? "compiling"
        : result.status === "runtime_error"
          ? "error"
          : "finished";
      if (runRequestId.current !== requestId) return;
      setCompilerStatus(nextStatus);
      setOutput(formatCompilerOutput(result, nextStatus));
    } catch (error) {
      if (runRequestId.current !== requestId) return;
      setCompilerStatus("error");
      setOutput(error.message);
    } finally {
      if (runRequestId.current === requestId) {
        setIsRunningCode(false);
      }
    }
  }

  async function askAi(prompt) {
    if (!prompt.trim() || !canUseAi) return;
    const question = prompt.trim();
    const questionMessage = { id: `ai-q-${Date.now()}`, role: "user", text: question, createdAt: Date.now() };
    setAiMessages((items) => [...items, questionMessage]);
    setAiThinking(true);
    setSuggestion("Thinking...");
    try {
      const result = await api.askAi({
        prompt: question,
        file: activeFile?.name || room?.name || "active room",
        code: activeFile?.code || "",
        context: {
          room: room ? { id: room.id, name: room.name, hostName: room.hostName } : null,
          activeFile: activeFile ? {
            name: activeFile.name,
            language: activeFile.language,
            code: activeFile.code || ""
          } : null,
          runFile,
          files: files.map((file) => ({
            name: file.name,
            language: file.language,
            isActive: file.name === activeFile?.name,
            characters: String(file.code || "").length
          })),
          consoleOutput: output,
          compilerStatus,
          users: visibleUsers.map((user) => ({
            name: user.name,
            role: user.role,
            mic: Boolean(user.mic),
            speaking: Boolean(user.speaking)
          })),
          recentRoomChat: messages.slice(-8).map((message) => ({
            user: message.user,
            text: message.text
          })),
          recentAiChat: aiMessages.slice(-8).map((message) => ({
            role: message.role,
            text: message.text
          }))
        }
      });
      const answer = result.suggestion || result.error || "No suggestion returned.";
      setSuggestion(answer);
      setAiMessages((items) => [
        ...items,
        { id: `ai-a-${Date.now()}`, role: "assistant", text: answer, createdAt: Date.now(), mode: result.mode || "gemini" }
      ]);
    } catch (error) {
      setSuggestion(error.message);
      setAiMessages((items) => [
        ...items,
        { id: `ai-e-${Date.now()}`, role: "assistant", text: error.message, createdAt: Date.now(), mode: "error" }
      ]);
    } finally {
      setAiThinking(false);
    }
  }

  async function toggleMic() {
    if (!canSpeak) return;
    if (micOn) {
      stopMic();
      setMicOn(false);
      socket.emit("mic:update", { roomId: activeRoomId, mic: false, speaking: false });
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStream.current = stream;
      setMicOn(true);
      socket.emit("mic:update", { roomId: activeRoomId, mic: true, speaking: false });

      // Add voice activity detection
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let isSpeaking = false;

      const checkSpeaking = () => {
        if (!localStream.current) {
          audioContext.close();
          return;
        }
        analyser.getByteFrequencyData(dataArray);
        const volume = dataArray.reduce((a, b) => a + b) / dataArray.length;

        // Threshold for speaking (adjust as needed)
        const currentlySpeaking = volume > 20;

        if (currentlySpeaking !== isSpeaking) {
          isSpeaking = currentlySpeaking;
          socket.emit("mic:update", { roomId: activeRoomId, mic: true, speaking: isSpeaking });
        }

        requestAnimationFrame(checkSpeaking);
      };

      checkSpeaking();

      users.filter((user) => user.socketId !== socket.id && user.role !== "Viewer").forEach((user) => createPeer(user.socketId, true));
    } catch (error) {
      setOutput(`Microphone permission failed: ${error.message}`);
    }
  }

  function stopMic() {
    if (localStream.current) {
      localStream.current.getTracks().forEach((track) => track.stop());
      localStream.current = null;
    }
    peers.current.forEach((peer) => {
      try {
        peer.close();
      } catch (e) {
        console.warn("Peer close error", e);
      }
    });
    peers.current.clear();

    // Clear audio elements
    if (audioHost.current) {
      audioHost.current.innerHTML = "";
    }
  }

  async function createPeer(targetId, initiator) {
    if (peers.current.has(targetId)) return peers.current.get(targetId);

    const peer = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    });

    peers.current.set(targetId, peer);

    // Only add local tracks if we have a stream
    if (localStream.current) {
      localStream.current.getTracks().forEach((track) => {
        peer.addTrack(track, localStream.current);
      });
    }

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("voice:signal", {
          roomId: activeRoomId,
          target: targetId,
          signal: { candidate: event.candidate }
        });
      }
    };

    peer.ontrack = (event) => {
      // Create audio element for the remote stream
      const audio = document.createElement("audio");
      audio.autoplay = true;
      audio.srcObject = event.streams[0];
      // Ensure it's not muted (browsers might block autoplay if not careful)
      audio.muted = false;
      audioHost.current?.appendChild(audio);

      console.log(`Receiving audio from ${targetId}`);
    };

    if (initiator) {
      const offer = await peer.createOffer({
        offerToReceiveAudio: true
      });
      await peer.setLocalDescription(offer);
      socket.emit("voice:signal", {
        roomId: activeRoomId,
        target: targetId,
        signal: { description: peer.localDescription }
      });
    }

    return peer;
  }

  async function handleVoiceSignal({ from, signal }) {
    // We should be able to receive even if we aren't speaking
    if (!canSpeakRef.current) return;

    const peer = await createPeer(from, false);

    if (signal.description) {
      await peer.setRemoteDescription(signal.description);
      if (signal.description.type === "offer") {
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        socket.emit("voice:signal", {
          roomId: activeRoomId,
          target: from,
          signal: { description: peer.localDescription }
        });
      }
    }

    if (signal.candidate) {
      try {
        await peer.addIceCandidate(signal.candidate);
      } catch (e) {
        console.warn("Failed to add ice candidate", e);
      }
    }
  }

  function forceJoin() {
    setJoinError(null); // Optimistically clear error
    let targetInviteCode = normalizeInvite(getInviteCode(activeRoomId));
    socket.emit("room:join:force", {
      roomId: activeRoomId,
      username,
      inviteCode: targetInviteCode,
      hostToken: getHostToken(activeRoomId),
      userId: activeUserId
    });
  };

  const clearOutput = () => {
    runRequestId.current += 1;
    setCompilerStatus("ready");
    setIsRunningCode(false);
    setOutput("");
  };

  return {
    room,
    files,
    activeFile,
    activeName,
    setActiveName,
    runFile,
    setRunFile,
    users: visibleUsers,
    messages,
    aiMessages,
    output,
    typing,
    typingCursors,
    suggestion,
    aiThinking,
    micOn,
    audioHost,
    roomId: activeRoomId,
    joinError,
    permissions: { me, isHost, canEdit, canSpeak, canChat, canUseAi },
    preview: { showPreview, previewDoc },
    compiler: { compilerStatus, isRunningCode },
    actions: {
      updateCode, sendChat, sendSticker, endRoom, createFile, deleteActiveFile,
      updateRole, kickUser, runCode, askAi, toggleMic, forceJoin, clearOutput
    }
  };
}

function normalizeInvite(inviteCode) {
  return String(inviteCode || "").replace(/\s+/g, "").trim().toUpperCase();
}

function normalizeCompilerLanguage(languageOrName) {
  const value = String(languageOrName || "").trim().toLowerCase();
  if (!value) return "javascript";
  const aliases = {
    js: "javascript",
    ts: "typescript",
    py: "python",
    rs: "rust",
    "c++": "cpp",
    cplusplus: "cpp",
    node: "javascript"
  };
  return aliases[value] || value;
}

function formatCompilerOutput(result, status) {
  const lines = [];
  if (result.stdout) lines.push(result.stdout);
  if (result.compileErrors) lines.push(result.compileErrors);
  if (result.runtimeErrors) lines.push(result.runtimeErrors);
  if (result.stderr && result.stderr !== result.compileErrors && result.stderr !== result.runtimeErrors) lines.push(result.stderr);
  lines.push(`status: ${status}`);
  lines.push(`execution time: ${Number(result.executionTime || 0)}ms`);
  return lines.filter(Boolean).join("\n").trim();
}
