import React, { useState, useEffect } from 'react';
import { Navbar } from '../components/Navbar';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../api/client';
import { API_URL } from '../config';
import { 
  Users, Server, Code, Trophy, 
  Activity, ShieldAlert, Settings, LayoutDashboard,
  Eye, Lock, Trash2, Edit, AlertTriangle, Play, RefreshCw
} from 'lucide-react';
import '../styles/admin.css';

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { isAdmin, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [loading, setLoading] = useState(true);

  // Real data states
  const [statsData, setStatsData] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [problemList, setProblemList] = useState([]);
  const [users, setUsers] = useState([]);
  const [feedbackList, setFeedbackList] = useState([]);
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
      setRooms(r);
      setProblemList(p);
      setUsers(u);
      setFeedbackList(f || []);
    } catch (err) {
      console.error("Failed to fetch admin data:", err);
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
    const data = Object.fromEntries(formData.entries());
    data.acceptance = parseInt(data.acceptance) || 0;
    data.tags = data.tags.split(',').map(t => t.trim());
    
    try {
      if (editingProblem) {
        await api.request(`/api/admin/problems/${editingProblem.id}`, { method: 'PUT', body: JSON.stringify(data) });
      } else {
        await api.request(`/api/admin/problems`, { method: 'POST', body: JSON.stringify({ ...data, id: data.title.toLowerCase().replace(/ /g, '-') }) });
      }
      setShowProblemForm(false);
      setEditingProblem(null);
      fetchData();
    } catch (err) { alert(err.message); }
  };

  if (authLoading || !isAdmin) return <div className="admin-dashboard-container"><Navbar /><div style={{ padding: '100px', textAlign: 'center', color: 'white' }}>Verifying Administrator...</div></div>;

  const stats = statsData ? [
    { label: 'Total Users', value: statsData.totalUsers, trend: '+ 12.4% from yesterday', icon: <Users />, color: '#8BE9FD' },
    { label: 'Online Users', value: statsData.onlineUsers, trend: 'Live now', isLive: true, icon: <Activity />, color: '#50FA7B' },
    { label: 'Active Rooms', value: statsData.activeRooms, trend: '+ 8 from yesterday', icon: <Server />, color: '#FFB86C' },
    { label: 'Total Problems', value: statsData.totalProblems, trend: '+ 3 new this week', icon: <Code />, color: '#BD93F9' },
    { label: 'Most Solved', value: statsData.mostSolved, trend: 'Solved 3,421 times', icon: <Trophy />, color: '#FF79C6' },
  ] : [];



  const reports = [
    { type: 'Toxic Bio', user: 'bad_user_01', reason: 'Inappropriate bio', time: '5m ago' },
    { type: 'Spam Room', user: 'spam_room_77', reason: 'Spamming links', time: '12m ago' },
    { type: 'Toxic Username', user: 'noob_king_$$', reason: 'Offensive name', time: '18m ago' },
    { type: 'Room Misuse', user: 'CF-90', reason: 'Rule violation', time: '21m ago' },
    { type: 'Toxic Bio', user: 'abusive_user', reason: 'Harassment', time: '25m ago' },
  ];

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
            <button className="admin-nav-item">
              <AlertTriangle size={18} /> Announcements
            </button>
          </div>

          <div className="admin-sidebar-section" style={{ marginTop: '20px' }}>
            <div className="admin-sidebar-title" style={{ color: '#FF9100' }}>⚡ Quick Actions</div>
            <button className="admin-nav-item" onClick={() => { setEditingProblem(null); setShowProblemForm(true); }} style={{ border: '1px solid rgba(139, 233, 253, 0.2)', color: '#8BE9FD', justifyContent: 'center' }}>
              + Add Problem
            </button>
            <button className="admin-nav-item" style={{ border: '1px solid rgba(255, 145, 0, 0.2)', color: '#FF9100', justifyContent: 'center' }}>
              + Create Room
            </button>
          </div>
        </div>

        {/* Center Content */}
        <div className="admin-content-area" style={{ minWidth: 0, overflowX: 'hidden' }}>
          {/* PROBLEM FORM MODAL */}
          {showProblemForm && (
            <div className="admin-panel" style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1000, width: '500px', background: '#111', boxShadow: '0 0 40px rgba(0,0,0,0.8)', border: '1px solid var(--primary-blue)' }}>
              <div className="admin-panel-header">
                <h2>{editingProblem ? 'Edit Problem' : 'Add New Problem'}</h2>
                <button onClick={() => setShowProblemForm(false)} className="admin-action-btn">✕</button>
              </div>
              <form onSubmit={handleSaveProblem} className="admin-settings-form">
                <div className="admin-setting-group">
                  <label className="admin-setting-label">Title</label>
                  <input name="title" className="admin-input" defaultValue={editingProblem?.title} required />
                </div>
                <div className="admin-setting-group">
                  <label className="admin-setting-label">Difficulty</label>
                  <select name="difficulty" className="admin-input" defaultValue={editingProblem?.difficulty || 'Easy'}>
                    <option>Easy</option><option>Medium</option><option>Hard</option>
                  </select>
                </div>
                <div className="admin-setting-group">
                  <label className="admin-setting-label">Statement</label>
                  <textarea name="statement" className="admin-input" style={{ minHeight: '100px' }} defaultValue={editingProblem?.statement} required />
                </div>
                <div className="admin-setting-group">
                  <label className="admin-setting-label">Tags (comma separated)</label>
                  <input name="tags" className="admin-input" defaultValue={editingProblem?.tags?.join(', ')} />
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button type="submit" className="admin-button primary" style={{ flex: 1 }}>Save Problem</button>
                  <button type="button" onClick={() => setShowProblemForm(false)} className="admin-button" style={{ flex: 1 }}>Cancel</button>
                </div>
              </form>
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
                                    api.request(`/api/admin/problems/${prob.id}`, { method: 'DELETE' }).then(() => fetchData());
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

          {/* Bottom Row Panels (Users, Reports, Settings) */}
          {(activeTab === 'Dashboard' || activeTab === 'Users' || activeTab === 'Reports' || activeTab === 'Settings') && (
            <div className={activeTab === 'Dashboard' ? "admin-panels-grid" : ""} style={{ display: activeTab === 'Dashboard' ? 'grid' : 'block', gridTemplateColumns: '1fr 1fr 1fr' }}>
              
              {(activeTab === 'Dashboard' || activeTab === 'Users') && (
                <div className="admin-panel" style={activeTab === 'Users' ? { flex: 1, minHeight: '600px' } : {}}>
                  <div className="admin-panel-header">
                    <h2>{activeTab === 'Users' ? 'User Management' : 'Recent Users'}</h2>
                    {activeTab === 'Dashboard' && <button className="admin-link-button" onClick={() => setActiveTab('Users')}>View All</button>}
                  </div>
                  <div className="admin-table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>User</th>
                          <th>Rating</th>
                          <th>Solved</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.slice(0, activeTab === 'Dashboard' ? 5 : users.length).map(u => (
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
                            <td>{u.rating}</td>
                            <td>{u.solved}</td>
                            <td><span className={`status-badge offline`}>{u.status}</span></td>
                            <td>
                              <div className="admin-table-actions">
                                <button className="admin-action-btn" title="View"><Eye size={12} /></button>
                                <button className="admin-action-btn warning" title="Warn"><AlertTriangle size={12} /></button>
                                <button className="admin-action-btn danger" title="Ban"><ShieldAlert size={12} /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
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
                          <th>Reason</th>
                          <th>Time</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reports.map((r, i) => (
                          <tr key={i}>
                            <td style={{ color: '#FF5555' }}>{r.type}</td>
                            <td>{r.user}</td>
                            <td>{r.reason}</td>
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
                      <span>Showing 5 of 68 reports</span>
                      <button className="admin-link-button" style={{ color: '#FF9100' }}>Load More</button>
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
                      <button className="admin-link-button" style={{ color: '#FF9100' }} onClick={() => setActiveTab('Settings')}>View All Settings →</button>
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
