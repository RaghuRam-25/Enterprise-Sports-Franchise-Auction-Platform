/**
 * ColorGenerator Service
 * Generates visually distinct, high-contrast unique colors and gradients.
 */

// Curated Vibrant Sports Color Palettes (Primary, Secondary, Accent, Border, Glow)
export const PREDEFINED_PALETTES = [
  { primary: '#3b82f6', secondary: '#1d4ed8', accent: '#60a5fa', border: 'border-blue-500/50', glow: 'rgba(59,130,246,0.3)', name: 'Electric Blue' },
  { primary: '#f59e0b', secondary: '#b45309', accent: '#fbbf24', border: 'border-amber-500/50', glow: 'rgba(245,158,11,0.3)', name: 'Amber Gold' },
  { primary: '#10b981', secondary: '#047857', accent: '#34d399', border: 'border-emerald-500/50', glow: 'rgba(16,185,129,0.3)', name: 'Emerald Green' },
  { primary: '#a855f7', secondary: '#6b21a8', accent: '#c084fc', border: 'border-purple-500/50', glow: 'rgba(168,85,247,0.3)', name: 'Royal Purple' },
  { primary: '#f43f5e', secondary: '#be123c', accent: '#fb7185', border: 'border-rose-500/50', glow: 'rgba(244,63,94,0.3)', name: 'Crimson Rose' },
  { primary: '#06b6d4', secondary: '#0e7490', accent: '#22d3ee', border: 'border-cyan-500/50', glow: 'rgba(6,182,212,0.3)', name: 'Neon Cyan' },
  { primary: '#14b8a6', secondary: '#0f766e', accent: '#2dd4bf', border: 'border-teal-500/50', glow: 'rgba(20,184,166,0.3)', name: 'Teal Fury' },
  { primary: '#eab308', secondary: '#a16207', accent: '#fde047', border: 'border-yellow-500/50', glow: 'rgba(234,179,8,0.3)', name: 'Cyber Yellow' },
  { primary: '#d946ef', secondary: '#86198f', accent: '#e879f9', border: 'border-fuchsia-500/50', glow: 'rgba(217,70,239,0.3)', name: 'Fuchsia Flare' },
  { primary: '#ef4444', secondary: '#b91c1c', accent: '#f87171', border: 'border-red-500/50', glow: 'rgba(239,68,68,0.3)', name: 'Blaze Red' },
  { primary: '#6366f1', secondary: '#3730a3', accent: '#818cf8', border: 'border-indigo-500/50', glow: 'rgba(99,102,241,0.3)', name: 'Indigo Storm' },
  { primary: '#8b5cf6', secondary: '#5b21b6', accent: '#a78bfa', border: 'border-violet-500/50', glow: 'rgba(139,92,246,0.3)', name: 'Violet Spark' },
  { primary: '#f97316', secondary: '#c2410c', accent: '#fb923c', border: 'border-orange-500/50', glow: 'rgba(249,115,22,0.3)', name: 'Solar Orange' },
  { primary: '#ec4899', secondary: '#9d174d', accent: '#f472b6', border: 'border-pink-500/50', glow: 'rgba(236,72,153,0.3)', name: 'Hot Pink' },
  { primary: '#84cc16', secondary: '#4d7c0f', accent: '#a3e635', border: 'border-lime-500/50', glow: 'rgba(132,204,22,0.3)', name: 'Lime Venom' },
  { primary: '#0284c7', secondary: '#0369a1', accent: '#38bdf8', border: 'border-sky-500/50', glow: 'rgba(2,132,199,0.3)', name: 'Deep Sky' },
];

/**
 * Converts HSL to Hex color string
 */
function hslToHex(h, s, l) {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/**
 * Returns a unique color palette not present in existingColors list
 */
export function generateUniqueColorPalette(existingColors = []) {
  const normalizedExisting = existingColors.map(c => (c || '').toLowerCase().trim());

  // 1. Try picking an unused predefined palette
  for (const palette of PREDEFINED_PALETTES) {
    if (!normalizedExisting.includes(palette.primary.toLowerCase())) {
      return {
        primaryColor: palette.primary,
        secondaryColor: palette.secondary,
        accentColor: palette.accent,
        borderColor: palette.border,
        glowColor: palette.glow,
        gradient: `from-[${palette.primary}] via-[${palette.secondary}] to-slate-950`
      };
    }
  }

  // 2. Fallback: Golden Ratio Algorithmic HSL Generator for 100+ unique teams
  const GOLDEN_RATIO_CONJUGATE = 0.618033988749895;
  let hue = Math.random();
  let primaryHex = '';

  for (let i = 0; i < 500; i++) {
    hue = (hue + GOLDEN_RATIO_CONJUGATE) % 1;
    const h = Math.floor(hue * 360);
    const s = 80 + (i % 20); // 80%-99% vibrancy
    const l = 50 + (i % 15); // 50%-64% lightness
    primaryHex = hslToHex(h, s, l);

    if (!normalizedExisting.includes(primaryHex.toLowerCase())) {
      const secondaryHex = hslToHex(h, s - 15, Math.max(20, l - 25));
      const accentHex = hslToHex(h, Math.min(100, s + 10), Math.min(85, l + 20));
      return {
        primaryColor: primaryHex,
        secondaryColor: secondaryHex,
        accentColor: accentHex,
        borderColor: 'border-slate-700/60',
        glowColor: `${primaryHex}4d`,
        gradient: `from-[${primaryHex}] to-[${secondaryHex}]`
      };
    }
  }

  // Emergency fallback
  const randHex = hslToHex(Math.floor(Math.random() * 360), 85, 55);
  return {
    primaryColor: randHex,
    secondaryColor: '#0f172a',
    accentColor: '#38bdf8',
    borderColor: 'border-blue-500/40',
    glowColor: 'rgba(59,130,246,0.3)',
    gradient: 'from-blue-600 via-indigo-700 to-slate-950'
  };
}
