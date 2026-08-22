import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, UserCheck, Users, Info, Eye, Search, ArrowUpDown } from 'lucide-react';
import api from '../../services/api';
import TeamBadge from '../../components/common/TeamBadge';

const CATEGORY_STYLES = {
  'Icon Category': 'bg-warningGold/50 border-warningGold/50 text-warningGold',
  'A Grade': 'bg-successGreen/50 border-successGreen/60 text-neonGreenHover',
  'B Grade': 'bg-successGreen/50 border-successGreen/50 text-neonGreenHover',
  'Emerging Youth': 'bg-warningGold/50 border-warningGold/50 text-warningGold',
  default: 'bg-cardBg/60 border-cardBorder text-secondaryText',
};

/**
 * Read-only Team Profile for GENERAL_USER.
 * Data comes from the public /config/teams endpoint (same as PublicTeamsView).
 */
export default function GeneralTeamProfile() {
  const { id } = useParams();
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [nameQuery, setNameQuery] = useState('');
  const [priceSort, setPriceSort] = useState('default'); // default | high | low

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/config/teams');
        const data = res?.data?.data || res?.data || [];
        const found = (Array.isArray(data) ? data : []).find(
          t => String(t._id || t.id) === String(id)
        );
        if (!cancelled) setTeam(found || null);
      } catch {
        if (!cancelled) setTeam(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return (
      <div className="glass-card rounded-2xl p-10 border border-cardBorder text-center">
        <span className="inline-block w-6 h-6 border-2 border-borderStrong border-t-neonGreen rounded-full animate-spin" />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="glass-card rounded-2xl p-10 border border-cardBorder text-center space-y-3">
        <Info className="w-8 h-8 mx-auto text-mutedText" />
        <p className="text-sm font-bold text-secondaryText">Team not found</p>
        <Link to="/general/teams" className="inline-flex items-center gap-1.5 text-xs font-bold text-neonGreen hover:text-neonGreenHover">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Teams
        </Link>
      </div>
    );
  }

  const roster = Array.isArray(team.currentRoster) ? team.currentRoster : [];
  const managerName = team.managerId?.name || team.ownerName || null;

  const priceOf = (p) => Number(p.finalPrice || p.soldPrice || p.basePrice || 0);

  // Filters: player-name search + ৳ price sorting
  const visibleRoster = useMemo(() => {
    let list = [...roster];
    const q = nameQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(p =>
        `${p.jerseyName || ''} ${p.name || ''}`.toLowerCase().includes(q)
      );
    }
    if (priceSort === 'high') list.sort((a, b) => priceOf(b) - priceOf(a));
    else if (priceSort === 'low') list.sort((a, b) => priceOf(a) - priceOf(b));
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roster, nameQuery, priceSort]);

  return (
    <div className="space-y-6">
      <Link to="/general/teams" className="inline-flex items-center gap-1.5 text-[11px] font-bold text-secondaryText hover:text-white transition">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Teams
      </Link>

      {/* Team header */}
      <div
        className="relative overflow-hidden rounded-2xl border border-cardBorder p-6 sm:p-8"
        style={{
          backgroundImage: `linear-gradient(120deg, ${team.primaryColor || '#101010'}22, #050505 60%)`,
        }}
      >
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <TeamBadge team={team} size="xl" showName={false} showCode={false} />
          <div className="space-y-2 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-black text-white">{team.name}</h1>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-mono font-black px-2 py-0.5 rounded bg-neonGreen/15 text-neonGreenHover border border-neonGreen/30">
                {team.shortCode || team.code || 'TEAM'}
              </span>
              {managerName && (
                <span className="flex items-center gap-1 text-secondaryText">
                  <UserCheck className="w-3.5 h-3.5" /> Manager: <strong className="text-primaryText">{managerName}</strong>
                </span>
              )}
              <span className="flex items-center gap-1 text-secondaryText">
                <Users className="w-3.5 h-3.5" /> Squad: <strong className="text-primaryText">{roster.length}</strong>
              </span>
            </div>
          </div>
          <span className="sm:ml-auto flex items-center gap-1.5 text-[11px] font-bold text-mutedText border border-cardBorder rounded-full px-3 py-1 shrink-0">
            <Eye className="w-3.5 h-3.5" /> Read-only profile
          </span>
        </div>
      </div>

      {/* Squad */}
      <section className="glass-card rounded-2xl p-5 border border-cardBorder space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-secondaryText shrink-0">
            <ShieldCheck className="w-4 h-4 text-neonGreen" /> Squad ({roster.length})
          </h3>

          {/* Name search + price sort */}
          <div className="flex flex-col sm:flex-row gap-2.5 sm:ml-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-mutedText pointer-events-none" />
              <input
                type="text"
                value={nameQuery}
                onChange={e => setNameQuery(e.target.value)}
                placeholder="Search player by name..."
                className="w-full sm:w-56 pl-9 pr-3 py-2 rounded-xl text-xs bg-cardBg/80 border border-cardBorder text-primaryText placeholder:text-mutedText focus:outline-none focus:border-neonGreen/60 transition"
              />
            </div>
            <div className="relative">
              <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-mutedText pointer-events-none" />
              <select
                value={priceSort}
                onChange={e => setPriceSort(e.target.value)}
                className="w-full sm:w-auto pl-9 pr-8 py-2 rounded-xl text-xs font-bold bg-cardBg/80 border border-cardBorder text-secondaryText focus:outline-none focus:border-neonGreen/60 transition appearance-none cursor-pointer"
              >
                <option value="default">৳ Price: Default</option>
                <option value="high">৳ Price: High → Low</option>
                <option value="low">৳ Price: Low → High</option>
              </select>
            </div>
          </div>
        </div>

        {roster.length === 0 ? (
          <p className="text-xs text-mutedText py-6 text-center">No players acquired yet.</p>
        ) : visibleRoster.length === 0 ? (
          <p className="text-xs text-mutedText py-6 text-center">No players match your filter.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {visibleRoster.map(p => {
              const catStyle = CATEGORY_STYLES[p.category] || CATEGORY_STYLES.default;
              return (
                <Link
                  key={p._id || p.id}
                  to={`/general/players/${p._id || p.id}`}
                  className="flex items-center gap-3 bg-surfaceActive border border-borderStrong hover:border-borderStrong rounded-xl p-3 transition group"
                >
                  {p.imageUrl ? (
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      className="w-10 h-10 rounded-lg object-cover border border-borderStrong shrink-0"
                      onError={e => { e.currentTarget.style.display = 'none'; }}
                    />
                  ) : (
                    <span className="w-10 h-10 rounded-lg bg-surfaceHover border border-borderStrong flex items-center justify-center text-xs font-black text-secondaryText shrink-0">
                      {(p.jerseyName || p.name || 'P').slice(0, 2).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-primaryText truncate group-hover:text-white">{p.jerseyName || p.name}</p>
                    <p className="text-[11px] text-mutedText truncate">{p.primaryPosition || p.positions?.[0] || '—'}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-[11px] font-mono font-black text-neonGreenHover">৳{priceOf(p).toLocaleString()}</span>
                    {p.category && (
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${catStyle}`}>
                        {p.category}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
