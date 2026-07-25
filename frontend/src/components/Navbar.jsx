import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Trophy, Shield, Gavel, Users, User, Radio, LogOut, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAuction } from '../context/AuctionContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { lastActionToast, timerStatus, podiumPlayer, currentBid, formatCurrency } = useAuction();
  const navigate = useNavigate();
  const location = useLocation();

  const role = user?.role || null;

  // ── Role-based nav visibility ─────────────────────────────────────────────
  // Derived from RBAC spec accessible pages per role.
  const showSuperAdmin  = role === 'SUPER_ADMIN';
  const showPodium      = role === 'PODIUM_ADMIN' || role === 'SUPER_ADMIN';
  const showManager     = role === 'TEAM_MANAGER' || role === 'SUPER_ADMIN';
  const showPlayerPortal = role === 'PLAYER' || role === 'SUPER_ADMIN';
  // Live Stadium is accessible to everyone (Spectator + all roles)
  const showLive = true;

  return (
    <header className="sticky top-0 z-50 glass-card border-b border-slate-800 backdrop-blur-md">
      {/* Toast Notification Bar */}
      {lastActionToast && (
        <div className={`px-4 py-2 text-xs font-bold text-center flex items-center justify-center gap-2 transition-all ${
          lastActionToast.type === 'error'   ? 'bg-rose-950/90 text-rose-300 border-b border-rose-800' :
          lastActionToast.type === 'success' ? 'bg-emerald-950/90 text-emerald-300 border-b border-emerald-800' :
          lastActionToast.type === 'warning' ? 'bg-amber-950/90 text-amber-300 border-b border-amber-800' :
          'bg-blue-950/90 text-blue-300 border-b border-blue-800'
        }`}>
          {lastActionToast.type === 'error'
            ? <AlertTriangle className="w-4 h-4 text-rose-400 animate-bounce" />
            : <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          }
          <span>{lastActionToast.msg}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Brand Logo & Name */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-emerald-400 p-0.5 shadow-lg group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Trophy className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <div>
              <span className="font-heading font-black text-lg tracking-wider bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent uppercase">
                FRANCHISE<span className="text-emerald-400">AUCTION</span>
              </span>
              <span className="block text-[10px] tracking-widest text-slate-400 uppercase font-semibold">Enterprise Platform</span>
            </div>
          </Link>

          {/* Live Auction Ticker Widget */}
          <div className="hidden md:flex items-center gap-3 bg-slate-900/90 px-3.5 py-1.5 rounded-full border border-slate-800 shadow-inner">
            <span className="relative flex h-2.5 w-2.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                timerStatus === 'running' ? 'bg-emerald-400' : 'bg-amber-400'
              }`} />
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                timerStatus === 'running' ? 'bg-emerald-500' : 'bg-amber-500'
              }`} />
            </span>
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
              {podiumPlayer ? `On Podium: ${podiumPlayer.name}` : 'Podium Standing By'}
            </span>
            {podiumPlayer && (
              <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                {formatCurrency(currentBid)}
              </span>
            )}
          </div>

          {/* Role-Gated Navigation Toolbar */}
          <div className="flex items-center space-x-2">
            <div className="hidden lg:flex items-center space-x-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs">

              {/* Super Admin dashboard — SUPER_ADMIN only */}
              {showSuperAdmin && (
                <Link
                  to="/admin/dashboard"
                  id="nav-super-admin"
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition font-medium ${
                    location.pathname.startsWith('/admin')
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Super Admin</span>
                </Link>
              )}

              {/* Podium Admin dashboard — PODIUM_ADMIN + SUPER_ADMIN */}
              {showPodium && (
                <Link
                  to="/podium/dashboard"
                  id="nav-podium"
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition font-medium ${
                    location.pathname.startsWith('/podium')
                      ? 'bg-rose-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Gavel className="w-3.5 h-3.5" />
                  <span>Podium Admin</span>
                </Link>
              )}

              {/* Team Manager dashboard — TEAM_MANAGER + SUPER_ADMIN */}
              {showManager && (
                <Link
                  to="/manager/dashboard"
                  id="nav-manager"
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition font-medium ${
                    location.pathname.startsWith('/manager')
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Team Manager</span>
                </Link>
              )}

              {/* Player Portal — PLAYER + SUPER_ADMIN */}
              {showPlayerPortal && (
                <Link
                  to="/player/dashboard"
                  id="nav-player"
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition font-medium ${
                    location.pathname.startsWith('/player')
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Player Portal</span>
                </Link>
              )}

              {/* Live Stadium — always visible (Spectators + all roles) */}
              {showLive && (
                <Link
                  to="/live"
                  id="nav-live"
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition font-medium ${
                    location.pathname === '/live'
                      ? 'bg-amber-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Radio className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                  <span>Live Stadium</span>
                </Link>
              )}
            </div>

            {/* User Profile / Logout */}
            {user ? (
              <div className="flex items-center space-x-2 pl-2 border-l border-slate-800">
                <div className="hidden sm:block text-right">
                  <span className="block text-xs font-semibold text-slate-300">{user.name}</span>
                  <span className="block text-[10px] text-slate-500 font-mono uppercase tracking-wide">
                    {user.role?.replace('_', ' ')}
                  </span>
                </div>
                <button
                  id="nav-logout"
                  onClick={logout}
                  title="Logout"
                  className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              // Unauthenticated (Spectator): show Login button
              <Link
                to="/manager/login"
                id="nav-login"
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition shadow-md"
              >
                Login
              </Link>
            )}
          </div>

        </div>
      </div>
    </header>
  );
}
