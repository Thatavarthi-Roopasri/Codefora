import "dotenv/config";
import http from "http";
import { Server } from "socket.io";
import { WebSocketServer } from "ws";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { setupWSConnection, setPersistence } = require('./y-websocket-utils.cjs');
import { createApp } from "./app.js";
import { allowedOrigins } from "./config/cors.js";
import { defaultFiles } from "./data/defaultFiles.js";
import { RoomRepository } from "./repositories/roomRepository.js";
import { RoomService } from "./services/roomService.js";
import { registerCollaborationSocket } from "./sockets/collaborationSocket.js";
import { initializeEmotionsInFirestore } from "./services/emotionService.js";

import { createProfileController } from "./controllers/profileController.js";

const port = Number(process.env.PORT || 5000);

const roomRepository = new RoomRepository([]);
await roomRepository.load();
const roomService = new RoomService(roomRepository);
const profileController = createProfileController();
const broadcastRooms = () => io.emit("rooms:update", roomRepository.allPublicSummaries((room) => roomService.publicRoom(room)));

const app = createApp({ roomRepository, roomService, profileController, onRoomCreated: () => broadcastRooms() });
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: allowedOrigins(), methods: ["GET", "POST"] } });

// Bind Yjs persistence directly to the backend database
setPersistence({
  bindState: async (docName, ydoc) => {
    // docName: yjs/room-123-file-mainjs or room-123-file-mainjs
    const match = docName.match(/^(?:yjs\/)?room-(.+?)-file-(.+)$/);
    if (match) {
      const roomId = match[1];
      const fileNameStr = match[2];
      let room = await roomRepository.fetchById(roomId);
      if (!room) room = await roomRepository.fetchByInviteCode(roomId);
      if (room) {
        // Find matching file (case-insensitive and stripped of non-alphanumeric just in case)
        const file = room.files.find(f => f.name.replace(/[^a-zA-Z0-9-.]/g, '') === fileNameStr);
        if (file && file.code) {
          const type = ydoc.getText("monaco");
          if (type.toString() === "") {
            type.insert(0, file.code);
          }
        }
      }

      ydoc.on('update', async () => {
        const type = ydoc.getText("monaco");
        const code = type.toString();
        let room = await roomRepository.fetchById(roomId);
        if (!room) room = await roomRepository.fetchByInviteCode(roomId);
        if (room) {
          const file = room.files.find(f => f.name.replace(/[^a-zA-Z0-9-.]/g, '') === fileNameStr);
          if (file && file.code !== code) {
            file.code = code;
            roomRepository.save(room).catch(() => {});
          }
        }
      });
    }
  },
  writeState: async (docName, ydoc) => {}
});

// Attach Yjs WebSocket server
const wss = new WebSocketServer({ noServer: true });
server.on("upgrade", (request, socket, head) => {
  // We only handle /yjs namespace for Yjs
  if (request.url.startsWith("/yjs")) {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  }
});

wss.on('connection', (conn, req) => {
  setupWSConnection(conn, req, { gc: true });
});

registerCollaborationSocket(io, { roomRepository, roomService, profileController });

// Initialize emotions in Firestore
await initializeEmotionsInFirestore();

server.listen(port, () => {
  console.log(`Codefora API listening on http://localhost:${port}`);
  
  // Run zombie room cleanup every minute
  setInterval(() => {
    const deleted = roomRepository.cleanupZombieRooms();
    if (deleted && deleted.length > 0) {
      broadcastRooms();
    }
  }, 60 * 1000);
});
