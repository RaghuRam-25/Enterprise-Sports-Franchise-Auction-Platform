import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Play, Pause, RotateCcw, XCircle, Gavel, Search, Settings2, ShieldAlert, Shuffle, SkipForward } from 'lucide-react';
import { useAuction } from '../../context/AuctionContext';
import { useSocket } from '../../context/SocketContext';
import api from '../../services/api';
import {
  WaitingAnimation,
  PlayerRevealAnimation,
  WinnerAnimation,
  RosterAnimation,
} from '../../components/auction';
import FullscreenWrapper from '../../components/auction/FullscreenWrapper';
import EmbeddedVideoPlayer from '../../components/auction/EmbeddedVideoPlayer';
import { useAuctionAnimation } from '../../hooks/useAuctionAnimation';
import { playerFallback } from '../../utils/playerFallback';
import { getImageUrl } from '../../utils/imageUrl';
import { AnimatePresence } from 'framer-motion';
export const PodiumDashboard = () => {
  const {
    players,
    podiumPlayer,
    currentBid,
    highestBidder,
    biddingMode,
    timerRemaining,
    timerStatus,
    bidHistory,
    pushToPodium,
    pauseTimer,
    resumeTimer,
    rollbackBid,
    hammerSell,
    broadcastVideoUrl,
    videoBroadcastState,
    introLoopState,
    cancelAuction,
    formatCurrency,
    triggerToast
  } = useAuction();

  const {
    animState,
    introPlayer,
    winnerData,
    rosterUpdate,
    ANIM_STATES,
    onAnimationComplete,
  } = useAuctionAnimation();

  const { socket } = useSocket();
  const [displayVideoUrl, setDisplayVideoUrl] = useState(null);
  const [isIntroLoopActive, setIsIntroLoopActive] = useState(false);
  const introLoopIntervalRef = useRef(null);
  const introLoopTimeoutRef = useRef(null);

  // Refs to hold the current value of podiumPlayer and displayVideoUrl for use
  // inside the intro loop's setInterval callback, preventing stale closures
  // without adding them to the useEffect dependency array.
  const podiumPlayerRef = useRef(podiumPlayer);
  podiumPlayerRef.current = podiumPlayer;
  const displayVideoUrlRef = useRef(displayVideoUrl);
  displayVideoUrlRef.current = displayVideoUrl;

  // Derived unsold-player list — memoized on `players` so the array reference
  // stays STABLE across renders. Without this, `unsoldPlayers` was a brand
  // new array every render, which made the intro-loop effect below (whose
  // dependency array includes `unsoldPlayers`) tear down and re-run on every
  // unrelated re-render (e.g. every timer tick), repeatedly re-triggering
  // `showNextPlayer()` and restarting the on-screen animation.
  // This is also computed BEFORE any effect references it — previously
  // `unsoldPlayers` was declared far below the intro-loop effect that used
  // it, which threw "Cannot access 'unsoldPlayers' before initialization"
  // (temporal dead zone) and crashed the component on mount.
  const safePlayers = Array.isArray(players) ? players : [];
  const unsoldPlayers = useMemo(
    () =>
      safePlayers.filter((p) => {
        const st = (p.status || '').toLowerCase();
        return st === 'approved' || st === 'unsold';
      }),
    [safePlayers]
  );

  const handleIntroLoopAnimationComplete = useCallback(() => {
    // When an intro animation finishes during the loop, we cancel it
    // to clear the podium for the next player in the sequence.
    if (isIntroLoopActive) {
      cancelAuction();
    }
  }, [isIntroLoopActive, cancelAuction]);

  useEffect(() => {
    if (!socket) return;

    const handleSetVideo = (data) => {
      setDisplayVideoUrl(data.url);
      // Stop intro loop if a video is played
      if (data.url && isIntroLoopActive) {
        setIsIntroLoopActive(false);
      }
    };

    const handleIntroLoopControl = ({ action, durationMinutes }) => {
      if (action === 'start') {
        if (!isIntroLoopActive) {
          setIsIntroLoopActive(true);
          // Set a timeout to stop the loop
          if (durationMinutes) {
            if (introLoopTimeoutRef.current) clearTimeout(introLoopTimeoutRef.current);
            introLoopTimeoutRef.current = setTimeout(() => {
              setIsIntroLoopActive(false);
              socket.emit('podium:intro-loop-status', { isLooping: false });
            }, durationMinutes * 60 * 1000);
          }
          socket.emit('podium:intro-loop-status', { isLooping: true });
        }
      } else { // stop
        setIsIntroLoopActive(false);
        socket.emit('podium:intro-loop-status', { isLooping: false });
      }
    };

    const handleGetIntroLoopStatus = () => {
      socket.emit('podium:intro-loop-status', { isLooping: isIntroLoopActive });
    };

    socket.on('podium:video-control', handleSetVideo);
    socket.on('podium:intro-loop-control', handleIntroLoopControl);
    socket.on('podium:get-intro-loop-status', handleGetIntroLoopStatus);

    return () => {
      socket.off('podium:video-control', handleSetVideo);
      socket.off('podium:intro-loop-control', handleIntroLoopControl);
      socket.off('podium:get-intro-loop-status', handleGetIntroLoopStatus);
    };
  }, [socket, isIntroLoopActive]);

  // Effect for managing the intro loop
  useEffect(() => {
    const cleanup = () => {
      if (introLoopIntervalRef.current) clearInterval(introLoopIntervalRef.current);
      if (introLoopTimeoutRef.current) clearTimeout(introLoopTimeoutRef.current);
      introLoopIntervalRef.current = null;
      introLoopTimeoutRef.current = null;
    };

    if (isIntroLoopActive) {
      const categoryOrder = ['Icon Category', 'A Grade', 'B Grade', 'Emerging Youth'];
      const sortedUnsold = [...unsoldPlayers].sort((a, b) => (categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category)));

      if (sortedUnsold.length === 0) {
        triggerToast('No unsold players to start intro loop.', 'warning');
        setIsIntroLoopActive(false);
        if (socket) socket.emit('podium:intro-loop-status', { isLooping: false });
        return cleanup;
      }

      let currentPlayerIndex = 0;
      const showNextPlayer = () => {
        // Use refs to get the latest values inside the interval callback
        if (podiumPlayerRef.current || displayVideoUrlRef.current) return;
        const playerToShow = sortedUnsold[currentPlayerIndex];
        // Use a duration longer than the animation. It will be cancelled by onComplete anyway.
        pushToPodium(playerToShow, 20, 'normal');
        currentPlayerIndex = (currentPlayerIndex + 1) % sortedUnsold.length;
      };

      const animationCycleTime = 16000; // PlayerRevealAnimation is ~15s. This provides a 1s buffer.
      // Immediately show the first player if the podium is clear
      if (!podiumPlayerRef.current && !displayVideoUrlRef.current) {
        showNextPlayer();
      }
      introLoopIntervalRef.current = setInterval(showNextPlayer, animationCycleTime);
    } else {
      cleanup();
    }

    return cleanup;
  }, [isIntroLoopActive, unsoldPlayers, pushToPodium, triggerToast, socket]);

  const getCategoryStyles = (category) => {
    switch (category) {
      case 'Icon Category':
        return {
          card: 'bg-amber-950/50 border-amber-700/50 hover:border-amber-500/70',
          text: 'group-hover:text-amber-400',
        };
      case 'A Grade':
        return {
          card: 'bg-blue-950/50 border-blue-800/60 hover:border-blue-600/70',
          text: 'group-hover:text-blue-400',
        };
      case 'B Grade':
        return {
          card: 'bg-teal-950/50 border-teal-800/50 hover:border-teal-600/70',
          text: 'group-hover:text-teal-400',
        };
      case 'Emerging Youth':
        return {
          card: 'bg-purple-950/50 border-purple-800/50 hover:border-purple-600/70',
          text: 'group-hover:text-purple-400',
        };
      default:
        return {
          card: 'bg-slate-900/70 border-slate-800 hover:border-slate-600',
          text: 'group-hover:text-slate-300',
        };
    }
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');
  const [selectedPositionFilter, setSelectedPositionFilter] = useState('ALL');

  // Config settings for Launchpad
  const [customDuration, setCustomDuration] = useState(60);
  const [targetMode, setTargetMode] = useState('normal');

  const filteredUnsold = unsoldPlayers.filter(p => {
    const pName = p.name || '';
    const pStudentId = p.studentId || '';
    const matchesSearch = pName.toLowerCase().includes(searchQuery.toLowerCase()) || pStudentId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategoryFilter === 'ALL' || p.category === selectedCategoryFilter;
    const matchesPos = selectedPositionFilter === 'ALL' || p.primaryPosition === selectedPositionFilter || p.positions?.includes(selectedPositionFilter);
    return matchesSearch && matchesCat && matchesPos;
  });

  const handlePushPlayer = (player) => {
    pushToPodium(player, Number(customDuration), targetMode);
  };

  const handleSelectRandom = () => {
    if (filteredUnsold.length === 0) {
      triggerToast('No unsold players available for random selection.', 'warning');
      return;
    }
    const randomIdx = Math.floor(Math.random() * filteredUnsold.length);
    const randomPlayer = filteredUnsold[randomIdx];
    pushToPodium(randomPlayer, Number(customDuration), targetMode);
    api.post('/podium/select-unsold', { playerId: randomPlayer.id || randomPlayer._id }).catch(() => { });
  };

  const handleMoveNext = () => {
    if (unsoldPlayers.length === 0) {
      triggerToast('No more unsold players remaining.', 'warning');
      return;
    }
    const nextPlayer = unsoldPlayers[0];
    pushToPodium(nextPlayer, Number(customDuration), targetMode);
    api.post('/podium/move-next').catch(() => { });
  };

  return (
    <div className="space-y-6">
      {/* Main Grid: Unsold Pool vs Control Deck */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column: Unsold Player Pool */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800 flex flex-col h-[650px] lg:h-[calc(100vh-8.5rem)] space-y-2 lg:sticky lg:top-2">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Search className="w-4 h-4 text-blue-400" /> Unsold Player Pool ({unsoldPlayers.length})
            </h3>
            <p className="text-[11px] text-slate-400">Offline lottery selection pool</p>
          </div>

          {/* Search and Filters */}
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Search unsold by name..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="glass-input w-full px-3.5 py-2 rounded-xl text-xs"
            />

            <div className="grid grid-cols-2 gap-2">
              <select
                value={selectedCategoryFilter}
                onChange={e => setSelectedCategoryFilter(e.target.value)}
                className="glass-input px-2 py-1.5 rounded-lg text-[11px] text-slate-300"
              >
                <option value="ALL">All Categories</option>
                <option value="Icon Category">Icon Category</option>
                <option value="A Grade">A Grade</option>
                <option value="B Grade">B Grade</option>
                <option value="Emerging Youth">Emerging Youth</option>
              </select>

              <select
                value={selectedPositionFilter}
                onChange={e => setSelectedPositionFilter(e.target.value)}
                className="glass-input px-2 py-1.5 rounded-lg text-[11px] text-slate-300"
              >
                <option value="ALL">All Positions</option>
                <option value="pos-1">Striker (ST)</option>
                <option value="pos-2">Goalkeeper (GK)</option>
                <option value="pos-6">Center Back (CB)</option>
                <option value="pos-7">All-Rounder (ALL)</option>
              </select>
            </div>
          </div>

          {/* Scrollable Player List */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {filteredUnsold.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                No unsold players match search criteria.
              </div>
            ) : (
              filteredUnsold.map(player => {
                const categoryStyles = getCategoryStyles(player.category);
                return (
                  <div
                    key={player.id}
                    className={`border p-3.5 rounded-xl flex items-center justify-between transition-colors group ${categoryStyles.card}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img src={player.imageUrl || playerFallback('slate')} alt="" className="w-10 h-10 rounded-full object-cover border border-slate-700 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className={`font-extrabold text-xs text-white truncate transition ${categoryStyles.text}`}>{player.name}</p>
                        <p className="text-[11px] text-slate-400">
                          {player.jerseyName} &bull; <span className="text-emerald-400 font-mono font-bold">{formatCurrency(player.basePrice)}</span>
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handlePushPlayer(player)}
                      className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 text-xs font-bold rounded-xl transition shadow"
                    >
                      Push to Podium
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Center & Right Column: Launchpad & Live Podium Control Deck */}
        <div className="lg:col-span-2 space-y-6">

          {/* Launchpad Configuration Box */}
          <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-emerald-400" /> Launchpad Configuration
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950/80 p-4 rounded-xl border border-slate-800">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Time(S):</label>
                <div className="flex items-center gap-2">
                  {[30, 60, 90].map(dur => (
                    <button
                      key={dur}
                      type="button"
                      onClick={() => setCustomDuration(dur)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition ${customDuration === dur
                        ? 'bg-blue-600 text-white border-blue-500'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                        }`}
                    >
                      {dur}s
                    </button>
                  ))}
                  <input
                    type="number"
                    value={customDuration}
                    onChange={e => setCustomDuration(Number(e.target.value))}
                    className="glass-input w-20 px-2 py-1 rounded-lg text-xs font-mono text-center"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Bidding Mode:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTargetMode('normal')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition ${targetMode === 'normal'
                      ? 'bg-emerald-600 text-white border-emerald-500'
                      : 'bg-slate-900 text-slate-400 border-slate-800'
                      }`}
                  >
                    Normal Mode
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetMode('blind')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition ${targetMode === 'blind'
                      ? 'bg-purple-600 text-white border-purple-500'
                      : 'bg-slate-900 text-slate-400 border-slate-800'
                      }`}
                  >
                    Blind Mode
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Launch Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={handleSelectRandom}
                disabled={!!podiumPlayer || unsoldPlayers.length === 0}
                className="py-2.5 px-4 bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-white border border-amber-500/40 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Shuffle className="w-4 h-4" /> Random Lottery Pick
              </button>
              <button
                onClick={handleMoveNext}
                disabled={!!podiumPlayer || unsoldPlayers.length === 0}
                className="py-2.5 px-4 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/40 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <SkipForward className="w-4 h-4" /> Next Player in Queue
              </button>
            </div>
          </div>

          {/* Unified Player Display panel — the cinematic spotlight, live
                control deck, and podium bid log all live inside ONE glass card
                so there is no detached section or empty gap. Every cinematic
                stays confined here; the admin's Unsold Pool sidebar and
                Launchpad remain visible at all times. */}
          <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden bg-gradient-to-b from-slate-900 via-slate-900/90 to-blue-950/20 min-h-[460px] sm:min-h-[540px] lg:min-h-[600px]">
            <FullscreenWrapper>
              <div className="relative h-full">
                {(broadcastVideoUrl || displayVideoUrl) ? (
                  <EmbeddedVideoPlayer
                    url={broadcastVideoUrl || displayVideoUrl}
                    videoStartTime={videoBroadcastState?.videoStartTime}
                    videoState={videoBroadcastState?.videoState}
                    pausedAtPosition={videoBroadcastState?.pausedAtPosition}
                  />
                ) : (introLoopState?.isPlaying || isIntroLoopActive) ? (
                  <div className="relative h-full overflow-hidden rounded-2xl flex items-center justify-center bg-slate-950 p-6">
                    {(() => {
                      const curPlayer = introLoopState?.players?.[introLoopState?.currentIndex] || introPlayer;
                      if (!curPlayer) {
                        return <WaitingAnimation key="podium-intro-wait" inline isActive={true} />;
                      }
                      return (
                        <div key={`podium-intro-${curPlayer._id || curPlayer.id}`} className="text-center space-y-4 max-w-lg mx-auto animate-fade-in">
                          <span className="px-3 py-1 bg-purple-500/20 text-purple-300 border border-purple-500/40 rounded-full text-xs font-bold uppercase tracking-widest">
                            Player Presentation ({ (introLoopState?.currentIndex || 0) + 1 } / { introLoopState?.players?.length || 1 })
                          </span>
                          <div className="relative w-36 h-36 mx-auto rounded-2xl overflow-hidden border-2 border-purple-500/50 shadow-2xl shadow-purple-900/50">
                            <img
                              src={getImageUrl(curPlayer.imageUrl || curPlayer.image, playerFallback('indigo'))}
                              alt={curPlayer.name}
                              className="w-full h-full object-cover object-top"
                            />
                          </div>
                          <div>
                            <h2 className="text-2xl font-black text-white">{curPlayer.name}</h2>
                            <p className="text-xs font-bold text-purple-300 uppercase tracking-wider mt-0.5">{curPlayer.category || curPlayer.role || 'DRAFT PLAYER'}</p>
                          </div>
                          <div className="flex justify-center gap-4 text-xs font-mono bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                            <div><span className="text-slate-500 block text-[10px]">ROLE</span><span className="text-white font-bold">{curPlayer.role || curPlayer.primaryRole || 'N/A'}</span></div>
                            <div className="w-px bg-slate-800" />
                            <div><span className="text-slate-500 block text-[10px]">BASE PRICE</span><span className="text-emerald-400 font-bold">{formatCurrency(curPlayer.basePrice || 1000000)}</span></div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <>
                    {podiumPlayer ? (
                      <div className="relative overflow-hidden p-6 space-y-6 h-full flex flex-col justify-center min-h-[460px] sm:min-h-[540px] lg:min-h-[600px]">

                        {/* Inline cinematic player intro — replaces the detail section in
                    place during the INTRO phase, then self-dismisses to LIVE
                    (socket handler advances the state machine after ~3.5s), at
                    which point the admin control deck below becomes visible. */}
                        <AnimatePresence>
                          {animState === ANIM_STATES.INTRO && introPlayer && (
                            <PlayerRevealAnimation
                              key="podium-inline-reveal"
                              inline
                              player={introPlayer}
                              onComplete={isIntroLoopActive ? handleIntroLoopAnimationComplete : onAnimationComplete}
                              isActive={animState === ANIM_STATES.INTRO}
                            />
                          )}
                        </AnimatePresence>

                        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">

                          {/* Player Info & Photo */}
                          <div className="flex items-center gap-4">
                            <div className="relative">
                              <img
                                src={podiumPlayer.imageUrl || playerFallback('slate')}
                                alt=""
                                className="w-24 h-24 rounded-2xl object-cover border-2 border-emerald-500/40 shadow-xl"
                              />
                              <span className="absolute -bottom-2 -right-2 px-2 py-0.5 bg-emerald-500 text-slate-950 font-bold text-[10px] rounded-md">
                                {podiumPlayer.category}
                              </span>
                            </div>

                            <div className="space-y-1">
                              <span className="text-[11px] font-bold text-blue-400 uppercase tracking-widest">ON THE PODIUM</span>
                              <h2 className="text-2xl font-black font-heading text-white">{podiumPlayer.name}</h2>
                              <p className="text-xs text-slate-300">
                                {podiumPlayer.jerseyName} &bull; <span className="font-mono text-emerald-400">Base: {formatCurrency(podiumPlayer.basePrice)}</span>
                              </p>
                              <p className="text-[11px] text-slate-400 font-mono">ID: {podiumPlayer.studentId} &bull; {podiumPlayer.session}</p>
                            </div>
                          </div>

                          {/* Countdown Timer Display */}
                          <div className="flex flex-col items-center">
                            <div className={`relative w-24 h-24 rounded-full flex items-center justify-center border-4 shadow-xl ${timerRemaining <= 10 ? 'border-rose-500 text-rose-400 animate-pulse' : 'border-emerald-500 text-emerald-400'
                              }`}>
                              <span className="text-3xl font-black font-mono">{timerRemaining}s</span>
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                              Mode: <strong className="text-white">{biddingMode}</strong>
                            </span>
                          </div>

                        </div>

                        {/* Current Highest Bidder Banner */}
                        <div className="bg-slate-950/90 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Current Leading Bid</span>
                            <h3 className="text-2xl font-black font-mono text-emerald-400">{formatCurrency(currentBid)}</h3>
                          </div>

                          <div className="text-right">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Highest Bidder Team</span>
                            <p className="text-sm font-extrabold text-white flex items-center gap-1.5 justify-end">
                              <span>{highestBidder ? highestBidder.logo : '—'}</span>
                              <span>{highestBidder ? highestBidder.name : 'Opening / Base Price'}</span>
                            </p>
                          </div>
                        </div>

                        {/* Dispute Resolution Control Deck (PRD Section 3.B) */}
                        <div className="space-y-2">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" /> Admin Dispute Controls
                          </span>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {/* Pause/Resume */}
                            {timerStatus === 'running' ? (
                              <button
                                onClick={pauseTimer}
                                className="py-3 px-4 bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-white border border-amber-500/40 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow"
                              >
                                <Pause className="w-4 h-4" /> Pause Clock
                              </button>
                            ) : (
                              <button
                                onClick={resumeTimer}
                                className="py-3 px-4 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow"
                              >
                                <Play className="w-4 h-4" /> Resume Clock
                              </button>
                            )}

                            {/* Rollback Bid */}
                            <button
                              onClick={rollbackBid}
                              className="py-3 px-4 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/40 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow"
                            >
                              <RotateCcw className="w-4 h-4" /> Rollback Bid
                            </button>

                            {/* Hammer / Force Sell */}
                            <button
                              onClick={hammerSell}
                              className="py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-2 shadow-lg"
                            >
                              <Gavel className="w-4 h-4" /> HAMMER / SELL
                            </button>

                            {/* Cancel Auction */}
                            <button
                              onClick={cancelAuction}
                              className="py-3 px-4 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow"
                            >
                              <XCircle className="w-4 h-4" /> Cancel Auction
                            </button>
                          </div>
                        </div>

                      </div>
                    ) : (
                      <div className="relative overflow-hidden h-full flex items-center justify-center min-h-[460px] sm:min-h-[540px] lg:min-h-[600px]">
                        {/* Waiting cinematic — confined to THIS Player Details panel only.
                    Navbar + Unsold Player Pool sidebar stay visible; the
                    animation never becomes a full-screen takeover for the admin. */}
                        {timerStatus === 'idle' && animState === 'idle' ? (
                          <WaitingAnimation
                            inline
                            teamsConnected={0}
                            managersReady={0}
                            isActive
                          />
                        ) : (
                          <div className="p-12 text-center space-y-3">
                            <Gavel className="w-12 h-12 text-slate-600 mx-auto" />
                            <h3 className="text-base font-bold text-slate-300">Podium is currently empty</h3>
                            <p className="text-xs text-slate-500 max-w-sm mx-auto">
                              Select an unsold player from the left panel and click "Push to Podium" to start the live bidding timer.
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Inline "SOLD" celebration + roster update — confined to this
                spotlight section (absolute inset-0). Rendered at the section
                level so they remain visible even after podiumPlayer clears on
                sell. The admin's sidebar, launchpad, and bid log stay visible. */}
                    <AnimatePresence>
                      {winnerData && (
                        <WinnerAnimation
                          key="podium-inline-winner"
                          inline
                          winnerData={winnerData}
                          isManagerWinner={false}
                          onComplete={() => { }}
                          isActive={!!winnerData}
                        />
                      )}
                    </AnimatePresence>

                    <AnimatePresence>
                      {rosterUpdate && (
                        <RosterAnimation
                          key="podium-inline-roster"
                          inline
                          rosterUpdate={rosterUpdate}
                          onComplete={() => { }}
                          isActive={!!rosterUpdate}
                        />
                      )}
                    </AnimatePresence>
                  </>
                )}
              </div>
            </FullscreenWrapper>
            {/* end spotlight area */}

            {/* Live Bid Log History — same unified card, divider-separated. */}
            <div className="border-t border-slate-800/80 p-6 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Live Podium Bid Log</h4>
              <div className="max-h-48 overflow-y-auto space-y-2 text-xs">
                {bidHistory.length === 0 ? (
                  <p className="text-slate-500 text-center py-4">No bids logged yet.</p>
                ) : (
                  bidHistory.map((log) => (
                    <div key={log.id} className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{log.bidder}</span>
                        <span className="text-[10px] text-slate-400">({log.type})</span>
                      </div>
                      <div className="flex items-center gap-3 font-mono">
                        <span className="text-emerald-400 font-bold">{formatCurrency(log.amount)}</span>
                        <span className="text-[10px] text-slate-500">{log.time}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          {/* end unified Player Display panel */}

        </div>

      </div>

      {/* ════════════════════════════════════════════════════════
            ANIMATION OVERLAYS
            ════════════════════════════════════════════════════════ */}

      {/* Player Reveal, Waiting, Winner, and Roster are ALL rendered inline
            inside the spotlight section above — no cinematic on this page ever
            takes over the whole screen. The admin's Unsold Pool sidebar,
            Launchpad, and bid log remain visible throughout. */}

    </div>
  );
};