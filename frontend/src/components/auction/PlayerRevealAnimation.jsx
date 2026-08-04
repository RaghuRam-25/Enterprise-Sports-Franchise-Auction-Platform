import { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Calendar, Shield, Clock, Tag, Hash, Globe, Coins } from 'lucide-react';
import SpotlightBackground from './SpotlightBackground';
import FloatingParticles from './FloatingParticles';
import { soundManager, AUCTION_SOUNDS } from './soundManager';

const PLAYER_FALLBACK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a"/><stop offset="100%" stop-color="#1e1b4b"/>
    </linearGradient>
    <linearGradient id="sk" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#e8b58a"/><stop offset="100%" stop-color="#b9835a"/>
    </linearGradient>
    <linearGradient id="js" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#60a5fa"/><stop offset="55%" stop-color="#4f46e5"/><stop offset="100%" stop-color="#312e81"/>
    </linearGradient>
  </defs>
  <rect width="320" height="320" fill="url(#bg)"/>
  <circle cx="160" cy="150" r="120" fill="rgba(56,189,248,0.10)"/>
  <path d="M120 96 a40 40 0 0 1 80 0 a40 40 0 0 1 -80 0" fill="url(#sk)"/>
  <path d="M112 100 a48 44 0 0 1 96 -6 c0 -6 -10 -34 -48 -34 s-48 24 -48 40 z" fill="#241a13"/>
  <path d="M96 250 q64 -44 128 0 l6 70 h-140 z" fill="url(#js)"/>
  <text x="160" y="300" text-anchor="middle" font-size="52" font-weight="900" font-family="Arial" fill="#e2e8f0" opacity="0.9">10</text>
