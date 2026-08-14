import React, { useState, useEffect, useRef } from 'react';
import { Folder, Search, X, Upload, Film, Play, Loader2, RefreshCw, CheckCircle2, AlertCircle, FileVideo } from 'lucide-react';
import { API_BASE_URL } from '../../config';

export function ExternalVideosModal({ isOpen, onClose, token, onSelectVideo, socket }) {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('library'); // 'library' | 'upload'

  // Upload States
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState('');
  const [uploadEta, setUploadEta] = useState('');
  const [uploadedSizeStr, setUploadedSizeStr] = useState('');
  const [totalSizeStr, setTotalSizeStr] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const xhrRef = useRef(null);

  const fetchVideos = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/external-videos/list`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setVideos(data.videos || []);
      } else {
        const err = await res.json();
        setError(err.error || 'Failed to load external server videos.');
      }
    } catch (err) {
      console.error('Fetch external videos error:', err);
      setError('Network error fetching external videos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchVideos();
      setActiveTab('library');
      setUploadSuccess('');
      setUploadError('');
      setSelectedFile(null);
      setSearchQuery('');
    }
  }, [isOpen, token]);

  useEffect(() => {
    if (!socket) return;
    const handleListUpdate = () => {
      fetchVideos();
    };
    socket.on('external_videos_list_updated', handleListUpdate);
    return () => socket.off('external_videos_list_updated', handleListUpdate);
  }, [socket]);

  if (!isOpen) return null;

  const filteredVideos = videos.filter(v => 
    v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatBytes = (bytes) => {
    if (!bytes || isNaN(bytes) || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setUploadError('');
      setUploadSuccess('');
    }
  };

  const handleUploadSubmit = () => {
    if (!selectedFile) {
      setUploadError('Please select a video file to upload.');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setUploadError('');
    setUploadSuccess('');
    setUploadSpeed('0 MB/s');

    const formData = new FormData();
    formData.append('video', selectedFile);

    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;

    let startTime = Date.now();

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentComplete = Math.round((event.loaded / event.total) * 100);
        setUploadProgress(percentComplete);
        setUploadedSizeStr(formatBytes(event.loaded));
        setTotalSizeStr(formatBytes(event.total));

        const now = Date.now();
        const durationSec = (now - startTime) / 1000;
        if (durationSec > 0.5) {
          const bytesPerSec = event.loaded / durationSec;
          setUploadSpeed(`${formatBytes(bytesPerSec)}/s`);

          const remainingBytes = event.total - event.loaded;
          const remainingSec = Math.ceil(remainingBytes / bytesPerSec);
          if (remainingSec > 60) {
            const mins = Math.floor(remainingSec / 60);
            const secs = remainingSec % 60;
            setUploadEta(`${mins}m ${secs}s left`);
          } else {
            setUploadEta(`${remainingSec}s left`);
          }
        }
      }
    };

    xhr.onload = () => {
      setUploading(false);
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          setUploadSuccess(`"${selectedFile.name}" uploaded successfully to server folder!`);
          setSelectedFile(null);
          fetchVideos();
          if (response.video) {
            setTimeout(() => {
              onSelectVideo(response.video.url, response.video.title);
              onClose();
            }, 1000);
          }
        } catch (e) {
          setUploadSuccess('Video uploaded successfully!');
          fetchVideos();
        }
      } else {
        let errMessage = 'Upload failed.';
        try {
          const res = JSON.parse(xhr.responseText);
          errMessage = res.error || errMessage;
        } catch (e) {}
        setUploadError(errMessage);
      }
    };

    xhr.onerror = () => {
      setUploading(false);
      setUploadError('Network error occurred during video upload.');
    };

    xhr.open('POST', `${API_BASE_URL}/external-videos/upload`, true);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.send(formData);
  };

  const cancelUpload = () => {
    if (xhrRef.current) {
      xhrRef.current.abort();
      setUploading(false);
      setUploadError('Upload cancelled.');
    }
  };

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(8px)',
        padding: '20px'
      }}
    >
      <div 
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '840px',
          height: '82vh',
          maxHeight: '750px',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#121316',
          border: '1px solid rgba(59, 130, 246, 0.35)',
          borderRadius: '16px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.85), 0 0 40px rgba(59, 130, 246, 0.15)',
          overflow: 'hidden',
          color: '#f4f4f5'
        }}
      >
        {/* Modal Header */}
        <div 
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(180deg, rgba(59, 130, 246, 0.12) 0%, rgba(0,0,0,0) 100%)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div 
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'rgba(59, 130, 246, 0.18)',
                border: '1px solid rgba(59, 130, 246, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#60a5fa',
                boxShadow: '0 4px 14px rgba(59, 130, 246, 0.25)'
              }}
            >
              <Folder size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#fff' }}>
                Server Folder
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
                Play video files stored in server <code style={{ color: '#60a5fa', background: 'rgba(59,130,246,0.1)', padding: '2px 6px', borderRadius: '4px' }}>/uploads/external/</code> folder
              </p>
            </div>
          </div>

          <button 
            type="button" 
            onClick={onClose} 
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: 'rgba(255, 255, 255, 0.7)',
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'; e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'; }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div 
          style={{
            display: 'flex',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '0 24px',
            gap: '20px',
            backgroundColor: 'rgba(0, 0, 0, 0.25)'
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('library')}
            style={{
              padding: '14px 4px',
              fontSize: '13px',
              fontWeight: activeTab === 'library' ? '700' : '500',
              color: activeTab === 'library' ? '#60a5fa' : 'rgba(255, 255, 255, 0.6)',
              borderBottom: activeTab === 'library' ? '2px solid #3b82f6' : '2px solid transparent',
              background: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              borderTop: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
          >
            <FileVideo size={16} />
            <span>Video Library ({videos.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            style={{
              padding: '14px 4px',
              fontSize: '13px',
              fontWeight: activeTab === 'upload' ? '700' : '500',
              color: activeTab === 'upload' ? '#60a5fa' : 'rgba(255, 255, 255, 0.6)',
              borderBottom: activeTab === 'upload' ? '2px solid #3b82f6' : '2px solid transparent',
              background: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              borderTop: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
          >
            <Upload size={16} />
            <span>Upload New Video</span>
          </button>
        </div>

        {/* Modal Main Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {activeTab === 'library' && (
            <>
              {/* Search Bar & Refresh Button */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255, 255, 255, 0.4)' }} />
                  <input
                    type="text"
                    placeholder="Search videos by title or filename..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '10px',
                      padding: '10px 16px 10px 40px',
                      color: '#fff',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                  {searchQuery && (
                    <button 
                      type="button" 
                      onClick={() => setSearchQuery('')}
                      style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255, 255, 255, 0.5)', cursor: 'pointer' }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={fetchVideos}
                  style={{
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#e4e4e7',
                    borderRadius: '10px',
                    padding: '10px 16px',
                    fontSize: '13px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                  <span>Refresh</span>
                </button>
              </div>

              {error && (
                <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <AlertCircle size={18} />
                  <span>{error}</span>
                </div>
              )}

              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', gap: '12px', color: 'rgba(255,255,255,0.6)' }}>
                  <Loader2 size={36} className="animate-spin" style={{ color: '#3b82f6' }} />
                  <span style={{ fontSize: '13px' }}>Scanning server video folder...</span>
                </div>
              ) : filteredVideos.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', border: '2 border-dashed rgba(255,255,255,0.1)', borderRadius: '14px', textAlign: 'center', background: 'rgba(0,0,0,0.2)' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)', marginBottom: '14px' }}>
                    <Film size={28} />
                  </div>
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: '600', color: '#fff' }}>No video files found</h4>
                  <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'rgba(255,255,255,0.5)', maxWidth: '380px', lineHeight: '1.5' }}>
                    {searchQuery ? 'No videos match your search query.' : 'Upload a video file or put files directly into /backend/uploads/external/ on the server.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('upload')}
                    style={{
                      background: '#3b82f6',
                      color: '#fff',
                      border: 'none',
                      padding: '10px 18px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <Upload size={15} />
                    <span>Upload Video Now</span>
                  </button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
                  {filteredVideos.map((vid) => (
                    <div 
                      key={vid.filename}
                      style={{
                        padding: '16px',
                        borderRadius: '12px',
                        backgroundColor: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '14px',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.5)';
                        e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.05)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                        <div style={{ padding: '10px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', flexShrink: 0, marginTop: '2px' }}>
                          <Film size={22} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={vid.title}>
                            {vid.title}
                          </h4>
                          <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={vid.filename}>
                            {vid.filename}
                          </p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
                            <span style={{ padding: '2px 6px', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', borderRadius: '4px', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.1)' }}>
                              {vid.filename.split('.').pop()}
                            </span>
                            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontWeight: '500' }}>
                              {vid.formattedSize}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          onSelectVideo(vid.url, vid.title);
                          onClose();
                        }}
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          background: '#3b82f6',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '13px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#2563eb'}
                        onMouseLeave={(e) => e.currentTarget.style.background = '#3b82f6'}
                      >
                        <Play size={14} fill="currentColor" />
                        <span>Play in Sync Play</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === 'upload' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '10px 0' }}>
              <div 
                style={{
                  border: '2px dashed rgba(255, 255, 255, 0.15)',
                  borderRadius: '14px',
                  padding: '36px 20px',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(0, 0, 0, 0.2)'
                }}
              >
                <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', display: 'flex', alignItems: 'center', justifyCenter: 'center', marginBottom: '14px' }}>
                  <Upload size={30} style={{ margin: 'auto' }} />
                </div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: '600', color: '#fff' }}>Select Video File</h4>
                <p style={{ margin: '0 0 20px 0', fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)', maxWidth: '420px', lineHeight: '1.5' }}>
                  Videos uploaded here will be saved to server folder <code style={{ color: '#60a5fa' }}>/uploads/external/</code> and made available for everyone on the server.
                </p>

                <input 
                  type="file" 
                  accept="video/*,.mp4,.mkv,.webm,.mov,.avi,.m4v"
                  onChange={handleFileChange}
                  disabled={uploading}
                  style={{ display: 'none' }}
                  id="external-video-file-input"
                />

                <label
                  htmlFor="external-video-file-input"
                  style={{
                    padding: '10px 20px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#fff',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s'
                  }}
                >
                  <FileVideo size={16} />
                  <span>Choose Video File</span>
                </label>

                {selectedFile && (
                  <div style={{ marginTop: '20px', padding: '12px 16px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left', width: '100%', maxWidth: '420px' }}>
                    <Film size={22} style={{ color: '#60a5fa', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: '13px', fontWeight: '600', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedFile.name}</p>
                      <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>{formatBytes(selectedFile.size)}</p>
                    </div>
                  </div>
                )}
              </div>

              {uploadError && (
                <div style={{ padding: '12px 16px', borderRadius: '8px', backgroundColor: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <AlertCircle size={16} />
                  <span>{uploadError}</span>
                </div>
              )}

              {uploadSuccess && (
                <div style={{ padding: '12px 16px', borderRadius: '8px', backgroundColor: 'rgba(34, 197, 94, 0.12)', border: '1px solid rgba(34, 197, 94, 0.3)', color: '#4ade80', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <CheckCircle2 size={16} />
                  <span>{uploadSuccess}</span>
                </div>
              )}

              {uploading && (
                <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(0, 0, 0, 0.4)', border: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ fontWeight: '600', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Loader2 size={16} className="animate-spin" style={{ color: '#3b82f6' }} />
                      Uploading Video... {uploadProgress}%
                    </span>
                    <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontFamily: 'monospace' }}>
                      {uploadedSizeStr} / {totalSizeStr}
                    </span>
                  </div>

                  <div style={{ width: '100%', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '100px', height: '10px', overflow: 'hidden' }}>
                    <div 
                      style={{
                        width: `${uploadProgress}%`,
                        height: '100%',
                        backgroundColor: '#3b82f6',
                        borderRadius: '100px',
                        transition: 'width 0.2s'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
                    <span>Speed: <strong style={{ color: '#fff' }}>{uploadSpeed}</strong></span>
                    <span>ETA: <strong style={{ color: '#fff' }}>{uploadEta}</strong></span>
                    <button 
                      type="button" 
                      onClick={cancelUpload}
                      style={{ background: 'none', border: 'none', color: '#ef4444', fontWeight: '600', cursor: 'pointer' }}
                    >
                      Cancel Upload
                    </button>
                  </div>
                </div>
              )}

              {!uploading && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setActiveTab('library')}
                    style={{
                      padding: '10px 18px',
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: 'rgba(255, 255, 255, 0.7)',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!selectedFile}
                    onClick={handleUploadSubmit}
                    style={{
                      padding: '10px 20px',
                      background: selectedFile ? '#3b82f6' : 'rgba(255, 255, 255, 0.1)',
                      color: selectedFile ? '#fff' : 'rgba(255, 255, 255, 0.4)',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: selectedFile ? 'pointer' : 'not-allowed',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <Upload size={15} />
                    <span>Upload to Server</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
