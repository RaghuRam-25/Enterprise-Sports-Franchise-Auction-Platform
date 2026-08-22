import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Trophy, Radio, ArrowRight, Zap, Activity, ChevronRight, Lock, ExternalLink, Users, X,
  ArrowUp, ArrowDown, ChevronsUpDown, ShoppingBag, Calendar, Shield, Clock, Coins, UserCheck,
  ChevronLeft, Eye, Flag
} from 'lucide-react';
import { useAuction } from '../../context/AuctionContext';
import { usePhase } from '../../context/PhaseContext';
import { useAuth, getDashboardForRole } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import WaitingForAuction from '../../components/WaitingForAuction';
import TeamBadge from '../../components/common/TeamBadge';
import TeamDetailModal from '../../components/common/TeamDetailModal';
import LandingLiveStageCard from '../../components/LandingLiveStageCard';
import PlayerCardCard from '../../components/common/PlayerCardCard';
import PlayerDisplayStage from '../../components/auction/PlayerDisplayStage';
import { useAuctionAnimation } from '../../hooks/useAuctionAnimation';
import { WaitingAnimation } from '../../components/auction';
import EmbeddedVideoPlayer from '../../components/auction/EmbeddedVideoPlayer';
import { getImageUrl } from '../../utils/imageUrl';
import { playerFallback } from '../../utils/playerFallback';
import { getTeamTheme } from '../../utils/themeConfig';
import { isInAuctionPool, computeMinimumPlayersPerTeam } from '../../utils/biddingEligibility';
import '../../services/api';

