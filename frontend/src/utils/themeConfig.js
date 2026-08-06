import React from 'react';
import { Shield, Trophy, Zap, Crown, Flame, Star, Award, Target, Sparkles, Feather } from 'lucide-react';

/**
 * Modern Sports Category Theme & Color System
 * Provides color mapping (borders, badges, accents, gradients) for player categories.
 */
export const CATEGORY_THEMES = {
  // Category A / Icon Category -> Blue / Cyan
  'Category A': {
    name: 'Category A',
    label: 'Cat A',
    theme: 'blue',
    border: 'border-blue-500/60 hover:border-blue-400',
    headerBg: 'bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500',
    cardGlow: 'shadow-[0_0_20px_rgba(59,130,246,0.15)] hover:shadow-[0_0_30px_rgba(59,130,246,0.3)]',
    badgeBg: 'bg-blue-500/15 text-blue-300 border-blue-500/40',
    accentText: 'text-blue-400',
    accentBg: 'bg-blue-500',
    stripColor: '#3b82f6',
  },
  'Icon Category': {
    name: 'Icon Category',
    label: 'Icon',
    theme: 'blue',
    border: 'border-blue-500/60 hover:border-blue-400',
    headerBg: 'bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500',
    cardGlow: 'shadow-[0_0_20px_rgba(59,130,246,0.15)] hover:shadow-[0_0_30px_rgba(59,130,246,0.3)]',
    badgeBg: 'bg-blue-500/15 text-blue-300 border-blue-500/40',
    accentText: 'text-blue-400',
    accentBg: 'bg-blue-500',
    stripColor: '#3b82f6',
  },

  // Category B / A Grade -> Green / Emerald
  'Category B': {
    name: 'Category B',
    label: 'Cat B',
    theme: 'green',
    border: 'border-emerald-500/60 hover:border-emerald-400',
    headerBg: 'bg-gradient-to-r from-emerald-600 via-teal-600 to-green-500',
    cardGlow: 'shadow-[0_0_20px_rgba(16,185,129,0.15)] hover:shadow-[0_0_30px_rgba(16,185,129,0.3)]',
    badgeBg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
    accentText: 'text-emerald-400',
    accentBg: 'bg-emerald-500',
    stripColor: '#10b981',
  },
  'A Grade': {
    name: 'A Grade',
    label: 'Grade A',
    theme: 'green',
    border: 'border-emerald-500/60 hover:border-emerald-400',
    headerBg: 'bg-gradient-to-r from-emerald-600 via-teal-600 to-green-500',
    cardGlow: 'shadow-[0_0_20px_rgba(16,185,129,0.15)] hover:shadow-[0_0_30px_rgba(16,185,129,0.3)]',
    badgeBg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
    accentText: 'text-emerald-400',
    accentBg: 'bg-emerald-500',
    stripColor: '#10b981',
  },

  // Category C / B Grade -> Orange / Amber
  'Category C': {
    name: 'Category C',
    label: 'Cat C',
    theme: 'orange',
    border: 'border-amber-500/60 hover:border-amber-400',
    headerBg: 'bg-gradient-to-r from-amber-600 via-orange-600 to-yellow-500',
    cardGlow: 'shadow-[0_0_20px_rgba(245,158,11,0.15)] hover:shadow-[0_0_30px_rgba(245,158,11,0.3)]',
    badgeBg: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
    accentText: 'text-amber-400',
    accentBg: 'bg-amber-500',
    stripColor: '#f59e0b',
  },
  'B Grade': {
    name: 'B Grade',
    label: 'Grade B',
    theme: 'orange',
    border: 'border-amber-500/60 hover:border-amber-400',
    headerBg: 'bg-gradient-to-r from-amber-600 via-orange-600 to-yellow-500',
    cardGlow: 'shadow-[0_0_20px_rgba(245,158,11,0.15)] hover:shadow-[0_0_30px_rgba(245,158,11,0.3)]',
    badgeBg: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
    accentText: 'text-amber-400',
    accentBg: 'bg-amber-500',
    stripColor: '#f59e0b',
  },

  // Category D / Emerging Youth -> Purple / Violet
  'Category D': {
    name: 'Category D',
    label: 'Cat D',
    theme: 'purple',
    border: 'border-purple-500/60 hover:border-purple-400',
    headerBg: 'bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-500',
    cardGlow: 'shadow-[0_0_20px_rgba(168,85,247,0.15)] hover:shadow-[0_0_30px_rgba(168,85,247,0.3)]',
    badgeBg: 'bg-purple-500/15 text-purple-300 border-purple-500/40',
    accentText: 'text-purple-400',
    accentBg: 'bg-purple-500',
    stripColor: '#a855f7',
  },
  'Emerging Youth': {
    name: 'Emerging Youth',
    label: 'Youth',
    theme: 'purple',
    border: 'border-purple-500/60 hover:border-purple-400',
    headerBg: 'bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-500',
    cardGlow: 'shadow-[0_0_20px_rgba(168,85,247,0.15)] hover:shadow-[0_0_30px_rgba(168,85,247,0.3)]',
    badgeBg: 'bg-purple-500/15 text-purple-300 border-purple-500/40',
    accentText: 'text-purple-400',
    accentBg: 'bg-purple-500',
    stripColor: '#a855f7',
  },

  // Category E -> Red / Rose
  'Category E': {
    name: 'Category E',
    label: 'Cat E',
    theme: 'red',
    border: 'border-rose-500/60 hover:border-rose-400',
    headerBg: 'bg-gradient-to-r from-rose-600 via-red-600 to-pink-500',
    cardGlow: 'shadow-[0_0_20px_rgba(244,63,94,0.15)] hover:shadow-[0_0_30px_rgba(244,63,94,0.3)]',
    badgeBg: 'bg-rose-500/15 text-rose-300 border-rose-500/40',
    accentText: 'text-rose-400',
    accentBg: 'bg-rose-500',
    stripColor: '#f43f5e',
  },
};

