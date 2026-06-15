import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader2, Save, Play, Code2, Layout, Terminal, Globe, ChevronRight, Plus, Upload, X, Download } from 'lucide-react';
import JSZip from "jszip";
import Editor from "@monaco-editor/react";
import { Navbar } from "../components/Navbar";
import { ConsolePanel } from "../components/room/ConsolePanel";
import { api } from "../api/client";
import { useAuth } from "../hooks/useAuth";
import { buildPreview } from "../lib/preview";
import { useTheme } from "../hooks/useTheme";
import { BOILERPLATES } from "../components/room/EditorPanel";

const FILE_TYPES = [
  { label: "JavaScript", language: "javascript", extension: ".js" },
  { label: "TypeScript", language: "typescript", extension: ".ts" },
  { label: "Python", language: "python", extension: ".py" },
  { label: "Java", language: "java", extension: ".java" },
  { label: "C", language: "c", extension: ".c" },
  { label: "C++", language: "cpp", extension: ".cpp" },
  { label: "C#", language: "csharp", extension: ".cs" },
  { label: "Go", language: "go", extension: ".go" },
  { label: "Rust", language: "rust", extension: ".rs" },
  { label: "PHP", language: "php", extension: ".php" },
  { label: "Ruby", language: "ruby", extension: ".rb" },
  { label: "Swift", language: "swift", extension: ".swift" },
  { label: "HTML", language: "html", extension: ".html" },
  { label: "CSS", language: "css", extension: ".css" },
  { label: "SQL", language: "sql", extension: ".sql" }
];

