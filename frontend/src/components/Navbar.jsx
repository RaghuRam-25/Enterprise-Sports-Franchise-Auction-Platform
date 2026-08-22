import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Trophy, Info, User, Home, Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAuction } from '../context/AuctionContext';

export default function Navbar({ onOpenMobileSidebar }) {
  const { user } = useAuth();
  const { podiumPlayer } = useAuction();
  const location = useLocation();

  // Determine if current route is a public spectator route
  const publicRoutes = ['/', '/live', '/matches', '/matches/schedule', '/matches/table', '/matches/stats', '/teams', '/about', '/players'];
  const isSpectatorRoute = publicRoutes.some(path => 
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)
  );

  const showSpectatorLinks = !user || isSpectatorRoute;

  return (
    <header className="sticky top-0 z-50 bg-[#08090b]/95 border-b border-white/10 backdrop-blur-xl shadow-2xl">
      <div className="w-full px-4 sm:px-5">
        <div className="flex items-center justify-between h-16">

          {/* Left Brand Logo & Mobile Menu Toggle */}
          <div className="flex items-center gap-3 min-w-0">
            <Link to="/" className="flex items-center space-x-3 group shrink-0">
              <div className="w-10 h-10 rounded-xl bg-[#12200E] border border-[#58D20A]/50 p-0.5 shadow-[0_0_15px_rgba(88,210,10,0.25)] group-hover:scale-105 transition-transform flex items-center justify-center">
                <span className="text-lg">⚽</span>
              </div>
              <div className="min-w-0">
                <span className="font-black text-base tracking-wider text-white uppercase whitespace-nowrap block">
                  FRANCHISE<span className="text-[#58D20A]">AUCTION</span>
                </span>
                <span className="block text-[9px] tracking-widest text-slate-400 uppercase font-bold">
                  ENTERPRISE PLATFORM
                </span>
              </div>
            </Link>

            {user && (
              <button
                onClick={onOpenMobileSidebar}
                className="lg:hidden p-2 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-xl transition"
                title="Open Menu"
                aria-label="Open Menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Right Navigation Menu (Matching the green pill active style from image) */}
          <div className="flex items-center space-x-3">
            {showSpectatorLinks ? (
              <nav className="hidden md:flex items-center gap-1.5 bg-[#0c0d10] p-1.5 rounded-2xl border border-white/10 text-xs font-bold shadow-xl">
                
                {/* Home / Overview */}
                <Link
                  to="/"
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl transition-all ${
                    location.pathname === '/'
                      ? 'bg-[#58D20A] text-[#050505] font-extrabold shadow-[0_0_18px_rgba(88,210,10,0.45)]'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Home className="w-3.5 h-3.5" />
                  <span>Home</span>
                </Link>

                {/* Tournament */}
                <Link
                  to="/matches"
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl transition-all ${
                    location.pathname.startsWith('/matches')
                      ? 'bg-[#58D20A] text-[#050505] font-extrabold shadow-[0_0_18px_rgba(88,210,10,0.45)]'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Trophy className="w-3.5 h-3.5" />
                  <span>Tournament</span>
                </Link>

                {/* About */}
                <Link
                  to="/about"
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl transition-all ${
                    location.pathname === '/about'
                      ? 'bg-[#58D20A] text-[#050505] font-extrabold shadow-[0_0_18px_rgba(88,210,10,0.45)]'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Info className="w-3.5 h-3.5" />
                  <span>About</span>
                </Link>

              </nav>
            ) : null}

            {/* Auth Action */}
            {!user ? (
              <Link
                to="/login"
                className="px-5 py-2 bg-[#58D20A] hover:bg-[#68e21a] text-[#050505] font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-[0_0_20px_rgba(88,210,10,0.35)] transition flex items-center gap-1.5"
              >
                <User className="w-3.5 h-3.5" />
                <span>LOGIN</span>
              </Link>
            ) : null}

          </div>

        </div>
      </div>
    </header>
  );
}
