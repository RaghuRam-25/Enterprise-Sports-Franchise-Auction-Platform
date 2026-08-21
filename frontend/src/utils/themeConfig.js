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

// Maps icon name strings (as stored in DB) → Lucide components for Team icons
const TEAM_ICON_MAP = {
  Shield, Trophy, Crown, Flame, Star, Award, Target, Sparkles,
  Feather, Swords, Rocket, Gem, Anchor, Castle,
  // Aliases used in AdminTeams TEAM_ICON_OPTIONS
  Lightning: Zap,
  Falcon: Feather,
  Zap,
};

// ─── Player Category Themes ──────────────────────────────────────────────────

export const CATEGORY_THEMES = {
  'Category A': {
    name: 'Category A', label: 'Cat A', theme: 'blue',
    border: 'border-blue-500/60 hover:border-blue-400',
    headerBg: 'bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500',
    cardGlow: 'shadow-[0_0_20px_rgba(59,130,246,0.15)] hover:shadow-[0_0_30px_rgba(59,130,246,0.3)]',
    badgeBg: 'bg-blue-500/15 text-blue-300 border-blue-500/40',
    accentText: 'text-blue-400', accentBg: 'bg-blue-500', stripColor: '#3b82f6', IconComponent: Medal,
  },
  'Icon Category': {
    name: 'Icon Category', label: 'Icon', theme: 'blue',
    border: 'border-blue-500/60 hover:border-blue-400',
    headerBg: 'bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500',
    cardGlow: 'shadow-[0_0_20px_rgba(59,130,246,0.15)] hover:shadow-[0_0_30px_rgba(59,130,246,0.3)]',
    badgeBg: 'bg-blue-500/15 text-blue-300 border-blue-500/40',
    accentText: 'text-blue-400', accentBg: 'bg-blue-500', stripColor: '#3b82f6', IconComponent: Crown,
  },
  'Category B': {
    name: 'Category B', label: 'Cat B', theme: 'green',
    border: 'border-emerald-500/60 hover:border-emerald-400',
    headerBg: 'bg-gradient-to-r from-emerald-600 via-teal-600 to-green-500',
    cardGlow: 'shadow-[0_0_20px_rgba(16,185,129,0.15)] hover:shadow-[0_0_30px_rgba(16,185,129,0.3)]',
    badgeBg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
    accentText: 'text-emerald-400', accentBg: 'bg-emerald-500', stripColor: '#10b981', IconComponent: Award,
  },
  'Category C': {
    name: 'Category C', label: 'Cat C', theme: 'amber',
    border: 'border-amber-500/60 hover:border-amber-400',
    headerBg: 'bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-400',
    cardGlow: 'shadow-[0_0_20px_rgba(245,158,11,0.15)] hover:shadow-[0_0_30px_rgba(245,158,11,0.3)]',
    badgeBg: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
    accentText: 'text-amber-400', accentBg: 'bg-amber-500', stripColor: '#f59e0b', IconComponent: Star,
  },
  'Category D': {
    name: 'Category D', label: 'Cat D', theme: 'purple',
    border: 'border-purple-500/60 hover:border-purple-400',
    headerBg: 'bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-500',
    cardGlow: 'shadow-[0_0_20px_rgba(168,85,247,0.15)] hover:shadow-[0_0_30px_rgba(168,85,247,0.3)]',
    badgeBg: 'bg-purple-500/15 text-purple-300 border-purple-500/40',
    accentText: 'text-purple-400', accentBg: 'bg-purple-500', stripColor: '#a855f7', IconComponent: Zap,
  },
  'Emerging Youth': {
    name: 'Emerging Youth', label: 'Youth', theme: 'purple',
    border: 'border-purple-500/60 hover:border-purple-400',
    headerBg: 'bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-500',
    cardGlow: 'shadow-[0_0_20px_rgba(168,85,247,0.15)] hover:shadow-[0_0_30px_rgba(168,85,247,0.3)]',
    badgeBg: 'bg-purple-500/15 text-purple-300 border-purple-500/40',
    accentText: 'text-purple-400', accentBg: 'bg-purple-500', stripColor: '#a855f7', IconComponent: Zap,
  },
  'Category E': {
    name: 'Category E', label: 'Cat E', theme: 'red',
    border: 'border-rose-500/60 hover:border-rose-400',
    headerBg: 'bg-gradient-to-r from-rose-600 via-red-600 to-pink-500',
    cardGlow: 'shadow-[0_0_20px_rgba(244,63,94,0.15)] hover:shadow-[0_0_30px_rgba(244,63,94,0.3)]',
    badgeBg: 'bg-rose-500/15 text-rose-300 border-rose-500/40',
    accentText: 'text-rose-400', accentBg: 'bg-rose-500', stripColor: '#f43f5e', IconComponent: Shield,
  },
};