export function PlaygroundPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { theme } = useTheme();
  const [files, setFiles] = useState([
    { name: 'index.html', language: 'html', code: '<!-- HTML Playground -->\n<div class="hero">\n  <h1>Codefora Playground</h1>\n  <p>Start coding instantly.</p>\n</div>' },
    { name: 'styles.css', language: 'css', code: '.hero {\n  text-align: center;\n  padding: 50px;\n  background: #0f172a;\n  color: white;\n  border-radius: 12px;\n}' },
    { name: 'main.js', language: 'javascript', code: 'console.log("Hello from Playground!");' }
  ]);

  const [activeName, setActiveName] = useState('index.html');
  const [output, setOutput] = useState("Ready to code.");
  const [stdin, setStdin] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [newFileType, setNewFileType] = useState(FILE_TYPES[0].language);
  const [consoleHeight, setConsoleHeight] = useState(300);
  const [isResizing, setIsResizing] = useState(false);
  const resizeStart = useRef({ y: 0, height: 300 });
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (location.state?.initialFiles) {
      setFiles(location.state.initialFiles);
      if (location.state.initialFiles.length > 0) {
        setActiveName(location.state.initialFiles[0].name);
      }
    }
  }, [location.state]);

  const handleCreateFile = () => {
    const selectedType = FILE_TYPES.find((type) => type.language === newFileType) || FILE_TYPES[0];
    const cleanName = newFileName.trim();
    if (!cleanName) return;
    const fileName = cleanName.includes(".") ? cleanName : `${cleanName}${selectedType.extension}`;
    if (files.some(f => f.name === fileName)) {
      alert("File already exists");
      return;
    }
    const boilerplate = BOILERPLATES[selectedType.language] || "";
    const newFile = { name: fileName, language: selectedType.language, code: boilerplate };
    setFiles(prev => [...prev, newFile]);
    setActiveName(fileName);
    setNewFileName("");
  };

  const handleImport = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      const fileName = file.name;
      const ext = `.${fileName.split('.').pop()}`;
      const typeMatch = FILE_TYPES.find(t => t.extension === ext);
      const newFile = { name: fileName, language: typeMatch?.language || "javascript", code: content };
      setFiles(prev => {
        if (prev.some(f => f.name === fileName)) return prev;
        return [...prev, newFile];
      });
      setActiveName(fileName);
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      if (files.length === 1) {
        const file = files[0];
        const blob = new Blob([file.code || ""], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const zip = new JSZip();
        files.forEach(f => zip.file(f.name, f.code || ""));
        const content = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(content);
        const a = document.createElement("a");
        a.href = url;
        a.download = `playground_export.zip`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Export failed", error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteFile = (name) => {
    if (files.length <= 1) return;
    setFiles(prev => prev.filter(f => f.name !== name));
    if (activeName === name) {
      setActiveName(files.find(f => f.name !== name).name);
    }
  };

  const [previewTarget, setPreviewTarget] = useState(null);
  const activeFile = files.find(f => f.name === activeName) || files[0];
  const previewDoc = buildPreview(files, previewTarget);

  const handleCodeChange = (value) => {
    setFiles(prev => prev.map(f => f.name === activeName ? { ...f, code: value } : f));
  };

  const handleRun = async () => {
    if (activeFile.language === 'html' || activeFile.language === 'css') {
      if (activeFile.language === 'html') {
        setPreviewTarget(activeFile.name);
      }
      setOutput("Preview updated.");
      return;
    }
    
    setIsRunning(true);
    setOutput("Running...");
    try {
      const res = await api.runCode({
        language: activeFile.language === 'javascript' ? 'javascript' : activeFile.language,
        code: activeFile.code,
        input: stdin
      });
      setOutput(res.output || res.message || "Finished.");
    } catch (err) {
      setOutput("Error: " + err.message);
    } finally {
      setIsRunning(false);
    }
  };

  const handleSave = async () => {
    if (!user) {
      alert("Please login to save your work.");
      return;
    }
    setIsSaving(true);
    try {
      await api.saveWork(user.uid, {
        name: "Playground Project",
        files,
        type: "playground"
      });
      alert("Project saved to 'My Works'!");
    } catch (err) {
      alert("Failed to save: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Resize logic
  const handleResize = (e) => {
    if (isResizing) {
      const delta = e.clientY - resizeStart.current.y;
      const newHeight = resizeStart.current.height - delta;
      setConsoleHeight(Math.max(100, Math.min(newHeight, window.innerHeight - 100)));
    }
  };

  const stopResizing = () => {
    setIsResizing(false);
  };

  useEffect(() => {
    window.addEventListener('mousemove', handleResize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', handleResize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [isResizing, consoleHeight]);

  return (
    <div className="playground-container" style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#020817' }}>
      {isResizing && <div style={{ position: 'fixed', inset: 0, zIndex: 9999, cursor: 'row-resize' }} />}
      <Navbar />
      
      <div className="playground-header" style={{ 
        padding: '12px 24px', 
        background: 'rgba(15, 23, 42, 0.6)', 
        borderBottom: '1px solid var(--glass-border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary-orange)', minWidth: 'fit-content' }}>
            <Layout size={20} />
            <h2 style={{ fontSize: '1.1rem', margin: 0, fontWeight: '700' }}>Playground</h2>
          </div>

          <div className="file-tools tour-pg-file-create" style={{ 
            borderBottom: 'none', 
            background: 'transparent', 
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <input
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateFile()}
              placeholder="new-file"
              className="playground-input"
              style={{ width: '100px', height: '30px', fontSize: '12px' }}
            />
            <select
              className="file-type-select"
              value={newFileType}
              onChange={(e) => setNewFileType(e.target.value)}
              style={{ height: '30px', fontSize: '12px' }}
            >
              {FILE_TYPES.map((type) => (
                <option key={type.language} value={type.language}>
                  {type.label}
                </option>
              ))}
            </select>
            <button className="button compact secondary create-file-button" onClick={handleCreateFile} title="Create File">
              <Plus size={14} /> <span>Create</span>
            </button>

            <div className="file-tools-divider" style={{ margin: '0 4px' }} />

            <button 
              className="button compact secondary create-file-button tour-pg-file-import" 
              onClick={() => fileInputRef.current?.click()}
              title="Import"
            >
              <Upload size={14} /> <span>Import</span>
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              onChange={handleImport} 
            />

            <button 
              className="button compact secondary create-file-button tour-pg-file-export" 
              onClick={handleExport}
              disabled={isExporting}
              title="Export"
            >
              <Download size={14} /> <span>{isExporting ? '...' : 'Export'}</span>
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button 
            className="button primary compact tour-pg-run" 
            onClick={handleRun} 
            disabled={isRunning}
            style={{ gap: '8px' }}
          >
            {isRunning ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
            Run
          </button>
          <button 
            className="button secondary compact tour-pg-save" 
            onClick={handleSave}
            disabled={isSaving}
            style={{ gap: '8px' }}
          >
            <Save size={16} />
            {isSaving ? "Saving..." : "Save Work"}
          </button>
        </div>
      </div>

      <div className="playground-tabs-row tour-pg-tabs" style={{ 
        padding: '0 24px', 
        background: 'rgba(15, 23, 42, 0.4)', 
        borderBottom: '1px solid var(--glass-border)',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        height: '36px'
      }}>
        {files.map(f => (
          <div 
            key={f.name}
            className={`file-tab ${activeName === f.name ? "active" : ""}`}
            style={{ 
              height: '30px', 
              fontSize: '12px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              padding: '0 12px',
              borderRadius: '6px 6px 0 0',
              cursor: 'pointer',
              background: activeName === f.name ? 'rgba(var(--primary-rgb), 0.1)' : 'transparent',
              color: activeName === f.name ? 'var(--primary-orange)' : 'var(--text-muted)',
              border: activeName === f.name ? '1px solid var(--glass-border)' : '1px solid transparent',
              borderBottom: activeName === f.name ? '2px solid var(--primary-orange)' : '1px solid transparent'
            }}
            onClick={() => setActiveName(f.name)}
          >
            <Code2 size={14} />
            <span>{f.name}</span>
            {files.length > 1 && (
              <X 
                size={12} 
                className="hover-danger" 
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteFile(f.name);
                }} 
              />
            )}
          </div>
        ))}
      </div>

      <div className="playground-main" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          {/* Editor Section */}
          <div className="tour-pg-editor" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, overflow: 'hidden' }}>
            <Editor
              height="100%"
              theme="vs-dark"
              language={activeFile.language}
              value={activeFile.code}
              onChange={handleCodeChange}
              options={{
                fontSize: 14,
                lineHeight: 24,
                minimap: { enabled: false },
                wordWrap: 'on',
                padding: { top: 20 },
                fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', monospace"
              }}
            />
          </div>

          {/* Preview Section */}
          <div style={{ width: '40%', display: 'flex', flexDirection: 'column', background: '#fff', borderLeft: '1px solid var(--line)', minHeight: 0, overflow: 'hidden' }}>
            <div style={{ padding: '8px 16px', background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b' }}>
              <Globe size={14} />
              <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Web Preview</span>
            </div>
            <iframe 
              srcDoc={previewDoc}
              title="preview"
              style={{ flex: 1, border: 'none', width: '100%' }}
            />
          </div>
        </div>

          <ConsolePanel
            output={output}
            preview={undefined}
            style={{ height: `${consoleHeight}px`, flex: "0 0 auto", borderTop: '2px solid var(--primary-orange)' }}
            onResizeStart={(e) => {
              e.preventDefault();
              resizeStart.current = { y: e.clientY, height: consoleHeight };
              setIsResizing(true);
            }}
          onClear={() => setOutput("Ready.")}
          stdin={stdin}
          setStdin={setStdin}
        />
      </div>
    </div>
  );
}
