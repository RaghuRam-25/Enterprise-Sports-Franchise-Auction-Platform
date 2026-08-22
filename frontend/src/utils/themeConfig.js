import React from 'react';
import {
  Shield, Trophy, Zap, Crown, Flame, Star, Award, Target, Sparkles, Feather, Swords, Rocket, Gem, Anchor, Castle,
  Diamond, Medal, Coins, Sparkle, BadgeCheck, StarHalf, CircleDollarSign, Banknote, Pentagon, Hexagon, Octagon, Triangle, Square, CircleDot, Circle, Tag
} from 'lucide-react';

// ─── Icon Maps ──────────────────────────────────────────────────────────────

export const CATEGORY_ICONS = {
  Diamond, Medal, Coins, Sparkle, BadgeCheck, StarHalf, Dollar: CircleDollarSign, CircleDollarSign,
  Banknote, Pentagon, Hexagon, Octagon, Triangle, Square, CircleDot, Circle, Tag, Shield, Trophy, Zap, Crown, Flame, Star
};

const TEAM_ICON_MAP = {
  Shield, shield: Shield,
  Trophy, trophy: Trophy,
  Crown, crown: Crown,
  Flame, flame: Flame,
  Star, star: Star,
  Award, award: Award,
  Target, target: Target,
  Sparkles, sparkles: Sparkles,
  Feather, feather: Feather, Falcon: Feather, falcon: Feather,
  Swords, swords: Swords,
  Rocket, rocket: Rocket,
  Gem, gem: Gem,
  Anchor, anchor: Anchor,
  Castle, castle: Castle,
  Zap, zap: Zap, Lightning: Zap, lightning: Zap
};

export const BPL_FRANCHISE_BRANDS = [
  { match: 'victorians', primaryColor: '#2563EB', secondaryColor: '#1E3A8A', icon: 'Crown' },
  { match: 'barishal',   primaryColor: '#FB923C', secondaryColor: '#9A3412', icon: 'Flame' },
  { match: 'riders',     primaryColor: '#A855F7', secondaryColor: '#581C87', icon: 'Zap' },
  { match: 'strikers',   primaryColor: '#22D3EE', secondaryColor: '#155E75', icon: 'Swords' },
  { match: 'dynamites',  primaryColor: '#0EA5E9', secondaryColor: '#075985', icon: 'Zap' },
  { match: 'kings',      primaryColor: '#EAB308', secondaryColor: '#713F12', icon: 'Crown' },
];

export function getFranchiseBrand(name) {
  const n = String(name || '').toLowerCase();
  return BPL_FRANCHISE_BRANDS.find(b => n.includes(b.match)) || null;
}

// ─── Player Category Themes ──────────────────────────────────────────────────
// Dark charcoal surfaces stay constant; each category gets its OWN accent hue
// (strip / badge / border / glow) so cards are clearly distinguishable.

