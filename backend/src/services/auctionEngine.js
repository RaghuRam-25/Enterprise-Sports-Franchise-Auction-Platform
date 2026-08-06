import { timerService } from './timerService.js';
import { BiddingTier } from '../models/BiddingTier.js';

class AuctionEngine {
  constructor() {
    this.io = null;
    // In-memory state for lightning-fast socket broadcasts
    this.podiumPlayer = null;
    this.currentBid = 0;
    this.highestBidder = null; // { id, name, code, logo }
    this.mode = 'NORMAL'; // 'NORMAL' | 'BLIND'
    this.bidHistory = [];
    this.blindBids = []; // Array of { teamId, teamName, amount, timestamp }
    this.bidQueue = Promise.resolve(); // Serialized Queue Lock
    // GAP 13 FIX: Dynamic tiers loaded from DB at launch time
    this.activeTiers = [];

    // Video Broadcast State (Synchronized across all clients)
    this.videoUrl = null;
    this.videoStartTime = null;       // epoch ms when video started playing
    this.videoState = 'STOPPED';      // 'PLAYING' | 'PAUSED' | 'STOPPED'
    this.pausedAtPosition = 0;        // seconds elapsed when paused

    // Explicit System Auction State Machine
    // 'WAITING' | 'LIVE_BROADCAST' | 'PLAYER_INTRO' | 'LIVE_AUCTION' | 'CONGRATULATIONS' | 'AUCTION_COMPLETED' | 'CLOSING_BROADCAST'
    this.systemAuctionState = 'WAITING';
    this.hasStartedAuction = false;

    // Player Intro Animation State (Synchronized across all clients)
    this.introLoopState = {
      isPlaying: false,
      isPaused: false,
      players: [],
      currentIndex: 0,
      durationPerPlayer: 4, // 4 seconds default per player
      repeat: false
    };
    this.introTimer = null;
  }

  init(ioInstance) {
    this.io = ioInstance;
  }

  // Get current video broadcast state payload for socket emission
  getVideoBroadcastState() {
    return {
      url: this.videoUrl,
      videoStartTime: this.videoStartTime,
      videoState: this.videoState,
      pausedAtPosition: this.pausedAtPosition,
      serverTime: Date.now(),
      systemAuctionState: this.systemAuctionState
    };
  }

  // Set & Broadcast Video URL (Null = Stopped)
  setVideoUrl(url) {
    const prevVideoUrl = this.videoUrl;
    this.videoUrl = url ? String(url).trim() : null;
    if (this.videoUrl) {
      // Pause intro loop if video starts
      this.stopIntroLoop(false);
      this.videoStartTime = Date.now();
      this.videoState = 'PLAYING';
      this.pausedAtPosition = 0;

      if (this.systemAuctionState === 'AUCTION_COMPLETED' || this.isAuctionFinished) {
        this.systemAuctionState = 'CLOSING_BROADCAST';
        if (this.io) this.io.emit('closing-broadcast-started', this.getVideoBroadcastState());
      } else {
        this.systemAuctionState = 'LIVE_BROADCAST';
        if (this.io) this.io.emit('broadcast-started', this.getVideoBroadcastState());
      }
    } else {
      this.videoStartTime = null;
      this.videoState = 'STOPPED';
      this.pausedAtPosition = 0;
      if (prevVideoUrl && this.io) {
        this.io.emit('broadcast-stopped', { systemAuctionState: this.systemAuctionState });
      }
      if (this.systemAuctionState === 'LIVE_BROADCAST' || this.systemAuctionState === 'CLOSING_BROADCAST') {
        this.systemAuctionState = this.hasStartedAuction ? (this.isAuctionFinished ? 'AUCTION_COMPLETED' : 'LIVE_AUCTION') : 'WAITING';
      }
    }
    if (this.io) {
      this.io.emit('podium:video-control', this.getVideoBroadcastState());
    }
    return this.videoUrl;
  }

  // Pause live video broadcast
  pauseVideo() {
    if (this.videoState !== 'PLAYING' || !this.videoStartTime) return;
    this.pausedAtPosition = (Date.now() - this.videoStartTime) / 1000;
    this.videoState = 'PAUSED';
    if (this.io) {
      this.io.emit('podium:video-control', this.getVideoBroadcastState());
    }
  }

