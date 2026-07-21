import React, { useState, useRef, useEffect } from 'react';
import { X, ToggleRight, ToggleLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { API_BASE_URL } from '../../config';

export function ProfileModal({ isOpen, onClose }) {
  const { user, setUser, token } = useAuth();
  const { 
    notificationSettings, 
    setNotificationSettings,
    triggerDesktopNotification
  } = useChat();

  const [profileUsername, setProfileUsername] = useState('');
  const [profilePassword, setProfilePassword] = useState('');
  const [profilePicUrl, setProfilePicUrl] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [uploadingProfilePic, setUploadingProfilePic] = useState(false);

  const profilePicFileInputRef = useRef(null);

  useEffect(() => {
    if (user && isOpen) {
      setProfileUsername(user.username);
      setProfilePassword('');
      setProfilePicUrl(user.profilePic || '');
      setProfileError('');
      setProfileSuccess('');
    }
  }, [user, isOpen]);

  if (!isOpen) return null;

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
        headers: {
          'Authorization': `Bearer ${token}`
        },
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
      console.error(err);
      setProfileError('Error uploading profile picture.');
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

    if (profileUsername.toLowerCase() !== user.username) {
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

  const toggleDesktopNotifications = () => {
    if (!('Notification' in window)) {
      alert('Desktop notifications are not supported by this browser.');
      return;
    }

    if (Notification.permission === 'granted') {
      setNotificationSettings(prev => ({ ...prev, desktopEnabled: !prev.desktopEnabled }));
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          setNotificationSettings(prev => ({ ...prev, desktopEnabled: true }));
          triggerDesktopNotification('Notifications Enabled', {
            body: 'You will now receive desktop alerts for new messages.'
          });
        } else {
          alert('Notification permission was denied. You can enable it in your browser settings.');
        }
      });
    } else {
      alert('Notification permission was denied. Please change browser permissions for this site to enable.');
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 10000 }}>
      <div className="modal-container glass-panel animate-fade-in" style={{ maxWidth: '420px' }}>
        <div className="modal-header border-b">
          <h3>Profile Settings</h3>
          <button className="icon-btn" type="button" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleUpdateProfile}>
          <div className="modal-body">
            {profileError && <div className="admin-alert error">{profileError}</div>}
            {profileSuccess && <div className="admin-alert success">{profileSuccess}</div>}

            {/* Profile Pic Upload Section */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginBottom: '15px' }}>
              <div className="avatar" style={{ width: '80px', height: '80px', fontSize: '2rem', borderRadius: '50%' }}>
                {profilePicUrl ? (
                  <img src={profilePicUrl} alt="Profile Preview" style={{ borderRadius: '50%' }} />
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
              >
                {uploadingProfilePic ? 'Uploading...' : 'Change Profile Picture'}
              </button>
            </div>

            <div className="form-group" style={{ marginBottom: '15px' }}>
              <label>Username</label>
              <input 
                type="text" 
                className="input-field" 
                value={profileUsername}
                onChange={(e) => setProfileUsername(e.target.value)}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: '15px' }}>
              <label>New Password (leave blank to keep current)</label>
              <input 
                type="password" 
                placeholder="Enter new password..." 
                className="input-field" 
                value={profilePassword}
                onChange={(e) => setProfilePassword(e.target.value)}
              />
            </div>

            {/* Notification Settings */}
            <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px solid var(--glass-border)' }}>
              <h4 style={{ marginBottom: '12px', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                Notification Preferences
              </h4>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>Notification Sounds</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Play sound for incoming messages</div>
                  </div>
                  <button
                    type="button"
                    style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
                    onClick={() => setNotificationSettings(prev => ({ ...prev, soundEnabled: !prev.soundEnabled }))}
                  >
                    {notificationSettings.soundEnabled ? (
                      <ToggleRight size={32} style={{ color: 'var(--primary)' }} />
                    ) : (
                      <ToggleLeft size={32} style={{ color: 'var(--text-muted)' }} />
                    )}
                  </button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>In-app Toast Alerts</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Show popups inside application</div>
                  </div>
                  <button
                    type="button"
                    style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
                    onClick={() => setNotificationSettings(prev => ({ ...prev, inAppBannerEnabled: !prev.inAppBannerEnabled }))}
                  >
                    {notificationSettings.inAppBannerEnabled ? (
                      <ToggleRight size={32} style={{ color: 'var(--primary)' }} />
                    ) : (
                      <ToggleLeft size={32} style={{ color: 'var(--text-muted)' }} />
                    )}
                  </button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>Desktop Notifications</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Show native desktop OS alerts</div>
                  </div>
                  <button
                    type="button"
                    style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
                    onClick={toggleDesktopNotifications}
                  >
                    {notificationSettings.desktopEnabled ? (
                      <ToggleRight size={32} style={{ color: 'var(--primary)' }} />
                    ) : (
                      <ToggleLeft size={32} style={{ color: 'var(--text-muted)' }} />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-footer border-t" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save Settings</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ProfileModal;
