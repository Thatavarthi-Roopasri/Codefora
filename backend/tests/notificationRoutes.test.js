import assert from "node:assert/strict";
import http from "node:http";
import test from "node:test";
import express from "express";

process.env.CODEFORA_LOCAL_MODE = "true";

const { createApiRoutes } = await import("../routes/apiRoutes.js");

function jsonResponse(payload = {}) {
  return (_request, response) => response.json(payload);
}

function makeController(overrides = {}) {
  return {
    list: jsonResponse([]),
    create: jsonResponse({ ok: true }),
    get: jsonResponse({ ok: true }),
    findByInviteCode: jsonResponse({ ok: true }),
    rateLimit: (_request, _response, next) => next(),
    ...overrides
  };
}

function makeProfileController() {
  return {
    bootstrap: jsonResponse({ ok: true }),
    get: jsonResponse({ ok: true }),
    searchUser: jsonResponse([]),
    save: jsonResponse({ ok: true }),
    saveWork: jsonResponse({ ok: true }),
    endWork: jsonResponse({ ok: true }),
    deleteWork: jsonResponse({ ok: true }),
    saveTourStatus: jsonResponse({ ok: true }),
    getTourStatus: jsonResponse({ ok: true }),
    solveProblem: jsonResponse({ ok: true }),
    listWorks: jsonResponse([]),
    sendFriendRequest: jsonResponse({ ok: true }),
    handleFriendRequest: jsonResponse({ ok: true }),
    removeFriend: jsonResponse({ ok: true })
  };
}

function makeApp(notificationController) {
  const app = express();
  app.set("trust proxy", 1);
  app.use(express.json());
  app.use("/api", createApiRoutes({
    roomController: makeController(),
    roomProjectController: makeController({
      save: jsonResponse({ ok: true }),
      resume: jsonResponse({ ok: true }),
      end: jsonResponse({ ok: true }),
      reopenSavedWork: jsonResponse({ ok: true })
    }),
    roomRepository: { storageMode: () => "test" },
    executionController: { run: jsonResponse({ ok: true }) },
    aiController: { ask: jsonResponse({ ok: true }) },
    emotionController: {
      getEmotions: jsonResponse([]),
      getEmotionImage: jsonResponse({ ok: true }),
      initEmotions: jsonResponse({ ok: true })
    },
    profileController: makeProfileController(),
    compilerController: {
      rateLimit: (_request, _response, next) => next(),
      run: jsonResponse({ ok: true }),
      submit: jsonResponse({ ok: true })
    },
    adminController: null,
    problemController: {
      list: jsonResponse([]),
      get: jsonResponse({ ok: true })
    },
    feedbackController: {
      submit: jsonResponse({ ok: true }),
      getAll: jsonResponse([]),
      updateStatus: jsonResponse({ ok: true })
    },
    notificationController,
    directMessageController: {
      send: jsonResponse({ ok: true }),
      get: jsonResponse({ ok: true }),
      seen: jsonResponse({ ok: true })
    }
  }));
  return app;
}

async function withServer(app, callback) {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  try {
    await callback(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

async function request(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(options.headers || {})
    }
  });
  const payload = await response.json();
  return { response, payload };
}

function localAuthHeaders(userId) {
  return {
    authorization: "Bearer local-test-token",
    "x-codefora-user-id": userId,
    "x-codefora-user-name": "Route Tester"
  };
}

test("notification reads require an authenticated matching user", async () => {
  const app = makeApp({
    getNotifications: jsonResponse([{ id: "n1" }]),
    sendRoomInvite: jsonResponse({ ok: true }),
    markAsRead: jsonResponse({ ok: true })
  });

  await withServer(app, async (baseUrl) => {
    const unauthenticated = await request(baseUrl, "/api/notifications/user-one");
    assert.equal(unauthenticated.response.status, 401);

    const mismatched = await request(baseUrl, "/api/notifications/user-one", {
      headers: localAuthHeaders("user-two")
    });
    assert.equal(mismatched.response.status, 403);

    const allowed = await request(baseUrl, "/api/notifications/user-one", {
      headers: localAuthHeaders("user-one")
    });
    assert.equal(allowed.response.status, 200);
    assert.deepEqual(allowed.payload, [{ id: "n1" }]);
  });
});

test("notification writes require the current user and trusted inviter identity", async () => {
  let inviteRequestUser = null;
  const app = makeApp({
    getNotifications: jsonResponse([]),
    markAsRead: jsonResponse({ ok: true }),
    sendRoomInvite: (request, response) => {
      inviteRequestUser = request.firebaseUser;
      response.json({ ok: true });
    }
  });

  await withServer(app, async (baseUrl) => {
    const read = await request(baseUrl, "/api/notifications/user-one/read", {
      method: "POST",
      headers: localAuthHeaders("user-two"),
      body: JSON.stringify({})
    });
    assert.equal(read.response.status, 403);

    const invite = await request(baseUrl, "/api/notifications/invite", {
      method: "POST",
      headers: localAuthHeaders("real-inviter"),
      body: JSON.stringify({
        targetUserId: "target-user",
        roomId: "CF-TEST",
        inviterId: "spoofed-inviter",
        inviterName: "Spoofed Name"
      })
    });
    assert.equal(invite.response.status, 200);
    assert.equal(inviteRequestUser.uid, "real-inviter");
    assert.equal(inviteRequestUser.name, "Route Tester");
  });
});
