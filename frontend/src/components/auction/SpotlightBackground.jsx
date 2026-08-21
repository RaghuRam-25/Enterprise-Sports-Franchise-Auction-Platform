import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { motion } from 'framer-motion';

/**
 * SpotlightBackground — Full-viewport animated gradient backdrop with a
 * floating spotlight that pans slowly across the screen.
 *
 * Uses Framer Motion for the gradient drift (GPU-accelerated opacity/scale)
 * and GSAP for the spotlight pan (precise timeline control).
 *
 * `theme` prop controls the color palette:
 *   'default'  → cyan/blue
 *   'urgent'   → red/amber (Stage 6: last 5 seconds)
 *   'winner'   → gold/white
 *   'waiting'  → muted purple/indigo
 */

const THEME_CONFIGS = {
  default: {
    gradient: 'from-darkBg via-[#04121f] to-darkBg',
    radial1: 'radial-gradient(ellipse 60% 50% at 50% 45%, rgba(88,210,10,0.18) 0%, transparent 70%)',
    radial2: 'radial-gradient(ellipse 40% 35% at 70% 65%, rgba(88,210,10,0.14) 0%, transparent 70%)',
    spotlight: 'rgba(88,210,10,0.25)',
  },
  urgent: {
    gradient: 'from-darkBg via-[#1a0404] to-darkBg',
    radial1: 'radial-gradient(ellipse 60% 50% at 50% 45%, rgba(248,56,56,0.22) 0%, transparent 70%)',
    radial2: 'radial-gradient(ellipse 40% 35% at 70% 65%, rgba(248,56,56,0.18) 0%, transparent 70%)',
    spotlight: 'rgba(248,56,56,0.35)',
  },
  winner: {
    gradient: 'from-darkBg via-[#180c00] to-darkBg',
    radial1: 'radial-gradient(ellipse 70% 55% at 50% 45%, rgba(255,215,0,0.3) 0%, transparent 65%)',
    radial2: 'radial-gradient(ellipse 50% 40% at 30% 60%, rgba(255,215,0,0.2) 0%, transparent 70%)',
    spotlight: 'rgba(255,215,0,0.4)',
  },
  waiting: {
    gradient: 'from-darkBg via-[#0a0a1a] to-darkBg',
    radial1: 'radial-gradient(ellipse 70% 50% at 50% 50%, rgba(244,197,66,0.12) 0%, transparent 70%)',
    radial2: 'radial-gradient(ellipse 50% 40% at 30% 60%, rgba(244,197,66,0.1) 0%, transparent 70%)',
    spotlight: 'rgba(244,197,66,0.2)',
  },
};

export default function SpotlightBackground({
   theme = 'default',
   spotlightEnabled = true,
   className = '',
 }) {
  const spotlightRef = useRef(null);
  const config = THEME_CONFIGS[theme] || THEME_CONFIGS.default;

  useEffect(() => {
    if (!spotlightEnabled || !spotlightRef.current) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ repeat: -1, yoyo: true, defaults: { ease: 'sine.inOut' } });

      tl.to(spotlightRef.current, {
        x: 'random(-200,200)',
        y: 'random(-100,100)',
        duration: 8,
      });

      tl.to(spotlightRef.current, {
        scale: 'random(0.8,1.2)',
        duration: 12,
      }, 0);

      tl.to(spotlightRef.current, {
        opacity: 'random(0.3,0.6)',
        duration: 6,
      }, 3);
    }, spotlightRef);

    return () => ctx.revert();
  }, [theme, spotlightEnabled]);

  return (
    <div className={`absolute inset-0 -z-10 overflow-hidden ${className}`}>
      <motion.div
        className={`absolute inset-0 bg-gradient-to-br ${config.gradient}`}
      />

      <motion.div
        className="absolute inset-0"
        style={{
          background: config.radial1,
          willChange: 'transform, opacity',
        }}
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.7, 1, 0.7],
        }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />

      <motion.div
        className="absolute inset-0"
        style={{
          background: config.radial2,
          willChange: 'transform, opacity',
        }}
        animate={{
          scale: [1.1, 1, 1.1],
          opacity: [0.5, 0.9, 0.5],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />

      {spotlightEnabled && (
        <div
          ref={spotlightRef}
          className="absolute -top-1/2 -left-1/2 w-[600px] h-[600px] rounded-full pointer-events-none opacity-40"
          style={{
            background: `radial-gradient(circle, ${config.spotlight} 0%, transparent 70%)`,
            filter: 'blur(60px)',
            willChange: 'transform, opacity',
          }}
        />
      )}
    </div>
  );
}