export const CATEGORY_THEMES = {
  'Category A': {
    name: 'Category A', label: 'Cat A', theme: 'lime',
    border: 'border-[#58D20A]/50 hover:border-[#58D20A]',
    headerBg: 'bg-gradient-to-r from-[#12200E] via-[#0B0B0B] to-[#101010]',
    cardGlow: 'shadow-[0_0_20px_rgba(88,210,10,0.12)] hover:shadow-[0_0_28px_rgba(88,210,10,0.22)]',
    badgeBg: 'bg-[#58D20A]/10 text-[#58D20A] border-[#58D20A]/40',
    accentText: 'text-[#58D20A]', accentBg: 'bg-[#58D20A]', stripColor: '#58D20A', IconComponent: Medal,
  },
  'Icon Category': {
    name: 'Icon Category', label: 'Icon', theme: 'gold',
    border: 'border-[#F4C542]/50 hover:border-[#F4C542]',
    headerBg: 'bg-gradient-to-r from-[#1f1a08] via-[#0B0B0B] to-[#101010]',
    cardGlow: 'shadow-[0_0_20px_rgba(244,197,66,0.10)] hover:shadow-[0_0_28px_rgba(244,197,66,0.2)]',
    badgeBg: 'bg-[#F4C542]/10 text-[#F4C542] border-[#F4C542]/40',
    accentText: 'text-[#F4C542]', accentBg: 'bg-[#F4C542]', stripColor: '#F4C542', IconComponent: Crown,
  },
  'Category B': {
    name: 'Category B', label: 'Cat B', theme: 'cyan',
    border: 'border-[#22D3EE]/50 hover:border-[#22D3EE]',
    headerBg: 'bg-gradient-to-r from-[#08252b] via-[#0B0B0B] to-[#101010]',
    cardGlow: 'shadow-[0_0_20px_rgba(34,211,238,0.10)] hover:shadow-[0_0_28px_rgba(34,211,238,0.2)]',
    badgeBg: 'bg-[#22D3EE]/10 text-[#22D3EE] border-[#22D3EE]/40',
    accentText: 'text-[#22D3EE]', accentBg: 'bg-[#22D3EE]', stripColor: '#22D3EE', IconComponent: Award,
  },
  'Category C': {
    name: 'Category C', label: 'Cat C', theme: 'orange',
    border: 'border-[#FB923C]/50 hover:border-[#FB923C]',
    headerBg: 'bg-gradient-to-r from-[#27160a] via-[#0B0B0B] to-[#101010]',
    cardGlow: 'shadow-[0_0_20px_rgba(251,146,60,0.10)] hover:shadow-[0_0_28px_rgba(251,146,60,0.2)]',
    badgeBg: 'bg-[#FB923C]/10 text-[#FB923C] border-[#FB923C]/40',
    accentText: 'text-[#FB923C]', accentBg: 'bg-[#FB923C]', stripColor: '#FB923C', IconComponent: Star,
  },
  'Category D': {
    name: 'Category D', label: 'Cat D', theme: 'violet',
    border: 'border-[#A78BFA]/50 hover:border-[#A78BFA]',
    headerBg: 'bg-gradient-to-r from-[#17102b] via-[#0B0B0B] to-[#101010]',
    cardGlow: 'shadow-[0_0_20px_rgba(167,139,250,0.10)] hover:shadow-[0_0_28px_rgba(167,139,250,0.2)]',
    badgeBg: 'bg-[#A78BFA]/10 text-[#A78BFA] border-[#A78BFA]/40',
    accentText: 'text-[#A78BFA]', accentBg: 'bg-[#A78BFA]', stripColor: '#A78BFA', IconComponent: Zap,
  },
  'Emerging Youth': {
    name: 'Emerging Youth', label: 'Youth', theme: 'emerald',
    border: 'border-[#34D399]/50 hover:border-[#34D399]',
    headerBg: 'bg-gradient-to-r from-[#0a2419] via-[#0B0B0B] to-[#101010]',
    cardGlow: 'shadow-[0_0_18px_rgba(52,211,153,0.10)] hover:shadow-[0_0_26px_rgba(52,211,153,0.18)]',
    badgeBg: 'bg-[#34D399]/10 text-[#34D399] border-[#34D399]/40',
    accentText: 'text-[#34D399]', accentBg: 'bg-[#34D399]', stripColor: '#34D399', IconComponent: Sparkle,
  },
  'Category E': {
    name: 'Category E', label: 'Cat E', theme: 'red',
    border: 'border-[#FF5C5C]/50 hover:border-[#FF5C5C]',
    headerBg: 'bg-gradient-to-r from-[#1c0a0c] via-[#0B0B0B] to-[#101010]',
    cardGlow: 'shadow-[0_0_16px_rgba(255,92,92,0.08)] hover:shadow-[0_0_24px_rgba(255,92,92,0.15)]',
    badgeBg: 'bg-[#FF5C5C]/10 text-[#FF5C5C] border-[#FF5C5C]/30',
    accentText: 'text-[#FF5C5C]', accentBg: 'bg-[#FF5C5C]', stripColor: '#FF5C5C', IconComponent: Shield,
  },
};

const DEFAULT_CATEGORY_THEME = {
  name: 'Standard', label: 'General', theme: 'silver',
  border: 'border-cardBorder hover:border-[#A3A3A3]/50',
  headerBg: 'bg-gradient-to-r from-[#151515] via-[#0B0B0B] to-[#101010]',
  cardGlow: 'shadow-card hover:shadow-card-hover',
  badgeBg: 'bg-surfaceHover text-secondaryText border-borderStrong',
  accentText: 'text-secondaryText', accentBg: 'bg-secondaryText', stripColor: '#A3A3A3', IconComponent: Tag,
};

