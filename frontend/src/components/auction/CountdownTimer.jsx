import { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { gsap } from 'gsap';
import { Volume2 } from 'lucide-react';
import { soundManager, AUCTION_SOUNDS } from './soundManager';

/**
 * CountdownTimer — Premium animated countdown clock with urgency states.
 *
 * States:
 *   - 'idle'     → blue/cyan static ring
 *   - 'running'  → green pulsing ring, smooth countdown
 *   - 'paused'   → amber pulsing ring
 *   - 'ended'    → red/gold final state
 *
 * When remaining <= 5s in 'running' mode, enters URGENT mode:
 *   - Background pulses red
 *   - Number scales up + shakes
 *   - Audio beeps (countdown)
 */

export default function CountdownTimer({
  remaining = 60,
  status = 'idle',
  duration = 60,
}) {
  const reduceMotion = useReducedMotion();
  const ringRef = useRef(null);
  const numberRef = useRef(null);
  const containerRef = useRef(null);

  const isUrgent = remaining <= 5 && status === 'running';
  const isRunning = status === 'running';
  const isPaused = status === 'paused';
  const isEnded = status === 'ended';

  useEffect(() => {
    if (!ringRef.current || reduceMotion) return;

    const ring = ringRef.current;
    const circumference = 2 * Math.PI * 54;

    const targetProgress = remaining / duration;
    const dashOffset = circumference * (1 - targetProgress);

    gsap.to(ring, {
      strokeDashoffset: dashOffset,
      duration: 0.6,
      ease: 'power2.inOut',
    });
  }, [remaining, duration, reduceMotion]);

  useEffect(() => {
    if (!isUrgent || !numberRef.current || reduceMotion) return;

    const tl = gsap.timeline({ repeat: -1, repeatDelay: 1 });

    tl.to(numberRef.current, {
      scale: 1.3,
      duration: 0.15,
      ease: 'power1.in',
    });

    tl.to(numberRef.current, {
      scale: 1,
      duration: 0.15,
      ease: 'power1.out',
    }, 0.15);

    tl.to(containerRef.current, {
      x: [-4, 4, -3, 3, -1, 1, 0],
      duration: 0.4,
      ease: 'power1.inOut',
    }, 0);
  }, [isUrgent, reduceMotion]);

  useEffect(() => {
    if (isUrgent && isRunning) {
      soundManager.play(AUCTION_SOUNDS.COUNTDOWN);
    }
  }, [remaining, isUrgent, isRunning]);

  const getTheme = () => {
    if (isEnded) return 'winner';
    if (isPaused) return 'amber';
    if (isUrgent) return 'urgent';
    return 'default';
  };

  const theme = getTheme();

  const ringColor = {
    default: '#58D20A',
    urgent: '#B00012',
    amber: '#F4C542',
    winner: '#F4C542',
  }[theme];

  const ringBg = {
    default: 'rgba(88,210,10,0.12)',
    urgent: 'rgba(176,0,18,0.15)',
    amber: 'rgba(244,197,66,0.15)',
    winner: 'rgba(244,197,66,0.15)',
  }[theme];

  const textColor = {
    default: 'text-[#58D20A]',
    urgent: 'text-[#B00012]',
    amber: 'text-[#F4C542]',
    winner: 'text-[#F4C542]',
  }[theme];

  const label = {
    idle: 'Auction Standby',
    running: isUrgent ? 'LAST SECONDS!' : 'Live Auction',
    paused: 'Paused',
    ended: 'Sold!',
  }[status] || 'Auction';

  return (
    <motion.div
      ref={containerRef}
      className="relative flex flex-col items-center gap-3"
      animate={isUrgent ? { scale: [1, 1.05, 1] } : {}}
      transition={{ duration: 0.8, repeat: Infinity }}
    >
      <div className="relative w-28 h-28">
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle
            cx="60" cy="60" r="54"
            fill="none"
            stroke={ringBg}
            strokeWidth="6"
            strokeLinecap="round"
          />
          <circle
            ref={ringRef}
            cx="60" cy="60" r="54"
            fill="none"
            stroke={ringColor}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 54}
            strokeDashoffset={2 * Math.PI * 54}
            style={{
              filter: `drop-shadow(0 0 8px ${ringColor})`,
              transition: 'stroke-dashoffset 0.6s ease-in-out',
            }}
          />
        </svg>

        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          animate={isRunning ? { scale: [1, 1.04, 1] } : {}}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <motion.span
            ref={numberRef}
            className={`text-4xl font-black font-mono ${textColor}`}
            style={{ textShadow: `0 0 20px ${ringColor}` }}
          >
            {remaining}
          </motion.span>
        </motion.div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold text-[#A3A3A3] uppercase tracking-widest">
          {label}
        </span>
        {isRunning && (
          <motion.div
            className="w-2 h-2 rounded-full bg-[#58D20A]"
            animate={{ opacity: [1, 0.3, 1], scale: [1, 0.8, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}
        {isPaused && (
          <motion.div
            className="w-2 h-2 rounded-full bg-warningGold"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}
      </div>

      {isUrgent && (
        <motion.div
          className="flex items-center gap-1 text-urgentRedText"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 0.8, repeat: Infinity }}
        >
          <Volume2 className="w-3 h-3" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Hurry!</span>
        </motion.div>
      )}
    </motion.div>
  );
}
