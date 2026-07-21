import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';
import { API_BASE_URL, SOCKET_URL } from '../config';

const ChatContext = createContext(null);

export const ChatProvider = ({ children }) => {
  const { token, user, setUser, logout } = useAuth();
  
  // Chat States
  const [activeChat, setActiveChat] = useState(null);
  const [chats, setChats] = useState([]);
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState({}); // { chatId: { userId: username } }
  
  // Notification states
  const [notifications, setNotifications] = useState(() => {
    try {
      const stored = localStorage.getItem('alaap_notifications');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  });
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [notificationSettings, setNotificationSettings] = useState(() => {
    try {
      const stored = localStorage.getItem('alaap_notification_settings');
      return stored ? JSON.parse(stored) : {
        soundEnabled: true,
        desktopEnabled: false,
        inAppBannerEnabled: true
      };
    } catch (e) {
      return { soundEnabled: true, desktopEnabled: false, inAppBannerEnabled: true };
    }
  });

  // Watch Party / Sync Play local states
  const [syncPlayActive, setSyncPlayActive] = useState(false);
  const [syncPlayVideoId, setSyncPlayVideoId] = useState('');
  const [syncPlayIsPlaying, setSyncPlayIsPlaying] = useState(false);

  // Socket & Scroll Refs
  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const ignorePlayerStateChangeRef = useRef(false);
  
  // Keep refs updated for async callbacks
  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);

  const chatsRef = useRef(chats);
  useEffect(() => { chatsRef.current = chats; }, [chats]);

  const activeChatRef = useRef(activeChat);
  useEffect(() => { activeChatRef.current = activeChat; }, [activeChat]);

  const notificationSettingsRef = useRef(notificationSettings);
  useEffect(() => { notificationSettingsRef.current = notificationSettings; }, [notificationSettings]);

  // Persist notifications & settings
  useEffect(() => {
    localStorage.setItem('alaap_notifications', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem('alaap_notification_settings', JSON.stringify(notificationSettings));
  }, [notificationSettings]);

  // Web Audio API Synthesised Chime Sound
  const playNotificationSound = () => {
    if (!notificationSettingsRef.current.soundEnabled) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, ctx.currentTime);
      gain1.gain.setValueAtTime(0.08, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.15);
      
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880.00, ctx.currentTime + 0.08);
      gain2.gain.setValueAtTime(0.08, ctx.currentTime + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08 + 0.2);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(ctx.currentTime + 0.08);
      osc2.stop(ctx.currentTime + 0.08 + 0.2);
    } catch (e) {
      console.warn('Sound playback blocked or unsupported', e);
    }
  };

  // Browser Notification helper
  const triggerDesktopNotification = (title, options = {}) => {
    if (!notificationSettingsRef.current.desktopEnabled) return;
    if (!('Notification' in window)) return;
    
    if (Notification.permission === 'granted') {
      const notification = new Notification(title, {
        icon: '/favicon.ico',
        ...options
      });
      if (options.onClick) {
        notification.onclick = () => {
          window.focus();
          options.onClick();
          notification.close();
        };
      }
    }
  };

  const addToast = (toast) => {
    const id = Date.now() + Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const addNotificationToHistory = (notification) => {
    const newNotification = {
      id: Date.now() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      read: false,
      ...notification
    };
    setNotifications(prev => [newNotification, ...prev].slice(0, 50));
  };

  // REST API Fetch Functions
  const fetchChats = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${API_BASE_URL}/chats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setChats(data);
      }
    } catch (err) {
      console.error('Error fetching chats:', err);
    }
  };

  const fetchMessages = async (chatId) => {
    if (!token) return;
    try {
      const response = await fetch(`${API_BASE_URL}/chats/${chatId}/messages`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  };

  const handleOpenChat = async (chatId) => {
    if (activeChatRef.current) {
      socketRef.current?.emit('leave_chat', activeChatRef.current._id);
    }

    let foundChat = chatsRef.current.find(c => c._id === chatId);
    if (!foundChat) {
      try {
        const response = await fetch(`${API_BASE_URL}/chats`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setChats(data);
          foundChat = data.find(c => c._id === chatId);
        }
      } catch (err) {
        console.error('Error fetching chats on click:', err);
      }
    }
    
    if (foundChat) {
      setActiveChat(foundChat);
      setMessages([]);
      fetchMessages(foundChat._id);
      
      // Update unread count local state
      setChats(prev => prev.map(c => c._id === chatId ? { ...c, unreadCount: 0 } : c));
      
      // Join room
      socketRef.current?.emit('join_chat', foundChat._id);
      
      // Sync SyncPlay states
      if (foundChat.syncPlay && foundChat.syncPlay.active) {
        // Block check
        let blockActive = false;
        if (!foundChat.isGroup) {
          const otherMember = foundChat.members.find(m => m._id !== userRef.current?.id && m._id !== userRef.current?._id);
          if (otherMember) {
            const amBlocked = otherMember.blockedUsers?.includes(userRef.current?.id || userRef.current?._id);
            const iBlocked = (userRef.current?.blockedUsers || []).includes(otherMember._id || otherMember);
            blockActive = !!(amBlocked || iBlocked);
          }
        }

        if (!blockActive) {
          setSyncPlayActive(true);
          setSyncPlayVideoId(foundChat.syncPlay.videoId);
          setSyncPlayIsPlaying(foundChat.syncPlay.isPlaying);
        } else {
          setSyncPlayActive(false);
          setSyncPlayVideoId('');
          setSyncPlayIsPlaying(false);
        }
      } else {
        setSyncPlayActive(false);
        setSyncPlayVideoId('');
        setSyncPlayIsPlaying(false);
      }
    }
  };

  // Socket initialization lifecycle
  useEffect(() => {
    if (!token || !user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    const socket = io(SOCKET_URL, {
      auth: { token }
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to socket server');
      if (activeChatRef.current) {
        socket.emit('join_chat', activeChatRef.current._id);
      }
    });

    socket.on('receive_message', (message) => {
      if (activeChatRef.current && message.chat === activeChatRef.current._id) {
        setMessages(prev => {
          if (prev.some(m => m._id === message._id)) return prev;
          return [...prev, message];
        });

        // Trigger notifications if tab is hidden
        if (document.hidden && message.sender && message.sender._id !== userRef.current?.id && message.sender._id !== userRef.current?._id) {
          playNotificationSound();
          const chatName = activeChatRef.current.isGroup ? activeChatRef.current.name : message.sender.username;
          triggerDesktopNotification(`New message in ${chatName}`, {
            body: message.content || (message.fileUrl ? '📁 Attachment' : 'New message'),
            tag: message.chat,
            onClick: () => handleOpenChat(message.chat)
          });
        }
      }

      setChats(prevChats => {
        const chatExists = prevChats.some(c => c._id === message.chat);
        if (!chatExists) {
          fetchChats();
          return prevChats;
        }
        return prevChats.map(c => {
          if (c._id === message.chat) {
            return { ...c, latestMessage: message, updatedAt: message.createdAt };
          }
          return c;
        }).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      });
    });

    socket.on('message_notification', (data) => {
      const currentId = userRef.current?.id || userRef.current?._id;
      if (data.message && data.message.sender && (data.message.sender._id || data.message.sender) === currentId) {
        return;
      }

      playNotificationSound();
      const chat = chatsRef.current.find(c => c._id === data.chatId);
      const chatName = chat ? (chat.isGroup ? chat.name : data.message.sender.username) : data.message.sender.username;

      addNotificationToHistory({
        type: 'message',
        title: chatName,
        message: data.message.content || (data.message.fileUrl ? '📁 Attachment' : 'New message'),
        chatId: data.chatId
      });

      triggerDesktopNotification(`Message from ${data.message.sender.username}`, {
        body: data.message.content || (data.message.fileUrl ? '📁 Attachment' : ''),
        tag: data.chatId,
        onClick: () => handleOpenChat(data.chatId)
      });

      if (notificationSettingsRef.current.inAppBannerEnabled) {
        addToast({
          title: chatName,
          message: data.message.content || (data.message.fileUrl ? '📁 Attachment' : 'New message'),
          avatar: data.message.sender.profilePic || '',
          onClick: () => handleOpenChat(data.chatId)
        });
      }

      setChats(prevChats => {
        return prevChats.map(c => {
          if (c._id === data.chatId) {
            return { 
              ...c, 
              latestMessage: data.message, 
              updatedAt: data.message.createdAt,
              unreadCount: (c.unreadCount || 0) + 1
            };
          }
          return c;
        }).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      });
    });

    socket.on('typing', ({ chatId, userId, username }) => {
      setTypingUsers(prev => {
        const chatTypers = prev[chatId] || {};
        return {
          ...prev,
          [chatId]: { ...chatTypers, [userId]: username }
        };
      });
    });

    socket.on('stop_typing', ({ chatId, userId }) => {
      setTypingUsers(prev => {
        const chatTypers = { ...(prev[chatId] || {}) };
        delete chatTypers[userId];
        return {
          ...prev,
          [chatId]: chatTypers
        };
      });
    });

    socket.on('new_chat', (newChat) => {
      const creatorId = typeof newChat.creator === 'object' ? newChat.creator._id : newChat.creator;
      const currentId = userRef.current?.id || userRef.current?._id;
      
      if (creatorId && creatorId !== currentId) {
        playNotificationSound();
        const title = newChat.isGroup ? 'Added to Group' : 'New Chat';
        const otherMember = newChat.members.find(m => m._id !== currentId);
        const messageText = newChat.isGroup 
          ? `You were added to group "${newChat.name}"` 
          : `New conversation started with ${otherMember?.username || 'someone'}`;

        addNotificationToHistory({
          type: 'chat',
          title,
          message: messageText,
          chatId: newChat._id
        });

        triggerDesktopNotification(title, {
          body: messageText,
          tag: newChat._id,
          onClick: () => handleOpenChat(newChat._id)
        });

        if (notificationSettingsRef.current.inAppBannerEnabled) {
          addToast({
            title,
            message: messageText,
            avatar: newChat.isGroup ? newChat.groupPic : (otherMember?.profilePic || ''),
            onClick: () => handleOpenChat(newChat._id)
          });
        }
      }

      setChats(prev => {
        if (prev.some(c => c._id === newChat._id)) {
          return prev.map(c => c._id === newChat._id ? newChat : c);
        }
        return [newChat, ...prev];
      });
    });

    socket.on('chat_members_updated', (updatedChat) => {
      setActiveChat(prev => (prev && prev._id === updatedChat._id ? updatedChat : prev));
      setChats(prev => prev.map(c => (c._id === updatedChat._id ? updatedChat : c)));
    });

    socket.on('chat_deleted', ({ chatId }) => {
      const chat = chatsRef.current.find(c => c._id === chatId);
      const currentId = userRef.current?.id || userRef.current?._id;
      if (chat) {
        const title = 'Chat Deleted';
        const otherMember = chat.members.find(m => m._id !== currentId);
        const messageText = chat.isGroup 
          ? `The group "${chat.name}" was deleted.` 
          : `Direct chat with ${otherMember?.username || 'someone'} was deleted.`;

        addNotificationToHistory({ type: 'chat_delete', title, message: messageText });

        if (notificationSettingsRef.current.inAppBannerEnabled) {
          addToast({ title, message: messageText, type: 'danger' });
        }
      }

      setChats(prev => prev.filter(c => c._id !== chatId));
      setActiveChat(prev => (prev && prev._id === chatId ? null : prev));
    });

    socket.on('force_logout', (data) => {
      logout();
    });

    socket.on('message_reaction_update', ({ messageId, reactions }) => {
      setMessages(prev => prev.map(msg => (msg._id === messageId ? { ...msg, reactions } : msg)));
    });

    socket.on('messages_delivered_update', ({ chatId, userId }) => {
      if (activeChatRef.current && activeChatRef.current._id === chatId) {
        setMessages(prev => prev.map(msg => {
          const list = msg.deliveredTo || [];
          if (!list.some(d => (d._id || d).toString() === userId)) {
            return { ...msg, deliveredTo: [...list, userId] };
          }
          return msg;
        }));
      }
    });

    socket.on('messages_read_update', ({ chatId, userId }) => {
      if (activeChatRef.current && activeChatRef.current._id === chatId) {
        setMessages(prev => prev.map(msg => {
          const reads = msg.readBy || [];
          const delivers = msg.deliveredTo || [];
          const updatedReads = reads.some(r => (r._id || r).toString() === userId) ? reads : [...reads, userId];
          const updatedDelivers = delivers.some(d => (d._id || d).toString() === userId) ? delivers : [...delivers, userId];
          return { ...msg, readBy: updatedReads, deliveredTo: updatedDelivers };
        }));
      }
    });

    socket.on('message_updated', (updatedMessage) => {
      setMessages(prev => prev.map(msg => (msg._id === updatedMessage._id ? updatedMessage : msg)));
      setChats(prevChats => prevChats.map(c => (c._id === updatedMessage.chat && c.latestMessage && c.latestMessage._id === updatedMessage._id ? { ...c, latestMessage: updatedMessage } : c)));
    });

    socket.on('message_deleted', ({ messageId, chatId, latestMessage }) => {
      setMessages(prev => prev.filter(msg => msg._id !== messageId));
      setChats(prevChats => prevChats.map(c => {
        if (c._id === chatId) {
          return { 
            ...c, 
            latestMessage: latestMessage,
            updatedAt: latestMessage ? latestMessage.createdAt : c.updatedAt
          };
        }
        return c;
      }).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)));
    });

    socket.on('chat_history_cleared', ({ chatId }) => {
      if (activeChatRef.current && activeChatRef.current._id === chatId) {
        setMessages([]);
      }
      setChats(prevChats => prevChats.map(c => (c._id === chatId ? { ...c, latestMessage: null } : c)));
    });

    socket.on('sync_play_broadcast', ({ chatId, videoId, action, currentTime, isPlaying, senderId }) => {
      const currentId = userRef.current?.id || userRef.current?._id;
      if (activeChatRef.current && activeChatRef.current._id === chatId) {
        let blockActive = false;
        if (!activeChatRef.current.isGroup) {
          const otherMember = activeChatRef.current.members.find(m => m._id !== currentId);
          if (otherMember) {
            const amBlocked = otherMember.blockedUsers?.includes(currentId);
            const iBlocked = (userRef.current?.blockedUsers || []).includes(otherMember._id || otherMember);
            blockActive = !!(amBlocked || iBlocked);
          }
        }
        if (blockActive) return;

        setSyncPlayVideoId(videoId);
        setSyncPlayIsPlaying(isPlaying);
      }

      const updateChatSync = (prev) => {
        if (!prev) return null;
        const syncDetails = { active: true, videoId, currentTime, isPlaying, lastUpdatedBy: senderId };
        if (Array.isArray(prev)) {
          return prev.map(c => (c._id === chatId ? { ...c, syncPlay: syncDetails } : c));
        } else if (prev._id === chatId) {
          return { ...prev, syncPlay: syncDetails };
        }
        return prev;
      };

      setActiveChat(updateChatSync);
      setChats(updateChatSync);
    });

    socket.on('sync_play_toggled', ({ chatId, active, syncPlay }) => {
      const currentId = userRef.current?.id || userRef.current?._id;
      if (activeChatRef.current && activeChatRef.current._id === chatId) {
        let blockActive = false;
        if (!activeChatRef.current.isGroup) {
          const otherMember = activeChatRef.current.members.find(m => m._id !== currentId);
          if (otherMember) {
            const amBlocked = otherMember.blockedUsers?.includes(currentId);
            const iBlocked = (userRef.current?.blockedUsers || []).includes(otherMember._id || otherMember);
            blockActive = !!(amBlocked || iBlocked);
          }
        }

        if (blockActive) {
          setSyncPlayActive(false);
          setSyncPlayVideoId('');
          setSyncPlayIsPlaying(false);
        } else {
          setSyncPlayActive(active);
          if (active) {
            setSyncPlayVideoId(syncPlay.videoId);
            setSyncPlayIsPlaying(syncPlay.isPlaying);
          } else {
            setSyncPlayVideoId('');
            setSyncPlayIsPlaying(false);
          }
        }
      }

      const updateToggleSync = (prev) => {
        if (!prev) return null;
        if (Array.isArray(prev)) {
          return prev.map(c => (c._id === chatId ? { ...c, syncPlay } : c));
        } else if (prev._id === chatId) {
          return { ...prev, syncPlay };
        }
        return prev;
      };

      setActiveChat(updateToggleSync);
      setChats(updateToggleSync);
    });

    socket.on('block_status_changed', ({ blockerId, blockedId, isBlocked }) => {
      const currentId = userRef.current?.id || userRef.current?._id;
      if (blockerId === currentId) {
        setUser(prev => {
          if (!prev) return prev;
          const blockedList = prev.blockedUsers || [];
          const newBlocked = isBlocked 
            ? [...blockedList.filter(id => id !== blockedId), blockedId]
            : blockedList.filter(id => id !== blockedId);
          return { ...prev, blockedUsers: newBlocked };
        });
      }
      
      setChats(prevChats => prevChats.map(c => {
        if (c.isGroup) return c;
        const hasBlocker = c.members.some(m => m._id === blockerId);
        const hasBlocked = c.members.some(m => m._id === blockedId);
        if (hasBlocker && hasBlocked) {
          const updatedMembers = c.members.map(m => {
            if (m._id === blockerId) {
              const mBlocked = m.blockedUsers || [];
              const newBlocked = isBlocked ? [...mBlocked.filter(id => id !== blockedId), blockedId] : mBlocked.filter(id => id !== blockedId);
              return { ...m, blockedUsers: newBlocked };
            }
            return m;
          });
          return { ...c, members: updatedMembers };
        }
        return c;
      }));
    });

    socket.on('user_status_change', ({ userId, status }) => {
      const updateStatus = (prev) => {
        if (!prev) return null;
        const mapper = m => (m._id === userId ? { ...m, status } : m);
        if (Array.isArray(prev)) {
          return prev.map(c => ({ ...c, members: c.members.map(mapper) }));
        } else {
          return { ...prev, members: prev.members.map(mapper) };
        }
      };
      setChats(updateStatus);
      setActiveChat(updateStatus);
    });

    // Fetch initial chat lists
    fetchChats();

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, user?.username]);

  return (
    <ChatContext.Provider value={{
      socket: socketRef.current,
      activeChat,
      setActiveChat,
      chats,
      setChats,
      messages,
      setMessages,
      typingUsers,
      notifications,
      setNotifications,
      showNotificationCenter,
      setShowNotificationCenter,
      toasts,
      setToasts,
      addToast,
      removeToast,
      notificationSettings,
      setNotificationSettings,
      syncPlayActive,
      setSyncPlayActive,
      syncPlayVideoId,
      setSyncPlayVideoId,
      syncPlayIsPlaying,
      setSyncPlayIsPlaying,
      fetchChats,
      fetchMessages,
      handleOpenChat,
      playNotificationSound,
      triggerDesktopNotification,
      addNotificationToHistory
    }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => useContext(ChatContext);
