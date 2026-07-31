import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Trophy, Shield, Gavel, Users, User, Radio, LogOut, CheckCircle2, AlertTriangle, Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAuction } from '../context/AuctionContext';
import { useTheme } from '../context/ThemeContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { lastActionToast, timerStatus, podiumPlayer, currentBid, formatCurrency, isRegistrationFrozen } = useAuction();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

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

          {/* Navigation Toolbar per PRD */}
          <div className="flex items-center space-x-2">
            <div className="hidden md:flex items-center space-x-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs">

              {/* 1. Home */}
              <Link
                to="/"
                id="nav-home"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition font-semibold ${
                  location.pathname === '/'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <span>Home</span>
              </Link>

              {/* 2. Teams */}
              <Link
                to="/teams"
                id="nav-teams"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition font-semibold ${
                  location.pathname === '/teams'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-blue-400" />
                <span>Teams</span>
              </Link>

              {/* 3. Players */}
              <Link
                to="/players"
                id="nav-players"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition font-semibold ${
                  location.pathname === '/players'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <User className="w-3.5 h-3.5 text-purple-400" />
                <span>Players</span>
              </Link>

              {/* 4. Live */}
              <Link
                to="/live"
                id="nav-live"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition font-semibold ${
                  location.pathname === '/live'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span>Live</span>
              </Link>

              {/* 5. Register (Only for Players when Registration is Open & Not logged in) */}
              {!user && !isRegistrationFrozen && (
                <Link
                  to="/player/register"
                  id="nav-register"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition font-semibold ${
                    location.pathname === '/player/register'
                      ? 'bg-amber-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <span>Register</span>
                </Link>
              )}

            </div>

            {/* Theme Toggle Button (Light/Dark Mode) */}
            <button
              onClick={toggleTheme}
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className="p-2 text-slate-400 hover:text-amber-400 hover:bg-slate-800/80 rounded-xl transition border border-slate-800"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
            </button>

            {/* Single Login / Logout Button */}
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
              // Single Login Button for guest users
              <Link
                to="/login"
                id="nav-login"
                className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition shadow-lg"
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
