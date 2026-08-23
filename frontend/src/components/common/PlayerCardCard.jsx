import React, { useState } from 'react';
import { Trophy, Zap, Star, CheckCircle, Ban, Clock, UserX, Edit3, Lock, Tag, DollarSign, Award } from 'lucide-react';
import { getCategoryTheme, readableAccentText } from '../../utils/themeConfig';
import { getImageUrl } from '../../utils/imageUrl';
import { playerFallback } from '../../utils/playerFallback';
import TeamBadge from '../common/TeamBadge';

const STATUS_BADGES = {
  SOLD: { label: 'Sold', color: 'bg-neonGreen/20 text-white border-[#0B2B26]/40', icon: Trophy },
  ON_PODIUM: { label: 'On Podium', color: 'bg-[#0B2B26] text-white border-[#0B2B26]/40 animate-pulse', icon: Zap },
  BANNED: { label: 'Banned', color: 'bg-[#B00012]/20 text-urgentRedText border-[#B00012]/40', icon: Ban },
  WITHDRAWN: { label: 'Withdrawn', color: 'bg-[#151515] text-[#A3A3A3] border-[#222222]', icon: UserX },
  APPROVED: { label: 'Approved', color: 'bg-[#0B2B26] text-white border-[#0B2B26]/40', icon: CheckCircle },
  REGISTERED: { label: 'Registered', color: 'bg-[#151515] text-[#F4C542] border-[#F4C542]/40', icon: Clock },
  UNSOLD: { label: 'Unsold', color: 'bg-[#151515] text-[#A3A3A3] border-[#222222]', icon: Clock },
  AVAILABLE: { label: 'Available', color: 'bg-[#0B2B26] text-white border-[#0B2B26]/40', icon: Zap },
};

/**
 * Premium Dark Football ID Card Component for Players
 */
