import 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Trophy, Radio, LogOut, Sun, Moon, Info, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAuction } from '../context/AuctionContext';
import { useTheme } from '../context/ThemeContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const {  timerStatus, podiumPlayer, currentBid, formatCurrency, isRegistrationFrozen } = useAuction();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 border-b border-slate-800 backdrop-blur-md">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Brand Logo & Name */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-emerald-400 p-0.5 shadow-lg group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Trophy className="w-4 h-4 text-emerald-400" />
              </div>
            </div>
            <div>
              <span className="font-heading font-black text-base tracking-wider bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent uppercase">
                FRANCHISE<span className="text-emerald-400">AUCTION</span>
              </span>
              <span className="block text-[9px] tracking-widest text-slate-400 uppercase font-semibold">
                Enterprise Platform
              </span>
            </div>
          </Link>

          {/* Live Auction Ticker Widget */}
          <div className="hidden md:flex items-center gap-3 bg-slate-950/80 px-3.5 py-1 rounded-full border border-slate-800 shadow-inner">
            <span className="relative flex h-2.5 w-2.5">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${timerStatus === 'running' ? 'bg-emerald-400' : 'bg-amber-400'
                  }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2.5 w-2.5 ${timerStatus === 'running' ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
              />
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

          {/* Public Top Nav Menu (Only for SPECTATOR / Unauthenticated) */}
          <div className="flex items-center space-x-2">
            {/* User Auth Buttons */}
            {user ? (
              <div className="flex items-center space-x-2 pl-2 border-l border-slate-800">
                <div className="hidden sm:block text-right">
                  <span className="block text-xs font-semibold text-slate-200">{user.name}</span>
                  <span className="block text-[10px] text-blue-400 font-mono uppercase tracking-wide font-bold">
                    {user.role?.replace('_', ' ')}
                  </span>
                </div>
                <button
                  onClick={() => {
                    logout();
                    navigate('/login');
                  }}
                  title="Logout"
                  className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition ui-focus"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-4">
                {/* Public Navigation */}
                <div className="flex items-center space-x-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs">
                  <Link to="/" className={`px-3 py-1.5 rounded-lg transition font-semibold ${location.pathname === '/' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'}`}>
                    Home
                  </Link>
                  <Link to="/live" className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition font-semibold ${location.pathname === '/live' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'}`}>
                    <Radio className="w-3.5 h-3.5" />
                    Live Auction
                  </Link>
                  <Link to="/matches" className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition font-semibold ${location.pathname === '/matches' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'}`}>
                    <Shield className="w-3.5 h-3.5" />
                    Matches
                  </Link>
                  <Link to="/about" className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition font-semibold ${location.pathname === '/about' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'}`}>
                    <Info className="w-3.5 h-3.5" />
                    About
                  </Link>
                </div>

                {/* Theme Toggle Button */}
                <button
                  onClick={toggleTheme}
                  title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                  className="p-2 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-xl transition border border-slate-800 ui-focus"
                >
                  {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
                </button>

                {/* Auth Actions */}
                <div className="flex items-center gap-2">
                  {!isRegistrationFrozen && (
                    <Link
                      to="/player/register"
                      className="px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition border border-slate-800 ui-focus"
                    >
                      Register
                    </Link>
                  )}
                  <Link
                    to="/login"
                    className="ui-btn px-4 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition shadow-lg ui-focus"
                  >
                    Login
                  </Link>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
}
