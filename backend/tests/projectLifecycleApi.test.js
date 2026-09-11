import assert from "node:assert/strict";
import http from "node:http";
import test from "node:test";

process.env.CODEFORA_LOCAL_MODE = "true";

const { createApp } = await import("../app.js");
const { RoomService } = await import("../services/roomService.js");

class MemoryRoomRepository {
  constructor(seedRooms = []) {
    this.rooms = new Map(seedRooms.map((room) => [room.id, room]));
  }

  listAll() {
    return [...this.rooms.values()];
  }

  allPublicSummaries(summary) {
    return this.listAll().filter((room) => room.visibility === "public").map(summary);
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

  async fetchById(id) {
    return this.findById(id);
  }

  async save(room) {
    const duplicate = this.findByName(room.name);
    if (duplicate && duplicate.id !== room.id && !room.sourceWorkId) {
      throw new Error("Room name is already taken.");
    }
    this.rooms.set(room.id, room);
  }
}

function makeRoom() {
  return {
    id: "CF-E2E1",
    name: "Lifecycle Project",
    ownerUserId: "google-user-1",
    visibility: "private",
    users: [],
    messages: [],
    files: [{ name: "index.html", language: "html", code: "<main>Initial</main>" }],
    notes: { text: "Initial notes", draws: [] },
    activeFile: "index.html",
    timer: { endTime: null, duration: 1500, isRunning: false },
    history: [],
    inviteCode: "LIFECODE",
    hostToken: "host-token",
    createdAt: Date.now()
  };
}

function makeProfileController() {
  const works = new Map();
  return {
    async saveWorkForUser(userId, work) {
      const id = work.id || `work:${works.size + 1}`;
      const previous = works.get(id) || {};
      const savedWork = {
        ...previous,
        ...work,
        id,
        ownerId: userId,
        updatedAt: Date.now()
      };
      works.set(id, savedWork);
      return savedWork;
    },
    async getSavedWorkForUser(userId, workId) {
      const work = works.get(workId);
      if (!work) return null;
      if (work.ownerId !== userId) {
        const error = new Error("You can only access your own saved work.");
        error.statusCode = 403;
        throw error;
      }
      return work;
    },
    bootstrap: (_request, response) => response.json({ ok: true }),
    get: (_request, response) => response.json({}),
    save: (_request, response) => response.json({ ok: true }),
    saveWork: (_request, response) => response.json({ ok: true }),
    endWork: (_request, response) => response.json({ ok: true }),
    deleteWork: (request, response) => {
      const work = works.get(request.params.workId);
      if (!work) return response.status(404).json({ error: "Saved work not found." });
      if (work.ownerId !== request.params.userId) return response.status(403).json({ error: "You cannot modify another user's saved work." });
      works.delete(request.params.workId);
      return response.json({ ok: true, deletedWorkIds: [request.params.workId], deletedCount: 1 });
    },
    saveTourStatus: (_request, response) => response.json({ ok: true }),
    getTourStatus: (_request, response) => response.json({ status: false }),
    solveProblem: (_request, response) => response.json({ ok: true }),
    listWorks: (request, response) => response.json([...works.values()].filter((work) => work.ownerId === request.params.userId)),
    sendFriendRequest: (_request, response) => response.json({ ok: true }),
    handleFriendRequest: (_request, response) => response.json({ ok: true }),
    removeFriend: (_request, response) => response.json({ ok: true }),
    searchUser: (_request, response) => response.json([]),
    incrementStat: async () => {}
  };
}

function localAuthHeaders(userId = "google-user-1") {
  return {
    authorization: "Bearer local-test-token",
    "content-type": "application/json",
    "x-codefora-user-id": userId,
    "x-codefora-user-name": "Local Tester"
  };
}

async function withServer(app, callback) {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;
  try {
    await callback(baseUrl);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

async function jsonRequest(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      ...localAuthHeaders(),
      ...(options.headers || {})
    }
  });
  const payload = await response.json();
  return { response, payload };
}

test("health reports Firebase and Firestore service mode", async () => {
  const repository = new MemoryRoomRepository();
  const roomService = new RoomService(repository);
  const app = createApp({
    roomRepository: repository,
    roomService,
    profileController: makeProfileController(),
    onRoomCreated: () => {},
    collabDocs: null
  });

  await withServer(app, async (baseUrl) => {
    const { response, payload } = await jsonRequest(baseUrl, "/api/health", {
      method: "GET",
      headers: {}
    });

    assert.equal(response.status, 200);
    assert.equal(payload.ok, true);
    assert.equal(payload.firestore, "mock");
    assert.equal(payload.auth, "mock");
    assert.equal(payload.services.firebase.firestore.reason, "CODEFORA_LOCAL_MODE is enabled.");
    assert.equal(payload.services.challengeRenderer.renderer, "puppeteer");
    assert.match(payload.services.challengeRenderer.browser, /^(available|missing)$/);
  });
});

