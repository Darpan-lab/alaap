import React from 'react';
import { 
  FileText, 
  Download, 
  Cpu, 
  CheckCircle2, 
  AlertCircle, 
  Zap, 
  Clock, 
  HardDrive, 
  RefreshCw,
  Tv
} from 'lucide-react';

export function SyncPlayProgressDashboard({ 
  status = 'downloading',
  progress = 0,
  stage = 'metadata',
  stageName = '',
  speed = '',
  eta = '',
  downloadedSize = '',
  totalSize = '',
  error = '',
  onRetry
}) {
  const stages = [
    { id: 'metadata', label: '1. Metadata', icon: FileText },
    { id: 'downloading', label: '2. Streams', icon: Download },
    { id: 'processing', label: '3. Remuxing', icon: Cpu },
    { id: 'completed', label: '4. Ready', icon: CheckCircle2 }
  ];

  const getStageState = (stageId) => {
    if (status === 'failed') return 'failed';
    if (stage === 'completed' || status === 'completed') return 'completed';
    
    const order = ['metadata', 'downloading', 'processing', 'completed'];
    const currentIndex = order.indexOf(stage);
    const targetIndex = order.indexOf(stageId);
    
    if (targetIndex < currentIndex) return 'completed';
    if (targetIndex === currentIndex) return 'active';
    return 'pending';
  };

  const roundedProgress = Math.min(100, Math.max(0, Math.round(progress || 0)));

  // SVG Radial Gauge Calculations
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (roundedProgress / 100) * circumference;

  return (
    <div className="download-status-overlay sync-play-hud-overlay" style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(11, 12, 16, 0.94)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      color: '#fff',
      padding: '20px 24px',
      zIndex: 20,
      overflowY: 'auto'
    }}>
      {/* Header Pipeline Stepper */}
      <div style={{ width: '100%', maxWidth: '540px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Tv size={20} style={{ color: 'var(--primary, #8b5cf6)' }} className="animate-pulse" />
            <span style={{ fontSize: '14px', fontWeight: '700', letterSpacing: '0.5px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.9)' }}>
              SyncPlay Download Pipeline
            </span>
          </div>
          <span style={{ 
            fontSize: '11px', 
            fontWeight: '600', 
            padding: '3px 12px', 
            borderRadius: '12px',
            background: status === 'failed' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(139, 92, 246, 0.2)',
            color: status === 'failed' ? '#ef4444' : 'var(--primary, #a78bfa)',
            border: `1px solid ${status === 'failed' ? 'rgba(239,68,68,0.4)' : 'rgba(139,92,246,0.4)'}`
          }}>
            {status === 'failed' ? 'FAILED' : (stageName || 'Processing')}
          </span>
        </div>

        {/* Multi-Stage Stepper Nodes */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '10px',
          position: 'relative'
        }}>
          {stages.map((stg) => {
            const stgState = getStageState(stg.id);
            const Icon = stg.icon;
            
            let badgeBg = 'rgba(255,255,255,0.04)';
            let badgeBorder = 'rgba(255,255,255,0.08)';
            let iconColor = 'rgba(255,255,255,0.4)';
            
            if (stgState === 'completed') {
              badgeBg = 'rgba(16, 185, 129, 0.15)';
              badgeBorder = 'rgba(16, 185, 129, 0.4)';
              iconColor = '#10b981';
            } else if (stgState === 'active') {
              badgeBg = 'rgba(139, 92, 246, 0.25)';
              badgeBorder = 'var(--primary, #8b5cf6)';
              iconColor = '#a78bfa';
            } else if (stgState === 'failed') {
              badgeBg = 'rgba(239, 68, 68, 0.15)';
              badgeBorder = 'rgba(239, 68, 68, 0.4)';
              iconColor = '#ef4444';
            }

            return (
              <div 
                key={stg.id} 
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '10px 6px',
                  borderRadius: '10px',
                  background: badgeBg,
                  border: `1px solid ${badgeBorder}`,
                  transition: 'all 0.3s ease'
                }}
              >
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={18} style={{ color: iconColor }} />
                  {stgState === 'active' && (
                    <span style={{
                      position: 'absolute',
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      border: '2px solid var(--primary, #8b5cf6)',
                      animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite',
                      opacity: 0.75
                    }} />
                  )}
                </div>
                <span style={{ 
                  fontSize: '11px', 
                  fontWeight: stgState === 'active' ? '700' : '500', 
                  marginTop: '6px',
                  color: stgState === 'pending' ? 'rgba(255,255,255,0.4)' : '#fff',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '100%'
                }}>
                  {stg.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Center Section: Radial Gauge Visualizer & Metrics */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        gap: '28px',
        width: '100%',
        maxWidth: '540px',
        flexWrap: 'wrap'
      }}>
        {/* Radial Progress Gauge */}
        <div style={{ position: 'relative', width: '110px', height: '110px', flexShrink: 0 }}>
          <svg width="110" height="110" viewBox="0 0 110 110" style={{ transform: 'rotate(-90deg)' }}>
            <circle
              cx="55"
              cy="55"
              r={radius}
              fill="transparent"
              stroke="rgba(255, 255, 255, 0.1)"
              strokeWidth="8"
            />
            <circle
              cx="55"
              cy="55"
              r={radius}
              fill="transparent"
              stroke={status === 'failed' ? '#ef4444' : 'url(#progress-gradient-clean)'}
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.4s ease' }}
            />
            <defs>
              <linearGradient id="progress-gradient-clean" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
            </defs>
          </svg>
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <span style={{ fontSize: '22px', fontWeight: '800', color: '#fff', lineHeight: 1 }}>
              {status === 'failed' ? '!' : `${roundedProgress}%`}
            </span>
            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginTop: '4px', textTransform: 'uppercase', fontWeight: '600' }}>
              {status === 'failed' ? 'Error' : stage}
            </span>
          </div>
        </div>

        {/* Telemetry Metrics Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '10px',
          flex: 1,
          minWidth: '240px'
        }}>
          {/* Card 1: Speed */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '10px',
            padding: '10px 14px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.6)', fontSize: '10px', marginBottom: '3px' }}>
              <Zap size={13} style={{ color: '#f59e0b' }} />
              <span>DOWNLOAD SPEED</span>
            </div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff' }}>
              {speed || (stage === 'downloading' ? 'Calculating...' : 'N/A')}
            </div>
          </div>

          {/* Card 2: ETA */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '10px',
            padding: '10px 14px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.6)', fontSize: '10px', marginBottom: '3px' }}>
              <Clock size={13} style={{ color: '#60a5fa' }} />
              <span>ESTIMATED TIME</span>
            </div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff' }}>
              {eta || (stage === 'downloading' ? 'Calculating...' : 'N/A')}
            </div>
          </div>

          {/* Card 3: Size */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '10px',
            padding: '10px 14px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.6)', fontSize: '10px', marginBottom: '3px' }}>
              <HardDrive size={13} style={{ color: '#10b981' }} />
              <span>TOTAL SIZE</span>
            </div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff' }}>
              {totalSize || 'Resolving...'}
            </div>
          </div>

          {/* Card 4: Active Stage */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '10px',
            padding: '10px 14px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.6)', fontSize: '10px', marginBottom: '3px' }}>
              <RefreshCw size={13} style={{ color: '#a78bfa' }} className={status !== 'failed' ? 'animate-spin' : ''} />
              <span>CURRENT PHASE</span>
            </div>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {stageName || 'Processing'}
            </div>
          </div>
        </div>
      </div>

      {/* Failure State Notice */}
      {status === 'failed' && (
        <div style={{
          width: '100%',
          maxWidth: '540px',
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          borderRadius: '10px',
          padding: '12px 16px',
          marginTop: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={18} style={{ color: '#ef4444', flexShrink: 0 }} />
            <span style={{ fontSize: '12px', color: '#fca5a5' }}>
              {error || 'Download encountered an issue.'}
            </span>
          </div>
          {onRetry && (
            <button 
              type="button" 
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '11px', padding: '4px 14px', flexShrink: 0 }}
              onClick={onRetry}
            >
              Retry
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default SyncPlayProgressDashboard;
