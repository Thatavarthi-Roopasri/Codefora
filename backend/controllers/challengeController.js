import fs from 'fs';
import crypto from 'crypto';
import puppeteer from 'puppeteer';
import pixelmatch from 'pixelmatch';
import { ssim } from 'ssim.js';
import { PNG } from 'pngjs';
import { createFirestore } from '../config/firebase.js';

const getGroqKey = () => process.env.GROQ_API_KEY;
const getGroqModel = () => process.env.GROQ_MODEL || "llama-3.1-8b-instant";
const challengeTargets = new Map();
let challengeDbCache;
const CHALLENGE_TTL_MS = Number(process.env.CHALLENGE_TTL_MS || 60 * 60 * 1000);
const MAX_CHALLENGE_TARGETS = Number(process.env.MAX_CHALLENGE_TARGETS || 250);
const MAX_CHALLENGE_HTML_BYTES = Number(process.env.MAX_CHALLENGE_HTML_BYTES || 300_000);

export function getChallengeRuntimeStatus() {
  const configuredPath = process.env.PUPPETEER_EXECUTABLE_PATH || "";
  const localPath = configuredPath ? "" : findLocalBrowserExecutable();
  let bundledPath = "";

  if (!configuredPath && !localPath) {
    try {
      bundledPath = puppeteer.executablePath();
    } catch {
      bundledPath = "";
    }
  }

  const executablePath = configuredPath || localPath || bundledPath || "";

  return {
    renderer: "puppeteer",
    browser: executablePath ? "available" : "missing",
    executableSource: configuredPath ? "PUPPETEER_EXECUTABLE_PATH" : localPath ? "local-browser" : bundledPath ? "puppeteer-bundled" : "none",
    executablePath: executablePath || null,
    challengeTargets: challengeTargets.size,
    targetTtlMs: CHALLENGE_TTL_MS
  };
}

const pageArchetypes = {
  easy: [
    "A simple centered login form with a logo, email input, password input, and a submit button.",
    "A basic profile card with an avatar, name, bio, and two social media buttons.",
    "A minimal landing page with a large headline, subheadline, and a single call-to-action button centered on the screen.",
    "A simple pricing card with a plan name, price, feature list, and a subscribe button."
  ],
  medium: [
    "A modern SaaS landing page with a navbar, a hero section with a gradient background, a 3-column features grid, and a footer.",
    "A sleek developer portfolio with a dark theme, a large profile header, a project gallery grid, and a contact form.",
    "A basic e-commerce product page with a product area, product title, price, add to cart button, and a detailed description section.",
    "A blog home page with a featured post at the top and a grid of smaller article cards below."
  ],
  hard: [
    "A complex dashboard interface with a left sidebar navigation, a top header, and a main content area containing statistic cards and a data table.",
    "A detailed kanban board layout with multiple columns, draggable task cards with avatars and tags, and a top navigation bar.",
    "An advanced email inbox interface with a folder list on the left, an email list in the middle, and an email reading pane on the right.",
    "A highly complex e-commerce storefront with a multi-level mega menu, a promotional carousel, a sidebar with filter checkboxes, and a grid of product cards with hover effects."
  ]
};

