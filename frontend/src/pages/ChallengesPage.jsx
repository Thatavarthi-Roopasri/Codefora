import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import { BrandButton } from "../components/BrandButton";
import { LayoutGrid, Loader2, Sparkles, Trophy } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { api } from "../api/client";
import { saveHostToken, saveInviteCode } from "../lib/navigation";

export function ChallengesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [difficulty, setDifficulty] = useState("easy");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);

  const startChallenge = async () => {
    if (!user) {
      navigate("/");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // 1. Generate the AI challenge target
      const targetPayload = await api.request("/api/challenge/generate", {
        method: "POST",
        body: JSON.stringify({ difficulty })
      });
      const targetImage = targetPayload.targetImage;

      if (!targetImage) throw new Error("Failed to generate target image");

      // 2. Create a room for the challenge
      const roomPayload = {
        name: `${user.username || 'User'}'s UI Challenge ${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        visibility: "private",
        problemId: "ui-battle",
        initialLanguage: "html",
        hostName: user.username,
        ownerUserId: user.id,
        isChallenge: true,
        targetImage: targetImage
      };

      const room = await api.createRoom(roomPayload);
      
      saveHostToken(room.id, room.hostToken);
      if (room.inviteCode) saveInviteCode(room.id, room.inviteCode);

      // 3. Navigate to the room with state
      navigate(`/code/${room.id}`, { state: { challengeMode: true, targetImage, difficulty } });
    } catch (err) {
      setError(err.message || "Failed to start challenge");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <main className="problems-shell" style={{ width: "100%" }}>
      <Navbar />
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "40px 20px" }}>
        
        <header style={{ textAlign: "center", marginBottom: "60px" }}>
          <h1 style={{ fontSize: "3rem", fontWeight: "bold", marginBottom: "16px", display: "flex", alignItems: "center", justifyContent: "center", gap: "16px" }}>
            <Trophy size={40} color="#ff3e00" /> UI Battle Challenges
          </h1>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "1.2rem", maxWidth: "600px", margin: "0 auto" }}>
            Recreate AI-generated target designs using HTML & CSS. Our Vision AI will judge your pixel-perfect accuracy!
          </p>
        </header>

        {error && (
          <div style={{ background: "rgba(255,0,0,0.1)", border: "1px solid rgba(255,0,0,0.3)", padding: "16px", borderRadius: "8px", color: "#ff4444", marginBottom: "32px", textAlign: "center" }}>
            {error}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px" }}>
          
          {/* Frontend Challenge Card */}
          <div style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "16px",
            padding: "32px",
            display: "flex",
            flexDirection: "column",
            gap: "24px",
            position: "relative",
            overflow: "hidden"
          }}>
            <div style={{ position: "absolute", top: "-20px", right: "-20px", opacity: 0.1, pointerEvents: "none" }}>
              <LayoutGrid size={120} />
            </div>

            <div>
              <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", display: "flex", alignItems: "center", gap: "8px" }}>
                <Sparkles size={24} color="#3b82f6" /> Random Frontend Challenge
              </h2>
              <p style={{ color: "rgba(255,255,255,0.6)", marginTop: "8px" }}>
                The AI will generate a unique UI design target. Replicate it as closely as possible.
              </p>
            </div>

            <div style={{ display: "flex", gap: "12px", background: "rgba(0,0,0,0.2)", padding: "8px", borderRadius: "12px" }}>
              {["easy", "medium", "hard"].map((level) => (
                <button
                  key={level}
                  onClick={() => setDifficulty(level)}
                  style={{
                    flex: 1,
                    padding: "8px 0",
                    borderRadius: "8px",
                    border: "none",
                    background: difficulty === level ? "rgba(255,255,255,0.1)" : "transparent",
                    color: difficulty === level ? "#fff" : "rgba(255,255,255,0.5)",
                    cursor: "pointer",
                    textTransform: "capitalize",
                    fontWeight: difficulty === level ? "600" : "normal",
                    transition: "all 0.2s"
                  }}
                >
                  {level}
                </button>
              ))}
            </div>

            <button className="button primary" onClick={startChallenge} disabled={isGenerating} style={{ width: "100%", justifyContent: "center", padding: "12px", background: "var(--primary-orange)", color: "#000", fontWeight: "bold" }}>
              {isGenerating ? (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "center" }}>
                  <Loader2 size={18} className="spin" /> Generating Target...
                </div>
              ) : (
                "Start Challenge"
              )}
            </button>
          </div>

          {/* More challenges coming soon placeholder */}
          <div style={{
            background: "rgba(255,255,255,0.01)",
            border: "1px dashed rgba(255,255,255,0.1)",
            borderRadius: "16px",
            padding: "32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "rgba(255,255,255,0.3)"
          }}>
            More challenge modes coming soon...
          </div>
          
        </div>
      </div>
      <Footer />
    </main>
  );
}
