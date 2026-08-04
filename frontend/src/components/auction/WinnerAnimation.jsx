import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Trophy, Crown, Star, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { soundManager, AUCTION_SOUNDS } from './soundManager';

/**
 * WinnerAnimation — "SOLD" championship celebration.
 *
 * Sequence (~20s):
 *   0.0s → Gold flash + hammer sound, SOLD headline drops in
 *   0.3s → Trophy spins in, winner card scales up (elastic)
 *   0.5s → Player image rotates in
 *   0.9s → Team logo pops, winning price counter rolls up
 *   1.5s → Confetti cannons + fireworks + crowd cheer, gold particles rise
 *   2.5s → "Auction Complete" stamp
 *   20.0s → onComplete fires to end the scene.
 *
 * GPU-friendly transform/opacity/filter, honors prefers-reduced-motion.
 *
 * Props (contract preserved — do not change):
 *   - winnerData: { player, team, price }
 *   - isManagerWinner: boolean
 *   - onComplete: () => void
 *   - isActive: boolean
 *   - inline: boolean (optional, default false) — when true the celebration
 *     renders as an ABSOLUTE layer confined to its nearest positioned
 *     ancestor (Podium Admin / Manager / Spectator Player Details panels)
 *     instead of a full-screen fixed overlay, and confetti is fired into a
 *     scoped canvas inside that container.
 */

// Neutral, generic footballer crest used when a player has no uploaded image.
// Original artwork — deliberately not modeled on any real person's likeness.
const PLAYER_FALLBACK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1c1000"/><stop offset="100%" stop-color="#2a1a00"/>
    </linearGradient>
    <linearGradient id="sk" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#e8b58a"/><stop offset="100%" stop-color="#b9835a"/>
    </linearGradient>
    <linearGradient id="js" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#fbbf24"/><stop offset="100%" stop-color="#d97706"/>
    </linearGradient>
  </defs>
  <rect width="320" height="320" fill="url(#bg)"/>
  <circle cx="160" cy="150" r="120" fill="rgba(251,191,36,0.10)"/>
  <path d="M120 96 a40 40 0 0 1 80 0 a40 40 0 0 1 -80 0" fill="url(#sk)"/>
  <path d="M112 100 a48 44 0 0 1 96 -6 c0 -6 -10 -34 -48 -34 s-48 24 -48 40 z" fill="#241a13"/>
  <path d="M96 250 q64 -44 128 0 l6 70 h-140 z" fill="url(#js)"/>
  <text x="160" y="300" text-anchor="middle" font-size="52" font-weight="900" font-family="Arial" fill="#ffe9b3" opacity="0.9">10</text>
