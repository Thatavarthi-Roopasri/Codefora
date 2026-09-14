import React from 'react';
import { X, Trophy, AlertCircle, Maximize2 } from 'lucide-react';
import { BrandButton } from '../BrandButton';

export function ScoreModal({ isOpen, onClose, score, feedback, userImage, targetImage }) {
  if (!isOpen) return null;

  const isGood = score >= 75;
  const color = isGood ? '#22c55e' : (score >= 55 ? '#eab308' : '#ef4444');
  const title = score >= 90 ? 'Pixel Perfect!' : score >= 75 ? 'Great Match!' : score >= 55 ? 'Getting Close' : 'Needs Work';
  const previewFrameStyle = {
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(2,6,23,0.72)',
    overscrollBehavior: 'contain'
  };
  const previewImageStyle = {
    display: 'block'
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)',
      display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999,
      padding: '18px',
      overflowY: 'auto'
    }}>
      <div style={{
        background: 'rgba(15, 23, 42, 0.95)',
        border: `1px solid ${color}`,
        borderRadius: '24px',
        width: 'min(96vw, 1280px)',
        maxHeight: 'calc(100vh - 36px)',
        padding: '22px',
        textAlign: 'center',
        position: 'relative',
        boxShadow: `0 0 40px ${color}40`,
        overflowY: 'auto'
      }}>
        <button 
          onClick={onClose}
          style={{ position: 'sticky', top: '0', marginLeft: 'auto', marginBottom: '-28px', zIndex: 2, display: 'flex', background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}
        >
          <X size={24} />
        </button>

        <div style={{
          width: '86px', height: '86px',
          borderRadius: '50%', background: `${color}20`,
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          margin: '0 auto 16px', border: `2px solid ${color}`
        }}>
          <h1 style={{ fontSize: '2.6rem', fontWeight: '900', color, margin: 0 }}>{score}</h1>
        </div>

        <h2 style={{ fontSize: '1.35rem', fontWeight: 'bold', marginBottom: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
          {isGood ? <><Trophy color={color} /> {title}</> : <><AlertCircle color={color} /> {title}</>}
        </h2>

        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '1rem', marginBottom: '18px', fontStyle: 'italic' }}>
          "{feedback}"
        </p>

        {(userImage || targetImage) && (
          <div className="score-comparison-grid" style={{ marginBottom: '18px' }}>
            {targetImage && (
              <div style={{ minWidth: 0 }}>
                <div className="score-preview-heading">
                  <p>Target Design</p>
                  <a href={targetImage} target="_blank" rel="noreferrer" aria-label="Open target design full size">
                    <Maximize2 size={14} />
                  </a>
                </div>
                <div className="score-preview-frame" style={previewFrameStyle}>
                  <img src={targetImage} alt="Target Design" style={previewImageStyle} />
                </div>
              </div>
            )}
            {userImage && (
              <div style={{ minWidth: 0 }}>
                <div className="score-preview-heading">
                  <p>Your Submission</p>
                  <a href={userImage} target="_blank" rel="noreferrer" aria-label="Open your submission full size">
                    <Maximize2 size={14} />
                  </a>
                </div>
                <div className="score-preview-frame" style={previewFrameStyle}>
                  <img src={userImage} alt="User Render" style={previewImageStyle} />
                </div>
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
