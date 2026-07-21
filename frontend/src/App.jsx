import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { 
  MessageSquare, Send, Image, Video, User, Plus, Search, LogOut, 
  Settings, Shield, Trash2, Key, FileText, Download, Users, X, 
  Loader2, UploadCloud, Check, CheckCheck, Lock, ToggleLeft, ToggleRight, Sparkles, ChevronRight, Edit, ArrowLeft, ArrowLeftRight,
  Smile, Mic, Play, Pause, CornerUpLeft, Ban, Unlock, MoreVertical, Tv, Eye, EyeOff, UserMinus, PanelLeftClose, PanelLeftOpen, Info,
  Volume2, Volume1, VolumeX, Maximize, Minimize, RefreshCw, History, ScreenShare, Bell, BellOff
} from 'lucide-react';
import { API_BASE_URL, SOCKET_URL } from './config';
import './App.css';

const EMOJI_CATEGORIES = [
  {
    name: 'Smileys & Emotion',
    emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🥸', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🫣', '🤭', '🫢', '🫡', '🤫', '🫠', '👽', '💀', '👻', '💩', '🔥', '✨', '🎈', '🎉']
  },
  {
    name: 'Gestures & Body',
    emojis: ['👍', '👎', '👊', '✊', '🤛', '🤜', '🤞', '✌️', '🤟', '🤘', '👌', '🤌', '🤏', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐', '🖖', '👋', '🤙', '💪', '🦾', '🖕', '✍️', '🙏', '🤝', '👏', '🙌', '👐', '🤲', '💅', '🤳', '👂', '👃', '🧠', '👀', '👁', '👅', '👄']
  },
  {
    name: 'Hearts & Symbols',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❤️‍🔥', '❤️‍🩹', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉', '☸️', '✡️', '☯️', '💯', '❌', '⭕️', '🚫', '⚠️', '🛡', '🔒', '🔑', '💎', '💡', '🔔']
  },
  {
    name: 'Animals & Nature',
    emojis: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🕷', '🐢', '🐍', '🦎', '🐙', '🦑', '🦞', '🦀', '🐠', '🦈', '🐊', '🐆', '🐈', '🐕', '🐩', '🐑', '🐐', '🐪', '🐘', '🦒', '🐾', '🌲', '🌳', '🌴', '🌵', '🌱', '🌿', '☘️', '🍀', '🍁', '🍂', '🍃', '🌸', '🌹', '🌺', '🌻', '🌼', '🌷', '🌾']
  },
  {
    name: 'Food & Drink',
    emojis: ['🍏', '🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🥔', '🥕', '🌽', '🌶', '🫑', '🧅', '🧄', '🍄', '🥜', '🌰', '🍞', '🥐', '🧀', '🍖', '🍗', '🥩', '🥓', '🍔', '🍟', '🍕', '🌭', '🥪', '🌮', '🌯', '🍳', '🥘', '🍲', '🥣', '🥗', '🍿', '🧈', '🍣', '🍤', '🍜', '🍝', '🍦', '🍧', '🍩', '🍪', '🎂', '🍰', '🧁', '🍫', '🍬', '🍭', '🍮', '🍯', '🥛', '☕️', '🍵', '🍺', '🍻', '🥂', '🍷', '🥃', '🥤']
  },
  {
    name: 'Travel & Activities',
    emojis: ['🚗', '🚕', '🚙', '🏎', '🚓', '🚑', '🚒', '🚐', '🚚', '🚜', '🛵', '🏍', '🚨', '🚲', '🛴', '✈️', '🛫', '🛬', '🚀', '🛸', '🚁', '⛵️', '🚤', '🚢', '⚓️', '🗺', '🗽', '🗼', '🏰', '🏟', '🎡', '🏔', '🌋', '🏖', '🏕', '🏜', '🏝', '⚽️', '🏀', '🏈', '⚾️', '🎾', '🏐', '🏉', '🎱', '🏓', '🏸', '🏒', '⛳️', '🏹', '🎣', '🥊', '🥋', '🛹', '⛷', '🏋️‍♀️', '🏋️‍♂️', '🧘‍♀️', '🧘‍♂️', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖', '🎫', '🎟', '🎭', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁', '🎸', '🎻', '🎲', '🧩', '🎳', '🎯']
  }
];

const EMOJI_KEYWORDS = {
  '😀': 'smile happy grin face', '😃': 'smile happy grin face', '😄': 'smile happy grin face', '😁': 'smile happy grin face',
  '😆': 'smile happy grin face laugh', '😅': 'smile happy sweat', '😂': 'laugh cry lol tear face', '🤣': 'laugh lol roll floor',
  '😊': 'smile happy blush face', '😇': 'angel halo innocent', '🙂': 'smile face', '🙃': 'upside down face',
  '😉': 'wink face', '😌': 'relieved face', '😍': 'heart eyes love like', '🥰': 'hearts love happy blush',
  '😘': 'kiss blow heart', '😗': 'kiss face', '😙': 'kiss face', '😚': 'kiss closed eyes',
  '😋': 'yum tongue delicious food', '😛': 'tongue face', '😝': 'tongue squint eyes', '😜': 'tongue wink',
  '🤪': 'crazy wild goofy', '🤨': 'raise eyebrow', '🧐': 'monocle look spy', '🤓': 'nerd glasses',
  '😎': 'cool sunglasses glasses', '🥸': 'disguise mask', '🤩': 'star eyes wow', '🥳': 'party celebrate hat',
  '😏': 'smirk face', '😒': 'unamused meh', '😞': 'sad disappointed face', '😔': 'sad pensive',
  '😟': 'worried face', '😕': 'confused face', '🙁': 'frown sad face', '☹️': 'frown sad face',
  '😣': 'persevere face', '😖': 'confounded face', '😫': 'tired weary face', '😩': 'weary tired face',
  '🥺': 'pleading beg eyes', '😢': 'cry tear sad', '😭': 'cry tear sob sad', '😤': 'triumph steam angry',
  '😠': 'angry mad face', '😡': 'rage angry mad', '🤬': 'swear curse red face', '🤯': 'explode mind head',
  '😳': 'blush flushed surprise', '🥵': 'hot sweat red', '🥶': 'cold blue ice', '😱': 'scream fear wow',
  '😨': 'fear scared face', '😰': 'fear sweat face', '😥': 'sad sweat relief', '😓': 'sweat cold',
  '🤗': 'hug face', '🤔': 'think ponder question', '🫣': 'peeking eye', '🤭': 'giggle hand mouth',
  '🫢': 'gasp open mouth', '🫡': 'salute military', '🤫': 'shh quiet silence', '🫠': 'melt hot',
  '👽': 'alien space', '💀': 'skull death skeleton', '👻': 'ghost scary', '💩': 'poop turd',
  '🔥': 'fire hot burn flame', '✨': 'sparkles shine magic', '🎈': 'balloon party celebrate', '🎉': 'popper party celebrate',
  '👍': 'thumbs up ok good yes', '👎': 'thumbs down bad no', '👊': 'fist punch', '✊': 'fist raise',
  '🤛': 'fist left', '🤜': 'fist right', '🤞': 'fingers crossed luck', '✌️': 'peace sign victory',
  '🤟': 'love sign finger', '🤘': 'rock on horn sign', '👌': 'ok okay correct', '🤌': 'pinched fingers italian',
  '🤏': 'pinched hand small', '👈': 'point left', '👉': 'point right', '👆': 'point up',
  '👇': 'point down', '☝️': 'point up index', '✋': 'hand stop raise', '🤚': 'backhand raise',
  '🖐': 'hand splayed fingers', '🖖': 'vulcan salute spock', '👋': 'wave hello goodbye', '🤙': 'call me phone',
  '💪': 'muscle bicep strong', '🦾': 'mechanical arm robot', '🖕': 'middle finger', '✍️': 'write pen hand',
  '🙏': 'pray please thank highfive', '🤝': 'handshake deal agree', '👏': 'clap applaud', '🙌': 'hooray hands raise',
  '👐': 'open hands', '🤲': 'palms together', '💅': 'nail polish care', '🤳': 'selfie phone camera',
  '👂': 'ear hear listen', '👃': 'nose smell', '🧠': 'brain mind think', '👀': 'eyes look see',
  '👁': 'eye look see', '👅': 'tongue mouth', '👄': 'lips mouth kiss',
  '❤️': 'heart love red', '🧡': 'heart orange', '💛': 'heart yellow', '💚': 'heart green',
  '💙': 'heart blue', '💜': 'heart purple', '🖤': 'heart black', '🤍': 'heart white',
  '🤎': 'heart brown', '💔': 'broken heart sad', '❤️‍🔥': 'heart fire love', '❤️‍🩹': 'mending heart heal',
  '❣️': 'heart exclamation mark', '💕': 'two hearts love', '💞': 'revolving hearts love', '💓': 'beating heart love',
  '💗': 'growing heart love', '💖': 'sparkle heart love', '💘': 'arrow heart love', '💝': 'gift heart ribbon',
  '💟': 'heart decoration', '☮️': 'peace sign symbol', '✝️': 'cross religion christian', '☪️': 'crescent moon islam',
  '🕉': 'om symbol hinduism', '☸️': 'wheel dharma buddhism', '✡️': 'star david jewish', '☯️': 'yin yang chinese',
  '💯': '100 points perfect', '❌': 'cross mark wrong no', '⭕️': 'circle heavy red', '🚫': 'prohibited sign ban',
  '⚠️': 'warning danger sign', '🛡': 'shield protect defense', '🔒': 'lock secure privacy', '🔑': 'key unlock open',
  '💎': 'gem stone diamond', '💡': 'light bulb idea electricity', '🔔': 'bell notification ring'
};

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

const AudioMessagePlayer = ({ src }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };
    
    if (audio.readyState >= 1 && audio.duration) {
      setDuration(audio.duration);
    }

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('durationchange', handleLoadedMetadata);

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('durationchange', handleLoadedMetadata);
    };
  }, [src]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(err => console.error("Audio playback error:", err));
    }
  };

  const handleSliderChange = (e) => {
    if (!audioRef.current) return;
    const time = parseFloat(e.target.value);
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const formatTime = (secs) => {
    if (isNaN(secs) || !isFinite(secs)) return '0:00';
    const mins = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="custom-audio-player">
      <audio ref={audioRef} src={src} preload="metadata" />
      
      <button 
        type="button" 
        className="audio-play-btn" 
        onClick={togglePlay}
        title={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
      </button>

      <div className="audio-player-info">
        <div className="audio-progress-container">
          <input 
            type="range" 
            min="0" 
            max={duration || 100} 
            value={currentTime} 
            onChange={handleSliderChange}
            className="audio-progress-slider"
            style={{
              background: `linear-gradient(to right, var(--audio-progress-fill, var(--primary)) ${progressPercent}%, var(--audio-progress-track, rgba(255, 255, 255, 0.1)) ${progressPercent}%)`
            }}
          />
        </div>
        <div className="audio-time-row">
          <span className="audio-time-label">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>
      </div>
      
      <div className="audio-wave-icon">
        <Mic size={16} />
      </div>
    </div>
  );
};

const VideoPlayerModal = ({ video, onClose }) => {
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
    videoRef.current.playbackRate = playbackRate;
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
                  <option value="0.75" style={{ background: '#131520', color: '#fff' }}>0.75x</option>
                  <option value="1" style={{ background: '#131520', color: '#fff' }}>1.0x (Normal)</option>
                  <option value="1.25" style={{ background: '#131520', color: '#fff' }}>1.25x</option>
                  <option value="1.5" style={{ background: '#131520', color: '#fff' }}>1.5x</option>
                  <option value="1.75" style={{ background: '#131520', color: '#fff' }}>1.75x</option>
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
          e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
          e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
        }}
      >
        <Download size={16} />
        Download Video
      </a>
    </div>
  );
};

