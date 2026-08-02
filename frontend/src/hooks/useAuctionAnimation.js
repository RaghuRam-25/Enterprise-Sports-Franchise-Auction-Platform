import { useState, useEffect, useCallback, useRef } from 'react';
import { soundManager, AUCTION_SOUNDS } from '../components/auction/soundManager';
import { useSocket } from '../context/SocketContext';
import { useAuction } from '../context/AuctionContext.jsx';

/**
 * useAuctionAnimation — Central animation state machine for the live auction.
 *
 * State Machine:
 *   IDLE   → WaitingAnimation (no player on podium)
 *   INTRO  → PlayerRevealAnimation (player just launched, 3-4s cinematic)
 *   LIVE   → AuctionStage (bidding active, timer running)
 *   LAST5  → Live + urgency overlay (last 5 seconds)
 *   SELL   → WinnerAnimation trigger
 *   ROSTER → RosterAnimation (budget update, player slides in)
 *   DONE   → Transition back to IDLE
 *
 * All state changes are synchronized via Socket.IO events so every
 * connected client (manager, spectator, podium admin, super admin)
 * shows the exact same animation frame simultaneously.
 */

export const ANIM_STATES = {
  IDLE: 'idle',
  INTRO: 'intro',
  LIVE: 'live',
  LAST5: 'last5',
  SELL: 'sell',
  ROSTER: 'roster',
  DONE: 'done',
};