// Generate a target UI challenge using LLM
export const generateChallenge = async (req, res) => {
  const { difficulty = 'easy' } = req.body;

  // Fallback to 'easy' if difficulty is invalid
  const diffLevel = pageArchetypes[difficulty.toLowerCase()] ? difficulty.toLowerCase() : 'easy';
  const archetypes = pageArchetypes[diffLevel];
  const randomArchetype = archetypes[Math.floor(Math.random() * archetypes.length)];

  const prompt = `You are an expert web designer. Create a beautiful HTML/CSS layout for a CSS UI Challenge.
Difficulty Level: ${diffLevel.toUpperCase()}.

Website Type to Generate: ${randomArchetype}

Requirements:
1. ONLY return the raw HTML file. NO markdown formatting, NO backticks. Start with <!DOCTYPE html>.
2. Embed all CSS in a <style> block.
3. The layout MUST fill the screen. Use 'body { margin: 0; padding: 0; font-family: system-ui, sans-serif; background: #0f172a; color: white; min-height: 100vh; }'.
4. CRITICAL RULE: YOU ARE STRICTLY FORBIDDEN FROM USING THE <img> TAG or CSS url() functions! DO NOT USE IMAGES. If you need a logo or avatar, use a <div> with a background color and text initials (e.g., <div class="avatar">JD</div>), or use Emojis. ANY use of external image URLs will break the system.
5. Create a layout matching the requested Website Type and Difficulty Level. For EASY, keep it very simple (e.g., a single centered card). For HARD, make it complex with sidebars, grids, and multiple sections.
6. The design must fit beautifully within an 800x600 window.`;

  try {
    const htmlCode = await createChallengeHtml(prompt, diffLevel, randomArchetype);

    // Render HTML to Image using Puppeteer
    const base64Image = await renderHtmlToImage(htmlCode);
    const challenge = await storeChallengeTarget({
      difficulty: diffLevel,
      archetype: randomArchetype,
      htmlCode,
      targetImage: `data:image/png;base64,${base64Image}`
    });

    res.json({
      challengeId: challenge.id,
      targetImage: challenge.targetImage,
      difficulty: challenge.difficulty,
      expiresAt: challenge.expiresAt
    });
  } catch (error) {
    console.error("Generate Challenge Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate challenge" });
  }
};

function getChallengeDb() {
  if (challengeDbCache !== undefined) return challengeDbCache;
  try {
    const db = createFirestore();
    challengeDbCache = db && !db.isMock ? db : null;
  } catch (error) {
    challengeDbCache = null;
    throw error;
  }
  return challengeDbCache;
}

async function storeChallengeTarget(challenge) {
  cleanupChallengeTargets();
  const id = crypto.randomUUID();
  const expiresAt = Date.now() + CHALLENGE_TTL_MS;
  const saved = { ...challenge, id, expiresAt };
  challengeTargets.set(id, saved);

  while (challengeTargets.size > MAX_CHALLENGE_TARGETS) {
    const oldestId = challengeTargets.keys().next().value;
    challengeTargets.delete(oldestId);
  }

  const db = getChallengeDb();
  if (db) {
    await db.collection("challengeTargets").doc(id).set(saved, { merge: true });
  }

  return saved;
}

async function getChallengeTarget(challengeId) {
  cleanupChallengeTargets();
  const cleanId = String(challengeId || "").trim();
  if (!cleanId) return null;
  const inMemory = challengeTargets.get(cleanId);
  if (inMemory) return inMemory;

  const db = getChallengeDb();
  if (!db) return null;

  const doc = await db.collection("challengeTargets").doc(cleanId).get();
  if (!doc.exists) return null;
  const saved = { id: doc.id, ...doc.data() };
  if (!saved.expiresAt || saved.expiresAt <= Date.now()) {
    await db.collection("challengeTargets").doc(cleanId).delete();
    return null;
  }
  challengeTargets.set(cleanId, saved);
  return saved;
}

function cleanupChallengeTargets() {
  const now = Date.now();
  for (const [id, challenge] of challengeTargets.entries()) {
    if (!challenge?.expiresAt || challenge.expiresAt <= now) {
      challengeTargets.delete(id);
    }
  }
}

