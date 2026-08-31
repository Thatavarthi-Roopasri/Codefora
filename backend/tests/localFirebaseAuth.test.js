import assert from "node:assert/strict";
import test from "node:test";

process.env.CODEFORA_LOCAL_MODE = "true";

const { firebaseAuth, optionalFirebaseAuth, requireCurrentUser } = await import("../middleware/firebaseAuth.js");

function mockResponse() {
  return {
    statusCode: 200,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    }
  };
}

test("local mock auth uses the frontend user id header", async () => {
  const request = {
    headers: {
      authorization: "Bearer local-token",
      "x-codefora-user-id": "google-local-user"
    },
    params: { userId: "google-local-user" }
  };
  const response = mockResponse();
  let nextCalled = false;

  await firebaseAuth(request, response, () => {
    nextCalled = true;
  });
  requireCurrentUser(request, response, () => {
    nextCalled = nextCalled && true;
  });

  assert.equal(nextCalled, true);
  assert.equal(request.firebaseUser.uid, "google-local-user");
  assert.equal(response.statusCode, 200);
});

test("local mock auth still blocks access to another user", async () => {
  const request = {
    headers: {
      authorization: "Bearer local-token",
      "x-codefora-user-id": "google-local-user"
    },
    params: { userId: "other-user" }
  };
  const response = mockResponse();

  await firebaseAuth(request, response, () => {});
  requireCurrentUser(request, response, () => {});

  assert.equal(response.statusCode, 403);
  assert.equal(response.payload.error, "You can only access your own account data.");
});

test("optional local mock auth resolves the frontend user id header", async () => {
  const request = {
    headers: {
      authorization: "Bearer local-token",
      "x-codefora-user-id": "room-owner-user"
    },
    params: {}
  };
  const response = mockResponse();
  let nextCalled = false;

  await optionalFirebaseAuth(request, response, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(request.firebaseUser.uid, "room-owner-user");
  assert.equal(response.statusCode, 200);
});
