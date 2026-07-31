import { NavLink, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Code, Users, Trophy, Zap, Flame } from "lucide-react";
import { BrandButton } from "../components/BrandButton";
import { trackEvent } from "../lib/analytics";

import { logoutUser, signInWithGoogle } from "../lib/firebase";
import { saveUsername } from "../lib/navigation";
import { api } from "../api/client";
import { useAuth } from "../hooks/useAuth";
import mountainImage from "../assets/home/neon-mountain.svg";
import campfireImage from "../assets/home/neon-campfire.svg";
import celebrationImage from "../assets/home/neon-celebration.svg";
import homevideo from "../../assets/homevideo.mp4";
import loopsbg from "../../assets/loopsbgimage.jpeg";
import scene1 from "../../assets/scene1.jpeg";
import scene2 from "../../assets/scene2.jpeg";
import scene3 from "../../assets/scene3.jpeg";

import { Navbar } from "../components/Navbar";

export default function HomePage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState("login");
  const [authForm, setAuthForm] = useState({ username: "", password: "", confirmPassword: "" });
  const [authStatus, setAuthStatus] = useState("");
  const [authBusy, setAuthBusy] = useState(false);

  async function handleGoogleSignIn() {
    try {
      const result = await signInWithGoogle();
      const account = result?.user;
      const displayName = account?.displayName || account?.email?.split("@")[0] || "Developer";
      saveUsername(displayName);
      if (account?.uid) localStorage.setItem("codefora_user_id", account.uid);
      setAuthOpen(false);
      navigate('/');
    } catch (err) {
      console.error('Google sign-in failed:', err);
      setAuthStatus("Google sign-in failed. Please try again.");
    }
  }

  async function handleContinueAsGuest() {
    try {
      await logoutUser();
    } catch {
      // ignore
    }

    try {
      localStorage.removeItem('codefora_username');
      localStorage.removeItem('codefora_user_id');
    } catch {
      // ignore
    }

    navigate('/rooms');
  }

  function updateAuthField(field, value) {
    setAuthForm((current) => ({ ...current, [field]: value }));
    setAuthStatus("");
  }

  function finishManualAuth(account) {
    saveUsername(account.displayName || account.username);
    localStorage.setItem("codefora_user_id", account.userId);
    setAuthForm({ username: "", password: "", confirmPassword: "" });
    setAuthStatus("");
    setAuthOpen(false);
    navigate('/');
  }

  async function handleManualAuth(event) {
    event.preventDefault();
    if (authBusy) return;

    if (authTab === "signup" && authForm.password !== authForm.confirmPassword) {
      setAuthStatus("Passwords do not match.");
      return;
    }

    setAuthBusy(true);
    setAuthStatus("");

    try {
      const account = authTab === "signup"
        ? await api.signup(authForm)
        : await api.login(authForm);
      finishManualAuth(account);
    } catch (error) {
      setAuthStatus(error.message || "Authentication failed.");
    } finally {
      setAuthBusy(false);
    }
  }

  useEffect(() => {
    if (!loading && !user) {
      navigate("/");
    }
  }, [user, loading, navigate]);

  if (loading || !user) return null;

  return (
    <main style={{ 
      background: '#030303', 
      minHeight: '100vh', 
      width: '100%', 
      overflowX: 'hidden',
      position: 'relative'
    }}>
      {/* GLOBAL TEXTURED BACKGROUND */}
      <div style={{
        position: 'fixed',
        inset: 0,
        backgroundImage: `url(${loopsbg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        opacity: 0.15,
        zIndex: 0,
        pointerEvents: 'none',
        filter: 'var(--home-video-filter)'
      }}></div>

      {/* GLOWING BACKGROUND ELEMENTS - Premium Orange Dominant */}
      <div style={{
        position: 'fixed',
        top: '-10%',
        left: '10%',
        width: '80vw',
        height: '80vw',
        background: 'radial-gradient(circle, rgba(var(--primary-rgb), 0.18) 0%, transparent 70%)',
        filter: 'blur(130px)',
        zIndex: 0,
        pointerEvents: 'none',
        opacity: 0.9
      }}></div>
      <div style={{
        position: 'fixed',
        top: '20%',
        right: '0%',
        width: '40vw',
        height: '40vw',
        background: 'radial-gradient(circle, rgba(var(--primary-rgb), 0.12) 0%, transparent 70%)',
        filter: 'blur(100px)',
        zIndex: 0,
        pointerEvents: 'none',
        opacity: 0.7
      }}></div>
      <div style={{
        position: 'fixed',
        bottom: '5%',
        right: '5%',
        width: '50vw',
        height: '50vw',
        background: 'radial-gradient(circle, rgba(0, 229, 255, 0.05) 0%, transparent 70%)',
        filter: 'blur(150px)',
        zIndex: 0,
        pointerEvents: 'none',
        opacity: 0.4
      }}></div>

      {/* TOP SECTION WITH VIDEO BACKGROUND */}
      <div style={{ position: 'relative', width: '100%', minHeight: '100vh', overflow: 'hidden' }}>
        <video
          autoPlay
          loop
          muted
          playsInline
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            minWidth: '100%',
            minHeight: '100%',
            width: 'auto',
            height: 'auto',
            transform: 'translate(-50%, -50%)',
            zIndex: 0,
            objectFit: 'cover',
            opacity: 0.8
          }}
        >
          <source src={homevideo} type="video/mp4" />
        </video>

        {/* Gradient overlay to seamlessly blend bottom into the rest of the dark page */}
        <div style={{
          position: 'absolute',
          bottom: 0, left: 0, width: '100%', height: '150px',
          background: 'linear-gradient(to bottom, transparent, #000)',
          zIndex: 1
        }}></div>

        <div style={{ position: 'relative', zIndex: 2 }}>
          {/* TOP NAVBAR */}
          <Navbar />

          {/* HERO SECTION */}
          <section style={{
            display: 'flex',
            alignItems: 'flex-start',
            padding: '6vh 60px 100px 60px',
            minHeight: 'calc(100vh - 80px)'
          }}>
            <div style={{ flex: 1, maxWidth: '800px' }}>
              <h4 style={{
                color: 'var(--primary-accent)', fontSize: '1.1rem', fontWeight: 800,
                textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '20px',
                textShadow: '0 2px 10px rgba(0,0,0,0.8)'
              }}>
                WELCOME BACK
              </h4>
              <h1 style={{
                fontSize: 'clamp(3.5rem, 6vw, 5.5rem)', fontWeight: 900, color: 'white',
                lineHeight: 1.1, marginBottom: '30px',
                textShadow: '0 10px 30px rgba(0,0,0,0.8)'
              }}>
                Start Coding<br />With Your Team.
              </h1>
              <p style={{
                fontSize: '1.2rem', color: 'rgba(255,255,255,0.8)',
                marginBottom: '40px', lineHeight: 1.6, maxWidth: '600px',
                textShadow: '0 2px 10px rgba(0,0,0,0.8)', fontWeight: 500
              }}>
                Join active rooms, solve coding challenges, and improve your competitive
                programming skills through real-time collaboration.
              </p>
              <div style={{ display: 'flex', gap: '20px' }}>
                <button id="tour-join-room" onClick={() => navigate("/rooms")} style={{
                  padding: '16px 36px', fontSize: '1.1rem', fontWeight: 'bold',
                  background: '#FF9100', color: '#1a0e00', border: 'none', borderRadius: '12px',
                  display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer',
                  boxShadow: '0 8px 25px rgba(255, 145, 0, 0.4)', transition: 'all 0.2s'
                }}
                  onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 30px rgba(255, 145, 0, 0.6)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(255, 145, 0, 0.4)'; }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                  Join Room
                </button>
                <button id="tour-practice-button" onClick={() => navigate("/problems")} style={{
                  padding: '16px 36px', fontSize: '1.1rem', fontWeight: 'bold',
                  background: '#00E5FF', color: '#001a1d', border: 'none',
                  borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px',
                  cursor: 'pointer', transition: 'all 0.2s',
                  boxShadow: '0 8px 25px rgba(0, 229, 255, 0.4)'
                }}
                  onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 30px rgba(0, 229, 255, 0.6)'; e.currentTarget.style.background = '#33edff'; }}
                  onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 229, 255, 0.4)'; e.currentTarget.style.background = '#00E5FF'; }}>
                  <Code size={20} /> Practice
                </button>
              </div>
            </div>

            {/* SCROLLBAR & SCROLL INDICATOR STYLES */}
            <style>{`
              /* Force Custom Scrollbar */
              ::-webkit-scrollbar {
                width: 12px !important;
                display: block !important;
              }

              ::-webkit-scrollbar-track {
                background: #030303 !important;
              }

              ::-webkit-scrollbar-thumb {
                background: linear-gradient(to bottom, var(--primary-accent), #00E5FF) !important;
                border-radius: 10px !important;
                border: 3px solid #030303 !important;
                box-shadow: 0 0 10px rgba(255, 145, 0, 0.5) !important;
              }

              ::-webkit-scrollbar-thumb:hover {
                background: linear-gradient(to bottom, #FFB045, #33EDFF) !important;
              }

              /* Firefox Support */
              * {
                scrollbar-width: thin;
                scrollbar-color: var(--primary-accent) #030303;
              }

              @keyframes scrollDown {
                0% { transform: translateY(0); opacity: 0; }
                30% { opacity: 1; }
                60% { transform: translateY(12px); opacity: 0; }
                100% { opacity: 0; }
              }
            `}</style>

            {/* SCROLL INDICATOR */}
            <div style={{
              position: 'absolute',
              bottom: '40px',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px',
              zIndex: 10,
              pointerEvents: 'none'
            }}>
              <div style={{
                width: '28px',
                height: '48px',
                border: '2px solid rgba(255, 145, 0, 0.4)',
                borderRadius: '14px',
                position: 'relative',
                background: 'rgba(0, 229, 255, 0.03)',
                boxShadow: '0 0 20px rgba(255, 145, 0, 0.15)'
              }}>
                <div style={{
                  width: '4px',
                  height: '8px',
                  background: 'linear-gradient(to bottom, var(--primary-accent), #00E5FF)',
                  borderRadius: '2px',
                  position: 'absolute',
                  top: '10px',
                  left: '50%',
                  marginLeft: '-2px',
                  animation: 'scrollDown 2s infinite ease-in-out',
                  boxShadow: '0 0 10px var(--primary-accent)'
                }}></div>
              </div>
              <style>{`
                @keyframes scrollDown {
                  0% { transform: translateY(0); opacity: 0; }
                  30% { opacity: 1; }
                  60% { transform: translateY(12px); opacity: 0; }
                  100% { opacity: 0; }
                }
              `}</style>
              <span style={{ 
                color: 'rgba(255,255,255,0.4)', 
                fontSize: '10px', 
                fontWeight: 800, 
                letterSpacing: '3px',
                textTransform: 'uppercase',
                textShadow: '0 2px 5px rgba(0,0,0,0.5)'
              }}>
                Scroll
              </span>
            </div>
          </section>
        </div>
      </div>


      <div style={{ width: '96%', maxWidth: '1800px', margin: '0 auto', paddingBottom: '60px', position: 'relative', zIndex: 2 }}>
        <section style={{ marginTop: '80px' }}>
          <h2 style={{ fontSize: '2.5rem', marginBottom: '40px', textAlign: 'center' }}>Elevate Your Skills</h2>
          <div className="signed-feature-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
            <article onClick={() => navigate("/rooms")} className="glass-panel modern-card" style={{ 
              padding: '40px', 
              textAlign: 'center',
              backgroundImage: `linear-gradient(rgba(0,0,0,0.65), rgba(0,0,0,0.65)), url(${scene2})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              border: '1px solid rgba(255,255,255,0.1)',
              cursor: 'pointer'
            }}>
              <div style={{ background: 'rgba(var(--primary-rgb), 0.2)', width: '60px', height: '60px', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 25px', color: 'var(--brand-primary)', backdropFilter: 'blur(5px)' }}>
                <Flame size={32} />
              </div>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '15px', textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>Live Rooms</h3>
              <p style={{ opacity: 0.9, lineHeight: 1.6, textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>Create or join focused coding rooms with real-time collaboration and instant feedback.</p>
            </article>
            <article onClick={() => navigate("/problems")} className="glass-panel modern-card" style={{ 
              padding: '40px', 
              textAlign: 'center',
              backgroundImage: `linear-gradient(rgba(0,0,0,0.65), rgba(0,0,0,0.65)), url(${scene1})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              border: '1px solid rgba(255,255,255,0.1)',
              cursor: 'pointer'
            }}>
              <div style={{ background: 'rgba(0, 242, 255, 0.2)', width: '60px', height: '60px', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 25px', color: '#00f2ff', backdropFilter: 'blur(5px)' }}>
                <Code size={32} />
              </div>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '15px', textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>Problem Arena</h3>
              <p style={{ opacity: 0.9, lineHeight: 1.6, textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>Filter, pick, and solve curated problems that match your current skill level and goals.</p>
            </article>
            <article onClick={() => navigate("/problems")} className="glass-panel modern-card" style={{ 
              padding: '40px', 
              textAlign: 'center',
              backgroundImage: `linear-gradient(rgba(0,0,0,0.65), rgba(0,0,0,0.65)), url(${scene3})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              border: '1px solid rgba(255,255,255,0.1)',
              cursor: 'pointer'
            }}>
              <div style={{ background: 'rgba(112, 0, 255, 0.2)', width: '60px', height: '60px', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 25px', color: '#7000ff', backdropFilter: 'blur(5px)' }}>
                <Trophy size={32} />
              </div>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '15px', textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>Global Ranking</h3>
              <p style={{ opacity: 0.9, lineHeight: 1.6, textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>Track your practice momentum and climb the global leaderboard to earn community respect.</p>
            </article>
          </div>
        </section>

        <section style={{ marginTop: '100px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
          <div className="glass-panel modern-card" style={{ padding: '40px' }}>
            <h3 style={{ fontSize: '1.8rem', marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '15px' }}>
              <Zap style={{ color: 'var(--brand-primary)' }} /> Live Battles
            </h3>
            <div style={{ display: 'grid', gap: '15px' }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '40px 20px', borderRadius: '12px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>
                No active battles yet. <br/> Check back later!
              </div>
            </div>
            <button 
              className="btn-modern secondary" 
              style={{ width: '100%', marginTop: '20px', justifyContent: 'center' }} 
              onClick={() => {
                trackEvent("battle_join", { context: "homepage_battles" });
                navigate('/rooms');
              }}
            >
              View All Battles
            </button>
          </div>
          <div className="glass-panel modern-card" style={{ padding: '40px' }}>
            <h3 style={{ fontSize: '1.8rem', marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '15px' }}>
              <Trophy style={{ color: '#00f2ff' }} /> Top Performers
            </h3>
            <div style={{ display: 'grid', gap: '12px' }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '40px 20px', borderRadius: '12px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>
                Rankings yet to be updated. <br/> Join a room to start competing!
              </div>
            </div>
          </div>
        </section>
      </div>

    </main>
  );
}