// Fallback rotation — one DISTINCT hue per unknown category so cards never blend together.
const CUSTOM_CATEGORY_PALETTE = [
  { theme: 'lime',    border: 'border-[#58D20A]/50 hover:border-[#58D20A]',        headerBg: 'bg-gradient-to-r from-[#12200E] via-[#0B0B0B] to-[#101010]', cardGlow: 'shadow-[0_0_20px_rgba(88,210,10,0.12)]',   badgeBg: 'bg-[#58D20A]/10 text-[#58D20A] border-[#58D20A]/40',   accentText: 'text-[#58D20A]',   accentBg: 'bg-[#58D20A]',   stripColor: '#58D20A' },
  { theme: 'gold',    border: 'border-[#F4C542]/50 hover:border-[#F4C542]',        headerBg: 'bg-gradient-to-r from-[#1f1a08] via-[#0B0B0B] to-[#101010]', cardGlow: 'shadow-[0_0_20px_rgba(244,197,66,0.10)]',  badgeBg: 'bg-[#F4C542]/10 text-[#F4C542] border-[#F4C542]/40',   accentText: 'text-[#F4C542]',   accentBg: 'bg-[#F4C542]',   stripColor: '#F4C542' },
  { theme: 'cyan',    border: 'border-[#22D3EE]/50 hover:border-[#22D3EE]',        headerBg: 'bg-gradient-to-r from-[#08252b] via-[#0B0B0B] to-[#101010]', cardGlow: 'shadow-[0_0_20px_rgba(34,211,238,0.10)]',  badgeBg: 'bg-[#22D3EE]/10 text-[#22D3EE] border-[#22D3EE]/40',   accentText: 'text-[#22D3EE]',   accentBg: 'bg-[#22D3EE]',   stripColor: '#22D3EE' },
  { theme: 'violet',  border: 'border-[#A78BFA]/50 hover:border-[#A78BFA]',        headerBg: 'bg-gradient-to-r from-[#17102b] via-[#0B0B0B] to-[#101010]', cardGlow: 'shadow-[0_0_20px_rgba(167,139,250,0.10)]', badgeBg: 'bg-[#A78BFA]/10 text-[#A78BFA] border-[#A78BFA]/40',   accentText: 'text-[#A78BFA]',   accentBg: 'bg-[#A78BFA]',   stripColor: '#A78BFA' },
  { theme: 'orange',  border: 'border-[#FB923C]/50 hover:border-[#FB923C]',        headerBg: 'bg-gradient-to-r from-[#27160a] via-[#0B0B0B] to-[#101010]', cardGlow: 'shadow-[0_0_20px_rgba(251,146,60,0.10)]',  badgeBg: 'bg-[#FB923C]/10 text-[#FB923C] border-[#FB923C]/40',   accentText: 'text-[#FB923C]',   accentBg: 'bg-[#FB923C]',   stripColor: '#FB923C' },
  { theme: 'rose',    border: 'border-[#FB7185]/50 hover:border-[#FB7185]',        headerBg: 'bg-gradient-to-r from-[#260b12] via-[#0B0B0B] to-[#101010]', cardGlow: 'shadow-[0_0_20px_rgba(251,113,133,0.10)]', badgeBg: 'bg-[#FB7185]/10 text-[#FB7185] border-[#FB7185]/40',   accentText: 'text-[#FB7185]',   accentBg: 'bg-[#FB7185]',   stripColor: '#FB7185' },
  { theme: 'emerald', border: 'border-[#34D399]/50 hover:border-[#34D399]',        headerBg: 'bg-gradient-to-r from-[#0a2419] via-[#0B0B0B] to-[#101010]', cardGlow: 'shadow-[0_0_18px_rgba(52,211,153,0.10)]',  badgeBg: 'bg-[#34D399]/10 text-[#34D399] border-[#34D399]/40',   accentText: 'text-[#34D399]',   accentBg: 'bg-[#34D399]',   stripColor: '#34D399' },
  { theme: 'silver',  border: 'border-borderStrong hover:border-[#A3A3A3]/50',     headerBg: 'bg-gradient-to-r from-[#151515] via-[#0B0B0B] to-[#101010]', cardGlow: 'shadow-card',                              badgeBg: 'bg-surfaceHover text-secondaryText border-borderStrong', accentText: 'text-secondaryText', accentBg: 'bg-secondaryText', stripColor: '#A3A3A3' },
];

function buildDynamicCategoryTheme(name, hexColor, iconName) {
  const IconComponent = CATEGORY_ICONS[iconName] || Tag;
  const col = hexColor || '#58D20A';
  return {
    name: name || 'Category',
    label: name || 'Cat',
    theme: 'custom',
    customColor: col,
    customHeaderStyle: { background: `linear-gradient(135deg, ${col}14, #0B0B0B)` },
    customBadgeStyle: { backgroundColor: `${col}1f`, color: col, borderColor: `${col}66` },
    customBorderStyle: { borderColor: `${col}55` },
    border: 'border-cardBorder',
    headerBg: 'bg-cardBg',
    cardGlow: 'shadow-card',
    badgeBg: 'bg-surfaceHover text-secondaryText border-borderStrong',
    accentText: 'text-secondaryText',
    accentBg: 'bg-secondaryText',
    stripColor: col,
    IconComponent
  };
}

