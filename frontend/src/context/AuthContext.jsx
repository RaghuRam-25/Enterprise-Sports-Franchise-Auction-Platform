import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';

// ── Canonical role values (what the backend/DB stores) ───────────────────────
export const VALID_ROLES = ['SUPER_ADMIN', 'PODIUM_ADMIN', 'TEAM_MANAGER', 'PLAYER', 'SPECTATOR'];

// ── Role normalisation: backend may return lowercase variants ─────────────────
export const ROLE_MAP = {
  super_admin:  'SUPER_ADMIN',
  podium_admin: 'PODIUM_ADMIN',
  manager:      'TEAM_MANAGER',
  team_manager: 'TEAM_MANAGER',
  player:       'PLAYER',
  spectator:    'SPECTATOR',
  SUPER_ADMIN:  'SUPER_ADMIN',
  PODIUM_ADMIN: 'PODIUM_ADMIN',
  TEAM_MANAGER: 'TEAM_MANAGER',
  PLAYER:       'PLAYER',
  SPECTATOR:    'SPECTATOR',
};

/**
 * Returns the correct landing dashboard path for a given role.
 * ONLY these exact paths should be used for post-login redirects.
 */
export const getDashboardForRole = (role) => {
  const normalized = ROLE_MAP[role] || role;
  switch (normalized) {
    case 'SUPER_ADMIN':  return '/admin/dashboard';
    case 'PODIUM_ADMIN': return '/podium/dashboard';
    case 'TEAM_MANAGER': return '/manager/dashboard';
    case 'PLAYER':       return '/player/dashboard';
    default:             return '/';
  }
};

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  // ── Rehydrate from localStorage on app load ───────────────────────────────
  // Only restore if BOTH a valid token AND a valid user object exist.
  useEffect(() => {
    const storedUser  = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');

    if (storedUser && storedToken) {
      try {
        const parsed = JSON.parse(storedUser);
        // Normalise the role in case an old snake_case value was stored
        const normalizedRole = ROLE_MAP[parsed.role] || parsed.role;

        // Guard: if the stored role is completely unrecognised, clear storage
        if (!VALID_ROLES.includes(normalizedRole)) {
          console.warn('[AuthContext] Stored user has invalid role. Clearing session.');
          _clearSession();
        } else {
          setUser({ ...parsed, role: normalizedRole });
        }
      } catch (_) {
        // Corrupt JSON → clear everything
        _clearSession();
      }
    }

    setLoading(false);
  }, []);

  // ── Internal helpers ──────────────────────────────────────────────────────
  const _clearSession = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  };

  // ── Login — REAL BACKEND ONLY, no mock fallback ───────────────────────────
  /**
   * Attempts login against the real API. If the backend returns an error
   * (wrong password, user not found, network error) this function returns
   * { success: false, message: '...' } — it NEVER falls back to a mock session.
   *
   * @param {{ email?: string, username?: string, password: string }} credentials
   * @returns {Promise<{ success: boolean, user?: object, message?: string }>}
   */
  const login = useCallback(async (credentials) => {
    // Always clear any previous session before a new login attempt
    _clearSession();
    setUser(null);

    const loginId = credentials.email || credentials.username || '';

    try {
      const res = await authAPI.login({
        // Backend accepts either email or username field
        email:    loginId.includes('@') ? loginId : undefined,
        username: !loginId.includes('@') ? loginId : undefined,
        password: credentials.password,
      });

      // ── Validate response shape ───────────────────────────────────────────
      if (!res?.token || !res?.user) {
        return { success: false, message: 'Unexpected server response. Please try again.' };
      }

      // ── Normalise and validate role from backend ──────────────────────────
      const normalizedRole = ROLE_MAP[res.user.role] || res.user.role;
      if (!VALID_ROLES.includes(normalizedRole)) {
        return { success: false, message: `Server returned an unrecognised role: "${res.user.role}". Contact admin.` };
      }

      const authenticatedUser = { ...res.user, role: normalizedRole };

      // ── Persist to localStorage ───────────────────────────────────────────
      localStorage.setItem('token',        res.token);
      localStorage.setItem('refreshToken', res.refreshToken || '');
      localStorage.setItem('user',         JSON.stringify(authenticatedUser));

      // ── Update React state ────────────────────────────────────────────────
      setUser(authenticatedUser);

      return { success: true, user: authenticatedUser };

    } catch (err) {
      // ── Extract the backend's error message if available ──────────────────
      const backendMsg = err?.response?.data?.message;
      const status     = err?.response?.status;

      if (status === 401) {
        return { success: false, message: backendMsg || 'Invalid email or password.' };
      }
      if (status === 403) {
        return { success: false, message: backendMsg || 'Your account has been disabled. Contact admin.' };
      }
      if (!err?.response) {
        // Network error — backend is unreachable
        return {
          success: false,
          message: 'Cannot reach the server. Make sure the backend is running on port 5000.',
        };
      }

      return { success: false, message: backendMsg || 'Login failed. Please try again.' };
    }
  }, []);

  // ── Logout — wipes ALL session data ──────────────────────────────────────
  const logout = useCallback(() => {
    _clearSession();
    setUser(null);
  }, []);

  // ── switchRole — only for Super Admin override scenarios ──────────────────
  const switchRole = useCallback((newRole) => {
    setUser(prev => {
      if (!prev) return prev;
      const normalizedRole = ROLE_MAP[newRole] || newRole;
      if (!VALID_ROLES.includes(normalizedRole)) return prev;
      const updated = { ...prev, role: normalizedRole };
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, switchRole, loading, getDashboardForRole }}>
      {/* Only render children once auth state is initialised from storage */}
      {!loading && children}
    </AuthContext.Provider>
  );
};