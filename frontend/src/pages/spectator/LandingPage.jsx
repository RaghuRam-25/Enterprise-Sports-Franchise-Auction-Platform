import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Trophy, Radio, ArrowRight, Zap, Activity, ChevronRight, Lock, ExternalLink, Users, X,
  ArrowUp, ArrowDown, ChevronsUpDown, ShoppingBag
} from 'lucide-react';
import { useAuction } from '../../context/AuctionContext';
import { usePhase } from '../../context/PhaseContext';
import { useAuth, getDashboardForRole } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import TeamBadge from '../../components/common/TeamBadge';
import PlayerCardCard from '../../components/common/PlayerCardCard';
import PlayerDisplayStage from '../../components/auction/PlayerDisplayStage';
import { useAuctionAnimation } from '../../hooks/useAuctionAnimation';
import { getImageUrl } from '../../utils/imageUrl';
import { playerFallback } from '../../utils/playerFallback';
import { getTeamTheme } from '../../utils/themeConfig';
import '../../services/api';

// ── Animated Counter Helper ──────────────────────────────────────────────────
function AnimatedCounter({ value, prefix = '', suffix = '' }) {
  const numericValue = typeof value === 'number' ? value : parseFloat(value) || 0;
  return (
    <motion.span
      key={numericValue}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {prefix}{numericValue.toLocaleString()}{suffix}
    </motion.span>
  );
}




