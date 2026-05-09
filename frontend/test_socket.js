import { io } from "socket.io-client";

const socket = io("http://localhost:5000");

socket.on("connect", () => {
  console.log("Connected to server:", socket.id);
  // Join the room from the screenshot
  socket.emit("room:join", {
    roomId: "CF-KOG1",
    username: "TestBot",
    inviteCode: "test",
    sessionId: "test-session"
  });
});

socket.on("room:state", (state) => {
  console.log("Joined room:", state.id);
});

socket.on("typing", (data) => {
  console.log("Received typing event:", data);
});

socket.on("cursor:update", (data) => {
  console.log("Received cursor update:", data);
});

socket.on("file:update", (data) => {
  console.log("Received file update:", data.fileName);
});

setTimeout(() => {
  console.log("Test finished.");
  process.exit(0);
}, 15000);
