import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api, { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Rehydrate from localStorage on first load
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (storedUser && token) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (_) {}
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (credentials) => {
    try {
      // Try real backend first
      const res = await authAPI.login({
        email: credentials.username?.includes('@') ? credentials.username : undefined,
        username: credentials.username,
        password: credentials.password,
        role: credentials.role,
      });

      if (res?.token) {
        localStorage.setItem('token', res.token);
        localStorage.setItem('refreshToken', res.refreshToken || '');
        localStorage.setItem('user', JSON.stringify(res.user));
        setUser(res.user);
        return { success: true, user: res.user };
      }
    } catch (err) {
      // Backend unreachable – fall back to mock auth for demo
      console.warn('[AuthContext] Backend unavailable, using mock auth:', err.message);
    }

    // ── Mock Fallback ────────────────────────────────────────────────
    let role = 'SUPER_ADMIN';
    const u = credentials.username || '';
    if (u.includes('podium')) role = 'PODIUM_ADMIN';
    else if (u.includes('mgr') || credentials.role === 'manager') role = 'TEAM_MANAGER';
    else if (credentials.role === 'player') role = 'PLAYER';

    const mockUser = {
      id: `usr-mock-${Date.now()}`,
      name: u || 'Demo User',
      email: `${u}@auction.com`,
      role,
      teamId: 'team-1',
      mustResetPassword: u === 'ctg_mgr',
    };

    localStorage.setItem('token', 'mock-jwt-token');
    localStorage.setItem('user', JSON.stringify(mockUser));
    setUser(mockUser);
    return { success: true, user: mockUser };
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setUser(null);
  }, []);

  const switchRole = useCallback((newRole) => {
    setUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, role: newRole };
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, switchRole, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};