const DEFAULT_CATEGORY_THEME = {
  name: 'Standard', label: 'General', theme: 'sky',
  border: 'border-slate-700/80 hover:border-sky-500/50',
  headerBg: 'bg-gradient-to-r from-slate-700 via-slate-800 to-slate-900',
  cardGlow: 'shadow-[0_0_15px_rgba(15,23,42,0.5)] hover:shadow-[0_0_25px_rgba(56,189,248,0.2)]',
  badgeBg: 'bg-slate-700/40 text-slate-300 border-slate-600',
  accentText: 'text-sky-400', accentBg: 'bg-sky-500', stripColor: '#38bdf8', IconComponent: Tag,
};

const CUSTOM_CATEGORY_PALETTE = [
  { theme: 'sky',     border: 'border-sky-500/60 hover:border-sky-400',     headerBg: 'bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-500',    cardGlow: 'shadow-[0_0_20px_rgba(14,165,233,0.15)]',   badgeBg: 'bg-sky-500/15 text-sky-300 border-sky-500/40',     accentText: 'text-sky-400',     accentBg: 'bg-sky-500',     stripColor: '#0ea5e9' },
  { theme: 'teal',    border: 'border-teal-500/60 hover:border-teal-400',    headerBg: 'bg-gradient-to-r from-teal-600 via-emerald-600 to-green-500',  cardGlow: 'shadow-[0_0_20px_rgba(20,184,166,0.15)]',   badgeBg: 'bg-teal-500/15 text-teal-300 border-teal-500/40',  accentText: 'text-teal-400',    accentBg: 'bg-teal-500',    stripColor: '#14b8a6' },
  { theme: 'violet',  border: 'border-violet-500/60 hover:border-violet-400', headerBg: 'bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-500', cardGlow: 'shadow-[0_0_20px_rgba(139,92,246,0.15)]',  badgeBg: 'bg-violet-500/15 text-violet-300 border-violet-500/40', accentText: 'text-violet-400', accentBg: 'bg-violet-500', stripColor: '#8b5cf6' },
  { theme: 'fuchsia', border: 'border-fuchsia-500/60 hover:border-fuchsia-400', headerBg: 'bg-gradient-to-r from-fuchsia-600 via-pink-600 to-rose-500', cardGlow: 'shadow-[0_0_20px_rgba(217,70,239,0.15)]',  badgeBg: 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/40', accentText: 'text-fuchsia-400', accentBg: 'bg-fuchsia-500', stripColor: '#d946ef' },
  { theme: 'orange',  border: 'border-orange-500/60 hover:border-orange-400', headerBg: 'bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-400', cardGlow: 'shadow-[0_0_20px_rgba(249,115,22,0.15)]',  badgeBg: 'bg-orange-500/15 text-orange-300 border-orange-500/40', accentText: 'text-orange-400', accentBg: 'bg-orange-500', stripColor: '#f97316' },
  { theme: 'rose',    border: 'border-rose-500/60 hover:border-rose-400',    headerBg: 'bg-gradient-to-r from-rose-500 via-pink-600 to-fuchsia-600',  cardGlow: 'shadow-[0_0_20px_rgba(244,63,94,0.15)]',   badgeBg: 'bg-rose-500/15 text-rose-300 border-rose-500/40',   accentText: 'text-rose-400',   accentBg: 'bg-rose-500',   stripColor: '#f43f5e' },
  { theme: 'slate',   border: 'border-slate-500/60 hover:border-slate-400',  headerBg: 'bg-gradient-to-r from-slate-600 via-slate-700 to-slate-800',  cardGlow: 'shadow-[0_0_20px_rgba(100,116,139,0.2)]',  badgeBg: 'bg-slate-500/15 text-slate-300 border-slate-500/40', accentText: 'text-slate-300',  accentBg: 'bg-slate-500',  stripColor: '#64748b' },
];

function buildDynamicCategoryTheme(name, hexColor, iconName) {
  const IconComponent = CATEGORY_ICONS[iconName] || Tag;
  const col = hexColor || '#3b82f6';
  return {
    name: name || 'Category',
    label: name || 'Cat',
    theme: 'custom',
    customColor: col,
    customHeaderStyle: { background: `linear-gradient(135deg, ${col}, #0f172a)` },
    customBadgeStyle: { backgroundColor: `${col}25`, color: col, borderColor: `${col}60` },
    customBorderStyle: { borderColor: `${col}60` },
    border: 'border-slate-700/80',
    headerBg: 'bg-slate-800',
    cardGlow: 'shadow-md',
    badgeBg: 'bg-blue-500/15 text-blue-300 border-blue-500/40',
    accentText: 'text-sky-400',
    accentBg: 'bg-sky-500',
    stripColor: col,
    IconComponent
  };
}

export function getCategoryTheme(categoryName, dbCategories = []) {
  if (!categoryName) return DEFAULT_CATEGORY_THEME;

  if (typeof categoryName === 'object') {
    const name = categoryName.name || 'Category';
    const color = categoryName.color || '#3b82f6';
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
  { name: 'Shield',   Icon: Shield,   bg: 'from-blue-600 via-indigo-700 to-slate-900',    accent: '#3b82f6', border: 'border-blue-500/40' },
  { name: 'Trophy',   Icon: Trophy,   bg: 'from-amber-600 via-amber-700 to-slate-900',    accent: '#f59e0b', border: 'border-amber-500/40' },
  { name: 'Lightning', Icon: Zap,     bg: 'from-yellow-500 via-amber-600 to-slate-900',   accent: '#eab308', border: 'border-yellow-500/40' },
  { name: 'Crown',    Icon: Crown,    bg: 'from-purple-600 via-indigo-800 to-slate-900',  accent: '#a855f7', border: 'border-purple-500/40' },
  { name: 'Flame',    Icon: Flame,    bg: 'from-rose-600 via-orange-600 to-slate-900',    accent: '#f43f5e', border: 'border-rose-500/40' },
  { name: 'Star',     Icon: Star,     bg: 'from-cyan-600 via-blue-800 to-slate-900',      accent: '#06b6d4', border: 'border-cyan-500/40' },
  { name: 'Falcon',   Icon: Feather,  bg: 'from-teal-600 via-emerald-800 to-slate-900',  accent: '#14b8a6', border: 'border-teal-500/40' },
  { name: 'Target',   Icon: Target,   bg: 'from-red-600 via-rose-800 to-slate-900',       accent: '#ef4444', border: 'border-red-500/40' },
  { name: 'Sparkles', Icon: Sparkles, bg: 'from-fuchsia-600 via-purple-800 to-slate-900', accent: '#d946ef', border: 'border-fuchsia-500/40' },
  { name: 'Award',    Icon: Award,    bg: 'from-emerald-600 via-green-800 to-slate-900',  accent: '#10b981', border: 'border-emerald-500/40' },
];

const TEAM_COLOR_PALETTE = [
  { bg: 'from-blue-500 via-blue-700 to-slate-900',      accent: '#3b82f6', border: 'border-blue-500/40' },
  { bg: 'from-emerald-500 via-emerald-700 to-slate-900', accent: '#10b981', border: 'border-emerald-500/40' },
  { bg: 'from-amber-500 via-amber-700 to-slate-900',    accent: '#f59e0b', border: 'border-amber-500/40' },
  { bg: 'from-purple-500 via-purple-700 to-slate-900',  accent: '#a855f7', border: 'border-purple-500/40' },
  { bg: 'from-rose-500 via-rose-700 to-slate-900',      accent: '#f43f5e', border: 'border-rose-500/40' },
  { bg: 'from-cyan-500 via-cyan-700 to-slate-900',      accent: '#06b6d4', border: 'border-cyan-500/40' },
  { bg: 'from-teal-500 via-teal-700 to-slate-900',      accent: '#14b8a6', border: 'border-teal-500/40' },
  { bg: 'from-fuchsia-500 via-fuchsia-700 to-slate-900', accent: '#d946ef', border: 'border-fuchsia-500/40' },
  { bg: 'from-indigo-500 via-indigo-700 to-slate-900',  accent: '#6366f1', border: 'border-indigo-500/40' },
  { bg: 'from-orange-500 via-orange-700 to-slate-900',  accent: '#f97316', border: 'border-orange-500/40' },
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
 * BorderColor returned as a CSS color string (NOT a Tailwind class) so it can be used in inline styles.
 */
export function getTeamAvatarConfig(team = {}) {
  const name = team.name || team.teamName || 'Team';
  const shortCode = team.shortCode || team.code || '';

  let initials = shortCode;
  if (!initials) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      initials = (parts[0][0] + parts[1][0]).toUpperCase();
    } else {
      initials = name.slice(0, 3).toUpperCase();
    }
  }

  if (team.primaryColor || team.icon) {
    const IconComponent = (team.icon && TEAM_ICON_MAP[team.icon]) ? TEAM_ICON_MAP[team.icon] : (team.icon ? Shield : null);
    const primaryColor = team.primaryColor || '#3b82f6';
    const secondaryColor = team.secondaryColor || '#0f172a';

    return {
      initials,
      presetName: team.icon || '',
      IconComponent,
      hasCustomIcon: !!(team.icon && TEAM_ICON_MAP[team.icon]),
      hasCustomColors: !!team.primaryColor,
      primaryColor,
      secondaryColor,
      // borderColorHex is used for inline style on the avatar box border
      borderColorHex: secondaryColor,
      bgGradient: '',
      accentColor: primaryColor,
      logoSvg: team.logoSvg || null,
    };
  }

  const rawId = team._id || team.id || '';
  const hash = stringHash(`${name}-${shortCode}-${rawId}`);
  const iconPreset = ICON_PRESETS[hash % ICON_PRESETS.length];
  const colorPreset = TEAM_COLOR_PALETTE[hash % TEAM_COLOR_PALETTE.length];

  return {
    initials,
    presetName: iconPreset.name,
    IconComponent: iconPreset.Icon,
    hasCustomIcon: true,
    hasCustomColors: false,
    primaryColor: colorPreset.accent,
    secondaryColor: '#0f172a',
    borderColorHex: null, // use Tailwind class
    borderColorClass: iconPreset.border,
    bgGradient: colorPreset.bg,
    accentColor: colorPreset.accent,
    logoSvg: null,
  };
}

// ─── Team Card Themes ────────────────────────────────────────────────────────

export const TEAM_THEMES = [
  { name: 'crimson', gradient: 'from-rose-500/15 via-slate-950/60 to-slate-950',   border: 'border-rose-500/40',   ring: 'hover:shadow-rose-500/20',   accent: 'bg-rose-500',   badgeBg: 'bg-rose-500/15 text-rose-300 border-rose-500/30',   stat: 'text-rose-300' },
  { name: 'amber',   gradient: 'from-amber-500/15 via-slate-950/60 to-slate-950',  border: 'border-amber-500/40',  ring: 'hover:shadow-amber-500/20',  accent: 'bg-amber-500',  badgeBg: 'bg-amber-500/15 text-amber-300 border-amber-500/30',  stat: 'text-amber-300' },
  { name: 'emerald', gradient: 'from-emerald-500/15 via-slate-950/60 to-slate-950', border: 'border-emerald-500/40', ring: 'hover:shadow-emerald-500/20', accent: 'bg-emerald-500', badgeBg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', stat: 'text-emerald-300' },
  { name: 'sky',     gradient: 'from-sky-500/15 via-slate-950/60 to-slate-950',    border: 'border-sky-500/40',    ring: 'hover:shadow-sky-500/20',    accent: 'bg-sky-500',    badgeBg: 'bg-sky-500/15 text-sky-300 border-sky-500/30',    stat: 'text-sky-300' },
  { name: 'violet',  gradient: 'from-violet-500/15 via-slate-950/60 to-slate-950', border: 'border-violet-500/40', ring: 'hover:shadow-violet-500/20', accent: 'bg-violet-500', badgeBg: 'bg-violet-500/15 text-violet-300 border-violet-500/30', stat: 'text-violet-300' },
  { name: 'fuchsia', gradient: 'from-fuchsia-500/15 via-slate-950/60 to-slate-950', border: 'border-fuchsia-500/40', ring: 'hover:shadow-fuchsia-500/20', accent: 'bg-fuchsia-500', badgeBg: 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30', stat: 'text-fuchsia-300' },
  { name: 'teal',    gradient: 'from-teal-500/15 via-slate-950/60 to-slate-950',   border: 'border-teal-500/40',   ring: 'hover:shadow-teal-500/20',   accent: 'bg-teal-500',   badgeBg: 'bg-teal-500/15 text-teal-300 border-teal-500/30',   stat: 'text-teal-300' },
  { name: 'orange',  gradient: 'from-orange-500/15 via-slate-950/60 to-slate-950', border: 'border-orange-500/40', ring: 'hover:shadow-orange-500/20', accent: 'bg-orange-500', badgeBg: 'bg-orange-500/15 text-orange-300 border-orange-500/30', stat: 'text-orange-300' },
  { name: 'indigo',  gradient: 'from-indigo-500/15 via-slate-950/60 to-slate-950', border: 'border-indigo-500/40', ring: 'hover:shadow-indigo-500/20', accent: 'bg-indigo-500', badgeBg: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30', stat: 'text-indigo-300' },
  { name: 'lime',    gradient: 'from-lime-500/15 via-slate-950/60 to-slate-950',   border: 'border-lime-500/40',   ring: 'hover:shadow-lime-500/20',   accent: 'bg-lime-500',   badgeBg: 'bg-lime-500/15 text-lime-300 border-lime-500/30',   stat: 'text-lime-300' },
];

/**
 * Returns theme object for a team card.
 * When team has custom primaryColor/secondaryColor:
 *   - customStyle      → inline style for the card wrapper (background gradient)
 *   - customBorderStyle → inline style for card border (uses secondaryColor)
 *   - customAccentStyle → inline style for the top accent bar (uses primaryColor)
 *   - customBadgeStyle  → inline style for the short-code badge
 *   - customStatStyle   → inline style for stat text
 */
export function getTeamTheme(team) {
  if (!team) return TEAM_THEMES[0];
  const tObj = typeof team === 'object' ? team : { name: String(team) };

  if (tObj.primaryColor) {
    const p = tObj.primaryColor;
    const s = tObj.secondaryColor || '#0f172a';
    return {
      name: 'custom',
      // Card background — primaryColor fades into dark
      customStyle: {
        background: `linear-gradient(135deg, ${p}22 0%, #0b0f19 100%)`,
      },
      // Border uses secondaryColor (the user's request)
      customBorderStyle: {
        borderColor: s,
        borderWidth: '1.5px',
        borderStyle: 'solid',
      },
      customAccentStyle: { background: s },
      customBadgeStyle: { backgroundColor: `${p}25`, color: p, borderColor: `${p}60`, borderWidth: '1px', borderStyle: 'solid' },
      customStatStyle: { color: p },
      // Fallback Tailwind classes (unused when customStyle present)
      gradient: '',
      border: 'border-slate-700',
      ring: 'hover:shadow-lg',
      accent: '',
      badgeBg: '',
      stat: '',
    };
  }

  const key = String(tObj._id || tObj.id || tObj.name || tObj.shortCode || 'team');
  const idx = stringHash(key) % TEAM_THEMES.length;
  return TEAM_THEMES[idx];
}
