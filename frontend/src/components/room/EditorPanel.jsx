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

export function EditorPanel({ roomId, allowCopyPaste, files, activeFile, activeName, setActiveName, users, typing, typingCursors, permissions, onChange, onUpdateFileCode, onCreateFile, onExpectActiveName, onDeleteFile, onChangeLanguage, onSaveWork }) {
  const [languageCache, setLanguageCache] = useState({});
  const [editorInstance, setEditorInstance] = useState(null);
  const [portalTarget, setPortalTarget] = useState(null);
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

  useEffect(() => {
    const target = document.getElementById("topbar-language-selector");
    if (target) {
      setPortalTarget(target);
    } else {
      const interval = setInterval(() => {
        const t = document.getElementById("topbar-language-selector");
        if (t) {
          setPortalTarget(t);
          clearInterval(interval);
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, []);

  return (
    <section className="editor-panel tour-editor">

      {portalTarget && createPortal(
        <select
          className="file-type-select"
          disabled={!permissions.canEdit}
          value={activeFile?.language || "javascript"}
          onChange={(event) => {
            const lang = event.target.value;
            if (onChangeLanguage && activeFile) {
              const baseName = activeFile.name.includes(".") ? activeFile.name.substring(0, activeFile.name.lastIndexOf(".")) : activeFile.name;
              
              const cachedCode = languageCache[baseName]?.[lang];
              const newCode = cachedCode !== undefined ? cachedCode : (BOILERPLATES[lang] || "");
              
              setLanguageCache(prev => ({
                ...prev,
                [baseName]: {
                  ...(prev[baseName] || {}),
                  [activeFile.language]: activeFile.code
                }
              }));
              
              onChangeLanguage(activeFile.name, lang, newCode);
            }
          }}
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '6px',
            color: '#fff',
            fontSize: '12px',
            padding: '4px 10px',
            cursor: 'pointer',
            outline: 'none',
            height: '32px'
          }}
        >
          {FILE_TYPES.map((type) => (
            <option key={type.language} value={type.language} style={{ background: '#0f172a', color: '#fff' }}>
              {type.label === "Java" ? "Java (17)" : type.label === "Python" ? "Python (3)" : type.label}
            </option>
          ))}
        </select>,
        portalTarget
      )}

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

    </section>
  );
}
