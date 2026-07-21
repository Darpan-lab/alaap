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

export default AudioMessagePlayer;
