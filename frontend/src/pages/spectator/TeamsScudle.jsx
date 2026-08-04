import { useState, useEffect, useMemo, useRef } from 'react';
import { Calendar, Clock, MapPin, Trophy, Shield, Radio, Search, RefreshCw, Layers, Hourglass } from 'lucide-react';
import Navbar from '../../components/Navbar';
import api from '../../services/api';

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

const formatDate = (dateString) => {
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(dateString).toLocaleDateString('en-US', options);
};

const isSameDay = (dateString) => {
  const d = new Date(dateString);
  const today = new Date();
  return d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
};

// Helper to render team logo, which can be an emoji or a URL
const renderTeamLogo = (logo, fallback = '🏆') => {
  if (logo && (logo.startsWith('http') || logo.startsWith('/'))) {
    return <img src={logo} alt="Team Logo" className="w-full h-full object-contain p-1" />;
  }
  return <span className="text-4xl font-black">{logo || fallback}</span>;
};

// Attempts to build a real Date from matchDate + matchTime, safely.
const getMatchDateTime = (match) => {
  if (!match.matchDate) return null;
  try {
    const base = new Date(match.matchDate);
    if (isNaN(base.getTime())) return null;
    if (match.matchTime && /^\d{1,2}:\d{2}/.test(match.matchTime)) {
      const [h, m] = match.matchTime.split(':').map(Number);
      base.setHours(h, m, 0, 0);
    }
    return base;
  } catch {
    return null;
  }
};

// Lightweight countdown, refreshes every 30s
function useCountdown(targetDate) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!targetDate) return;
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, [targetDate]);

  if (!targetDate) return null;
  const diffMs = targetDate.getTime() - now;
  if (diffMs <= 0) return null;

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `Starts in ${days}d ${hours % 24}h`;
  }
  if (hours > 0) return `Starts in ${hours}h ${minutes}m`;
  return `Starts in ${minutes}m`;
}

