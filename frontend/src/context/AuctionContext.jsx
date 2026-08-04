import  { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSocket } from './SocketContext';
import api from '../services/api';

const AuctionContext = createContext();

export const AuctionProvider = ({ children }) => {
  const { socket, isConnected } = useSocket();

  // Config States
  const [sessions, setSessions] = useState([]);
  const [positions, setPositions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [biddingTiers, setBiddingTiers] = useState([]);
  const [isRegistrationFrozen, setIsRegistrationFrozen] = useState(false);

  // Teams & Players States
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [managers, setManagers] = useState([]);
  const [isDataLoading, setIsDataLoading] = useState(true);

  // Live Podium Engine State
  const [podiumPlayer, setPodiumPlayer] = useState(null);
  const [currentBid, setCurrentBid] = useState(0);
  const [highestBidder, setHighestBidder] = useState(null);
  const [biddingMode, setBiddingMode] = useState('normal');
  const [timerDuration, setTimerDuration] = useState(60);
  const [timerRemaining, setTimerRemaining] = useState(0);
  const [timerStatus, setTimerStatus] = useState('idle');
  const [bidHistory, setBidHistory] = useState([]);

  // Broadcast Video & Player Intro State (synchronized via Socket.IO from backend auctionEngine)
  const [broadcastVideoUrl, setBroadcastVideoUrl] = useState(null);
  const [introLoopState, setIntroLoopState] = useState({
    isPlaying: false,
    isPaused: false,
    players: [],
    currentIndex: 0,
    durationPerPlayer: 4,
    repeat: false
  });

  const [lastActionToast, setLastActionToast] = useState(null);

  const triggerToast = (msg, type = 'info') => {
    setLastActionToast({ id: Date.now(), msg, type });
    setTimeout(() => setLastActionToast(null), 4000);
  };

  // --- REFETCH HELPERS FOR INSTANT STATE SYNCHRONIZATION ---
  // NOTE: axios interceptor already unwraps response.data, so res = { success, data: [...] }
  const refetchPlayers = useCallback(async () => {
    try {
      const res = await api.get('/players');
      // res is already response.data from interceptor: { success, count, data: [...] }
      const raw = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      if (Array.isArray(raw)) {
        setPlayers(raw.map(p => ({ ...p, id: p._id || p.id })));
      }
    } catch (err) {
      console.warn('[AuctionContext] Failed to refetch players:', err.message);
    }
  }, []);

  const refetchTeams = useCallback(async () => {
    try {
      const res = await api.get('/config/teams');
      const raw = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      if (Array.isArray(raw)) {
        setTeams(raw.map(t => ({
          ...t,
          id: t._id || t.id,
          currentRoster: t.currentRoster || [],
          currentRosterCount: t.currentRosterCount || 0
        })));
      }
    } catch (err) {
      console.warn('[AuctionContext] Failed to refetch teams:', err.message);
    }
  }, []);

  const loadAllData = useCallback(async () => {
    try {
      setIsDataLoading(true);
      const [sessRes, posRes, catRes, tierRes, teamRes, playerRes, regRes] = await Promise.allSettled([
        api.get('/config/sessions'),
        api.get('/config/positions'),
        api.get('/config/categories'),
        api.get('/config/bidding-tiers'),
        api.get('/config/teams'),
        api.get('/players'),
        api.get('/players/status')
      ]);

      // axios interceptor returns response.data directly so value = { success, data: [...] }
      const extract = (result) => {
        const v = result?.value;
        return Array.isArray(v?.data) ? v.data : Array.isArray(v) ? v : [];
      };
      const extractObj = (result) => result?.value || {};

      if (sessRes.status === 'fulfilled') {
        const raw = extract(sessRes);
        if (raw.length) setSessions(raw.map(s => ({ ...s, id: s._id || s.id })));
      }
      if (posRes.status === 'fulfilled') {
        const raw = extract(posRes);
        if (raw.length) setPositions(raw.map(p => ({ ...p, id: p._id || p.id })));
      }
      if (catRes.status === 'fulfilled') {
        const raw = extract(catRes);
        if (raw.length) setCategories(raw.map(c => ({ ...c, id: c._id || c.id })));
      }
      if (tierRes.status === 'fulfilled') {
        const raw = extract(tierRes);
        if (raw.length) setBiddingTiers(raw.map(t => ({ ...t, id: t._id || t.id })));
      }
      if (teamRes.status === 'fulfilled') {
        const raw = extract(teamRes);
        if (raw.length) {
          setTeams(raw.map(t => ({
            ...t,
            id: t._id || t.id,
            currentRoster: t.currentRoster || [],
            currentRosterCount: t.currentRosterCount || 0
          })));
        }
      }
      if (playerRes.status === 'fulfilled') {
        const raw = extract(playerRes);
        setPlayers(raw.map(p => ({ ...p, id: p._id || p.id })));
      }
      if (regRes.status === 'fulfilled') {
        const obj = extractObj(regRes);
        setIsRegistrationFrozen(obj.isRegistrationFrozen || false);
      }
    } catch (err) {
      console.warn('[AuctionContext] Initial data fetch warning:', err.message);
    } finally {
      setIsDataLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Load managers separately (only called when privileged user accesses manager list)
  const loadManagers = useCallback(async () => {
    try {
      const res = await api.get('/admin/managers');
      // axios interceptor returns response.data directly: { success, data: [...] }
      const raw = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      if (Array.isArray(raw)) {
        setManagers(raw.map(m => ({
          ...m,
          id: m._id || m.id,
          username: m.email || m.username,
          mustChangePass: m.mustResetPassword
        })));
      }
    } catch (err) {
      // Silently ignore if unprivileged
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

    let matchingTier = biddingTiers.find(
      t => bidPercentOfPurse >= (t.minPercent ?? 0) &&
        bidPercentOfPurse < (t.maxPercent ?? 100)
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

    // GAP 4 FIX: Use specific event handlers per event to allow null clearing
    const handleState = (state) => {
      if (!state) return;
      // Always set, even if null/0 — prevents stale state
      setPodiumPlayer(state.podiumPlayer ?? null);
      setCurrentBid(state.currentBid ?? 0);
      setHighestBidder(state.highestBidder ?? null);
      if (state.mode) setBiddingMode(state.mode.toLowerCase());
      if (state.timer) {
        setTimerRemaining(state.timer.remainingSeconds ?? 0);
        setTimerDuration(state.timer.duration ?? 60);
        setTimerStatus(state.timer.status?.toLowerCase() || 'idle');
      }
      if (Array.isArray(state.bidHistory)) setBidHistory(state.bidHistory);
      // Sync broadcast state from full auction state snapshot
      if (state.videoUrl !== undefined) setBroadcastVideoUrl(state.videoUrl ?? null);
      if (state.introLoopState) setIntroLoopState(state.introLoopState);
    };

    const handleVideoBroadcast = (data) => {
      setBroadcastVideoUrl(data?.url ?? null);
    };

    const handleIntroLoopState = (state) => {
      if (state) setIntroLoopState(state);
    };

    const handlePlayerLaunched = (state) => {
      handleState(state);
      setTimerStatus('running');
    };

    const handleCompleted = (state) => {
      if (state?.player && state?.winner) {
        // declareWinner / hammerSell provides a result object, not full state
        setPodiumPlayer(null);
        setTimerStatus('ended');
      } else {
        // timer expired — state has full auction state
        handleState(state);
        setTimerStatus('ended');
      }
    };

    const handleCancelled = () => {
      setPodiumPlayer(null);
      setCurrentBid(0);
      setHighestBidder(null);
      setTimerStatus('idle');
      setBidHistory([]);
    };

    const handleTimerUpdate = (data) => {
      setTimerRemaining(data.remainingSeconds ?? 0);
      if (data.isPaused) setTimerStatus('paused');
      else setTimerStatus('running');
    };

    const handlePlayerUpdate = () => {
      refetchPlayers();
    };

    const handleTeamUpdate = () => {
      refetchTeams();
    };

    // teams:updated — emitted by auto-creation & updateOwnTeam with the full updated team document
    const handleSingleTeamUpdate = (updatedTeam) => {
      if (!updatedTeam) { refetchTeams(); return; }
      setTeams(prev => {
        const withId = { ...updatedTeam, id: updatedTeam._id || updatedTeam.id };
        const exists = prev.some(t => String(t._id || t.id) === String(withId._id || withId.id));
        if (exists) {
          return prev.map(t =>
            String(t._id || t.id) === String(withId._id || withId.id) ? { ...t, ...withId } : t
          );
        }
        // New team — prepend
        return [withId, ...prev];
      });
    };

    const handleFreezeToggle = (data) => {
      if (typeof data?.isRegistrationFrozen === 'boolean') {
        setIsRegistrationFrozen(data.isRegistrationFrozen);
      }
    };

    socket.on('auction:state', handleState);
    socket.on('auction:player-launched', handlePlayerLaunched);
    socket.on('auction:completed', handleCompleted);
    socket.on('auction:cancelled', handleCancelled);
    socket.on('auction:paused', handleState);
    socket.on('auction:resumed', handleState);
    socket.on('auction:rollback', handleState);
    socket.on('auction:new-bid', handleState);
    socket.on('auction:timer-update', handleTimerUpdate);
    socket.on('player:updated', handlePlayerUpdate);
    socket.on('team:updated', handleTeamUpdate);
    socket.on('teams:updated', handleSingleTeamUpdate);
    socket.on('registration:freeze-toggled', handleFreezeToggle);
    socket.on('podium:video-control', handleVideoBroadcast);
    socket.on('podium:intro-loop-state', handleIntroLoopState);

    socket.on('bid:error', (data) => {
      triggerToast(data.error || 'Bid rejected by server guardrail', 'error');
    });

    socket.on('bid:blind-success', (data) => {
      triggerToast(`Sealed blind bid of ${formatCurrency(data.amount)} registered on server!`, 'success');
    });

    return () => {
      socket.off('auction:state', handleState);
      socket.off('auction:player-launched', handlePlayerLaunched);
      socket.off('auction:completed', handleCompleted);
      socket.off('auction:cancelled', handleCancelled);
      socket.off('auction:paused', handleState);
      socket.off('auction:resumed', handleState);
      socket.off('auction:rollback', handleState);
      socket.off('auction:new-bid', handleState);
      socket.off('auction:timer-update', handleTimerUpdate);
      socket.off('player:updated', handlePlayerUpdate);
      socket.off('team:updated', handleTeamUpdate);
      socket.off('teams:updated', handleSingleTeamUpdate);
      socket.off('registration:freeze-toggled', handleFreezeToggle);
      socket.off('podium:video-control', handleVideoBroadcast);
      socket.off('podium:intro-loop-state', handleIntroLoopState);
      socket.off('bid:error');
      socket.off('bid:blind-success');
    };
  }, [socket, formatCurrency, refetchPlayers, refetchTeams]);

  // Fallback Countdown Timer if socket offline
  useEffect(() => {
    if (isConnected) return;
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
      api.post('/podium/launch-player', { playerId: player.id || player._id, duration, mode: mode.toUpperCase() }).catch(() => { });
    }
    triggerToast(`Pushed ${player.name} to Live Podium (${mode.toUpperCase()} mode)`, 'success');
  };

  const pauseTimer = () => {
    setTimerStatus('paused');
    if (socket && isConnected) api.post('/podium/pause').catch(() => { });
    triggerToast('Auction Timer PAUSED', 'warning');
  };

  const resumeTimer = () => {
    setTimerStatus('running');
    if (socket && isConnected) api.post('/podium/resume').catch(() => { });
    triggerToast('Auction Timer RESUMED', 'info');
  };

  const rollbackBid = () => {
    if (socket && isConnected) api.post('/podium/rollback').catch(() => { });
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
    if (socket && isConnected) api.post('/podium/force-sell').catch(() => { });

    setPlayers(prev => prev.map(p => p.id === podiumPlayer.id ? { ...p, status: 'sold', soldPrice: currentBid } : p));
    setTimerStatus('ended');
    triggerToast(`HAMMER DOWN! ${podiumPlayer.name} SOLD to ${highestBidder.name} for ${formatCurrency(currentBid)}!`, 'success');
  };

  const cancelAuction = () => {
    if (socket && isConnected) api.post('/podium/cancel').catch(() => { });
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

  // --- CONFIG CRUD WITH REAL API CALLS ---
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
      const data = res.data?.data || res.data || res;
      setBiddingTiers(prev => prev.map(t => (t.id === id || t._id === id) ? { ...t, ...data } : t));
      triggerToast('Bidding tier updated successfully', 'success');
    } catch (err) {
      setBiddingTiers(prev => prev.map(t => (t.id === id || t._id === id) ? { ...t, ...updated } : t));
      triggerToast('Bidding tier updated (local)', 'info');
    }
  };

  return (
    <AuctionContext.Provider
      value={{
        sessions, positions, categories, biddingTiers, isRegistrationFrozen, setIsRegistrationFrozen,
        addSession, deleteSession, addPosition, deletePosition, addCategory, deleteCategory, updateBiddingTier,
        teams, setTeams, players, setPlayers, managers, setManagers, isDataLoading, loadManagers, refetchPlayers, refetchTeams, loadAllData,
        podiumPlayer, currentBid, highestBidder, biddingMode, timerDuration, timerRemaining, timerStatus, bidHistory, lastActionToast,
        broadcastVideoUrl, introLoopState,
        formatCurrency, calculateNextBidAmount, getLowestCategoryBasePrice,
        pushToPodium, pauseTimer, resumeTimer, rollbackBid, hammerSell, cancelAuction, placeNormalBid, placeBlindBid, triggerToast
      }}
    >
      {children}
    </AuctionContext.Provider>
  );
};

export const useAuction = () => useContext(AuctionContext);
