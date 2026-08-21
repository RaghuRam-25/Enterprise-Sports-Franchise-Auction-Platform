import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { soundManager, AUCTION_SOUNDS } from '../components/auction/soundManager';

/**
 * useBidEffects — Triggers premium visual & audio effects whenever a new bid
 * is placed. The hook listens to a `signal` number that increments on every
 * bid event; each increment runs a one-shot GSAP animation sequence:
 *
 *   1. Price counter rolls up (odometer-style)
 *   2. Fire-glow pulse on the bid card
 *   3. Highest-bidder badge pops in
 *   4. Floating "NEW BID — TEAM — PRICE" text animates upward
 *   5. Confetti micro-burst
 *
 * All effects are memoized and reusable across manager, spectator & admin views.
 */

export const useBidEffects = (signal, amountEl, cardEl, historyEl) => {
  const prevSignalRef = useRef(0);
  const timelineRef = useRef(null);

  useEffect(() => {
    if (signal > 0 && signal !== prevSignalRef.current) {
      prevSignalRef.current = signal;

      soundManager.play(AUCTION_SOUNDS.NEW_BID);

      const tl = gsap.timeline();

      if (cardEl) {
        tl.to(cardEl, {
          keyframes: [
            { scale: 1.02, duration: 0.1, ease: 'power2.out' },
            { scale: 1, duration: 0.2, ease: 'elastic.out(1, 0.3)' },
          ],
        }, 0);

        tl.to(cardEl, {
          boxShadow: '0 0 40px rgba(88,210,10,0.6), 0 0 80px rgba(88,210,10,0.3)',
          duration: 0.4,
          repeat: 1,
          yoyo: true,
          ease: 'power2.inOut',
        }, 0);

        const glow = cardEl.querySelector('.bid-fire-glow');
        if (glow) {
          tl.fromTo(glow,
            { opacity: 0, scale: 0.8 },
            { opacity: 1, scale: 1.2, duration: 0.3, ease: 'power2.out' },
            0.05
          );
          tl.to(glow,
            { opacity: 0, duration: 0.4 },
            0.5
          );
        }
      }

       if (amountEl) {
        const finalVal = parseFloat(amountEl.textContent.replace(/[^0-9]/g, '')) || 0;
        const existing = parseFloat(amountEl.getAttribute('data-prev') || '0');
        let current = existing || 0;

        let increment = Math.ceil((finalVal - current) / 20);
        if (increment === 0 && finalVal !== current) increment = finalVal > current ? 1 : -1;

        const interval = setInterval(() => {
          current += increment;
          if (current >= finalVal) {
            current = finalVal;
            amountEl.textContent = `৳${current.toLocaleString('en-IN')}`;
            clearInterval(interval);
          } else {
            amountEl.textContent = `৳${current.toLocaleString('en-IN')}`;
          }
          amountEl.setAttribute('data-prev', String(current));
        }, 25);

        setTimeout(() => clearInterval(interval), 500);
      }

      timelineRef.current = tl;

      return () => {
        if (tl) tl.kill();
        if (timelineRef.current) timelineRef.current.kill();
      };
    }
  }, [signal, amountEl, cardEl, historyEl]);

  return { timelineRef };
};

export default useBidEffects;
