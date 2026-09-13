import React, { useState } from 'react';
import { ExternalLink, X } from 'lucide-react';
import { withChallengePolicy } from '../../lib/preview';

export function WebPreviewFull({ previewDoc, onClose, challengeMode = false }) {
  const [width, setWidth] = useState(800);
  const openInNewTab = () => {
    const blob = new Blob([challengeMode ? withChallengePolicy(previewDoc) : previewDoc], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-primary)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 24px', borderBottom: '1px solid var(--glass-border)' }}>
        <h2 style={{ margin: 0, fontSize: '16px', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4ade80' }}></div>
          Live Preview
        </h2>
        <div style={{ display: 'flex', gap: '12px' }}>
          {challengeMode && <select aria-label="Practice preview width" value={width} onChange={event => setWidth(Number(event.target.value))}><option value={800}>Desktop 800px</option><option value={375}>Mobile 375px</option></select>}
          <button 
            className="button secondary compact" 
            onClick={openInNewTab}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
          >
            <ExternalLink size={14} />
            Open in New Tab
          </button>
          <button 
            className="button secondary compact" 
            onClick={onClose}
            title="Close Preview"
            style={{ padding: '0 8px', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>
      </div>
      <div style={{ flex: 1, backgroundColor: '#fff', minHeight: 0, overflow: 'auto' }}>
        <iframe
          title="Web preview full"
          sandbox={challengeMode ? '' : 'allow-scripts allow-modals allow-popups allow-forms'}
          srcDoc={challengeMode ? withChallengePolicy(previewDoc) : previewDoc}
          style={{ width: challengeMode ? width : '100%', height: '100%', border: 'none' }}
        />
      </div>
    </div>
  );
}
