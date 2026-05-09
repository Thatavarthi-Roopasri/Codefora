import { Globe2, Loader2, Play, Terminal } from "lucide-react";
import { useState } from "react";

export function ConsolePanel({ output, preview, style, onResizeStart, onClear, files = [], runFile, setRunFile, onRun, isRunningCode }) {
  const [panelMode, setPanelMode] = useState("output");

  return (
    <section className="console-panel" style={style}>
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
          <button 
            className={panelMode === "preview" ? "active" : ""} 
            disabled={!preview.showPreview} 
            onClick={() => setPanelMode("preview")}
          >
            <Globe2 size={15} /> 
            <span>Web Preview</span>
          </button>
        </div>
        
        <div className="console-actions">
          <select
            className="run-file-select console-run-file"
            value={runFile}
            onChange={(event) => setRunFile(event.target.value)}
            aria-label="File to run"
          >
            {files.map((file) => (
              <option key={file.name} value={file.name}>
                {file.name}
              </option>
            ))}
          </select>
          <button className="button primary run-btn console-run-btn" onClick={onRun} disabled={isRunningCode}>
            {isRunningCode ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
            <span>{isRunningCode ? "Running..." : "Run Code"}</span>
          </button>
          <button className="button compact" onClick={onClear}>Clear</button>
        </div>
      </div>
      
      <div className="console-panel-content">
        {panelMode === "output" ? (
          <div className="console-container">
            <pre className="console-output">{output}</pre>
          </div>
        ) : preview.showPreview ? (
          <div className="preview-container">
            <iframe 
              className="preview-iframe" 
              title="Web preview" 
              sandbox="allow-scripts" 
              srcDoc={preview.previewDoc} 
            />
          </div>
        ) : (
          <div className="console-output empty">
            <Globe2 size={40} className="text-muted opacity-20" />
            <p>No HTML file detected for preview.</p>
          </div>
        )}
      </div>
    </section>
  );
}