  // Resume live video broadcast
  resumeVideo() {
    if (this.videoState !== 'PAUSED') return;
    // Recalculate start time so offset math stays correct
    this.videoStartTime = Date.now() - (this.pausedAtPosition * 1000);
    this.videoState = 'PLAYING';
    if (this.io) {
      this.io.emit('podium:video-control', this.getVideoBroadcastState());
    }
  }

  // Player Intro Loop Control Methods
  startIntroLoop(playersList = [], durationSeconds = 4, repeat = false) {
    this.clearIntroTimer();
    this.videoUrl = null; // clear custom video if intro starts
    this.videoStartTime = null;
    this.videoState = 'STOPPED';
    this.pausedAtPosition = 0;
    if (this.io) {
      this.io.emit('podium:video-control', this.getVideoBroadcastState());
    }

    this.introLoopState = {
      isPlaying: true,
      isPaused: false,
      players: playersList,
      currentIndex: 0,
      durationPerPlayer: Math.max(3, Math.min(10, durationSeconds || 4)),
      repeat: Boolean(repeat)
    };

    if (playersList.length > 0) {
      this.scheduleNextIntroStep();
    }

    this.broadcastIntroState();
  }

  pauseIntroLoop() {
    if (!this.introLoopState.isPlaying) return;
    this.introLoopState.isPaused = true;
    this.clearIntroTimer();
    this.broadcastIntroState();
  }

  resumeIntroLoop() {
    if (!this.introLoopState.isPlaying || !this.introLoopState.isPaused) return;
    this.introLoopState.isPaused = false;
    this.scheduleNextIntroStep();
    this.broadcastIntroState();
  }

  stopIntroLoop(broadcast = true) {
    this.clearIntroTimer();
    this.introLoopState = {
      isPlaying: false,
      isPaused: false,
      players: [],
      currentIndex: 0,
      durationPerPlayer: 4,
      repeat: false
    };
    if (broadcast && this.io) {
      this.broadcastIntroState();
    }
  }

  skipIntroPlayer(direction = 1) {
    if (!this.introLoopState.isPlaying || this.introLoopState.players.length === 0) return;
    this.clearIntroTimer();
    const count = this.introLoopState.players.length;
    let nextIdx = this.introLoopState.currentIndex + direction;

    if (nextIdx >= count) {
      nextIdx = this.introLoopState.repeat ? 0 : count - 1;
    } else if (nextIdx < 0) {
      nextIdx = this.introLoopState.repeat ? count - 1 : 0;
    }

    this.introLoopState.currentIndex = nextIdx;
    if (!this.introLoopState.isPaused) {
      this.scheduleNextIntroStep();
    }
    this.broadcastIntroState();
  }

  restartIntroLoop() {
    if (!this.introLoopState.isPlaying) return;
    this.clearIntroTimer();
    this.introLoopState.currentIndex = 0;
    this.introLoopState.isPaused = false;
    this.scheduleNextIntroStep();
    this.broadcastIntroState();
  }

  scheduleNextIntroStep() {
    this.clearIntroTimer();
    const delayMs = (this.introLoopState.durationPerPlayer || 4) * 1000;

    this.introTimer = setTimeout(() => {
      if (!this.introLoopState.isPlaying || this.introLoopState.isPaused) return;

      const nextIdx = this.introLoopState.currentIndex + 1;
      if (nextIdx < this.introLoopState.players.length) {
        this.introLoopState.currentIndex = nextIdx;
        this.broadcastIntroState();
        this.scheduleNextIntroStep();
      } else if (this.introLoopState.repeat) {
        this.introLoopState.currentIndex = 0;
        this.broadcastIntroState();
        this.scheduleNextIntroStep();
      } else {
        // Reached end of intro playlist
        this.stopIntroLoop(true);
      }
    }, delayMs);
  }

  clearIntroTimer() {
    if (this.introTimer) {
      clearTimeout(this.introTimer);
      this.introTimer = null;
    }
  }

  broadcastIntroState() {
    if (this.io) {
      this.io.emit('podium:intro-loop-state', this.introLoopState);
    }
  }

  // GAP 13 FIX: Load bidding tiers from DB before calculating bids
  async loadTiers() {
    try {
      const tiers = await BiddingTier.find().sort({ minPercent: 1 });
      if (tiers.length > 0) {
        this.activeTiers = tiers;
      }
    } catch (err) {
      console.warn('[AuctionEngine] Could not load bidding tiers from DB, using hardcoded fallback:', err.message);
      this.activeTiers = [];
    }
  }

