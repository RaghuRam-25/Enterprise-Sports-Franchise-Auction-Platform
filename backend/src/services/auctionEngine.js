import { timerService } from './timerService.js';

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
  }

  init(ioInstance) {
    this.io = ioInstance;
  }

  // Calculate raise dynamically based on BiddingTier percentages
  calculateNextBidAmount(currentBid, totalPurse = 100000000) {
    const currentNum = currentBid || 0;
    const percentOfPurse = (currentNum / totalPurse) * 100;

    let raisePercent = 0.15;
    if (percentOfPurse >= 0 && percentOfPurse < 3) raisePercent = 0.15;
    else if (percentOfPurse >= 3 && percentOfPurse < 5) raisePercent = 0.25;
    else if (percentOfPurse >= 5 && percentOfPurse < 10) raisePercent = 0.50;
    else raisePercent = 1.00;

    const monetaryRaise = Math.round((totalPurse * raisePercent) / 100);
    return currentNum + monetaryRaise;
  }

  // --- PODIUM ADMIN CONTROLS ---
  launchPlayer(playerData, durationSeconds = 60, mode = 'NORMAL') {
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
      bidHistory: this.bidHistory
    };
  }
}

export const auctionEngine = new AuctionEngine();
