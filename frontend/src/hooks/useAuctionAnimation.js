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

// Stable identity for a player object across the socket / optimistic paths.
const playerKey = (p) => (p ? String(p._id || p.id || p.studentId || p.name || '') : '');

export const useAuctionAnimation = () => {
  const { socket, isConnected } = useSocket();
  const {
    podiumPlayer,
    currentBid,
    highestBidder,
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

  // ── Hybrid trigger bookkeeping ────────────────────────────────────────────
  // Both the Socket.IO path and the optimistic AuctionContext path funnel
  // through context state, so these per-player dedup keys let whichever path
  // fires FIRST own the transition while the other becomes a safe no-op.
  //   introducedKeyRef  — player we've already run (or skipped) the intro for.
  //   celebratedKeyRef  — player we've already celebrated on sell.
  // introducedKeyRef is seeded with the player already on the podium at mount,
  // so a client joining mid-auction jumps straight to LIVE without replaying
  // the intro.
  const introducedKeyRef = useRef(playerKey(podiumPlayer));
  const celebratedKeyRef = useRef('');
  // "Last known" snapshot of the live player so we can still build winnerData
  // in the tick where podiumPlayer clears to null.
  const prevPodiumKeyRef = useRef(playerKey(podiumPlayer));
  const prevTimerStatusRef = useRef(timerStatus);
  const lastPlayerRef = useRef(podiumPlayer || null);
  const lastBidderRef = useRef(highestBidder || null);
  const lastPriceRef = useRef(currentBid || 0);

  const clearAllTimeouts = useCallback(() => {
    if (introTimeoutRef.current) clearTimeout(introTimeoutRef.current);
    if (winnerTimeoutRef.current) clearTimeout(winnerTimeoutRef.current);
    if (rosterTimeoutRef.current) clearTimeout(rosterTimeoutRef.current);
  }, []);

  // ── Shared transition runners (used by BOTH socket + context paths) ────────
  // Kept as callbacks so the socket handlers and the context-derived effects
  // invoke the exact same sequencing/sounds — no duplicated animation logic.
  const beginIntro = useCallback((player) => {
    const key = playerKey(player);
    if (!player || !key) return;
    if (introducedKeyRef.current === key) return; // already handled by other path
    introducedKeyRef.current = key;

    clearAllTimeouts();
    setIntroPlayer(player);
    setAnimState(ANIM_STATES.INTRO);
    soundManager.play(AUCTION_SOUNDS.CROWD_CHEER);

    // Safety fallback → LIVE only if the cinematic's own onComplete never lands.
    // Must stay LONGER than PlayerRevealAnimation's COMPLETE_AT (8200ms) so it
    // never truncates the full intro; it exists purely as a stuck-state guard.
    introTimeoutRef.current = setTimeout(() => {
      setAnimState((cur) => (cur === ANIM_STATES.INTRO ? ANIM_STATES.LIVE : cur));
      soundManager.play(AUCTION_SOUNDS.AUCTION_START);
    }, 8800);
  }, [clearAllTimeouts]);

  const beginSell = useCallback((winner) => {
    const key = playerKey(winner?.player);
    if (!winner?.player || !winner?.team) return;
    if (celebratedKeyRef.current === key) return; // already celebrated by other path
    celebratedKeyRef.current = key;

    clearAllTimeouts();
    setWinnerData(winner);
    setAnimState(ANIM_STATES.SELL);
    soundManager.play(AUCTION_SOUNDS.HAMMER);
    soundManager.stop(AUCTION_SOUNDS.WAITING_AMBIENT);

    winnerTimeoutRef.current = setTimeout(() => {
      setAnimState(ANIM_STATES.ROSTER);
      soundManager.play(AUCTION_SOUNDS.CROWD_CHEER);
      soundManager.play(AUCTION_SOUNDS.FIREWORKS);
      setRosterUpdate({ player: winner.player, team: winner.team, price: winner.price });

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
  }, [clearAllTimeouts]);

  // ── Socket Event Handlers ────────────────────────────────────────────────
  // These now delegate to the shared runners, which dedup against the
  // context-derived path so each transition fires exactly once.
  const handlePlayerLaunched = useCallback((state) => {
    if (!state?.podiumPlayer) {
      setAnimState(ANIM_STATES.IDLE);
      return;
    }
    beginIntro(state.podiumPlayer);
  }, [beginIntro]);

  const handleNewBid = useCallback(() => {
    setNewBidSignal(s => s + 1);
    soundManager.play(AUCTION_SOUNDS.NEW_BID);
  }, []);

  const handleCompleted = useCallback((state) => {
    if (state?.player && state?.winner) {
      beginSell({
        player: state.player,
        team: state.winner,
        price: state.soldPrice || state.currentBid || 0,
      });
    }
  }, [beginSell]);

  const handleCancelled = useCallback(() => {
    clearAllTimeouts();
    soundManager.stop(AUCTION_SOUNDS.WAITING_AMBIENT);
    setAnimState(ANIM_STATES.IDLE);
    setIntroPlayer(null);
    setWinnerData(null);
    setRosterUpdate(null);
    // Reset dedup so a re-launched player animates again.
    introducedKeyRef.current = '';
    celebratedKeyRef.current = '';
  }, [clearAllTimeouts]);

  const handlePaused = useCallback(() => {
    setAnimState(ANIM_STATES.LIVE);
    soundManager.stop(AUCTION_SOUNDS.WAITING_AMBIENT);
  }, []);

  const handleResumed = useCallback(() => {
    setAnimState(ANIM_STATES.LIVE);
  }, []);

  const handleState = useCallback((state) => {
    // Full-state sync: only used to settle an EMPTY podium. New-player intro
    // and sell transitions are owned by the context-derived effects + the
    // dedicated launch/completed handlers, so we never force IDLE→LIVE here
    // (that previously swallowed the intro).
    if (!state?.podiumPlayer) {
      if (![ANIM_STATES.SELL, ANIM_STATES.ROSTER, ANIM_STATES.DONE].includes(animState)) {
        clearAllTimeouts();
        setAnimState(ANIM_STATES.IDLE);
        setIntroPlayer(null);
      }
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

  // ── Context-derived triggers (primary; works online AND offline) ──────────
  // AuctionContext is the single source of truth that BOTH the optimistic local
  // path and the socket path feed. Watching it here means the intro/sell
  // cinematics fire even when the backend never round-trips an event. The
  // dedup keys inside beginIntro/beginSell coalesce this with the socket
  // handlers so nothing double-plays.
  useEffect(() => {
    const prevKey = prevPodiumKeyRef.current;
    const curKey = playerKey(podiumPlayer);
    const prevStatus = prevTimerStatusRef.current;
    prevTimerStatusRef.current = timerStatus;

    // Snapshot the live player/price/bidder BEFORE anything clears, so a sell
    // still has the data it needs on the very tick the podium empties.
    if (podiumPlayer) {
      lastPlayerRef.current = podiumPlayer;
      lastPriceRef.current = currentBid || 0;
    }
    if (highestBidder) lastBidderRef.current = highestBidder;

    // ── SELL detection (robust — works online AND offline) ──────────────────
    // The universal "sold" signal is the clock reaching 'ended' while a winning
    // bidder exists. This is true for the manual Hammer (whose OPTIMISTIC path
    // sets timerStatus='ended' but does NOT clear podiumPlayer locally), for
    // clock-expiry, and for the socket round-trip — online or offline. Keying
    // the celebration on this transition (not on podiumPlayer clearing) is what
    // makes the offline Hammer celebrate. A cancel leaves 'idle' (never
    // 'ended'), so it can never false-fire. Dedup via celebratedKeyRef so the
    // socket handleCompleted and this path coalesce to exactly one trigger.
    if (timerStatus === 'ended' && prevStatus !== 'ended') {
      const soldPlayer = podiumPlayer || lastPlayerRef.current;
      const soldTeam = highestBidder || lastBidderRef.current;
      if (soldTeam && soldPlayer && playerKey(soldPlayer) !== celebratedKeyRef.current) {
        beginSell({ player: soldPlayer, team: soldTeam, price: currentBid || lastPriceRef.current });
      }
    }

    // ── Podium identity change: intro on a new player, reset on clear ────────
    if (curKey !== prevKey) {
      prevPodiumKeyRef.current = curKey;
      if (curKey) {
        // A new player took the podium → run the introduction (deduped). Clear
        // the stale last-bidder so a fresh no-bid player can't inherit a prior
        // player's winner and false-celebrate when its clock later ends, and
        // clear the celebrated key so a re-auctioned player can celebrate again.
        lastBidderRef.current = null;
        if (celebratedKeyRef.current !== curKey) celebratedKeyRef.current = '';
        beginIntro(podiumPlayer);
      } else if (prevKey) {
        // Podium cleared (cancel, or the socket clearing after a sale). Allow
        // the next launch of this same player object to intro again.
        introducedKeyRef.current = '';
      }
    }
  }, [podiumPlayer, highestBidder, currentBid, timerStatus, beginIntro, beginSell]);

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
