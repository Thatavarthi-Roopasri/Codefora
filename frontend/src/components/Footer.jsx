import React from "react";
import { NavLink } from "react-router-dom";
import { BrandButton } from "./BrandButton";
import loopsbg from "../../assets/loopsbgimage.jpeg";

export function Footer() {
  return (
    <footer className="rooms-footer" style={{ 
      position: 'relative',
      marginTop: 'auto'
    }}>
      {/* Background Image with Filter */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `url(${loopsbg})`, 
        backgroundSize: 'cover', 
        backgroundPosition: 'center',
        filter: 'var(--home-video-filter)',
        zIndex: 0
      }}></div>
      
      {/* Overlay for footer readability */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1 }}></div>
      
      <div className="rooms-footer-content" style={{ position: 'relative', zIndex: 2 }}>
          <div className="rooms-footer-brand">
            <BrandButton logo />
            <p>The real-time competitive coding platform for developers to learn, compete and grow together.</p>
          </div>

          <div className="rooms-footer-column">
            <h4>Platform</h4>
            <ul>
              <li><NavLink to="/rooms">Rooms</NavLink></li>
              <li><NavLink to="/problems">Problems</NavLink></li>
              <li><NavLink to="/home">Battles</NavLink></li>
              <li><NavLink to="/home">Contests</NavLink></li>
              <li><NavLink to="/home">Leaderboard</NavLink></li>
            </ul>
          </div>

          <div className="rooms-footer-column">
            <h4>Resources</h4>
            <ul>
              <li><NavLink to="/home">Blog</NavLink></li>
              <li><NavLink to="/home">Docs</NavLink></li>
              <li><NavLink to="/home">Guides</NavLink></li>
              <li><NavLink to="/home">API</NavLink></li>
              <li><NavLink to="/home">Changelog</NavLink></li>
            </ul>
          </div>

          <div className="rooms-footer-column">
            <h4>Community</h4>
            <ul>
              <li><NavLink to="/home">Discussions</NavLink></li>
              <li><NavLink to="/home">Events</NavLink></li>
              <li><NavLink to="/home">Top Users</NavLink></li>
              <li><NavLink to="/home">Hall of Fame</NavLink></li>
              <li><NavLink to="/feedback">Support</NavLink></li>
            </ul>
          </div>

          <div className="rooms-footer-column">
            <h4>Legal</h4>
            <ul>
              <li><NavLink to="/privacy">Privacy Policy</NavLink></li>
              <li><NavLink to="/terms">Terms of Service</NavLink></li>
              <li><NavLink to="/conduct">Code of Conduct</NavLink></li>
            </ul>
          </div>

        </div>

      <div className="rooms-footer-bottom" style={{ position: 'relative', zIndex: 2, borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: '40px' }}>
        <p>&copy; {new Date().getFullYear()} Codefora. All rights reserved.</p>
        <p>Made with <span style={{ color: 'var(--brand-primary, var(--primary-color))' }}>❤️</span> for developers</p>
      </div>
    </footer>
  );
}
