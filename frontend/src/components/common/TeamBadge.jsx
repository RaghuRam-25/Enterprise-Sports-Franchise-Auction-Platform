import { useState } from 'react';
import { User, Trophy, Shield, Flame, Swords, Crown, Zap, Star } from 'lucide-react';
import { getTeamAvatarConfig, getTeamTheme } from '../../utils/themeConfig';
import { getImageUrl } from '../../utils/imageUrl';

/**
 * Custom SVG Shield Crest Component for Football Team Badges
 */
export function ShieldCrest({ primaryColor = '#dc2626', secondaryColor = '#7f1d1d', children, size = 'md', className = '' }) {
  const sizeMap = {
    sm: 'w-8 h-9 text-[10px]',
    md: 'w-11 h-12 text-xs',
    lg: 'w-14 h-16 text-base',
    xl: 'w-20 h-24 text-xl'
  };
  const sizeClass = sizeMap[size] || sizeMap.md;

  const gradientId = `shield-grad-${(primaryColor || 'primary').replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <div className={`relative flex items-center justify-center ${sizeClass} shrink-0 drop-shadow-lg group-hover:scale-105 transition-transform duration-200 ${className}`}>
      <svg className="absolute inset-0 w-full h-full filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.6)]" viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={primaryColor} />
            <stop offset="100%" stopColor={secondaryColor || '#0a0a0a'} />
          </linearGradient>
        </defs>
        {/* Shield Outer Path */}
        <path
          d="M50 4 L92 20 V58 C92 90 50 116 50 116 C50 116 8 90 8 58 V20 L50 4 Z"
          fill={`url(#${gradientId})`}
          stroke={primaryColor}
          strokeWidth="3.5"
        />
        {/* Inner Highlight Border */}
        <path
          d="M50 12 L84 25 V56 C84 83 50 106 50 106 C50 106 16 83 16 56 V25 L50 12 Z"
          fill="none"
          stroke="rgba(255,255,255,0.3)"
          strokeWidth="1.5"
        />
      </svg>
      <div className="relative z-10 flex items-center justify-center p-1.5 text-white drop-shadow-md">
        {children}
      </div>
    </div>
  );
}

/**
 * Team Icon & Badge Display Component
 * Renders uploaded logo image or Lucide SVG Icon inside a high-end Football Shield Crest.
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
  const theme = getTeamTheme(team);

  // Select appropriate Lucide Icon based on team name or fallback
  const nameLower = (team.name || '').toLowerCase();
  let FallbackIcon = avatarConfig.IconComponent || Shield;
  if (nameLower.includes('phoenix')) FallbackIcon = Flame;
  else if (nameLower.includes('warrior')) FallbackIcon = Swords;
  else if (nameLower.includes('legend')) FallbackIcon = Crown;
  else if (nameLower.includes('titan')) FallbackIcon = Shield;

  const primaryCol   = theme.primaryColor   || team.primaryColor   || avatarConfig.primaryColor   || '#dc2626';
  const secondaryCol = theme.secondaryColor || team.secondaryColor || avatarConfig.secondaryColor || '#7f1d1d';

  // Size mappings for details text
  const textSizes = {
    sm: { icon: 'w-4 h-4', text: 'text-xs', code: 'text-[9px]' },
    md: { icon: 'w-5 h-5', text: 'text-sm font-bold', code: 'text-[10px]' },
    lg: { icon: 'w-7 h-7', text: 'text-base font-extrabold', code: 'text-xs' },
    xl: { icon: 'w-10 h-10', text: 'text-xl font-black', code: 'text-sm' },
  }[size] || { icon: 'w-5 h-5', text: 'text-sm font-bold', code: 'text-[10px]' };

  const showLogo = logoUrl && !imgError;

  return (
    <div className={`flex items-center gap-3 ${className}`}>

      {/* ── Shield Crest Container ── */}
      <ShieldCrest primaryColor={primaryCol} secondaryColor={secondaryCol} size={size}>
        {showLogo ? (
          <img
            src={getImageUrl(logoUrl)}
            alt={team.name || 'Team Crest'}
            onError={() => setImgError(true)}
            className="w-full h-full object-contain p-0.5"
          />
        ) : (
          <FallbackIcon className={`${textSizes.icon} text-white drop-shadow-md`} />
        )}
      </ShieldCrest>

      {/* ── Team Details Block ── */}
      {(showName || showCode || showManager) && (
        <div className="min-w-0 flex-1">
          {showName && (
            <h4 className={`font-black text-white leading-snug truncate ${textSizes.text}`}>
              {team.name}
            </h4>
          )}

          <div className="flex items-center gap-2 flex-wrap mt-0.5">
            {showCode && (team.shortCode || team.code) && (
              <span className={`font-mono font-extrabold px-1.5 py-0.5 rounded border bg-cardBg/90 text-neonGreen border-neonGreen/30 ${textSizes.code}`}>
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
