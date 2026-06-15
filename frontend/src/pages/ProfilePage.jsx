import { Save, UserCircle2, X, Edit3, Code, Users, Flame, Trophy, Calendar, ChevronDown, Activity, Award, CheckCircle2, UserPlus, Image as ImageIcon, Shield, Folder, ExternalLink, Clock, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "../components/Navbar";

import EmotionPicker from "../components/EmotionPicker";
import { useAuth } from "../hooks/useAuth";
import { API_URL } from "../config";
import { getProfile, saveProfile, api } from "../api/client";
import bannerImage from "../../assets/scene1.jpeg";
import { trackEvent } from "../lib/analytics";

export function ProfilePage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [profileData, setProfileData] = useState({});
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [selectedEmotion, setSelectedEmotion] = useState("");
  const [selectedCommunity, setSelectedCommunity] = useState("sider");
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");
  const [showEmotionModal, setShowEmotionModal] = useState(false);
  const [showAllActivities, setShowAllActivities] = useState(false);
  const [works, setWorks] = useState([]);
  const [loadingWorks, setLoadingWorks] = useState(false);

  useEffect(() => {
    if (!user?.uid) {
      setLoadingProfile(false);
      return;
    }

    let active = true;

    async function loadProfile() {
      setLoadingProfile(true);
      const profile = await getProfile(user.uid).catch(() => ({}));
      if (!active) return;

      setProfileData(profile || {});
      setDisplayName(profile.displayName || user.displayName || "");
      setBio(profile.bio || "Building consistency one problem at a time.");
      setSelectedEmotion(profile.emotionId || "");
      setSelectedCommunity(profile.community || "sider");

      setLoadingProfile(false);
      
      // Load works
      setLoadingWorks(true);
      const userWorks = await api.getWorks(user.uid).catch(() => []);
      setWorks(userWorks || []);
      setLoadingWorks(false);
    }

    if (user?.uid) {
      trackEvent("profile_visit", { user_id: user.uid });
    }

    loadProfile();
    return () => {
      active = false;
    };
  }, [user?.uid, user?.displayName]);

  const headerName = useMemo(() => displayName || user?.displayName || "Anonymous Developer", [displayName, user?.displayName]);
  const emotionImage = selectedEmotion ? `${API_URL}/api/emotions/${selectedEmotion}/image` : "";
  const stats = profileData.stats || {};
  const problemsSolved = Number.isFinite(stats.problemsSolved) ? stats.problemsSolved : 0;
  const roomsJoined = Number.isFinite(stats.roomsJoined) ? stats.roomsJoined : 0;
  const currentStreak = Number.isFinite(stats.currentStreak) ? stats.currentStreak : 0;
  const globalRank = stats.globalRank || "-";

  async function handleSaveChanges() {
    if (!user?.uid) return;

    setIsSaving(true);
    setSaveStatus("");

    const nextProfile = {
      ...profileData,
      displayName: displayName.trim(),
      bio: bio.trim(),
      emotionId: selectedEmotion,
      community: selectedCommunity,
      preferredTheme: "dark",
      activities: [{ type: "profile_update", text: "Updated Profile", subtext: "Profile updated successfully", timestamp: Date.now() }, ...(profileData.activities || []).slice(0, 9)]
    };

    const ok = await saveProfile(user.uid, nextProfile).then(() => true).catch(() => false);
    if (ok) {
      setProfileData(nextProfile);
      document.documentElement.dataset.community = selectedCommunity;
      localStorage.setItem("codefora_community", selectedCommunity);
    }
    setIsSaving(false);
    setSaveStatus(ok ? "Saved." : "Could not save profile.");
    setTimeout(() => setSaveStatus(""), 3000);
  }

  if (loading || loadingProfile) {
    return (
      <main className="page-shell">
        <div className="loading-state">
          <div className="spinner" />
          <span>Loading profile...</span>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="page-shell">
        <div className="auth-required">
          <UserCircle2 size={48} />
          <h2>Authentication Required</h2>
          <p>Please sign in to view your profile</p>
          <button onClick={() => {
            trackEvent("nav_home_click", { from: "profile_auth_required" });
            navigate("/home");
          }} className="button primary">
            Go to Home
          </button>
        </div>
      </main>
    );
  }

  const joinDate = new Date(user.metadata?.creationTime || Date.now()).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

  return (
    <main className="profile-v2-shell">
      <Navbar />

      <div className="profile-v2-container">
        {/* LEFT SIDEBAR */}
        <aside className="profile-v2-sidebar tour-profile-card">
          <div className="profile-v2-card main-profile-card">
            
            <div className="profile-avatar-container">
              {selectedEmotion ? (
                <img src={emotionImage} alt="Emotion" className="profile-emotion-avatar" />
              ) : (
                <div className="default-codefora-avatar">
                  <span className="bracket">{'{'}</span>
                  <span className="bracket">{'}'}</span>
                </div>
              )}
            </div>

            <h1 className="profile-name">{headerName}</h1>
            <div className="profile-role">
              <span style={{ fontSize: "10px", fontFamily: "monospace", color: "var(--text-muted)", background: "rgba(255,255,255,0.05)", padding: "2px 6px", borderRadius: "4px", border: "1px solid rgba(255,255,255,0.1)" }}>
                ID: {(() => {
                  const uid = user?.uid;
                  if (!uid) return "Unknown";
                  let hash = 0;
                  for (let i = 0; i < uid.length; i++) hash = Math.imul(31, hash) + uid.charCodeAt(i) | 0;
                  return Math.abs(hash).toString().padStart(8, '0').slice(0, 8);
                })()}
              </span>
            </div>
            <div className="profile-role" style={{ marginTop: "6px" }}>
              <Award size={12} /> Specialist
            </div>
            <p className="profile-email">{user.email}</p>

            <div className="profile-stats-grid tour-profile-stats">
              <div className="stat-box">
                <Code className="stat-icon blue" size={18} />
                <div className="stat-info">
                  <strong>{problemsSolved}</strong>
                  <span>Problems Solved</span>
                </div>
              </div>
              <div className="stat-box">
                <Users className="stat-icon orange" size={18} />
                <div className="stat-info">
                  <strong>{roomsJoined}</strong>
                  <span>Rooms Joined</span>
                </div>
              </div>
              <div className="stat-box">
                <Flame className="stat-icon blue" size={18} />
                <div className="stat-info">
                  <strong>{currentStreak}</strong>
                  <span>Current Streak</span>
                </div>
              </div>
              <div className="stat-box">
                <Trophy className="stat-icon orange" size={18} />
                <div className="stat-info">
                  <strong>{globalRank}</strong>
                  <span>Global Rank</span>
                </div>
              </div>
            </div>

            <div className="profile-quote-box">
              <span className="quote-mark">"</span>
              <p>{bio || "Building consistency one problem at a time."}</p>
              <span className="quote-mark right">"</span>
            </div>

            <div className="profile-member-since">
              <span>Member since</span>
              <div><Calendar size={12} /> {joinDate}</div>
            </div>
          </div>

          {/* COMPETITIVE STATS MOVED TO SIDEBAR */}
          <div className="profile-v2-card widget-card" style={{ marginTop: '16px' }}>
            <div className="card-title">
              <Activity size={16} className="text-orange" /> COMPETITIVE STATS
            </div>
            <div className="stats-mini-grid">
              <div className="mini-stat">
                <Shield size={16} className="text-blue" />
                <strong>N/A</strong>
                <span>Current Rating</span>
              </div>
              <div className="mini-stat">
                <Award size={16} className="text-orange" />
                <strong>N/A</strong>
                <span>Max Rating</span>
              </div>
              <div className="mini-stat">
                <Users size={16} className="text-blue" />
                <strong>0</strong>
                <span>Rooms Hosted</span>
              </div>
              <div className="mini-stat">
                <Code size={16} className="text-orange" />
                <strong>0</strong>
                <span>Problems Solved</span>
              </div>
            </div>
            
            <div className="chart-placeholder">
              <div className="chart-empty-state">
                <p>No competitive info available yet.</p>
                <span style={{ fontSize: '10px' }}>Participate in contests to build your rating graph.</span>
              </div>
            </div>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <div className="profile-v2-main">
          {/* BANNER */}
          <div className="profile-v2-banner" style={{ backgroundImage: `url(${bannerImage})` }}>
            <div className="banner-overlay"></div>
            <div className="banner-content">
              <div className="banner-icon blue">( )</div>
              <div className="banner-text">
                <h2><span>Code.</span> Collaborate. <span>Climb.</span></h2>
                <p>Level up your skills. Build your legacy.</p>
              </div>
              <div className="banner-icon orange">{'{ }'}</div>
            </div>
          </div>

          {/* SETTINGS */}
          <div className="profile-v2-card settings-card tour-profile-settings">
            <div className="card-header-flex">
              <div className="card-title">
                <UserCircle2 size={16} /> PROFILE SETTINGS
              </div>
              <div className="save-actions">
                {saveStatus && <span className="save-status">{saveStatus}</span>}
                <button className="button-outline-orange" onClick={handleSaveChanges} disabled={isSaving}>
                  <Save size={14} /> {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>

            <div className="settings-grid">
              <div className="settings-col">
                <div className="input-group tour-profile-name">
                  <label>Display Name</label>
                  <div className="input-with-icon">
                    <input 
                      type="text" 
                      value={displayName} 
                      onChange={(e) => setDisplayName(e.target.value)} 
                      placeholder="Your name" 
                    />
                    <Edit3 size={14} className="input-icon" />
                  </div>
                </div>

                <div className="input-group tour-profile-bio">
                  <label>Bio</label>
                  <div className="textarea-wrapper">
                    <textarea 
                      value={bio} 
                      onChange={(e) => setBio(e.target.value)} 
                      maxLength={160}
                      placeholder="Tell others about yourself..." 
                    />
                    <span className="char-count">{bio.length}/160</span>
                  </div>
                </div>
              </div>

              <div className="settings-col">
                <div className="input-group tour-profile-community">
                  <label>Community</label>
                  <div className="community-selector-row">
                    <button 
                      type="button"
                      className={`community-btn sider ${selectedCommunity === 'sider' ? 'active' : ''}`}
                      onClick={() => setSelectedCommunity('sider')}
                    >
                      Sider
                    </button>
                    <button 
                      type="button"
                      className={`community-btn loop ${selectedCommunity === 'loop' ? 'active' : ''}`}
                      onClick={() => setSelectedCommunity('loop')}
                    >
                      Loop
                    </button>
                  </div>
                </div>

                <div className="input-group tour-profile-avatar">
                  <label>Avatar / Emotion</label>
                  <div className="avatar-setting-row">
                    <div className="avatar-preview-small">
                      {selectedEmotion ? (
                        <img src={emotionImage} alt="Emotion" />
                      ) : (
                        <div className="default-codefora-avatar small">
                          <span className="bracket">{'{'}</span>
                          <span className="bracket">{'}'}</span>
                        </div>
                      )}
                    </div>
                    <button className="button-dark" onClick={() => setShowEmotionModal(true)}>
                      <ImageIcon size={14} /> Change
                    </button>
                  </div>
                </div>

                <div className="input-group mt-4">
                  <label>Theme</label>
                  <div className="select-wrapper">
                    <select defaultValue="dark">
                      <option value="dark">Codefora Dark</option>
                      <option value="light" disabled>Codefora Light (Coming Soon)</option>
                    </select>
                    <div className="select-indicator"><div className="color-dot blue"></div> Codefora Dark</div>
                    <ChevronDown size={14} className="select-arrow" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* BOTTOM WIDGETS */}
          <div className="profile-v2-widgets">
            {/* MY WORKS SECTION */}
            <div className="profile-v2-card widget-card tour-profile-works" style={{ gridColumn: '1 / -1' }}>
              <div className="card-header-flex">
                <div className="card-title">
                  <Folder size={16} className="text-blue" /> MY SAVED WORKS
                </div>
                <button className="view-all-btn" onClick={() => navigate('/playground')}>Open Playground</button>
              </div>

              {loadingWorks ? (
                <div className="works-loading" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 10px' }} />
                  <span>Loading your works...</span>
                </div>
              ) : works.length === 0 ? (
                <div className="works-empty" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                  <Code size={32} style={{ marginBottom: '15px', opacity: 0.3 }} />
                  <p>You haven't saved any work yet.</p>
                  <button className="button-text-orange" onClick={() => navigate('/playground')}>Start a new project</button>
                </div>
              ) : (
                <div className="works-grid" style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
                  gap: '16px',
                  marginTop: '15px'
                }}>
                  {works.map(work => (
                    <div key={work.id} className="work-item-card" style={{ 
                      background: 'rgba(255,255,255,0.03)', 
                      border: '1px solid var(--glass-border)',
                      borderRadius: '12px',
                      padding: '16px',
                      transition: 'all 0.2s',
                      cursor: 'pointer',
                      position: 'relative',
                      overflow: 'hidden'
                    }} onClick={() => navigate('/playground', { state: { initialFiles: work.files } })}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <div style={{ 
                          padding: '4px 8px', 
                          borderRadius: '6px', 
                          fontSize: '10px', 
                          fontWeight: '800', 
                          textTransform: 'uppercase',
                          background: work.type === 'playground' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(var(--primary-rgb), 0.1)',
                          color: work.type === 'playground' ? '#3b82f6' : 'var(--primary-color)'
                        }}>
                          {work.type}
                        </div>
                        <ExternalLink size={14} style={{ color: 'var(--text-muted)' }} />
                      </div>
                      <h4 style={{ margin: '0 0 8px 0', fontSize: '1rem', color: 'var(--text-primary)' }}>{work.name}</h4>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
                        <Clock size={12} />
                        {new Date(work.createdAt).toLocaleDateString()}
                      </div>
                      <div style={{ 
                        marginTop: '12px', 
                        display: 'flex', 
                        gap: '6px', 
                        flexWrap: 'wrap' 
                      }}>
                        {work.files?.slice(0, 3).map(f => (
                          <span key={f.name} style={{ 
                            fontSize: '10px', 
                            padding: '2px 6px', 
                            background: 'rgba(255,255,255,0.05)', 
                            borderRadius: '4px',
                            border: '1px solid var(--glass-border)'
                          }}>{f.name}</span>
                        ))}
                        {work.files?.length > 3 && <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>+{work.files.length - 3}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* RECENT ACTIVITY */}
            <div className="profile-v2-card widget-card tour-profile-activity">
              <div className="card-header-flex">
                <div className="card-title">
                  <Flame size={16} className="text-orange" /> RECENT ACTIVITY
                </div>
                <button className="view-all-btn" onClick={() => setShowAllActivities(true)}>View All</button>
              </div>
              
              <div className="activity-timeline">
                {(!profileData.activities || profileData.activities.length === 0) ? (
                  <div className="activity-item">
                    <div className="activity-icon bg-orange"><Award size={12} /></div>
                    <div className="activity-content">
                      <strong>Account Created</strong>
                      <span>Welcome to Codefora! 🎉</span>
                    </div>
                    <div className="activity-time">Just now</div>
                  </div>
                ) : (
                  profileData.activities.slice(0, 2).map((activity, idx) => (
                    <div className="activity-item" key={idx}>
                      <div className={`activity-icon ${activity.type === 'room_join' ? 'bg-blue' : activity.type === 'problem_solve' ? 'bg-green' : 'bg-purple'}`}>
                        {activity.type === 'room_join' ? <Users size={12} /> : activity.type === 'problem_solve' ? <CheckCircle2 size={12} /> : <Code size={12} />}
                      </div>
                      <div className="activity-content">
                        <strong>{activity.text}</strong>
                        <span>{activity.subtext}</span>
                      </div>
                      <div className="activity-time">{new Date(activity.timestamp).toLocaleDateString()}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showAllActivities && (
        <div className="profile-modal-overlay" role="dialog" aria-modal="true" aria-label="All Activities">
          <div className="profile-modal-card" style={{ maxWidth: "500px", width: "90%", maxHeight: "80vh", display: "flex", flexDirection: "column" }}>
            <div className="profile-modal-header" style={{ marginBottom: "16px" }}>
              <h3 style={{ margin: 0, color: "#fff", fontSize: "1.1rem" }}>All Recent Activities</h3>
            </div>
            <div className="activity-timeline" style={{ flex: 1, overflowY: "auto", margin: "0 -18px", padding: "0 18px" }}>
              {profileData.activities.map((activity, idx) => (
                <div className="activity-item" key={idx}>
                  <div className={`activity-icon ${activity.type === 'room_join' ? 'bg-blue' : activity.type === 'problem_solve' ? 'bg-green' : 'bg-purple'}`}>
                    {activity.type === 'room_join' ? <Users size={12} /> : activity.type === 'problem_solve' ? <CheckCircle2 size={12} /> : <Code size={12} />}
                  </div>
                  <div className="activity-content">
                    <strong>{activity.text}</strong>
                    <span>{activity.subtext}</span>
                  </div>
                  <div className="activity-time">{new Date(activity.timestamp).toLocaleDateString()}</div>
                </div>
              ))}
            </div>
            <div className="profile-modal-footer" style={{ marginTop: "24px" }}>
              <button className="button" onClick={() => setShowAllActivities(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {showEmotionModal && (
        <div className="profile-modal-overlay" role="dialog" aria-modal="true" aria-label="Select emotion">
          <div className="profile-modal-card">
            <div className="profile-modal-header">
              <h3>Pick from Codefora Emotions</h3>
              <button
                type="button"
                className="profile-modal-close"
                aria-label="Close emotion modal"
                onClick={() => setShowEmotionModal(false)}
              >
                <X size={16} />
              </button>
            </div>
              <div style={{ flex: 1, overflowY: "auto", margin: "0 -18px", padding: "0 18px" }}>
                <EmotionPicker 
                  selectedEmotion={selectedEmotion} 
                  onSelectEmotion={setSelectedEmotion} 
                  category={selectedCommunity}
                />
              </div>
            <div className="profile-modal-footer">
              <button type="button" className="button primary" onClick={() => setShowEmotionModal(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`
        .community-selector-row {
          display: flex;
          gap: 12px;
          margin-top: 8px;
        }
        .community-btn {
          padding: 10px 24px;
          border-radius: 8px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s ease;
          border: 2px solid transparent;
          flex: 1;
        }
        .community-btn.sider {
          background: rgba(255, 122, 24, 0.1);
          color: #FF7A18;
          border-color: rgba(255, 122, 24, 0.3);
        }
        .community-btn.sider.active {
          background: #FF7A18;
          color: white;
          box-shadow: 0 0 15px rgba(255, 122, 24, 0.5);
          animation: orange-glow 2s infinite alternate;
        }
        .community-btn.loop {
          background: rgba(0, 229, 255, 0.1);
          color: #00E5FF;
          border-color: rgba(0, 229, 255, 0.3);
        }
        .community-btn.loop.active {
          background: #00E5FF;
          color: #000;
          box-shadow: 0 0 15px rgba(0, 229, 255, 0.5);
        }
        @keyframes orange-glow {
          from { box-shadow: 0 0 5px rgba(255, 122, 24, 0.4); }
          to { box-shadow: 0 0 20px rgba(255, 122, 24, 0.8); }
        }
      `}</style>
    </main>
  );
}
