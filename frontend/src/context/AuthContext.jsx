import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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
  // Store the socket ref so we can attach the role-update listener
  const socketRef = useRef(null);

  // ── Rehydrate from localStorage on app load ───────────────────────────────
  useEffect(() => {
    const storedUser  = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');

    if (storedUser && storedToken) {
      try {
        const parsed = JSON.parse(storedUser);
        const normalizedRole = ROLE_MAP[parsed.role] || parsed.role;

        if (!VALID_ROLES.includes(normalizedRole)) {
          console.warn('[AuthContext] Stored user has invalid role. Clearing session.');
          _clearSession();
        } else {
          setUser({ ...parsed, role: normalizedRole });
        }
      } catch (_) {
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

  // ── updateUser — partial update of user state + localStorage ─────────────
  /**
   * Updates the current user in state and localStorage with the given partial data.
   * Use this for role upgrades, teamId assignments, and managerRequestStatus changes.
   *
   * @param {Partial<object>} partialUser - Fields to merge into the current user
   */
  const updateUser = useCallback((partialUser) => {
    setUser(prev => {
      if (!prev) return prev;
      const normalizedRole = partialUser.role
        ? (ROLE_MAP[partialUser.role] || partialUser.role)
        : prev.role;
      const updated = { ...prev, ...partialUser, role: normalizedRole };
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // ── Login — REAL BACKEND ONLY, no mock fallback ───────────────────────────
  const login = useCallback(async (credentials) => {
    _clearSession();
    setUser(null);

    const loginId = credentials.email || credentials.username || '';

    try {
      const res = await authAPI.login({
        email:    loginId.includes('@') ? loginId : undefined,
        username: !loginId.includes('@') ? loginId : undefined,
        password: credentials.password,
      });

      if (!res?.token || !res?.user) {
        return { success: false, message: 'Unexpected server response. Please try again.' };
      }

      const normalizedRole = ROLE_MAP[res.user.role] || res.user.role;
      if (!VALID_ROLES.includes(normalizedRole)) {
        return { success: false, message: `Server returned an unrecognised role: "${res.user.role}". Contact admin.` };
      }

      const authenticatedUser = { ...res.user, role: normalizedRole };

      localStorage.setItem('token',        res.token);
      localStorage.setItem('refreshToken', res.refreshToken || '');
      localStorage.setItem('user',         JSON.stringify(authenticatedUser));

      setUser(authenticatedUser);

      return { success: true, user: authenticatedUser };

    } catch (err) {
      const backendMsg = err?.response?.data?.message;
      const status     = err?.response?.status;

      if (status === 401) {
        return { success: false, message: backendMsg || 'Invalid email or password.' };
      }
      if (status === 403) {
        return { success: false, message: backendMsg || 'Your account has been disabled. Contact admin.' };
      }
      if (!err?.response) {
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

  /**
   * Registers a socket reference so AuthContext can listen for
   * real-time role update events emitted by the backend (user:role_updated).
   *
   * Call this from SocketContext or any component that has the socket instance.
   */
  const registerSocket = useCallback((socket) => {
    socketRef.current = socket;
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, switchRole, updateUser, registerSocket, loading, getDashboardForRole }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};