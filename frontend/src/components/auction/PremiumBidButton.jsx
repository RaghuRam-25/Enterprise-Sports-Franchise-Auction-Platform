import { useState, useRef, useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { Zap } from 'lucide-react';
import { soundManager, AUCTION_SOUNDS } from './soundManager';

/**
 * PremiumBidButton — Cinematic call-to-action button with multiple variants.
 *
 * Features:
 *   - Gradient background with animated shine sweep
 *   - Hover lift + scale animation
 *   - Ripple effect on click (pointer ripple)
 *   - Shadow pulse (continuous glow when enabled)
 *   - Hover sound feedback
 *   - Disabled states with contextual labels
 *
 * Variants:
 *   'bid'  → emerald/cyan gradient (primary action)
 *   'out'  → rose/red glass (decline action)
 *   'sell' → gold gradient (hammer sell)
 *   'pause' → amber (timer controls)
 */

export default function PremiumBidButton({
  label = 'PLACE BID',
  onClick,
  disabled = false,
  variant = 'bid',
  icon: Icon = Zap,
  showShine = true,
  pulseGlow = true,
}) {
  const [isPressed, setIsPressed] = useState(false);
  const [ripples, setRipples] = useState([]);
  const btnRef = useRef(null);
  const controls = useAnimation();

  const variantStyles = {
    bid: {
      base: 'bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500',
      hover: 'hover:bg-[length:200%_100%] hover:bg-[position:100%_0]',
      text: 'text-slate-950',
      shadow: 'shadow-emerald-900/60 hover:shadow-emerald-500/40',
      border: 'border-emerald-400/50',
      shine: 'via-white/40',
      ring: 'ring-emerald-500/30',
    },
    out: {
      base: 'bg-rose-500/15 border border-rose-500/30',
      hover: 'hover:bg-rose-500/25 hover:border-rose-500/60',
      text: 'text-rose-400',
      shadow: 'hover:shadow-rose-500/40',
      border: 'border-rose-500/30',
      shine: 'via-white/10',
      ring: 'ring-rose-500/30',
    },
    sell: {
      base: 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400',
      hover: 'hover:brightness-110',
      text: 'text-slate-950',
      shadow: 'shadow-amber-500/60 hover:shadow-amber-400/50',
      border: 'border-amber-400/60',
      shiny: 'via-white/50',
      ring: 'ring-amber-500/40',
    },
    pause: {
      base: 'bg-gradient-to-r from-amber-500 via-orange-400 to-amber-500',
      hover: 'hover:brightness-110',
      text: 'text-slate-950',
      shadow: 'shadow-amber-900/60 hover:shadow-amber-500/40',
      border: 'border-amber-400/50',
      shiny: 'via-white/40',
      ring: 'ring-amber-500/30',
    },
  };

  const style = variantStyles[variant] || variantStyles.bid;

  const createRipple = (e) => {
    if (disabled) return;
    const rect = btnRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now();
    setRipples(prev => [...prev, { id, x, y }]);
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== id));
    }, 800);
  };

  const handleClick = (e) => {
    createRipple(e);
    setIsPressed(true);
    setTimeout(() => setIsPressed(false), 150);
    soundManager.play(AUCTION_SOUNDS.NEW_BID);
    if (onClick && !disabled) {
      onClick(e);
    }
  };

  useEffect(() => {
    if (pulseGlow && !disabled) {
      controls.start({
        boxShadow: [
          '0 0 15px rgba(34,211,238,0.4)',
          '0 0 25px rgba(34,211,238,0.6)',
          '0 0 15px rgba(34,211,238,0.4)',
        ],
        transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
      });
    } else {
      controls.stop();
    }
  }, [pulseGlow, disabled, controls, style.shadow]);

  return (
    <motion.button
      ref={btnRef}
      onClick={handleClick}
      disabled={disabled}
      animate={controls}
      className={`
        relative group overflow-hidden rounded-2xl font-black text-sm sm:text-base
        uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2.5
        ${style.base} ${style.hover} ${style.text} ${style.shadow} ${style.border}
        ${pulseGlow ? 'ring-2 ring-offset-2 ring-offset-slate-950' : ''}
        disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
        ${isPressed ? 'scale-95' : 'hover:scale-[1.03] active:scale-97'}
      `}
      whileHover={!disabled ? { y: -2 } : {}}
      style={{
        backgroundSize: showShine ? '200% 100%' : undefined,
        backgroundPosition: '0% 0%',
      }}
    >
      {showShine && !disabled && (
        <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
          <span
            className="absolute -inset-y-full -left-1/2 w-1/3 rotate-12 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-[130%] group-hover:translate-x-[420%] transition-transform duration-[900ms] ease-out"
          />
        </span>
      )}

      {ripples.map(ripple => (
        <span
          key={ripple.id}
          className="absolute rounded-full bg-white/30 pointer-events-none"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: 0,
            height: 0,
            transform: 'translate(-50%, -50%)',
          }}
          animate={{
            width: [0, 300, 0],
            height: [0, 300, 0],
            opacity: [0.6, 0.3, 0],
          }}
          transition={{ duration: 0.8, ease: 'power2.out' }}
        />
      ))}

      <Icon
        className={`w-5 h-5 sm:w-6 sm:h-6 relative ${!disabled ? 'animate-pulse group-hover:animate-none' : ''}`}
        style={{ animationDelay: '0.2s' }}
      />
      <span className="relative">{label}</span>

      <motion.div
        className="absolute -inset-0.5 rounded-2xl opacity-0 group-hover:opacity-100 blur-xl -z-10"
        style={{
          background: variant === 'bid'
            ? 'radial-gradient(circle, rgba(34,211,238,0.3) 0%, transparent 70%)'
            : variant === 'out'
              ? 'radial-gradient(circle, rgba(248,113,113,0.3) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(251,191,36,0.3) 0%, transparent 70%)',
        }}
        animate={{ opacity: [0, 0.5, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      />
    </motion.button>
  );
}