</svg>`;

// Additive step scheduler — each step turns another layer ON and leaves the
// previous ones visible, so the scene accumulates like a broadcast build-up.
// Pacing (per spec) is deliberately unhurried so viewers can actually read
// every detail before the stage hands off to LIVE bidding:
//   0.2–2.0s  cinematic opening — lights, particles, player image
//   2.2s      letter-by-letter name reveal (~1.8s to finish typing)
//   4.0s      player info revealed one item at a time (~1.6s cascade)
//   6.2–15s  complete presentation held fully visible for reading
const STEP_TIMINGS = [
  { step: 1, at: 200 },   // lights / stadium
  { step: 2, at: 1000 },   // image reveal (held)
  { step: 3, at: 2200 },  // name typing
  { step: 4, at: 4000 },  // stat cascade
  { step: 5, at: 6200 },  // final hold
];
const COMPLETE_AT = 15100;

export default function PlayerRevealAnimation({ player, onComplete, isActive = true, inline = false }) {
  const reduceMotion = useReducedMotion();
  const [step, setStep] = useState(0);

  // Phase scheduler — chained timers advance the cinematic build-up, then fire
  // onComplete so the state machine can move on to LIVE bidding. Reduced-motion
  // users jump straight to the fully-assembled scene.
  useEffect(() => {
    if (!isActive || !player) return undefined;

    if (reduceMotion) {
      setStep(5);
      const t = setTimeout(() => onComplete?.(), 500);
      return () => clearTimeout(t);
    }

    setStep(0);
    soundManager.play(AUCTION_SOUNDS.WHOOSH);

    const timers = STEP_TIMINGS.map(({ step: s, at }) => setTimeout(() => setStep(s), at));
    timers.push(setTimeout(() => onComplete?.(), COMPLETE_AT));

    return () => timers.forEach(clearTimeout);
  }, [isActive, player, onComplete, reduceMotion]);

  if (!player) return null;

  // Fallback artwork: a neutral, stylized footballer crest (original SVG, not a
  // copyrighted photo of any real athlete). Player-provided imageUrl still wins.
  const imageSrc =
    player.imageUrl ||
    player.image ||
    'data:image/svg+xml;utf8,' + encodeURIComponent(PLAYER_FALLBACK_SVG);

  // Reveal order per spec: Position → Category → Session → Base Price → rest.
  // Base Price is flagged so it renders as the highlighted broadcast stat.
  const detailItems = [
    { icon: Shield, label: 'Position', value: player.primaryPosition || player.positions?.[0] || 'N/A' },
    { icon: Tag, label: 'Category', value: player.category || 'N/A' },
    { icon: Calendar, label: 'Session', value: player.session || 'N/A' },
    { icon: Coins, label: 'Base Price', value: `৳${(player.basePrice || 0).toLocaleString('en-IN')}`, highlight: true },
    { icon: Globe, label: 'Country', value: player.country || 'N/A' },
    { icon: Hash, label: 'Student ID', value: player.studentId || 'N/A' }
  ].filter((item) => item.highlight || (item.value && item.value !== 'N/A'));

  const showLights = step >= 1;
  const showImage = step >= 2;
  const showName = step >= 3;
  const showStats = step >= 4;
  const nameChars = player.name.split('');
  // The name has finished typing once we move past the name step; trigger the
  // broadcast-title glow pulse from that moment on.
  const namePulsing = step >= 4;

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          className={`${inline ? 'absolute inset-0 z-20 rounded-2xl' : 'fixed inset-0 z-[110]'} flex items-center justify-center overflow-hidden bg-black`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, filter: 'blur(10px)' }}
          transition={{ duration: 0.4 }}
        >
          {/* Inline (Podium Admin) mode: early-dismiss control so the admin is
              never locked inside the confined intro — calls onComplete to hand
              control back to the live podium card. */}
          {inline && (
            <button
              type="button"
              onClick={onComplete}
              className="absolute right-3 top-3 z-50 flex items-center gap-1.5 rounded-full border border-white/15 bg-slate-950/60 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-300 backdrop-blur-md transition hover:border-white/30 hover:text-white"
              style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}
            >
              Skip Reveal
            </button>
          )}

          {/* STEP 1 — Stadium lighting, spotlight cone, particles, floodlights */}
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: showLights ? 1 : 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <SpotlightBackground theme="default" spotlightEnabled />
            <FloatingParticles count={26} theme="default" />
            <FloodlightBank active={showLights} />
          </motion.div>
          {/* Descending spotlight cone */}
          <motion.div
            className="pointer-events-none absolute left-1/2 top-0 h-[120%] w-[62%] -translate-x-1/2 origin-top"
            style={{
              background:
                'linear-gradient(to bottom, rgba(255,255,255,0.14), rgba(56,189,248,0.06) 40%, transparent 75%)',
              filter: 'blur(8px)',
              willChange: 'transform, opacity',
            }}
            initial={{ opacity: 0, scaleY: 0.4 }}
            animate={{ opacity: showLights ? 1 : 0, scaleY: showLights ? 1 : 0.4 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          />
          {/* Soft camera push-in on the whole stage as the scene assembles.
              Fills the (now larger) container, stays centered, and can scroll
              vertically as an overflow safety-net so nothing is ever clipped on
              short viewports. Padding/gap scale down on small screens. */}
          <motion.div
            className="relative z-10 flex h-full w-full max-w-4xl flex-col items-center justify-center gap-4 overflow-y-auto px-4 py-6 text-center sm:gap-6 sm:px-8"
            initial={{ scale: 1.06 }}
            animate={{ scale: showStats ? 1 : 1.03 }}
            transition={{ duration: 3, ease: [0.16, 1, 0.3, 1] }}
            style={{ willChange: 'transform' }}
          >
            {/* STEP 2 — Player image: scales in, 3D tilt, glowing glass frame,
                floating particles, soft light sweep. Stays on screen. */}
            <AnimatePresence>
              {showImage && (
                <motion.div
                  key="portrait"
                  className="relative"
                  style={{ perspective: 1000 }}
                  initial={{ opacity: 0, scale: 0.55, rotateY: -22, filter: 'blur(18px)' }}
                  animate={{ opacity: 1, scale: 1, rotateY: 0, filter: 'blur(0px)' }}
                  transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
                >
                  {/* Subtle perpetual 3D orbit */}
                  <motion.div
                    className="relative"
                    animate={{ rotateY: [0, -6, 6, -3, 0], rotateX: [0, 3, -2, 0, 0] }}
                    transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                    style={{ transformStyle: 'preserve-3d', willChange: 'transform' }}
                  >
                    {/* Glassmorphism frame with glowing border */}
                    <div
                      className="relative overflow-hidden rounded-[2rem] border-2 border-cyan-300/50 p-1.5"
                      style={{
                        background: 'linear-gradient(160deg, rgba(56,189,248,0.18), rgba(15,23,42,0.35))',
                        backdropFilter: 'blur(14px)',
                        boxShadow: '0 0 40px rgba(34,211,238,0.35), inset 0 0 24px rgba(56,189,248,0.25)',
                      }}
                    >
                      <img
                        src={imageSrc}
                        alt={player.name}
                        className="h-32 w-32 rounded-[1.6rem] object-cover sm:h-44 sm:w-44 lg:h-52 lg:w-52"
                        style={{ willChange: 'transform, filter' }}
                      />
                      {/* Soft light sweep across the portrait */}
                      <motion.div
                        className="pointer-events-none absolute inset-0"
                        aria-hidden="true"
                      >
                        <motion.div
                          className="h-full w-1/2 skew-x-12 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                          animate={{ x: ['-160%', '260%'] }}
                          transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1.2 }}
                          style={{ willChange: 'transform' }}
                        />
                      </motion.div>
                    </div>

                    {/* Rotating halo ring behind the portrait */}
                    <motion.div
                      className="absolute -inset-5 -z-10 rounded-full border border-cyan-400/25"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 16, repeat: Infinity, ease: 'linear' }}
                    />
                  </motion.div>

                  {/* Pulsing glow bloom */}
                  <motion.div
                    className="absolute -inset-3 -z-20 rounded-[2.5rem] bg-cyan-400/25 blur-2xl"
                    animate={{ opacity: [0.35, 0.75, 0.35], scale: [0.92, 1.08, 0.92] }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                  />

                  {/* Tight orbit of floating light particles around the portrait */}
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <motion.span
                      key={i}
                      className="absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full bg-cyan-200"
                      style={{ boxShadow: '0 0 8px rgba(186,230,253,0.9)', willChange: 'transform, opacity' }}
                      animate={{
                        x: Math.cos((i / 6) * Math.PI * 2) * 130,
                        y: Math.sin((i / 6) * Math.PI * 2) * 130,
                        opacity: [0, 1, 0],
                        rotate: 360,
                      }}
                      transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: i * 0.35 }}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* STEP 3 — Player name types in letter-by-letter, then glow-pulses
                like a broadcast title. Stays on screen. */}
            <AnimatePresence>
              {showName && (
                <motion.div key="name" className="relative">
                  <motion.h1
                    className="flex max-w-full flex-wrap items-center justify-center px-2 text-center text-3xl font-black font-heading tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-blue-400 to-emerald-400 sm:text-5xl lg:text-6xl"
                    aria-label={player.name}
                    animate={
                      namePulsing
                        ? {
                          filter: [
                            'drop-shadow(0 0 0px rgba(56,189,248,0))',
                            'drop-shadow(0 0 18px rgba(56,189,248,0.65))',
                            'drop-shadow(0 0 4px rgba(56,189,248,0.2))',
                          ],
                        }
                        : {}
                    }
                    transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    {nameChars.map((char, i) => (
                      <motion.span
                        key={`${char}-${i}`}
                        aria-hidden="true"
                        className="inline-block"
                        style={{ willChange: 'transform, opacity, filter', whiteSpace: 'pre' }}
                        initial={{ opacity: 0, y: 28, rotateX: -90, filter: 'blur(8px)' }}
                        animate={{ opacity: 1, y: 0, rotateX: 0, filter: 'blur(0px)' }}
                        transition={{ delay: i * 0.05, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                      >
                        {char}
                      </motion.span>
                    ))}
                  </motion.h1>
                  {/* Underline sweep that highlights the finished title */}
                  <motion.div
                    className="mx-auto mt-2 h-[3px] rounded-full bg-gradient-to-r from-transparent via-cyan-300 to-transparent"
                    initial={{ scaleX: 0, opacity: 0 }}
                    animate={{ scaleX: namePulsing ? 1 : 0, opacity: namePulsing ? 1 : 0 }}
                    transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
                    style={{ transformOrigin: 'center' }}
                  />
                  {player.jerseyName && (
                    <motion.p
                      className="mt-1 text-center text-sm font-semibold text-slate-300"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: namePulsing ? 1 : 0 }}
                      transition={{ duration: 0.5, delay: 0.2 }}
                    >
                      <span className="font-mono text-cyan-300">{player.jerseyName}</span>
                    </motion.p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* STEP 4 — Key info revealed ONE AT A TIME. Each row slides + fades
                + glows briefly, then stays. Base Price is the highlighted stat. */}
            <AnimatePresence>
              {showStats && (
                <motion.div
                  key="stats"
                  className="grid w-full max-w-2xl grid-cols-1 gap-2.5 sm:grid-cols-2"
                >
                  {detailItems.map((item, idx) => {
                    const Icon = item.icon;
                    return (
                      <motion.div
                        key={item.label}
                        className={`flex items-center gap-3 rounded-xl border px-4 py-2.5 backdrop-blur-md ${item.highlight
                          ? 'border-emerald-400/50 bg-emerald-500/10'
                          : 'border-white/10 bg-white/5'
                          }`}
                        initial={{ opacity: 0, x: -32, filter: 'blur(6px)' }}
                        animate={{
                          opacity: 1,
                          x: 0,
                          filter: 'blur(0px)',
                          boxShadow: [
                            '0 0 0px rgba(56,189,248,0)',
                            item.highlight
                              ? '0 0 22px rgba(16,185,129,0.55)'
                              : '0 0 18px rgba(56,189,248,0.45)',
                            item.highlight
                              ? '0 0 8px rgba(16,185,129,0.25)'
                              : '0 0 0px rgba(56,189,248,0)',
                          ],
                        }}
                        transition={{
                          delay: idx * 0.16,
                          duration: 0.5,
                          ease: [0.16, 1, 0.3, 1],
                          boxShadow: { delay: idx * 0.16, duration: 1.1 },
                        }}
                        style={{ willChange: 'transform, opacity, filter' }}
                      >
                        <Icon
                          className={`h-4 w-4 flex-shrink-0 ${item.highlight ? 'text-emerald-300' : 'text-cyan-300'
                            }`}
                        />
                        <span className="whitespace-nowrap text-[11px] font-bold uppercase tracking-widest text-slate-400">
                          {item.label}
                        </span>
                        <span
                          className={`ml-auto min-w-0 truncate text-right font-bold ${item.highlight
                            ? 'font-mono text-lg text-emerald-300'
                            : 'text-base text-white'
                            }`}
                        >
                          {item.value}
                        </span>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Cinematic vignette */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_50%,rgba(0,0,0,0.7)_100%)]" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* Stadium floodlight bank — a row of lamps that flare on when lights come up. */
function FloodlightBank({ active }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-around px-8">
      {Array.from({ length: 6 }).map((_, i) => (
        <motion.div
          key={i}
          className="h-3 w-10 rounded-b-lg bg-cyan-200"
          style={{ willChange: 'opacity, filter' }}
          initial={{ opacity: 0.15 }}
          animate={
            active
              ? { opacity: [0.15, 1, 0.8], boxShadow: '0 0 30px 8px rgba(186,230,253,0.7)' }
              : { opacity: 0.15 }
          }
          transition={{ duration: 0.4, delay: i * 0.05 }}
        />
      ))}
    </div>
  );
}
