import { memo } from 'react';

/**
 * PitchSVG — a football/soccer pitch drawn in the app's dark palette.
 *
 * Rendered edge-to-edge inside a `position: relative` wrapper; the position
 * marker is absolutely positioned OVER this by the parent using fieldX/fieldY
 * percentages, so this component only draws the surface + markings.
 *
 * viewBox is 1050 × 680 (standard 105m × 68m pitch ratio) with the attacking
 * direction pointing RIGHT — matching how fieldX/fieldY coordinates are stored
 * on the backend (fieldX 0 = own goal, 100 = opponent goal).
 *
 * Colors intentionally reuse the auction reveal palette (slate base, cyan
 * accents) instead of a generic bright-green stock pitch, so it sits alongside
 * PlayerRevealAnimation without a jarring style break.
 */
function PitchSVG({ className = '' }) {
  const W = 1050;
  const H = 680;
  const line = 'rgba(148, 197, 253, 0.55)'; // cyan-tinted chalk
  const lineW = 3;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      className={`absolute inset-0 h-full w-full ${className}`}
      aria-hidden="true"
    >
      <defs>
        {/* Pitch turf — deep slate with a subtle radial vignette */}
        <radialGradient id="pitch-turf" cx="50%" cy="45%" r="75%">
          <stop offset="0%" stopColor="#0f2a24" />
          <stop offset="55%" stopColor="#0a1f1c" />
          <stop offset="100%" stopColor="#060f14" />
        </radialGradient>
        {/* Alternating mow stripes, very low contrast */}
        <linearGradient id="pitch-stripe" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(255,255,255,0.02)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.0)" />
        </linearGradient>
      </defs>

      {/* Turf base */}
      <rect x="0" y="0" width={W} height={H} fill="url(#pitch-turf)" />

      {/* Vertical mow stripes */}
      {Array.from({ length: 10 }).map((_, i) => (
        <rect
          key={i}
          x={(W / 10) * i}
          y="0"
          width={W / 10}
          height={H}
          fill={i % 2 === 0 ? 'rgba(255,255,255,0.018)' : 'transparent'}
        />
      ))}

      <g fill="none" stroke={line} strokeWidth={lineW}>
        {/* Outer boundary */}
        <rect x="30" y="30" width={W - 60} height={H - 60} rx="4" />

        {/* Halfway line */}
        <line x1={W / 2} y1="30" x2={W / 2} y2={H - 30} />

        {/* Center circle + spot */}
        <circle cx={W / 2} cy={H / 2} r="90" />
        <circle cx={W / 2} cy={H / 2} r="4" fill={line} stroke="none" />

        {/* Left penalty box */}
        <rect x="30" y={H / 2 - 160} width="150" height="320" />
        {/* Left goal box */}
        <rect x="30" y={H / 2 - 70} width="55" height="140" />
        {/* Left penalty spot */}
        <circle cx="130" cy={H / 2} r="4" fill={line} stroke="none" />
        {/* Left penalty arc */}
        <path d={`M 180 ${H / 2 - 55} A 90 90 0 0 1 180 ${H / 2 + 55}`} />
        {/* Left goal */}
        <rect x="14" y={H / 2 - 45} width="16" height="90" stroke={line} />

        {/* Right penalty box */}
        <rect x={W - 180} y={H / 2 - 160} width="150" height="320" />
        {/* Right goal box */}
        <rect x={W - 85} y={H / 2 - 70} width="55" height="140" />
        {/* Right penalty spot */}
        <circle cx={W - 130} cy={H / 2} r="4" fill={line} stroke="none" />
        {/* Right penalty arc */}
        <path d={`M ${W - 180} ${H / 2 - 55} A 90 90 0 0 0 ${W - 180} ${H / 2 + 55}`} />
        {/* Right goal */}
        <rect x={W - 30} y={H / 2 - 45} width="16" height="90" stroke={line} />

        {/* Corner arcs */}
        <path d="M 30 44 A 14 14 0 0 1 44 30" />
        <path d={`M ${W - 44} 30 A 14 14 0 0 1 ${W - 30} 44`} />
        <path d={`M 30 ${H - 44} A 14 14 0 0 0 44 ${H - 30}`} />
        <path d={`M ${W - 44} ${H - 30} A 14 14 0 0 0 ${W - 30} ${H - 44}`} />
      </g>
    </svg>
  );
}

export default memo(PitchSVG);
