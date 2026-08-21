import { useState } from 'react';
import { User, Trophy, Shield } from 'lucide-react';
import { getTeamAvatarConfig } from '../../utils/themeConfig';
import { getImageUrl } from '../../utils/imageUrl';

/**
 * Team Icon & Badge Display Component
 * Renders uploaded logo image or Lucide SVG Icon (default Trophy/Shield/custom team icon).
 * Auto-generated SVG text circles are bypassed so this box ALWAYS displays an SVG icon.
 */
export default function TeamBadge({
  team,
  size = 'md', // 'sm' | 'md' | 'lg' | 'xl'
  showName = true,
  showCode = false,
  showManager = false,
  managerName = null,
  className = '',
}) {
  const [imgError, setImgError] = useState(false);

  if (!team) return null;

  const logoUrl = team.logoUrl || (typeof team.logo === 'string' && (team.logo.startsWith('http') || team.logo.startsWith('/')) ? team.logo : null);
  const avatarConfig = getTeamAvatarConfig(team);

  // Guarantee an SVG Icon Component (never text/shortcode)
  const FallbackIcon = avatarConfig.IconComponent || Trophy || Shield;

  const primaryCol   = team.primaryColor   || avatarConfig.primaryColor   || '#58D20A';
  const secondaryCol = team.secondaryColor || avatarConfig.secondaryColor || '#050505';

  // Avatar background = gradient primary → secondary
  const avatarBgStyle = { background: `linear-gradient(135deg, ${primaryCol}, ${secondaryCol})` };

  // Avatar border = secondary color inline
  const avatarBorderStyle = avatarConfig.hasCustomColors
    ? { borderColor: secondaryCol, borderWidth: '2px', borderStyle: 'solid' }
    : undefined;

  // Size mappings
  const dimensions = {
    sm: { avatar: 'w-7 h-7 rounded-lg text-[10px]',   icon: 'w-3.5 h-3.5', text: 'text-xs',   code: 'text-[9px]' },
    md: { avatar: 'w-10 h-10 rounded-xl text-xs',      icon: 'w-5 h-5',     text: 'text-sm',   code: 'text-[10px]' },
    lg: { avatar: 'w-14 h-14 rounded-2xl text-base',   icon: 'w-7 h-7',     text: 'text-base', code: 'text-xs' },
    xl: { avatar: 'w-20 h-20 rounded-3xl text-xl',     icon: 'w-10 h-10',   text: 'text-xl',   code: 'text-sm' },
  }[size] || { avatar: 'w-10 h-10 rounded-xl text-xs', icon: 'w-5 h-5', text: 'text-sm', code: 'text-[10px]' };

  const showLogo = logoUrl && !imgError;

  return (
    <div className={`flex items-center gap-3 ${className}`}>

      {/* ── Avatar Container (SVG ICON ONLY) ── */}
      <div
        style={{
          ...(showLogo ? undefined : avatarBgStyle),
          ...avatarBorderStyle,
        }}
        className={`relative flex-shrink-0 flex items-center justify-center overflow-hidden shadow-md transition-transform duration-200 group-hover:scale-105 ${dimensions.avatar} ${!avatarConfig.hasCustomColors ? (avatarConfig.borderColorClass || 'border border-neonGreen/40') : ''} ${showLogo ? 'bg-cardBg' : ''}`}
      >
        {showLogo ? (
          <img
            src={getImageUrl(logoUrl)}
            alt={team.name || 'Team Logo'}
            onError={() => setImgError(true)}
            className="w-full h-full object-contain p-1"
          />
        ) : (
          <FallbackIcon className={`${dimensions.icon} text-white drop-shadow`} />
        )}
      </div>

      {/* ── Team Details Block ── */}
      {(showName || showCode || showManager) && (
        <div className="min-w-0 flex-1">
          {showName && (
            <h4 className={`font-black text-white leading-snug truncate ${dimensions.text}`}>
              {team.name}
            </h4>
          )}

          <div className="flex items-center gap-2 flex-wrap mt-0.5">
            {showCode && (team.shortCode || team.code) && (
              <span className={`font-mono font-extrabold px-1.5 py-0.5 rounded border bg-cardBg/90 text-neonGreen border-neonGreen/30 ${dimensions.code}`}>
                {team.shortCode || team.code}
              </span>
            )}

            {showManager && (managerName || team.managerId?.name || team.ownerName) && (
              <span className="text-[10px] text-secondaryText font-medium truncate flex items-center gap-1">
                <User className="w-2.5 h-2.5 text-mutedText flex-shrink-0" />
                <span className="truncate">{managerName || team.managerId?.name || team.ownerName}</span>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
