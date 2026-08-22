import  { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { authAPI } from '../services/api';

// ── Canonical role values (what the backend/DB stores) ───────────────────────
export const VALID_ROLES = ['SUPER_ADMIN', 'PODIUM_ADMIN', 'TEAM_MANAGER', 'PLAYER', 'SPECTATOR', 'GENERAL_USER'];

// ── Role normalisation: backend may return lowercase variants ─────────────────
export const ROLE_MAP = {
  super_admin:  'SUPER_ADMIN',
  podium_admin: 'PODIUM_ADMIN',
  manager:      'TEAM_MANAGER',
  team_manager: 'TEAM_MANAGER',
  player:       'PLAYER',
  spectator:    'SPECTATOR',
  general_user: 'GENERAL_USER',
  user:         'GENERAL_USER',
  SUPER_ADMIN:  'SUPER_ADMIN',
  PODIUM_ADMIN: 'PODIUM_ADMIN',
  TEAM_MANAGER: 'TEAM_MANAGER',
  PLAYER:       'PLAYER',
  SPECTATOR:    'SPECTATOR',
  GENERAL_USER: 'GENERAL_USER',
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
    case 'GENERAL_USER': return '/general/dashboard';
    default:             return '/';
  }
};

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

// ── Session-cleared bridge ───────────────────────────────────────────────────
// The axios interceptor may wipe tokens when refresh fails. When that happens
// it dispatches this event so React state drops the user TOO — otherwise the
// app walks around half-logged-in ("user" visible, token gone) and the next
// protected navigation behaves unpredictably.
export const SESSION_CLEARED_EVENT = 'app:session-cleared';

// Module-level so BOTH the synchronous rehydrate path below and the
// login/logout flows share one implementation.
function clearSession() {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
}

const readStoredUser = () => {
  try {
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');
    if (!storedUser || !storedToken) return null;

    const parsed = JSON.parse(storedUser);
    const normalizedRole = ROLE_MAP[parsed.role] || parsed.role;
    if (!VALID_ROLES.includes(normalizedRole)) {
      console.warn('[AuthContext] Stored user has invalid role. Clearing session.');
      clearSession();
      return null;
    }
    return { ...parsed, role: normalizedRole };
  } catch {
    clearSession();
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  // Rehydrate SYNCHRONOUSLY during the very first render (lazy initializer).
  // There is never a rendered frame where children exist but user is still
  // null-but-loading — which previously let a protected navigation flash the
  // login page before auth state settled (first-click bug).
  const [user, setUser] = useState(readStoredUser);
  // Auth resolves synchronously now; `loading` stays in the context API for
  // consumers (ProtectedRoute) but is always false.
  const [loading] = useState(false);
  // Store the socket ref so we can attach the role-update listener
  const socketRef = useRef(null);

  useEffect(() => {
    const onSessionCleared = () => setUser(null);
    window.addEventListener(SESSION_CLEARED_EVENT, onSessionCleared);
    return () => window.removeEventListener(SESSION_CLEARED_EVENT, onSessionCleared);
  }, []);

  // ── Internal helpers ──────────────────────────────────────────────────────
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
    clearSession();
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
    clearSession();
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

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-darkBg text-secondaryText">
        <div className="w-10 h-10 rounded-full border-2 border-cardBorder border-t-neonGreen animate-spin" />
        <span className="text-xs font-mono uppercase tracking-widest text-mutedText">Initializing Enterprise Platform</span>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, switchRole, updateUser, registerSocket, loading, getDashboardForRole }}>
      {children}
    </AuthContext.Provider>
  );
};