const DEFAULT_THEME = {
  name: 'Standard',
  label: 'General',
  theme: 'sky',
  border: 'border-slate-700/80 hover:border-sky-500/50',
  headerBg: 'bg-gradient-to-r from-slate-700 via-slate-800 to-slate-900',
  cardGlow: 'shadow-[0_0_15px_rgba(15,23,42,0.5)] hover:shadow-[0_0_25px_rgba(56,189,248,0.2)]',
  badgeBg: 'bg-slate-700/40 text-slate-300 border-slate-600',
  accentText: 'text-sky-400',
  accentBg: 'bg-sky-500',
  stripColor: '#38bdf8',
};

/**
 * Get category theme details with fallback matching
 */
export function getCategoryTheme(categoryName) {
  if (!categoryName) return DEFAULT_THEME;

  // Support full category object from DB
  if (typeof categoryName === 'object' && categoryName.color) {
    return {
      name: categoryName.name || 'Category',
      label: categoryName.name || 'Cat',
      theme: 'custom',
      border: categoryName.borderColor || 'border-blue-500/60',
      headerBg: `bg-gradient-to-r ${categoryName.gradient || 'from-blue-600 to-cyan-500'}`,
      cardGlow: `shadow-[0_0_20px_${categoryName.glowColor || 'rgba(59,130,246,0.15)'}]`,
      badgeBg: categoryName.badgeBg || categoryName.badgeColor || 'bg-blue-500/15 text-blue-300 border-blue-500/40',
      accentText: 'text-blue-400',
      accentBg: 'bg-blue-500',
      stripColor: categoryName.color || '#3b82f6'
    };
  }

  if (CATEGORY_THEMES[categoryName]) return CATEGORY_THEMES[categoryName];

  // Case-insensitive / partial matching
  const catLower = String(categoryName).toLowerCase();
  if (catLower.includes('a') || catLower.includes('icon')) return CATEGORY_THEMES['Category A'];
  if (catLower.includes('b')) return CATEGORY_THEMES['Category B'];
  if (catLower.includes('c')) return CATEGORY_THEMES['Category C'];
  if (catLower.includes('d') || catLower.includes('youth') || catLower.includes('emerging')) return CATEGORY_THEMES['Category D'];
  if (catLower.includes('e')) return CATEGORY_THEMES['Category E'];

  return DEFAULT_THEME;
}

