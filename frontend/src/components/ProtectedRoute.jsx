import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Role aliases: frontend uses lowercase internally, backend uses UPPER_SNAKE
const ROLE_MAP = {
  super_admin: 'SUPER_ADMIN',
  podium_admin: 'PODIUM_ADMIN',
  manager: 'TEAM_MANAGER',
  player: 'PLAYER',
  spectator: 'SPECTATOR',
  // Pass-through if already uppercase
  SUPER_ADMIN: 'SUPER_ADMIN',
  PODIUM_ADMIN: 'PODIUM_ADMIN',
  TEAM_MANAGER: 'TEAM_MANAGER',
  PLAYER: 'PLAYER',
  SPECTATOR: 'SPECTATOR',
};

/**
 * <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'PODIUM_ADMIN']} />
 * Redirects to /manager/login if not authenticated.
 * Redirects to / if authenticated but wrong role.
 */
export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-darkBg">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/manager/login" state={{ from: location }} replace />;
  }

  if (allowedRoles.length === 0) {
    // No role restriction – any authenticated user
    return children;
  }

  const normalizedUserRole = ROLE_MAP[user.role] || user.role;
  const normalizedAllowed = allowedRoles.map(r => ROLE_MAP[r] || r);

  if (!normalizedAllowed.includes(normalizedUserRole)) {
    // Wrong role – redirect to appropriate home
    return <Navigate to="/" replace />;
  }

  return children;
}