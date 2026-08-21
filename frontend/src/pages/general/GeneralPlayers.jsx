import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { UserCheck, Search, Filter, Eye, Info, Tag } from 'lucide-react';
import { useAuction } from '../../context/AuctionContext';
import TeamBadge from '../../components/common/TeamBadge';

const CATEGORY_STYLES = {
  'Icon Category': 'bg-amber-950/50 border-amber-700/50 text-amber-300',
  'A Grade': 'bg-blue-950/50 border-blue-800/60 text-blue-300',
  'B Grade': 'bg-teal-950/50 border-teal-800/50 text-teal-300',
  'Emerging Youth': 'bg-purple-950/50 border-purple-800/50 text-purple-300',
  default: 'bg-slate-900/60 border-slate-800 text-slate-300',
};

const STATUS_STYLES = {
  SOLD: 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300',
  REGISTERED: 'bg-sky-950/50 border-sky-500/40 text-sky-300',
  APPROVED: 'bg-sky-950/50 border-sky-500/40 text-sky-300',
  ON_PODIUM: 'bg-rose-950/50 border-rose-500/40 text-rose-300 animate-pulse',
  UNSOLD: 'bg-slate-900/60 border-slate-700 text-slate-400',
  WITHDRAWN: 'bg-slate-900/60 border-slate-700 text-slate-500',
  BANNED: 'bg-rose-950/60 border-rose-700 text-rose-400',
  default: 'bg-slate-900/60 border-slate-800 text-slate-400',
};

/**
 * GENERAL_USER Players browser — read-only.
 * Uses the public /players endpoint which strips private fields
 * (email, phone, auth data) for non-privileged roles. Clicking a
 * player opens the read-only Player Profile (/general/players/:id).
 */
export default function GeneralPlayers() {
  const { players: ctxPlayers, teams = [], refetchPlayers } = useAuction();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('ALL');
  const [status, setStatus] = useState('ALL');

  useEffect(() => {
    if (typeof refetchPlayers === 'function') refetchPlayers();
  }, [refetchPlayers]);

  const players = useMemo(() => (Array.isArray(ctxPlayers) ? ctxPlayers : []), [ctxPlayers]);

  const categories = useMemo(
    () => ['ALL', ...new Set(players.map(p => p.category).filter(Boolean))],
    [players]
  );
  const statuses = useMemo(
    () => ['ALL', ...new Set(players.map(p => p.status).filter(Boolean))],
    [players]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return players.filter(p => {
      const matchSearch =
        !q ||
        (p.name || '').toLowerCase().includes(q) ||
        (p.jerseyName || '').toLowerCase().includes(q);
      const matchCategory = category === 'ALL' || p.category === category;
      const matchStatus = status === 'ALL' ||
        (p.status || '').toUpperCase() === status;
      return matchSearch && matchCategory && matchStatus;
    });
  }, [players, search, category, status]);

  const teamOf = (p) =>
    teams.find(t => String(t._id || t.id) === String(p.soldToTeam?._id || p.soldToTeam)) || null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-black text-white">
            <UserCheck className="w-5 h-5 text-sky-400" /> Players
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Every registered player in the league — public profiles only.
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search players…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="glass-input w-full rounded-xl pl-9 pr-3 py-2 text-xs"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card rounded-2xl border border-slate-800 p-4 flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
          <Filter className="w-3.5 h-3.5" /> Filters
        </span>
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="glass-input rounded-xl px-3 py-1.5 text-xs"
          aria-label="Filter by category"
        >
          {categories.map(c => (
            <option key={c} value={c} className="bg-slate-900">{c === 'ALL' ? 'All Categories' : c}</option>
          ))}
        </select>
        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          className="glass-input rounded-xl px-3 py-1.5 text-xs"
          aria-label="Filter by status"
        >
          {statuses.map(s => (
            <option key={s} value={s} className="bg-slate-900">{s === 'ALL' ? 'All Statuses' : s.replace('_', ' ')}</option>
          ))}
        </select>
        <span className="ml-auto text-[11px] font-bold text-slate-500">
          {filtered.length} player{filtered.length === 1 ? '' : 's'}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="glass-card rounded-2xl p-10 border border-slate-800 text-center space-y-2">
          <Info className="w-8 h-8 mx-auto text-slate-600" />
          <p className="text-sm font-bold text-slate-300">No players found</p>
          <p className="text-xs text-slate-500">Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(player => {
            const team = teamOf(player);
            const catStyle = CATEGORY_STYLES[player.category] || CATEGORY_STYLES.default;
            const stStyle = STATUS_STYLES[(player.status || '').toUpperCase()] || STATUS_STYLES.default;
            return (
              <Link
                key={player._id || player.id}
                to={`/general/players/${player._id || player.id}`}
                className="glass-card glass-card-hover rounded-2xl border border-slate-800 p-4 flex items-center gap-4 group"
              >
                {player.imageUrl ? (
                  <img
                    src={player.imageUrl}
                    alt={player.name}
                    className="w-14 h-14 rounded-xl object-cover border border-slate-700 shrink-0"
                    onError={e => { e.currentTarget.style.visibility = 'hidden'; }}
                  />
                ) : (
                  <span className="w-14 h-14 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-sm font-black text-slate-400 shrink-0">
                    {(player.jerseyName || player.name || 'P').slice(0, 2).toUpperCase()}
                  </span>
                )}
                <div className="min-w-0 flex-1 space-y-1.5">
                  <p className="text-sm font-black text-white truncate group-hover:text-sky-300 transition">
                    {player.jerseyName || player.name}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Tag className="w-3 h-3" /> {player.primaryPosition || player.positions?.[0] || '—'}
                    </span>
                    {team && (
                      <span className="flex items-center gap-1 min-w-0">
                        <TeamBadge team={team} size="sm" showName={false} showCode={false} />
                        <span className="truncate">{team.shortCode || team.code || team.name}</span>
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {player.category && (
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${catStyle}`}>
                        {player.category}
                      </span>
                    )}
                    {player.status && (
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${stStyle}`}>
                        {(player.status || '').replace('_', ' ')}
                      </span>
                    )}
                  </div>
                </div>
                <span className="w-8 h-8 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-center text-slate-500 group-hover:text-sky-300 group-hover:border-sky-500/40 transition shrink-0">
                  <Eye className="w-4 h-4" />
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