</svg>`;

function seededRandom(seed) {
  const x = Math.sin(seed * 9999) * 10000;
  return x - Math.floor(x);
}

const generateParticles = (count) =>
  Array.from({ length: count }).map((_, i) => ({
    id: i,
    left: seededRandom(i * 7 + 1) * 100,
    top: seededRandom(i * 7 + 2) * 100,
    size: 4 + seededRandom(i * 7 + 7) * 6,
    yOffset: -200 - seededRandom(i * 7 + 3) * 320,
    xDrift: (seededRandom(i * 7 + 4) - 0.5) * 120,
    duration: 3 + seededRandom(i * 7 + 5) * 3,
    delay: seededRandom(i * 7 + 6) * 2,
  }));

/**
 * Animated count-up for the winning bid — the digits roll from 0 to the final
 * price with a broadcast-style easing curve, honoring reduced-motion.
 */
function useCountUp(target, duration = 1600, delay = 1100) {
  const [value, setValue] = useState(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) {
      setValue(target);
      return undefined;
    }
    let raf;
    let start;
    const timer = setTimeout(() => {
      start = performance.now();
      const tick = (now) => {
        const progress = Math.min(1, (now - start) / duration);
        // easeOutExpo — fast start, long deceleration like a TV ticker
        const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
        setValue(Math.round(target * eased));
        if (progress < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, delay);
    return () => {
      clearTimeout(timer);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [target, duration, delay, reduceMotion]);

  return value;
}

export default function WinnerAnimation({
  winnerData,
  isManagerWinner = false,
  onComplete,
  isActive = true,
  inline = false,
}) {
  const reduceMotion = useReducedMotion();
  const [celebrated, setCelebrated] = useState(false);
  const particles = useMemo(() => generateParticles(24), []);
  // Scoped confetti canvas so celebration stays inside the container when inline.
  const confettiRef = useRef(null);

  const { player, team, price } = winnerData || {};
  const bid = useCountUp(price || 0);

  // Fire hammer sound + confetti + safety-complete timers.
  useEffect(() => {
    if (!isActive || !winnerData) return undefined;

    soundManager.play(AUCTION_SOUNDS.HAMMER);
    setCelebrated(false);

    const timers = [];
    if (!reduceMotion) {
      timers.push(
        setTimeout(() => {
          fireCelebration(confettiRef.current, inline);
          setCelebrated(true);
        }, 1500)
      );
    } else {
      setCelebrated(true);
    }
    timers.push(setTimeout(() => onComplete?.(), reduceMotion ? 800 : 20000));

    return () => timers.forEach(clearTimeout);
  }, [isActive, winnerData, onComplete, reduceMotion, inline]);

  if (!isActive || !winnerData) return null;

  // Fallback artwork: neutral stylized footballer crest (original SVG, not a
  // copyrighted photo of any real athlete). Player-provided imageUrl still wins.
  const imageSrc =
    player?.imageUrl ||
    player?.image ||
    'data:image/svg+xml;utf8,' +
      encodeURIComponent(PLAYER_FALLBACK_SVG);

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          className={`${inline ? 'absolute inset-0 z-20 overflow-hidden rounded-2xl' : 'fixed inset-0 z-[200]'} flex items-center justify-center overflow-hidden`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
        >
          {/* Golden stadium backdrop */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a0c00] via-[#2a1500] to-[#1a0c00]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_45%,rgba(255,215,0,0.22)_0%,transparent_70%)]" />

          {/* Sweeping stadium light beams */}
          {[20, 50, 80].map((left, i) => (
            <motion.div
              key={i}
              className="absolute -top-24 h-[80vh] w-32 origin-top"
              style={{
                left: `${left}%`,
                background: 'linear-gradient(to bottom, rgba(255,215,0,0.35), transparent 75%)',
                filter: 'blur(24px)',
                willChange: 'transform, opacity',
              }}
              animate={{ rotate: [-10, 10, -10], opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 5, delay: i * 0.6, repeat: Infinity, ease: 'easeInOut' }}
            />
          ))}

          <div className="absolute inset-0 backdrop-blur-[3px]" />

          {/* Initial gold flash */}
          <motion.div
            className="pointer-events-none absolute inset-0 bg-white"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.85, 0] }}
            transition={{ duration: 0.5, times: [0, 0.15, 1] }}
          />

          {/* Scoped confetti canvas — only mounted in inline (confined) mode so
              the celebration never bleeds outside the Player Details panel. */}
          {inline && (
            <canvas
              ref={confettiRef}
              className="pointer-events-none absolute inset-0 z-[5] h-full w-full"
            />
          )}

          <div className="relative z-10 max-w-2xl px-6 text-center">
            {/* Trophy */}
            <motion.div
              className="mb-6"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.3, duration: 0.8, type: 'spring', stiffness: 80 }}
            >
              <Trophy className="mx-auto h-20 w-20 text-amber-400 drop-shadow-[0_0_30px_rgba(255,215,0,0.6)]" />
            </motion.div>

            {/* SOLD */}
            <motion.h1
              className="mb-2 text-5xl font-black font-heading tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-300 sm:text-7xl"
              initial={{ opacity: 0, y: 30, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.45, duration: 0.6, type: 'spring', stiffness: 120 }}
            >
              SOLD
            </motion.h1>

            {/* Congratulations line */}
            <motion.p
              className="mb-5 text-sm font-bold uppercase tracking-[0.25em] text-amber-200/80"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.5 }}
            >
              🎉 Congratulations {team?.name || ''}
            </motion.p>

            {/* Winner card */}
            <motion.div
              className="glass-card rounded-3xl border-2 border-amber-400/40 bg-gradient-to-b from-slate-900 via-slate-900/95 to-[#1a1200] p-8 shadow-2xl shadow-amber-500/20"
              initial={{ opacity: 0, scale: 0.5, y: 60, rotate: -5 }}
              animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
              transition={{ delay: 0.3, duration: 0.8, type: 'spring', stiffness: 90, damping: 12 }}
            >
              <div className="flex flex-col items-center gap-6 sm:flex-row">
                {/* Player image */}
                <div className="relative">
                  <motion.img
                    src={imageSrc}
                    alt={player?.name || 'Player'}
                    className="h-28 w-28 rounded-2xl border-4 border-amber-400/40 object-cover shadow-xl"
                    initial={{ scale: 0, rotate: -180, filter: 'blur(10px)' }}
                    animate={{ scale: 1, rotate: 0, filter: 'blur(0px)' }}
                    transition={{ delay: 0.5, duration: 0.7, ease: 'backOut' }}
                  />
                  <div className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-amber-500 shadow-lg">
                    <Crown className="h-4 w-4 text-slate-950" />
                  </div>
                </div>

                {/* Player + team */}
                <div className="flex-1 space-y-2 text-center sm:text-left">
                  <motion.h2
                    className="text-2xl font-black font-heading text-white"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7, duration: 0.5 }}
                  >
                    {player?.name || 'Player'}
                  </motion.h2>
                  <p className="text-xs text-slate-400">
                    {player?.jerseyName && <span className="font-mono text-amber-400">{player.jerseyName}</span>}
                    {player?.jerseyName && ' • '}
                    {player?.category}
                  </p>

                  <motion.div
                    className="flex items-center justify-center gap-3 pt-2 sm:justify-start"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.9, duration: 0.5, ease: 'backOut' }}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-2xl">
                      {team?.logo || '🏆'}
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-500">Signed By</span>
                      <p className="text-sm font-bold text-white">{team?.name || 'N/A'}</p>
                    </div>
                  </motion.div>
                </div>
              </div>

              {/* Winning price — count-up ticker */}
              <motion.div
                className="mt-6 border-t border-amber-500/30 pt-4 text-center"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.1, duration: 0.6, type: 'spring', stiffness: 140 }}
              >
                <span className="text-xs font-bold uppercase text-slate-400">Winning Bid</span>
                <motion.p
                  className="mt-1 font-mono text-3xl font-black text-amber-400 sm:text-4xl"
                  animate={{ textShadow: ['0 0 0 rgba(255,215,0,0)', '0 0 24px rgba(255,215,0,0.6)', '0 0 0 rgba(255,215,0,0)'] }}
                  transition={{ duration: 1.6, delay: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                >
                  ৳{bid.toLocaleString('en-IN')}
                </motion.p>
              </motion.div>

              {/* Manager win / lose banner */}
              <motion.div
                className={`mt-4 flex items-center justify-center gap-2 ${isManagerWinner ? 'text-emerald-400' : 'text-slate-400'}`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.5, type: 'spring' }}
              >
                {isManagerWinner ? (
                  <>
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="text-sm font-bold">Congratulations! You won this player!</span>
                  </>
                ) : (
                  <>
                    <Star className="h-5 w-5 text-amber-400" />
                    <span className="text-sm font-bold">Better luck next time!</span>
                  </>
                )}
              </motion.div>
            </motion.div>

            {/* Auction complete stamp */}
            <AnimatePresence>
              {celebrated && (
                <motion.div
                  className="mt-6 inline-block"
                  initial={{ opacity: 0, scale: 0, rotate: -15 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 12 }}
                >
                  <div className="rounded-xl border border-amber-500/40 bg-amber-500/20 px-6 py-2">
                    <span className="text-xs font-black uppercase tracking-widest text-amber-400">
                      ★ Auction Complete ★
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Rising gold particles */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {particles.map((p) => (
              <motion.div
                key={p.id}
                className="absolute rounded-full bg-amber-400"
                style={{
                  left: `${p.left}%`,
                  top: `${p.top}%`,
                  width: p.size,
                  height: p.size,
                  boxShadow: '0 0 8px rgba(255,215,0,0.8)',
                  willChange: 'transform, opacity',
                }}
                animate={{ y: [0, p.yOffset], x: [0, p.xDrift], opacity: [1, 0], scale: [1, 0.3] }}
                transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: 'easeOut' }}
              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Fire the celebration — confetti cannons + fireworks + crowd cheer.
 * When a scoped canvas is provided (inline mode), confetti is drawn there so
 * the celebration stays inside the container; otherwise it uses the global
 * full-screen canvas as before.
 */
function fireCelebration(scopedCanvas, isInline) {
  soundManager.play(AUCTION_SOUNDS.CROWD_CHEER);
  soundManager.play(AUCTION_SOUNDS.FIREWORKS);

  const gold = ['#FFD700', '#FFA500', '#FF6B35', '#FFC0CB', '#FFEC8B'];

  const api = scopedCanvas ? confetti.create(scopedCanvas, { resize: true, useWorker: true }) : confetti;

  const fire = (opts) => api(opts);
  if (isInline && scopedCanvas) {
    fire({ particleCount: 90, spread: 100, origin: { y: 0.45 }, colors: gold, gravity: 0.8, ticks: 220 });
    fire({ particleCount: 45, angle: 60, spread: 75, origin: { x: 0, y: 0.6 }, colors: gold, gravity: 0.6 });
    fire({ particleCount: 45, angle: 120, spread: 75, origin: { x: 1, y: 0.6 }, colors: gold, gravity: 0.6 });
  } else {
    fire({ particleCount: 140, spread: 100, origin: { y: 0.45 }, colors: gold, gravity: 0.8, ticks: 220 });
    fire({ particleCount: 70, angle: 60, spread: 75, origin: { x: 0, y: 0.6 }, colors: gold, gravity: 0.6 });
    fire({ particleCount: 70, angle: 120, spread: 75, origin: { x: 1, y: 0.6 }, colors: gold, gravity: 0.6 });
  }
}
