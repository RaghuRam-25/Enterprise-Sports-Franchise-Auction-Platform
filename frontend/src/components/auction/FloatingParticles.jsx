import { useMemo } from 'react';
import { motion } from 'framer-motion';

function seededRandom(seed) {
  const x = Math.sin(seed * 9999) * 10000;
  return x - Math.floor(x);
}

const generateParticles = (count, colors) =>
  Array.from({ length: count }).map((_, i) => ({
    id: i,
    left: seededRandom(i * 7 + 1) * 100,
    top: seededRandom(i * 7 + 2) * 100,
    size: 2 + seededRandom(i * 7 + 3) * 4,
    duration: 4 + seededRandom(i * 7 + 4) * 6,
    delay: seededRandom(i * 7 + 5) * 3,
    drift: (seededRandom(i * 7 + 6) - 0.5) * 80,
    hue: colors[Math.floor(seededRandom(i * 7 + 7) * colors.length)],
  }));

export default function FloatingParticles({ count = 30, theme = 'default', className = '' }) {
  const prefersReduced = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

  const particleCount = prefersReduced ? 0 : count;

  const colors = useMemo(() => {
    switch (theme) {
      case 'winner':
        return ['255,215,0', '255,215,0', '255,165,0'];
      case 'urgent':
        return ['248,80,80', '252,103,103', '244,197,662'];
      default:
        return ['11, 43, 38', '11, 43, 38', '11, 43, 38'];
    }
  }, [theme]);

  const particles = useMemo(
    () => (particleCount > 0 ? generateParticles(particleCount, colors) : []),
    [particleCount, colors]
  );

  if (particleCount === 0) return null;

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {particles.map(p => (
        <motion.span
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: p.size,
            height: p.size,
            background: `rgba(${p.hue},0.85)`,
            boxShadow: `0 0 ${p.size * 3}px rgba(${p.hue},0.9)`,
            willChange: 'transform, opacity',
          }}
          animate={{
            y: [0, -100 - p.drift, 0],
            x: [0, p.drift, 0],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}
