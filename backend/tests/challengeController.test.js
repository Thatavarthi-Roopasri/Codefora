import assert from "node:assert/strict";
import test from "node:test";

const { getChallengeRuntimeStatus, submitChallenge } = await import("../controllers/challengeController.js");

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

test("challenge runtime status exposes renderer readiness", () => {
  const status = getChallengeRuntimeStatus();

  assert.equal(status.renderer, "puppeteer");
  assert.match(status.browser, /^(available|missing)$/);
  assert.equal(typeof status.targetTtlMs, "number");
});

test("challenge submit requires the server-issued challenge id", async () => {
  const response = mockResponse();

  await submitChallenge({
    body: {
      userCode: "<!DOCTYPE html><html><body>Done</body></html>",
      targetImage: "data:image/png;base64,not-trusted"
    }
  }, response);

  assert.equal(response.statusCode, 400);
  assert.equal(response.payload.error, "Missing userCode or challengeId");
});

test("challenge submit rejects expired or unknown challenge ids", async () => {
  const response = mockResponse();

  await submitChallenge({
    body: {
      userCode: "<!DOCTYPE html><html><body>Done</body></html>",
      challengeId: "missing-challenge"
    }
  }, response);

  assert.equal(response.statusCode, 404);
  assert.match(response.payload.error, /not found or has expired/i);
});
