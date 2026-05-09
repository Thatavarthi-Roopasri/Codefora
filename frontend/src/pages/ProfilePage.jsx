import { Save, UserCircle2, X, Edit3, Code, Users, Flame, Trophy, Calendar, ChevronDown, Activity, Award, CheckCircle2, UserPlus, Image as ImageIcon, Shield } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "../components/Navbar";

import EmotionPicker from "../components/EmotionPicker";
import { useAuth } from "../hooks/useAuth";
import { API_URL } from "../config";
import { getProfile, saveProfile } from "../api/client";
import bannerImage from "../../assets/scene1.jpeg";

export function ProfilePage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [profileData, setProfileData] = useState({});
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [selectedEmotion, setSelectedEmotion] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");
  const [showEmotionModal, setShowEmotionModal] = useState(false);

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

      setLoadingProfile(false);
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
      preferredTheme: "dark"
    };

    const ok = await saveProfile(user.uid, nextProfile).then(() => true).catch(() => false);
    if (ok) setProfileData(nextProfile);
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
          <button onClick={() => navigate("/home")} className="button primary">
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
        <aside className="profile-v2-sidebar">
          <div className="profile-v2-card main-profile-card">
            <button className="profile-edit-btn" title="Edit Profile"><Edit3 size={14} /></button>
            
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
              <Award size={12} /> Specialist
            </div>
            <p className="profile-email">{user.email}</p>

            <div className="profile-stats-grid">
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
          <div className="profile-v2-card settings-card">
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
                <div className="input-group">
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

                <div className="input-group">
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
                <div className="input-group">
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
            {/* COMPETITIVE STATS */}
            <div className="profile-v2-card widget-card">
              <div className="card-title">
                <Activity size={16} className="text-orange" /> COMPETITIVE STATS
              </div>
              <div className="stats-mini-grid">
                <div className="mini-stat">
                  <Shield size={16} className="text-blue" />
                  <strong>1200</strong>
                  <span>Current Rating</span>
                </div>
                <div className="mini-stat">
                  <Award size={16} className="text-orange" />
                  <strong>1200</strong>
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
                  <span>Participate in contests to build your rating graph.</span>
                </div>
              </div>
            </div>

            {/* RECENT ACTIVITY */}
            <div className="profile-v2-card widget-card">
              <div className="card-header-flex">
                <div className="card-title">
                  <Flame size={16} className="text-orange" /> RECENT ACTIVITY
                </div>
                <button className="view-all-btn">View All</button>
              </div>
              
              <div className="activity-timeline">
                <div className="activity-item">
                  <div className="activity-icon bg-green"><CheckCircle2 size={12} /></div>
                  <div className="activity-content">
                    <strong>Solved Two Sum</strong>
                    <span>Easy • Practice</span>
                  </div>
                  <div className="activity-time">2m ago</div>
                </div>
                <div className="activity-item">
                  <div className="activity-icon bg-blue"><UserPlus size={12} /></div>
                  <div className="activity-content">
                    <strong>Joined Room CF-91</strong>
                    <span>with 3 others</span>
                  </div>
                  <div className="activity-time">15m ago</div>
                </div>
                <div className="activity-item">
                  <div className="activity-icon bg-orange"><Award size={12} /></div>
                  <div className="activity-content">
                    <strong>Reached Rating 1200</strong>
                    <span>Keep pushing! 🚀</span>
                  </div>
                  <div className="activity-time">1h ago</div>
                </div>
                <div className="activity-item">
                  <div className="activity-icon bg-purple"><Code size={12} /></div>
                  <div className="activity-content">
                    <strong>Updated Bio</strong>
                    <span>Profile updated successfully</span>
                  </div>
                  <div className="activity-time">2h ago</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

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
            <EmotionPicker selectedEmotion={selectedEmotion} onSelectEmotion={setSelectedEmotion} />
            <div className="profile-modal-footer">
              <button type="button" className="button primary" onClick={() => setShowEmotionModal(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
