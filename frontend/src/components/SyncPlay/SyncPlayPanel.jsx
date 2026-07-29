import React, { useState, useEffect, useRef } from 'react';
import { Tv, ArrowLeftRight, Play, Pause } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { useDialog } from '../../context/DialogContext';
import { API_BASE_URL } from '../../config';

export function SyncPlayPanel({ 
  width, 
  onResizeMouseDown, 
  syncPlayLayoutReversed, 
  setSyncPlayLayoutReversed, 
  isSyncPlayHeaderHidden,
  setIsSyncPlayHeaderHidden
}) {
  const { token, user } = useAuth();
  const { 
    socket, 
    activeChat, 
    syncPlayActive, 
    setSyncPlayActive, 
    syncPlayVideoId, 
    setSyncPlayVideoId, 
    syncPlayIsPlaying, 
    setSyncPlayIsPlaying 
  } = useChat();
  const { showConfirm, showAlert } = useDialog();

  const [syncPlayInputUrl, setSyncPlayInputUrl] = useState('');
  const ytPlayerRef = useRef(null);
  const ytPlayerReadyRef = useRef(false);
  const ignorePlayerStateChangeRef = useRef(false);
  
  const activeChatRef = useRef(activeChat);
  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  // Helper: extract youtube id
  const extractYouTubeId = (url) => {
    if (!url) return '';
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : url.trim();
  };

  // YouTube API Player initialization hook
  useEffect(() => {
    if (!activeChat || !syncPlayActive) {
      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.destroy();
        } catch (e) {
          console.error(e);
        }
        ytPlayerRef.current = null;
        ytPlayerReadyRef.current = false;
      }
      return;
    }

    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      if (firstScriptTag && firstScriptTag.parentNode) {
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      } else {
        document.head.appendChild(tag);
      }
    }

    let checkYTInterval;
    const initPlayer = () => {
      if (window.YT && window.YT.Player) {
        clearInterval(checkYTInterval);
        
        if (ytPlayerRef.current) {
          try {
            ytPlayerRef.current.destroy();
          } catch (e) {}
          ytPlayerRef.current = null;
          ytPlayerReadyRef.current = false;
        }

        ytPlayerRef.current = new window.YT.Player('sync-play-yt-player', {
          videoId: syncPlayVideoId || 'dQw4w9WgXcQ',
          playerVars: {
            autoplay: 0,
            controls: 1,
            modestbranding: 1,
            rel: 0,
            iv_load_policy: 3
          },
          events: {
            onReady: (event) => {
              ytPlayerReadyRef.current = true;
              const currentActiveChat = activeChatRef.current;
              if (currentActiveChat && currentActiveChat.syncPlay) {
                const { currentTime, isPlaying, lastUpdatedAt } = currentActiveChat.syncPlay;
                let targetTime = currentTime || 0;
                if (isPlaying && lastUpdatedAt) {
                  const elapsed = (Date.now() - new Date(lastUpdatedAt).getTime()) / 1000;
                  targetTime += elapsed;
                }
                ignorePlayerStateChangeRef.current = true;
                event.target.seekTo(targetTime, true);
                if (isPlaying) {
                  event.target.playVideo();
                } else {
                  event.target.pauseVideo();
                }
                setTimeout(() => {
                  ignorePlayerStateChangeRef.current = false;
                }, 800);
              }
            },
            onStateChange: (event) => {
              if (ignorePlayerStateChangeRef.current) return;

              const state = event.data;
              const currentTime = event.target.getCurrentTime();
              const currentActiveChat = activeChatRef.current;
              if (!currentActiveChat) return;

              if (state === 1) { // PLAYING
                socket?.emit('sync_play_update', {
                  chatId: currentActiveChat._id,
                  videoId: syncPlayVideoId,
                  action: 'play',
                  currentTime,
                  isPlaying: true
                });
              } else if (state === 2) { // PAUSED
                socket?.emit('sync_play_update', {
                  chatId: currentActiveChat._id,
                  videoId: syncPlayVideoId,
                  action: 'pause',
                  currentTime,
                  isPlaying: false
                });
              }
            }
          }
        });
      }
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      checkYTInterval = setInterval(() => {
        if (window.YT && window.YT.Player) {
          initPlayer();
        }
      }, 200);
    }

    return () => {
      clearInterval(checkYTInterval);
    };
  }, [syncPlayActive, activeChat?._id, syncPlayVideoId]);

  // Hook global ref so socket event listener in ChatContext can sync state directly
  useEffect(() => {
    window.ytPlayerRef = ytPlayerRef;
    window.ytPlayerReadyRef = ytPlayerReadyRef;
    window.ignorePlayerStateChangeRef = ignorePlayerStateChangeRef;
    return () => {
      window.ytPlayerRef = null;
      window.ytPlayerReadyRef = null;
      window.ignorePlayerStateChangeRef = null;
    };
  }, []);

  const handleEndSyncPlayGroup = async () => {
    if (!activeChat) return;
    const confirmMessage = activeChat.isGroup 
      ? 'Are you sure you want to end the group Sync Play session? This stops it for everyone.'
      : 'Are you sure you want to end the Sync Play session?';
    if (!await showConfirm(confirmMessage)) return;
    
    socket?.emit('sync_play_toggle', {
      chatId: activeChat._id,
      active: false
    });
  };

  const handleChangeVideo = (url) => {
    if (!url) return;
    const videoId = extractYouTubeId(url);
    if (!videoId) {
      showAlert('Invalid YouTube URL');
      return;
    }

    socket?.emit('sync_play_update', {
      chatId: activeChat._id,
      videoId: videoId,
      action: 'change_video',
      currentTime: 0,
      isPlaying: false
    });

    if (ytPlayerRef.current && ytPlayerReadyRef.current) {
      ignorePlayerStateChangeRef.current = true;
      ytPlayerRef.current.loadVideoById(videoId, 0);
      ytPlayerRef.current.pauseVideo();
      setSyncPlayVideoId(videoId);
      setSyncPlayIsPlaying(false);
      setTimeout(() => {
        ignorePlayerStateChangeRef.current = false;
      }, 600);
    }
    setSyncPlayInputUrl('');
  };

  const handlePlayerPlayPause = () => {
    if (ytPlayerRef.current && ytPlayerReadyRef.current) {
      const isPlaying = ytPlayerRef.current.getPlayerState() === 1;
      const currentTime = ytPlayerRef.current.getCurrentTime();
      socket?.emit('sync_play_update', {
        chatId: activeChat._id,
        videoId: syncPlayVideoId,
        action: isPlaying ? 'pause' : 'play',
        currentTime,
        isPlaying: !isPlaying
      });

      ignorePlayerStateChangeRef.current = true;
      if (isPlaying) {
        ytPlayerRef.current.pauseVideo();
        setSyncPlayIsPlaying(false);
      } else {
        ytPlayerRef.current.playVideo();
        setSyncPlayIsPlaying(true);
      }
      setTimeout(() => {
        ignorePlayerStateChangeRef.current = false;
      }, 600);
    }
  };

  const handleSkipTime = (amount) => {
    if (ytPlayerRef.current && ytPlayerReadyRef.current) {
      const currentTime = ytPlayerRef.current.getCurrentTime() + amount;
      socket?.emit('sync_play_update', {
        chatId: activeChat._id,
        videoId: syncPlayVideoId,
        action: 'seek',
        currentTime,
        isPlaying: syncPlayIsPlaying
      });

      ignorePlayerStateChangeRef.current = true;
      ytPlayerRef.current.seekTo(currentTime, true);
      setTimeout(() => {
        ignorePlayerStateChangeRef.current = false;
      }, 600);
    }
  };

  const handleForceSync = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/chats/${activeChat._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const chatData = await response.json();
        if (chatData.syncPlay && chatData.syncPlay.active) {
          const { currentTime, isPlaying, lastUpdatedAt, videoId } = chatData.syncPlay;
          
          let targetTime = currentTime || 0;
          if (isPlaying && lastUpdatedAt) {
            const elapsed = (Date.now() - new Date(lastUpdatedAt).getTime()) / 1000;
            targetTime += elapsed;
          }

          if (ytPlayerRef.current && ytPlayerReadyRef.current) {
            ignorePlayerStateChangeRef.current = true;
            
            if (videoId && videoId !== syncPlayVideoId) {
              setSyncPlayVideoId(videoId);
              ytPlayerRef.current.loadVideoById(videoId, targetTime);
            } else {
              ytPlayerRef.current.seekTo(targetTime, true);
            }
            
            if (isPlaying) {
              ytPlayerRef.current.playVideo();
              setSyncPlayIsPlaying(true);
            } else {
              ytPlayerRef.current.pauseVideo();
              setSyncPlayIsPlaying(false);
            }

            setTimeout(() => {
              ignorePlayerStateChangeRef.current = false;
            }, 800);
          }
        }
      }
    } catch (e) {
      console.error('Force sync error:', e);
    }
  };

  if (!syncPlayActive) return null;

  return (
    <>
      <div 
        className="resize-handle" 
        onMouseDown={onResizeMouseDown}
      />
      <div 
        className={`chat-right-side sync-play-panel animate-fade-in ${syncPlayLayoutReversed ? 'border-r' : 'border-l'}`}
        style={{ 
          width: `${width}px`,
          maxWidth: window.innerWidth > 768 ? 'calc(100% - 475px)' : 'none',
          flexGrow: 0,
          flexShrink: 0
        }}
      >
        <div className="sync-play-header border-b" style={{ display: isSyncPlayHeaderHidden ? 'none' : 'flex' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Tv size={18} className="animate-pulse" style={{ color: 'var(--primary)' }} />
            <h3 style={{ margin: 0 }}>Sync Play 🍿</h3>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button 
              type="button"
              className="icon-btn desktop-only-btn"
              title="Switch Layout Side"
              onClick={() => setSyncPlayLayoutReversed(prev => !prev)}
              style={{ width: '32px', height: '32px', padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}
            >
              <ArrowLeftRight size={16} />
            </button>
            <button 
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setSyncPlayActive(false)}
            >
              Hide View
            </button>
            <button 
              type="button"
              className="btn btn-danger btn-sm"
              onClick={handleEndSyncPlayGroup}
            >
              End Session
            </button>
          </div>
        </div>

        <div className="sync-play-content">
          <div className="yt-player-container">
            <div id="sync-play-yt-player"></div>
          </div>

          <div className="sync-play-controls border-t">
            <div style={{ position: 'relative', width: '100%', marginBottom: '16px', display: 'flex', alignItems: 'center' }}>
              <input 
                type="text"
                placeholder="Paste video link..."
                className="sync-play-url-input"
                style={{ width: '100%', paddingRight: '75px' }}
                value={syncPlayInputUrl}
                onChange={(e) => setSyncPlayInputUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleChangeVideo(syncPlayInputUrl);
                }}
              />
              <button 
                type="button"
                className="btn btn-primary btn-sm"
                style={{
                  position: 'absolute',
                  right: '5px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  padding: '5px 14px',
                  fontSize: '13px',
                  height: 'calc(100% - 10px)'
                }}
                onClick={() => handleChangeVideo(syncPlayInputUrl)}
              >
                Load
              </button>
            </div>

            <div className="sync-play-buttons" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              <button 
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                onClick={handlePlayerPlayPause}
              >
                {syncPlayIsPlaying ? <Pause size={14} /> : <Play size={14} />}
                <span>{syncPlayIsPlaying ? 'Pause' : 'Play'}</span>
              </button>
              
              <button 
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleSkipTime(-10)}
              >
                -10s
              </button>
              
              <button 
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleSkipTime(10)}
              >
                +10s
              </button>

              <button 
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                onClick={handleForceSync}
                title="Resync if timeline drifted"
              >
                Force Sync 🔄
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default SyncPlayPanel;
