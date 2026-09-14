import assert from "node:assert/strict";
import test from "node:test";
import { PNG } from "pngjs";

const { __challengeInternals, getChallengeRuntimeStatus, submitChallenge } = await import("../controllers/challengeController.js");

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

test("challenge renderer captures full document height for tall submissions", { skip: getChallengeRuntimeStatus().browser === "missing" }, async () => {
  const html = `<!DOCTYPE html>
<html>
<head>
<style>
body{margin:0;font-family:system-ui,sans-serif;background:#10172a;color:white}
.section{min-height:900px;padding:48px;background:linear-gradient(135deg,#312e81,#0f766e)}
.section+section{background:linear-gradient(135deg,#f97316,#22c55e)}
h1{font-size:64px;margin:0 0 18px}
</style>
</head>
<body>
<section class="section"><h1>First screen</h1><p>Visible at the top.</p></section>
<section class="section"><h1>Second screen</h1><p>This must be captured too.</p></section>
</body>
</html>`;

  try {
    const base64Image = await __challengeInternals.renderHtmlToImage(html);
    const png = PNG.sync.read(Buffer.from(base64Image, "base64"));

    assert.equal(png.width, 800);
    assert.ok(png.height > 600, `expected full-page screenshot taller than 600px, got ${png.height}px`);
  } finally {
    await __challengeInternals.closeChallengeRenderer();
  }
});
