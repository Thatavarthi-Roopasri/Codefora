import "dotenv/config";
import http from "http";
import { Server } from "socket.io";
import { createApp } from "./app.js";
import { allowedOrigins } from "./config/cors.js";
import { defaultFiles } from "./data/defaultFiles.js";
import { RoomRepository } from "./repositories/roomRepository.js";
import { RoomService } from "./services/roomService.js";
import { registerCollaborationSocket } from "./sockets/collaborationSocket.js";
import { initializeEmotionsInFirestore } from "./services/emotionService.js";

const port = Number(process.env.PORT || 5000);

const roomRepository = new RoomRepository([]);
await roomRepository.load();
const roomService = new RoomService(roomRepository);
const app = createApp({ roomRepository, roomService });
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: allowedOrigins(), methods: ["GET", "POST"] } });

registerCollaborationSocket(io, { roomRepository, roomService });

// Initialize emotions in Firestore
await initializeEmotionsInFirestore();

server.listen(port, () => {
  console.log(`Codefora API listening on http://localhost:${port}`);
  
  // Run zombie room cleanup every minute
  setInterval(() => {
    const deleted = roomRepository.cleanupZombieRooms();
    if (deleted && deleted.length > 0) {
      io.emit("rooms:update", roomRepository.allPublicSummaries((room) => roomService.publicRoom(room)));
    }
  }, 60 * 1000);
});
