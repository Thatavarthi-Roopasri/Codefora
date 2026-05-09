import { Play, Loader2 } from "lucide-react";

export function RunPanel({ files, runFile, setRunFile, onRun, isRunningCode }) {
  return (
    <section className="run-panel">
      <div className="run-actions">
        <select 
          className="run-file-select"
          value={runFile} 
          onChange={(event) => setRunFile(event.target.value)}
        >
          {files.map((file) => (
            <option key={file.name} value={file.name}>
              {file.name}
            </option>
          ))}
        </select>
        <button className="button primary run-btn" onClick={onRun} disabled={isRunningCode}>
          {isRunningCode ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
          <span>{isRunningCode ? "Running..." : "Run Code"}</span>
        </button>
      </div>
    </section>
  );
}
