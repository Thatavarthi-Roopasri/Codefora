import { Bot, MessageSquare, Play, Users } from "lucide-react";

export function HomeHeroPreview() {
  return (
    <aside className="hero-preview" aria-label="Codefora workspace preview">
      <div className="preview-top">
        <span className="window-dot red" />
        <span className="window-dot yellow" />
        <span className="window-dot green" />
        <strong>orbit-hack-night</strong>
        <button><Play size={14} /> Run</button>
      </div>
      <div className="preview-body">
        <div className="preview-users">
          <div><Users size={16} /> Live</div>
          <div className="avatar-row">
            <span className="preview-avatar">G</span>
            <span className="preview-avatar">A</span>
            <span className="preview-avatar">R</span>
          </div>
          <span>Ganesh · Host</span>
          <span>Aisha · Member</span>
          <span>Ravi · Viewer</span>
        </div>
        <div className="preview-editor">
          <div className="preview-tabs"><span>main.js</span><span>index.html</span><span>chat.js</span></div>
          <pre>{`const room = createRoom("Codefora");
room.sync(code);

// Ganesh
room.run("main.js");`}</pre>
          <div className="cursor cursor-a" />
          <div className="cursor cursor-b" />
          <div className="cursor cursor-c" />
        </div>
        <div className="preview-side">
          <div><MessageSquare size={15} /> Fixed the preview.</div>
          <div><Bot size={15} /> Try extracting room service.</div>
        </div>
      </div>
      <div className="preview-console">status: connected · output: Room compiled successfully</div>
    </aside>
  );
}
