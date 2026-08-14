import React, { useState, useEffect, useRef } from 'react';
import { Tv, ArrowLeftRight, Play, Pause, ArrowRight, RefreshCw } from 'lucide-react';
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
  const [syncLagSec, setSyncLagSec] = useState(0);
  const lastSeekTimeRef = useRef(0);

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
              const state = event.data;
              if (ignorePlayerStateChangeRef.current) {
                if (state === 1 || state === 2) {
                  ignorePlayerStateChangeRef.current = false;
                }
                return;
              }

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

  const peerProgressMapRef = useRef({});

  useEffect(() => {
    if (!socket) return;
    const handlePing = ({ chatId, userId, currentTime, isPlaying, timestamp }) => {
      if (activeChatRef.current && activeChatRef.current._id === chatId && userId) {
        peerProgressMapRef.current[userId] = {
          currentTime: currentTime || 0,
          isPlaying: !!isPlaying,
          timestamp: timestamp || Date.now()
        };
      }
    };
    socket.on('sync_play_ping_broadcast', handlePing);
    return () => socket.off('sync_play_ping_broadcast', handlePing);
  }, [socket]);

  // Update progress bar periodically & compute lag behind
  useEffect(() => {
    let interval;
    let pingCounter = 0;

    if (syncPlayActive) {
      interval = setInterval(() => {
        if (ytPlayerRef.current && ytPlayerReadyRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
          // Suppress lag display during drag, active seeking, or within 3.5s of seek
          const isRecentlySeeked = (Date.now() - lastSeekTimeRef.current) < 3500;
          if (isDragging || ignorePlayerStateChangeRef.current || isRecentlySeeked) {
            setSyncLagSec(0);
            return;
          }

          const localTime = ytPlayerRef.current.getCurrentTime() || 0;
          setCurrentTime(localTime);
          setDuration(ytPlayerRef.current.getDuration() || 0);
          setBufferedFraction(ytPlayerRef.current.getVideoLoadedFraction() || 0);

          let isPlayingLocal = false;
          try {
            isPlayingLocal = ytPlayerRef.current.getPlayerState() === 1;
          } catch (e) {}

          // Periodically emit sync_play_ping
          pingCounter++;
          if (pingCounter >= 5 && activeChatRef.current) {
            pingCounter = 0;
            socket?.emit('sync_play_ping', {
              chatId: activeChatRef.current._id,
              currentTime: localTime,
              isPlaying: isPlayingLocal
            });
          }

          const now = Date.now();
          // Master lead time initialized to local user time
          let masterLeadTime = isFinite(localTime) && !isNaN(localTime) ? localTime : 0;

          // 1. Consider active room peers' live pings (within last 10s)
          let hasActivePeers = false;
          if (peerProgressMapRef.current) {
            Object.values(peerProgressMapRef.current).forEach(peer => {
              if (!peer || !peer.timestamp) return;
              if (now - peer.timestamp > 10000) return;

              hasActivePeers = true;
              let peerTime = peer.currentTime || 0;
              if (peer.isPlaying && peer.timestamp) {
                const elapsed = Math.max(0, (now - peer.timestamp) / 1000);
                if (elapsed < 300) {
                  peerTime += elapsed;
                }
              }
              if (isFinite(peerTime) && !isNaN(peerTime)) {
                masterLeadTime = Math.max(masterLeadTime, peerTime);
              }
            });
          }

          // 2. Fallback to DB syncPlay record only if no active peers are broadcasting and dbTarget is plausible
          if (!hasActivePeers && activeChatRef.current && activeChatRef.current.syncPlay && activeChatRef.current.syncPlay.active) {
            const { currentTime: dbTime, isPlaying: dbPlaying, lastUpdatedAt } = activeChatRef.current.syncPlay;
            let dbTarget = dbTime || 0;
            if (dbPlaying && lastUpdatedAt) {
              const parsed = new Date(lastUpdatedAt).getTime();
              if (!isNaN(parsed)) {
                const elapsed = Math.max(0, (now - parsed) / 1000);
                if (elapsed < 60) {
                  dbTarget += elapsed;
                }
              }
            }
            if (isFinite(dbTarget) && !isNaN(dbTarget)) {
              if (Math.abs(dbTarget - localTime) < 300) {
                masterLeadTime = Math.max(masterLeadTime, dbTarget);
              }
            }
          }

          const lag = masterLeadTime - localTime;
          setSyncLagSec(isFinite(lag) && !isNaN(lag) && lag > 0.05 ? lag : 0);
        }
      }, 300);
    } else {
      setSyncLagSec(0);
    }
    return () => clearInterval(interval);
  }, [syncPlayActive, isDragging, socket]);

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
    lastSeekTimeRef.current = Date.now();
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
    lastSeekTimeRef.current = Date.now();

    const now = Date.now();
    let localTime = 0;
    if (ytPlayerRef.current && ytPlayerReadyRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
      localTime = ytPlayerRef.current.getCurrentTime() || 0;
    }

    let liveLeaderTime = isFinite(localTime) && !isNaN(localTime) ? localTime : 0;
    let hasLivePeers = false;

    if (peerProgressMapRef.current) {
      Object.values(peerProgressMapRef.current).forEach(peer => {
        if (!peer || !peer.timestamp) return;
        if (now - peer.timestamp > 10000) return;

        hasLivePeers = true;
        let peerTime = peer.currentTime || 0;
        if (peer.isPlaying && peer.timestamp) {
          const elapsed = Math.max(0, (now - peer.timestamp) / 1000);
          if (elapsed < 300) {
            peerTime += elapsed;
          }
        }
        if (isFinite(peerTime) && !isNaN(peerTime)) {
          liveLeaderTime = Math.max(liveLeaderTime, peerTime);
        }
      });
    }

    // If live peers exist in the room, instantly force sync to the live leader!
    if (hasLivePeers && liveLeaderTime > 0) {
      if (ytPlayerRef.current && ytPlayerReadyRef.current) {
        ignorePlayerStateChangeRef.current = true;
        ytPlayerRef.current.seekTo(liveLeaderTime, true);
        ytPlayerRef.current.playVideo();
        setSyncPlayIsPlaying(true);
        setSyncLagSec(0);

        setTimeout(() => {
          ignorePlayerStateChangeRef.current = false;
        }, 800);
      }
      return;
    }

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
                className="btn btn-primary btn-sm sync-play-load-btn"
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
                className={`btn btn-sm ${syncLagSec > 1.0 ? 'btn-danger animate-pulse' : 'btn-secondary'}`}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '4px',
                  backgroundColor: syncLagSec > 1.0 ? '#ef4444' : undefined,
                  color: syncLagSec > 1.0 ? '#ffffff' : undefined,
                  borderColor: syncLagSec > 1.0 ? '#dc2626' : undefined,
                  boxShadow: syncLagSec > 1.0 ? '0 0 12px rgba(239, 68, 68, 0.6)' : undefined,
                  transition: 'all 0.2s ease'
                }}
                onClick={handleForceSync}
                title={syncLagSec > 1.0 ? `Lagging behind by ${syncLagSec < 60 ? syncLagSec.toFixed(1) + 's' : Math.floor(syncLagSec / 60) + 'm ' + (syncLagSec % 60).toFixed(1) + 's'} - Click to Force Sync` : "Resync if timeline drifted"}
              >
                <RefreshCw size={14} className={syncLagSec > 1.0 ? 'animate-spin' : ''} />
                <span>
                  Force Sync{syncLagSec > 0.1 ? ` (-${syncLagSec < 60 ? syncLagSec.toFixed(1) + 's' : Math.floor(syncLagSec / 60) + 'm ' + (syncLagSec % 60).toFixed(1) + 's'})` : ''}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default SyncPlayPanel;