export function getCategoryTheme(categoryName, dbCategories = []) {
  if (!categoryName) return DEFAULT_CATEGORY_THEME;

  if (typeof categoryName === 'object') {
    const name = categoryName.name || 'Category';
    const color = categoryName.color || '#58D20A';
    const iconName = categoryName.icon || 'Tag';
    return buildDynamicCategoryTheme(name, color, iconName);
  }

  const strName = String(categoryName).trim();

  if (Array.isArray(dbCategories) && dbCategories.length > 0) {
    const matched = dbCategories.find(c => String(c.name || '').toLowerCase() === strName.toLowerCase());
    if (matched && (matched.color || matched.icon)) {
      return buildDynamicCategoryTheme(matched.name, matched.color, matched.icon);
    }
  }

  if (CATEGORY_THEMES[strName]) return CATEGORY_THEMES[strName];

  const catLower = strName.toLowerCase();
  const knownKey = Object.keys(CATEGORY_THEMES).find(k => k.toLowerCase() === catLower);
  if (knownKey) return CATEGORY_THEMES[knownKey];

  const preset = CUSTOM_CATEGORY_PALETTE[stringHash(catLower) % CUSTOM_CATEGORY_PALETTE.length];
  return { ...preset, name: strName, label: strName, IconComponent: Tag };
}

// ─── Team Avatar Config ──────────────────────────────────────────────────────

const ICON_PRESETS = [
  { name: 'Shield',   Icon: Shield,   bg: 'from-[#12200E] via-[#0B0B0B] to-[#050505]',  accent: '#58D20A', border: 'border-neonGreen/40' },
  { name: 'Trophy',   Icon: Trophy,   bg: 'from-[#1f1a08] via-[#0B0B0B] to-[#050505]',  accent: '#F4C542', border: 'border-warningGold/40' },
  { name: 'Lightning', Icon: Zap,     bg: 'from-[#12200E] via-[#0B0B0B] to-[#050505]',  accent: '#72F21A', border: 'border-neonGreenHover/40' },
  { name: 'Crown',    Icon: Crown,    bg: 'from-[#1f1a08] via-[#0B0B0B] to-[#050505]',  accent: '#F4C542', border: 'border-warningGold/40' },
  { name: 'Flame',    Icon: Flame,    bg: 'from-[#1c0a0c] via-[#0B0B0B] to-[#050505]',  accent: '#FF5C5C', border: 'border-urgentRedText/40' },
  { name: 'Star',     Icon: Star,     bg: 'from-[#12200E] via-[#0B0B0B] to-[#050505]',  accent: '#35C759', border: 'border-successGreen/40' },
  { name: 'Falcon',   Icon: Feather,  bg: 'from-[#12200E] via-[#0B0B0B] to-[#050505]',  accent: '#58D20A', border: 'border-neonGreen/40' },
  { name: 'Target',   Icon: Target,   bg: 'from-[#1c0a0c] via-[#0B0B0B] to-[#050505]',  accent: '#FF5C5C', border: 'border-urgentRedText/40' },
  { name: 'Sparkles', Icon: Sparkles, bg: 'from-[#1f1a08] via-[#0B0B0B] to-[#050505]',  accent: '#F4C542', border: 'border-warningGold/40' },
  { name: 'Award',    Icon: Award,    bg: 'from-[#12200E] via-[#0B0B0B] to-[#050505]',  accent: '#35C759', border: 'border-successGreen/40' },
];

const TEAM_COLOR_PALETTE = [
  { bg: 'from-[#12200E] via-[#0B0B0B] to-[#050505]',  accent: '#58D20A', border: 'border-neonGreen/40' },
  { bg: 'from-[#1f1a08] via-[#0B0B0B] to-[#050505]',  accent: '#F4C542', border: 'border-warningGold/40' },
  { bg: 'from-[#1c0a0c] via-[#0B0B0B] to-[#050505]',  accent: '#FF5C5C', border: 'border-urgentRedText/40' },
  { bg: 'from-[#12200E] via-[#0B0B0B] to-[#050505]',  accent: '#72F21A', border: 'border-neonGreenHover/40' },
  { bg: 'from-[#151515] via-[#0B0B0B] to-[#050505]',  accent: '#A3A3A3', border: 'border-borderStrong' },
  { bg: 'from-[#12200E] via-[#0B0B0B] to-[#050505]',  accent: '#35C759', border: 'border-successGreen/40' },
];

function stringHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Returns avatar rendering config for a team.
 * Guaranteed to return a valid IconComponent so shortcode initials are never rendered in the icon box.
 */
export function getTeamAvatarConfig(team = {}) {
  const name = team.name || team.teamName || 'Team';
  const shortCode = team.shortCode || team.code || '';
  const rawId = team._id || team.id || '';
  const hash = stringHash(`${name}-${shortCode}-${rawId}`);

  const iconPreset = ICON_PRESETS[hash % ICON_PRESETS.length];
  const colorPreset = TEAM_COLOR_PALETTE[hash % TEAM_COLOR_PALETTE.length];

  let IconComponent = null;
  if (team.icon) {
    const key = String(team.icon).trim();
    IconComponent = TEAM_ICON_MAP[key] || TEAM_ICON_MAP[key.toLowerCase()] || TEAM_ICON_MAP[key.charAt(0).toUpperCase() + key.slice(1)];
  }

  const brand = getFranchiseBrand(name);
  if (!IconComponent && brand) {
    IconComponent = TEAM_ICON_MAP[brand.icon] || null;
  }

  // Guaranteed Icon Fallback (so Vercel/Production teams ALWAYS render an Icon)
  if (!IconComponent) {
    IconComponent = iconPreset.Icon || Shield;
  }

  const primaryColor = team.primaryColor || brand?.primaryColor || colorPreset.accent || '#58D20A';
  const secondaryColor = team.secondaryColor || brand?.secondaryColor || '#0B0B0B';

  return {
    initials: shortCode || name.slice(0, 2).toUpperCase(),
    presetName: team.icon || iconPreset.name,
    IconComponent,
    hasCustomIcon: true,
    hasCustomColors: !!team.primaryColor,
    primaryColor,
    secondaryColor,
    borderColorHex: secondaryColor,
    borderColorClass: iconPreset.border,
    bgGradient: colorPreset.bg,
    accentColor: primaryColor,
    logoSvg: team.logoSvg || null,
  };
}

// ─── Team Card Themes ────────────────────────────────────────────────────────

export const TEAM_THEMES = [
  { name: 'lime',    gradient: 'from-[#12200E]/60 via-cardBg/60 to-cardBg',   border: 'border-neonGreen/40',      ring: 'hover:shadow-[0_0_24px_rgba(88,210,10,0.15)]',   accent: 'bg-neonGreen',      badgeBg: 'bg-[#12200E] text-neonGreen border-neonGreen/30',        stat: 'text-neonGreen' },
  { name: 'gold',    gradient: 'from-[#1f1a08]/60 via-cardBg/60 to-cardBg',   border: 'border-warningGold/40',    ring: 'hover:shadow-[0_0_24px_rgba(244,197,66,0.12)]',  accent: 'bg-warningGold',    badgeBg: 'bg-[#1f1a08] text-warningGold border-warningGold/30',    stat: 'text-warningGold' },
  { name: 'emerald', gradient: 'from-[#12200E]/60 via-cardBg/60 to-cardBg',   border: 'border-successGreen/40',   ring: 'hover:shadow-[0_0_24px_rgba(53,199,89,0.12)]',   accent: 'bg-successGreen',   badgeBg: 'bg-[#12200E] text-successGreen border-successGreen/30',  stat: 'text-successGreen' },
  { name: 'crimson', gradient: 'from-[#1c0a0c]/60 via-cardBg/60 to-cardBg',   border: 'border-urgentRedText/40',  ring: 'hover:shadow-[0_0_24px_rgba(255,92,92,0.10)]',   accent: 'bg-urgentRed',      badgeBg: 'bg-[#1c0a0c] text-urgentRedText border-urgentRedText/30', stat: 'text-urgentRedText' },
  { name: 'silver',  gradient: 'from-surfaceHover/60 via-cardBg/60 to-cardBg', border: 'border-borderStrong',     ring: 'hover:shadow-card-hover',                        accent: 'bg-secondaryText',  badgeBg: 'bg-surfaceHover text-secondaryText border-borderStrong', stat: 'text-secondaryText' },
  { name: 'volt',    gradient: 'from-[#12200E]/60 via-cardBg/60 to-cardBg',   border: 'border-neonGreenHover/40', ring: 'hover:shadow-[0_0_24px_rgba(114,242,26,0.12)]',  accent: 'bg-neonGreenHover', badgeBg: 'bg-[#12200E] text-neonGreenHover border-neonGreenHover/30', stat: 'text-neonGreenHover' },
];

