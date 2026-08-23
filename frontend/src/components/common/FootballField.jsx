import { memo, useId } from 'react';

/**
 * FootballField — A responsive, self-contained SVG top-down soccer/football field component.
 *
 * Visual Specifications:
 * - Field orientation: horizontal (landscape, ~3:2 ratio)
 * - Background: solid green turf with alternating vertical mowed stripes
 * - All line markings in white, thin stroke, no labels or text
 * - Complete markings: outer boundary, halfway line, center circle + spot,
 *   penalty areas, goal areas (6-yd box), penalty spots, penalty arcs, and 4 corner arcs
 * - Customizable via props (width, height, fieldColor, stripeColor, lineColor, lineWidth, etc.)
 *
 * Marker overlay: children of the parent can be absolutely positioned with
 * `left: fieldX%` / `top: fieldY%` (attacking direction pointing RIGHT) — the
 * same coordinate convention used by the backend (fieldPositions.js).
 */
function FootballField({
  width = '100%',
  height = 'auto',
  className = '',
  fieldColor = '#0B2B26',
  stripeColor = 'rgba(11, 43, 38, 0.60)',
  lineColor = '#ffffff',
  lineWidth = 3,
  preserveAspectRatio = 'xMidYMid slice',
  style = {},
  ...props
}) {
  const gradientId = useId();
  const W = 1050;
  const H = 680;
  const marginX = 30;
  const marginY = 30;

  const pitchWidth = W - marginX * 2; // 990
  const pitchHeight = H - marginY * 2; // 620
  const centerX = W / 2; // 525
  const centerY = H / 2; // 340

  // 12 vertical mowed stripes
  const numStripes = 12;
  const stripeW = W / numStripes;
  const vignetteId = `field-vignette-${gradientId}`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio={preserveAspectRatio}
      width={width}
      height={height}
      className={className}
      style={{
        maxWidth: '100%',
        height: height === 'auto' ? 'auto' : height,
        display: 'block',
        ...style,
      }}
      aria-label="Football Field"
      role="img"
      {...props}
    >
      <defs>
        {/* Subtle turf vignette overlay for realistic depth */}
        <radialGradient id={vignetteId} cx="50%" cy="50%" r="70%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.18" />
        </radialGradient>
      </defs>

      {/* 1. Base Field Background */}
      <rect x="0" y="0" width={W} height={H} fill={fieldColor} />

      {/* 2. Alternating Vertical Mowed Stripes */}
      <g>
        {Array.from({ length: numStripes }).map((_, i) => (
          <rect
            key={i}
            x={stripeW * i}
            y="0"
            width={stripeW}
            height={H}
            fill={i % 2 === 0 ? stripeColor : 'transparent'}
          />
        ))}
      </g>

      {/* 3. Turf Depth Vignette */}
      <rect x="0" y="0" width={W} height={H} fill={`url(#${vignetteId})`} />

      {/* 4. White Field Markings */}
      <g fill="none" stroke={lineColor} strokeWidth={lineWidth} strokeLinecap="round" strokeLinejoin="round">
        {/* Outer Rectangle Boundary */}
        <rect x={marginX} y={marginY} width={pitchWidth} height={pitchHeight} rx="2" />

        {/* Halfway Line */}
        <line x1={centerX} y1={marginY} x2={centerX} y2={H - marginY} />

        {/* Center Circle & Center Spot */}
        <circle cx={centerX} cy={centerY} r="90" />
        <circle cx={centerX} cy={centerY} r="4.5" fill={lineColor} stroke="none" />

        {/* Left Penalty Area */}
        <rect x={marginX} y={centerY - 165} width="165" height="330" />
        {/* Left Goal Area (Six-Yard Box) */}
        <rect x={marginX} y={centerY - 75} width="55" height="150" />
        {/* Left Penalty Spot */}
        <circle cx={marginX + 110} cy={centerY} r="4.5" fill={lineColor} stroke="none" />
        {/* Left Penalty Arc */}
        <path d={`M ${marginX + 165} ${centerY - 55} A 90 90 0 0 1 ${marginX + 165} ${centerY + 55}`} />
        {/* Left Goal Structure */}
        <rect x={marginX - 18} y={centerY - 45} width="18" height="90" strokeOpacity="0.85" />

        {/* Right Penalty Area */}
        <rect x={W - marginX - 165} y={centerY - 165} width="165" height="330" />
        {/* Right Goal Area (Six-Yard Box) */}
        <rect x={W - marginX - 55} y={centerY - 75} width="55" height="150" />
        {/* Right Penalty Spot */}
        <circle cx={W - marginX - 110} cy={centerY} r="4.5" fill={lineColor} stroke="none" />
        {/* Right Penalty Arc */}
        <path d={`M ${W - marginX - 165} ${centerY - 55} A 90 90 0 0 0 ${W - marginX - 165} ${centerY + 55}`} />
        {/* Right Goal Structure */}
        <rect x={W - marginX} y={centerY - 45} width="18" height="90" strokeOpacity="0.85" />

        {/* Four Corner Arcs */}
        {/* Top-Left */}
        <path d={`M ${marginX} ${marginY + 16} A 16 16 0 0 1 ${marginX + 16} ${marginY}`} />
        {/* Top-Right */}
        <path d={`M ${W - marginX - 16} ${marginY} A 16 16 0 0 1 ${W - marginX} ${marginY + 16}`} />
        {/* Bottom-Left */}
        <path d={`M ${marginX} ${H - marginY - 16} A 16 16 0 0 0 ${marginX + 16} ${H - marginY}`} />
        {/* Bottom-Right */}
        <path d={`M ${W - marginX - 16} ${H - marginY} A 16 16 0 0 0 ${W - marginX} ${H - marginY - 16}`} />
      </g>
    </svg>
  );
}

export default memo(FootballField);