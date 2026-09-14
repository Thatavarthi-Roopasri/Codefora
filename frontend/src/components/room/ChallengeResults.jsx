import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export function ChallengeResults({ isOpen, onClose, score, feedback, reports = [], history = [] }) {
  const [width, setWidth] = useState(800);
  const [difference, setDifference] = useState(false);
  const dialog = useRef(null);
  const frames = useRef([]);
  const report = reports.find(item => item.width === width) || reports[0];
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.focus();
    return () => { document.body.style.overflow = overflow; previous?.focus(); };
  }, [isOpen]);
  if (!isOpen) return null;
  function keys(event) {
    if (event.key === 'Escape') onClose();
    if (event.key !== 'Tab') return;
    const elements = [...dialog.current.querySelectorAll('button:not(:disabled), input, select, a[href]')];
    const first = elements[0], last = elements.at(-1);
    if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog.current)) { event.preventDefault(); first?.focus(); }
  }
  return createPortal(<div className="challenge-results-backdrop">
    <section className="challenge-results" ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="challenge-result-title" onKeyDown={keys}>
      <header><div><span className="challenge-eyebrow">Visual accuracy</span><h2 id="challenge-result-title">{score}/100 · {score >= 99 ? 'Near-identical match' : 'Your comparison'}</h2></div><button onClick={onClose} aria-label="Close challenge results">Close</button></header>
      <p>{feedback}</p>
      <p className="challenge-muted">Equal weight: foreground pixel accuracy and structural similarity, averaged across desktop and mobile. HTML/CSS only; scripts and external assets are excluded. Captures stop at 2000px height.</p>
      <div className="challenge-result-controls">
        <label>Viewport <select value={width} onChange={event => setWidth(Number(event.target.value))}><option value={800}>Desktop · 800px</option><option value={375}>Mobile · 375px</option></select></label>
        <label><input type="checkbox" checked={difference} onChange={event => setDifference(event.target.checked)} /> Show difference image</label>
        {report && <span>Pixels {report.pixelAccuracy}% · Structure {report.structuralSimilarity}%</span>}
      </div>
      {report && <>
        <ul>{report.differences.map(text => <li key={text}>{text}</li>)}</ul>
        <div className="challenge-result-images">{[['Target', report.targetImage], [difference ? 'Differences (red marks mismatch)' : 'Your submission', difference ? report.differenceImage : report.userImage]].map(([label, source], index) => <figure key={label}>
          <figcaption>{label}</figcaption><div ref={element => { frames.current[index] = element; }} onScroll={event => { const other = frames.current[1 - index]; if (other && Math.abs(other.scrollTop - event.currentTarget.scrollTop) > 1) other.scrollTop = event.currentTarget.scrollTop; }}><img src={source} alt={label} /></div>
        </figure>)}</div>
      </>}
      {history.length > 0 && <p>Recent scores: {history.slice(-8).map(item => item.score).join(' → ')}</p>}
      <button className="challenge-primary-action" onClick={onClose}>Continue improving</button>
    </section>
  </div>, document.body);
}
