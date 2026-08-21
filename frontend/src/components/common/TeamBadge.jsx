import { useState } from 'react';
import { User } from 'lucide-react';
import { getTeamAvatarConfig } from '../../utils/themeConfig';
import { getImageUrl } from '../../utils/imageUrl';

/**
 * Team Icon & Badge Display Component
 * Renders uploaded logo, SVG logo, custom icon, or initials.
 * Border on the avatar uses secondaryColor when available (via inline style).
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
  const IconComponent = avatarConfig.IconComponent;

  const primaryCol  = team.primaryColor  || avatarConfig.primaryColor  || '#3b82f6';
  const secondaryCol = team.secondaryColor || avatarConfig.secondaryColor || '#0f172a';

  // Avatar background = gradient primary → secondary
  const avatarBgStyle = { background: `linear-gradient(135deg, ${primaryCol}, ${secondaryCol})` };

  // Avatar border = secondary color inline (so it actually changes)
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

  // Decide what goes inside the avatar
  const showLogo   = logoUrl && !imgError;
  const showSvg    = !showLogo && team.logoSvg;
  const showIcon   = !showLogo && !showSvg && !!IconComponent;
  const showInitials = !showLogo && !showSvg && !showIcon;

  return (
    <div className={`flex items-center gap-3 ${className}`}>

      {/* ── Avatar / Custom Logo Container ── */}
      <div
        style={{
          ...(showLogo ? undefined : avatarBgStyle),
          ...avatarBorderStyle,
        }}
        className={`relative flex-shrink-0 flex items-center justify-center font-black overflow-hidden shadow-md transition-transform duration-200 group-hover:scale-105 ${dimensions.avatar} ${!avatarConfig.hasCustomColors ? (avatarConfig.borderColorClass || 'border border-sky-500/40') : ''} ${showLogo ? 'bg-slate-900' : ''}`}
      >
        {showLogo ? (
          <img
            src={getImageUrl(logoUrl)}
            alt={team.name || 'Team Logo'}
            onError={() => setImgError(true)}
            className="w-full h-full object-contain p-1"
          />
        ) : showSvg ? (
          <div className="w-full h-full p-1 flex items-center justify-center" dangerouslySetInnerHTML={{ __html: team.logoSvg }} />
        ) : showIcon ? (
          <IconComponent className={`${dimensions.icon} text-white drop-shadow`} />
        ) : (
          <span className="font-mono tracking-tight text-white drop-shadow-md">
            {avatarConfig.initials}
          </span>
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
              <span className={`font-mono font-extrabold px-1.5 py-0.5 rounded border bg-slate-900/90 text-sky-400 border-sky-500/30 ${dimensions.code}`}>
                {team.shortCode || team.code}
              </span>
            )}

            {showManager && (managerName || team.managerId?.name || team.ownerName) && (
              <span className="text-[10px] text-slate-400 font-medium truncate flex items-center gap-1">
                <User className="w-2.5 h-2.5 text-slate-500 flex-shrink-0" />
                <span className="truncate">{managerName || team.managerId?.name || team.ownerName}</span>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
