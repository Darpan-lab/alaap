import React, { useState, useEffect, useRef } from 'react';
import { X, Play, Pause, VolumeX, Volume2, Minimize, Maximize, Download } from 'lucide-react';

export const VideoPlayerModal = ({ video, onClose }) => {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isHoveringVolume, setIsHoveringVolume] = useState(false);
  
  const controlsTimeoutRef = useRef(null);
  
  const resetControlsTimeout = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  };

  useEffect(() => {
    resetControlsTimeout();
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [isPlaying]);

  useEffect(() => {
    const handleMouseMove = () => {
      resetControlsTimeout();
    };
    const container = containerRef.current;
    if (container) {
      container.addEventListener('mousemove', handleMouseMove);
    }
    return () => {
      if (container) {
        container.removeEventListener('mousemove', handleMouseMove);
      }
    };
  }, [isPlaying]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === ' ') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        seekForward();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        seekBackward();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPlaying, currentTime, duration]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(err => console.error(err));
    }
  };

  const seekForward = () => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.min(videoRef.current.currentTime + 5, duration);
  };

  const seekBackward = () => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(videoRef.current.currentTime - 5, 0);
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration);
  };

  const handleSliderChange = (e) => {
    if (!videoRef.current) return;
    const time = parseFloat(e.target.value);
    videoRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const handleVolumeChange = (e) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    if (videoRef.current) {
      videoRef.current.volume = vol;
      videoRef.current.muted = vol === 0;
    }
    setIsMuted(vol === 0);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMute = !isMuted;
    videoRef.current.muted = nextMute;
    setIsMuted(nextMute);
    if (!nextMute && volume === 0) {
      setVolume(0.5);
      videoRef.current.volume = 0.5;
    }
  };

  const handlePlaybackRateChange = (rate) => {
    if (!videoRef.current) return;
    videoRef.current.playbackRate = rate;
    setPlaybackRate(rate);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => console.error(err));
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch(err => console.error(err));
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const formatTime = (secs) => {
    if (isNaN(secs) || !isFinite(secs)) return '00:00';
    const mins = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${mins < 10 ? '0' : ''}${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const volumePercent = isMuted ? 0 : volume * 100;

  return (
    <div 
      className="modal-overlay lightbox-overlay video-player-overlay animate-fade-in" 
      onClick={onClose}
      style={{ 
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0, 0, 0, 0.92)',
        backdropFilter: 'blur(15px)',
        WebkitBackdropFilter: 'blur(15px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 15000, 
        padding: '20px 40px'
      }}
    >
      <div 
        className="video-player-top-bar"
        style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          right: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 15002,
          pointerEvents: 'none'
        }}
      >
        <span 
          style={{ 
            color: '#fff', 
            fontSize: '1rem', 
            fontWeight: '500', 
            textShadow: '0 2px 4px rgba(0,0,0,0.8)',
            maxWidth: '70%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {video.name || 'Video Attachment'}
        </span>
        <button 
          className="icon-btn lightbox-close-btn" 
          onClick={onClose}
          style={{
            color: '#fff',
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '50%',
            padding: '10px',
            cursor: 'pointer',
            pointerEvents: 'auto',
            transition: 'all var(--transition-fast)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
            e.currentTarget.style.transform = 'scale(1.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <X size={24} />
        </button>
      </div>

      <div 
        ref={containerRef}
        className="video-player-container" 
        onClick={(e) => e.stopPropagation()} 
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          maxWidth: '1000px',
          maxHeight: '75vh',
          aspectRatio: '16/9',
          background: '#000',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85)',
          border: '1px solid rgba(255, 255, 255, 0.08)'
        }}
      >
        <video 
          ref={videoRef}
          src={video.url}
          className="video-element"
          onClick={togglePlay}
          onDoubleClick={toggleFullscreen}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            cursor: 'pointer'
          }}
        />

        {!isPlaying && (
          <div 
            onClick={togglePlay}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'rgba(99, 102, 241, 0.8)',
              borderRadius: '50%',
              width: '72px',
              height: '72px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
              transition: 'all 0.2s ease',
              color: '#fff',
              zIndex: 5
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1.1)';
              e.currentTarget.style.background = 'rgba(99, 102, 241, 0.95)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1)';
              e.currentTarget.style.background = 'rgba(99, 102, 241, 0.8)';
            }}
          >
            <Play size={36} fill="#fff" style={{ display: 'block', marginLeft: '3px' }} />
          </div>
        )}

        <div 
          className={`video-controls-bar ${showControls ? 'visible' : 'hidden'}`}
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'linear-gradient(to top, rgba(0, 0, 0, 0.9) 0%, rgba(0, 0, 0, 0.4) 70%, transparent 100%)',
            padding: '24px 20px 16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            transition: 'opacity 0.3s ease, transform 0.3s ease',
            transform: showControls ? 'translateY(0)' : 'translateY(10px)',
            opacity: showControls ? 1 : 0,
            pointerEvents: showControls ? 'auto' : 'none',
            zIndex: 10
          }}
        >
          <div 
            className="video-progress-container"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              position: 'relative'
            }}
          >
            <input 
              type="range" 
              min="0" 
              max={duration || 100} 
              value={currentTime} 
              onChange={handleSliderChange}
              className="video-progress-slider"
              style={{
                width: '100%',
                height: '4px',
                WebkitAppearance: 'none',
                appearance: 'none',
                background: `linear-gradient(to right, var(--primary, #8b5cf6) ${progressPercent}%, rgba(255, 255, 255, 0.2) ${progressPercent}%)`,
                borderRadius: '2px',
                outline: 'none',
                cursor: 'pointer',
                transition: 'height 0.1s ease'
              }}
            />
          </div>

          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button 
                type="button" 
                onClick={togglePlay}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '4px',
                  borderRadius: '4px',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
              >
                {isPlaying ? <Pause size={20} fill="#fff" /> : <Play size={20} fill="#fff" />}
              </button>

              <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem', fontFamily: 'monospace' }}>
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>

              <div 
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                onMouseEnter={() => setIsHoveringVolume(true)}
                onMouseLeave={() => setIsHoveringVolume(false)}
              >
                <button 
                  type="button" 
                  onClick={toggleMute}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#fff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4px',
                    borderRadius: '4px',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                >
                  {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>

                <div 
                  style={{
                    width: isHoveringVolume ? '70px' : '0px',
                    opacity: isHoveringVolume ? 1 : 0,
                    overflow: 'hidden',
                    transition: 'width 0.2s ease, opacity 0.2s ease',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <input 
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    style={{
                      width: '60px',
                      height: '4px',
                      WebkitAppearance: 'none',
                      appearance: 'none',
                      background: `linear-gradient(to right, #fff ${volumePercent}%, rgba(255,255,255,0.2) ${volumePercent}%)`,
                      borderRadius: '2px',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <select
                  value={playbackRate}
                  onChange={(e) => handlePlaybackRateChange(parseFloat(e.target.value))}
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#fff',
                    borderRadius: '4px',
                    padding: '2px 6px',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                >
                  <option value="0.5" style={{ background: '#131520', color: '#fff' }}>0.5x</option>
                  <option value="1" style={{ background: '#131520', color: '#fff' }}>1.0x</option>
                  <option value="1.5" style={{ background: '#131520', color: '#fff' }}>1.5x</option>
                  <option value="2" style={{ background: '#131520', color: '#fff' }}>2.0x</option>
                </select>
              </div>

              <button 
                type="button" 
                onClick={toggleFullscreen}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '4px',
                  borderRadius: '4px',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
              >
                {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <a 
        href={video.url} 
        download={video.name}
        style={{
          marginTop: '15px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: 'rgba(255, 255, 255, 0.7)',
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.1)',
          padding: '8px 16px',
          borderRadius: '20px',
          fontSize: '0.85rem',
          textDecoration: 'none',
          transition: 'all 0.2s'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
          e.currentTarget.style.color = '#fff';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
          e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
        }}
      >
        <Download size={16} />
        Download Video
      </a>
    </div>
  );
};

export default VideoPlayerModal;
