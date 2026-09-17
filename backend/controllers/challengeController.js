import fs from 'fs';
import crypto from 'crypto';
import puppeteer from 'puppeteer';
import { PNG } from 'pngjs';
import { challengeStore, validateChallengeFiles, withChallengeLock } from '../services/challengeStore.js';
import { compareChallengeImages } from '../services/challengeScoring.js';
import { challengeCatalog, curatedChallengeHtml } from '../data/challengeCatalog.js';
import { buildPreview, withChallengePolicy } from '../../shared/projectPreview.js';

const getGroqKey = () => process.env.GROQ_API_KEY;
const getGroqModel = () => process.env.GROQ_MODEL || "openai/gpt-oss-20b";
const challengeTargets = new Map();

const CHALLENGE_TTL_MS = 0; // Durable practice targets.
const MAX_CHALLENGE_TARGETS = Number(process.env.MAX_CHALLENGE_TARGETS || 250);
const MAX_CHALLENGE_HTML_BYTES = Number(process.env.MAX_CHALLENGE_HTML_BYTES || 300_000);
const GROQ_CHALLENGE_TIMEOUT_MS = Number(process.env.GROQ_CHALLENGE_TIMEOUT_MS || 6000);
const GROQ_CHALLENGE_COOLDOWN_MS = Number(process.env.GROQ_CHALLENGE_COOLDOWN_MS || 30000);
const GROQ_CHALLENGE_MAX_TOKENS = Number(process.env.GROQ_CHALLENGE_MAX_TOKENS || 1400);
const CHALLENGE_VIEWPORT_WIDTH = 800;
const CHALLENGE_VIEWPORT_HEIGHT = 600;
const MAX_CHALLENGE_CAPTURE_HEIGHT = Number(process.env.MAX_CHALLENGE_CAPTURE_HEIGHT || 2000);
let rendererBrowserPromise = null;
let groqChallengeCooldownUntil = 0;

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

export function warmChallengeRenderer() {
  return getRendererBrowser().then(() => true);
}

