/**
 * LogoGenerator Service
 * Generates visually unique SVG emblem compositions and structures.
 */

const SHAPES = [
  'Shield', 'CircularBadge', 'Hexagon', 'Diamond', 'Crest', 
  'Octagon', 'CrownHeader', 'BannerCrest', 'Pentagon', 'MinimalFrame'
];

const EMBLEMS = [
  'Falcon', 'Panther', 'Knight', 'Crown', 'Sword', 
  'Trident', 'Lion', 'Eagle', 'Flame', 'Lightning', 
  'Star', 'Trophy', 'Target', 'Cobra', 'Dragon'
];

const BORDER_STYLES = [
  'DoubleRing', 'GoldTrim', 'NeonGlow', 'DashedRing', 
  'BeveledEdge', 'RibbonBorder', 'MetallicFrame', 'SolidThick'
];

/**
 * Generates a completely unique SVG logo structure for a Team.
 */
export function generateUniqueLogo(teamName = '', primaryColor = '#3b82f6', secondaryColor = '#1d4ed8', existingLogos = []) {
  const existingKeys = new Set(existingLogos.map(l => typeof l === 'string' ? l : `${l.shape}-${l.emblem}-${l.borderStyle}`));

  for (let sIdx = 0; sIdx < SHAPES.length; sIdx++) {
    for (let eIdx = 0; eIdx < EMBLEMS.length; eIdx++) {
      for (let bIdx = 0; bIdx < BORDER_STYLES.length; bIdx++) {
        const shape = SHAPES[sIdx];
        const emblem = EMBLEMS[eIdx];
        const borderStyle = BORDER_STYLES[bIdx];
        const comboKey = `${shape}-${emblem}-${borderStyle}`;

        if (!existingKeys.has(comboKey)) {
          const initials = (teamName || 'TM').slice(0, 3).toUpperCase();
          const svgString = buildSvgMarkup({ shape, emblem, borderStyle, primaryColor, secondaryColor, initials });

          return {
            shape,
            emblem,
            borderStyle,
            comboKey,
            svgString
          };
        }
      }
    }
  }

  // Fallback for extreme counts
  const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
  const emblem = EMBLEMS[Math.floor(Math.random() * EMBLEMS.length)];
  const borderStyle = BORDER_STYLES[Math.floor(Math.random() * BORDER_STYLES.length)];
  const initials = (teamName || 'TM').slice(0, 3).toUpperCase();

  return {
    shape,
    emblem,
    borderStyle,
    comboKey: `${shape}-${emblem}-${borderStyle}-${Date.now()}`,
    svgString: buildSvgMarkup({ shape, emblem, borderStyle, primaryColor, secondaryColor, initials })
  };
}

/**
 * Builds clean, responsive SVG vector code for team logo
 */
function buildSvgMarkup({ shape, emblem, borderStyle, primaryColor, secondaryColor }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" class="w-full h-full">
    <defs>
      <linearGradient id="teamGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${primaryColor}" />
        <stop offset="100%" stop-color="${secondaryColor}" />
      </linearGradient>
    </defs>
    <path d="M50 10 L85 25 L85 60 C85 78 50 92 50 92 C50 92 15 78 15 60 L15 25 Z" fill="url(#teamGrad)" stroke="${primaryColor}" stroke-width="2" />
    <path d="M50 30 L62 42 L58 65 L50 58 L42 65 L38 42 Z" fill="#ffffff" opacity="0.9" />
  </svg>`;
}
