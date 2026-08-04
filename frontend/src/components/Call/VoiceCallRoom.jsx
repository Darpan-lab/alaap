import React, { useState, useEffect } from 'react';
import { 
  LiveKitRoom, 
  RoomAudioRenderer, 
  useParticipants, 
  useLocalParticipant,
  useIsSpeaking,
  useMediaDeviceSelect
} from '@livekit/components-react';
import { Mic, MicOff, Phone, Minimize2, Maximize2, Users, Volume2, AlertCircle, ChevronUp, Check } from 'lucide-react';

function CallControls({ onLeave, isMinimized, setIsMinimized, micError, setMicError, isMini }) {
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();
  const { devices, activeDeviceId, setActiveMediaDevice } = useMediaDeviceSelect({ kind: 'audioinput' });
  const [showDeviceMenu, setShowDeviceMenu] = useState(false);
  const deviceMenuRef = React.useRef(null);

  // Close menu on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (deviceMenuRef.current && !deviceMenuRef.current.contains(event.target)) {
        setShowDeviceMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleMic = async () => {
    if (localParticipant) {
      try {
        await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
        setMicError(false);
      } catch (err) {
        console.error('Failed to toggle mic:', err);
        setMicError(true);
      }
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '12px'
    }}>
      {micError && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          backgroundColor: 'rgba(239, 68, 68, 0.2)',
          color: '#f87171',
          padding: '6px 12px',
          borderRadius: '8px',
          fontSize: '12px',
          fontWeight: '500'
        }}>
          <AlertCircle size={14} />
          <span>Microphone access blocked. Click mic to retry.</span>
        </div>
      )}

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        marginTop: isMinimized ? '0' : '8px'
      }}>
        <div ref={deviceMenuRef} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: isMicrophoneEnabled ? '#3f3f46' : '#ef4444',
            borderRadius: '24px',
            transition: 'all 0.2s',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
          }}>
            <button
              onClick={toggleMic}
              style={{
                width: isMinimized ? '36px' : '48px',
                height: isMinimized ? '36px' : '48px',
                borderRadius: '50%',
                backgroundColor: 'transparent',
                border: 'none',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              title={isMicrophoneEnabled ? 'Mute Microphone' : 'Unmute Microphone'}
            >
              {isMicrophoneEnabled ? <Mic size={isMinimized ? 18 : 22} /> : <MicOff size={isMinimized ? 18 : 22} />}
            </button>
            {!isMinimized && (
              <>
                <div style={{ width: '1px', height: '24px', backgroundColor: 'rgba(255,255,255,0.2)' }} />
                <button
                  onClick={() => setShowDeviceMenu(!showDeviceMenu)}
                  style={{
                    width: '32px',
                    height: isMinimized ? '36px' : '48px',
                    borderTopRightRadius: '24px',
                    borderBottomRightRadius: '24px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                  title="Select Microphone"
                >
                  <ChevronUp size={16} />
                </button>
              </>
            )}
          </div>

          {showDeviceMenu && (
            <div className="animate-fade-in" style={{
              position: 'absolute',
              bottom: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              marginBottom: '12px',
              backgroundColor: '#18181b',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              padding: '8px',
              width: 'max-content',
              maxWidth: '280px',
              boxShadow: '0 12px 24px rgba(0, 0, 0, 0.5)',
              zIndex: 100,
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}>
              <div style={{ padding: '4px 8px', fontSize: '11px', fontWeight: '600', color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Microphones
              </div>
              {devices.length === 0 ? (
                <div style={{ padding: '8px', fontSize: '13px', color: '#71717a' }}>No microphones found</div>
              ) : (
                devices.map(device => (
                  <button
                    key={device.deviceId}
                    onClick={() => {
                      setActiveMediaDevice(device.deviceId);
                      setShowDeviceMenu(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      backgroundColor: 'transparent',
                      border: 'none',
                      color: '#ffffff',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      textAlign: 'left',
                      width: '100%'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                  >
                    <div style={{ width: '16px', flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
                      {activeDeviceId === device.deviceId && <Check size={14} color="#22c55e" />}
                    </div>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {device.label || 'Default Microphone'}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {!isMini && (
          <>
            <button
              onClick={onLeave}
              style={{
                width: isMinimized ? '36px' : '48px',
                height: isMinimized ? '36px' : '48px',
                borderRadius: '50%',
                backgroundColor: '#ef4444',
                border: 'none',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)',
                transition: 'all 0.2s'
              }}
              title="Leave Voice Call"
            >
              <Phone size={isMinimized ? 18 : 22} style={{ transform: 'rotate(135deg)' }} />
            </button>

            <button
              onClick={() => setIsMinimized(!isMinimized)}
              style={{
                width: isMinimized ? '36px' : '48px',
                height: isMinimized ? '36px' : '48px',
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              title={isMinimized ? "Expand Controls" : "Minimize"}
            >
              {isMinimized ? <Maximize2 size={isMinimized ? 18 : 22} /> : <Minimize2 size={isMinimized ? 18 : 22} />}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function ParticipantCard({ participant, isLocal = false }) {
  const isSpeaking = useIsSpeaking(participant);
  let metadata = {};
  try {
    if (participant.metadata) metadata = JSON.parse(participant.metadata);
  } catch (e) {}

  const displayName = participant.name || metadata.username || participant.identity;
  const avatar = metadata.avatar;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '8px',
      position: 'relative'
    }}>
      <div style={{
        position: 'relative',
        width: '72px',
        height: '72px',
        borderRadius: '50%',
        backgroundColor: '#27272a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: isSpeaking ? '3px solid #22c55e' : '3px solid transparent',
        boxShadow: isSpeaking ? '0 0 16px rgba(34, 197, 94, 0.6)' : 'none',
        transition: 'all 0.25s ease'
      }}>
        {avatar ? (
          <img
            src={avatar}
            alt={displayName}
            style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
          />
        ) : (
          <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#e4e4e7' }}>
            {displayName ? displayName.charAt(0).toUpperCase() : '?'}
          </span>
        )}
        {isSpeaking && (
          <div style={{
            position: 'absolute',
            bottom: '-2px',
            right: '-2px',
            backgroundColor: '#22c55e',
            borderRadius: '50%',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Volume2 size={12} color="#ffffff" />
          </div>
        )}
      </div>

      <span style={{
        fontSize: '13px',
        fontWeight: '500',
        color: isSpeaking ? '#22c55e' : '#e4e4e7',
        maxWidth: '90px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }}>
        {displayName} {isLocal && '(You)'}
      </span>
    </div>
  );
}

function RoomContent({ onLeave, chatName, isMini }) {
  const participants = useParticipants();
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();
  const [isMinimized, setIsMinimized] = useState(true);
  const [duration, setDuration] = useState(0);
  const [micError, setMicError] = useState(false);
  const hasAutoEnabled = React.useRef(false);

  useEffect(() => {
    if (localParticipant && !hasAutoEnabled.current) {
      hasAutoEnabled.current = true;
      localParticipant.setMicrophoneEnabled(true).catch(err => {
        console.warn('[LiveKit] Mic activation error:', err);
        setMicError(true);
      });
    }
  }, [localParticipant]);

  // Global event system for SyncPlay integration
  useEffect(() => {
    const handleToggleMic = () => {
      if (localParticipant) {
        localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled).catch(e => console.error(e));
      }
    };
    window.addEventListener('toggle-mic', handleToggleMic);
    return () => window.removeEventListener('toggle-mic', handleToggleMic);
  }, [localParticipant, isMicrophoneEnabled]);

  // Push-to-talk logic ("M" key)
  useEffect(() => {
    if (!localParticipant) return;

    const handleKeyDown = (e) => {
      // Ignore if user is typing in an input field
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
      
      if (e.key.toLowerCase() === 'm' && !e.repeat) {
        localParticipant.setMicrophoneEnabled(true).catch(err => console.error(err));
      }
    };

    const handleKeyUp = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;

      if (e.key.toLowerCase() === 'm') {
        localParticipant.setMicrophoneEnabled(false).catch(err => console.error(err));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [localParticipant]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('mic-state-changed', { detail: isMicrophoneEnabled }));
  }, [isMicrophoneEnabled]);

  useEffect(() => {
    const timer = setInterval(() => setDuration(prev => prev + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDuration = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  if (isMinimized) {
    if (isMini) {
      return (
        <div style={{
          marginTop: 'auto',
          backgroundColor: '#0a0b10',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '14px 0',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          position: 'relative'
        }}>
          {/* Green dot indicator for active call */}
          <div style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: '#22c55e',
            animation: 'pulse 1.5s infinite',
          }} />
          <CallControls onLeave={onLeave} isMinimized={true} isMini={true} setIsMinimized={setIsMinimized} micError={micError} setMicError={setMicError} />
        </div>
      );
    }

    return (
      <div style={{
        marginTop: 'auto', // Pushes it to the bottom of the sidebar flex container
        backgroundColor: '#0a0b10', // matching sidebar dark theme
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        color: '#ffffff',
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden', flex: 1 }}>
          <div style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: '#22c55e',
            animation: 'pulse 1.5s infinite',
            flexShrink: 0
          }} />
          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {chatName || 'Voice Call'}
              </span>
              <span style={{ fontSize: '11px', backgroundColor: 'rgba(255, 255, 255, 0.1)', padding: '2px 6px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '3px', color: '#e4e4e7' }}>
                <Users size={10} />
                {participants.length}
              </span>
            </div>
            <span style={{ fontSize: '11px', color: '#a1a1aa', fontVariantNumeric: 'tabular-nums', marginTop: '2px' }}>
              {formatDuration(duration)}
            </span>
          </div>
        </div>
        <div style={{ flexShrink: 0 }}>
          <CallControls onLeave={onLeave} isMinimized={true} isMini={false} setIsMinimized={setIsMinimized} micError={micError} setMicError={setMicError} />
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(9, 9, 11, 0.85)',
      backdropFilter: 'blur(12px)',
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px'
    }}>
      <div style={{
        backgroundColor: '#18181b',
        color: '#ffffff',
        borderRadius: '24px',
        padding: '28px 32px',
        width: '100%',
        maxWidth: '480px',
        boxShadow: '0 24px 48px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: '#22c55e', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>
            <Users size={16} />
            <span>Connected ({participants.length})</span>
          </div>
          <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '700' }}>
            {chatName || 'Voice Call'}
          </h3>
          <span style={{ fontSize: '13px', color: '#71717a' }}>
            {formatDuration(duration)}
          </span>
        </div>

        {/* Participants Grid */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '24px',
          minHeight: '120px',
          width: '100%',
          padding: '16px',
          backgroundColor: '#09090b',
          borderRadius: '16px',
          marginBottom: '16px'
        }}>
          {participants.map(p => (
            <ParticipantCard key={p.sid} participant={p} isLocal={p.isLocal} />
          ))}
        </div>

        <div style={{ marginTop: '24px' }}>
          <CallControls onLeave={onLeave} isMinimized={false} isMini={isMini} setIsMinimized={setIsMinimized} micError={micError} setMicError={setMicError} />
        </div>
      </div>
    </div>
  );
}

export function VoiceCallRoom({ activeCall, onLeave, isMini }) {
  if (!activeCall) return null;

  return (
    <LiveKitRoom
      serverUrl={activeCall.url}
      token={activeCall.token}
      connect={true}
      audio={false}
      video={false}
      onDisconnected={(reason) => {
        console.log('[LiveKitRoom] Disconnected from room. Reason:', reason);
        // Only auto-close on explicit disconnect or leave
        onLeave();
      }}
      onError={(error) => {
        console.error('[LiveKitRoom] Room Error:', error);
        alert(`LiveKit Error: ${error?.message || error || 'Room connection error'}`);
      }}
      data-lk-theme="default"
    >
      <RoomAudioRenderer />
      <RoomContent onLeave={onLeave} chatName={activeCall.chatName} isMini={isMini} />
    </LiveKitRoom>
  );
}
