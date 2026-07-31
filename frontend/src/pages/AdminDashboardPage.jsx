import React, { useState, useEffect } from 'react';
import { Navbar } from '../components/Navbar';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../api/client';
import { API_URL } from '../config';
import { 
  Users, Server, Code, Trophy, 
  Activity, ShieldAlert, Settings, LayoutDashboard,
  Eye, Lock, Trash2, Edit, AlertTriangle, Play, RefreshCw,
  MessageSquare, Star
} from 'lucide-react';
import '../styles/admin.css';

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { isAdmin, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // Real data states
  const [statsData, setStatsData] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [problemList, setProblemList] = useState([]);
  const [users, setUsers] = useState([]);
  const [feedbackList, setFeedbackList] = useState([]);
  
  // Announcement states
  const [announcementText, setAnnouncementText] = useState('');
  const [announcementSearch, setAnnouncementSearch] = useState('');
  const [selectedAnnouncementUsers, setSelectedAnnouncementUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [sendingAnnouncement, setSendingAnnouncement] = useState(false);
  const [announcementUsersInitialized, setAnnouncementUsersInitialized] = useState(false);
  const [activityLog, setActivityLog] = useState([
    { icon: <Activity size={16} />, class: 'updated', text: 'System initialized and connected to server.', time: 'just now' }
  ]);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate('/home');
    }
  }, [isAdmin, authLoading, navigate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [s, r, p, u, f] = await Promise.all([
        api.request("/api/admin/stats"),
        api.request("/api/admin/rooms"),
        api.request("/api/admin/problems"),
        api.request("/api/admin/users"),
        api.request("/api/admin/feedback")
      ]);
      setStatsData(s);
      setIsSuperAdmin(s.isSuperAdmin || false);
      setRooms(r);
      setProblemList(p);
      setUsers(u);
      if (!announcementUsersInitialized && u.length > 0) {
        setSelectedAnnouncementUsers(u.map(user => user.userId));
        setAnnouncementUsersInitialized(true);
      }
      setFeedbackList(f || []);
      setAuthError(false);
    } catch (err) {
      console.error("Failed to fetch admin data:", err);
      if (err.message.includes("403") || err.message.includes("401") || err.message.toLowerCase().includes("denied") || err.message.toLowerCase().includes("expired")) {
        setAuthError(true);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) fetchData();
  }, [isAdmin]);

  const handleRoomDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this room?")) return;
    try {
      await api.request(`/api/admin/rooms/${id}`, { method: 'DELETE' });
      setRooms(prev => prev.filter(r => r.id !== id));
      setActivityLog(prev => [{ icon: <Trash2 size={16} />, class: 'deleted', text: `Room <strong>${id}</strong> was removed manually.`, time: 'just now' }, ...prev]);
    } catch (err) { alert(err.message); }
  };

  const handleRoomLock = async (id) => {
    try {
      const res = await api.request(`/api/admin/rooms/${id}/lock`, { method: 'POST' });
      setRooms(prev => prev.map(r => r.id === id ? { ...r, isLocked: res.isLocked } : r));
      setActivityLog(prev => [{ icon: <Lock size={16} />, class: 'locked', text: `Room <strong>${id}</strong> was ${res.isLocked ? 'locked' : 'unlocked'}.`, time: 'just now' }, ...prev]);
    } catch (err) { alert(err.message); }
  };

  const handleProblemPublish = async (id) => {
    try {
      const res = await api.request(`/api/admin/problems/${id}/publish`, { method: 'POST' });
      setProblemList(prev => prev.map(p => p.id === id ? { ...p, published: res.published } : p));
    } catch (err) { alert(err.message); }
  };

  const [showProblemForm, setShowProblemForm] = useState(false);
  const [editingProblem, setEditingProblem] = useState(null);

  const handleSaveProblem = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const rawData = Object.fromEntries(formData.entries());
    
    // Process complex fields
    const data = {
      title: rawData.title,
      difficulty: rawData.difficulty,
      statement: rawData.statement,
      acceptance: parseInt(rawData.acceptance) || 0,
      tags: rawData.tags.split(',').map(t => t.trim()).filter(Boolean),
      constraints: rawData.constraints.split('\n').map(c => c.trim()).filter(Boolean),
      solutionAvailable: e.target.solutionAvailable.checked,
      hint: rawData.hint || "",
      tests: [
        { input: rawData.test1Input, output: rawData.test1Output },
        { input: rawData.test2Input, output: rawData.test2Output }
      ].filter(t => t.input || t.output)
    };
    
    try {
      if (editingProblem) {
        await api.request(`/api/admin/problems/${editingProblem.id}`, { method: 'PUT', body: JSON.stringify(data) });
      } else {
        await api.request(`/api/admin/problems`, { method: 'POST', body: JSON.stringify({ ...data, id: data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') }) });
      }
      setShowProblemForm(false);
      setEditingProblem(null);
      fetchData();
      setActivityLog(prev => [{ icon: <Code size={16} />, class: 'updated', text: `Problem <strong>${data.title}</strong> was ${editingProblem ? 'updated' : 'created'}.`, time: 'just now' }, ...prev]);
    } catch (err) { alert(err.message); }
  };

  const handleToggleRole = async (userId, currentRole) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    try {
      await api.request(`/api/admin/users/${userId}/role`, { method: 'POST', body: JSON.stringify({ role: newRole }) });
      setUsers(prev => prev.map(u => u.userId === userId ? { ...u, role: newRole } : u));
      setActivityLog(prev => [{ icon: <ShieldAlert size={16} />, class: 'updated', text: `User <strong>${userId}</strong> is now ${newRole}.`, time: 'just now' }, ...prev]);
    } catch (err) {
      alert("Failed to change role: " + err.message);
    }
  };

  if (authError) {
    return (
      <div className="admin-dashboard">
        <Navbar />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', padding: '20px' }}>
          <ShieldAlert size={64} style={{ color: '#ff5555', marginBottom: '20px' }} />
          <h2 style={{ marginBottom: '10px' }}>Access Denied</h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', textAlign: 'center', maxWidth: '400px' }}>
            You do not have permission to view the Admin Dashboard.
          </p>
        </div>
      </div>
    );
  }

  if (loading || !isAdmin) return <div className="admin-dashboard-container"><Navbar /><div style={{ padding: '100px', textAlign: 'center', color: 'white' }}>Verifying Administrator...</div></div>;

  const stats = statsData ? [
    { label: 'Total Users', value: statsData.totalUsers, trend: '+ 12.4% from yesterday', icon: <Users />, color: '#8BE9FD' },
    { label: 'Online Users', value: statsData.onlineUsers, trend: 'Live now', isLive: true, icon: <Activity />, color: '#50FA7B' },
    { label: 'Active Rooms', value: statsData.activeRooms, trend: '+ 8 from yesterday', icon: <Server />, color: '#FFB86C' },
    { label: 'Total Problems', value: statsData.totalProblems, trend: '+ 3 new this week', icon: <Code />, color: '#BD93F9' },
    { label: 'Most Solved', value: statsData.mostSolved, trend: 'Solved 3,421 times', icon: <Trophy />, color: '#FF79C6' },
  ] : [];



  const reports = feedbackList.filter(f => f.type === 'report').map(f => ({
    type: 'User Report',
    reportedName: f.reportedName || f.username || 'Unknown',
    reportedId: f.reportedId || 'No ID',
    reporterName: f.reporterName || 'Unknown',
    reporterId: f.reporterId || 'No ID',
    reason: f.message || 'No reason provided',
    time: f.timestamp ? new Date(f.timestamp).toLocaleString() : (f.createdAt ? new Date(f.createdAt).toLocaleString() : 'Just now'),
    id: f.id
  }));

  // The activityLog state is defined above, removing the static duplicate.

  return (
    <div className="admin-dashboard-container">
      <Navbar />
      
      <div className="admin-main-content">
        {/* Left Sidebar */}
        <div className="admin-sidebar">
          <div className="admin-sidebar-section">
            <div className="admin-sidebar-title">Management</div>
            <button className={`admin-nav-item ${activeTab === 'Dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('Dashboard')}>
              <LayoutDashboard size={18} /> Dashboard
            </button>
            <button className={`admin-nav-item ${activeTab === 'Problems' ? 'active' : ''}`} onClick={() => setActiveTab('Problems')}>
              <Code size={18} /> Problems
            </button>
            <button className={`admin-nav-item ${activeTab === 'Rooms' ? 'active' : ''}`} onClick={() => setActiveTab('Rooms')}>
              <Server size={18} /> Rooms
            </button>
            <button className={`admin-nav-item ${activeTab === 'Users' ? 'active' : ''}`} onClick={() => setActiveTab('Users')}>
              <Users size={18} /> Users
            </button>
            <button className={`admin-nav-item ${activeTab === 'Reports' ? 'active' : ''}`} onClick={() => setActiveTab('Reports')}>
              <ShieldAlert size={18} /> Reports & Abuse
            </button>
            <button className={`admin-nav-item ${activeTab === 'Feedback' ? 'active' : ''}`} onClick={() => setActiveTab('Feedback')}>
              <MessageSquare size={18} /> User Feedback
            </button>
          </div>

          <div className="admin-sidebar-section" style={{ marginTop: '10px' }}>
            <div className="admin-sidebar-title">Analytics</div>
            <button className="admin-nav-item">
              <Activity size={18} /> Analytics
            </button>
            <button className="admin-nav-item">
              <Play size={18} /> Activity Logs
            </button>
          </div>

          <div className="admin-sidebar-section" style={{ marginTop: '10px' }}>
            <div className="admin-sidebar-title">System</div>
            <button className={`admin-nav-item ${activeTab === 'Settings' ? 'active' : ''}`} onClick={() => setActiveTab('Settings')}>
              <Settings size={18} /> Settings
            </button>
            <button className={`admin-nav-item ${activeTab === 'Announcements' ? 'active' : ''}`} onClick={() => setActiveTab('Announcements')}>
              <AlertTriangle size={18} /> Announcements
            </button>
          </div>

          <div className="admin-sidebar-section" style={{ marginTop: '20px' }}>
            <div className="admin-sidebar-title" style={{ color: 'var(--primary-accent)' }}>⚡ Quick Actions</div>
            <button className="admin-nav-item" onClick={() => { setEditingProblem(null); setShowProblemForm(true); }} style={{ border: '1px solid rgba(139, 233, 253, 0.2)', color: '#8BE9FD', justifyContent: 'center' }}>
              + Add Problem
            </button>
            <button className="admin-nav-item" style={{ border: '1px solid rgba(255, 145, 0, 0.2)', color: 'var(--primary-accent)', justifyContent: 'center' }}>
              + Create Room
            </button>
          </div>
        </div>

        {/* Center Content */}
        <div className="admin-content-area" style={{ minWidth: 0, overflowX: 'hidden' }}>
          {/* PROBLEM FORM MODAL */}
          {showProblemForm && (
            <div className="admin-panel admin-modal-overlay">
              <div className="admin-modal-card" style={{ width: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
                <div className="admin-panel-header">
                  <h2>{editingProblem ? 'Edit Problem' : 'Add New Problem'}</h2>
                  <button onClick={() => setShowProblemForm(false)} className="admin-action-btn">✕</button>
                </div>
                <form onSubmit={handleSaveProblem} className="admin-settings-form">
                  <div className="admin-setting-row-flex">
                    <div className="admin-setting-group" style={{ flex: 2 }}>
                      <label className="admin-setting-label">Title</label>
                      <input name="title" className="admin-input" defaultValue={editingProblem?.title} placeholder="e.g. Two Sum" required />
                    </div>
                    <div className="admin-setting-group" style={{ flex: 1 }}>
                      <label className="admin-setting-label">Difficulty</label>
                      <select name="difficulty" className="admin-input" defaultValue={editingProblem?.difficulty || 'Easy'}>
                        <option>Easy</option><option>Medium</option><option>Hard</option>
                      </select>
                    </div>
                  </div>

                  <div className="admin-setting-group">
                    <label className="admin-setting-label">Statement</label>
                    <textarea name="statement" className="admin-input" style={{ minHeight: '80px' }} defaultValue={editingProblem?.statement} required />
                  </div>

                  <div className="admin-setting-group">
                    <label className="admin-setting-label">Constraints (One per line)</label>
                    <textarea name="constraints" className="admin-input" style={{ minHeight: '60px' }} defaultValue={editingProblem?.constraints?.join('\n')} placeholder="e.g. 1 <= n <= 10^5" />
                  </div>

                  <div className="admin-setting-row-flex">
                    <div className="admin-setting-group" style={{ flex: 1 }}>
                      <label className="admin-setting-label">Tags (comma separated)</label>
                      <input name="tags" className="admin-input" defaultValue={editingProblem?.tags?.join(', ')} placeholder="Arrays, Math" />
                    </div>
                    <div className="admin-setting-group" style={{ flex: 0.5 }}>
                      <label className="admin-setting-label">Acceptance %</label>
                      <input name="acceptance" type="number" className="admin-input" defaultValue={editingProblem?.acceptance || 50} />
                    </div>
                  </div>

                  <div className="admin-setting-group checkbox-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '10px' }}>
                    <input type="checkbox" name="solutionAvailable" id="solAvail" defaultChecked={editingProblem?.solutionAvailable} />
                    <label htmlFor="solAvail" className="admin-setting-label" style={{ marginBottom: 0 }}>Solution/Hint Available</label>
                  </div>

                  <div className="admin-setting-group">
                    <label className="admin-setting-label">Hint / Solution Text</label>
                    <textarea name="hint" className="admin-input" style={{ minHeight: '60px' }} defaultValue={editingProblem?.hint} placeholder="Explain the approach or provide the solution..." />
                  </div>

                  <div className="admin-test-cases-section">
                    <h3 style={{ fontSize: '0.9rem', color: 'var(--primary-accent)', margin: '15px 0 10px' }}>Test Cases (Judging)</h3>
                    <div className="admin-test-case-row">
                      <div className="admin-setting-group">
                        <label className="admin-setting-label">Test Case 1 Input</label>
                        <textarea name="test1Input" className="admin-input code-font" defaultValue={editingProblem?.tests?.[0]?.input} />
                      </div>
                      <div className="admin-setting-group">
                        <label className="admin-setting-label">Test Case 1 Output</label>
                        <textarea name="test1Output" className="admin-input code-font" defaultValue={editingProblem?.tests?.[0]?.output} />
                      </div>
                    </div>
                    <div className="admin-test-case-row">
                      <div className="admin-setting-group">
                        <label className="admin-setting-label">Test Case 2 Input</label>
                        <textarea name="test2Input" className="admin-input code-font" defaultValue={editingProblem?.tests?.[1]?.input} />
                      </div>
                      <div className="admin-setting-group">
                        <label className="admin-setting-label">Test Case 2 Output</label>
                        <textarea name="test2Output" className="admin-input code-font" defaultValue={editingProblem?.tests?.[1]?.output} />
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginTop: '20px', paddingBottom: '10px' }}>
                    <button type="submit" className="admin-button primary" style={{ flex: 1 }}>Save Problem</button>
                    <button type="button" onClick={() => setShowProblemForm(false)} className="admin-button" style={{ flex: 1 }}>Cancel</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {activeTab === 'Dashboard' && (
            <>
              <div className="admin-header">
                <div className="admin-welcome">
                  <h1>Welcome back, Admin! 👋</h1>
                  <p>Here's what's happening on Codefora today.</p>
                </div>
                <div className="admin-date-time">
                  <button className="admin-button" onClick={fetchData} style={{ marginRight: '15px' }}>
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
                  </button>
                  📅 09 May 2026, Friday <br /> 04:36 AM IST
                </div>
              </div>

          {/* Stats Row */}
          <div className="admin-stats-grid">
            {stats.map((stat, i) => (
              <div className="admin-stat-card" key={i} style={{ '--card-color': stat.color }}>
                <div className="admin-stat-header">
                  <div className="admin-stat-icon">
                    {stat.icon}
                  </div>
                  {stat.label}
                </div>
                <div className="admin-stat-value">{stat.value}</div>
                <div className={`admin-stat-trend ${stat.isLive ? 'positive' : ''}`}>
                  {stat.isLive && <span className="live-dot" style={{ display: 'inline-block', marginRight: '4px' }}></span>}
                  {stat.trend}
                </div>
              </div>
            ))}
          </div>
          </>
          )}

          {/* Middle Row Panels (Rooms & Problems) */}
          {(activeTab === 'Dashboard' || activeTab === 'Rooms' || activeTab === 'Problems') && (
            <div className={activeTab === 'Dashboard' ? "admin-panels-grid" : ""} style={{ display: activeTab === 'Dashboard' ? 'grid' : 'block' }}>
              
              {(activeTab === 'Dashboard' || activeTab === 'Rooms') && (
                <div className="admin-panel" style={activeTab === 'Rooms' ? { flex: 1, minHeight: '600px' } : {}}>
                  <div className="admin-panel-header">
                    <h2>{activeTab === 'Rooms' ? 'Room Management' : 'Recent Rooms'}</h2>
                    {activeTab === 'Dashboard' && <button className="admin-link-button" onClick={() => setActiveTab('Rooms')}>View All</button>}
                  </div>
                  <div className="admin-table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Room ID</th>
                          <th>Room Name</th>
                          <th>Host</th>
                          <th>Users</th>
                          <th>Created At</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rooms.slice(0, activeTab === 'Dashboard' ? 5 : rooms.length).map(room => (
                          <tr key={room.id}>
                            <td style={{ color: '#8BE9FD' }}>{room.id}</td>
                            <td>{room.name}</td>
                            <td>{room.host}</td>
                            <td>{room.users}</td>
                            <td>{room.created}</td>
                            <td>
                              <div className="admin-table-actions">
                                <button 
                                  className={`admin-action-btn ${room.isLocked ? 'warning' : ''}`} 
                                  title={room.isLocked ? "Unlock Room" : "Lock Room"}
                                  onClick={() => handleRoomLock(room.id)}
                                >
                                  <Lock size={14} />
                                </button>
                                <button className="admin-action-btn danger" title="Delete Room" onClick={() => handleRoomDelete(room.id)}><Trash2 size={14} /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {rooms.length === 0 && <tr><td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>No active rooms found.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {(activeTab === 'Dashboard' || activeTab === 'Problems') && (
                <div className="admin-panel" style={activeTab === 'Problems' ? { flex: 1, minHeight: '600px' } : {}}>
                  <div className="admin-panel-header">
                    <h2>{activeTab === 'Problems' ? 'Problems Management' : 'Problems Overview'}</h2>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button className="admin-link-button" onClick={() => { setEditingProblem(null); setShowProblemForm(true); }}>+ Add New</button>
                      {activeTab === 'Dashboard' && <button className="admin-link-button" onClick={() => setActiveTab('Problems')}>View All</button>}
                    </div>
                  </div>
                  <div className="admin-table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Problem</th>
                          <th>Difficulty</th>
                          <th>Acceptance</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {problemList.slice(0, activeTab === 'Dashboard' ? 5 : problemList.length).map(prob => (
                          <tr key={prob.id}>
                            <td>{prob.title}</td>
                            <td><span className={`status-badge ${prob.difficulty.toLowerCase()}`}>{prob.difficulty}</span></td>
                            <td>{prob.acceptance}%</td>
                            <td>
                              <span className={`status-badge ${prob.published ? 'published' : 'offline'}`}>
                                {prob.published ? 'Published' : 'Draft'}
                              </span>
                            </td>
                            <td>
                              <div className="admin-table-actions">
                                <button 
                                  className="admin-action-btn" 
                                  title="Edit Problem"
                                  onClick={() => { setEditingProblem(prob); setShowProblemForm(true); }}
                                >
                                  <Edit size={14} />
                                </button>
                                <button 
                                  className={`admin-action-btn ${prob.published ? 'warning' : 'success'}`} 
                                  title={prob.published ? "Unpublish" : "Publish"}
                                  onClick={() => handleProblemPublish(prob.id)}
                                >
                                  <Play size={14} />
                                </button>
                                <button className="admin-action-btn danger" title="Delete Problem" onClick={() => {
                                  if (window.confirm("Delete problem?")) {
                                    api.request(`/api/admin/problems/${prob.id}`, { method: 'DELETE' })
                                      .then(() => fetchData())
                                      .catch(err => alert("Delete failed: " + err.message));
                                  }
                                }}><Trash2 size={14} /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Feedback Panel */}
          {activeTab === 'Feedback' && (
            <div className="admin-panel" style={{ flex: 1, minHeight: '600px' }}>
              <div className="admin-panel-header">
                <h2>User Feedback & Ratings</h2>
                <button className="admin-button" onClick={fetchData}>
                  <RefreshCw size={14} /> Refresh
                </button>
              </div>
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Rating</th>
                      <th>Feedback / Message</th>
                      <th>Type</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feedbackList.map((f) => (
                      <tr key={f.id}>
                        <td style={{ fontWeight: 600 }}>{f.username}</td>
                        <td>
                          <div style={{ display: 'flex', color: '#FFD700', gap: '2px' }}>
                            {[1, 2, 3, 4, 5].map(star => (
                              <Star key={star} size={12} fill={star <= f.rating ? 'currentColor' : 'none'} opacity={star <= f.rating ? 1 : 0.2} />
                            ))}
                          </div>
                        </td>
                        <td style={{ maxWidth: '400px', whiteSpace: 'normal', color: '#aaa', fontSize: '0.85rem' }}>
                          {f.message || <span style={{ fontStyle: 'italic', opacity: 0.3 }}>No text provided</span>}
                        </td>
                        <td>
                          <span className={`status-badge ${f.type === 'problem_solve' ? 'success' : f.type === 'room_leave' ? 'warning' : 'offline'}`} style={{ fontSize: '0.65rem' }}>
                            {f.type.replace('_', ' ')}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.75rem', opacity: 0.5 }}>{new Date(f.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                    {feedbackList.length === 0 && (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: '#555' }}>
                          No feedback received yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Announcements Tab */}
          {activeTab === 'Announcements' && (
            <div className="admin-panel" style={{ minHeight: '600px', display: 'flex', flexDirection: 'column' }}>
              <div className="admin-panel-header">
                <h2>Send Announcement</h2>
              </div>
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
                <div className="admin-setting-group">
                  <label className="admin-setting-label">Message (Plain Text)</label>
                  <textarea 
                    className="admin-input" 
                    style={{ minHeight: '120px' }} 
                    placeholder="Type your announcement here..."
                    value={announcementText}
                    onChange={e => setAnnouncementText(e.target.value)}
                  />
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="admin-setting-label" style={{ margin: 0 }}>Select Recipients</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input 
                      type="text" 
                      className="admin-input" 
                      placeholder="Search by ID or Name..." 
                      value={announcementSearch}
                      onChange={e => setAnnouncementSearch(e.target.value)}
                      style={{ padding: '6px 12px', minWidth: '250px' }}
                    />
                    <button 
                      className="btn-secondary" 
                      onClick={() => {
                        if (selectedAnnouncementUsers.length === users.length) setSelectedAnnouncementUsers([]);
                        else setSelectedAnnouncementUsers(users.map(u => u.userId));
                      }}
                      style={{ padding: '6px 12px' }}
                    >
                      {selectedAnnouncementUsers.length === users.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                </div>

                <div className="admin-table-container" style={{ flex: 1, border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th style={{ width: '50px' }}>
                          <input 
                            type="checkbox" 
                            checked={selectedAnnouncementUsers.length === users.length && users.length > 0}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedAnnouncementUsers(users.map(u => u.userId));
                              else setSelectedAnnouncementUsers([]);
                            }}
                          />
                        </th>
                        <th>User</th>
                        <th>USER ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.filter(u => !announcementSearch || (u.friendCode && u.friendCode.includes(announcementSearch)) || (u.name && u.name.toLowerCase().includes(announcementSearch.toLowerCase()))).map(u => (
                        <tr key={u.userId} onClick={() => {
                          setSelectedAnnouncementUsers(prev => 
                            prev.includes(u.userId) ? prev.filter(id => id !== u.userId) : [...prev, u.userId]
                          );
                        }} style={{ cursor: 'pointer' }}>
                          <td>
                            <input 
                              type="checkbox" 
                              checked={selectedAnnouncementUsers.includes(u.userId)}
                              onChange={() => {}} // handled by tr click
                            />
                          </td>
                          <td style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {u.photoURL ? (
                              <img src={u.photoURL} alt={u.name} className="user-avatar-sm" style={{ objectFit: 'cover' }} />
                            ) : u.emotionId ? (
                              <img src={`${API_URL}/api/emotions/${u.emotionId}/image`} alt={u.name} className="user-avatar-sm" style={{ objectFit: 'cover', background: 'rgba(255,255,255,0.1)', padding: '2px' }} />
                            ) : (
                              <span className="user-avatar-sm">{u.name ? u.name[0].toUpperCase() : '?'}</span>
                            )}
                            {u.name}
                          </td>
                          <td style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>{u.friendCode || u.userId}</td>
                        </tr>
                      ))}
                      {users.length === 0 && <tr><td colSpan="3" style={{ textAlign: 'center', padding: '20px' }}>No users found</td></tr>}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                  <button 
                    className="btn-primary" 
                    onClick={async () => {
                      if (!announcementText.trim()) return alert("Enter a message");
                      if (selectedAnnouncementUsers.length === 0) return alert("Select at least one user");
                      try {
                        setSendingAnnouncement(true);
                        await api.request("/api/admin/announcements", {
                          method: 'POST',
                          body: JSON.stringify({ message: announcementText, userIds: selectedAnnouncementUsers })
                        });
                        alert(`Successfully sent to ${selectedAnnouncementUsers.length} users!`);
                        setAnnouncementText('');
                      } catch (err) {
                        alert(err.message);
                      } finally {
                        setSendingAnnouncement(false);
                      }
                    }}
                    disabled={sendingAnnouncement}
                  >
                    {sendingAnnouncement ? 'Sending...' : 'Send Announcement'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Row Panels (Users, Reports, Settings) */}
          {(activeTab === 'Dashboard' || activeTab === 'Users' || activeTab === 'Reports' || activeTab === 'Settings') && (
            <div className={activeTab === 'Dashboard' ? "admin-panels-grid" : ""} style={{ display: activeTab === 'Dashboard' ? 'grid' : 'block', gridTemplateColumns: '1fr 1fr 1fr' }}>
              
              {(activeTab === 'Dashboard' || activeTab === 'Users') && (
                <div className="admin-panel" style={activeTab === 'Users' ? { flex: 1, minHeight: '600px' } : {}}>
                  <div className="admin-panel-header">
                    <h2>{activeTab === 'Users' ? 'User Management' : 'Recent Users'}</h2>
                    {activeTab === 'Users' && (
                      <input 
                        type="text" 
                        placeholder="Search by ID, USER ID, or Name..." 
                        className="admin-input" 
                        style={{ padding: '6px 12px', minWidth: '300px', marginLeft: 'auto', marginRight: '15px' }}
                        value={userSearch}
                        onChange={e => setUserSearch(e.target.value)}
                      />
                    )}
                    {activeTab === 'Dashboard' && <button className="admin-link-button" onClick={() => setActiveTab('Users')}>View All</button>}
                  </div>
                  <div className="admin-table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>User</th>
                          <th>USER ID</th>
                          <th>Rating</th>
                          <th>Solved</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const filtered = users.filter(u => !userSearch || 
                            (u.friendCode && u.friendCode.includes(userSearch)) || 
                            (u.name && u.name.toLowerCase().includes(userSearch.toLowerCase())) ||
                            (u.userId && u.userId.includes(userSearch))
                          );
                          
                          const admins = filtered.filter(u => u.role === 'admin' || u.email === 'ganeshvanamala16@gmail.com');
                          const regulars = filtered.filter(u => u.role !== 'admin' && u.email !== 'ganeshvanamala16@gmail.com');
                          
                          const displayAdmins = activeTab === 'Dashboard' ? admins.slice(0, 5) : admins;
                          const displayRegulars = activeTab === 'Dashboard' ? regulars.slice(0, 5) : regulars;
                          
                          const renderUserRow = (u) => (
                            <tr key={u.userId}>
                              <td style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {u.photoURL ? (
                                  <img src={u.photoURL} alt={u.name} className="user-avatar-sm" style={{ objectFit: 'cover' }} />
                                ) : u.emotionId ? (
                                  <img src={`${API_URL}/api/emotions/${u.emotionId}/image`} alt={u.name} className="user-avatar-sm" style={{ objectFit: 'cover', background: 'rgba(255,255,255,0.1)', padding: '2px' }} />
                                ) : (
                                  <span className="user-avatar-sm">{u.name ? u.name[0].toUpperCase() : '?'}</span>
                                )}
                                {u.name}
                              </td>
                              <td style={{ fontFamily: 'monospace', color: 'var(--primary-accent)' }}>
                                {u.friendCode || 'N/A'}
                              </td>
                              <td>{u.rating}</td>
                              <td>{u.solved}</td>
                              <td><span className={`status-badge ${u.status.toLowerCase()}`}>{u.status}</span></td>
                              <td>
                                <div className="admin-table-actions">
                                  <button className="admin-action-btn" title="View Profile" onClick={() => window.open(`/profile/${u.friendCode || u.userId}`, '_blank')}><Eye size={12} /></button>
                                  {isSuperAdmin && u.email !== 'ganeshvanamala16@gmail.com' && (
                                    <button 
                                      className={`admin-action-btn ${u.role === 'admin' ? 'danger' : 'warning'}`} 
                                      title={u.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                                      onClick={() => handleToggleRole(u.userId, u.role)}
                                    >
                                      <ShieldAlert size={12} />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );

                          return (
                            <>
                              {displayAdmins.length > 0 && (
                                <>
                                  <tr className="admin-table-section-header">
                                    <td colSpan="6" style={{ background: 'rgba(255, 255, 255, 0.05)', fontWeight: 'bold', color: 'var(--primary-accent)', padding: '8px 12px' }}>Administrators</td>
                                  </tr>
                                  {displayAdmins.map(renderUserRow)}
                                </>
                              )}
                              {displayRegulars.length > 0 && (
                                <>
                                  <tr className="admin-table-section-header">
                                    <td colSpan="6" style={{ background: 'rgba(255, 255, 255, 0.02)', fontWeight: 'bold', color: 'rgba(255,255,255,0.6)', padding: '8px 12px' }}>Regular Users</td>
                                  </tr>
                                  {displayRegulars.map(renderUserRow)}
                                </>
                              )}
                            </>
                          );
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {(activeTab === 'Dashboard' || activeTab === 'Reports') && (
                <div className="admin-panel" style={activeTab === 'Reports' ? { flex: 1, minHeight: '600px' } : {}}>
                  <div className="admin-panel-header">
                    <h2>Reports & Abuse</h2>
                    {activeTab === 'Dashboard' && <button className="admin-link-button" onClick={() => setActiveTab('Reports')}>View All</button>}
                  </div>
                  <div className="admin-table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Type</th>
                          <th>Reported User</th>
                          <th>Reported By</th>
                          <th>Reason</th>
                          <th>Time</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reports.map((r, i) => (
                          <tr key={r.id || i}>
                            <td style={{ color: '#FF5555' }}>{r.type}</td>
                            <td>
                              <div>{r.reportedName}</div>
                              <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                                {users.find(u => u.userId === r.reportedId)?.friendCode || r.reportedId}
                              </div>
                            </td>
                            <td>
                              <div>{r.reporterName}</div>
                              <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                                {users.find(u => u.userId === r.reporterId)?.friendCode || r.reporterId}
                              </div>
                            </td>
                            <td title={r.reason}>{r.reason.length > 30 ? r.reason.substring(0, 30) + "..." : r.reason}</td>
                            <td>{r.time}</td>
                            <td>
                              <div className="admin-table-actions">
                                <button className="admin-action-btn" title="Ignore"><Eye size={12} /></button>
                                <button className="admin-action-btn warning" title="Warn"><AlertTriangle size={12} /></button>
                                <button className="admin-action-btn danger" title="Ban"><ShieldAlert size={12} /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {activeTab === 'Reports' && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginTop: '10px' }}>
                      <span>Showing {reports.length} reports</span>
                      <button className="admin-link-button" style={{ color: 'var(--primary-accent)' }}>Load More</button>
                    </div>
                  )}
                </div>
              )}

              {(activeTab === 'Dashboard' || activeTab === 'Settings') && (
                <div className="admin-panel" style={activeTab === 'Settings' ? { flex: 1, minHeight: '600px' } : {}}>
                  <div className="admin-panel-header">
                    <h2>System Settings</h2>
                  </div>
                  
                  <div className="admin-settings-form">
                    <div className="admin-setting-group">
                      <span className="admin-setting-label">Homepage Announcement</span>
                      <div className="admin-setting-input-wrapper">
                        <input type="text" className="admin-input" defaultValue="🔥 Weekly challenge is live! Solve more, rank higher!" />
                        <button className="admin-button primary">Update</button>
                      </div>
                    </div>

                    <div className="admin-setting-group">
                      <div className="admin-setting-toggle">
                        <div className="toggle-info">
                          <span className="admin-setting-label">Maintenance Mode</span>
                          <p>When enabled, users won't be able to access the platform.</p>
                        </div>
                        <label className="switch">
                          <input type="checkbox" checked={maintenanceMode} onChange={() => setMaintenanceMode(!maintenanceMode)} />
                          <span className="slider"></span>
                        </label>
                      </div>
                    </div>

                    <div className="admin-setting-group">
                      <span className="admin-setting-label">Featured Problem</span>
                      <div className="admin-setting-input-wrapper">
                        <select className="admin-input" defaultValue="Dynamic Maze Escape">
                          <option value="Dynamic Maze Escape">Dynamic Maze Escape</option>
                          <option value="Two Sum">Two Sum</option>
                          <option value="Neon Array Rotation">Neon Array Rotation</option>
                        </select>
                        <button className="admin-button">Update</button>
                      </div>
                    </div>
                  </div>
                  
                  {activeTab === 'Dashboard' && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginTop: 'auto' }}>
                      <button className="admin-link-button" style={{ color: 'var(--primary-accent)' }} onClick={() => setActiveTab('Settings')}>View All Settings →</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="admin-right-sidebar">
          <div className="live-activity-panel">
            <div className="live-activity-header">
              <h2>Live Activity</h2>
              <div className="live-indicator">
                <span className="live-dot"></span> Live
              </div>
            </div>
            
            <div className="activity-list">
              {activityLog.map((log, i) => (
                <div className="activity-item" key={i}>
                  <div className={`activity-icon ${log.class}`}>
                    {log.icon}
                  </div>
                  <div className="activity-details">
                    <div className="activity-text" dangerouslySetInnerHTML={{ __html: log.text }} />
                    <div className="activity-time">{log.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
