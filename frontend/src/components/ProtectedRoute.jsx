import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// ── Role normalisation map ────────────────────────────────────────────────────
// Handles both lowercase frontend aliases and UPPER_SNAKE backend values.
const ROLE_MAP = {
  super_admin:  'SUPER_ADMIN',
  podium_admin: 'PODIUM_ADMIN',
  manager:      'TEAM_MANAGER',
  player:       'PLAYER',
  spectator:    'SPECTATOR',
  // Pass-through if already uppercase
  SUPER_ADMIN:  'SUPER_ADMIN',
  PODIUM_ADMIN: 'PODIUM_ADMIN',
  TEAM_MANAGER: 'TEAM_MANAGER',
  PLAYER:       'PLAYER',
  SPECTATOR:    'SPECTATOR',
};

/**
 * Determine the most appropriate login redirect based on the current path or
 * the role being attempted.
 */
const getLoginRedirect = (pathname) => {
  if (pathname.startsWith('/player')) return '/player/login';
  // All other roles share the manager/podium/admin login
  return '/manager/login';
};

/**
 * <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'PODIUM_ADMIN']} />
 *
 * - Unauthenticated  → redirects to role-appropriate login page
 * - Wrong role       → redirects to /access-denied
 * - Correct role     → renders children
 *
 * Optional props:
 *   - redirectTo: string  Override the login redirect path
 */
export default function ProtectedRoute({ children, allowedRoles = [], redirectTo }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Show spinner while auth state is rehydrating from localStorage
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-darkBg">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Not authenticated → redirect to appropriate login
  if (!user) {
    const loginPath = redirectTo || getLoginRedirect(location.pathname);
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  // No role restriction → any authenticated user can pass
  if (allowedRoles.length === 0) {
    return children;
  }

  const normalizedUserRole = ROLE_MAP[user.role] || user.role;
  const normalizedAllowed = allowedRoles.map(r => ROLE_MAP[r] || r);

  // Wrong role → go to access denied page
  if (!normalizedAllowed.includes(normalizedUserRole)) {
    return <Navigate to="/access-denied" replace />;
  }

  return children;
}