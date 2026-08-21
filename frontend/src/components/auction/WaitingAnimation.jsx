import { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Trophy, Shield, Users, Radio } from 'lucide-react';
import FloatingParticles from './FloatingParticles';
import SpotlightBackground from './SpotlightBackground';
import { soundManager, AUCTION_SOUNDS } from './soundManager';

/**
 * WaitingAnimation — broadcast-quality "waiting for next player" sequence shown
 * when no player is currently on the podium.
 *
 * A looping, TV-style 5-scene cinematic (no human figure — everything reads
 * through the ball, light, and motion):
 *   Scene 1 (LIGHTS) → Dark arena, floodlights snap on tier by tier, crowd
 *                      camera-flashes swell, the camera slowly pushes in.
 *   Scene 2 (RUN)    → A glowing match ball rolls and bounces across the pitch,
 *                      trailing speed streaks and ground dust, converging on
 *                      dead-center screen (never off to one side).
 *   Scene 3 (KICK)   → The ball plants dead-center, spins up, and charges with
 *                      energy — a shockwave ring pulses outward — screen shake
 *                      for impact.
 *   Scene 4 (BALL)   → The ball (still dead-center) rockets straight at the
 *                      viewer, fills the frame with motion blur + a light
 *                      trail, then bursts into a radial storm of glowing
 *                      particles — all from the same center point, so nothing
 *                      ever reads as entering from a side.
 *   Scene 5 (TEXT)   → Those particles converge and resolve into the headline
 *                      "WAITING FOR NEXT PLAYER" / "Preparing the Next Auction",
 *                      then the loop restarts.
 *
 * A persistent glassmorphism broadcast HUD (LIVE bug + a lower-third scoreboard)
 * sits above every scene so it always reads like a live sports feed.
 *
 * Everything animates with GPU-friendly transform / opacity / filter only — no
 * layout-shifting properties — targeting a steady 60 FPS. Honors
 * prefers-reduced-motion by collapsing straight to the informative final scene.
 *
 * Props (contract preserved — do not change existing ones):
 *   - teamsConnected: number  (from AuctionContext teams.length)
 *   - managersReady: number   (estimated from teams with managerId)
 *   - isActive: boolean       (whether this animation should play)
 *   - inline: boolean         (NEW, optional, default false) — when true the
 *              animation renders as an ABSOLUTE layer that fills its nearest
 *              positioned ancestor (used by the Podium Admin panel so the
 *              cinematic stays inside the Player Details area and never covers
 *              the navbar / sidebar). When false it is a full-screen fixed
 *              overlay (spectator / player broadcast view).
 */

// Scene identifiers and their durations (ms). The controller advances through
// them in order and loops back to LIGHTS after TEXT holds.
const SCENES = ['lights', 'run', 'kick', 'ball', 'text'];
const SCENE_DURATIONS = {
  lights: 2200,
  run: 1900,
  kick: 900,
  ball: 1200,
  text: 4200,
};

