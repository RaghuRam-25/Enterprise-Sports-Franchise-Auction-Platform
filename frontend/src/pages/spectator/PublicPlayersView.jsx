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
  REGISTERED: { label: 'Registered', color: 'text-neonGreen', bg: 'bg-neonGreen/10', border: 'border-neonGreen/30', icon: UserCheck },
  SOLD: { label: 'Sold', color: 'text-neonGreen', bg: 'bg-neonGreen/10', border: 'border-neonGreen/30', icon: Trophy },
  UNSOLD: { label: 'Unsold', color: 'text-warningGold', bg: 'bg-warningGold/10', border: 'border-warningGold/30', icon: Clock },
  WITHDRAWN: { label: 'Withdrawn', color: 'text-urgentRedText', bg: 'bg-urgentRed/10', border: 'border-urgentRed/30', icon: UserX },
  PENDING: { label: 'Pending', color: 'text-secondaryText', bg: 'bg-surfaceActive/10', border: 'border-borderStrong/30', icon: Clock },
  AVAILABLE: { label: 'Available', color: 'text-neonGreen', bg: 'bg-neonGreen/10', border: 'border-neonGreen/30', icon: Zap },
};

const ROLE_BADGE = {
  SUPER_ADMIN: { label: 'Super Admin', color: 'text-neonGreenHover', bg: 'bg-successGreen/60', border: 'border-successGreen' },
  PODIUM_ADMIN: { label: 'Podium Admin', color: 'text-urgentRedText', bg: 'bg-urgentRed/60', border: 'border-urgentRed' },
  TEAM_MANAGER: { label: 'Team Manager', color: 'text-neonGreenHover', bg: 'bg-successGreen/60', border: 'border-successGreen' },
  PLAYER: { label: 'Player', color: 'text-warningGold', bg: 'bg-warningGold/60', border: 'border-warningGold' },
  null: { label: 'Spectator', color: 'text-secondaryText', bg: 'bg-surfaceHover/60', border: 'border-borderStrong' },
};

