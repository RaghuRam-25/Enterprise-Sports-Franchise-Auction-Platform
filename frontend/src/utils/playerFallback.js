/**
 * Shared neutral player-image fallback.
 *
 * Generic footballer artwork rendered as a clean base64 SVG data-URI.
 * Deliberately NOT modeled on any real athlete's likeness and uses no
 * copyrighted imagery — works offline and online in all browsers.
 *
 * Usage:
 *   import { playerFallback } from '../utils/playerFallback';
 *   <img src={player.imageUrl || playerFallback()} />
 *
 * @param {('slate'|'gold'|'emerald')} [theme='slate'] tint to match context
 * @returns {string} a data:image/svg+xml;base64 URI
 */
const THEMES = {
  slate: { a: '#0B0B0B', b: '#0B2B26', ring: 'rgba(11,43,38,0.35)', jersey: '#1A1A1A', num: '#F5F5F5' },
  gold: { a: '#1c1000', b: '#2a1a00', ring: 'rgba(244,197,66,0.10)', jersey: '#3a2f10', num: '#F4C542' },
  emerald: { a: '#050505', b: '#0B2B26', ring: 'rgba(11,43,38,0.45)', jersey: '#0B2B26', num: '#FFFFFF' },
};

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

  try {
    return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
  } catch {
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }
}

export default playerFallback;