export const useAuctionAnimation = () => {
  const { socket, isConnected } = useSocket();
  const {
    podiumPlayer,
    currentBid,
    timerRemaining,
    timerStatus,
  } = useAuction();

  const [animState, setAnimState] = useState(() => (
    podiumPlayer && timerStatus !== 'idle' ? ANIM_STATES.LIVE : ANIM_STATES.IDLE
  ));
  const [introPlayer, setIntroPlayer] = useState(() => podiumPlayer || null);
  const [winnerData, setWinnerData] = useState(null);
  const [newBidSignal, setNewBidSignal] = useState(0);
  const [rosterUpdate, setRosterUpdate] = useState(null);

  const lastBidRef = useRef(0);
  const introTimeoutRef = useRef(null);
  const winnerTimeoutRef = useRef(null);
  const rosterTimeoutRef = useRef(null);

  const clearAllTimeouts = useCallback(() => {
    if (introTimeoutRef.current) clearTimeout(introTimeoutRef.current);
    if (winnerTimeoutRef.current) clearTimeout(winnerTimeoutRef.current);
    if (rosterTimeoutRef.current) clearTimeout(rosterTimeoutRef.current);
  }, []);

  // ── Socket Event Handlers ────────────────────────────────────────────────
  const handlePlayerLaunched = useCallback((state) => {
    if (!state?.podiumPlayer) {
      setAnimState(ANIM_STATES.IDLE);
      return;
    }

    clearAllTimeouts();
    setIntroPlayer(state.podiumPlayer);
    setAnimState(ANIM_STATES.INTRO);
    soundManager.play(AUCTION_SOUNDS.CROWD_CHEER);

    introTimeoutRef.current = setTimeout(() => {
      setAnimState(ANIM_STATES.LIVE);
      soundManager.play(AUCTION_SOUNDS.AUCTION_START);
    }, 3500);
  }, [clearAllTimeouts]);

  const handleNewBid = useCallback(() => {
    setNewBidSignal(s => s + 1);
    soundManager.play(AUCTION_SOUNDS.NEW_BID);
  }, []);

  const handleCompleted = useCallback((state) => {
    if (state?.player && state?.winner) {
      const winner = {
        player: state.player,
        team: state.winner,
        price: state.soldPrice || state.currentBid || 0,
      };
      setWinnerData(winner);
      setAnimState(ANIM_STATES.SELL);
      soundManager.play(AUCTION_SOUNDS.HAMMER);
      soundManager.stop(AUCTION_SOUNDS.WAITING_AMBIENT);

      winnerTimeoutRef.current = setTimeout(() => {
        setAnimState(ANIM_STATES.ROSTER);
        soundManager.play(AUCTION_SOUNDS.CROWD_CHEER);
        soundManager.play(AUCTION_SOUNDS.FIREWORKS);

        setRosterUpdate({
          player: winner.player,
          team: winner.team,
          price: winner.price,
        });

        rosterTimeoutRef.current = setTimeout(() => {
          setAnimState(ANIM_STATES.DONE);
          soundManager.play(AUCTION_SOUNDS.WAITING_AMBIENT);
          setTimeout(() => {
            setAnimState(ANIM_STATES.IDLE);
            setWinnerData(null);
            setRosterUpdate(null);
          }, 1500);
        }, 3000);
      }, 4000);
    }
  }, []);

  const handleCancelled = useCallback(() => {
    clearAllTimeouts();
    soundManager.stop(AUCTION_SOUNDS.WAITING_AMBIENT);
    setAnimState(ANIM_STATES.IDLE);
    setIntroPlayer(null);
    setWinnerData(null);
    setRosterUpdate(null);
  }, [clearAllTimeouts]);

  const handlePaused = useCallback(() => {
    setAnimState(ANIM_STATES.LIVE);
    soundManager.stop(AUCTION_SOUNDS.WAITING_AMBIENT);
  }, []);

  const handleResumed = useCallback(() => {
    setAnimState(ANIM_STATES.LIVE);
  }, []);

  const handleState = useCallback((state) => {
    if (!state?.podiumPlayer) {
      if (![ANIM_STATES.SELL, ANIM_STATES.ROSTER, ANIM_STATES.DONE].includes(animState)) {
        clearAllTimeouts();
        setAnimState(ANIM_STATES.IDLE);
        setIntroPlayer(null);
      }
      return;
    }

    if (animState === ANIM_STATES.IDLE) {
      setIntroPlayer(state.podiumPlayer);
      setAnimState(ANIM_STATES.LIVE);
    }
  }, [animState, clearAllTimeouts]);

  // ── Socket Registration ──────────────────────────────────────────────────
  useEffect(() => {
    if (!socket || !isConnected) return;

    socket.on('auction:player-launched', handlePlayerLaunched);
    socket.on('auction:new-bid', handleNewBid);
    socket.on('auction:completed', handleCompleted);
    socket.on('auction:cancelled', handleCancelled);
    socket.on('auction:paused', handlePaused);
    socket.on('auction:resumed', handleResumed);
    socket.on('auction:state', handleState);

    return () => {
      socket.off('auction:player-launched', handlePlayerLaunched);
      socket.off('auction:new-bid', handleNewBid);
      socket.off('auction:completed', handleCompleted);
      socket.off('auction:cancelled', handleCancelled);
      socket.off('auction:paused', handlePaused);
      socket.off('auction:resumed', handleResumed);
      socket.off('auction:state', handleState);
    };
  }, [socket, isConnected, handlePlayerLaunched, handleNewBid, handleCompleted,
      handleCancelled, handlePaused, handleResumed, handleState]);

  const lastTimerRemainingRef = useRef(timerRemaining);

  // ── Timer-based LAST5 transition ─────────────────────────────────────────
  useEffect(() => {
    const prev = lastTimerRemainingRef.current;
    lastTimerRemainingRef.current = timerRemaining;

    if (animState === ANIM_STATES.LIVE && timerRemaining <= 5 && timerRemaining > 0 && prev > 5) {
      setAnimState(ANIM_STATES.LAST5);
      soundManager.play(AUCTION_SOUNDS.COUNTDOWN);
    } else if (animState === ANIM_STATES.LAST5 && timerRemaining > 5 && prev <= 5) {
      setAnimState(ANIM_STATES.LIVE);
    }
  }, [timerRemaining, animState]);

  // ── Ambient sound management ─────────────────────────────────────────────
  useEffect(() => {
    if (animState === ANIM_STATES.IDLE && timerStatus !== 'running') {
      soundManager.play(AUCTION_SOUNDS.WAITING_AMBIENT);
    }
  }, [animState, timerStatus]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      clearAllTimeouts();
      soundManager.stopAll();
    };
  }, [clearAllTimeouts]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const bidIncrement = useCallback(() => {
    if (lastBidRef.current === currentBid) {
      setNewBidSignal(s => s + 1);
    }
    lastBidRef.current = currentBid;
  }, [currentBid]);

  // ── Animation completion callback ─────────────────────────────────────────
  // Fired by the cinematic components (PlayerReveal / Winner / Roster) when
  // their local timeline finishes. Lets a finished animation advance the
  // state machine slightly ahead of the socket-driven safety timeouts, while
  // remaining a safe no-op if the socket has already moved us on. The socket
  // timeouts in handlePlayerLaunched / handleCompleted still act as the
  // authoritative fallback, so this never conflicts with server sync.
  const onAnimationComplete = useCallback(() => {
    setAnimState((current) => {
      if (current === ANIM_STATES.INTRO) {
        // Reveal finished → begin live bidding immediately.
        if (introTimeoutRef.current) {
          clearTimeout(introTimeoutRef.current);
          introTimeoutRef.current = null;
        }
        soundManager.play(AUCTION_SOUNDS.AUCTION_START);
        return ANIM_STATES.LIVE;
      }
      // For SELL / ROSTER the socket-driven timeout chain owns the sequencing,
      // so we leave the state untouched here.
      return current;
    });
  }, []);

  return {
    animState,
    introPlayer,
    winnerData,
    newBidSignal,
    rosterUpdate,
    ANIM_STATES,
    bidIncrement,
    onAnimationComplete,
    soundManager,
    AUCTION_SOUNDS,
  };
};

export default useAuctionAnimation;
