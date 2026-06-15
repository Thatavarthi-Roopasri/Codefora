import React from 'react';

export const TourMascotTooltip = ({
  continuous,
  index,
  step,
  isLastStep,
  backProps,
  closeProps,
  skipProps,
  primaryProps,
  tooltipProps,
}) => {
  return (
    <div
      {...tooltipProps}
      style={{
        zIndex: 9999999,
        position: 'relative',
        background: 'var(--bg-glass)',
        backdropFilter: 'blur(16px)',
        border: '1px solid var(--glass-border)',
        borderRadius: '16px',
        padding: '24px',
        maxWidth: '350px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        color: 'var(--text-primary)',
        boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
        position: 'relative'
      }}
    >
      {/* Mascot Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: '50px',
          height: '50px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          border: '2px solid rgba(255,255,255,0.2)'
        }}>
          🤖
        </div>
        <div>
          <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Codefora Guide</h4>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Step {index + 1}</span>
        </div>
      </div>

      {/* Speech Bubble / Content */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        borderRadius: '12px',
        padding: '16px',
        fontSize: '0.95rem',
        lineHeight: '1.5',
        border: '1px solid rgba(255,255,255,0.05)'
      }}>
        {step.title && <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', color: '#fff' }}>{step.title}</h3>}
        {step.content}
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
        <button
          {...skipProps}
          onClick={(e) => {
            if (typeof window.setTourToggleState === 'function') window.setTourToggleState(false);
            const cb = document.getElementById('tour-toggle-checkbox');
            if (cb) cb.checked = false;
            
            // Brutal override: violently force localStorage memory
            try {
              const pathPage = window.location.pathname.startsWith('/code/') ? 'code_room' : 'rooms';
              localStorage.setItem(`codefora_tour_guest_${pathPage}`, 'true');
              if (window.currentUserUid) {
                localStorage.setItem(`codefora_tour_${window.currentUserUid}_${pathPage}`, 'true');
              }
            } catch(err) {}

            if (skipProps && skipProps.onClick) skipProps.onClick(e);
          }}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: '0.9rem',
            padding: '8px'
          }}
        >
          Skip Tour
        </button>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          {index > 0 && (
            <button
              {...backProps}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-primary)',
                padding: '8px 16px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              Back
            </button>
          )}
          <button
            {...primaryProps}
            onClick={(e) => {
              if (isLastStep) {
                if (typeof window.setTourToggleState === 'function') window.setTourToggleState(false);
                const cb = document.getElementById('tour-toggle-checkbox');
                if (cb) cb.checked = false;
                
                // Brutal override: violently force localStorage memory
                try {
                  const pathPage = window.location.pathname.startsWith('/code/') ? 'code_room' : 'rooms';
                  localStorage.setItem(`codefora_tour_guest_${pathPage}`, 'true');
                  if (window.currentUserUid) {
                    localStorage.setItem(`codefora_tour_${window.currentUserUid}_${pathPage}`, 'true');
                  }
                } catch(err) {}
              }
              if (primaryProps && primaryProps.onClick) primaryProps.onClick(e);
            }}
            style={{
              background: 'var(--accent-color, #3b82f6)',
              border: 'none',
              color: '#fff',
              padding: '8px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: 600
            }}
          >
            {isLastStep ? 'Finish ✔️' : 'Next ➔'}
          </button>
        </div>
      </div>
    </div>
  );
};
