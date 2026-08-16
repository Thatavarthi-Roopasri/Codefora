import { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Edit3, Code, Users, Flame, Trophy, Award, 
  Shield, CheckCircle2, MessageSquare, MoreHorizontal, UserPlus, 
  Activity, Star, ExternalLink, Flag, X, Save, Folder, Clock, Search, ShieldAlert, Copy
} from "lucide-react";
import { useParams } from "react-router-dom";
import { Navbar } from "../components/Navbar";
import { copyToClipboard } from "../lib/clipboard";
import EmotionPicker from "../components/EmotionPicker";
import { useAuth } from "../hooks/useAuth";
import { getProfile, saveProfile } from "../api/client";
import { API_URL } from "../config";
import { trackEvent } from "../lib/analytics";
import { ActivityHeatmap } from "../components/ActivityHeatmap";
import "../styles/profile.css";

import defaultAvatar from "../../assets/scene1.jpeg"; // Fallback banner


function FriendProfileItem({ friend, navigate }) {
  const [profile, setProfile] = useState(null);


  useEffect(() => {
    let active = true;
    getProfile(friend.id).then(data => {
      if (active && data) setProfile(data);
    }).catch(console.error);
    return () => { active = false; };
  }, [friend.id]);

  const emotionImage = profile?.emotionId ? `${API_URL}/api/emotions/${profile.emotionId}/image` : null;

  return (
    <div className="friend-item" onClick={() => navigate('/profile/' + (profile?.friendCode || friend.friendCode || friend.id))}>
      <div className="friend-avatar">
        {emotionImage ? (
          <img src={emotionImage} alt={friend.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : profile?.photoURL ? (
          <img src={profile.photoURL} alt={friend.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-accent)', fontWeight: 'bold', fontSize: '18px' }}>
            {friend.name ? friend.name[0].toUpperCase() : '?'}
          </div>
        )}
        <div 
          className="friend-status" 
          style={{ 
            background: profile?.presence === 'in-room' ? '#3b82f6' : profile?.presence === 'online' ? '#10b981' : '#64748b' 
          }} 
          title={profile?.presence === 'in-room' ? 'In Room' : profile?.presence === 'online' ? 'Online' : 'Offline'}
        />
      </div>
      <div className="friend-meta">
        <div className="friend-name">{profile?.displayName || friend.name}</div>
        {(profile?.friendCode || friend.friendCode) && (
          <div className="friend-handle">USER ID: {profile?.friendCode || friend.friendCode}</div>
        )}
      </div>
    </div>
  );
}

export function ProfilePage() {
  const { userId: urlUserId } = useParams();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const isOwnProfile = !urlUserId || (user && urlUserId === user.uid);
  const targetUserId = urlUserId || user?.uid;
  
  // Real Profile Data
  const [profileData, setProfileData] = useState({});
  const [myFriends, setMyFriends] = useState([]);
  const [toastMsg, setToastMsg] = useState("");
  const [copyFeedback, setCopyFeedback] = useState("");
  const copyFeedbackTimerRef = useRef(null);
  
  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  };
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [selectedEmotion, setSelectedEmotion] = useState("");
  const [selectedCommunity, setSelectedCommunity] = useState("sider");
  const [heatmapTooltip, setHeatmapTooltip] = useState({ visible: false, text: '', x: 0, y: 0 });
  const heatmapContainerRef = useRef(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Edit Modal State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingAvatar, setIsEditingAvatar] = useState(false);
  const [isFriendsModalOpen, setIsFriendsModalOpen] = useState(false);
  const [friendSearchQuery, setFriendSearchQuery] = useState("");
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editEmotion, setEditEmotion] = useState("");
  const [editCommunity, setEditCommunity] = useState("sider");
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");
  const [selectedPublicProfileId, setSelectedPublicProfileId] = useState(null);

  // Report User State
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [isReporting, setIsReporting] = useState(false);

  useEffect(() => {
    if (heatmapContainerRef.current) {
      heatmapContainerRef.current.scrollLeft = heatmapContainerRef.current.scrollWidth;
    }
  }, [loadingProfile]);

  useEffect(() => {
    return () => {
      if (copyFeedbackTimerRef.current) {
        clearTimeout(copyFeedbackTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!targetUserId) {
      setLoadingProfile(false);
      return;
    }
    let active = true;
    async function loadProfile() {
      setLoadingProfile(true);
      const profile = await getProfile(targetUserId).catch(() => ({}));
      if (!isOwnProfile && user?.uid) {
        const myProfile = await getProfile(user.uid).catch(() => ({}));
        if (active && myProfile.friends) setMyFriends(myProfile.friends);
      }
      if (!active) return;
      setProfileData(profile || {});
      setDisplayName(profile.displayName || (isOwnProfile ? user?.displayName : "") || "");
      setBio(profile.bio || "Building consistency one problem at a time.");
      setSelectedEmotion(profile.emotionId || "");
      setSelectedCommunity(profile.community || "sider");
      setLoadingProfile(false);
    }
    trackEvent("profile_visit", { user_id: targetUserId });
    loadProfile();
    return () => { active = false; };
  }, [targetUserId, isOwnProfile, user?.displayName]);

  const headerName = useMemo(() => displayName || (isOwnProfile ? user?.displayName : "Unknown Developer"), [displayName, isOwnProfile, user?.displayName]);
  const emotionImage = selectedEmotion ? `${API_URL}/api/emotions/${selectedEmotion}/image` : null;
  
  const stats = profileData.stats || {};
  const problemsSolved = Number.isFinite(stats.problemsSolved) ? stats.problemsSolved : 0;
  const currentStreak = Number.isFinite(stats.currentStreak) ? stats.currentStreak : 0;
  const roomsJoined = Number.isFinite(stats.roomsJoined) ? stats.roomsJoined : 0;
  const globalRank = stats.globalRank || "-";
  
  // Real Friends & Activities (currently empty)
  const rawFriends = profileData.friends || [];
  const friends = useMemo(() => {
    if (isOwnProfile) return rawFriends;
    if (!user) return [];
    const myFriendIds = new Set(myFriends.map(f => f.id));
    return rawFriends.filter(f => myFriendIds.has(f.id));
  }, [isOwnProfile, user, rawFriends, myFriends]);
  const activities = profileData.activities || [];

  const openEditModal = () => {
    setEditName(displayName);
    setEditBio(bio);
    setEditEmotion(selectedEmotion);
    setEditCommunity(selectedCommunity);
    setIsEditingProfile(true);
  };

  const openAvatarModal = () => {
    setEditName(displayName);
    setEditBio(bio);
    setEditEmotion(selectedEmotion);
    setEditCommunity(selectedCommunity);
    setIsEditingAvatar(true);
  };

  const handleSaveChanges = async () => {
    if (!user?.uid) return;
    setIsSaving(true);
    setSaveStatus("");

    const nextProfile = {
      ...profileData,
      displayName: editName.trim(),
      bio: editBio.trim(),
      emotionId: editEmotion,
      community: editCommunity,
      activities: [{ type: "profile_update", text: "Updated Profile", subtext: "Profile updated successfully", timestamp: Date.now() }, ...(profileData.activities || []).slice(0, 9)]
    };

    const ok = await saveProfile(user.uid, nextProfile).then(() => true).catch(() => false);
    if (ok) {
      setProfileData(nextProfile);
      setDisplayName(nextProfile.displayName);
      setBio(nextProfile.bio);
      setSelectedEmotion(nextProfile.emotionId);
      setSelectedCommunity(nextProfile.community);
      document.documentElement.dataset.community = nextProfile.community;
      localStorage.setItem("codefora_community", nextProfile.community);
      localStorage.setItem("codefora_username", nextProfile.displayName);
      window.dispatchEvent(new Event("profileUpdated"));
      setIsEditingProfile(false);
      setIsEditingAvatar(false);
    } else {
      setSaveStatus("Could not save profile.");
    }
    setIsSaving(false);
  };

  const handleRemoveFriend = async (friendId) => {
    try {
      const { api } = await import("../api/client");
      await api.removeFriend(user.uid, friendId);
      
      const newFriends = friends.filter(f => f.id !== friendId);
      setProfileData(prev => ({ ...prev, friends: newFriends }));
      
      const cachedProfileStr = localStorage.getItem("codefora_profile_" + user.uid);
      if (cachedProfileStr) {
        try {
          const cp = JSON.parse(cachedProfileStr);
          if (cp.friends) {
            cp.friends = cp.friends.filter(f => f.id !== friendId);
            localStorage.setItem("codefora_profile_" + user.uid, JSON.stringify(cp));
          }
        } catch(e) {}
      }
    } catch (err) {
      throw err;
    }
  };

  const handleReportSubmit = async (reasonOverride = null) => {
    const finalReason = reasonOverride || reportReason.trim();
    if (!finalReason) return;
    
    setIsReporting(true);
    try {
      const { api } = await import("../api/client");
      await api.request('/api/feedback', {
        method: 'POST',
        body: JSON.stringify({
          type: 'report',
          reportedId: profileData.id || targetUserId,
          reportedName: displayName,
          reporterId: user.uid,
          reporterName: user.displayName || user.email?.split('@')[0] || "Unknown User",
          message: finalReason
        })
      });
      setIsReportModalOpen(false);
      setReportReason('');
      showToast('Report submitted successfully. Our team will review it shortly.');
    } catch (err) {
      showToast('Failed to submit report: ' + err.message);
    } finally {
      setIsReporting(false);
    }
  };

  const handleCopyUserId = async () => {
    const userIdToCopy = String(profileData.friendCode ?? "").trim();
    if (!userIdToCopy) return;

    if (copyFeedbackTimerRef.current) {
      clearTimeout(copyFeedbackTimerRef.current);
    }

    try {
      await copyToClipboard(userIdToCopy);
      setCopyFeedback("Copied!");
      showToast("USER ID copied to clipboard!");
    } catch (err) {
      setCopyFeedback("Copy failed");
      showToast("Failed to copy USER ID.");
    }

    copyFeedbackTimerRef.current = setTimeout(() => {
      setCopyFeedback("");
      copyFeedbackTimerRef.current = null;
    }, 1800);
  };

  if (loading || loadingProfile) {
    return (
      <main className="profile-dashboard">
        <Navbar />
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '100px' }}>Loading profile...</div>
      </main>
    );
  }

  if (!isOwnProfile && !targetUserId) {
    return (
      <main className="profile-dashboard">
        <Navbar />
        <div style={{ textAlign: 'center', marginTop: '100px' }}>
          <h2>User Not Found</h2>
        </div>
      </main>
    );
  }

  if (isOwnProfile && !user) {
    return (
      <main className="profile-dashboard">
        <Navbar />
        <div style={{ textAlign: 'center', marginTop: '100px' }}>
          <h2>Authentication Required</h2>
          <button onClick={() => navigate("/home")} className="btn-primary" style={{ margin: '0 auto' }}>Go to Home</button>
        </div>
      </main>
    );
  }

  return (
    <main className="profile-dashboard">
      <Navbar />
      
      <div className="profile-content">
        
        {/* HEADER SECTION */}
        <div className="profile-header-card" style={{ backgroundImage: `url(${defaultAvatar})` }}>
          <div className="avatar-container">
            <div className="avatar-inner">
              {emotionImage ? (
                <img src={emotionImage} alt="Profile" />
              ) : (
                <div style={{ fontSize: '40px', fontWeight: 'bold', color: 'rgba(255,255,255,0.2)' }}>{'{ }'}</div>
              )}
            </div>
          </div>

          <div className="profile-info">
            <div className="profile-name-row">
              <h1>{headerName}</h1>
              {isOwnProfile ? (
                <div className="profile-name-actions" style={{ display: 'flex', gap: '10px' }}>
                  <button className="btn-secondary" onClick={openEditModal} style={{ padding: '6px 12px', fontSize: '12px' }}>
                    <Edit3 size={14} /> Edit Profile
                  </button>
                  <button className="btn-secondary" onClick={openAvatarModal} style={{ padding: '6px 12px', fontSize: '12px' }}>
                    <Users size={14} /> Change Avatar
                  </button>
                </div>
              ) : (
                <div className="profile-name-actions" style={{ display: 'flex', gap: '10px' }}>
                  {user && (
                    <button className="btn-secondary" onClick={() => setIsReportModalOpen(true)} style={{ padding: '6px 12px', fontSize: '12px', color: '#ff5555', borderColor: 'rgba(255, 85, 85, 0.3)' }}>
                      <ShieldAlert size={14} /> Report User
                    </button>
                  )}
                </div>
              )}
            </div>
            
            <div className="profile-handle" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: "12px", fontFamily: "monospace", color: "rgba(255,255,255,0.5)", background: "rgba(255,255,255,0.05)", padding: "2px 6px", borderRadius: "4px", border: "1px solid rgba(255,255,255,0.1)", display: 'flex', alignItems: 'center', gap: '6px' }}>
                USER ID: {profileData.friendCode || "..."}
                {profileData.friendCode && (
                  <button
                    type="button"
                    onClick={handleCopyUserId}
                    aria-label="Copy USER ID"
                    style={{ background: 'none', border: 'none', color: 'var(--primary-accent)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center', borderRadius: '4px' }}
                    title="Copy USER ID"
                  >
                    <Copy size={12} />
                  </button>
                )}
              </span>
              {copyFeedback && (
                <span style={{
                  color: copyFeedback === "Copied!" ? '#22c55e' : '#ff5555',
                  background: copyFeedback === "Copied!" ? 'rgba(34, 197, 94, 0.12)' : 'rgba(255, 85, 85, 0.12)',
                  border: `1px solid ${copyFeedback === "Copied!" ? 'rgba(34, 197, 94, 0.35)' : 'rgba(255, 85, 85, 0.35)'}`,
                  borderRadius: '999px',
                  padding: '3px 8px',
                  fontSize: '11px',
                  fontWeight: 700,
                  lineHeight: 1,
                  boxShadow: '0 8px 20px rgba(0,0,0,0.25)'
                }}>
                  {copyFeedback}
                </span>
              )}
            </div>

            <div className="profile-badges">
              <div className="status-indicator">
                <div className="status-dot"></div> Online
              </div>
              <div className="rank-badge">
                <Star size={14} fill="currentColor" /> Codefora Member
              </div>
              <div className="level-badge">
                Level {Math.floor(problemsSolved / 10) + 1}
              </div>
            </div>

            <div className="profile-bio">
              "{bio}"
            </div>
          </div>
        </div>

        {/* STATS STRIP */}
        <div className="stats-strip">
          <div className="stat-card">
            <div className="stat-header"><Code size={14} /> Problems Solved</div>
            <div className="stat-value">{problemsSolved}</div>
            <div className="stat-subtext">Total Accepted</div>
          </div>
          <div className="stat-card">
            <div className="stat-header"><Star size={14} className="text-orange" /> Current Streak</div>
            <div className="stat-value">{currentStreak}</div>
            <div className="stat-subtext">Active Days</div>
          </div>
          <div className="stat-card">
            <div className="stat-header"><Activity size={14} className="text-blue" /> Global Rank</div>
            <div className="stat-value">{globalRank}</div>
            <div className="stat-subtext">Leaderboard</div>
          </div>
          <div className="stat-card">
            <div className="stat-header"><Users size={14} className="text-blue" /> Friends</div>
            <div className="stat-value">{friends.length}</div>
            <div className="stat-subtext">Connections</div>
          </div>
          <div className="stat-card">
            <div className="stat-header"><Flame size={14} className="text-orange" /> Rooms Joined</div>
            <div className="stat-value">{roomsJoined}</div>
            <div className="stat-subtext">Total Rooms</div>
          </div>
        </div>

        {/* Friends Row */}
        <div className="dashboard-card" style={{ marginBottom: '24px' }}>
          <div className="card-header">
            <h3>Friends ({friends.length})</h3>
            <a href="#" className="view-all" onClick={(e) => { e.preventDefault(); setIsFriendsModalOpen(true); }}>View All</a>
          </div>
          <div className="friends-list">
            {friends.length > 0 ? (
              friends.map((friend, i) => (
                <FriendProfileItem key={i} friend={friend} navigate={navigate} />
              ))
            ) : (
              <div style={{color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '8px'}}>
                <UserPlus size={16} /> No friends yet.
              </div>
            )}
          </div>
        </div>

        {/* GRID ROW 1 */}
        <div className="dashboard-grid-2">
          <div className="dashboard-card">
            <div className="card-header">
              <h3>Achievements</h3>
              <a href="#" className="view-all">View All</a>
            </div>
            <div className="achievements-grid">
              {(profileData.achievements && profileData.achievements.length > 0) ? (
                profileData.achievements.map((ach, i) => (
                  <div key={i} className="achievement-item">
                    <div className="hexagon"><Trophy className="hexagon-icon text-orange" size={24} /></div>
                    <span className="achievement-name">{ach.name || "Achievement"}</span>
                  </div>
                ))
              ) : (
                <div style={{color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontStyle: 'italic', width: '100%', textAlign: 'center', padding: '20px 0'}}>
                  No achievements yet. Play matches to unlock!
                </div>
              )}
            </div>
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <ActivityHeatmap
              activities={activities}
              solvedProblems={profileData.solvedProblems}
              stats={profileData.stats}
            />
          </div>
        </div>

        {/* GRID ROW 2 */}
        <div className="dashboard-grid-2">
          <div className="dashboard-card">
            <div className="card-header">
              <h3>Competitive Stats</h3>
              <a href="#" className="view-all">View All</a>
            </div>
            <div className="progress-list">
              {[
                { id: "relay", name: "Relay DSA", icon: <Users size={14}/>, color: "#f97316" },
                { id: "frontend", name: "Frontend Relay", icon: <Code size={14}/>, color: "#3b82f6" },
                { id: "blind", name: "Blind Auction", icon: <Shield size={14}/>, color: "#a855f7" },
                { id: "standard", name: "Standard DSA", icon: <CheckCircle2 size={14}/>, color: "#22c55e" },
                { id: "battles", name: "Code Battles", icon: <Flame size={14}/>, color: "#ef4444" },
              ].map((stat, i) => {
                const modeData = (profileData.stats?.modeStats || {})[stat.id] || { wins: 0, matches: 0 };
                const winRate = modeData.matches > 0 ? Math.round((modeData.wins / modeData.matches) * 100) : 0;
                return (
                  <div key={i} className="progress-item">
                    <div className="progress-header">
                      <div className="progress-label">{stat.icon} {stat.name}</div>
                      <div className="progress-wins">{modeData.wins} Wins</div>
                    </div>
                    <div className="progress-track">
                      <div className="progress-fill" style={{width: `${winRate}%`, background: stat.color}}></div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="dashboard-card">
            <div className="card-header">
              <h3>Favorite Modes</h3>
            </div>
            <div className="donut-container">
              {(() => {
                const modes = profileData.stats?.modeStats || {};
                const totalMatches = Object.values(modes).reduce((sum, m) => sum + (m.matches || 0), 0);
                
                if (totalMatches === 0) {
                  return (
                    <>
                      <div className="donut-chart" style={{background: 'conic-gradient(rgba(255,255,255,0.1) 0% 100%)'}}>
                        <div className="donut-hole">
                          <strong>0</strong>
                          <span>Matches</span>
                        </div>
                      </div>
                      <div className="donut-legend">
                        <div className="legend-item" style={{color: 'rgba(255,255,255,0.5)'}}>Play matches to unlock favorite mode stats.</div>
                      </div>
                    </>
                  );
                }

                // If we have matches, calculate the gradient, but for simplicity, we'll assume an empty state is what the user currently has.
                return (
                  <div style={{color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontStyle: 'italic', width: '100%', textAlign: 'center'}}>
                    Mode distribution will appear here once you play more matches!
                  </div>
                );
              })()}
            </div>
          </div>
        </div>


        {/* GRID ROW 4 */}
        <div className="dashboard-grid-2">
          <div className="dashboard-card">
            <div className="card-header">
              <h3>Saved Work (from playground and room)</h3>
              <a href="#" className="view-all">View All</a>
            </div>
            <div className="projects-list">
              <div style={{color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '8px'}}>
                <Folder size={16} /> No public projects yet. Save a playground file as public to feature it here!
              </div>
            </div>
          </div>

          <div className="dashboard-card">
            <div className="card-header">
              <h3>Recent Activity</h3>
              <a href="#" className="view-all">View All</a>
            </div>
            <div className="activity-list">
              {activities.length > 0 ? (
                activities.slice(0, 5).map((act, i) => (
                  <div key={i} className="activity-item">
                    <div className="activity-icon"><Activity size={16} className="text-orange" /></div>
                    <div className="activity-info">
                      <div className="activity-title">{act.text}</div>
                      <div className="activity-subtext">{act.subtext}</div>
                    </div>
                    <div className="activity-meta">
                      <div className="activity-time">{new Date(act.timestamp).toLocaleDateString()}</div>
                      <div className="activity-xp">+10 XP</div>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <Clock size={16} /> No recent activity.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* EDIT PROFILE MODAL */}
      {isEditingProfile && (
        <div className="modal-overlay" onClick={() => setIsEditingProfile(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Profile</h2>
              <button className="close-btn" onClick={() => setIsEditingProfile(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label>Display Name</label>
                <input 
                  type="text" 
                  value={editName} 
                  onChange={e => setEditName(e.target.value)} 
                  placeholder="Your name"
                />
              </div>
              <div className="form-group">
                <label>Bio</label>
                <textarea 
                  value={editBio} 
                  onChange={e => setEditBio(e.target.value)} 
                  placeholder="Tell us about yourself..."
                />
              </div>
            </div>

            <div className="modal-footer">
              {saveStatus && <span className="save-status-text">{saveStatus}</span>}
              <button className="btn-secondary" onClick={() => setIsEditingProfile(false)} disabled={isSaving}>Cancel</button>
              <button className="btn-primary" onClick={handleSaveChanges} disabled={isSaving}>
                <Save size={16} /> {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
      {heatmapTooltip.visible && (
        <div style={{
          position: 'fixed',
          top: heatmapTooltip.y,
          left: heatmapTooltip.x,
          transform: 'translate(-50%, -100%)',
          background: '#24292f',
          color: '#fff',
          padding: '6px 10px',
          borderRadius: '6px',
          fontSize: '11px',
          whiteSpace: 'nowrap',
          zIndex: 9999,
          pointerEvents: 'none',
          boxShadow: '0 2px 4px rgba(0,0,0,0.5)'
        }}>
          {heatmapTooltip.text}
          <div style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            border: '5px solid transparent',
            borderTopColor: '#24292f'
          }}></div>
        </div>
      )}

      {isFriendsModalOpen && (
        <div className="modal-overlay" onClick={() => setIsFriendsModalOpen(false)}>
          <div className="modal-content friends-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px', height: '600px', display: 'flex', flexDirection: 'column', padding: 0 }}>
            <div className="modal-header" style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <h2>{isOwnProfile ? "All Friends" : "Mutual Friends"}</h2>
              <button className="close-btn" onClick={() => setIsFriendsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.5)' }} />
                <input 
                  type="text" 
                  placeholder="Search friends by ID..." 
                  value={friendSearchQuery}
                  onChange={e => setFriendSearchQuery(e.target.value)}
                  style={{
                    width: '100%', padding: '12px 12px 12px 40px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px', color: 'white', outline: 'none'
                  }}
                />
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {friends.filter(f => !friendSearchQuery || (f.id && f.id.toString().includes(friendSearchQuery))).map((friend, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <img src={defaultAvatar} alt={friend.name} style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '15px' }}>{friend.name}</div>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>ID: {friend.id || 'Unknown'}</div>
                  </div>
                  <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>
                    Message
                  </button>
                </div>
              ))}
              {friends.filter(f => !friendSearchQuery || (f.id && f.id.toString().includes(friendSearchQuery))).length === 0 && (
                <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', padding: '40px 0', fontSize: '14px' }}>
                  No friends found.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* EDIT AVATAR MODAL */}
      {isEditingAvatar && (
        <div className="modal-overlay" onClick={() => setIsEditingAvatar(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Change Avatar</h2>
              <button className="close-btn" onClick={() => setIsEditingAvatar(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label>Community</label>
                <div className="community-selector-row">
                  <button 
                    type="button"
                    className={`community-btn sider ${editCommunity === 'sider' ? 'active' : ''}`}
                    onClick={() => { setEditCommunity('sider'); setEditEmotion(""); }}
                  >
                    Sider
                  </button>
                  <button 
                    type="button"
                    className={`community-btn loop ${editCommunity === 'loop' ? 'active' : ''}`}
                    onClick={() => { setEditCommunity('loop'); setEditEmotion(""); }}
                  >
                    Loop
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>Choose Avatar (Emotion)</label>
                <div style={{ maxHeight: '300px', overflowY: 'auto', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '12px' }}>
                  <EmotionPicker 
                    selectedEmotion={editEmotion} 
                    onSelectEmotion={setEditEmotion} 
                    category={editCommunity} 
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              {saveStatus && <span className="save-status-text">{saveStatus}</span>}
              <button className="btn-secondary" onClick={() => setIsEditingAvatar(false)} disabled={isSaving}>Cancel</button>
              <button className="btn-primary" onClick={handleSaveChanges} disabled={isSaving}>
                <Save size={16} /> {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REPORT MODAL */}
      {isReportModalOpen && (
        <div className="modal-overlay" onClick={() => setIsReportModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2>Report User</h2>
              <button className="close-btn" onClick={() => setIsReportModalOpen(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Quick Report Options</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px', marginBottom: '20px' }}>
                  {["Cheating / Hacking", "Inappropriate Behavior", "Spam / Scam", "Offensive Content", "Harassment"].map(option => (
                    <button 
                      key={option}
                      className="btn-secondary" 
                      style={{ textAlign: 'left', padding: '8px 12px', justifyContent: 'flex-start', border: '1px solid rgba(255, 85, 85, 0.3)', color: 'rgba(255,255,255,0.8)' }}
                      onClick={() => handleReportSubmit(option)}
                      disabled={isReporting}
                    >
                      {option}
                    </button>
                  ))}
                </div>

                <label>Or describe the issue (Optional)</label>
                <textarea 
                  className="profile-textarea" 
                  rows="3" 
                  placeholder="Provide additional details..."
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  style={{ width: '100%', marginTop: '10px' }}
                />
              </div>
            </div>
            <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '15px' }}>
              <button className="btn-secondary" onClick={() => setIsReportModalOpen(false)} disabled={isReporting}>Cancel</button>
              <button className="btn-primary" onClick={() => handleReportSubmit()} disabled={isReporting || !reportReason.trim()} style={{ background: '#ff5555', color: 'white', border: 'none' }}>
                {isReporting ? 'Submitting...' : 'Submit Custom Report'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