function TeamDetailModal({ team, onClose, players, formatCurrency }) {
  const modalTheme = useMemo(() => (team ? getTeamTheme(team) : null), [team]);

  const rosterPlayerIds = useMemo(() => {
    if (!team?.currentRoster || !Array.isArray(team.currentRoster)) return new Set();
    return new Set(team.currentRoster.map(p => typeof p === 'string' ? p : (p._id || p.id)));
  }, [team]);

  const rosterPlayers = useMemo(() => {
    if (!Array.isArray(players)) return [];
    return players.filter(p => rosterPlayerIds.has(p._id || p.id));
  }, [players, rosterPlayerIds]);

  if (!team) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className={`glass-card rounded-2xl p-6 border ${modalTheme.border} max-w-xl w-full space-y-6 relative max-h-[90vh] overflow-y-auto bg-gradient-to-br ${modalTheme.gradient}`}>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-900 border border-slate-800"
        >
          <X className="w-4 h-4" />
        </button>

        <TeamBadge team={team} size="lg" showManager={true} managerName={team.managerId?.name || team.ownerName} />

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono">
          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase block">Total Purse</span>
            <span className="font-bold text-white">{formatCurrency(team.totalBudget)}</span>
          </div>
          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase block">Purse Left</span>
            <span className={`font-bold ${modalTheme.stat}`}>{formatCurrency(team.remainingBudget)}</span>
          </div>
          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase block">Total Players</span>
            <span className="font-bold text-white">{team.currentRoster?.length || team.currentRosterCount || 0}</span>
          </div>
        </div>

        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-1.5">
            <Users className={`w-4 h-4 ${modalTheme.stat}`} /> Acquired Roster
          </h4>
          {rosterPlayers.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
              {rosterPlayers.map(player => (
                <div key={player._id || player.id} className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="font-bold text-white">{player.name} ({player.primaryPosition || 'Player'})</span>
                  <span className="font-mono text-amber-400 font-bold">{formatCurrency(player.finalPrice || 0)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic bg-slate-950/50 p-4 rounded-xl text-center border border-slate-800">
              No players acquired in auction yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const {
    players,
    teams,
    podiumPlayer,
    currentBid,
    highestBidder,
    biddingMode,
    timerRemaining,
    timerStatus,
    isRegistrationFrozen,
    formatCurrency
  } = useAuction();

  const {
    animState,
    introPlayer,
    winnerData,
    rosterUpdate,
    ANIM_STATES,
    onAnimationComplete,
  } = useAuctionAnimation();

  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const { phase, loading: phaseLoading, isAuctionActive, isTournamentActive } = usePhase();
  const navigate = useNavigate();
  const [selectedTeam, setSelectedTeam] = useState(null);

  // Ready-managers estimate + recent purchases for the live side panel.
  const managersReady = (Array.isArray(teams) ? teams : []).filter(t => !!t.managerId).length;
  const soldPlayers = (Array.isArray(players) ? players : [])
    .filter(p => (p.status || '').toUpperCase() === 'SOLD' && p.soldToTeam)
    .slice()
    .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
    .slice(0, 8);
  const teamNameOf = (soldToTeam) => {
    const tid = soldToTeam?._id || soldToTeam;
    const t = (Array.isArray(teams) ? teams : []).find(x => String(x._id || x.id) === String(tid));
    return t ? t.name : 'Unknown';
  };

  // ── Leaderboard sort state ────────────────────────────────────────────────
  const [sortConfig, setSortConfig] = useState({ key: 'purse', direction: 'desc' });

  const handleSort = (key) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      // Sensible default direction per column: text ascending, numbers descending
      return { key, direction: key === 'name' ? 'asc' : 'desc' };
    });
  };

  const sortedTeamsForLeaderboard = useMemo(() => {
    const list = [...teams];
    const { key, direction } = sortConfig;
    const dir = direction === 'asc' ? 1 : -1;

    list.sort((a, b) => {
      switch (key) {
        case 'name':
          return (a.name || '').localeCompare(b.name || '') * dir;
        case 'purse':
          return ((a.remainingBudget || 0) - (b.remainingBudget || 0)) * dir;
        case 'squad': {
          const sa = a.currentRoster?.length || a.currentRosterCount || 0;
          const sb = b.currentRoster?.length || b.currentRosterCount || 0;
          return (sa - sb) * dir;
        }
        case 'spent': {
          const spentA = (a.totalBudget || 0) - (a.remainingBudget || 0);
          const spentB = (b.totalBudget || 0) - (b.remainingBudget || 0);
          return (spentA - spentB) * dir;
        }
        default:
          return 0;
      }
    });

    return list;
  }, [teams, sortConfig]);

  function SortableHeader({ sortKey, label, className = '' }) {
    const isActive = sortConfig.key === sortKey;
    const Icon = isActive
      ? (sortConfig.direction === 'asc' ? ArrowUp : ArrowDown)
      : ChevronsUpDown;

    return (
      <button
        onClick={() => handleSort(sortKey)}
        className={`flex items-center gap-1 text-slate-500 hover:text-white transition ${isActive ? 'text-slate-200' : ''} ${className}`}
      >
        <span>{label}</span>
        <Icon className="w-3 h-3" />
      </button>
    );
  }

  // Phase is the authoritative source of truth (backend re-verifies on every write).
  // Registration is only truly open in the REGISTRATION phase; the config-store
  // freeze flag acts as a secondary manual override within that phase.
  const registrationOpen = phase === 'REGISTRATION' && !isRegistrationFrozen;

  // If user is already logged in, automatically redirect to their assigned dashboard
  useEffect(() => {
    if (user) {
      navigate(getDashboardForRole(user.role), { replace: true });
    }
  }, [user, navigate]);

  // Request initial state sync on mount, so if auction is live, we see it.
  useEffect(() => {
    if (socket && isConnected) {
      socket.emit('auction:sync-request');
    }
  }, [socket, isConnected]);

  // ── Derived Statistics ──────────────────────────────────────────────────────

  const soldCount = useMemo(() => players.filter(p => p.status === 'SOLD').length, [players]);
  const unsoldCount = useMemo(() => players.filter(p => p.status === 'UNSOLD').length, [players]);

  // Top players showcase (highest base price or sold)
  const topPlayersShowcase = useMemo(() => {
    return [...players]
      .sort((a, b) => (b.soldPrice || b.basePrice || 0) - (a.soldPrice || a.basePrice || 0))
      .slice(0, 4);
  }, [players]);

  // Format countdown clock for active timer
  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen flex flex-col bg-darkBg text-slate-100 relative overflow-clip font-sans selection:bg-emerald-500 selection:text-slate-950">
      <header className="sticky top-0 z-50">
        <Navbar />
      </header>

      {/* ── Ambient Background Glow & Particles ────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-blue-600/15 rounded-full blur-[140px]" />
        <div className="absolute top-1/3 -right-40 w-[600px] h-[600px] bg-emerald-600/15 rounded-full blur-[140px]" />
        <div className="absolute -bottom-40 left-1/3 w-[600px] h-[600px] bg-purple-600/15 rounded-full blur-[140px]" />
      </div>

      <main className="flex-1 relative z-10 space-y-16 pb-20">
        {/* ── HERO SECTION ─────────────────────────────────────────────────── */}
        <section className="relative pt-12 lg:pt-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="text-center space-y-8">

            {/* Enterprise Platform Badge */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/90 border border-slate-800 text-xs font-bold text-emerald-400 shadow-2xl backdrop-blur-md"
            >
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${timerStatus === 'running' ? 'bg-emerald-400' : 'bg-blue-400'
                  }`} />
                <span className={`relative inline-flex rounded-full h-2 w-2 ${timerStatus === 'running' ? 'bg-emerald-500' : 'bg-blue-500'
                  }`} />
              </span>
              <span className="tracking-widest uppercase font-mono">ENTERPRISE SPORTS FRANCHISE AUCTION PLATFORM 2026</span>
            </motion.div>

            {/* Hero Heading */}
            <motion.h1
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="text-4xl sm:text-6xl lg:text-7xl font-black font-heading uppercase tracking-tight text-white max-w-5xl mx-auto leading-[0.95]"
            >
              <i>THE NEXT-GEN <span className="bg-gradient-to-r from-blue-400 via-teal-400 to-emerald-400 bg-clip-text text-transparent">LIVE AUCTION &amp; DRAFT</span> PLATFORM</i>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-base sm:text-lg text-slate-300 max-w-3xl mx-auto font-medium leading-relaxed"
            >
              Real-time serialized bidding engine, dynamic monetary raise logic, blind budget guardrails, and stadium-grade live spectator view.
            </motion.p>

            {/* Quick CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-wrap items-center justify-center gap-4 pt-2"
            >
              <Link
                to="/live"
                className="px-8 py-4 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm uppercase tracking-wider rounded-2xl shadow-xl hover:shadow-emerald-500/20 transition transform hover:-translate-y-0.5 flex items-center gap-2.5"
              >
                <Radio className="w-5 h-5 animate-pulse text-slate-950" />
                <span>ENTER LIVE STADIUM VIEW</span>
              </Link>

              <Link
                to="/teams"
                className="px-8 py-4 bg-slate-900/90 hover:bg-slate-800 text-white border border-slate-700 font-extrabold text-sm uppercase tracking-wider rounded-2xl transition hover:border-slate-500 shadow-xl"
              >
                EXPLORE FRANCHISES
              </Link>

              {registrationOpen ? (
                <Link
                  to="/player/register"
                  className="px-8 py-4 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 font-extrabold text-sm uppercase tracking-wider rounded-2xl transition shadow-xl"
                >
                  PLAYER REGISTRATION
                </Link>
              ) : (
                <span className="px-6 py-4 bg-slate-900/80 text-slate-500 border border-slate-800 font-bold text-xs uppercase tracking-wider rounded-2xl flex items-center gap-2 cursor-not-allowed">
                  <Lock className="w-4 h-4 text-rose-400" />
                  {phase === 'SETUP'
                    ? 'REGISTRATION OPENS SOON'
                    : phase === 'REGISTRATION'
                      ? 'REGISTRATION FROZEN BY ADMIN'
                      : 'REGISTRATION CLOSED'}
                </span>
              )}

              {/* Fan Zone — spectator accounts are ALWAYS open (no approval needed) */}
              <Link
                to="/general/register"
                className="px-8 py-4 bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/40 font-extrabold text-sm uppercase tracking-wider rounded-2xl transition shadow-xl flex items-center gap-2.5"
              >
                <Users className="w-5 h-5" />
                JOIN FAN ZONE
              </Link>
            </motion.div>
          </div>
        </section>

        {/* ── LIVE EVENT STATUS BAR ────────────────────────────────────────── */}
        <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="glass-card rounded-2xl border border-slate-800 p-4 shadow-2xl backdrop-blur-xl">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 divide-y md:divide-y-0 md:divide-x divide-slate-800 text-center">

              {/* Registration Status */}
              <div className="p-2 flex flex-col justify-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Registration</span>
                <span className={`text-sm font-black uppercase mt-1 flex items-center justify-center gap-1.5 ${registrationOpen ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                  <span className={`w-2 h-2 rounded-full ${registrationOpen ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  {registrationOpen ? 'OPEN' : 'CLOSED'}
                </span>
              </div>

              {/* Auction Status */}
              <div className="p-2 flex flex-col justify-center pt-3 md:pt-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Auction Engine</span>
                <span className={`text-sm font-black uppercase mt-1 flex items-center justify-center gap-1.5 ${timerStatus === 'running' ? 'text-emerald-400' :
                  timerStatus === 'paused' ? 'text-amber-400' :
                    'text-blue-400'
                  }`}>
                  <Radio className="w-3.5 h-3.5 animate-pulse" />
                  {timerStatus === 'running' ? 'LIVE' : (timerStatus || 'IDLE').toUpperCase()}
                </span>
              </div>

              {/* Players Registered */}
              <div className="p-2 flex flex-col justify-center pt-3 md:pt-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Registered</span>
                <span className="text-xl font-black font-mono text-white mt-0.5">
                  <AnimatedCounter value={players.length} />
                </span>
              </div>

              {/* Players Sold */}
              <div className="p-2 flex flex-col justify-center pt-3 md:pt-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Sold Squad</span>
                <span className="text-xl font-black font-mono text-emerald-400 mt-0.5">
                  <AnimatedCounter value={soldCount} />
                </span>
              </div>

              {/* Players Unsold */}
              <div className="p-2 flex flex-col justify-center pt-3 lg:pt-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Unsold</span>
                <span className="text-xl font-black font-mono text-amber-400 mt-0.5">
                  <AnimatedCounter value={unsoldCount} />
                </span>
              </div>

              {/* Active Teams */}
              <div className="p-2 flex flex-col justify-center pt-3 lg:pt-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Franchises</span>
                <span className="text-xl font-black font-mono text-blue-400 mt-0.5">
                  <AnimatedCounter value={teams.length} />
                </span>
              </div>

              {/* Spectator Sync */}
              <div className="p-2 flex flex-col justify-center col-span-2 md:col-span-1 pt-3 lg:pt-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">WebSocket Sync</span>
                <span className={`text-sm font-black uppercase mt-1 flex items-center justify-center gap-1.5 ${isConnected ? 'text-emerald-400' : 'text-slate-500'
                  }`}>
                  <Activity className="w-3.5 h-3.5" />
                  {isConnected ? 'ONLINE' : 'POLLING'}
                </span>
              </div>

            </div>
          </div>
        </section>

        {/* ── LIVE AUCTION PREVIEW & FEED SECTION ──────────────────────────── */}
        <section className="px-3 sm:px-4 lg:px-6 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">

            {/* Live Podium Preview Card (8 cols) */}
            <div className="col-span-1 lg:col-span-8 h-full">
              <div className="glass-card rounded-3xl border border-slate-800 p-5 lg:p-6 space-y-4 relative overflow-hidden shadow-2xl h-full flex flex-col">

                {/* Header banner */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-600">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 font-bold">
                      <Radio className="w-4 h-4 animate-spin" />
                    </div>
                    <div>
                      <h2 className="text-base font-black font-heading text-white">LIVE PODIUM STAGE</h2>
                    </div>
                  </div>

                  <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider border ${biddingMode === 'blind'
                      ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    }`}>
                    {biddingMode?.toUpperCase()} MODE
                  </span>
                </div>

                <PlayerDisplayStage
                  className="rounded-2xl overflow-hidden min-h-[140px] sm:min-h-[175px] border border-slate-800 bg-slate-950"
                  animState={animState}
                  ANIM_STATES={ANIM_STATES}
                  introPlayer={introPlayer}
                  winnerData={winnerData}
                  rosterUpdate={rosterUpdate}
                  onAnimationComplete={onAnimationComplete}
                  showWaiting={!podiumPlayer && animState === ANIM_STATES.IDLE}
                  waitingStats={{ teamsConnected: (Array.isArray(teams) ? teams : []).length, managersReady }}
                >
                  {podiumPlayer ? (
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                      {/* Player Image */}
                      <div className="md:col-span-5 text-center">
                        <div className="relative inline-block group">
                          <img
                            src={getImageUrl(podiumPlayer.imageUrl, playerFallback(podiumPlayer.primaryPosition))}
                            alt={podiumPlayer.name}
                            className="w-28 h-28 sm:w-36 sm:h-36 rounded-3xl object-cover border-4 border-emerald-500/30 shadow-2xl mx-auto"
                          />
                        </div>
                      </div>

                      {/* Player Details & Current Bid */}
                      <div className="md:col-span-7 space-y-3">
                        <div>
                          <h3 className="text-xl sm:text-2xl font-black text-white">{podiumPlayer.name}</h3>
                          <p className="text-xs font-mono font-bold text-indigo-400 tracking-wider uppercase mt-0.5">
                            {podiumPlayer.jerseyName ? `# ${podiumPlayer.jerseyName}` : 'DRAFT PARTICIPANT'}
                          </p>
                        </div>

                        {/* Timer & Bid stats */}
                        <div className="grid grid-cols-2 gap-3 bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
                          <div>
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Current High Bid</span>
                            <p className="text-lg sm:text-xl font-black font-mono text-emerald-400">
                              {formatCurrency(currentBid)}
                            </p>
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Clock</span>
                            <p className={`text-lg sm:text-xl font-black font-mono ${timerRemaining <= 10 ? 'text-rose-400 animate-pulse' : 'text-amber-400'}`}>
                              {formatTimer(timerRemaining)}
                            </p>
                          </div>
                        </div>

                        {/* Highest Bidder Franchise */}
                        <div className="flex items-center justify-between text-xs p-2.5 bg-slate-900/50 rounded-xl border border-slate-800">
                          <span className="text-slate-400 font-medium">Leading Franchise:</span>
                          <span className="font-bold text-white font-mono">
                            {highestBidder ? highestBidder.name : 'No bids yet'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Podium Standing By View */
                    <div className="py-8 text-center space-y-3">
                      <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-600">
                        <Trophy className="w-7 h-7 opacity-40 text-amber-500 animate-pulse" />
                      </div>
                      <div>
                        <h3 className="text-base font-black text-slate-300 uppercase tracking-wide">PODIUM STANDING BY</h3>
                        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                          The auctioneer has not pushed a player onto the active bidding table yet. Live video broadcasts &amp; player updates will stream automatically.
                        </p>
                      </div>
                    </div>
                  )}
                </PlayerDisplayStage>

                {/* Footer action button */}
                <div className="pt-2 flex justify-end">
                  <Link
                    to="/live"
                    className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition"
                  >
                    <span>Full Live Stadium Deck</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Dedicated Recent Purchases Panel (4 cols) */}
            <div className="col-span-1 lg:col-span-4 h-full">
              <div className="glass-card rounded-3xl border border-slate-800 p-5 flex flex-col shadow-2xl h-full min-h-[360px]">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <h3 className="text-sm font-black font-heading text-white flex items-center gap-2 uppercase tracking-wider">
                    <ShoppingBag className="w-4 h-4 text-emerald-400" />
                    Recent Purchases
                  </h3>
                  <span className="text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                    {soldPlayers.length} Sold
                  </span>
                </div>

                <div className="mt-4 flex-1 flex flex-col min-h-0">
                  {soldPlayers.length === 0 ? (
                    <div className="text-center text-slate-500 my-auto py-8">
                      <ShoppingBag className="w-8 h-8 mx-auto opacity-30 text-slate-600 mb-2" />
                      <p className="font-bold text-xs text-slate-400">No players sold yet</p>
                      <p className="text-[11px] text-slate-600 mt-1">Live auction draft purchases will stream here automatically.</p>
                    </div>
                  ) : (
                    <ul className="space-y-2.5 overflow-y-auto pr-1 flex-1 custom-scrollbar">
                      {soldPlayers.map((p, idx) => (
                        <li key={p._id || p.id || idx} className="flex items-center justify-between gap-3 text-xs bg-slate-900/80 border border-slate-800/80 hover:border-slate-700 rounded-xl p-2.5 transition">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img src={getImageUrl(p.imageUrl, playerFallback('emerald'))} alt={p.name} className="w-8 h-8 rounded-lg object-cover border border-slate-700 shrink-0" />
                            <div className="min-w-0">
                              <span className="font-bold text-white block truncate">{p.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono block">{p.primaryPosition || 'Player'}</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-emerald-400 font-mono font-black block text-xs">→ {teamNameOf(p.soldToTeam)}</span>
                            <span className="text-[10px] text-slate-400 font-mono block">{formatCurrency(p.finalPrice || p.basePrice || 0)}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── PUBLIC LEADERBOARD ───────────────────────────────────────────── */}
        <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-blue-400">Franchise Standing</span>
            <h2 className="text-2xl font-black font-heading text-white">PUBLIC LEADERBOARD</h2>
          </div>

          <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
            <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-slate-900/80 border-b border-slate-800 text-[10px] font-bold uppercase tracking-widest">
              <div className="col-span-1 text-slate-500">Rank</div>
              <div className="col-span-4">
                <SortableHeader sortKey="name" label="Franchise Team" />
              </div>
              <div className="col-span-5">
                <SortableHeader sortKey="spent" label="Budget Status" />
              </div>
              <div className="col-span-2 text-right">
                <SortableHeader sortKey="squad" label="Squad Size" />
              </div>
            </div>

            <div className="divide-y divide-slate-800/60">
              {teams.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">No teams registered in system yet.</div>
              ) : (
                sortedTeamsForLeaderboard.map((team, idx) => {
                  const rank = idx + 1;
                  const spent = (team.totalBudget || 0) - (team.remainingBudget || 0);
                  const rosterCount = team.currentRoster?.length || team.currentRosterCount || 0;
                  const spentPercentage = team.totalBudget > 0 ? (spent / team.totalBudget) * 100 : 0;
                  const theme = getTeamTheme(team);
                  const rankColor = rank === 1 ? 'text-amber-400' : rank === 2 ? 'text-slate-300' : rank === 3 ? 'text-yellow-600' : 'text-slate-500';

                  return (
                    <div key={team.id || team._id || idx} onClick={() => setSelectedTeam(team)} className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-slate-800/40 transition text-xs cursor-pointer">
                      <div className={`col-span-1 font-mono font-black text-lg flex items-center gap-2 ${rankColor}`}>
                        {rank <= 3 && <Trophy className="w-4 h-4" />}
                        <span>#{rank}</span>
                      </div>
                      <div className="col-span-4">
                        <TeamBadge team={team} size="sm" showManager={false} />
                      </div>
                      <div className="col-span-5">
                        <div className="w-full bg-slate-800/50 rounded-full h-2 border border-slate-700/50 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${theme.accent}`}
                            style={{
                              background: theme.customAccentStyle?.background || undefined,
                              width: `${spentPercentage}%`
                            }}
                          />
                        </div>
                        <div className="flex justify-between mt-1.5 text-[10px] font-mono">
                          <span className="text-emerald-400 font-bold">{formatCurrency(team.remainingBudget)} Left</span>
                          <span className="text-slate-500">{formatCurrency(spent)} Spent</span>
                        </div>
                      </div>
                      <div className="col-span-2 text-right font-mono text-slate-300">{rosterCount} Players</div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>


        {/* ── FRANCHISE TEAM SHOWCASE ──────────────────────────────────────── */}
        <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">Franchise League</span>
              <h2 className="text-2xl font-black font-heading text-white">COMPETING FRANCHISES</h2>
            </div>
            <Link to="/teams" className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1">
              <span>View All Teams</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teams.slice(0, 3).map(team => {
              const id = team._id || team.id;
              const theme = getTeamTheme(team);
              const rosterCount = team.currentRosterCount ?? (team.currentRoster?.length || 0);
              const managerName = team.managerId?.name || team.ownerName || 'Unassigned';

              return (
                <motion.div
                  key={id}
                  onClick={() => setSelectedTeam(team)}
                  whileHover={{ y: -6 }}
                  style={{ ...(theme.customStyle || {}), ...(theme.customBorderStyle || {}) }}
                  className={`group relative overflow-hidden rounded-2xl cursor-pointer h-full transition-all duration-300 hover:shadow-2xl ${theme.ring} ${theme.customStyle ? '' : `border ${theme.border} bg-gradient-to-br ${theme.gradient}`}`}
                >
                  {/* Colored top accent bar */}
                  <div
                    style={theme.customAccentStyle || undefined}
                    className={`h-1 w-full ${theme.accent}`}
                  />

                  <div className="p-5 space-y-4 flex flex-col h-full">
                    {/* Top Team Badge Header */}
                    <div className="flex items-start justify-between gap-3">
                      <TeamBadge team={team} size="md" showManager={true} managerName={managerName} />
                      <span
                        style={theme.customBadgeStyle || undefined}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${theme.badgeBg}`}
                      >
                        {team.shortCode || team.code || 'TEAM'}
                      </span>
                    </div>

                    {/* Purse & Roster Grid */}
                    <div className="grid grid-cols-2 gap-3 text-xs pt-1 flex-grow">
                      <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80">
                        <span className="text-[10px] text-slate-400 font-medium uppercase block">Remaining Purse</span>
                        <span
                          style={theme.customStatStyle || undefined}
                          className={`font-mono font-bold text-xs sm:text-sm mt-0.5 block ${theme.stat}`}
                        >
                          {formatCurrency(team.remainingBudget)}
                        </span>
                      </div>

                      <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80">
                        <span className="text-[10px] text-slate-400 font-medium uppercase block">Squad Count</span>
                        <span className="font-mono font-bold text-white text-xs sm:text-sm mt-0.5 block">
                          {rosterCount} / {team.minRoster || 11} min
                        </span>
                      </div>
                    </div>

                    {/* Click Card Footer */}
                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 group-hover:text-white transition">
                      <span className="font-medium">View Team Profile</span>
                      <ExternalLink
                        style={theme.customStatStyle || undefined}
                        className={`w-3.5 h-3.5 transition ${theme.stat}`}
                      />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>


        {/* ── PLAYER SHOWCASE ─────────────────────────────────────────────── */}
        <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-purple-400">Participant Spotlight</span>
              <h2 className="text-2xl font-black font-heading text-white">FEATURED PLAYERS</h2>
            </div>
            <Link to="/players" className="text-xs font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1">
              <span>Explore Player Directory</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 auto-rows-fr">
            {topPlayersShowcase.map(player => (
              <PlayerCardCard
                key={player.id || player._id}
                player={player}
                formatCurrency={formatCurrency}
                teams={teams}
              />
            ))}
          </div>
        </section>

      </main>

      {/* ── PROFESSIONAL ENTERPRISE FOOTER ───────────────────────────────── */}
      <Footer />

      {selectedTeam && (
        <TeamDetailModal
          team={selectedTeam}
          onClose={() => setSelectedTeam(null)}
          players={players}
          formatCurrency={formatCurrency}
        />
      )}
    </div>
  );
}