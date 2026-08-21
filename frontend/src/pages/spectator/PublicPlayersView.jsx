import { useState, useMemo, useEffect } from 'react';
import {
  Users, Search, X, ChevronDown, Shield,
  Trophy, Zap, Eye, UserCheck, UserX, Clock, SlidersHorizontal,
  RefreshCw, TrendingUp
} from 'lucide-react';
import { useAuction } from '../../context/AuctionContext';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/Navbar';
import CompetitionHeader from '../../components/common/CompetitionHeader';
import '../../services/api';
import { getImageUrl } from '../../utils/imageUrl';
import PlayerCardCard from '../../components/common/PlayerCardCard';

// ── Status badge config ──────────────────────────────────────────────────────
const STATUS_CONFIG = {
  REGISTERED: { label: 'Registered', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', icon: UserCheck },
  SOLD: { label: 'Sold', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', icon: Trophy },
  UNSOLD: { label: 'Unsold', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', icon: Clock },
  WITHDRAWN: { label: 'Withdrawn', color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/30', icon: UserX },
  PENDING: { label: 'Pending', color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/30', icon: Clock },
  AVAILABLE: { label: 'Available', color: 'text-teal-400', bg: 'bg-teal-500/10', border: 'border-teal-500/30', icon: Zap },
};

const ROLE_BADGE = {
  SUPER_ADMIN: { label: 'Super Admin', color: 'text-blue-300', bg: 'bg-blue-900/60', border: 'border-blue-700' },
  PODIUM_ADMIN: { label: 'Podium Admin', color: 'text-rose-300', bg: 'bg-rose-900/60', border: 'border-rose-700' },
  TEAM_MANAGER: { label: 'Team Manager', color: 'text-emerald-300', bg: 'bg-emerald-900/60', border: 'border-emerald-700' },
  PLAYER: { label: 'Player', color: 'text-purple-300', bg: 'bg-purple-900/60', border: 'border-purple-700' },
  null: { label: 'Spectator', color: 'text-slate-300', bg: 'bg-slate-800/60', border: 'border-slate-700' },
};

const getCategoryRowStyle = (category) => {
  switch (category) {
    case 'Icon Category': return 'bg-amber-950/20 hover:bg-amber-950/40 border-l-4 border-amber-500';
    case 'A Grade': return 'bg-blue-950/20 hover:bg-blue-950/40 border-l-4 border-blue-500';
    case 'B Grade': return 'bg-teal-950/20 hover:bg-teal-950/40 border-l-4 border-teal-500';
    case 'Emerging Youth': return 'bg-purple-950/20 hover:bg-purple-950/40 border-l-4 border-purple-500';
    default: return 'hover:bg-slate-800/30 border-l-4 border-slate-700';
  }
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status?.toUpperCase()] || STATUS_CONFIG.PENDING;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
      <Icon className="w-2.5 h-2.5" />
      {cfg.label}
    </span>
  );
}

function PlayerListRow({ player, formatCurrency, teams = [] }) {
  const [imgErr, setImgErr] = useState(false);
  const positions = Array.isArray(player.positions) ? player.positions : [];
  const isSold = player.status === 'SOLD';
  const soldToTeam = isSold ? teams.find(t => (t._id || t.id) === player.soldToTeam) : null;
  const rowStyle = getCategoryRowStyle(player.category);
  return (
    <div className={`grid grid-cols-12 gap-3 px-4 py-3 items-center text-sm transition-colors ${rowStyle} ${isSold ? 'opacity-60' : ''}`}>
      <div className="col-span-1">
        {player.imageUrl && !imgErr ? (
          <img
            src={getImageUrl(player.imageUrl)}
            alt={player.name}
            onError={() => setImgErr(true)}
            className="w-9 h-9 rounded-lg object-cover border border-slate-700"
          />
        ) : (
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-black text-sm border border-slate-700">
            {(player.name || 'P')[0].toUpperCase()}
          </div>
        )}
      </div>

      <div className="col-span-3">
        <p className="font-bold text-white truncate">{player.name}</p>
      </div>

      <div className="col-span-2 flex flex-wrap gap-1">
        {positions.slice(0, 3).map(pos => (
          <span
            key={pos}
            className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${pos === player.primaryPosition
              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
              : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
          >
            {pos === player.primaryPosition && '* '}{pos}
          </span>
        ))}
        {positions.length > 3 && (
          <span className="px-1.5 py-0.5 rounded text-[9px] text-slate-500 bg-slate-800 border border-slate-700">
            +{positions.length - 3}
          </span>
        )}
      </div>

      <div className="col-span-2">
        <span className={`text-xs font-semibold ${player.category?.includes('A') ? 'text-amber-400' :
          player.category?.includes('S') ? 'text-purple-400' :
            'text-slate-400'
          }`}>{player.category || '--'}</span>
      </div>

      <div className="col-span-2 text-xs">
        {isSold ? (
          <>
            <p className="font-mono font-bold text-amber-400">{formatCurrency(player.finalPrice || 0)}</p>
            <p className="text-[10px] text-slate-400">to {soldToTeam?.name || 'N/A'}</p>
          </>
        ) : (
          <p className="font-mono font-bold text-emerald-400">{formatCurrency(player.basePrice)}</p>
        )}
      </div>


      <div className="col-span-2 text-center">
        <StatusBadge status={player.status} />
      </div>
    </div>
  );
}

export default function PublicPlayersView() {
  const { players: ctxPlayers, teams, positions, categories, formatCurrency, isDataLoading, refetchPlayers, sessions = [] } = useAuction();
  const { user } = useAuth();

  const role = user?.role || null;
  const isPrivileged = ['TEAM_MANAGER', 'PODIUM_ADMIN', 'SUPER_ADMIN'].includes(role);

  // ── Local state ──────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterPosition, setFilterPosition] = useState('ALL');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // grid | list
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  // ── Sync with global context players for instant updates ─────────────────
  useEffect(() => {
    if (Array.isArray(ctxPlayers)) {
      setPlayers(ctxPlayers.map(p => ({ ...p, id: p._id || p.id })));
      setLoading(false);
    }
  }, [ctxPlayers]);

  useEffect(() => {
    if (typeof refetchPlayers === 'function') {
      refetchPlayers();
    }
  }, [refetchPlayers]);

  // ── Derived filter options ───────────────────────────────────────────────
  const statusOptions = ['ALL', 'REGISTERED', 'SOLD', 'UNSOLD', 'WITHDRAWN'];
  const categoryOptions = ['ALL', ...categories.map(c => c.name)];
  const positionOptions = ['ALL', ...positions.map(p => p.code)];

  // ── Filtered list ────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return players.filter(p => {
      const matchSearch = !search ||
        p.name?.toLowerCase().includes(search.toLowerCase()) ||
        p.jerseyName?.toLowerCase().includes(search.toLowerCase()) ||
        p.studentId?.toLowerCase().includes(search.toLowerCase()) ||
        p.session?.toLowerCase().includes(search.toLowerCase());

      const matchStatus = filterStatus === 'ALL' || p.status?.toUpperCase() === filterStatus;
      const matchCategory = filterCategory === 'ALL' || p.category === filterCategory;
      const matchPosition = filterPosition === 'ALL' ||
        (Array.isArray(p.positions) && p.positions.includes(filterPosition)) ||
        p.primaryPosition === filterPosition;

      return matchSearch && matchStatus && matchCategory && matchPosition;
    });
  }, [players, search, filterStatus, filterCategory, filterPosition]);

  // ── Summary stats ────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total: players.length,
    registered: players.filter(p => p.status === 'REGISTERED').length,
    sold: players.filter(p => p.status === 'SOLD').length,
    unsold: players.filter(p => p.status === 'UNSOLD').length,
    withdrawn: players.filter(p => p.status === 'WITHDRAWN').length,
  }), [players]);

  const roleBadge = ROLE_BADGE[role] || ROLE_BADGE[null];

  const activeFiltersCount = [
    filterStatus !== 'ALL',
    filterCategory !== 'ALL',
    filterPosition !== 'ALL',
  ].filter(Boolean).length;

  const clearAllFilters = () => {
    setSearch('');
    setFilterStatus('ALL');
    setFilterCategory('ALL');
    setFilterPosition('ALL');
  };

  return (
    <div className="min-h-screen flex flex-col bg-darkBg text-slate-100">
      {/* Only show Navbar for public, unauthenticated view. Authenticated views get Navbar from DashboardLayout. */}
      {!user && <Navbar />}

      <main className={`flex-1 space-y-6 ${!user
        ? 'max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4'
        : ''
        }`}>

        <CompetitionHeader
          competitionName="Championship"
          sessionName={sessions?.[0]?.name || 'Current Season'}
          user={user}
          active="players"
        />

        {/* ── Page Header ─────────────────────────────────────────────────── */}
        <div className="glass-card rounded-2xl p-4 border border-slate-600">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                {/* Role badge */}
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${roleBadge.bg} ${roleBadge.color} ${roleBadge.border}`}>
                  <Eye className="w-2.5 h-2.5" />
                  {roleBadge.label}
                </span>
              </div>
              <h1 className="text-2xl font-black font-heading text-white">All Players</h1>
            </div>

            <div className="flex items-center gap-3">
              {/* Showing count */}
              <div className="text-right">
                <span className="block text-2xl font-black font-mono text-blue-400">{filtered.length}</span>
                <span className="text-[10px] text-slate-500 uppercase font-bold">of {players.length} Players</span>
              </div>

              {/* View mode toggle */}
              <div className="flex rounded-xl overflow-hidden border border-slate-700 bg-slate-900">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-2 text-xs transition ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                  title="Grid view"
                >
                  ⊞
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-2 text-xs transition ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                  title="List view"
                >
                  ≡
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Stats Strip ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: 'Total', value: stats.total, color: 'text-blue-400', icon: Users },
            { label: 'Active', value: stats.registered, color: 'text-sky-400', icon: UserCheck },
            { label: 'Sold', value: stats.sold, color: 'text-emerald-400', icon: Trophy },
            { label: 'Unsold', value: stats.unsold, color: 'text-amber-400', icon: TrendingUp },
            { label: 'Withdrawn', value: stats.withdrawn, color: 'text-rose-400', icon: UserX },
          ].map(({ label, value, color, icon: Icon }) => (
            <div key={label} className="glass-card rounded-xl p-3 border border-slate-800 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Icon className={`w-3.5 h-3.5 ${color}`} />
                <span className={`text-xl font-black font-mono ${color}`}>{value}</span>
              </div>
              <p className="text-[10px] text-slate-500 font-bold uppercase">{label}</p>
            </div>
          ))}
        </div>

        {/* ── Search & Filter Bar ──────────────────────────────────────────── */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, jersey, student ID or session..."
                className="glass-input w-full pl-10 pr-4 py-2.5 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(v => !v)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition ${showFilters || activeFiltersCount > 0
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'glass-input border-slate-700 text-slate-300 hover:text-white hover:border-slate-600'
                }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
              {activeFiltersCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-black">
                  {activeFiltersCount}
                </span>
              )}
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>

            {/* Clear filters */}
            {(activeFiltersCount > 0 || search) && (
              <button
                onClick={clearAllFilters}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-rose-800/50 bg-rose-500/10 text-rose-400 text-xs font-semibold hover:bg-rose-500/20 transition"
              >
                <X className="w-3.5 h-3.5" />
                Clear
              </button>
            )}
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="glass-card rounded-xl border border-slate-800 p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 animate-slide-in-right">
              {/* Status Filter */}
              <div>
                <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1.5">Status</label>
                <div className="flex flex-wrap gap-1.5">
                  {statusOptions.map(s => (
                    <button
                      key={s}
                      onClick={() => setFilterStatus(s)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${filterStatus === s
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:border-slate-500'
                        }`}
                    >
                      {s === 'ALL' ? 'All' : s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category Filter */}
              <div>
                <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1.5">Category</label>
                <div className="flex flex-wrap gap-1.5">
                  {categoryOptions.map(c => (
                    <button
                      key={c}
                      onClick={() => setFilterCategory(c)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${filterCategory === c
                        ? 'bg-amber-600 border-amber-500 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:border-slate-500'
                        }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Position Filter */}
              <div>
                <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1.5">Position</label>
                <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto pr-1">
                  {positionOptions.map(p => (
                    <button
                      key={p}
                      onClick={() => setFilterPosition(p)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${filterPosition === p
                        ? 'bg-purple-600 border-purple-500 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:border-slate-500'
                        }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Player Grid / List ───────────────────────────────────────────── */}
        {loading || isDataLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="glass-card rounded-2xl border border-slate-800 p-5 animate-pulse">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-14 h-14 rounded-xl bg-slate-800" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-800 rounded w-3/4" />
                    <div className="h-3 bg-slate-800 rounded w-1/2" />
                    <div className="h-5 bg-slate-800 rounded w-20" />
                  </div>
                </div>
                <div className="flex gap-1 mb-3">
                  <div className="h-5 bg-slate-800 rounded w-10" />
                  <div className="h-5 bg-slate-800 rounded w-12" />
                </div>
                <div className="h-3 bg-slate-800 rounded w-full" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass-card rounded-2xl border border-slate-800 p-16 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center">
              <Users className="w-8 h-8 text-slate-600" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-300">No Players Found</h3>
              <p className="text-sm text-slate-500 mt-1">
                {search || activeFiltersCount > 0
                  ? 'Try adjusting your search or filters.'
                  : 'No players have registered yet.'}
              </p>
            </div>
            {(search || activeFiltersCount > 0) && (
              <button
                onClick={clearAllFilters}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl transition"
              >
                <RefreshCw className="w-4 h-4" />
                Reset Filters
              </button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 auto-rows-fr">
            {filtered.map(player => (
              <PlayerCardCard
                key={player._id || player.id}
                player={player}
                formatCurrency={formatCurrency}
                teams={teams}
              />
            ))}
          </div>
        ) : (
          /* ── List View ───────────────────────────────────────────────────── */
          <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
            {/* List header */}
            <div className="grid grid-cols-12 gap-3 px-4 py-3 bg-slate-900/70 border-b border-slate-800 text-[10px] font-bold uppercase tracking-widest text-slate-500">
              <div className="col-span-1" />
              <div className="col-span-3">Player</div>
              <div className="col-span-2">Positions</div>
              <div className="col-span-2">Category</div>
              <div className="col-span-2">Price</div>
              <div className="col-span-2 text-center">Status</div>
            </div>

            <div className="divide-y divide-slate-800/60">
              {filtered.map((player, idx) => (
                <PlayerListRow
                  key={player._id || player.id || idx}
                  player={player}
                  formatCurrency={formatCurrency}
                  teams={teams}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Footer note for non-privileged users ─────────────────────────── */}
        {!isPrivileged && (
          <div className="flex items-center justify-center gap-2 py-3 text-xs text-slate-600">
            <Shield className="w-3.5 h-3.5" />
            <span>Some player details are only visible to authenticated staff. <a href="/login" className="text-blue-500 hover:text-blue-400 underline">Sign in</a> for full access.</span>
          </div>
        )}

      </main>
    </div>
  );
}
