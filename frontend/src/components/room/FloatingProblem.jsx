import React, { useState, useRef, useEffect } from 'react';
import { X, GripHorizontal, BookOpen } from 'lucide-react';

export function FloatingProblem({ problem, onClose }) {
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const windowRef = useRef(null);

  const onMouseDown = (e) => {
    // Only drag from the header
    if (e.target.closest('.floating-header')) {
      setIsDragging(true);
      dragStart.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y
      };
    }
  };

  useEffect(() => {
    const onMouseMove = (e) => {
      if (!isDragging) return;
      
      const newX = e.clientX - dragStart.current.x;
      const newY = e.clientY - dragStart.current.y;
      
      // Basic bounds checking
      const boundedX = Math.max(0, Math.min(window.innerWidth - 400, newX));
      const boundedY = Math.max(0, Math.min(window.innerHeight - 300, newY));
      
      setPosition({ x: boundedX, y: boundedY });
    };

    const onMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isDragging]);

  if (!problem) return null;

  return (
    <div 
      ref={windowRef}
      className="floating-problem-window"
      style={{ 
        transform: `translate(${position.x}px, ${position.y}px)`,
        zIndex: 1000
      }}
    >
      <div className="floating-header" onMouseDown={onMouseDown}>
        <div className="header-title">
          <BookOpen size={16} />
          <span>Problem: {problem.title}</span>
        </div>
        <div className="header-actions">
          <GripHorizontal size={16} className="drag-handle" />
          <button className="close-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="floating-body">
        <div className="problem-panel-meta" style={{ padding: '8px 0', borderBottom: '1px solid var(--line)', marginBottom: '12px' }}>
          <span className={`difficulty-${problem.difficulty.toLowerCase()}`}>{problem.difficulty}</span>
          <span>{problem.acceptance}% acceptance</span>
        </div>
        
        <div className="floating-scroll-area">
          <section className="problem-section">
            <p>{problem.statement}</p>
          </section>

          <section className="problem-section" style={{ marginTop: '16px' }}>
            <h3 style={{ fontSize: '13px', color: 'var(--heading)' }}>Constraints</h3>
            <ul style={{ fontSize: '12px', paddingLeft: '18px' }}>
              {problem.constraints.map((c, i) => <li key={i}>{c}</li>)}
            </ul>
          </section>

          <section className="problem-section" style={{ marginTop: '16px' }}>
            <h3 style={{ fontSize: '13px', color: 'var(--heading)' }}>Sample Test Cases</h3>
            {problem.tests.map((test, i) => (
              <div key={i} className="sample-case-mini" style={{ padding: '8px' }}>
                <strong style={{ fontSize: '11px' }}>Sample {i + 1}</strong>
                <div className="sample-io" style={{ gap: '6px' }}>
                  <div>
                    <small style={{ fontSize: '9px' }}>Input</small>
                    <pre style={{ fontSize: '11px', padding: '6px' }}>{test.input}</pre>
                  </div>
                  <div>
                    <small style={{ fontSize: '9px' }}>Output</small>
                    <pre style={{ fontSize: '11px', padding: '6px' }}>{test.output}</pre>
                  </div>
                </div>
              </div>
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}
