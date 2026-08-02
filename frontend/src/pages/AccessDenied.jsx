import 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldX, ArrowLeft, Home, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ROLE_HOME = {
  SUPER_ADMIN:   '/admin/dashboard',
  PODIUM_ADMIN:  '/podium/dashboard',
  TEAM_MANAGER:  '/manager/dashboard',
  PLAYER:        '/player/dashboard',
  SPECTATOR:     '/',
};

const ROLE_LABELS = {
  SUPER_ADMIN:   'Super Admin',
  PODIUM_ADMIN:  'Podium Admin',
  TEAM_MANAGER:  'Team Manager',
  PLAYER:        'Player',
  SPECTATOR:     'Spectator',
};

export default function AccessDenied() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const homeRoute = user ? (ROLE_HOME[user.role] || '/') : '/';
  const roleLabel = user ? (ROLE_LABELS[user.role] || user.role) : 'Guest';

  return (
    <div className="min-h-screen bg-darkBg flex items-center justify-center px-4">
      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 40% at 50% 30%, rgba(239,68,68,0.08) 0%, transparent 70%)'
        }}
      />

      <div className="relative max-w-lg w-full text-center">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-24 h-24 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
            <ShieldX className="w-12 h-12 text-rose-400" />
          </div>
        </div>

        {/* Status code */}
        <div className="text-8xl font-black text-rose-500/20 select-none mb-2 font-heading">
          403
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-white mb-3">
          Access Denied
        </h1>

        {/* Subtitle */}
        <p className="text-slate-400 mb-2">
          You don't have permission to view this page.
        </p>

        {user ? (
          <p className="text-sm text-slate-500 mb-8">
            You are logged in as{' '}
            <span className="text-slate-300 font-semibold">{user.name}</span>
            {' '}with role{' '}
            <span className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded-md text-xs font-mono text-amber-400">
              {roleLabel}
            </span>
            . This role does not have access to the requested resource.
          </p>
        ) : (
          <p className="text-sm text-slate-500 mb-8">
            Please log in with an appropriate account to continue.
          </p>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-sm font-semibold rounded-xl transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>

          {user ? (
            <Link
              to={homeRoute}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition shadow-lg shadow-blue-500/20"
            >
              <Home className="w-4 h-4" />
              My Dashboard
            </Link>
          ) : (
            <Link
              to="/manager/login"
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition shadow-lg shadow-blue-500/20"
            >
              <LogIn className="w-4 h-4" />
              Login
            </Link>
          )}

          <Link
            to="/"
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-sm font-semibold rounded-xl transition"
          >
            <Home className="w-4 h-4" />
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
