import { FolderCheck, Save, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function SaveWorkNameModal({
  open,
  defaultName = "",
  isSaving = false,
  onClose,
  onSave
}) {
  const [projectName, setProjectName] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setProjectName(defaultName || "");
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [open, defaultName]);

  if (!open) return null;

  const cleanName = projectName.trim();

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!cleanName || isSaving) return;
    onSave?.(cleanName);
  };

  return (
    <div
      className="auth-modal-overlay"
      style={{ zIndex: 10000 }}
      onClick={isSaving ? undefined : onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="save-work-name-title"
    >
      <form
        className="auth-modal-card glass-panel"
        style={{ maxWidth: "430px", padding: "30px", textAlign: "left" }}
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <button
          className="auth-modal-close"
          type="button"
          onClick={onClose}
          aria-label="Close save project prompt"
          disabled={isSaving}
        >
          <X size={18} />
        </button>
        <div
          style={{
            width: "52px",
            height: "52px",
            borderRadius: "50%",
            marginBottom: "18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(255, 122, 24, 0.14)",
            color: "var(--primary-orange)"
          }}
        >
          <FolderCheck size={24} />
        </div>
        <h2 id="save-work-name-title" style={{ margin: "0 0 10px" }}>Name of the project</h2>
        <p style={{ color: "rgba(255,255,255,0.72)", margin: "0 0 18px", lineHeight: 1.5 }}>
          Enter a project name. This name will appear in Rooms and your Profile saved work.
        </p>
        <label style={{ display: "grid", gap: "8px", marginBottom: "20px" }}>
          <span style={{ color: "rgba(255,255,255,0.78)", fontSize: "13px", fontWeight: 700 }}>
            Project name
          </span>
          <input
            ref={inputRef}
            value={projectName}
            onChange={(event) => setProjectName(event.target.value)}
            maxLength={80}
            placeholder="My project"
            disabled={isSaving}
            style={{
              width: "100%",
              height: "44px",
              borderRadius: "8px",
              border: "1px solid rgba(255,255,255,0.16)",
              background: "rgba(2, 8, 23, 0.78)",
              color: "#fff",
              padding: "0 14px",
              fontSize: "15px",
              outline: "none"
            }}
          />
        </label>
        <button
          className="auth-submit-button"
          type="submit"
          disabled={!cleanName || isSaving}
          style={{ width: "100%", justifyContent: "center", gap: "8px", opacity: !cleanName || isSaving ? 0.65 : 1 }}
        >
          <Save size={16} />
          {isSaving ? "Saving..." : "Save Work"}
        </button>
      </form>
    </div>
  );
}
