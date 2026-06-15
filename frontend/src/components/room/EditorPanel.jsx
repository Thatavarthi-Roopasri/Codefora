import Editor from "@monaco-editor/react";
import { Activity, Download, FileCode2, Plus, Upload, X, CheckCircle2, Save, AlignLeft, MoreHorizontal, Play, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "../../hooks/useTheme";
import { socket } from "../../lib/socket";
import { API_URL } from "../../config";
import JSZip from "jszip";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { MonacoBinding } from "y-monaco";

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

export const BOILERPLATES = {
  javascript: "function solution() {\n  // write your code here\n}\n\nconsole.log(solution());",
  typescript: "function solution(): void {\n  // write your code here\n}\n\nconsole.log(solution());",
  python: "def solution():\n    # write your code here\n    pass\n\nif __name__ == '__main__':\n    solution()",
  java: "public class Main {\n    public static void main(String[] args) {\n        // write your code here\n    }\n}",
  c: "#include <stdio.h>\n\nint main() {\n    // write your code here\n    return 0;\n}",
  cpp: "#include <iostream>\nusing namespace std;\n\nint main() {\n    // write your code here\n    return 0;\n}",
  csharp: "using System;\n\nclass Program {\n    static void Main() {\n        // write your code here\n    }\n}",
  go: "package main\n\nimport \"fmt\"\n\nfunc main() {\n    // write your code here\n}",
  rust: "fn main() {\n    // write your code here\n}",
  php: "<?php\n// write your code here\n?>",
  sql: "-- write your sql here",
  html: "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n    <meta charset=\"UTF-8\">\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n    <title>Document</title>\n    <!-- <link rel=\"stylesheet\" href=\"style.css\"> -->\n</head>\n<body>\n    \n    <!-- <script src=\"script.js\"></script> -->\n</body>\n</html>",
  css: "/* write your css here */\nbody {\n    margin: 0;\n    padding: 0;\n    font-family: sans-serif;\n}"
};

export function EditorPanel({ roomId, allowCopyPaste, files, activeFile, activeName, setActiveName, users, typing, typingCursors, permissions, onChange, onUpdateFileCode, onCreateFile, onExpectActiveName, onDeleteFile, onChangeLanguage, onSaveWork, onRun, onSubmit, isRunningCode, isSubmittingCode, canSubmit }) {
  const [newFileName, setNewFileName] = useState("");
  const [newFileType, setNewFileType] = useState(FILE_TYPES[0].language);
  const [languageCache, setLanguageCache] = useState({});
  const [pendingDeleteFile, setPendingDeleteFile] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isExporting, setIsExporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [editorInstance, setEditorInstance] = useState(null);
  const [editorTick, setEditorTick] = useState(0);
  const fileInputRef = useRef(null);
  const { theme } = useTheme();
  const editorDisposables = useRef([]);
  const activeFileNameRef = useRef(activeFile?.name);
  const typingCursorsRef = useRef(typingCursors);
  const isRemoteUpdate = useRef(false);
  const allowCopyPasteRef = useRef(allowCopyPaste);

  useEffect(() => {
    allowCopyPasteRef.current = allowCopyPaste;
  }, [allowCopyPaste]);

  useEffect(() => {
    typingCursorsRef.current = typingCursors;
  }, [typingCursors]);

  useEffect(() => {
    activeFileNameRef.current = activeFile?.name;
  }, [activeFile?.name]);

  function createFile() {
    const isNewFileContext = newFileName.trim().length > 0;
    const activeLanguage = isNewFileContext ? newFileType : (activeFile?.language || newFileType || "javascript");
    const selectedType = FILE_TYPES.find((type) => type.language === activeLanguage) || FILE_TYPES[0];
    const cleanName = newFileName.trim();
    if (!cleanName) return;
    const fileName = cleanName.includes(".") ? cleanName : `${cleanName}${selectedType.extension}`;
    const boilerplate = BOILERPLATES[selectedType.language] || "";
    onCreateFile(fileName, selectedType.language, boilerplate);
    if (onExpectActiveName) onExpectActiveName(fileName);
    setNewFileName("");
  }

  function handleImport(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        let fileName = file.name || "imported-file";
        // Infer language from extension
        const ext = fileName.includes('.') ? `.${fileName.split('.').pop()}` : '';
        const typeMatch = FILE_TYPES.find(t => t.extension === ext);
        
        // Ensure unique filename
        let attempt = 1;
        let baseName = ext ? fileName.replace(ext, "") : fileName;
        while (files.some(f => f.name === fileName)) {
          fileName = `${baseName}-${attempt}${ext}`;
          attempt++;
        }

        onCreateFile(fileName, typeMatch?.language || "javascript", content);
        if (onExpectActiveName) onExpectActiveName(fileName);
      } catch (err) {
        console.error("Failed to parse or create imported file", err);
      }
    };
    reader.onloadend = () => {
      event.target.value = ""; // Safely reset after reading finishes
    };
    reader.readAsText(file);
  }

  async function handleExport() {
    if (selectedFiles.length === 0) return;
    setIsExporting(true);

    try {
      if (selectedFiles.length === 1) {
        // Single file download
        const fileName = selectedFiles[0];
        const file = files.find(f => f.name === fileName);
        if (file) {
          const blob = new Blob([file.code || ""], { type: "text/plain" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = fileName;
          a.click();
          URL.revokeObjectURL(url);
        }
      } else {
        // Multi-file ZIP
        const zip = new JSZip();
        selectedFiles.forEach(fileName => {
          const file = files.find(f => f.name === fileName);
          if (file) {
            zip.file(fileName, file.code || "");
          }
        });
        const content = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(content);
        const a = document.createElement("a");
        a.href = url;
        a.download = `codefora_export_${roomId || "room"}.zip`;
        a.click();
        URL.revokeObjectURL(url);
      }
      setShowExportModal(false);
    } catch (error) {
      console.error("Export failed", error);
    } finally {
      setIsExporting(false);
    }
  }

  async function handleSaveWork() {
    if (!onSaveWork) return;
    setIsSaving(true);
    setSaveMessage("");
    const result = await onSaveWork(`Project in ${roomId}`);
    if (result.success) {
      setSaveMessage("Saved!");
    } else {
      setSaveMessage("Error");
      alert(result.error || "Failed to save work");
    }
    setIsSaving(false);
    setTimeout(() => setSaveMessage(""), 3000);
  }

  function toggleFileSelection(fileName) {
    setSelectedFiles(prev => 
      prev.includes(fileName) ? prev.filter(f => f !== fileName) : [...prev, fileName]
    );
  }

  const otherUsers = users.filter((user) => user.socketId !== socket.id);

  const yjsRefs = useRef({ doc: null, provider: null, binding: null, saveTimeout: null, boundFile: null });
  const onChangeRef = useRef(onChange);
  const onUpdateFileCodeRef = useRef(onUpdateFileCode);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    onUpdateFileCodeRef.current = onUpdateFileCode;
  }, [onUpdateFileCode]);

  useEffect(() => {
    return () => {
      editorDisposables.current.forEach((disposable) => disposable.dispose());
      editorDisposables.current = [];
      if (yjsRefs.current.provider) {
        yjsRefs.current.provider.destroy();
        try {
          yjsRefs.current.binding.destroy();
        } catch (error) {}
        yjsRefs.current.doc.destroy();
        clearTimeout(yjsRefs.current.saveTimeout);
      }
    };
  }, []);

  useEffect(() => {
    if (!editorInstance || !activeFile || !roomId) return;

    let modelChangeDisposable = null;

    const bindYjs = () => {
      const model = editorInstance.getModel();
      if (!model) return;

      // CRITICAL FIX: Monaco defaults to CRLF (\r\n) on Windows. 
      // y-monaco maps strictly by string length. If Y.Text uses \n but Monaco uses \r\n, 
      // indices will drift and text will insert on the wrong lines for other users!
      // Forcing LF (0) eliminates this exact desync issue.
      model.setEOL(0);

      const modelPath = model.uri.path;
      // We only bind if the current Monaco model matches the active file tab
      // model.uri.path is usually something like "/main.js"
      if (!modelPath.endsWith(activeFile.name)) {
        return; // The model hasn't swapped yet, wait for onDidChangeModel
      }

      // If already bound to this exact file, do nothing
      if (yjsRefs.current.boundFile === activeFile.name && yjsRefs.current.provider) {
        return;
      }

      // Destroy old Yjs instance before binding new one
      if (yjsRefs.current.provider) {
        try {
          yjsRefs.current.provider.destroy();
          yjsRefs.current.binding.destroy();
          yjsRefs.current.doc.destroy();
        } catch (error) {
          console.warn("Yjs cleanup warning:", error);
        }
        clearTimeout(yjsRefs.current.saveTimeout);
      }

      const doc = new Y.Doc();
      const wsUrl = API_URL.replace(/^http/, 'ws') + '/yjs';
      const docRoomName = `room-${roomId}-file-${activeFile.name.replace(/[^a-zA-Z0-9-.]/g, '')}`;
      const provider = new WebsocketProvider(wsUrl, docRoomName, doc);
      const type = doc.getText("monaco");

      const binding = new MonacoBinding(type, model, new Set([editorInstance]), provider.awareness);

      const currentUser = users.find(u => u.socketId === socket.id);
      const color = currentUser?.color || (currentUser?.role === "Host" ? "#ffb000" : "#8b5cf6");
      provider.awareness.setLocalStateField('user', {
        name: currentUser?.name || 'Anonymous',
        color: color
      });

      yjsRefs.current = { doc, provider, binding, saveTimeout: yjsRefs.current.saveTimeout, boundFile: activeFile.name };
    };

    // Try to bind immediately
    bindYjs();

    // Also bind whenever Monaco's model changes
    modelChangeDisposable = editorInstance.onDidChangeModel(() => {
      bindYjs();
    });

    // Track local cursor movements to broadcast so the UsersPanel can show "typing in main.js:4"
    const disposables = [
      editorInstance.onDidChangeModelContent(() => {
        clearTimeout(yjsRefs.current.saveTimeout);
        yjsRefs.current.saveTimeout = setTimeout(() => {
          if (onChangeRef.current) {
            onChangeRef.current(editorInstance.getValue());
          }
          yjsRefs.current.saveTimeout = null;
        }, 300);
      }),
      editorInstance.onKeyDown(() => {
        setTimeout(() => {
          const position = editorInstance.getPosition();
          if (!position || !activeFile.name) return;
          socket.emit("typing", {
            roomId,
            fileName: activeFile.name,
            position: { lineNumber: position.lineNumber, column: position.column },
            isTyping: true
          });
        }, 0);
      }),
      editorInstance.onDidChangeCursorPosition((event) => {
        // reason === 3 means Explicit (user clicked or used arrow keys)
        if (event.reason !== 3 || !activeFile.name) return;
        socket.emit("cursor:update", {
          roomId,
          fileName: activeFile.name,
          position: { lineNumber: event.position.lineNumber, column: event.position.column },
          isTyping: false
        });
      })
    ];

    const handleBeforeUnload = () => {
      if (yjsRefs.current.provider) {
        yjsRefs.current.provider.disconnect();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      disposables.forEach((disposable) => disposable.dispose());
      if (modelChangeDisposable) modelChangeDisposable.dispose();
      
      if (yjsRefs.current.provider) {
        // Flush any pending text to React state before destroying the Yjs connection
        // We MUST use onUpdateFileCode with the exact boundFile, otherwise rapidly switching tabs
        // causes the old file to be overwritten with the new file's text!
        if (yjsRefs.current.saveTimeout && onUpdateFileCodeRef.current && yjsRefs.current.boundFile) {
          onUpdateFileCodeRef.current(yjsRefs.current.boundFile, yjsRefs.current.doc.getText("monaco").toString());
        }
        
        // Delay provider destruction to allow pending Yjs WebRTC/WebSocket messages to flush to the server
        const p = yjsRefs.current.provider;
        const b = yjsRefs.current.binding;
        const d = yjsRefs.current.doc;
        
        // IMPORTANT: Clear the refs instantly so that if the user rapidly switches tabs, 
        // the NEW tab doesn't accidentally instantly assassinate this OLD provider before it flushes!
        yjsRefs.current.provider = null;
        yjsRefs.current.binding = null;
        yjsRefs.current.doc = null;
        clearTimeout(yjsRefs.current.saveTimeout);
        yjsRefs.current.saveTimeout = null;

        // IMPORTANT: Destroy the Monaco binding IMMEDIATELY to prevent duplicate keystroke listeners
        // if the user switches back to this tab before the 1500ms timeout finishes!
        try {
          b.destroy();
          // Instantly clear awareness so the user's "phantom cursor" disappears on tab switch!
          if (p.awareness) {
            p.awareness.setLocalState(null);
          }
        } catch (error) {
          console.warn("Binding cleanup warning:", error);
        }
        
        setTimeout(() => {
          try {
            p.destroy();
            d.destroy();
          } catch (error) {
            console.warn("Provider cleanup warning:", error);
          }
        }, 1500);
        
        yjsRefs.current = { doc: null, provider: null, binding: null, saveTimeout: null, boundFile: null };
      }
    };
  }, [editorInstance, activeFile?.name, roomId]);

  // Keep awareness up to date without destroying the connection
  useEffect(() => {
    if (!yjsRefs.current.provider) return;
    const currentUser = users.find(u => u.socketId === socket.id);
    const color = currentUser?.color || (currentUser?.role === "Host" ? "#ffb000" : "#8b5cf6");
    
    yjsRefs.current.provider.awareness.setLocalStateField('user', {
      name: currentUser?.name || 'Anonymous',
      color: color
    });

    // Dynamically inject box-shadow glows that match the injected border-color
    const updateCursorGlows = () => {
      if (!yjsRefs.current.provider) return;
      const states = yjsRefs.current.provider.awareness.getStates();
      let css = '';
      states.forEach((state, clientId) => {
        if (state.user && state.user.color) {
          css += `
            .yRemoteSelection-${clientId} { background-color: ${state.user.color}33 !important; }
            .yRemoteSelectionHead-${clientId} { 
              border-left-color: ${state.user.color} !important; 
              box-shadow: 0 0 8px ${state.user.color}, 0 0 16px ${state.user.color} !important; 
            }
          `;
        }
      });
      let styleEl = document.getElementById('yjs-custom-glows');
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'yjs-custom-glows';
        document.head.appendChild(styleEl);
      }
      styleEl.textContent = css;
    };

    yjsRefs.current.provider.awareness.on('change', updateCursorGlows);
    updateCursorGlows();

    return () => {
      if (yjsRefs.current.provider) {
        yjsRefs.current.provider.awareness.off('change', updateCursorGlows);
      }
    };
  }, [users]);

  return (
    <section className="editor-panel tour-editor">
      <div className="file-tabs">
        {files.map((file) => (
          <div className={`file-tab ${activeName === file.name ? "active" : ""}`} key={file.name}>
            <button
              className="file-tab-main"
              onClick={() => setActiveName(file.name)}
              type="button"
            >
              <FileCode2 size={14} />
              <span>{file.name}</span>
            </button>
            <button
              className="file-tab-close"
              type="button"
              disabled={!permissions.canEdit || files.length <= 1}
              onClick={() => setPendingDeleteFile(file.name)}
              aria-label={`Delete ${file.name}`}
              title="Delete file"
            >
              <X size={13} />
            </button>
          </div>
        ))}
      </div>


      <div className="file-tools" style={{ 
        display: 'flex', 
        flexDirection: 'row', 
        alignItems: 'center', 
        padding: '6px 12px',
        width: '100%',
        justifyContent: 'space-between',
        position: 'relative',
        zIndex: 100,
        overflow: 'visible',
        background: '#0a0e17',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
      }}>
        {/* Left Side: New File Creator & Language Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Inline New File Textbox & button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', borderRight: '1px solid rgba(255,255,255,0.08)', paddingRight: '8px' }}>
            <input
              type="text"
              placeholder="New file name..."
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              disabled={!permissions.canEdit}
              style={{
                background: '#121822',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '12px',
                padding: '4px 8px',
                width: '120px',
                outline: 'none'
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  createFile();
                }
              }}
            />
            <button
              onClick={createFile}
              disabled={!permissions.canEdit || !newFileName.trim()}
              title="Create new file"
              style={{
                background: 'var(--primary-orange)',
                border: 'none',
                borderRadius: '6px',
                color: '#000',
                width: '24px',
                height: '24px',
                display: 'grid',
                placeItems: 'center',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '14px',
                transition: 'all 0.2s',
                opacity: newFileName.trim() ? 1 : 0.5
              }}
            >
              +
            </button>
          </div>

          <select
            className="file-type-select"
            disabled={!permissions.canEdit}
            value={newFileName.trim() ? newFileType : (activeFile?.language || "javascript")}
            onChange={(event) => {
              const lang = event.target.value;
              if (newFileName.trim()) {
                setNewFileType(lang);
              } else if (onChangeLanguage && activeFile) {
                const baseName = activeFile.name.includes(".") ? activeFile.name.substring(0, activeFile.name.lastIndexOf(".")) : activeFile.name;
                
                // Now that we have the latest cache, we can look up the new code
                const cachedCode = languageCache[baseName]?.[lang];
                const newCode = cachedCode !== undefined ? cachedCode : (BOILERPLATES[lang] || "");
                
                // Cache current code (pure state update)
                setLanguageCache(prev => ({
                  ...prev,
                  [baseName]: {
                    ...(prev[baseName] || {}),
                    [activeFile.language]: activeFile.code
                  }
                }));
                
                // Send both rename and new code in one shot (outside state updater)
                onChangeLanguage(activeFile.name, lang, newCode);
              }
            }}
            style={{
              background: '#121822',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '12px',
              padding: '4px 10px',
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            {FILE_TYPES.map((type) => (
              <option key={type.language} value={type.language}>
                {type.label === "Java" ? "Java (17)" : type.label === "Python" ? "Python (3)" : type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Right Side: More, Run Code, Submit */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

          {/* More Menu Trigger */}
          <div style={{ position: 'relative' }}>
            <button 
              className="button compact secondary"
              style={{
                height: '30px',
                borderRadius: '6px',
                background: 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                fontWeight: '500',
                cursor: 'pointer',
                padding: '0 12px'
              }}
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              title="More Actions"
            >
              <MoreHorizontal size={13} />
              <span>More</span>
            </button>

            {showMoreMenu && (
              <div style={{
                position: 'absolute',
                right: 0,
                top: '36px',
                background: '#121822',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                padding: '8px',
                zIndex: 1000,
                width: '220px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}>
                <div style={{ padding: '2px 6px', fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 'bold' }}>File Operations</div>
                


                <button 
                  onClick={() => {
                    fileInputRef.current?.click();
                    setShowMoreMenu(false);
                  }}
                  disabled={!permissions.canEdit}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255,255,255,0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '11px',
                    padding: '6px 8px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    width: '100%'
                  }}
                >
                  <Upload size={12} />
                  <span>Import File</span>
                </button>

                <button 
                  onClick={() => {
                    setSelectedFiles(files.map(f => f.name));
                    setShowExportModal(true);
                    setShowMoreMenu(false);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255,255,255,0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '11px',
                    padding: '6px 8px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    width: '100%'
                  }}
                >
                  <Download size={12} />
                  <span>Export Files</span>
                </button>

                <button 
                  onClick={() => {
                    handleSaveWork();
                    setShowMoreMenu(false);
                  }}
                  disabled={isSaving}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255,255,255,0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '11px',
                    padding: '6px 8px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    width: '100%'
                  }}
                >
                  <Save size={12} />
                  <span>{isSaving ? "Saving Workspace..." : saveMessage || "Save Workspace"}</span>
                </button>
              </div>
            )}
            
            {/* Hidden file input must be outside the conditionally rendered dropdown */}
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              onChange={handleImport} 
            />
          </div>

          {/* Run Code Button */}
          <button 
            className="button compact secondary tour-run-button"
            style={{
              height: '30px',
              borderRadius: '6px',
              background: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              fontWeight: '500',
              cursor: isRunningCode ? 'not-allowed' : 'pointer',
              padding: '0 12px',
              opacity: isRunningCode ? 0.6 : 1
            }}
            onClick={onRun}
            disabled={isRunningCode}
            title="Run Code"
          >
            <Play size={13} />
            <span>{isRunningCode ? "Running..." : "Run Code"}</span>
          </button>

          {/* Submit Button */}
          <button 
            className="button compact tour-submit-button"
            style={{
              height: '30px',
              borderRadius: '6px',
              background: 'var(--primary-orange)',
              border: 'none',
              color: '#000',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: (!canSubmit || isSubmittingCode) ? 'not-allowed' : 'pointer',
              padding: '0 14px',
              opacity: isSubmittingCode ? 0.6 : 1
            }}
            onClick={onSubmit}
            disabled={!canSubmit || isSubmittingCode}
            title="Submit Code"
          >
            <Send size={13} style={{ color: '#000' }} />
            <span>{isSubmittingCode ? "Submitting..." : "Submit"}</span>
          </button>
        </div>
      </div>

      <div 
        className="editor-wrap tour-code-editor"
        onKeyDownCapture={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
            e.preventDefault();
            e.stopPropagation();
            if (onRun && !isRunningCode) onRun();
          }
          if ((e.ctrlKey || e.metaKey) && e.key === "'") {
            e.preventDefault();
            e.stopPropagation();
            if (onSubmit && canSubmit && !isSubmittingCode) onSubmit();
          }
        }}
      >
        <Editor
          height="100%"
          theme={theme === "dark" ? "vs-dark" : "light"}
          language={activeFile?.language || "javascript"}
          path={activeFile?.name || "main.js"}
          onMount={(editor) => {
            setEditorInstance(editor);
            editor.onKeyDown((e) => {
              if (allowCopyPasteRef.current === false) {
                const key = e.browserEvent.key.toLowerCase();
                if ((e.ctrlKey || e.metaKey) && (key === "c" || key === "v" || key === "x")) {
                  e.preventDefault();
                  e.stopPropagation();
                }
              }
            });
          }}
          onChange={(value) => {
            // Yjs handles the sync. We don't manually emit on every stroke here.
          }}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineHeight: 24,
            readOnly: !permissions.canEdit,
            wordWrap: "on",
            scrollBeyondLastLine: false,
            padding: { top: 16 },
            cursorSmoothCaretAnimation: "on",
            smoothScrolling: true,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace"
          }}
        />
      </div>

      {showExportModal && (
        <div className="file-delete-overlay" style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'grid', placeItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }} role="dialog" aria-modal="true" aria-label="Export files modal">
          <div className="file-delete-card export-modal">
            <div className="export-modal-header">
              <h3>Export Files</h3>
              <button className="button compact ghost" onClick={() => setShowExportModal(false)}><X size={16} /></button>
            </div>
            <p className="export-subtitle">Select the files you want to download.</p>
            
            <div className="export-file-list">
              {files.map(file => (
                <label key={file.name} className="export-file-item">
                  <input 
                    type="checkbox" 
                    checked={selectedFiles.includes(file.name)}
                    onChange={() => toggleFileSelection(file.name)}
                  />
                  <FileCode2 size={14} />
                  <span>{file.name}</span>
                </label>
              ))}
            </div>

            <div className="file-delete-actions">
              <div className="export-actions-left">
                <button 
                  className="button ghost compact" 
                  onClick={() => setSelectedFiles(files.map(f => f.name))}
                >
                  Select All
                </button>
                <button 
                  className="button ghost compact" 
                  onClick={() => setSelectedFiles([])}
                >
                  Clear
                </button>
              </div>
              <button 
                type="button" 
                className="button success compact" 
                disabled={selectedFiles.length === 0 || isExporting}
                onClick={handleExport}
              >
                {isExporting ? "Exporting..." : `Download ${selectedFiles.length > 1 ? `(${selectedFiles.length} files)` : "File"}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingDeleteFile && (
        <div className="file-delete-overlay" style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'grid', placeItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }} role="dialog" aria-modal="true" aria-label="Delete file confirmation">
          <div className="file-delete-card">
            <h3>Delete file?</h3>
            <p>Do you want to delete <strong>{pendingDeleteFile}</strong>?</p>
            <div className="file-delete-actions">
              <button type="button" className="button secondary compact" onClick={() => setPendingDeleteFile(null)}>
                No
              </button>
              <button
                type="button"
                className="button danger compact"
                onClick={() => {
                  onDeleteFile(pendingDeleteFile);
                  setPendingDeleteFile(null);
                }}
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
