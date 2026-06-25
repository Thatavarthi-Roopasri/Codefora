import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { getHostToken, getInviteCode, getUsername, saveHostToken, saveInviteCode } from "../lib/navigation";
import { buildPreview } from "../lib/preview";
import { socket } from "../lib/socket";
import { trackEvent } from "../lib/analytics";

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
  const [isSubmittingCode, setIsSubmittingCode] = useState(false);
  const [joinError, setJoinError] = useState(null);
  const [typing, setTyping] = useState("");
  const [typingCursors, setTypingCursors] = useState([]);
  const [suggestion, setSuggestion] = useState("Ask for an explanation, fix, or improvement. Suggestions require Accept or Decline.");
  const [aiThinking, setAiThinking] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [notes, setNotes] = useState({ text: "", draws: [] });
  const [timer, setTimer] = useState({ endTime: null, duration: 25 * 60, isRunning: false });
  const [history, setHistory] = useState([]);
  const remoteUpdate = useRef(false);
  const runRequestId = useRef(0);
  const expectedActiveNameRef = useRef(null);
  const typingTimer = useRef(null);
  const localStream = useRef(null);
  const peers = useRef(new Map());
  const audioHost = useRef(null);
  const audioContextRef = useRef(null);
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
    ? { socketId: socket.id || "local-host", name: username, role: "Host", mic: false, speaking: false, color: "var(--primary-color)" }
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
  const canUseAi = Boolean(room) && room?.allowAi !== false;
  const [previewTarget, setPreviewTarget] = useState(null);
  const showPreview = files.some((file) => file.name.endsWith(".html"));
  const previewDoc = useMemo(() => buildPreview(files, previewTarget), [files, previewTarget]);

  useEffect(() => {
    canSpeakRef.current = canSpeak;
    if (micOn && localStream.current) {
      users.filter((user) => user.socketId !== socket.id).forEach((user) => {
        // Prevent massive glare storms by only creating initiator peers if we haven't already
        const peer = peers.current.get(user.socketId);
        if (!peer) {
          createPeer(user.socketId, true);
        } else {
          // If the peer exists but doesn't have our tracks yet, add them and renegotiate
          const existingSenders = peer.getSenders();
          const missingTracks = localStream.current.getTracks().some(track => !existingSenders.some(s => s.track === track));
          if (missingTracks) {
            createPeer(user.socketId, true);
          }
        }
      });
    }
  }, [canSpeak, micOn, users]);

  useEffect(() => {
    // If user is demoted to Viewer while mic is on, force it off
    if (!canSpeak && micOn) {
      if (localStream.current) {
        localStream.current.getAudioTracks().forEach((track) => {
          track.enabled = false;
        });
      }
      setMicOn(false);
      sessionStorage.setItem("codefora_mic_on", "false");
      socket.emit("mic:update", { roomId: activeRoomId, mic: false, speaking: false });
    }
  }, [canSpeak, micOn, activeRoomId]);

  useEffect(() => {
    // Auto-restore mic state on reload if it was previously on
    if (canSpeak && !micOn && !localStream.current && sessionStorage.getItem("codefora_mic_on") === "true") {
      toggleMic();
    }
  }, [canSpeak, micOn]);

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
      socket.on("notes:update", (updatedNotes) => {
        setNotes((prev) => {
          if (!updatedNotes) return prev;
          const text = typeof updatedNotes === "string" ? updatedNotes : updatedNotes.text ?? prev.text;
          const draws = updatedNotes.draws ?? prev.draws ?? [];
          return { text, draws };
        });
      });
      socket.on("timer:sync", (newTimer) => setTimer(newTimer));
      socket.on("history:update", (newHistory) => setHistory(newHistory));
      socket.on("notes:draw", (draw) => {
        setNotes((prev) => {
          const draws = prev.draws || [];
          if (draw === "clear") return { ...prev, draws: [] };
          return { ...prev, draws: [...draws, draw].slice(-2000) };
        });
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

      const joinData = {
        roomId: targetRoomId,
        username,
        inviteCode: targetInviteCode,
        hostToken: getHostToken(targetRoomId),
        userId: activeUserId,
        sessionId,
        profile: userProfile,
        emotionId: userProfile?.emotionId || null
      };

      const onConnect = () => {
        console.log(`[Socket] Connected. Joining room ${targetRoomId} as ${username} (Session: ${sessionId})`);
        socket.emit("room:join", joinData);
      };

      socket.on("connect", onConnect);
      if (socket.connected) onConnect();
    };


    bootstrap();

    return () => {
      cancelled = true;
      stopMic();
      socket.off("connect");
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
      socket.off("notes:update");
      socket.off("timer:sync");
      socket.off("history:update");
    };
  }, [roomId, activeUsername, activeUserId]);

  function handleRoomState(snapshot) {
    setJoinError(null); // Clear error on successful state receive
    if (!room) {
      trackEvent("room_join", { room_id: snapshot.id, visibility: snapshot.visibility });
    }
    setRoom(snapshot);
    handleFilesUpdate(snapshot.files);
    setMessages(snapshot.messages || []);
    setUsers(snapshot.usersList || []);
    setNotes(snapshot.notes || { text: "", draws: [] });
    setTimer(snapshot.timer || { endTime: null, duration: 25 * 60, isRunning: false });
    setHistory(snapshot.history || []);
    setTypingCursors([]);
  }

  function handleFilesUpdate(nextFiles) {
    setFiles(nextFiles);
    
    // Evaluate target outside state updater to avoid React StrictMode double-invocation bugs
    const expected = expectedActiveNameRef.current;
    if (expected && nextFiles.some((f) => f.name === expected)) {
      setActiveName(expected);
      expectedActiveNameRef.current = null;
    } else {
      setActiveName((current) => nextFiles.some((file) => file.name === current) ? current : nextFiles[0]?.name || "");
    }
    
    setRunFile((current) => nextFiles.some((file) => file.name === current) ? current : nextFiles.find((file) => file.name.endsWith(".js"))?.name || nextFiles[0]?.name || "");
  }

  function handleRemoteFileUpdate({ fileName, code }) {
    if (activeFile?.name === fileName) return; // Yjs is already handling this active file
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

  function updateFileCode(fileName, code) {
    if (!fileName || !canEdit) return;
    setFiles((items) => items.map((file) => file.name === fileName ? { ...file, code } : file));
    socket.emit("file:update", { roomId: activeRoomId, fileName, code });
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
    if (skipConfirm === true || window.confirm("Are you sure you want to end this lab for everyone? This will permanently delete the room.")) {
      socket.emit("room:end", { roomId: activeRoomId });
    }
  }

  function updateRoomSettings({ max, visibility, allowAi, allowCopyPaste }) {
    if (!me || me.role !== "Host") return;
    socket.emit("room:settings", { roomId: activeRoomId, max, visibility, allowAi, allowCopyPaste });
  }

  function setProblem(problemId) {
    const isHost = Boolean(me && (me.role === "Host" || (me.userId && room?.ownerUserId === me.userId)));
    if (!isHost) {
      alert("You don't have host permission.");
      return;
    }
    console.log("Emitting room:set_problem", { roomId: activeRoomId, problemId });
    socket.emit("room:set_problem", { roomId: activeRoomId, problemId });
  }

  function createFile(fileName, language, code) {
    if (!fileName.trim() || !canEdit) return;
    socket.emit("file:create", { roomId: activeRoomId, fileName, language, code });
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
    const file = activeFile;
    if (!file) return;
    const requestId = runRequestId.current + 1;
    runRequestId.current = requestId;
    const language = normalizeCompilerLanguage(file.language || file.name);
    setIsRunningCode(true);
    setCompilerStatus("running");
    setOutput("Running...");
    trackEvent("code_run", { room_id: activeRoomId, language });
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

  function changeFileLanguage(oldFileName, newLanguage, code) {
    const extensions = {
      javascript: ".js",
      typescript: ".ts",
      python: ".py",
      java: ".java",
      c: ".c",
      cpp: ".cpp",
      csharp: ".cs",
      go: ".go",
      rust: ".rs",
      php: ".php",
      ruby: ".rb",
      swift: ".swift",
      html: ".html",
      css: ".css",
      sql: ".sql"
    };
    const ext = extensions[newLanguage] || ".js";
    const baseName = oldFileName.includes(".") ? oldFileName.substring(0, oldFileName.lastIndexOf(".")) : oldFileName;
    const newFileName = `${baseName}${ext}`;

    expectedActiveNameRef.current = newFileName;
    socket.emit("file:rename", { roomId: activeRoomId, oldFileName, newFileName, language: newLanguage, code });
  }

  async function submitCode(problem) {
    if (!problem || !activeFile || !canEdit) return false;
    const testCases = problem.tests || [];
    if (testCases.length === 0) {
      setOutput("No test cases found for this problem.");
      return false;
    }

    const requestId = runRequestId.current + 1;
    runRequestId.current = requestId;
    const language = normalizeCompilerLanguage(activeFile.language || activeFile.name);
    
    setIsSubmittingCode(true);
    setCompilerStatus("running");
    setOutput("Submitting against all sample test cases...");
    pushHistory();
    trackEvent("submission", { room_id: activeRoomId, problem_id: problem.id, language });

    try {
      const results = [];
      for (let i = 0; i < testCases.length; i++) {
        const testCase = testCases[i];
        if (runRequestId.current !== requestId) return false;
        
        setOutput(`Running test case ${i + 1}/${testCases.length}...`);
        
        const result = await api.runCode({
          language,
          version: undefined,
          code: activeFile.code,
          input: testCase.input
        });

        const actual = normalizeOutput(result.stdout || result.executionOutput || result.output);
        const expected = normalizeOutput(testCase.output);
        
        results.push({
          input: testCase.input,
          expected,
          actual,
          passed: actual === expected,
          raw: result
        });

        // Break early if one fails? The original code shows all or stops at first failure?
        // Original ProblemsPage stops and shows the first failure.
        if (actual !== expected) break;
      }

      if (runRequestId.current !== requestId) return false;

      const firstFailed = results.find((result) => !result.passed);
      const passedCount = results.filter((r) => r.passed).length;
      const totalCount = testCases.length;
      
      const nextStatus = firstFailed ? "error" : "finished";
      setCompilerStatus(nextStatus);

      if (!firstFailed) {
        setOutput("Program is correct. All sample test cases passed. ✅");
        if (activeUserId) {
          api.solveProblem(activeUserId, problem.id).catch(console.error);
        }
        return true;
      } else {
        const failedIndex = results.indexOf(firstFailed);
        
        setOutput(`Wrong Answer! ${passedCount}/${totalCount} test cases passed.\nFailed on test case ${failedIndex + 1}:\nInput: ${firstFailed.input}\nExpected: ${firstFailed.expected}\nActual: ${firstFailed.actual || "(empty)"}`);return false;
      }
    } catch (error) {
      if (runRequestId.current !== requestId) return false;
      setCompilerStatus("error");
      setOutput(error.message || "Submission failed.");
      return false;
    } finally {
      if (runRequestId.current === requestId) {
        setIsSubmittingCode(false);
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
      // Mute the mic instead of destroying connections
      if (localStream.current) {
        localStream.current.getAudioTracks().forEach((track) => {
          track.enabled = false;
        });
      }
      setMicOn(false);
      sessionStorage.setItem("codefora_mic_on", "false");
      socket.emit("mic:update", { roomId: activeRoomId, mic: false, speaking: false });
      return;
    }

    try {
      if (!localStream.current) {
        // First time initialization
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }, 
          video: false 
        });
        localStream.current = stream;

        // Add voice activity detection
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        audioContextRef.current = audioContext;
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        let isSpeaking = false;
        let speakingTimeout = null;

        const checkSpeaking = () => {
          if (!localStream.current) {
            audioContext.close();
            if (speakingTimeout) clearTimeout(speakingTimeout);
            return;
          }
          
          // Skip analysis if mic is muted
          if (!localStream.current.getAudioTracks().some(t => t.enabled)) {
            if (isSpeaking) {
              isSpeaking = false;
              socket.emit("mic:update", { roomId: activeRoomId, mic: false, speaking: false });
            }
            requestAnimationFrame(checkSpeaking);
            return;
          }

          analyser.getByteFrequencyData(dataArray);
          const volume = dataArray.reduce((a, b) => a + b) / dataArray.length;
          const currentlySpeaking = volume > 20;

          if (currentlySpeaking && !isSpeaking) {
            isSpeaking = true;
            if (speakingTimeout) clearTimeout(speakingTimeout);
            speakingTimeout = null;
            socket.emit("mic:update", { roomId: activeRoomId, mic: true, speaking: true });
          } else if (!currentlySpeaking && isSpeaking) {
            if (!speakingTimeout) {
              speakingTimeout = setTimeout(() => {
                isSpeaking = false;
                socket.emit("mic:update", { roomId: activeRoomId, mic: true, speaking: false });
                speakingTimeout = null;
              }, 1000); // 1 second hysteresis to prevent rapid toggling
            }
          } else if (currentlySpeaking && isSpeaking) {
            if (speakingTimeout) {
              clearTimeout(speakingTimeout);
              speakingTimeout = null;
            }
          }

          requestAnimationFrame(checkSpeaking);
        };

        checkSpeaking();
      } else {
        // Just unmute
        localStream.current.getAudioTracks().forEach((track) => {
          track.enabled = true;
        });
      }

      setMicOn(true);
      sessionStorage.setItem("codefora_mic_on", "true");
      socket.emit("mic:update", { roomId: activeRoomId, mic: true, speaking: false });

    } catch (error) {
      setOutput(`Microphone permission failed: ${error.message}`);
    }
  }

  function stopMic() {
    if (localStream.current) {
      localStream.current.getTracks().forEach((track) => track.stop());
      localStream.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
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
    let peer;
    let isNew = false;

    if (peers.current.has(targetId)) {
      peer = peers.current.get(targetId);
      if (peer.connectionState === "failed" || peer.connectionState === "closed") {
        peers.current.delete(targetId);
        peer = null;
      }
    }

    if (!peer) {
      isNew = true;
      peer = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
          { urls: "stun:stun2.l.google.com:19302" },
          { urls: "turn:openrelay.metered.ca:80", username: "openrelayproject", credential: "openrelayproject" },
          { urls: "turn:openrelay.metered.ca:443", username: "openrelayproject", credential: "openrelayproject" }
        ]
      });

      peers.current.set(targetId, peer);

      peer.onconnectionstatechange = () => {
        console.log(`[WebRTC] Connection to ${targetId}: ${peer.connectionState}`);
        if (peer.connectionState === "failed") {
          peers.current.delete(targetId);
          if (micOn && localStream.current) {
            setTimeout(() => createPeer(targetId, true), 1000);
          }
        }
      };

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
        console.log(`[WebRTC] Receiving stream from ${targetId}`);
        const existingAudio = document.getElementById(`remote-audio-${targetId}`);
        if (existingAudio) existingAudio.remove();

        const audio = document.createElement("audio");
        audio.autoplay = true;
        audio.srcObject = event.streams && event.streams[0] ? event.streams[0] : new MediaStream([event.track]);
        audio.id = `remote-audio-${targetId}`;
        audio.muted = false;
        audioHost.current?.appendChild(audio);

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            const playOnInteraction = () => {
              audio.play().catch(() => {});
              document.removeEventListener("click", playOnInteraction);
            };
            document.addEventListener("click", playOnInteraction);
          });
        }
      };
    }

    // Add local tracks if they are missing (crucial for when a user turns on mic LATER)
    let tracksAdded = false;
    if (localStream.current) {
      const existingSenders = peer.getSenders();
      localStream.current.getTracks().forEach((track) => {
        if (!existingSenders.some(sender => sender.track === track)) {
          peer.addTrack(track, localStream.current);
          tracksAdded = true;
        }
      });
    }

    // Renegotiate if we are the initiator OR if we just added new audio tracks
    if (initiator || tracksAdded) {
      try {
        const offer = await peer.createOffer({ offerToReceiveAudio: true });
        await peer.setLocalDescription(offer);
        socket.emit("voice:signal", {
          roomId: activeRoomId,
          target: targetId,
          signal: { description: peer.localDescription }
        });
      } catch (e) {
        console.error(`[WebRTC] Offer failed for ${targetId}:`, e);
      }
    }

    return peer;
  }

  async function handleVoiceSignal({ from, signal }) {
    try {
      const peer = await createPeer(from, false);

      if (signal.description) {
        const collision = signal.description.type === "offer" && peer.signalingState !== "stable";
        if (collision) {
          const polite = socket.id > from;
          if (!polite) {
            console.warn("[WebRTC] Impolite peer ignoring collision offer");
            return;
          }
          console.warn("[WebRTC] Polite peer rolling back to resolve collision");
          await peer.setLocalDescription({ type: "rollback" });
        }

        await peer.setRemoteDescription(new RTCSessionDescription(signal.description));
        
        if (peer.pendingCandidates && peer.pendingCandidates.length > 0) {
          for (const candidate of peer.pendingCandidates) {
            await peer.addIceCandidate(candidate).catch(e => console.warn("Queued candidate error", e));
          }
          peer.pendingCandidates = [];
        }

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
        const iceCandidate = new RTCIceCandidate(signal.candidate);
        if (peer.remoteDescription) {
          await peer.addIceCandidate(iceCandidate).catch(e => console.warn("Candidate error", e));
        } else {
          if (!peer.pendingCandidates) peer.pendingCandidates = [];
          peer.pendingCandidates.push(iceCandidate);
        }
      }
    } catch (e) {
      console.warn("[WebRTC] Signal handling error:", e);
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

  function updateNotes(text) {
    setNotes(prev => ({ ...prev, text }));
    socket.emit("notes:update", { roomId: activeRoomId, text });
  }

  function drawNote(draw) {
    setNotes((prev) => {
      const draws = prev.draws || [];
      if (draw === "clear") return { ...prev, draws: [] };
      return { ...prev, draws: [...draws, draw].slice(-2000) };
    });
    socket.emit("notes:draw", { roomId: activeRoomId, draw });
  }

  function startTimer(duration = 25 * 60, mode = timer.mode) {
    socket.emit("timer:start", { roomId: activeRoomId, duration, mode });
  }

  function stopTimer() {
    socket.emit("timer:stop", { roomId: activeRoomId });
  }

  function setTimerMode(mode) {
    socket.emit("timer:mode", { roomId: activeRoomId, mode });
  }

  function pushHistory() {
    socket.emit("history:push", { roomId: activeRoomId });
  }

  async function saveWork(name, customFiles = null) {
    if (!activeUserId) return { success: false, error: "Please log in to save your work." };
    try {
      const response = await api.saveWork(activeUserId, {
        name,
        files: customFiles || files,
        type: room?.problemId ? "problem" : "lab",
        originRoomId: activeRoomId
      });
      return { success: true, work: response.work };
    } catch (error) {
      console.error("Save work failed", error);
      return { success: false, error: error.message };
    }
  }

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
    notes,
    timer,
    history,
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
    compiler: { compilerStatus, isRunningCode, isSubmittingCode },
    actions: {
      updateCode, updateFileCode, sendChat, sendSticker, endRoom, createFile, deleteActiveFile,
      updateRole, kickUser, runCode, submitCode, askAi, toggleMic, forceJoin, clearOutput,
      updateNotes, drawNote, startTimer, stopTimer, setTimerMode, pushHistory, saveWork, changeFileLanguage,
      updateRoomSettings, setProblem,
      setPreviewTarget,
      setExpectedActiveName: (name) => {
        expectedActiveNameRef.current = name;
      }
    }
  };
}

function normalizeOutput(value) {
  return String(value || "").trim().replace(/\r/g, "").split(/\n+/).map((line) => line.trim().replace(/\s+/g, " ")).join("\n");
}

function normalizeInvite(inviteCode) {
  return String(inviteCode || "").replace(/\s+/g, "").trim().toUpperCase();
}

function normalizeCompilerLanguage(languageOrName) {
  let value = String(languageOrName || "").trim().toLowerCase();
  if (!value) return "javascript";
  if (value.includes(".")) {
    const ext = value.split(".").pop();
    value = ext;
  }
  const aliases = {
    js: "javascript",
    ts: "typescript",
    py: "python",
    rs: "rust",
    "c++": "cpp",
    cplusplus: "cpp",
    node: "javascript",
    java: "java",
    go: "go",
    c: "c"
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
