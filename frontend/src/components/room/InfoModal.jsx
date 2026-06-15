import React from 'react';
import { X, Shield, Code, Eye, MessageSquare, Zap, Mic, BookOpen, Info, StickyNote, Upload } from 'lucide-react';

export function InfoModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="profile-modal-overlay" style={{ zIndex: 10000 }}>
      <div className="profile-modal-card" style={{ maxWidth: '600px', width: '90%' }}>
        <div className="profile-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Info size={20} className="text-orange" />
            <h3>Room Guide & Information</h3>
          </div>
          <button onClick={onClose} className="profile-modal-close">
            <X size={18} />
          </button>
        </div>
        
        <div className="profile-content" style={{ padding: '24px', maxHeight: '70vh', overflowY: 'auto' }}>
          <section style={{ marginBottom: '24px' }}>
            <h4 style={{ color: 'var(--brand-primary)', marginBottom: '12px', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shield size={16} /> Understanding Roles
            </h4>
            <div style={{ display: 'grid', gap: '12px' }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', borderLeft: '3px solid var(--primary-color)' }}>
                <strong>Host:</strong> Complete control over the room. Can change roles, kick members, and end the session.
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', borderLeft: '3px solid #3b82f6' }}>
                <strong>Editor:</strong> Can write code, manage files, and run code in the console.
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', borderLeft: '3px solid #94a3b8' }}>
                <strong>Viewer:</strong> Read-only access. Great for watching and learning without affecting the code.
              </div>
            </div>
          </section>

          <section style={{ marginBottom: '24px' }}>
            <h4 style={{ color: '#00f2ff', marginBottom: '12px', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={16} /> Features & Tools
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <MessageSquare size={16} style={{ color: '#50fa7b', flexShrink: 0 }} />
                <div style={{ fontSize: '0.85rem' }}>
                  <strong>Chat & AI:</strong> Chat with members or ask the AI for coding help in the bottom-right bubble.
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <StickyNote size={16} style={{ color: '#facc15', flexShrink: 0 }} />
                <div style={{ fontSize: '0.85rem' }}>
                  <strong>Rough/Notes:</strong> Use the "Rough" button at the top for a shared live scratchpad (Doodle/Type).
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <Upload size={16} style={{ color: 'var(--primary-color)', flexShrink: 0 }} />
                <div style={{ fontSize: '0.85rem' }}>
                  <strong>Import/Export:</strong> Upload files from your device or export the entire room as a ZIP archive.
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <Mic size={16} style={{ color: '#8be9fd', flexShrink: 0 }} />
                <div style={{ fontSize: '0.85rem' }}>
                  <strong>Voice Comms:</strong> Click the Mic button at the top to talk to everyone live in high quality.
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <BookOpen size={16} style={{ color: '#a855f7', flexShrink: 0 }} />
                <div style={{ fontSize: '0.85rem' }}>
                  <strong>Problem Info:</strong> Click "View Problem" at the top to see the description and constraints.
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <Zap size={16} style={{ color: '#3b82f6', flexShrink: 0 }} />
                <div style={{ fontSize: '0.85rem' }}>
                  <strong>Instant Sync:</strong> Code, notes, and file changes are synced instantly for all participants.
                </div>
              </div>
            </div>
          </section>

          <div style={{ background: 'rgba(var(--primary-rgb), 0.05)', padding: '15px', borderRadius: '10px', border: '1px solid rgba(var(--primary-rgb), 0.2)', fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>
            <strong>Pro Tip:</strong> Only the Host can change a Viewer to an Editor. If you're a viewer and want to code, ask the host in the chat!
          </div>
        </div>

        <div className="profile-modal-footer">
          <button className="button primary" onClick={onClose} style={{ width: '100%', justifyContent: 'center' }}>
            Got it, Let's Code!
          </button>
        </div>
      </div>
    </div>
  );
}