// ── Team Color Readability Guard ─────────────────────────────────────────────
// Teams may set any primaryColor in DB — including near-black values. Dark
// accents are unreadable as text on dark cards, so they are auto-lightened
// (blended toward white) until they pass a minimum luminance threshold.
function hexLuminance({ r, g, b }) {
  const lin = (v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function ensureReadableHex(hex, minLum = 0.22) {
  try {
    const raw = String(hex || '').replace('#', '');
    const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
    let { r, g, b } = {
      r: parseInt(full.slice(0, 2), 16) || 88,
      g: parseInt(full.slice(2, 4), 16) || 210,
      b: parseInt(full.slice(4, 6), 16) || 10,
    };
    let lum = hexLuminance({ r, g, b });
    let guard = 0;
    while (lum < minLum && guard < 6) {
      r = Math.round(r + (255 - r) * 0.3);
      g = Math.round(g + (255 - g) * 0.3);
      b = Math.round(b + (255 - b) * 0.3);
      lum = hexLuminance({ r, g, b });
      guard += 1;
    }
    return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
  } catch {
    return '#58D20A';
  }
}

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

// ── Mock Initial Fallback Teams if DB is empty ──────────────────────────────
const DEMO_TEAMS = [
  { _id: 't1', id: 't1', name: 'TEAM PHOENIX', shortCode: 'PHX', totalBudget: 20000, remainingBudget: 12500, currentRoster: Array(7).fill({}), currentRosterCount: 7, highestPurchase: 2100, primaryColor: '#58D20A', secondaryColor: '#12200E' },
  { _id: 't2', id: 't2', name: 'TEAM TITANS', shortCode: 'TTN', totalBudget: 20000, remainingBudget: 11300, currentRoster: Array(6).fill({}), currentRosterCount: 6, highestPurchase: 1800, primaryColor: '#22d3ee', secondaryColor: '#08252b' },
  { _id: 't3', id: 't3', name: 'TEAM WARRIORS', shortCode: 'WRR', totalBudget: 20000, remainingBudget: 10800, currentRoster: Array(6).fill({}), currentRosterCount: 6, highestPurchase: 1450, primaryColor: '#34d399', secondaryColor: '#0a2419' },
  { _id: 't4', id: 't4', name: 'TEAM LEGENDS', shortCode: 'LGD', totalBudget: 20000, remainingBudget: 11000, currentRoster: Array(6).fill({}), currentRosterCount: 6, highestPurchase: 950, primaryColor: '#f4c542', secondaryColor: '#1f1a08' },
];

const DEMO_RECENT_PURCHASES = [
  { id: 'p1', name: 'TANVIR HASAN', primaryPosition: 'GK', department: 'CSE', year: '3rd Year', soldToTeam: 'TEAM TITANS', finalPrice: 1800, timeAgo: '2m ago' },
  { id: 'p2', name: 'SABBIR RAHMAN', primaryPosition: 'CB', department: 'EEE', year: '2nd Year', soldToTeam: 'TEAM WARRIORS', finalPrice: 1200, timeAgo: '5m ago' },
  { id: 'p3', name: 'ARAFAT JAMAN', primaryPosition: 'RW', department: 'CSE', year: '1st Year', soldToTeam: 'TEAM LEGENDS', finalPrice: 950, timeAgo: '7m ago' },
  { id: 'p4', name: 'MEHEDI HASAN', primaryPosition: 'CDM', department: 'CSE', year: '2nd Year', soldToTeam: 'TEAM PHOENIX', finalPrice: 800, timeAgo: '9m ago' },
  { id: 'p5', name: 'RIFAT AHMED', primaryPosition: 'ST', department: 'CSE', year: '3rd Year', soldToTeam: 'TEAM TITANS', finalPrice: 1500, timeAgo: '11m ago' },
];

export default function LandingPage() {
  const {
    players,
    teams: dbTeams,
    categories,
    podiumPlayer,
    currentBid,
    highestBidder,
    biddingMode,
    timerRemaining,
    timerStatus,
    isRegistrationFrozen,
    formatCurrency,
    broadcastVideoUrl,
    videoBroadcastState,
    introLoopState,
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
  const { phase, isAuctionActive, isTournamentActive, getActiveScheduleMilestone } = usePhase();
  const navigate = useNavigate();
  const [selectedTeam, setSelectedTeam] = useState(null);

  // Teams fallback to demo teams if db is empty so UI matches design aesthetic
  const teams = useMemo(() => {
    if (Array.isArray(dbTeams) && dbTeams.length > 0) return dbTeams;
    return DEMO_TEAMS;
  }, [dbTeams]);

  // ── Minimum Player Requirement (same formula as backend biddingRules.js) ────
  // floor(total auction players ÷ total teams). Falls back to the demo
  // aesthetic value of 10 only when no real league data exists yet.
  const minimumPlayersPerTeam = useMemo(() => {
    const poolCount = (Array.isArray(players) ? players : []).filter(isInAuctionPool).length;
    const teamCount = Array.isArray(dbTeams) ? dbTeams.length : 0;
    return computeMinimumPlayersPerTeam(teamCount, poolCount) || 10;
  }, [players, dbTeams]);

  // Displayed recent purchases
  const soldPlayers = useMemo(() => {
    const fromDb = (Array.isArray(players) ? players : [])
      .filter(p => (p.status || '').toUpperCase() === 'SOLD' && p.soldToTeam)
      .slice()
      .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
    
    if (fromDb.length > 0) return fromDb;
    return DEMO_RECENT_PURCHASES;
  }, [players]);

  const teamNameOf = (soldToTeam) => {
    if (typeof soldToTeam === 'string') return soldToTeam;
    const tid = soldToTeam?._id || soldToTeam;
    const t = teams.find(x => String(x._id || x.id) === String(tid));
    return t ? t.name : (soldToTeam?.name || 'TEAM TITANS');
  };

  const registrationOpen = phase === 'REGISTRATION' && !isRegistrationFrozen;

  // Auto redirect logged in users
  useEffect(() => {
    if (user) {
      navigate(getDashboardForRole(user.role), { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    if (socket && isConnected) {
      socket.emit('auction:sync-request');
    }
  }, [socket, isConnected]);

  // Dynamic backend stats calculations
  const soldPlayersList = useMemo(() => {
    return (Array.isArray(players) ? players : [])
      .filter(p => (p.status || '').toUpperCase() === 'SOLD' && p.soldToTeam);
  }, [players]);

  const soldCount = useMemo(() => soldPlayersList.length, [soldPlayersList]);
  const registeredCount = useMemo(() => players.length || 80, [players]);
  
  const totalBidsCount = useMemo(() => {
    const fromBids = (Array.isArray(players) ? players : []).reduce((acc, p) => acc + (Array.isArray(p.bidHistory) ? p.bidHistory.length : 0), 0);
    return fromBids > 0 ? fromBids : 342;
  }, [players]);

  const totalSpentAmount = useMemo(() => {
    return soldPlayersList.reduce((sum, p) => sum + (p.finalPrice || p.soldPrice || 0), 0);
  }, [soldPlayersList]);

  // Auction Start Countdown
  const [nowTs, setNowTs] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Dynamic milestone countdown
  const milestone = getActiveScheduleMilestone ? getActiveScheduleMilestone() : null;

  const countdown = useMemo(() => {
    const targetIso = milestone?.time;
    if (!targetIso) return null;
    const targetMs = new Date(targetIso).getTime();
    if (isNaN(targetMs)) return null;
    const diff = targetMs - nowTs;
    return {
      label: milestone.label,
      started: diff <= 0,
      days: Math.max(0, Math.floor(diff / 86400000)),
      hours: Math.max(0, Math.floor((diff % 86400000) / 3600000)),
      mins: Math.max(0, Math.floor((diff % 3600000) / 60000)),
      secs: Math.max(0, Math.floor((diff % 60000) / 1000)),
      targetMs,
    };
  }, [milestone, nowTs]);

  const eventDateLabel = countdown
    ? `${new Date(countdown.targetMs).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()} | ${new Date(countdown.targetMs).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
    : '22 MAY 2026 | 10:00 AM';

  const liveCurrentBid = currentBid || 2600;
  const liveBasePrice = podiumPlayer?.basePrice || 1000;
  const livePlayerName = podiumPlayer?.name || 'RIYAD HOSSAIN';
  const livePlayerPos = podiumPlayer?.primaryPosition || 'MIDFIELDER';
  const livePlayerDept = podiumPlayer?.department || 'CSE';
  const livePlayerYear = podiumPlayer?.year || '2nd Year';

  // ── Live broadcast surfaces (pushed live from Podium Admin) ────────────────
  // Priority mirrors the Podium spotlight: Video Control stream → Player
  // Intro Sequence → Live player on stage → Waiting scene. Whatever the
  // podium pushes, spectators see it here — and the LIVE NOW / WATCH LIVE
  // pills appear for every case.
  const introPlayers = Array.isArray(introLoopState?.players) ? introLoopState.players : [];
  const isBroadcastingVideo = Boolean(broadcastVideoUrl);
  const isIntroLooping = Boolean(introLoopState?.isPlaying) && introPlayers.length > 0;
  const introCurrentPlayer = isIntroLooping
    ? (introPlayers[introLoopState.currentIndex] || introPlayers[0])
    : null;
  const hasLiveContent = Boolean(podiumPlayer) || isBroadcastingVideo || isIntroLooping;

  return (
    <div className="min-h-screen flex flex-col bg-[#07080a] text-slate-100 relative overflow-x-clip font-sans selection:bg-[#58D20A] selection:text-black">
      <header className="sticky top-0 z-50">
        <Navbar />
      </header>

      {/* ── Ambient Background Glow (Vibrant Neon Lime Green & Pitch Black) ──── */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] bg-gradient-to-b from-[#58D20A]/[0.06] via-[#12200E]/10 to-transparent rounded-full blur-[160px]" />
        <div className="absolute top-1/3 -left-40 w-[600px] h-[600px] bg-[#58D20A]/5 rounded-full blur-[140px]" />
        <div className="absolute top-2/3 -right-40 w-[600px] h-[600px] bg-[#58D20A]/5 rounded-full blur-[140px]" />
      </div>

      <main className="flex-1 relative z-10 space-y-16 pb-24">
        
        {/* ── HERO BANNER SECTION ───────────────────────────────────────────── */}
        <section className="relative mt-8 lg:mt-11 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          
          {/* Background Stadium Backdrop Layer — Soft Translucent Glow */}
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-[#1c3816]/25 via-[#141b24]/40 to-[#0e131b]/30 overflow-hidden pointer-events-none -z-10 border border-white/10 shadow-[0_0_80px_rgba(88,210,10,0.18)] backdrop-blur-lg">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#58D20A]/20 via-transparent to-transparent" />
            <div className="absolute top-0 left-1/4 w-[500px] h-[580px] bg-[#58D20A]/[0.12] rotate-12 blur-3xl" />
            <div className="absolute top-0 right-1/4 w-[500px] h-[580px] bg-emerald-400/[0.12] -rotate-12 blur-3xl" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-9 items-center p-8 sm:p-11 lg:p-14">

            {/* Left Hero Content */}
            <div className="lg:col-span-7 space-y-7 sm:space-y-9 text-left">
              
              {/* Category Tagline */}
              <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-[#182e13]/60 border border-[#58D20A]/40 text-xs sm:text-sm font-bold text-[#58D20A] shadow-lg backdrop-blur-md">
                <span className="w-2.5 h-2.5 rounded-full bg-[#58D20A] animate-pulse" />
                <span className="tracking-widest uppercase font-mono">DEPARTMENT FOOTBALL TOURNAMENT 2026</span>
              </div>

              {/* Main Headline — Exact 4-Font Inline Typography Match */}
              <motion.h1
                className="flex flex-wrap items-baseline gap-x-3 sm:gap-x-4 gap-y-2.5 leading-none drop-shadow-[0_0_45px_rgba(88,210,10,0.4)] py-1"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              >
                {/* 1. BUILD — Sports Heavy Italic */}
                <span className="font-['Anton',sans-serif] italic font-black uppercase text-4xl sm:text-6xl lg:text-7xl text-white tracking-wider">
                  BUILD
                </span>

                {/* 2. YOUR — Elegant Flowing Cursive Script */}
                <span className="font-['Great_Vibes',cursive] text-5xl sm:text-7xl lg:text-[92px] text-[#58D20A] font-normal tracking-wide drop-shadow-[0_0_28px_rgba(88,210,10,0.72)] pr-1">
                  Your
                </span>

                {/* 3. DREAM — Bold Decorative Serif Inline */}
                <span className="font-['Cinzel_Decorative',serif] font-black uppercase text-4xl sm:text-6xl lg:text-7xl text-white tracking-widest">
                  DREAM
                </span>

                {/* 4. SQUAD. — Ornate Calligraphic Script */}
                <span className="font-['Alex_Brush',cursive] text-5xl sm:text-7xl lg:text-[92px] text-[#58D20A] font-normal tracking-wide drop-shadow-[0_0_28px_rgba(88,210,10,0.72)]">
                  Squad.
                </span>
              </motion.h1>

              {/* Subtitle */}
              <p className="text-lg sm:text-2xl text-slate-100 font-medium max-w-xl leading-relaxed">
                Real Players. Live Bidding. One Champion.
              </p>

              {/* CTA Buttons — always one row */}
              <div className="flex flex-nowrap items-center gap-3.5 sm:gap-5 pt-3.5">
                <Link
                  to="/live"
                  className="whitespace-nowrap px-7 sm:px-11 py-4 sm:py-4.5 bg-[#58D20A] hover:bg-[#68e21a] text-[#050505] font-black text-sm sm:text-lg uppercase tracking-wider rounded-xl shadow-[0_0_42px_rgba(88,210,10,0.52)] transition transform hover:-translate-y-0.5 flex items-center justify-center gap-2.5"
                >
                  <Radio className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse text-[#050505]" />
                  <span>ENTER LIVE AUCTION</span>
                </Link>

                <Link
                  to="/teams"
                  className="whitespace-nowrap px-7 sm:px-11 py-4 sm:py-4.5 bg-white/10 hover:bg-white/20 text-slate-100 border border-white/20 font-black text-sm sm:text-lg uppercase tracking-wider rounded-xl shadow-xl backdrop-blur-md transition transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
                >
                  <span>EXPLORE TEAMS</span>
                </Link>
              </div>

            </div>

            {/* Right Hero Widget: Light Translucent Countdown Card */}
            <div className="lg:col-span-5">
              <div className="bg-slate-900/40 border border-white/10 rounded-3xl p-5 sm:p-7 lg:p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)] backdrop-blur-2xl space-y-5">

                <div className="text-center space-y-1">
                  <span className="text-sm sm:text-base font-mono font-black text-[#58D20A] uppercase tracking-widest block">
                    {countdown ? (countdown.started ? 'STAGE IS LIVE' : countdown.label) : (isAuctionActive ? 'AUCTION IS LIVE' : 'EVENT COUNTDOWN')}
                  </span>
                </div>

                {/* Countdown Time Grid — overlap-safe tight scaling */}
                <div className="grid grid-cols-4 gap-2 sm:gap-2.5">
                  {[
                    { label: 'DAYS', value: countdown ? countdown.days : 2 },
                    { label: 'HRS', value: countdown ? countdown.hours : 14 },
                    { label: 'MINS', value: countdown ? countdown.mins : 36 },
                    { label: 'SECS', value: countdown ? countdown.secs : 48 },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-[#182e13]/50 border border-[#58D20A]/20 rounded-2xl px-1 py-3.5 sm:py-4 text-center backdrop-blur-md overflow-hidden min-w-0">
                      <span className="block text-xl sm:text-2xl lg:text-3xl font-black font-mono text-[#58D20A] tabular-nums leading-tight drop-shadow-[0_0_12px_rgba(88,210,10,0.35)]">
                        {String(value).padStart(2, '0')}
                      </span>
                      <span className="mt-1 block text-[10px] sm:text-xs font-bold text-slate-200 uppercase tracking-wider truncate">{label}</span>
                    </div>
                  ))}
                </div>

                {/* Event Date Info */}
                <div className="flex items-center justify-center gap-2 text-xs sm:text-sm font-mono font-bold py-2.5 px-3 rounded-2xl border text-slate-100 bg-[#182e13]/50 border-[#58D20A]/25 shadow-md backdrop-blur-md">
                  <Calendar className="w-4 h-4 text-[#58D20A] shrink-0" />
                  <span className="truncate">{eventDateLabel}</span>
                </div>

                {/* Player Registration CTA — appears when Registration is Open / Active */}
                {(registrationOpen || phase === 'REGISTRATION' || milestone?.key === 'registrationEndTime') && (
                  <Link
                    to="/player/register"
                    className="w-full py-4 px-5 bg-[#58D20A] hover:bg-[#68e21a] text-black font-black text-sm sm:text-base uppercase tracking-wider rounded-2xl shadow-[0_0_30px_rgba(88,210,10,0.5)] transition transform hover:-translate-y-0.5 flex items-center justify-center gap-2.5 text-center"
                  >
                    <UserCheck className="w-5 h-5 text-black" />
                    <span>REGISTER AS A PLAYER NOW</span>
                  </Link>
                )}
              </div>
            </div>

          </div>
        </section>

        {/* ── 5 METRIC QUICK STATS CARDS ────────────────────────────────────── */}
        <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            
            {/* 1. Teams Registered */}
            <div className="bg-[#0c0e12] border border-white/10 hover:border-[#58D20A]/50 rounded-2xl p-4 flex items-center gap-3.5 shadow-xl transition">
              <div className="w-11 h-11 rounded-full bg-[#12200E] border border-[#58D20A]/40 flex items-center justify-center text-[#58D20A] shrink-0">
                <Flag className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">TEAMS REGISTERED</span>
                <span className="text-2xl font-black font-mono text-white block leading-tight">
                  <AnimatedCounter value={teams.length} />
                </span>
              </div>
            </div>

            {/* 2. Players Registered */}
            <div className="bg-[#0c0e12] border border-white/10 hover:border-[#58D20A]/50 rounded-2xl p-4 flex items-center gap-3.5 shadow-xl transition">
              <div className="w-11 h-11 rounded-full bg-[#12200E] border border-[#58D20A]/40 flex items-center justify-center text-[#58D20A] shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">PLAYERS REGISTERED</span>
                <span className="text-2xl font-black font-mono text-white block leading-tight">
                  <AnimatedCounter value={registeredCount} />
                </span>
              </div>
            </div>

            {/* 3. Players Sold */}
            <div className="bg-[#0c0e12] border border-white/10 hover:border-[#58D20A]/50 rounded-2xl p-4 flex items-center gap-3.5 shadow-xl transition">
              <div className="w-11 h-11 rounded-full bg-[#12200E] border border-[#58D20A]/40 flex items-center justify-center text-[#58D20A] shrink-0">
                <UserCheck className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">PLAYERS SOLD</span>
                <span className="text-2xl font-black font-mono text-[#58D20A] block leading-tight">
                  <AnimatedCounter value={soldCount} />
                </span>
              </div>
            </div>

            {/* 4. Total Bids */}
            <div className="bg-[#0c0e12] border border-white/10 hover:border-[#58D20A]/50 rounded-2xl p-4 flex items-center gap-3.5 shadow-xl transition">
              <div className="w-11 h-11 rounded-full bg-[#12200E] border border-[#58D20A]/40 flex items-center justify-center text-[#58D20A] shrink-0">
                <Coins className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">TOTAL BIDS</span>
                <span className="text-2xl font-black font-mono text-[#58D20A] block leading-tight">
                  <AnimatedCounter value={totalBidsCount} />
                </span>
              </div>
            </div>

            {/* 5. Total Spent */}
            <div className="bg-[#0c0e12] border border-white/10 hover:border-[#58D20A]/50 rounded-2xl p-4 flex items-center gap-3.5 shadow-xl transition col-span-2 md:col-span-1">
              <div className="w-11 h-11 rounded-full bg-[#12200E] border border-[#58D20A]/40 flex items-center justify-center text-[#58D20A] shrink-0 font-bold text-lg font-mono">
                ৳
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">TOTAL SPENT</span>
                <span className="text-2xl font-black font-mono text-[#58D20A] block leading-tight">
                  <AnimatedCounter value={totalSpentAmount} prefix="৳" />
                </span>
              </div>
            </div>

          </div>
        </section>

        {/* ── LIVE AUCTION & RECENT PURCHASES DECK ──────────────────────────── */}
        <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">

            {/* Fixed floating LIVE NOW + WATCH LIVE pills — stay visible while
                scrolling, only on the landing page. Shown for EVERY live
                surface: broadcast video, intro sequence, or player on stage. */}
            {hasLiveContent && (
              <div className="fixed top-[76px] right-4 sm:right-6 z-40 flex items-center gap-2.5">
                {/* LIVE NOW Pill */}
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-emerald-500 bg-[#050505]/85 backdrop-blur-md text-emerald-400 text-xs font-mono font-bold shadow-[0_0_15px_rgba(16,185,129,0.25)]">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>{isBroadcastingVideo ? 'LIVE STREAM' : isIntroLooping ? 'LIVE NOW' : 'LIVE NOW'}</span>
                </div>
                {/* WATCH LIVE Pill */}
                <Link
                  to="/live"
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-white/40 bg-[#050505]/85 backdrop-blur-md text-white text-xs font-mono font-bold tracking-wider hover:bg-white/10 transition"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>WATCH LIVE</span>
                </Link>
              </div>
            )}

            <div className="lg:col-span-8 flex flex-col h-full">
              {isBroadcastingVideo ? (
                /* ── Podium Video Control stream — mirrors the podium spotlight ── */
                <div className="relative bg-black border border-white/10 rounded-3xl shadow-2xl overflow-hidden min-h-[480px]">
                  <EmbeddedVideoPlayer
                    url={broadcastVideoUrl}
                    videoStartTime={videoBroadcastState?.videoStartTime}
                    videoState={videoBroadcastState?.videoState}
                    pausedAtPosition={videoBroadcastState?.pausedAtPosition}
                  />
                  <span className="absolute top-4 left-4 z-10 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#050505]/85 backdrop-blur-md border border-red-500/60 text-red-400 text-[10px] font-mono font-black tracking-widest uppercase">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    Live Broadcast
                  </span>
                </div>
              ) : isIntroLooping ? (
                /* ── Player Intro Sequence pushed from Podium Admin ── */
                <div className="relative bg-gradient-to-br from-[#08080a] via-cardBg to-warningGold/20 border border-white/10 rounded-3xl shadow-2xl overflow-hidden min-h-[480px] flex items-center justify-center p-6">
                  <span className="absolute top-4 left-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-warningGold/15 border border-warningGold/40 text-warningGold text-[10px] font-mono font-black tracking-widest uppercase">
                    <span className="w-1.5 h-1.5 rounded-full bg-warningGold animate-pulse" />
                    Player Presentation ({(introLoopState?.currentIndex || 0) + 1} / {introPlayers.length})
                  </span>
                  {introCurrentPlayer ? (
                    <div key={`landing-intro-${introCurrentPlayer._id || introCurrentPlayer.id}`} className="text-center space-y-4 max-w-lg mx-auto animate-fade-in">
                      <div className="relative w-36 h-36 mx-auto rounded-2xl overflow-hidden border-2 border-warningGold/50 shadow-2xl shadow-warningGold/50">
                        <img
                          src={getImageUrl(introCurrentPlayer.imageUrl, playerFallback('indigo'))}
                          alt={introCurrentPlayer.name}
                          className="w-full h-full object-cover object-top"
                        />
                      </div>
                      <div>
                        <h2 className="text-2xl sm:text-3xl font-black text-white">{introCurrentPlayer.name}</h2>
                        <p className="text-xs font-bold text-warningGold uppercase tracking-wider mt-0.5">
                          {introCurrentPlayer.category || introCurrentPlayer.role || 'DRAFT PLAYER'}
                        </p>
                      </div>
                      <div className="flex justify-center gap-4 text-xs font-mono bg-[#0c0e12]/90 p-3 rounded-xl border border-white/10">
                        <div>
                          <span className="text-slate-400 block text-[10px]">ROLE</span>
                          <span className="text-white font-bold">{introCurrentPlayer.primaryPosition || introCurrentPlayer.role || 'N/A'}</span>
                        </div>
                        <div className="w-px bg-white/10" />
                        <div>
                          <span className="text-slate-400 block text-[10px]">BASE PRICE</span>
                          <span className="text-[#58D20A] font-bold">{formatCurrency(introCurrentPlayer.basePrice || 1000000)}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <WaitingAnimation inline isActive />
                  )}
                </div>
              ) : podiumPlayer ? (
                <LandingLiveStageCard
                  player={podiumPlayer}
                  categories={categories}
                  currentBid={currentBid}
                  highestBidder={highestBidder}
                  timerRemaining={timerRemaining}
                  timerStatus={timerStatus}
                  formatCurrency={formatCurrency}
                />
              ) : (
                <div className="relative bg-[#08080a] border border-red-950/40 rounded-3xl shadow-2xl overflow-hidden min-h-[480px]">
                  <WaitingAnimation
                    inline
                    teamsConnected={teams.length}
                    managersReady={teams.filter(t => !!t.managerId).length}
                    isActive
                  />
                </div>
              )}
            </div>

            {/* Right Card: RECENT PURCHASES (4 cols) */}
            <div className="lg:col-span-4 flex flex-col h-full">
              <div className="bg-[#0c0e12] border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col justify-between flex-1">
                
                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                  <h3 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-[#58D20A]" />
                    RECENT PURCHASES
                  </h3>
                  <Link to="/players/sold" className="text-xs font-bold text-[#58D20A] hover:underline">
                    View All
                  </Link>
                </div>

                {/* List of Recent Purchases */}
                <div className="py-4 space-y-3 flex-1 overflow-y-auto custom-scrollbar">
                  {soldPlayers.map((item, idx) => {
                    // Resolve the buying team by id first, then by name — never
                    // render a raw ObjectId; unmatched teams simply show no chip.
                    const tid = typeof item.soldToTeam === 'object' ? item.soldToTeam?._id : item.soldToTeam;
                    const teamObj =
                      teams.find((t) => String(t._id || t.id) === String(tid || '')) ||
                      teams.find((t) => (t.name || '').toLowerCase() === String(tid || '').toLowerCase());
                    const posChip = (item.primaryPosition || '').toUpperCase().slice(0, 3);

                    return (
                      <div key={item._id || item.id || idx} className="group/item bg-[#050505]/70 border border-white/10 rounded-xl p-3 flex items-center gap-3 hover:border-[#58D20A]/40 hover:bg-[#080b07] transition-all">
                        {/* Player initial avatar */}
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#12200E] to-[#050505] border border-[#58D20A]/40 shrink-0 flex items-center justify-center text-sm font-black font-mono text-[#58D20A] shadow-[0_0_12px_rgba(88,210,10,0.15)]">
                          {item.name?.charAt(0)?.toUpperCase() || 'P'}
                        </div>

                        {/* Name + position chip */}
                        <div className="min-w-0 flex-1">
                          <span className="font-bold text-xs text-white block truncate group-hover/item:text-[#72F21A] transition">{item.name}</span>
                          {posChip && (
                            <span className="inline-block mt-1 text-[9px] font-mono font-black uppercase px-1.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-300 tracking-wider">
                              {posChip}
                            </span>
                          )}
                        </div>

                        {/* Team FULL NAME above the sale price */}
                        <div className="text-right shrink-0 max-w-[120px]">
                          {teamObj && (
                            <span className="text-[10px] font-mono font-extrabold text-[#58D20A] block truncate leading-tight" title={teamObj.name}>
                              {teamObj.name}
                            </span>
                          )}
                          <span className="text-sm font-mono font-black text-[#58D20A] block drop-shadow-[0_0_10px_rgba(88,210,10,0.4)]">
                            ৳{(item.finalPrice || 1000).toLocaleString()}
                          </span>
                          {item.timeAgo && (
                            <span className="text-[9px] text-slate-500 font-mono block mt-0.5">{item.timeAgo}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>
            </div>

          </div>
        </section>

        {/* ── FRANCHISE TEAMS SHOWCASE ──────────────────────────────────────── */}
        <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
          
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black uppercase text-white tracking-wide">FRANCHISE TEAMS</h2>
            </div>
            <Link to="/teams" className="text-xs font-bold text-[#58D20A] hover:underline flex items-center gap-1">
              <span>View All Teams &gt;</span>
            </Link>
          </div>

          {/* Dynamic grid — columns always equal the visible team count
              (1→100%, 2→50%+50%, 3→33.33%×3, 4→25%×4) so the row fills the
              full container width with no empty column. Mobile stacks to a
              single column, tablet uses two. */}
          <div
            className="grid grid-cols-1 sm:grid-cols-2 gap-6 lg:[grid-template-columns:repeat(var(--team-cols),minmax(0,1fr))]"
            style={{ '--team-cols': String(Math.min(4, Math.max(1, teams.slice(0, 4).length))) }}
          >
            {teams.slice(0, 4).map((team, idx) => {
              const theme = getTeamTheme(team);
              // Count is cross-checked against the actual roster array so a
              // stale/seeded counter never under-reports squad progress.
              const rosterCount = Math.max(
                Number(team.currentRosterCount) || 0,
                Array.isArray(team.currentRoster) ? team.currentRoster.length : 0
              );
              // Team's own color set — DB primaryColor/secondaryColor wins,
              // name-based & hash fallbacks provide the accent otherwise.
              // ensureReadableHex lightens near-black accents so numbers/text
              // are never invisible on the dark card.
              const accentHex = ensureReadableHex(theme.primaryColor || team.primaryColor || '#58D20A');
              const deepHex = theme.secondaryColor || team.secondaryColor || '#12200E';

              return (
                <div
                  key={team._id || team.id || idx}
                  onClick={() => setSelectedTeam(team)}
                  style={{
                    ...(theme.customStyle || {}),
                    '--team-accent': accentHex,
                    boxShadow: `0 0 0 1px ${accentHex}1a`,
                  }}
                  className={`h-full bg-[#0c0e12] ${theme.border} ${theme.ring} rounded-2xl p-5 space-y-4 hover:shadow-2xl transition-all cursor-pointer group hover:-translate-y-1 relative overflow-hidden`}
                >
                  {/* Team-color ambient glow */}
                  <div
                    className="absolute -top-16 -right-16 w-48 h-48 rounded-full blur-3xl pointer-events-none opacity-60"
                    style={{ background: `${accentHex}14` }}
                  />

                  {/* Top Team Header with Shield Crest Badge */}
                  <div className="flex items-center justify-between relative">
                    <TeamBadge team={team} size="md" showName={false} />
                    <div className="text-right">
                      <h3 className="font-black text-white text-base leading-tight transition group-hover:text-[color:var(--team-accent)]">{team.name}</h3>
                      <span
                        className="block h-[3px] w-10 rounded-full mt-1 ml-auto"
                        style={{ background: `linear-gradient(90deg, ${accentHex}, transparent)` }}
                      />
                    </div>
                  </div>

                  {/* Budget Amount */}
                  <div
                    className="p-3 rounded-xl border relative"
                    style={{ backgroundColor: `${deepHex}59`, borderColor: `${accentHex}4D` }}
                  >
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Budget Remaining</span>
                    <span className="text-xl font-black font-mono" style={{ color: accentHex }}>
                      {formatCurrency(team.remainingBudget || 12500)}
                    </span>
                  </div>

                  {/* Progress Bar: Players Count vs minimum requirement */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-400 text-[10px] font-bold uppercase">{rosterCount} / {minimumPlayersPerTeam} Players</span>
                      {rosterCount >= minimumPlayersPerTeam && (
                        <span className="text-[9px] font-black uppercase tracking-wider" style={{ color: accentHex }}>Min Filled</span>
                      )}
                    </div>
                    <div className="w-full bg-[#050505] rounded-full h-2 overflow-hidden border border-white/10">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${Math.min(100, (rosterCount / minimumPlayersPerTeam) * 100)}%`, background: `linear-gradient(90deg, ${deepHex}, ${accentHex})` }}
                      />
                    </div>
                  </div>

                  {/* Footer: Highest Purchase */}
                  <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs relative">
                    <span className="text-slate-400 text-[10px] uppercase font-bold">Highest Purchase</span>
                    <span
                      className="font-mono font-black text-sm px-2.5 py-1 rounded-lg"
                      style={{
                        color: accentHex,
                        backgroundColor: `${accentHex}1f`,
                        border: `1px solid ${accentHex}55`,
                        textShadow: `0 0 12px ${accentHex}80`,
                      }}
                    >
                      {formatCurrency(team.highestPurchase || (idx === 0 ? 2100 : idx === 1 ? 1800 : idx === 2 ? 1450 : 950))}
                    </span>
                  </div>

                </div>
              );
            })}
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