import { LogIn, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

export function LoginRequiredModal({ open, onClose, message = "Please login to save your work." }) {
  const navigate = useNavigate();
  const location = useLocation();

  if (!open) return null;

  const handleLogin = () => {
    onClose?.();
    navigate("/", {
      state: {
        returnTo: `${location.pathname}${location.search || ""}${location.hash || ""}`
      }
    });
  };

  return (
    <div
      className="auth-modal-overlay"
      style={{ zIndex: 10000 }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-required-title"
    >
      <div
        className="auth-modal-card glass-panel"
        style={{ maxWidth: "420px", padding: "32px", textAlign: "center" }}
        onClick={(event) => event.stopPropagation()}
      >
        <button className="auth-modal-close" type="button" onClick={onClose} aria-label="Close login prompt">
          <X size={18} />
        </button>
        <div
          style={{
            width: "52px",
            height: "52px",
            borderRadius: "50%",
            margin: "0 auto 18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(255, 122, 24, 0.14)",
            color: "var(--primary-orange)"
          }}
        >
          <LogIn size={24} />
        </div>
        <h2 id="login-required-title" style={{ marginBottom: "10px" }}>Login required</h2>
        <p style={{ color: "rgba(255,255,255,0.72)", margin: "0 0 24px", lineHeight: 1.5 }}>
          {message}
        </p>
        <button
          className="auth-submit-button"
          type="button"
          onClick={handleLogin}
          style={{ width: "100%", justifyContent: "center" }}
        >
          Login
        </button>
      </div>
    </div>
  );
}
