import React from 'react';
import { X, Trophy, AlertCircle } from 'lucide-react';
import { BrandButton } from '../BrandButton';

export function ScoreModal({ isOpen, onClose, score, feedback, userImage, targetImage }) {
  if (!isOpen) return null;

  const isGood = score >= 80;
  const color = isGood ? '#22c55e' : (score >= 50 ? '#eab308' : '#ef4444');

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)',
      display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999
    }}>
      <div style={{
        background: 'rgba(15, 23, 42, 0.95)',
        border: `1px solid ${color}`,
        borderRadius: '24px',
        width: '90%', maxWidth: '900px',
        padding: '32px',
        textAlign: 'center',
        position: 'relative',
        boxShadow: `0 0 40px ${color}40`
      }}>
        <button 
          onClick={onClose}
          style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}
        >
          <X size={24} />
        </button>

        <div style={{ 
          width: '100px', height: '100px', 
          borderRadius: '50%', background: `${color}20`, 
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          margin: '0 auto 24px', border: `2px solid ${color}`
        }}>
          <h1 style={{ fontSize: '3rem', fontWeight: '900', color, margin: 0 }}>{score}</h1>
        </div>

        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
          {isGood ? <><Trophy color={color} /> Awesome Job!</> : <><AlertCircle color={color} /> Needs Work</>}
        </h2>

        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '1.1rem', marginBottom: '24px', fontStyle: 'italic' }}>
          "{feedback}"
        </p>

        {(userImage || targetImage) && (
          <div style={{ display: 'flex', gap: '24px', marginBottom: '24px', alignItems: 'flex-start' }}>
            {targetImage && (
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>Target Design</p>
                <img src={targetImage} alt="Target Design" style={{ width: '100%', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }} />
              </div>
            )}
            {userImage && (
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>Your Submission</p>
                <img src={userImage} alt="User Render" style={{ width: '100%', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }} />
              </div>
            )}
          </div>
        )}

        <BrandButton onClick={onClose} style={{ width: '100%', justifyContent: 'center', background: color, color: '#000' }}>
          Continue Coding
        </BrandButton>
      </div>
    </div>
  );
}
