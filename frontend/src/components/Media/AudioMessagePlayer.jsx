import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Mic } from 'lucide-react';

export const AudioMessagePlayer = ({ src }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    let isCancelled = false;

    const checkAndSetDuration = () => {
      if (!audio) return;

      if (audio.duration && isFinite(audio.duration)) {
        setDuration(audio.duration);
      } else if (audio.duration === Infinity || (audio.readyState >= 1 && (!audio.duration || isNaN(audio.duration)))) {
        // Fix for WebM MediaRecorder recorded audio where browser reports Infinity duration
        const calculateWebMDuration = () => {
          if (isCancelled) return;
          const onSeek = () => {
            audio.removeEventListener('timeupdate', onSeek);
            audio.removeEventListener('seeked', onSeek);
            if (!isCancelled && audio.currentTime > 0) {
              setDuration(audio.currentTime);
            }
            if (!isPlaying) {
              audio.currentTime = 0;
            }
          };

          audio.addEventListener('timeupdate', onSeek, { once: true });
          audio.addEventListener('seeked', onSeek, { once: true });
          audio.currentTime = 1e101;
        };

        calculateWebMDuration();
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      if (audio.currentTime > 0) {
        setDuration(prev => Math.max(prev, audio.currentTime));
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      if (audio.duration && isFinite(audio.duration)) {
        setDuration(audio.duration);
      } else if (audio.currentTime > 0) {
        setDuration(prev => Math.max(prev, audio.currentTime));
      }
    };

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', checkAndSetDuration);
    audio.addEventListener('durationchange', checkAndSetDuration);
    audio.addEventListener('canplaythrough', checkAndSetDuration);

    if (audio.readyState >= 1) {
      checkAndSetDuration();
    }

    return () => {
      isCancelled = true;
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', checkAndSetDuration);
      audio.removeEventListener('durationchange', checkAndSetDuration);
      audio.removeEventListener('canplaythrough', checkAndSetDuration);
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
    if (isNaN(secs) || !isFinite(secs) || secs < 0) return '0:00';
    const mins = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

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
            step="0.1"
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

export default AudioMessagePlayer;
