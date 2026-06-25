import React, { useState, useRef } from "react";
import { FileCode2, Plus, X, Upload, Download, Save, MoreHorizontal, FileJson, FileText, Code2 } from "lucide-react";
import JSZip from "jszip";

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

export function FilesPanel({ 
  roomId, 
  files, 
  activeFile, 
  activeName, 
  setActiveName, 
  permissions, 
  onCreateFile, 
  onExpectActiveName, 
  onDeleteFile, 
  onChangeLanguage, 
  onSaveWork 
}) {
  const [newFileName, setNewFileName] = useState("");
  const [newFileType, setNewFileType] = useState(FILE_TYPES[0].language);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const fileInputRef = useRef(null);

  function getFileIcon(filename) {
    if (filename.endsWith('.js') || filename.endsWith('.ts')) return <FileCode2 size={16} color="#facc15" />;
    if (filename.endsWith('.py')) return <FileCode2 size={16} color="#3b82f6" />;
    if (filename.endsWith('.html')) return <Code2 size={16} color="#f97316" />;
    if (filename.endsWith('.css')) return <FileCode2 size={16} color="#06b6d4" />;
    if (filename.endsWith('.json')) return <FileJson size={16} color="#a855f7" />;
    return <FileText size={16} color="#94a3b8" />;
  }

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
        const ext = fileName.includes('.') ? `.${fileName.split('.').pop()}` : '';
        const typeMatch = FILE_TYPES.find(t => t.extension === ext);
        
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
      event.target.value = "";
    };
    reader.readAsText(file);
  }

  async function handleExport() {
    if (files.length === 0) return;
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
        files.forEach(file => {
          zip.file(file.name, file.code || "");
        });
        const content = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(content);
        const a = document.createElement("a");
        a.href = url;
        a.download = `codefora_export_${roomId || "room"}.zip`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Export failed", error);
    } finally {
      setIsExporting(false);
      setShowMoreMenu(false);
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
    setShowMoreMenu(false);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', paddingRight: '32px' }}>
        <h3 style={{ margin: 0, fontSize: '12px', fontWeight: 'bold', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Explorer</h3>
        
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          {permissions.canEdit && (
            <button 
              onClick={() => fileInputRef.current?.click()}
              title="Import File"
              style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px', borderRadius: '4px' }}
            >
              <Upload size={14} />
            </button>
          )}
          <button 
            onClick={handleExport}
            title="Export All"
            disabled={isExporting}
            style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px', borderRadius: '4px', opacity: isExporting ? 0.5 : 1 }}
          >
            <Download size={14} />
          </button>
          {onSaveWork && permissions.canEdit && (
            <button 
              onClick={handleSaveWork}
              title={isSaving ? "Saving..." : saveMessage || "Save Workspace (Ctrl+S)"}
              disabled={isSaving}
              style={{ background: 'transparent', border: 'none', color: saveMessage === "Saved!" ? "var(--success)" : saveMessage === "Error" ? "var(--error)" : "rgba(255,255,255,0.7)", cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px', borderRadius: '4px', opacity: isSaving ? 0.5 : 1 }}
            >
              <Save size={14} />
            </button>
          )}
          <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleImport} />
        </div>
      </div>

      {permissions.canEdit && (
        <div style={{ marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '4px' }}>
            <input
              type="text"
              placeholder="New filename..."
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") createFile(); }}
              style={{
                flex: 1,
                background: '#121822',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '12px',
                padding: '6px 8px',
                outline: 'none',
                minWidth: 0
              }}
            />
            <button
              onClick={createFile}
              disabled={!newFileName.trim()}
              title="Create new file"
              style={{
                background: 'var(--primary-orange)',
                border: 'none',
                borderRadius: '6px',
                color: '#000',
                width: '30px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                opacity: newFileName.trim() ? 1 : 0.5
              }}
            >
              <Plus size={16} />
            </button>
          </div>
          {newFileName.trim() && (
            <select
              value={newFileType}
              onChange={(e) => setNewFileType(e.target.value)}
              style={{
                background: '#121822',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '12px',
                padding: '6px 8px',
                outline: 'none',
                width: '100%'
              }}
            >
              {FILE_TYPES.map(t => <option key={t.language} value={t.language}>{t.label}</option>)}
            </select>
          )}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, overflowY: 'auto' }}>
        {files.map(file => (
          <div 
            key={file.name}
            onClick={() => setActiveName(file.name)}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              padding: '6px 10px', 
              borderRadius: '6px', 
              cursor: 'pointer',
              background: activeName === file.name ? 'rgba(255, 122, 24, 0.1)' : 'transparent',
              border: activeName === file.name ? '1px solid rgba(255, 122, 24, 0.2)' : '1px solid transparent',
              color: activeName === file.name ? '#fff' : 'rgba(255,255,255,0.7)',
              transition: 'all 0.2s'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {getFileIcon(file.name)}
              <span style={{ fontSize: '13px', fontWeight: activeName === file.name ? '500' : 'normal', wordBreak: 'break-all' }}>{file.name}</span>
            </div>
            {activeName === file.name && files.length > 1 && permissions.canEdit && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteFile(file.name);
                }}
                title={`Delete ${file.name}`}
                style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2px', borderRadius: '4px' }}
              >
                <X size={12} />
              </button>
            )}
          </div>
        ))}
      </div>

    </div>
  );
}
