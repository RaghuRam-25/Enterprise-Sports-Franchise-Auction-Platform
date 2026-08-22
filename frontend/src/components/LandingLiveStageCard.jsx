import { useLayoutEffect, useRef } from 'react';
import { Tag, TrendingUp, Trophy, Target, Clock, Calendar, Zap } from 'lucide-react';
import { getImageUrl } from '../utils/imageUrl';
import { playerFallback } from '../utils/playerFallback';
import { getCategoryTheme } from '../utils/themeConfig';
import { getBatchFromSession } from '../utils/batchFromSession';

// hex (#RRGGBB) → rgba() string with the given alpha
const alpha = (hex, a) => {
  try {
    const raw = String(hex).replace('#', '');
    const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
    const n = parseInt(full || '58D20A', 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
  } catch {
    return `rgba(88,210,10,${a})`;
  }
};

// Position code → full-form name (mirrors the seeded Position collection).
// A DB-driven `positions` prop takes precedence when provided.
const POSITION_FULL_NAMES = {
  GK: 'Goalkeeper',
  CB: 'Centre Back',
  LB: 'Left Back',
  RB: 'Right Back',
  CDM: 'Central Defensive Midfielder',
  CMF: 'Central Midfielder',
  CM: 'Central Midfielder',
  CAM: 'Central Attacking Midfielder',
  LM: 'Left Midfielder',
  RM: 'Right Midfielder',
  CF: 'Centre Forward',
  LW: 'Left Winger',
  RW: 'Right Winger',
  ST: 'Striker',
};

/**
 * LandingLiveStageCard — The single shared player-stage design used EVERYWHERE
 * (landing, /live, manager, podium, stage modal). The whole card theme is
 * driven by the player's CATEGORY color, so every surface shows the same
 * category-tinted presentation.
 *
 * mode="spectator"  → shows no bid button (spectator only watches)
 * mode="manager"    → shows ⚡ PLACE BID NOW button
 * mode="podium"     → shows podiumControls JSX
 */
export default function LandingLiveStageCard({
  player,
  currentBid = 0,
  highestBidder = null,
  nextMinBid = null,
  timerRemaining = 28,
  timerStatus = 'idle',
  mode = 'spectator',
  onPlaceBid = null,
  hideBidButton = false,
  blindMode = false,
  blindAmount = '',
  onBlindAmountChange = null,
  bidLabel = 'PLACE BID NOW',
  bidDisabled = false,
  podiumControls = null,
  categories = [],
  positions = [],
  formatCurrency = (val) => val != null ? `Tk ${Number(val).toLocaleString('en-US')}` : 'Tk 0',
}) {
  // ── Category-driven accent (DB-matched, same resolution as PlayerCardCard) ──
  const catTheme = getCategoryTheme(player?.category, categories);
  const CategoryIcon = catTheme?.IconComponent || Tag;
  const accent = catTheme?.stripColor || '#58D20A';

  const name = player?.name || 'PLAYER';
  const nameParts = name.trim().split(' ');
  const firstName = nameParts.slice(0, -1).join(' ') || nameParts[0] || 'PLAYER';
  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';

  const position = player?.primaryPosition || player?.role || 'MIDFIELDER';
  const posCode =
    player?.positionCode ||
    (position.toUpperCase().includes('MID') ? 'CM'
      : position.toUpperCase().includes('FOR') || position.toUpperCase().includes('ST') ? 'ST'
      : position.toUpperCase().includes('DEF') || position.toUpperCase().includes('CB') ? 'CB'
      : position.toUpperCase().includes('GOAL') || position.toUpperCase().includes('GK') ? 'GK'
      : 'CM');

  // Full-form position name — DB Position names win, then the canonical map,
  // then whatever raw value the player document carries.
  const fullPositionName = (() => {
    const code = position.trim().toUpperCase();
    const fromDb = Array.isArray(positions)
      ? positions.find((p) => String(p.code || '').toUpperCase() === code)
      : null;
    return fromDb?.name || POSITION_FULL_NAMES[code] || position;
  })();

  // Player name always renders on a SINGLE line that NEVER overlaps neighbouring
  // columns: the font-size itself is fitted to the container width (transform
  // alone cannot do this — it doesn't affect layout, so the oversized text kept
  // blowing out the grid column over the TIME LEFT tile).
  const nameWrapRef = useRef(null);
  const nameElRef = useRef(null);

  useLayoutEffect(() => {
    const wrap = nameWrapRef.current;
    const el = nameElRef.current;
    if (!wrap || !el) return undefined;

    const fitName = () => {
      // Measure at the class-defined base size first
      el.style.fontSize = '';
      const available = wrap.clientWidth;
      const natural = el.scrollWidth;
      if (!available || !natural) return;
      if (natural > available) {
        const base = parseFloat(window.getComputedStyle(el).fontSize) || 24;
        // Floor at 11px so absurdly long names stay legible rather than vanish
        el.style.fontSize = `${Math.max(11, Math.floor((base * available) / natural))}px`;
      }
    };

    fitName();
    if (document.fonts?.ready) {
      document.fonts.ready.then(fitName).catch(() => {});
    }
    const ro = new ResizeObserver(fitName);
    ro.observe(wrap);
    window.addEventListener('resize', fitName);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', fitName);
    };
  }, [name]);

  // Jersey badge shows ONLY the numeric part — values like "MUSTAFIZUR 13"
  // or names stored in jerseyName collapse to just "13".
  const jerseyNumber = (() => {
    const raw = String(player?.jerseyNumber ?? player?.jerseyName ?? '').trim();
    return (raw.match(/\d+/) || [''])[0];
  })();
  const basePrice = player?.basePrice || 0;
  // §3/§11 — in Blind Mode the live current bid is never rendered (the backend
  // also strips it from every payload); only the Best Price stays visible.
  const activeCurrentBid = Number(currentBid) > 0 ? Number(currentBid) : basePrice;
  const computedNextMinBid = nextMinBid || (blindMode ? basePrice : activeCurrentBid + 100);

  // §4 — Blind Mode never exposes any bidding team's identity.
  const teamName = blindMode
    ? null
    : typeof highestBidder === 'string'
      ? highestBidder
      : highestBidder?.name || null;
  const teamLogo =
    typeof highestBidder === 'object' ? highestBidder?.logo : null;

  const sessionLabel = player?.session || '23-24';
  const batchLabel = player?.batch || getBatchFromSession(player?.session) || '—';
  const imageUrl = getImageUrl(player?.imageUrl, playerFallback(position));

  const timerSec = Number(timerRemaining ?? 0);
  const mm = String(Math.floor(timerSec / 60)).padStart(2, '0');
  const ss = String(timerSec % 60).padStart(2, '0');
  const isUrgent = timerStatus === 'running' && timerSec <= 5;

  // Shared style fragments for the metric tiles
  const tileStyle = {
    background: `linear-gradient(170deg, ${alpha(accent, 0.07)} 0%, #0e0f14 65%)`,
    border: `1px solid ${alpha(accent, 0.28)}`,
  };
  const iconBoxStyle = {
    backgroundColor: alpha(accent, 0.12),
    border: `1px solid ${alpha(accent, 0.4)}`,
    color: accent,
  };

  return (
    <div
      className="rounded-3xl p-5 sm:p-7 relative overflow-hidden text-slate-100 font-sans"
      style={{
        background: 'linear-gradient(175deg, #0a0a0c 0%, #08080a 55%, #050506 100%)',
        border: `1px solid ${alpha(accent, 0.45)}`,
        boxShadow: `0 0 50px ${alpha(accent, 0.14)}, inset 0 0 80px ${alpha(accent, 0.04)}`,
      }}
    >

      {/* Radial ambient background glow — category tinted */}
      <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full blur-3xl pointer-events-none" style={{ background: alpha(accent, 0.10) }} />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full blur-3xl pointer-events-none" style={{ background: alpha(accent, 0.10) }} />

      {/* ── Main Stage Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-center relative z-10">

        {/* ── Left Column: Hexagon Photo & Identity ── */}
        <div className="lg:col-span-5 min-w-0 flex flex-col items-center text-center space-y-4">

          {/* Category badge — above the picture */}
          {player?.category && (
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full font-mono font-black text-[11px] sm:text-xs uppercase tracking-widest"
              style={{
                background: alpha(accent, 0.12),
                border: `1px solid ${accent}`,
                color: accent,
                boxShadow: `0 0 18px ${alpha(accent, 0.35)}`,
              }}
            >
              <CategoryIcon className="w-3.5 h-3.5" />
              <span>{catTheme?.name || player.category}</span>
            </div>
          )}

          {/* Hexagon Photo Frame */}
          <div className="relative w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center">

            {/* Jersey number badge — top-left */}
            {jerseyNumber !== '' && (
              <div
                className="absolute top-0 left-0 z-20 w-9 h-9 sm:w-10 sm:h-10 rounded-xl text-white font-mono font-black text-sm sm:text-base flex items-center justify-center shadow-lg"
                style={{ backgroundColor: accent, border: `1px solid ${alpha(accent, 0.85)}`, boxShadow: `0 0 18px ${alpha(accent, 0.55)}` }}
              >
                {jerseyNumber}
              </div>
            )}

            {/* Hexagon-clipped player photo + matching stroke.
                Wrapper is a SQUARE and the SVG uses viewBox 0 0 100 100 with
                preserveAspectRatio="none", so the hexagon outline maps
                EXACTLY onto the clip-path geometry. */}
            <div className="relative w-[88%] aspect-square">
              <div
                className="absolute inset-0 bg-[#0e0f14] overflow-hidden"
                style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
              >
                <img
                  src={imageUrl}
                  alt={name}
                  className="absolute inset-0 w-full h-full object-cover select-none"
                  draggable={false}
                />
              </div>

              {/* Category-tinted hexagon stroke — identical geometry to the clip */}
              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                className="absolute inset-0 w-full h-full pointer-events-none z-10"
                style={{ filter: `drop-shadow(0 0 14px ${alpha(accent, 0.55)})` }}
              >
                <polygon
                  points="50,2 98,26.5 98,73.5 50,98 2,73.5 2,26.5"
                  fill="none"
                  stroke={accent}
                  strokeWidth="2.5"
                  vectorEffect="non-scaling-stroke"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            {/* Flag + Position pill — bottom of hex */}
            <div className="absolute -bottom-2 inset-x-0 flex items-center justify-between px-2 z-20 pointer-events-none">
              <div className="w-8 h-6 rounded-lg bg-[#0e0f14] border border-slate-700 flex items-center justify-center text-sm shadow-md">
                🇧🇩
              </div>
              <div
                className="px-3 py-1 rounded-xl bg-[#0e0f14] font-mono font-extrabold text-xs shadow-md uppercase"
                style={{ border: `1px solid ${accent}`, color: accent }}
              >
                {posCode}
              </div>
            </div>
          </div>

          {/* Player name — ONE row guaranteed: the font-size itself is fitted
              to the container, so long names can never wrap or push into the
              neighbouring TIME LEFT column. */}
          <div ref={nameWrapRef} className="pt-2 w-full min-w-0 overflow-hidden">
            <h2
              ref={nameElRef}
              className="inline-block whitespace-nowrap text-2xl sm:text-4xl font-black uppercase tracking-tight leading-tight"
            >
              <span className="text-white">{firstName} </span>
              <span style={{ color: accent }}>{lastName}</span>
            </h2>
            <div className="inline-block mt-1">
              <span className="text-xs font-mono font-bold uppercase tracking-widest block" style={{ color: accent }}>
                {fullPositionName}
              </span>
              <div className="w-12 h-0.5 mx-auto mt-1 rounded-full" style={{ background: accent }} />
            </div>
          </div>

          {/* ── Mode-Based Action Area ── */}
          <div className="w-full pt-2">
            {/* SPECTATOR: no button */}
            {mode === 'spectator' && null}

            {/* MANAGER: PLACE BID NOW — single bidding surface. Carries the
                full state of the bid (label + disabled) passed by the page,
                so no duplicate bid action card is needed below the stage.
                Blind Mode swaps in one minimal amount input + submit button;
                hideBidButton removes the surface entirely (§2). */}
            {mode === 'manager' && blindMode && !hideBidButton && (
              <input
                type="number"
                inputMode="numeric"
                min={basePrice}
                step="1"
                autoComplete="off"
                value={blindAmount}
                onChange={(e) => onBlindAmountChange?.(e.target.value)}
                placeholder={`Min ${formatCurrency(basePrice)}`}
                className="w-full mb-2.5 px-4 py-3.5 rounded-2xl bg-[#0e0f14] border font-mono text-base text-white text-center placeholder:text-slate-600 focus:outline-none"
                style={{ borderColor: alpha(accent, 0.45) }}
              />
            )}
            {mode === 'manager' && !hideBidButton && (
              <button
                onClick={onPlaceBid}
                disabled={bidDisabled}
                className={`w-full py-4 font-black text-sm uppercase tracking-wider rounded-2xl transition flex items-center justify-center gap-2 ${bidDisabled ? 'cursor-not-allowed opacity-60 saturate-50' : 'transform hover:-translate-y-0.5 hover:brightness-110 active:scale-[0.99]'}`}
                style={{
                  backgroundColor: accent,
                  color: '#050505',
                  boxShadow: bidDisabled ? 'none' : `0 0 30px ${alpha(accent, 0.5)}`,
                }}
              >
                <Zap className="w-5 h-5 fill-current" />
                <span>{bidLabel}</span>
              </button>
            )}

            {/* PODIUM: custom control buttons */}
            {mode === 'podium' && podiumControls && (
              <div className="w-full space-y-2">
                {podiumControls}
              </div>
            )}
          </div>
        </div>

        {/* ── Right Column: Bidding Metric Cards ── */}
        <div className="lg:col-span-7 min-w-0 space-y-3">

          {/* BASE PRICE */}
          <div className="rounded-2xl p-3.5 flex items-center justify-between shadow-md" style={tileStyle}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={iconBoxStyle}>
                <Tag className="w-5 h-5" />
              </div>
              <span className="text-xs font-mono font-bold text-slate-400 uppercase">BASE PRICE</span>
            </div>
            <span className="text-lg sm:text-xl font-black font-mono text-white">
              {formatCurrency(basePrice)}
            </span>
          </div>

          {/* CURRENT BID — sealed in Blind Mode (§3) */}
          <div className="rounded-2xl p-3.5 flex items-center justify-between shadow-md" style={tileStyle}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={iconBoxStyle}>
                <TrendingUp className="w-5 h-5" />
              </div>
              <span className="text-xs font-mono font-bold text-slate-400 uppercase">{blindMode ? 'SEALED' : 'CURRENT BID'}</span>
            </div>
            {blindMode ? (
              <span className="text-sm sm:text-base font-black font-mono tracking-widest text-slate-500 select-none">••••• HIDDEN</span>
            ) : (
              <span className="text-lg sm:text-xl font-black font-mono" style={{ color: accent }}>
                {formatCurrency(activeCurrentBid)}
              </span>
            )}
          </div>

          {/* BIDDING TEAM — anonymous in Blind Mode (§4) */}
          <div className="rounded-2xl p-3.5 flex items-center justify-between shadow-md" style={tileStyle}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={iconBoxStyle}>
                <Trophy className="w-5 h-5" />
              </div>
              <span className="text-xs font-mono font-bold text-slate-400 uppercase">{blindMode ? 'BIDDERS' : 'BIDDING TEAM'}</span>
            </div>
            {blindMode ? (
              <span className="text-sm sm:text-base font-black text-slate-500 italic tracking-wide select-none">Anonymous</span>
            ) : teamName ? (
              <div className="flex items-center gap-2 max-w-[55%]">
                {teamLogo && <span className="text-xl">{teamLogo}</span>}
                <span className="text-base sm:text-lg font-black text-white truncate">{teamName}</span>
              </div>
            ) : (
              <span className="text-sm text-slate-500 italic font-bold">Opening at base…</span>
            )}
          </div>

          {/* NEXT MINIMUM BID / MINIMUM VALID BID — brighter accent highlight */}
          <div className="rounded-2xl p-3.5 flex items-center justify-between shadow-md" style={{ ...tileStyle, borderColor: alpha(accent, 0.55) }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={iconBoxStyle}>
                <Target className="w-5 h-5" />
              </div>
              <span className="text-xs font-mono font-bold text-slate-400 uppercase">{blindMode ? 'MINIMUM VALID BID' : 'NEXT MINIMUM BID'}</span>
            </div>
            <span className="text-lg sm:text-xl font-black font-mono" style={{ color: accent }}>
              {formatCurrency(computedNextMinBid)}
            </span>
          </div>

          {/* TIME LEFT + circular ring */}
          <div className="rounded-2xl p-3.5 flex items-center justify-between shadow-md" style={tileStyle}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={iconBoxStyle}>
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-mono font-bold text-slate-400 uppercase block">TIME LEFT</span>
                <span className="text-[10px] text-slate-500 font-mono block">30 SEC PER BID</span>
              </div>
            </div>

            {/* Circular countdown ring */}
            <div
              className={`w-12 h-12 rounded-full border-2 flex items-center justify-center font-mono font-black text-white text-sm ${isUrgent ? 'animate-pulse' : ''}`}
              style={{
                borderColor: isUrgent ? '#FF5C5C' : accent,
                backgroundColor: alpha(isUrgent ? '#FF5C5C' : accent, 0.15),
                boxShadow: `0 0 15px ${alpha(isUrgent ? '#FF5C5C' : accent, 0.45)}`,
              }}
            >
              {mm}:{ss}
            </div>
          </div>

          {/* SESSION & BATCH — 2 equal cards */}
          <div className="grid grid-cols-2 gap-3 pt-1">

            <div className="rounded-2xl p-3 flex items-center gap-3 shadow-md" style={tileStyle}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={iconBoxStyle}>
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">SESSION</span>
                <span className="text-xs font-black font-mono text-white">{sessionLabel}</span>
              </div>
            </div>

            <div className="rounded-2xl p-3 flex items-center gap-3 shadow-md" style={tileStyle}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={iconBoxStyle}>
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">BATCH</span>
                <span className="text-xs font-black font-mono text-white">{batchLabel}</span>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
