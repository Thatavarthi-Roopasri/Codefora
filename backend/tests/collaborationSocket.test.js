import assert from "node:assert/strict";
import http from "node:http";
import test from "node:test";
import { Server } from "socket.io";
import { io as createClient } from "socket.io-client";

const { RoomService } = await import("../services/roomService.js");
const { registerCollaborationSocket } = await import("../sockets/collaborationSocket.js");
const { userIdToRoomId } = await import("../utils/presenceTracker.js");

class MemoryRoomRepository {
  constructor(seedRooms = []) {
    this.rooms = new Map(seedRooms.map((room) => [room.id, room]));
    this.savedRooms = [];
    this.deletedIds = [];
  }

  markActive(id) {
    const room = this.findById(id);
    if (room) room.lastActivityAt = Date.now();
  }

  cleanupZombieRooms() {
    const now = Date.now();
    const zombieRooms = [];
    for (const [id, room] of this.rooms.entries()) {
      if (!room.project && room.users?.length === 0) {
        if (now - (room.lastActivityAt || room.updatedAt || room.createdAt || now) > 5 * 60 * 1000) {
          zombieRooms.push(id);
        }
      }
    }
    for (const id of zombieRooms) {
      this.rooms.delete(id);
      this.deletedIds.push(id);
    }
    return zombieRooms;
  }

  listAll() {
    return [...this.rooms.values()];
  }

  listPublic() {
    return this.listAll().filter((room) => room.visibility === "public" && room.project?.status !== "completed");
  }

  allPublicSummaries(summary) {
    return this.listPublic().map(summary);
  }

  findById(id) {
    return this.rooms.get(String(id || "").trim());
  }

  findByName(name) {
    const clean = String(name || "").trim().toLowerCase();
    return this.listAll().find((room) => String(room.name || "").trim().toLowerCase() === clean);
  }

  findByInviteCode(inviteCode) {
    const clean = String(inviteCode || "").trim().toUpperCase();
    return this.listAll().find((room) => String(room.inviteCode || "").trim().toUpperCase() === clean);
  }

  async save(room) {
    this.savedRooms.push(structuredClone({ ...room, users: [] }));
    this.rooms.set(room.id, room);
  }

  async delete(id) {
    this.rooms.delete(id);
    this.deletedIds.push(id);
  }
}

function makeRoom(overrides = {}) {
  return {
    id: "CF-SOCK",
    name: "Socket Hardening",
    visibility: "public",
    users: [],
    messages: [],
    files: [
      { name: "index.html", language: "html", code: "<main>Ready</main>" },
      { name: "style.css", language: "css", code: "main{color:white}" }
    ],
    notes: { text: "", draws: [] },
    activeFile: "index.html",
    timer: { endTime: null, duration: 1500, isRunning: false },
    history: [],
    hostName: "Host",
    ownerUserId: "host-user",
    hostToken: "host-token",
    inviteCode: "SOCKET42",
    max: 7,
    createdAt: Date.now(),
    ...overrides
  };
}

async function withSocketServer(repository, callback) {
  const httpServer = http.createServer((_request, response) => response.end("ok"));
  const io = new Server(httpServer, { cors: { origin: "*" } });
  const roomService = new RoomService(repository);
  registerCollaborationSocket(io, {
    roomRepository: repository,
    roomService,
    profileController: { addActivity: async () => {} }
  });

  await new Promise((resolve) => httpServer.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${httpServer.address().port}`;
  try {
    await callback(url);
  } finally {
    for (const socket of io.sockets.sockets.values()) {
      socket.disconnect(true);
    }
    io.close();
    await new Promise((resolve, reject) => httpServer.close((error) => error ? reject(error) : resolve()));
    userIdToRoomId.clear();
  }
}

function connectClient(url) {
  return createClient(url, {
    transports: ["websocket"],
    forceNew: true,
    reconnection: false,
    timeout: 2000
  });
}

function once(socket, event, timeoutMs = 2500) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out waiting for ${event}`));
    }, timeoutMs);
    const handler = (payload) => {
      cleanup();
      resolve(payload);
    };
    const cleanup = () => {
      clearTimeout(timer);
      socket.off(event, handler);
    };
    socket.on(event, handler);
  });
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForConnect(socket) {
  if (socket.connected) return;
  await once(socket, "connect");
}

