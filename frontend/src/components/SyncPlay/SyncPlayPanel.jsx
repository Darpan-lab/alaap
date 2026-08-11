import React, { useState, useEffect, useRef } from 'react';
import { Tv, ArrowLeftRight, Play, Pause, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { useDialog } from '../../context/DialogContext';
import { API_BASE_URL } from '../../config';
import { SyncPlayProgressDashboard } from './SyncPlayProgressDashboard';

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
  
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedFraction, setBufferedFraction] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

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
              const cTime = event.target.getCurrentTime();
              const currentActiveChat = activeChatRef.current;
              if (!currentActiveChat) return;

              if (state === 1) { // PLAYING
                socket?.emit('sync_play_update', {
                  chatId: currentActiveChat._id,
                  videoId: syncPlayVideoId,
                  action: 'play',
                  currentTime: cTime,
                  isPlaying: true
                });
              } else if (state === 2) { // PAUSED
                socket?.emit('sync_play_update', {
                  chatId: currentActiveChat._id,
                  videoId: syncPlayVideoId,
                  action: 'pause',
                  currentTime: cTime,
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

  // Update progress bar periodically
  useEffect(() => {
    let interval;
    if (syncPlayActive) {
      interval = setInterval(() => {
        if (ytPlayerRef.current && ytPlayerReadyRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function' && !isDragging) {
          setCurrentTime(ytPlayerRef.current.getCurrentTime() || 0);
          setDuration(ytPlayerRef.current.getDuration() || 0);
          setBufferedFraction(ytPlayerRef.current.getVideoLoadedFraction() || 0);
        }
      }, 500);
    }
    return () => clearInterval(interval);
  }, [syncPlayActive, isDragging]);

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
      const cTime = ytPlayerRef.current.getCurrentTime();
      socket?.emit('sync_play_update', {
        chatId: activeChat._id,
        videoId: syncPlayVideoId,
        action: isPlaying ? 'pause' : 'play',
        currentTime: cTime,
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
      const cTime = ytPlayerRef.current.getCurrentTime() + amount;
      socket?.emit('sync_play_update', {
        chatId: activeChat._id,
        videoId: syncPlayVideoId,
        action: 'seek',
        currentTime: cTime,
        isPlaying: syncPlayIsPlaying
      });

      ignorePlayerStateChangeRef.current = true;
      ytPlayerRef.current.seekTo(cTime, true);
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
          const { currentTime: dbTime, isPlaying, lastUpdatedAt, videoId } = chatData.syncPlay;
          
          let targetTime = dbTime || 0;
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

  const handleSliderChange = (e) => {
    setCurrentTime(parseFloat(e.target.value));
  };

  const handleSliderMouseDown = () => {
    setIsDragging(true);
  };

  const handleSliderMouseUp = (e) => {
    setIsDragging(false);
    const newTime = parseFloat(e.target.value);
    if (ytPlayerRef.current && ytPlayerReadyRef.current) {
      socket?.emit('sync_play_update', {
        chatId: activeChat._id,
        videoId: syncPlayVideoId,
        action: 'seek',
        currentTime: newTime,
        isPlaying: syncPlayIsPlaying
      });
      ignorePlayerStateChangeRef.current = true;
      ytPlayerRef.current.seekTo(newTime, true);
      setTimeout(() => {
        ignorePlayerStateChangeRef.current = false;
      }, 600);
    }
  };

  const formatTime = (secs) => {
    if (isNaN(secs) || !isFinite(secs)) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (!syncPlayActive) return null;

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPercent = bufferedFraction * 100;

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
          <div className="yt-player-container" style={{ position: 'relative' }}>
            <div id="sync-play-yt-player"></div>
            {activeChat?.syncPlay && (activeChat.syncPlay.downloadStatus === 'downloading' || activeChat.syncPlay.downloadStatus === 'failed') && (
              <SyncPlayProgressDashboard 
                status={activeChat.syncPlay.downloadStatus}
                progress={activeChat.syncPlay.downloadProgress || 0}
                stage={activeChat.syncPlay.downloadStage || 'metadata'}
                stageName={activeChat.syncPlay.downloadStage ? activeChat.syncPlay.downloadStage.toUpperCase() : 'Extracting Video Metadata'}
                speed={activeChat.syncPlay.downloadSpeed || ''}
                eta={activeChat.syncPlay.downloadEta || ''}
                downloadedSize={activeChat.syncPlay.downloadedSize || ''}
                totalSize={activeChat.syncPlay.totalSize || ''}
                error={activeChat.syncPlay.downloadError || ''}
                onRetry={() => handleChangeVideo(syncPlayVideoId)}
              />
            )}
          </div>

          <div className="sync-play-controls border-t" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Custom Progress / Buffering Bar */}
            <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', minWidth: '40px', textAlign: 'right' }}>
                {formatTime(currentTime)}
              </span>
              <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input 
                  type="range"
                  min="0"
                  max={duration || 100}
                  value={currentTime}
                  onChange={handleSliderChange}
                  onMouseDown={handleSliderMouseDown}
                  onMouseUp={handleSliderMouseUp}
                  onTouchStart={handleSliderMouseDown}
                  onTouchEnd={handleSliderMouseUp}
                  className="sync-play-progress-slider"
                  style={{
                    width: '100%',
                    height: '6px',
                    WebkitAppearance: 'none',
                    appearance: 'none',
                    background: `linear-gradient(to right, var(--primary, #8b5cf6) ${progressPercent}%, rgba(255, 255, 255, 0.6) ${progressPercent}%, rgba(255, 255, 255, 0.6) ${Math.max(progressPercent, bufferedPercent)}%, rgba(255, 255, 255, 0.2) ${Math.max(progressPercent, bufferedPercent)}%)`,
                    borderRadius: '3px',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                />
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', minWidth: '40px' }}>
                {formatTime(duration)}
              </span>
            </div>

            <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
              <input 
                type="text"
                placeholder="Paste video link..."
                className="sync-play-url-input"
                style={{ width: '100%', paddingRight: '50px' }}
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
                  right: '0',
                  top: '0',
                  padding: '0 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  borderRadius: '0 var(--radius-sm) var(--radius-sm) 0'
                }}
                onClick={() => handleChangeVideo(syncPlayInputUrl)}
                title="Load Video"
              >
                <ArrowRight size={16} />
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

