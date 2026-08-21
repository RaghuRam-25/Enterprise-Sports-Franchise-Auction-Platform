import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { UserCheck, Search, Filter, Eye, Info, Tag } from 'lucide-react';
import { useAuction } from '../../context/AuctionContext';
import TeamBadge from '../../components/common/TeamBadge';

const CATEGORY_STYLES = {
  'Icon Category': 'bg-warningGold/50 border-warningGold/50 text-warningGold',
  'A Grade': 'bg-successGreen/50 border-successGreen/60 text-neonGreenHover',
  'B Grade': 'bg-successGreen/50 border-successGreen/50 text-neonGreenHover',
  'Emerging Youth': 'bg-warningGold/50 border-warningGold/50 text-warningGold',
  default: 'bg-cardBg/60 border-cardBorder text-secondaryText',
};

const STATUS_STYLES = {
  SOLD: 'bg-successGreen/50 border-neonGreen/40 text-neonGreenHover',
  REGISTERED: 'bg-successGreen/50 border-neonGreen/40 text-neonGreenHover',
  APPROVED: 'bg-successGreen/50 border-neonGreen/40 text-neonGreenHover',
  ON_PODIUM: 'bg-urgentRed/50 border-urgentRed/40 text-urgentRedText animate-pulse',
  UNSOLD: 'bg-cardBg/60 border-borderStrong text-secondaryText',
  WITHDRAWN: 'bg-cardBg/60 border-borderStrong text-mutedText',
  BANNED: 'bg-urgentRed/60 border-urgentRed text-urgentRedText',
  default: 'bg-cardBg/60 border-cardBorder text-secondaryText',
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
            <UserCheck className="w-5 h-5 text-neonGreen" /> Players
          </h1>
          <p className="text-xs text-secondaryText mt-1">
            Every registered player in the league — public profiles only.
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-mutedText" />
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
      <div className="glass-card rounded-2xl border border-cardBorder p-4 flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-mutedText">
          <Filter className="w-3.5 h-3.5" /> Filters
        </span>
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="glass-input rounded-xl px-3 py-1.5 text-xs"
          aria-label="Filter by category"
        >
          {categories.map(c => (
            <option key={c} value={c} className="bg-cardBg">{c === 'ALL' ? 'All Categories' : c}</option>
          ))}
        </select>
        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          className="glass-input rounded-xl px-3 py-1.5 text-xs"
          aria-label="Filter by status"
        >
          {statuses.map(s => (
            <option key={s} value={s} className="bg-cardBg">{s === 'ALL' ? 'All Statuses' : s.replace('_', ' ')}</option>
          ))}
        </select>
        <span className="ml-auto text-[11px] font-bold text-mutedText">
          {filtered.length} player{filtered.length === 1 ? '' : 's'}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="glass-card rounded-2xl p-10 border border-cardBorder text-center space-y-2">
          <Info className="w-8 h-8 mx-auto text-mutedText" />
          <p className="text-sm font-bold text-secondaryText">No players found</p>
          <p className="text-xs text-mutedText">Try adjusting your search or filters.</p>
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
                className="glass-card glass-card-hover rounded-2xl border border-borderStrong p-4 flex items-center gap-4 group"
              >
                {player.imageUrl ? (
                  <img
                    src={player.imageUrl}
                    alt={player.name}
                    className="w-14 h-14 rounded-xl object-cover border border-borderStrong shrink-0"
                    onError={e => { e.currentTarget.style.visibility = 'hidden'; }}
                  />
                ) : (
                  <span className="w-14 h-14 rounded-xl bg-surfaceHover border border-borderStrong flex items-center justify-center text-sm font-black text-secondaryText shrink-0">
                    {(player.jerseyName || player.name || 'P').slice(0, 2).toUpperCase()}
                  </span>
                )}
                <div className="min-w-0 flex-1 space-y-1.5">
                  <p className="text-sm font-black text-white truncate group-hover:text-neonGreenHover transition">
                    {player.jerseyName || player.name}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-mutedText">
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
                <span className="w-8 h-8 rounded-xl bg-cardBg/80 border border-cardBorder flex items-center justify-center text-mutedText group-hover:text-neonGreenHover group-hover:border-neonGreen/40 transition shrink-0">
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
