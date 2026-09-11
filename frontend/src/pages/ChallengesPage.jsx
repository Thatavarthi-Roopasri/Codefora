import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import {
  ArrowDownUp,
  CheckCircle2,
  CircleX,
  Database,
  Filter,
  GitBranch,
  Info,
  List,
  LayoutGrid,
  Loader2,
  PanelsTopLeft,
  Play,
  Route,
  ShieldCheck,
  Sparkles,
  Users
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { api } from "../api/client";
import { saveHostToken, saveInviteCode, saveUsername } from "../lib/navigation";

function capitalize(value) {
  return String(value || "").charAt(0).toUpperCase() + String(value || "").slice(1);
}

export function ChallengesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [difficulty, setDifficulty] = useState("easy");
  const [relayMode, setRelayMode] = useState("frontend");
  const [relayTeamSize] = useState(4);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isStartingRelay, setIsStartingRelay] = useState(false);
  const [isStartingBackendRelay, setIsStartingBackendRelay] = useState(false);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [viewMode, setViewMode] = useState("grid");
  const [activeInfoPanel, setActiveInfoPanel] = useState(null);
  const relayContent = relayMode === "frontend"
    ? {
      title: "Frontend Relay",
      description: "Divide a UI into sections, build in parallel, help teammates, and polish one responsive product.",
      features: [
        [PanelsTopLeft, "UI breakdown"],
        [Users, "Section ownership"],
        [GitBranch, "Help and relay"],
        [CheckCircle2, "Responsive polish"]
      ]
    }
    : {
      title: "Backend Relay",
      description: "Own a service, connect APIs, debug together, and ship one reliable backend system.",
      features: [
        [Route, "API contracts"],
        [Database, "Database layer"],
        [ShieldCheck, "Auth + security"],
        [CheckCircle2, "Tests + reliability"]
      ]
    };
  const statusOptions = [
    ["all", "All Status"],
    ["available", "Always available"],
    ["team", "Team mode"]
  ];
  const sortOptions = [
    ["newest", "Newest"],
    ["type", "Challenge type"],
    ["team", "Team first"]
  ];
  const challengeOrder = sortBy === "team" ? ["relay", "random"] : ["random", "relay"];
  const visibleChallengeIds = challengeOrder.filter((id) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "available") return id === "random";
    if (statusFilter === "team") return id === "relay";
    return true;
  });


  const infoContent = activeInfoPanel === "random"
    ? {
      title: "Random Frontend Challenge",
      text: "This is for practicing frontend accuracy. Codefora generates a fresh UI target, then you recreate it with HTML and CSS. Choose Easy, Medium, or Hard, start the challenge, and focus on matching layout, spacing, colors, and responsiveness."
    }
    : activeInfoPanel === "relay"
      ? {
        title: relayMode === "frontend" ? "Frontend Relay" : "Backend Relay",
        text: relayMode === "frontend"
          ? "This is for team frontend practice. Codefora creates a private room where teammates divide sections, build together, help each other, and finish by polishing responsiveness and visual consistency."
          : "This is for team backend practice. Codefora creates a private room where teammates divide services, connect APIs, review each other's work, debug together, and finish with testing, security, and reliability checks."
      }
      : null;

  const startChallenge = async () => {
    if (!user) {
      navigate("/");
      return;
    }

    const displayName = user.displayName || user.username || user.email?.split("@")[0] || "Developer";
    const userId = user.uid || user.id || null;
    setIsGenerating(true);
    setError(null);

    try {
      // 1. Generate the AI challenge target
      const targetPayload = await api.request("/api/challenge/generate", {
        method: "POST",
        body: JSON.stringify({ difficulty })
      });
      const targetImage = targetPayload.targetImage;
      const challengeId = targetPayload.challengeId;
      const challengeDifficulty = targetPayload.difficulty || difficulty;

      if (!targetImage || !challengeId) throw new Error("Failed to generate challenge target");

      // 2. Create a room for the challenge
      saveUsername(displayName);
      const roomPayload = {
        name: `${displayName}'s ${capitalize(challengeDifficulty)} UI Challenge ${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        username: displayName,
        visibility: "private",
        problemId: "ui-battle",
        initialLanguage: "html",
        userId,
        isChallenge: true,
        targetImage,
        challengeId,
        challengeDifficulty
      };

      const room = await api.createRoom(roomPayload);
      
      saveHostToken(room.id, room.hostToken);
      if (room.inviteCode) saveInviteCode(room.id, room.inviteCode);

      // 3. Navigate to the room with state
      navigate(`/code/${room.id}`, { state: { challengeMode: true, targetImage, challengeId, difficulty: challengeDifficulty } });
    } catch (err) {
      setError(err.message || "Failed to start challenge");
    } finally {
      setIsGenerating(false);
    }
  };

  const startRelayFrontend = async () => {
    if (!user) {
      navigate("/");
      return;
    }

    const displayName = user.displayName || user.username || user.email?.split("@")[0] || "Developer";
    const uniqueCode = Math.random().toString(36).substring(2, 6).toUpperCase();
    setIsStartingRelay(true);
    setError(null);

    try {
      saveUsername(displayName);
      const room = await api.createRoom({
        name: `${displayName}'s Relay Frontend ${uniqueCode}`,
        username: displayName,
        visibility: "private",
        max: relayTeamSize,
        userId: user.uid || user.id || null,
        initialLanguage: "html",
        isChallenge: false,
        files: [
          {
            name: "App.jsx",
            language: "javascript",
            code: `const sections = [
  { name: "Navbar + Hero", owner: "Unclaimed", status: "Planning" },
  { name: "Features / Cards", owner: "Unclaimed", status: "Planning" },
  { name: "Main Content", owner: "Unclaimed", status: "Planning" },
  { name: "CTA + Footer", owner: "Unclaimed", status: "Planning" }
];

export default function App() {
  return (
    <main className="relay-app">
      <nav className="relay-nav">
        <strong>Relay Frontend</strong>
        <span>Own. Build. Relay. Integrate. Ship.</span>
      </nav>
      <section className="relay-hero">
        <p className="eyebrow">Team UI Challenge</p>
        <h1>Build one polished responsive interface together.</h1>
        <p>Claim sections, help teammates, integrate the whole page, and submit as one team.</p>
      </section>
      <section className="relay-board">
        {sections.map((section) => (
          <article key={section.name}>
            <h2>{section.name}</h2>
            <p>{section.owner}</p>
            <span>{section.status}</span>
          </article>
        ))}
      </section>
    </main>
  );
}
`
          },
          {
            name: "styles.css",
            language: "css",
            code: `.relay-app {
  min-height: 100vh;
  background: #050b14;
  color: white;
  font-family: Inter, system-ui, sans-serif;
}

.relay-nav {
  display: flex;
  justify-content: space-between;
  padding: 24px 6vw;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.relay-hero {
  padding: 80px 6vw 48px;
  max-width: 760px;
}

.eyebrow {
  color: var(--primary-color, #ff7b00);
  font-weight: 800;
  text-transform: uppercase;
}

.relay-hero h1 {
  font-size: clamp(2.4rem, 7vw, 5rem);
  line-height: 0.98;
}

.relay-board {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
  padding: 0 6vw 64px;
}

.relay-board article {
  border: 1px solid rgba(0, 150, 255, 0.28);
  border-radius: 8px;
  padding: 18px;
  background: rgba(255, 255, 255, 0.04);
}
`
          }
        ],
        notes: {
          text: `Relay Frontend plan

Briefing: inspect the reference UI and agree on the target.
Breakdown: split the interface into Navbar, Hero, Features, Main Content, CTA, and Footer.
Ownership: each player claims responsibility for sections, but everyone can help everywhere.
Build: work in parallel and keep reusable components/styles consistent.
Help: request review when layout, responsiveness, or spacing breaks.
Integration: final phase is for responsiveness, accessibility, visual consistency, and polish.

Scoring: visual accuracy, responsive behavior, code quality, accessibility, integration, and collaboration.`,
          draws: []
        }
      });

      saveHostToken(room.id, room.hostToken);
      if (room.inviteCode) saveInviteCode(room.id, room.inviteCode);
      navigate(`/code/private/${room.id}`, { state: { relayMode: true, teamSize: relayTeamSize } });
    } catch (err) {
      setError(err.message || "Failed to start Relay Frontend");
    } finally {
      setIsStartingRelay(false);
    }
  };

  const startRelayBackend = async () => {
    if (!user) {
      navigate("/");
      return;
    }

    const displayName = user.displayName || user.username || user.email?.split("@")[0] || "Developer";
    const uniqueCode = Math.random().toString(36).substring(2, 6).toUpperCase();
    setIsStartingBackendRelay(true);
    setError(null);

    try {
      saveUsername(displayName);
      const room = await api.createRoom({
        name: `${displayName}'s Relay Backend ${uniqueCode}`,
        username: displayName,
        visibility: "private",
        max: relayTeamSize,
        userId: user.uid || user.id || null,
        problemId: "relay-backend",
        initialLanguage: "javascript",
        isChallenge: false,
        files: [
          {
            name: "server.js",
            language: "javascript",
            code: `import express from "express";
import authRoutes from "./routes/auth.routes.js";
import productRoutes from "./routes/product.routes.js";
import orderRoutes from "./routes/order.routes.js";

const app = express();
app.use(express.json());

app.get("/api/health", (_request, response) => {
  response.json({ ok: true, service: "relay-backend" });
});

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);

app.listen(3000, () => {
  console.log("Relay Backend API running on port 3000");
});
`
          },
          {
            name: "auth.routes.js",
            language: "javascript",
            code: `import { Router } from "express";

const router = Router();

router.post("/register", (request, response) => {
  response.status(201).json({ id: "user_1", email: request.body.email });
});

router.post("/login", (_request, response) => {
  response.json({ token: "dev-token", user: { id: "user_1", role: "customer" } });
});

export default router;
`
          },
          {
            name: "product.routes.js",
            language: "javascript",
            code: `import { Router } from "express";

const router = Router();
const products = [
  { id: "prod_1", name: "Starter Hoodie", price: 499 },
  { id: "prod_2", name: "Code Mug", price: 199 }
];

router.get("/", (_request, response) => {
  response.json({ data: products });
});

router.get("/:id", (request, response) => {
  const product = products.find((item) => item.id === request.params.id);
  if (!product) return response.status(404).json({ error: "Product not found" });
  response.json({ data: product });
});

export default router;
`
          },
          {
            name: "order.routes.js",
            language: "javascript",
            code: `import { Router } from "express";

const router = Router();

router.post("/", (request, response) => {
  const { productId, quantity } = request.body;
  if (!productId || !quantity) {
    return response.status(400).json({ error: "productId and quantity are required" });
  }
  response.status(201).json({
    id: "order_1",
    productId,
    quantity,
    status: "created"
  });
});

router.get("/:id", (request, response) => {
  response.json({ data: { id: request.params.id, status: "created" } });
});

export default router;
`
          },
          {
            name: "integration-checklist.md",
            language: "markdown",
            code: `# Relay Backend Integration Checklist

## API contracts
- POST /api/auth/register
- POST /api/auth/login
- GET /api/products
- GET /api/products/:id
- POST /api/orders
- GET /api/orders/:id

## Team responsibilities
- Authentication + Users
- Product APIs + Search
- Orders + Business Logic
- Database + Payment Simulation
- Validation + Security
- Tests + Integration

## Final phase
- Run unit tests
- Run API tests
- Check auth and authorization
- Check validation errors
- Check database persistence
- Fix inconsistent response formats
- Ship one reliable backend together
`
          }
        ],
        notes: {
          text: `Relay Backend plan

Briefing: agree on the real-world backend problem and required APIs.
System breakdown: split Authentication, API Development, Database, Business Logic, Validation, Security, Testing, and Integration.
API contract phase: define methods, routes, request bodies, responses, status codes, and error shape before coding.
Ownership: each player owns a service area, but anyone can review, debug, and help.
Parallel development: build routes, controllers, services, models, validators, and tests together.
Integration phase: connect services, verify auth, validate database behavior, run tests, debug failures, and harden security.

Scoring: functional correctness, API integration, tests, database quality, security, code quality, and reliability.`,
          draws: []
        }
      });

      saveHostToken(room.id, room.hostToken);
      if (room.inviteCode) saveInviteCode(room.id, room.inviteCode);
      navigate(`/code/private/${room.id}`, { state: { relayBackendMode: true, teamSize: relayTeamSize } });
    } catch (err) {
      setError(err.message || "Failed to start Relay Backend");
    } finally {
      setIsStartingBackendRelay(false);
    }
  };

  return (
    <main className="problems-shell" style={{ width: "100%" }}>
      <Navbar />
      <div className="challenge-page-content challenge-board">
        <header className="challenge-board-toolbar">
          <div className="challenge-board-title">
            <LayoutGrid size={20} />
            <div>
              <h1>Choose your challenge</h1>
              <p>Pick a challenge type and start building.</p>
            </div>
          </div>

          <div className="challenge-board-controls" aria-label="Challenge controls">
            <label className="challenge-native-select">
              <Filter size={15} />
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter challenges by status">
                {statusOptions.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label className="challenge-native-select">
              <ArrowDownUp size={15} />
              <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} aria-label="Sort challenges">
                {sortOptions.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <div className="challenge-view-toggle" aria-label="View mode">
              <button type="button" className={viewMode === "grid" ? "active" : ""} aria-label="Grid view" onClick={() => setViewMode("grid")}>
                <LayoutGrid size={16} />
              </button>
              <button type="button" className={viewMode === "list" ? "active" : ""} aria-label="List view" onClick={() => setViewMode("list")}>
                <List size={16} />
              </button>
            </div>
          </div>
        </header>

        {error && (
          <div style={{ background: "rgba(255,0,0,0.1)", border: "1px solid rgba(255,0,0,0.3)", padding: "16px", borderRadius: "8px", color: "#ff4444", marginBottom: "32px", textAlign: "center" }}>
            {error}
          </div>
        )}

        {infoContent && (
          <div className="challenge-modal-backdrop" role="presentation" onClick={() => setActiveInfoPanel(null)}>
            <section className="challenge-info-modal" role="dialog" aria-modal="true" aria-labelledby="challenge-info-title" onClick={(event) => event.stopPropagation()}>
              <button className="challenge-modal-close" type="button" onClick={() => setActiveInfoPanel(null)} aria-label="Close explanation">
                <CircleX size={22} />
              </button>
              <div className="challenge-card-icon">
                <Info size={28} />
              </div>
              <h2 id="challenge-info-title">{infoContent.title}</h2>
              <p>{infoContent.text}</p>
            </section>
          </div>
        )}

        <div className={`challenge-grid challenge-board-grid ${viewMode === "list" ? "challenge-board-grid-list" : ""}`}>

          {visibleChallengeIds.includes("random") && (
          <article className="challenge-card challenge-choice-card" style={{ order: visibleChallengeIds.indexOf("random") }}>
            <div className="challenge-card-head">
              <div className="challenge-card-icon">
                <Sparkles size={30} />
              </div>
              <div className="challenge-card-copy">
                <h2>Random Frontend Challenge</h2>
                <p>Generate a unique AI design target and recreate it with pixel-perfect accuracy.</p>
              </div>
              <span className="challenge-status-pill">
                <span /> Always available
              </span>
            </div>

            <div className="challenge-difficulty-picker challenge-segmented">
              {["easy", "medium", "hard"].map((level) => (
                <button
                  key={level}
                  onClick={() => setDifficulty(level)}
                  className={difficulty === level ? "active" : ""}
                >
                  {capitalize(level)}
                </button>
              ))}
            </div>

            <div className="relay-feature-grid challenge-chip-grid">
              {[
                [PanelsTopLeft, "AI Target"],
                [Sparkles, "Pixel Match"],
                [CheckCircle2, "Vision Score"],
                [LayoutGrid, "HTML + CSS"]
              ].map(([Icon, label]) => (
                <div className="challenge-feature-chip" key={label}>
                  <Icon size={15} /> {label}
                </div>
              ))}
            </div>

            <div className="challenge-card-actions">
              <button className="challenge-primary-action" onClick={startChallenge} disabled={isGenerating}>
                {isGenerating ? (
                  <>
                    <Loader2 size={17} className="spin" /> Generating Target...
                  </>
                ) : (
                  <>
                    <Play size={15} fill="currentColor" /> Start Challenge
                  </>
                )}
              </button>
              <button type="button" className="challenge-link-action" onClick={() => setActiveInfoPanel("random")}>
                <Info size={15} /> How it works <span aria-hidden="true">-&gt;</span>
              </button>
            </div>
          </article>
          )}

          {visibleChallengeIds.includes("relay") && (
          <article className="challenge-card challenge-choice-card relay-challenge-card" style={{ order: visibleChallengeIds.indexOf("relay") }}>
            <div className="challenge-card-head">
              <div className="challenge-card-icon">
                <GitBranch size={30} />
              </div>
              <div className="challenge-card-copy">
                <h2>{relayContent.title}</h2>
                <p>{relayMode === "frontend"
                  ? "Build one interface together: divide sections, relay progress, and polish the final responsive product."
                  : "Build one backend together: split services, connect APIs, debug, and ship a reliable system."}
                </p>
              </div>
              <span className="challenge-status-pill">
                <span /> Team mode
              </span>
            </div>

            <div className="challenge-difficulty-picker challenge-segmented">
              {[
                ["frontend", "Frontend"],
                ["backend", "Backend"]
              ].map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setRelayMode(value)}
                  className={relayMode === value ? "active" : ""}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="relay-feature-grid challenge-chip-grid">
              {relayContent.features.map(([Icon, label]) => (
                <div className="challenge-feature-chip" key={label}>
                  <Icon size={15} /> {label}
                </div>
              ))}
            </div>

            <div className="challenge-card-actions">
              <button
                className="challenge-primary-action"
                onClick={relayMode === "frontend" ? startRelayFrontend : startRelayBackend}
                disabled={isStartingRelay || isStartingBackendRelay}
              >
                {isStartingRelay || isStartingBackendRelay ? (
                  <>
                    <Loader2 size={17} className="spin" /> Creating Relay...
                  </>
                ) : (
                  <>
                    <GitBranch size={16} /> Create Relay
                  </>
                )}
              </button>
              <button type="button" className="challenge-link-action" onClick={() => setActiveInfoPanel("relay")}>
                <Info size={15} /> How it works <span aria-hidden="true">-&gt;</span>
              </button>
            </div>
          </article>
          )}

          {visibleChallengeIds.length === 0 && (
            <section className="challenge-empty-state">
              <h2>No challenges found</h2>
              <p>Change the filter to see more challenge types.</p>
            </section>
          )}
          
        </div>
      </div>
      <Footer />
    </main>
  );
}
