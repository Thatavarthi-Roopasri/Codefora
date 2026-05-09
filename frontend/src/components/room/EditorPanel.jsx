import Editor from "@monaco-editor/react";
import { Activity, FileCode2, Plus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "../../hooks/useTheme";
import { socket } from "../../lib/socket";

const FILE_TYPES = [
  { label: "JavaScript", language: "javascript", extension: ".js" },
  { label: "TypeScript", language: "typescript", extension: ".ts" },
  { label: "Python", language: "python", extension: ".py" },
  { label: "Java", language: "java", extension: ".java" },
  { label: "C", language: "c", extension: ".c" },
  { label: "C++", language: "cpp", extension: ".cpp" },
  { label: "Go", language: "go", extension: ".go" },
  { label: "Rust", language: "rust", extension: ".rs" }
];

export function EditorPanel({ roomId, files, activeFile, activeName, setActiveName, users, typing, typingCursors, permissions, onChange, onCreateFile, onDeleteFile }) {
  const [newFileName, setNewFileName] = useState("");
  const [newFileType, setNewFileType] = useState(FILE_TYPES[0].language);
  const [pendingDeleteFile, setPendingDeleteFile] = useState(null);
  const [editorInstance, setEditorInstance] = useState(null);
  const [editorTick, setEditorTick] = useState(0);
  const { theme } = useTheme();
  const editorDisposables = useRef([]);
  const activeFileNameRef = useRef(activeFile?.name);
  const typingCursorsRef = useRef(typingCursors);
  const isRemoteUpdate = useRef(false);

  useEffect(() => {
    typingCursorsRef.current = typingCursors;
  }, [typingCursors]);

  useEffect(() => {
    activeFileNameRef.current = activeFile?.name;
  }, [activeFile?.name]);

  function createFile() {
    const selectedType = FILE_TYPES.find((type) => type.language === newFileType) || FILE_TYPES[0];
    const cleanName = newFileName.trim();
    if (!cleanName) return;
    const fileName = cleanName.includes(".") ? cleanName : `${cleanName}${selectedType.extension}`;
    onCreateFile(fileName, selectedType.language);
    setNewFileName("");
  }

  const otherUsers = users.filter((user) => user.socketId !== socket.id);

  useEffect(() => {
    return () => {
      editorDisposables.current.forEach((disposable) => disposable.dispose());
      editorDisposables.current = [];
    };
  }, []);

  useEffect(() => {
    if (!editorInstance) return;

    const refresh = () => setEditorTick((value) => value + 1);
    const currentFileName = activeFile?.name;

    const disposables = [
      editorInstance.onDidScrollChange(refresh),
      editorInstance.onDidLayoutChange(refresh),
      editorInstance.onDidChangeModelContent(() => {
        refresh();
        if (isRemoteUpdate.current) return;
        const position = editorInstance.getPosition();
        if (!position || !currentFileName) return;
        socket.emit("typing", {
          roomId,
          fileName: currentFileName,
          position: { lineNumber: position.lineNumber, column: position.column },
          isTyping: true
        });
      }),
      editorInstance.onDidChangeCursorPosition((event) => {
        refresh();
        if (isRemoteUpdate.current) return;
        if (currentFileName) {
          socket.emit("cursor:update", {
            roomId,
            fileName: currentFileName,
            position: { lineNumber: event.position.lineNumber, column: event.position.column },
            isTyping: false
          });
        }
      })
    ];

    editorDisposables.current.forEach((disposable) => disposable.dispose());
    editorDisposables.current = disposables;

    return () => {
      disposables.forEach((disposable) => disposable.dispose());
    };
  }, [editorInstance, activeFile?.name, roomId]);

  const visibleTypingCursors = typingCursors;
  
  // Watch for remote code updates and preserve cursor/scroll
  useEffect(() => {
    if (!editorInstance || !activeFile) return;
    
    const model = editorInstance.getModel();
    if (!model) return;

    const currentModelValue = model.getValue();
    const targetCode = activeFile.code || "";
    if (currentModelValue !== targetCode) {
      isRemoteUpdate.current = true;
      // Capture the exact state of the editor (cursor, selection, scroll)
      const viewState = editorInstance.saveViewState();
      
      // Apply the change
      // Use pushEditOperations to maintain undo history and markers
      model.pushEditOperations(
        [],
        [{
          range: model.getFullModelRange(),
          text: targetCode,
          forceMoveMarkers: true
        }],
        () => null
      );
      
      // Immediately restore the exact view state to prevent any jumping
      if (viewState) {
        editorInstance.restoreViewState(viewState);
      }
      
      // Delay resetting the flag slightly to allow Monaco events to process
      setTimeout(() => {
        isRemoteUpdate.current = false;
      }, 50);
    }
  }, [activeFile?.code, activeFile?.name, editorInstance]);

  return (
    <section className="editor-panel">
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

      <div className="collab-strip">
        <div className="typing-indicator" />
        <div className="cursor-tags">
          {otherUsers.slice(0, 3).map((user) => (
            <span
              style={{ "--tag": user.color || "#8be9fd" }}
              key={user.socketId}
              title={`${user.name} is online`}
            >
              {user.name}
            </span>
          ))}
          {otherUsers.length > 3 && <span className="more-users">+{otherUsers.length - 3}</span>}
        </div>
      </div>

      <div className="file-tools">
        <input
          disabled={!permissions.canEdit}
          value={newFileName}
          onChange={(event) => setNewFileName(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && createFile()}
          placeholder="new-file"
        />
        <select
          className="file-type-select"
          disabled={!permissions.canEdit}
          value={newFileType}
          onChange={(event) => setNewFileType(event.target.value)}
          aria-label="File language"
        >
          {FILE_TYPES.map((type) => (
            <option key={type.language} value={type.language}>
              {type.label} ({type.extension})
            </option>
          ))}
        </select>
        <button className="button compact secondary create-file-button" disabled={!permissions.canEdit} onClick={createFile}>
          <Plus size={15} /> <span>Create</span>
        </button>
      </div>

      <div className="editor-wrap">
        <Editor
          height="100%"
          theme={theme === "dark" ? "vs-dark" : "light"}
          language={activeFile?.language || "javascript"}
          path={activeFile?.name || "main.js"}
          onMount={(editor) => {
            setEditorInstance(editor);
          }}
          onChange={(value) => {
            if (isRemoteUpdate.current) return;
            if (onChange) onChange(value);
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

      {pendingDeleteFile && (
        <div className="file-delete-overlay" role="dialog" aria-modal="true" aria-label="Delete file confirmation">
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
