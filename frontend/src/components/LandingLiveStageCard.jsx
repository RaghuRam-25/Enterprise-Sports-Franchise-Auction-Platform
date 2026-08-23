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
 *
 * fitContainer — when true the card stretches to FILL its parent's height
 * (`h-full`) and scales itself down responsively (photo, type, paddings,
 * tiles) so a full-screen dashboard can show it without any page scrolling.
 * Default false keeps the classic content-sized card used on landing/live/
 * podium/modal pages untouched.
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
  fitContainer = false,
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

  // ── fitContainer sizing tokens ─────────────────────────────────────────────
  // Compact equivalents used only by full-screen dashboards; the classic card
  // keeps its original classes when fitContainer is false.
  const rootCls = fitContainer
    // Full-fit dashboards: NO boxed panel — transparent surface that sits
    // directly on the parent card's background (stage-lighting look).
    ? 'relative h-full flex flex-col overflow-x-hidden text-slate-100 font-sans'
    : 'rounded-3xl p-5 sm:p-7 relative overflow-hidden text-slate-100 font-sans';
  const gridCls = fitContainer
    ? 'grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 lg:gap-6 xl:gap-8 items-center my-auto w-full relative z-10'
    : 'grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-center relative z-10';
  const leftColCls = fitContainer
    ? 'lg:col-span-5 min-w-0 flex flex-col items-center text-center space-y-2 sm:space-y-2.5'
    : 'lg:col-span-5 min-w-0 flex flex-col items-center text-center space-y-4';
  const hexCls = fitContainer
    ? 'relative w-36 h-36 sm:w-44 sm:h-44 xl:w-52 xl:h-52 2xl:w-56 2xl:h-56 flex items-center justify-center'
    : 'relative w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center';
  const nameBlockCls = fitContainer ? 'pt-1 w-full min-w-0 overflow-hidden' : 'pt-2 w-full min-w-0 overflow-hidden';
  const nameTextCls = fitContainer
    ? 'block w-max max-w-full mx-auto whitespace-nowrap text-xl sm:text-2xl lg:text-3xl font-black uppercase tracking-tight leading-tight'
    : 'block w-max max-w-full mx-auto whitespace-nowrap text-2xl sm:text-4xl font-black uppercase tracking-tight leading-tight';
  const actionAreaCls = fitContainer ? 'w-full pt-1' : 'w-full pt-2';
  const blindInputCls = fitContainer
    ? 'w-full mb-2 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl bg-[#0e0f14] border font-mono text-sm sm:text-base text-white text-center placeholder:text-slate-600 focus:outline-none'
    : 'w-full mb-2.5 px-4 py-3.5 rounded-2xl bg-[#0e0f14] border font-mono text-base text-white text-center placeholder:text-slate-600 focus:outline-none';
  const bidBtnCls = fitContainer
    ? 'w-full py-3 sm:py-3.5 font-black text-xs sm:text-sm uppercase tracking-wider rounded-xl sm:rounded-2xl transition flex items-center justify-center gap-2'
    : 'w-full py-4 font-black text-sm uppercase tracking-wider rounded-2xl transition flex items-center justify-center gap-2';
  const rightColCls = fitContainer
    ? 'lg:col-span-7 min-w-0 space-y-2 sm:space-y-2.5'
    : 'lg:col-span-7 min-w-0 space-y-3';
  const tilePadCls = fitContainer ? 'p-2.5 sm:p-3' : 'p-3.5';
  const tileIconCls = fitContainer
    ? 'w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0'
    : 'w-10 h-10 rounded-xl flex items-center justify-center shrink-0';
  const tileSvgCls = fitContainer ? 'w-4 h-4 lg:w-5 lg:h-5' : 'w-5 h-5';
  const tileLabelCls = fitContainer
    ? 'text-[10px] sm:text-[11px] font-mono font-bold text-slate-400 uppercase'
    : 'text-xs font-mono font-bold text-slate-400 uppercase';
  const tileValueCls = fitContainer
    ? 'text-base sm:text-lg lg:text-xl font-black font-mono'
    : 'text-lg sm:text-xl font-black font-mono';
  const ringCls = fitContainer
    ? 'w-10 h-10 sm:w-11 sm:h-11 rounded-full border-2 flex items-center justify-center font-mono font-black text-white text-xs sm:text-sm'
    : 'w-12 h-12 rounded-full border-2 flex items-center justify-center font-mono font-black text-white text-sm';

  return (
    <div
      className={rootCls}
      style={fitContainer ? undefined : {
        background: 'linear-gradient(175deg, #0a0a0c 0%, #08080a 55%, #050506 100%)',
        border: `1px solid ${alpha(accent, 0.45)}`,
        boxShadow: `0 0 50px ${alpha(accent, 0.14)}, inset 0 0 80px ${alpha(accent, 0.04)}`,
      }}
    >

      {/* Radial ambient background glow — category tinted. Confined to a
          clipping layer so the blobs can never create phantom scroll space
          when this card is an internal-scrolling full-fit surface. */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full blur-3xl" style={{ background: alpha(accent, 0.10) }} />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full blur-3xl" style={{ background: alpha(accent, 0.10) }} />
      </div>

      {/* ── Main Stage Grid ── */}
      <div className={gridCls}>

        {/* ── Left Column: Hexagon Photo & Identity ── */}
        <div className={leftColCls}>

          {/* Category badge — above the picture */}
          {player?.category && (
            <div
              className={`inline-flex items-center gap-2 ${fitContainer ? 'px-3 py-1' : 'px-4 py-1.5'} rounded-full font-mono font-black ${fitContainer ? 'text-[10px]' : 'text-[11px] sm:text-xs'} uppercase tracking-widest`}
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
          <div className={hexCls}>

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
              neighbouring TIME LEFT column. Block-level h2 keeps the full-form
              position pinned BELOW the name on every screen size. */}
          <div ref={nameWrapRef} className={nameBlockCls}>
            <h2
              ref={nameElRef}
              className={nameTextCls}
            >
              <span className="text-white">{firstName} </span>
              <span style={{ color: accent }}>{lastName}</span>
            </h2>
            <div className="inline-block mt-1">
              <span className={`${fitContainer ? 'text-[10px] sm:text-xs' : 'text-xs'} font-mono font-bold uppercase tracking-widest block`} style={{ color: accent }}>
                {fullPositionName}
              </span>
              <div className="w-12 h-0.5 mx-auto mt-1 rounded-full" style={{ background: accent }} />
            </div>
          </div>

          {/* ── Mode-Based Action Area ── */}
          <div className={actionAreaCls}>
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
                className={blindInputCls}
                style={{ borderColor: alpha(accent, 0.45) }}
              />
            )}
            {mode === 'manager' && !hideBidButton && (
              <button
                onClick={onPlaceBid}
                disabled={bidDisabled}
                className={`${bidBtnCls} ${bidDisabled ? 'cursor-not-allowed opacity-60 saturate-50' : 'transform hover:-translate-y-0.5 hover:brightness-110 active:scale-[0.99]'}`}
                style={{
                  backgroundColor: accent,
                  color: '#050505',
                  boxShadow: bidDisabled ? 'none' : `0 0 30px ${alpha(accent, 0.5)}`,
                }}
              >
                <Zap className={fitContainer ? 'w-4 h-4 fill-current' : 'w-5 h-5 fill-current'} />
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
        <div className={rightColCls}>

          {/* BASE PRICE */}
          <div className={`rounded-2xl ${tilePadCls} flex items-center justify-between shadow-md gap-2`} style={tileStyle}>
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className={tileIconCls} style={iconBoxStyle}>
                <Tag className={tileSvgCls} />
              </div>
              <span className={`${tileLabelCls} truncate`}>BASE PRICE</span>
            </div>
            <span className={`${tileValueCls} text-white shrink-0`}>
              {formatCurrency(basePrice)}
            </span>
          </div>

          {/* CURRENT BID — sealed in Blind Mode (§3) */}
          <div className={`rounded-2xl ${tilePadCls} flex items-center justify-between shadow-md gap-2`} style={tileStyle}>
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className={tileIconCls} style={iconBoxStyle}>
                <TrendingUp className={tileSvgCls} />
              </div>
              <span className={`${tileLabelCls} truncate`}>{blindMode ? 'SEALED' : 'CURRENT BID'}</span>
            </div>
            {blindMode ? (
              <span className={`${fitContainer ? 'text-xs sm:text-sm' : 'text-sm sm:text-base'} font-black font-mono tracking-widest text-slate-500 select-none shrink-0`}>••••• HIDDEN</span>
            ) : (
              <span className={`${tileValueCls} shrink-0`} style={{ color: accent }}>
                {formatCurrency(activeCurrentBid)}
              </span>
            )}
          </div>

          {/* BIDDING TEAM — anonymous in Blind Mode (§4) */}
          <div className={`rounded-2xl ${tilePadCls} flex items-center justify-between shadow-md gap-2`} style={tileStyle}>
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className={tileIconCls} style={iconBoxStyle}>
                <Trophy className={tileSvgCls} />
              </div>
              <span className={`${tileLabelCls} truncate`}>{blindMode ? 'BIDDERS' : 'BIDDING TEAM'}</span>
            </div>
            {blindMode ? (
              <span className={`${fitContainer ? 'text-xs sm:text-sm' : 'text-sm sm:text-base'} font-black text-slate-500 italic tracking-wide select-none shrink-0`}>Anonymous</span>
            ) : teamName ? (
              <div className="flex items-center gap-2 max-w-[55%]">
                {teamLogo && <span className="text-lg sm:text-xl">{teamLogo}</span>}
                <span className={`${fitContainer ? 'text-sm sm:text-base' : 'text-base sm:text-lg'} font-black text-white truncate`}>{teamName}</span>
              </div>
            ) : (
              <span className={`${fitContainer ? 'text-[11px] sm:text-xs' : 'text-sm'} text-slate-500 italic font-bold truncate`}>Opening at base…</span>
            )}
          </div>

          {/* NEXT MINIMUM BID / MINIMUM VALID BID — brighter accent highlight */}
          <div className={`rounded-2xl ${tilePadCls} flex items-center justify-between shadow-md gap-2`} style={{ ...tileStyle, borderColor: alpha(accent, 0.55) }}>
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className={tileIconCls} style={iconBoxStyle}>
                <Target className={tileSvgCls} />
              </div>
              <span className={`${tileLabelCls} truncate`}>{blindMode ? 'MINIMUM VALID BID' : 'NEXT MINIMUM BID'}</span>
            </div>
            <span className={`${tileValueCls} shrink-0`} style={{ color: accent }}>
              {formatCurrency(computedNextMinBid)}
            </span>
          </div>

          {/* TIME LEFT + circular ring */}
          <div className={`rounded-2xl ${tilePadCls} flex items-center justify-between shadow-md gap-2`} style={tileStyle}>
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className={tileIconCls} style={iconBoxStyle}>
                <Clock className={tileSvgCls} />
              </div>
              <div className="min-w-0">
                <span className={`${tileLabelCls} block truncate`}>TIME LEFT</span>
                <span className={`${fitContainer ? 'text-[9px]' : 'text-[10px]'} text-slate-500 font-mono block truncate`}>30 SEC PER BID</span>
              </div>
            </div>

            {/* Circular countdown ring */}
            <div
              className={`${ringCls} shrink-0 ${isUrgent ? 'animate-pulse' : ''}`}
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
          <div className={`grid grid-cols-2 ${fitContainer ? 'gap-2 sm:gap-2.5 pt-0.5' : 'gap-3 pt-1'}`}>

            <div className={`rounded-2xl ${fitContainer ? 'p-2.5' : 'p-3'} flex items-center gap-2.5 sm:gap-3 shadow-md min-w-0`} style={tileStyle}>
              <div className={`${fitContainer ? 'w-8 h-8 sm:w-9 sm:h-9' : 'w-9 h-9'} rounded-xl flex items-center justify-center shrink-0`} style={iconBoxStyle}>
                <Calendar className={fitContainer ? 'w-3.5 h-3.5 sm:w-4 sm:h-4' : 'w-4 h-4'} />
              </div>
              <div className="min-w-0">
                <span className={`${fitContainer ? 'text-[9px] sm:text-[10px]' : 'text-[10px]'} font-mono font-bold text-slate-400 uppercase block truncate`}>SESSION</span>
                <span className={`${fitContainer ? 'text-[11px] sm:text-xs' : 'text-xs'} font-black font-mono text-white truncate`}>{sessionLabel}</span>
              </div>
            </div>

            <div className={`rounded-2xl ${fitContainer ? 'p-2.5' : 'p-3'} flex items-center gap-2.5 sm:gap-3 shadow-md min-w-0`} style={tileStyle}>
              <div className={`${fitContainer ? 'w-8 h-8 sm:w-9 sm:h-9' : 'w-9 h-9'} rounded-xl flex items-center justify-center shrink-0`} style={iconBoxStyle}>
                <Calendar className={fitContainer ? 'w-3.5 h-3.5 sm:w-4 sm:h-4' : 'w-4 h-4'} />
              </div>
              <div className="min-w-0">
                <span className={`${fitContainer ? 'text-[9px] sm:text-[10px]' : 'text-[10px]'} font-mono font-bold text-slate-400 uppercase block truncate`}>BATCH</span>
                <span className={`${fitContainer ? 'text-[11px] sm:text-xs' : 'text-xs'} font-black font-mono text-white truncate`}>{batchLabel}</span>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