// Animated count-up for the stat strip — ticks from 0 to value once on mount/change
function useCountUp(value, duration = 700) {
  const [display, setDisplay] = useState(0);
  const startRef = useRef(null);
  const fromRef = useRef(0);

  useEffect(() => {
    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      setDisplay(value);
      return;
    }
    fromRef.current = display;
    startRef.current = null;
    let raf;
    const step = (ts) => {
      if (!startRef.current) startRef.current = ts;
      const progress = Math.min(1, (ts - startRef.current) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(fromRef.current + (value - fromRef.current) * eased));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return display;
}

const STATUS_TABS = [
  { key: 'all', label: 'All Matches' },
  { key: 'Live', label: 'Live Now' },
  { key: 'Upcoming', label: 'Upcoming' },
  { key: 'Finished', label: 'Completed' },
];

// ─────────────────────────────────────────────────────────────────────────
// Stat pill with count-up
// ─────────────────────────────────────────────────────────────────────────

function StatPill({ label, value, tone }) {
  const count = useCountUp(value);
  return (
    <div className={`relative overflow-hidden rounded-xl border p-3 text-center bg-slate-950/60 backdrop-blur-sm ${tone}`}>
      <p className="text-2xl font-black font-mono tabular-nums">{count}</p>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mt-0.5">{label}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Match Card
// ─────────────────────────────────────────────────────────────────────────

function MatchCard({ match, featured = false, index = 0 }) {
  const isFinished = match.status === 'Finished';
  const isUpcoming = match.status === 'Upcoming';
  const isLive = match.status === 'Live';

  const getTeamClasses = (isWinner) => isWinner ? 'font-black text-white' : 'font-semibold text-slate-400';
  const winner = isFinished ? (Number(match.scoreA) > Number(match.scoreB) ? 'A' : (Number(match.scoreB) > Number(match.scoreA) ? 'B' : 'draw')) : null;
  const countdown = useCountdown(isUpcoming ? getMatchDateTime(match) : null);
  const roundLabel = match.round || match.stage || match.roundName;

  return (
    <div
      className={`group relative rounded-2xl border overflow-hidden transition-all duration-300 will-change-transform hover:-translate-y-1 fixture-card-enter ${isLive
        ? 'border-rose-500/50 bg-slate-950/80 shadow-xl shadow-rose-900/30'
        : 'border-slate-800 bg-slate-950/60 hover:border-blue-500/40 hover:shadow-2xl hover:shadow-blue-900/20'
        }`}
      style={{ backdropFilter: 'blur(10px)', animationDelay: `${Math.min(index, 8) * 60}ms` }}
    >
      {/* Shine sweep on hover — signature micro-interaction */}
      <span className="pointer-events-none absolute inset-0 overflow-hidden">
        <span className="absolute -inset-y-full -left-1/2 w-1/3 rotate-12 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent translate-x-[-120%] group-hover:translate-x-[420%] transition-transform duration-[1100ms] ease-out" />
      </span>

      {/* Round / featured tag row */}
      {(roundLabel || featured) && (
        <div className="relative px-4 pt-3 flex items-center justify-between">
          {roundLabel ? (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-purple-300 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full">
              <Layers className="w-3 h-3" /> {roundLabel}
            </span>
          ) : <span />}
          {featured && isLive && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
              On Podium Now
            </span>
          )}
        </div>
      )}

      <div className="relative p-5 space-y-4">
        {/* Teams */}
        <div className="flex items-center justify-between gap-4">
          {/* Team A */}
          <div className="flex flex-col items-center text-center gap-2 w-1/3">
            <div className={`w-16 h-16 rounded-full bg-slate-900 border-2 flex items-center justify-center transition-colors ${isLive ? 'border-rose-500/50' : winner === 'A' ? 'border-amber-400/60' : 'border-slate-700'}`}>
              {renderTeamLogo(match.teamALogo, match.teamAName?.[0])}
            </div>
            <span className={`text-sm truncate ${getTeamClasses(winner === 'A')}`}>{match.teamAName}</span>
          </div>

          {/* Score / VS */}
          <div className="flex flex-col items-center">
            {isFinished ? (
              <div className="font-black text-2xl font-mono flex items-center gap-2 tabular-nums">
                <span className={getTeamClasses(winner === 'A')}>{match.scoreA || 0}</span>
                <span className="text-slate-600">-</span>
                <span className={getTeamClasses(winner === 'B')}>{match.scoreB || 0}</span>
              </div>
            ) : (
              <span className="text-xl font-black text-slate-700 tracking-widest [text-shadow:0_1px_0_rgba(255,255,255,0.04)]">VS</span>
            )}
            {isLive && (
              <span className="mt-1.5 flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border bg-rose-500/10 text-rose-400 border-rose-500/30 animate-pulse">
                <Radio className="w-2.5 h-2.5" /> LIVE
              </span>
            )}
            {!isLive && countdown && (
              <span className="mt-1.5 flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border bg-blue-500/10 text-blue-400 border-blue-500/30">
                <Hourglass className="w-2.5 h-2.5" /> {countdown}
              </span>
            )}
          </div>

          {/* Team B */}
          <div className="flex flex-col items-center text-center gap-2 w-1/3">
            <div className={`w-16 h-16 rounded-full bg-slate-900 border-2 flex items-center justify-center transition-colors ${isLive ? 'border-rose-500/50' : winner === 'B' ? 'border-amber-400/60' : 'border-slate-700'}`}>
              {renderTeamLogo(match.teamBLogo, match.teamBName?.[0])}
            </div>
            <span className={`text-sm truncate ${getTeamClasses(winner === 'B')}`}>{match.teamBName}</span>
          </div>
        </div>

        {/* Winner note */}
        {isFinished && winner !== 'draw' && (
          <div className="text-center pt-3 border-t border-slate-800">
            <p className="text-xs text-amber-400 font-semibold flex items-center justify-center gap-1.5">
              <Trophy className="w-3.5 h-3.5" />
              Winner: <span className="font-bold text-white">{winner === 'A' ? match.teamAName : match.teamBName}</span>
            </p>
            {match.winnerNotes && <p className="text-[11px] text-slate-500 mt-1 italic">"{match.winnerNotes}"</p>}
          </div>
        )}
      </div>

      {/* Footer with time and venue */}
      <div className="relative bg-slate-900/70 border-t border-slate-800 px-4 py-2 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          <span className="font-semibold">{match.matchTime}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5" />
          <span className="font-semibold">{match.venue}</span>
        </div>
      </div>
    </div>
  );
}

// Shimmer skeleton, matches the card's real proportions
function MatchCardSkeleton({ index = 0 }) {
  return (
    <div
      className="rounded-2xl border border-slate-800 bg-slate-950/60 overflow-hidden fixture-card-enter"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="p-5 flex items-center justify-between gap-4">
        <div className="flex flex-col items-center gap-2 w-1/3">
          <div className="w-16 h-16 rounded-full shimmer" />
          <div className="h-3 w-16 rounded shimmer" />
        </div>
        <div className="h-5 w-8 rounded shimmer" />
        <div className="flex flex-col items-center gap-2 w-1/3">
          <div className="w-16 h-16 rounded-full shimmer" />
          <div className="h-3 w-16 rounded shimmer" />
        </div>
      </div>
      <div className="bg-slate-900/70 border-t border-slate-800 h-10" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────

export default function TeamsScudle() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');

  const fetchMatches = async ({ silent = false } = {}) => {
    try {
      if (silent) setRefreshing(true); else setLoading(true);
      const res = await api.get('/matches');
      // The backend sends { success: true, data: [...] }.
      // The api client might return the full axios response or just response.data.
      // This handles both by checking for the nested 'data' array first.
      const matchData = res?.data?.data || res?.data || [];
      if (Array.isArray(matchData)) {
        setMatches(matchData);
        setError('');
      } else {
        throw new Error("Invalid data format from API");
      }
    } catch (err) {
      console.error("Failed to fetch matches:", err);
      setError('Could not load match schedule. Please try again later.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMatches();
    const id = setInterval(() => fetchMatches({ silent: true }), 45000);
    return () => clearInterval(id);
  }, []);

  const stats = useMemo(() => ({
    total: matches.length,
    live: matches.filter(m => m.status === 'Live').length,
    upcoming: matches.filter(m => m.status === 'Upcoming').length,
    finished: matches.filter(m => m.status === 'Finished').length,
  }), [matches]);

  const liveMatches = useMemo(() => matches.filter(m => m.status === 'Live'), [matches]);

  const filteredMatches = useMemo(() => {
    let list = matches;
    if (activeTab !== 'all') list = list.filter(m => m.status === activeTab);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(m =>
        (m.teamAName || '').toLowerCase().includes(q) ||
        (m.teamBName || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [matches, activeTab, search]);

  const groupedMatches = useMemo(() => {
    if (!filteredMatches.length) return {};
    return filteredMatches.reduce((acc, match) => {
      const date = formatDate(match.matchDate);
      if (!acc[date]) acc[date] = [];
      acc[date].push(match);
      return acc;
    }, {});
  }, [filteredMatches]);

  const sortedDates = Object.keys(groupedMatches).sort((a, b) => new Date(a) - new Date(b));

  return (
    <div className="min-h-screen flex flex-col bg-darkBg text-slate-100">
      {/* Scoped styles for signature motion — respects prefers-reduced-motion */}
      <style>{`
        @keyframes fixtureFadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fixture-card-enter {
          animation: fixtureFadeUp 0.5s ease-out both;
        }
        @keyframes shimmerSweep {
          from { background-position: -400px 0; }
          to { background-position: 400px 0; }
        }
        .shimmer {
          background: linear-gradient(90deg, rgba(30,41,59,0.6) 25%, rgba(51,65,85,0.7) 37%, rgba(30,41,59,0.6) 63%);
          background-size: 400px 100%;
          animation: shimmerSweep 1.4s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .fixture-card-enter, .shimmer { animation: none !important; }
        }
      `}</style>

      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <div className="relative text-center py-4">
          <div className="absolute inset-x-0 top-0 h-40 -z-10 opacity-60 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at center, rgba(59,130,246,0.12) 0%, transparent 70%)' }}
          />
          <Shield className="w-12 h-12 mx-auto text-blue-400 bg-blue-500/10 p-3 rounded-2xl border border-blue-500/20" />
          <h1 className="text-3xl md:text-4xl font-black font-heading mt-4 bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
            Match Schedule
          </h1>
          <p className="text-sm text-slate-400 mt-1">Official schedule for the tournament.</p>
        </div>

        {!loading && !error && matches.length > 0 && (
          <>
            {/* Summary stat strip — animated count-up */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatPill label="Total Matches" value={stats.total} tone="text-slate-200 border-slate-800" />
              <StatPill label="Live Now" value={stats.live} tone="text-rose-400 border-rose-500/30" />
              <StatPill label="Upcoming" value={stats.upcoming} tone="text-blue-400 border-blue-500/30" />
              <StatPill label="Completed" value={stats.finished} tone="text-emerald-400 border-emerald-500/30" />
            </div>

            {/* Live spotlight — glowing ambient backdrop is the page's signature moment */}
            {liveMatches.length > 0 && (
              <div className="relative space-y-3">
                <div className="absolute -inset-x-4 -inset-y-2 -z-10 rounded-3xl opacity-70 pointer-events-none"
                  style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(244,63,94,0.10) 0%, transparent 65%)' }}
                />
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-rose-400 animate-pulse" />
                  <h2 className="text-sm font-bold uppercase tracking-wider text-rose-400">Happening Right Now</h2>
                  <div className="flex-grow h-px bg-gradient-to-r from-rose-500/40 to-transparent" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {liveMatches.map((match, i) => (
                    <MatchCard key={`live-${match._id || match.id}`} match={match} featured index={i} />
                  ))}
                </div>
              </div>
            )}

            {/* Sticky glass filter bar */}
            <div className="sticky top-2 z-20 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between rounded-2xl border border-slate-800/80 bg-slate-950/70 backdrop-blur-xl px-3 py-3 shadow-lg shadow-black/20">
              <div className="flex flex-wrap gap-2">
                {STATUS_TABS.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all duration-200 ${activeTab === tab.key
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 border-blue-500 text-white shadow-md shadow-blue-900/40'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                      }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1 sm:w-56">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search by team..."
                    className="glass-input w-full pl-8 pr-3 py-2 rounded-lg text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>
                <button
                  onClick={() => fetchMatches({ silent: true })}
                  className="p-2 rounded-lg bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  title="Refresh fixtures"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
          </>
        )}

        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <MatchCardSkeleton key={i} index={i} />)}
          </div>
        ) : error ? (
          <div className="glass-card rounded-2xl p-8 text-center text-rose-400 border border-rose-500/30">
            <p className="font-bold">{error}</p>
          </div>
        ) : matches.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center text-slate-500 border border-slate-800">
            <p className="font-bold">No matches have been scheduled yet.</p>
            <p className="text-xs mt-1">Please check back later for updates.</p>
          </div>
        ) : sortedDates.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center text-slate-500 border border-slate-800">
            <p className="font-bold">No matches match your filters.</p>
            <p className="text-xs mt-1">Try a different tab or clear the search.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {sortedDates.map(date => (
              <div key={date} className="space-y-4">
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-blue-400" />
                  <h2 className="text-lg font-bold text-white">{date}</h2>
                  {isSameDay(groupedMatches[date][0].matchDate) && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      Today
                    </span>
                  )}
                  <div className="flex-grow h-px bg-slate-800"></div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {groupedMatches[date].map((match, i) => (
                    <MatchCard key={match._id || match.id} match={match} index={i} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="text-center pt-8">
          <h3 className="font-bold text-slate-300">Tournament Structure</h3>
          <p className="text-xs text-slate-500 mt-1">
            This is a knockout tournament. Winners from each match will advance to the next round.
            <br />
            The full bracket will be updated as results are finalized.
          </p>
        </div>
      </main>

    </div>
  );
}