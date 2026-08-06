/**
 * Shared neutral player-image fallback.
 *
 * Original, generic footballer artwork used whenever a player has no uploaded
 * photo. Deliberately NOT modeled on any real athlete's likeness and uses no
 * copyrighted imagery — it is a plain stylized silhouette rendered as an inline
 * SVG data-URI (no network request, always available offline).
 *
 * Usage:
 *   import { playerFallback } from '../utils/playerFallback';
 *   <img src={player.imageUrl || playerFallback()} />
 *
 * @param {('slate'|'gold'|'emerald')} [theme='slate'] tint to match context
 * @returns {string} a data:image/svg+xml URI
 */
const THEMES = {
  slate: { a: '#0f172a', b: '#1e1b4b', ring: 'rgba(56,189,248,0.08)', jersey: '#4f46e5', num: '#e2e8f0' },
  gold: { a: '#1c1000', b: '#2a1a00', ring: 'rgba(251,191,36,0.10)', jersey: '#d97706', num: '#ffe9b3' },
  emerald: { a: '#022c22', b: '#064e3b', ring: 'rgba(52,211,153,0.10)', jersey: '#059669', num: '#d1fae5' },
};

import { getImageUrl } from './imageUrl.js';

export function playerFallback(theme = 'slate') {
  const t = THEMES[theme] || THEMES.slate;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${t.a}"/><stop offset="100%" stop-color="${t.b}"/>
    </linearGradient></defs>
    <rect width="400" height="400" fill="url(#g)"/>
    <circle cx="200" cy="185" r="150" fill="${t.ring}"/>
    <path d="M140 110 a60 60 0 0 1 120 0 a60 60 0 0 1 -120 0" fill="#e8b58a"/>
    <path d="M128 116 a72 66 0 0 1 144 -9 c0 -9 -15 -51 -72 -51 s-72 36 -72 60 z" fill="#241a13"/>
    <path d="M110 330 q90 -66 180 0 l8 70 h-196 z" fill="${t.jersey}"/>
    <text x="200" y="368" text-anchor="middle" font-size="64" font-weight="900" font-family="Arial" fill="${t.num}" opacity="0.9">10</text>
  </svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

/**
 * Resolves player image URL using getImageUrl with fallback image
 */
export function resolvePlayerImage(url, theme = 'slate') {
  return getImageUrl(url, playerFallback(theme));
}

export default playerFallback;

