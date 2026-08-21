import React from 'react';
import { Shield, Trophy, Zap, Crown, Flame, Star, Award, Target, Sparkles, Feather, Swords, Rocket, Gem, Anchor, Castle } from 'lucide-react';

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
 * Distinct color presets for custom categories that don't match the canonical
 * "Category A/B/C..." themes. This guarantees that whatever category names a
 * Super Admin creates (e.g. "Premium", "Silver", "Gold", "Icon"), each card
 * gets its OWN color instead of all collapsing to the same DEFAULT_THEME.
 * Each entry supplies the Tailwind classes consumed by PlayerCardCard.
 */
const CUSTOM_CATEGORY_PALETTE = [
  { theme: 'sky',    border: 'border-sky-500/60 hover:border-sky-400',    headerBg: 'bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-500', cardGlow: 'shadow-[0_0_20px_rgba(14,165,233,0.15)] hover:shadow-[0_0_30px_rgba(14,165,233,0.3)]', badgeBg: 'bg-sky-500/15 text-sky-300 border-sky-500/40',  accentText: 'text-sky-400',  accentBg: 'bg-sky-500',  stripColor: '#0ea5e9' },
  { theme: 'teal',   border: 'border-teal-500/60 hover:border-teal-400',  headerBg: 'bg-gradient-to-r from-teal-600 via-emerald-600 to-green-500', cardGlow: 'shadow-[0_0_20px_rgba(20,184,166,0.15)] hover:shadow-[0_0_30px_rgba(20,184,166,0.3)]', badgeBg: 'bg-teal-500/15 text-teal-300 border-teal-500/40',  accentText: 'text-teal-400', accentBg: 'bg-teal-500', stripColor: '#14b8a6' },
  { theme: 'violet', border: 'border-violet-500/60 hover:border-violet-400', headerBg: 'bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-500', cardGlow: 'shadow-[0_0_20px_rgba(139,92,246,0.15)] hover:shadow-[0_0_30px_rgba(139,92,246,0.3)]', badgeBg: 'bg-violet-500/15 text-violet-300 border-violet-500/40', accentText: 'text-violet-400', accentBg: 'bg-violet-500', stripColor: '#8b5cf6' },
  { theme: 'fuchsia', border: 'border-fuchsia-500/60 hover:border-fuchsia-400', headerBg: 'bg-gradient-to-r from-fuchsia-600 via-pink-600 to-rose-500', cardGlow: 'shadow-[0_0_20px_rgba(217,70,239,0.15)] hover:shadow-[0_0_30px_rgba(217,70,239,0.3)]', badgeBg: 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/40', accentText: 'text-fuchsia-400', accentBg: 'bg-fuchsia-500', stripColor: '#d946ef' },
  { theme: 'pink',   border: 'border-pink-500/60 hover:border-pink-400',  headerBg: 'bg-gradient-to-r from-pink-600 via-rose-600 to-red-500',   cardGlow: 'shadow-[0_0_20px_rgba(236,72,153,0.15)] hover:shadow-[0_0_30px_rgba(236,72,153,0.3)]', badgeBg: 'bg-pink-500/15 text-pink-300 border-pink-500/40',   accentText: 'text-pink-400',  accentBg: 'bg-pink-500',  stripColor: '#ec4899' },
  { theme: 'indigo', border: 'border-indigo-500/60 hover:border-indigo-400', headerBg: 'bg-gradient-to-r from-indigo-600 via-blue-700 to-sky-600',  cardGlow: 'shadow-[0_0_20px_rgba(99,102,241,0.15)] hover:shadow-[0_0_30px_rgba(99,102,241,0.3)]', badgeBg: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/40', accentText: 'text-indigo-400', accentBg: 'bg-indigo-500', stripColor: '#6366f1' },
  { theme: 'cyan',   border: 'border-cyan-500/60 hover:border-cyan-400',  headerBg: 'bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-400', cardGlow: 'shadow-[0_0_20px_rgba(6,182,212,0.15)] hover:shadow-[0_0_30px_rgba(6,182,212,0.3)]', badgeBg: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40',   accentText: 'text-cyan-400',  accentBg: 'bg-cyan-500',  stripColor: '#06b6d4' },
  { theme: 'lime',   border: 'border-lime-500/60 hover:border-lime-400',  headerBg: 'bg-gradient-to-r from-lime-600 via-green-500 to-emerald-400', cardGlow: 'shadow-[0_0_20px_rgba(132,204,22,0.15)] hover:shadow-[0_0_30px_rgba(132,204,22,0.3)]', badgeBg: 'bg-lime-500/15 text-lime-300 border-lime-500/40',   accentText: 'text-lime-400',  accentBg: 'bg-lime-500',  stripColor: '#84cc16' },
  { theme: 'amber',  border: 'border-amber-500/60 hover:border-amber-400', headerBg: 'bg-gradient-to-r from-amber-500 via-orange-500 to-red-500',  cardGlow: 'shadow-[0_0_20px_rgba(245,158,11,0.15)] hover:shadow-[0_0_30px_rgba(245,158,11,0.3)]', badgeBg: 'bg-amber-500/15 text-amber-300 border-amber-500/40',   accentText: 'text-amber-400', accentBg: 'bg-amber-500', stripColor: '#f59e0b' },
  { theme: 'orange', border: 'border-orange-500/60 hover:border-orange-400', headerBg: 'bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-400', cardGlow: 'shadow-[0_0_20px_rgba(249,115,22,0.15)] hover:shadow-[0_0_30px_rgba(249,115,22,0.3)]', badgeBg: 'bg-orange-500/15 text-orange-300 border-orange-500/40', accentText: 'text-orange-400', accentBg: 'bg-orange-500', stripColor: '#f97316' },
  { theme: 'rose',   border: 'border-rose-500/60 hover:border-rose-400',  headerBg: 'bg-gradient-to-r from-rose-500 via-pink-600 to-fuchsia-600', cardGlow: 'shadow-[0_0_20px_rgba(244,63,94,0.15)] hover:shadow-[0_0_30px_rgba(244,63,94,0.3)]', badgeBg: 'bg-rose-500/15 text-rose-300 border-rose-500/40',    accentText: 'text-rose-400',   accentBg: 'bg-rose-500',  stripColor: '#f43f5e' },
  { theme: 'slate',  border: 'border-slate-500/60 hover:border-slate-400', headerBg: 'bg-gradient-to-r from-slate-600 via-slate-700 to-slate-800', cardGlow: 'shadow-[0_0_20px_rgba(100,116,139,0.2)] hover:shadow-[0_0_30px_rgba(100,116,139,0.3)]', badgeBg: 'bg-slate-500/15 text-slate-300 border-slate-500/40', accentText: 'text-slate-300',  accentBg: 'bg-slate-500',  stripColor: '#64748b' },
];

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

  // Case-insensitive exact match against known themes
  const catLower = String(categoryName).toLowerCase();
  const knownKey = Object.keys(CATEGORY_THEMES).find(k => k.toLowerCase() === catLower);
  if (knownKey) return CATEGORY_THEMES[knownKey];

  // Deterministic unique color for ANY custom category created by a Super Admin.
  // Hash the name so each distinct category always resolves to the same distinct
  // color (and different categories almost never collide), instead of everything
  // collapsing into the same DEFAULT_THEME.
  const palette = CUSTOM_CATEGORY_PALETTE;
  const preset = palette[stringHash(catLower) % palette.length];
  return {
    ...preset,
    name: String(categoryName),
    label: String(categoryName),
  };
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

/**
 * Distinct color presets used as the deterministic team color source.
 * When a Super Admin creates many teams without explicit custom colors, each
 * team is hashed into this palette so that different teams resolve to
 * different hues instead of colliding on the same color.
 */
const TEAM_COLOR_PALETTE = [
  { bg: 'from-blue-500 via-blue-700 to-slate-900',    accent: '#3b82f6', border: 'border-blue-500/40' },
  { bg: 'from-emerald-500 via-emerald-700 to-slate-900', accent: '#10b981', border: 'border-emerald-500/40' },
  { bg: 'from-amber-500 via-amber-700 to-slate-900',  accent: '#f59e0b', border: 'border-amber-500/40' },
  { bg: 'from-purple-500 via-purple-700 to-slate-900', accent: '#a855f7', border: 'border-purple-500/40' },
  { bg: 'from-rose-500 via-rose-700 to-slate-900',    accent: '#f43f5e', border: 'border-rose-500/40' },
  { bg: 'from-cyan-500 via-cyan-700 to-slate-900',    accent: '#06b6d4', border: 'border-cyan-500/40' },
  { bg: 'from-teal-500 via-teal-700 to-slate-900',    accent: '#14b8a6', border: 'border-teal-500/40' },
  { bg: 'from-red-500 via-red-700 to-slate-900',      accent: '#ef4444', border: 'border-red-500/40' },
  { bg: 'from-fuchsia-500 via-fuchsia-700 to-slate-900', accent: '#d946ef', border: 'border-fuchsia-500/40' },
  { bg: 'from-indigo-500 via-indigo-700 to-slate-900', accent: '#6366f1', border: 'border-indigo-500/40' },
  { bg: 'from-lime-500 via-lime-700 to-slate-900',    accent: '#84cc16', border: 'border-lime-500/40' },
  { bg: 'from-orange-500 via-orange-700 to-slate-900', accent: '#f97316', border: 'border-orange-500/40' },
  { bg: 'from-pink-500 via-pink-700 to-slate-900',    accent: '#ec4899', border: 'border-pink-500/40' },
  { bg: 'from-sky-500 via-sky-700 to-slate-900',      accent: '#0ea5e9', border: 'border-sky-500/40' },
  { bg: 'from-violet-500 via-violet-700 to-slate-900', accent: '#8b5cf6', border: 'border-violet-500/40' },
  { bg: 'from-green-500 via-green-700 to-slate-900',  accent: '#22c55e', border: 'border-green-500/40' },
  { bg: 'from-yellow-500 via-yellow-700 to-slate-900', accent: '#eab308', border: 'border-yellow-500/40' },
  { bg: 'from-cyan-600 via-blue-800 to-slate-900',    accent: '#0891b2', border: 'border-cyan-600/40' },
  { bg: 'from-rose-600 via-red-800 to-slate-900',     accent: '#e11d48', border: 'border-rose-600/40' },
  { bg: 'from-violet-600 via-purple-800 to-slate-900', accent: '#7c3aed', border: 'border-violet-600/40' },
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
    const iconMap = { Shield, Trophy, Zap, Crown, Flame, Star, Falcon: Feather, Target, Sparkles, Award, Swords, Rocket, Gem, Anchor, Castle };
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

  // Use a large distinct color palette so different teams get different colors
  // (not just 10 icon presets that collide). Icon cycles but color comes from
  // the 20-hue wheel to maximize separation between teams.
  const iconPreset = ICON_PRESETS[hash % ICON_PRESETS.length];
  const colorPreset = TEAM_COLOR_PALETTE[hash % TEAM_COLOR_PALETTE.length];

  return {
    initials,
    presetName: iconPreset.name,
    IconComponent: iconPreset.Icon,
    bgGradient: colorPreset.bg,
    accentColor: colorPreset.accent,
    borderColor: colorPreset.border,
    logoSvg: null
  };
}
