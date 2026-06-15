import { Globe2, Loader2, Play, Terminal, Keyboard } from "lucide-react";
import { useState, useEffect, useRef } from "react";

// Double buffered iframe prevents the white flash when updating srcDoc
function DoubleBufferedIframe({ srcDoc, className, title, sandbox }) {
  const [activeIframe, setActiveIframe] = useState(0);
  const [docs, setDocs] = useState([srcDoc, '']);

  const activeIframeRef = useRef(0);

  useEffect(() => {
    setDocs(prev => {
      const inactiveIdx = 1 - activeIframeRef.current;
      if (prev[inactiveIdx] === srcDoc) return prev;
      const next = [...prev];
      next[inactiveIdx] = srcDoc;
      return next;
    });
  }, [srcDoc]);

  const handleLoad = (idx, currentDoc) => {
    if (currentDoc === srcDoc) {
      activeIframeRef.current = idx;
      setActiveIframe(idx);
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <iframe
        className={className}
        title={`${title} 0`}
        sandbox={sandbox}
        srcDoc={docs[0]}
        onLoad={() => handleLoad(0, docs[0])}
        style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          opacity: activeIframe === 0 ? 1 : 0,
          pointerEvents: activeIframe === 0 ? 'auto' : 'none'
        }}
      />
      <iframe
        className={className}
        title={`${title} 1`}
        sandbox={sandbox}
        srcDoc={docs[1]}
        onLoad={() => handleLoad(1, docs[1])}
        style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          opacity: activeIframe === 1 ? 1 : 0,
          pointerEvents: activeIframe === 1 ? 'auto' : 'none'
        }}
      />
    </div>
  );
}

