import { useCallback, useState, useEffect, useRef } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { UserCircle2, LogOut, User, Bell, Users, MessageCircle, UserMinus, Copy } from "lucide-react";
import { createPortal } from "react-dom";
import { BrandButton } from "./BrandButton";
import { logoutUser } from "../lib/firebase";
import { useAuth } from "../hooks/useAuth";
import { getProfile, api } from "../api/client";
import { copyToClipboard } from "../lib/clipboard";
import { isGuestUser } from "../lib/userAccess";
import { subscribeProfileSync } from "../lib/profileSync";
import { socket } from "../lib/socket";
import { API_URL } from "../config";
import defaultAvatar from "../../assets/scene1.jpeg";

function FriendListItem({ f, navigate, setFriendToRemove, onMessage }) {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    let active = true;
    getProfile(f.id).then(data => {
      if (active && data) setProfile(data);
    }).catch(console.error);
    return () => { active = false; };
  }, [f.id]);

  const emotionImage = profile?.emotionId ? `${API_URL}/api/emotions/${profile.emotionId}/image` : null;

  return (
    <div 
      style={{ 
        display: 'flex', alignItems: 'center', gap: '12px', padding: '8px', 
        borderRadius: '6px', 
        backgroundImage: `linear-gradient(to right, rgba(15, 23, 42, 0.9), rgba(15, 23, 42, 0.7)), url(${defaultAvatar})`,
        backgroundSize: 'cover', backgroundPosition: 'center',
        border: '1px solid rgba(255,255,255,0.05)',
        cursor: 'pointer', position: 'relative', overflow: 'hidden'
      }}
      onClick={(e) => {
        if (e.target.closest('button')) return;
        navigate('/profile/' + (profile?.friendCode || f.friendCode || f.id));
      }}
    >
      <div style={{
        width: '32px', height: '32px', borderRadius: '50%', 
        background: 'rgba(255,255,255,0.1)', display: 'flex', 
        alignItems: 'center', justifyContent: 'center',
        color: 'var(--primary-accent)', fontWeight: 'bold', fontSize: '14px',
        overflow: 'hidden'
      }}>
        {emotionImage ? (
          <img src={emotionImage} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : profile?.photoURL ? (
          <img src={profile.photoURL} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          f.name ? f.name[0].toUpperCase() : '?'
        )}
      </div>
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative', zIndex: 1 }}>
        <div style={{ fontSize: '13px', color: 'white', fontWeight: 500, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', display: 'flex', alignItems: 'center', gap: '6px' }}>
          {profile?.displayName || f.name}
          <span 
            title={profile?.presence === 'in-room' ? 'In Room' : profile?.presence === 'online' ? 'Online' : 'Offline'}
            style={{ 
              display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', 
              background: profile?.presence === 'in-room' ? '#3b82f6' : profile?.presence === 'online' ? '#10b981' : '#64748b' 
            }}
          />
        </div>
        {(profile?.friendCode || f.friendCode) && (
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>
            USER ID: {profile?.friendCode || f.friendCode}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: '4px', position: 'relative', zIndex: 1 }}>
        <button 
          style={{
            background: 'transparent', border: 'none', color: '#ef4444',
            cursor: 'pointer', padding: '4px'
          }}
          title="Remove Friend"
          onClick={(e) => { e.stopPropagation(); setFriendToRemove(f); }}
        >
          <UserMinus size={16} />
        </button>
        <button 
          style={{
            background: 'transparent', border: 'none', color: 'var(--primary-accent)',
            cursor: 'pointer', padding: '4px'
          }}
          title="Message"
          onClick={(e) => { e.stopPropagation(); onMessage({ id: f.id, name: profile?.displayName || f.name || "Friend" }); }}
        >
          <MessageCircle size={16} />
        </button>
      </div>
    </div>
  );
}

export function Navbar() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const isSignedIn = Boolean(user && !isGuestUser(user));
  const [displayName, setDisplayName] = useState("");
  const [emotionId, setEmotionId] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationsRef = useRef(null);

  const [friends, setFriends] = useState([]);
  const [showFriends, setShowFriends] = useState(false);
  const friendsRef = useRef(null);
  const [friendRequestId, setFriendRequestId] = useState("");
  const [requestStatus, setRequestStatus] = useState("");
  const [searchedUser, setSearchedUser] = useState(null);
  const [friendCode, setFriendCode] = useState("");
  const [friendCodeCopyStatus, setFriendCodeCopyStatus] = useState("");
  const friendCodeCopyTimerRef = useRef(null);
  const [friendToRemove, setFriendToRemove] = useState(null);
  const [removingFriend, setRemovingFriend] = useState(false);
  const [chatFriend, setChatFriend] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatText, setChatText] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [chatError, setChatError] = useState("");

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (friendsRef.current && !friendsRef.current.contains(event.target)) {
        setShowFriends(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (friendCodeCopyTimerRef.current) {
        clearTimeout(friendCodeCopyTimerRef.current);
      }
    };
  }, []);

  const refreshNotifications = useCallback(async () => {
    if (!user?.uid || isGuestUser(user)) {
      setNotifications([]);
      return;
    }

    try {
      const notifs = await api.request(`/api/notifications/${user.uid}`);
      setNotifications(notifs || []);
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    }
  }, [user]);

  const refreshProfileShell = useCallback(async () => {
    const localName = localStorage.getItem("codefora_username");
    if (localName) {
      setDisplayName(localName);
    } else if (user) {
      setDisplayName(user.displayName || user.email?.split('@')[0] || "Guest");
    } else {
      setDisplayName("");
    }

    if (user?.uid && !isGuestUser(user)) {
      try {
        const profile = await getProfile(user.uid);
        setEmotionId(profile?.emotionId || null);
        setFriends(profile?.friends || []);
        setFriendCode(profile?.friendCode || "");
      } catch (e) {
        console.error('Failed to fetch profile in navbar', e);
      }
    } else {
      setEmotionId(null);
      setFriends([]);
      setFriendCode("");
    }
  }, [user]);

  useEffect(() => {
    if (!user?.uid || isGuestUser(user)) {
      setNotifications([]);
      return undefined;
    }

    const handleNotificationRefresh = (payload = {}) => {
      if (!payload.userId || payload.userId === user.uid) refreshNotifications();
    };
    const handleFriendsRefresh = (payload = {}) => {
      if (!payload.userId || payload.userId === user.uid) refreshProfileShell();
    };
    const announcePresence = () => socket.emit("user:presence", user.uid);

    refreshNotifications();
    if (!socket.connected) socket.connect();
    announcePresence();
    socket.on("connect", announcePresence);
    socket.on("notifications:refresh", handleNotificationRefresh);
    socket.on("friends:refresh", handleFriendsRefresh);

    return () => {
      socket.off("connect", announcePresence);
      socket.off("notifications:refresh", handleNotificationRefresh);
      socket.off("friends:refresh", handleFriendsRefresh);
    };
  }, [refreshNotifications, refreshProfileShell, user]);

  const handleMarkAsRead = async (notificationId = null) => {
    if (!user?.uid) return;
    try {
      await api.request(`/api/notifications/${user.uid}/read`, {
        method: "POST",
        body: JSON.stringify({ notificationId })
      });
      if (notificationId) {
        setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, read: true } : n));
      } else {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      }
    } catch (err) {
      console.error("Failed to mark as read", err);
    }
  };

  const openDirectMessage = async (notification) => {
    if (!notification?.messageId) return;
    setChatFriend({ id: notification.senderId, name: notification.senderName || "Friend" });
    setChatMessages([{ id: notification.messageId, senderId: notification.senderId, senderName: notification.senderName, text: notification.message?.replace(`${notification.senderName}: `, "") || "", createdAt: notification.createdAt, incoming: true }]);
    setChatError("");
    setShowNotifications(false);
    try {
      await api.markDirectMessageSeen(notification.messageId);
      setNotifications(prev => prev.filter(item => item.id !== notification.id));
    } catch (error) {
      setChatError(error.message || "Could not open this message.");
    }
  };

  const sendDirectMessage = async () => {
    const text = chatText.trim();
    if (!chatFriend?.id || !text || chatBusy) return;
    setChatBusy(true);
    setChatError("");
    try {
      const response = await api.sendDirectMessage({
        recipientId: chatFriend.id,
        senderName: displayName || user.displayName || "User",
        text,
      });
      setChatMessages(prev => [...prev, { ...response.message, incoming: false }]);
      setChatText("");
    } catch (error) {
      setChatError(error.message || "Could not send message.");
    } finally {
      setChatBusy(false);
    }
  };

  const handleFriendRequestAction = async (notificationId, action) => {
    if (!user?.uid) return;
    try {
      await api.request(`/api/profiles/${user.uid}/friends/handle`, {
        method: "POST",
        body: JSON.stringify({ notificationId, action })
      });
      setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, status: action, read: true } : n));
      if (action === 'accept') {
        window.dispatchEvent(new Event("profileUpdated"));
      }
    } catch (err) {
      console.error("Failed to handle friend request", err);
    }
  };

  const handleSearchUser = async () => {
    if (!friendRequestId.trim()) return;
    
    // Only allow 8-digit numeric friend codes
    if (!/^\d{8}$/.test(friendRequestId.trim())) {
      setRequestStatus("Invalid USER ID (must be 8 digits)");
      return;
    }

    setRequestStatus("Searching...");
    setSearchedUser(null);
    try {
      const data = await getProfile(friendRequestId.trim());
      if (data && Object.keys(data).length > 0 && data.id) {
        setSearchedUser(data); // data now includes the true 'id'
        setRequestStatus("");
      } else {
        setRequestStatus("User not found");
      }
    } catch {
      setRequestStatus("User not found");
    }
  };

  const handleSendFriendRequest = async () => {
    if (!user?.uid || !searchedUser) return;
    setRequestStatus("Sending request...");
    try {
      const res = await api.request(`/api/profiles/${user.uid}/friends/request`, {
        method: "POST",
        body: JSON.stringify({ targetUserId: searchedUser.id })
      });
      if (res.error) {
        setRequestStatus(res.error);
      } else {
        setRequestStatus("Request Sent!");
        setSearchedUser(null);
        setFriendRequestId("");
      }
    } catch (err) {
      setRequestStatus(err.message || "Failed to send");
    }
  };

  const handleCopyFriendCode = async () => {
    const codeToCopy = String(friendCode || "").trim();
    if (!codeToCopy) return;

    if (friendCodeCopyTimerRef.current) {
      clearTimeout(friendCodeCopyTimerRef.current);
    }

    try {
      await copyToClipboard(codeToCopy);
      setFriendCodeCopyStatus("Copied!");
    } catch {
      setFriendCodeCopyStatus("Copy failed");
    }

    friendCodeCopyTimerRef.current = setTimeout(() => {
      setFriendCodeCopyStatus("");
      friendCodeCopyTimerRef.current = null;
    }, 1600);
  };

  const handleRemoveFriend = async (friendId) => {
    setRemovingFriend(true);
    try {
      await api.removeFriend(user.uid, friendId);
      setFriends(prev => prev.filter(f => f.id !== friendId));
      
      const cachedProfileStr = localStorage.getItem("codefora_profile_" + user.uid);
      if (cachedProfileStr) {
        try {
          const cp = JSON.parse(cachedProfileStr);
          if (cp.friends) {
            cp.friends = cp.friends.filter(f => f.id !== friendId);
            localStorage.setItem("codefora_profile_" + user.uid, JSON.stringify(cp));
          }
        } catch {
          // Ignore malformed cached profile data.
        }
      }
    } catch (err) {
      console.error(err);
      alert("Failed to remove friend.");
    } finally {
      setRemovingFriend(false);
      setFriendToRemove(null);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    refreshProfileShell();
    window.addEventListener("profileUpdated", refreshProfileShell);
    const unsubscribeProfileSync = subscribeProfileSync((profile) => {
      if (profile.uid && profile.uid !== user?.uid) return;
      if (profile.displayName) setDisplayName(profile.displayName);
      setEmotionId(profile.emotionId || null);
      refreshProfileShell();
    });
    return () => {
      window.removeEventListener("profileUpdated", refreshProfileShell);
      unsubscribeProfileSync();
    };
  }, [refreshProfileShell, user?.uid]);

  const handleLogout = async () => {
    try {
      await logoutUser();
      localStorage.removeItem('codefora_username');
      localStorage.removeItem('codefora_user_id');
      navigate('/');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const linkStyle = ({ isActive }) => ({
    fontWeight: 600,
    color: isActive ? '#fff' : 'rgba(255,255,255,0.7)',
    textDecoration: 'none',
    borderBottom: isActive ? '2px solid var(--primary-accent)' : '2px solid transparent',
    paddingBottom: '4px',
    transition: 'all 0.2s'
  });

  return (
    <header className="app-navbar" style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
      padding: '20px 40px', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
      position: 'relative',
      zIndex: 100
    }}>
      <BrandButton logo />
      <nav className="tour-navbar app-navbar-links" style={{ gap: '40px', display: 'flex', alignItems: 'center' }}>
        <NavLink to="/home" end style={linkStyle}>Home</NavLink>
        <NavLink to="/rooms" style={linkStyle}>Rooms</NavLink>
        <NavLink to="/problems" style={linkStyle}>Problems</NavLink>
        <NavLink to="/challenges" style={linkStyle}>Challenges</NavLink>
        <NavLink to="/playground" style={linkStyle}>Playground</NavLink>
        <NavLink to="/feedback" style={linkStyle}>Feedback</NavLink>
        {isAdmin && <NavLink to="/admin" style={linkStyle}>Dashboard</NavLink>}
      </nav>
      <div className="app-navbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        {isSignedIn && (
          <>
            {/* Friends Dropdown */}
            <div style={{ position: 'relative' }} ref={friendsRef}>
              <button 
                onClick={() => setShowFriends(!showFriends)}
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '36px', height: '36px', color: 'rgba(255,255,255,0.7)',
                  position: 'relative', transition: 'color 0.2s'
                }}
                onMouseOver={e => e.currentTarget.style.color = 'white'}
                onMouseOut={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
              >
                <Users size={20} />
              </button>

              {showFriends && (
                <div className="navbar-friends-menu" style={{
                  position: 'absolute', top: 'calc(100% + 10px)', right: 0,
                  background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px', padding: '12px', width: '320px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                  display: 'flex', flexDirection: 'column', gap: '8px',
                  maxHeight: '400px', overflowY: 'auto'
                }}>
                  <div style={{ padding: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '14px', color: 'white' }}>Friends</h3>
                    <button onClick={() => { setShowFriends(false); navigate('/profile'); }} style={{ background: 'none', border: 'none', color: 'var(--primary-accent)', fontSize: '12px', cursor: 'pointer' }}>
                      View All
                    </button>
                  </div>
                  {friendCode && (
                    <div className="navbar-friend-code" style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '6px', padding: '8px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)' }}>Your USER ID:</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontFamily: 'monospace', color: 'var(--primary-accent)', fontWeight: 'bold' }}>{friendCode}</span>
                        <button
                          type="button"
                          onClick={handleCopyFriendCode}
                          title="Copy USER ID"
                          aria-label="Copy USER ID"
                          style={{
                            width: '22px',
                            height: '22px',
                            borderRadius: '6px',
                            border: '1px solid rgba(255, 145, 0, 0.35)',
                            background: 'rgba(255, 145, 0, 0.08)',
                            color: 'var(--primary-accent)',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 0
                          }}
                        >
                          <Copy size={13} />
                        </button>
                        {friendCodeCopyStatus && (
                          <span style={{
                            color: friendCodeCopyStatus === "Copied!" ? '#22c55e' : '#ff5555',
                            fontSize: '11px',
                            fontWeight: 700,
                            whiteSpace: 'nowrap'
                          }}>
                            {friendCodeCopyStatus}
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                  {/* Search Friend Input */}
                  <div className="navbar-friend-search" style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <input 
                      type="text" 
                      placeholder="Enter 8-digit USER ID..." 
                      value={friendRequestId}
                      onChange={e => { setFriendRequestId(e.target.value); setRequestStatus(""); setSearchedUser(null); }}
                      onKeyDown={e => { if (e.key === 'Enter') handleSearchUser(); }}
                      style={{ flex: 1, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '6px 10px', color: 'white', fontSize: '12px', outline: 'none' }}
                    />
                    <button 
                      onClick={handleSearchUser}
                      style={{ background: 'var(--primary-accent)', border: 'none', color: 'white', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                    >
                      Search
                    </button>
                  </div>
                  {requestStatus && <div style={{ fontSize: '11px', color: requestStatus.includes('Sent') ? '#4ade80' : '#ef4444', marginBottom: '8px' }}>{requestStatus}</div>}
                  
                  {/* Searched User Banner */}
                  {searchedUser && (
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      background: 'rgba(255,255,255,0.05)', border: '1px solid var(--primary-accent)',
                      borderRadius: '8px', padding: '10px', marginBottom: '12px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {searchedUser.photoURL ? (
                          <img src={searchedUser.photoURL} alt={searchedUser.name} style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                        ) : searchedUser.emotionId ? (
                          <img src={`${API_URL}/api/emotions/${searchedUser.emotionId}/image`} alt={searchedUser.name} style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', background: 'rgba(255,255,255,0.1)', padding: '2px' }} />
                        ) : (
                          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-accent)', fontWeight: 'bold', fontSize: '16px' }}>
                            {searchedUser.name ? searchedUser.name[0].toUpperCase() : '?'}
                          </div>
                        )}
                        <div style={{ overflow: 'hidden' }}>
                          <div style={{ color: 'white', fontSize: '14px', fontWeight: 'bold', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{searchedUser.name}</div>
                          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontFamily: 'monospace' }}>{searchedUser.friendCode || searchedUser.id}</div>
                        </div>
                      </div>
                      <button 
                        onClick={handleSendFriendRequest}
                        style={{ background: 'var(--primary-accent)', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                      >
                        Add
                      </button>
                    </div>
                  )}

                  {friends.length > 0 ? (
                    friends.map((f, i) => (
                      <FriendListItem
                        key={i}
                        f={f}
                        navigate={navigate}
                        setFriendToRemove={setFriendToRemove}
                        onMessage={(friend) => { setChatFriend(friend); setChatMessages([]); setChatError(""); setShowFriends(false); }}
                      />
                    ))
                  ) : (
                    <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', padding: '20px 0', fontSize: '13px' }}>
                      No friends yet
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Notifications Dropdown */}
            <div style={{ position: 'relative' }} ref={notificationsRef}>
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '36px', height: '36px', color: 'rgba(255,255,255,0.7)',
                position: 'relative', transition: 'color 0.2s'
              }}
              onMouseOver={e => e.currentTarget.style.color = 'white'}
              onMouseOut={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <div style={{
                  position: 'absolute', top: 2, right: 4, background: '#ef4444',
                  color: 'white', fontSize: '10px', fontWeight: 'bold',
                  borderRadius: '50%', width: '16px', height: '16px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 0 0 2px rgba(0,0,0,0.8)'
                }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </div>
              )}
            </button>

            {showNotifications && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 10px)', right: 0,
                background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px', padding: '12px', width: '320px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                display: 'flex', flexDirection: 'column', gap: '8px',
                maxHeight: '400px', overflowY: 'auto'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px', marginBottom: '4px' }}>
                  <h3 style={{ margin: 0, fontSize: '14px', color: 'white' }}>Notifications</h3>
                  {unreadCount > 0 && (
                    <button 
                      onClick={() => handleMarkAsRead(null)}
                      style={{ background: 'none', border: 'none', color: 'var(--primary-accent)', fontSize: '12px', cursor: 'pointer' }}
                    >
                      Mark all as read
                    </button>
                  )}
                </div>
                {notifications.length > 0 ? (
                  notifications.map(n => (
                    <div 
                      key={n.id} 
                      onClick={() => n.type === "direct_message" ? openDirectMessage(n) : (!n.read && handleMarkAsRead(n.id))}
                      style={{ 
                        padding: '10px', borderRadius: '6px', 
                        background: n.read ? 'transparent' : 'rgba(255,255,255,0.05)',
                        borderLeft: n.read ? '3px solid transparent' : '3px solid var(--primary-accent)',
                        cursor: 'pointer', transition: 'background 0.2s'
                      }}
                      onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                      onMouseOut={e => e.currentTarget.style.background = n.read ? 'transparent' : 'rgba(255,255,255,0.05)'}
                    >
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px', textTransform: 'capitalize' }}>
                        {n.type.replace('_', ' ')} • {new Date(n.createdAt).toLocaleDateString()}
                      </div>
                      <div style={{ fontSize: '13px', color: 'white', lineHeight: '1.4' }}>
                        {n.message}
                      </div>
                      {n.type === 'friend_request' && n.status === 'pending' && (
                        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleFriendRequestAction(n.id, 'accept'); }}
                            style={{ flex: 1, padding: '6px', background: 'var(--primary-accent)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                          >
                            Accept
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleFriendRequestAction(n.id, 'decline'); }}
                            style={{ flex: 1, padding: '6px', background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                          >
                            Decline
                          </button>
                        </div>
                      )}
                      {n.type === 'room_invite' && !n.read && (
                        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleMarkAsRead(n.id); setShowNotifications(false); navigate(`/code/${n.roomId}`); }}
                            style={{ flex: 1, padding: '6px', background: 'var(--primary-accent)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                          >
                            Join Room
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleMarkAsRead(n.id); }}
                            style={{ flex: 1, padding: '6px', background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                          >
                            Ignore
                          </button>
                        </div>
                      )}
                      {n.type === 'direct_message' && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); openDirectMessage(n); }}
                          style={{ marginTop: '8px', width: '100%', padding: '6px', background: 'var(--primary-accent)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                        >
                          Open Chat
                        </button>
                      )}
                    </div>
                  ))
                ) : (
                  <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', padding: '20px 0', fontSize: '13px' }}>
                    No new notifications
                  </div>
                )}
              </div>
            )}
            </div>
          </>
        )}

        {chatFriend && (
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 1200, background: 'rgba(2, 6, 23, 0.68)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
            onClick={() => setChatFriend(null)}
          >
            <div
              style={{ width: 'min(420px, 100%)', maxHeight: 'min(620px, 90vh)', display: 'flex', flexDirection: 'column', background: '#0f172a', border: '1px solid rgba(255,255,255,0.14)', borderRadius: '12px', boxShadow: '0 24px 70px rgba(0,0,0,0.5)', overflow: 'hidden' }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <div>
                  <strong style={{ color: 'white', fontSize: '16px' }}>Chat with {chatFriend.name}</strong>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', marginTop: '3px' }}>Messages disappear from the preview when this window closes.</div>
                </div>
                <button type="button" onClick={() => setChatFriend(null)} aria-label="Close chat" style={{ border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.7)', fontSize: '22px', cursor: 'pointer' }}>×</button>
              </div>
              <div style={{ flex: 1, minHeight: '220px', maxHeight: '410px', overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {chatMessages.length === 0 && <div style={{ margin: 'auto', color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>Start a private conversation.</div>}
                {chatMessages.map(message => {
                  const outgoing = message.senderId === user.uid;
                  return <div key={message.id} style={{ alignSelf: outgoing ? 'flex-end' : 'flex-start', maxWidth: '82%', padding: '9px 11px', borderRadius: outgoing ? '12px 12px 3px 12px' : '12px 12px 12px 3px', background: outgoing ? 'rgba(249,115,22,0.22)' : 'rgba(255,255,255,0.08)', color: 'white', fontSize: '13px', lineHeight: 1.4 }}>
                    {message.text}
                  </div>;
                })}
              </div>
              {chatError && <div style={{ color: '#fca5a5', fontSize: '12px', padding: '0 16px 8px' }}>{chatError}</div>}
              <div style={{ display: 'flex', gap: '8px', padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <input
                  value={chatText}
                  onChange={e => setChatText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendDirectMessage(); } }}
                  placeholder="Write a private message..."
                  maxLength={1000}
                  style={{ flex: 1, minWidth: 0, background: 'rgba(0,0,0,0.22)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: '7px', color: 'white', padding: '9px 10px', outline: 'none' }}
                />
                <button type="button" onClick={sendDirectMessage} disabled={chatBusy || !chatText.trim()} style={{ border: 'none', borderRadius: '7px', padding: '0 14px', background: 'var(--primary-accent)', color: 'white', fontWeight: 700, cursor: chatBusy || !chatText.trim() ? 'not-allowed' : 'pointer', opacity: chatBusy || !chatText.trim() ? 0.55 : 1 }}>Send</button>
              </div>
            </div>
          </div>
        )}
        
        {isSignedIn ? (
          <div style={{ position: 'relative' }} ref={dropdownRef}>
            <button 
              onClick={() => setShowDropdown(!showDropdown)}
              style={{
                background: 'transparent', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '8px', padding: '0',
                borderRadius: '50%', overflow: 'hidden', width: '36px', height: '36px',
                border: emotionId ? '2px solid rgba(255,255,255,0.2)' : 'none'
              }}
            >
              {emotionId ? (
                <img 
                  src={`${API_URL}/api/emotions/${emotionId}/image`} 
                  alt="Avatar" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
              ) : (
                <UserCircle2 size={32} color="#f97316" strokeWidth={1.5} />
              )}
            </button>
            
            {showDropdown && (
              <div className="navbar-profile-menu" style={{
                position: 'absolute', top: 'calc(100% + 10px)', right: 0,
                background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px', padding: '8px', minWidth: '150px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                display: 'flex', flexDirection: 'column', gap: '4px'
              }}>
                <button 
                  onClick={() => { setShowDropdown(false); navigate('/profile'); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '8px 12px', background: 'transparent', border: 'none',
                    color: 'white', cursor: 'pointer', borderRadius: '4px', textAlign: 'left',
                    fontSize: '14px', width: '100%'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <User size={16} /> View Profile
                </button>
                <button 
                  onClick={() => { setShowDropdown(false); handleLogout(); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '8px 12px', background: 'transparent', border: 'none',
                    color: '#ef4444', cursor: 'pointer', borderRadius: '4px', textAlign: 'left',
                    fontSize: '14px', width: '100%'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <LogOut size={16} /> Logout
                </button>
              </div>
            )}
          </div>
        ) : (
          <button onClick={() => navigate('/')} style={{ 
            padding: '8px 20px', fontSize: '14px', background: 'var(--primary)',
            border: 'none', color: '#1b1020', borderRadius: '8px',
            cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s'
          }}>
            Login
          </button>
        )}
      </div>

      {friendToRemove && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '20px' }}>
          <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', padding: '24px', borderRadius: '8px', textAlign: 'center', width: '300px' }}>
            <h3 style={{ margin: '0 0 16px 0', color: 'white' }}>Remove Friend?</h3>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', marginBottom: '24px' }}>
              Are you sure you want to remove {friendToRemove.name} from your friends list?
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button className="btn-secondary" onClick={() => setFriendToRemove(null)} disabled={removingFriend}>
                Cancel
              </button>
              <button className="btn-primary" style={{ background: '#ef4444', borderColor: '#ef4444' }} onClick={() => handleRemoveFriend(friendToRemove.id)} disabled={removingFriend}>
                {removingFriend ? "Removing..." : "Yes, Remove"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </header>
  );
}
