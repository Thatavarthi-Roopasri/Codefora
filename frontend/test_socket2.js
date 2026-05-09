import { io } from "socket.io-client";

const socket = io("http://localhost:5000");

socket.on("connect", () => {
  console.log("Connected to server:", socket.id);
  socket.emit("room:join", {
    roomId: "CF-KOG4",
    username: "TestBot",
    inviteCode: "test",
    sessionId: "test-session"
  });
});

socket.on("room:state", (state) => {
  console.log("Joined room:", state.id);
  
  // Emulate typing
  setInterval(() => {
    console.log("Emitting typing...");
    socket.emit("typing", {
      roomId: "CF-KOG4",
      fileName: "index.html",
      position: { lineNumber: 3, column: 15 }
    });
    socket.emit("cursor:update", {
      roomId: "CF-KOG4",
      fileName: "index.html",
      position: { lineNumber: 3, column: 15 }
    });
  }, 2000);
});

socket.on("typing", (data) => {
  console.log("Received typing:", data);
});
