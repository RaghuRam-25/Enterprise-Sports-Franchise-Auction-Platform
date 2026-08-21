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
      base: 'bg-[#58D20A]',
      hover: 'hover:bg-[#72F21A]',
      text: 'text-[#050505]',
      shadow: 'shadow-[0_0_20px_rgba(88,210,10,0.3)] hover:shadow-[0_0_30px_rgba(114,242,26,0.5)]',
      border: 'border-[#58D20A]/50',
      shine: 'via-white/40',
      ring: 'ring-[#58D20A]/30',
    },
    out: {
      base: 'bg-[#B00012]/15 border border-[#B00012]/30',
      hover: 'hover:bg-[#B00012]/25 hover:border-[#B00012]/60',
      text: 'text-urgentRedText',
      shadow: 'hover:shadow-[#B00012]/40',
      border: 'border-[#B00012]/30',
      shine: 'via-white/10',
      ring: 'ring-[#B00012]/30',
    },
    sell: {
      base: 'bg-gradient-to-r from-[#F4C542] via-warningGold to-[#F4C542]',
      hover: 'hover:brightness-110',
      text: 'text-[#050505]',
      shadow: 'shadow-[#F4C542]/60 hover:shadow-[#F4C542]/50',
      border: 'border-[#F4C542]/60',
      shiny: 'via-white/50',
      ring: 'ring-[#F4C542]/40',
    },
    pause: {
      base: 'bg-gradient-to-r from-[#F4C542] via-warningGold to-[#F4C542]',
      hover: 'hover:brightness-110',
      text: 'text-[#050505]',
      shadow: 'shadow-[#F4C542]/60 hover:shadow-[#F4C542]/40',
      border: 'border-[#F4C542]/50',
      shiny: 'via-white/40',
      ring: 'ring-[#F4C542]/30',
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
          '0 0 15px rgba(88,210,10,0.4)',
          '0 0 25px rgba(88,210,10,0.6)',
          '0 0 15px rgba(88,210,10,0.4)',
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
        ${pulseGlow ? 'ring-2 ring-offset-2 ring-offset-darkBg' : ''}
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
            ? 'radial-gradient(circle, rgba(88,210,10,0.3) 0%, transparent 70%)'
            : variant === 'out'
              ? 'radial-gradient(circle, rgba(176,0,18,0.3) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(244,197,66,0.3) 0%, transparent 70%)',
        }}
        animate={{ opacity: [0, 0.5, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      />
    </motion.button>
  );
}
