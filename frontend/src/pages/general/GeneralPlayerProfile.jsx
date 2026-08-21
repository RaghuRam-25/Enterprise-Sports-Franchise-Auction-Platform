import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Info, Eye, ShieldCheck, Hash, Tag, CircleDollarSign } from 'lucide-react';
import api from '../../services/api';
import { useAuction } from '../../context/AuctionContext';
import TeamBadge from '../../components/common/TeamBadge';

const CATEGORY_STYLES = {
  'Icon Category': 'bg-amber-950/50 border-amber-700/50 text-amber-300',
  'A Grade': 'bg-blue-950/50 border-blue-800/60 text-blue-300',
  'B Grade': 'bg-teal-950/50 border-teal-800/50 text-teal-300',
  'Emerging Youth': 'bg-purple-950/50 border-purple-800/50 text-purple-300',
  default: 'bg-slate-900/60 border-slate-800 text-slate-300',
};

/**
 * Read-only Player Profile for GENERAL_USER.
 * Uses the public /players endpoint which already strips private fields
 * (email, phone, auth data) for non-privileged roles — only public
 * information is rendered here.
 */
export default function GeneralPlayerProfile() {
  const { id } = useParams();
  const { teams, formatCurrency } = useAuction();
  const [player, setPlayer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/players');
        const data = res?.data?.data || res?.data || [];
        const found = (Array.isArray(data) ? data : []).find(
          p => String(p._id || p.id) === String(id)
        );
        if (!cancelled) setPlayer(found || null);
      } catch {
        if (!cancelled) setPlayer(null);
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

  if (!player) {
    return (
      <div className="glass-card rounded-2xl p-10 border border-slate-800 text-center space-y-3">
        <Info className="w-8 h-8 mx-auto text-slate-600" />
        <p className="text-sm font-bold text-slate-300">Player not found</p>
        <Link to="/general/players" className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-400 hover:text-sky-300">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Players
        </Link>
      </div>
    );
  }

  const team = teams?.find(t =>
    String(t._id || t.id) === String(player.soldToTeam?._id || player.soldToTeam || player.teamId?._id || player.teamId)
  ) || null;
  const catStyle = CATEGORY_STYLES[player.category] || CATEGORY_STYLES.default;

  const facts = [
    { icon: Tag, label: 'Position', value: player.primaryPosition || player.positions?.[0] || '—' },
    { icon: Tag, label: 'Category', value: player.category || '—' },
    { icon: Hash, label: 'Jersey', value: player.tShirtNumber || player.jerseyName || '—' },
    { icon: CircleDollarSign, label: player.status === 'SOLD' ? 'Sold For' : 'Base Price', value: formatCurrency ? formatCurrency(player.status === 'SOLD' && player.finalPrice ? player.finalPrice : player.basePrice) : (player.finalPrice || player.basePrice) },
  ];

  return (
    <div className="space-y-6">
      <Link to="/general/players" className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500 hover:text-slate-300 transition">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Players
      </Link>

      {/* Player header */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-r from-sky-950/40 via-slate-900 to-slate-950 p-6 sm:p-8">
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-5">
          {player.imageUrl ? (
            <img
              src={player.imageUrl}
              alt={player.name}
              className="w-20 h-20 rounded-2xl object-cover border border-slate-700 shrink-0"
              onError={e => { e.currentTarget.style.display = 'none'; }}
            />
          ) : (
            <span className="w-20 h-20 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-xl font-black text-slate-400 shrink-0">
              {(player.jerseyName || player.name || 'P').slice(0, 2).toUpperCase()}
            </span>
          )}
          <div className="space-y-2 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-black text-white">{player.jerseyName || player.name}</h1>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {player.category && (
                <span className={`font-bold uppercase px-2 py-0.5 rounded border ${catStyle}`}>{player.category}</span>
              )}
              {team && (
                <Link to={`/general/teams/${team._id || team.id}`} className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 transition">
                  <ShieldCheck className="w-3.5 h-3.5" /> {team.name}
                </Link>
              )}
            </div>
          </div>
          <span className="sm:ml-auto flex items-center gap-1.5 text-[11px] font-bold text-slate-500 border border-slate-800 rounded-full px-3 py-1 shrink-0">
            <Eye className="w-3.5 h-3.5" /> Public profile
          </span>
        </div>
      </div>

      {/* Public info grid */}
      <section className="glass-card rounded-2xl p-5 border border-slate-800 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Player Information</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {facts.map(f => {
            const Icon = f.icon;
            return (
              <div key={f.label} className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-1.5">
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <Icon className="w-3 h-3" /> {f.label}
                </p>
                <p className="text-sm font-black text-slate-100 truncate">{f.value}</p>
              </div>
            );
          })}
        </div>
        {team && (
          <div className="pt-2 border-t border-slate-800/70 flex items-center justify-between gap-3">
            <span className="text-[11px] text-slate-500">Franchise</span>
            <Link to={`/general/teams/${team._id || team.id}`} className="hover:opacity-80 transition">
              <TeamBadge team={team} size="sm" />
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