export function ConsolePanel({ 
  output, 
  preview, 
  style, 
  onResizeStart, 
  onClear, 
  files = [], 
  runFile, 
  setRunFile, 
  onRun, 
  isRunningCode, 
  isSubmittingCode, 
  onSubmit, 
  activeProblem, 
  canSubmit,
  stdin,
  setStdin,
  panelMode: externalPanelMode,
  setPanelMode: externalSetPanelMode 
}) {
  const [localPanelMode, setLocalPanelMode] = useState("output");
  const panelMode = externalPanelMode !== undefined ? externalPanelMode : localPanelMode;
  const setPanelMode = externalSetPanelMode || setLocalPanelMode;
  const [showInput, setShowInput] = useState(true); // Default to showing input side-by-side for better onboarding

  const renderFormattedOutput = (rawOutput) => {
    if (!rawOutput) return <span style={{ color: 'var(--text-muted)' }}>Ready.</span>;
    const lines = rawOutput.split('\n');
    return lines.map((line, idx) => {
      const isStatus = line.toLowerCase().includes('status:');
      const isExecTime = line.toLowerCase().includes('execution time:');
      const isSuccessVal = !isStatus && !isExecTime && line.trim() !== "";
      
      if (isStatus) {
        return (
          <div key={idx} style={{ color: '#10b981', fontWeight: 'bold', marginTop: '8px', fontSize: '12px' }}>
            {line}
          </div>
        );
      }
      if (isExecTime) {
        return (
          <div key={idx} style={{ color: '#64748b', fontSize: '11px', marginTop: '4px' }}>
            {line}
          </div>
        );
      }
      return (
        <div key={idx} style={{ color: isSuccessVal ? '#10b981' : '#fff', fontSize: isSuccessVal ? '18px' : '13px', fontWeight: isSuccessVal ? 'bold' : 'normal', fontFamily: 'monospace' }}>
          {line}
        </div>
      );
    });
  };


  return (
    <section className="console-panel tour-console" style={style}>
      <div className="resize-handle" onMouseDown={onResizeStart} onDoubleClick={(event) => event.preventDefault()} aria-hidden="true" />
      <div className="console-panel-head">
        <div className="panel-tabs">
          <button 
            className={panelMode === "output" ? "active" : ""} 
            onClick={() => setPanelMode("output")}
          >
            <Terminal size={15} /> 
            <span>Console</span>
          </button>
          {preview && (
            <button 
              className={`${panelMode === "preview" ? "active" : ""} tour-web-preview`} 
              onClick={() => setPanelMode("preview")}
            >
              <Globe2 size={15} /> 
              <span>Web Preview</span>
            </button>
          )}
        </div>
        
        <div className="console-actions">
          {panelMode === "output" && (
            <button 
              className={`button compact console-run-btn ${showInput ? "active" : ""}`} 
              onClick={() => setShowInput(!showInput)}
              title="Toggle Custom Input (stdin)"
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px',
                height: '30px',
                borderRadius: '6px',
                border: '1px solid var(--primary-orange)',
                background: 'transparent',
                color: 'var(--primary-orange)',
                fontWeight: 'bold',
                fontSize: '12px',
                cursor: 'pointer',
                padding: '0 12px'
              }}
            >
              <Keyboard size={14} style={{ color: 'var(--primary-orange)' }} />
              <span>Input</span>
            </button>
          )}
          
          {activeProblem && (
            <button 
              className="button secondary console-run-btn" 
              onClick={onSubmit} 
              disabled={isRunningCode || isSubmittingCode || !canSubmit}
              title={!canSubmit ? "Viewers cannot submit solutions" : "Submit solution against all test cases"}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                height: '30px',
                borderRadius: '6px',
                background: 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#fff',
                fontWeight: '500',
                fontSize: '12px',
                cursor: (isRunningCode || isSubmittingCode || !canSubmit) ? 'not-allowed' : 'pointer',
                padding: '0 12px',
                opacity: (isRunningCode || isSubmittingCode || !canSubmit) ? 0.6 : 1
              }}
            >
              {isSubmittingCode ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
              <span>{isSubmittingCode ? "Submitting..." : "Submit"}</span>
            </button>
          )}

          <button 
            className="button secondary console-run-btn" 
            onClick={onClear}
            style={{
              height: '30px',
              borderRadius: '6px',
              background: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#fff',
              fontWeight: '500',
              fontSize: '12px',
              cursor: 'pointer',
              padding: '0 12px'
            }}
          >
            Clear
          </button>
        </div>
      </div>
      
      <div className="console-panel-content">
        {panelMode === "output" ? (
          showInput ? (
            <div className="console-split-container" style={{ display: 'flex', height: '100%', width: '100%', gap: '16px', padding: '16px', boxSizing: 'border-box' }}>
              <div className="console-input-half" style={{ flex: '1 1 40%', display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
                <div style={{ fontSize: '11px', color: '#3b82f6', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                  Custom Input (stdin)
                </div>
                <div style={{ flex: 1, background: '#070c14', border: '1px solid rgba(255, 255, 255, 0.04)', borderRadius: '8px', display: 'flex', minHeight: 0 }}>
                  <textarea 
                    style={{ 
                      flex: 1, 
                      background: 'transparent', 
                      color: '#fff', 
                      border: 'none', 
                      resize: 'none', 
                      padding: '12px', 
                      fontFamily: '"Cascadia Code", "Fira Code", monospace',
                      fontSize: '12px',
                      lineHeight: '1.5',
                      outline: 'none'
                    }}
                    value={stdin || ""}
                    onChange={(e) => setStdin?.(e.target.value)}
                    placeholder="Type or paste sample inputs here..."
                  />
                </div>
              </div>
              <div className="console-output-half" style={{ flex: '1 1 60%', display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
                <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                  Output
                </div>
                <div style={{ flex: 1, background: '#070c14', border: '1px solid rgba(255, 255, 255, 0.04)', borderRadius: '8px', padding: '16px', overflowY: 'auto', boxSizing: 'border-box', minHeight: 0 }}>
                  {renderFormattedOutput(output)}
                </div>
              </div>
            </div>
          ) : (
            <div className="console-container" style={{ padding: '16px', height: '100%', boxSizing: 'border-box', overflowY: 'auto', minHeight: 0 }}>
              {renderFormattedOutput(output)}
            </div>
          )
        ) : preview?.showPreview ? (
          <div className="preview-container" style={{ width: '100%', height: '100%' }}>
            <iframe
              className="preview-iframe"
              title="Web preview"
              sandbox="allow-scripts allow-modals allow-popups allow-forms allow-same-origin"
              srcDoc={preview.previewDoc}
              style={{ width: '100%', height: '100%', border: 'none' }}
            />
          </div>
        ) : (
          <div className="console-output empty" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
            <Globe2 size={40} style={{ opacity: 0.2, marginBottom: '16px' }} />
            <p>No HTML file detected for preview.</p>
            <p style={{ fontSize: '12px', opacity: 0.7, marginTop: '8px' }}>Create an index.html file to view it here.</p>
          </div>
        )}
      </div>
    </section>
  );
}
