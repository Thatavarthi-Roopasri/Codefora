import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Maximize2, Minimize2, Target } from 'lucide-react';

export function TargetViewer({ targetImage, difficulty }) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const difficultyLabel = String(difficulty || 'easy')
    .trim()
    .toLowerCase()
    .replace(/^\w/, (char) => char.toUpperCase());

  function toggleFullscreen() {
    setIsFullscreen((current) => !current);
  }

  useEffect(() => {
    if (!isFullscreen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsFullscreen(false);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen]);

  if (!targetImage) return null;

  const containerStyle = isFullscreen
    ? {
        position: 'fixed',
        inset: 0,
        zIndex: 20000,
        display: 'flex',
        flexDirection: 'column',
        background: '#0f172a'
      }
    : {
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'rgba(15, 23, 42, 0.8)'
      };

  const content = (
    <div data-target-viewer-root={isFullscreen ? 'fullscreen' : 'inline'} style={containerStyle}>
      <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#3b82f6', fontWeight: '600' }}>
          <Target size={18} /> Target Design {difficultyLabel}
        </div>
        <button
          type="button"
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            toggleFullscreen();
          }}
          onClick={(event) => {
            if (event.detail === 0) {
              toggleFullscreen();
            }
          }}
          title={isFullscreen ? 'Minimize target design' : 'Maximize target design'}
          aria-label={isFullscreen ? 'Minimize target design' : 'Maximize target design'}
          style={{
            width: '34px',
            height: '34px',
            display: 'grid',
            placeItems: 'center',
            border: '1px solid rgba(255,255,255,0.14)',
            borderRadius: '6px',
            background: 'rgba(255,255,255,0.12)',
            color: '#ffffff',
            cursor: 'pointer',
            marginRight: isFullscreen ? 0 : '38px',
            position: 'relative',
            zIndex: 20
          }}
        >
          {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </button>
      </div>
      <div style={{ flex: 1, padding: isFullscreen ? '24px' : '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'auto' }}>
        <img 
          src={targetImage} 
          alt="UI Target" 
          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }} 
        />
      </div>
    </div>
  );

  return isFullscreen && typeof document !== 'undefined'
    ? createPortal(content, document.body)
    : content;
}
