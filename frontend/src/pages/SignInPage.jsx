import { useNavigate, NavLink } from "react-router-dom";
import { useState } from "react";
import { logoutUser, signInWithGoogle } from "../lib/firebase";
import { saveUsername } from "../lib/navigation";
import { api } from "../api/client";
import { BrandButton } from "../components/BrandButton";
import lvssbg from "../../assets/lvssbg.mp4";

export default function SignInPage() {
  const navigate = useNavigate();
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
      navigate('/home');
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

    saveUsername("Guest");
    navigate('/home');
  }

  function updateAuthField(field, value) {
    setAuthForm((current) => ({ ...current, [field]: value }));
    setAuthStatus("");
  }

  function finishManualAuth(account) {
    saveUsername(account.displayName || account.username);
    localStorage.setItem("codefora_user_id", account.userId);
    if (account.role) localStorage.setItem("codefora_role", account.role);
    if (account.token) localStorage.setItem("codefora_admin_token", account.token);
    
    setAuthForm({ username: "", password: "", confirmPassword: "" });
    setAuthStatus("");
    
    if (account.role === "admin") {
      navigate('/admin');
    } else {
      navigate('/home');
    }
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

  return (
    <main style={{ position: 'relative', overflow: 'hidden', minHeight: '100vh', width: '100%', background: '#000' }}>
      <video
        autoPlay
        loop
        muted
        playsInline
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          zIndex: 0,
          opacity: 1
        }}
      >
        <source src={lvssbg} type="video/mp4" />
      </video>

      <div className="home-main-layout animate-fade-in-up" style={{ position: 'relative', zIndex: 2 }}>
        {/* HERO SECTION */}
        <section style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '0 2%', minHeight: '100vh', width: '100%' }}>
          <div className="hero-copy" style={{ textAlign: 'center', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{
              display: 'inline-flex',
              padding: '10px 24px',
              background: 'rgba(0, 0, 0, 0.4)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '50px',
              marginBottom: '30px',
              alignItems: 'center',
              gap: '12px',
              boxShadow: '0 4px 24px rgba(0, 229, 255, 0.15)'
            }}>
              <span style={{
                width: '10px', height: '10px', borderRadius: '50%',
                background: '#00E5FF',
                boxShadow: '0 0 12px #00E5FF'
              }}></span>
              <span style={{
                fontWeight: '800', letterSpacing: '2px', textTransform: 'uppercase', fontSize: '0.85rem',
                background: 'linear-gradient(90deg, #00E5FF, #FF9100)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                Next-Gen Coding Collaboration
              </span>
            </div>

            <h1 style={{
              fontSize: 'clamp(2.5rem, 6vw, 4rem)',
              letterSpacing: '-2px',
              textAlign: 'center',
              fontWeight: '900',
              lineHeight: '1.05'
            }}>
              <span style={{ color: 'white', textShadow: '0 10px 40px rgba(0,0,0,0.8)', display: 'inline-block' }}>Code. Collab.</span>
              <br />
              <span style={{
                background: 'linear-gradient(90deg, #00E5FF, #FF9100)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                display: 'inline-block',
                padding: '0 10px'
              }}>Compete Together.</span>
            </h1>
            
            <p style={{
              fontSize: '1.3rem',
              maxWidth: '650px',
              margin: '30px auto 40px',
              color: 'rgba(255,255,255,0.9)',
              textAlign: 'center',
              lineHeight: '1.6',
              textShadow: '0 2px 10px rgba(0,0,0,0.8)',
              fontWeight: '500'
            }}>
              Experience the ultimate real-time coding platform. Build, battle, and grow with a global community of developers.
            </p>

            <div className="hero-auth-panel">
              <div style={{ gap: '24px', justifyContent: 'center', display: 'flex', flexWrap: 'wrap' }}>
                <button onClick={() => setAuthOpen(true)} style={{
                  padding: '16px 40px',
                  fontSize: '1.2rem',
                  fontWeight: '800',
                  borderRadius: '50px',
                  border: 'none',
                  background: '#FF9100',
                  color: '#1a0e00',
                  cursor: 'pointer',
                  boxShadow: '0 8px 25px rgba(255, 145, 0, 0.4)',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}
                onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 15px 35px rgba(255, 145, 0, 0.6)'; e.currentTarget.style.background = '#ffa32a'; }}
                onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(255, 145, 0, 0.4)'; e.currentTarget.style.background = '#FF9100'; }}
                >
                  Get Started <span style={{ fontSize: '1.3rem' }}>→</span>
                </button>
                <button onClick={handleContinueAsGuest} style={{
                  padding: '16px 40px',
                  fontSize: '1.2rem',
                  fontWeight: '800',
                  borderRadius: '50px',
                  border: 'none',
                  background: '#00E5FF',
                  color: '#001a1d',
                  cursor: 'pointer',
                  boxShadow: '0 8px 25px rgba(0, 229, 255, 0.4)',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 15px 35px rgba(0, 229, 255, 0.6)'; e.currentTarget.style.background = '#33edff'; }}
                onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 229, 255, 0.4)'; e.currentTarget.style.background = '#00E5FF'; }}
                >
                  Continue as Guest
                </button>
              </div>
            </div>
          </div>
        </section>

        {authOpen && (
          <div className="auth-modal-overlay" style={{ backdropFilter: 'blur(10px)' }}>
            <form className="auth-modal-card glass-panel animate-fade-in-up" onSubmit={handleManualAuth} style={{ padding: '40px', maxWidth: '450px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <button
                className="auth-modal-close"
                type="button"
                onClick={() => setAuthOpen(false)}
                style={{ top: '20px', right: '20px', fontSize: '20px', opacity: 0.7 }}
              >
                ✕
              </button>

              <div className="auth-tabs" style={{ marginBottom: '30px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '4px' }}>
                <button
                  className={`auth-tab ${authTab === "login" ? "active" : ""}`}
                  type="button"
                  style={{ borderRadius: '10px', padding: '10px' }}
                  onClick={() => {
                    setAuthTab("login");
                    setAuthStatus("");
                  }}
                >
                  Log In
                </button>
                <button
                  className={`auth-tab ${authTab === "signup" ? "active" : ""}`}
                  type="button"
                  style={{ borderRadius: '10px', padding: '10px' }}
                  onClick={() => {
                    setAuthTab("signup");
                    setAuthStatus("");
                  }}
                >
                  Join Us
                </button>
              </div>

              <h2 style={{ textAlign: 'center', marginBottom: '30px', fontWeight: 700, fontSize: '2rem' }}>
                {authTab === "signup" ? "Create Account" : "Welcome Back"}
              </h2>

              <div className="auth-modal-fields" style={{ gap: '15px' }}>
                <input
                  type="text"
                  value={authForm.username}
                  onChange={(event) => updateAuthField("username", event.target.value)}
                  placeholder="Username"
                  className="glass-panel"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                  required
                />
                <input
                  type="password"
                  value={authForm.password}
                  onChange={(event) => updateAuthField("password", event.target.value)}
                  placeholder="Password"
                  className="glass-panel"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                  required
                />
                {authTab === "signup" && (
                  <input
                    type="password"
                    value={authForm.confirmPassword}
                    onChange={(event) => updateAuthField("confirmPassword", event.target.value)}
                    placeholder="Confirm Password"
                    className="glass-panel"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                    required
                  />
                )}
              </div>

              {authStatus && <p className="auth-modal-status" style={{ color: '#ff4b2b', textAlign: 'center', marginTop: '15px' }}>{authStatus}</p>}

              <button className="btn-modern primary" type="submit" disabled={authBusy} style={{ width: '100%', marginTop: '30px', justifyContent: 'center' }}>
                {authBusy ? "Processing..." : authTab === "signup" ? "Create Account" : "Sign In"}
              </button>

              <div className="auth-divider" style={{ margin: '25px 0', opacity: 0.5 }}>or continue with</div>

              <button className="btn-modern secondary" type="button" onClick={handleGoogleSignIn} style={{ width: '100%', justifyContent: 'center' }}>
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style={{ width: '20px' }} />
                Google
              </button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
