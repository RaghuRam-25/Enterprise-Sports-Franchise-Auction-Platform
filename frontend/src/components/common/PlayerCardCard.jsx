import React, { useState } from 'react';
import { Shield, Trophy, Zap, Star, CheckCircle, Ban, Clock, UserX, Edit3, Lock, Tag, DollarSign, Award, Layers } from 'lucide-react';
import { getCategoryTheme } from '../../utils/themeConfig';
import { getImageUrl } from '../../utils/imageUrl';
import TeamBadge from '../common/TeamBadge';

const STATUS_BADGES = {
  SOLD: { label: 'Sold', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', icon: Trophy },
  ON_PODIUM: { label: 'On Podium', color: 'bg-blue-500/20 text-blue-300 border-blue-500/40 animate-pulse', icon: Zap },
  BANNED: { label: 'Banned', color: 'bg-rose-500/20 text-rose-300 border-rose-500/40', icon: Ban },
  WITHDRAWN: { label: 'Withdrawn', color: 'bg-slate-700/50 text-slate-400 border-slate-600/40', icon: UserX },
  APPROVED: { label: 'Approved', color: 'bg-teal-500/20 text-teal-300 border-teal-500/40', icon: CheckCircle },
  REGISTERED: { label: 'Registered', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40', icon: Clock },
  UNSOLD: { label: 'Unsold', color: 'bg-orange-500/20 text-orange-300 border-orange-500/40', icon: Clock },
  AVAILABLE: { label: 'Available', color: 'bg-teal-500/20 text-teal-300 border-teal-500/40', icon: Zap },
};

/**
 * Modern Sports ID Card Component for Players
 */
export default function PlayerCardCard({
  player,
  formatCurrency = (v) => `${v || 0} BDT`,
  canManage = false,
  onApprove,
  onEdit,
  onToggleBan,
  teams = [],
  customActions = null,
  showFullDetails = true,
}) {
  const [imgError, setImgError] = useState(false);
  const theme = getCategoryTheme(player?.category);
  const id = player?._id || player?.id;

  const positions = Array.isArray(player?.positions) ? player.positions : [];
  const primaryPos = player?.primaryPosition || positions[0] || 'ST';
  const statusCfg = STATUS_BADGES[player?.status?.toUpperCase()] || STATUS_BADGES.REGISTERED;
  const StatusIcon = statusCfg.icon;

  const isSold = player?.status === 'SOLD';
  const soldToTeam = isSold ? teams.find(t => String(t._id || t.id) === String(player?.soldToTeam?._id || player?.soldToTeam)) : null;

  return (
    <div className={`relative flex flex-col justify-between rounded-2xl border bg-slate-950/80 backdrop-blur-md overflow-hidden transition-all duration-300 group hover:-translate-y-1.5 ${theme.border} ${theme.cardGlow}`}>
      
      {/* Sports Accreditation Header Strip */}
      <div className={`h-2.5 w-full ${theme.headerBg}`} />

      <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
        
        {/* Top Header Row: Category Badge & Status Badge */}
        <div className="flex items-center justify-between gap-2">
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-sm ${theme.badgeBg}`}>
            <Tag className="w-2.5 h-2.5" />
            {player?.category || 'Standard'}
          </span>

          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${statusCfg.color}`}>
            <StatusIcon className="w-2.5 h-2.5" />
            {statusCfg.label}
          </span>
        </div>

        {/* Player Main Details Row (Photo + Info + Jersey Badge) */}
        <div className="flex items-start gap-3 pt-1">
          {/* Photo Frame */}
          <div className="relative flex-shrink-0">
            <div className={`w-16 h-16 rounded-xl overflow-hidden border-2 bg-slate-900 shadow-md ${theme.border}`}>
              {player?.imageUrl && !imgError ? (
                <img
                  src={getImageUrl(player.imageUrl || player.picture)}
                  alt={player?.name}
                  onError={() => setImgError(true)}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className={`w-full h-full ${theme.headerBg} flex items-center justify-center text-white font-black text-2xl`}>
                  {(player?.name || 'P')[0].toUpperCase()}
                </div>
              )}
            </div>

            {/* Jersey Number Overlay Badge (If available) */}
            {(player?.jerseyNumber != null || player?.jerseyName) && (
              <div className="absolute -bottom-1.5 -right-1.5 bg-slate-900 text-white font-mono font-black text-[10px] px-1.5 py-0.5 rounded-md border border-slate-700 shadow flex items-center gap-0.5">
                <span className={theme.accentText}>#</span>
                {player?.jerseyNumber ?? player?.jerseyName}
              </div>
            )}
          </div>

          {/* Name & Academic Session */}
          <div className="flex-1 min-w-0">
            <h3 className="font-black text-white text-sm sm:text-base leading-snug truncate group-hover:text-sky-300 transition-colors">
              {player?.name || 'Unknown Player'}
            </h3>
            {player?.studentId && (
              <p className="text-[10px] font-mono text-slate-400 truncate mt-0.5">
                ID: {player.studentId}
              </p>
            )}
            {player?.session && (
              <p className="text-[10px] font-medium text-slate-400 mt-0.5 truncate">
                Session: <span className="text-slate-200">{player.session}</span>
              </p>
            )}
          </div>
        </div>

        {/* Position Badges */}
        <div className="flex flex-wrap gap-1 pt-1">
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wide border shadow-sm bg-slate-900 ${theme.accentText} ${theme.border}`}>
            <Star className="w-2.5 h-2.5 inline mr-1 -mt-0.5 fill-current" />
            {primaryPos}
          </span>
          {positions.filter(p => p !== primaryPos).map(pos => (
            <span key={pos} className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide bg-slate-900/80 text-slate-400 border border-slate-800">
              {pos}
            </span>
          ))}
        </div>

        {/* Financial & Auction Details Strip */}
        <div className="bg-slate-900/90 rounded-xl p-2.5 border border-slate-800/80 space-y-1.5 text-xs mt-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
              <DollarSign className="w-3 h-3 text-slate-500" /> Base Price
            </span>
            <span className="font-mono font-black text-emerald-400 text-xs sm:text-sm">
              {formatCurrency(player?.basePrice || 0)}
            </span>
          </div>

          {isSold && (
            <div className="flex items-center justify-between pt-1 border-t border-slate-800">
              <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                <Award className="w-3 h-3 text-amber-400" /> Sold Price
              </span>
              <span className="font-mono font-black text-amber-400 text-xs sm:text-sm">
                {formatCurrency(player?.finalPrice || 0)}
              </span>
            </div>
          )}
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
        <div className="px-4 py-2.5 bg-slate-900/90 border-t border-slate-800/80 flex items-center justify-end gap-1.5">
          {customActions ? (
            customActions
          ) : canManage && (
            <>
              {player?.status === 'REGISTERED' && onApprove && (
                <button
                  id={`approve-${id}`}
                  onClick={() => onApprove(id, player?.name)}
                  title="Approve Player"
                  className="px-2.5 py-1 bg-emerald-600/90 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 transition shadow"
                >
                  <CheckCircle className="w-3 h-3" /> Approve
                </button>
              )}
              {onEdit && (
                <button
                  id={`edit-${id}`}
                  onClick={() => onEdit(player)}
                  title="Edit Player Details"
                  className="p-1.5 text-slate-400 hover:text-sky-300 hover:bg-sky-500/10 rounded-lg transition"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              )}
              {onToggleBan && (
                <button
                  id={`ban-${id}`}
                  onClick={() => onToggleBan(id, player?.status)}
                  title={player?.status === 'BANNED' ? 'Unban Player' : 'Ban Player'}
                  className={`p-1.5 rounded-lg transition ${player?.status === 'BANNED' ? 'text-amber-400 hover:bg-amber-500/10' : 'text-slate-400 hover:text-rose-400 hover:bg-rose-500/10'}`}
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
