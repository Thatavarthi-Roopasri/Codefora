import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import {
  Bug,
  CheckCircle2,
  CircleX,
  Database,
  Filter,
  GitBranch,
  Heart,
  Info,
  List,
  LayoutGrid,
  Loader2,
  PanelsTopLeft,
  Play,
  Route,
  ShieldCheck,
  Sparkles,
  Sword,
  Trophy,
  Users
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { api, getProfile, saveProfile } from "../api/client";
import { saveHostToken, saveInviteCode, saveUsername } from "../lib/navigation";
import { isGuestUser } from "../lib/userAccess";

function capitalize(value) {
  return String(value || "").charAt(0).toUpperCase() + String(value || "").slice(1);
}

export function ChallengesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [favoriteModes, setFavoriteModes] = useState([]);
  const [difficulty, setDifficulty] = useState("easy");
  const [relayMode, setRelayMode] = useState("frontend");
  const [relayTeamSize, setRelayTeamSize] = useState(4);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isStartingRelay, setIsStartingRelay] = useState(false);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState("grid");
  const [activeInfoPanel, setActiveInfoPanel] = useState(null);
  useEffect(() => {
    if (!user?.uid || isGuestUser(user)) {
      setFavoriteModes([]);
      return undefined;
    }
    let active = true;
    getProfile(user.uid).then((profile) => {
      if (active) setFavoriteModes(Array.isArray(profile?.favoriteModes) ? profile.favoriteModes : []);
    }).catch(() => {});
    return () => { active = false; };
  }, [user?.uid]);

  const toggleFavoriteMode = async (modeId) => {
    if (!user?.uid || isGuestUser(user)) return;
    const next = favoriteModes.includes(modeId)
      ? favoriteModes.filter((id) => id !== modeId)
      : [...favoriteModes, modeId];
    setFavoriteModes(next);
    try {
      await saveProfile(user.uid, { favoriteModes: next });
    } catch {
      setFavoriteModes(favoriteModes);
    }
  };

  const FavoriteButton = ({ modeId }) => {
    const active = favoriteModes.includes(modeId);
    return (
      <button
        type="button"
        className={`challenge-favorite-toggle ${active ? "active" : ""}`}
        onClick={() => toggleFavoriteMode(modeId)}
        aria-label={active ? "Remove from favorite modes" : "Add to favorite modes"}
        aria-pressed={active}
        title={active ? "Remove from favorites" : "Add to favorites"}
      >
        <Heart size={18} fill={active ? "currentColor" : "none"} />
      </button>
    );
  };
  const relayContent = relayMode === "frontend"
    ? {
      title: "Frontend Relay",
      description: "Choose a private section in 15 seconds and build a combined page with shared leftovers.",
      features: [
        [PanelsTopLeft, "UI breakdown"],
        [Users, "Section ownership"],
        [GitBranch, "15-second selection"],
        [CheckCircle2, "Responsive polish"]
      ]
    } : {
      title: "DSA Relay",
      description: "Choose a private JavaScript function and solve the team data-summary challenge.",
      features: [
        [Route, "Function contracts"],
        [Database, "Shared leftovers"],
        [ShieldCheck, "Private source"],
        [CheckCircle2, "Tests + reliability"]
      ]
    };
  const statusOptions = [
    ["all", "All Status"],
    ["available", "Always available"],
    ["team", "Team mode"]
  ];
  const challengeOrder = ["random", "relay", "codewars"];
  const visibleChallengeIds = challengeOrder.filter((id) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "available") return id === "random";
    if (statusFilter === "team") return id === "relay" || id === "codewars";
    return true;
  });
  const infoContent = activeInfoPanel === "random"
    ? {
      title: "Random Frontend Challenge",
      text: "This is for practicing frontend accuracy. Codefora generates a fresh UI target, then you recreate it with HTML and CSS. Choose Easy, Medium, or Hard, start the challenge, and focus on matching layout, spacing, colors, and responsiveness."
    }
    : activeInfoPanel === "relay"
      ? {
         title: relayMode === "frontend" ? "Frontend Relay" : "DSA Relay",
        text: relayMode === "frontend"
          ? "Everyone joins and marks ready. The host starts a 15-second task selection. Each person chooses one private section; unclaimed sections become shared. Preview the combined page without exposing teammates' source."
           : "Choose a JavaScript function during the first 15 seconds. You can edit your function and shared leftovers only. Teammates' source stays hidden. Run the team checks, mark every task done, then the host submits."
      }
      : activeInfoPanel === "codewars"
      ? {
        title: "Codewars",
        text: "Create a competitive war room, choose the battle type, team size, language, difficulty, time limit, and visibility, then enter the arena. Supported modes use server-verified correctness and earliest best submission as the tie-break. Build modes use team review."
      }
      : null;

  const requireAccount = () => {
    if (!isGuestUser(user)) return true;
    const returnTo = '/challenges';
    navigate(`/?returnTo=${encodeURIComponent(returnTo)}`, { state: { returnTo } });
    return false;
  };

  const startChallenge = async () => {
    if (!requireAccount()) return;

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

      const draft = await api.request('/api/challenge/work/' + challengeId);
      const room = await api.createRoom({ ...roomPayload, files: draft.files });
      
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

  const startRelay = async () => {
    if (!requireAccount()) return;
    const displayName = user.displayName || user.username || 'Developer';
    setIsStartingRelay(true); setError(null);
    try {
      const room = await api.createRoom({ name: `${displayName}'s Relay ${Date.now().toString(36)}`, username: displayName,
        userId: user.uid || user.id, visibility: 'private', max: relayTeamSize, relayMode: String(relayMode).toLowerCase() });
      saveUsername(displayName); saveHostToken(room.id, room.hostToken); saveInviteCode(room.id, room.inviteCode);
      navigate(`/relay/${room.id}`);
    } catch (err) { setError(err.message || 'Could not create Relay'); }
    finally { setIsStartingRelay(false); }
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
            <FavoriteButton modeId="random" />
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
             <FavoriteButton modeId={relayMode === "frontend" ? "frontend" : "relay"} />
            <div className="challenge-card-head">
              <div className="challenge-card-icon">
                <GitBranch size={30} />
              </div>
              <div className="challenge-card-copy">
                <h2>{relayContent.title}</h2>
                 <p>{relayMode === "frontend"
                   ? "Choose your section in 15 seconds. Build privately, share leftover tasks, and preview the combined page."
                   : "Solve one data-summary challenge together with private JavaScript functions."}
                </p>
              </div>
              <span className="challenge-status-pill">
                <span /> Team mode
              </span>
            </div>

            <div className="challenge-difficulty-picker challenge-segmented">
              {[
                ["frontend", "Frontend"],
                ["dsa", "DSA (JavaScript)"]
              ].map(([value, label]) => (
                <button
                  type="button"
                  key={value}
                  onClick={() => setRelayMode(value)}
                  className={relayMode === value ? "active" : ""}
                  aria-pressed={relayMode === value}
                >
                  {label}
                </button>
              ))}
            </div>

            <label className="relay-team-size-control">
              <span><Users size={15} /> Team size</span>
              <select value={relayTeamSize} onChange={event => setRelayTeamSize(Number(event.target.value))} aria-label="Relay team size">
                {[2, 3, 4, 5].map(size => <option key={size} value={size}>{size} players</option>)}
              </select>
            </label>
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
                onClick={startRelay}
                disabled={isStartingRelay}
              >
                {isStartingRelay ? (
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

          {visibleChallengeIds.includes("codewars") && (
          <article className="challenge-card challenge-choice-card codewars-challenge-card" style={{ order: visibleChallengeIds.indexOf("codewars") }}>
            <FavoriteButton modeId="battles" />
            <div className="challenge-card-head">
              <div className="challenge-card-icon">
                <Sword size={31} />
              </div>
              <div className="challenge-card-copy">
                <h2>Codewars</h2>
                <p>Create a competitive war room, choose your battle type, and let teams fight for the fastest correct solution.</p>
              </div>
              <span className="challenge-status-pill">
                <span /> Battle mode
              </span>
            </div>

            <div className="relay-feature-grid challenge-chip-grid">
              {[
                [Sword, "Programming"],
                [Bug, "Debugging"],
                [Users, "Team battle"],
                [Trophy, "Ranked winner"]
              ].map(([Icon, label]) => (
                <div className="challenge-feature-chip" key={label}>
                  <Icon size={15} /> {label}
                </div>
              ))}
            </div>

            <div className="challenge-card-actions">
              <button className="challenge-primary-action" onClick={() => navigate("/war-arena/create")}>
                <Play size={15} fill="currentColor" /> Start Challenge
              </button>
              <button type="button" className="challenge-link-action" onClick={() => setActiveInfoPanel("codewars")}>
                <Info size={15} /> How it works <span aria-hidden="true">-&gt;</span>
              </button>
            </div>
          </article>
          )}
          
        </div>
      </div>
      <Footer />
    </main>
  );
}