  // GAP 13 FIX: Calculate dynamically from DB tiers; fallback to hardcoded
  calculateNextBidAmount(currentBid, totalPurse = 100000000) {
    const currentNum = currentBid || 0;
    const percentOfPurse = (currentNum / totalPurse) * 100;

    // Try DB tiers first
    if (this.activeTiers.length > 0) {
      const matchingTier = this.activeTiers.find(
        t => percentOfPurse >= (t.minPercent ?? 0) && percentOfPurse < (t.maxPercent ?? 100)
      ) || this.activeTiers[this.activeTiers.length - 1];

      const raisePercent = matchingTier ? matchingTier.raisePercent : 0.15;
      const monetaryRaise = Math.round((totalPurse * raisePercent) / 100);
      return currentNum + monetaryRaise;
    }

    // Hardcoded fallback
    let raisePercent = 0.15;
    if (percentOfPurse >= 0 && percentOfPurse < 3) raisePercent = 0.15;
    else if (percentOfPurse >= 3 && percentOfPurse < 5) raisePercent = 0.25;
    else if (percentOfPurse >= 5 && percentOfPurse < 10) raisePercent = 0.50;
    else raisePercent = 1.00;

    const monetaryRaise = Math.round((totalPurse * raisePercent) / 100);
    return currentNum + monetaryRaise;
  }

  // --- PODIUM ADMIN CONTROLS ---
  async launchPlayer(playerData, durationSeconds = 60, mode = 'NORMAL') {
    const wasBroadcasting = Boolean(this.videoUrl);
    // Automatic broadcast stop when first player is pushed
    this.setVideoUrl(null);
    this.stopIntroLoop(true);

    this.hasStartedAuction = true;
    this.systemAuctionState = 'LIVE_AUCTION';

    if (wasBroadcasting && this.io) {
      this.io.emit('broadcast-stopped', { systemAuctionState: this.systemAuctionState });
    }
    if (this.io) {
      this.io.emit('auction-started', { systemAuctionState: this.systemAuctionState });
      this.io.emit('player-pushed', { player: playerData, systemAuctionState: this.systemAuctionState });
    }

    // GAP 13 FIX: refresh tiers from DB every time a player is launched
    await this.loadTiers();

    this.podiumPlayer = playerData;
    this.currentBid = playerData.basePrice || 1000000;
    this.highestBidder = null;
    this.mode = mode;
    this.bidHistory = [];
    this.blindBids = [];

    timerService.start(
      durationSeconds,
      (remainingSeconds) => {
        if (this.io) {
          this.io.emit('auction:timer-update', { remainingSeconds, isPaused: timerService.isPaused });
        }
      },
      () => {
        this.handleTimerEnd();
      }
    );

    this.broadcastState('auction:player-launched');
    return this.getState();
  }

  pause() {
    timerService.pause();
    this.broadcastState('auction:paused');
  }

  resume() {
    timerService.resume();
    this.broadcastState('auction:resumed');
  }

  rollback() {
    if (this.bidHistory.length <= 1) {
      if (this.podiumPlayer) {
        this.currentBid = this.podiumPlayer.basePrice || 1000000;
        this.highestBidder = null;
      }
      this.bidHistory = [];
    } else {
      this.bidHistory.pop();
      const prevBid = this.bidHistory[this.bidHistory.length - 1];
      this.currentBid = prevBid.amount;
      this.highestBidder = prevBid.bidder;
    }
    timerService.addSeconds(15);
    this.broadcastState('auction:rollback');
  }

  hammerSell() {
    timerService.stop();
    const result = {
      player: this.podiumPlayer,
      soldPrice: this.currentBid,
      winner: this.highestBidder
    };
    if (this.io) {
      this.io.emit('auction:completed', result);
    }
    this.podiumPlayer = null;
    return result;
  }

  cancel() {
    timerService.stop();
    this.podiumPlayer = null;
    this.currentBid = 0;
    this.highestBidder = null;
    this.bidHistory = [];
    this.broadcastState('auction:cancelled');
  }

  // --- SERIALIZED BIDDING QUEUE (RACE CONDITION PREVENTION) ---
  placeNormalBid(teamData) {
    // Chain onto bid queue lock to prevent parallel millisecond race conditions
    this.bidQueue = this.bidQueue.then(() => {
      return this._executeNormalBid(teamData);
    }).catch(err => {
      console.error('Bid Queue Error:', err);
    });
    return this.bidQueue;
  }