async function joinRoom(socket, roomId, userId, username, extra = {}) {
  const statePromise = once(socket, "room:state");
  socket.emit("room:join", { roomId, userId, username, ...extra });
  return statePromise;
}

test("public room reconnect replaces the older socket for the same user", async () => {
  const repository = new MemoryRoomRepository([makeRoom()]);

  await withSocketServer(repository, async (url) => {
    const first = connectClient(url);
    try {
      await waitForConnect(first);
      await joinRoom(first, "CF-SOCK", "same-user", "First");

      const second = connectClient(url);
      const kickedPromise = once(first, "room:error");
      await waitForConnect(second);
      await joinRoom(second, "CF-SOCK", "same-user", "Second");

      assert.equal(await kickedPromise, "You have joined from another tab/location.");
      const room = repository.findById("CF-SOCK");
      assert.equal(room.users.filter((user) => user.userId === "same-user").length, 1);
      assert.equal(room.users[0].socketId, second.id);
      second.disconnect();
    } finally {
      first.disconnect();
    }
  });
});

test("host transfer persists and lets the new host create and delete files", async () => {
  const repository = new MemoryRoomRepository([makeRoom()]);

  await withSocketServer(repository, async (url) => {
    const host = connectClient(url);
    const viewer = connectClient(url);
    try {
      await Promise.all([waitForConnect(host), waitForConnect(viewer)]);
      await joinRoom(host, "CF-SOCK", "host-user", "Host", { hostToken: "host-token" });
      await joinRoom(viewer, "CF-SOCK", "viewer-user", "Viewer");

      const viewerPresence = once(viewer, "presence:update");
      host.emit("role:update", { roomId: "CF-SOCK", targetSocketId: viewer.id, role: "Host" });
      const users = await viewerPresence;
      assert.equal(users.find((user) => user.socketId === viewer.id)?.role, "Host");
      assert.equal(repository.findById("CF-SOCK").userRoles["viewer-user"], "Host");

      const created = once(host, "files:update");
      viewer.emit("file:create", { roomId: "CF-SOCK", fileName: "app.js", language: "javascript", code: "console.log('ok')" });
      assert.equal((await created).some((file) => file.name === "app.js"), true);

      const deleted = once(host, "files:update");
      viewer.emit("file:delete", { roomId: "CF-SOCK", fileName: "app.js" });
      assert.equal((await deleted).some((file) => file.name === "app.js"), false);
    } finally {
      host.disconnect();
      viewer.disconnect();
    }
  });
});

test("viewers cannot mutate files, notes, history, or microphone state", async () => {
  const repository = new MemoryRoomRepository([makeRoom()]);

  await withSocketServer(repository, async (url) => {
    const host = connectClient(url);
    const viewer = connectClient(url);
    try {
      await Promise.all([waitForConnect(host), waitForConnect(viewer)]);
      await joinRoom(host, "CF-SOCK", "host-user", "Host", { hostToken: "host-token" });
      await joinRoom(viewer, "CF-SOCK", "viewer-user", "Viewer");

      viewer.emit("file:update", { roomId: "CF-SOCK", fileName: "index.html", code: "<main>Hacked</main>" });
      viewer.emit("file:create", { roomId: "CF-SOCK", fileName: "hack.js", language: "javascript", code: "" });
      viewer.emit("file:delete", { roomId: "CF-SOCK", fileName: "style.css" });
      viewer.emit("notes:update", { roomId: "CF-SOCK", text: "changed" });
      viewer.emit("history:push", { roomId: "CF-SOCK" });
      viewer.emit("mic:update", { roomId: "CF-SOCK", mic: true, speaking: true });

      await wait(80);
      const room = repository.findById("CF-SOCK");
      assert.equal(room.files.find((file) => file.name === "index.html").code, "<main>Ready</main>");
      assert.equal(room.files.some((file) => file.name === "hack.js"), false);
      assert.equal(room.files.some((file) => file.name === "style.css"), true);
      assert.equal(room.notes.text, "");
      assert.equal(room.history.length, 0);
      assert.equal(room.users.find((user) => user.socketId === viewer.id).mic, false);
    } finally {
      host.disconnect();
      viewer.disconnect();
    }
  });
});

