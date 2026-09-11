import {
  ChevronDown,
  Cloud,
  Code,
  ExternalLink,
  Folder,
  Lock,
  MoreVertical,
  Plus,
  Radio,
  Search as SearchIcon,
  SlidersHorizontal,
  Trash2,
  Users,
  Zap
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { Navbar } from "../components/Navbar";
import FeedbackModal from "../components/FeedbackModal";
import { trackEvent } from "../lib/analytics";
import { socket } from "../lib/socket";
import { getHostToken, saveHostToken, saveInviteCode, saveUsername } from "../lib/navigation";
import { useAuth } from "../hooks/useAuth";
import bg1 from "../../assets/bg1.mp4";
import bonfireImage from "../../assets/bonfire.jpeg";
import sceneOneImage from "../../assets/scene1.jpeg";
import sceneTwoImage from "../../assets/scene2.jpeg";
import sceneThreeImage from "../../assets/scene3.jpeg";

const roomImages = [bonfireImage, sceneOneImage, sceneTwoImage, sceneThreeImage];
const sortOptions = ["Newest First", "Most Popular", "Least Full"];

function formatUpdatedAt(value) {
  if (!value) return "Updated just now";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Updated just now";
  const diff = Date.now() - date.getTime();
  const minutes = Math.max(1, Math.round(diff / 60000));
  if (minutes < 60) return `Updated ${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Updated ${hours}h ago`;
  const days = Math.round(hours / 24);
  return `Updated ${days}d ago`;
}

export function RoomsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [savedWorks, setSavedWorks] = useState([]);
  const [joinRoomTarget, setJoinRoomTarget] = useState(null);
  const [codeEntry, setCodeEntry] = useState("");
  const [joinError, setJoinError] = useState("");
  const [roomName, setRoomName] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [maxMembers, setMaxMembers] = useState("");
  const [status, setStatus] = useState("");
  const [creating, setCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [projectSearchTerm, setProjectSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("Newest First");
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [roomTab, setRoomTab] = useState("All Rooms");
  const [projectTab, setProjectTab] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [resumingWorkId, setResumingWorkId] = useState(null);
  const [openProjectMenuId, setOpenProjectMenuId] = useState(null);
  const [deleteProjectTarget, setDeleteProjectTarget] = useState(null);
  const [deletingWorkId, setDeletingWorkId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackData, setFeedbackData] = useState({ username: "", type: "general" });
  const [toastMsg, setToastMsg] = useState("");

  const refreshRooms = useCallback(() => {
    return api.listRooms().then(setRooms).catch(console.error);
  }, []);

  const refreshSavedWorks = useCallback(() => {
    if (!user?.uid) {
      setSavedWorks([]);
      return Promise.resolve();
    }
    return api.getWorks(user.uid)
      .then((works) => setSavedWorks(Array.isArray(works) ? works : []))
      .catch(() => setSavedWorks([]));
  }, [user?.uid]);

  useEffect(() => {
    if (loading) return undefined;
    refreshRooms();
    refreshSavedWorks();
    socket.connect();

    const handleRoomsUpdate = () => refreshRooms();
    socket.on("rooms:update", handleRoomsUpdate);

    const params = new URLSearchParams(location.search);
    const msg = params.get("message");
    if (msg) {
      setTimeout(() => alert(msg), 100);
      navigate(location.pathname, { replace: true });
    }

    if (params.get("feedback") === "true") {
      setFeedbackData({
        username: params.get("username") || "",
        type: params.get("type") || "room_leave"
      });
      setShowFeedbackModal(true);
      params.delete("feedback");
      params.delete("username");
      params.delete("type");
      const newSearch = params.toString();
      navigate(location.pathname + (newSearch ? `?${newSearch}` : ""), { replace: true });
    }

    return () => socket.off("rooms:update", handleRoomsUpdate);
  }, [location.pathname, location.search, navigate, loading, refreshRooms, refreshSavedWorks]);

  const roomsPerPage = 6;

  const filteredRooms = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const nextRooms = rooms.filter((room) => {
      const roomNameText = String(room.name || "").toLowerCase();
      const roomIdText = String(room.id || "").toLowerCase();
      const hostText = String(room.hostName || room.host || "").toLowerCase();
      const matchesSearch = !term || roomNameText.includes(term) || roomIdText.includes(term) || hostText.includes(term);
      const matchesTab =
        roomTab === "All Rooms" ||
        (roomTab === "Public" && room.visibility !== "private") ||
        (roomTab === "Private" && room.visibility === "private") ||
        (roomTab === "My Rooms" && user?.uid && room.hostUserId === user.uid);
      return matchesSearch && matchesTab;
    });

    nextRooms.sort((a, b) => {
      if (sortBy === "Most Popular") return (b.users || 0) - (a.users || 0);
      if (sortBy === "Least Full") return (a.users || 0) - (b.users || 0);
      return (b.createdAt || 0) - (a.createdAt || 0);
    });

    return nextRooms;
  }, [rooms, searchTerm, sortBy, roomTab, user?.uid]);

  const filteredProjects = useMemo(() => {
    const term = projectSearchTerm.trim().toLowerCase();
    return savedWorks.filter((work) => {
      const completed = work.projectStatus === "completed" || work.readOnly;
      const matchesTab =
        projectTab === "All" ||
        (projectTab === "In Progress" && !completed) ||
        (projectTab === "Completed" && completed);
      const matchesSearch = !term || String(work.name || "Saved Work").toLowerCase().includes(term);
      return matchesTab && matchesSearch;
    });
  }, [savedWorks, projectSearchTerm, projectTab]);

  const totalPages = Math.max(1, Math.ceil(filteredRooms.length / roomsPerPage));
  const visibleRooms = filteredRooms.slice((currentPage - 1) * roomsPerPage, currentPage * roomsPerPage);
  const visibleProjects = filteredProjects.slice(0, 3);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortBy, roomTab]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  function showToast(msg) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  }

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
      setShowCreateModal(false);
      setRoomName("");
      setMaxMembers("");
      setIsPublic(true);
      setStatus("");
      navigate(room.visibility === "private" ? `/code/private/${room.id}` : `/code/${room.id}`);
    } catch (error) {
      setStatus(`Could not create room: ${error.message}`);
    } finally {
      setCreating(false);
    }
  }

  function joinRoom(id) {
    setJoinRoomTarget({ id: id.trim() });
    setJoinError("");
    setCodeEntry("");
  }

  function openRoomAsCurrentUser(room) {
    saveUsername(user?.displayName || user?.email?.split("@")[0] || generateGuestName());
    trackEvent("room_join", { room_id: room.id, visibility: room.visibility });
    navigate(room.visibility === "private" ? `/code/private/${room.id}` : `/code/${room.id}`);
  }

  async function confirmJoinWithCode(event) {
    event?.preventDefault?.();
    setJoinError("");
    try {
      const code = String(codeEntry || "").trim().replace(/\s+/g, "").toUpperCase();
      if (!code) {
        setJoinError("Please enter the room code.");
        return;
      }
      const room = await api.getRoomByInviteCode(code);
      if (!room || room.id !== joinRoomTarget.id) {
        setJoinError("Invalid room code for selected room.");
        return;
      }
      saveUsername(user?.displayName || user?.email?.split("@")[0] || generateGuestName());
      saveInviteCode(room.id, code);
      setJoinRoomTarget(null);
      navigate(`/code/private/${room.id}`);
    } catch (err) {
      setJoinError(err.message || "Invite code invalid");
    }
  }

  async function resumeSavedWork(work) {
    if (!user?.uid || !work?.id || resumingWorkId) {
      showToast("Sign in again to resume this work.");
      return;
    }
    if (work.projectStatus === "completed" || work.readOnly) {
      showToast("This project has ended and cannot be resumed or edited.");
      return;
    }

    setResumingWorkId(work.id);
    try {
      const response = await api.resumeSavedWorkRoom(user.uid, work.id);
      const reopenedRoom = response.room;
      if (!reopenedRoom?.id) throw new Error("Resume did not return a room.");
      saveHostToken(reopenedRoom.id, reopenedRoom.hostToken);
      saveInviteCode(reopenedRoom.id, reopenedRoom.inviteCode);
      navigate(`/room/${encodeURIComponent(reopenedRoom.id)}`, {
        state: { skipRoomGuide: true, resumedProjectId: work.id }
      });
    } catch (error) {
      showToast(error.message || "Could not reopen this saved work");
    } finally {
      setResumingWorkId(null);
    }
  }

  async function deleteSavedProject() {
    if (!user?.uid || !deleteProjectTarget?.id || deletingWorkId) return;

    const target = deleteProjectTarget;
    setDeletingWorkId(target.id);
    try {
      const result = await api.deleteWork(user.uid, target.id);
      const deletedIds = new Set(result.deletedWorkIds || [target.id]);
      setSavedWorks((items) => items.filter((work) => !deletedIds.has(work.id)));
      setDeleteProjectTarget(null);
      setOpenProjectMenuId(null);
      showToast("Project deleted permanently.");
      window.dispatchEvent(new CustomEvent("codefora:saved-works-changed", { detail: { userId: user.uid } }));
      try {
        localStorage.setItem("codefora_saved_works_changed", JSON.stringify({ userId: user.uid, at: Date.now() }));
      } catch {
        // Ignore storage errors; current tab is already updated.
      }
    } catch (error) {
      showToast(error.message || "Could not delete this project.");
    } finally {
      setDeletingWorkId(null);
    }
  }

  return (
    <main className="rooms-dashboard">
      <video className="rooms-dashboard-video" autoPlay loop muted playsInline>
        <source src={bg1} type="video/mp4" />
      </video>
      <div className="rooms-dashboard-overlay" />

      <div className="rooms-page-shell">
        <Navbar />

        <section className="rooms-dashboard-content">
          <div className="rooms-hero-strip" aria-hidden="true">
            <img src={bonfireImage} alt="" />
          </div>

          <div className="rooms-command-bar">
            <label className="rooms-search-field">
              <SearchIcon size={17} />
              <input placeholder="Search by room name or ID..." value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} />
            </label>
            <div className="rooms-sort-menu" onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) setSortMenuOpen(false);
            }}>
              <SlidersHorizontal size={16} />
              <button
                type="button"
                className="rooms-sort-trigger"
                aria-haspopup="listbox"
                aria-expanded={sortMenuOpen}
                onClick={() => setSortMenuOpen((open) => !open)}
              >
                {sortBy}
                <ChevronDown size={16} />
              </button>
              {sortMenuOpen && (
                <div className="rooms-sort-options" role="listbox" aria-label="Sort rooms">
                  {sortOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      role="option"
                      aria-selected={sortBy === option}
                      className={sortBy === option ? "active" : ""}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        setSortBy(option);
                        setSortMenuOpen(false);
                      }}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button className="rooms-action-btn rooms-action-btn-orange tour-create-room" type="button" onClick={() => setShowCreateModal(true)}>
              <Plus size={18} /> Create Room
            </button>
          </div>

          <section className="rooms-dashboard-panel tour-rooms-list">
            <div className="rooms-panel-header">
              <div className="rooms-title-row">
                <Radio size={20} />
                <h2>Live Rooms</h2>
              </div>
            </div>
            <div className="rooms-tabs" role="tablist" aria-label="Room filters">
              {["All Rooms", "Public", "Private", "My Rooms"].map((tab) => (
                <button key={tab} type="button" className={roomTab === tab ? "active" : ""} onClick={() => setRoomTab(tab)}>
                  {tab}
                </button>
              ))}
            </div>

            <div className="rooms-card-grid">
              {visibleRooms.length === 0 ? (
                <div className="rooms-empty-state">
                  <Users size={42} />
                  <h3>No rooms available</h3>
                  <p>Start a live coding room whenever you are ready.</p>
                </div>
              ) : (
                visibleRooms.map((room, index) => {
                  const canOpenWithoutCode = room.visibility !== "private" || room.canJoinWithoutCode || Boolean(getHostToken(room.id));
                  const hostName = room.hostName || room.host || "Codefora";
                  return (
                    <article className="rooms-showcase-card" key={room.id}>
                      <img src={roomImages[index % roomImages.length]} alt="" />
                      <div className="rooms-showcase-shade" />
                      <span className={`rooms-visibility-pill ${room.visibility === "private" ? "private" : "public"}`}>
                        {room.visibility === "private" ? "Private" : "Public"}
                      </span>
                      <div className="rooms-showcase-content">
                        <h3>{room.name}</h3>
                        <div className="rooms-room-meta">
                          <span>{room.id}</span>
                          <span>Host: {hostName}</span>
                          <span><Users size={14} /> {room.users || 0}/{room.max || 0}</span>
                        </div>
                        <div className="rooms-tag-row">
                          <span>C++</span>
                          <span>Python</span>
                          <span>+2</span>
                        </div>
                        <button
                          type="button"
                          className="rooms-action-btn rooms-action-btn-orange rooms-open-btn"
                          disabled={(room.users || 0) >= (room.max || 0)}
                          onClick={() => {
                            if (canOpenWithoutCode) openRoomAsCurrentUser(room);
                            else joinRoom(room.id);
                          }}
                        >
                          {(room.users || 0) >= (room.max || 0) ? "Full" : "Open"}
                        </button>
                      </div>
                    </article>
                  );
                })
              )}
            </div>

            {totalPages > 1 && (
              <div className="rooms-pagination">
                <button className="pagination-btn" disabled={currentPage === 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}>
                  &lt;
                </button>
                {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                  <button key={page} className={`pagination-btn ${currentPage === page ? "active" : ""}`} onClick={() => setCurrentPage(page)}>
                    {page}
                  </button>
                ))}
                <button className="pagination-btn" disabled={currentPage === totalPages} onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}>
                  &gt;
                </button>
              </div>
            )}
          </section>

          <section className="rooms-dashboard-panel">
            <div className="rooms-projects-header">
              <div className="rooms-title-row">
                <Folder size={21} />
                <h2>Projects</h2>
              </div>
              <div className="rooms-project-tools">
                <label className="rooms-project-search">
                  <SearchIcon size={15} />
                  <input placeholder="Search projects..." value={projectSearchTerm} onChange={(event) => setProjectSearchTerm(event.target.value)} />
                </label>
                <button className="rooms-action-btn rooms-action-btn-orange" type="button" onClick={() => setShowCreateModal(true)}>
                  <Plus size={17} /> New Project
                </button>
              </div>
            </div>
            <div className="rooms-tabs" role="tablist" aria-label="Project filters">
              {["All", "In Progress", "Completed"].map((tab) => (
                <button key={tab} type="button" className={projectTab === tab ? "active" : ""} onClick={() => setProjectTab(tab)}>
                  {tab}
                </button>
              ))}
            </div>

            <div className="rooms-project-grid">
              {visibleProjects.length === 0 ? (
                <div className="rooms-empty-state rooms-project-empty">
                  <Folder size={38} />
                  <h3>No saved projects</h3>
                  <p>Your saved room work will appear here.</p>
                </div>
              ) : (
                visibleProjects.map((work) => {
                  const completed = work.projectStatus === "completed" || work.readOnly;
                  const fileCount = work.fileCount || work.files?.length || 0;
                  return (
                    <article className="rooms-project-card" key={work.id}>
                      <div className={`rooms-project-icon ${completed ? "completed" : ""}`}>
                        {completed ? <Cloud size={27} /> : <Code size={27} />}
                      </div>
                      <div className="rooms-project-info">
                        <h3>{work.name || "Saved Work"}</h3>
                        <span className={completed ? "completed" : "active"}>
                          {completed ? "Completed" : "In Progress"}
                        </span>
                        <p>{formatUpdatedAt(work.updatedAt || work.createdAt)}</p>
                        <div className="rooms-tag-row">
                          <span>{fileCount} files</span>
                          <span>{work.type === "room-project" ? "Room" : "Workspace"}</span>
                        </div>
                      </div>
                      <button
                        className="rooms-icon-btn"
                        type="button"
                        aria-label="Project actions"
                        aria-expanded={openProjectMenuId === work.id}
                        onClick={() => setOpenProjectMenuId((current) => current === work.id ? null : work.id)}
                      >
                        <MoreVertical size={18} />
                      </button>
                      {openProjectMenuId === work.id && (
                        <div className="rooms-project-menu" role="menu">
                          {work.originRoomId && !completed ? (
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => {
                                setOpenProjectMenuId(null);
                                resumeSavedWork(work);
                              }}
                            >
                              <ExternalLink size={14} /> Resume
                            </button>
                          ) : (
                            <span className="rooms-project-menu-disabled">
                              {completed ? "Ended - cannot edit" : "No room resume"}
                            </span>
                          )}
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setOpenProjectMenuId(null);
                              navigate("/profile");
                            }}
                          >
                            <Folder size={14} /> View in Profile
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            className="rooms-project-menu-danger"
                            onClick={() => {
                              setOpenProjectMenuId(null);
                              setDeleteProjectTarget(work);
                            }}
                          >
                            <Trash2 size={14} /> Delete Project
                          </button>
                        </div>
                      )}
                      {work.originRoomId && (
                        completed ? (
                          <span className="rooms-ended-pill">Ended</span>
                        ) : (
                          <button
                            className="rooms-project-resume"
                            type="button"
                            onClick={() => resumeSavedWork(work)}
                            disabled={resumingWorkId === work.id}
                          >
                            {resumingWorkId === work.id ? "Opening" : "Resume"} <ExternalLink size={13} />
                          </button>
                        )
                      )}
                    </article>
                  );
                })
              )}
            </div>

          </section>
        </section>

        {showCreateModal && (
          <div className="profile-modal-overlay" role="dialog" aria-modal="true" aria-label="Create a room">
            <form className="profile-modal-card" onSubmit={(event) => { event.preventDefault(); createRoom(); }}>
              <div className="profile-modal-header">
                <h3>Create a New Room</h3>
              </div>

              <label className="profile-input-group tour-room-name">
                Room Name
                <input autoFocus value={roomName} onChange={(event) => setRoomName(event.target.value)} placeholder="Enter room name" />
              </label>

              <label className="profile-input-group tour-room-size">
                Room Size (Members)
                <select value={maxMembers} onChange={(event) => setMaxMembers(event.target.value)} required>
                  <option value="" disabled>Select max size</option>
                  {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                    <option key={num} value={num}>{num} {num === 1 ? "Member" : "Members"}</option>
                  ))}
                </select>
              </label>

              <label className="profile-input-group">
                Room Mode
                <div className="room-mode-toggle tour-room-mode">
                  <button type="button" className={isPublic ? "active" : ""} onClick={() => setIsPublic(true)}>
                    <Zap size={16} /> Public
                  </button>
                  <button type="button" className={!isPublic ? "active" : ""} onClick={() => setIsPublic(false)}>
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

        {deleteProjectTarget && (
          <div
            className="profile-modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-label="Permanently delete project"
            onClick={() => {
              if (!deletingWorkId) setDeleteProjectTarget(null);
            }}
          >
            <div className="profile-modal-card" onClick={(event) => event.stopPropagation()}>
              <div className="profile-modal-header">
                <h3>Permanently delete project?</h3>
              </div>
              <p style={{ color: "rgba(255,255,255,0.72)", lineHeight: 1.55, margin: "0 0 18px" }}>
                This will permanently delete "{deleteProjectTarget.name || "Saved Work"}" from your projects and Profile saved work.
              </p>
              <div className="profile-modal-footer">
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => setDeleteProjectTarget(null)}
                  disabled={Boolean(deletingWorkId)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="button primary"
                  onClick={deleteSavedProject}
                  disabled={Boolean(deletingWorkId)}
                  style={{ background: "#ef4444", color: "#fff" }}
                >
                  {deletingWorkId ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}

        {toastMsg && <div className="rooms-toast">{toastMsg}</div>}

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