export default function WaitingAnimation({
  teamsConnected = 0,
  managersReady = 0,
  isActive = true,
  inline = false,
}) {
  const reduceMotion = useReducedMotion();
  // Start on the informative final scene when motion is reduced.
  const [scene, setScene] = useState(reduceMotion ? 'text' : 'lights');

  useEffect(() => {
    if (isActive) {
      soundManager.play(AUCTION_SOUNDS.WAITING_AMBIENT);
    }
  }, [isActive]);

  // Scene controller — chained timeouts that loop indefinitely while active.
  useEffect(() => {
    if (!isActive || reduceMotion) return undefined;

    let timeoutId;
    const schedule = (current) => {
      timeoutId = setTimeout(() => {
        const nextIndex = (SCENES.indexOf(current) + 1) % SCENES.length;
        const next = SCENES[nextIndex];
        setScene(next);
        schedule(next);
      }, SCENE_DURATIONS[current]);
    };

    setScene('lights');
    schedule('lights');
    return () => clearTimeout(timeoutId);
  }, [isActive, reduceMotion]);

  // Screen-shake is applied at the moment of the kick for broadcast impact.
  const shake = scene === 'kick';

  const wrapperClass = inline
    ? 'absolute inset-0 z-10 rounded-2xl'
    : 'fixed inset-0 z-[999]';

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          className={`${wrapperClass} flex items-center justify-center overflow-hidden bg-[#03060d]`}
          style={{ willChange: 'opacity' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Living stadium backdrop — always present beneath every scene */}
          <SpotlightBackground theme="waiting" spotlightEnabled />
          <StadiumBackdrop lit={scene !== 'lights' || true} igniting={scene === 'lights'} />
          <FloatingParticles count={inline ? 16 : 26} theme="waiting" />

          {/* Camera rig — a slow cinematic push plus a shake on the kick frame */}
          <motion.div
            className="absolute inset-0"
            animate={
              shake
                ? { x: [0, -9, 8, -6, 4, 0], y: [0, 6, -5, 3, -2, 0], scale: 1.04 }
                : scene === 'ball'
                  ? { scale: 1.08, x: 0, y: 0 }
                  : { x: 0, y: 0, scale: [1, 1.035] }
            }
            transition={
              shake
                ? { duration: 0.5, ease: 'easeOut' }
                : scene === 'ball'
                  ? { duration: 1, ease: 'easeIn' }
                  : { duration: SCENE_DURATIONS[scene] / 1000, ease: 'easeInOut' }
            }
            style={{ willChange: 'transform' }}
          >
            <AnimatePresence mode="wait">
              {scene === 'run' && <RunScene key="run" compact={inline} />}
              {scene === 'kick' && <KickScene key="kick" compact={inline} />}
              {scene === 'ball' && <BallScene key="ball" />}
            </AnimatePresence>
          </motion.div>

          {/* Final scene: particles resolve into headline typography */}
          <AnimatePresence>
            {scene === 'text' && (
              <motion.div
                key="headline"
                className="relative z-20 flex flex-col items-center gap-8 px-6 text-center"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05, filter: 'blur(8px)' }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              >
                <ParticleAssembly />
                <HeadlineBlock compact={inline} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Persistent broadcast HUD — reads like a live TV feed on every scene */}
          <BroadcastHUD
            teamsConnected={teamsConnected}
            managersReady={managersReady}
            compact={inline}
          />

          {/* Cinematic vignette for broadcast depth */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(0,0,0,0.78)_100%)]" />
          {/* Subtle scanline / film sheen */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-overlay"
            style={{
              backgroundImage:
                'repeating-linear-gradient(to bottom, rgba(255,255,255,0.7) 0px, rgba(255,255,255,0.7) 1px, transparent 1px, transparent 3px)',
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 * BroadcastHUD — glassmorphism live bug + lower-third scoreboard that stay
 * on screen through the whole sequence for a premium TV-feed feel.
 * ──────────────────────────────────────────────────────────────────────── */
function BroadcastHUD({ teamsConnected, managersReady, compact }) {
  return (
    <>
      {/* Top-left LIVE bug */}
      <motion.div
        className="pointer-events-none absolute left-4 top-4 z-30 flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 backdrop-blur-md"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        style={{ boxShadow: '0 8px 30px rgba(0,0,0,0.35)' }}
      >
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-urgentRed opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-urgentRed" />
        </span>
        <span className="text-[10px] font-black uppercase tracking-[0.25em] text-white/90">
          Live
        </span>
        <span className="h-3 w-px bg-white/20" />
        <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.18em] text-secondaryText">
          <Radio className="h-3 w-3 text-neonGreen" /> Auction Centre
        </span>
      </motion.div>

      {/* Bottom lower-third scoreboard bug */}
      <motion.div
        className={`pointer-events-none absolute bottom-4 left-4 z-30 flex items-center gap-3 rounded-2xl border border-white/10 bg-darkBg/50 backdrop-blur-xl ${compact ? 'px-3 py-2' : 'px-5 py-3'}`}
        initial={{ opacity: 0, x: -24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.35 }}
        style={{ boxShadow: '0 12px 40px rgba(0,0,0,0.45)' }}
      >
        <HudStat
          icon={<Trophy className="h-3.5 w-3.5 text-neonGreen" />}
          label="Teams"
          value={teamsConnected}
          compact={compact}
        />
        <span className="h-8 w-px bg-white/10" />
        <HudStat
          icon={<Shield className="h-3.5 w-3.5 text-neonGreen" />}
          label="Managers"
          value={managersReady}
          compact={compact}
        />
        <span className="h-8 w-px bg-white/10" />
        <HudStat
          icon={<Users className="h-3.5 w-3.5 text-warningGold" />}
          label="Podium"
          value="1"
          compact={compact}
        />
      </motion.div>
    </>
  );
}

function HudStat({ icon, label, value, compact }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/5">
        {icon}
      </span>
      <div className="text-left">
        <p className="text-[9px] font-bold uppercase tracking-widest text-secondaryText">{label}</p>
        <p className={`font-mono font-black text-neonGreen ${compact ? 'text-xs' : 'text-sm'}`}>
          {value}
        </p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 * StadiumBackdrop — layered stadium tiers, floodlight flares and drifting fog.
 * The `igniting` flag runs a brief "lights turning on" flare during the LIGHTS
 * scene. Pure transform/opacity so it composites cheaply on the GPU.
 * ──────────────────────────────────────────────────────────────────────── */
function StadiumBackdrop({ igniting }) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Distant crowd tier gradient */}
      <div className="absolute inset-x-0 top-0 h-1/2 bg-[linear-gradient(to_bottom,rgba(11,11,11,0.55),transparent)]" />
      {/* Pitch glow near the bottom */}
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-[radial-gradient(ellipse_80%_60%_at_50%_120%,rgba(88,210,10,0.16),transparent_70%)]" />
      {/* Pitch stripes for depth */}
      <div
        className="absolute inset-x-0 bottom-0 h-1/3 opacity-25"
        style={{
          background:
            'repeating-linear-gradient(105deg, rgba(88,210,10,0.10) 0px, rgba(88,210,10,0.10) 40px, transparent 40px, transparent 80px)',
          maskImage: 'linear-gradient(to top, black, transparent)',
          WebkitMaskImage: 'linear-gradient(to top, black, transparent)',
        }}
      />

      {/* Crowd atmosphere — camera-flash twinkles across the upper stands */}
      <CrowdAtmosphere />

      {/* Floodlight flares sweeping from the top corners. During ignition they
          snap on with a brief overshoot for a "lights coming up" beat. */}
      {[
        { left: '10%', delay: 0, hue: 'rgba(114,242,26,0.4)' },
        { left: '34%', delay: 0.18, hue: 'rgba(244,197,66,0.3)' },
        { left: '60%', delay: 0.32, hue: 'rgba(88,210,10,0.36)' },
        { left: '86%', delay: 0.46, hue: 'rgba(244,197,66,0.32)' },
      ].map((f, i) => (
        <motion.div
          key={i}
          className="absolute -top-24 h-[75vh] w-40 origin-top"
          style={{
            left: f.left,
            background: `linear-gradient(to bottom, ${f.hue}, transparent 75%)`,
            filter: 'blur(22px)',
            willChange: 'transform, opacity',
            transform: 'rotate(8deg)',
          }}
          animate={
            igniting
              ? { opacity: [0, 1, 0.55], rotate: [8, 10, 8] }
              : { opacity: [0.3, 0.7, 0.3], rotate: [6, 12, 6] }
          }
          transition={
            igniting
              ? { duration: 0.7, delay: f.delay, ease: 'easeOut' }
              : { duration: 6, delay: f.delay, repeat: Infinity, ease: 'easeInOut' }
          }
        />
      ))}

      {/* Floodlight lamp banks at the very top */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-around px-10">
        {Array.from({ length: 7 }).map((_, i) => (
          <motion.div
            key={i}
            className="h-2.5 w-9 rounded-b-lg bg-neonGreenHover"
            style={{ willChange: 'opacity' }}
            animate={
              igniting
                ? { opacity: [0.1, 1, 0.85], boxShadow: '0 0 26px 6px rgba(114,242,26,0.75)' }
                : { opacity: [0.7, 0.9, 0.7], boxShadow: '0 0 18px 4px rgba(114,242,26,0.5)' }
            }
            transition={
              igniting
                ? { duration: 0.5, delay: i * 0.06 }
                : { duration: 4, repeat: Infinity, ease: 'easeInOut' }
            }
          />
        ))}
      </div>

      {/* Drifting fog banks */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={`fog-${i}`}
          className="absolute inset-x-0 rounded-full"
          style={{
            bottom: `${i * 12}%`,
            height: '38%',
            background:
              'radial-gradient(ellipse 60% 100% at 50% 100%, rgba(163,163,163,0.10), transparent 70%)',
            filter: 'blur(30px)',
            willChange: 'transform, opacity',
          }}
          animate={{ x: ['-8%', '8%', '-8%'], opacity: [0.35, 0.6, 0.35] }}
          transition={{ duration: 12 + i * 3, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

/* CrowdAtmosphere — a scatter of camera-flash twinkles across the upper stands. */
function CrowdAtmosphere() {
  const flashes = Array.from({ length: 32 }).map((_, i) => ({
    id: i,
    left: `${(i * 37 + 11) % 100}%`,
    top: `${8 + ((i * 53) % 34)}%`,
    delay: (i % 9) * 0.7,
    duration: 2.4 + (i % 5) * 0.6,
    size: 2 + (i % 3),
  }));
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {flashes.map((f) => (
        <motion.span
          key={f.id}
          className="absolute rounded-full bg-white"
          style={{
            left: f.left,
            top: f.top,
            width: f.size,
            height: f.size,
            boxShadow: '0 0 6px 1px rgba(255,255,255,0.85)',
            willChange: 'opacity, transform',
          }}
          animate={{ opacity: [0, 1, 0], scale: [0.5, 1.4, 0.5] }}
          transition={{
            duration: 0.5,
            delay: f.delay,
            repeat: Infinity,
            repeatDelay: f.duration,
            ease: 'easeOut',
          }}
        />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 * RunScene — no human figure. A glowing match ball rolls and bounces toward
 * dead-center screen by itself, spinning continuously, trailing speed streaks
 * and kicking up ground dust on every bounce. It now converges exactly on
 * the same center point where KickScene and BallScene live, so the ball
 * never appears to "teleport" in from a side — it's one continuous body
 * settling into the middle of the frame.
 * ──────────────────────────────────────────────────────────────────────── */
function RunScene({ compact }) {
  const size = compact ? 40 : 56;
  return (
    <motion.div
      className="absolute bottom-[28%] left-1/2 w-full -translate-x-1/2"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <motion.div
        className="absolute bottom-0 left-1/2"
        style={{ willChange: 'transform' }}
        initial={{ x: '-160%' }}
        animate={{ x: '-50%' }}
        transition={{ duration: 1.8, ease: 'easeIn' }}
      >
        {/* Speed streaks trailing the ball */}
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute top-1/2 h-1 rounded-full"
            style={{
              right: '70%',
              width: 110 - i * 24,
              marginTop: -14 + i * 14,
              background:
                'linear-gradient(to left, rgba(88,210,10,0.75), transparent)',
              filter: 'blur(2px)',
              willChange: 'transform, opacity',
            }}
            animate={{ opacity: [0.2, 0.75, 0.2], scaleX: [0.8, 1.25, 0.8] }}
            transition={{ duration: 0.28, repeat: Infinity, delay: i * 0.05 }}
          />
        ))}

        {/* Bounce arc + continuous spin = ball rolling under its own energy */}
        <motion.div
          animate={{ y: [0, -34, 0, -18, 0], rotate: [0, 360] }}
          transition={{
            y: { duration: 0.9, repeat: Infinity, ease: 'easeOut', times: [0, 0.4, 0.6, 0.85, 1] },
            rotate: { duration: 0.5, repeat: Infinity, ease: 'linear' },
          }}
          style={{ willChange: 'transform' }}
        >
          <SoccerBall size={size} />
        </motion.div>

        {/* Ground contact dust pulses each time the ball lands */}
        <motion.div
          className="absolute -bottom-1 left-1/2 h-3 w-16 -translate-x-1/2 rounded-full bg-neonGreen/25 blur-md"
          animate={{ opacity: [0, 0.6, 0, 0.4, 0], scaleX: [0.6, 1.3, 0.6, 1.1, 0.6] }}
          transition={{ duration: 0.9, repeat: Infinity, ease: 'easeOut' }}
        />
      </motion.div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 * KickScene — no human figure. The ball plants dead-center (same point where
 * RunScene ended and where BallScene will launch from), spins up and charges
 * with energy, then a shockwave ring pulses outward for the "impact" beat
 * before handing off into the BallScene charge.
 * ──────────────────────────────────────────────────────────────────────── */
function KickScene({ compact }) {
  const size = compact ? 44 : 60;
  return (
    <motion.div
      className="absolute inset-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="absolute bottom-[28%] left-1/2 -translate-x-1/2">
        {/* Shockwave rings pulsing outward from the charged ball */}
        {[0, 1].map((i) => (
          <motion.div
            key={i}
            className="absolute left-1/2 top-1/2 rounded-full border-2 border-neonGreenHover/70"
            style={{ width: 20, height: 20, marginLeft: -10, marginTop: -10 }}
            initial={{ scale: 0.6, opacity: 0.9 }}
            animate={{ scale: 6 + i * 2, opacity: 0 }}
            transition={{ duration: 0.55, delay: 0.1 + i * 0.15, ease: 'easeOut' }}
          />
        ))}

        {/* Charging glow behind the ball */}
        <motion.div
          className="absolute left-1/2 top-1/2 -z-10 rounded-full bg-neonGreenHover/60 blur-xl"
          style={{ width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2 }}
          animate={{ scale: [0.8, 1.6], opacity: [0.5, 0.9] }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
        />

        {/* Ball spinning up in place before it launches */}
        <motion.div
          initial={{ scale: 1 }}
          animate={{ scale: [1, 1.15, 1], rotate: [0, 540] }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          style={{ willChange: 'transform' }}
        >
          <SoccerBall size={size} />
        </motion.div>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 * BallScene — the ball, still dead-center, rushes the camera, fills the frame
 * with motion blur and a light trail, then bursts into a radial explosion of
 * glowing particles that seeds the text reveal. Everything originates from
 * and returns to the same center point — nothing enters from a side.
 * ──────────────────────────────────────────────────────────────────────── */
function BallScene() {
  const shards = Array.from({ length: 26 }).map((_, i) => {
    const angle = (i / 26) * Math.PI * 2;
    return {
      id: i,
      x: Math.cos(angle) * (200 + (i % 5) * 34),
      y: Math.sin(angle) * (200 + (i % 5) * 34),
    };
  });

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Streaking light trail behind the incoming ball */}
      <motion.div
        className="absolute h-1.5 w-[60%] rounded-full"
        style={{
          background:
            'linear-gradient(to right, transparent, rgba(88,210,10,0.7), rgba(255,255,255,0.95), rgba(88,210,10,0.7), transparent)',
          filter: 'blur(4px)',
          willChange: 'transform, opacity',
        }}
        initial={{ scaleX: 0.2, opacity: 0 }}
        animate={{ scaleX: [0.2, 1.4, 0.6], opacity: [0, 0.9, 0] }}
        transition={{ duration: 0.7, ease: 'easeIn' }}
      />

      {/* Ball rushing toward camera with motion blur — grows outward from
          center rather than approaching from any side */}
      <motion.div
        style={{ willChange: 'transform, filter' }}
        initial={{ scale: 0.5, filter: 'blur(4px)', opacity: 0 }}
        animate={{
          scale: [0.5, 6, 11],
          filter: ['blur(4px)', 'blur(1px)', 'blur(10px)'],
          opacity: [0, 1, 0],
        }}
        transition={{ duration: 0.8, ease: 'easeIn', times: [0, 0.7, 1] }}
      >
        <SoccerBall size={62} />
      </motion.div>

      {/* Impact flash */}
      <motion.div
        className="absolute inset-0 bg-white"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.9, 0] }}
        transition={{ duration: 0.5, delay: 0.6, times: [0, 0.2, 1] }}
      />

      {/* Radial particle explosion, seeded from the exact center point */}
      {shards.map((s) => (
        <motion.div
          key={s.id}
          className="absolute h-2.5 w-2.5 rounded-full bg-neonGreenHover"
          style={{ willChange: 'transform, opacity', boxShadow: '0 0 10px rgba(88,210,10,0.95)' }}
          initial={{ x: 0, y: 0, scale: 1, opacity: 0 }}
          animate={{ x: s.x, y: s.y, scale: [1, 0.2], opacity: [1, 0] }}
          transition={{ duration: 0.75, delay: 0.62, ease: 'easeOut' }}
        />
      ))}
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 * ParticleAssembly — glowing particles fly inward and settle behind the
 * headline, so the text reads as being "revealed" out of the ball's burst.
 * ──────────────────────────────────────────────────────────────────────── */
function ParticleAssembly() {
  const motes = Array.from({ length: 20 }).map((_, i) => {
    const angle = (i / 20) * Math.PI * 2;
    const radius = 220 + (i % 4) * 40;
    return {
      id: i,
      fromX: Math.cos(angle) * radius,
      fromY: Math.sin(angle) * radius,
    };
  });
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      {motes.map((m) => (
        <motion.span
          key={m.id}
          className="absolute h-1.5 w-1.5 rounded-full bg-neonGreenHover"
          style={{ boxShadow: '0 0 8px rgba(114,242,26,0.9)', willChange: 'transform, opacity' }}
          initial={{ x: m.fromX, y: m.fromY, opacity: 0, scale: 1.4 }}
          animate={{ x: 0, y: 0, opacity: [0, 1, 0], scale: 0.3 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 * HeadlineBlock — premium typography that the particles resolve into.
 * ──────────────────────────────────────────────────────────────────────── */
function HeadlineBlock({ compact }) {
  return (
    <div className="relative space-y-4">
      <motion.div
        className="mx-auto mb-2 h-[3px] w-24 rounded-full bg-gradient-to-r from-transparent via-neonGreen to-transparent"
        animate={{ opacity: [0.4, 1, 0.4], scaleX: [0.7, 1, 0.7] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        style={{ willChange: 'transform, opacity' }}
      />
      <motion.h1
        className={`font-black font-heading tracking-[0.08em] text-neonGreenHover ${
          compact ? 'text-2xl sm:text-3xl' : 'text-4xl sm:text-6xl lg:text-7xl'
        }`}
        initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)', scale: [1, 1.015, 1] }}
        transition={{
          opacity: { duration: 0.6 },
          y: { duration: 0.6 },
          filter: { duration: 0.6 },
          scale: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
        }}
        style={{ willChange: 'transform, filter', textShadow: '0 0 30px rgba(88,210,10,0.35)' }}
      >
        WAITING FOR NEXT PLAYER
      </motion.h1>
      <motion.p
        className={`font-medium uppercase tracking-[0.35em] text-secondaryText ${compact ? 'text-[11px]' : 'text-sm'}`}
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      >
        Preparing the Next Auction
      </motion.p>
    </div>
  );
}

/* SoccerBall — glossy match ball with classic pentagon panels + specular sheen. */
function SoccerBall({ size = 36 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      style={{ filter: 'drop-shadow(0 0 12px rgba(255,255,255,0.65))' }}
    >
      <defs>
        <radialGradient id="ball-body" cx="38%" cy="32%" r="72%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="70%" stopColor="#F5F5F5" />
          <stop offset="100%" stopColor="#A3A3A3" />
        </radialGradient>
      </defs>
      <circle cx="20" cy="20" r="18" fill="url(#ball-body)" stroke="#A3A3A3" strokeWidth="1.2" />
      {/* central pentagon */}
      <path d="M20 9 L27 14 L24.5 22 L15.5 22 L13 14 Z" fill="#050505" />
      {/* connecting seams */}
      <path
        d="M20 9 L13 14 L7 12 M20 9 L27 14 L33 12 M24.5 22 L30 28 M15.5 22 L10 28 M15.5 22 L20 33 L24.5 22"
        stroke="#222222"
        strokeWidth="1.3"
        fill="none"
        strokeLinecap="round"
      />
      {/* outer partial panels */}
      <path d="M7 12 L10 28 M33 12 L30 28 M10 28 L20 33 L30 28" stroke="#222222" strokeWidth="1.1" fill="none" strokeLinecap="round" />
      {/* specular highlight */}
      <ellipse cx="14" cy="13" rx="5" ry="3.2" fill="rgba(255,255,255,0.8)" opacity="0.7" />
    </svg>
  );
}