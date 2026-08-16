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
            <p>Enterprise payment and coding platform for developers across India.</p>
          </div>

          <div className="rooms-footer-column">
            <h4>Company</h4>
            <ul>
              <li><NavLink to="/home">Home</NavLink></li>
              <li><NavLink to="/about">About</NavLink></li>
              <li><NavLink to="/services">Services</NavLink></li>
            </ul>
          </div>

          <div className="rooms-footer-column">
            <h4>Legal</h4>
            <ul>
              <li><NavLink to="/terms">Terms & Conditions</NavLink></li>
              <li><NavLink to="/privacy">Privacy Policy</NavLink></li>
              <li><NavLink to="/refund-policy">Refund Policy</NavLink></li>
            </ul>
          </div>

          <div className="rooms-footer-column">
            <h4>Contact</h4>
            <ul style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li>Website: codefora.online</li>
              <li><NavLink to="/feedback">Feedback</NavLink></li>
            </ul>
          </div>

        </div>

      <div className="rooms-footer-bottom" style={{ position: 'relative', zIndex: 2, borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <p>&copy; {new Date().getFullYear()} Codefora</p>
      </div>
    </footer>
  );
}
