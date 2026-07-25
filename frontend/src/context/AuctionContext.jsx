import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSocket } from './SocketContext';
import api from '../services/api';

const AuctionContext = createContext();

// All initial states start empty — data loaded from real API on mount

export const AuctionProvider = ({ children }) => {
  const { socket, isConnected } = useSocket();

  // Config States — loaded from real API
  const [sessions, setSessions] = useState([]);
  const [positions, setPositions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [biddingTiers, setBiddingTiers] = useState([]);
  const [isRegistrationFrozen, setIsRegistrationFrozen] = useState(false);

  // Teams & Players States — loaded from real API
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [managers, setManagers] = useState([]);
  const [isDataLoading, setIsDataLoading] = useState(true);

  // Live Podium Engine State — starts clean (no mock data)
  const [podiumPlayer, setPodiumPlayer] = useState(null);
  const [currentBid, setCurrentBid] = useState(0);
  const [highestBidder, setHighestBidder] = useState(null);
  const [biddingMode, setBiddingMode] = useState('normal');
  const [timerDuration, setTimerDuration] = useState(60);
  const [timerRemaining, setTimerRemaining] = useState(0);
  const [timerStatus, setTimerStatus] = useState('idle');
  const [bidHistory, setBidHistory] = useState([]);

  const [lastActionToast, setLastActionToast] = useState(null);

  const triggerToast = (msg, type = 'info') => {
    setLastActionToast({ id: Date.now(), msg, type });
    setTimeout(() => setLastActionToast(null), 4000);
  };

  // --- LOAD ALL REAL DATA FROM BACKEND ON MOUNT ---
  useEffect(() => {
    const loadAllData = async () => {
      try {
        setIsDataLoading(true);
        const [sessRes, posRes, catRes, tierRes, teamRes, playerRes, regRes] = await Promise.allSettled([
          api.get('/admin/sessions'),
          api.get('/admin/positions'),
          api.get('/admin/categories'),
          api.get('/admin/bidding-tiers'),
          api.get('/admin/teams'),
          api.get('/players'),
          api.get('/players/status')
        ]);

        if (sessRes.status === 'fulfilled' && sessRes.value.data?.data)
          setSessions(sessRes.value.data.data.map(s => ({ ...s, id: s._id })));
        if (posRes.status === 'fulfilled' && posRes.value.data?.data)
          setPositions(posRes.value.data.data.map(p => ({ ...p, id: p._id })));
        if (catRes.status === 'fulfilled' && catRes.value.data?.data)
          setCategories(catRes.value.data.data.map(c => ({ ...c, id: c._id })));
        if (tierRes.status === 'fulfilled' && tierRes.value.data?.data)
          setBiddingTiers(tierRes.value.data.data.map(t => ({ ...t, id: t._id })));
        if (teamRes.status === 'fulfilled' && teamRes.value.data?.data)
          setTeams(teamRes.value.data.data.map(t => ({
            ...t,
            id: t._id,
            currentRoster: t.currentRoster || [],
            currentRosterCount: t.currentRosterCount || 0
          })));
        if (playerRes.status === 'fulfilled' && playerRes.value.data?.data)
          setPlayers(playerRes.value.data.data.map(p => ({ ...p, id: p._id })));
        if (regRes.status === 'fulfilled' && regRes.value.data)
          setIsRegistrationFrozen(regRes.value.data.isRegistrationFrozen || false);
      } catch (err) {
        console.error('Failed to load data from backend:', err);
      } finally {
        setIsDataLoading(false);
      }
    };
    loadAllData();
  }, []);

  // Load managers separately (requires auth — only called when user is SUPER_ADMIN)
  const loadManagers = useCallback(async () => {
    try {
      const res = await api.get('/admin/managers');
      if (res.data?.data) {
        setManagers(res.data.data.map(m => ({
          ...m,
          id: m._id,
          username: m.email,
          mustChangePass: m.mustResetPassword
        })));
      }
    } catch (err) {
      // Silently ignore if not admin
    }
  }, []);

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

    // Gap 4 Fix: Backend uses minPercent/maxPercent, not minPursePercent/maxPursePercent
    let matchingTier = biddingTiers.find(
      t => bidPercentOfPurse >= (t.minPercent ?? t.minPursePercent ?? 0) &&
           bidPercentOfPurse < (t.maxPercent ?? t.maxPursePercent ?? 100)
    );

    if (!matchingTier && biddingTiers.length > 0) {
      matchingTier = biddingTiers[biddingTiers.length - 1];
    }

    const raisePercent = matchingTier ? matchingTier.raisePercent : 0.15;
    const monetaryRaise = Math.round((totalPurse * raisePercent) / 100);
    return currentBidNum + monetaryRaise;
  }, [biddingTiers]);

  // Fetch real database records on initial load
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [playersRes, sessionsRes, positionsRes, categoriesRes, tiersRes, teamsRes, managersRes] = await Promise.allSettled([
          api.get('/players'),
          api.get('/admin/sessions'),
          api.get('/admin/positions'),
          api.get('/admin/categories'),
          api.get('/admin/bidding-tiers'),
          api.get('/admin/teams'),
          api.get('/admin/managers')
        ]);

        if (playersRes.status === 'fulfilled' && playersRes.value?.data) setPlayers(playersRes.value.data);
        if (sessionsRes.status === 'fulfilled' && sessionsRes.value?.data) setSessions(sessionsRes.value.data);
        if (positionsRes.status === 'fulfilled' && positionsRes.value?.data) setPositions(positionsRes.value.data);
        if (categoriesRes.status === 'fulfilled' && categoriesRes.value?.data) setCategories(categoriesRes.value.data);
        if (tiersRes.status === 'fulfilled' && tiersRes.value?.data) setBiddingTiers(tiersRes.value.data);
        if (teamsRes.status === 'fulfilled' && teamsRes.value?.data) setTeams(teamsRes.value.data);
        if (managersRes.status === 'fulfilled' && managersRes.value?.data) setManagers(managersRes.value.data);
      } catch (err) {
        console.warn('Real DB fetch fallback to local defaults:', err.message);
      }
    };
    fetchInitialData();
  }, []);

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

  // --- CONFIG CRUD WITH REAL API CALLS (Gap 3 Fix) ---
  const addSession = async (session) => {
    try {
      const res = await api.post('/admin/sessions', { name: session.name });
      if (res.data?.data) setSessions(prev => [...prev, { ...res.data.data, id: res.data.data._id }]);
    } catch (err) { triggerToast(err.response?.data?.message || 'Failed to add session', 'error'); }
  };
  const deleteSession = async (id) => {
    try {
      await api.delete(`/admin/sessions/${id}`);
      setSessions(prev => prev.filter(s => s.id !== id));
    } catch (err) { triggerToast(err.response?.data?.message || 'Failed to delete session', 'error'); }
  };
  const addPosition = async (pos) => {
    try {
      const res = await api.post('/admin/positions', { code: pos.code, name: pos.name });
      if (res.data?.data) setPositions(prev => [...prev, { ...res.data.data, id: res.data.data._id }]);
    } catch (err) { triggerToast(err.response?.data?.message || 'Failed to add position', 'error'); }
  };
  const deletePosition = async (id) => {
    try {
      await api.delete(`/admin/positions/${id}`);
      setPositions(prev => prev.filter(p => p.id !== id));
    } catch (err) { triggerToast(err.response?.data?.message || 'Failed to delete position', 'error'); }
  };
  const addCategory = async (cat) => {
    try {
      const res = await api.post('/admin/categories', { name: cat.name, priorityLevel: cat.priority || 1, basePrice: cat.basePrice });
      if (res.data?.data) setCategories(prev => [...prev, { ...res.data.data, id: res.data.data._id }]);
    } catch (err) { triggerToast(err.response?.data?.message || 'Failed to add category', 'error'); }
  };
  const deleteCategory = async (id) => {
    try {
      await api.delete(`/admin/categories/${id}`);
      setCategories(prev => prev.filter(c => c.id !== id));
    } catch (err) { triggerToast(err.response?.data?.message || 'Failed to delete category', 'error'); }
  };
  const updateBiddingTier = async (id, updated) => {
    try {
      const res = await api.put(`/admin/bidding-tiers/${id}`, updated);
      if (res.data?.data) setBiddingTiers(prev => prev.map(t => t.id === id ? { ...t, ...res.data.data } : t));
    } catch (err) { triggerToast(err.response?.data?.message || 'Failed to update bidding tier', 'error'); }
  };

  return (
    <AuctionContext.Provider
      value={{
        sessions, positions, categories, biddingTiers, isRegistrationFrozen, setIsRegistrationFrozen,
        addSession, deleteSession, addPosition, deletePosition, addCategory, deleteCategory, updateBiddingTier,
        teams, setTeams, players, setPlayers, managers, setManagers, isDataLoading, loadManagers,
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