test("read-only rooms reject collaboration mutations", async () => {
  const repository = new MemoryRoomRepository([makeRoom({ readOnly: true })]);

  await withSocketServer(repository, async (url) => {
    const host = connectClient(url);
    try {
      await waitForConnect(host);
      await joinRoom(host, "CF-SOCK", "host-user", "Host", { hostToken: "host-token" });

      host.emit("file:update", { roomId: "CF-SOCK", fileName: "index.html", code: "<main>Changed</main>" });
      host.emit("file:create", { roomId: "CF-SOCK", fileName: "app.js", language: "javascript", code: "" });
      host.emit("notes:update", { roomId: "CF-SOCK", text: "changed" });
      host.emit("history:push", { roomId: "CF-SOCK" });

      await wait(80);
      const room = repository.findById("CF-SOCK");
      assert.equal(room.files.find((file) => file.name === "index.html").code, "<main>Ready</main>");
      assert.equal(room.files.some((file) => file.name === "app.js"), false);
      assert.equal(room.notes.text, "");
      assert.equal(room.history.length, 0);
    } finally {
      host.disconnect();
    }
  });
});

test("completed project rooms can be joined as read-only snapshots", async () => {
  const repository = new MemoryRoomRepository([makeRoom({
    project: { status: "completed", ownerId: "host-user" },
    readOnly: false
  })]);

  await withSocketServer(repository, async (url) => {
    const owner = connectClient(url);
    try {
      await waitForConnect(owner);
      const state = await joinRoom(owner, "CF-SOCK", "host-user", "Host", { hostToken: "host-token" });

      assert.equal(state.readOnly, true);
      assert.equal(repository.findById("CF-SOCK").readOnly, true);

      owner.emit("file:update", { roomId: "CF-SOCK", fileName: "index.html", code: "<main>Edited</main>" });
      await wait(80);
      assert.equal(repository.findById("CF-SOCK").files[0].code, "<main>Ready</main>");
    } finally {
      owner.disconnect();
    }
  });
});

test("host disconnect transfers host after the reconnect grace period", async () => {
  const repository = new MemoryRoomRepository([makeRoom()]);

  await withSocketServer(repository, async (url) => {
    const host = connectClient(url);
    const member = connectClient(url);
    try {
      await Promise.all([waitForConnect(host), waitForConnect(member)]);
      await joinRoom(host, "CF-SOCK", "host-user", "Host", { hostToken: "host-token" });
      await joinRoom(member, "CF-SOCK", "member-user", "Member", { inviteCode: "SOCKET42" });

      host.disconnect();
      await wait(3200);
      const users = repository.findById("CF-SOCK").users;

      assert.equal(users.find((user) => user.socketId === member.id)?.role, "Host");
      assert.equal(repository.findById("CF-SOCK").hostName, "Member");
    } finally {
      member.disconnect();
    }
  });
});

test("idle non-project room cleanup removes only stale empty rooms", () => {
  const repository = new MemoryRoomRepository([
    makeRoom({ id: "CF-OLD", users: [], lastActivityAt: Date.now() - 6 * 60 * 1000 }),
    makeRoom({ id: "CF-NEW", users: [], lastActivityAt: Date.now() }),
    makeRoom({ id: "CF-PROJ", users: [], lastActivityAt: Date.now() - 6 * 60 * 1000, project: { status: "active" } })
  ]);

  const deleted = repository.cleanupZombieRooms();

  assert.deepEqual(deleted, ["CF-OLD"]);
  assert.equal(repository.findById("CF-OLD"), undefined);
  assert.notEqual(repository.findById("CF-NEW"), undefined);
  assert.notEqual(repository.findById("CF-PROJ"), undefined);
});
