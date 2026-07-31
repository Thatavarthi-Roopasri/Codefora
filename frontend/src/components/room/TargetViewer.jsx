import React from 'react';
import { Target, Maximize2 } from 'lucide-react';

export function TargetViewer({ targetImage, difficulty }) {
  if (!targetImage) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'rgba(15, 23, 42, 0.8)' }}>
      <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#3b82f6', fontWeight: '600' }}>
          <Target size={18} /> Target Design ({difficulty})
        </div>
      </div>
      <div style={{ flex: 1, padding: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'auto' }}>
        <img 
          src={targetImage} 
          alt="UI Target" 
          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }} 
        />
      </div>
    </div>
  );
}
