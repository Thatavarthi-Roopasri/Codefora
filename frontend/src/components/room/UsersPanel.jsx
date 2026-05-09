import { useEffect, useRef, useState } from "react";
import { Check, Headphones, Mic, MicOff, MoreVertical, Shield, UserX } from "lucide-react";
import { getInviteCode } from "../../lib/navigation";
import { API_URL } from "../../config";

export function UsersPanel({ room, roomId, users, permissions, onRoleChange, onKickUser }) {
  const [openMenuFor, setOpenMenuFor] = useState(null);
  const [expandedUser, setExpandedUser] = useState(null);
  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!event.target.closest('.user-menu-wrap')) setOpenMenuFor(null);
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") setOpenMenuFor(null);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <aside className="side-panel users-panel">
      <div className="section-title">
        <Headphones size={16} />
        <span>Users ({users.length})</span>
      </div>

      <div className="users-list" style={{ padding: "0 12px", display: "flex", flexDirection: "column", gap: "8px" }}>
        {users.map((user) => (
          <div
            className="user-item-card"
            key={user.socketId}
            style={{
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.06)",
              borderRadius: "12px",
              transition: "all 0.2s",
              position: "relative"
            }}
          >
            <div
              className={`user-row-v2 ${user.speaking ? "speaking" : ""}`}
              onClick={(e) => {
                if (e.target.closest('.user-actions')) return;
                setExpandedUser(current => current === user.socketId ? null : user.socketId);
              }}
              style={{
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px"
              }}
            >
              <div className="avatar-wrap" style={{ position: "relative" }}>
                {user.emotionId ? (
                  <div className="avatar" style={{ "--avatar": user.color || "#ff7a18" }}>
                    <img
                      src={`${API_URL}/api/emotions/${user.emotionId}/image`}
                      alt={`${user.name}'s emotion`}
                      style={{ width: "100%", height: "100%", objectFit: "contain" }}
                    />
                  </div>
                ) : (
                  <span
                    className="avatar"
                    style={{ "--avatar": user.color || "#ff7a18" }}
                  >
                    {user.name[0]?.toUpperCase()}
                  </span>
                )}
                {user.speaking && <div className="speaking-indicator" />}
              </div>

              <div className="user-info" style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <strong style={{ fontSize: "0.9rem", color: "#fff" }}>{user.name}</strong>
                  {user.role === "Host" && <Shield size={10} className="text-orange" />}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <small style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{user.role}</small>
                  <span style={{ width: "3px", height: "3px", borderRadius: "50%", background: "rgba(255,255,255,0.2)" }} />
                  {(() => {
                    if (user.isTyping && user.currentFile) {
                      return <small style={{ fontSize: "0.7rem", color: "var(--primary-orange)", fontWeight: "500" }}>
                        Typing in {user.currentFile}...
                      </small>;
                    }
                    return <small style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.25)" }}>Idle</small>;
                  })()}
                </div>
              </div>

              <div className="user-actions" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span className={`mic-status-icon ${user.mic ? "on" : "off"}`}>
                  {user.mic ? <Mic size={14} className="text-orange" /> : <MicOff size={14} style={{ opacity: 0.3 }} />}
                </span>

                {permissions.isHost && user.role !== "Host" && (
                  <div className="user-menu-wrap" onClick={e => e.stopPropagation()}>
                    <button
                      type="button"
                      className="mini-icon"
                      onClick={() => setOpenMenuFor((current) => current === user.socketId ? null : user.socketId)}
                      style={{ padding: "4px", background: "none", border: "none", color: "#666", cursor: "pointer" }}
                    >
                      <MoreVertical size={14} />
                    </button>

                    {openMenuFor === user.socketId && (
                      <div
                        className="user-action-menu"
                        role="menu"
                        style={{
                          position: "absolute",
                          right: "12px",
                          top: "40px",
                          zIndex: 1000,
                          background: "#111",
                          border: "1px solid #333",
                          borderRadius: "10px",
                          padding: "6px",
                          minWidth: "140px",
                          boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
                          animation: "slide-down 0.15s ease-out"
                        }}
                      >
                        <div style={{ fontSize: "0.65rem", color: "#555", padding: "4px 8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Change Role</div>
                        {(["Host", "Member", "Viewer"]).map((nextRole) => {
                          const isActive = user.role === nextRole;
                          return (
                            <button
                              key={nextRole}
                              type="button"
                              className={`user-action-item ${isActive ? "active" : ""}`}
                              onClick={() => {
                                onRoleChange(user.socketId, nextRole);
                                setOpenMenuFor(null);
                              }}
                              style={{ display: "flex", width: "100%", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: isActive ? "rgba(249,115,22,0.1)" : "none", border: "none", color: isActive ? "#f97316" : "#ccc", borderRadius: "4px", fontSize: "0.8rem", cursor: "pointer" }}
                            >
                              <span>{nextRole}</span>
                              {isActive && <Check size={12} />}
                            </button>
                          );
                        })}
                        <div style={{ height: "1px", background: "#333", margin: "4px 0" }} />
                        <button
                          type="button"
                          onClick={() => {
                            onKickUser?.(user.socketId);
                            setOpenMenuFor(null);
                          }}
                          style={{ display: "flex", width: "100%", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "none", border: "none", color: "#ef4444", borderRadius: "4px", fontSize: "0.8rem", cursor: "pointer" }}
                        >
                          <span>Kick</span>
                          <UserX size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Profile Expansion */}
            {expandedUser === user.socketId && (
              <div className="user-profile-expansion" style={{
                padding: "0 12px 12px 12px",
                marginTop: "-4px",
                animation: "slide-down 0.2s ease-out"
              }}>
                <div style={{
                  padding: "10px 12px",
                  background: "rgba(0,0,0,0.2)",
                  borderRadius: "8px",
                  border: "1px solid rgba(255,255,255,0.05)"
                }}>
                  <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.3)", marginBottom: "4px", textTransform: "uppercase" }}>Bio</div>
                  {user.bio ? (
                    <p style={{ margin: 0, fontSize: "0.85rem", color: "#ddd", lineHeight: "1.4" }}>{user.bio}</p>
                  ) : (
                    <p style={{ margin: 0, fontSize: "0.85rem", color: "#555", fontStyle: "italic" }}>No bio provided</p>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="permission-card">
        <div className="card-header">
          <Shield size={14} />
          <strong>{room?.visibility === "private" ? "Private Room" : "Public Room"}</strong>
        </div>
        <p>{permissions.canEdit ? "Full Access: Edit, Chat, & Speak" : "View Only: Read-only Workspace"}</p>

        {permissions.isHost && room?.visibility === "private" && (
          <div className="host-details">
            <div className="detail-row">
              <span>Invite Code:</span>
              <code className="text-orange">{getInviteCode(roomId) || "N/A"}</code>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
