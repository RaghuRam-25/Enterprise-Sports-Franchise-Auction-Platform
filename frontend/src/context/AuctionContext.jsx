import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSocket } from './SocketContext';
import api from '../services/api';

const AuctionContext = createContext();

const initialSessions = [
  { id: 'sess-1', name: '22-23 Academic Session', isDefault: true },
  { id: 'sess-2', name: '23-24 Academic Session', isDefault: false },
];

const initialPositions = [
  { id: 'pos-1', code: 'ST', name: 'Striker' },
  { id: 'pos-2', code: 'GK', name: 'Goalkeeper' },
  { id: 'pos-3', code: 'RW', name: 'Right Winger' },
  { id: 'pos-4', code: 'LW', name: 'Left Winger' },
  { id: 'pos-5', code: 'CM', name: 'Central Midfielder' },
  { id: 'pos-6', code: 'CB', name: 'Center Back' },
  { id: 'pos-7', code: 'ALL', name: 'All-Rounder' },
];

const initialCategories = [
  { id: 'cat-1', name: 'Icon Category', priority: 1, basePrice: 5000000 },
  { id: 'cat-2', name: 'A Grade', priority: 2, basePrice: 3000000 },
  { id: 'cat-3', name: 'B Grade', priority: 3, basePrice: 1500000 },
];

const initialBiddingTiers = [
  { id: 'tier-1', minPursePercent: 0, maxPursePercent: 3, raisePercent: 0.15 },
  { id: 'tier-2', minPursePercent: 3, maxPursePercent: 5, raisePercent: 0.25 },
  { id: 'tier-3', minPursePercent: 5, maxPursePercent: 10, raisePercent: 0.50 },
  { id: 'tier-4', minPursePercent: 10, maxPursePercent: 100, raisePercent: 1.00 },
];

const initialTeams = [
  { id: 'team-1', name: 'Dhaka Dynamites', code: 'DHD', logo: '⚡', totalBudget: 100000000, remainingBudget: 78500000, minRoster: 11, currentRoster: [] },
  { id: 'team-2', name: 'Chittagong Kings', code: 'CTG', logo: '👑', totalBudget: 100000000, remainingBudget: 82000000, minRoster: 11, currentRoster: [] },
  { id: 'team-3', name: 'Sylhet Strikers', code: 'SYL', logo: '🗡️', totalBudget: 100000000, remainingBudget: 85000000, minRoster: 11, currentRoster: [] },
  { id: 'team-4', name: 'Fortune Barishal', code: 'FBR', logo: '⚓', totalBudget: 100000000, remainingBudget: 88000000, minRoster: 11, currentRoster: [] },
  { id: 'team-5', name: 'Comilla Victorians', code: 'COM', logo: '🛡️', totalBudget: 100000000, remainingBudget: 90000000, minRoster: 11, currentRoster: [] },
  { id: 'team-6', name: 'Rangpur Riders', code: 'RNG', logo: '🏹', totalBudget: 100000000, remainingBudget: 92000000, minRoster: 11, currentRoster: [] }
];

