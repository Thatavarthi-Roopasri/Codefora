import { useEffect, useState } from "react";
import { Check, Headphones, Mic, MicOff, MoreVertical, Shield, UserX, MessageSquare, Volume2, Plus } from "lucide-react";
import { getInviteCode } from "../../lib/navigation";
import { API_URL } from "../../config";
import { useAuth } from "../../hooks/useAuth";
import { getProfile } from "../../api/client";

export function UsersPanel({ 
  room, 
  roomId, 
  users, 
  permissions, 
  onRoleChange, 
  onKickUser
}) {
  const [openMenuFor, setOpenMenuFor] = useState(null);
  const [expandedUser, setExpandedUser] = useState(null);
  const [toastMsg, setToastMsg] = useState("");
  
  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  };

  // Invite Friends State
  const { user: currentUser } = useAuth();
  const [onlineFriends, setOnlineFriends] = useState([]);
  const [invitingFriendId, setInvitingFriendId] = useState(null);

  useEffect(() => {
    if (!currentUser?.uid) return;
    let active = true;
    const fetchFriends = async () => {
      try {
        const myProfile = await getProfile(currentUser.uid);
        if (!active || !myProfile?.friends) return;
        
        const friendsData = [];
        for (const f of myProfile.friends) {
          const profile = await getProfile(f.id).catch(() => null);
          if (profile && (profile.presence === 'online' || profile.presence === 'in-room')) {
            friendsData.push({ ...f, ...profile });
          }
        }
        if (active) setOnlineFriends(friendsData);
      } catch(e) {}
    };
    fetchFriends();
    const intv = setInterval(fetchFriends, 3000); // Poll every 3s for faster presence updates
    return () => { active = false; clearInterval(intv); };
  }, [currentUser]);

  const handleInvite = async (friend) => {
    if (friend.presence === 'in-room') {
      showToast("User is already in a room!");
      return;
    }
    setInvitingFriendId(friend.id);
    try {
      await fetch(`${API_URL}/api/notifications/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: friend.id,
          roomId: roomId,
          inviterId: currentUser.uid,
          inviterName: currentUser.displayName || currentUser.email?.split('@')[0] || 'A friend'
        })
      });
      showToast("Invite sent!");
    } catch(e) {
      showToast("Failed to send invite");
    } finally {
      setInvitingFriendId(null);
    }
  };

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
    <aside 
      className="side-panel users-panel tour-users-panel" 
      style={{ 
        display: "flex", 
        flexDirection: "column", 
        height: "100%", 
        overflow: "hidden", 
        background: "transparent", 
        borderRight: "1px solid var(--glass-border)",
        borderRadius: "12px"
      }}
    >
      {/* --- USERS SECTION --- */}
      <div 
        className="section-title" 
        style={{ 
          padding: "8px 12px 4px", 
          display: "flex", 
          alignItems: "center", 
          gap: "8px", 
          borderBottom: "1px solid rgba(255,255,255,0.03)",
          flexShrink: 0
        }}
      >
        <span style={{ fontSize: "10px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>
          : USERS ({users.length})
        </span>
      </div>

      <div 
        className="users-list" 
        style={{ 
          padding: "6px 8px", 
          display: "flex", 
          flexDirection: "column", 
          gap: "4px", 
          flex: 1, 
          overflowY: "auto",
          minHeight: 0
        }}
      >
        {users.map((user) => (
          <div
            className="user-item-card"
            key={user.socketId}
            style={{
              background: "#121822",
              border: `1px solid ${user.color || "rgba(255, 255, 255, 0.05)"}`,
              boxShadow: `0 0 15px ${user.color}20`,
              borderRadius: "12px",
              position: "relative",
              marginBottom: "8px",
              padding: "10px"
            }}
          >
            {/* Absolute positioned User Role Menu Toggle Button for Host */}
            {permissions.isHost && user.role !== "Host" && (
              <div 
                className="user-menu-wrap" 
                onClick={e => e.stopPropagation()}
                style={{
                  position: "absolute",
                  top: "10px",
                  right: "10px",
                  zIndex: 50
                }}
              >
                <button
                  type="button"
                  onClick={() => setOpenMenuFor((current) => current === user.socketId ? null : user.socketId)}
                  style={{ 
                    padding: "4px", 
                    background: "none", 
                    border: "none", 
                    color: "rgba(255,255,255,0.4)", 
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "4px"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = "#fff"}
                  onMouseLeave={(e) => e.currentTarget.style.color = "rgba(255,255,255,0.4)"}
                  title="Manage user role"
                >
                  <MoreVertical size={14} />
                </button>

                {openMenuFor === user.socketId && (
                  <div
                    className="user-action-menu"
                    role="menu"
                    style={{
                      position: "absolute",
                      right: "0",
                      top: "24px",
                      zIndex: 1000
                    }}
                  >
                    <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.4)", padding: "4px 10px", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: "bold" }}>Role</div>
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
                        >
                          <span>{nextRole}</span>
                          {isActive && <Check size={12} style={{ color: "var(--primary-orange)" }} />}
                        </button>
                      );
                    })}
                    <div className="user-action-divider" />
                    <button
                      type="button"
                      className="user-action-item danger"
                      onClick={() => {
                        onKickUser?.(user.socketId);
                        setOpenMenuFor(null);
                      }}
                    >
                      <span>Kick</span>
                      <UserX size={12} />
                    </button>
                  </div>
                )}
              </div>
            )}

            <div
              className={`user-row ${user.speaking ? "speaking" : ""}`}
              onClick={(e) => {
                if (e.target.closest('.user-menu-wrap')) return;
                setExpandedUser(current => current === user.socketId ? null : user.socketId);
              }}
              style={{
                cursor: "pointer",
                display: "grid",
                gridTemplateColumns: "48px minmax(0, 1fr)",
                gap: "10px",
                alignItems: "center"
              }}
            >
              {/* Column 1: Avatar */}
              <div className="avatar-wrap" style={{ position: "relative", width: "48px", height: "48px" }}>
                {user.emotionId ? (
                  <div className="avatar" style={{ width: "48px", height: "48px", borderRadius: "12px", background: user.color || "#ffb000", display: "grid", placeItems: "center", overflow: "hidden" }}>
                    <img
                      src={`${API_URL}/api/emotions/${user.emotionId}/image`}
                      alt={`${user.name}'s emotion`}
                      style={{ width: "100%", height: "100%", objectFit: "contain" }}
                    />
                  </div>
                ) : (
                  <span
                    className="avatar"
                    style={{ 
                      width: "48px", 
                      height: "48px", 
                      borderRadius: "12px", 
                      background: user.color || (user.role === "Host" ? "#ffb000" : "#8b5cf6"), 
                      display: "grid", 
                      placeItems: "center", 
                      fontSize: "18px", 
                      fontWeight: "bold", 
                      color: "#fff"
                    }}
                  >
                    {user.name[0]?.toUpperCase()}
                  </span>
                )}
                {user.speaking && <div className="speaking-indicator" />}
              </div>

              {/* Column 2: User Info (Name, Role, Status & Mic, Typing Status) */}
              <div className="user-info" style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontSize: "14px", fontWeight: "600", color: "#f8fafc", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {user.name}
                    </span>
                    {user.speaking && <Volume2 size={14} color="#50FA7B" className="speaking-icon" />}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
                    <span style={{ fontSize: "10px", color: "var(--text-secondary)", fontWeight: "500", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      {user.role}
                    </span>
                    <div style={{ display: "flex", gap: "4px" }}>
                      <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981", marginTop: "2px" }} />
                      {user.mic === false && <MicOff size={10} color="#ef4444" />}
                    </div>
                  </div>
                  {user.isTyping && user.currentFile && (
                    <span style={{ fontSize: "10px", color: "var(--primary-orange)", fontWeight: "500", marginTop: "4px", wordBreak: "break-all" }}>
                      typing in {user.currentFile}
                    </span>
                  )}
                </div>
            </div>

            {/* Profile Expansion */}
            {expandedUser === user.socketId && (
              <div className="user-profile-expansion" style={{
                padding: "8px 0 0 0",
                marginTop: "8px",
                borderTop: "1px solid rgba(255,255,255,0.05)",
                display: "flex",
                flexDirection: "column",
                gap: "8px"
              }}>
                <div style={{
                  padding: "8px",
                  background: "rgba(0,0,0,0.3)",
                  borderRadius: "6px",
                  border: "1px solid rgba(255,255,255,0.05)"
                }}>
                  {user.userId && (
                    <div style={{ fontSize: "9px", fontFamily: "monospace", color: "var(--primary-orange)", marginBottom: "4px" }}>
                      ID: {(() => {
                        let hash = 0;
                        for (let i = 0; i < user.userId.length; i++) hash = Math.imul(31, hash) + user.userId.charCodeAt(i) | 0;
                        return Math.abs(hash).toString().padStart(8, '0').slice(0, 8);
                      })()}
                    </div>
                  )}
                  <p style={{ margin: 0, fontSize: "11px", color: "#ccc", lineHeight: "1.4" }}>
                    {user.bio || "No bio provided."}
                  </p>
                </div>
                {user.userId && user.socketId !== permissions.me?.socketId && (
                  <button 
                    style={{
                      background: "rgba(239, 68, 68, 0.1)",
                      border: "1px solid rgba(239, 68, 68, 0.2)",
                      color: "#ef4444",
                      padding: "6px",
                      borderRadius: "6px",
                      fontSize: "10px",
                      fontWeight: "bold",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "4px"
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      fetch(API_URL + "/api/feedback", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ 
                          type: "report", 
                          message: `User Abuse Report`,
                          reportedId: user.userId || user.socketId,
                          reportedName: user.name,
                          reporterId: localStorage.getItem("userId") || "Unknown",
                          reporterName: localStorage.getItem("username") || "Anonymous"
                        })
                      }).then(() => showToast("User reported to admin.")).catch(console.error);
                    }}
                  >
                    <Shield size={12} /> Report User
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* --- ONLINE FRIENDS SECTION --- */}
      {currentUser && (
        <>
          <div 
            className="section-title" 
            style={{ 
              padding: "8px 12px 4px", 
              display: "flex", 
              alignItems: "center", 
              gap: "8px", 
              borderBottom: "1px solid rgba(255,255,255,0.03)",
              borderTop: "1px solid rgba(255,255,255,0.03)",
              flexShrink: 0
            }}
          >
            <span style={{ fontSize: "10px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>
              : ONLINE FRIENDS ({onlineFriends.length})
            </span>
          </div>

          <div 
            className="friends-list" 
            style={{ 
              padding: "6px 8px", 
              display: "flex", 
              flexDirection: "column", 
              gap: "4px", 
              maxHeight: "150px", 
              overflowY: "auto",
              flexShrink: 0,
              marginBottom: "16px"
            }}
          >
            {onlineFriends.map((friend) => (
              <div
                key={friend.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "6px 8px",
                  background: "rgba(255,255,255,0.02)",
                  borderRadius: "8px",
                  border: "1px solid rgba(255,255,255,0.05)"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden" }}>
                  <div style={{ position: "relative", width: "24px", height: "24px", borderRadius: "50%", background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: "bold", overflow: "hidden", flexShrink: 0 }}>
                    {friend.photoURL ? (
                      <img src={friend.photoURL} alt={friend.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : friend.emotionId ? (
                      <img src={`${API_URL}/api/emotions/${friend.emotionId}/image`} alt={friend.name} style={{ width: "100%", height: "100%", objectFit: "cover", background: "rgba(255,255,255,0.1)", padding: "2px" }} />
                    ) : (
                      friend.name ? friend.name[0].toUpperCase() : '?'
                    )}
                    <div style={{ position: "absolute", bottom: 0, right: 0, width: "6px", height: "6px", borderRadius: "50%", background: friend.presence === 'in-room' ? '#3b82f6' : '#10b981', border: "1px solid #121822" }} />
                  </div>
                  <div style={{ fontSize: "12px", color: "white", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {friend.displayName || friend.name}
                  </div>
                </div>
                <button
                  onClick={() => handleInvite(friend)}
                  disabled={invitingFriendId === friend.id}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--primary-accent)",
                    cursor: "pointer",
                    padding: "4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "4px"
                  }}
                  onMouseOver={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                  onMouseOut={e => e.currentTarget.style.background = "transparent"}
                  title="Invite to Room"
                >
                  <Plus size={14} />
                </button>
              </div>
            ))}
            {onlineFriends.length === 0 && (
              <div style={{ textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: "11px", padding: "10px 0" }}>
                No friends online
              </div>
            )}
          </div>
        </>
      )}

      {/* --- PUBLIC ROOM PERMISSIONS CARD --- */}
      <div 
        style={{ 
          margin: "0 16px 16px", 
          padding: "16px", 
          border: "1px solid rgba(var(--primary-rgb), 0.4)", 
          background: "transparent", 
          borderRadius: "12px", 
          display: "flex", 
          flexDirection: "column", 
          gap: "8px",
          flexShrink: 0
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--primary-orange)" }}>
          <MessageSquare size={16} />
          <strong style={{ fontSize: "13px", fontWeight: "600" }}>
            {room?.visibility === "private" ? "Private Room" : "Public Room"}
          </strong>
        </div>
        <p style={{ margin: 0, fontSize: "11px", color: "rgba(255,255,255,0.8)", fontWeight: "500" }}>
          {permissions.canEdit ? "Full Access: Edit, Chat & Speak" : "View Only: Read-only Workspace"}
        </p>

        {permissions.isHost && room?.visibility === "private" && (
          <div style={{ marginTop: "8px", paddingTop: "8px", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)" }}>Invite Code:</span>
            <code style={{ fontSize: "11px", color: "var(--primary-orange)", fontFamily: "monospace", fontWeight: "bold" }}>
              {getInviteCode(roomId) || "N/A"}
            </code>
          </div>
        )}
      </div>

      {toastMsg && (
        <div style={{ position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', background: 'var(--primary-accent)', color: '#000', fontWeight: 'bold', padding: '10px 20px', borderRadius: '8px', zIndex: 9999, boxShadow: '0 4px 12px rgba(0,0,0,0.5)', animation: 'fadeInOut 3s ease-in-out', whiteSpace: 'nowrap' }}>
          {toastMsg}
        </div>
      )}
    </aside>
  );
}
