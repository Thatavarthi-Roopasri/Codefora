import { ChevronRight, Plus, Users, Search as SearchIcon, Bell, Zap, Code, Lock } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { useLocation, useNavigate, NavLink } from "react-router-dom";
import { api } from "../api/client";
import { BrandButton } from "../components/BrandButton";
import { trackEvent } from "../lib/analytics";

import { socket } from "../lib/socket";
import { saveHostToken, saveInviteCode, saveUsername } from "../lib/navigation";
import { useAuth } from "../hooks/useAuth";
import { useMemo as useMemoDeps } from "react";
import bg1 from "../../assets/bg1.mp4";


import { Navbar } from "../components/Navbar";
import FeedbackModal from "../components/FeedbackModal";

export function RoomsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [joinRoomTarget, setJoinRoomTarget] = useState(null);
  const [codeEntry, setCodeEntry] = useState("");
  const [joinError, setJoinError] = useState("");
  const [roomName, setRoomName] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [maxMembers, setMaxMembers] = useState("");
  const [status, setStatus] = useState("");
  const [creating, setCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("Newest First");
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackData, setFeedbackData] = useState({ username: "", type: "general" });

  async function handleOpenProfile(u) {
    if (u.userId) {
      try {
        const profile = await api.getProfile(u.userId);
        setSelectedProfile({ ...u, ...profile });
        return;
      } catch (err) {
        // fallback to transient user object
        console.warn("Could not load profile from server:", err.message || err);
      }
    }
    setSelectedProfile(u);
  }

  useEffect(() => {
    api.listRooms().then(setRooms).catch(console.error);
    socket.connect();
    
    const handleRoomsUpdate = (data) => {
      console.log("[RoomsPage] Received rooms:update", data?.length);
      setRooms(data || []);
    };
    
    socket.on("rooms:update", handleRoomsUpdate);
    
    // Handle messages from redirection (like being kicked)
    const params = new URLSearchParams(location.search);
    const msg = params.get("message");
    if (msg) {
      setTimeout(() => alert(msg), 100);
      navigate(location.pathname, { replace: true });
    }

    // Handle feedback modal trigger
    const feedback = params.get("feedback");
    if (feedback === "true") {
      setFeedbackData({
        username: params.get("username") || "",
        type: params.get("type") || "room_leave"
      });
      setShowFeedbackModal(true);
      // Clean up URL
      const newParams = new URLSearchParams(location.search);
      newParams.delete("feedback");
      newParams.delete("username");
      newParams.delete("type");
      const newSearch = newParams.toString();
      navigate(location.pathname + (newSearch ? `?${newSearch}` : ""), { replace: true });
    }

    return () => socket.off("rooms:update", handleRoomsUpdate);
  }, [location.search, navigate]);

  const isRoomsPage = location.pathname !== "/problems";

  function generateGuestName() {
    const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `Guest-${suffix}`;
  }

  async function createRoom() {
    if (!maxMembers) {
      setStatus("Please select a room size");
      return;
    }
    const profileName = user?.displayName || user?.email?.split("@")[0];
    const creatorName = profileName || generateGuestName();
    const cleanName = roomName.trim() || `${creatorName}'s Room`;
    setCreating(true);
    setStatus("Creating room...");
    try {
      saveUsername(creatorName);
      const room = await api.createRoom({
        name: cleanName,
        username: creatorName,
        visibility: isPublic ? "public" : "private",
        max: Number(maxMembers),
        userId: user?.uid || null
      });
      saveHostToken(room.id, room.hostToken);
      saveInviteCode(room.id, room.inviteCode);
      trackEvent("room_create", { 
        name: cleanName, 
        visibility: isPublic ? "public" : "private",
        room_id: room.id 
      });
      setStatus("Room created. Opening workspace...");
      setShowCreateModal(false);
      // Reset form
      setRoomName("");
      setMaxMembers("");
      setIsPublic(true);
      setStatus("");
      // navigate to new URL pattern
      if (room.visibility === "private") navigate(`/code/private/${room.id}`); else navigate(`/code/${room.id}`);
    } catch (error) {
      setStatus(`Could not create room: ${error.message}`);
    } finally {
      setCreating(false);
    }
  }

  function joinRoom(id) {
    const cleanId = id.trim();
    setJoinRoomTarget({ id: cleanId });
    setJoinError("");
    setCodeEntry("");
  }

  async function confirmJoinWithCode(event) {
    event?.preventDefault?.();
    setJoinError("");
    try {
      const code = String(codeEntry || "").trim().replace(/\s+/g, "").toUpperCase();
      if (!code) return setJoinError("Please enter the room code.");
      // Validate with backend
      const room = await api.getRoomByInviteCode(code);
      if (!room || room.id !== joinRoomTarget.id) return setJoinError("Invalid room code for selected room.");
      saveUsername(user?.displayName || user?.email?.split("@")[0] || generateGuestName());
      saveInviteCode(room.id, code);
      setJoinRoomTarget(null);
      navigate(`/code/private/${room.id}`);
    } catch (err) {
      setJoinError(err.message || "Invite code invalid");
    }
  }

  return (
    <main style={{ position: 'relative', width: '100%', minHeight: '100vh', overflow: 'hidden', background: '#000' }}>
      <video
        autoPlay
        loop
        muted
        playsInline
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          zIndex: 0,
          opacity: 1,
          filter: 'var(--home-video-filter)'
        }}
      >
        <source src={bg1} type="video/mp4" />
      </video>

      {/* Premium Mist/Blur Layer Overlay */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        background: 'rgba(2, 8, 18, 0.4)',
        backdropFilter: 'blur(6px) brightness(0.8)',
        WebkitBackdropFilter: 'blur(6px) brightness(0.8)',
        pointerEvents: 'none'
      }} />


      <div className="rooms-page-shell" style={{ position: 'relative', zIndex: 1, background: 'transparent' }}>
        <Navbar />

      <section className="rooms-layout">
        <section className="rooms-main">
          <div className="rooms-list-header">
            <div>
              <h2>Live Rooms</h2>
              <p>Join a room and start coding together in real-time.</p>
            </div>
            <div className="rooms-list-controls">
              <label className="search-input">
                <SearchIcon size={16} />
                <input placeholder="Search by room name or ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </label>
              <select className="rooms-sort-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="Newest First">Newest First</option>
                <option value="Most Popular">Most Popular</option>
                <option value="Least Full">Least Full</option>
              </select>
              <button className="button button-primary tour-create-room" onClick={() => setShowCreateModal(true)} style={{ backgroundColor: 'var(--primary-color)', borderColor: 'var(--primary-color)', color: '#fff' }}>
                <Plus size={18} /> Create Room
              </button>
            </div>
          </div>

          <div className="rooms-list tour-rooms-list" style={{ minHeight: '300px' }}>
            {(() => {
              const filtered = rooms.filter((room) => {
                const term = searchTerm.trim().toLowerCase();
                if (!term) return true;
                return room.name.toLowerCase().includes(term) || String(room.id || "").toLowerCase().includes(term);
              });
              
              filtered.sort((a, b) => {
                if (sortBy === "Most Popular") {
                  return (b.users || 0) - (a.users || 0);
                } else if (sortBy === "Least Full") {
                  return (a.users || 0) - (b.users || 0);
                } else {
                  // Newest First
                  return (b.createdAt || 0) - (a.createdAt || 0); 
                }
              });

              if (filtered.length === 0) {
                return (
                  <div className="rooms-empty-state">
                    <Users size={48} />
                    <h3>No rooms available</h3>
                    <p>Be the first to create a room and start a coding session!</p>
                  </div>
                );
              }

              return filtered.map((room) => (
                <article className="rooms-card" key={room.id}>
                  <div className="rooms-card-icon">
                    {room.visibility === 'private' ? <Lock size={24} /> : <Code size={24} />}
                  </div>
                  <div className="rooms-card-content">
                    <div>
                      <h4>{room.name} <span style={{fontSize: "0.8rem", color: "var(--text-muted)", marginLeft: "8px", fontWeight: "normal"}}>({room.id})</span></h4>
                      <span className="rooms-card-meta">
                        Host: {room.hostName || room.host} • 
                        Visibility: {room.visibility === 'private' ? 'Private' : 'Public'} • 
                        Status: <span className={room.status === 'idle' ? 'rooms-status-idle' : 'rooms-status-active'}>{room.status === 'idle' ? 'Idle' : 'Active'}</span>
                      </span>
                    </div>
                  </div>
                  <div className="rooms-card-meta-right">
                    <div className="rooms-card-avatar" style={{ background: 'var(--surface-color)', color: 'var(--text-color)', border: '1px solid var(--border-color)' }}>
                      {(room.hostName || room.host || '').split(' ').map(s=>s[0]).slice(0,2).join('').toUpperCase()}
                    </div>
                    <span className="rooms-card-members">
                      <Users size={16} /> {room.users}/{room.max}
                      {room.users >= room.max && <span style={{ marginLeft: "8px", color: "#ff6b6b", fontWeight: "bold" }}>FULL</span>}
                    </span>
                    <button 
                      className="button button-join" 
                      disabled={room.users >= room.max}
                      onClick={() => {
                        if (room.visibility === 'private') {
                          joinRoom(room.id);
                        } else {
                          trackEvent("room_join", { room_id: room.id, visibility: "public" });
                          navigate(`/code/${room.id}`);
                        }
                      }}
                    >
                      {room.users >= room.max ? "Full" : "Join"}
                    </button>
                  </div>
                </article>
              ));
            })()}
          </div>

          <div className="rooms-pagination">
            <button className="pagination-btn">&lt;</button>
            <button className="pagination-btn active">1</button>
            <button className="pagination-btn">2</button>
            <button className="pagination-btn">3</button>
            <button className="pagination-btn">...</button>
            <button className="pagination-btn">8</button>
            <button className="pagination-btn">&gt;</button>
          </div>
        </section>
      </section>

      {showCreateModal && (
        <div className="profile-modal-overlay" role="dialog" aria-modal="true" aria-label="Create a room">
          <form className="profile-modal-card" onSubmit={(e) => { e.preventDefault(); createRoom(); }}>
            <div className="profile-modal-header">
              <h3>Create a New Room</h3>
            </div>
            
            <label className="profile-input-group tour-room-name">
              Room Name
              <input
                autoFocus
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="Enter room name"
              />
            </label>

            <label className="profile-input-group tour-room-size">
              Room Size (Members)
              <select value={maxMembers} onChange={(e) => setMaxMembers(e.target.value)} required>
                <option value="" disabled>Select max size</option>
                {[1, 2, 3, 4, 5, 6, 7].map(num => (
                  <option key={num} value={num}>{num} {num === 1 ? 'Member' : 'Members'}</option>
                ))}
              </select>
            </label>

            <label className="profile-input-group">
              Room Mode
              <div className="room-mode-toggle tour-room-mode" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "8px" }}>
                <button
                  type="button"
                  style={{
                    padding: "16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    borderRadius: "8px",
                    border: isPublic ? "2px solid var(--primary)" : "1px solid var(--line)",
                    background: isPublic ? "var(--primary)" : "var(--field)",
                    color: isPublic ? "#1b1020" : "var(--text)",
                    fontWeight: "800",
                    cursor: "pointer",
                    transition: "all 180ms ease"
                  }}
                  onClick={() => setIsPublic(true)}
                >
                  <Zap size={16} /> Public
                </button>
                <button
                  type="button"
                  style={{
                    padding: "16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    borderRadius: "8px",
                    border: !isPublic ? "2px solid var(--primary)" : "1px solid var(--line)",
                    background: !isPublic ? "var(--primary)" : "var(--field)",
                    color: !isPublic ? "#1b1020" : "var(--text)",
                    fontWeight: "800",
                    cursor: "pointer",
                    transition: "all 180ms ease"
                  }}
                  onClick={() => setIsPublic(false)}
                >
                  <Lock size={16} /> Private
                </button>
              </div>
            </label>

            {status && <p className={`form-status ${status.includes("Could not") ? "error" : ""}`}>{status}</p>}

            <div className="profile-modal-footer">
              <button
                type="button"
                className="button secondary"
                onClick={() => {
                  setShowCreateModal(false);
                  setStatus("");
                  setRoomName("");
                  setMaxMembers("");
                  setIsPublic(true);
                }}
                disabled={creating}
              >
                Cancel
              </button>
              <button type="submit" className="button primary" disabled={creating}>
                {creating ? "Creating..." : "Create Room"}
              </button>
            </div>
          </form>
        </div>
      )}

      {joinRoomTarget && (
        <div className="profile-modal-overlay" role="dialog" aria-modal="true" aria-label="Enter room code">
          <form className="profile-modal-card" onSubmit={confirmJoinWithCode}>
            <div className="profile-modal-header">
              <h3>Enter Room Code for {joinRoomTarget.id}</h3>
            </div>
            <label className="profile-input-group">
              Room Code
              <input
                autoFocus
                value={codeEntry}
                onChange={(event) => {
                  setCodeEntry(event.target.value);
                  setJoinError("");
                }}
                placeholder="Enter code"
              />
            </label>
            {joinError && <p className="form-status error">{joinError}</p>}
            <div className="profile-modal-footer">
              <button type="button" className="button secondary" onClick={() => setJoinRoomTarget(null)}>
                Cancel
              </button>
              <button type="submit" className="button primary">
                Enter
              </button>
            </div>
          </form>
        </div>
      )}

      {selectedProfile && (
        <div className="profile-modal-overlay" role="dialog" aria-modal="true" aria-label="User profile">
          <div className="profile-modal-card">
            <div className="profile-modal-header">
              <h3>{selectedProfile.name}</h3>
            </div>
            <div className="profile-content">
              <div className="profile-avatar" style={{ background: selectedProfile.color || '#444' }}>{(selectedProfile.name||'').split(' ').map(s=>s[0]).slice(0,2).join('')}</div>
              <div className="profile-meta">
                <p><strong>Name:</strong> {selectedProfile.name}</p>
                <p><strong>Bio:</strong> {selectedProfile.bio || 'No bio available'}</p>
                <p><strong>Joined:</strong> {selectedProfile.joinedAt ? new Date(selectedProfile.joinedAt).toLocaleString() : 'Unknown'}</p>
              </div>
            </div>
            <div className="profile-modal-footer">
              <button type="button" className="button primary" onClick={() => setSelectedProfile(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      <FeedbackModal 
        isOpen={showFeedbackModal} 
        onClose={() => setShowFeedbackModal(false)}
        username={feedbackData.username}
        type={feedbackData.type}
      />
      </div>
    </main>
  );
}
