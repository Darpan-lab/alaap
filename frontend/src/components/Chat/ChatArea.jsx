import React, { useState, useEffect, useRef } from 'react';
import { 
  Smile, Mic, Send, UploadCloud, Trash2, Pause, FileText, 
  Download, Play, Check, CheckCheck, CornerUpLeft, MoreVertical, 
  Edit, X, Ban, Loader2, Users, ArrowLeft, PanelLeftOpen, PanelLeftClose, 
  Eye, EyeOff, Tv, Info, UserMinus, Unlock
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { useDialog } from '../../context/DialogContext';
import { EMOJI_CATEGORIES, EMOJI_KEYWORDS, REACTION_EMOJIS } from '../../utils/constants';
import { API_BASE_URL } from '../../config';
import { formatBDMessageTime } from '../../utils/dateUtils';
import AudioMessagePlayer from '../Media/AudioMessagePlayer';

export function ChatArea({ 
  isSidebarHidden, 
  setIsSidebarHidden,
  isInfoPanelOpen,
  setIsInfoPanelOpen,
  setPreviewImageUrl,
  setPopupVideo,
  setYtDropdown
}) {
  const { token, user, setUser } = useAuth();
  const { 
    socket, 
    activeChat, 
    setActiveChat, 
    messages, 
    setMessages, 
    typingUsers, 
    toasts,
    setChats,
    syncPlayActive, 
    setSyncPlayActive,
    setSyncPlayVideoId,
    setSyncPlayIsPlaying,
    playNotificationSound,
    triggerDesktopNotification,
    addToast
  } = useChat();
  const { showAlert, showConfirm } = useDialog();

  // Local Form & Input States
  const [messageInput, setMessageInput] = useState('');
  const [editingMessage, setEditingMessage] = useState(null);
  const [replyingToMessage, setReplyingToMessage] = useState(null);
  const [activeDropdownMessageId, setActiveDropdownMessageId] = useState(null);
  const [activeReactionMessageId, setActiveReactionMessageId] = useState(null);

  // File Upload State
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const dragCounterRef = useRef(0);

  // Emoji Picker State
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [emojiSearch, setEmojiSearch] = useState('');
  const [selectedEmojiCategory, setSelectedEmojiCategory] = useState('All');
  const emojiPickerRef = useRef(null);

  // Voice Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [isRecordingPaused, setIsRecordingPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const isRecordingCancelledRef = useRef(false);

  // Refs for Scroll & Sockets
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Click outside listener for emoji picker and reaction selectors
  useEffect(() => {
    function handleClickOutside(event) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setEmojiPickerOpen(false);
      }
      if (!event.target.closest('.message-hover-actions')) {
        setActiveReactionMessageId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  const handleSendMessage = (e) => {
    e?.preventDefault();
    if (!messageInput.trim() || !activeChat) return;

    if (editingMessage) {
      socket?.emit('edit_message', {
        messageId: editingMessage._id,
        content: messageInput
      });
      setEditingMessage(null);
      setMessageInput('');
      return;
    }

    const messageData = {
      chatId: activeChat._id,
      content: messageInput,
      replyTo: replyingToMessage ? replyingToMessage._id : null
    };

    socket?.emit('send_message', messageData);
    setMessageInput('');
    setReplyingToMessage(null);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      socket?.emit('stop_typing', { chatId: activeChat._id });
    }
  };

  const startEditingMessage = (msg) => {
    setEditingMessage(msg);
    setReplyingToMessage(null);
    setMessageInput(msg.content);
  };

  const handleDeleteMessage = async (messageId) => {
    if (!await showConfirm('Are you sure you want to delete this message?')) return;
    socket?.emit('delete_message', { messageId });
  };

  const handleTyping = () => {
    if (!socket || !activeChat) return;

    socket.emit('typing', { chatId: activeChat._id });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop_typing', { chatId: activeChat._id });
    }, 2000);
  };

  // Upload Logic
  const uploadFile = async (file) => {
    if (!file || !activeChat) return;

    setUploading(true);
    setUploadProgress(10);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (response.ok) {
        const uploadData = await response.json();

        const messageData = {
          chatId: activeChat._id,
          content: `Sent a file: ${uploadData.fileName}`,
          fileUrl: uploadData.fileUrl,
          fileName: uploadData.fileName,
          fileType: uploadData.fileType,
          fileSize: uploadData.fileSize,
          replyTo: replyingToMessage ? replyingToMessage._id : null
        };

        socket?.emit('send_message', messageData);
        setReplyingToMessage(null);
      } else {
        showAlert('File upload failed.');
      }
    } catch (err) {
      console.error('Upload error:', err);
      showAlert('Error uploading file.');
    } finally {
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 500);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      await uploadFile(file);
    }
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounterRef.current = 0;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      await uploadFile(file);
      e.dataTransfer.clearData();
    }
  };

  // Voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      isRecordingCancelledRef.current = false;
      
      let recorder;
      try {
        recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      } catch (e) {
        recorder = new MediaRecorder(stream);
      }
      
      mediaRecorderRef.current = recorder;
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      recorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        if (isRecordingCancelledRef.current) return;
        if (audioChunksRef.current.length === 0) return;
        
        const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType });
        if (audioBlob.size < 1000) return;
        
        await sendVoiceBlob(audioBlob);
      };
      
      recorder.start(250);
      setIsRecording(true);
      setRecordingTime(0);
      
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Failed to start recording:', err);
      showAlert('Could not access microphone. Please check permissions.');
    }
  };

  const cancelRecording = () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return;
    isRecordingCancelledRef.current = true;
    audioChunksRef.current = [];
    mediaRecorderRef.current.stop();
    cleanupRecordingState();
  };
  
  const stopAndSendRecording = () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return;
    mediaRecorderRef.current.stop();
    cleanupRecordingState();
  };
  
  const pauseRecording = () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== 'recording') return;
    mediaRecorderRef.current.pause();
    setIsRecordingPaused(true);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  const resumeRecording = () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== 'paused') return;
    mediaRecorderRef.current.resume();
    setIsRecordingPaused(false);
    recordingTimerRef.current = setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
  };
  
  const cleanupRecordingState = () => {
    setIsRecording(false);
    setIsRecordingPaused(false);
    setRecordingTime(0);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  const sendVoiceBlob = async (audioBlob) => {
    if (!activeChat) return;
    
    setUploading(true);
    setUploadProgress(20);
    
    const file = new File([audioBlob], `voice-msg-${Date.now()}.webm`, {
      type: audioBlob.type || 'audio/webm'
    });
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      setUploadProgress(50);
      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      setUploadProgress(90);
      
      if (response.ok) {
        const uploadData = await response.json();
        
        const messageData = {
          chatId: activeChat._id,
          content: '🎤 Voice Message',
          fileUrl: uploadData.fileUrl,
          fileName: 'Voice Message.webm',
          fileType: uploadData.fileType || 'audio/webm',
          fileSize: uploadData.fileSize,
          replyTo: replyingToMessage ? replyingToMessage._id : null
        };
        
        socket?.emit('send_message', messageData);
        setReplyingToMessage(null);
        setUploadProgress(100);
      } else {
        showAlert('Failed to upload voice message.');
      }
    } catch (err) {
      console.error('Error uploading voice message:', err);
      showAlert('Error sending voice message.');
    } finally {
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 500);
    }
  };

  const handleReactToMessage = (messageId, emoji) => {
    socket?.emit('react_message', { messageId, emoji });
    setActiveReactionMessageId(null);
  };

  const getAggregatedReactions = (reactionsList) => {
    if (!reactionsList || !activeChat) return [];
    const agg = {};
    reactionsList.forEach(r => {
      if (!r) return;
      const targetUserId = r.user?._id || r.user;
      if (!targetUserId) return;
      const targetUserStr = targetUserId.toString();
      
      const userObj = activeChat.members.find(m => {
        if (!m) return false;
        const memberId = m._id || m;
        return memberId.toString() === targetUserStr;
      });
      const username = userObj ? userObj.username : 'Someone';
      
      if (!agg[r.emoji]) {
        agg[r.emoji] = {
          emoji: r.emoji,
          count: 0,
          hasReacted: false,
          usernames: []
        };
      }
      agg[r.emoji].count += 1;
      agg[r.emoji].usernames.push(username);
      
      const currentUserId = user?.id || user?._id;
      if (currentUserId && targetUserStr === currentUserId.toString()) {
        agg[r.emoji].hasReacted = true;
      }
    });
    return Object.values(agg);
  };

  const scrollToMessage = (messageId) => {
    const element = document.getElementById(`msg-${messageId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('highlighted-message');
      setTimeout(() => {
        element.classList.remove('highlighted-message');
      }, 2000);
    }
  };

  const formatRecordTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleEmojiClick = (emoji, e) => {
    e?.preventDefault();
    if (e?.currentTarget) {
      e.currentTarget.blur();
    }
    const input = document.querySelector('.chat-text-input-inside');
    if (!input) {
      setMessageInput(prev => prev + emoji);
      return;
    }

    const start = input.selectionStart;
    const end = input.selectionEnd;
    const text = messageInput;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);

    setMessageInput(before + emoji + after);
    
    setTimeout(() => {
      input.focus();
      input.setSelectionRange(start + emoji.length, start + emoji.length);
    }, 0);
  };

  const getFilteredEmojis = () => {
    if (!emojiSearch) {
      if (selectedEmojiCategory !== 'All') {
        return EMOJI_CATEGORIES.filter(cat => cat.name === selectedEmojiCategory);
      }
      return EMOJI_CATEGORIES;
    }
    
    const query = emojiSearch.toLowerCase();
    return EMOJI_CATEGORIES.map(category => {
      const matchingEmojis = category.emojis.filter(emoji => {
        const keywords = EMOJI_KEYWORDS[emoji] || '';
        return keywords.toLowerCase().includes(query) || category.name.toLowerCase().includes(query);
      });
      
      if (matchingEmojis.length > 0) {
        return {
          ...category,
          emojis: matchingEmojis
        };
      }
      return null;
    }).filter(Boolean);
  };

  const handleYoutubeLinkClick = (e, url) => {
    e.preventDefault();
    if (!activeChat) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }

    const isBlockedOrBlocker = (() => {
      if (!activeChat.isGroup) {
        const otherMember = activeChat.members.find(m => m._id !== user?.id && m._id !== user?._id);
        if (otherMember) {
          const amBlocked = otherMember.blockedUsers?.includes(user?.id || user?._id);
          const iBlocked = (user?.blockedUsers || []).includes(otherMember._id || otherMember);
          return !!(amBlocked || iBlocked);
        }
      }
      return false;
    })();

    if (isBlockedOrBlocker) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    let x = rect.left;
    if (x + 180 > window.innerWidth) {
      x = rect.right - 180;
    }
    let y = rect.bottom;
    if (y + 100 > window.innerHeight) {
      y = rect.top - 85;
    }
    setYtDropdown({
      isOpen: true,
      url: url,
      x: x,
      y: y
    });
  };

  const renderMessageContent = (msg) => {
    const text = msg.content || '';
    if (!text) return null;

    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    const parts = text.split(urlRegex);
    
    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        const isYT = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/i.test(part);
        if (isYT) {
          return (
            <a 
              key={i} 
              href={part} 
              onClick={(e) => handleYoutubeLinkClick(e, part)}
              style={{
                color: 'var(--secondary)',
                textDecoration: 'underline',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              {part}
            </a>
          );
        } else {
          return (
            <a 
              key={i} 
              href={part} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{
                color: 'var(--primary)',
                textDecoration: 'underline'
              }}
            >
              {part}
            </a>
          );
        }
      }
      return part;
    });
  };

  const getChatDetails = (chat) => {
    if (!chat) return { name: '', avatar: '', status: 'offline' };
    if (chat.isGroup) {
      return { 
        name: chat.name, 
        avatar: chat.name.substring(0, 2).toUpperCase(), 
        status: 'group',
        membersCount: chat.members?.length || 0
      };
    }
    const otherUser = chat.members.find(m => m._id !== user?.id && m._id !== user?._id);
    return {
      name: otherUser ? otherUser.username : 'Unknown User',
      avatar: otherUser?.profilePic || (otherUser ? otherUser.username.substring(0, 2).toUpperCase() : '??'),
      status: otherUser?.status || 'offline',
      isAdmin: otherUser?.isAdmin
    };
  };

  const handleStartSyncPlay = () => {
    if (!activeChat) return;

    socket?.emit('sync_play_toggle', {
      chatId: activeChat._id,
      active: true,
      videoId: activeChat.syncPlay?.videoId || ''
    });
  };

  if (!activeChat) return null;

  const chatDetails = getChatDetails(activeChat);

  return (
    <div 
      className={`chat-pane animate-fade-in ${syncPlayActive ? 'sync-play-active' : ''}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      style={{ position: 'relative' }}
    >
      {isDragging && (
        <div className="drag-drop-overlay">
          <div className="drag-drop-zone">
            <UploadCloud size={48} className="drag-drop-icon" />
            <h3>Drop your files here</h3>
            <p>Send photos, videos, or documents directly to this chat</p>
          </div>
        </div>
      )}
      
      {/* Chat Pane Header */}
      <div className="chat-header border-b">
        <div className="chat-header-info">
          <button className="icon-btn mobile-back-btn" onClick={() => setActiveChat(null)} title="Back to Chats">
            <ArrowLeft size={20} />
          </button>
          <div className="avatar">
            {activeChat.isGroup ? (
              activeChat.groupPic ? (
                <img src={activeChat.groupPic} alt={activeChat.name} />
              ) : (
                <Users size={20} />
              )
            ) : chatDetails.avatar.length > 2 ? (
              <img src={chatDetails.avatar} alt={chatDetails.name} />
            ) : (
              chatDetails.avatar
            )}
            {!activeChat.isGroup && <div className={`status-dot ${chatDetails.status}`}></div>}
          </div>
          <div>
            <h3 className="active-chat-name">{chatDetails.name}</h3>
            <p className="active-chat-status">
              {activeChat.isGroup 
                ? `${chatDetails.membersCount} members` 
                : chatDetails.status === 'online' ? 'Online' : 'Offline'
              }
            </p>
          </div>
        </div>
        <div className="chat-header-actions">
          <button 
            type="button" 
            className={`icon-btn desktop-only-btn ${isSidebarHidden ? 'active' : ''}`}
            title={isSidebarHidden ? 'Show Sidebar' : 'Hide Sidebar'}
            onClick={() => setIsSidebarHidden(!isSidebarHidden)}
          >
            {isSidebarHidden ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
          </button>

          {activeChat && syncPlayActive && (
            <button 
              type="button" 
              className={`icon-btn`}
              title="Hide Video Controller Header"
              style={{ display: 'none' }} // Deprecated or mapped as required
            />
          )}

          {activeChat && (() => {
            const isBlockedOrBlocker = (() => {
              if (!activeChat.isGroup) {
                const otherMember = activeChat.members.find(m => m._id !== user?.id && m._id !== user?._id);
                if (otherMember) {
                  const amBlocked = otherMember.blockedUsers?.includes(user?.id || user?._id);
                  const iBlocked = (user?.blockedUsers || []).includes(otherMember._id || otherMember);
                  return !!(amBlocked || iBlocked);
                }
              }
              return false;
            })();

            if (isBlockedOrBlocker) return null;

            return (
              <button 
                type="button" 
                className={`icon-btn ${syncPlayActive ? 'active' : ''}`}
                title={syncPlayActive ? 'Close Sync Play View' : 'Start/Join Sync Play'}
                onClick={() => {
                  if (syncPlayActive) {
                    setSyncPlayActive(false);
                  } else {
                    setIsInfoPanelOpen(false);
                    if (activeChat.syncPlay && activeChat.syncPlay.active) {
                      setSyncPlayActive(true);
                      setSyncPlayVideoId(activeChat.syncPlay.videoId);
                      setSyncPlayIsPlaying(activeChat.syncPlay.isPlaying);
                    } else {
                      handleStartSyncPlay();
                    }
                  }
                }}
              >
                <Tv size={20} />
              </button>
            );
          })()}

          <button 
            type="button"
            className={`icon-btn ${isInfoPanelOpen ? 'active' : ''}`}
            title={isInfoPanelOpen ? 'Hide Chat Details' : 'Show Chat Details'}
            onClick={() => {
              const nextState = !isInfoPanelOpen;
              setIsInfoPanelOpen(nextState);
              if (nextState) {
                setSyncPlayActive(false);
              }
            }}
          >
            <Info size={20} />
          </button>
        </div>
      </div>

      <div className="chat-body-container">
        <div className="chat-left-side" style={syncPlayActive ? { width: 'auto', minWidth: window.innerWidth > 768 ? '460px' : 'none', flexGrow: 1, flexShrink: 1 } : {}}>
          {/* Message History Feed */}
          <div className="messages-feed">
            {messages.map((msg, index) => {
              const currentId = user?.id || user?._id;
              const msgSenderId = msg.sender?._id || msg.sender;
              const isOwn = msgSenderId && currentId && msgSenderId.toString() === currentId.toString();
              
              return (
                <div id={`msg-${msg._id}`} key={msg._id || index} className={`message-wrapper ${isOwn ? 'own' : 'other'} ${msg.reactions && msg.reactions.length > 0 ? 'has-reactions' : ''}`}>
                  {!isOwn && activeChat?.isGroup && (
                    <div className="message-avatar">
                      {msg.sender?.profilePic ? (
                        <img src={msg.sender.profilePic} alt={msg.sender.username || 'Deleted User'} />
                      ) : (
                        (msg.sender?.username || 'Deleted User').substring(0, 2).toUpperCase()
                      )}
                    </div>
                  )}
                  <div className="message-bubble-wrapper">
                    {!isOwn && activeChat?.isGroup && <span className="message-sender-name">{msg.sender?.username || 'Deleted User'}</span>}
                    <div className="message-bubble">
                      {/* Reply quote */}
                      {msg.replyTo && (
                        <div 
                          className="message-reply-quote" 
                          onClick={() => scrollToMessage(msg.replyTo._id)}
                        >
                          <span className="quote-sender">
                            {msg.replyTo.sender?.username || 'User'}
                          </span>
                          <p className="quote-text">
                            {msg.replyTo.content ? msg.replyTo.content : msg.replyTo.fileUrl ? '📎 File attachment' : ''}
                          </p>
                        </div>
                      )}

                      {/* Render files */}
                      {msg.fileUrl && (
                        msg.fileType?.startsWith('audio/') ? (
                          <AudioMessagePlayer src={msg.fileUrl} />
                        ) : (
                          <div className="file-attachment">
                            {msg.fileType?.startsWith('image/') ? (
                              <div className="attachment-image-wrapper" onClick={() => setPreviewImageUrl(msg.fileUrl)}>
                                <img src={msg.fileUrl} alt={msg.fileName} className="attachment-preview-img" />
                              </div>
                            ) : msg.fileType?.startsWith('video/') ? (
                              <div 
                                className="attachment-video-preview-wrapper"
                                onClick={() => setPopupVideo({ url: msg.fileUrl, name: msg.fileName })}
                              >
                                <video src={msg.fileUrl} preload="metadata" className="attachment-preview-video-thumbnail" />
                                <div className="video-play-overlay">
                                  <div className="play-button-circle">
                                    <Play size={22} fill="currentColor" />
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="file-generic-preview">
                                <FileText size={32} />
                                <span className="file-meta-name">{msg.fileName}</span>
                              </div>
                            )}
                            <div className="file-meta border-t">
                              <div className="file-meta-details">
                                <span className="file-size">{formatFileSize(msg.fileSize)}</span>
                              </div>
                              <a 
                                href={msg.fileUrl} 
                                download={msg.fileName} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="download-btn-attachment"
                                title="Download Original Quality"
                              >
                                <Download size={18} />
                              </a>
                            </div>
                          </div>
                        )
                      )}

                      {/* Render text content */}
                      {msg.content && !msg.fileUrl && (
                        <p className="message-text">
                          {renderMessageContent(msg)}
                        </p>
                      )}

                      {/* Reactions display */}
                      {msg.reactions && msg.reactions.length > 0 && (
                        <div className="message-reactions-pill">
                          {getAggregatedReactions(msg.reactions).map(react => (
                            <span 
                              key={react.emoji} 
                              className={`reaction-badge ${react.hasReacted ? 'self-reacted' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReactToMessage(msg._id, react.emoji);
                              }}
                              title={react.usernames.join(', ')}
                            >
                              {react.emoji} {react.count > 1 && <span className="reaction-count">{react.count}</span>}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="message-time">
                      {formatBDMessageTime(msg.createdAt)}
                      {msg.isEdited && <span className="edited-indicator"> (edited)</span>}
                      {isOwn && (() => {
                        const currentId = user?.id || user?._id;
                        const otherRead = msg.readBy && msg.readBy.some(r => {
                          const rId = r._id || r;
                          return rId && currentId && rId.toString() !== currentId.toString();
                        });
                        const otherDelivered = msg.deliveredTo && msg.deliveredTo.some(d => {
                          const dId = d._id || d;
                          return dId && currentId && dId.toString() !== currentId.toString();
                        });

                        if (otherRead) {
                          return <span className="receipt-ticks read"><CheckCheck size={14} className="ticks" /></span>;
                        } else if (otherDelivered) {
                          return <span className="receipt-ticks delivered"><CheckCheck size={14} className="ticks" /></span>;
                        } else {
                          return <span className="receipt-ticks sent"><Check size={14} className="ticks" /></span>;
                        }
                      })()}
                    </span>
                  </div>

                  {/* Message hover actions menu */}
                  <div className="message-hover-actions">
                    <button 
                      type="button" 
                      className="msg-action-btn" 
                      onClick={() => {
                        setActiveReactionMessageId(activeReactionMessageId === msg._id ? null : msg._id);
                        setActiveDropdownMessageId(null);
                      }}
                    >
                      <Smile size={16} />
                    </button>
                    <button 
                      type="button" 
                      className="msg-action-btn" 
                      onClick={() => {
                        setReplyingToMessage(msg);
                        setEditingMessage(null);
                        setActiveDropdownMessageId(null);
                      }}
                    >
                      <CornerUpLeft size={16} />
                    </button>
                    {(isOwn || user?.role === 'Root') && (
                      <button 
                        type="button" 
                        className="msg-action-btn" 
                        onClick={() => {
                          setActiveDropdownMessageId(activeDropdownMessageId === msg._id ? null : msg._id);
                          setActiveReactionMessageId(null);
                        }}
                      >
                        <MoreVertical size={16} />
                      </button>
                    )}
                    
                    {activeReactionMessageId === msg._id && (
                      <div className="message-reactions-selector glass-panel">
                        {REACTION_EMOJIS.map(emoji => (
                          <button 
                            key={emoji} 
                            type="button" 
                            className="reaction-emoji-option"
                            onClick={() => handleReactToMessage(msg._id, emoji)}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}

                    {activeDropdownMessageId === msg._id && (
                      <div className="message-dropdown-menu glass-panel">
                        {isOwn && msg.content && !msg.fileUrl && (
                          <button 
                            type="button" 
                            className="dropdown-item"
                            onClick={() => {
                              setActiveDropdownMessageId(null);
                              startEditingMessage(msg);
                            }}
                          >
                            <Edit size={14} />
                            <span>Edit</span>
                          </button>
                        )}
                        {(isOwn || user?.role === 'Root') && (
                          <button 
                            type="button" 
                            className="dropdown-item delete"
                            onClick={() => {
                              setActiveDropdownMessageId(null);
                              handleDeleteMessage(msg._id);
                            }}
                          >
                            <Trash2 size={14} />
                            <span>Delete</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Typing indicators */}
            {activeChat && Object.values(typingUsers[activeChat._id] || {}).length > 0 && (
              <div className="typing-indicator-chat">
                <div className="typing-bubbles">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <span className="typing-text">
                  {Object.values(typingUsers[activeChat._id]).join(', ')} is typing...
                </span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Uploading progress card overlay */}
          {uploading && (
            <div className="upload-progress-overlay">
              <div className="progress-card glass-panel">
                <Loader2 className="animate-spin" size={24} />
                <div className="progress-details">
                  <span>Sending high quality media...</span>
                  <div className="progress-bar-container">
                    <div className="progress-bar-fill" style={{ width: `${uploadProgress}%` }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Replying Preview Bar */}
          {replyingToMessage && (
            <div className="reply-preview-bar">
              <div className="reply-preview-content">
                <span className="reply-preview-title">Replying to {replyingToMessage.sender?.username || 'Deleted User'}</span>
                <p className="reply-preview-subtitle">
                  {replyingToMessage.content ? replyingToMessage.content : replyingToMessage.fileUrl ? '📎 File attachment' : ''}
                </p>
              </div>
              <button type="button" className="reply-preview-close" onClick={() => setReplyingToMessage(null)}>
                <X size={18} />
              </button>
            </div>
          )}

          {/* Editing Preview Bar */}
          {editingMessage && (
            <div className="reply-preview-bar editing">
              <div className="reply-preview-content">
                <span className="reply-preview-title">Editing message</span>
                <p className="reply-preview-subtitle">{editingMessage.content}</p>
              </div>
              <button 
                type="button" 
                className="reply-preview-close" 
                onClick={() => {
                  setEditingMessage(null);
                  setMessageInput('');
                }}
              >
                <X size={18} />
              </button>
            </div>
          )}

          {/* Chat Input Bar */}
          {(() => {
            if (activeChat && !activeChat.isGroup) {
              const otherMember = activeChat.members.find(m => m._id !== user?.id && m._id !== user?._id);
              if (otherMember) {
                const amBlocked = otherMember.blockedUsers?.includes(user?.id || user?._id);
                const iBlocked = (user?.blockedUsers || []).includes(otherMember._id || otherMember);

                if (iBlocked) {
                  return (
                    <div className="chat-input-blocked border-t">
                      <Ban size={18} />
                      <span>You have blocked this user. Unblock them to send messages.</span>
                    </div>
                  );
                }
                if (amBlocked) {
                  return (
                    <div className="chat-input-blocked border-t">
                      <Ban size={18} />
                      <span>This user has blocked you.</span>
                    </div>
                  );
                }
              }
            }

            return (
              <form onSubmit={handleSendMessage} className="chat-input-form border-t">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  style={{ display: 'none' }} 
                  onChange={handleFileUpload} 
                  accept="image/*,video/*"
                />
                
                {isRecording ? (
                  <div className="voice-record-bar">
                    <div className="record-status">
                      <span className={`record-dot ${isRecordingPaused ? 'paused' : 'animate-pulse'}`}></span>
                      <span className="record-timer">
                        {isRecordingPaused ? 'Paused' : 'Recording'} {formatRecordTime(recordingTime)}
                      </span>
                    </div>
                    <div className={`record-waveform ${isRecordingPaused ? 'paused' : ''}`}>
                      <div className="wave-bar bar-1"></div>
                      <div className="wave-bar bar-2"></div>
                      <div className="wave-bar bar-3"></div>
                      <div className="wave-bar bar-4"></div>
                      <div className="wave-bar bar-5"></div>
                    </div>
                    <div className="record-actions">
                      <button type="button" className="record-btn cancel" onClick={cancelRecording} title="Discard Recording">
                        <Trash2 size={18} />
                      </button>
                      <button 
                        type="button" 
                        className={`record-btn pause-resume ${isRecordingPaused ? 'paused' : ''}`} 
                        onClick={isRecordingPaused ? resumeRecording : pauseRecording} 
                        title={isRecordingPaused ? "Resume Recording" : "Pause Recording"}
                        style={{
                          background: isRecordingPaused ? 'rgba(6, 182, 212, 0.15)' : 'rgba(255, 255, 255, 0.1)',
                          border: isRecordingPaused ? '1px solid rgba(6, 182, 212, 0.3)' : '1px solid rgba(255, 255, 255, 0.2)',
                          color: isRecordingPaused ? 'var(--secondary)' : '#fff'
                        }}
                      >
                        {isRecordingPaused ? <Mic size={18} /> : <Pause size={18} />}
                      </button>
                      <button type="button" className="record-btn stop-send" onClick={stopAndSendRecording} title="Stop & Send">
                        <Send size={18} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <button 
                      type="button" 
                      className="input-action-btn" 
                      title="Send photo/video (Lossless)"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <UploadCloud size={22} />
                    </button>

                    <div className="chat-input-wrapper">
                      <div className="emoji-picker-container" ref={emojiPickerRef}>
                        <button 
                          type="button" 
                          className="emoji-inside-btn" 
                          onClick={() => setEmojiPickerOpen(!emojiPickerOpen)}
                        >
                          <Smile size={20} />
                        </button>

                        {emojiPickerOpen && (
                          <div className="emoji-picker-popover glass-panel">
                            <div className="emoji-picker-header">
                              <input 
                                type="text" 
                                placeholder="Search emojis..." 
                                className="emoji-search-input"
                                value={emojiSearch}
                                onChange={(e) => setEmojiSearch(e.target.value)}
                              />
                              <div className="emoji-categories-nav">
                                <button 
                                  type="button" 
                                  className={`emoji-category-btn ${selectedEmojiCategory === 'All' ? 'active' : ''}`}
                                  onClick={() => { setSelectedEmojiCategory('All'); setEmojiSearch(''); }}
                                >
                                  All
                                </button>
                                {EMOJI_CATEGORIES.map(cat => (
                                  <button 
                                    key={cat.name}
                                    type="button" 
                                    className={`emoji-category-btn ${selectedEmojiCategory === cat.name ? 'active' : ''}`}
                                    onClick={() => { setSelectedEmojiCategory(cat.name); setEmojiSearch(''); }}
                                  >
                                    {cat.name.split(' ')[0]}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="emoji-picker-body">
                              {getFilteredEmojis().map(category => (
                                <div key={category.name} className="emoji-category-section">
                                  <span className="emoji-category-title">{category.name}</span>
                                  <div className="emoji-grid">
                                    {category.emojis.map(emoji => (
                                      <button 
                                        key={emoji} 
                                        type="button" 
                                        tabIndex={-1}
                                        className="emoji-item"
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={(e) => handleEmojiClick(emoji, e)}
                                      >
                                        {emoji}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              ))}
                              {getFilteredEmojis().length === 0 && (
                                <span className="text-center text-xs text-muted py-4">No emojis found</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <input 
                        type="text" 
                        placeholder="Say something to Alaap..." 
                        className="chat-text-input-inside" 
                        value={messageInput}
                        onChange={(e) => {
                          setMessageInput(e.target.value);
                          handleTyping();
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage(e);
                            setEmojiPickerOpen(false);
                          }
                        }}
                      />

                      <button 
                        type="button" 
                        className="voice-inside-btn" 
                        onClick={startRecording} 
                        title="Record voice message"
                      >
                        <Mic size={20} />
                      </button>
                    </div>

                    <button type="submit" className="send-msg-btn" disabled={!messageInput.trim()}>
                      <Send size={18} />
                    </button>
                  </>
                )}
              </form>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

export default ChatArea;
