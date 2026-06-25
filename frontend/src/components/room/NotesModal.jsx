import { Eraser, Pencil, Type, Trash2, X, Maximize2, Minimize2, ExternalLink } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function NotesModal({ isOpen, onClose, notes, onUpdateText, onDraw, permissions, inline }) {
  const canvasRef = useRef(null);
  const [mode, setMode] = useState("draw"); // 'draw' or 'text'
  const [activeTool, setActiveTool] = useState("pencil"); // 'pencil' or 'eraser'
  const [isDrawing, setIsDrawing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const currentPath = useRef([]);

  useEffect(() => {
    if (!canvasRef.current || !isOpen) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    
    // Clear and redraw all paths
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    const drawsArray = notes.draws || [];
    drawsArray.forEach(path => {
      if (path.points && path.points.length > 0) {
        ctx.beginPath();
        ctx.lineWidth = path.width || 3;
        ctx.strokeStyle = path.color || "#000000";
        ctx.moveTo(path.points[0].x, path.points[0].y);
        path.points.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.stroke();
      }
    });
  }, [isOpen, notes.draws, isExpanded]);

  if (!isOpen) return null;

  const startDrawing = (e) => {
    if (mode !== "draw" || !permissions.canEdit) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setIsDrawing(true);
    lastPos.current = { x, y };

    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    if (activeTool === "pencil") {
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#000000";
    } else {
      ctx.lineWidth = 25;
      ctx.strokeStyle = "#ffffff";
    }
  };

  const draw = (e) => {
    if (!isDrawing || mode !== "draw" || !permissions.canEdit) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(x, y);
    ctx.stroke();

    if (!currentPath.current) currentPath.current = [];
    currentPath.current.push({ x, y });

    lastPos.current = { x, y };
  };

  const stopDrawing = () => {
    if (isDrawing && permissions.canEdit) {
      if (currentPath.current.length > 0) {
        onDraw({ 
          points: currentPath.current,
          color: activeTool === "pencil" ? "#000000" : "#ffffff",
          width: activeTool === "pencil" ? 3 : 25
        });
        currentPath.current = [];
      }
    }
    setIsDrawing(false);
  };

  const content = (
      <div className={`notes-card ${isExpanded ? 'expanded' : ''}`} style={inline ? { width: '100%', height: '100%', maxWidth: 'none', maxHeight: 'none', borderRadius: 0, border: 'none', display: 'flex', flexDirection: 'column' } : {}}>
        <div className="notes-header">
          <div className="notes-title">
            <Pencil size={18} style={{ color: "var(--primary-orange)" }} />
            <h3>Rough Notes / Shared Scratchpad</h3>
          </div>
          <div className="notes-actions">
            <button 
              className={`button compact ghost ${mode === 'draw' && activeTool === 'pencil' ? 'active' : ''}`} 
              onClick={() => {
                setMode('draw');
                setActiveTool('pencil');
              }}
              title="Pencil Tool"
            >
              <Pencil size={16} />
            </button>
            <button 
              className={`button compact ghost ${mode === 'draw' && activeTool === 'eraser' ? 'active' : ''}`} 
              onClick={() => {
                setMode('draw');
                setActiveTool('eraser');
              }}
              title="Eraser Tool"
            >
              <Eraser size={16} />
            </button>
            <button 
              className={`button compact ghost ${mode === 'text' ? 'active' : ''}`} 
              onClick={() => setMode('text')}
              title="Type Notes"
            >
              <Type size={16} />
            </button>
            <button 
              className="button compact ghost" 
              onClick={() => onDraw('clear')}
              title="Clear Scratchpad"
              disabled={!permissions.canEdit}
              style={{ color: "#ef4444" }}
            >
              <Trash2 size={16} />
            </button>
            <div className="notes-divider" />
            {inline && (
              <button 
                className="button compact ghost" 
                onClick={() => window.open(window.location.pathname + "?view=notes", "_blank")}
                title="Open in New Tab"
              >
                <ExternalLink size={16} />
              </button>
            )}
            {!inline && (
              <button 
                className="button compact ghost" 
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? "Minimize" : "Expand"}
              >
                {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
            )}
            <button className="button compact ghost close-btn" onClick={onClose}><X size={18} /></button>
          </div>
        </div>

        <div className="notes-content" style={inline ? { flex: 1, minHeight: 0 } : {}}>
          <div className={`notes-canvas-container ${mode === 'draw' ? 'active' : ''}`} style={inline ? { overflow: 'auto', height: '100%' } : {}}>
            <canvas
              ref={canvasRef}
              width={inline ? 1600 : (isExpanded ? 1000 : 600)}
              height={inline ? 1000 : (isExpanded ? 700 : 400)}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              style={{ cursor: activeTool === 'pencil' ? 'crosshair' : 'cell' }}
            />
          </div>
          <div className={`notes-text-container ${mode === 'text' ? 'active' : ''}`}>
            <textarea
              placeholder="Type your notes here... everyone can see and edit."
              value={notes.text || ""}
              onChange={(e) => onUpdateText(e.target.value)}
              disabled={!permissions.canEdit}
            />
          </div>
        </div>
        <div className="notes-footer">
          <p>This is a shared scratchpad. All members can doodle, erase, or type live.</p>
        </div>
      </div>
  );

  if (inline) {
    return content;
  }

  return (
    <div className={`notes-overlay ${isExpanded ? 'expanded' : ''}`} onClick={(e) => e.target === e.currentTarget && onClose()}>
      {content}
    </div>
  );
}