export async function closeChallengeRenderer() {
  if (!rendererBrowserPromise) return;
  const browserPromise = rendererBrowserPromise;
  rendererBrowserPromise = null;
  const browser = await browserPromise.catch(() => null);
  await browser?.close().catch(() => {});
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
  const curated = req.body.templateId ? challengeCatalog.find(item => item.id === req.body.templateId) : null;
  if (req.body.templateId && !curated) return res.status(400).json({ error: 'Unknown curated challenge.' });
  const difficulty = curated?.difficulty || req.body.difficulty || 'easy';

  // Fallback to 'easy' if difficulty is invalid
  const requestedDifficulty = String(difficulty || 'easy').toLowerCase();
  const diffLevel = pageArchetypes[requestedDifficulty] ? requestedDifficulty : 'easy';
  const archetypes = pageArchetypes[diffLevel];
  const randomArchetype = curated?.title || archetypes[Math.floor(Math.random() * archetypes.length)];

  const prompt = `You are an expert product designer and frontend engineer. Create a polished, modern UI target for a frontend recreation challenge.
Difficulty Level: ${diffLevel.toUpperCase()}.

Website Type to Generate: ${randomArchetype}

Requirements:
1. ONLY return the raw HTML file. NO markdown formatting, NO backticks. Start with <!DOCTYPE html>.
2. Embed all CSS in a <style> block.
3. You may include a small inline <script> only for harmless UI state such as toggles, active tabs, counters, or button labels. The visible design must still look complete if JavaScript is disabled.
4. The layout MUST fill the screen. Use 'body { margin: 0; padding: 0; font-family: system-ui, sans-serif; background: #0f172a; color: white; min-height: 100vh; }'.
5. CRITICAL RULE: YOU ARE STRICTLY FORBIDDEN FROM USING THE <img> TAG or CSS url() functions! DO NOT USE IMAGES. If you need a logo, avatar, illustration, icon, chart, or product thumbnail, build it with CSS shapes, gradients, text initials, emoji, badges, bars, dots, and simple HTML elements. ANY use of external image URLs will break the system.
6. Do NOT generate a plain box-and-text layout. The target must feel like a real product screen with thoughtful composition, strong spacing, visual hierarchy, and tasteful details.
7. Use varied colors and surfaces: include at least 4 accent colors and avoid making the whole UI blue. Mix warm and cool colors such as coral, amber, emerald, cyan, violet, pink, lime, and slate neutrals.
8. Add realistic UI details such as nav items, stat cards, avatars, tags, progress bars, filters, timeline rows, chart bars, notification dots, pricing features, form states, or product metadata when they fit the Website Type.
9. Difficulty guidance:
   - EASY: one focused polished screen with 2-4 well-designed components; simple but not empty.
   - MEDIUM: multiple sections/cards with clear hierarchy, richer color combinations, and responsive grids.
   - HARD: complex app-like interface with sidebar/header or multi-column layout, dense but readable data, charts/lists/tables, and layered component states.
10. Use gradients, patterned CSS backgrounds, borders, shadows, glass/solid contrast, colorful pills, and creative card shapes where appropriate.
11. The design must fit beautifully within an 800x600 window with no important content clipped.
12. Keep the HTML concise enough to render quickly.`;

  try {
    let htmlCode = curated ? curatedChallengeHtml(curated.id) : await createChallengeHtml(prompt, diffLevel, randomArchetype);

    // Render HTML to Image using Puppeteer
    let base64Image = await renderHtmlToImage(htmlCode);
    const qualityReport = analyzeChallengeImage(base64Image);
    if (!curated && !qualityReport.acceptable) {
      console.warn("Generated challenge target was too sparse. Using local challenge template.", qualityReport);
      htmlCode = generateLocalChallengeHtml(diffLevel, randomArchetype);
      base64Image = await renderHtmlToImage(htmlCode);
    }

    const challenge = await storeChallengeTarget({
      difficulty: diffLevel,
      archetype: randomArchetype,
      htmlCode,
      ownerId: req.firebaseUser?.uid || null,
      skill: curated?.skill || 'Mixed layout',
      targetImage: `data:image/png;base64,${base64Image}`
    });

    if (req.firebaseUser?.uid) {
      await challengeStore.set('challengeDrafts', challenge.id, { id: challenge.id, challengeId: challenge.id, ownerId: req.firebaseUser.uid, title: randomArchetype, difficulty: diffLevel, skill: challenge.skill, files: [{ name: 'index.html', language: 'html', code: '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><main></main></body></html>' }, { name: 'styles.css', language: 'css', code: 'body { margin: 0; font-family: system-ui, sans-serif; }' }], updatedAt: Date.now(), bestScore: null, history: [] });
    }
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

async function storeChallengeTarget(challenge) {
  const id = crypto.randomUUID();
  const saved = { ...challenge, id, expiresAt: null };
  const { targetImage: _image, ...durable } = saved;
  await challengeStore.set('challengeTargets', id, durable);
  challengeTargets.set(id, saved);
  while (challengeTargets.size > MAX_CHALLENGE_TARGETS) challengeTargets.delete(challengeTargets.keys().next().value);
  return saved;
}
async function getChallengeTarget(challengeId) {
  const id = String(challengeId || '').trim();
  if (!id) return null;
  if (challengeTargets.has(id)) return challengeTargets.get(id);
  const saved = await challengeStore.get('challengeTargets', id);
  if (!saved) return null;
  if (!saved.targetImage && saved.htmlCode) saved.targetImage = 'data:image/png;base64,' + await renderHtmlToImage(saved.htmlCode);
  return saved;
}
export async function getSavedChallenge(req, res) {
  const challenge = await getChallengeTarget(req.params.id);
  if (!challenge || challenge.ownerId !== req.firebaseUser.uid) return res.status(404).json({ error: 'Challenge not found.' });
  const mobileImage = 'data:image/png;base64,' + await renderHtmlToImage(challenge.htmlCode, 375);
  res.json({ challengeId: challenge.id, difficulty: challenge.difficulty, targetImage: challenge.targetImage, mobileImage, expiresAt: null });
}

async function createChallengeHtml(prompt, difficulty, archetype) {
  const groqKey = getGroqKey();

  if (!groqKey) {
    console.warn("GROQ_API_KEY is not configured. Using local challenge template.");
    return generateLocalChallengeHtml(difficulty, archetype);
  }

  if (Date.now() < groqChallengeCooldownUntil) {
    return generateLocalChallengeHtml(difficulty, archetype);
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), GROQ_CHALLENGE_TIMEOUT_MS);
    let groqRes;
    try {
      groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${groqKey}`
        },
        body: JSON.stringify({
          model: getGroqModel(),
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
          max_completion_tokens: GROQ_CHALLENGE_MAX_TOKENS
        })
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!groqRes.ok) {
      if (groqRes.status === 429) {
        groqChallengeCooldownUntil = Date.now() + GROQ_CHALLENGE_COOLDOWN_MS;
      }
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
    groqChallengeCooldownUntil = Date.now() + GROQ_CHALLENGE_COOLDOWN_MS;
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
  const title = isLogin ? "Welcome Back" : isPricing ? "Creator Pass" : "Bloom Studio";
  const subtitle = isLogin ? "Sign in to continue building bright ideas." : isPricing ? "Everything you need to launch faster." : "Plan, design, and ship joyful web experiences.";

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
body{margin:0;padding:0;font-family:system-ui,sans-serif;background:radial-gradient(circle at 18% 18%,#ff7a59 0 12%,transparent 28%),radial-gradient(circle at 88% 14%,#22c55e 0 10%,transparent 25%),linear-gradient(135deg,#24133f,#0f172a 55%,#082f49);color:white;min-height:100vh;display:grid;place-items:center}
.card{width:390px;background:rgba(17,24,39,.86);border:1px solid rgba(255,255,255,.18);border-radius:28px;padding:26px;box-shadow:0 30px 90px rgba(0,0,0,.45),inset 0 1px rgba(255,255,255,.16);position:relative;overflow:hidden}
.card:before{content:"";position:absolute;inset:0 0 auto;height:8px;background:linear-gradient(90deg,#fb7185,#f59e0b,#22c55e,#38bdf8,#a78bfa)}
.top{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px}.mark{width:60px;height:60px;border-radius:20px;background:linear-gradient(135deg,#fbbf24,#fb7185);color:#20111f;display:grid;place-items:center;font-weight:900;font-size:24px;box-shadow:0 12px 30px rgba(251,113,133,.35)}
.pill{border:1px solid rgba(255,255,255,.2);background:rgba(34,197,94,.14);color:#86efac;border-radius:999px;padding:7px 12px;font-size:12px;font-weight:800}
h1{margin:0 0 8px;font-size:34px}.muted{margin:0 0 22px;color:#dbeafe;line-height:1.5}
.field{height:46px;border-radius:16px;background:rgba(8,13,28,.8);border:1px solid rgba(56,189,248,.35);margin-bottom:12px;padding:0 16px;color:#c7d2fe;display:flex;align-items:center;justify-content:space-between}
.price{font-size:52px;font-weight:950;margin:8px 0}.features{display:grid;gap:10px;margin:20px 0;color:#e2e8f0}.features span{display:flex;gap:10px;align-items:center}.features span:before{content:"";width:9px;height:9px;border-radius:50%;background:#34d399;box-shadow:16px 0 #f59e0b}
.meter{height:10px;border-radius:999px;background:#1f2937;overflow:hidden;margin:18px 0}.meter div{width:72%;height:100%;background:linear-gradient(90deg,#22c55e,#38bdf8,#a78bfa)}
button{width:100%;height:50px;border:0;border-radius:16px;background:linear-gradient(90deg,#fb7185,#f97316,#facc15);color:#1f1300;font-weight:950;font-size:16px;box-shadow:0 14px 28px rgba(249,115,22,.28)}
</style>
</head>
<body>
<main class="card">
<div class="top"><div class="mark">${isLogin ? "CF" : isPricing ? "$" : "B"}</div><div class="pill">${isLogin ? "Secure" : isPricing ? "Popular" : "Live"}</div></div>
<h1>${title}</h1>
<p class="muted">${subtitle}</p>
${isLogin ? '<div class="field">email@example.com</div><div class="field">password</div>' : isPricing ? '<div class="price">$19</div><div class="features"><span>Unlimited projects</span><span>Live previews</span><span>Team sharing</span></div>' : '<div class="features"><span>Clean components</span><span>Responsive layouts</span><span>Instant previews</span></div>'}
<div class="meter"><div></div></div>
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
body{margin:0;padding:0;font-family:system-ui,sans-serif;background:linear-gradient(120deg,#111827,#312e81 48%,#064e3b);color:white;min-height:100vh;overflow:hidden}
nav{height:70px;display:flex;align-items:center;justify-content:space-between;padding:0 46px;border-bottom:1px solid rgba(255,255,255,.14);background:rgba(10,15,31,.5)}
.logo{font-weight:950;font-size:22px}.logo span{color:#fbbf24}.links{display:flex;gap:22px;color:#d8b4fe;font-weight:700}.cta{background:linear-gradient(90deg,#34d399,#facc15);color:#092014;padding:11px 18px;border-radius:14px;font-weight:950}
.hero{padding:36px 46px 22px;display:grid;grid-template-columns:1.05fr .95fr;gap:28px;align-items:center}
h1{font-size:50px;line-height:1;margin:0 0 16px}.lead{font-size:18px;line-height:1.5;color:#e0f2fe;margin:0 0 22px}
.tags{display:flex;gap:10px;flex-wrap:wrap}.tag{padding:8px 12px;border-radius:999px;font-weight:800;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.16)}.tag:nth-child(1){color:#fda4af}.tag:nth-child(2){color:#fde68a}.tag:nth-child(3){color:#86efac}
.panel{height:282px;border-radius:28px;background:linear-gradient(135deg,#fb7185,#f97316 34%,#22c55e 68%,#38bdf8);padding:18px;display:grid;grid-template-columns:repeat(2,1fr);gap:14px;box-shadow:0 30px 80px rgba(0,0,0,.35)}
.tile{border-radius:20px;background:rgba(12,18,35,.72);border:1px solid rgba(255,255,255,.25);padding:16px;box-shadow:inset 0 1px rgba(255,255,255,.12)}.tile b{display:block;font-size:30px;margin-bottom:6px}.bar{height:8px;border-radius:999px;background:#1e293b;margin-top:12px;overflow:hidden}.bar div{height:100%;background:linear-gradient(90deg,#facc15,#34d399);width:76%}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;padding:0 46px 34px}.feature{background:rgba(15,23,42,.78);border:1px solid rgba(255,255,255,.16);border-radius:20px;padding:18px;position:relative;overflow:hidden}.feature:before{content:"";position:absolute;right:-18px;top:-18px;width:58px;height:58px;border-radius:20px;background:#a78bfa;opacity:.35}.feature:nth-child(2):before{background:#34d399}.feature:nth-child(3):before{background:#fb7185}.feature h3{margin:0 0 8px}
</style>
</head>
<body>
<nav><div class="logo">${isPortfolio ? "Ava<span>.</span>" : "Pulse<span>Lab</span>"}</div><div class="links"><span>Work</span><span>Services</span><span>Contact</span></div><div class="cta">Start</div></nav>
<section class="hero"><div><h1>${heading}</h1><p class="lead">${isPortfolio ? "Product designer crafting polished web experiences for ambitious teams." : "A crisp SaaS landing page with focused messaging, useful metrics, and bright calls to action."}</p><div class="tags"><span class="tag">Brand</span><span class="tag">Motion</span><span class="tag">Web UI</span></div></div><div class="panel"><div class="tile"><b>42</b>Projects<div class="bar"><div></div></div></div><div class="tile"><b>98%</b>Quality<div class="bar"><div></div></div></div><div class="tile"><b>12k</b>Users<div class="bar"><div></div></div></div><div class="tile"><b>24/7</b>Support<div class="bar"><div></div></div></div></div></section>
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
.app{height:100vh;display:grid;grid-template-columns:214px 1fr;background:radial-gradient(circle at 70% 8%,rgba(251,191,36,.28),transparent 26%),radial-gradient(circle at 96% 78%,rgba(34,197,94,.22),transparent 24%),#0f172a}
.sidebar{background:linear-gradient(180deg,#2e1065,#111827 58%,#042f2e);border-right:1px solid rgba(255,255,255,.14);padding:22px}.brand{font-size:24px;font-weight:950;margin-bottom:28px}.brand b{color:#facc15}
.nav{display:grid;gap:10px;color:#ddd6fe}.nav span{padding:11px 13px;border-radius:14px;border:1px solid transparent}.nav .active{background:linear-gradient(90deg,#fb7185,#f97316);color:#1f1300;font-weight:950}.nav span:not(.active){background:rgba(255,255,255,.06)}
.mini{margin-top:28px;border-radius:18px;background:rgba(34,197,94,.12);border:1px solid rgba(52,211,153,.35);padding:14px;color:#bbf7d0}
.main{display:grid;grid-template-rows:72px 1fr}.top{display:flex;align-items:center;justify-content:space-between;padding:0 26px;border-bottom:1px solid rgba(255,255,255,.12);background:rgba(15,23,42,.7)}.search{width:310px;height:40px;border-radius:14px;background:#111827;border:1px solid rgba(56,189,248,.32);color:#bae6fd;display:flex;align-items:center;padding:0 16px}.avatar{width:38px;height:38px;border-radius:14px;background:linear-gradient(135deg,#34d399,#38bdf8);display:grid;place-items:center;color:#062018;font-weight:950}
.content{padding:22px;display:grid;grid-template-columns:${isInbox ? "280px 1fr" : "repeat(4,1fr)"};grid-auto-rows:min-content;gap:16px;overflow:hidden}
.card{background:rgba(17,24,39,.82);border:1px solid rgba(255,255,255,.14);border-radius:20px;padding:16px;box-shadow:0 18px 48px rgba(0,0,0,.25)}.stat b{display:block;font-size:32px;margin-bottom:3px}.stat span,.muted{color:#cbd5e1}.stat:nth-child(1){border-color:#fb7185}.stat:nth-child(2){border-color:#facc15}.stat:nth-child(3){border-color:#34d399}.stat:nth-child(4){border-color:#38bdf8}
.spark{height:44px;display:flex;align-items:end;gap:6px;margin-top:14px}.spark i{flex:1;border-radius:8px 8px 0 0;background:linear-gradient(#a78bfa,#38bdf8)}.spark i:nth-child(2){height:80%;background:linear-gradient(#facc15,#fb7185)}.spark i:nth-child(3){height:55%;background:linear-gradient(#34d399,#22c55e)}.spark i:nth-child(4){height:92%}
.table{grid-column:1/-1}.row{display:grid;grid-template-columns:1.5fr 1fr 1fr 90px;gap:12px;padding:12px 0;border-top:1px solid rgba(255,255,255,.12);color:#e2e8f0}.status{border-radius:999px;padding:5px 9px;background:#fef3c7;color:#78350f;font-weight:900;text-align:center}
.mail{height:68px;border-bottom:1px solid rgba(255,255,255,.12);display:grid;align-content:center}.mail:nth-child(2){color:#fde68a}.mail:nth-child(3){color:#bbf7d0}.reader{min-height:390px;background:linear-gradient(145deg,rgba(17,24,39,.88),rgba(49,46,129,.72))}.badge{display:inline-block;background:linear-gradient(90deg,#facc15,#fb7185);color:#1f1300;border-radius:999px;padding:5px 10px;font-weight:950}
</style>
</head>
<body>
<div class="app">
<aside class="sidebar"><div class="brand">${isInbox ? "Inbox<b>IQ</b>" : "Dash<b>OS</b>"}</div><div class="nav"><span class="active">Overview</span><span>Projects</span><span>Reports</span><span>Settings</span></div><div class="mini"><b>Live pulse</b><br>Creative work up 28%</div></aside>
<main class="main"><header class="top"><h2>${isInbox ? "Team Inbox" : "Operations Dashboard"}</h2><div style="display:flex;gap:14px;align-items:center"><div class="search">Search workspace</div><div class="avatar">RS</div></div></header>
${isInbox ? '<section class="content"><div class="card"><div class="mail"><b>Design Review</b><p class="muted">Updated mockups ready</p></div><div class="mail"><b>Launch Plan</b><p class="muted">Checklist approved</p></div><div class="mail"><b>Customer Notes</b><p class="muted">Three follow ups</p></div></div><div class="card reader"><span class="badge">Priority</span><h1>Design Review</h1><p class="muted">The latest UI pass improves spacing, navigation density, and responsive states. Prepare comments before the afternoon review.</p><div class="spark"><i style="height:35%"></i><i></i><i></i><i></i><i style="height:68%;background:linear-gradient(#fb7185,#f97316)"></i></div></div></section>' : '<section class="content"><div class="card stat"><b>128</b><span>Tasks</span><div class="spark"><i style="height:38%"></i><i></i><i></i><i></i></div></div><div class="card stat"><b>84%</b><span>Velocity</span><div class="spark"><i style="height:56%"></i><i></i><i></i><i></i></div></div><div class="card stat"><b>19</b><span>Deploys</span><div class="spark"><i style="height:48%"></i><i></i><i></i><i></i></div></div><div class="card stat"><b>7</b><span>Risks</span><div class="spark"><i style="height:64%"></i><i></i><i></i><i></i></div></div><div class="card table"><h3>Recent Work</h3><div class="row"><b>Payment Flow</b><span>Frontend</span><span class="status">Review</span><span>92%</span></div><div class="row"><b>Admin Tools</b><span>Platform</span><span class="status">Active</span><span>67%</span></div><div class="row"><b>Mobile QA</b><span>Design</span><span class="status">Queued</span><span>31%</span></div></div></section>'}
</main>
</div>
</body>
</html>`;
}

// Submit user's code and score it against the target
export const submitChallenge = async (req, res) => {
  const { challengeId } = req.body;
  let userCode = req.body.userCode;
  let submittedFiles;
  if (req.body.files) {
    try { submittedFiles = validateChallengeFiles(req.body.files); userCode = buildPreview(submittedFiles, req.body.entryFile); }
    catch (error) { return res.status(400).json({ error: error.message }); }
  }
  if (!userCode || !challengeId) return res.status(400).json({ error: 'Missing userCode or challengeId' });
  if (typeof userCode !== 'string' || Buffer.byteLength(userCode, 'utf8') > MAX_CHALLENGE_HTML_BYTES) return res.status(413).json({ error: 'Challenge submission is too large.' });
  try {
    const challenge = await getChallengeTarget(challengeId);
    if (!challenge) return res.status(404).json({ error: 'Challenge target was not found or has expired. Generate a new challenge.' });
    if (challenge.ownerId && challenge.ownerId !== req.firebaseUser?.uid) return res.status(403).json({ error: 'This challenge belongs to another account.' });
    const reports = [];
    for (const width of [800, 375]) {
      const target = width === 800 ? challenge.targetImage : 'data:image/png;base64,' + await renderHtmlToImage(challenge.htmlCode, width);
      const submitted = 'data:image/png;base64,' + await renderHtmlToImage(userCode, width);
      reports.push({ width, targetImage: target, userImage: submitted, ...compareChallengeImages(target, submitted, normalizeComparisonPngs) });
    }
    const score = Math.round(reports.reduce((sum, report) => sum + report.score, 0) / reports.length);
    const feedback = score >= 99 ? 'Near-identical at both tested widths.' : 'Compare the highlighted differences at desktop and mobile widths.';
    const response = { challengeId, score, feedback, reports, userImage: reports[0].userImage, targetImage: reports[0].targetImage, scoreDetails: { formula: '50% foreground pixel accuracy + 50% structural similarity, averaged across 800px and 375px viewports.' } };
    if (req.firebaseUser?.uid) {
      const submittedAt = Date.now();
      const files = submittedFiles || [{ name: 'index.html', language: 'html', code: userCode }];
      const attemptId = crypto.randomUUID();
      await challengeStore.set('challengeAttempts', attemptId, { id: attemptId, ownerId: req.firebaseUser.uid, challengeId, files, score, submittedAt });
      await withChallengeLock(challengeId, async () => {
        const draft = await challengeStore.get('challengeDrafts', challengeId);
        if (draft?.ownerId === req.firebaseUser.uid) {
          await challengeStore.set('challengeDrafts', challengeId, { ...draft, bestScore: Math.max(draft.bestScore || 0, score), updatedAt: submittedAt, history: [...(draft.history || []), { id: attemptId, score, submittedAt }].slice(-30) });
        }
      });
      response.attemptId = attemptId;
    }
    res.json(response);
  } catch (error) { console.error('Challenge submission failed:', error.message); res.status(500).json({ error: error.message || 'Failed to score challenge' }); }
};
function normalizeComparisonPngs(targetPng, userPng) {
  const width = Math.max(targetPng.width, userPng.width);
  const height = Math.max(targetPng.height, userPng.height);

  if (targetPng.width === width && targetPng.height === height && userPng.width === width && userPng.height === height) {
    return { targetPng, userPng };
  }

  return {
    targetPng: padPngToSize(targetPng, width, height),
    userPng: padPngToSize(userPng, width, height)
  };
}

function padPngToSize(sourcePng, width, height) {
  const output = new PNG({ width, height });
  const background = [
    sourcePng.data[0] ?? 15,
    sourcePng.data[1] ?? 23,
    sourcePng.data[2] ?? 42,
    sourcePng.data[3] ?? 255
  ];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (width * y + x) << 2;
      output.data[index] = background[0];
      output.data[index + 1] = background[1];
      output.data[index + 2] = background[2];
      output.data[index + 3] = background[3];
    }
  }

  for (let y = 0; y < sourcePng.height; y += 1) {
    for (let x = 0; x < sourcePng.width; x += 1) {
      const sourceIndex = (sourcePng.width * y + x) << 2;
      const outputIndex = (width * y + x) << 2;
      output.data[outputIndex] = sourcePng.data[sourceIndex];
      output.data[outputIndex + 1] = sourcePng.data[sourceIndex + 1];
      output.data[outputIndex + 2] = sourcePng.data[sourceIndex + 2];
      output.data[outputIndex + 3] = sourcePng.data[sourceIndex + 3];
    }
  }

  return output;
}

