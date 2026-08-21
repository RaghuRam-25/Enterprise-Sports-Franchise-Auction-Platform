import 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, ROLE_MAP } from '../context/AuthContext';

/**
 * Determine the most appropriate login redirect based on the current path.
 */
const getLoginRedirect = () => '/login';

/**
 * <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'PODIUM_ADMIN']} />
 *
 * - Loading         → Displays spinner
 * - Unauthenticated → Redirects to role-appropriate login
 * - Wrong role      → Redirects to /access-denied
 * - Correct role    → Renders children
 */
export default function ProtectedRoute({ children, allowedRoles = [], redirectTo }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Show spinner while auth state is rehydrating from localStorage
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-darkBg">
        <div className="w-8 h-8 border-4 border-neonGreen border-t-transparent rounded-full animate-spin" />
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