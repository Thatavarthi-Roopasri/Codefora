import puppeteer from "puppeteer";

const frontendUrl = process.env.E2E_FRONTEND_URL || "http://127.0.0.1:3000";
const apiUrl = process.env.E2E_API_URL || "http://127.0.0.1:5000";
const userId = `mobile-smoke-${Date.now()}`;
const viewports = [
  { label: "phone", width: 390, height: 844, isMobile: true },
  { label: "tablet", width: 768, height: 1024, isMobile: true },
  { label: "small-laptop", width: 1024, height: 768, isMobile: false }
];

async function waitFor(url, label) {
  const deadline = Date.now() + 30_000;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
      lastError = new Error(`${response.status} ${response.statusText}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 750));
  }
  throw new Error(`${label} is not reachable: ${lastError?.message || "timeout"}`);
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      authorization: "Bearer local-mobile-smoke",
      "x-codefora-user-id": userId,
      "x-codefora-user-name": "Mobile Smoke",
      ...(options.headers || {})
    }
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(`${path} failed with ${response.status}: ${payload.error || response.statusText}`);
  }
  return payload;
}

async function prepareLoggedInPage(browser, viewport) {
  const page = await browser.newPage();
  await page.setViewport({ ...viewport, deviceScaleFactor: 1 });
  await page.evaluateOnNewDocument((id) => {
    localStorage.setItem("codefora_user_id", id);
    localStorage.setItem("codefora_username", "Mobile Smoke");
  }, userId);
  return page;
}

async function findUnexpectedOverflow(page) {
  return page.evaluate(() => {
    const offenders = [];
    for (const element of document.querySelectorAll("body *")) {
      const style = globalThis.getComputedStyle(element);
      if (style.position === "fixed" || style.position === "absolute") continue;
      const rect = element.getBoundingClientRect();
      if (rect.left < -1000) continue;
      if (typeof element.className === "string" && /\bmonaco-(alert|status)\b/.test(element.className)) continue;
      if (rect.width <= 0 || (rect.left >= -1 && rect.right <= globalThis.innerWidth + 1)) continue;

      let parent = element.parentElement;
      let insideManagedScroller = false;
      while (parent && parent !== document.body) {
        const parentStyle = globalThis.getComputedStyle(parent);
        const canScroll = parent.scrollWidth > parent.clientWidth + 1;
        const clipsOverflow = /(auto|scroll|hidden)/.test(parentStyle.overflowX);
        if (canScroll && clipsOverflow) {
          insideManagedScroller = true;
          break;
        }
        parent = parent.parentElement;
      }

      if (!insideManagedScroller) {
        offenders.push({
          tag: element.tagName,
          className: typeof element.className === "string" ? element.className : "",
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          text: (element.innerText || element.textContent || "").trim().slice(0, 60)
        });
      }
    }

    return {
      bodyWidth: document.body.scrollWidth,
      docWidth: document.documentElement.scrollWidth,
      viewportWidth: globalThis.innerWidth,
      offenders: offenders.slice(0, 8)
    };
  });
}

async function assertNoOverflow(page, label) {
  const result = await findUnexpectedOverflow(page);
  if (result.bodyWidth > result.viewportWidth + 1 || result.docWidth > result.viewportWidth + 1 || result.offenders.length) {
    throw new Error(`${label} overflowed: ${JSON.stringify(result)}`);
  }
}

async function checkPlayground(browser, viewport) {
  const page = await prepareLoggedInPage(browser, viewport);
  await page.goto(`${frontendUrl}/playground`, { waitUntil: "networkidle2", timeout: 45_000 });
  await page.waitForFunction(() => document.body.innerText.includes("Playground"), { timeout: 20_000 });
  await assertNoOverflow(page, `${viewport.label} playground`);

  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll("header button"));
    buttons[buttons.length - 1]?.click();
  });
  await page.waitForFunction(() => document.body.innerText.includes("View Profile"), { timeout: 10_000 });
  await assertNoOverflow(page, `${viewport.label} profile dropdown`);
  await page.close();
}

async function checkProfile(browser, viewport) {
  const page = await prepareLoggedInPage(browser, viewport);
  await page.goto(`${frontendUrl}/profile`, { waitUntil: "networkidle2", timeout: 45_000 });
  await page.waitForFunction(() => document.body.innerText.includes("Mobile Smoke"), { timeout: 20_000 });
  await assertNoOverflow(page, `${viewport.label} profile page`);
  const opened = await page.evaluate(() => {
    const link = Array.from(document.querySelectorAll("a,button")).find((item) => item.textContent.includes("View All"));
    link?.click();
    return Boolean(link);
  });
  if (opened) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    await assertNoOverflow(page, `${viewport.label} saved-work modal`);
  }
  await page.close();
}

async function checkRoom(browser, viewport, roomId) {
  const page = await prepareLoggedInPage(browser, viewport);
  await page.goto(`${frontendUrl}/code/${encodeURIComponent(roomId)}`, { waitUntil: "networkidle2", timeout: 45_000 });
  await page.waitForSelector(".topbar", { timeout: 20_000 });
  await assertNoOverflow(page, `${viewport.label} room topbar`);
  await page.close();
}

await waitFor(frontendUrl, "frontend");
await waitFor(`${apiUrl}/api/health`, "backend");

const room = await apiRequest("/api/rooms", {
  method: "POST",
  body: JSON.stringify({
    name: `Mobile Smoke ${Date.now()}`,
    visibility: "private",
    username: "Mobile Smoke",
    userId,
    max: 2
  })
});

let browser;
try {
  browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox", "--disable-setuid-sandbox"] });
  for (const viewport of viewports) {
    await checkPlayground(browser, viewport);
    await checkProfile(browser, viewport);
    await checkRoom(browser, viewport, room.id);
  }
  console.log("Mobile smoke passed: navbar/profile dropdown, saved-work modal, room topbar, and Playground toolbar across phone, tablet, and small-laptop viewports.");
} finally {
  await browser?.close();
}