const initialPlayers = [
  { id: 'p-1', name: 'Shakib Al Hasan', studentId: 'STU-2023-089', session: '22-23 Academic Session', jerseyName: 'SHAKIB 75', positions: ['pos-7'], primaryPosition: 'pos-7', category: 'Icon Category', basePrice: 5000000, status: 'podium', picture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80' },
  { id: 'p-2', name: 'Mehidy Hasan Miraz', studentId: 'STU-2023-102', session: '23-24 Academic Session', jerseyName: 'MIRAZ 53', positions: ['pos-7'], primaryPosition: 'pos-7', category: 'A Grade', basePrice: 3000000, status: 'unsold', picture: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80' },
  { id: 'p-3', name: 'Shoriful Islam', studentId: 'STU-2024-044', session: '23-24 Academic Session', jerseyName: 'SHORIFUL 47', positions: ['pos-6'], primaryPosition: 'pos-6', category: 'B Grade', basePrice: 1500000, status: 'unsold', picture: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&auto=format&fit=crop&q=80' }
];

export const AuctionProvider = ({ children }) => {
  const { socket, isConnected } = useSocket();

  // Config States
  const [sessions, setSessions] = useState(initialSessions);
  const [positions, setPositions] = useState(initialPositions);
  const [categories, setCategories] = useState(initialCategories);
  const [biddingTiers, setBiddingTiers] = useState(initialBiddingTiers);
  const [isRegistrationFrozen, setIsRegistrationFrozen] = useState(false);

  // Teams & Players States
  const [teams, setTeams] = useState(initialTeams);
  const [players, setPlayers] = useState(initialPlayers);
  const [managers, setManagers] = useState([
    { id: 'mgr-1', teamId: 'team-1', username: 'dhaka_mgr', name: 'Dhaka Manager', mustChangePass: false },
    { id: 'mgr-2', teamId: 'team-2', username: 'ctg_mgr', name: 'Chittagong Manager', mustChangePass: true }
  ]);

  // Live Podium Engine State
  const [podiumPlayer, setPodiumPlayer] = useState(initialPlayers[0]);
  const [currentBid, setCurrentBid] = useState(21500000);
  const [highestBidder, setHighestBidder] = useState(initialTeams[0]);
  const [biddingMode, setBiddingMode] = useState('normal');
  const [timerDuration, setTimerDuration] = useState(60);
  const [timerRemaining, setTimerRemaining] = useState(42);
  const [timerStatus, setTimerStatus] = useState('running');
  const [bidHistory, setBidHistory] = useState([
    { id: 'b-1', amount: 15000000, bidder: 'Fortune Barishal', time: '12:40:10 AM', type: 'Normal' },
    { id: 'b-2', amount: 21500000, bidder: 'Dhaka Dynamites', time: '12:41:20 AM', type: 'Normal' }
  ]);

  const [lastActionToast, setLastActionToast] = useState(null);

  const triggerToast = (msg, type = 'info') => {
    setLastActionToast({ id: Date.now(), msg, type });
    setTimeout(() => setLastActionToast(null), 4000);
  };

  const formatCurrency = useCallback((val) => {
    if (val === undefined || val === null || isNaN(val)) return '0 BDT';
    return `${Number(val).toLocaleString('en-IN')} BDT`;
  }, []);

  const getLowestCategoryBasePrice = useCallback(() => {
    if (!categories || categories.length === 0) return 1500000;
    return Math.min(...categories.map(c => c.basePrice));
  }, [categories]);

  const calculateNextBidAmount = useCallback((currentBidVal, totalPurse = 100000000) => {
    const currentBidNum = currentBidVal || 0;
    const bidPercentOfPurse = (currentBidNum / totalPurse) * 100;

    let matchingTier = biddingTiers.find(
      t => bidPercentOfPurse >= t.minPursePercent && bidPercentOfPurse < t.maxPursePercent
    );

    if (!matchingTier && biddingTiers.length > 0) {
      matchingTier = biddingTiers[biddingTiers.length - 1];
    }

    const raisePercent = matchingTier ? matchingTier.raisePercent : 0.15;
    const monetaryRaise = Math.round((totalPurse * raisePercent) / 100);
    return currentBidNum + monetaryRaise;
  }, [biddingTiers]);

  // Sync Socket events from backend server
  useEffect(() => {
    if (!socket) return;

    socket.on('auction:state', (state) => {
      if (!state) return;
      if (state.podiumPlayer) setPodiumPlayer(state.podiumPlayer);
      if (state.currentBid) setCurrentBid(state.currentBid);
      if (state.highestBidder) setHighestBidder(state.highestBidder);
      if (state.mode) setBiddingMode(state.mode.toLowerCase());
      if (state.timer) {
        setTimerRemaining(state.timer.remainingSeconds);
        setTimerDuration(state.timer.duration);
        setTimerStatus(state.timer.status?.toLowerCase() || 'running');
      }
      if (state.bidHistory) setBidHistory(state.bidHistory);
    });

    socket.on('auction:timer-update', (data) => {
      setTimerRemaining(data.remainingSeconds);
      if (data.isPaused) setTimerStatus('paused');
    });

    socket.on('bid:error', (data) => {
      triggerToast(data.error || 'Bid rejected by server guardrail', 'error');
    });

    socket.on('bid:blind-success', (data) => {
      triggerToast(`Sealed blind bid of ${formatCurrency(data.amount)} registered on server!`, 'success');
    });

    return () => {
      socket.off('auction:state');
      socket.off('auction:timer-update');
      socket.off('bid:error');
      socket.off('bid:blind-success');
    };
  }, [socket, formatCurrency]);

  // Fallback Countdown Timer if socket offline
  useEffect(() => {
    if (isConnected) return; // server manages timer when socket connected
    let interval = null;
    if (timerStatus === 'running' && timerRemaining > 0) {
      interval = setInterval(() => {
        setTimerRemaining(prev => prev - 1);
      }, 1000);
    } else if (timerRemaining === 0 && timerStatus === 'running') {
      setTimerStatus('ended');
    }
    return () => clearInterval(interval);
  }, [isConnected, timerStatus, timerRemaining]);

  // --- ACTIONS WITH SOCKET & API FALLBACK ---
  const pushToPodium = (player, duration = 60, mode = 'normal') => {
    setPodiumPlayer(player);
    setCurrentBid(player.basePrice || 1000000);
    setHighestBidder(null);
    setBiddingMode(mode);
    setTimerDuration(duration);
    setTimerRemaining(duration);
    setTimerStatus('running');

    if (socket && isConnected) {
      api.post('/podium/launch-player', { playerId: player.id || player._id, duration, mode: mode.toUpperCase() }).catch(() => {});
    }
    triggerToast(`Pushed ${player.name} to Live Podium (${mode.toUpperCase()} mode)`, 'success');
  };

  const pauseTimer = () => {
    setTimerStatus('paused');
    if (socket && isConnected) api.post('/podium/pause').catch(() => {});
    triggerToast('Auction Timer PAUSED', 'warning');
  };

  const resumeTimer = () => {
    setTimerStatus('running');
    if (socket && isConnected) api.post('/podium/resume').catch(() => {});
    triggerToast('Auction Timer RESUMED', 'info');
  };

  const rollbackBid = () => {
    if (socket && isConnected) api.post('/podium/rollback').catch(() => {});
    if (bidHistory.length <= 1) {
      if (podiumPlayer) {
        setCurrentBid(podiumPlayer.basePrice);
        setHighestBidder(null);
      }
      setBidHistory([]);
    } else {
      const updated = [...bidHistory];
      updated.pop();
      const prev = updated[updated.length - 1];
      setBidHistory(updated);
      setCurrentBid(prev.amount);
    }
    setTimerRemaining(prev => Math.min(timerDuration, prev + 15));
    triggerToast('Rollback complete!', 'warning');
  };

  const hammerSell = () => {
    if (!podiumPlayer) return;
    if (!highestBidder) {
      triggerToast('Cannot sell: No bids placed yet!', 'error');
      return;
    }
    if (socket && isConnected) api.post('/podium/force-sell').catch(() => {});

    setPlayers(prev => prev.map(p => p.id === podiumPlayer.id ? { ...p, status: 'sold', soldPrice: currentBid } : p));
    setTimerStatus('ended');
    triggerToast(`HAMMER DOWN! ${podiumPlayer.name} SOLD to ${highestBidder.name} for ${formatCurrency(currentBid)}!`, 'success');
  };

  const cancelAuction = () => {
    if (socket && isConnected) api.post('/podium/cancel').catch(() => {});
    setPodiumPlayer(null);
    setCurrentBid(0);
    setHighestBidder(null);
    setTimerStatus('idle');
    triggerToast('Auction canceled.', 'info');
  };

  const placeNormalBid = (teamId) => {
    const team = teams.find(t => t.id === teamId);
    if (!team) return { success: false, error: 'Team not found' };
    if (!podiumPlayer) return { success: false, error: 'No player on podium' };

    const nextAmount = calculateNextBidAmount(currentBid, team.totalBudget);
    if (nextAmount > team.remainingBudget) {
      return { success: false, error: `Insufficient budget! Remaining: ${formatCurrency(team.remainingBudget)}` };
    }

    if (socket && isConnected) {
      socket.emit('bid:place', { team });
    }

    setCurrentBid(nextAmount);
    setHighestBidder(team);
    setTimerRemaining(timerDuration);

    const newLog = {
      id: `b-${Date.now()}`,
      amount: nextAmount,
      bidder: team.name,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      type: 'Normal'
    };
    setBidHistory(prev => [...prev, newLog]);
    return { success: true, nextAmount };
  };

  const placeBlindBid = (teamId, requestedAmount) => {
    const team = teams.find(t => t.id === teamId);
    if (!team) return { success: false, error: 'Team not found' };
    if (!podiumPlayer) return { success: false, error: 'No player on podium' };

    const bidNum = Number(requestedAmount);
    if (isNaN(bidNum) || bidNum <= 0) {
      return { success: false, error: 'Please enter a valid numeric bid amount.' };
    }

    // PRD REQUIREMENT: Blind Bid Budget Guardrail
    const lowestBasePrice = getLowestCategoryBasePrice();
    const currentRosterCount = team.currentRoster.length;
    const slotsNeeded = Math.max(0, team.minRoster - (currentRosterCount + 1));
    const requiredReserve = slotsNeeded * lowestBasePrice;
    const maxAllowableBid = team.remainingBudget - requiredReserve;

    if (bidNum > maxAllowableBid) {
      return {
        success: false,
        error: `BLIND BID REJECTED: Bid of ${formatCurrency(bidNum)} exceeds allowable purse limit. Required reserve for remaining ${slotsNeeded} squad slots is ${formatCurrency(requiredReserve)}.`
      };
    }

    if (socket && isConnected) {
      socket.emit('bid:blind', { team, amount: bidNum, lowestBasePrice });
    }

    triggerToast(`Sealed blind bid of ${formatCurrency(bidNum)} submitted by ${team.name}`, 'info');
    return { success: true };
  };

  const addSession = (session) => setSessions(prev => [...prev, { ...session, id: `sess-${Date.now()}` }]);
  const deleteSession = (id) => setSessions(prev => prev.filter(s => s.id !== id));
  const addPosition = (pos) => setPositions(prev => [...prev, { ...pos, id: `pos-${Date.now()}` }]);
  const deletePosition = (id) => setPositions(prev => prev.filter(p => p.id !== id));
  const addCategory = (cat) => setCategories(prev => [...prev, { ...cat, id: `cat-${Date.now()}` }]);
  const deleteCategory = (id) => setCategories(prev => prev.filter(c => c.id !== id));
  const updateBiddingTier = (id, updated) => setBiddingTiers(prev => prev.map(t => t.id === id ? { ...t, ...updated } : t));

  return (
    <AuctionContext.Provider
      value={{
        sessions, positions, categories, biddingTiers, isRegistrationFrozen, setIsRegistrationFrozen,
        addSession, deleteSession, addPosition, deletePosition, addCategory, deleteCategory, updateBiddingTier,
        teams, setTeams, players, setPlayers, managers,
        podiumPlayer, currentBid, highestBidder, biddingMode, timerDuration, timerRemaining, timerStatus, bidHistory, lastActionToast,
        formatCurrency, calculateNextBidAmount, getLowestCategoryBasePrice,
        pushToPodium, pauseTimer, resumeTimer, rollbackBid, hammerSell, cancelAuction, placeNormalBid, placeBlindBid, triggerToast
      }}
    >
      {children}
    </AuctionContext.Provider>
  );
};

export const useAuction = () => useContext(AuctionContext);
