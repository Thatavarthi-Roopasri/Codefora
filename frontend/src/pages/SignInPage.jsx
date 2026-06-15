import { useNavigate, NavLink } from "react-router-dom";
import { useState, useEffect } from "react";
import { logoutUser, signInWithGoogle, auth } from "../lib/firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail, updateProfile, signOut } from "firebase/auth";
import { saveUsername } from "../lib/navigation";
import { api } from "../api/client";
import { BrandButton } from "../components/BrandButton";
import homevideo from "../../assets/homevideo.mp4";
import { useAuth } from "../hooks/useAuth";

export default function SignInPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  
  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState("login");
  const [authForm, setAuthForm] = useState({ username: "", email: "", password: "", confirmPassword: "" });
  const [authStatus, setAuthStatus] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [showResend, setShowResend] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      const isAdmin = ["ganeshvanamala16@gmail.com", "roopasri061216@gmail.com"].includes(user.email);
      navigate(isAdmin ? '/admin' : '/home', { replace: true });
    }
  }, [user, loading, navigate]);

  async function handleGoogleSignIn() {
    try {
      const result = await signInWithGoogle();
      const account = result?.user;
      
      const role = ["ganeshvanamala16@gmail.com", "roopasri061216@gmail.com"].includes(account.email) ? "admin" : "user";
      
      const displayName = account?.displayName || account?.email?.split("@")[0] || "Developer";
      saveUsername(displayName);
      if (account?.uid) localStorage.setItem("codefora_user_id", account.uid);
      if (role === "admin") {
        localStorage.setItem("codefora_role", "admin");
        localStorage.setItem("codefora_admin_token", "firebase_master_admin");
        navigate('/admin');
      } else {
        localStorage.setItem("codefora_role", "user");
        localStorage.removeItem("codefora_admin_token");
        navigate('/home');
      }
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

    localStorage.setItem("codefora_community", "sider");
    document.documentElement.dataset.community = "sider";
    saveUsername("Guest");
    navigate('/home');
  }

  function updateAuthField(field, value) {
    setAuthForm((current) => ({ ...current, [field]: value }));
    setAuthStatus("");
    setShowResend(false);
  }

  function finishManualAuth(account) {
    saveUsername(account.displayName || account.username);
    localStorage.setItem("codefora_user_id", account.userId);
    
    const isAdmin = ["ganeshvanamala16@gmail.com", "roopasri061216@gmail.com"].includes(account.email);
    if (isAdmin) {
      localStorage.setItem("codefora_role", "admin");
      localStorage.setItem("codefora_admin_token", "firebase_master_admin");
    } else {
      localStorage.setItem("codefora_role", "user");
      localStorage.removeItem("codefora_admin_token");
    }

    setAuthForm({ username: "", email: "", password: "", confirmPassword: "" });
    setAuthStatus("");
    setShowResend(false);

    if (isAdmin) navigate('/admin');
    else navigate('/home');
  }

  async function handleForgotPassword() {
    if (!authForm.email) {
      setAuthStatus("Please enter your email to reset password.");
      return;
    }
    setAuthBusy(true);
    setAuthStatus("");
    setShowResend(false);
    try {
      await sendPasswordResetEmail(auth, authForm.email);
      setAuthStatus("Password reset email sent! Please check your inbox (and spam folder).");
    } catch (error) {
      setAuthStatus(error.message || "Failed to send reset email.");
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleResendVerification() {
    if (!authForm.email || !authForm.password) {
      setAuthStatus("Please enter your email and password to resend the verification link.");
      return;
    }
    setAuthBusy(true);
    setAuthStatus("");
    try {
      // Sign them in temporarily just to get the user object to send the email
      const userCredential = await signInWithEmailAndPassword(auth, authForm.email, authForm.password);
      await sendEmailVerification(userCredential.user);
      await signOut(auth); // Sign them back out immediately
      
      setAuthStatus("A new verification email has been sent! Please check your inbox and spam folder.");
      setShowResend(false);
    } catch (error) {
      if (error.code === 'auth/too-many-requests') {
        setAuthStatus("Please wait a few minutes before requesting another email.");
      } else {
        setAuthStatus("Failed to resend email. Make sure your password is correct.");
      }
    } finally {
      setAuthBusy(false);
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
    setShowResend(false);

    try {
      if (authTab === "signup") {
        const userCredential = await createUserWithEmailAndPassword(auth, authForm.email, authForm.password);
        await updateProfile(userCredential.user, { displayName: authForm.username });
        await sendEmailVerification(userCredential.user);
        
        setAuthStatus("Account created successfully! IMPORTANT: Please check your email inbox AND YOUR SPAM FOLDER to verify your account before logging in. If you don't verify, you cannot log in.");
        await signOut(auth); // Force them to verify before actually getting access
        setAuthTab("login");
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, authForm.email, authForm.password);
        if (!userCredential.user.emailVerified) {
          setAuthStatus("Please verify your email address before logging in. Check your inbox and spam folder.");
          setShowResend(true);
          await signOut(auth);
          setAuthBusy(false);
          return;
        }
        
        finishManualAuth({
          userId: userCredential.user.uid,
          displayName: userCredential.user.displayName,
          email: userCredential.user.email
        });
      }
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') setAuthStatus("This email is already registered.");
      else if (error.code === 'auth/invalid-credential') setAuthStatus("Invalid email or password.");
      else if (error.code === 'auth/weak-password') setAuthStatus("Password should be at least 6 characters.");
      else setAuthStatus(error.message || "Authentication failed.");
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
        <source src={homevideo} type="video/mp4" />
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
                background: 'linear-gradient(90deg, #00E5FF, var(--primary-accent))',
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
                background: 'linear-gradient(90deg, #00E5FF, var(--primary-accent))',
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
                {authTab === "signup" && (
                  <input
                    type="text"
                    value={authForm.username}
                    onChange={(event) => updateAuthField("username", event.target.value)}
                    placeholder="Username"
                    className="glass-panel"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                    required
                  />
                )}
                <input
                  type="email"
                  value={authForm.email}
                  onChange={(event) => updateAuthField("email", event.target.value)}
                  placeholder="Email Address"
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

              {authStatus && <p className="auth-modal-status" style={{ color: '#00E5FF', textAlign: 'center', marginTop: '15px', padding: '10px', background: 'rgba(0, 229, 255, 0.1)', borderRadius: '8px', border: '1px solid rgba(0, 229, 255, 0.2)' }}>{authStatus}</p>}

              {showResend && (
                <div style={{ textAlign: 'center', marginTop: '10px' }}>
                  <button type="button" onClick={handleResendVerification} disabled={authBusy} style={{ background: 'none', border: 'none', color: '#00E5FF', fontSize: '0.9rem', cursor: 'pointer', textDecoration: 'underline', fontWeight: 'bold' }}>
                    Didn't receive it? Click here to resend.
                  </button>
                </div>
              )}

              {authTab === "login" && !showResend && (
                <div style={{ textAlign: 'right', marginTop: '10px' }}>
                  <button type="button" onClick={handleForgotPassword} style={{ background: 'none', border: 'none', color: 'var(--primary-accent)', fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'underline' }}>
                    Forgot Password?
                  </button>
                </div>
              )}

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
