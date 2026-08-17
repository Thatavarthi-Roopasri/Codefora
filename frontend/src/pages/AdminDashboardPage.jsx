import React, { useState, useEffect } from 'react';
import { Navbar } from '../components/Navbar';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../api/client';
import { API_URL } from '../config';
import { 
  Users, Server, Code, Trophy, 
  Activity, BarChart3, CheckCircle2, ShieldAlert, Settings, LayoutDashboard,
  Eye, Lock, Trash2, Edit, AlertTriangle, Play, RefreshCw,
  MessageSquare, Star, Ban, UserCheck, FileText, Timer
} from 'lucide-react';
import '../styles/admin.css';

function toActivityLog(entry) {
  const action = String(entry.action || 'admin.action').replace(/[._]/g, ' ');
  const target = entry.target ? `: ${entry.target}` : '';
  return {
    icon: <Activity size={16} />,
    class: entry.action?.includes('deleted') || entry.action?.includes('blocked') ? 'deleted' : 'updated',
    text: `${action}${target}`,
    time: entry.createdAt ? new Date(entry.createdAt).toLocaleString() : 'just now'
  };
}

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { user, isAdmin, loading: authLoading } = useAuth();
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
  const [feedbackFilter, setFeedbackFilter] = useState('open');
  const [moderatingId, setModeratingId] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [submissionFilter, setSubmissionFilter] = useState('all');
  const [accountActionId, setAccountActionId] = useState(null);
  
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
      const [s, r, p, u, f, submissionData, auditData] = await Promise.all([
        api.request("/api/admin/stats"),
        api.request("/api/admin/rooms"),
        api.request("/api/admin/problems"),
        api.request("/api/admin/users"),
        api.request("/api/admin/feedback"),
        api.request("/api/admin/submissions").catch(() => []),
        api.request("/api/admin/audit-log").catch(() => [])
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
      setSubmissions(Array.isArray(submissionData) ? submissionData : []);
      setActivityLog(Array.isArray(auditData) && auditData.length
        ? auditData.map(toActivityLog)
        : [{ icon: <Activity size={16} />, class: 'updated', text: 'System initialized and connected to server.', time: 'just now' }]);
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
      setActivityLog(prev => [{ icon: <Trash2 size={16} />, class: 'deleted', text: `Room ${id} was removed.`, time: 'just now' }, ...prev]);
    } catch (err) { alert(err.message); }
  };

  const handleRoomLock = async (id) => {
    try {
      const res = await api.request(`/api/admin/rooms/${id}/lock`, { method: 'POST' });
      setRooms(prev => prev.map(r => r.id === id ? { ...r, isLocked: res.isLocked } : r));
      setActivityLog(prev => [{ icon: <Lock size={16} />, class: 'locked', text: `Room ${id} was ${res.isLocked ? 'locked' : 'unlocked'}.`, time: 'just now' }, ...prev]);
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
  const [showRoomForm, setShowRoomForm] = useState(false);
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [roomFormStatus, setRoomFormStatus] = useState('');

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
      timeLimit: rawData.timeLimit || "1.0s",
      tests: [
        { input: rawData.test1Input, output: rawData.test1Output, hidden: e.target.test1Hidden.checked },
        { input: rawData.test2Input, output: rawData.test2Output, hidden: e.target.test2Hidden.checked },
        ...(editingProblem?.tests || []).slice(2)
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
      setActivityLog(prev => [{ icon: <Code size={16} />, class: 'updated', text: `Problem ${data.title} was ${editingProblem ? 'updated' : 'created'}.`, time: 'just now' }, ...prev]);
    } catch (err) { alert(err.message); }
  };

  const openProblemForm = () => {
    setActiveTab('Problems');
    setEditingProblem(null);
    setShowProblemForm(true);
  };

  const openRoomForm = () => {
    setActiveTab('Rooms');
    setRoomFormStatus('');
    setShowRoomForm(true);
  };

  const handleCreateRoom = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get('name') || '').trim();
    if (!name) return;

    setCreatingRoom(true);
    setRoomFormStatus('');
    try {
      const room = await api.createRoom({
        name,
        visibility: formData.get('visibility'),
        max: Number(formData.get('max')),
        username: user?.displayName || user?.email?.split('@')[0] || 'Administrator',
        userId: user?.uid || null
      });
      setShowRoomForm(false);
      setActivityLog((current) => [{
        icon: <Server size={16} />,
        class: 'updated',
        text: `Room ${room.name} was created.`,
        time: 'just now'
      }, ...current]);
      await fetchData();
    } catch (error) {
      setRoomFormStatus(error.message || 'Could not create the room.');
    } finally {
      setCreatingRoom(false);
    }
  };

  const handleToggleRole = async (userId, currentRole) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    try {
      await api.request(`/api/admin/users/${userId}/role`, { method: 'POST', body: JSON.stringify({ role: newRole }) });
      setUsers(prev => prev.map(u => u.userId === userId ? { ...u, role: newRole } : u));
      setActivityLog(prev => [{ icon: <ShieldAlert size={16} />, class: 'updated', text: `User ${userId} is now ${newRole}.`, time: 'just now' }, ...prev]);
    } catch (err) {
      alert("Failed to change role: " + err.message);
    }
  };

  const handleAccountStatus = async (userId, status) => {
    setAccountActionId(userId);
    try {
      await api.request(`/api/admin/users/${userId}/account-status`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
      setUsers((current) => current.map((user) => (
        user.userId === userId ? { ...user, moderationStatus: status } : user
      )));
      setActivityLog((current) => [{ icon: status === 'active' ? <UserCheck size={16} /> : <Ban size={16} />, class: status === 'active' ? 'updated' : 'deleted', text: `User ${userId} was marked ${status}.`, time: 'just now' }, ...current]);
    } catch (error) {
      alert(`Unable to update account status: ${error.message}`);
    } finally {
      setAccountActionId(null);
    }
  };

  const handleFeedbackStatus = async (item, status) => {
    setModeratingId(`${item.id}:${status}`);
    try {
      const response = await api.request(`/api/admin/feedback/${item.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
      setFeedbackList((current) => current.map((feedback) => (
        feedback.id === item.id ? { ...feedback, ...response.feedback } : feedback
      )));
      setActivityLog((current) => [{
        icon: <CheckCircle2 size={16} />,
        class: 'updated',
        text: `${item.reportedId ? 'Report' : 'Feedback'} ${item.id} was marked ${status}.`,
        time: 'just now'
      }, ...current]);
    } catch (error) {
      alert(`Unable to update this item: ${error.message}`);
    } finally {
      setModeratingId(null);
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
    { label: 'Submissions', value: statsData.totalSubmissions || 0, trend: `${statsData.acceptanceRate || 0}% accepted`, icon: <FileText />, color: '#F59E0B' },
    { label: 'Open Reports', value: feedbackList.filter((item) => item.type === 'report' && (item.status || 'open') === 'open').length, trend: `${feedbackList.filter((item) => item.type !== 'report').length} feedback items`, icon: <ShieldAlert />, color: '#FF5555' },
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
    id: f.id,
    status: f.status || 'open'
  }));
  const feedbackItems = feedbackList.filter((feedback) => feedback.type !== 'report');
  const visibleFeedback = feedbackItems.filter((feedback) => (
    feedbackFilter === 'all' || (feedback.status || 'open') === feedbackFilter
  ));
  const averageRating = feedbackItems.length
    ? (feedbackItems.reduce((total, feedback) => total + (Number(feedback.rating) || 0), 0) / feedbackItems.length).toFixed(1)
    : '0.0';
  const verdictCounts = submissions.reduce((counts, submission) => {
    counts[submission.verdict] = (counts[submission.verdict] || 0) + 1;
    return counts;
  }, {});
  const languageCounts = submissions.reduce((counts, submission) => {
    const language = submission.language || 'unknown';
    counts[language] = (counts[language] || 0) + 1;
    return counts;
  }, {});
  const problemCounts = submissions.reduce((counts, submission) => {
    const problemId = submission.problemId || 'unknown';
    if (!counts[problemId]) counts[problemId] = { attempts: 0, accepted: 0 };
    counts[problemId].attempts += 1;
    if (submission.verdict === 'accepted') counts[problemId].accepted += 1;
    return counts;
  }, {});
  const topAttempted = Object.entries(problemCounts).sort(([, a], [, b]) => b.attempts - a.attempts)[0];
  const lowestAcceptance = Object.entries(problemCounts)
    .filter(([, value]) => value.attempts > 0)
    .sort(([, a], [, b]) => (a.accepted / a.attempts) - (b.accepted / b.attempts))[0];
  const topLanguage = Object.entries(languageCounts).sort(([, a], [, b]) => b - a)[0];
  const visibleSubmissions = submissions.filter((submission) => submissionFilter === 'all' || submission.verdict === submissionFilter);
  const analytics = [
    { label: 'Total submissions', value: submissions.length, detail: `${verdictCounts.accepted || 0} accepted`, icon: <FileText size={18} />, tone: 'info' },
    { label: 'Time limits', value: verdictCounts.time_limit_exceeded || 0, detail: 'Execution-limit verdicts', icon: <Timer size={18} />, tone: 'warning' },
    { label: 'Most attempted', value: topAttempted ? (problemList.find((problem) => problem.id === topAttempted[0])?.title || topAttempted[0]) : 'No submissions', detail: topAttempted ? `${topAttempted[1].attempts} attempts` : 'Waiting for activity', icon: <BarChart3 size={18} />, tone: 'success' },
    { label: 'Lowest acceptance', value: lowestAcceptance ? `${Math.round((lowestAcceptance[1].accepted / lowestAcceptance[1].attempts) * 100)}%` : 'No data', detail: lowestAcceptance ? (problemList.find((problem) => problem.id === lowestAcceptance[0])?.title || lowestAcceptance[0]) : 'Waiting for activity', icon: <AlertTriangle size={18} />, tone: 'danger' },
    { label: 'Popular language', value: topLanguage ? topLanguage[0] : 'No data', detail: topLanguage ? `${topLanguage[1]} submissions` : 'Waiting for activity', icon: <Code size={18} />, tone: 'info' },
    { label: 'Open reports', value: reports.filter((report) => report.status === 'open').length, detail: 'Need review', icon: <ShieldAlert size={18} />, tone: 'danger' },
    { label: 'Feedback received', value: feedbackItems.length, detail: `${averageRating}/5 average rating`, icon: <MessageSquare size={18} />, tone: 'info' },
    { label: 'Active rooms', value: rooms.length, detail: `${rooms.filter((room) => room.isLocked).length} locked`, icon: <Server size={18} />, tone: 'warning' },
    { label: 'Published problems', value: problemList.filter((problem) => problem.published).length, detail: `${problemList.length} total problems`, icon: <Code size={18} />, tone: 'success' }
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
            <button className={`admin-nav-item ${activeTab === 'Submissions' ? 'active' : ''}`} onClick={() => setActiveTab('Submissions')}>
              <FileText size={18} /> Submissions
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
            <button className={`admin-nav-item ${activeTab === 'Analytics' ? 'active' : ''}`} onClick={() => setActiveTab('Analytics')}>
              <BarChart3 size={18} /> Analytics
            </button>
            <button className={`admin-nav-item ${activeTab === 'Activity Logs' ? 'active' : ''}`} onClick={() => setActiveTab('Activity Logs')}>
              <Activity size={18} /> Live Activity
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
            <button className="admin-nav-item" onClick={openProblemForm} style={{ border: '1px solid rgba(139, 233, 253, 0.2)', color: '#8BE9FD', justifyContent: 'center' }}>
              + Add Problem
            </button>
            <button className="admin-nav-item" onClick={openRoomForm} style={{ border: '1px solid rgba(255, 145, 0, 0.2)', color: 'var(--primary-accent)', justifyContent: 'center' }}>
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
                    <div className="admin-setting-group" style={{ flex: 0.5 }}>
                      <label className="admin-setting-label">Time Limit</label>
                      <input name="timeLimit" className="admin-input" defaultValue={editingProblem?.timeLimit || "1.0s"} placeholder="e.g. 1.0s" />
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
                    <label className="admin-test-case-visibility">
                      <input type="checkbox" name="test1Hidden" defaultChecked={editingProblem?.tests?.[0]?.hidden === true} />
                      Keep test case 1 hidden from users
                    </label>
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
                    <label className="admin-test-case-visibility">
                      <input type="checkbox" name="test2Hidden" defaultChecked={editingProblem?.tests?.[1]?.hidden === true} />
                      Keep test case 2 hidden from users
                    </label>
                    <p className="admin-test-case-note">Hidden cases are sent to the server only during submission and their input/output is never returned to the user.</p>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginTop: '20px', paddingBottom: '10px' }}>
                    <button type="submit" className="admin-button primary" style={{ flex: 1 }}>Save Problem</button>
                    <button type="button" onClick={() => setShowProblemForm(false)} className="admin-button" style={{ flex: 1 }}>Cancel</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {showRoomForm && (
            <div className="admin-panel admin-modal-overlay">
              <div className="admin-modal-card" style={{ width: '500px', maxWidth: '100%' }}>
                <div className="admin-panel-header">
                  <div>
                    <h2>Create Room</h2>
                    <p className="admin-panel-subtitle">Start a collaboration room for Codefora users.</p>
                  </div>
                  <button type="button" onClick={() => setShowRoomForm(false)} className="admin-action-btn" aria-label="Close create room form">✕</button>
                </div>
                <form onSubmit={handleCreateRoom} className="admin-settings-form">
                  <div className="admin-setting-group">
                    <label className="admin-setting-label" htmlFor="admin-room-name">Room name</label>
                    <input id="admin-room-name" name="name" className="admin-input" placeholder="e.g. Weekend practice room" required autoFocus />
                  </div>
                  <div className="admin-setting-row-flex">
                    <div className="admin-setting-group" style={{ flex: 1 }}>
                      <label className="admin-setting-label" htmlFor="admin-room-visibility">Visibility</label>
                      <select id="admin-room-visibility" name="visibility" className="admin-input" defaultValue="public">
                        <option value="public">Public</option>
                        <option value="private">Private</option>
                      </select>
                    </div>
                    <div className="admin-setting-group" style={{ flex: 1 }}>
                      <label className="admin-setting-label" htmlFor="admin-room-max">Maximum participants</label>
                      <select id="admin-room-max" name="max" className="admin-input" defaultValue="7">
                        {[2, 3, 4, 5, 6, 7].map((count) => <option key={count} value={count}>{count}</option>)}
                      </select>
                    </div>
                  </div>
                  {roomFormStatus && <p style={{ margin: 0, color: '#ff5555', fontSize: '0.85rem' }}>{roomFormStatus}</p>}
                  <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                    <button type="button" onClick={() => setShowRoomForm(false)} className="admin-button" style={{ flex: 1 }} disabled={creatingRoom}>Cancel</button>
                    <button type="submit" className="admin-button primary" style={{ flex: 1 }} disabled={creatingRoom}>{creatingRoom ? 'Creating...' : 'Create Room'}</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {activeTab === 'Analytics' && (
            <div className="admin-panel admin-analytics-panel">
              <div className="admin-panel-header">
                <div>
                  <h2>Platform Activity</h2>
                  <p className="admin-panel-subtitle">A live operational view based on current users, rooms, problems, feedback, and reports.</p>
                </div>
                <button className="admin-button" onClick={fetchData}><RefreshCw size={14} /> Refresh</button>
              </div>
              <div className="admin-analytics-grid">
                {analytics.map((item) => (
                  <div className={`admin-analytics-card ${item.tone}`} key={item.label}>
                    <div className="admin-analytics-icon">{item.icon}</div>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                    <small>{item.detail}</small>
                  </div>
                ))}
              </div>
              <div className="admin-insight-grid">
                <div>
                  <span>Verdicts</span>
                  <strong>{verdictCounts.accepted || 0} accepted / {verdictCounts.wrong_answer || 0} wrong answer</strong>
                </div>
                <div>
                  <span>Runtime errors</span>
                  <strong>{verdictCounts.runtime_error || 0} runtime / {verdictCounts.compilation_error || 0} compilation</strong>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Submissions' && (
            <div className="admin-panel" style={{ flex: 1, minHeight: '600px' }}>
              <div className="admin-panel-header">
                <div>
                  <h2>Submission Monitoring</h2>
                  <p className="admin-panel-subtitle">Recent judging results across problems and languages.</p>
                </div>
                <div className="admin-panel-actions">
                  <select className="admin-input admin-filter-control" value={submissionFilter} onChange={(event) => setSubmissionFilter(event.target.value)}>
                    <option value="all">All verdicts</option>
                    <option value="accepted">Accepted</option>
                    <option value="wrong_answer">Wrong answer</option>
                    <option value="time_limit_exceeded">Time limit</option>
                    <option value="runtime_error">Runtime error</option>
                    <option value="compilation_error">Compilation error</option>
                  </select>
                  <button className="admin-button" onClick={fetchData}><RefreshCw size={14} /> Refresh</button>
                </div>
              </div>
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Problem</th>
                      <th>User</th>
                      <th>Language</th>
                      <th>Verdict</th>
                      <th>Passed</th>
                      <th>Time</th>
                      <th>Submitted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleSubmissions.map((submission) => {
                      const problem = problemList.find((item) => item.id === submission.problemId);
                      const submitter = users.find((item) => item.userId === submission.userId);
                      return (
                        <tr key={submission.id}>
                          <td>{problem?.title || submission.problemId}</td>
                          <td>{submitter?.name || 'Guest'}</td>
                          <td>{submission.language || 'Unknown'}</td>
                          <td><span className={`status-badge verdict-${String(submission.verdict || '').replace(/_/g, '-')}`}>{String(submission.verdict || 'judge_error').replace(/_/g, ' ')}</span></td>
                          <td>{submission.passed || 0}/{submission.total || 0}</td>
                          <td>{submission.executionTime || 0}ms</td>
                          <td>{submission.createdAt ? new Date(submission.createdAt).toLocaleString() : 'Just now'}</td>
                        </tr>
                      );
                    })}
                    {visibleSubmissions.length === 0 && <tr><td colSpan="7" style={{ textAlign: 'center', padding: '28px' }}>No submissions match this filter.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'Activity Logs' && (
            <div className="admin-panel admin-activity-log-panel">
              <div className="admin-panel-header">
                <div>
                  <h2>Activity Logs</h2>
                  <p className="admin-panel-subtitle">Persistent record of administrator actions.</p>
                </div>
                <button className="admin-button" onClick={fetchData}><RefreshCw size={14} /> Refresh</button>
              </div>
              <div className="admin-log-list">
                {activityLog.map((log, index) => (
                  <div className="admin-log-item" key={`${log.text}-${index}`}>
                    <div className={`activity-icon ${log.class}`}>{log.icon}</div>
                    <div>
                      <div className="activity-text">{log.text}</div>
                      <div className="activity-time">{log.time}</div>
                    </div>
                  </div>
                ))}
                {activityLog.length === 0 && <p className="admin-empty-state">No administrator actions in this session.</p>}
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
                  {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', weekday: 'long' })}
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

          {/* Management panels are available only from their dedicated sidebar pages. */}
          {(activeTab === 'Rooms' || activeTab === 'Problems') && (
            <div>
              
              {activeTab === 'Rooms' && (
                <div className="admin-panel" style={{ flex: 1, minHeight: '600px' }}>
                  <div className="admin-panel-header">
                    <h2>Room Management</h2>
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
                        {rooms.map(room => (
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

              {activeTab === 'Problems' && (
                <div className="admin-panel" style={{ flex: 1, minHeight: '600px' }}>
                  <div className="admin-panel-header">
                    <h2>Problems Management</h2>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button className="admin-link-button" onClick={openProblemForm}>+ Add New</button>
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
                        {problemList.map(prob => (
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
                <div>
                  <h2>User Feedback & Ratings</h2>
                  <p className="admin-panel-subtitle">Review product feedback and close completed items.</p>
                </div>
                <div className="admin-panel-actions">
                  <select className="admin-input admin-filter-control" value={feedbackFilter} onChange={(event) => setFeedbackFilter(event.target.value)}>
                    <option value="open">Open</option>
                    <option value="reviewed">Reviewed</option>
                    <option value="dismissed">Dismissed</option>
                    <option value="all">All feedback</option>
                  </select>
                  <button className="admin-button" onClick={fetchData}><RefreshCw size={14} /> Refresh</button>
                </div>
              </div>
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Rating</th>
                      <th>Feedback / Message</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleFeedback.map((f) => (
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
                        <td><span className={`status-badge ${f.status || 'open'}`}>{f.status || 'open'}</span></td>
                        <td style={{ fontSize: '0.75rem', opacity: 0.5 }}>{new Date(f.createdAt).toLocaleDateString()}</td>
                        <td>
                          <div className="admin-table-actions">
                            <button className="admin-action-btn success" title="Mark reviewed" disabled={moderatingId === `${f.id}:reviewed`} onClick={() => handleFeedbackStatus(f, 'reviewed')}><CheckCircle2 size={14} /></button>
                            <button className="admin-action-btn" title="Dismiss feedback" disabled={moderatingId === `${f.id}:dismissed`} onClick={() => handleFeedbackStatus(f, 'dismissed')}><Eye size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {visibleFeedback.length === 0 && (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#555' }}>
                          No feedback matches this status.
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

          {/* Dashboard keeps only the user and report summaries below its metrics. */}
          {(activeTab === 'Dashboard' || activeTab === 'Users' || activeTab === 'Reports' || activeTab === 'Settings') && (
            <div className={activeTab === 'Dashboard' ? "admin-panels-grid" : ""} style={{ display: activeTab === 'Dashboard' ? 'grid' : 'block', gridTemplateColumns: activeTab === 'Dashboard' ? 'minmax(0, 2fr) minmax(0, 1fr)' : undefined }}>
              
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
                          <th>Account</th>
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
                                <span className={`status-badge ${u.moderationStatus || 'active'}`}>{u.moderationStatus || 'active'}</span>
                              </td>
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
                                  {isSuperAdmin && u.email !== 'ganeshvanamala16@gmail.com' && (
                                    (u.moderationStatus || 'active') === 'active' ? (
                                      <>
                                        <button className="admin-action-btn warning" title="Suspend account" disabled={accountActionId === u.userId} onClick={() => handleAccountStatus(u.userId, 'suspended')}><Timer size={12} /></button>
                                        <button className="admin-action-btn danger" title="Block account" disabled={accountActionId === u.userId} onClick={() => handleAccountStatus(u.userId, 'blocked')}><Ban size={12} /></button>
                                      </>
                                    ) : (
                                      <button className="admin-action-btn success" title="Restore account" disabled={accountActionId === u.userId} onClick={() => handleAccountStatus(u.userId, 'active')}><UserCheck size={12} /></button>
                                    )
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
                                    <td colSpan="7" style={{ background: 'rgba(255, 255, 255, 0.05)', fontWeight: 'bold', color: 'var(--primary-accent)', padding: '8px 12px' }}>Administrators</td>
                                  </tr>
                                  {displayAdmins.map(renderUserRow)}
                                </>
                              )}
                              {displayRegulars.length > 0 && (
                                <>
                                  <tr className="admin-table-section-header">
                                    <td colSpan="7" style={{ background: 'rgba(255, 255, 255, 0.02)', fontWeight: 'bold', color: 'rgba(255,255,255,0.6)', padding: '8px 12px' }}>Regular Users</td>
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
                          <th>Status</th>
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
                            <td><span className={`status-badge ${r.status}`}>{r.status}</span></td>
                            <td>{r.time}</td>
                            <td>
                              <div className="admin-table-actions">
                                <button className="admin-action-btn success" title="Mark reviewed" disabled={moderatingId === `${r.id}:reviewed`} onClick={() => handleFeedbackStatus(r, 'reviewed')}><CheckCircle2 size={12} /></button>
                                <button className="admin-action-btn warning" title="Escalate report" disabled={moderatingId === `${r.id}:escalated`} onClick={() => handleFeedbackStatus(r, 'escalated')}><AlertTriangle size={12} /></button>
                                <button className="admin-action-btn" title="Dismiss report" disabled={moderatingId === `${r.id}:dismissed`} onClick={() => handleFeedbackStatus(r, 'dismissed')}><Eye size={12} /></button>
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

              {activeTab === 'Settings' && (
                <div className="admin-panel" style={{ flex: 1, minHeight: '600px' }}>
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

      </div>
    </div>
  );
}
