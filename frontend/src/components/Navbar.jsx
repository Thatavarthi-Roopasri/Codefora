import { NavLink, useNavigate } from "react-router-dom";
import { BrandButton } from "./BrandButton";
import { logoutUser } from "../lib/firebase";
import { useAuth } from "../hooks/useAuth";

export function Navbar() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logoutUser();
      localStorage.removeItem('codefora_username');
      localStorage.removeItem('codefora_user_id');
      navigate('/');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const linkStyle = ({ isActive }) => ({
    fontWeight: 600,
    color: isActive ? '#fff' : 'rgba(255,255,255,0.7)',
    textDecoration: 'none',
    borderBottom: isActive ? '2px solid var(--primary-accent)' : '2px solid transparent',
    paddingBottom: '4px',
    transition: 'all 0.2s'
  });

  return (
    <header style={{ 
      display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
      padding: '20px 40px', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
      position: 'relative',
      zIndex: 100
    }}>
      <BrandButton logo />
      <nav className="tour-navbar" style={{ gap: '40px', display: 'flex', alignItems: 'center' }}>
        <NavLink to="/home" end style={linkStyle}>Home</NavLink>
        <NavLink to="/rooms" style={linkStyle}>Rooms</NavLink>
        <NavLink to="/problems" style={linkStyle}>Problems</NavLink>
        <NavLink to="/playground" style={linkStyle}>Playground</NavLink>
        <NavLink to="/feedback" style={linkStyle}>Feedback</NavLink>
        {isAdmin && <NavLink to="/admin" style={linkStyle}>Dashboard</NavLink>}
        <NavLink to="/profile" style={linkStyle}>Profile</NavLink>
      </nav>
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        {user ? (
          <>
            <span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>
              {user.displayName || user.email?.split('@')[0]}
            </span>
            <button onClick={handleLogout} style={{ 
              padding: '8px 20px', fontSize: '14px', background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '8px',
              cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s'
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}>
              Logout
            </button>
          </>
        ) : (
          <button onClick={() => navigate('/')} style={{ 
            padding: '8px 20px', fontSize: '14px', background: 'var(--primary)',
            border: 'none', color: '#1b1020', borderRadius: '8px',
            cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s'
          }}>
            Login
          </button>
        )}
      </div>
    </header>
  );
}