const getCategoryRowStyle = (category) => {
  switch (category) {
    case 'Icon Category': return 'bg-warningGold/20 hover:bg-warningGold/40 border-l-4 border-warningGold';
    case 'A Grade': return 'bg-successGreen/20 hover:bg-successGreen/40 border-l-4 border-neonGreen';
    case 'B Grade': return 'bg-successGreen/20 hover:bg-successGreen/40 border-l-4 border-neonGreen';
    case 'Emerging Youth': return 'bg-warningGold/20 hover:bg-warningGold/40 border-l-4 border-warningGold';
    default: return 'hover:bg-surfaceHover/30 border-l-4 border-borderStrong';
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
            className="w-9 h-9 rounded-lg object-cover border border-borderStrong"
          />
        ) : (
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-neonGreen to-successGreen flex items-center justify-center text-darkBg font-black text-sm border border-borderStrong">
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
              ? 'bg-warningGold/15 text-warningGold border border-warningGold/30'
              : 'bg-surfaceHover text-secondaryText border border-borderStrong'
              }`}
          >
            {pos === player.primaryPosition && '* '}{pos}
          </span>
        ))}
        {positions.length > 3 && (
          <span className="px-1.5 py-0.5 rounded text-[9px] text-mutedText bg-surfaceHover border border-borderStrong">
            +{positions.length - 3}
          </span>
        )}
      </div>

      <div className="col-span-2">
        <span className={`text-xs font-semibold ${player.category?.includes('A') ? 'text-warningGold' :
          player.category?.includes('S') ? 'text-warningGold' :
            'text-secondaryText'
          }`}>{player.category || '--'}</span>
      </div>

      <div className="col-span-2 text-xs">
        {isSold ? (
          <>
            <p className="font-mono font-bold text-warningGold">{formatCurrency(player.finalPrice || 0)}</p>
            <p className="text-[10px] text-secondaryText">to {soldToTeam?.name || 'N/A'}</p>
          </>
        ) : (
          <p className="font-mono font-bold text-neonGreen">{formatCurrency(player.basePrice)}</p>
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
    <div className="min-h-screen flex flex-col bg-darkBg text-primaryText">
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
        <div className="glass-card rounded-2xl p-4 border border-borderStrong">
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
                <span className="block text-2xl font-black font-mono text-neonGreen">{filtered.length}</span>
                <span className="text-[10px] text-mutedText uppercase font-bold">of {players.length} Players</span>
              </div>

              {/* View mode toggle */}
              <div className="flex rounded-xl overflow-hidden border border-[#333333] bg-[#151515] p-0.5">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${viewMode === 'grid' ? 'bg-[#58D20A] text-[#050505] shadow-md' : 'text-[#F5F5F5] hover:text-[#58D20A] hover:bg-[#1A1A1A]'}`}
                  title="Grid view"
                >
                  ⊞ Grid
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${viewMode === 'list' ? 'bg-[#58D20A] text-[#050505] shadow-md' : 'text-[#F5F5F5] hover:text-[#58D20A] hover:bg-[#1A1A1A]'}`}
                  title="List view"
                >
                  ≡ List
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Stats Strip ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: 'Total', value: stats.total, color: 'text-neonGreen', icon: Users },
            { label: 'Active', value: stats.registered, color: 'text-neonGreen', icon: UserCheck },
            { label: 'Sold', value: stats.sold, color: 'text-neonGreen', icon: Trophy },
            { label: 'Unsold', value: stats.unsold, color: 'text-warningGold', icon: TrendingUp },
            { label: 'Withdrawn', value: stats.withdrawn, color: 'text-urgentRedText', icon: UserX },
          ].map(({ label, value, color, icon: Icon }) => (
            <div key={label} className="glass-card rounded-xl p-3 border border-cardBorder text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Icon className={`w-3.5 h-3.5 ${color}`} />
                <span className={`text-xl font-black font-mono ${color}`}>{value}</span>
              </div>
              <p className="text-[10px] text-mutedText font-bold uppercase">{label}</p>
            </div>
          ))}
        </div>

        {/* ── Search & Filter Bar ──────────────────────────────────────────── */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-mutedText" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, jersey, student ID or session..."
                className="glass-input w-full pl-10 pr-4 py-2.5 rounded-xl text-sm focus:ring-2 focus:ring-neonGreen/40"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-mutedText hover:text-secondaryText">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(v => !v)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-bold transition ${showFilters || activeFiltersCount > 0
                ? 'bg-[#58D20A] border-[#58D20A] text-[#050505] shadow-md font-extrabold'
                : 'btn-secondary'
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
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-urgentRed/50 bg-urgentRed/10 text-urgentRedText text-xs font-semibold hover:bg-urgentRed/20 transition"
              >
                <X className="w-3.5 h-3.5" />
                Clear
              </button>
            )}
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="glass-card rounded-xl border border-cardBorder p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 animate-slide-in-right">
              {/* Status Filter */}
              <div>
                <label className="block text-[10px] text-mutedText font-bold uppercase mb-1.5">Status</label>
                <div className="flex flex-wrap gap-1.5">
                  {statusOptions.map(s => (
                    <button
                      key={s}
                      onClick={() => setFilterStatus(s)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${filterStatus === s
                        ? 'bg-successGreen border-neonGreen text-darkBg'
                        : 'bg-surfaceHover border-borderStrong text-secondaryText hover:text-white hover:border-borderStrong'
                        }`}
                    >
                      {s === 'ALL' ? 'All' : s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category Filter */}
              <div>
                <label className="block text-[10px] text-mutedText font-bold uppercase mb-1.5">Category</label>
                <div className="flex flex-wrap gap-1.5">
                  {categoryOptions.map(c => (
                    <button
                      key={c}
                      onClick={() => setFilterCategory(c)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${filterCategory === c
                        ? 'bg-warningGold border-warningGold text-darkBg'
                        : 'bg-surfaceHover border-borderStrong text-secondaryText hover:text-white hover:border-borderStrong'
                        }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Position Filter */}
              <div>
                <label className="block text-[10px] text-mutedText font-bold uppercase mb-1.5">Position</label>
                <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto pr-1">
                  {positionOptions.map(p => (
                    <button
                      key={p}
                      onClick={() => setFilterPosition(p)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${filterPosition === p
                        ? 'bg-warningGold border-warningGold text-darkBg'
                        : 'bg-surfaceHover border-borderStrong text-secondaryText hover:text-white hover:border-borderStrong'
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
              <div key={i} className="glass-card rounded-2xl border border-cardBorder p-5 animate-pulse">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-14 h-14 rounded-xl bg-surfaceHover" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-surfaceHover rounded w-3/4" />
                    <div className="h-3 bg-surfaceHover rounded w-1/2" />
                    <div className="h-5 bg-surfaceHover rounded w-20" />
                  </div>
                </div>
                <div className="flex gap-1 mb-3">
                  <div className="h-5 bg-surfaceHover rounded w-10" />
                  <div className="h-5 bg-surfaceHover rounded w-12" />
                </div>
                <div className="h-3 bg-surfaceHover rounded w-full" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass-card rounded-2xl border border-cardBorder p-16 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-surfaceHover flex items-center justify-center">
              <Users className="w-8 h-8 text-mutedText" />
            </div>
            <div>
              <h3 className="text-lg font-black text-secondaryText">No Players Found</h3>
              <p className="text-sm text-mutedText mt-1">
                {search || activeFiltersCount > 0
                  ? 'Try adjusting your search or filters.'
                  : 'No players have registered yet.'}
              </p>
            </div>
            {(search || activeFiltersCount > 0) && (
              <button
                onClick={clearAllFilters}
                className="flex items-center gap-2 px-4 py-2 bg-successGreen hover:bg-neonGreen text-darkBg text-sm font-bold rounded-xl transition"
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
                categories={categories}
              />
            ))}
          </div>
        ) : (
          /* ── List View ───────────────────────────────────────────────────── */
          <div className="glass-card rounded-2xl border border-cardBorder overflow-hidden">
            {/* List header */}
            <div className="grid grid-cols-12 gap-3 px-4 py-3 bg-cardBg/70 border-b border-cardBorder text-[10px] font-bold uppercase tracking-widest text-mutedText">
              <div className="col-span-1" />
              <div className="col-span-3">Player</div>
              <div className="col-span-2">Positions</div>
              <div className="col-span-2">Category</div>
              <div className="col-span-2">Price</div>
              <div className="col-span-2 text-center">Status</div>
            </div>

            <div className="divide-y divide-cardBorder/60">
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
          <div className="flex items-center justify-center gap-2 py-3 text-xs text-mutedText">
            <Shield className="w-3.5 h-3.5" />
            <span>Some player details are only visible to authenticated staff. <a href="/login" className="text-neonGreen hover:text-neonGreen underline">Sign in</a> for full access.</span>
          </div>
        )}

      </main>
    </div>
  );
}
