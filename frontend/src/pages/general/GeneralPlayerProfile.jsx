import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Info, Eye, ShieldCheck, Hash, Tag, CircleDollarSign } from 'lucide-react';
import api from '../../services/api';
import { useAuction } from '../../context/AuctionContext';
import TeamBadge from '../../components/common/TeamBadge';

const CATEGORY_STYLES = {
  'Icon Category': 'bg-warningGold/50 border-warningGold/50 text-warningGold',
  'A Grade': 'bg-successGreen/50 border-successGreen/60 text-neonGreenHover',
  'B Grade': 'bg-successGreen/50 border-successGreen/50 text-neonGreenHover',
  'Emerging Youth': 'bg-warningGold/50 border-warningGold/50 text-warningGold',
  default: 'bg-cardBg/60 border-cardBorder text-secondaryText',
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
      <div className="glass-card rounded-2xl p-10 border border-cardBorder text-center">
        <span className="inline-block w-6 h-6 border-2 border-borderStrong border-t-neonGreen rounded-full animate-spin" />
      </div>
    );
  }

  if (!player) {
    return (
      <div className="glass-card rounded-2xl p-10 border border-cardBorder text-center space-y-3">
        <Info className="w-8 h-8 mx-auto text-mutedText" />
        <p className="text-sm font-bold text-secondaryText">Player not found</p>
        <Link to="/general/players" className="inline-flex items-center gap-1.5 text-xs font-bold text-neonGreen hover:text-neonGreenHover">
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
      <Link to="/general/players" className="inline-flex items-center gap-1.5 text-[11px] font-bold text-secondaryText hover:text-white transition">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Players
      </Link>

      {/* Player header */}
      <div className="relative overflow-hidden rounded-2xl border border-cardBorder bg-gradient-to-r from-successGreen/40 via-cardBg to-darkBg p-6 sm:p-8">
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-5">
          {player.imageUrl ? (
            <img
              src={player.imageUrl}
              alt={player.name}
              className="w-20 h-20 rounded-2xl object-cover border border-borderStrong shrink-0"
              onError={e => { e.currentTarget.style.display = 'none'; }}
            />
          ) : (
            <span className="w-20 h-20 rounded-2xl bg-surfaceHover border border-borderStrong flex items-center justify-center text-xl font-black text-secondaryText shrink-0">
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
                <Link to={`/general/teams/${team._id || team.id}`} className="flex items-center gap-1.5 text-secondaryText hover:text-primaryText transition">
                  <ShieldCheck className="w-3.5 h-3.5" /> {team.name}
                </Link>
              )}
            </div>
          </div>
          <span className="sm:ml-auto flex items-center gap-1.5 text-[11px] font-bold text-mutedText border border-cardBorder rounded-full px-3 py-1 shrink-0">
            <Eye className="w-3.5 h-3.5" /> Public profile
          </span>
        </div>
      </div>

      {/* Public info grid */}
      <section className="glass-card rounded-2xl p-5 border border-cardBorder space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-secondaryText">Player Information</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {facts.map(f => {
            const Icon = f.icon;
            return (
              <div key={f.label} className="bg-cardBg/60 border border-cardBorder rounded-xl p-4 space-y-1.5">
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-mutedText">
                  <Icon className="w-3 h-3" /> {f.label}
                </p>
                <p className="text-sm font-black text-primaryText truncate">{f.value}</p>
              </div>
            );
          })}
        </div>
        {team && (
          <div className="pt-2 border-t border-cardBorder/70 flex items-center justify-between gap-3">
            <span className="text-[11px] text-mutedText">Franchise</span>
            <Link to={`/general/teams/${team._id || team.id}`} className="hover:opacity-80 transition">
              <TeamBadge team={team} size="sm" />
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