/**
 * Returns theme object for a team card.
 */
export function getTeamTheme(team) {
  if (!team) return TEAM_THEMES[0];
  const tObj = typeof team === 'object' ? team : { name: String(team) };

  const nameLower = (tObj.name || '').toLowerCase();
  if (nameLower.includes('phoenix')) {
    return {
      name: 'phoenix',
      gradient: 'from-[#3b0909]/90 via-[#1a0505]/90 to-[#0d0d0d]',
      border: 'border-red-600/60 hover:border-red-500',
      ring: 'hover:shadow-[0_0_28px_rgba(220,38,38,0.3)]',
      accent: 'bg-gradient-to-r from-red-600 to-amber-600',
      badgeBg: 'bg-red-950/80 text-red-400 border-red-600/40',
      stat: 'text-red-500',
      primaryColor: '#dc2626',
      secondaryColor: '#7f1d1d',
      iconName: 'Flame'
    };
  }
  if (nameLower.includes('titan')) {
    return {
      name: 'titans',
      gradient: 'from-[#091f3b]/90 via-[#051120]/90 to-[#0d0d0d]',
      border: 'border-blue-600/60 hover:border-blue-500',
      ring: 'hover:shadow-[0_0_28px_rgba(37,99,235,0.3)]',
      accent: 'bg-gradient-to-r from-blue-600 to-cyan-500',
      badgeBg: 'bg-blue-950/80 text-blue-400 border-blue-600/40',
      stat: 'text-blue-400',
      primaryColor: '#2563eb',
      secondaryColor: '#1e3a8a',
      iconName: 'Shield'
    };
  }
  if (nameLower.includes('warrior')) {
    return {
      name: 'warriors',
      gradient: 'from-[#093514]/90 via-[#051c0b]/90 to-[#0d0d0d]',
      border: 'border-emerald-600/60 hover:border-emerald-500',
      ring: 'hover:shadow-[0_0_28px_rgba(16,185,129,0.3)]',
      accent: 'bg-gradient-to-r from-emerald-600 to-teal-500',
      badgeBg: 'bg-emerald-950/80 text-emerald-400 border-emerald-600/40',
      stat: 'text-emerald-400',
      primaryColor: '#10b981',
      secondaryColor: '#064e3b',
      iconName: 'Swords'
    };
  }
  if (nameLower.includes('legend')) {
    return {
      name: 'legends',
      gradient: 'from-[#2b0938]/90 via-[#17051f]/90 to-[#0d0d0d]',
      border: 'border-purple-600/60 hover:border-purple-500',
      ring: 'hover:shadow-[0_0_28px_rgba(147,51,234,0.3)]',
      accent: 'bg-gradient-to-r from-purple-600 to-fuchsia-500',
      badgeBg: 'bg-purple-950/80 text-purple-400 border-purple-600/40',
      stat: 'text-purple-400',
      primaryColor: '#9333ea',
      secondaryColor: '#581c87',
      iconName: 'Crown'
    };
  }

  const brand = getFranchiseBrand(tObj.name);
  if (tObj.primaryColor || brand) {
    const p = tObj.primaryColor || brand.primaryColor;
    const s = tObj.secondaryColor || brand.secondaryColor;
    return {
      name: 'custom',
      customStyle: {
        background: `linear-gradient(135deg, ${p}22 0%, #101010 100%)`,
      },
      customBorderStyle: {
        borderColor: s,
        borderWidth: '1.5px',
        borderStyle: 'solid',
      },
      customAccentStyle: { background: s },
      customBadgeStyle: { backgroundColor: `${p}1f`, color: p, borderColor: `${p}55`, borderWidth: '1px', borderStyle: 'solid' },
      customStatStyle: { color: p },
      gradient: '',
      border: 'border-cardBorder',
      ring: 'hover:shadow-lg',
      accent: '',
      badgeBg: '',
      stat: '',
      primaryColor: p,
      secondaryColor: s,
      iconName: brand?.icon,
    };
  }

  const key = String(tObj._id || tObj.id || tObj.name || tObj.shortCode || 'team');
  const idx = stringHash(key) % TEAM_THEMES.length;
  return TEAM_THEMES[idx];
}
