import puppeteer from 'puppeteer';
import pixelmatch from 'pixelmatch';
import { ssim } from 'ssim.js';
import { PNG } from 'pngjs';

const getGroqKey = () => process.env.GROQ_API_KEY;

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
  
  if (!getGroqKey()) {
    return res.status(500).json({ error: "GROQ_API_KEY is not configured on the server." });
  }

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
    // 1. Ask Groq to generate HTML/CSS
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getGroqKey()}`
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      })
    });

    if (!groqRes.ok) throw new Error("Groq text generation failed");
    
    const groqData = await groqRes.json();
    let htmlCode = groqData.choices?.[0]?.message?.content || "";
    
    // Clean up markdown code blocks if the AI disobeyed
    if (htmlCode.startsWith("\`\`\`html")) {
      htmlCode = htmlCode.replace(/\`\`\`html/g, "").replace(/\`\`\`/g, "").trim();
    } else if (htmlCode.startsWith("\`\`\`")) {
      htmlCode = htmlCode.replace(/\`\`\`/g, "").trim();
    }

    // 2. Render HTML to Image using Puppeteer
    const base64Image = await renderHtmlToImage(htmlCode);

    res.json({
      targetImage: `data:image/png;base64,${base64Image}`
    });
  } catch (error) {
    console.error("Generate Challenge Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate challenge" });
  }
};

// Submit user's code and score it against the target
export const submitChallenge = async (req, res) => {
  const { userCode, targetImage } = req.body;
  
  if (!userCode || !targetImage) {
    return res.status(400).json({ error: "Missing userCode or targetImage" });
  }

  try {
    const userImageBase64 = await renderHtmlToImage(userCode);
    const userImageURI = `data:image/png;base64,${userImageBase64}`;

    // Convert base64 Data URIs to Buffers
    const getBuffer = (dataUri) => Buffer.from(dataUri.split(',')[1], 'base64');
    
    const targetBuffer = getBuffer(targetImage);
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
      score: curvedScore,
      feedback,
      userImage: userImageURI
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
