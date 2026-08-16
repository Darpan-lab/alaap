import React, { useState } from 'react';
import { 
  Shield, Settings, Bell, LogOut, Search, X, Plus, 
  MessageSquare, Users, ChevronRight, User, MoreVertical, Trash2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { useDialog } from '../../context/DialogContext';
import { API_BASE_URL } from '../../config';
import { formatBDMessageTime, formatBDTimeOnly } from '../../utils/dateUtils';

export function Sidebar({ 
  width, 
  setIsGroupModalOpen, 
  isAdminOpen, 
  setIsAdminOpen,
  isSettingsOpen,
  setIsSettingsOpen,
  isSidebarHidden,
  onDeleteChat
}) {
  const [cardMenuOpenId, setCardMenuOpenId] = useState(null);

  React.useEffect(() => {
    const handleClickOutside = () => {
      if (cardMenuOpenId !== null) {
        setCardMenuOpenId(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [cardMenuOpenId]);

  const { user, token, logout } = useAuth();
  const { 
    chats, 
    setChats, 
    activeChat, 
    setActiveChat, 
    typingUsers, 
    notifications, 
    setNotifications, 
    showNotificationCenter, 
    setShowNotificationCenter, 
    handleOpenChat,
    playNotificationSound,
    addToast
  } = useChat();
  const { showAlert } = useDialog();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  // Search users API call
  const handleSearchUsers = async (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (val.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/users/search?username=${val}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data);
      }
    } catch (err) {
      console.error('Search users error:', err);
    }
  };

  // Start direct message API call
  const startDirectMessage = async (targetUser) => {
    try {
      const response = await fetch(`${API_BASE_URL}/chats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId: targetUser._id, isGroup: false })
      });

      if (response.ok) {
        const newChat = await response.json();
        setActiveChat(newChat);
        setChats(prev => {
          if (prev.some(c => c._id === newChat._id)) return prev;
          return [newChat, ...prev];
        });
        setSearchQuery('');
        setSearchResults([]);
      }
    } catch (err) {
      console.error('Start Direct Message failed:', err);
    }
  };

  const markAllNotificationsAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearNotificationHistory = () => {
    setNotifications([]);
  };

  const handleNotificationItemClick = (n) => {
    setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, read: true } : item));
    setShowNotificationCenter(false);
    if (n.chatId) {
      handleOpenChat(n.chatId);
    }
  };

  const formatNotificationTime = (timestamp) => {
    const d = new Date(timestamp);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getChatDetails = (chat) => {
    if (!chat) return { name: '', avatar: '', status: 'offline', isSelf: false };
    if (chat.isGroup) {
      return { 
        name: chat.name, 
        avatar: chat.name.substring(0, 2).toUpperCase(), 
        status: 'group',
        membersCount: chat.members?.length || 0,
        isSelf: false
      };
    }
    const currentId = user?._id || user?.id;
    const isSelf = !chat.isGroup && (
      chat.members?.length === 1 || 
      (chat.members?.length > 0 && chat.members.every(m => (m._id || m).toString() === currentId?.toString()))
    );

    if (isSelf) {
      const myUser = chat.members?.find(m => (m._id || m).toString() === currentId?.toString()) || user;
      const displayUsername = myUser?.username || user?.username || 'You';
      return {
        name: `${displayUsername} (You)`,
        avatar: myUser?.profilePic || displayUsername.substring(0, 2).toUpperCase(),
        status: 'online',
        isAdmin: myUser?.isAdmin,
        isSelf: true
      };
    }

    const otherUser = chat.members?.find(m => (m._id || m).toString() !== currentId?.toString());
    return {
      name: otherUser ? otherUser.username : 'Unknown User',
      avatar: otherUser?.profilePic || (otherUser ? otherUser.username.substring(0, 2).toUpperCase() : '??'),
      status: otherUser?.status || 'offline',
      isAdmin: otherUser?.isAdmin,
      isSelf: false
    };
  };

  return (
    <>
      <div 
        className={`sidebar border-r ${isSidebarHidden ? 'hidden' : ''}`} 
        style={{ width: `${width}px` }}
      >
        {/* Sidebar Header */}
        <div className="sidebar-header border-b">
          <div className="user-profile">
            <div className="avatar">
              {user?.profilePic ? (
                <img src={user.profilePic} alt={user.username} />
              ) : (
                user?.username?.substring(0, 2).toUpperCase()
              )}
              <div className="status-dot online"></div>
            </div>
            <div className="user-info">
              <h3 className="username">{user?.username}</h3>
              {user?.isAdmin && (
                <span className={`admin-badge ${user.role === 'Admin' ? 'subadmin' : ''}`}>
                  <Shield size={10} /> {user.role || 'Root'}
                </span>
              )}
            </div>
          </div>
          <div className="header-actions">
            {user?.isAdmin && (
              <button 
                className={`icon-btn ${isAdminOpen ? 'active' : ''}`} 
                title="Root Dashboard"
                onClick={() => {
                  setIsAdminOpen(!isAdminOpen);
                  setIsSettingsOpen(false);
                }}
              >
                <Shield size={20} />
              </button>
            )}
            
            {/* Notification Bell Icon */}
            <div style={{ position: 'relative' }}>
              <button 
                className={`icon-btn ${showNotificationCenter ? 'active' : ''}`} 
                title="Notifications"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowNotificationCenter(!showNotificationCenter);
                }}
              >
                <Bell size={20} />
                {notifications.filter(n => !n.read).length > 0 && (
                  <span className="notification-badge animate-pulse">
                    {notifications.filter(n => !n.read).length}
                  </span>
                )}
              </button>

              {/* Notification Center Dropdown */}
              {showNotificationCenter && (
                <div className="notification-dropdown glass-panel animate-fade-in" onClick={(e) => e.stopPropagation()}>
                  <div className="notification-dropdown-header">
                    <h4>Notifications</h4>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {notifications.some(n => !n.read) && (
                        <button className="btn-link" type="button" onClick={markAllNotificationsAsRead}>Mark all read</button>
                      )}
                      {notifications.length > 0 && (
                        <button className="btn-link text-danger" type="button" onClick={clearNotificationHistory}>Clear All</button>
                      )}
                    </div>
                  </div>
                  <div className="notification-dropdown-body">
                    {notifications.length === 0 ? (
                      <div className="notification-empty">
                        <Bell size={24} style={{ opacity: 0.3, marginBottom: '8px' }} />
                        <p>No new notifications</p>
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div 
                          key={n.id} 
                          className={`notification-item ${!n.read ? 'unread' : ''}`}
                          onClick={() => handleNotificationItemClick(n)}
                        >
                          <div className="notification-item-icon">
                            {n.type === 'message' ? <MessageSquare size={16} /> : <Users size={16} />}
                          </div>
                          <div className="notification-item-content">
                            <div className="notification-item-title">{n.title}</div>
                            <div className="notification-item-text">{n.message}</div>
                            <div className="notification-item-time">{formatNotificationTime(n.timestamp)}</div>
                          </div>
                          {!n.read && <div className="notification-unread-dot"></div>}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <button 
              className={`icon-btn ${isSettingsOpen ? 'active' : ''}`} 
              title="Settings"
              onClick={() => {
                setIsSettingsOpen(!isSettingsOpen);
                setIsAdminOpen(false);
              }}
            >
              <Settings size={20} />
            </button>
          </div>
        </div>

        {/* User Search & Actions */}
        <div className="sidebar-search border-b">
          <div className="search-input-wrapper">
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder="Find user by username..." 
              className="search-input" 
              value={searchQuery}
              onChange={handleSearchUsers}
            />
            {searchQuery && (
              <button className="clear-search" onClick={() => { setSearchQuery(''); setSearchResults([]); }}>
                <X size={16} />
              </button>
            )}
          </div>
          
          <button className="new-group-btn" onClick={() => setIsGroupModalOpen(true)}>
            <Plus size={18} />
            <span>Create Group</span>
          </button>
        </div>

        {/* Search Results list */}
        {searchResults.length > 0 && (
          <div className="search-results-list border-b animate-fade-in">
            <div className="section-title">Search Results ({searchResults.length})</div>
            {searchResults.map(resultUser => (
              <div 
                key={resultUser._id} 
                className="search-user-item hover-item"
                onClick={() => startDirectMessage(resultUser)}
              >
                <div className="avatar">
                  {resultUser.profilePic ? (
                    <img src={resultUser.profilePic} alt={resultUser.username} />
                  ) : (
                    resultUser.username.substring(0, 2).toUpperCase()
                  )}
                  <div className={`status-dot ${resultUser.status}`}></div>
                </div>
                <div className="search-user-info">
                  <span className="search-username">
                    {resultUser.username}
                    {(resultUser._id === user?.id || resultUser._id === user?._id) && (
                      <span style={{ marginLeft: '6px', fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>(You)</span>
                    )}
                  </span>
                  {(() => {
                    const isRoot = resultUser.role === 'Root' || resultUser.username === 'rkdarpan';
                    const isAdmin = resultUser.role === 'Admin' || (resultUser.isAdmin && !isRoot);
                    const displayRole = isRoot ? 'Root' : isAdmin ? 'Admin' : null;

                    if (!displayRole) return null;

                    return (
                      <span className={`badge-admin ${isRoot ? 'root' : 'subadmin'}`}>
                        {displayRole}
                      </span>
                    );
                  })()}
                </div>
                <ChevronRight size={16} className="chevron" />
              </div>
            ))}
          </div>
        )}

        {/* Conversations List */}
        <div className="conversations-list">
          <div className="section-title">Conversations</div>
          {chats.length === 0 ? (
            <div className="empty-chats">
              <MessageSquare size={32} className="muted-icon" />
              <p>No active chats. Search for a user or start a group to begin alaap!</p>
            </div>
          ) : (
            chats.map(chat => {
              const details = getChatDetails(chat);
              const isActive = activeChat?._id === chat._id;
              const chatTypers = typingUsers[chat._id] || {};
              const typerNames = Object.values(chatTypers);
              
              return (
                <div 
                  key={chat._id} 
                  className={`chat-item hover-item ${isActive ? 'active' : ''}`}
                  onClick={() => handleOpenChat(chat._id)}
                >
                  <div className="avatar">
                    {chat.isGroup ? (
                      chat.groupPic ? (
                        <img src={chat.groupPic} alt={chat.name} />
                      ) : (
                        <Users size={20} />
                      )
                    ) : details.avatar.length > 2 ? (
                      <img src={details.avatar} alt={details.name} />
                    ) : (
                      details.avatar
                    )}
                    {!chat.isGroup && <div className={`status-dot ${details.status}`}></div>}
                  </div>
                  <div className="chat-item-info">
                    <div className="chat-item-header">
                      <span className="chat-name">{details.name}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', position: 'relative' }}>
                        {chat.latestMessage && (
                          <span className="chat-time">
                            {formatBDTimeOnly(chat.latestMessage.createdAt)}
                          </span>
                        )}
                        <button 
                          type="button"
                          className="chat-card-menu-btn"
                          title="Chat Options"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCardMenuOpenId(cardMenuOpenId === chat._id ? null : chat._id);
                          }}
                        >
                          <MoreVertical size={14} />
                        </button>

                        {cardMenuOpenId === chat._id && (
                          <div 
                            className="chat-card-dropdown"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button 
                              type="button" 
                              className="dropdown-item danger"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCardMenuOpenId(null);
                                if (onDeleteChat) {
                                  onDeleteChat(chat._id);
                                }
                              }}
                            >
                              <Trash2 size={14} />
                              <span>Delete Chat Box</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="chat-item-preview">
                      {typerNames.length > 0 ? (
                        <span className="typing-preview">{typerNames.join(', ')} typing...</span>
                      ) : chat.latestMessage ? (
                        <span className="last-msg-text">
                          {chat.latestMessage.sender && typeof chat.latestMessage.sender === 'object' ? (
                            (chat.latestMessage.sender._id === user?.id || chat.latestMessage.sender._id === user?._id) ? 'You: ' : `${chat.latestMessage.sender.username}: `
                          ) : (
                            chat.latestMessage.sender === null ? 'Deleted User: ' : ''
                          )}
                          {chat.latestMessage.fileUrl ? 
                            (chat.latestMessage.fileType?.startsWith('audio/') ? `🎤 Voice Message` : `📎 ${chat.latestMessage.fileName}`) 
                            : chat.latestMessage.content}
                        </span>
                      ) : (
                        <span className="no-msgs">No messages yet</span>
                      )}
                    </div>
                  </div>
                  {chat.unreadCount > 0 && (
                    <div className="unread-badge">{chat.unreadCount}</div>
                  )}
                </div>
              );
            })
          )}
        </div>
    </>
  );
}

export default Sidebar;
