import { io } from "socket.io-client";

const socket = io("http://localhost:5000");

socket.on("connect", () => {
  console.log("Connected to server. Joining CF-KOG4...");
  socket.emit("room:join", {
    roomId: "CF-KOG4",
    username: "ListenerBot",
    inviteCode: "test",
    sessionId: "listener-session"
  });
});

socket.on("room:state", (state) => {
  console.log("Joined room:", state.id);
  console.log("Waiting for user1 to type...");
});

socket.on("typing", (data) => {
  console.log("DETECTED TYPING EVENT:", data);
});

socket.on("cursor:update", (data) => {
  console.log("DETECTED CURSOR UPDATE:", data);
});

socket.on("file:update", (data) => {
  console.log("DETECTED FILE UPDATE:", data.fileName);
});
