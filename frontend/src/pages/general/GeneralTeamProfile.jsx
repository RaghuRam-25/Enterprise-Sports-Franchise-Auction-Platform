import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, UserCheck, Users, Info, Eye } from 'lucide-react';
import api from '../../services/api';
import TeamBadge from '../../components/common/TeamBadge';

const CATEGORY_STYLES = {
  'Icon Category': 'bg-amber-950/50 border-amber-700/50 text-amber-300',
  'A Grade': 'bg-blue-950/50 border-blue-800/60 text-blue-300',
  'B Grade': 'bg-teal-950/50 border-teal-800/50 text-teal-300',
  'Emerging Youth': 'bg-purple-950/50 border-purple-800/50 text-purple-300',
  default: 'bg-slate-900/60 border-slate-800 text-slate-300',
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
      <div className="glass-card rounded-2xl p-10 border border-slate-800 text-center">
        <span className="inline-block w-6 h-6 border-2 border-slate-700 border-t-sky-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="glass-card rounded-2xl p-10 border border-slate-800 text-center space-y-3">
        <Info className="w-8 h-8 mx-auto text-slate-600" />
        <p className="text-sm font-bold text-slate-300">Team not found</p>
        <Link to="/general/teams" className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-400 hover:text-sky-300">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Teams
        </Link>
      </div>
    );
  }

  const roster = Array.isArray(team.currentRoster) ? team.currentRoster : [];
  const managerName = team.managerId?.name || team.ownerName || null;

  return (
    <div className="space-y-6">
      <Link to="/general/teams" className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500 hover:text-slate-300 transition">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Teams
      </Link>

      {/* Team header */}
      <div
        className="relative overflow-hidden rounded-2xl border border-slate-800 p-6 sm:p-8"
        style={{
          backgroundImage: `linear-gradient(120deg, ${team.primaryColor || '#1e293b'}22, #0f172a 60%)`,
        }}
      >
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <TeamBadge team={team} size="xl" showName={false} showCode={false} />
          <div className="space-y-2 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-black text-white">{team.name}</h1>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-mono font-black px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30">
                {team.shortCode || team.code || 'TEAM'}
              </span>
              {managerName && (
                <span className="flex items-center gap-1 text-slate-400">
                  <UserCheck className="w-3.5 h-3.5" /> Manager: <strong className="text-slate-200">{managerName}</strong>
                </span>
              )}
              <span className="flex items-center gap-1 text-slate-400">
                <Users className="w-3.5 h-3.5" /> Squad: <strong className="text-slate-200">{roster.length}</strong>
              </span>
            </div>
          </div>
          <span className="sm:ml-auto flex items-center gap-1.5 text-[11px] font-bold text-slate-500 border border-slate-800 rounded-full px-3 py-1 shrink-0">
            <Eye className="w-3.5 h-3.5" /> Read-only profile
          </span>
        </div>
      </div>

      {/* Squad */}
      <section className="glass-card rounded-2xl p-5 border border-slate-800 space-y-4">
        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
          <ShieldCheck className="w-4 h-4 text-sky-400" /> Squad ({roster.length})
        </h3>
        {roster.length === 0 ? (
          <p className="text-xs text-slate-500 py-6 text-center">No players acquired yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {roster.map(p => {
              const catStyle = CATEGORY_STYLES[p.category] || CATEGORY_STYLES.default;
              return (
                <Link
                  key={p._id || p.id}
                  to={`/general/players/${p._id || p.id}`}
                  className="flex items-center gap-3 bg-slate-900/60 border border-slate-800 hover:border-slate-600 rounded-xl p-3 transition group"
                >
                  {p.imageUrl ? (
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      className="w-10 h-10 rounded-lg object-cover border border-slate-700 shrink-0"
                      onError={e => { e.currentTarget.style.display = 'none'; }}
                    />
                  ) : (
                    <span className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-black text-slate-400 shrink-0">
                      {(p.jerseyName || p.name || 'P').slice(0, 2).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-200 truncate group-hover:text-white">{p.jerseyName || p.name}</p>
                    <p className="text-[11px] text-slate-500 truncate">{p.primaryPosition || p.positions?.[0] || '—'}</p>
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
