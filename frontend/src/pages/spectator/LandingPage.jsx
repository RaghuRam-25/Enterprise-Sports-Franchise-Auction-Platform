import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy, Radio, Shield, Users, ArrowRight, Zap, Sparkles,
  UserCheck, UserX, Clock, CheckCircle2, AlertTriangle, Activity,
  TrendingUp, Award, DollarSign, Calendar, ChevronRight, Play,
  Pause, RotateCcw, Flame, Target, Star, ExternalLink, Lock
} from 'lucide-react';
import { useAuction } from '../../context/AuctionContext';
import { useAuth, getDashboardForRole } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import api from '../../services/api';

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
    bidHistory,
    isRegistrationFrozen,
    formatCurrency,
    isDataLoading
  } = useAuction();

  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const navigate = useNavigate();

  // If user is already logged in, automatically redirect to their assigned dashboard
  useEffect(() => {
    if (user) {
      navigate(getDashboardForRole(user.role), { replace: true });
    }
  }, [user, navigate]);

  // ── Live Activity Stream state ──────────────────────────────────────────────
  const [activities, setActivities] = useState([
    { id: 1, type: 'SYSTEM', text: 'Real-time Socket.io Draft Engine Initialized', time: 'Just now', icon: Activity, color: 'text-blue-400' },
    { id: 2, type: 'AUCTION', text: 'Auction Session #2026 Ready', time: '1m ago', icon: Trophy, color: 'text-amber-400' }
  ]);

  // Synchronize WebSocket activity feed
  useEffect(() => {
    if (!socket) return;

    const handleNewBid = (data) => {
      const teamName = data.highestBidder?.name || 'Franchise';
      const amount = data.currentBid ? formatCurrency(data.currentBid) : '';
      setActivities(prev => [
        {
          id: Date.now(),
          type: 'BID',
          text: `New ${data.mode || 'Normal'} Bid: ${amount} by ${teamName}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          icon: Zap,
          color: 'text-emerald-400'
        },
        ...prev.slice(0, 7)
      ]);
    };

    const handlePlayerLaunched = (state) => {
      const playerName = state.podiumPlayer?.name || 'Player';
      setActivities(prev => [
        {
          id: Date.now(),
          type: 'LAUNCH',
          text: `Player Pushed to Podium: ${playerName}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          icon: Radio,
          color: 'text-blue-400'
        },
        ...prev.slice(0, 7)
      ]);
    };

    const handleCompleted = (data) => {
      setActivities(prev => [
        {
          id: Date.now(),
          type: 'SOLD',
          text: `Hammer Down! ${data.player?.name || 'Player'} Sold to ${data.winner?.name || 'Franchise'}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          icon: Trophy,
          color: 'text-amber-400'
        },
        ...prev.slice(0, 7)
      ]);
    };

    socket.on('auction:new-bid', handleNewBid);
    socket.on('auction:player-launched', handlePlayerLaunched);
    socket.on('auction:completed', handleCompleted);

    return () => {
      socket.off('auction:new-bid', handleNewBid);
      socket.off('auction:player-launched', handlePlayerLaunched);
      socket.off('auction:completed', handleCompleted);
    };
  }, [socket, formatCurrency]);

  // ── Derived Statistics ──────────────────────────────────────────────────────
  const totalPurse = useMemo(() => teams.reduce((acc, t) => acc + (t.totalBudget || 0), 0), [teams]);
  const totalSpent = useMemo(() => teams.reduce((acc, t) => acc + ((t.totalBudget || 0) - (t.remainingBudget || 0)), 0), [teams]);
  const registeredCount = useMemo(() => players.filter(p => p.status === 'REGISTERED').length, [players]);
  const soldCount = useMemo(() => players.filter(p => p.status === 'SOLD').length, [players]);
  const unsoldCount = useMemo(() => players.filter(p => p.status === 'UNSOLD').length, [players]);

  const highestSoldPlayer = useMemo(() => {
    const sold = players.filter(p => p.status === 'SOLD' && p.soldPrice);
    if (sold.length === 0) return null;
    return sold.reduce((prev, current) => (prev.soldPrice > current.soldPrice) ? prev : current, sold[0]);
  }, [players]);

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
    <div className="min-h-screen flex flex-col bg-darkBg text-slate-100 relative overflow-hidden font-sans selection:bg-emerald-500 selection:text-slate-950">
      <Navbar />

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
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  timerStatus === 'running' ? 'bg-emerald-400' : 'bg-blue-400'
                }`} />
                <span className={`relative inline-flex rounded-full h-2 w-2 ${
                  timerStatus === 'running' ? 'bg-emerald-500' : 'bg-blue-500'
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
              THE NEXT-GEN <span className="bg-gradient-to-r from-blue-400 via-teal-400 to-emerald-400 bg-clip-text text-transparent">LIVE AUCTION &amp; DRAFT</span> PLATFORM
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

              {!isRegistrationFrozen ? (
                <Link
                  to="/player/register"
                  className="px-8 py-4 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 font-extrabold text-sm uppercase tracking-wider rounded-2xl transition shadow-xl"
                >
                  PLAYER REGISTRATION
                </Link>
              ) : (
                <span className="px-6 py-4 bg-slate-900/80 text-slate-500 border border-slate-800 font-bold text-xs uppercase tracking-wider rounded-2xl flex items-center gap-2 cursor-not-allowed">
                  <Lock className="w-4 h-4 text-rose-400" /> REGISTRATION FROZEN BY ADMIN
                </span>
              )}
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
                <span className={`text-sm font-black uppercase mt-1 flex items-center justify-center gap-1.5 ${
                  isRegistrationFrozen ? 'text-rose-400' : 'text-emerald-400'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${isRegistrationFrozen ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                  {isRegistrationFrozen ? 'FROZEN' : 'OPEN'}
                </span>
              </div>

              {/* Auction Status */}
              <div className="p-2 flex flex-col justify-center pt-3 md:pt-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Auction Engine</span>
                <span className={`text-sm font-black uppercase mt-1 flex items-center justify-center gap-1.5 ${
                  timerStatus === 'running' ? 'text-emerald-400' :
                  timerStatus === 'paused'  ? 'text-amber-400' :
                  'text-blue-400'
                }`}>
                  <Radio className="w-3.5 h-3.5 animate-pulse" />
                  {timerStatus === 'running' ? 'LIVE' : timerStatus.toUpperCase()}
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
                <span className={`text-sm font-black uppercase mt-1 flex items-center justify-center gap-1.5 ${
                  isConnected ? 'text-emerald-400' : 'text-slate-500'
                }`}>
                  <Activity className="w-3.5 h-3.5" />
                  {isConnected ? 'ONLINE' : 'POLLING'}
                </span>
              </div>

            </div>
          </div>
        </section>

        {/* ── LIVE AUCTION PREVIEW & FEED SECTION ──────────────────────────── */}
        <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Live Podium Preview Card (8 cols) */}
            <div className="lg:col-span-8">
              <div className="glass-card rounded-3xl border border-slate-800 p-6 lg:p-8 space-y-6 relative overflow-hidden shadow-2xl">
                
                {/* Header banner */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 font-bold">
                      <Radio className="w-5 h-5 animate-spin" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black font-heading text-white">LIVE PODIUM STAGE</h2>
                      <p className="text-xs text-slate-400">Real-time auctioneer broadcast &amp; synchronized bidding status</p>
                    </div>
                  </div>

                  <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider border ${
                    biddingMode === 'blind'
                      ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  }`}>
                    {biddingMode?.toUpperCase()} MODE
                  </span>
                </div>

                {podiumPlayer ? (
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                    {/* Player Image */}
                    <div className="md:col-span-5 text-center">
                      <div className="relative inline-block group">
                        <img
                          src={podiumPlayer.imageUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80'}
                          alt={podiumPlayer.name}
                          className="w-48 h-48 md:w-56 md:h-56 rounded-2xl object-cover border-4 border-slate-700 shadow-2xl mx-auto"
                        />
                        <div className="absolute -bottom-3 inset-x-0 flex justify-center">
                          <span className="bg-slate-950/90 text-amber-400 border border-amber-500/40 text-xs font-extrabold px-3 py-1 rounded-full shadow-lg">
                            {podiumPlayer.category || 'B Grade'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Player Details & Current Bid */}
                    <div className="md:col-span-7 space-y-4">
                      <div>
                        <h3 className="text-2xl sm:text-3xl font-black text-white">{podiumPlayer.name}</h3>
                        <p className="text-xs font-mono font-bold text-indigo-400 tracking-wider uppercase mt-0.5">
                          {podiumPlayer.jerseyName ? `# ${podiumPlayer.jerseyName}` : 'DRAFT PARTICIPANT'}
                        </p>
                      </div>

                      {/* Timer & Bid stats */}
                      <div className="grid grid-cols-2 gap-3 bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
                        <div>
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Current High Bid</span>
                          <p className="text-xl sm:text-2xl font-black font-mono text-emerald-400">
                            {formatCurrency(currentBid)}
                          </p>
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Clock</span>
                          <p className={`text-xl sm:text-2xl font-black font-mono ${timerRemaining <= 10 ? 'text-rose-400 animate-pulse' : 'text-amber-400'}`}>
                            {formatTimer(timerRemaining)}
                          </p>
                        </div>
                      </div>

                      {/* Highest Bidder Franchise */}
                      <div className="flex items-center justify-between text-xs p-3 bg-slate-900/50 rounded-xl border border-slate-800">
                        <span className="text-slate-400 font-medium">Leading Franchise:</span>
                        <span className="font-bold text-white font-mono">
                          {highestBidder ? highestBidder.name : 'No bids yet'}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Podium Standing By View */
                  <div className="py-12 text-center space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-600">
                      <Trophy className="w-8 h-8 opacity-40" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-300 uppercase tracking-wide">PODIUM STANDING BY</h3>
                      <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                        The auctioneer has not pushed a player onto the active bidding table yet. Live updates will stream automatically.
                      </p>
                    </div>
                  </div>
                )}

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

            {/* Live Activity Feed (4 cols) */}
            <div className="lg:col-span-4">
              <div className="glass-card rounded-3xl border border-slate-800 p-6 h-full flex flex-col justify-between shadow-2xl">
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <h3 className="text-sm font-black font-heading text-white flex items-center gap-2">
                      <Activity className="w-4 h-4 text-blue-400" />
                      LIVE FEED STREAM
                    </h3>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      SYNC
                    </span>
                  </div>

                  {/* Feed Items */}
                  <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
                    {activities.map(item => {
                      const Icon = item.icon || Activity;
                      return (
                        <div key={item.id} className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/80 text-xs space-y-1">
                          <div className="flex items-center justify-between text-[10px] text-slate-500">
                            <span className={`font-mono font-bold uppercase ${item.color}`}>{item.type}</span>
                            <span>{item.time}</span>
                          </div>
                          <p className="text-slate-300 font-medium text-xs leading-snug">{item.text}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-500 text-center">
                  Socket.io real-time broadcast active
                </div>
              </div>
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
            {teams.slice(0, 6).map(team => {
              const spent = (team.totalBudget || 0) - (team.remainingBudget || 0);
              const roster = Array.isArray(team.currentRoster) ? team.currentRoster : [];
              return (
                <motion.div
                  key={team.id || team._id}
                  whileHover={{ y: -4 }}
                  className="glass-card glass-card-hover rounded-2xl p-6 border border-slate-800 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {team.logoUrl ? (
                        <img src={team.logoUrl} alt={team.name} className="w-12 h-12 rounded-xl object-cover border border-slate-700" />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white font-black text-lg">
                          {(team.shortCode || team.name || 'T')[0]}
                        </div>
                      )}
                      <div>
                        <h3 className="font-black text-white text-lg">{team.name}</h3>
                        <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          {team.shortCode}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Purse Left</span>
                      <p className="font-mono font-bold text-emerald-400 text-sm">{formatCurrency(team.remainingBudget)}</p>
                    </div>
                  </div>

                  {/* Budget bar */}
                  <div className="space-y-1">
                    <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full"
                        style={{ width: `${Math.min(100, (spent / (team.totalBudget || 1)) * 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                      <span>Spent: {formatCurrency(spent)}</span>
                      <span>Squad: {roster.length}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* ── PUBLIC LEADERBOARD ───────────────────────────────────────────── */}
        <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-blue-400">Franchise Standing</span>
            <h2 className="text-2xl font-black font-heading text-white">PUBLIC LEADERBOARD</h2>
          </div>

          <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
            <div className="grid grid-cols-12 gap-4 px-6 py-3.5 bg-slate-900/80 border-b border-slate-800 text-[10px] font-bold uppercase tracking-widest text-slate-500">
              <div className="col-span-1">Rank</div>
              <div className="col-span-4">Franchise Team</div>
              <div className="col-span-3">Purse Remaining</div>
              <div className="col-span-2">Squad Size</div>
              <div className="col-span-2 text-right">Spent</div>
            </div>

            <div className="divide-y divide-slate-800/60">
              {teams.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">No teams registered in system yet.</div>
              ) : (
                [...teams]
                  .sort((a, b) => (b.currentRoster?.length || 0) - (a.currentRoster?.length || 0))
                  .map((team, idx) => {
                    const spent = (team.totalBudget || 0) - (team.remainingBudget || 0);
                    return (
                      <div key={team.id || team._id || idx} className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-slate-800/30 transition text-xs">
                        <div className="col-span-1 font-mono font-black text-slate-400">#{idx + 1}</div>
                        <div className="col-span-4 font-bold text-white flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-400" />
                          {team.name}
                        </div>
                        <div className="col-span-3 font-mono font-bold text-emerald-400">{formatCurrency(team.remainingBudget)}</div>
                        <div className="col-span-2 font-mono text-slate-300">{team.currentRoster?.length || 0} Players</div>
                        <div className="col-span-2 text-right font-mono text-slate-400">{formatCurrency(spent)}</div>
                      </div>
                    );
                  })
              )}
            </div>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {topPlayersShowcase.map(player => (
              <div key={player.id || player._id} className="glass-card glass-card-hover rounded-2xl border border-slate-800 p-5 space-y-3">
                <div className="flex items-center gap-3">
                  {player.imageUrl ? (
                    <img src={player.imageUrl} alt={player.name} className="w-12 h-12 rounded-xl object-cover border border-slate-700" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white font-black text-base">
                      {(player.name || 'P')[0]}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-white text-sm truncate">{player.name}</h3>
                    <p className="text-[10px] text-slate-400">{player.primaryPosition || 'Player'}</p>
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-800">
                  <span className="text-slate-500 font-medium">{player.category || 'B Grade'}</span>
                  <span className="font-mono font-bold text-amber-400">
                    {formatCurrency(player.soldPrice || player.basePrice || 2000000)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

      </main>

      {/* ── PROFESSIONAL ENTERPRISE FOOTER ───────────────────────────────── */}
      <Footer />
    </div>
  );
}