/**
 * Deterministic Team Avatar / Icon Generator
 * Generates unique vector icon presets, background gradients, and accents based on team properties.
 */
const ICON_PRESETS = [
  { name: 'Shield', Icon: Shield, bg: 'from-blue-600 via-indigo-700 to-slate-900', accent: '#3b82f6', border: 'border-blue-500/40' },
  { name: 'Trophy', Icon: Trophy, bg: 'from-amber-600 via-amber-700 to-slate-900', accent: '#f59e0b', border: 'border-amber-500/40' },
  { name: 'Lightning', Icon: Zap, bg: 'from-yellow-500 via-amber-600 to-slate-900', accent: '#eab308', border: 'border-yellow-500/40' },
  { name: 'Crown', Icon: Crown, bg: 'from-purple-600 via-indigo-800 to-slate-900', accent: '#a855f7', border: 'border-purple-500/40' },
  { name: 'Flame', Icon: Flame, bg: 'from-rose-600 via-orange-600 to-slate-900', accent: '#f43f5e', border: 'border-rose-500/40' },
  { name: 'Star', Icon: Star, bg: 'from-cyan-600 via-blue-800 to-slate-900', accent: '#06b6d4', border: 'border-cyan-500/40' },
  { name: 'Falcon', Icon: Feather, bg: 'from-teal-600 via-emerald-800 to-slate-900', accent: '#14b8a6', border: 'border-teal-500/40' },
  { name: 'Target', Icon: Target, bg: 'from-red-600 via-rose-800 to-slate-900', accent: '#ef4444', border: 'border-red-500/40' },
  { name: 'Sparkles', Icon: Sparkles, bg: 'from-fuchsia-600 via-purple-800 to-slate-900', accent: '#d946ef', border: 'border-fuchsia-500/40' },
  { name: 'Award', Icon: Award, bg: 'from-emerald-600 via-green-800 to-slate-900', accent: '#10b981', border: 'border-emerald-500/40' },
];

function stringHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getTeamAvatarConfig(team = {}) {
  const name = team.name || team.teamName || 'Team';
  const shortCode = team.shortCode || team.code || '';
  
  // Extract initials
  let initials = shortCode;
  if (!initials) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      initials = (parts[0][0] + parts[1][0]).toUpperCase();
    } else {
      initials = name.slice(0, 3).toUpperCase();
    }
  }

  // 1. If database has explicitly stored icon/colors, use them directly!
  if (team.primaryColor && team.icon) {
    const iconMap = { Shield, Trophy, Zap, Crown, Flame, Star, Falcon: Feather, Target, Sparkles, Award };
    const IconComponent = iconMap[team.icon] || Shield;

    return {
      initials,
      presetName: team.icon,
      IconComponent,
      bgGradient: team.gradient || `from-[${team.primaryColor}] to-[${team.secondaryColor || '#0f172a'}]`,
      accentColor: team.primaryColor,
      borderColor: team.borderColor || 'border-blue-500/40',
      logoSvg: team.logoSvg || null
    };
  }

  // 2. Deterministic fallback hashing if DB record pre-dates auto-generator
  const rawId = team._id || team.id || '';
  const hash = stringHash(`${name}-${shortCode}-${rawId}`);
  const preset = ICON_PRESETS[hash % ICON_PRESETS.length];

  return {
    initials,
    presetName: preset.name,
    IconComponent: preset.Icon,
    bgGradient: preset.bg,
    accentColor: preset.accent,
    borderColor: preset.border,
    logoSvg: null
  };
}