function App() {
  // Authentication State
  const [token, setToken] = useState(localStorage.getItem('alaap_token') || '');
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(!!localStorage.getItem('alaap_token'));

  // Width Resizing States
  const [sidebarWidth, setSidebarWidth] = useState(320); // Default sidebar width
  const [syncPlayWidth, setSyncPlayWidth] = useState(600); // Default sync play width
  const [infoPanelWidth, setInfoPanelWidth] = useState(320); // Default info panel width

  const handleSidebarResizeMouseDown = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = sidebarWidth;
    
    const handleMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      setSidebarWidth(Math.max(220, Math.min(450, startWidth + deltaX)));
    };
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
  };

  const handleSyncPlayResizeMouseDown = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = syncPlayWidth;
    
    const handleMouseMove = (moveEvent) => {
      const container = document.querySelector('.chat-body-container');
      const containerWidth = container ? container.getBoundingClientRect().width : window.innerWidth;
      const deltaX = syncPlayLayoutReversed ? (moveEvent.clientX - startX) : (startX - moveEvent.clientX);
      const newWidth = startWidth + deltaX;
      
      // Stop sliding when chatting inbox hits its minimum width of 460px (plus 15px safety buffer)
      const minInboxWidth = window.innerWidth > 768 ? 475 : 100;
      const maxSyncPlayWidth = Math.max(350, containerWidth - minInboxWidth);
      setSyncPlayWidth(Math.max(350, Math.min(maxSyncPlayWidth, newWidth)));
    };
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
  };

  const handleInfoPanelResizeMouseDown = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = infoPanelWidth;
    
    const handleMouseMove = (moveEvent) => {
      const deltaX = startX - moveEvent.clientX;
      setInfoPanelWidth(Math.max(280, Math.min(500, startWidth + deltaX)));
    };
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
  };
  
  // App UI State
  const [activeTab, setActiveTab] = useState('chats'); // 'chats' or 'admin'
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [activeChat, setActiveChat] = useState(null);
  const [chats, setChats] = useState([]);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [editingMessage, setEditingMessage] = useState(null);
  const [activeDropdownMessageId, setActiveDropdownMessageId] = useState(null);
  
  // Search & Modals
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedGroupMembers, setSelectedGroupMembers] = useState([]);
  
  // File Upload State
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSharingFrame, setIsSharingFrame] = useState(false);
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
  
  // Reaction & Reply States
  const [replyingToMessage, setReplyingToMessage] = useState(null);
  const [activeReactionMessageId, setActiveReactionMessageId] = useState(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const isRecordingCancelledRef = useRef(false);
  
  // Socket & Scroll Refs
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  
  // Typing indicators state
  const [typingUsers, setTypingUsers] = useState({}); // { chatId: { userId: username } }
  
  // System-wide Settings (for Auth signup status checks)
  const [systemSignupSettings, setSystemSignupSettings] = useState({
    signupEnabled: true,
    inviteOnlyEnabled: false
  });

  // Settings Pane State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Notification system states
  const [notificationSettings, setNotificationSettings] = useState(() => {
    const defaults = {
      userChats: { soundEnabled: true, inAppBannerEnabled: true, desktopEnabled: true },
      groupChats: { soundEnabled: true, inAppBannerEnabled: true, desktopEnabled: true }
    };
    try {
      const stored = localStorage.getItem('alaap_notification_settings');
      if (!stored) return defaults;
      const parsed = JSON.parse(stored);
      return {
        userChats: { ...defaults.userChats, ...(parsed?.userChats || {}) },
        groupChats: { ...defaults.groupChats, ...(parsed?.groupChats || {}) }
      };
    } catch (e) {
      return defaults;
    }
  });

  const [notifications, setNotifications] = useState(() => {
    try {
      const stored = localStorage.getItem('alaap_notifications');
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  });

  const [showNotificationCenter, setShowNotificationCenter] = useState(false);
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    localStorage.setItem('alaap_notification_settings', JSON.stringify(notificationSettings));
  }, [notificationSettings]);

  useEffect(() => {
    localStorage.setItem('alaap_notifications', JSON.stringify(notifications));
  }, [notifications]);

  // Request browser desktop notification permission
  const requestNotificationPermission = async (chatType) => {
    if (!('Notification' in window)) {
      alert('This browser does not support desktop notifications.');
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setNotificationSettings(prev => ({
        ...prev,
        [chatType]: {
          ...prev[chatType],
          desktopEnabled: true
        }
      }));
    } else {
      alert('Permission for desktop notifications was denied. You may need to enable them in your browser settings.');
      setNotificationSettings(prev => ({
        ...prev,
        [chatType]: {
          ...prev[chatType],
          desktopEnabled: false
        }
      }));
    }
  };

  // Web Audio API Synthesised Chime Sound
  const playNotificationSound = () => {
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

  const isChatMuted = (chat) => {
    if (!chat || !chat.mutedBy) return false;
    const currentId = (user?.id || user?._id)?.toString();
    return chat.mutedBy.some(id => (id._id || id).toString() === currentId);
  };

  const handleToggleMuteChat = async (chatId) => {
    if (!token) return;
    const chat = chats.find(c => c._id === chatId);
    if (!chat) return;

    const isMuted = isChatMuted(chat);
    const endpoint = isMuted ? 'unmute' : 'mute';

    try {
      const response = await fetch(`${API_BASE_URL}/chats/${chatId}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.chat) {
          setChats(prev => prev.map(c => c._id === chatId ? data.chat : c));
          if (activeChat && activeChat._id === chatId) {
            setActiveChat(data.chat);
          }
        }
        showAlert(`Notifications ${isMuted ? 'unmuted' : 'muted'} for this chat.`, 'Notification Settings');
      } else {
        const errorData = await response.json();
        showAlert(errorData.error || `Failed to modify notification settings.`, 'Error');
      }
    } catch (err) {
      console.error(`Error toggling mute status:`, err);
      showAlert(`Network error while modifying notification settings.`, 'Error');
    }
  };

  const triggerNotificationAlert = (chat, message) => {
    if (chat && isChatMuted(chat)) {
      console.log('Chat is muted, skipping notifications.');
      return;
    }

    const isGroup = chat ? chat.isGroup : false;
    const chatType = isGroup ? 'groupChats' : 'userChats';
    const config = notificationSettings[chatType];

    if (config.soundEnabled) {
      playNotificationSound();
    }

    const senderUsername = message.sender?.username || 'Someone';
    const chatName = chat ? (chat.isGroup ? chat.name : senderUsername) : senderUsername;
    const title = chat?.isGroup ? `${chatName} (${senderUsername})` : senderUsername;
    const contentText = message.content || (message.fileUrl ? '📁 Attachment' : 'New message');
    
    addNotificationToHistory({
      type: 'message',
      title: chatName,
      message: `${senderUsername}: ${contentText}`,
      chatId: message.chat
    });

    if (config.inAppBannerEnabled) {
      addToast({
        title: chatName,
        message: `${senderUsername}: ${contentText}`,
        avatar: message.sender?.profilePic || '',
        onClick: () => {
          const targetChat = chatsRef.current.find(c => c._id === message.chat);
          if (targetChat) setActiveChat(targetChat);
        }
      });
    }

    if (config.desktopEnabled && Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body: contentText,
        icon: '/favicon.ico',
        tag: message.chat
      });
      notification.onclick = () => {
        window.focus();
        const targetChat = chatsRef.current.find(c => c._id === message.chat);
        if (targetChat) setActiveChat(targetChat);
        notification.close();
      };
    }
  };

  const markAllNotificationsAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearNotificationHistory = () => {
    setNotifications([]);
  };

  // PWA installation state
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Handle PWA automatic update detection and force reload
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      let refreshing = false;
      const handleControllerChange = () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      };
      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
      return () => {
        navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      };
    }
  }, []);

  // Track if fullscreen mode is active
  const [isFullscreenActive, setIsFullscreenActive] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreenActive(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Handle automatic cache reset on client version update
  useEffect(() => {
    const checkVersionAndResetCache = async () => {
      const APP_VERSION = '1.0.2'; // Increment this value on code updates
      window.APP_VERSION = APP_VERSION; // Expose globally for console access
      const storedVersion = localStorage.getItem('alaap_app_version');
      
      if (storedVersion && storedVersion !== APP_VERSION) {
        console.log(`[Version Check] Mismatch: Local=${storedVersion}, Build=${APP_VERSION}. Wiping cache...`);
        
        try {
          // 1. Unregister all active service workers
          if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (let registration of registrations) {
              await registration.unregister();
              console.log('[Version Check] Service worker unregistered.');
            }
          }
          
          // 2. Clear all cache namespaces in Cache Storage
          if ('caches' in window) {
            const cacheNames = await caches.keys();
            for (let name of cacheNames) {
              await caches.delete(name);
              console.log(`[Version Check] Cache storage namespace deleted: ${name}`);
            }
          }
          
          // Update version token
          localStorage.setItem('alaap_app_version', APP_VERSION);
          
          // 3. Force clean page reload
          window.location.reload();
        } catch (error) {
          console.error('[Version Check] Cache reset error:', error);
        }
      } else if (!storedVersion) {
        // Fresh client load: set current build version
        localStorage.setItem('alaap_app_version', APP_VERSION);
      }
    };

    checkVersionAndResetCache();
  }, []);

  // Automatically request desktop notification permissions on startup
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      const timer = setTimeout(async () => {
        try {
          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            console.log('[Notification] Permission granted automatically on startup.');
            setNotificationSettings(prev => {
              const updated = {
                ...prev,
                userChats: { ...prev.userChats, desktopEnabled: true },
                groupChats: { ...prev.groupChats, desktopEnabled: true }
              };
              localStorage.setItem('alaap_notification_settings', JSON.stringify(updated));
              return updated;
            });
          } else {
            console.log('[Notification] Permission denied/dismissed.');
            setNotificationSettings(prev => {
              const updated = {
                ...prev,
                userChats: { ...prev.userChats, desktopEnabled: false },
                groupChats: { ...prev.groupChats, desktopEnabled: false }
              };
              localStorage.setItem('alaap_notification_settings', JSON.stringify(updated));
              return updated;
            });
          }
        } catch (error) {
          console.error('[Notification] Error requesting permission on startup:', error);
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Group creation search states
  const [groupMemberSearchQuery, setGroupMemberSearchQuery] = useState('');
  const [groupMemberSearchResults, setGroupMemberSearchResults] = useState([]);

  // Manage Group Members states (for existing groups)
  const [addMemberSearchQuery, setAddMemberSearchQuery] = useState('');
  const [addMemberSearchResults, setAddMemberSearchResults] = useState([]);
  const [isSidebarHidden, setIsSidebarHidden] = useState(false);
  const [isInfoPanelOpen, setIsInfoPanelOpen] = useState(false);

  // Group Settings states
  const [groupSettingsName, setGroupSettingsName] = useState('');
  const [groupSettingsPicUrl, setGroupSettingsPicUrl] = useState('');
  const [uploadingGroupPic, setUploadingGroupPic] = useState(false);
  const [groupSettingsError, setGroupSettingsError] = useState('');
  const [groupSettingsSuccess, setGroupSettingsSuccess] = useState('');
  const groupPicFileInputRef = useRef(null);
  
  // Image Lightbox and Annotation states
  const [previewImageUrl, setPreviewImageUrl] = useState(null);
  const [previewImageMsg, setPreviewImageMsg] = useState(null);
  const [isAnnotating, setIsAnnotating] = useState(false);
  const [toolbarPos, setToolbarPos] = useState({ x: 50, y: 120 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushColor, setBrushColor] = useState('#ff4d4d');
  const [brushSize, setBrushSize] = useState(5);
  const [tool, setTool] = useState('draw'); // 'draw', 'erase'
  const [history, setHistory] = useState([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDraggingToolbar, setIsDraggingToolbar] = useState(false);

  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const lastPos = useRef({ x: 0, y: 0 });
  const dragStart = useRef({ x: 0, y: 0 });

  const closeLightbox = () => {
    setPreviewImageUrl(null);
    setPreviewImageMsg(null);
    setIsAnnotating(false);
    setHistory([]);
  };

  const overlayMouseDownRef = useRef(false);

  const handleOverlayMouseDown = (e) => {
    overlayMouseDownRef.current = (e.target === e.currentTarget);
  };

  const handleOverlayMouseUp = (e) => {
    if (overlayMouseDownRef.current && e.target === e.currentTarget) {
      closeLightbox();
    }
    overlayMouseDownRef.current = false;
  };

  const handleMouseDown = (e) => {
    setIsDraggingToolbar(true);
    dragStart.current = {
      x: e.clientX - toolbarPos.x,
      y: e.clientY - toolbarPos.y
    };
  };

  const handleTouchStart = (e) => {
    if (e.touches && e.touches.length > 0) {
      setIsDraggingToolbar(true);
      dragStart.current = {
        x: e.touches[0].clientX - toolbarPos.x,
        y: e.touches[0].clientY - toolbarPos.y
      };
    }
  };

  useEffect(() => {
    const handleMove = (e) => {
      if (!isDraggingToolbar) return;

      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;

      const x = Math.max(10, Math.min(window.innerWidth - 220, clientX - dragStart.current.x));
      const y = Math.max(10, Math.min(window.innerHeight - 280, clientY - dragStart.current.y));

      setToolbarPos({ x, y });
    };

    const handleUp = () => {
      setIsDraggingToolbar(false);
    };

    if (isDraggingToolbar) {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleUp);
      window.addEventListener('touchmove', handleMove);
      window.addEventListener('touchend', handleUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
    };
  }, [isDraggingToolbar]);

  const handleImageLoad = () => {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    // Clear canvas when a new image is loaded
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHistory([]);
  };

  const getCanvasCursor = () => {
    if (tool === 'erase') {
      const canvas = canvasRef.current;
      if (!canvas) return 'cell';
      const rect = canvas.getBoundingClientRect();
      const scale = rect.width / canvas.width;
      const screenBrushSize = Math.max(6, brushSize * scale);
      
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${screenBrushSize + 4}" height="${screenBrushSize + 4}" viewBox="0 0 ${screenBrushSize + 4} ${screenBrushSize + 4}">
          <circle cx="${(screenBrushSize + 4) / 2}" cy="${(screenBrushSize + 4) / 2}" r="${screenBrushSize / 2}" fill="none" stroke="white" stroke-width="1.5"/>
          <circle cx="${(screenBrushSize + 4) / 2}" cy="${(screenBrushSize + 4) / 2}" r="${screenBrushSize / 2}" fill="none" stroke="black" stroke-width="1" stroke-dasharray="2 2"/>
        </svg>
      `;
      const encoded = btoa(svg);
      const center = (screenBrushSize + 4) / 2;
      return `url("data:image/svg+xml;base64,${encoded}") ${center} ${center}, auto`;
    } else {
      // Pen tool cursor: a pencil SVG pointing to bottom-left tip (2, 22)
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" fill="rgba(0, 0, 0, 0.5)"/>
          <path d="m15 5 4 4" stroke="white" stroke-width="2"/>
        </svg>
      `;
      const encoded = btoa(svg);
      return `url("data:image/svg+xml;base64,${encoded}") 2 22, auto`;
    }
  };

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;
    return { x, y };
  };

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Save current canvas state to history for undo
    const currentState = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory(prev => [...prev, currentState]);

    const { x, y } = getCoordinates(e);
    lastPos.current = { x, y };
    setIsDrawing(true);

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y);
    ctx.strokeStyle = tool === 'erase' ? 'rgba(0,0,0,1)' : brushColor;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = tool === 'erase' ? 'destination-out' : 'source-over';
    ctx.stroke();
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { x, y } = getCoordinates(e);

    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(x, y);
    ctx.strokeStyle = tool === 'erase' ? 'rgba(0,0,0,1)' : brushColor;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = tool === 'erase' ? 'destination-out' : 'source-over';
    ctx.stroke();

    lastPos.current = { x, y };
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const undo = () => {
    if (history.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const previousState = history[history.length - 1];
    ctx.putImageData(previousState, 0, 0);
    setHistory(prev => prev.slice(0, -1));
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const currentState = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory(prev => [...prev, currentState]);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleUpdateImage = async () => {
    if (!previewImageMsg || !canvasRef.current || !imgRef.current) return;
    setIsUpdating(true);

    try {
      const canvas = canvasRef.current;
      const img = imgRef.current;

      const mergeCanvas = document.createElement('canvas');
      mergeCanvas.width = img.naturalWidth;
      mergeCanvas.height = img.naturalHeight;
      const mergeCtx = mergeCanvas.getContext('2d');

      mergeCtx.drawImage(img, 0, 0);
      mergeCtx.drawImage(canvas, 0, 0);

      mergeCanvas.toBlob(async (blob) => {
        if (!blob) {
          setIsUpdating(false);
          showAlert('Failed to generate image data.', 'Error');
          return;
        }

        const formData = new FormData();
        const origName = previewImageMsg.fileName || 'annotated_image.png';
        const dotIdx = origName.lastIndexOf('.');
        const nameWithoutExt = dotIdx > -1 ? origName.substring(0, dotIdx) : origName;
        const finalName = `${nameWithoutExt}_annotated.png`;

        formData.append('file', blob, finalName);

        try {
          const response = await fetch(`${API_BASE_URL}/upload`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            },
            body: formData
          });

          if (response.ok) {
            const uploadData = await response.json();

            socketRef.current.emit('edit_message', {
              messageId: previewImageMsg._id,
              fileUrl: uploadData.fileUrl,
              fileName: uploadData.fileName,
              fileType: uploadData.fileType,
              fileSize: uploadData.fileSize
            });

            setPreviewImageUrl(uploadData.fileUrl);
            setPreviewImageMsg(prev => ({
              ...prev,
              fileUrl: uploadData.fileUrl,
              fileName: uploadData.fileName,
              fileType: uploadData.fileType,
              fileSize: uploadData.fileSize
            }));

            setIsAnnotating(false);
            setHistory([]);

            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
          } else {
            const errData = await response.json();
            showAlert(errData.error || 'Failed to upload annotated image.', 'Error');
          }
        } catch (uploadErr) {
          console.error('Error uploading annotated image:', uploadErr);
          showAlert('Failed to send annotated image to server.', 'Error');
        } finally {
          setIsUpdating(false);
        }
      }, 'image/png');

    } catch (err) {
      console.error('Error merging images:', err);
      showAlert('An error occurred while merging annotations.', 'Error');
      setIsUpdating(false);
    }
  };

  // Video Popup Player state
  const [popupVideo, setPopupVideo] = useState(null);

  // YouTube Dropdown state
  const [ytDropdown, setYtDropdown] = useState({
    isOpen: false,
    url: '',
    x: 0,
    y: 0
  });
  const [syncPlayActive, setSyncPlayActive] = useState(false);
  const [syncPlayLayoutReversed, setSyncPlayLayoutReversed] = useState(() => {
    try {
      return localStorage.getItem('alaap_sync_play_layout_reversed') === 'true';
    } catch (e) {
      return false;
    }
  });

  useEffect(() => {
    localStorage.setItem('alaap_sync_play_layout_reversed', syncPlayLayoutReversed);
  }, [syncPlayLayoutReversed]);
  const [syncPlayVideoId, setSyncPlayVideoId] = useState('');
  const [syncPlayVideoUrl, setSyncPlayVideoUrl] = useState('');
  const [syncPlayDownloadStatus, setSyncPlayDownloadStatus] = useState('idle');
  const [syncPlayDownloadProgress, setSyncPlayDownloadProgress] = useState(0);
  const [syncPlayDownloadError, setSyncPlayDownloadError] = useState('');
  const videoPlayerRef = useRef(null);
  const [syncPlayIsPlaying, setSyncPlayIsPlaying] = useState(false);
  const [syncPlayInputUrl, setSyncPlayInputUrl] = useState('');
  const [isSyncPlayHeaderHidden, setIsSyncPlayHeaderHidden] = useState(false);

  // Custom Video Player States
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoVolume, setVideoVolume] = useState(1);
  const [videoMuted, setVideoMuted] = useState(false);
  const [showCustomControls, setShowCustomControls] = useState(true);
  const controlsTimeoutRef = useRef(null);
  const isDraggingTimelineRef = useRef(false);
  const timelineContainerRef = useRef(null);
  const [isDraggingTimeline, setIsDraggingTimeline] = useState(false);
  const [isHoveringTimeline, setIsHoveringTimeline] = useState(false);
  const [videoPlaybackRate, setVideoPlaybackRate] = useState(1);
  const [isHoveringCustomVolume, setIsHoveringCustomVolume] = useState(false);

  // Floating Chat States & Refs
  const [showFloatingChat, setShowFloatingChat] = useState(false);
  const [floatingChatInput, setFloatingChatInput] = useState('');
  const [isHoveringFloatingChat, setIsHoveringFloatingChat] = useState(false);
  const floatingChatFeedRef = useRef(null);
  const [floatingChatPos, setFloatingChatPos] = useState({ left: null, top: null });
  const [isDraggingFloatingChat, setIsDraggingFloatingChat] = useState(false);
  const dragStartOffset = useRef({ x: 0, y: 0 });
  const floatingChatContainerRef = useRef(null);
  const [floatingChatSize, setFloatingChatSize] = useState({ width: 320, height: null });
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartData = useRef({ startX: 0, startY: 0, startWidth: 0, startHeight: 0, startLeft: 0, startTop: 0, handleType: '' });

  // SyncPlay History States
  const [syncPlayHistory, setSyncPlayHistory] = useState([]);
  const [showSyncPlayHistoryTab, setShowSyncPlayHistoryTab] = useState(false);

  useEffect(() => {
    if (!syncPlayActive) {
      setIsSyncPlayHeaderHidden(false);
      setShowFloatingChat(false);
      setIsHoveringFloatingChat(false);
      setFloatingChatPos({ left: null, top: null });
      setFloatingChatSize({ width: 320, height: null });
    }
  }, [syncPlayActive]);

  useEffect(() => {
    if (isHoveringFloatingChat) {
      setShowCustomControls(true);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    } else if (showFloatingChat) {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      controlsTimeoutRef.current = setTimeout(() => {
        setShowCustomControls(false);
      }, 3000);
    }
  }, [isHoveringFloatingChat, showFloatingChat]);

  useEffect(() => {
    if (showFloatingChat && floatingChatFeedRef.current) {
      floatingChatFeedRef.current.scrollTop = floatingChatFeedRef.current.scrollHeight;
    }
  }, [messages, showFloatingChat]);

  const [customDialog, setCustomDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'alert',
    inputValue: '',
    onConfirm: null,
    onCancel: null
  });

  const showAlert = (message, title = 'Notification') => {
    return new Promise((resolve) => {
      setCustomDialog({
        isOpen: true,
        title,
        message,
        type: 'alert',
        inputValue: '',
        onConfirm: () => {
          setCustomDialog(prev => ({ ...prev, isOpen: false }));
          resolve();
        },
        onCancel: null
      });
    });
  };

  const showConfirm = (message, title = 'Confirm Action') => {
    return new Promise((resolve) => {
      setCustomDialog({
        isOpen: true,
        title,
        message,
        type: 'confirm',
        inputValue: '',
        onConfirm: () => {
          setCustomDialog(prev => ({ ...prev, isOpen: false }));
          resolve(true);
        },
        onCancel: () => {
          setCustomDialog(prev => ({ ...prev, isOpen: false }));
          resolve(false);
        }
      });
    });
  };

  const showPrompt = (message, defaultValue = '', title = 'Input Required') => {
    return new Promise((resolve) => {
      setCustomDialog({
        isOpen: true,
        title,
        message,
        type: 'prompt',
        inputValue: defaultValue,
        onConfirm: (val) => {
          setCustomDialog(prev => ({ ...prev, isOpen: false }));
          resolve(val);
        },
        onCancel: () => {
          setCustomDialog(prev => ({ ...prev, isOpen: false }));
          resolve(null);
        }
      });
    });
  };

  const alert = (message) => {
    showAlert(message);
  };




  const handleGroupMemberSearch = async (e) => {
    const val = e.target.value;
    setGroupMemberSearchQuery(val);
    if (val.trim().length < 2) {
      setGroupMemberSearchResults([]);
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/users/search?username=${val}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setGroupMemberSearchResults(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddMemberSearch = async (e) => {
    const val = e.target.value;
    setAddMemberSearchQuery(val);
    if (val.trim().length < 2) {
      setAddMemberSearchResults([]);
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/users/search?username=${val}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        // Exclude users who are already members
        const filtered = data.filter(u => !activeChat.members.some(m => m._id === u._id));
        setAddMemberSearchResults(filtered);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddMemberToGroup = async (targetUserId) => {
    if (!activeChat) return;
    try {
      const response = await fetch(`${API_BASE_URL}/chats/${activeChat._id}/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId: targetUserId })
      });
      
      const updatedChat = await response.json();
      if (response.ok) {
        setActiveChat(updatedChat);
        setChats(prev => prev.map(c => c._id === updatedChat._id ? updatedChat : c));
        setAddMemberSearchResults(prev => prev.filter(u => u._id !== targetUserId));
        alert('User added to group successfully!');
      } else {
        alert(updatedChat.error || 'Failed to add user.');
      }
    } catch (err) {
      console.error(err);
      alert('Error adding member to group.');
    }
  };

  const handleRemoveMemberFromGroup = async (targetUserId) => {
    if (!activeChat) return;
    const confirmed = await showConfirm('Are you sure you want to remove this member from the group?');
    if (!confirmed) return;
    try {
      const response = await fetch(`${API_BASE_URL}/chats/${activeChat._id}/remove`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId: targetUserId })
      });
      
      const updatedChat = await response.json();
      if (response.ok) {
        setActiveChat(updatedChat);
        setChats(prev => prev.map(c => c._id === updatedChat._id ? updatedChat : c));
        showAlert('User removed from group successfully!');
      } else {
        showAlert(updatedChat.error || 'Failed to remove user.');
      }
    } catch (err) {
      console.error(err);
      showAlert('Error removing member from group.');
    }
  };

  useEffect(() => {
    if (activeChat) {
      setGroupSettingsName(activeChat.name || '');
      setGroupSettingsPicUrl(activeChat.groupPic || '');
      setGroupSettingsError('');
      setGroupSettingsSuccess('');
    }
  }, [activeChat]);

  const handleUpdateGroupSettings = async (e) => {
    if (e) e.preventDefault();
    if (!activeChat) return;
    if (!groupSettingsName.trim()) {
      setGroupSettingsError('Group name cannot be empty.');
      return;
    }

    setGroupSettingsError('');
    setGroupSettingsSuccess('');

    try {
      const response = await fetch(`${API_BASE_URL}/chats/${activeChat._id}/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: groupSettingsName.trim(),
          groupPic: groupSettingsPicUrl
        })
      });

      const updatedChat = await response.json();
      if (response.ok) {
        setActiveChat(updatedChat);
        setChats(prev => prev.map(c => c._id === updatedChat._id ? updatedChat : c));
        setGroupSettingsSuccess('Group settings updated successfully!');
        setTimeout(() => {
          setGroupSettingsSuccess('');
        }, 3000);
      } else {
        setGroupSettingsError(updatedChat.error || 'Failed to update group settings.');
      }
    } catch (err) {
      console.error(err);
      setGroupSettingsError('Error updating group settings.');
    }
  };

  const handleGroupPicUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingGroupPic(true);
    setGroupSettingsError('');
    setGroupSettingsSuccess('');
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        setGroupSettingsPicUrl(data.fileUrl);
        setGroupSettingsSuccess('Group photo uploaded! Click Save to apply changes.');
      } else {
        setGroupSettingsError('Failed to upload group photo.');
      }
    } catch (err) {
      console.error(err);
      setGroupSettingsError('Error uploading group photo.');
    } finally {
      setUploadingGroupPic(false);
    }
  };

  const handleYoutubeLinkClick = (e, url) => {
    e.preventDefault();
    if (!activeChat) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }

    // Check if block relationship exists
    const isBlockedOrBlocker = (() => {
      if (!activeChat.isGroup) {
        const otherMember = activeChat.members.find(m => m._id !== user?.id);
        if (otherMember) {
          const amBlocked = otherMember.blockedUsers?.includes(user?.id);
          const iBlocked = (user?.blockedUsers || []).includes(otherMember._id);
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

    // Regular expression to extract URLs
    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    
    // Split the text by URLs
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



  // Emoji helper functions
  const handleEmojiClick = (emoji) => {
    const input = document.querySelector('.chat-text-input');
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
    
    // Reset focus and cursor position after the state update
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

  // Voice recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      isRecordingCancelledRef.current = false;
      const options = { mimeType: 'audio/webm' };
      
      let recorder;
      try {
        recorder = new MediaRecorder(stream, options);
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
        
        if (isRecordingCancelledRef.current) {
          return;
        }
        
        if (audioChunksRef.current.length === 0) return;
        
        const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType });
        if (audioBlob.size < 1000) {
          return;
        }
        
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
      alert('Could not access microphone. Please check permissions.');
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
        
        socketRef.current.emit('send_message', messageData);
        setReplyingToMessage(null);
        setUploadProgress(100);
      } else {
        alert('Failed to upload voice message.');
      }
    } catch (err) {
      console.error('Error uploading voice message:', err);
      alert('Error sending voice message.');
    } finally {
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 500);
    }
  };

  const handleReactToMessage = (messageId, emoji) => {
    if (!socketRef.current) return;
    socketRef.current.emit('react_message', { messageId, emoji });
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

  // Load User Data & Fetch system signup settings on startup
  useEffect(() => {
    fetchSystemSignupSettings();
    if (token) {
      fetchCurrentUser();
    }
  }, [token]);

  // Close admin dashboard and settings center when activeChat changes
  useEffect(() => {
    if (activeChat) {
      setIsAdminOpen(false);
      setIsSettingsOpen(false);
    }
  }, [activeChat]);

  // Track activeChat in a Ref to avoid stale closures in socket event listeners
  const activeChatRef = useRef(activeChat);
  const chatsRef = useRef(chats);
  const prevActiveChatIdRef = useRef(null);
  const joinedChatIdRef = useRef(null);
  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  useEffect(() => {
    chatsRef.current = chats;
  }, [chats]);

  const syncPlayVisibilityRef = useRef({});

  const changeSyncPlayActive = (active, targetChatId = null) => {
    const chatId = targetChatId || activeChatRef.current?._id;
    setSyncPlayActive(active);
    if (chatId) {
      syncPlayVisibilityRef.current[chatId] = active;
    }
  };

  // Handle Socket connections
  useEffect(() => {
    if (!token || !user) return;

    // Connect to Socket server (allow both WebSocket and polling fallback)
    const socket = io(SOCKET_URL, {
      auth: { token }
    });
    socketRef.current = socket;

    // Event listeners
    socket.on('connect', () => {
      console.log('Connected to socket server');
      // If we already have an active chat loaded on connect/reconnect, join its room immediately
      if (activeChatRef.current) {
        socket.emit('join_chat', activeChatRef.current._id);
      }
    });

    socket.on('receive_message', (message) => {
      // If the message belongs to active chat, append it
      if (activeChatRef.current && message.chat === activeChatRef.current._id) {
        setMessages(prev => {
          if (prev.some(m => m._id === message._id)) return prev;
          return [...prev, message];
        });
        scrollToBottom();

        // Trigger notifications if tab is hidden (and sender is not current user)
        const isSelf = message.sender && (message.sender._id === user?.id || message.sender._id === user?._id);
        if (document.hidden && !isSelf) {
          triggerNotificationAlert(activeChatRef.current, message);
        }
      }
      
      // Update latest message in chat list
      setChats(prevChats => {
        const chatExists = prevChats.some(c => c._id === message.chat);
        if (!chatExists) {
          setTimeout(() => {
            fetchChats();
          }, 0);
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
      // If the message belongs to active chat, don't double trigger notifications
      if (activeChatRef.current && data.chatId === activeChatRef.current._id && !document.hidden) {
        return;
      }
      
      const currentId = user?.id || user?._id;
      const isSelf = data.message.sender && (data.message.sender._id === currentId || data.message.sender === currentId);
      if (isSelf) return;

      const targetChat = chatsRef.current.find(c => c._id === data.chatId);
      triggerNotificationAlert(targetChat, data.message);

      setChats(prevChats => {
        const chatExists = prevChats.some(c => c._id === data.chatId);
        if (!chatExists) {
          setTimeout(() => {
            fetchChats();
          }, 0);
          return prevChats;
        }
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

    socket.on('user_status_change', ({ userId, status }) => {
      setChats(prevChats => {
        return prevChats.map(c => {
          const updatedMembers = c.members.map(m => {
            if (m._id === userId) return { ...m, status };
            return m;
          });
          return { ...c, members: updatedMembers };
        });
      });

      if (activeChatRef.current) {
        setActiveChat(prev => {
          if (!prev) return null;
          const updatedMembers = prev.members.map(m => {
            if (m._id === userId) return { ...m, status };
            return m;
          });
          return { ...prev, members: updatedMembers };
        });
      }
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
      const currentId = user?.id || user?._id;
      
      if (creatorId && creatorId.toString() !== currentId?.toString()) {
        const title = newChat.isGroup ? 'Added to Group' : 'New Chat';
        const otherMember = newChat.members.find(m => (m._id || m).toString() !== currentId?.toString());
        const messageText = newChat.isGroup 
          ? `You were added to group "${newChat.name}"` 
          : `New conversation started with ${otherMember?.username || 'someone'}`;

        addNotificationToHistory({
          type: 'chat',
          title,
          message: messageText,
          chatId: newChat._id
        });

        // Trigger toast/desktop alert depending on settings
        const config = newChat.isGroup ? notificationSettings.groupChats : notificationSettings.userChats;
        
        if (config.soundEnabled) {
          playNotificationSound();
        }

        if (config.inAppBannerEnabled) {
          addToast({
            title,
            message: messageText,
            avatar: newChat.isGroup ? newChat.groupPic : (otherMember?.profilePic || ''),
            onClick: () => setActiveChat(newChat)
          });
        }
        if (config.desktopEnabled && Notification.permission === 'granted') {
          const notification = new Notification(title, {
            body: messageText,
            icon: '/favicon.ico'
          });
          notification.onclick = () => {
            window.focus();
            setActiveChat(newChat);
            notification.close();
          };
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
      setActiveChat(prev => {
        if (prev && prev._id === updatedChat._id) {
          return updatedChat;
        }
        return prev;
      });
      setChats(prev => prev.map(c => c._id === updatedChat._id ? updatedChat : c));
    });

    socket.on('chat_deleted', ({ chatId }) => {
      setChats(prev => prev.filter(c => c._id !== chatId));
      setActiveChat(prev => {
        if (prev && prev._id === chatId) {
          return null;
        }
        return prev;
      });
    });

    socket.on('force_logout', (data) => {
      alert(data.message || 'Your account has been deleted.');
      logout();
    });

    socket.on('message_reaction_update', ({ messageId, reactions }) => {
      setMessages(prev => prev.map(msg => {
        if (msg._id === messageId) {
          return { ...msg, reactions };
        }
        return msg;
      }));
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
      setMessages(prev => prev.map(msg => msg._id === updatedMessage._id ? updatedMessage : msg));
      
      // Update latest message in chats list if needed
      setChats(prevChats => {
        return prevChats.map(c => {
          if (c._id === updatedMessage.chat && c.latestMessage && c.latestMessage._id === updatedMessage._id) {
            return { ...c, latestMessage: updatedMessage };
          }
          return c;
        });
      });
    });

    socket.on('message_deleted', ({ messageId, chatId, latestMessage }) => {
      setMessages(prev => prev.filter(msg => msg._id !== messageId));
      setConversationHistory(prev => prev.filter(msg => msg._id !== messageId));
      
      // Update latest message in chats list if needed
      setChats(prevChats => {
        return prevChats.map(c => {
          if (c._id === chatId) {
            return { 
              ...c, 
              latestMessage: latestMessage,
              updatedAt: latestMessage ? latestMessage.createdAt : c.updatedAt
            };
          }
          return c;
        }).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      });
    });

    socket.on('chat_history_cleared', ({ chatId }) => {
      if (activeChatRef.current && activeChatRef.current._id === chatId) {
        setMessages([]);
      }
      setChats(prevChats => {
        return prevChats.map(c => {
          if (c._id === chatId) {
            return {
              ...c,
              latestMessage: null
            };
          }
          return c;
        });
      });
    });

    socket.on('sync_play_broadcast', ({ chatId, videoId, videoTitle, videoUrl, downloadStatus, downloadProgress, downloadError, action, currentTime, isPlaying, senderId, history }) => {
      if (activeChatRef.current && activeChatRef.current._id === chatId) {
        // Block check
        let blockActive = false;
        if (!activeChatRef.current.isGroup) {
          const otherMember = activeChatRef.current.members.find(m => m._id !== user?.id);
          if (otherMember) {
            const amBlocked = otherMember.blockedUsers?.includes(user?.id);
            const iBlocked = (user?.blockedUsers || []).includes(otherMember._id);
            blockActive = !!(amBlocked || iBlocked);
          }
        }
        if (blockActive) return;

        setSyncPlayVideoId(videoId);
        setSyncPlayVideoUrl(videoUrl || '');
        setSyncPlayDownloadStatus(downloadStatus || 'idle');
        setSyncPlayDownloadProgress(downloadProgress || 0);
        setSyncPlayDownloadError(downloadError || '');
        setSyncPlayIsPlaying(isPlaying);
        if (history) {
          setSyncPlayHistory(history);
        }

        if (downloadStatus === 'completed' && videoPlayerRef.current) {
          if (senderId !== user?.id && senderId !== user?._id) {
            ignorePlayerStateChangeRef.current = true;
            
            const playerTime = videoPlayerRef.current.currentTime;
            if (Math.abs(playerTime - currentTime) > 2) {
              videoPlayerRef.current.currentTime = currentTime;
            }

            if (action === 'play') {
              if (videoPlayerRef.current.paused) {
                videoPlayerRef.current.play().catch(e => console.error(e));
              }
            } else if (action === 'pause') {
              if (!videoPlayerRef.current.paused) {
                videoPlayerRef.current.pause();
              }
            } else if (action === 'seek') {
              videoPlayerRef.current.currentTime = currentTime;
            } else if (action === 'change_video') {
              videoPlayerRef.current.currentTime = 0;
              if (!isPlaying) {
                videoPlayerRef.current.pause();
              }
            }
            
            setTimeout(() => {
              ignorePlayerStateChangeRef.current = false;
            }, 800);
          }
        } else if (ytPlayerRef.current && ytPlayerReadyRef.current) {
          if (senderId !== user?.id && senderId !== user?._id) {
            ignorePlayerStateChangeRef.current = true;
            
            let currentLoadedId = '';
            try {
              if (ytPlayerRef.current.getVideoData) {
                currentLoadedId = ytPlayerRef.current.getVideoData().video_id;
              }
            } catch (e) {}

            const playerTime = ytPlayerRef.current.getCurrentTime();
            if (Math.abs(playerTime - currentTime) > 2) {
              ytPlayerRef.current.seekTo(currentTime, true);
            }

            if (action === 'play') {
              if (videoId && currentLoadedId !== videoId) {
                ytPlayerRef.current.loadVideoById(videoId, currentTime || 0);
              } else {
                ytPlayerRef.current.playVideo();
              }
            } else if (action === 'pause') {
              if (videoId && currentLoadedId !== videoId) {
                ytPlayerRef.current.loadVideoById(videoId, currentTime || 0);
                ytPlayerRef.current.pauseVideo();
              } else {
                ytPlayerRef.current.pauseVideo();
              }
            } else if (action === 'seek') {
              if (videoId && currentLoadedId !== videoId) {
                ytPlayerRef.current.loadVideoById(videoId, currentTime || 0);
              } else {
                ytPlayerRef.current.seekTo(currentTime, true);
              }
            } else if (action === 'change_video') {
              ytPlayerRef.current.loadVideoById(videoId, 0);
              if (!isPlaying) {
                ytPlayerRef.current.pauseVideo();
              }
            }
            
            setTimeout(() => {
              ignorePlayerStateChangeRef.current = false;
            }, 800);
          }
        }
      }

      setActiveChat(prev => {
        if (prev && prev._id === chatId) {
          return {
            ...prev,
            syncPlay: {
              ...prev.syncPlay,
              active: true,
              videoId,
              videoTitle: videoTitle || prev.syncPlay?.videoTitle || '',
              videoUrl,
              downloadStatus,
              downloadProgress,
              downloadError,
              currentTime,
              isPlaying,
              lastUpdatedBy: senderId,
              history: history || prev.syncPlay?.history || []
            }
          };
        }
        return prev;
      });

      setChats(prev => prev.map(c => {
        if (c._id === chatId) {
          return {
            ...c,
            syncPlay: {
              ...c.syncPlay,
              active: true,
              videoId,
              videoTitle: videoTitle || c.syncPlay?.videoTitle || '',
              videoUrl,
              downloadStatus,
              downloadProgress,
              downloadError,
              currentTime,
              isPlaying,
              lastUpdatedBy: senderId,
              history: history || c.syncPlay?.history || []
            }
          };
        }
        return c;
      }));
    });

    socket.on('sync_play_download_progress', ({ chatId, status, progress, error }) => {
      if (activeChatRef.current && activeChatRef.current._id === chatId) {
        setSyncPlayDownloadStatus(status);
        setSyncPlayDownloadProgress(progress);
        if (error) setSyncPlayDownloadError(error);
      }
      
      const updateDownloadState = (prev) => {
        if (!prev) return null;
        const syncDetails = { 
          ...prev.syncPlay, 
          downloadStatus: status, 
          downloadProgress: progress,
          downloadError: error || ''
        };
        if (prev._id === chatId) {
          return { ...prev, syncPlay: syncDetails };
        }
        return prev;
      };
      
      setActiveChat(updateDownloadState);
      setChats(prev => prev.map(c => {
        if (c._id === chatId) {
          return {
            ...c,
            syncPlay: {
              ...c.syncPlay,
              downloadStatus: status,
              downloadProgress: progress,
              downloadError: error || ''
            }
          };
        }
        return c;
      }));
    });

    socket.on('sync_play_toggled', ({ chatId, active, syncPlay }) => {
      if (activeChatRef.current && activeChatRef.current._id === chatId) {
        // Block check
        let blockActive = false;
        if (!activeChatRef.current.isGroup) {
          const otherMember = activeChatRef.current.members.find(m => m._id !== user?.id);
          if (otherMember) {
            const amBlocked = otherMember.blockedUsers?.includes(user?.id);
            const iBlocked = (user?.blockedUsers || []).includes(otherMember._id);
            blockActive = !!(amBlocked || iBlocked);
          }
        }

        if (blockActive) {
          changeSyncPlayActive(false, chatId);
          setSyncPlayVideoId('');
          setSyncPlayVideoUrl('');
          setSyncPlayDownloadStatus('idle');
          setSyncPlayDownloadProgress(0);
          setSyncPlayDownloadError('');
          setSyncPlayIsPlaying(false);
          setSyncPlayHistory([]);
          setShowSyncPlayHistoryTab(false);
        } else {
          changeSyncPlayActive(active, chatId);
          if (active) {
            setSyncPlayVideoId(syncPlay.videoId);
            setSyncPlayVideoUrl(syncPlay.videoUrl || '');
            setSyncPlayDownloadStatus(syncPlay.downloadStatus || 'idle');
            setSyncPlayDownloadProgress(syncPlay.downloadProgress || 0);
            setSyncPlayDownloadError(syncPlay.downloadError || '');
            setSyncPlayIsPlaying(syncPlay.isPlaying);
            setSyncPlayHistory(syncPlay.history || []);
          } else {
            setSyncPlayVideoId('');
            setSyncPlayVideoUrl('');
            setSyncPlayDownloadStatus('idle');
            setSyncPlayDownloadProgress(0);
            setSyncPlayDownloadError('');
            setSyncPlayIsPlaying(false);
            setSyncPlayHistory([]);
            setShowSyncPlayHistoryTab(false);
          }
        }
      }

      setActiveChat(prev => {
        if (prev && prev._id === chatId) {
          return {
            ...prev,
            syncPlay
          };
        }
        return prev;
      });

      setChats(prev => prev.map(c => {
        if (c._id === chatId) {
          return {
            ...c,
            syncPlay
          };
        }
        return c;
      }));
    });

    socket.on('block_status_changed', ({ blockerId, blockedId, isBlocked }) => {
      // Update own blockedUsers list if we are the blocker
      if (blockerId === user?.id) {
        setUser(prev => {
          if (!prev) return prev;
          const blockedList = prev.blockedUsers || [];
          const newBlockedList = isBlocked 
            ? [...blockedList.filter(id => id !== blockedId), blockedId]
            : blockedList.filter(id => id !== blockedId);
          return { ...prev, blockedUsers: newBlockedList };
        });
      }
      
      // Update chats list to reflect the block status on the member objects
      setChats(prevChats => {
        return prevChats.map(c => {
          if (c.isGroup) return c;
          
          const hasBlocker = c.members.some(m => m._id === blockerId);
          const hasBlocked = c.members.some(m => m._id === blockedId);
          
          if (hasBlocker && hasBlocked) {
            const updatedMembers = c.members.map(m => {
              if (m._id === blockerId) {
                const mBlockedList = m.blockedUsers || [];
                const newBlockedList = isBlocked 
                  ? [...mBlockedList.filter(id => id !== blockedId), blockedId]
                  : mBlockedList.filter(id => id !== blockedId);
                return { ...m, blockedUsers: newBlockedList };
              }
              return m;
            });
            
            const updatedChat = { ...c, members: updatedMembers };
            
            // If this is the active chat, we also update activeChat state
            if (activeChatRef.current && activeChatRef.current._id === c._id) {
              setActiveChat(updatedChat);
              
              // If blocked, also turn off Sync Play immediately!
              if (isBlocked) {
                changeSyncPlayActive(false, c._id);
              }
            }
            return updatedChat;
          }
          return c;
        });
      });
    });

    socket.on('user_updated', (updatedUser) => {
      // 1. Update current logged-in user profile if it is us
      if (user?.id === updatedUser._id || user?._id === updatedUser._id) {
        setUser(prev => prev ? { ...prev, username: updatedUser.username, profilePic: updatedUser.profilePic, role: updatedUser.role, isAdmin: updatedUser.isAdmin } : null);
      }

      // 2. Update users list in admin registry if present
      setUsers(prev => prev.map(u => u._id === updatedUser._id ? { ...u, ...updatedUser } : u));

      // 3. Update chats list (update member objects in DMs/Groups)
      setChats(prevChats => {
        return prevChats.map(c => {
          const membersUpdated = c.members.map(m => m._id === updatedUser._id ? { ...m, ...updatedUser } : m);
          const updatedChat = { ...c, members: membersUpdated };
          
          // If this DM/Group is the active chat, update activeChat
          if (activeChatRef.current && activeChatRef.current._id === c._id) {
            setActiveChat(updatedChat);
          }
          return updatedChat;
        });
      });

      // 4. Update messages in current active chat if they were sent by this user
      setMessages(prevMsgs => {
        return prevMsgs.map(msg => {
          if (msg.sender && msg.sender._id === updatedUser._id) {
            return {
              ...msg,
              sender: {
                ...msg.sender,
                username: updatedUser.username,
                profilePic: updatedUser.profilePic
              }
            };
          }
          return msg;
        });
      });
    });

    // Fetch initial chat list
    fetchChats();


    return () => {
      socket.disconnect();
    };
  }, [token, user]);

  // Join/leave active chat rooms reactively
  useEffect(() => {
    setIsInfoPanelOpen(false);

    const prevChatId = prevActiveChatIdRef.current;
    const currentChatId = activeChat?._id || null;
    prevActiveChatIdRef.current = currentChatId;

    // Compute blocked status
    let blockActive = false;
    if (activeChat && !activeChat.isGroup) {
      const otherMember = activeChat.members.find(m => m._id !== user?.id);
      if (otherMember) {
        const amBlocked = otherMember.blockedUsers?.includes(user?.id);
        const iBlocked = (user?.blockedUsers || []).includes(otherMember._id);
        blockActive = !!(amBlocked || iBlocked);
      }
    }

    // Only run initialization and fetch if we transitioned to a different chat room
    if (prevChatId !== currentChatId) {
      if (activeChat && activeChat.syncPlay && activeChat.syncPlay.active && !blockActive) {
        setSyncPlayActive(syncPlayVisibilityRef.current[currentChatId] ?? false);
        setSyncPlayVideoId(activeChat.syncPlay.videoId);
        setSyncPlayVideoUrl(activeChat.syncPlay.videoUrl || '');
        setSyncPlayDownloadStatus(activeChat.syncPlay.downloadStatus || 'idle');
        setSyncPlayDownloadProgress(activeChat.syncPlay.downloadProgress || 0);
        setSyncPlayDownloadError(activeChat.syncPlay.downloadError || '');
        setSyncPlayIsPlaying(activeChat.syncPlay.isPlaying);
        setSyncPlayHistory(activeChat.syncPlay.history || []);
        setShowSyncPlayHistoryTab(false);
      } else {
        setSyncPlayActive(false);
        setSyncPlayVideoId('');
        setSyncPlayVideoUrl('');
        setSyncPlayDownloadStatus('idle');
        setSyncPlayDownloadProgress(0);
        setSyncPlayDownloadError('');
        setSyncPlayIsPlaying(false);
        setSyncPlayHistory([]);
        setShowSyncPlayHistoryTab(false);
      }

      // Handle socket join/leave rooms based on actual room change
      if (joinedChatIdRef.current !== currentChatId) {
        if (joinedChatIdRef.current && socketRef.current) {
          socketRef.current.emit('leave_chat', joinedChatIdRef.current);
        }
        if (currentChatId && socketRef.current) {
          socketRef.current.emit('join_chat', currentChatId);
        }
        joinedChatIdRef.current = currentChatId;
      }

      if (!activeChat) return;

      // Always load messages history
      fetchMessages(activeChat._id);

      // Reset unread count for this chat in local state
      setChats(prevChats => {
        return prevChats.map(c => {
          if (c._id === activeChat._id) {
            return { ...c, unreadCount: 0 };
          }
          return c;
        });
      });
    }
  }, [activeChat]);

  // Scroll messages to bottom helper
  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // -------------------------------------------------------------
  // API Fetch Functions
  // -------------------------------------------------------------

  const fetchSystemSignupSettings = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/signup-settings`);
      if (response.ok) {
        const data = await response.json();
        setSystemSignupSettings({
          signupEnabled: data.signupEnabled,
          inviteOnlyEnabled: data.inviteOnlyEnabled
        });
      }
    } catch (err) {
      console.error('Could not fetch signup settings:', err);
    }
  };

  const fetchCurrentUser = async () => {
    try {
      setLoadingUser(true);
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data);
      } else {
        logout();
      }
    } catch (err) {
      console.error(err);
      logout();
    } finally {
      setLoadingUser(false);
    }
  };

  async function fetchChats() {
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
  }

  async function fetchMessages(chatId) {
    try {
      const response = await fetch(`${API_BASE_URL}/chats/${chatId}/messages`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
        scrollToBottom();
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  };

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
        setSearchQuery('');
        setSearchResults([]);
      }
    } catch (err) {
      console.error('Start Direct Message failed:', err);
    }
  };

  const createGroupChat = async () => {
    if (!newGroupName.trim() || selectedGroupMembers.length === 0) return;

    try {
      const response = await fetch(`${API_BASE_URL}/chats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newGroupName,
          isGroup: true,
          members: selectedGroupMembers
        })
      });

      if (response.ok) {
        const newGroup = await response.json();
        setActiveChat(newGroup);
        setIsGroupModalOpen(false);
        setNewGroupName('');
        setSelectedGroupMembers([]);
      }
    } catch (err) {
      console.error('Create Group Chat error:', err);
    }
  };

  const handleSendMessage = (e) => {
    e?.preventDefault();
    if (!messageInput.trim() || !activeChat) return;

    if (editingMessage) {
      socketRef.current.emit('edit_message', {
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

    socketRef.current.emit('send_message', messageData);
    setMessageInput('');
    setReplyingToMessage(null);
    
    // Stop typing immediately on send
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      socketRef.current.emit('stop_typing', { chatId: activeChat._id });
    }
  };

  const handleSendFloatingChatMessage = (e) => {
    e?.preventDefault();
    if (!floatingChatInput.trim() || !activeChat) return;

    const messageData = {
      chatId: activeChat._id,
      content: floatingChatInput.trim(),
      replyTo: null
    };

    socketRef.current?.emit('send_message', messageData);
    setFloatingChatInput('');
  };

  const handlePointerDown = (e) => {
    if (e.target.closest('button')) return;

    const chatContainer = floatingChatContainerRef.current;
    if (!chatContainer) return;
    const parentContainer = chatContainer.parentElement;
    if (!parentContainer) return;

    const chatRect = chatContainer.getBoundingClientRect();

    setIsDraggingFloatingChat(true);
    dragStartOffset.current = {
      x: e.clientX - chatRect.left,
      y: e.clientY - chatRect.top
    };

    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!isDraggingFloatingChat) return;

    const chatContainer = floatingChatContainerRef.current;
    const parentContainer = chatContainer?.parentElement;
    if (!chatContainer || !parentContainer) return;

    const parentRect = parentContainer.getBoundingClientRect();
    
    let newLeft = e.clientX - parentRect.left - dragStartOffset.current.x;
    let newTop = e.clientY - parentRect.top - dragStartOffset.current.y;

    const maxLeft = parentRect.width - chatContainer.offsetWidth;
    const maxTop = parentRect.height - chatContainer.offsetHeight;

    newLeft = Math.max(0, Math.min(newLeft, maxLeft));
    newTop = Math.max(0, Math.min(newTop, maxTop));

    setFloatingChatPos({ left: newLeft, top: newTop });
  };

  const handlePointerUp = (e) => {
    setIsDraggingFloatingChat(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const handleResizePointerDown = (e, handleType) => {
    e.stopPropagation();
    e.preventDefault();

    const chatContainer = floatingChatContainerRef.current;
    if (!chatContainer) return;
    const parentContainer = chatContainer.parentElement;
    if (!parentContainer) return;

    const chatRect = chatContainer.getBoundingClientRect();
    const parentRect = parentContainer.getBoundingClientRect();

    setIsResizing(true);
    
    const startLeft = floatingChatPos.left !== null 
      ? floatingChatPos.left 
      : (parentRect.width - chatRect.width - 20);

    const startTop = floatingChatPos.top !== null
      ? floatingChatPos.top
      : 20;

    resizeStartData.current = {
      startX: e.clientX,
      startY: e.clientY,
      startWidth: chatContainer.offsetWidth,
      startHeight: chatContainer.offsetHeight,
      startLeft,
      startTop,
      handleType
    };

    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleResizePointerMove = (e) => {
    if (!isResizing) return;

    const chatContainer = floatingChatContainerRef.current;
    const parentContainer = chatContainer?.parentElement;
    if (!chatContainer || !parentContainer) return;

    const parentRect = parentContainer.getBoundingClientRect();
    const { startX, startY, startWidth, startHeight, startLeft, startTop, handleType } = resizeStartData.current;

    let deltaX = e.clientX - startX;
    let deltaY = e.clientY - startY;

    let newWidth = startWidth;
    let newHeight = startHeight;
    let newLeft = floatingChatPos.left;
    let newTop = floatingChatPos.top;

    if (handleType === 'bottom-left') {
      newWidth = startWidth - deltaX;
      newHeight = startHeight + deltaY;
      newLeft = startLeft + deltaX;
    } else if (handleType === 'bottom-right') {
      newWidth = startWidth + deltaX;
      newHeight = startHeight + deltaY;
    }

    const minW = 240;
    const maxW = 480;
    const minH = 150;
    const maxH = parentRect.height - 40;

    if (newWidth < minW) {
      if (handleType === 'bottom-left') {
        newLeft = startLeft + (startWidth - minW);
      }
      newWidth = minW;
    } else if (newWidth > maxW) {
      if (handleType === 'bottom-left') {
        newLeft = startLeft - (maxW - startWidth);
      }
      newWidth = maxW;
    }

    if (handleType === 'bottom-left') {
      if (newLeft < 0) {
        newWidth = startLeft + startWidth;
        newLeft = 0;
      }
    } else {
      if (startLeft + newWidth > parentRect.width) {
        newWidth = parentRect.width - startLeft;
      }
    }

    newHeight = Math.max(minH, Math.min(newHeight, maxH));
    
    if (startTop + newHeight > parentRect.height) {
      newHeight = parentRect.height - startTop;
    }

    setFloatingChatSize({ width: newWidth, height: newHeight });
    setFloatingChatPos({ 
      left: newLeft, 
      top: startTop 
    });
  };

  const handleResizePointerUp = (e) => {
    setIsResizing(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const startEditingMessage = (msg) => {
    setEditingMessage(msg);
    setReplyingToMessage(null); // Clear reply status if editing
    setMessageInput(msg.content);
  };

  const handleDeleteMessage = async (messageId) => {
    if (!await showConfirm('Are you sure you want to delete this message?')) return;
    socketRef.current.emit('delete_message', { messageId });
  };

  const handleTyping = () => {
    if (!socketRef.current || !activeChat) return;

    // Send typing status
    socketRef.current.emit('typing', { chatId: activeChat._id });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current.emit('stop_typing', { chatId: activeChat._id });
    }, 2000);
  };

  const uploadFile = async (file) => {
    if (!file || !activeChat) return;

    setUploading(true);
    setUploadProgress(10);

    const formData = new FormData();
    formData.append('file', file);

    try {
      // Simulate progress updates for premium UX
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

        // Send the uploaded file details via the socket as a message
        const messageData = {
          chatId: activeChat._id,
          content: `Sent a file: ${uploadData.fileName}`,
          fileUrl: uploadData.fileUrl,
          fileName: uploadData.fileName,
          fileType: uploadData.fileType,
          fileSize: uploadData.fileSize,
          replyTo: replyingToMessage ? replyingToMessage._id : null
        };

        socketRef.current.emit('send_message', messageData);
        setReplyingToMessage(null);
      } else {
        alert('File upload failed.');
      }
    } catch (err) {
      console.error('Upload error:', err);
      alert('Error uploading file.');
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

  const handleLeaveGroup = async (chatId) => {
    if (!await showConfirm('Are you sure you want to leave this group chat?')) return;
    try {
      const response = await fetch(`${API_BASE_URL}/chats/${chatId}/leave`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setChats(prev => prev.filter(c => c._id !== chatId));
        setActiveChat(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearChatHistory = async (chatId) => {
    if (!await showConfirm('Are you sure you want to clear all chat history? This cannot be undone.')) return;
    try {
      const response = await fetch(`${API_BASE_URL}/chats/${chatId}/history`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setMessages([]);
        setChats(prevChats => {
          return prevChats.map(c => {
            if (c._id === chatId) {
              return { ...c, latestMessage: null };
            }
            return c;
          });
        });
      } else {
        const err = await response.json();
        alert(err.error || 'Failed to clear chat history');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteChat = async (chatId) => {
    const confirmMsg = activeChat?.isGroup 
      ? 'Are you sure you want to delete this group chat? This will remove it for you and clear history.'
      : 'Are you sure you want to delete this chat box? All messages will be permanently deleted.';
    if (!await showConfirm(confirmMsg)) return;
    try {
      const response = await fetch(`${API_BASE_URL}/chats/${chatId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setChats(prev => prev.filter(c => c._id !== chatId));
        setActiveChat(null);
      } else {
        const err = await response.json();
        alert(err.error || 'Failed to delete chat');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const ytPlayerRef = useRef(null);
  const ytPlayerReadyRef = useRef(false);
  const ignorePlayerStateChangeRef = useRef(false);

  // Helper: extract youtube id
  const extractYouTubeId = (url) => {
    if (!url) return '';
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : url.trim();
  };

  // YouTube API Player initialization hook
  useEffect(() => {
    if (!activeChat || !syncPlayActive || !syncPlayVideoId || syncPlayDownloadStatus === 'downloading' || syncPlayDownloadStatus === 'failed' || (syncPlayDownloadStatus === 'completed' && syncPlayVideoUrl)) {
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

        try {
          ytPlayerRef.current = new window.YT.Player('sync-play-yt-player', {
            videoId: syncPlayVideoId,
            playerVars: {
              autoplay: 0,
              controls: 1,
              modestbranding: 1,
              rel: 0,
              iv_load_policy: 3 // Turn off video annotations and pop-up promo cards
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
                  socketRef.current?.emit('sync_play_update', {
                    chatId: currentActiveChat._id,
                    videoId: syncPlayVideoId,
                    action: 'play',
                    currentTime,
                    isPlaying: true
                  });
                } else if (state === 2) { // PAUSED
                  socketRef.current?.emit('sync_play_update', {
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
        } catch (err) {
          console.error('Failed to initialize YouTube Player iframe:', err);
        }
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

  const handleMouseMoveControls = () => {
    setShowCustomControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      setShowCustomControls(false);
    }, 3000);
  };

  const handleCustomPlayerPlayPauseToggle = (e) => {
    if (e) e.stopPropagation();
    handlePlayerPlayPause();
  };

  const handleVideoDoubleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!videoPlayerRef.current || !videoDuration) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    
    if (clickX < width / 2) {
      // Left side double click -> backward 10s
      handleSkipTime(-10);
    } else {
      // Right side double click -> forward 10s
      handleSkipTime(10);
    }
  };

  useEffect(() => {
    if (!syncPlayActive || syncPlayDownloadStatus !== 'completed') return;

    const handleKeyDown = (e) => {
      // Safeguard: ignore keyboard shortcuts if user is typing in a text field
      if (document.activeElement && (
        document.activeElement.tagName === 'INPUT' || 
        document.activeElement.tagName === 'TEXTAREA' ||
        document.activeElement.isContentEditable
      )) {
        return;
      }

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleSkipTime(10); // Forward 10s
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleSkipTime(-10); // Backward 10s
      } else if (e.key === ' ') {
        e.preventDefault();
        handleCustomPlayerPlayPauseToggle(); // Space to play/pause
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [syncPlayActive, syncPlayDownloadStatus, syncPlayVideoId, syncPlayIsPlaying, activeChat?._id, handleSkipTime]);

  const handleCustomTimelineClick = (e) => {
    if (!videoPlayerRef.current || !videoDuration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const percentage = Math.max(0, Math.min(1, clickX / width));
    const targetTime = percentage * videoDuration;

    socketRef.current?.emit('sync_play_update', {
      chatId: activeChat._id,
      videoId: syncPlayVideoId,
      action: 'seek',
      currentTime: targetTime,
      isPlaying: syncPlayIsPlaying
    });

    ignorePlayerStateChangeRef.current = true;
    videoPlayerRef.current.currentTime = targetTime;
    setVideoCurrentTime(targetTime);
    setTimeout(() => {
      ignorePlayerStateChangeRef.current = false;
    }, 800);
  };

  const handleCustomTimelineMouseDown = (e) => {
    if (!videoPlayerRef.current || !videoDuration || !timelineContainerRef.current) return;
    if (e.button !== 0) return; // Only left click
    
    setIsDraggingTimeline(true);
    isDraggingTimelineRef.current = true;
    
    const rect = timelineContainerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    const targetTime = percentage * videoDuration;
    
    videoPlayerRef.current.currentTime = targetTime;
    setVideoCurrentTime(targetTime);
  };

  const handleCustomTimelineTouchStart = (e) => {
    if (!videoPlayerRef.current || !videoDuration || !timelineContainerRef.current) return;
    
    setIsDraggingTimeline(true);
    isDraggingTimelineRef.current = true;
    
    const rect = timelineContainerRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    const clickX = touch.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    const targetTime = percentage * videoDuration;
    
    videoPlayerRef.current.currentTime = targetTime;
    setVideoCurrentTime(targetTime);
  };

  useEffect(() => {
    if (!isDraggingTimeline) return;

    const handleMouseMoveDrag = (moveEvent) => {
      if (!videoPlayerRef.current || !videoDuration || !timelineContainerRef.current) return;
      const r = timelineContainerRef.current.getBoundingClientRect();
      const x = moveEvent.clientX - r.left;
      const pct = Math.max(0, Math.min(1, x / r.width));
      const t = pct * videoDuration;
      
      videoPlayerRef.current.currentTime = t;
      setVideoCurrentTime(t);
    };

    const handleMouseUpDrag = (upEvent) => {
      if (!videoPlayerRef.current || !videoDuration || !timelineContainerRef.current) {
        setIsDraggingTimeline(false);
        isDraggingTimelineRef.current = false;
        return;
      }
      const r = timelineContainerRef.current.getBoundingClientRect();
      const x = upEvent.clientX - r.left;
      const pct = Math.max(0, Math.min(1, x / r.width));
      const t = pct * videoDuration;
      
      videoPlayerRef.current.currentTime = t;
      setVideoCurrentTime(t);
      
      socketRef.current?.emit('sync_play_update', {
        chatId: activeChat._id,
        videoId: syncPlayVideoId,
        action: 'seek',
        currentTime: t,
        isPlaying: syncPlayIsPlaying
      });
      
      setIsDraggingTimeline(false);
      isDraggingTimelineRef.current = false;
      
      ignorePlayerStateChangeRef.current = true;
      setTimeout(() => {
        ignorePlayerStateChangeRef.current = false;
      }, 800);
    };

    const handleTouchMoveDrag = (moveEvent) => {
      if (!videoPlayerRef.current || !videoDuration || !timelineContainerRef.current) return;
      // Prevent scrolling when dragging on touch devices
      if (moveEvent.cancelable) {
        moveEvent.preventDefault();
      }
      const r = timelineContainerRef.current.getBoundingClientRect();
      const touch = moveEvent.touches[0];
      const x = touch.clientX - r.left;
      const pct = Math.max(0, Math.min(1, x / r.width));
      const t = pct * videoDuration;
      
      videoPlayerRef.current.currentTime = t;
      setVideoCurrentTime(t);
    };

    const handleTouchEndDrag = (endEvent) => {
      if (!videoPlayerRef.current || !videoDuration || !timelineContainerRef.current) {
        setIsDraggingTimeline(false);
        isDraggingTimelineRef.current = false;
        return;
      }
      const r = timelineContainerRef.current.getBoundingClientRect();
      const touch = endEvent.changedTouches[0] || endEvent.touches[0];
      let t = videoCurrentTime;
      if (touch) {
        const x = touch.clientX - r.left;
        const pct = Math.max(0, Math.min(1, x / r.width));
        t = pct * videoDuration;
      }
      
      videoPlayerRef.current.currentTime = t;
      setVideoCurrentTime(t);
      
      socketRef.current?.emit('sync_play_update', {
        chatId: activeChat._id,
        videoId: syncPlayVideoId,
        action: 'seek',
        currentTime: t,
        isPlaying: syncPlayIsPlaying
      });
      
      setIsDraggingTimeline(false);
      isDraggingTimelineRef.current = false;
      
      ignorePlayerStateChangeRef.current = true;
      setTimeout(() => {
        ignorePlayerStateChangeRef.current = false;
      }, 800);
    };

    document.addEventListener('mousemove', handleMouseMoveDrag);
    document.addEventListener('mouseup', handleMouseUpDrag);
    document.addEventListener('touchmove', handleTouchMoveDrag, { passive: false });
    document.addEventListener('touchend', handleTouchEndDrag);

    return () => {
      document.removeEventListener('mousemove', handleMouseMoveDrag);
      document.removeEventListener('mouseup', handleMouseUpDrag);
      document.removeEventListener('touchmove', handleTouchMoveDrag);
      document.removeEventListener('touchend', handleTouchEndDrag);
    };
  }, [isDraggingTimeline, videoDuration, syncPlayVideoId, syncPlayIsPlaying, activeChat?._id, videoCurrentTime]);

  const handleVideoPlaybackRateChange = (rate) => {
    if (videoPlayerRef.current) {
      videoPlayerRef.current.playbackRate = rate;
    }
    setVideoPlaybackRate(rate);
  };

  const handleVolumeChange = (e) => {
    const vol = parseFloat(e.target.value);
    setVideoVolume(vol);
    setVideoMuted(vol === 0);
    if (videoPlayerRef.current) {
      videoPlayerRef.current.volume = vol;
      videoPlayerRef.current.muted = vol === 0;
    }
  };

  const handleVolumeMuteToggle = () => {
    const newMuted = !videoMuted;
    setVideoMuted(newMuted);
    if (videoPlayerRef.current) {
      videoPlayerRef.current.muted = newMuted;
      videoPlayerRef.current.volume = newMuted ? 0 : videoVolume;
    }
  };

  const handleFullscreenToggle = () => {
    if (!videoPlayerRef.current) return;
    const video = videoPlayerRef.current;
    if (!document.fullscreenElement) {
      const wrapper = video.parentElement;
      if (wrapper.requestFullscreen) {
        wrapper.requestFullscreen();
      } else if (wrapper.webkitRequestFullscreen) {
        wrapper.webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const formatTimeMMSS = (timeInSecs) => {
    if (isNaN(timeInSecs)) return '0:00';
    const mins = Math.floor(timeInSecs / 60);
    const secs = Math.floor(timeInSecs % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleVideoPlay = () => {
    if (ignorePlayerStateChangeRef.current) return;
    if (!activeChat || !videoPlayerRef.current) return;
    socketRef.current?.emit('sync_play_update', {
      chatId: activeChat._id,
      videoId: syncPlayVideoId,
      action: 'play',
      currentTime: videoPlayerRef.current.currentTime,
      isPlaying: true
    });
  };

  const handleVideoPause = () => {
    if (ignorePlayerStateChangeRef.current) return;
    if (!activeChat || !videoPlayerRef.current) return;
    socketRef.current?.emit('sync_play_update', {
      chatId: activeChat._id,
      videoId: syncPlayVideoId,
      action: 'pause',
      currentTime: videoPlayerRef.current.currentTime,
      isPlaying: false
    });
  };

  const handleVideoSeeked = () => {
    if (ignorePlayerStateChangeRef.current) return;
    if (!activeChat || !videoPlayerRef.current) return;
    socketRef.current?.emit('sync_play_update', {
      chatId: activeChat._id,
      videoId: syncPlayVideoId,
      action: 'seek',
      currentTime: videoPlayerRef.current.currentTime,
      isPlaying: !videoPlayerRef.current.paused
    });
  };

  const handleVideoLoadedMetadata = (e) => {
    const video = e.target;
    video.playbackRate = videoPlaybackRate;
    if (activeChat && activeChat.syncPlay) {
      const { currentTime, isPlaying, lastUpdatedAt } = activeChat.syncPlay;
      let targetTime = currentTime || 0;
      if (isPlaying && lastUpdatedAt) {
        const elapsed = (Date.now() - new Date(lastUpdatedAt).getTime()) / 1000;
        targetTime += elapsed;
      }
      ignorePlayerStateChangeRef.current = true;
      video.currentTime = targetTime;
      if (isPlaying) {
        video.play().catch(err => console.error(err));
      } else {
        video.pause();
      }
      setTimeout(() => {
        ignorePlayerStateChangeRef.current = false;
      }, 800);
    }
  };

  const handleStartSyncPlay = () => {
    if (!activeChat) return;

    socketRef.current?.emit('sync_play_toggle', {
      chatId: activeChat._id,
      active: true,
      videoId: activeChat.syncPlay?.videoId || ''
    });
  };

  const handleEndSyncPlayGroup = async () => {
    if (!activeChat) return;
    const confirmMessage = activeChat.isGroup 
      ? 'Are you sure you want to end the group Sync Play session? This stops it for everyone.'
      : 'Are you sure you want to end the Sync Play session?';
    if (!await showConfirm(confirmMessage)) return;
    
    socketRef.current?.emit('sync_play_toggle', {
      chatId: activeChat._id,
      active: false
    });
  };

  const handleChangeVideo = (url) => {
    if (!url) return;
    const targetVideoId = url.trim();

    socketRef.current?.emit('sync_play_update', {
      chatId: activeChat._id,
      videoId: targetVideoId,
      action: 'change_video',
      currentTime: 0,
      isPlaying: false
    });

    setSyncPlayVideoId(targetVideoId);
    setSyncPlayVideoUrl('');
    setSyncPlayDownloadStatus('downloading');
    setSyncPlayDownloadProgress(0);
    setSyncPlayDownloadError('');
    setSyncPlayIsPlaying(false);
    setSyncPlayInputUrl('');
  };

  function handlePlayerPlayPause() {
    if (syncPlayDownloadStatus === 'completed' && videoPlayerRef.current) {
      const isPlaying = !videoPlayerRef.current.paused;
      const currentTime = videoPlayerRef.current.currentTime;
      socketRef.current?.emit('sync_play_update', {
        chatId: activeChat._id,
        videoId: syncPlayVideoId,
        action: isPlaying ? 'pause' : 'play',
        currentTime,
        isPlaying: !isPlaying
      });

      ignorePlayerStateChangeRef.current = true;
      if (isPlaying) {
        videoPlayerRef.current.pause();
        setSyncPlayIsPlaying(false);
      } else {
        videoPlayerRef.current.play().catch(e => console.error(e));
        setSyncPlayIsPlaying(true);
      }
      setTimeout(() => {
        ignorePlayerStateChangeRef.current = false;
      }, 800);
      return;
    }

    if (ytPlayerRef.current && ytPlayerReadyRef.current) {
      const isPlaying = ytPlayerRef.current.getPlayerState() === 1;
      const currentTime = ytPlayerRef.current.getCurrentTime();
      socketRef.current?.emit('sync_play_update', {
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

  const handleSyncPlayScreenshot = async () => {
    console.log('[SyncPlay Snapshot] Clicked Share Frame');
    let videoId = syncPlayVideoId || (activeChat?.syncPlay?.videoId);
    
    if (!activeChat) return;

    setIsSharingFrame(true);

    const formatTime = (timeInSecs) => {
      const mins = Math.floor(timeInSecs / 60);
      const secs = Math.floor(timeInSecs % 60);
      return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const sendFallbackMessage = (videoUrl, formattedTime) => {
      console.warn('[SyncPlay Snapshot] Invoking text watch-link fallback.');
      const messageData = {
        chatId: activeChat._id,
        content: `📺 SyncPlay link at ${formattedTime}\n🔗 Watch here: ${videoUrl}`,
        replyTo: replyingToMessage ? replyingToMessage._id : null
      };
      socketRef.current?.emit('send_message', messageData);
      setIsSharingFrame(false);
    };

    if (syncPlayDownloadStatus === 'completed' && videoPlayerRef.current) {
      try {
        const video = videoPlayerRef.current;
        const currentTime = video.currentTime;
        const duration = video.duration || 0;
        const formattedTime = formatTime(currentTime);
        const formattedDuration = duration ? formatTime(duration) : '';
        const timestampString = formattedDuration ? `${formattedTime} / ${formattedDuration}` : formattedTime;

        const watchUrl = `${API_BASE_URL.replace('/api', '')}${syncPlayVideoUrl}#t=${Math.floor(currentTime)}`;

        const videoWidth = video.videoWidth || 640;
        const videoHeight = video.videoHeight || 360;
        
        const canvas = document.createElement('canvas');
        const maxDimension = 1920;
        let canvasWidth = videoWidth;
        let canvasHeight = videoHeight;
        
        if (videoWidth > videoHeight) {
          if (videoWidth > maxDimension) {
            canvasWidth = maxDimension;
            canvasHeight = Math.round((videoHeight * maxDimension) / videoWidth);
          }
        } else {
          if (videoHeight > maxDimension) {
            canvasHeight = maxDimension;
            canvasWidth = Math.round((videoWidth * maxDimension) / videoHeight);
          }
        }
        
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        const ctx = canvas.getContext('2d');

        try {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        } catch (e) {
          console.warn('[SyncPlay Snapshot] Canvas tainted or capture failed:', e);
          sendFallbackMessage(watchUrl, formattedTime);
          return;
        }

        // Draw a clean timestamp badge in the bottom-left corner
        const scaleFactor = canvasWidth / 640;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
        const badgeX = 15 * scaleFactor;
        const badgeY = canvas.height - (35 * scaleFactor);
        const fontSize = Math.max(12, Math.round(12 * scaleFactor));
        ctx.font = `500 ${fontSize}px system-ui, -apple-system, sans-serif`;
        const badgeWidth = ctx.measureText(timestampString).width + (20 * scaleFactor);
        const badgeHeight = 24 * scaleFactor;
        const radius = 4 * scaleFactor;
        
        ctx.beginPath();
        ctx.moveTo(badgeX + radius, badgeY);
        ctx.lineTo(badgeX + badgeWidth - radius, badgeY);
        ctx.quadraticCurveTo(badgeX + badgeWidth, badgeY, badgeX + badgeWidth, badgeY + radius);
        ctx.lineTo(badgeX + badgeWidth, badgeY + badgeHeight - radius);
        ctx.quadraticCurveTo(badgeX + badgeWidth, badgeY + badgeHeight, badgeX + badgeWidth - radius, badgeY + badgeHeight);
        ctx.lineTo(badgeX + radius, badgeY + badgeHeight);
        ctx.quadraticCurveTo(badgeX, badgeY + badgeHeight, badgeX, badgeY + badgeHeight - radius);
        ctx.lineTo(badgeX, badgeY + radius);
        ctx.quadraticCurveTo(badgeX, badgeY, badgeX + radius, badgeY);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.fillText(timestampString, badgeX + (10 * scaleFactor), badgeY + (16 * scaleFactor));

        canvas.toBlob(async (blob) => {
          try {
            if (!blob) {
              sendFallbackMessage(watchUrl, formattedTime);
              return;
            }

            const file = new File([blob], `syncplay-snapshot-local-${Math.floor(currentTime)}.jpg`, {
              type: 'image/jpeg'
            });

            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(`${API_BASE_URL}/upload`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${token}` },
              body: formData
            });

            if (response.ok) {
              const uploadData = await response.json();
              const messageData = {
                chatId: activeChat._id,
                content: `📸 Shared a video snapshot at ${formattedTime}`,
                fileUrl: uploadData.fileUrl,
                fileName: `snapshot-${formattedTime}.jpg`,
                fileType: 'image/jpeg',
                fileSize: uploadData.fileSize,
                replyTo: replyingToMessage ? replyingToMessage._id : null
              };

              socketRef.current?.emit('send_message', messageData);
              setReplyingToMessage(null);
            } else {
              sendFallbackMessage(watchUrl, formattedTime);
            }
          } catch (err) {
            console.error(err);
            sendFallbackMessage(watchUrl, formattedTime);
          } finally {
            setIsSharingFrame(false);
          }
        }, 'image/jpeg', 0.85);

      } catch (err) {
        console.error(err);
        setIsSharingFrame(false);
      }
      return;
    }

    if (!videoId && ytPlayerRef.current) {
      try {
        if (typeof ytPlayerRef.current.getVideoData === 'function') {
          const videoData = ytPlayerRef.current.getVideoData();
          if (videoData && videoData.video_id) {
            videoId = videoData.video_id;
          }
        }
      } catch (e) {
        console.warn(e);
      }
    }

    if (!videoId && ytPlayerRef.current) {
      try {
        if (typeof ytPlayerRef.current.getVideoUrl === 'function') {
          const videoUrl = ytPlayerRef.current.getVideoUrl();
          if (videoUrl) {
            videoId = extractYouTubeId(videoUrl);
          }
        }
      } catch (e) {
        console.warn(e);
      }
    }

    if (!videoId) {
      setIsSharingFrame(false);
      return;
    }

    try {
      const player = ytPlayerRef.current;
      let currentTime = 0;
      let duration = 0;

      try {
        if (player && typeof player.getCurrentTime === 'function') {
          currentTime = player.getCurrentTime();
        }
      } catch (e) {
        console.warn(e);
      }

      try {
        if (player && typeof player.getDuration === 'function') {
          duration = player.getDuration();
        }
      } catch (e) {
        console.warn(e);
      }

      const formattedTime = formatTime(currentTime);
      const formattedDuration = duration ? formatTime(duration) : '';
      const timestampString = formattedDuration ? `${formattedTime} / ${formattedDuration}` : formattedTime;

      const videoUrl = `https://youtu.be/${videoId}?t=${Math.floor(currentTime)}`;

      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      const proxyUrl = `${API_BASE_URL}/upload/proxy-thumb?videoId=${videoId}`;
      img.src = proxyUrl;

      const sendYtFallbackMessage = () => {
        sendFallbackMessage(videoUrl, formattedTime);
      };

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 1920;
          canvas.height = 1080;
          const ctx = canvas.getContext('2d');

          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          // Draw a clean timestamp badge in the bottom-left corner
          const scaleFactor = canvas.width / 640;
          ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
          const badgeX = 15 * scaleFactor;
          const badgeY = canvas.height - (35 * scaleFactor);
          const fontSize = Math.max(12, Math.round(12 * scaleFactor));
          ctx.font = `500 ${fontSize}px system-ui, -apple-system, sans-serif`;
          const badgeWidth = ctx.measureText(timestampString).width + (20 * scaleFactor);
          const badgeHeight = 24 * scaleFactor;
          const radius = 4 * scaleFactor;
          
          ctx.beginPath();
          ctx.moveTo(badgeX + radius, badgeY);
          ctx.lineTo(badgeX + badgeWidth - radius, badgeY);
          ctx.quadraticCurveTo(badgeX + badgeWidth, badgeY, badgeX + badgeWidth, badgeY + radius);
          ctx.lineTo(badgeX + badgeWidth, badgeY + badgeHeight - radius);
          ctx.quadraticCurveTo(badgeX + badgeWidth, badgeY + badgeHeight, badgeX + badgeWidth - radius, badgeY + badgeHeight);
          ctx.lineTo(badgeX + radius, badgeY + badgeHeight);
          ctx.quadraticCurveTo(badgeX, badgeY + badgeHeight, badgeX, badgeY + badgeHeight - radius);
          ctx.lineTo(badgeX, badgeY + radius);
          ctx.quadraticCurveTo(badgeX, badgeY, badgeX + radius, badgeY);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.fillText(timestampString, badgeX + (10 * scaleFactor), badgeY + (16 * scaleFactor));

          canvas.toBlob(async (blob) => {
            try {
              if (!blob) {
                sendYtFallbackMessage();
                return;
              }

              const file = new File([blob], `syncplay-snapshot-${videoId}-${Math.floor(currentTime)}.jpg`, {
                type: 'image/jpeg'
              });

              const formData = new FormData();
              formData.append('file', file);

              const response = await fetch(`${API_BASE_URL}/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
              });

              if (response.ok) {
                const uploadData = await response.json();
                const messageData = {
                  chatId: activeChat._id,
                  content: `📸 Shared a video snapshot at ${formattedTime}`,
                  fileUrl: uploadData.fileUrl,
                  fileName: `snapshot-${formattedTime}.jpg`,
                  fileType: 'image/jpeg',
                  fileSize: uploadData.fileSize,
                  replyTo: replyingToMessage ? replyingToMessage._id : null
                };

                socketRef.current?.emit('send_message', messageData);
                setReplyingToMessage(null);
              } else {
                sendYtFallbackMessage();
              }
            } catch (err) {
              console.error(err);
              sendYtFallbackMessage();
            } finally {
              setIsSharingFrame(false);
            }
          }, 'image/jpeg', 0.85);

        } catch (err) {
          console.error(err);
          sendYtFallbackMessage();
          setIsSharingFrame(false);
        }
      };

      img.onerror = () => {
        sendYtFallbackMessage();
      };

    } catch (err) {
      console.error(err);
      alert(`Error taking snapshot: ${err.message}`);
      setIsSharingFrame(false);
    }
  };

  function handleSkipTime(amount) {
    if (syncPlayDownloadStatus === 'completed' && videoPlayerRef.current) {
      const currentTime = videoPlayerRef.current.currentTime + amount;
      socketRef.current?.emit('sync_play_update', {
        chatId: activeChat._id,
        videoId: syncPlayVideoId,
        action: 'seek',
        currentTime,
        isPlaying: syncPlayIsPlaying
      });

      ignorePlayerStateChangeRef.current = true;
      videoPlayerRef.current.currentTime = currentTime;
      setTimeout(() => {
        ignorePlayerStateChangeRef.current = false;
      }, 800);
      return;
    }

    if (ytPlayerRef.current && ytPlayerReadyRef.current) {
      const currentTime = ytPlayerRef.current.getCurrentTime() + amount;
      socketRef.current?.emit('sync_play_update', {
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
          const { currentTime, isPlaying, lastUpdatedAt, videoId, videoUrl, downloadStatus, downloadProgress, downloadError, history } = chatData.syncPlay;
          
          let targetTime = currentTime || 0;
          if (isPlaying && lastUpdatedAt) {
            const elapsed = (Date.now() - new Date(lastUpdatedAt).getTime()) / 1000;
            targetTime += elapsed;
          }

          setSyncPlayVideoId(videoId);
          setSyncPlayVideoUrl(videoUrl || '');
          setSyncPlayDownloadStatus(downloadStatus || 'idle');
          setSyncPlayDownloadProgress(downloadProgress || 0);
          setSyncPlayDownloadError(downloadError || '');
          setSyncPlayHistory(history || []);

          setActiveChat(prev => {
            if (prev && prev._id === activeChat._id) {
              return {
                ...prev,
                syncPlay: chatData.syncPlay
              };
            }
            return prev;
          });

          setChats(prev => prev.map(c => {
            if (c._id === activeChat._id) {
              return {
                ...c,
                syncPlay: chatData.syncPlay
              };
            }
            return c;
          }));

          if (downloadStatus === 'completed' && videoPlayerRef.current) {
            ignorePlayerStateChangeRef.current = true;
            videoPlayerRef.current.currentTime = targetTime;
            if (isPlaying) {
              videoPlayerRef.current.play().catch(e => console.error(e));
              setSyncPlayIsPlaying(true);
            } else {
              videoPlayerRef.current.pause();
              setSyncPlayIsPlaying(false);
            }
            setTimeout(() => {
              ignorePlayerStateChangeRef.current = false;
            }, 800);
          } else if (ytPlayerRef.current && ytPlayerReadyRef.current) {
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



  const handleBlockUser = async (targetUserId) => {
    if (!await showConfirm('Are you sure you want to block this user? They will not be able to message you.')) return;
    try {
      const response = await fetch(`${API_BASE_URL}/users/block`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId: targetUserId })
      });
      if (response.ok) {
        setUser(prev => ({
          ...prev,
          blockedUsers: [...(prev.blockedUsers || []), targetUserId]
        }));
      } else {
        const err = await response.json();
        alert(err.error || 'Failed to block user');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUnblockUser = async (targetUserId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/unblock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId: targetUserId })
      });
      if (response.ok) {
        setUser(prev => ({
          ...prev,
          blockedUsers: (prev.blockedUsers || []).filter(id => id !== targetUserId)
        }));
      } else {
        const err = await response.json();
        alert(err.error || 'Failed to unblock user');
      }
    } catch (err) {
      console.error(err);
    }
  };

  function logout() {
    localStorage.removeItem('alaap_token');
    setToken('');
    setUser(null);
    setActiveChat(null);
    setChats([]);
    setMessages([]);
    setIsAdminOpen(false);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get other participant metadata in DMs
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
    const otherUser = chat.members.find(m => m._id !== user?.id);
    return {
      name: otherUser ? otherUser.username : 'Unknown User',
      avatar: otherUser?.profilePic || (otherUser ? otherUser.username.substring(0, 2).toUpperCase() : '??'),
      status: otherUser?.status || 'offline',
      isAdmin: otherUser?.isAdmin
    };
  };

  if (token && loadingUser) {
    return (
      <div className="app-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0b0c10', color: '#f8fafc' }}>
        <Loader2 className="animate-spin" size={42} style={{ color: '#6366f1', marginBottom: '16px' }} />
        <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Loading Alaap...</h3>
      </div>
    );
  }

  return (
    <div className="app-container">
      {!token ? (
        <AuthScreen 
          setToken={setToken} 
          setUser={setUser} 
          systemSettings={systemSignupSettings}
          fetchSystemSignupSettings={fetchSystemSignupSettings}
          showAlert={showAlert}
        />
      ) : (
        <div className={`main-workspace glass-panel ${activeChat ? 'active-chat-selected' : ''} ${isAdminOpen ? 'admin-selected' : ''} ${isSettingsOpen ? 'settings-selected' : ''}`}>
          {/* Sidebar */}
          <div className={`sidebar border-r ${isSidebarHidden ? 'hidden' : ''}`} style={{ width: `${sidebarWidth}px` }}>
            {/* Sidebar Header */}
            <div className="sidebar-header border-b">
              <div className="user-profile">
                <div className="avatar">
                  {user?.profilePic ? (
                    <img src={user.profilePic} alt={user?.username || 'User'} />
                  ) : (
                    user?.username?.substring(0, 2).toUpperCase() || 'AL'
                  )}
                  <div className="status-dot online"></div>
                </div>
                <div className="user-info">
                  <h3 className="username">{user?.username || 'Loading...'}</h3>
                  {user?.isAdmin && (
                    <span className={`admin-badge ${user?.role === 'Admin' ? 'subadmin' : ''}`}>
                      <Shield size={10} /> {user?.role || 'Root'}
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
                
                {/* Notification Bell */}
                <button 
                  className={`icon-btn ${showNotificationCenter ? 'active' : ''}`} 
                  title="Notifications"
                  onClick={() => {
                    setShowNotificationCenter(!showNotificationCenter);
                    setIsSettingsOpen(false);
                    setIsAdminOpen(false);
                  }}
                  style={{ position: 'relative' }}
                >
                  <Bell size={20} />
                  {notifications.some(n => !n.read) && (
                    <span className="bell-badge-dot" style={{
                      position: 'absolute',
                      top: '4px',
                      right: '4px',
                      width: '8px',
                      height: '8px',
                      backgroundColor: 'var(--accent-rose, #f43f5e)',
                      borderRadius: '50%',
                      border: '1.5px solid rgba(15, 17, 26, 0.95)'
                    }}></span>
                  )}
                </button>

                <button 
                  className={`icon-btn ${isSettingsOpen ? 'active' : ''}`} 
                  title="Settings"
                  onClick={() => {
                    setIsSettingsOpen(!isSettingsOpen);
                    setIsAdminOpen(false);
                    setShowNotificationCenter(false);
                  }}
                >
                  <Settings size={20} />
                </button>
              </div>
            </div>

            {/* Notification Center Inline Panel */}
            {showNotificationCenter && (
              <div className="inline-notification-center" style={{
                display: 'flex',
                flexDirection: 'column',
                flexGrow: 1,
                overflow: 'hidden'
              }}>
                <div className="notification-center-header border-b" style={{
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'rgba(0, 0, 0, 0.1)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button 
                      className="icon-btn" 
                      onClick={() => setShowNotificationCenter(false)}
                      title="Back to Chats"
                      style={{ padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
                      onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                      onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                    >
                      <ArrowLeft size={16} />
                    </button>
                    <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>Notifications</h4>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="text-btn btn-sm" onClick={markAllNotificationsAsRead} style={{ fontSize: '0.75rem', background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}>Mark read</button>
                    <button className="text-btn btn-sm text-danger" onClick={clearNotificationHistory} style={{ fontSize: '0.75rem', background: 'none', border: 'none', color: 'var(--accent-rose)', cursor: 'pointer' }}>Clear all</button>
                  </div>
                </div>
                <div className="notification-center-list scroll-container" style={{
                  overflowY: 'auto',
                  flexGrow: 1,
                  padding: '12px'
                }}>
                  {notifications.length === 0 ? (
                    <div className="empty-notifications" style={{
                      padding: '40px 20px',
                      textAlign: 'center',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <BellOff size={28} style={{ color: 'var(--text-muted)' }} />
                      <span style={{ fontSize: '0.85rem' }}>No notification history</span>
                    </div>
                  ) : (
                    notifications.map(n => (
                      <div 
                        key={n.id} 
                        className={`notification-item ${n.read ? 'read' : 'unread'}`}
                        style={{
                          padding: '12px 14px',
                          borderRadius: 'var(--radius-sm)',
                          cursor: 'pointer',
                          marginBottom: '8px',
                          background: n.read ? 'rgba(255,255,255,0.02)' : 'rgba(99, 102, 241, 0.08)',
                          border: n.read ? '1px solid rgba(255,255,255,0.03)' : '1px solid rgba(99, 102, 241, 0.15)',
                          transition: 'all 0.2s'
                        }}
                        onClick={() => {
                          setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, read: true } : item));
                          const targetChat = chats.find(c => c._id === n.chatId);
                          if (targetChat) setActiveChat(targetChat);
                          setShowNotificationCenter(false);
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span className="notification-title" style={{ fontSize: '0.85rem', fontWeight: n.read ? 500 : 700, color: 'var(--text-primary)' }}>{n.title}</span>
                          <span className="notification-time" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="notification-msg" style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {!showNotificationCenter && (
              <>

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
              
              {/* Group Chat Trigger */}
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
                      <span className="search-username">{resultUser.username}</span>
                      {resultUser.isAdmin && (
                        <span className={`badge-admin ${resultUser.role === 'Admin' ? 'subadmin' : ''}`}>
                          {resultUser.role || (resultUser.username === 'rkdarpan' ? 'Root' : 'Admin')}
                        </span>
                      )}
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
                      onClick={() => setActiveChat(chat)}
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
                          <span className="chat-name" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span>{details.name}</span>
                            {isChatMuted(chat) && <BellOff size={12} style={{ opacity: 0.5, color: 'var(--text-secondary)' }} />}
                          </span>
                          {chat.latestMessage && (
                            <span className="chat-time">
                              {new Date(chat.latestMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                        <div className="chat-item-preview">
                          {typerNames.length > 0 ? (
                            <span className="typing-preview">{typerNames.join(', ')} typing...</span>
                          ) : chat.latestMessage ? (
                            <span className="last-msg-text">
                              {!chat.latestMessage.sender ? 'Deleted User: ' : (chat.latestMessage.sender._id === user?.id ? 'You: ' : `${chat.latestMessage.sender.username}: `)}
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
                        <div className={`unread-badge ${isChatMuted(chat) ? 'muted' : ''}`} style={isChatMuted(chat) ? {
                          background: 'rgba(255, 255, 255, 0.15)',
                          color: 'var(--text-secondary)',
                          boxShadow: 'none'
                        } : {}}>{chat.unreadCount}</div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
          
          {!isSidebarHidden && (
            <div 
              className="resize-handle" 
              onMouseDown={handleSidebarResizeMouseDown}
            />
          )}

          {/* Active Chat Area or Admin Dashboard or Settings Center */}
          {isAdminOpen ? (
            <AdminDashboard 
              token={token} 
              user={user}
              onClose={() => {
                setIsAdminOpen(false);
                fetchSystemSignupSettings();
              }} 
              showConfirm={showConfirm}
              showAlert={showAlert}
              onOpenChat={(chat) => {
                setActiveChat(chat);
                setChats(prev => {
                  if (prev.some(c => c._id === chat._id)) {
                    return prev;
                  }
                  return [chat, ...prev];
                });
                setIsAdminOpen(false);
              }}
              socket={socketRef.current}
            />
          ) : isSettingsOpen ? (
            <SettingsCenter 
              token={token}
              user={user}
              setUser={setUser}
              onClose={() => setIsSettingsOpen(false)}
              logout={logout}
              deferredPrompt={deferredPrompt}
              setDeferredPrompt={setDeferredPrompt}
              notificationSettings={notificationSettings}
              setNotificationSettings={setNotificationSettings}
              requestNotificationPermission={requestNotificationPermission}
            />
          ) : activeChat ? (
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
                    ) : getChatDetails(activeChat).avatar.length > 2 ? (
                      <img src={getChatDetails(activeChat).avatar} alt={getChatDetails(activeChat).name} />
                    ) : (
                      getChatDetails(activeChat).avatar
                    )}
                    {!activeChat.isGroup && <div className={`status-dot ${getChatDetails(activeChat).status}`}></div>}
                  </div>
                  <div>
                    <h3 className="active-chat-name">{getChatDetails(activeChat).name}</h3>
                    <p className="active-chat-status">
                      {activeChat.isGroup 
                        ? `${getChatDetails(activeChat).membersCount} members` 
                        : getChatDetails(activeChat).status === 'online' ? 'Online' : 'Offline'
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
                      className={`icon-btn ${isSyncPlayHeaderHidden ? 'active' : ''}`}
                      title={isSyncPlayHeaderHidden ? 'Show Video Controller Header' : 'Hide Video Controller Header'}
                      onClick={() => setIsSyncPlayHeaderHidden(!isSyncPlayHeaderHidden)}
                    >
                      {isSyncPlayHeaderHidden ? <Eye size={20} /> : <EyeOff size={20} />}
                    </button>
                  )}

                  {activeChat && (() => {
                    const isBlockedOrBlocker = (() => {
                      if (!activeChat.isGroup) {
                        const otherMember = activeChat.members.find(m => m._id !== user?.id);
                        if (otherMember) {
                          const amBlocked = otherMember.blockedUsers?.includes(user?.id);
                          const iBlocked = (user?.blockedUsers || []).includes(otherMember._id);
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
                            changeSyncPlayActive(false);
                          } else {
                            setIsInfoPanelOpen(false); // Close chat details panel when opening Sync Play
                            if (activeChat.syncPlay && activeChat.syncPlay.active) {
                              changeSyncPlayActive(true);
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
                        changeSyncPlayActive(false); // Close Sync Play panel when opening chat details
                      }
                    }}
                  >
                    <Info size={20} />
                  </button>
                </div>
              </div>

              <div className="chat-body-container" style={syncPlayActive && syncPlayLayoutReversed ? { flexDirection: 'row-reverse' } : {}}>
                <div 
                  className="chat-left-side" 
                  style={
                    syncPlayActive 
                      ? { 
                          width: 'auto', 
                          minWidth: window.innerWidth > 768 ? '460px' : 'none',
                          flexGrow: 1, 
                          flexShrink: 1 
                        } 
                      : {}
                  }
                >
                  {/* Message History Feed */}
                  <div className="messages-feed">
                {messages.map((msg, index) => {
                  const isOwn = msg.sender && msg.sender._id === user?.id;
                  
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
                          {/* Render reply quote */}
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
                            msg.fileType.startsWith('audio/') ? (
                              <AudioMessagePlayer src={msg.fileUrl} />
                            ) : (
                              <div className="file-attachment">
                                {msg.fileType.startsWith('image/') ? (
                                  <div className="attachment-image-wrapper" onClick={() => {
                                    setPreviewImageUrl(msg.fileUrl);
                                    setPreviewImageMsg(msg);
                                  }}>
                                    <img 
                                      src={msg.fileUrl} 
                                      alt={msg.fileName} 
                                      className="attachment-preview-img"
                                    />
                                  </div>
                                ) : msg.fileType.startsWith('video/') ? (
                                  <div 
                                    className="attachment-video-preview-wrapper"
                                    onClick={() => setPopupVideo({ url: msg.fileUrl, name: msg.fileName })}
                                  >
                                    <video 
                                      src={msg.fileUrl} 
                                      preload="metadata"
                                      className="attachment-preview-video-thumbnail"
                                    />
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
                          {msg.content && (
                            <p className="message-text">
                              {renderMessageContent(msg)}
                            </p>
                          )}

                          {/* Reactions Display Pill */}
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
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {msg.isEdited && (
                            <span className="edited-indicator"> (edited)</span>
                          )}
                          {isOwn && (() => {
                            const otherRead = msg.readBy && msg.readBy.some(r => {
                              const rId = r._id || r;
                              const currentId = user?.id || user?._id;
                              return rId && currentId && rId.toString() !== currentId.toString();
                            });
                            const otherDelivered = msg.deliveredTo && msg.deliveredTo.some(d => {
                              const dId = d._id || d;
                              const currentId = user?.id || user?._id;
                              return dId && currentId && dId.toString() !== currentId.toString();
                            });

                            if (otherRead) {
                              return (
                                <span className="receipt-ticks read">
                                  <CheckCheck size={14} className="ticks" />
                                </span>
                              );
                            } else if (otherDelivered) {
                              return (
                                <span className="receipt-ticks delivered">
                                  <CheckCheck size={14} className="ticks" />
                                </span>
                              );
                            } else {
                              return (
                                <span className="receipt-ticks sent">
                                  <Check size={14} className="ticks" />
                                </span>
                              );
                            }
                          })()}
                        </span>
                      </div>

                      {/* Hover Action Menu */}
                      <div className="message-hover-actions">
                        <button 
                          type="button" 
                          className="msg-action-btn" 
                          title="React"
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
                          title="Reply"
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
                            title="More options"
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
                {/* Typing status display */}
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

              {/* Uploading progress overlay */}
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
                  <button 
                    type="button" 
                    className="reply-preview-close" 
                    onClick={() => setReplyingToMessage(null)}
                  >
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
                  const otherMember = activeChat.members.find(m => m._id !== user?.id);
                  if (otherMember) {
                    const amBlocked = otherMember.blockedUsers?.includes(user?.id);
                    const iBlocked = (user?.blockedUsers || []).includes(otherMember._id);

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
                          <button 
                            type="button" 
                            className="record-btn cancel" 
                            onClick={cancelRecording} 
                            title="Discard Recording"
                          >
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
                          <button 
                            type="button" 
                            className="record-btn stop-send" 
                            onClick={stopAndSendRecording} 
                            title="Stop & Send"
                          >
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
                              title="Emojis"
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
                                            className="emoji-item"
                                            onClick={() => handleEmojiClick(emoji)}
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

            {syncPlayActive && (
              <>
                <div 
                  className="resize-handle" 
                  onMouseDown={handleSyncPlayResizeMouseDown}
                />
                <div 
                  className={`chat-right-side sync-play-panel animate-fade-in ${syncPlayLayoutReversed ? 'border-r' : 'border-l'}`}
                  style={{ 
                    width: `${syncPlayWidth}px`,
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
                      className={`btn btn-sm ${showSyncPlayHistoryTab ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setShowSyncPlayHistoryTab(prev => !prev)}
                      title="View Video History"
                      style={{ width: '32px', height: '32px', padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <History size={15} />
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
                {showSyncPlayHistoryTab ? (
                  <div className="sync-play-history-panel" style={{ display: 'flex', flexDirection: 'column', gap: '15px', height: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 style={{ margin: 0, fontSize: '15px', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <History size={16} style={{ color: 'var(--primary)' }} />
                        <span>Playback History</span>
                      </h4>
                      <button 
                        type="button" 
                        className="btn btn-secondary btn-sm"
                        onClick={() => setShowSyncPlayHistoryTab(false)}
                      >
                        Back to Player
                      </button>
                    </div>

                    <div className="history-list" style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      overflowY: 'auto',
                      maxHeight: 'calc(100vh - 250px)',
                      paddingRight: '4px'
                    }}>
                      {syncPlayHistory && syncPlayHistory.length > 0 ? (
                        [...syncPlayHistory].reverse().map((item, idx) => {
                          const dateString = new Date(item.addedAt).toLocaleString();
                          const isCurrentlyPlaying = syncPlayVideoId === item.videoId;
                          
                          return (
                            <div 
                              key={item._id || idx}
                              className="history-item"
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '6px',
                                padding: '12px',
                                background: isCurrentlyPlaying ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                                border: isCurrentlyPlaying ? '1px solid #3b82f6' : '1px solid var(--glass-border)',
                                borderRadius: 'var(--radius-md)',
                                transition: 'all 0.2s ease'
                              }}
                            >
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                                  <div 
                                    style={{
                                      fontSize: '13px',
                                      fontWeight: '600',
                                      color: '#fff',
                                      maxHeight: '40px',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      display: '-webkit-box',
                                      WebkitLineClamp: 2,
                                      WebkitBoxOrient: 'vertical',
                                      flexGrow: 1
                                    }}
                                    title={item.videoTitle || item.videoId}
                                  >
                                    {item.videoTitle || 'Video'}
                                  </div>
                                  {isCurrentlyPlaying && (
                                    <span style={{ fontSize: '10px', padding: '2px 6px', background: '#3b82f6', color: '#fff', borderRadius: '10px', fontWeight: 'bold', flexShrink: 0 }}>
                                      Playing
                                    </span>
                                  )}
                                </div>
                                <div 
                                  style={{
                                    fontSize: '11px',
                                    color: 'rgba(255, 255, 255, 0.4)',
                                    wordBreak: 'break-all',
                                    maxHeight: '20px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  }}
                                  title={item.videoId}
                                >
                                  {item.videoId}
                                </div>
                              </div>
                              
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)' }}>
                                <span>Loaded by: <strong style={{ color: 'var(--primary)' }}>{item.addedByName || 'User'}</strong></span>
                                <span title={dateString}>{new Date(item.addedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                              
                              {!isCurrentlyPlaying && (
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-sm"
                                  style={{ marginTop: '5px', width: 'fit-content', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)' }}
                                  onClick={() => {
                                    handleChangeVideo(item.videoId);
                                    setShowSyncPlayHistoryTab(false);
                                  }}
                                >
                                  Replay Video
                                </button>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '40px 20px',
                          color: 'rgba(255, 255, 255, 0.4)',
                          textAlign: 'center',
                          gap: '10px'
                        }}>
                          <History size={32} style={{ opacity: 0.3 }} />
                          <span style={{ fontSize: '13px' }}>No played videos in this session yet.</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="yt-player-container" style={{ position: 'relative', width: '100%', aspectRatio: '16/9', background: '#000', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div id="sync-play-yt-player" style={{ display: (syncPlayDownloadStatus !== 'completed' && !syncPlayVideoUrl) ? 'block' : 'none', width: '100%', height: '100%' }}></div>
                    
                    {syncPlayDownloadStatus === 'completed' && syncPlayVideoUrl && (
                      <div 
                        className="custom-video-player-container"
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5 }}
                        onMouseMove={handleMouseMoveControls}
                        onMouseLeave={() => setShowCustomControls(false)}
                      >
                        {/* Fullscreen Toasts Container */}
                        {isFullscreenActive && toasts.length > 0 && (
                          <div className="fullscreen-toast-container" style={{
                            position: 'absolute',
                            top: '24px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            zIndex: 10000,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px',
                            width: '100%',
                            maxWidth: '360px',
                            pointerEvents: 'none'
                          }}>
                            {toasts.map(toast => (
                              <div 
                                key={toast.id} 
                                className="toast-notification glass-panel animate-slide-in" 
                                style={{
                                  pointerEvents: 'auto',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '12px',
                                  padding: '10px 16px',
                                  background: 'rgba(15, 17, 26, 0.95)',
                                  border: '1px solid rgba(255, 255, 255, 0.15)',
                                  borderRadius: 'var(--radius-md)',
                                  boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.4)',
                                  cursor: 'pointer',
                                  backdropFilter: 'blur(10px)',
                                  WebkitBackdropFilter: 'blur(10px)'
                                }}
                                onClick={() => {
                                  if (document.exitFullscreen) {
                                    document.exitFullscreen().catch(err => console.error(err));
                                  }
                                  toast.onClick?.();
                                  removeToast(toast.id);
                                }}
                              >
                                {toast.avatar ? (
                                  <img 
                                    src={toast.avatar} 
                                    alt={toast.title} 
                                    style={{
                                      width: '32px',
                                      height: '32px',
                                      borderRadius: '50%',
                                      objectFit: 'cover'
                                    }} 
                                  />
                                ) : (
                                  <div 
                                    style={{
                                      width: '32px',
                                      height: '32px',
                                      borderRadius: '50%',
                                      background: 'var(--primary)',
                                      color: '#fff',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontWeight: '600',
                                      fontSize: '0.8rem'
                                    }}
                                  >
                                    {toast.title.substring(0, 2).toUpperCase()}
                                  </div>
                                )}
                                <div style={{ flexGrow: 1, overflow: 'hidden', textAlign: 'left' }}>
                                  <div style={{ fontWeight: '600', fontSize: '0.8rem', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {toast.title}
                                  </div>
                                  <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '1px' }}>
                                    {toast.message}
                                  </div>
                                </div>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeToast(toast.id);
                                  }}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'rgba(255, 255, 255, 0.4)',
                                    cursor: 'pointer',
                                    padding: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: '50%',
                                  }}
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        <video
                          ref={videoPlayerRef}
                          src={`${API_BASE_URL.replace('/api', '')}${syncPlayVideoUrl}`}
                          crossOrigin="anonymous"
                          style={{ width: '100%', height: '100%', objectFit: 'contain', cursor: 'pointer' }}
                          onPlay={handleVideoPlay}
                          onPause={handleVideoPause}
                          onSeeked={handleVideoSeeked}
                          onLoadedMetadata={(e) => {
                            setVideoDuration(e.target.duration);
                            handleVideoLoadedMetadata(e);
                          }}
                          onTimeUpdate={(e) => {
                            if (!isDraggingTimelineRef.current) {
                              setVideoCurrentTime(e.target.currentTime);
                            }
                          }}
                          onClick={handleCustomPlayerPlayPauseToggle}
                          onDoubleClick={handleVideoDoubleClick}
                        />


                        {/* Controls bar at the bottom */}
                        <div 
                          className="custom-player-controls-bar"
                          style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            background: 'linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0.4), transparent)',
                            padding: '15px 20px 10px 20px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            opacity: showCustomControls ? 1 : 0,
                            transition: 'opacity 0.3s ease',
                            pointerEvents: showCustomControls ? 'auto' : 'none',
                            zIndex: 9
                          }}
                        >
                          {/* Timeline Slider (blue color timeline with drag support) */}
                          <div 
                            ref={timelineContainerRef}
                            className="custom-timeline-container"
                            style={{
                              position: 'relative',
                              width: '100%',
                              height: (isHoveringTimeline || isDraggingTimeline) ? '8px' : '5px',
                              background: 'rgba(255,255,255,0.2)',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              transition: 'height 0.2s ease'
                            }}
                            onMouseDown={handleCustomTimelineMouseDown}
                            onTouchStart={handleCustomTimelineTouchStart}
                            onMouseEnter={() => setIsHoveringTimeline(true)}
                            onMouseLeave={() => setIsHoveringTimeline(false)}
                          >
                            <div 
                              className="custom-timeline-progress"
                              style={{
                                width: `${videoDuration ? (videoCurrentTime / videoDuration) * 100 : 0}%`,
                                height: '100%',
                                background: '#3b82f6', // blue color timeline
                                borderRadius: '4px',
                                position: 'relative'
                              }}
                            >
                              <div 
                                className="custom-timeline-handle"
                                style={{
                                  position: 'absolute',
                                  right: '-6px',
                                  top: '50%',
                                  transform: 'translateY(-50%)' + ((isHoveringTimeline || isDraggingTimeline) ? ' scale(1.2)' : ' scale(1)'),
                                  width: '12px',
                                  height: '12px',
                                  borderRadius: '50%',
                                  background: '#fff',
                                  boxShadow: '0 2px 6px rgba(0,0,0,0.6)',
                                  border: '2px solid #3b82f6',
                                  transition: 'transform 0.15s ease, opacity 0.15s ease',
                                  opacity: (isHoveringTimeline || isDraggingTimeline) ? 1 : 0.8
                                }}
                              />
                            </div>
                          </div>

                          {/* Control buttons & Sound/Fullscreen */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', color: '#fff' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                              {/* Small Play/Pause */}
                              <button 
                                type="button" 
                                style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                                onClick={handleCustomPlayerPlayPauseToggle}
                              >
                                {syncPlayIsPlaying ? <Pause size={18} fill="#fff" /> : <Play size={18} fill="#fff" style={{ marginLeft: '2px' }} />}
                              </button>

                              {/* Time Indicator */}
                              <span style={{ fontSize: '12px', fontFamily: 'monospace' }}>
                                {formatTimeMMSS(videoCurrentTime)} / {formatTimeMMSS(videoDuration)}
                              </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                              {/* Volume Controls (white color sound, expands on hover like YouTube) */}
                              <div 
                                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                                onMouseEnter={() => setIsHoveringCustomVolume(true)}
                                onMouseLeave={() => setIsHoveringCustomVolume(false)}
                              >
                                <button 
                                  type="button" 
                                  style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                                  onClick={handleVolumeMuteToggle}
                                >
                                  {videoMuted || videoVolume === 0 ? (
                                    <VolumeX size={18} style={{ color: '#ffffff' }} />
                                  ) : videoVolume < 0.5 ? (
                                    <Volume1 size={18} style={{ color: '#ffffff' }} />
                                  ) : (
                                    <Volume2 size={18} style={{ color: '#ffffff' }} />
                                  )}
                                </button>
                                <div 
                                  style={{
                                    width: isHoveringCustomVolume ? '70px' : '0px',
                                    opacity: isHoveringCustomVolume ? 1 : 0,
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
                                    value={videoMuted ? 0 : videoVolume}
                                    onChange={handleVolumeChange}
                                    style={{
                                      width: '60px',
                                      accentColor: '#ffffff', // white color volume slider
                                      height: '4px',
                                      borderRadius: '2px',
                                      cursor: 'pointer'
                                    }}
                                  />
                                </div>
                              </div>

                              {/* Playback Speed Select */}
                              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <select
                                  value={videoPlaybackRate}
                                  onChange={(e) => handleVideoPlaybackRateChange(parseFloat(e.target.value))}
                                  style={{
                                    background: 'rgba(255, 255, 255, 0.1)',
                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                    color: '#fff',
                                    borderRadius: '4px',
                                    padding: '2px 4px',
                                    fontSize: '0.75rem',
                                    cursor: 'pointer',
                                    outline: 'none',
                                    height: '24px'
                                  }}
                                  title="Playback Speed"
                                >
                                  <option value="0.5" style={{ background: '#131520', color: '#fff' }}>0.5x</option>
                                  <option value="0.75" style={{ background: '#131520', color: '#fff' }}>0.75x</option>
                                  <option value="1" style={{ background: '#131520', color: '#fff' }}>1.0x (Normal)</option>
                                  <option value="1.25" style={{ background: '#131520', color: '#fff' }}>1.25x</option>
                                  <option value="1.5" style={{ background: '#131520', color: '#fff' }}>1.5x</option>
                                  <option value="1.75" style={{ background: '#131520', color: '#fff' }}>1.75x</option>
                                  <option value="2" style={{ background: '#131520', color: '#fff' }}>2.0x</option>
                                </select>
                              </div>

                              {/* Toggle Floating Chat Button */}
                              <button 
                                type="button" 
                                style={{ 
                                  background: 'none', 
                                  border: 'none', 
                                  color: showFloatingChat ? 'var(--primary)' : '#fff', 
                                  cursor: 'pointer', 
                                  padding: 0, 
                                  display: 'flex', 
                                  alignItems: 'center',
                                  transition: 'color 0.2s ease'
                                }}
                                onClick={() => setShowFloatingChat(prev => !prev)}
                                title="Toggle Floating Chat"
                              >
                                <MessageSquare size={18} />
                              </button>

                              {/* Share Frame Button */}
                              <button 
                                type="button" 
                                style={{ 
                                  background: 'none', 
                                  border: 'none', 
                                  color: '#fff', 
                                  cursor: (uploading || isSharingFrame) ? 'not-allowed' : 'pointer', 
                                  padding: 0, 
                                  display: 'flex', 
                                  alignItems: 'center',
                                  opacity: (uploading || isSharingFrame) ? 0.6 : 1
                                }}
                                onClick={handleSyncPlayScreenshot}
                                title="Share Frame"
                                disabled={uploading || isSharingFrame}
                              >
                                {isSharingFrame ? (
                                  <Loader2 className="animate-spin" size={18} />
                                ) : (
                                  <ScreenShare size={18} />
                                )}
                              </button>

                              {/* Fullscreen Button */}
                              <button 
                                type="button" 
                                style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                                onClick={handleFullscreenToggle}
                              >
                                <Maximize size={18} />
                              </button>
                            </div>
                          </div>
                        </div>

                        {showFloatingChat && (
                          <div 
                            ref={floatingChatContainerRef}
                            className="floating-chat-container glass-panel"
                            style={{
                              position: 'absolute',
                              left: floatingChatPos.left !== null ? `${floatingChatPos.left}px` : 'auto',
                              right: floatingChatPos.left !== null ? 'auto' : '20px',
                              top: floatingChatPos.top !== null ? `${floatingChatPos.top}px` : '20px',
                              bottom: floatingChatPos.top !== null ? 'auto' : '80px',
                              width: `${floatingChatSize.width}px`,
                              height: floatingChatSize.height !== null ? `${floatingChatSize.height}px` : 'auto',
                              maxHeight: 'calc(100% - 100px)',
                              display: 'flex',
                              flexDirection: 'column',
                              background: 'rgba(11, 12, 16, 0.85)',
                              backdropFilter: 'blur(12px)',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              borderRadius: '12px',
                              zIndex: 10,
                              color: '#fff',
                              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
                              overflow: 'hidden'
                            }}
                            onClick={(e) => e.stopPropagation()}
                            onMouseEnter={() => setIsHoveringFloatingChat(true)}
                            onMouseLeave={() => setIsHoveringFloatingChat(false)}
                          >
                            {/* Floating Chat Header (Drag Handle) */}
                            <div 
                              onPointerDown={handlePointerDown}
                              onPointerMove={handlePointerMove}
                              onPointerUp={handlePointerUp}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '12px 16px',
                                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                                background: 'rgba(255, 255, 255, 0.02)',
                                cursor: isDraggingFloatingChat ? 'grabbing' : 'grab',
                                userSelect: 'none',
                                touchAction: 'none'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <MessageSquare size={16} style={{ color: 'var(--primary)' }} />
                                <span style={{ 
                                  fontWeight: '600', 
                                  fontSize: '13px', 
                                  overflow: 'hidden', 
                                  textOverflow: 'ellipsis', 
                                  whiteSpace: 'nowrap', 
                                  maxWidth: '180px' 
                                }}>
                                  {getChatDetails(activeChat)?.name || 'Chat'}
                                </span>
                              </div>
                              <button 
                                type="button" 
                                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                                onClick={() => setShowFloatingChat(false)}
                              >
                                <X size={16} />
                              </button>
                            </div>

                            {/* Floating Chat Messages Feed */}
                            <div 
                              ref={floatingChatFeedRef}
                              style={{
                                flexGrow: 1,
                                overflowY: 'auto',
                                padding: '12px 16px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '10px'
                              }}
                            >
                              {messages.map((msg, index) => {
                                const isOwn = msg.sender && msg.sender._id === user?.id;
                                return (
                                  <div key={msg._id || index} style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: isOwn ? 'flex-end' : 'flex-start',
                                    maxWidth: '90%',
                                    alignSelf: isOwn ? 'flex-end' : 'flex-start'
                                  }}>
                                    {!isOwn && (
                                      <span style={{ fontSize: '10px', color: 'var(--primary)', marginBottom: '2px', fontWeight: '500' }}>
                                        {msg.sender?.username || 'User'}
                                      </span>
                                    )}
                                    <div style={{
                                      background: isOwn ? '#3b82f6' : 'rgba(255, 255, 255, 0.08)',
                                      padding: '8px 12px',
                                      borderRadius: '8px',
                                      borderTopRightRadius: isOwn ? '2px' : '8px',
                                      borderTopLeftRadius: !isOwn ? '2px' : '8px',
                                      fontSize: '12px',
                                      lineHeight: '1.4',
                                      wordBreak: 'break-word',
                                      color: '#fff'
                                    }}>
                                      {msg.content || (msg.fileUrl ? '📎 Media shared' : '')}
                                    </div>
                                    <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Floating Chat Input form */}
                            <form 
                              onSubmit={handleSendFloatingChatMessage}
                              style={{
                                padding: '10px 16px',
                                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                                display: 'flex',
                                gap: '8px',
                                background: 'rgba(0, 0, 0, 0.2)'
                              }}
                            >
                              <input 
                                type="text"
                                placeholder="Send message..."
                                value={floatingChatInput}
                                onChange={(e) => setFloatingChatInput(e.target.value)}
                                style={{
                                  flexGrow: 1,
                                  background: 'rgba(255, 255, 255, 0.05)',
                                  border: '1px solid rgba(255, 255, 255, 0.1)',
                                  borderRadius: '6px',
                                  padding: '6px 10px',
                                  color: '#fff',
                                  fontSize: '12px',
                                  outline: 'none'
                                }}
                              />
                              <button 
                                type="submit"
                                style={{
                                  background: 'var(--primary)',
                                  border: 'none',
                                  borderRadius: '6px',
                                  width: '28px',
                                  height: '28px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: '#fff',
                                  cursor: 'pointer',
                                  opacity: floatingChatInput.trim() ? 1 : 0.6
                                }}
                                disabled={!floatingChatInput.trim()}
                              >
                                <Send size={14} />
                              </button>
                            </form>

                            {/* Resize Handle (Bottom-Left) */}
                            <div 
                              onPointerDown={(e) => handleResizePointerDown(e, 'bottom-left')}
                              onPointerMove={handleResizePointerMove}
                              onPointerUp={handleResizePointerUp}
                              style={{
                                position: 'absolute',
                                left: '4px',
                                bottom: '4px',
                                width: '12px',
                                height: '12px',
                                cursor: 'nesw-resize',
                                zIndex: 11,
                                display: 'flex',
                                alignItems: 'flex-end',
                                justifyContent: 'flex-start',
                                opacity: 0.5
                              }}
                            >
                              <svg width="8" height="8" viewBox="0 0 8 8" style={{ pointerEvents: 'none' }}>
                                <line x1="0" y1="8" x2="8" y2="0" stroke="rgba(255,255,255,0.6)" strokeWidth="1" />
                                <line x1="3" y1="8" x2="8" y2="3" stroke="rgba(255,255,255,0.6)" strokeWidth="1" />
                              </svg>
                            </div>

                            {/* Resize Handle (Bottom-Right) */}
                            <div 
                              onPointerDown={(e) => handleResizePointerDown(e, 'bottom-right')}
                              onPointerMove={handleResizePointerMove}
                              onPointerUp={handleResizePointerUp}
                              style={{
                                position: 'absolute',
                                right: '4px',
                                bottom: '4px',
                                width: '12px',
                                height: '12px',
                                cursor: 'nwse-resize',
                                zIndex: 11,
                                display: 'flex',
                                alignItems: 'flex-end',
                                justifyContent: 'flex-end',
                                opacity: 0.5
                              }}
                            >
                              <svg width="8" height="8" viewBox="0 0 8 8" style={{ pointerEvents: 'none' }}>
                                <line x1="8" y1="8" x2="0" y2="0" stroke="rgba(255,255,255,0.6)" strokeWidth="1" />
                                <line x1="8" y1="5" x2="5" y2="8" stroke="rgba(255,255,255,0.6)" strokeWidth="1" />
                              </svg>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {!syncPlayVideoId && syncPlayDownloadStatus === 'idle' && (
                      <div className="download-status-overlay" style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(11, 12, 16, 0.95)',
                        color: '#fff',
                        padding: '20px',
                        textAlign: 'center',
                        zIndex: 10
                      }}>
                        <Tv size={48} style={{ color: 'var(--primary)', marginBottom: '15px', opacity: 0.8 }} />
                        <h4 style={{ margin: '0 0 8px 0', color: '#fff', fontSize: '16px', fontWeight: '600' }}>No Video Loaded</h4>
                        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', margin: '0 0 16px 0', maxWidth: '85%' }}>
                          Paste a YouTube or video URL below to start playing in sync with your group!
                        </p>
                      </div>
                    )}

                    {syncPlayDownloadStatus === 'downloading' && (
                      <div className="download-status-overlay" style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(0,0,0,0.85)',
                        color: '#fff',
                        padding: '20px',
                        textAlign: 'center',
                        zIndex: 10
                      }}>
                        <h4 style={{ margin: '0 0 8px 0', color: 'var(--primary)' }}>Downloading Video to Server...</h4>
                        <div style={{ width: '80%', maxWidth: '300px', height: '8px', background: 'rgba(255,255,255,0.2)', borderRadius: '4px', overflow: 'hidden', marginBottom: '8px' }}>
                          <div style={{ width: `${syncPlayDownloadProgress}%`, height: '100%', background: 'var(--primary)', transition: 'width 0.3s ease' }}></div>
                        </div>
                        <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{Math.round(syncPlayDownloadProgress)}% completed</span>
                        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', margin: '8px 0 0 0' }}>The video will automatically start playing once the download completes.</p>
                      </div>
                    )}

                    {syncPlayDownloadStatus === 'failed' && (
                      <div className="download-status-overlay" style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(0,0,0,0.85)',
                        color: '#fff',
                        padding: '20px',
                        textAlign: 'center',
                        zIndex: 10
                      }}>
                        <h4 style={{ margin: '0 0 8px 0', color: '#ff4d4f' }}>Download Failed</h4>
                        <p style={{ fontSize: '13px', maxWidth: '300px', color: 'rgba(255,255,255,0.8)', margin: '0 0 16px 0' }}>
                          {syncPlayDownloadError || 'An unknown error occurred during download.'}
                        </p>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleChangeVideo(syncPlayVideoId)}
                        >
                          Retry Download 🔄
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="sync-play-controls border-t">
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                      <input 
                        type="text"
                        placeholder="Paste YouTube video link..."
                        className="sync-play-url-input flex-grow"
                        style={{ flexGrow: 1 }}
                        value={syncPlayInputUrl}
                        onChange={(e) => setSyncPlayInputUrl(e.target.value)}
                      />
                      <button 
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => handleChangeVideo(syncPlayInputUrl)}
                      >
                        Load
                      </button>
                    </div>

                    <div className="sync-play-buttons" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      <button 
                        type="button"
                        className="btn btn-secondary btn-sm flex items-center gap-1"
                        style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                        onClick={handlePlayerPlayPause}
                      >
                        {syncPlayIsPlaying ? <Pause size={14} /> : <Play size={14} />}
                        <span>{syncPlayIsPlaying ? 'Pause' : 'Play'}</span>
                      </button>

                      <button 
                        type="button"
                        className="btn btn-primary btn-sm flex items-center justify-center"
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          background: 'linear-gradient(135deg, var(--secondary), var(--secondary-hover))', 
                          borderColor: 'var(--secondary)',
                          boxShadow: '0 4px 12px rgba(6, 182, 212, 0.2)'
                        }}
                        onClick={handleSyncPlayScreenshot}
                        title="Share Frame"
                        disabled={uploading || isSharingFrame}
                      >
                        {isSharingFrame ? (
                          <Loader2 className="animate-spin" size={14} />
                        ) : (
                          <ScreenShare size={14} />
                        )}
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
                        className="btn btn-secondary btn-sm flex items-center"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onClick={handleForceSync}
                        title="Force Sync Timeline"
                      >
                        <RefreshCw size={14} />
                      </button>
                    </div>
                  </div>
                  </>
                )}
                </div>
              </div>
            </>
          )}

            {isInfoPanelOpen && (
              <>
                <div 
                  className="resize-handle" 
                  onMouseDown={handleInfoPanelResizeMouseDown}
                />
                <div className="chat-right-side info-panel border-l animate-fade-in" style={{ width: `${infoPanelWidth}px`, minWidth: `${infoPanelWidth}px` }}>
                <div className="info-panel-header border-b" style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 'var(--header-height)', flexShrink: 0 }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '600', margin: 0 }}>Chat Details</h3>
                  <button className="icon-btn" onClick={() => setIsInfoPanelOpen(false)} title="Close Panel">
                    <X size={20} />
                  </button>
                </div>
                
                <div className="info-panel-content scroll-container" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '24px', overflowY: 'auto', flexGrow: 1, height: 'calc(100% - var(--header-height))' }}>
                  
                  {/* Large Chat Avatar & Name */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', textAlign: 'center', paddingBottom: '16px', borderBottom: '1px solid var(--glass-border)' }}>
                    <div className="avatar" style={{ width: '80px', height: '80px', fontSize: '2rem', borderRadius: '50%' }}>
                      {activeChat.isGroup ? (
                        activeChat.groupPic ? (
                          <img src={activeChat.groupPic} alt={activeChat.name} style={{ borderRadius: '50%' }} />
                        ) : (
                          <Users size={32} />
                        )
                      ) : (
                        getChatDetails(activeChat).avatar.length > 2 ? (
                          <img src={getChatDetails(activeChat).avatar} alt={getChatDetails(activeChat).name} style={{ borderRadius: '50%' }} />
                        ) : (
                          getChatDetails(activeChat).avatar
                        )
                      )}
                    </div>
                    <div>
                      <h4 style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                        {getChatDetails(activeChat).name}
                      </h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px', margin: 0 }}>
                        {activeChat.isGroup 
                          ? `${getChatDetails(activeChat).membersCount} members` 
                          : getChatDetails(activeChat).status === 'online' ? 'Online' : 'Offline'
                        }
                      </p>
                    </div>
                  </div>

                  {/* Group Settings / Edit section (only for group admins) */}
                  {activeChat.isGroup && (activeChat.creator?._id === user?.id || activeChat.creator === user?.id || activeChat.adminMembers?.includes(user?.id) || user?.isAdmin) && (
                    <div className="info-section">
                      <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--secondary)', letterSpacing: '0.05em', marginBottom: '12px', fontWeight: '700' }}>Group Customization</h4>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {/* Inline rename input */}
                        <div className="form-group">
                          <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Group Name</label>
                          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                            <input 
                              type="text" 
                              className="input-field input-sm" 
                              value={groupSettingsName}
                              onChange={(e) => setGroupSettingsName(e.target.value)}
                              placeholder="Group Name"
                              style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                            />
                            <button 
                              className="btn btn-primary btn-sm"
                              onClick={handleUpdateGroupSettings}
                              style={{ padding: '8px 12px', fontSize: '0.8rem' }}
                            >
                              Save
                            </button>
                          </div>
                        </div>
                        
                        {/* Inline photo changer */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                          <input 
                            type="file" 
                            ref={groupPicFileInputRef} 
                            style={{ display: 'none' }} 
                            onChange={handleGroupPicUpload} 
                            accept="image/*"
                          />
                          <button 
                            type="button" 
                            className="btn btn-secondary btn-sm" 
                            onClick={() => groupPicFileInputRef.current?.click()}
                            disabled={uploadingGroupPic}
                            style={{ fontSize: '0.8rem', width: '100%' }}
                          >
                            {uploadingGroupPic ? 'Uploading...' : 'Change Group Photo'}
                          </button>
                        </div>
                        {groupSettingsError && <p style={{ fontSize: '0.75rem', color: 'var(--accent-rose)', margin: 0 }}>{groupSettingsError}</p>}
                        {groupSettingsSuccess && <p style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)', margin: 0 }}>{groupSettingsSuccess}</p>}
                      </div>
                    </div>
                  )}

                  {/* Group Members List / Add member section */}
                  {activeChat.isGroup && (
                    <div className="info-section">
                      <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.05em', marginBottom: '12px', fontWeight: '700' }}>
                        Group Members ({activeChat.members?.length})
                      </h4>
                      
                      {/* Inline Add Member (only for group admins) */}
                      {(activeChat.creator?._id === user?.id || activeChat.creator === user?.id || activeChat.adminMembers?.includes(user?.id) || user?.isAdmin) && (
                        <div style={{ marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--glass-border)' }}>
                          <input 
                            type="text" 
                            placeholder="Search username to add..." 
                            className="input-field input-sm"
                            value={addMemberSearchQuery}
                            onChange={handleAddMemberSearch}
                            style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                          />
                          
                          {addMemberSearchQuery.trim() && (
                            <div className="group-members-selectors scroll-container" style={{ maxHeight: '120px', marginTop: '8px', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)' }}>
                              {addMemberSearchResults.length === 0 ? (
                                <p className="no-chats-msg" style={{ padding: '8px', fontSize: '0.8rem' }}>No matching users.</p>
                              ) : (
                                addMemberSearchResults.map(sUser => (
                                  <div 
                                    key={sUser._id} 
                                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: 'rgba(255,255,255,0.01)' }}
                                  >
                                    <span style={{ fontSize: '0.8rem', fontWeight: '600' }}>{sUser.username}</span>
                                    <button 
                                      className="btn btn-primary btn-sm" 
                                      onClick={() => handleAddMemberToGroup(sUser._id)}
                                      style={{ padding: '2px 8px', fontSize: '0.7rem' }}
                                    >
                                      Add
                                    </button>
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Member List */}
                      <div className="scroll-container" style={{ maxHeight: '220px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {activeChat.members?.map(m => {
                          const isCreator = activeChat.creator === m._id || activeChat.creator?._id === m._id;
                          const isAdminMem = activeChat.adminMembers?.includes(m._id);
                          const isCurrentUserAdmin = activeChat.creator?._id === user?.id || activeChat.creator === user?.id || activeChat.adminMembers?.includes(user?.id) || user?.isAdmin;
                          const canRemove = isCurrentUserAdmin && !isCreator && m._id !== user?.id;
                          
                          return (
                            <div 
                              key={m._id} 
                              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: 'rgba(255,255,255,0.01)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)' }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div className="avatar" style={{ width: '24px', height: '24px', fontSize: '0.65rem' }}>
                                  {m.profilePic ? <img src={m.profilePic} alt={m.username} /> : m.username.substring(0, 2).toUpperCase()}
                                </div>
                                <span style={{ fontSize: '0.8rem', fontWeight: '600', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={m.username}>{m.username}</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                {isCreator && <span className="role-badge admin" style={{ fontSize: '0.55rem', padding: '2px 4px' }}>Creator</span>}
                                {!isCreator && isAdminMem && (
                                  <span className={`role-badge admin ${m.role === 'Admin' ? 'subadmin' : ''}`} style={{ fontSize: '0.55rem', padding: '2px 4px' }}>
                                    {m.role || 'Root'}
                                  </span>
                                )}
                                {m._id === user?.id && <span className="role-badge user" style={{ fontSize: '0.55rem', padding: '2px 4px' }}>You</span>}
                                {canRemove && (
                                  <button
                                    className="icon-btn"
                                    onClick={() => handleRemoveMemberFromGroup(m._id)}
                                    title="Remove Member"
                                    style={{ 
                                      color: 'var(--accent-rose)', 
                                      padding: '2px', 
                                      marginLeft: '4px',
                                      borderRadius: 'var(--radius-sm)',
                                      background: 'rgba(244, 63, 94, 0.1)',
                                      border: '1px solid rgba(244, 63, 94, 0.2)',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    <UserMinus size={10} />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Chat Settings (Mute/Unmute Notifications) */}
                  <div className="info-section" style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '16px', marginTop: '12px' }}>
                    <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--secondary)', letterSpacing: '0.05em', marginBottom: '12px', fontWeight: '700' }}>Chat Settings</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <button 
                        className="btn btn-secondary btn-sm" 
                        onClick={() => handleToggleMuteChat(activeChat._id)}
                        style={{ justifyContent: 'flex-start', gap: '8px', fontSize: '0.85rem', color: 'var(--text-primary)' }}
                      >
                        {isChatMuted(activeChat) ? <Bell size={16} style={{ color: 'var(--primary)' }} /> : <BellOff size={16} style={{ color: 'var(--text-muted)' }} />}
                        <span>{isChatMuted(activeChat) ? 'Unmute Notifications' : 'Mute Notifications'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Danger Actions Area */}
                  <div className="info-section" style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--glass-border)' }}>
                    <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--accent-rose)', letterSpacing: '0.05em', marginBottom: '12px', fontWeight: '700' }}>Danger Zone</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <button 
                        className="btn btn-secondary btn-sm" 
                        onClick={() => handleClearChatHistory(activeChat._id)}
                        style={{ justifyContent: 'flex-start', color: 'var(--accent-rose)', gap: '8px', fontSize: '0.85rem' }}
                      >
                        <Trash2 size={16} />
                        <span>Clear Chat History</span>
                      </button>
                      
                      {activeChat.isGroup ? (
                        <button 
                          className="btn btn-secondary btn-sm" 
                          onClick={() => handleLeaveGroup(activeChat._id)}
                          style={{ justifyContent: 'flex-start', color: 'var(--accent-rose)', gap: '8px', fontSize: '0.85rem' }}
                        >
                          <LogOut size={16} />
                          <span>Leave Group</span>
                        </button>
                      ) : null}

                      <button 
                        className="btn btn-secondary btn-sm" 
                        onClick={() => handleDeleteChat(activeChat._id)}
                        style={{ justifyContent: 'flex-start', color: 'var(--accent-rose)', gap: '8px', fontSize: '0.85rem' }}
                      >
                        <Trash2 size={16} />
                        <span>Delete Chat Box</span>
                      </button>

                      {!activeChat.isGroup && (() => {
                        const otherMember = activeChat.members.find(m => m._id !== user?.id);
                        if (!otherMember || otherMember.role === 'Root') return null;
                        const isBlocked = (user?.blockedUsers || []).includes(otherMember._id);
                        return (
                          <button 
                            className="btn btn-secondary btn-sm" 
                            onClick={() => isBlocked ? handleUnblockUser(otherMember._id) : handleBlockUser(otherMember._id)}
                            style={{ justifyContent: 'flex-start', color: 'var(--accent-rose)', gap: '8px', fontSize: '0.85rem' }}
                          >
                            {isBlocked ? <Unlock size={16} /> : <Ban size={16} />}
                            <span>{isBlocked ? 'Unblock User' : 'Block User'}</span>
                          </button>
                        );
                      })()}
                    </div>
                  </div>
                  
                </div>
              </div>
            </>
          )}
          </div>
        </div>
      ) : (
            <div className="empty-chat-pane">
              <div className="splash-graphic animate-fade-in">
                <div className="logo-glow-wrapper">
                  <div className="app-logo-large">
                    <Sparkles size={48} className="logo-spark" />
                    <span>আলাপ</span>
                  </div>
                </div>
                <h1 className="splash-title glow-text-primary">Welcome to Alaap</h1>
                <p className="splash-subtitle">A modern, secure, and beautiful lossless chat interface. Search a user or create a group to start conversation.</p>
                <div className="features-grid">
                  <div className="feature-card glass-panel">
                    <Tv size={24} className="feature-icon primary" />
                    <h4>Sync Play</h4>
                    <p>Watch YouTube videos synchronously with group members in real-time.</p>
                  </div>
                  <div className="feature-card glass-panel">
                    <Users size={24} className="feature-icon secondary" />
                    <h4>Group Spaces</h4>
                    <p>Seamlessly coordinate with teams or friends in shared channels.</p>
                  </div>
                  <div className="feature-card glass-panel">
                    <Shield size={24} className="feature-icon emerald" />
                    <h4>Root Controls</h4>
                    <p>Complete control over system sign-up facilities and account states.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Group Modal */}
      {isGroupModalOpen && (
        <div className="modal-overlay">
          <div className="modal-container glass-panel animate-fade-in">
            <div className="modal-header border-b">
              <h3>Create Group Chat</h3>
              <button className="icon-btn" onClick={() => setIsGroupModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Group Name</label>
                <input 
                  type="text" 
                  placeholder="Enter a vibrant name..." 
                  className="input-field"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                />
              </div>

              {/* Selected members tags/chips */}
              {selectedGroupMembers.length > 0 && (
                <div className="form-group" style={{ marginBottom: '10px' }}>
                  <label>Selected Members ({selectedGroupMembers.length})</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                    {selectedGroupMembers.map(memberId => {
                      let uName = 'User';
                      const foundInChats = chats.find(c => !c.isGroup && c.members.some(m => m._id === memberId));
                      if (foundInChats) {
                        const mDetails = foundInChats.members.find(m => m._id === memberId);
                        if (mDetails) uName = mDetails.username;
                      } else {
                        const foundInSearch = groupMemberSearchResults.find(u => u._id === memberId);
                        if (foundInSearch) uName = foundInSearch.username;
                      }
                      
                      return (
                        <div 
                          key={memberId} 
                          className="code-badge-item animate-fade-in" 
                          style={{ padding: '3px 8px', fontSize: '0.8rem', gap: '4px', cursor: 'pointer', background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)' }}
                          onClick={() => setSelectedGroupMembers(prev => prev.filter(id => id !== memberId))}
                        >
                          <span>{uName}</span>
                          <X size={12} style={{ opacity: 0.6 }} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label>Search and Select Members</label>
                <input 
                  type="text" 
                  placeholder="Type username to search..." 
                  className="input-field input-sm"
                  value={groupMemberSearchQuery}
                  onChange={handleGroupMemberSearch}
                  style={{ marginTop: '4px' }}
                />
              </div>

              <div className="form-group">
                <div className="group-members-selectors" style={{ maxHeight: '160px' }}>
                  {/* If searching, show search results. Otherwise show direct message contacts. */}
                  {groupMemberSearchQuery.trim() ? (
                    groupMemberSearchResults.length === 0 ? (
                      <p className="no-chats-msg">No users found matching "{groupMemberSearchQuery}".</p>
                    ) : (
                      groupMemberSearchResults.map(sUser => {
                        const isSelected = selectedGroupMembers.includes(sUser._id);
                        return (
                          <div 
                            key={sUser._id} 
                            className={`member-selector-item hover-item ${isSelected ? 'selected' : ''}`}
                            onClick={() => {
                              setSelectedGroupMembers(prev => 
                                isSelected ? prev.filter(id => id !== sUser._id) : [...prev, sUser._id]
                              );
                            }}
                          >
                            <div className="avatar">
                              {sUser.profilePic ? <img src={sUser.profilePic} alt={sUser.username} /> : sUser.username.substring(0, 2).toUpperCase()}
                            </div>
                            <span className="username">{sUser.username}</span>
                            <div className="checkbox-glow">
                              {isSelected && <Check size={14} />}
                            </div>
                          </div>
                        );
                      })
                    )
                  ) : (
                    chats.filter(c => !c.isGroup).map(c => {
                      const oUser = c.members.find(m => m._id !== user?.id);
                      if (!oUser) return null;
                      const isSelected = selectedGroupMembers.includes(oUser._id);
                      
                      return (
                        <div 
                          key={oUser._id} 
                          className={`member-selector-item hover-item ${isSelected ? 'selected' : ''}`}
                          onClick={() => {
                            setSelectedGroupMembers(prev => 
                              isSelected ? prev.filter(id => id !== oUser._id) : [...prev, oUser._id]
                            );
                          }}
                        >
                          <div className="avatar">
                            {oUser.profilePic ? <img src={oUser.profilePic} alt={oUser.username} /> : oUser.username.substring(0, 2).toUpperCase()}
                          </div>
                          <span className="username">{oUser.username}</span>
                          <div className="checkbox-glow">
                            {isSelected && <Check size={14} />}
                          </div>
                        </div>
                      );
                    })
                  )}
                  {!groupMemberSearchQuery.trim() && chats.filter(c => !c.isGroup).length === 0 && (
                    <p className="no-chats-msg">Search above to find and add users to this group.</p>
                  )}
                </div>
              </div>
            </div>
            <div className="modal-footer border-t">
              <button className="btn btn-secondary" onClick={() => setIsGroupModalOpen(false)}>Cancel</button>
              <button 
                className="btn btn-primary" 
                onClick={createGroupChat} 
                disabled={!newGroupName.trim() || selectedGroupMembers.length === 0}
              >
                Create Group
              </button>
            </div>
          </div>
        </div>
      )}



      {/* YouTube link action dropdown options */}
      {ytDropdown.isOpen && (() => {
        const isBlockedOrBlocker = (() => {
          if (activeChat && !activeChat.isGroup) {
            const otherMember = activeChat.members.find(m => m._id !== user?.id);
            if (otherMember) {
              const amBlocked = otherMember.blockedUsers?.includes(user?.id);
              const iBlocked = (user?.blockedUsers || []).includes(otherMember._id);
              return !!(amBlocked || iBlocked);
            }
          }
          return false;
        })();

        return (
          <>
            <div 
              onClick={() => setYtDropdown(prev => ({ ...prev, isOpen: false }))}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 14000,
                background: 'transparent'
              }}
            />
            <div 
              className="glass-panel animate-fade-in"
              style={{
                position: 'fixed',
                top: `${ytDropdown.y}px`,
                left: `${ytDropdown.x}px`,
                zIndex: 14001,
                minWidth: '180px',
                padding: '6px 0',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-lg)',
                background: 'rgba(15, 17, 28, 0.95)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid var(--glass-border)'
              }}
            >
              {!isBlockedOrBlocker && (
                <button 
                  className="dropdown-item"
                  onClick={() => {
                    const videoId = extractYouTubeId(ytDropdown.url);
                    setYtDropdown(prev => ({ ...prev, isOpen: false }));
                    changeSyncPlayActive(true);
                    setIsInfoPanelOpen(false); // Close details panel
                    
                    // Emit change video event to socket
                    socketRef.current?.emit('sync_play_toggle', {
                      chatId: activeChat._id,
                      active: true,
                      videoId: videoId
                    });
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '10px 16px',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-primary)',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '0.85rem'
                  }}
                >
                  <Tv size={14} style={{ color: 'var(--primary)' }} />
                  <span>Open with SyncPlay</span>
                </button>
              )}
              <button 
                className="dropdown-item"
                onClick={() => {
                  setYtDropdown(prev => ({ ...prev, isOpen: false }));
                  window.open(ytDropdown.url, '_blank', 'noopener,noreferrer');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '10px 16px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-primary)',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '0.85rem'
                }}
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="#FF0000" style={{ flexShrink: 0 }}>
                  <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.108C19.518 3.5 12 3.5 12 3.5s-7.518 0-9.388.555A3.003 3.003 0 0 0 .502 6.163C0 8.07 0 12 0 12s0 3.93.502 5.837a3.003 3.003 0 0 0 2.11 2.108C4.482 20.5 12 20.5 12 20.5s7.518 0 9.388-.555a3.003 3.003 0 0 0 2.11-2.108C24 15.93 24 12 24 12s0-3.93-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
                <span>Open with YouTube</span>
              </button>
            </div>
          </>
        );
      })()}

      {/* Lightbox / Full Resolution Image Viewer Modal */}
      {previewImageUrl && (
        <div 
          className="modal-overlay lightbox-overlay animate-fade-in" 
          onMouseDown={handleOverlayMouseDown}
          onMouseUp={handleOverlayMouseUp}
          style={{ 
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.95)',
            backdropFilter: 'blur(15px)',
            WebkitBackdropFilter: 'blur(15px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 15000, 
            padding: '40px'
          }}
        >
          {/* Annotate Button */}
          <button 
            className="icon-btn lightbox-annotate-btn" 
            onClick={(e) => {
              e.stopPropagation();
              setIsAnnotating(!isAnnotating);
            }}
            title={isAnnotating ? 'Switch to Viewing Mode' : 'Annotate Photo'}
            style={{
              position: 'absolute',
              top: '20px',
              right: '70px',
              color: isAnnotating ? 'var(--accent-primary, #00ffcc)' : '#fff',
              background: isAnnotating ? 'rgba(0, 255, 210, 0.1)' : 'rgba(255, 255, 255, 0.1)',
              border: isAnnotating ? '1px solid var(--accent-primary, #00ffcc)' : '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '50%',
              padding: '10px',
              cursor: 'pointer',
              zIndex: 15001,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all var(--transition-fast)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = isAnnotating ? 'rgba(0, 255, 210, 0.15)' : 'rgba(255, 255, 255, 0.2)';
              e.currentTarget.style.transform = 'scale(1.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = isAnnotating ? 'rgba(0, 255, 210, 0.1)' : 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            {isAnnotating ? <Eye size={20} /> : <Edit size={20} />}
          </button>

          <button 
            className="icon-btn lightbox-close-btn" 
            onClick={closeLightbox}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              color: '#fff',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '50%',
              padding: '10px',
              cursor: 'pointer',
              zIndex: 15001,
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
          
          <div 
            className="lightbox-content-container" 
            onClick={(e) => e.stopPropagation()} 
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: '100%',
              position: 'relative'
            }}
          >
            <div style={{ position: 'relative', display: 'inline-block', maxWidth: '100%', maxHeight: '100%' }}>
              <img 
                ref={imgRef}
                src={previewImageUrl} 
                alt="Full Resolution Preview" 
                className="lightbox-image"
                crossOrigin="anonymous"
                onLoad={handleImageLoad}
                style={{
                  maxWidth: '90vw',
                  maxHeight: '75vh',
                  display: 'block',
                  width: 'auto',
                  height: 'auto',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  userSelect: 'none'
                }}
              />
              <canvas 
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  cursor: getCanvasCursor(),
                  touchAction: 'none',
                  display: isAnnotating ? 'block' : 'none',
                  zIndex: 15002
                }}
              />
            </div>
          </div>

          {/* Floating Draggable Annotation Toolbar */}
          {isAnnotating && (
            <div 
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'fixed',
                left: `${toolbarPos.x}px`,
                top: `${toolbarPos.y}px`,
                background: 'rgba(15, 17, 28, 0.85)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '16px',
                padding: '16px',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                zIndex: 15005,
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                width: '210px',
                userSelect: 'none',
                transition: 'box-shadow 0.3s ease, border-color 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 20px 50px rgba(0, 255, 210, 0.15), 0 20px 40px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.15)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
              }}
            >
              {/* Drag handle */}
              <div 
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
                style={{
                  cursor: 'move',
                  width: '100%',
                  height: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '3px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                  paddingBottom: '10px'
                }}
              >
                <div style={{ width: '36px', height: '3px', background: 'rgba(255, 255, 255, 0.3)', borderRadius: '2px' }} />
                <div style={{ width: '24px', height: '3px', background: 'rgba(255, 255, 255, 0.2)', borderRadius: '2px' }} />
                <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', fontWeight: 'bold', letterSpacing: '0.05em', textTransform: 'uppercase', marginTop: '2px' }}>Drag Handle</span>
              </div>

              {/* Tool selection */}
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                <button 
                  onClick={() => setTool('draw')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    background: tool === 'draw' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '10px',
                    color: tool === 'draw' ? 'var(--accent-primary, #00ffcc)' : '#fff',
                    fontWeight: tool === 'draw' ? '600' : '400',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    fontSize: '0.85rem',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Edit size={14} /> Draw
                </button>
                <button 
                  onClick={() => setTool('erase')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    background: tool === 'erase' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '10px',
                    color: tool === 'erase' ? 'var(--accent-primary, #00ffcc)' : '#fff',
                    fontWeight: tool === 'erase' ? '600' : '400',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    fontSize: '0.85rem',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Ban size={14} /> Erase
                </button>
              </div>

              {/* Color selection */}
              {tool === 'draw' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', paddingLeft: '2px' }}>Color</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'flex-start' }}>
                    {[
                      { hex: '#ff4d4d', name: 'Red' },
                      { hex: '#ffeb3b', name: 'Yellow' },
                      { hex: '#4caf50', name: 'Green' },
                      { hex: '#2196f3', name: 'Blue' },
                      { hex: '#ffffff', name: 'White' },
                      { hex: '#000000', name: 'Black' }
                    ].map(color => (
                      <button 
                        key={color.hex}
                        onClick={() => setBrushColor(color.hex)}
                        title={color.name}
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: color.hex,
                          border: brushColor === color.hex ? '2px solid #fff' : '1px solid rgba(255,255,255,0.2)',
                          cursor: 'pointer',
                          boxShadow: brushColor === color.hex ? '0 0 10px rgba(255, 255, 255, 0.6)' : 'none',
                          transform: brushColor === color.hex ? 'scale(1.15)' : 'scale(1)',
                          transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Brush size slider */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                  <span>Brush Size</span>
                  <span style={{ fontWeight: '600', color: 'var(--accent-primary, #00ffcc)' }}>{brushSize}px</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input 
                    type="range" 
                    min="2" 
                    max="50" 
                    value={brushSize} 
                    onChange={(e) => setBrushSize(parseInt(e.target.value))}
                    style={{ 
                      flex: 1, 
                      cursor: 'pointer',
                      accentColor: 'var(--accent-primary, #00ffcc)',
                      height: '4px',
                      borderRadius: '2px',
                      background: 'rgba(255,255,255,0.1)'
                    }}
                  />
                </div>
              </div>

              {/* Undo & Clear */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={undo}
                  disabled={history.length === 0}
                  style={{
                    flex: 1,
                    padding: '8px',
                    background: 'transparent',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '10px',
                    color: history.length === 0 ? 'rgba(255,255,255,0.25)' : '#fff',
                    cursor: history.length === 0 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    fontSize: '0.8rem',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <History size={13} /> Undo
                </button>
                <button 
                  onClick={clearCanvas}
                  style={{
                    flex: 1,
                    padding: '8px',
                    background: 'transparent',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '10px',
                    color: '#fff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    fontSize: '0.8rem',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 99, 99, 0.1)';
                    e.currentTarget.style.borderColor = 'rgba(255, 99, 99, 0.2)';
                    e.currentTarget.style.color = '#ff6b6b';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                    e.currentTarget.style.color = '#fff';
                  }}
                >
                  <Trash2 size={13} /> Clear
                </button>
              </div>

              {/* Update button */}
              <button 
                onClick={handleUpdateImage}
                disabled={isUpdating}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: 'var(--accent-primary, #00ffcc)',
                  color: '#090a10',
                  fontWeight: '700',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: isUpdating ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontSize: '0.875rem',
                  boxShadow: '0 0 15px rgba(0, 255, 210, 0.2)',
                  transition: 'all 0.2s ease'
                }}
              >
                {isUpdating ? (
                  <>
                    <Loader2 size={15} className="animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Check size={15} /> Update Photo
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Custom Video Player Pop-up Modal */}
      {popupVideo && (
        <VideoPlayerModal 
          video={popupVideo} 
          onClose={() => setPopupVideo(null)} 
        />
      )}

      {/* Custom Dialog Alert/Confirm/Prompt Modal */}
      {customDialog.isOpen && (
        <div className="custom-dialog-overlay animate-fade-in" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(10, 11, 18, 0.65)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '24px'
        }}>
          <div className="custom-dialog-card glass-panel" style={{
            width: '100%',
            maxWidth: '400px',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            background: 'var(--bg-secondary)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            <div className="custom-dialog-header" style={{
              padding: '20px 24px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {customDialog.title}
              </h3>
              <button 
                type="button" 
                className="icon-btn" 
                style={{ width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onClick={() => {
                  if (customDialog.type === 'alert') {
                    customDialog.onConfirm();
                  } else {
                    customDialog.onCancel();
                  }
                }}
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="custom-dialog-body" style={{
              padding: '24px',
              color: 'var(--text-secondary)',
              fontSize: '14px',
              lineHeight: 1.5
            }}>
              <p style={{ margin: 0, marginBottom: customDialog.type === 'prompt' ? '16px' : 0 }}>
                {customDialog.message}
              </p>
              
              {customDialog.type === 'prompt' && (
                <input 
                  type="text" 
                  className="sync-play-url-input"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                  value={customDialog.inputValue}
                  onChange={(e) => setCustomDialog(prev => ({ ...prev, inputValue: e.target.value }))}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      customDialog.onConfirm(customDialog.inputValue);
                    } else if (e.key === 'Escape') {
                      customDialog.onCancel();
                    }
                  }}
                />
              )}
            </div>
            
            <div className="custom-dialog-footer" style={{
              padding: '16px 24px',
              background: 'rgba(10, 11, 18, 0.2)',
              borderTop: '1px solid rgba(255, 255, 255, 0.05)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px'
            }}>
              {customDialog.type !== 'alert' && (
                <button 
                  type="button" 
                  className="btn btn-secondary btn-sm"
                  onClick={customDialog.onCancel}
                >
                  Cancel
                </button>
              )}
              <button 
                type="button" 
                className="btn btn-primary btn-sm"
                onClick={() => {
                  if (customDialog.type === 'prompt') {
                    customDialog.onConfirm(customDialog.inputValue);
                  } else {
                    customDialog.onConfirm();
                  }
                }}
              >
                {customDialog.type === 'confirm' ? 'Confirm' : 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Toast Notifications */}
      <div className="toast-container" style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        pointerEvents: 'none'
      }}>
        {toasts.map(toast => (
          <div 
            key={toast.id} 
            className="toast-notification glass-panel animate-slide-in" 
            style={{
              pointerEvents: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              background: 'rgba(15, 17, 26, 0.9)',
              border: '1px solid var(--glass-border)',
              borderRadius: 'var(--radius-md)',
              boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.4)',
              cursor: 'pointer',
              minWidth: '280px',
              maxWidth: '360px',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)'
            }}
            onClick={() => {
              toast.onClick?.();
              removeToast(toast.id);
            }}
          >
            {toast.avatar ? (
              <img 
                src={toast.avatar} 
                alt={toast.title} 
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  objectFit: 'cover'
                }} 
              />
            ) : (
              <div 
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'var(--primary)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '600',
                  fontSize: '0.85rem'
                }}
              >
                {toast.title.substring(0, 2).toUpperCase()}
              </div>
            )}
            <div style={{ flexGrow: 1, overflow: 'hidden' }}>
              <div style={{ fontWeight: '600', fontSize: '0.85rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {toast.title}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>
                {toast.message}
              </div>
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                removeToast(toast.id);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// Authentication Component Screen
// -------------------------------------------------------------
function AuthScreen({ setToken, setUser, systemSettings, fetchSystemSignupSettings, showAlert }) {
  const alert = (message) => {
    showAlert(message);
  };
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSystemSignupSettings();
  }, [isRegister]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setError('');
    setLoading(true);

    const url = isRegister ? `${API_BASE_URL}/auth/register` : `${API_BASE_URL}/auth/login`;
    const payload = isRegister 
      ? { username, password, inviteCode } 
      : { username, password };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      setLoading(false);

      if (response.ok) {
        localStorage.setItem('alaap_token', data.token);
        setToken(data.token);
        setUser(data.user);
      } else {
        setError(data.error || 'Something went wrong.');
      }
    } catch (err) {
      setLoading(false);
      setError('Failed to reach server. Is backend running?');
    }
  };

  return (
    <div className="auth-screen-wrapper">
      <div className="auth-card glass-panel animate-fade-in">
        <div className="auth-logo">
          <Sparkles className="auth-logo-icon" />
          <h1>আলাপ</h1>
          <p className="auth-brand-name">Alaap Messenger</p>
        </div>

        {error && (
          <div className="auth-error animate-fade-in">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>Username</label>
            <div className="input-with-icon">
              <User className="input-icon" size={18} />
              <input 
                type="text" 
                placeholder="Enter username..." 
                className="input-field" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Password</label>
            <div className="input-with-icon">
              <Lock className="input-icon" size={18} />
              <input 
                type="password" 
                placeholder="Enter password..." 
                className="input-field" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          {isRegister && systemSettings.inviteOnlyEnabled && (
            <div className="form-group animate-fade-in">
              <label className="invite-label">
                <Key size={14} />
                <span>Invite Code (Required)</span>
              </label>
              <input 
                type="text" 
                placeholder="AAAA-BBBB" 
                className="input-field invite-input" 
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                required
              />
              <p className="invite-help-text">Invite-only sign up is enabled. Ask Root for a code.</p>
            </div>
          )}

          {isRegister && !systemSettings.signupEnabled ? (
            <div className="signup-disabled-notice glass-panel">
              <Lock size={18} className="lock-icon" />
              <p>Registration has been temporarily disabled by Root.</p>
            </div>
          ) : (
            <button type="submit" className="btn btn-primary auth-submit-btn" disabled={loading}>
              {loading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : isRegister ? (
                'Create Account'
              ) : (
                'Sign In'
              )}
            </button>
          )}
        </form>

        <div className="auth-toggle">
          {isRegister ? (
            <p>Already have an account? <span onClick={() => { setIsRegister(false); setError(''); }}>Sign In</span></p>
          ) : (
            <p>Don't have an account? <span onClick={() => { setIsRegister(true); setError(''); }}>Sign Up</span></p>
          )}
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// Admin Dashboard Component Panel
// -------------------------------------------------------------
function AdminDashboard({ token, user, onClose, showConfirm, showAlert, onOpenChat, socket }) {
  const alert = (message) => {
    showAlert(message);
  };
  const [stats, setStats] = useState({ totalUsers: 0, totalChats: 0, totalMessages: 0 });
  const [settings, setSettings] = useState({ signupEnabled: true, inviteOnlyEnabled: false, inviteCodes: [] });
  const [users, setUsers] = useState([]);
  
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
        alert(data.error || 'Failed to delete group.');
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
        alert(err.error || 'Failed to delete message.');
      }
    } catch (err) {
      console.error(err);
      alert('Error deleting message.');
    }
  };

  const handleAdminDeleteConversation = async (chatId) => {
    const user1Name = users.find(u => u._id === user1Id)?.username;
    const user2Name = users.find(u => u._id === user2Id)?.username;
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
        alert(err.error || 'Failed to delete conversation.');
      }
    } catch (err) {
      console.error(err);
      alert('Error deleting conversation.');
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
  const [createUserRole, setCreateUserRole] = useState('Regular');
  const [userError, setUserError] = useState('');
  const [userSuccess, setUserSuccess] = useState('');

  const [loading, setLoading] = useState(true);

  // Edit User States
  const [editingUser, setEditingUser] = useState(null);
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editIsAdmin, setEditIsAdmin] = useState(false);
  const [editRole, setEditRole] = useState('Regular');
  const [editUserError, setEditUserError] = useState('');
  const [editUserSuccess, setEditUserSuccess] = useState('');

  const openEditUserModal = (u) => {
    if (u.username === 'rkdarpan' && user?.username !== 'rkdarpan') {
      alert("The primary system administrator account (rkdarpan) cannot be edited by other users.");
      return;
    }
    if (user?.role === 'Admin') {
      const isSelf = u._id === user?.id || u._id === user?._id;
      if (!isSelf) {
        if (u.role === 'Root') {
          alert("You do not have permission to edit root class user");
          return;
        }
        if (u.role === 'Admin' || u.isAdmin) {
          alert("You do not have permission to edit Admin class user");
          return;
        }
      }
    }
    setEditingUser(u);
    setEditUsername(u.username);
    setEditPassword('');
    setEditIsAdmin(u.isAdmin);
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

  async function fetchAdminData() {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/settings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
        setSettings(data.settings);
        setUsers(data.users);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
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
          role: createUserRole
        })
      });

      const data = await response.json();
      if (response.ok) {
        setUserSuccess(`User "${data.user.username}" created successfully!`);
        setNewUsername('');
        setNewPassword('');
        setCreateUserRole('Regular');
        // Refresh users list
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
      alert("You can't delete yourself");
      return;
    }

    if (username === 'rkdarpan') {
      alert("The primary system administrator account (rkdarpan) cannot be deleted.");
      return;
    }

    if (user?.role === 'Admin') {
      if (u.role === 'Root') {
        alert("You do not have permission to delete root class user");
        return;
      }
      if (u.role === 'Admin' || u.isAdmin) {
        alert("You do not have permission to delete Admin class user");
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
        // Refresh stats
        fetchAdminData();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete user.');
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
          </div>
        </div>
        <button className="icon-btn close-admin-btn" onClick={onClose} title="Back to Chats">
          <X size={24} />
        </button>
      </div>

      <div className="admin-tabs border-b" style={{ display: 'flex', gap: '8px', padding: '0 24px', background: 'rgba(0,0,0,0.1)', marginBottom: '24px' }}>
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
                onClick={() => handleToggleSetting('signupEnabled', settings.signupEnabled)}
                className={`toggle-btn ${settings.signupEnabled ? 'active' : ''}`}
              >
                {settings.signupEnabled ? <ToggleRight size={38} className="toggle-on" /> : <ToggleLeft size={38} className="toggle-off" />}
              </button>
            </div>

            <div className="toggle-setting-row border-t pt-4 mt-4">
              <div className="setting-details">
                <h4>Invite-Only Sign Up</h4>
                <p>Require an active code during registration (only matters if Sign Up is ON).</p>
              </div>
              <button 
                onClick={() => handleToggleSetting('inviteOnlyEnabled', settings.inviteOnlyEnabled)}
                className={`toggle-btn ${settings.inviteOnlyEnabled ? 'active' : ''}`}
                disabled={!settings.signupEnabled}
              >
                {settings.inviteOnlyEnabled ? <ToggleRight size={38} className="toggle-on" /> : <ToggleLeft size={38} className="toggle-off" />}
              </button>
            </div>

            {/* Invite Codes Generation */}
            {settings.inviteOnlyEnabled && settings.signupEnabled && (
              <div className="invite-codes-manager border-t pt-4 mt-4 animate-fade-in">
                <div className="invite-manager-header">
                  <h4>Invite Codes</h4>
                  <button className="btn btn-secondary btn-sm" onClick={handleGenerateInviteCode}>
                    Generate Code
                  </button>
                </div>
                
                <div className="codes-list scroll-container">
                  {settings.inviteCodes.length === 0 ? (
                    <span className="no-codes-msg">No active invite codes. Generate one above.</span>
                  ) : (
                    settings.inviteCodes.map(code => (
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

          {/* Quick Create User Form */}
          <div className="admin-card glass-panel create-user-card">
            <h3>Provision User Account</h3>
            {userError && <div className="admin-alert error">{userError}</div>}
            {userSuccess && <div className="admin-alert success">{userSuccess}</div>}
            
            <form onSubmit={handleCreateUser} className="admin-create-form">
              <div className="form-group-row">
                <input 
                  type="text" 
                  placeholder="Username..." 
                  className="input-field input-sm"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                />
                <input 
                  type="password" 
                  placeholder="Password..." 
                  className="input-field input-sm"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              
              <div className="admin-checkbox-row">
                {user?.role !== 'Admin' && (
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
                )}
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
                    <th>Unique ID</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Registered</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u._id}>
                      <td className="user-td font-semibold">
                        {u.username}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {u._id}
                      </td>
                      <td>
                        <span className={`role-badge ${u.role === 'Admin' ? 'admin subadmin' : u.isAdmin ? 'admin' : 'user'}`}>
                          {u.role || (u.isAdmin ? 'Root' : 'Regular')}
                        </span>
                      </td>
                      <td>
                        <span className={`status-text ${u.status}`}>
                          {u.status === 'online' ? '● Online' : '○ Offline'}
                        </span>
                      </td>
                      <td className="time-td text-sm text-muted">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ display: 'flex', gap: '8px' }}>
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
                    {groups.map(g => (
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
                          {new Date(g.createdAt).toLocaleDateString()}
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
                  Conversation: {users.find(u => u._id === user1Id)?.username} ↔ {users.find(u => u._id === user2Id)?.username}
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
                {conversationHistory.length === 0 ? (
                  <p style={{ textAlign: 'center', color: 'var(--text-muted)', margin: '20px 0' }}>
                    No messages exchanged between these two users yet.
                  </p>
                ) : (
                  conversationHistory.map(msg => {
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
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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

// -------------------------------------------------------------
// Settings Center Component Panel (alaap center style)
// -------------------------------------------------------------
function SettingsCenter({ 
  token, 
  user, 
  setUser, 
  onClose, 
  logout,
  deferredPrompt,
  setDeferredPrompt,
  notificationSettings,
  setNotificationSettings,
  requestNotificationPermission
}) {
  const [profileUsername, setProfileUsername] = useState(user?.username || '');
  const [profilePassword, setProfilePassword] = useState('');
  const [profilePicUrl, setProfilePicUrl] = useState(user?.profilePic || '');
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [uploadingProfilePic, setUploadingProfilePic] = useState(false);
  const profilePicFileInputRef = useRef(null);

  const handleProfilePicUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingProfilePic(true);
    setProfileError('');
    setProfileSuccess('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        setProfilePicUrl(data.fileUrl);
        setProfileSuccess('Image uploaded! Click Save Settings to update your profile.');
      } else {
        setProfileError('Failed to upload profile picture.');
      }
    } catch (err) {
      setProfileError('Error uploading image.');
    } finally {
      setUploadingProfilePic(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');

    const payload = {
      profilePic: profilePicUrl
    };

    if (profilePassword.trim()) {
      if (profilePassword.length < 6) {
        setProfileError('Password must be at least 6 characters.');
        return;
      }
      payload.password = profilePassword;
    }

    if (user?.username && profileUsername.toLowerCase() !== user.username.toLowerCase()) {
      if (profileUsername.trim().length < 3) {
        setProfileError('Username must be at least 3 characters.');
        return;
      }
      payload.username = profileUsername;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (response.ok) {
        setProfileSuccess('Profile updated successfully!');
        setUser(data.user);
        setProfilePassword('');
      } else {
        setProfileError(data.error || 'Failed to update profile.');
      }
    } catch (err) {
      setProfileError('Network error during profile update.');
    }
  };

  return (
    <div className="admin-pane settings-center-pane animate-fade-in">
      <div className="admin-header border-b">
        <div className="admin-title-area">
          <Settings className="admin-header-icon" />
          <div>
            <h2>Settings Center</h2>
          </div>
        </div>
        <button className="close-admin-btn icon-btn" onClick={onClose} title="Back to Chats">
          <X size={24} />
        </button>
      </div>

      <div className="settings-center-content">
        <div className="settings-center-card glass-panel animate-fade-in">
          <form onSubmit={handleUpdateProfile}>
            {profileError && <div className="admin-alert error" style={{ marginBottom: '15px' }}>{profileError}</div>}
            {profileSuccess && <div className="admin-alert success" style={{ marginBottom: '15px' }}>{profileSuccess}</div>}

            {/* Profile Pic Upload Section */}
            <div className="profile-upload-section">
              <div className="avatar settings-avatar">
                {profilePicUrl ? (
                  <img src={profilePicUrl} alt="Profile Preview" />
                ) : (
                  user?.username?.substring(0, 2).toUpperCase()
                )}
              </div>
              <input 
                type="file" 
                ref={profilePicFileInputRef} 
                style={{ display: 'none' }} 
                onChange={handleProfilePicUpload} 
                accept="image/*"
              />
              <button 
                type="button" 
                className="btn btn-secondary btn-sm" 
                onClick={() => profilePicFileInputRef.current?.click()}
                disabled={uploadingProfilePic}
                style={{ marginTop: '12px' }}
              >
                {uploadingProfilePic ? 'Uploading...' : 'Change Profile Picture'}
              </button>
            </div>

            <div className="form-group" style={{ marginTop: '15px' }}>
              <label>Username</label>
              <input 
                type="text" 
                className="input-field" 
                value={profileUsername}
                onChange={(e) => setProfileUsername(e.target.value)}
                required
              />
            </div>

            <div className="form-group" style={{ marginTop: '15px' }}>
              <label>New Password (leave blank to keep current)</label>
              <input 
                type="password" 
                placeholder="Enter new password..." 
                className="input-field" 
                value={profilePassword}
                onChange={(e) => setProfilePassword(e.target.value)}
              />
            </div>

            <div className="settings-footer">
              <button type="submit" className="btn btn-primary" disabled={uploadingProfilePic}>
                Save Settings
              </button>
            </div>
          </form>
        </div>

        {/* Notification Preferences Card */}
        <div className="settings-center-card glass-panel animate-fade-in">
          <h3>Notification Preferences</h3>
          <p>Configure how you want to be notified for incoming messages in user and group chats.</p>
          
          <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Direct Chats Settings */}
            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--primary)', borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px', marginBottom: '12px' }}>
                Direct / User Chats
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Sound Alert Toggle */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>Sound Alerts</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Play a chime when a new message is received</div>
                  </div>
                  <button 
                    type="button" 
                    className="toggle-btn"
                    onClick={() => setNotificationSettings(prev => ({
                      ...prev,
                      userChats: { ...prev.userChats, soundEnabled: !prev.userChats.soundEnabled }
                    }))}
                  >
                    {notificationSettings.userChats.soundEnabled ? <ToggleRight size={38} className="toggle-on" style={{ color: 'var(--primary)' }} /> : <ToggleLeft size={38} className="toggle-off" style={{ color: 'var(--text-muted)' }} />}
                  </button>
                </div>

                {/* In-App Toast Toggle */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>In-App Toast Banners</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Show floating alerts on your screen</div>
                  </div>
                  <button 
                    type="button" 
                    className="toggle-btn"
                    onClick={() => setNotificationSettings(prev => ({
                      ...prev,
                      userChats: { ...prev.userChats, inAppBannerEnabled: !prev.userChats.inAppBannerEnabled }
                    }))}
                  >
                    {notificationSettings.userChats.inAppBannerEnabled ? <ToggleRight size={38} className="toggle-on" style={{ color: 'var(--primary)' }} /> : <ToggleLeft size={38} className="toggle-off" style={{ color: 'var(--text-muted)' }} />}
                  </button>
                </div>

                {/* Desktop Native Toggle */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>Desktop Push Notifications</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Receive notifications when the app is in background</div>
                  </div>
                  <button 
                    type="button" 
                    className="toggle-btn"
                    onClick={() => {
                      if (!notificationSettings.userChats.desktopEnabled) {
                        requestNotificationPermission('userChats');
                      } else {
                        setNotificationSettings(prev => ({
                          ...prev,
                          userChats: { ...prev.userChats, desktopEnabled: false }
                        }));
                      }
                    }}
                  >
                    {notificationSettings.userChats.desktopEnabled ? <ToggleRight size={38} className="toggle-on" style={{ color: 'var(--primary)' }} /> : <ToggleLeft size={38} className="toggle-off" style={{ color: 'var(--text-muted)' }} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Group Chats Settings */}
            <div style={{ marginTop: '10px' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--primary)', borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px', marginBottom: '12px' }}>
                Group Chats
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Sound Alert Toggle */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>Sound Alerts</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Play a chime when a new message is received in groups</div>
                  </div>
                  <button 
                    type="button" 
                    className="toggle-btn"
                    onClick={() => setNotificationSettings(prev => ({
                      ...prev,
                      groupChats: { ...prev.groupChats, soundEnabled: !prev.groupChats.soundEnabled }
                    }))}
                  >
                    {notificationSettings.groupChats.soundEnabled ? <ToggleRight size={38} className="toggle-on" style={{ color: 'var(--primary)' }} /> : <ToggleLeft size={38} className="toggle-off" style={{ color: 'var(--text-muted)' }} />}
                  </button>
                </div>

                {/* In-App Toast Toggle */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>In-App Toast Banners</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Show floating alerts for group messages</div>
                  </div>
                  <button 
                    type="button" 
                    className="toggle-btn"
                    onClick={() => setNotificationSettings(prev => ({
                      ...prev,
                      groupChats: { ...prev.groupChats, inAppBannerEnabled: !prev.groupChats.inAppBannerEnabled }
                    }))}
                  >
                    {notificationSettings.groupChats.inAppBannerEnabled ? <ToggleRight size={38} className="toggle-on" style={{ color: 'var(--primary)' }} /> : <ToggleLeft size={38} className="toggle-off" style={{ color: 'var(--text-muted)' }} />}
                  </button>
                </div>

                {/* Desktop Native Toggle */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>Desktop Push Notifications</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Receive desktop notifications for group messages</div>
                  </div>
                  <button 
                    type="button" 
                    className="toggle-btn"
                    onClick={() => {
                      if (!notificationSettings.groupChats.desktopEnabled) {
                        requestNotificationPermission('groupChats');
                      } else {
                        setNotificationSettings(prev => ({
                          ...prev,
                          groupChats: { ...prev.groupChats, desktopEnabled: false }
                        }));
                      }
                    }}
                  >
                    {notificationSettings.groupChats.desktopEnabled ? <ToggleRight size={38} className="toggle-on" style={{ color: 'var(--primary)' }} /> : <ToggleLeft size={38} className="toggle-off" style={{ color: 'var(--text-muted)' }} />}
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* PWA / App Installation Card */}
        <div className="settings-center-card glass-panel animate-fade-in">
          <h3>Desktop & Mobile App</h3>
          <p>Install Alaap as a Progressive Web App (PWA) to run it as a native standalone app with a dedicated window, startup shortcut, and improved system integration.</p>
          
          <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(0, 0, 0, 0.2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="status-dot online" style={{ position: 'static', display: 'inline-block' }}></div>
                <span style={{ fontSize: '0.95rem', fontWeight: 500 }}>
                  App Status
                </span>
              </div>
              <span className="admin-badge" style={{ background: (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) ? 'var(--accent-emerald)' : 'var(--primary)', color: '#fff', padding: '2px 8px', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', fontWeight: 600 }}>
                {(window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) ? 'Running Standalone (App Mode)' : 'Running in Browser'}
              </span>
            </div>

            {(window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) ? (
              <div className="admin-alert success" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Sparkles size={18} />
                <span>You are running the premium Alaap app experience. Updates are automatically synced in the background.</span>
              </div>
            ) : deferredPrompt ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Alaap is ready to install on your device. Click the button below to complete the setup.</p>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={async () => {
                    if (!deferredPrompt) return;
                    deferredPrompt.prompt();
                    const { outcome } = await deferredPrompt.userChoice;
                    if (outcome === 'accepted') {
                      setDeferredPrompt(null);
                    }
                  }}
                  style={{ width: 'fit-content' }}
                >
                  <Download size={16} />
                  <span>Install Alaap App</span>
                </button>
              </div>
            ) : (
              <div className="admin-alert" style={{ margin: 0, background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'start', gap: '10px', border: '1px dashed var(--glass-border)' }}>
                <Info size={18} style={{ flexShrink: 0, marginTop: '2px', color: 'var(--primary)' }} />
                <div style={{ fontSize: '0.85rem' }}>
                  To install Alaap on this device, look for the install icon (<span style={{ fontWeight: 600 }}>⊕</span> or desktop icon) in your browser's address bar, or open the browser menu and select <span style={{ fontWeight: 600 }}>"Add to Home screen"</span> / <span style={{ fontWeight: 600 }}>"Install Alaap"</span>.
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="settings-center-card glass-panel danger-zone-card animate-fade-in">
          <h3>Logout & Session</h3>
          <p>Sign out of your account on this device. You will need to log back in to access your chats.</p>
          <div className="danger-zone-action">
            <button className="btn btn-secondary text-danger" onClick={logout}>
              <LogOut size={16} />
              <span>Logout Account</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