async function createChallengeHtml(prompt, difficulty, archetype) {
  const groqKey = getGroqKey();

  if (!groqKey) {
    console.warn("GROQ_API_KEY is not configured. Using local challenge template.");
    return generateLocalChallengeHtml(difficulty, archetype);
  }

  try {
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${groqKey}`
      },
      body: JSON.stringify({
        model: getGroqModel(),
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      })
    });

    if (!groqRes.ok) {
      let detail = "";
      try {
        const payload = await groqRes.json();
        detail = payload.error?.message ? `: ${payload.error.message}` : "";
      } catch {
        detail = `: ${groqRes.statusText}`;
      }
      throw new Error(`Groq text generation failed (${groqRes.status})${detail}`);
    }

    const groqData = await groqRes.json();
    let htmlCode = groqData.choices?.[0]?.message?.content || "";

    // Clean up markdown code blocks if the AI disobeyed
    if (htmlCode.startsWith("```html")) {
      htmlCode = htmlCode.replace(/```html/g, "").replace(/```/g, "").trim();
    } else if (htmlCode.startsWith("```")) {
      htmlCode = htmlCode.replace(/```/g, "").trim();
    }

    if (!htmlCode.trim()) {
      throw new Error("Groq returned an empty challenge");
    }

    return htmlCode;
  } catch (error) {
    console.warn("Groq challenge generation failed. Using local challenge template.", error);
    return generateLocalChallengeHtml(difficulty, archetype);
  }
}

function generateLocalChallengeHtml(difficulty, archetype) {
  if (difficulty === "hard") return hardTemplate(archetype);
  if (difficulty === "medium") return mediumTemplate(archetype);
  return easyTemplate(archetype);
}

function easyTemplate(archetype) {
  const isLogin = archetype.toLowerCase().includes("login");
  const isPricing = archetype.toLowerCase().includes("pricing");
  const title = isLogin ? "Welcome Back" : isPricing ? "Starter" : "Nova Studio";
  const subtitle = isLogin ? "Sign in to continue building." : isPricing ? "Everything you need to ship faster." : "Design sharp interfaces in minutes.";

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
body{margin:0;padding:0;font-family:system-ui,sans-serif;background:#0f172a;color:white;min-height:100vh;display:grid;place-items:center}
.card{width:360px;background:#111827;border:1px solid #263244;border-radius:24px;padding:34px;box-shadow:0 30px 80px rgba(0,0,0,.35)}
.mark{width:58px;height:58px;border-radius:18px;background:#38bdf8;color:#06111d;display:grid;place-items:center;font-weight:900;font-size:24px;margin-bottom:22px}
h1{margin:0 0 8px;font-size:34px}.muted{margin:0 0 26px;color:#a8b3c7;line-height:1.5}
.field{height:46px;border-radius:14px;background:#0b1220;border:1px solid #263244;margin-bottom:12px;padding:0 16px;color:#a8b3c7;display:flex;align-items:center}
.price{font-size:48px;font-weight:900;margin:12px 0}.features{display:grid;gap:10px;margin:22px 0;color:#cbd5e1}
button{width:100%;height:48px;border:0;border-radius:14px;background:#f97316;color:#111827;font-weight:900;font-size:16px}
</style>
</head>
<body>
<main class="card">
<div class="mark">${isLogin ? "CF" : isPricing ? "$" : "N"}</div>
<h1>${title}</h1>
<p class="muted">${subtitle}</p>
${isLogin ? '<div class="field">email@example.com</div><div class="field">password</div>' : isPricing ? '<div class="price">$19</div><div class="features"><span>Unlimited projects</span><span>Live previews</span><span>Team sharing</span></div>' : '<div class="features"><span>Clean components</span><span>Responsive layouts</span><span>Instant previews</span></div>'}
<button>${isLogin ? "Sign In" : isPricing ? "Subscribe" : "Get Started"}</button>
</main>
</body>
</html>`;
}

function mediumTemplate(archetype) {
  const isPortfolio = archetype.toLowerCase().includes("portfolio");
  const heading = isPortfolio ? "Ava Morgan" : "Launch Better Products";

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
body{margin:0;padding:0;font-family:system-ui,sans-serif;background:#0f172a;color:white;min-height:100vh}
nav{height:72px;display:flex;align-items:center;justify-content:space-between;padding:0 54px;border-bottom:1px solid #223047}
.logo{font-weight:900;font-size:22px}.links{display:flex;gap:26px;color:#a8b3c7}.cta{background:#22c55e;color:#052e16;padding:12px 18px;border-radius:12px;font-weight:900}
.hero{padding:54px;display:grid;grid-template-columns:1.1fr .9fr;gap:38px;align-items:center}
h1{font-size:56px;line-height:1;margin:0 0 18px}.lead{font-size:20px;line-height:1.55;color:#cbd5e1;margin:0 0 28px}
.panel{height:300px;border-radius:26px;background:linear-gradient(135deg,#1f2937,#0ea5e9);padding:24px;display:grid;grid-template-columns:repeat(2,1fr);gap:16px}
.tile{border-radius:18px;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.22);padding:18px}.tile b{display:block;font-size:28px;margin-bottom:8px}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;padding:0 54px 46px}.feature{background:#111827;border:1px solid #263244;border-radius:18px;padding:22px}.feature h3{margin:0 0 8px}
</style>
</head>
<body>
<nav><div class="logo">${isPortfolio ? "AM" : "Pulse"}</div><div class="links"><span>Work</span><span>Services</span><span>Contact</span></div><div class="cta">Start</div></nav>
<section class="hero"><div><h1>${heading}</h1><p class="lead">${isPortfolio ? "Product designer crafting polished web experiences for ambitious teams." : "A crisp SaaS landing page with focused messaging, useful metrics, and bright calls to action."}</p><div class="cta" style="display:inline-block">Explore Now</div></div><div class="panel"><div class="tile"><b>42</b>Projects</div><div class="tile"><b>98%</b>Quality</div><div class="tile"><b>12k</b>Users</div><div class="tile"><b>24/7</b>Support</div></div></section>
<section class="grid"><div class="feature"><h3>Fast</h3><p>Optimized workflows with quick visual feedback.</p></div><div class="feature"><h3>Clear</h3><p>Readable hierarchy and structured content blocks.</p></div><div class="feature"><h3>Modern</h3><p>Balanced spacing, strong contrast, and subtle depth.</p></div></section>
</body>
</html>`;
}

function hardTemplate(archetype) {
  const isInbox = archetype.toLowerCase().includes("email");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
body{margin:0;padding:0;font-family:system-ui,sans-serif;background:#0f172a;color:white;min-height:100vh;overflow:hidden}
.app{height:100vh;display:grid;grid-template-columns:220px 1fr}.sidebar{background:#07111f;border-right:1px solid #243148;padding:24px}.brand{font-size:24px;font-weight:900;margin-bottom:32px}
.nav{display:grid;gap:12px;color:#a8b3c7}.nav span{padding:12px 14px;border-radius:12px}.nav .active{background:#1d4ed8;color:white}
.main{display:grid;grid-template-rows:76px 1fr}.top{display:flex;align-items:center;justify-content:space-between;padding:0 30px;border-bottom:1px solid #243148}.search{width:330px;height:42px;border-radius:14px;background:#111827;border:1px solid #263244;color:#94a3b8;display:flex;align-items:center;padding:0 16px}
.content{padding:24px;display:grid;grid-template-columns:${isInbox ? "290px 1fr" : "repeat(4,1fr)"};grid-auto-rows:min-content;gap:18px;overflow:hidden}
.card{background:#111827;border:1px solid #263244;border-radius:18px;padding:18px}.stat b{display:block;font-size:34px;margin-bottom:4px}.stat span,.muted{color:#a8b3c7}
.table{grid-column:1/-1}.row{display:grid;grid-template-columns:1.5fr 1fr 1fr 90px;gap:12px;padding:14px 0;border-top:1px solid #243148;color:#cbd5e1}
.mail{height:70px;border-bottom:1px solid #243148}.reader{min-height:410px}.badge{display:inline-block;background:#f97316;color:#111827;border-radius:999px;padding:5px 10px;font-weight:900}
</style>
</head>
<body>
<div class="app">
<aside class="sidebar"><div class="brand">${isInbox ? "InboxIQ" : "DashOS"}</div><div class="nav"><span class="active">Overview</span><span>Projects</span><span>Reports</span><span>Settings</span></div></aside>
<main class="main"><header class="top"><h2>${isInbox ? "Team Inbox" : "Operations Dashboard"}</h2><div class="search">Search workspace</div></header>
${isInbox ? '<section class="content"><div class="card"><div class="mail"><b>Design Review</b><p class="muted">Updated mockups ready</p></div><div class="mail"><b>Launch Plan</b><p class="muted">Checklist approved</p></div><div class="mail"><b>Customer Notes</b><p class="muted">Three follow ups</p></div></div><div class="card reader"><span class="badge">Priority</span><h1>Design Review</h1><p class="muted">The latest UI pass improves spacing, navigation density, and responsive states. Prepare comments before the afternoon review.</p></div></section>' : '<section class="content"><div class="card stat"><b>128</b><span>Tasks</span></div><div class="card stat"><b>84%</b><span>Velocity</span></div><div class="card stat"><b>19</b><span>Deploys</span></div><div class="card stat"><b>7</b><span>Risks</span></div><div class="card table"><h3>Recent Work</h3><div class="row"><b>Payment Flow</b><span>Frontend</span><span>In Review</span><span>92%</span></div><div class="row"><b>Admin Tools</b><span>Platform</span><span>Active</span><span>67%</span></div><div class="row"><b>Mobile QA</b><span>Design</span><span>Queued</span><span>31%</span></div></div></section>'}
</main>
</div>
</body>
</html>`;
}

// Submit user's code and score it against the target
export const submitChallenge = async (req, res) => {
  const { userCode, challengeId } = req.body;
  
  if (!userCode || !challengeId) {
    return res.status(400).json({ error: "Missing userCode or challengeId" });
  }

  const challenge = await getChallengeTarget(challengeId);
  if (!challenge) {
    return res.status(404).json({ error: "Challenge target was not found or has expired. Generate a new challenge." });
  }

  if (Buffer.byteLength(String(userCode), "utf8") > MAX_CHALLENGE_HTML_BYTES) {
    return res.status(413).json({ error: "Challenge submission is too large." });
  }

  try {
    const userImageBase64 = await renderHtmlToImage(userCode);
    const userImageURI = `data:image/png;base64,${userImageBase64}`;

    // Convert base64 Data URIs to Buffers
    const getBuffer = (dataUri) => Buffer.from(dataUri.split(',')[1], 'base64');
    
    const targetBuffer = getBuffer(challenge.targetImage);
    const userBuffer = getBuffer(userImageURI);

    const targetPng = PNG.sync.read(targetBuffer);
    const userPng = PNG.sync.read(userBuffer);

    const { width, height } = targetPng;
    
    // 1. Calculate Baseline Difference (Empty Background vs Target)
    // Extract background color from top-left pixel (x=0, y=0)
    const bgR = targetPng.data[0];
    const bgG = targetPng.data[1];
    const bgB = targetPng.data[2];
    const bgA = targetPng.data[3];
    
    const baselinePng = new PNG({ width, height });
    for (let i = 0; i < baselinePng.data.length; i += 4) {
      baselinePng.data[i] = bgR;
      baselinePng.data[i + 1] = bgG;
      baselinePng.data[i + 2] = bgB;
      baselinePng.data[i + 3] = bgA;
    }

    const baselineDiffPixels = pixelmatch(
      targetPng.data,
      baselinePng.data,
      null,
      width,
      height,
      { threshold: 0.1, includeAA: true }
    );

    // 2. Calculate User Difference
    const userDiffPixels = pixelmatch(
      targetPng.data,
      userPng.data,
      null,
      width,
      height,
      { threshold: 0.1, includeAA: true }
    );
    
    // Calculate score based on foreground recreation accuracy
    let pixelMatchScore = 0;
    if (baselineDiffPixels === 0) {
      pixelMatchScore = userDiffPixels === 0 ? 100 : 0;
    } else {
      pixelMatchScore = Math.max(0, 1 - (userDiffPixels / baselineDiffPixels)) * 100;
    }

    // 2. SSIM calculates structural similarity (perceived likeness)
    // Convert PNG data format to the format ssim.js expects
    const targetImageData = { data: new Uint8ClampedArray(targetPng.data), width, height };
    const userImageData = { data: new Uint8ClampedArray(userPng.data), width, height };
    const ssimResult = ssim(targetImageData, userImageData);
    
    // SSIM returns a value from -1 to 1. Convert it to a 0-100 score.
    // If it's structurally identical, it returns 1.
    const ssimScore = Math.max(0, ssimResult.mssim) * 100;

    // 3. Calculate weighted average
    // We weight SSIM slightly higher because it aligns better with human perception of layout
    // We keep Pixelmatch to penalize lazy submissions that just use a background color.
    const rawFinalScore = (pixelMatchScore * 0.3) + (ssimScore * 0.7);

    // Apply a specialized curve to bump lower/mid scores into the 70-80% range,
    // while keeping 90%+ scores relatively linear.
    // We use a cubic root curve to pull scores up aggressively.
    // A raw 30% match curves up to ~67%
    // A raw 50% match curves up to ~79%
    const curvedScore = Math.round(Math.pow(rawFinalScore / 100, 1/3) * 100);

    let feedback = "";
    if (curvedScore >= 95) feedback = "Pixel perfect! You absolutely crushed it!";
    else if (curvedScore >= 80) feedback = "Great job! A few layout differences, but very close.";
    else if (curvedScore >= 60) feedback = "You're getting there, but some styling is quite off.";
    else feedback = "Looks like a completely different page. Keep practicing!";

    res.json({
      challengeId,
      score: curvedScore,
      feedback,
      userImage: userImageURI,
      targetImage: challenge.targetImage
    });
  } catch (error) {
    console.error("Submit Challenge Error:", error);
    res.status(500).json({ error: error.message || "Failed to score challenge" });
  }
};

// Helper function to render HTML string to a base64 PNG
async function renderHtmlToImage(html) {
  let browser = null;
  try {
    const launchConfig = {
      headless: "new",
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--single-process'
      ]
    };

    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      launchConfig.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    } else {
      const localBrowserPath = findLocalBrowserExecutable();
      if (localBrowserPath) {
        launchConfig.executablePath = localBrowserPath;
      }
    }

    browser = await puppeteer.launch(launchConfig);
    const page = await browser.newPage();
    
    // Set a standard viewport size for the challenge
    await page.setViewport({ width: 800, height: 600 });
    
    // Use networkidle2 so it doesn't hang forever if the AI generated a broken external link/font
    await page.setContent(html, { 
      waitUntil: 'networkidle2',
      timeout: 25000 // Give it enough time on slow cloud instances
    });
    
    // Take screenshot as base64 string
    const screenshotBuffer = await page.screenshot({ type: 'png', encoding: 'base64' });
    return screenshotBuffer;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

function findLocalBrowserExecutable() {
  if (process.platform !== "win32") return null;

  const candidates = [
    process.env.PROGRAMFILES && `${process.env.PROGRAMFILES}\\Google\\Chrome\\Application\\chrome.exe`,
    process.env["PROGRAMFILES(X86)"] && `${process.env["PROGRAMFILES(X86)"]}\\Google\\Chrome\\Application\\chrome.exe`,
    process.env.LOCALAPPDATA && `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
    process.env.PROGRAMFILES && `${process.env.PROGRAMFILES}\\Microsoft\\Edge\\Application\\msedge.exe`,
    process.env["PROGRAMFILES(X86)"] && `${process.env["PROGRAMFILES(X86)"]}\\Microsoft\\Edge\\Application\\msedge.exe`,
  ].filter(Boolean);

  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}
