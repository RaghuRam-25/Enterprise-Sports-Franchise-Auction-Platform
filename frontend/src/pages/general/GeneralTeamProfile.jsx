import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, UserCheck, Users, Info, Eye } from 'lucide-react';
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
        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-secondaryText">
          <ShieldCheck className="w-4 h-4 text-neonGreen" /> Squad ({roster.length})
        </h3>
        {roster.length === 0 ? (
          <p className="text-xs text-mutedText py-6 text-center">No players acquired yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {roster.map(p => {
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
                  {p.category && (
                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border shrink-0 ${catStyle}`}>
                      {p.category}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