function analyzeChallengeImage(base64Image) {
  try {
    const png = PNG.sync.read(Buffer.from(base64Image, "base64"));
    const background = [
      png.data[0],
      png.data[1],
      png.data[2]
    ];
    const colorBuckets = new Set();
    const saturatedBuckets = new Set();
    let foregroundSamples = 0;
    let samples = 0;

    for (let y = 0; y < png.height; y += 8) {
      for (let x = 0; x < png.width; x += 8) {
        const index = (png.width * y + x) << 2;
        const red = png.data[index];
        const green = png.data[index + 1];
        const blue = png.data[index + 2];
        const diff = Math.hypot(red - background[0], green - background[1], blue - background[2]);
        const max = Math.max(red, green, blue);
        const min = Math.min(red, green, blue);

        samples += 1;
        if (diff > 28) foregroundSamples += 1;
        colorBuckets.add(`${Math.round(red / 32)},${Math.round(green / 32)},${Math.round(blue / 32)}`);
        if (max - min > 45 && max > 90) {
          saturatedBuckets.add(`${Math.round(red / 48)},${Math.round(green / 48)},${Math.round(blue / 48)}`);
        }
      }
    }

    const foregroundRatio = samples ? foregroundSamples / samples : 0;
    const acceptable = foregroundRatio >= 0.12 && colorBuckets.size >= 16 && saturatedBuckets.size >= 3;

    return {
      acceptable,
      foregroundRatio: Number(foregroundRatio.toFixed(3)),
      colorBuckets: colorBuckets.size,
      saturatedBuckets: saturatedBuckets.size
    };
  } catch (error) {
    return {
      acceptable: false,
      error: error.message
    };
  }
}

