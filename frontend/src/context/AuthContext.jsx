import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('alaap_token') || '');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [systemSettings, setSystemSettings] = useState({
    signupEnabled: true,
    inviteOnlyEnabled: false
  });

  const fetchSystemSignupSettings = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/signup-settings`);
      if (response.ok) {
        const data = await response.json();
        setSystemSettings({
          signupEnabled: data.signupEnabled,
          inviteOnlyEnabled: data.inviteOnlyEnabled
        });
      }
    } catch (err) {
      console.error('Could not fetch signup settings:', err);
    }
  };

  const fetchCurrentUser = async (authToken) => {
    const tokenToUse = authToken || token;
    if (!tokenToUse) {
      setLoading(false);
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${tokenToUse}` }
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
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('alaap_token');
    setToken('');
    setUser(null);
    setLoading(false);
  };

  useEffect(() => {
    fetchSystemSignupSettings();
    if (token) {
      fetchCurrentUser(token);
    } else {
      setLoading(false);
    }
  }, [token]);

  return (
    <AuthContext.Provider value={{
      token,
      setToken,
      user,
      setUser,
      loading,
      systemSettings,
      fetchSystemSignupSettings,
      fetchCurrentUser,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
