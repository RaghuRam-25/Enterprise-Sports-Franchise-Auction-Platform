import 'react';
import { Link, useLocation } from 'react-router-dom';
import { Trophy, Radio, Info, Calendar, Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAuction } from '../context/AuctionContext';
import { usePhase } from '../context/PhaseContext';

export default function Navbar({ onOpenMobileSidebar }) {
  const { user } = useAuth();
  const { timerStatus, podiumPlayer, currentBid, formatCurrency, isRegistrationFrozen } = useAuction();
  const { phase } = usePhase();
  const location = useLocation();

  return (
    <header className="sticky top-0 z-40 bg-[#0B0B0B] border-b border-[#222222] backdrop-blur-md">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Hamburgers & Brand */}
          <div className="flex items-center gap-2 min-w-0">
            {/* Hamburger — only visible when authenticated (sidebar present) & small screens */}
            {user && (
              <button
                onClick={onOpenMobileSidebar}
                className="lg:hidden p-2 -ml-1 text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[#151515] rounded-lg transition ui-focus"
                title="Open Menu"
                aria-label="Open Menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            <Link to="/" className="flex items-center space-x-3 group shrink-0">
              <div className="w-9 h-9 rounded-xl bg-[#12200E] border border-[#58D20A]/40 p-0.5 shadow-lg group-hover:scale-105 transition-transform flex items-center justify-center">
                <Trophy className="w-4 h-4 text-[#58D20A]" />
              </div>
              <div className="min-w-0">
                <span className="font-heading font-black text-base tracking-wider text-[#F5F5F5] uppercase whitespace-nowrap">
                  FRANCHISE<span className="text-[#58D20A]">AUCTION</span>
                </span>
                <span className="block text-[9px] tracking-widest text-[#A3A3A3] uppercase font-bold">
                  Enterprise Platform
                </span>
              </div>
            </Link>
          </div>

          {/* Live Auction Ticker Widget */}
          <div className="hidden md:flex items-center gap-3 bg-[#101010] px-3.5 py-1.5 rounded-full border border-[#222222] shadow-inner">
            <span className="relative flex h-2.5 w-2.5">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  timerStatus === 'running' ? 'bg-[#58D20A]' : 'bg-[#F4C542]'
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                  timerStatus === 'running' ? 'bg-[#58D20A]' : 'bg-[#F4C542]'
                }`}
              />
            </span>
            <span className="text-xs font-bold text-[#F5F5F5] uppercase tracking-wide">
              {podiumPlayer ? `On Podium: ${podiumPlayer.name}` : 'Podium Standing By'}
            </span>
            {podiumPlayer && (
              <span className="text-xs font-mono font-extrabold text-[#58D20A] bg-[#12200E] px-2.5 py-0.5 rounded-md border border-[#58D20A]/40">
                {formatCurrency(currentBid)}
              </span>
            )}
          </div>

          {/* Public Top Nav Menu (Only for SPECTATOR / Unauthenticated) */}
          <div className="flex items-center space-x-2 shrink-0">
            {/* User Auth Buttons */}
            {user ? null : (
              <div className="hidden md:flex items-center gap-4">
                {/* Public Navigation */}
                <div className="flex items-center space-x-1 bg-[#101010] p-1 rounded-xl border border-[#222222] text-xs">
                  <Link to="/" className={`px-3 py-1.5 rounded-lg transition font-bold ${location.pathname === '/' ? 'bg-[#12200E] text-[#58D20A] border border-[#58D20A]/40 shadow-sm' : 'text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[#151515]'}`}>
                    Home
                  </Link>
                  <Link to="/live" className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition font-bold ${location.pathname === '/live' ? 'bg-[#12200E] text-[#58D20A] border border-[#58D20A]/40 shadow-sm' : 'text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[#151515]'}`}>
                    <Radio className="w-3.5 h-3.5 text-[#58D20A]" />
                    Live Auction
                  </Link>
                  <Link to="/matches" className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition font-bold ${location.pathname === '/matches' || location.pathname.startsWith('/matches/') ? 'bg-[#12200E] text-[#58D20A] border border-[#58D20A]/40 shadow-sm' : 'text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[#151515]'}`}>
                    <Calendar className="w-3.5 h-3.5" />
                    Tournament
                  </Link>
                  <Link to="/about" className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition font-bold ${location.pathname === '/about' ? 'bg-[#12200E] text-[#58D20A] border border-[#58D20A]/40 shadow-sm' : 'text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[#151515]'}`}>
                    <Info className="w-3.5 h-3.5" />
                    About
                  </Link>
                </div>

                {/* Auth Actions */}
                <div className="flex items-center gap-2">
                  {phase === 'REGISTRATION' && !isRegistrationFrozen && (
                    <Link
                      to="/player/register"
                      className="px-3.5 py-1.5 text-xs font-bold text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[#151515] rounded-xl transition border border-[#222222] ui-focus"
                    >
                      Register
                    </Link>
                  )}
                  <Link
                    to="/login"
                    className="btn-primary"
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
