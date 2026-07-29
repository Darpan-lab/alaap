import React, { useState, useEffect } from 'react';
import { Tv, Search, X, Loader2, Film, Clapperboard, ArrowLeft, Play, AlertCircle } from 'lucide-react';
import { API_BASE_URL } from '../../config';

export function JellyfinLogo({ size = 24, style = {} }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 1000 1000" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', flexShrink: 0, ...style }}
    >
      <defs>
        <linearGradient id="jellyfin-gradient-logo" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#00A4DC" />
          <stop offset="50%" stopColor="#7B52BE" />
          <stop offset="100%" stopColor="#AA5CC3" />
        </linearGradient>
      </defs>
      <path 
        fill="url(#jellyfin-gradient-logo)" 
        d="M500,90 C340,300 230,550 230,680 C230,830 350,910 500,910 C650,910 770,830 770,680 C770,550 660,300 500,90 Z M500,770 C410,770 340,720 340,640 C340,550 420,380 500,260 C580,380 660,550 660,640 C660,720 590,770 500,770 Z" 
      />
      <path 
        fill="url(#jellyfin-gradient-logo)" 
        d="M500,430 C465,510 410,610 410,660 C410,705 450,730 500,730 C550,730 590,705 590,660 C590,610 535,510 500,430 Z" 
      />
    </svg>
  );
}