  _executeNormalBid(teamData) {
    if (!this.podiumPlayer) return { success: false, error: 'No player on podium' };
    if (timerService.status !== 'RUNNING' || timerService.isPaused) {
      return { success: false, error: 'Auction clock is not active' };
    }

    const nextAmount = this.calculateNextBidAmount(this.currentBid, teamData.totalBudget || 100000000);
    if (nextAmount > (teamData.remainingBudget || 100000000)) {
      return { success: false, error: 'Insufficient team budget' };
    }

    this.currentBid = nextAmount;
    this.highestBidder = teamData;
    // Reset timer upon valid bid
    timerService.resetTimer(timerService.duration);

    const logEntry = {
      id: `b-${Date.now()}`,
      amount: nextAmount,
      bidder: teamData.name,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      type: 'NORMAL'
    };
    this.bidHistory.push(logEntry);

    this.broadcastState('auction:new-bid');
    return { success: true, nextAmount };
  }

  // --- BLIND BIDDING ENGINE (BLIND BID BUDGET GUARDRAIL) ---
  placeBlindBid(teamData, amount, lowestBasePrice = 1000000) {
    if (!this.podiumPlayer) return { success: false, error: 'No player on podium' };

    const bidAmount = Number(amount);
    if (isNaN(bidAmount) || bidAmount <= 0) {
      return { success: false, error: 'Invalid numeric bid amount' };
    }

    // PRD Blind Bid Budget Guardrail Formula:
    // Required Reserve = (minRoster - currentRosterCount - 1) * lowestCategoryBasePrice
    const slotsNeeded = Math.max(0, (teamData.minRoster || 11) - ((teamData.currentRosterCount || 0) + 1));
    const requiredReserve = slotsNeeded * lowestBasePrice;
    const maxAllowableBid = (teamData.remainingBudget || 100000000) - requiredReserve;

    if (bidAmount > maxAllowableBid) {
      const errorMsg = `BLIND BID REJECTED: Bid of ${bidAmount} BDT exceeds allowable limit. Required reserve for ${slotsNeeded} remaining slots is ${requiredReserve} BDT.`;

      // Notify ONLY this specific team manager via private socket room!
      if (this.io && teamData.id) {
        this.io.to(`team:${teamData.id}`).emit('bid:error', { error: errorMsg });
      }
      return { success: false, error: errorMsg };
    }

    // Register valid blind bid
    this.blindBids.push({ teamId: teamData.id, teamName: teamData.name, amount: bidAmount, timestamp: Date.now() });

    if (this.io && teamData.id) {
      this.io.to(`team:${teamData.id}`).emit('bid:blind-success', { amount: bidAmount });
    }
    return { success: true };
  }

  handleTimerEnd() {
    if (this.mode === 'BLIND' && this.blindBids.length > 0) {
      // Resolve highest blind bid
      const sorted = [...this.blindBids].sort((a, b) => b.amount - a.amount);
      const winner = sorted[0];
      this.currentBid = winner.amount;
      this.highestBidder = { id: winner.teamId, name: winner.teamName };
    }

    if (this.highestBidder) {
      const result = {
        player: this.podiumPlayer,
        winner: this.highestBidder,
        soldPrice: this.currentBid,
      };
      if (this.io) {
        this.io.emit('auction:completed', result);
      }
      this.podiumPlayer = null;
      return;
    }

    // No bids → player goes unsold; broadcast full state (no celebration).
    this.broadcastState('auction:completed');
  }

  broadcastState(eventName = 'auction:state') {
    if (this.io) {
      this.io.emit(eventName, this.getState());
    }
  }

  getState() {
    return {
      podiumPlayer: this.podiumPlayer,
      currentBid: this.currentBid,
      highestBidder: this.highestBidder,
      mode: this.mode,
      timer: timerService.getState(),
      bidHistory: this.bidHistory,
      videoUrl: this.videoUrl,
      videoStartTime: this.videoStartTime,
      videoState: this.videoState,
      pausedAtPosition: this.pausedAtPosition,
      serverTime: Date.now(),
      introLoopState: this.introLoopState,
      systemAuctionState: this.systemAuctionState,
      hasStartedAuction: this.hasStartedAuction
    };
  }
}


export const auctionEngine = new AuctionEngine();