test("Save Work to End Project to Resume restores a read-only snapshot through API routes", async () => {
  const repository = new MemoryRoomRepository([makeRoom()]);
  const roomService = new RoomService(repository);
  const app = createApp({
    roomRepository: repository,
    roomService,
    profileController: makeProfileController(),
    onRoomCreated: () => {},
    collabDocs: null
  });

  await withServer(app, async (baseUrl) => {
    const savedFiles = [
      { name: "index.html", language: "html", code: "<main>Saved from editor</main>" },
      { name: "style.css", language: "css", code: "main { color: coral; }" }
    ];
    const savedNotes = { text: "Saved lifecycle notes", draws: [{ x: 1, y: 2 }] };

    const saveResult = await jsonRequest(baseUrl, "/api/rooms/CF-E2E1/project", {
      method: "POST",
      body: JSON.stringify({
        title: "Ignored in favor of room name",
        activeFile: "style.css",
        files: savedFiles,
        notes: savedNotes
      })
    });

    assert.equal(saveResult.response.status, 200);
    assert.equal(saveResult.payload.work.files[0].code, "<main>Saved from editor</main>");
    assert.equal(saveResult.payload.work.notes.text, "Saved lifecycle notes");
    assert.equal(saveResult.payload.work.activeFile, "style.css");

    const workId = saveResult.payload.work.id;
    const endedFiles = [
      { name: "index.html", language: "html", code: "<main>Final snapshot</main>" },
      { name: "style.css", language: "css", code: "main { color: seagreen; }" }
    ];
    const endedNotes = { text: "Final notes", draws: [{ x: 3, y: 4 }] };

    const endResult = await jsonRequest(baseUrl, "/api/rooms/CF-E2E1/project/end", {
      method: "POST",
      body: JSON.stringify({
        activeFile: "index.html",
        files: endedFiles,
        notes: endedNotes
      })
    });

    assert.equal(endResult.response.status, 200);
    assert.equal(endResult.payload.work.id, workId);
    assert.equal(endResult.payload.work.projectStatus, "completed");
    assert.equal(endResult.payload.work.readOnly, true);

    const blockedOriginalEdit = await jsonRequest(baseUrl, "/api/rooms/CF-E2E1/project", {
      method: "POST",
      body: JSON.stringify({ files: savedFiles })
    });

    assert.equal(blockedOriginalEdit.response.status, 409);

    const resumeResult = await jsonRequest(baseUrl, `/api/profiles/google-user-1/works/${encodeURIComponent(workId)}/resume-room`, {
      method: "POST",
      body: JSON.stringify({})
    });

    assert.equal(resumeResult.response.status, 201);
    assert.equal(resumeResult.payload.room.name, "Lifecycle Project");
    assert.equal(resumeResult.payload.room.readOnly, true);
    assert.equal(resumeResult.payload.room.project.status, "completed");
    assert.equal(resumeResult.payload.room.files[0].code, "<main>Final snapshot</main>");
    assert.equal(resumeResult.payload.room.notes.text, "Final notes");
    assert.equal(resumeResult.payload.room.activeFile, "index.html");

    const reopenedRoomId = resumeResult.payload.room.id;
    const blockedReopenedEdit = await jsonRequest(baseUrl, `/api/rooms/${encodeURIComponent(reopenedRoomId)}/project`, {
      method: "POST",
      body: JSON.stringify({ files: savedFiles })
    });

    assert.equal(blockedReopenedEdit.response.status, 409);
  });
});

test("saved work delete route removes only the current user's project", async () => {
  const repository = new MemoryRoomRepository();
  const roomService = new RoomService(repository);
  const profileController = makeProfileController();
  await profileController.saveWorkForUser("google-user-1", { id: "work-user-1", name: "User One Project", files: [{ name: "index.html", code: "one" }] });
  await profileController.saveWorkForUser("google-user-2", { id: "work-user-2", name: "User Two Project", files: [{ name: "index.html", code: "two" }] });
  const app = createApp({
    roomRepository: repository,
    roomService,
    profileController,
    onRoomCreated: () => {},
    collabDocs: null
  });

  await withServer(app, async (baseUrl) => {
    const blocked = await jsonRequest(baseUrl, "/api/profiles/google-user-1/works/work-user-1", {
      method: "DELETE",
      headers: localAuthHeaders("google-user-2")
    });
    assert.equal(blocked.response.status, 403);

    const deleted = await jsonRequest(baseUrl, "/api/profiles/google-user-1/works/work-user-1", {
      method: "DELETE"
    });
    assert.equal(deleted.response.status, 200);
    assert.deepEqual(deleted.payload.deletedWorkIds, ["work-user-1"]);

    const firstUserWorks = await jsonRequest(baseUrl, "/api/profiles/google-user-1/works", { method: "GET" });
    const secondUserWorks = await jsonRequest(baseUrl, "/api/profiles/google-user-2/works", {
      method: "GET",
      headers: localAuthHeaders("google-user-2")
    });
    assert.deepEqual(firstUserWorks.payload, []);
    assert.equal(secondUserWorks.payload.length, 1);
    assert.equal(secondUserWorks.payload[0].id, "work-user-2");
  });
});
