import React, { useState, useEffect } from 'react';
import { 
  Loader2, Shield, X, ToggleRight, ToggleLeft, Edit, Trash2, 
  Users, MessageSquare, Search, Send, Play, Key, User, Lock, Sparkles, Tv
} from 'lucide-react';
import { API_BASE_URL } from '../config';
import { formatBDMessageTime } from '../utils/dateUtils';

export function AdminDashboardPage({ token, user, onClose, showConfirm, showAlert, onOpenChat, socket, setPopupVideo, logout }) {
  const [stats, setStats] = useState({ totalUsers: 0, totalChats: 0, totalMessages: 0 });
  const [settings, setSettings] = useState({ signupEnabled: true, inviteOnlyEnabled: false, inviteCodes: [], jellyfinUrl: '', jellyfinApiKey: '' });
  const [users, setUsers] = useState([]);

  const [jellyfinUrlInput, setJellyfinUrlInput] = useState('');
  const [jellyfinUsernameInput, setJellyfinUsernameInput] = useState('');
  const [jellyfinPasswordInput, setJellyfinPasswordInput] = useState('');
  const [jellyfinEnabledInput, setJellyfinEnabledInput] = useState(false);
  const [jellyfinSaveSuccess, setJellyfinSaveSuccess] = useState('');
  const [jellyfinSaveError, setJellyfinSaveError] = useState('');

  const handleToggleGlobalJellyfin = async () => {
    const nextState = !jellyfinEnabledInput;
    setJellyfinEnabledInput(nextState);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          jellyfinEnabled: nextState
        })
      });
      if (response.ok) {
        setSettings(prev => ({ ...prev, jellyfinEnabled: nextState }));
      } else {
        setJellyfinEnabledInput(!nextState);
        showAlert('Failed to update global Jellyfin setting.');
      }
    } catch (err) {
      console.error(err);
      setJellyfinEnabledInput(!nextState);
      showAlert('Error connecting to server.');
    }
  };

  const handleToggleUserJellyfin = async (targetUser) => {
    const nextEnabled = !targetUser.jellyfinEnabled;
    setUsers(prev => prev.map(u => u._id === targetUser._id ? { ...u, jellyfinEnabled: nextEnabled } : u));
    try {
      const response = await fetch(`${API_BASE_URL}/admin/users/${targetUser._id}/toggle-jellyfin`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ enabled: nextEnabled })
      });
      if (response.ok) {
        fetchAdminData();
      } else {
        const data = await response.json();
        setUsers(prev => prev.map(u => u._id === targetUser._id ? { ...u, jellyfinEnabled: targetUser.jellyfinEnabled } : u));
        showAlert(data.error || 'Failed to toggle Jellyfin permission.');
      }
    } catch (err) {
      console.error(err);
      setUsers(prev => prev.map(u => u._id === targetUser._id ? { ...u, jellyfinEnabled: targetUser.jellyfinEnabled } : u));
      showAlert('Error connecting to server.');
    }
  };
  
  const [activeTab, setActiveTab] = useState('system'); // 'system', 'groups', 'conversations'
  const [groups, setGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);

  const [user1Id, setUser1Id] = useState('');
  const [user2Id, setUser2Id] = useState('');
  const [conversationHistory, setConversationHistory] = useState([]);
  const [conversationChat, setConversationChat] = useState(null);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [conversationError, setConversationError] = useState('');

  const [adminMessageInput, setAdminMessageInput] = useState('');

  useEffect(() => {
    if (!socket || !conversationChat) return;

    // Join the room to receive real-time messages
    socket.emit('join_chat', conversationChat._id);

    const handleReceiveMessage = (message) => {
      if (message.chat === conversationChat._id) {
        setConversationHistory(prev => {
          if (prev.some(m => m._id === message._id)) return prev;
          return [...prev, message];
        });
      }
    };

    socket.on('receive_message', handleReceiveMessage);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
      socket.emit('leave_chat', conversationChat._id);
    };
  }, [socket, conversationChat?._id]);

  const handleSendAdminMessage = (e) => {
    e.preventDefault();
    if (!adminMessageInput.trim() || !conversationChat || !socket) return;

    socket.emit('send_message', {
      chatId: conversationChat._id,
      content: adminMessageInput.trim()
    });

    // Optimistically update or wait for event
    setAdminMessageInput('');
  };

  const fetchGroups = async () => {
    setLoadingGroups(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/groups`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setGroups(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingGroups(false);
    }
  };

  const handleDeleteGroup = async (groupId, groupName) => {
    if (!await showConfirm(`Are you sure you want to delete group "${groupName}"? This will permanently delete the group and all its messages for all members.`)) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/admin/groups/${groupId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setGroups(prev => prev.filter(g => g._id !== groupId));
        fetchAdminData(); // Refresh stats
      } else {
        const data = await response.json();
        showAlert(data.error || 'Failed to delete group.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchConversation = async () => {
    if (!user1Id || !user2Id) {
      setConversationError('Please select both users.');
      return;
    }
    if (user1Id === user2Id) {
      setConversationError('Please select two different users.');
      return;
    }

    setLoadingConversation(true);
    setConversationError('');
    setConversationChat(null);
    setConversationHistory([]);

    try {
      const response = await fetch(`${API_BASE_URL}/admin/conversation/${user1Id}/${user2Id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setConversationChat(data.chat);
        setConversationHistory(data.messages);
      } else {
        setConversationError(data.error || 'No conversation history found between these two users.');
      }
    } catch (err) {
      setConversationError('Error fetching conversation.');
    } finally {
      setLoadingConversation(false);
    }
  };

  const handleAdminDeleteMessage = async (messageId) => {
    if (!await showConfirm('Are you sure you want to permanently delete this message? This will erase it from the database.')) return;
    try {
      const response = await fetch(`${API_BASE_URL}/admin/messages/${messageId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setConversationHistory(prev => prev.filter(msg => msg._id !== messageId));
      } else {
        const err = await response.json();
        showAlert(err.error || 'Failed to delete message.');
      }
    } catch (err) {
      console.error(err);
      showAlert('Error deleting message.');
    }
  };

  const handleAdminDeleteConversation = async (chatId) => {
    const user1Name = (users || []).find(u => u._id === user1Id)?.username;
    const user2Name = (users || []).find(u => u._id === user2Id)?.username;
    if (!await showConfirm(`Are you sure you want to permanently delete the entire conversation between ${user1Name} and ${user2Name}? All messages and records will be deleted from the database.`)) return;

    try {
      const response = await fetch(`${API_BASE_URL}/admin/conversation/${chatId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setConversationChat(null);
        setConversationHistory([]);
      } else {
        const err = await response.json();
        showAlert(err.error || 'Failed to delete conversation.');
      }
    } catch (err) {
      console.error(err);
      showAlert('Error deleting conversation.');
    }
  };

  useEffect(() => {
    if (activeTab === 'groups') {
      fetchGroups();
    }
  }, [activeTab]);
  
  // Admin form inputs
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newJellyfinUsername, setNewJellyfinUsername] = useState('');
  const [newJellyfinPassword, setNewJellyfinPassword] = useState('');
  const [createUserRole, setCreateUserRole] = useState('Regular');
  const [userError, setUserError] = useState('');
  const [userSuccess, setUserSuccess] = useState('');

  const [loading, setLoading] = useState(true);

  // Edit User States
  const [editingUser, setEditingUser] = useState(null);
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState('Regular');
  const [editUserError, setEditUserError] = useState('');
  const [editUserSuccess, setEditUserSuccess] = useState('');

  const openEditUserModal = (u) => {
    if (u.username === 'rkdarpan' && user?.username !== 'rkdarpan') {
      showAlert("The primary system administrator account (rkdarpan) cannot be edited by other users.");
      return;
    }
    if (user?.role === 'Admin') {
      const isSelf = u._id === user?.id || u._id === user?._id;
      if (!isSelf) {
        if (u.role === 'Root') {
          showAlert("You do not have permission to edit root class user");
          return;
        }
        if (u.role === 'Admin' || u.isAdmin) {
          showAlert("You do not have permission to edit Admin class user");
          return;
        }
      }
    }
    setEditingUser(u);
    setEditUsername(u.username);
    setEditPassword('');
    setEditRole(u.role || (u.isAdmin ? 'Root' : 'Regular'));
    setEditUserError('');
    setEditUserSuccess('');
  };

  const handleEditUserSubmit = async (e) => {
    e.preventDefault();
    setEditUserError('');
    setEditUserSuccess('');

    if (!editUsername.trim()) {
      setEditUserError('Username cannot be empty.');
      return;
    }

    const payload = {
      username: editUsername,
      role: editRole
    };

    if (editPassword.trim()) {
      if (editPassword.length < 6) {
        setEditUserError('Password must be at least 6 characters.');
        return;
      }
      payload.password = editPassword;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/admin/users/${editingUser._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (response.ok) {
        setEditUserSuccess('User updated successfully!');
        setEditingUser(null);
        fetchAdminData();
      } else {
        setEditUserError(data.error || 'Failed to update user.');
      }
    } catch (err) {
      setEditUserError('Network error while updating user.');
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/settings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats || { totalUsers: 0, totalChats: 0, totalMessages: 0 });
        setSettings(data.settings || { signupEnabled: true, inviteOnlyEnabled: false, inviteCodes: [], jellyfinUrl: '', jellyfinApiKey: '' });
        setJellyfinUrlInput(data.settings?.jellyfinUrl || '');
        setJellyfinUsernameInput(data.settings?.jellyfinUsername || '');
        setJellyfinPasswordInput(data.settings?.jellyfinPassword ? '********' : '');
        setJellyfinEnabledInput(Boolean(data.settings?.jellyfinEnabled));
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveJellyfinConfig = async (e) => {
    e.preventDefault();
    setJellyfinSaveSuccess('');
    setJellyfinSaveError('');
    try {
      const response = await fetch(`${API_BASE_URL}/admin/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          jellyfinUrl: jellyfinUrlInput,
          jellyfinUsername: jellyfinUsernameInput,
          jellyfinPassword: jellyfinPasswordInput,
          jellyfinEnabled: jellyfinEnabledInput
        })
      });

      if (response.ok) {
        setJellyfinSaveSuccess('Jellyfin settings saved successfully!');
        setSettings(prev => ({
          ...prev,
          jellyfinUrl: jellyfinUrlInput,
          jellyfinUsername: jellyfinUsernameInput,
          jellyfinPassword: jellyfinPasswordInput,
          jellyfinEnabled: jellyfinEnabledInput
        }));
        setTimeout(() => setJellyfinSaveSuccess(''), 4000);
      } else {
        const errData = await response.json();
        setJellyfinSaveError(errData.error || 'Failed to save Jellyfin settings.');
      }
    } catch (err) {
      console.error(err);
      setJellyfinSaveError('Error connecting to server.');
    }
  };

  const handleToggleSetting = async (key, currentValue) => {
    const updatedValue = !currentValue;
    const body = key === 'signupEnabled' 
      ? { signupEnabled: updatedValue } 
      : { inviteOnlyEnabled: updatedValue };

    try {
      const response = await fetch(`${API_BASE_URL}/admin/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        setSettings(prev => ({ ...prev, [key]: updatedValue }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleGenerateInviteCode = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/invite-codes`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(prev => ({ ...prev, inviteCodes: data.inviteCodes }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteInviteCode = async (code) => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/invite-codes/${code}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(prev => ({ ...prev, inviteCodes: data.inviteCodes }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setUserError('');
    setUserSuccess('');

    if (!newUsername.trim() || !newPassword) {
      setUserError('Fill out all fields.');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          username: newUsername,
          password: newPassword,
          role: createUserRole,
          jellyfinUsername: newJellyfinUsername,
          jellyfinPassword: newJellyfinPassword
        })
      });

      const data = await response.json();
      if (response.ok) {
        setUserSuccess(`User "${data.user.username}" created successfully!`);
        setNewUsername('');
        setNewPassword('');
        setNewJellyfinUsername('');
        setNewJellyfinPassword('');
        setCreateUserRole('Regular');
        fetchAdminData();
      } else {
        setUserError(data.error || 'Failed to create user.');
      }
    } catch (err) {
      setUserError('Network error while creating user.');
    }
  };

  const handleDeleteUser = async (u) => {
    const userId = u._id;
    const username = u.username;

    if (userId === user?.id || userId === user?._id) {
      showAlert("You can't delete yourself");
      return;
    }

    if (username === 'rkdarpan') {
      showAlert("The primary system administrator account (rkdarpan) cannot be deleted.");
      return;
    }

    if (user?.role === 'Admin') {
      if (u.role === 'Root') {
        showAlert("You do not have permission to delete root class user");
        return;
      }
      if (u.role === 'Admin' || u.isAdmin) {
        showAlert("You do not have permission to delete Admin class user");
        return;
      }
    }

    if (!await showConfirm(`Are you sure you want to delete user "${username}"? All their messages will be cleaned up.`)) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setUsers(prev => prev.filter(u => u._id !== userId));
        fetchAdminData();
      } else {
        const data = await response.json();
        showAlert(data.error || 'Failed to delete user.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="admin-loading">
        <Loader2 className="animate-spin" size={32} />
        <span>Loading Alaap Panel Configs...</span>
      </div>
    );
  }

  return (
    <div className="admin-pane animate-fade-in">
      <div className="admin-header border-b">
        <div className="admin-title-area">
          <Shield className="admin-header-icon" />
          <div>
            <h2>Alaap Control Center</h2>
            <p>Manage system metrics, security, registration rules, and users.</p>
          </div>
        </div>
        <button className="icon-btn close-admin-btn" onClick={onClose} title="Back to Chats">
          <X size={24} />
        </button>
      </div>

      <div className="admin-tabs border-b" style={{ display: 'flex', gap: '8px', padding: '0 24px', background: 'rgba(0,0,0,0.1)' }}>
        <button 
          className={`admin-tab-btn ${activeTab === 'system' ? 'active' : ''}`}
          onClick={() => setActiveTab('system')}
          style={{ padding: '12px 16px', borderBottom: activeTab === 'system' ? '2px solid var(--primary)' : '2px solid transparent', background: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none', cursor: 'pointer', fontWeight: '600', color: activeTab === 'system' ? 'var(--text-primary)' : 'var(--text-muted)' }}
        >
          System & Users
        </button>
        {user?.role !== 'Admin' && (
          <>
            <button 
              className={`admin-tab-btn ${activeTab === 'groups' ? 'active' : ''}`}
              onClick={() => setActiveTab('groups')}
              style={{ padding: '12px 16px', borderBottom: activeTab === 'groups' ? '2px solid var(--primary)' : '2px solid transparent', background: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none', cursor: 'pointer', fontWeight: '600', color: activeTab === 'groups' ? 'var(--text-primary)' : 'var(--text-muted)' }}
            >
              Group Chats
            </button>
            <button 
              className={`admin-tab-btn ${activeTab === 'conversations' ? 'active' : ''}`}
              onClick={() => setActiveTab('conversations')}
              style={{ padding: '12px 16px', borderBottom: activeTab === 'conversations' ? '2px solid var(--primary)' : '2px solid transparent', background: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none', cursor: 'pointer', fontWeight: '600', color: activeTab === 'conversations' ? 'var(--text-primary)' : 'var(--text-muted)' }}
            >
              User Conversations
            </button>
          </>
        )}
      </div>

      {activeTab === 'system' && (
        <div className="admin-content-grid">
        {/* Left Side: Stats & Settings */}
        <div className="admin-left-col">
          {/* Stats Section */}
          <div className="admin-card glass-panel stats-card">
            <h3>System Health</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-val">{stats.totalUsers}</span>
                <span className="stat-label">Registered Users</span>
              </div>
              <div className="stat-item">
                <span className="stat-val">{stats.totalChats}</span>
                <span className="stat-label">Total Chats</span>
              </div>
              <div className="stat-item">
                <span className="stat-val">{stats.totalMessages}</span>
                <span className="stat-label">Messages Exchanged</span>
              </div>
            </div>
          </div>

          {/* Config Controls */}
          <div className="admin-card glass-panel config-card">
            <h3>Registration Security</h3>
            
            <div className="toggle-setting-row">
              <div className="setting-details">
                <h4>Allow Public Sign Up</h4>
                <p>Allow new users to register an account.</p>
              </div>
              <button 
                onClick={() => handleToggleSetting('signupEnabled', settings?.signupEnabled)}
                className={`toggle-btn ${settings?.signupEnabled ? 'active' : ''}`}
              >
                {settings?.signupEnabled ? <ToggleRight size={38} className="toggle-on" /> : <ToggleLeft size={38} className="toggle-off" />}
              </button>
            </div>

            <div className="toggle-setting-row border-t pt-4 mt-4">
              <div className="setting-details">
                <h4>Invite-Only Sign Up</h4>
                <p>Require an active code during registration (only matters if Sign Up is ON).</p>
              </div>
              <button 
                onClick={() => handleToggleSetting('inviteOnlyEnabled', settings?.inviteOnlyEnabled)}
                className={`toggle-btn ${settings?.inviteOnlyEnabled ? 'active' : ''}`}
                disabled={!settings?.signupEnabled}
              >
                {settings?.inviteOnlyEnabled ? <ToggleRight size={38} className="toggle-on" /> : <ToggleLeft size={38} className="toggle-off" />}
              </button>
            </div>

            {/* Invite Codes Generation */}
            {settings?.inviteOnlyEnabled && settings?.signupEnabled && (
              <div className="invite-codes-manager border-t pt-4 mt-4 animate-fade-in">
                <div className="invite-manager-header">
                  <h4>Invite Codes</h4>
                  <button className="btn btn-secondary btn-sm" onClick={handleGenerateInviteCode}>
                    Generate Code
                  </button>
                </div>
                
                <div className="codes-list scroll-container">
                  {(settings?.inviteCodes || []).length === 0 ? (
                    <span className="no-codes-msg">No active invite codes. Generate one above.</span>
                  ) : (
                    (settings?.inviteCodes || []).map(code => (
                      <div key={code} className="code-badge-item">
                        <span className="code-text font-mono">{code}</span>
                        <button className="delete-code-btn" onClick={() => handleDeleteInviteCode(code)}>
                          <X size={14} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Jellyfin Integration Config */}
          <div className="admin-card glass-panel config-card mt-6" style={{ marginTop: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Tv size={20} style={{ color: '#00a4dc' }} />
              <h3 style={{ margin: 0 }}>Jellyfin Server Integration</h3>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Configure your self-hosted Jellyfin media server and enable or disable the feature globally across Alaap.
            </p>

            {jellyfinSaveSuccess && <div className="admin-alert success">{jellyfinSaveSuccess}</div>}
            {jellyfinSaveError && <div className="admin-alert error">{jellyfinSaveError}</div>}

            {user?.role === 'Root' && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(0, 164, 220, 0.08)', borderRadius: '10px', border: '1px solid rgba(0, 164, 220, 0.2)', marginBottom: '16px' }}>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '13px', color: '#00a4dc' }}>Jellyfin Feature (Global Switch)</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Master switch. Disabled by default for all users.</div>
                </div>
                <button
                  type="button"
                  onClick={handleToggleGlobalJellyfin}
                  style={{
                    padding: '6px 14px',
                    fontWeight: '600',
                    fontSize: '12px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    background: jellyfinEnabledInput ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                    border: jellyfinEnabledInput ? '1px solid rgba(34, 197, 94, 0.5)' : '1px solid rgba(239, 68, 68, 0.5)',
                    color: jellyfinEnabledInput ? '#4ade80' : '#f87171'
                  }}
                >
                  {jellyfinEnabledInput ? '✓ Enabled' : '✕ Disabled'}
                </button>
              </div>
            )}

            <form onSubmit={handleSaveJellyfinConfig} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                  Jellyfin Server Address (URL)
                </label>
                <input 
                  type="text" 
                  placeholder="e.g. http://192.168.1.50:8096 or https://jellyfin.example.com"
                  className="chat-text-input" 
                  style={{ width: '100%', fontSize: '13px', padding: '10px 14px' }}
                  value={jellyfinUrlInput}
                  onChange={(e) => setJellyfinUrlInput(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'rgba(255,255,255,0.8)', marginBottom: '6px' }}>
                  Jellyfin Username
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter Jellyfin Username..."
                  value={jellyfinUsernameInput}
                  onChange={(e) => setJellyfinUsernameInput(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px' }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'rgba(255,255,255,0.8)', marginBottom: '6px' }}>
                  Jellyfin Password
                </label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Enter Jellyfin Password..."
                  value={jellyfinPasswordInput}
                  onChange={(e) => setJellyfinPasswordInput(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                <button type="submit" className="btn btn-primary btn-sm" style={{ background: '#00a4dc', borderColor: '#00a4dc', color: '#fff', fontWeight: '600', padding: '8px 16px' }}>
                  Save Jellyfin Configuration
                </button>
              </div>
            </form>
          </div>

          {/* Quick Create User Form */}
          <div className="admin-card glass-panel create-user-card">
            <h3>Provision User Account</h3>
            {userError && <div className="admin-alert error">{userError}</div>}
            {userSuccess && <div className="admin-alert success">{userSuccess}</div>}
            
            <form onSubmit={handleCreateUser} className="admin-create-form" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div className="form-group-row" style={{ display: 'flex', gap: '8px' }}>
                <input 
                  type="text" 
                  placeholder="Alaap Username..." 
                  className="input-field input-sm"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  style={{ flex: 1 }}
                />
                <input 
                  type="password" 
                  placeholder="Alaap Password..." 
                  className="input-field input-sm"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{ flex: 1 }}
                />
              </div>

              <div className="form-group-row" style={{ display: 'flex', gap: '8px' }}>
                <input 
                  type="text" 
                  placeholder="Jellyfin Username (optional)..." 
                  className="input-field input-sm"
                  value={newJellyfinUsername}
                  onChange={(e) => setNewJellyfinUsername(e.target.value)}
                  style={{ flex: 1 }}
                />
                <input 
                  type="password" 
                  placeholder="Jellyfin Password (optional)..." 
                  className="input-field input-sm"
                  value={newJellyfinPassword}
                  onChange={(e) => setNewJellyfinPassword(e.target.value)}
                  style={{ flex: 1 }}
                />
              </div>
              
              <div className="admin-checkbox-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {user?.role !== 'Admin' ? (
                  <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 0 }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>User Class:</label>
                    <select 
                      className="input-field input-sm"
                      value={createUserRole}
                      onChange={(e) => setCreateUserRole(e.target.value)}
                      style={{ minWidth: '120px', padding: '4px 8px', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                    >
                      <option value="Regular">Regular</option>
                      <option value="Admin">Admin</option>
                      <option value="Root">Root</option>
                    </select>
                  </div>
                ) : <div />}
                <button type="submit" className="btn btn-primary btn-sm">Create User</button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Side: Users List */}
        <div className="admin-right-col">
          <div className="admin-card glass-panel users-table-card">
            <h3>Registered User Accounts</h3>
            <div className="table-wrapper users-table-wrapper scroll-container">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Role</th>
                    <th>Jellyfin Access</th>
                    <th>Status</th>
                    <th>Registered</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(users || []).map(u => (
                    <tr key={u._id}>
                      <td className="user-td font-semibold">
                        {u.username}
                      </td>
                      <td>
                        <span className={`role-badge ${u.role === 'Admin' ? 'admin subadmin' : u.isAdmin ? 'admin' : 'user'}`}>
                          {u.role || (u.isAdmin ? 'Root' : 'Regular')}
                        </span>
                      </td>
                      <td>
                        {u.role === 'Root' || u.isAdmin ? (
                          <span style={{ fontSize: '0.75rem', color: '#4ade80', fontWeight: '600', background: 'rgba(34,197,94,0.1)', padding: '2px 8px', borderRadius: '8px', border: '1px solid rgba(34,197,94,0.2)' }}>
                            Root (Always On)
                          </span>
                        ) : u.jellyfinEnabled ? (
                          <span style={{ fontSize: '0.75rem', color: '#00a4dc', fontWeight: '600', background: 'rgba(0,164,220,0.1)', padding: '2px 8px', borderRadius: '8px', border: '1px solid rgba(0,164,220,0.2)' }}>
                            Enabled
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                            Disabled
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={`status-text ${u.status}`}>
                          {u.status === 'online' ? '● Online' : '○ Offline'}
                        </span>
                      </td>
                      <td className="time-td text-sm text-muted">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                      </td>
                      <td style={{ display: 'flex', gap: '8px' }}>
                        {user?.role === 'Root' && u.role !== 'Root' && !u.isAdmin && (
                          <button 
                            type="button"
                            className="icon-btn" 
                            onClick={() => handleToggleUserJellyfin(u)}
                            title={u.jellyfinEnabled ? "Disable Jellyfin access for this user" : "Enable Jellyfin access for this user"}
                            style={{ 
                              width: '32px', 
                              height: '32px', 
                              padding: '0', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              borderRadius: 'var(--radius-md)',
                              background: u.jellyfinEnabled ? 'rgba(0, 164, 220, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                              border: u.jellyfinEnabled ? '1px solid rgba(0, 164, 220, 0.4)' : '1px solid var(--glass-border)',
                              color: u.jellyfinEnabled ? '#00a4dc' : 'var(--text-muted)'
                            }}
                          >
                            <Tv size={15} />
                          </button>
                        )}
                        <button 
                          className="icon-btn" 
                          onClick={() => openEditUserModal(u)}
                          title="Edit User"
                          style={{ width: '32px', height: '32px', padding: '0' }}
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          className="delete-user-btn" 
                          onClick={() => handleDeleteUser(u)}
                          title="Delete User"
                          style={{ width: '32px', height: '32px', padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer', transition: 'all var(--transition-fast)' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      )}

      {activeTab === 'groups' && (
        <div className="admin-groups-view animate-fade-in" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="admin-card glass-panel" style={{ padding: '20px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Group Chats Registry</h3>
            {loadingGroups ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '20px' }}>
                <Loader2 className="animate-spin" size={20} />
                <span>Fetching groups...</span>
              </div>
            ) : groups.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No group chats created yet.</p>
            ) : (
              <div className="table-wrapper scroll-container">
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>Group Name</th>
                      <th>Creator</th>
                      <th>Members</th>
                      <th>Created At</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(groups || []).map(g => (
                      <tr key={g._id}>
                        <td className="user-td font-semibold">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div className="avatar" style={{ width: '32px', height: '32px', fontSize: '0.8rem' }}>
                              {g.groupPic ? <img src={g.groupPic} alt={g.name} /> : <Users size={16} />}
                            </div>
                            <span>{g.name}</span>
                          </div>
                        </td>
                        <td>{g.creator?.username || g.creator || 'System'}</td>
                        <td>{g.members?.length || 0} members</td>
                        <td className="time-td text-sm text-muted">
                          {g.createdAt ? new Date(g.createdAt).toLocaleDateString() : 'N/A'}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button 
                              className="btn btn-primary btn-sm"
                              onClick={() => onOpenChat(g)}
                              style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              <MessageSquare size={14} />
                              <span>Open Chat</span>
                            </button>
                            <button 
                              className="btn btn-danger btn-sm"
                              onClick={() => handleDeleteGroup(g._id, g.name)}
                              style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              <Trash2 size={14} />
                              <span>Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'conversations' && (
        <div className="admin-conversations-view animate-fade-in" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="admin-card glass-panel" style={{ padding: '20px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Intercept Direct Conversation</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Select any two users to view their private conversation history.
            </p>
            
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '20px' }}>
              <div className="form-group" style={{ flex: '1', minWidth: '200px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>User A</label>
                <select 
                  className="input-field" 
                  value={user1Id}
                  onChange={(e) => setUser1Id(e.target.value)}
                  style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                >
                  <option value="">-- Select User A --</option>
                  {users.filter(u => u._id !== user2Id).map(u => (
                    <option key={u._id} value={u._id}>{u.username}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ flex: '1', minWidth: '200px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>User B</label>
                <select 
                  className="input-field" 
                  value={user2Id}
                  onChange={(e) => setUser2Id(e.target.value)}
                  style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                >
                  <option value="">-- Select User B --</option>
                  {users.filter(u => u._id !== user1Id).map(u => (
                    <option key={u._id} value={u._id}>{u.username}</option>
                  ))}
                </select>
              </div>

              <button 
                className="btn btn-primary"
                onClick={fetchConversation}
                disabled={!user1Id || !user2Id || user1Id === user2Id}
                style={{ height: '42px', padding: '0 24px', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Search size={16} />
                <span>Intercept Chat</span>
              </button>
            </div>

            {conversationError && (
              <div className="admin-alert error" style={{ margin: '10px 0 0 0' }}>
                {conversationError}
              </div>
            )}
          </div>

          {loadingConversation && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '20px' }}>
              <Loader2 className="animate-spin" size={20} />
              <span>Fetching conversation history...</span>
            </div>
          )}

          {!loadingConversation && conversationChat && (
            <div className="admin-card glass-panel animate-fade-in" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--glass-border)', paddingBottom: '12px' }}>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>
                  Conversation: {(users || []).find(u => u._id === user1Id)?.username} ↔ {(users || []).find(u => u._id === user2Id)?.username}
                </h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {conversationHistory.length} messages found
                  </span>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => handleAdminDeleteConversation(conversationChat._id)}
                    style={{ padding: '8px 12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Trash2 size={12} />
                    <span>Delete Conversation</span>
                  </button>
                </div>
              </div>

              <div 
                className="scroll-container" 
                style={{ 
                  maxHeight: '400px', 
                  overflowY: 'auto', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '12px', 
                  padding: '16px', 
                  background: 'rgba(0,0,0,0.2)', 
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--glass-border)'
                }}
              >
                {(!conversationHistory || conversationHistory.length === 0) ? (
                  <p style={{ textAlign: 'center', color: 'var(--text-muted)', margin: '20px 0' }}>
                    No messages exchanged between these two users yet.
                  </p>
                ) : (
                  (conversationHistory || []).map(msg => {
                    const isUser1 = msg.sender?._id === user1Id;
                    return (
                      <div 
                        key={msg._id} 
                        style={{ 
                          display: 'flex', 
                          flexDirection: 'column',
                          alignSelf: isUser1 ? 'flex-start' : 'flex-end',
                          alignItems: isUser1 ? 'flex-start' : 'flex-end',
                          maxWidth: '70%'
                        }}
                      >
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '2px' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: '600', color: isUser1 ? 'var(--primary)' : 'var(--secondary)' }}>
                            {msg.sender?.username || 'Unknown'}
                          </span>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                            {msg.createdAt ? formatBDMessageTime(msg.createdAt) : 'N/A'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <div 
                            style={{ 
                              padding: '8px 12px', 
                              borderRadius: 'var(--radius-md)', 
                              background: isUser1 ? 'var(--bg-glass)' : 'rgba(255,255,255,0.05)', 
                              border: '1px solid var(--glass-border)',
                              color: 'var(--text-primary)',
                              fontSize: '0.85rem',
                              wordBreak: 'break-word'
                            }}
                          >
                            {msg.fileUrl ? (
                              msg.fileType?.startsWith('image/') ? (
                                <img src={msg.fileUrl} alt="Lossless Upload" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '4px' }} />
                              ) : msg.fileType?.startsWith('video/') ? (
                                <div 
                                  className="attachment-video-preview-wrapper"
                                  onClick={() => setPopupVideo({ url: msg.fileUrl, name: msg.fileName })}
                                  style={{ maxWidth: '280px', maxHeight: '160px', cursor: 'pointer' }}
                                >
                                  <video 
                                    src={msg.fileUrl} 
                                    preload="metadata"
                                    className="attachment-preview-video-thumbnail"
                                  />
                                  <div className="video-play-overlay">
                                    <div className="play-button-circle" style={{ width: '40px', height: '40px' }}>
                                      <Play size={18} fill="currentColor" />
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <a href={msg.fileUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>
                                  📎 {msg.fileName}
                                </a>
                              )
                            ) : (
                              msg.content
                            )}
                          </div>
                          <button
                            type="button"
                            className="icon-btn text-rose"
                            onClick={() => handleAdminDeleteMessage(msg._id)}
                            title="Delete message permanently"
                            style={{ color: 'var(--accent-rose)', opacity: 0.7, padding: '4px', background: 'none', border: 'none', cursor: 'pointer' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              <form onSubmit={handleSendAdminMessage} style={{ display: 'flex', gap: '8px', marginTop: '12px', borderTop: '1px solid var(--glass-border)', paddingTop: '12px' }}>
                <input 
                  type="text" 
                  placeholder="Send a message to this conversation as Root..." 
                  className="input-field" 
                  value={adminMessageInput}
                  onChange={(e) => setAdminMessageInput(e.target.value)}
                  style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', flexGrow: 1 }}
                />
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={!adminMessageInput.trim()}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Send size={16} />
                  <span>Send</span>
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="modal-overlay" style={{ zIndex: '1100' }}>
          <div className="modal-container glass-panel animate-fade-in" style={{ maxWidth: '420px' }}>
            <div className="modal-header border-b">
              <h3>Edit User: {editingUser.username}</h3>
              <button className="icon-btn" onClick={() => setEditingUser(null)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleEditUserSubmit}>
              <div className="modal-body" style={{ padding: '20px' }}>
                {editUserError && <div className="admin-alert error" style={{ marginBottom: '15px' }}>{editUserError}</div>}
                {editUserSuccess && <div className="admin-alert success" style={{ marginBottom: '15px' }}>{editUserSuccess}</div>}
                
                <div className="form-group" style={{ marginBottom: '15px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Username</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '15px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>New Password (leave blank to keep current)</label>
                  <input 
                    type="password" 
                    placeholder="Enter new password..." 
                    className="input-field" 
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                  />
                </div>

                {user?.role !== 'Admin' && (
                  <div className="form-group" style={{ marginBottom: '15px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>User Class</label>
                    <select 
                      className="input-field"
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', outline: 'none' }}
                    >
                      <option value="Regular">Regular</option>
                      <option value="Admin">Admin</option>
                      <option value="Root">Root</option>
                    </select>
                  </div>
                )}
              </div>
              <div className="modal-footer border-t" style={{ padding: '15px 20px', display: 'flex', justifyContent: 'flex-end', gap: '12px', background: 'rgba(0,0,0,0.15)' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditingUser(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboardPage;