export function JellyfinModal({ token, isOpen, onClose, onLoadVideo }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notConfigured, setNotConfigured] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('All'); // 'All', 'Movie', 'Series' or libraryId
  const [libraries, setLibraries] = useState([]);
  
  // Series & Season & Folder Navigation State
  const [currentSeries, setCurrentSeries] = useState(null); // { id, name }
  const [currentSeason, setCurrentSeason] = useState(null); // { id, name }
  const [folderStack, setFolderStack] = useState([]); // [{ id, name }]

  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setSelectedType('All');
      setCurrentSeries(null);
      setCurrentSeason(null);
      setFolderStack([]);
      fetchJellyfinLibraries();
      fetchJellyfinItems();
    }
  }, [isOpen]);

  const fetchJellyfinLibraries = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/jellyfin/libraries`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setLibraries(data.libraries || []);
      }
    } catch (err) {
      console.error('Failed to fetch Jellyfin libraries', err);
    }
  };

  // Debounced search when user types in search bar
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      if (!currentSeries && folderStack.length === 0) {
        fetchJellyfinItems(searchTerm, selectedType);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm, selectedType]);

  const fetchJellyfinItems = async (search = '', type = 'All', parentId = '', seasonId = '') => {
    setLoading(true);
    setError('');
    setNotConfigured(false);

    try {
      const isLibrary = !['All', 'Movie', 'Series', 'Seasons', 'Episodes'].includes(type);
      let queryType = isLibrary ? 'Library' : type;
      if (queryType === 'All') queryType = '';

      let url = `${API_BASE_URL}/jellyfin/items?search=${encodeURIComponent(search)}&type=${encodeURIComponent(queryType)}`;
      if (isLibrary) {
        url += `&libraryId=${encodeURIComponent(type)}`;
      }
      if (parentId) {
        url += `&parentId=${encodeURIComponent(parentId)}`;
      }
      if (seasonId) {
        url += `&seasonId=${encodeURIComponent(seasonId)}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.configured === false) {
          setNotConfigured(true);
          setItems([]);
        } else {
          const fetchedItems = data.items || [];
          if (type === 'Seasons' && fetchedItems.length === 0 && parentId) {
            // Fallback directly to episodes if series has no seasons
            fetchJellyfinItems('', 'Episodes', parentId);
            return;
          }
          setItems(fetchedItems);
        }
      } else {
        const errData = await response.json();
        setError(errData.error || 'Failed to connect to Jellyfin server.');
      }
    } catch (err) {
      console.error('Error fetching Jellyfin items:', err);
      setError('Network error connecting to Jellyfin.');
    } finally {
      setLoading(false);
    }
  };

  const handleSeriesClick = (series) => {
    setCurrentSeries({ id: series.id, name: series.name });
    setCurrentSeason(null);
    fetchJellyfinItems('', 'Seasons', series.id);
  };

  const handleSeasonClick = (season) => {
    setCurrentSeason({ id: season.id, name: season.name });
    fetchJellyfinItems('', 'Episodes', currentSeries.id, season.id);
  };

  const handleFolderClick = (folder) => {
    const newStack = [...folderStack, { id: folder.id, name: folder.name }];
    setFolderStack(newStack);
    fetchJellyfinItems('', selectedType, folder.id);
  };

  const handleBackFolder = () => {
    const newStack = [...folderStack];
    newStack.pop();
    setFolderStack(newStack);
    const parentId = newStack.length > 0 ? newStack[newStack.length - 1].id : '';
    fetchJellyfinItems(searchTerm, selectedType, parentId);
  };

  const handleBackToSeasons = () => {
    setCurrentSeason(null);
    if (currentSeries) {
      fetchJellyfinItems('', 'Seasons', currentSeries.id);
    }
  };

  const handleBackToSeriesList = () => {
    setCurrentSeries(null);
    setCurrentSeason(null);
    setFolderStack([]);
    fetchJellyfinItems(searchTerm, selectedType);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="modal-overlay animate-fade-in"
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 15000,
        background: 'rgba(5, 7, 13, 0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
    >
      <div 
        className="glass-panel animate-scale-up"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '900px',
          height: '85vh',
          maxHeight: '750px',
          display: 'flex',
          flexDirection: 'column',
          background: 'rgba(15, 18, 28, 0.95)',
          border: '1px solid rgba(0, 164, 220, 0.3)',
          borderRadius: '16px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8), 0 0 40px rgba(0, 164, 220, 0.15)',
          overflow: 'hidden'
        }}
      >
        {/* Modal Header */}
        <div 
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(180deg, rgba(0, 164, 220, 0.15) 0%, rgba(0,0,0,0) 100%)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div 
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, rgba(0, 164, 220, 0.25), rgba(170, 92, 195, 0.25))',
                border: '1px solid rgba(0, 164, 220, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(0, 164, 220, 0.3)'
              }}
            >
              <JellyfinLogo size={24} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                Jellyfin Media Library
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
                {currentSeries ? `Episodes in "${currentSeries.name}"` : 
                 selectedType === 'All' ? 'Sit back, relax, and hit play.' :
                 selectedType === 'Movie' ? 'Browsing All Movies' :
                 selectedType === 'Series' ? 'Browsing All TV Series' :
                 `Browsing Library: "${libraries.find(l => l.id === selectedType)?.name || 'Custom Library'}"`}
              </p>
            </div>
          </div>

          <button 
            type="button" 
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
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
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'; }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Search Bar & Categories Header */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', background: 'rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {folderStack.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleBackFolder}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <ArrowLeft size={16} />
                <span>Back</span>
              </button>
              <span style={{ fontSize: '14px', fontWeight: '600', color: '#fff' }}>
                Folder: <span style={{ color: '#00a4dc' }}>{folderStack[folderStack.length - 1].name}</span>
              </span>
            </div>
          ) : currentSeason ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleBackToSeasons}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <ArrowLeft size={16} />
                <span>Back to Seasons</span>
              </button>
              <span style={{ fontSize: '14px', fontWeight: '600', color: '#fff' }}>
                <span style={{ color: '#00a4dc' }}>{currentSeries?.name}</span> &gt; <span style={{ color: '#aa5cc3' }}>{currentSeason.name}</span>
              </span>
            </div>
          ) : currentSeries ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleBackToSeriesList}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <ArrowLeft size={16} />
                <span>Back to Series List</span>
              </button>
              <span style={{ fontSize: '14px', fontWeight: '600', color: '#fff' }}>
                Seasons in <span style={{ color: '#00a4dc' }}>{currentSeries.name}</span>
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              {/* Search input */}
              <div style={{ position: 'relative', flexGrow: 1, minWidth: '240px' }}>
                <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.5)' }} />
                <input 
                  type="text"
                  placeholder="Search movies, series, or episodes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '24px',
                    padding: '10px 16px 10px 40px',
                    color: '#fff',
                    fontSize: '13px',
                    outline: 'none',
                    transition: 'all 0.2s'
                  }}
                  onFocus={(e) => { e.target.style.borderColor = '#00a4dc'; e.target.style.background = 'rgba(0,0,0,0.4)'; }}
                  onBlur={(e) => { e.target.style.borderColor = 'rgba(255, 255, 255, 0.12)'; e.target.style.background = 'rgba(255, 255, 255, 0.05)'; }}
                />
                {searchTerm && (
                  <button 
                    type="button" 
                    onClick={() => setSearchTerm('')} 
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Type / Library Dropdown Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: 'rgba(255,255,255,0.7)', whiteSpace: 'nowrap' }}>
                  Library:
                </label>
                <select
                  value={selectedType}
                  onChange={(e) => {
                    setSelectedType(e.target.value);
                    setCurrentSeries(null);
                  }}
                  style={{
                    background: 'rgba(15, 23, 42, 0.9)',
                    color: '#fff',
                    border: '1px solid rgba(0, 164, 220, 0.4)',
                    borderRadius: '12px',
                    padding: '8px 14px',
                    fontSize: '13px',
                    fontWeight: '600',
                    outline: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                  }}
                >
                  <option value="All" style={{ background: '#1e293b', color: '#fff' }}>🎬 All Media</option>
                  <option value="Movie" style={{ background: '#1e293b', color: '#fff' }}>🍿 Movie</option>
                  <option value="Series" style={{ background: '#1e293b', color: '#fff' }}>📺 Series</option>
                  {libraries
                    .filter(lib => {
                      const name = (lib.name || '').toLowerCase().trim();
                      return !['movie', 'movies', 'series', 'tvshows', 'tv series', 'tv show', 'tv shows', 'shows', 'tv'].includes(name);
                    })
                    .map(lib => (
                      <option key={lib.id} value={lib.id} style={{ background: '#1e293b', color: '#fff' }}>
                        📁 {lib.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Media Grid Body */}
        <div style={{ flexGrow: 1, overflowY: 'auto', padding: '24px' }}>
          {notConfigured ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', textAlign: 'center', color: 'rgba(255,255,255,0.7)' }}>
              <AlertCircle size={48} style={{ color: '#f59e0b', marginBottom: '16px' }} />
              <h3 style={{ margin: '0 0 8px 0', color: '#fff', fontSize: '18px' }}>Jellyfin Server Not Configured</h3>
              <p style={{ maxWidth: '460px', fontSize: '13px', lineHeight: '1.6', margin: '0 0 20px 0', color: 'rgba(255,255,255,0.6)' }}>
                Your Jellyfin API Key and Server Address haven't been configured yet. 
                <br />Root users can easily set this up from the <strong>Alaap Control Center</strong>.
              </p>
            </div>
          ) : loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', gap: '16px', color: 'rgba(255,255,255,0.7)' }}>
              <Loader2 size={36} className="animate-spin" style={{ color: '#00a4dc' }} />
              <span style={{ fontSize: '14px', fontWeight: '500' }}>Fetching media from Jellyfin...</span>
            </div>
          ) : error ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', textAlign: 'center', color: '#ef4444' }}>
              <AlertCircle size={40} style={{ marginBottom: '12px' }} />
              <h4 style={{ margin: '0 0 6px 0', fontSize: '16px' }}>Error Loading Jellyfin Library</h4>
              <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>{error}</p>
              <button 
                type="button" 
                className="btn btn-secondary btn-sm" 
                style={{ marginTop: '16px' }}
                onClick={() => fetchJellyfinItems(searchTerm, selectedType, currentSeries?.id)}
              >
                Try Again 🔄
              </button>
            </div>
          ) : items.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
              <Film size={44} style={{ opacity: 0.3, marginBottom: '12px' }} />
              <span style={{ fontSize: '14px', fontWeight: '500' }}>
                {searchTerm ? `No movies or series matching "${searchTerm}"` : 'No media items found in your Jellyfin library.'}
              </span>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
              gap: '20px'
            }}>
              {items.map(item => {
                const isSeries = item.type === 'Series';
                const isSeason = item.type === 'Season';
                const isFolder = item.isFolder || item.type === 'Folder' || item.type === 'CollectionFolder' || item.type === 'UserView';

                return (
                  <div
                    key={item.id}
                    className="glass-panel"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      transition: 'all 0.25s ease',
                      cursor: 'pointer',
                      position: 'relative'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.borderColor = isSeason ? 'rgba(170, 92, 195, 0.7)' : 'rgba(0, 164, 220, 0.6)';
                      e.currentTarget.style.boxShadow = isSeason ? '0 10px 24px rgba(170, 92, 195, 0.25)' : '0 10px 24px rgba(0, 164, 220, 0.25)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                    onClick={() => {
                      if (isFolder) {
                        handleFolderClick(item);
                      } else if (isSeries) {
                        handleSeriesClick(item);
                      } else if (isSeason) {
                        handleSeasonClick(item);
                      } else {
                        const streamUrl = item.streamUrl || `/api/jellyfin/stream/${item.id}`;
                        onLoadVideo(streamUrl, item.name, item.durationSec);
                        onClose();
                      }
                    }}
                  >
                    {/* Poster Aspect Ratio Container */}
                    <div style={{ position: 'relative', width: '100%', aspectRatio: '2/3', background: 'rgba(0,0,0,0.5)', overflow: 'hidden' }}>
                      {item.imageUrl ? (
                        <img 
                          src={item.imageUrl.startsWith('http') ? item.imageUrl : `${API_BASE_URL.replace(/\/api\/?$/, '')}${item.imageUrl}`}
                          alt={item.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: isSeason ? 'linear-gradient(135deg, rgba(170, 92, 195, 0.25), rgba(15, 23, 42, 0.9))' : 'linear-gradient(135deg, rgba(0, 164, 220, 0.2), rgba(15, 23, 42, 0.8))', color: 'rgba(255,255,255,0.4)', gap: '8px' }}>
                          {isSeason ? <Tv size={36} style={{ color: '#aa5cc3' }} /> : isSeries ? <Clapperboard size={32} /> : <Film size={32} />}
                          <span style={{ fontSize: '12px', fontWeight: '600', textAlign: 'center', padding: '0 8px', color: '#fff' }}>{item.name}</span>
                        </div>
                      )}

                      {/* Type Badge */}
                      <span style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        background: isSeason ? 'linear-gradient(135deg, #aa5cc3, #7b52be)' : isSeries ? 'rgba(6, 182, 212, 0.9)' : 'rgba(99, 102, 241, 0.9)',
                        color: '#fff',
                        fontSize: '10px',
                        fontWeight: '700',
                        padding: '3px 8px',
                        borderRadius: '10px',
                        backdropFilter: 'blur(4px)',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.4)'
                      }}>
                        {isSeason ? 'Season' : item.type}
                      </span>

                      {/* Hover Overlay Play Icon */}
                      <div className="media-overlay" style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0, 0, 0, 0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: 0,
                        transition: 'opacity 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}
                      >
                        <div style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '50%',
                          background: isSeason ? '#aa5cc3' : '#00a4dc',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          boxShadow: isSeason ? '0 4px 16px rgba(170, 92, 195, 0.6)' : '0 4px 16px rgba(0, 164, 220, 0.6)'
                        }}>
                          <Play size={20} fill="#fff" style={{ marginLeft: '2px' }} />
                        </div>
                      </div>
                    </div>

                    {/* Card Info */}
                    <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{
                        fontSize: '13px',
                        fontWeight: '600',
                        color: '#fff',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }} title={item.name}>
                        {item.name}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
                        {item.year && <span>{item.year}</span>}
                        {isSeries ? (
                          <span style={{ color: '#00a4dc', fontWeight: '500' }}>Browse Seasons →</span>
                        ) : isSeason ? (
                          <span style={{ color: '#aa5cc3', fontWeight: '500' }}>View Episodes →</span>
                        ) : (
                          <span style={{ color: '#10b981', fontWeight: '500' }}>Load to SyncPlay</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default JellyfinModal;
