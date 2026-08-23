import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { gsap } from 'gsap';
import { Trophy, ArrowRight } from 'lucide-react';
import { getImageUrl } from '../../utils/imageUrl';
import { playerFallback } from '../../utils/playerFallback';

/**
 * RosterAnimation — Stage 8: Animated roster update when a player
 * is sold to a team. Shows the player card sliding into the team's
 * roster with budget decrease animation and counter update.
 *
 * Props:
 *   - rosterUpdate: { player, team, price } | null
 *   - onComplete: () => void
 *   - isActive: boolean
 *   - inline: boolean (optional, default false) — when true renders as an
 *     ABSOLUTE layer confined to its nearest positioned ancestor instead of
 *     a full-screen fixed overlay.
 */

// Neutral, generic footballer crest used when a player has no uploaded image.
// Original artwork — deliberately not modeled on any real person's likeness.
const PLAYER_FALLBACK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0B0B0B"/><stop offset="100%" stop-color="#0B2B26"/>
    </linearGradient>
    <linearGradient id="sk" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#e8b58a"/><stop offset="100%" stop-color="#b9835a"/>
    </linearGradient>
    <linearGradient id="js" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0B2B26"/><stop offset="100%" stop-color="#0B2B26"/>
    </linearGradient>
  </defs>
  <rect width="320" height="320" fill="url(#bg)"/>
  <circle cx="160" cy="150" r="120" fill="rgba(11, 43, 38,0.10)"/>
  <path d="M120 96 a40 40 0 0 1 80 0 a40 40 0 0 1 -80 0" fill="url(#sk)"/>
  <path d="M112 100 a48 44 0 0 1 96 -6 c0 -6 -10 -34 -48 -34 s-48 24 -48 40 z" fill="#241a13"/>
  <path d="M96 250 q64 -44 128 0 l6 70 h-140 z" fill="url(#js)"/>
  <text x="160" y="300" text-anchor="middle" font-size="52" font-weight="900" font-family="Arial" fill="#F5F5F5" opacity="0.9">10</text>
</svg>`;

export default function RosterAnimation({
  rosterUpdate,
  onComplete,
  isActive = true,
  inline = false,
}) {
  const cardRef = useRef(null);
  const counterRef = useRef(null);
  const rosterRef = useRef(null);

  useEffect(() => {
    if (!isActive || !rosterUpdate) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: { ease: 'power2.out' },
        onComplete: () => {
          onComplete?.();
        },
      });

      if (cardRef.current) {
        tl.fromTo(cardRef.current,
          { opacity: 0, x: 100, scale: 0.5 },
          { opacity: 1, x: 0, scale: 1, duration: 0.6, ease: 'back.out(1.2)' },
          0.2
        );
      }

      if (counterRef.current) {
        tl.fromTo(counterRef.current,
          { scale: 1.5, color: '#0B2B26' },
          { scale: 1, color: '#ffffff', duration: 0.4, ease: 'elastic.out(1, 0.3)' },
          0.5
        );
      }

      if (rosterRef.current) {
        tl.fromTo(rosterRef.current,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.5 },
          0.7
        );
      }
    }, cardRef);

    return () => ctx.revert();
  }, [isActive, rosterUpdate, onComplete]);

  if (!isActive || !rosterUpdate) return null;

  const { player, team, price } = rosterUpdate;

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          className={`${inline ? 'absolute inset-0 z-20 rounded-2xl' : 'fixed inset-0 z-[150]'} flex items-center justify-center overflow-hidden pointer-events-none`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-successGreen/40 via-darkBg to-darkBg" />

          <div className="relative z-10 glass-card rounded-3xl p-8 border-2 border-neonGreen/40 shadow-2xl shadow-neonGreen/20 bg-gradient-to-b from-cardBg via-cardBg/95 to-successGreen/20 max-w-lg w-full mx-4">
            <div className="text-center mb-6">
              <motion.div
                className="inline-flex items-center gap-2 px-4 py-2 bg-neonGreen/20 border border-neonGreen/40 rounded-full mb-4"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 100 }}
              >
                <Trophy className="w-5 h-5 text-white" />
                <span className="text-xs font-black text-white uppercase tracking-wider">
                  Player Acquired
                </span>
              </motion.div>

              <h2 className="text-2xl font-black font-heading text-white">
                {player?.name || 'Player'}
              </h2>
              <p className="text-sm text-secondaryText mt-1">
                Sold to <span className="text-white font-bold">{team?.name || 'Team'}</span>
              </p>
            </div>

            <motion.div
              ref={cardRef}
              className="flex items-center gap-4 bg-darkBg/80 rounded-2xl p-4 border border-cardBorder"
            >
              <img
                src={getImageUrl(player, playerFallback('emerald'))}
                alt={player?.name || ''}
                className="w-16 h-16 rounded-xl object-cover border-2 border-neonGreen/30"
              />
              <div className="flex-1">
                <p className="font-bold text-white text-sm">{player?.name}</p>
                <p className="text-xs text-secondaryText">{player?.jerseyName} • {player?.category}</p>
                <p className="text-xs text-white font-mono font-bold mt-1">
                  ৳{(price || 0).toLocaleString('en-IN')}
                </p>
              </div>
              <ArrowRight className="w-5 h-5 text-white" />
            </motion.div>

            <motion.div
              ref={counterRef}
              className="mt-4 grid grid-cols-2 gap-3"
            >
              <div className="bg-cardBg/60 rounded-xl p-3 border border-cardBorder text-center">
                <span className="text-[10px] font-bold text-secondaryText uppercase">Budget Left</span>
                <p className="text-lg font-black font-mono text-white mt-1">
                  ৳{((team?.remainingBudget || 0) - (price || 0)).toLocaleString('en-IN')}
                </p>
              </div>
              <div className="bg-cardBg/60 rounded-xl p-3 border border-cardBorder text-center">
                <span className="text-[10px] font-bold text-secondaryText uppercase">Roster</span>
                <p className="text-lg font-black font-mono text-white mt-1">
                  {(team?.currentRosterCount || 0) + 1} / {team?.minRoster || 11}
                </p>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
