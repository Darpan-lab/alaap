import React, { useState, useEffect } from 'react';
import { Sparkles, User, Lock, Key, Loader2, Eye, EyeOff } from 'lucide-react';
import { API_BASE_URL } from '../config';

export function AuthPage({ setToken, setUser, systemSettings, fetchSystemSignupSettings, showAlert }) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
                type={showPassword ? "text" : "password"} 
                placeholder="Enter password..." 
                className="input-field has-right-icon" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? "Hide password" : "Show password"}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
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

export default AuthPage;
