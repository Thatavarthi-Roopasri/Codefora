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
            <p style={{ marginTop: '12px', fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>A product of BARG INFO SOLUTIONS</p>
          </div>

          <div className="rooms-footer-column">
            <h4>Company</h4>
            <ul>
              <li><NavLink to="/home">Home</NavLink></li>
              <li><NavLink to="/about">About</NavLink></li>
              <li><NavLink to="/services">Services</NavLink></li>
              <li><NavLink to="/contact">Contact</NavLink></li>
            </ul>
          </div>

          <div className="rooms-footer-column">
            <h4>Legal</h4>
            <ul>
              <li><NavLink to="/terms">Terms & Conditions</NavLink></li>
              <li><NavLink to="/privacy">Privacy Policy</NavLink></li>
              <li><NavLink to="/refund-policy">Refund Policy</NavLink></li>
              <li><NavLink to="/shipping">Shipping & Delivery</NavLink></li>
            </ul>
          </div>

          <div className="rooms-footer-column">
            <h4>Contact</h4>
            <ul style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li>Email: support@codefora.com</li>
              <li>Phone: +91 90000 00000</li>
              <li>Website: codefora.com</li>
            </ul>
          </div>

        </div>

      <div className="rooms-footer-bottom" style={{ position: 'relative', zIndex: 2, borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <p>&copy; {new Date().getFullYear()} BARG INFO SOLUTIONS. All rights reserved.</p>
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>Payments powered by licensed PCI-DSS partners.</p>
      </div>
    </footer>
  );
}
