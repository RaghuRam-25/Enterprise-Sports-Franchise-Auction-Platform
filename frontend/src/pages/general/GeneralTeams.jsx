import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Search, Users, UserCheck, Eye, Info } from 'lucide-react';
import api from '../../services/api';
import TeamBadge from '../../components/common/TeamBadge';

/**
 * GENERAL_USER Teams browser — read-only.
 * Lists every franchise with logo, name, manager (where public),
 * squad size and status. Clicking a team opens the read-only
 * Team Profile page (/general/teams/:id).
 */
export default function GeneralTeams() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/config/teams');
        const data = res?.data?.data || res?.data || [];
        if (!cancelled) setTeams(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setTeams([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return teams;
    return teams.filter(t =>
      (t.name || '').toLowerCase().includes(q) ||
      (t.shortCode || t.code || '').toLowerCase().includes(q) ||
      (t.ownerName || t.managerId?.name || '').toLowerCase().includes(q)
    );
  }, [teams, search]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-black text-white">
            <ShieldCheck className="w-5 h-5 text-warningGold" /> Teams
          </h1>
          <p className="text-xs text-secondaryText mt-1">
            Browse every franchise in the tournament — tap a team for its full squad profile.
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-mutedText" />
          <input
            type="text"
            placeholder="Search teams…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="glass-input w-full rounded-xl pl-9 pr-3 py-2 text-xs"
          />
        </div>
      </div>

      {loading ? (
        <div className="glass-card rounded-2xl p-10 border border-cardBorder text-center">
          <span className="inline-block w-6 h-6 border-2 border-borderStrong border-t-warningGold rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card rounded-2xl p-10 border border-cardBorder text-center space-y-2">
          <Info className="w-8 h-8 mx-auto text-mutedText" />
          <p className="text-sm font-bold text-secondaryText">
            {search ? 'No teams match your search' : 'No franchises created yet'}
          </p>
          <p className="text-xs text-mutedText">Check back once the auction season begins.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(team => {
            const rosterCount = Array.isArray(team.currentRoster) ? team.currentRoster.length : 0;
            const managerName = team.managerId?.name || team.ownerName || null;
            return (
              <Link
                key={team._id || team.id}
                to={`/general/teams/${team._id || team.id}`}
                className="glass-card glass-card-hover rounded-2xl border border-borderStrong p-5 flex items-center gap-4 group"
              >
                <TeamBadge team={team} size="lg" showName={false} showCode={false} />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <p className="text-sm font-black text-white truncate group-hover:text-warningGold transition">
                    {team.name}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-mutedText">
                    <span className="font-mono font-bold px-1.5 py-0.5 rounded bg-warningGold/10 text-warningGold border border-warningGold/30">
                      {team.shortCode || team.code || 'TEAM'}
                    </span>
                    {managerName && (
                      <span className="flex items-center gap-1 truncate">
                        <UserCheck className="w-3 h-3" /> {managerName}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" /> {rosterCount} players
                    </span>
                  </div>
                </div>
                <span className="w-8 h-8 rounded-xl bg-cardBg/80 border border-cardBorder flex items-center justify-center text-mutedText group-hover:text-warningGold group-hover:border-warningGold/40 transition shrink-0">
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