// Helper function to render HTML string to a base64 PNG
export async function renderHtmlToImage(html, viewportWidth = CHALLENGE_VIEWPORT_WIDTH, compactSection = false) {
  const browser = await getRendererBrowser();
  const page = await browser.newPage();
  try {
    await page.setJavaScriptEnabled(false);
    await page.setRequestInterception(true);
    page.on("request", (request) => {
      const url = request.url();
      const shouldBlock = /^(https?|file):/i.test(url) || request.resourceType() === 'image';
      if (shouldBlock) {
        request.abort();
      } else {
        request.continue();
      }
    });

    // Set a standard viewport size for layout, then capture the full document height.
    await page.setViewport({ width: viewportWidth, height: CHALLENGE_VIEWPORT_HEIGHT });

    // Wait for DOM readiness only; external requests are blocked for challenge safety.
    await page.setContent(withChallengePolicy(html), {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });

    const documentHeight = await page.evaluate((compact) => {
      const body = document.body;
      if (compact && body) {
        const bottomMargin = Number.parseFloat(document.defaultView.getComputedStyle(body).marginBottom) || 0;
        return Math.max(1, body.getBoundingClientRect().bottom + bottomMargin, body.scrollHeight);
      }
      const element = document.documentElement;
      return Math.max(
        body?.scrollHeight || 0,
        body?.offsetHeight || 0,
        element?.clientHeight || 0,
        element?.scrollHeight || 0,
        element?.offsetHeight || 0
      );
    }, compactSection);
    const captureHeight = Math.min(
      Math.max(compactSection ? 1 : CHALLENGE_VIEWPORT_HEIGHT, Math.ceil(documentHeight || CHALLENGE_VIEWPORT_HEIGHT)),
      MAX_CHALLENGE_CAPTURE_HEIGHT
    );

    // Take screenshot as base64 string
    const screenshotBuffer = await page.screenshot({
      type: 'png',
      encoding: 'base64',
      captureBeyondViewport: true,
      clip: {
        x: 0,
        y: 0,
        width: viewportWidth,
        height: captureHeight
      }
    });
    return screenshotBuffer;
  } finally {
    await page.close().catch(() => {});
  }
}

async function getRendererBrowser() {
  if (!rendererBrowserPromise) {
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

    rendererBrowserPromise = puppeteer.launch(launchConfig).then((browser) => {
      browser.on("disconnected", () => {
        rendererBrowserPromise = null;
      });
      return browser;
    }).catch((error) => {
      rendererBrowserPromise = null;
      throw error;
    });
  }

  return rendererBrowserPromise;
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

export const __challengeInternals = {
  renderHtmlToImage,
  normalizeComparisonPngs,
  closeChallengeRenderer
};