export default function PlayerCardCard({
  player,
  formatCurrency = (v) => `${v || 0} BDT`,
  canManage = false,
  onApprove,
  onEdit,
  onToggleBan,
  teams = [],
  categories = [],
  customActions = null,
  showFullDetails = true,
  onCardClick = null,
}) {
  const [imgError, setImgError] = useState(false);
  const theme = getCategoryTheme(player?.category, categories);
  const CategoryIcon = theme.IconComponent || Tag;
  const id = player?._id || player?.id;
  // Category may arrive as a populated document object — never render it raw.
  const categoryLabel = typeof player?.category === 'object'
    ? (player.category?.name || 'Standard')
    : (player.category || 'Standard');

  const positions = Array.isArray(player?.positions) ? player.positions : [];
  const primaryPos = player?.primaryPosition || positions[0] || 'ST';
  const statusCfg = STATUS_BADGES[player?.status?.toUpperCase()] || STATUS_BADGES.REGISTERED;
  const StatusIcon = statusCfg.icon;

  const isSold = player?.status === 'SOLD';
  const soldToTeam = isSold ? teams.find(t => String(t._id || t.id) === String(player?.soldToTeam?._id || player?.soldToTeam)) : null;

  // Card background follows the resolved category accent — every category gets
  // its own subtle tint instead of a single fixed color.
  const accentHex = theme.stripColor || '#0B2B26';

  return (
    <div
      onClick={onCardClick || undefined}
      style={{
        ...(theme.customBorderStyle || {}),
        background: theme.customHeaderStyle?.background || `linear-gradient(170deg, ${accentHex}1c 0%, ${accentHex}0d 30%, #101010 62%)`,
      }}
      className={`relative h-full flex flex-col justify-between rounded-2xl border border-[#222222] overflow-hidden transition-all duration-300 group hover:-translate-y-1.5 hover:shadow-xl ${onCardClick ? 'cursor-pointer' : ''} ${theme.cardGlow}`}
    >

      {/* Top Accent Header Strip — colored by player category */}
      <div
        style={theme.customHeaderStyle || { background: theme.stripColor }}
        className={`h-1.5 w-full`}
      />

      <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">

        {/* Top Header Row: Category Badge & Status Badge */}
        <div className="flex items-center justify-between gap-2">
          <span
            style={theme.customBadgeStyle || undefined}
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-sm ${theme.customBadgeStyle ? '' : theme.badgeBg}`}
          >
            <CategoryIcon className="w-3 h-3" />
            {categoryLabel}
          </span>

          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${statusCfg.color}`}>
            <StatusIcon className="w-2.5 h-2.5" />
            {statusCfg.label}
          </span>
        </div>

        {/* Player Main Details Row (Photo + Info + Jersey Badge) */}
        <div className="flex items-start gap-3 pt-1">
          {/* Photo Frame */}
          <div className="flex-shrink-0 flex flex-col items-center gap-1.5">
            <div className={`w-16 h-16 rounded-xl overflow-hidden border border-[#222222] bg-[#050505] shadow-md`}>
              {!imgError ? (
                <img
                  src={getImageUrl(player, playerFallback('emerald'))}
                  alt={player?.name || 'Player'}
                  onError={() => setImgError(true)}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <img
                  src={playerFallback('emerald')}
                  alt={player?.name || 'Player'}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              )}
            </div>

            {/* Jersey Number / Short Name Badge (fixed position below photo) */}
            <div className="bg-[#050505] text-[#F5F5F5] font-mono font-black text-[10px] px-1.5 py-0.5 rounded-md border border-[#222222] shadow flex items-center gap-0.5 whitespace-nowrap">
              <span className="text-white shrink-0">#</span>
              <span>{(String(player?.jerseyNumber ?? player?.jerseyName ?? '').match(/\d+/) || ['—'])[0]}</span>
            </div>
          </div>

          {/* Name & Academic Session */}
          <div className="flex-1 min-w-0">
            <h3 className="font-black text-[#F5F5F5] text-sm sm:text-base leading-snug truncate group-hover:text-white transition-colors">
              {player?.name || 'Unknown Player'}
            </h3>
            <p className="text-[10px] font-mono text-[#A3A3A3] truncate mt-0.5">
              ID: {player?.studentId || 'N/A'}
            </p>
            <p className="text-[10px] font-medium text-[#A3A3A3] mt-0.5 truncate">
              Session: <span className="text-[#F5F5F5]">{player?.session || 'N/A'}</span>
            </p>
          </div>
        </div>

        {/* Position Badges */}
        <div className="flex flex-wrap gap-1 pt-1">
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wide border shadow-sm bg-[#0B2B26] text-white border-[#0B2B26]/40`}>
            <Star className="w-2.5 h-2.5 inline mr-1 -mt-0.5 fill-current text-white" />
            {primaryPos}
          </span>
          {positions.filter(p => p !== primaryPos).map(pos => (
            <span key={pos} className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide bg-[#151515] text-[#A3A3A3] border border-[#222222]">
              {pos}
            </span>
          ))}
        </div>

        {/* Financial & Auction Details Strip */}
        <div className="bg-[#050505] rounded-xl p-2.5 border border-[#222222] space-y-1.5 text-xs mt-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[#A3A3A3] font-medium flex items-center gap-1">
              <DollarSign className="w-3 h-3 text-[#666666]" /> Base Price
            </span>
            <span className="font-mono font-black text-white text-xs sm:text-sm">
              {formatCurrency(player?.basePrice || 0)}
            </span>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-[#222222]">
            <span className="text-[11px] text-[#A3A3A3] font-medium flex items-center gap-1">
              <Award className="w-3 h-3 text-[#F4C542]" /> Sold Price
            </span>
            <span className={`font-mono font-black text-xs sm:text-sm ${isSold ? 'text-[#F4C542]' : 'text-[#666666]'}`}>
              {isSold ? formatCurrency(player?.finalPrice || 0) : '—'}
            </span>
          </div>
        </div>

        {/* Team Banner (If acquired) */}
        {soldToTeam && (
          <div className="pt-1">
            <TeamBadge team={soldToTeam} size="sm" showManager={true} />
          </div>
        )}

      </div>

      {/* Card Action Footer */}
      {(canManage || customActions) && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="px-4 py-2.5 bg-[#050505] border-t border-[#222222] flex items-center justify-end gap-1.5"
        >
          {customActions ? (
            customActions
          ) : canManage && (
            <>
              {player?.status === 'REGISTERED' && onApprove && (
                <button
                  type="button"
                  id={`approve-${id}`}
                  onClick={(e) => { e.stopPropagation(); onApprove(id, player?.name); }}
                  title="Approve Player"
                  className="btn-primary text-[11px] py-1 px-3"
                >
                  <CheckCircle className="w-3 h-3" /> Approve
                </button>
              )}
              {onEdit && (
                <button
                  type="button"
                  id={`edit-${id}`}
                  onClick={(e) => { e.stopPropagation(); onEdit(player); }}
                  title="Edit Player Details"
                  className="p-1.5 text-[#A3A3A3] hover:text-white hover:bg-[#151515] rounded-lg transition"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              )}
              {onToggleBan && (
                <button
                  type="button"
                  id={`ban-${id}`}
                  onClick={(e) => { e.stopPropagation(); onToggleBan(id, player?.status); }}
                  title={player?.status === 'BANNED' ? 'Unban Player' : 'Ban Player'}
                  className={`p-1.5 rounded-lg transition ${player?.status === 'BANNED' ? 'text-[#F4C542] hover:bg-[#151515]' : 'text-[#A3A3A3] hover:text-[#B00012] hover:bg-[#151515]'}`}
                >
                  {player?.status === 'BANNED' ? <Lock className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
