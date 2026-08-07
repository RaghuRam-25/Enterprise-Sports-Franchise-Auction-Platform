import { useState } from 'react';
import { User } from 'lucide-react';
import { getTeamAvatarConfig } from '../../utils/themeConfig';
import { getImageUrl } from '../../utils/imageUrl';

/**
 * Modern Team Icon & Badge Display Component
 * Renders uploaded logo or automatically generates a unique avatar/icon preset with initials and styling.
 */
export default function TeamBadge({
  team,
  size = 'md', // 'sm' | 'md' | 'lg' | 'xl'
  showName = true,
  showCode = true,
  showManager = false,
  managerName = null,
  className = '',
}) {
  const [imgError, setImgError] = useState(false);

  if (!team) return null;

  const logoUrl = team.logoUrl || (typeof team.logo === 'string' && (team.logo.startsWith('http') || team.logo.startsWith('/')) ? team.logo : null);
  const avatarConfig = getTeamAvatarConfig(team);
  const IconComponent = avatarConfig.IconComponent;

  // Team coloring is applied as inline style so custom primary/secondary colors
  // always render (Tailwind cannot build arbitrary classes like from-[#ff0000]
  // at runtime, which silently dropped the custom gradient before).
  const customColors = team.primaryColor || team.secondaryColor;
  const avatarStyle = customColors
    ? {
        backgroundImage: `linear-gradient(135deg, ${team.primaryColor || '#3b82f6'}, ${team.secondaryColor || (team.primaryColor || '#0f172a')})`,
      }
    : undefined;

  // Size mappings
  const dimensions = {
    sm: { avatar: 'w-7 h-7 rounded-lg text-[10px]', icon: 'w-3.5 h-3.5', text: 'text-xs', code: 'text-[9px]' },
    md: { avatar: 'w-10 h-10 rounded-xl text-xs', icon: 'w-5 h-5', text: 'text-sm', code: 'text-[10px]' },
    lg: { avatar: 'w-14 h-14 rounded-2xl text-base', icon: 'w-7 h-7', text: 'text-base', code: 'text-xs' },
    xl: { avatar: 'w-20 h-20 rounded-3xl text-xl', icon: 'w-10 h-10', text: 'text-xl', code: 'text-sm' },
  }[size] || dimensions.md;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      
      {/* Visual Avatar / Custom Logo Container */}
      <div
        style={avatarStyle || undefined}
        className={`relative flex-shrink-0 flex items-center justify-center font-black overflow-hidden border shadow-md transition-transform duration-200 group-hover:scale-105 ${dimensions.avatar} ${avatarConfig.borderColor} ${logoUrl && !imgError ? 'bg-slate-900' : customColors ? '' : `bg-gradient-to-tr ${avatarConfig.bgGradient}`}`}
      >
        
        {logoUrl && !imgError ? (
          <img
            src={getImageUrl(logoUrl)}
            alt={team.name || 'Team Logo'}
            onError={() => setImgError(true)}
            className="w-full h-full object-contain p-1"
          />
        ) : team.logoSvg ? (
          <div className="w-full h-full p-1 flex items-center justify-center" dangerouslySetInnerHTML={{ __html: team.logoSvg }} />
        ) : (
          <div className="flex flex-col items-center justify-center text-white leading-none">
            <IconComponent className={`${dimensions.icon} text-white/90 drop-shadow mb-0.5`} />
            <span className="font-mono tracking-tight text-white drop-shadow-md">
              {avatarConfig.initials}
            </span>
          </div>
        )}

      </div>

      {/* Team Details Block */}
      {(showName || showCode || showManager) && (
        <div className="min-w-0 flex-1">
          {showName && (
            <h4 className={`font-black text-white leading-snug truncate ${dimensions.text}`}>
              {team.name}
            </h4>
          )}

          <div className="flex items-center gap-2 flex-wrap mt-0.5">
            {showCode && (team.shortCode || team.code) && (
              <span className={`font-mono font-extrabold px-1.5 py-0.2 rounded border bg-slate-900/90 text-sky-400 border-sky-500/30 ${dimensions.code}`}>
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
