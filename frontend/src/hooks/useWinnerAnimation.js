import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { soundManager, AUCTION_SOUNDS } from '../components/auction/soundManager';
import confetti from 'canvas-confetti';

/**
 * useWinnerAnimation — Orchestrates the full winner celebration sequence.
 *
 * Trigger: called when auction timer ends with a winning bid.
 * Sequence (5 seconds):
 *   1. Hammer sound + screen flash
 *   2. Gold particle burst
 *   3. Confetti + fireworks
 *   4. Winner card reveal (image, name, team logo, price)
 *   5. Spotlight follow
 *
 * Returns refs to attach animation targets and a `play(winData)` trigger.
 */

export const useWinnerAnimation = (trigger) => {
  const winnerCardRef = useRef(null);
  const playerImgRef = useRef(null);
  const teamLogoRef = useRef(null);
  const priceRef = useRef(null);
  const nameRef = useRef(null);
  const particlesRef = useRef(null);
  const confettiInstanceRef = useRef(null);

  const play = (winnerData) => {
    if (!winnerData) return;

    soundManager.play(AUCTION_SOUNDS.HAMMER);

    const ctx = confetti.create(particlesRef.current || undefined, {
      resize: true,
      usePolygonize: false,
    });

    confettiInstanceRef.current = ctx;

    setTimeout(() => {
      soundManager.play(AUCTION_SOUNDS.WINNER);
      soundManager.play(AUCTION_SOUNDS.FIREWORKS);
    }, 300);

    setTimeout(() => {
      soundManager.play(AUCTION_SOUNDS.CROWD_CHEER);
    }, 800);

    if (winnerCardRef.current) {
      const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });

      const flash = document.createElement('div');
      flash.style.cssText = `
        position: fixed;
        top: 0; left: 0; width: 100vw; height: 100vh;
        background: white;
        opacity: 0;
        z-index: 9998;
        pointer-events: none;
      `;
      document.body.appendChild(flash);

      tl.to(flash, {
        opacity: 0.8,
        duration: 0.15,
        onComplete: () => flash.remove(),
      }, 0);

      tl.fromTo(winnerCardRef.current,
        { opacity: 0, scale: 0.7, y: 50 },
        { opacity: 1, scale: 1, y: 0, duration: 0.8, ease: 'elastic.out(1, 0.3)' },
        0.2
      );

      if (playerImgRef.current) {
        tl.fromTo(playerImgRef.current,
          { scale: 0, rotate: -180 },
          { scale: 1, rotate: 0, duration: 0.8, ease: 'back.out(1.7)' },
          0.3
        );
      }

      if (teamLogoRef.current) {
        tl.fromTo(teamLogoRef.current,
          { scale: 0, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.5 },
          0.5
        );
      }

      if (priceRef.current) {
        tl.fromTo(priceRef.current,
          { opacity: 0, y: 30 },
          { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' },
          0.6
        );
      }

      setTimeout(() => {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          className: 'confetti-piece',
        });

        confetti({
          particleCount: 50,
          angle: 60,
          spread: 60,
          origin: { x: 0, y: 0.7 },
          className: 'confetti-piece',
        });

        confetti({
          particleCount: 50,
          angle: 120,
          spread: 60,
          origin: { x: 1, y: 0.7 },
          className: 'confetti-piece',
        });

        const fireworks = setInterval(() => {
          confetti({
            particleCount: 30,
            startVelocity: 30,
            spread: 90,
            origin: {
              x: Math.random(),
              y: Math.random() * 0.5 + 0.3,
            },
            shapes: ['square', 'circle'],
            colors: ['#FFD700', '#FFA500', '#FF6B35', '#FFD700'],
            className: 'firework-piece',
          });
        }, 400);

        setTimeout(() => clearInterval(fireworks), 3000);
      }, 500);
    }
  };

  useEffect(() => {
    if (trigger && winnerCardRef.current) {
      play(trigger);
    }
  }, [trigger]);

  return {
    winnerCardRef,
    playerImgRef,
    teamLogoRef,
    priceRef,
    nameRef,
    particlesRef,
    play,
  };
};

export default useWinnerAnimation;
