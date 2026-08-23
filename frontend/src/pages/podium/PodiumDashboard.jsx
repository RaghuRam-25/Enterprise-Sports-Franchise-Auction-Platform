import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Play, Pause, RotateCcw, XCircle, Gavel, Search, Settings2, ShieldAlert, Shuffle, SkipForward } from 'lucide-react';
import { useAuction } from '../../context/AuctionContext';
import { usePhase } from '../../context/PhaseContext';
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
import { getCategoryTheme } from '../../utils/themeConfig';
import { AnimatePresence } from 'framer-motion';
import LandingLiveStageCard from '../../components/LandingLiveStageCard';
import WaitingForAuction from '../../components/WaitingForAuction';
import SoundToggle from '../../components/SoundToggle';

export const PodiumDashboard = () => {
  const {
    players,
    categories = [],
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
  const { auctionStartTime } = usePhase();
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
    // Full-screen podium control surface — fills the layout viewport exactly.
    // The page itself NEVER scrolls; only the player pool and bid log scroll.
    <div className="h-full min-h-0 flex flex-col gap-2 overflow-hidden">
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-2 overflow-y-auto lg:overflow-visible custom-scrollbar">

        {/* Left Column: Unsold Player Pool — compact side rail */}
        <div className="glass-card rounded-xl sm:rounded-2xl p-2.5 border border-cardBorder w-full lg:w-[290px] xl:w-[330px] lg:flex-none flex flex-col min-h-0 space-y-1.5">
          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-secondaryText flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-neonGreen" /> Unsold Player Pool ({unsoldPlayers.length})
            </h3>
          </div>

          {/* Search and Filters */}
          <div className="space-y-1.5">
            <input
              type="text"
              placeholder="Search unsold by name..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="glass-input w-full px-2.5 py-1.5 rounded-lg text-[11px]"
            />

            <div className="grid grid-cols-2 gap-1.5">
              <select
                value={selectedCategoryFilter}
                onChange={e => setSelectedCategoryFilter(e.target.value)}
                className="glass-input px-1.5 py-1 rounded-lg text-[10px] text-secondaryText"
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
                className="glass-input px-1.5 py-1 rounded-lg text-[10px] text-secondaryText"
              >
                <option value="ALL">All Positions</option>
                <option value="pos-1">Striker (ST)</option>
                <option value="pos-2">Goalkeeper (GK)</option>
                <option value="pos-6">Center Back (CB)</option>
                <option value="pos-7">All-Rounder (ALL)</option>
              </select>
            </div>
          </div>

          {/* Scrollable Player List — fills the entire pool box, scrolls inside */}
          <div className="flex-1 min-h-0 max-h-[46vh] lg:max-h-none overflow-y-auto custom-scrollbar space-y-1.5 pr-0.5">
            {filteredUnsold.length === 0 ? (
              <div className="text-center py-10 text-mutedText text-[11px]">
                No unsold players match search criteria.
              </div>
            ) : (
              filteredUnsold.map(player => {
                // Card tinted by the player's DB-configured category color —
                // every category gets its own distinct look.
                const catColor = getCategoryTheme(player.category, categories)?.stripColor || '#58D20A';
                return (
                  <div
                    key={player.id}
                    className="border p-2.5 rounded-lg flex items-center justify-between transition-colors group gap-2.5"
                    style={{
                      background: `linear-gradient(170deg, ${catColor}1f 0%, rgba(14,15,20,0.92) 70%)`,
                      borderColor: `${catColor}59`,
                    }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={getImageUrl(player.imageUrl, playerFallback('slate'))}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                        style={{ border: `1px solid ${catColor}` }}
                      />
                      <div className="min-w-0">
                        <p className="font-extrabold text-sm text-white truncate transition group-hover:opacity-90">{player.name}</p>
                        <p className="text-[10px] text-secondaryText truncate">{player.jerseyName}</p>
                        <p className="text-[11px] font-mono font-bold tabular-nums truncate" style={{ color: catColor }}>{formatCurrency(player.basePrice)}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => handlePushPlayer(player)}
                      className="w-24 h-9 shrink-0 text-[10px] rounded-lg font-black uppercase tracking-wide transition hover:brightness-110 hover:-translate-y-px shadow-md flex items-center justify-center whitespace-nowrap"
                      style={{
                        backgroundColor: catColor,
                        color: '#050505',
                        boxShadow: `0 0 14px ${catColor}66`,
                      }}
                    >
                      Push to Podium
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: compact Launchpad strip → Live stage → Bid log (bottom) */}
        <div className="flex-1 min-w-0 min-h-0 flex flex-col gap-2">

          {/* Launchpad Configuration — compact single strip */}
          <div className="glass-card flex-none rounded-xl border border-cardBorder px-2.5 py-2 flex flex-wrap items-center gap-x-1.5 gap-y-1.5">
            <h3 className="text-[9px] font-bold uppercase tracking-widest text-secondaryText flex items-center gap-1">
              <Settings2 className="w-3 h-3 text-neonGreen" /> Time
            </h3>

            {/* Time(S) — enlarged boxes */}
            <div className="flex items-center gap-1">
              {[30, 60, 90].map(dur => (
                <button
                  key={dur}
                  type="button"
                  onClick={() => setCustomDuration(dur)}
                  className={`px-4 py-2.5 text-xs font-bold rounded-md border transition ${customDuration === dur
                    ? 'bg-[#58D20A] text-[#050505] border-[#58D20A] shadow-md font-extrabold'
                    : 'btn-secondary !py-2.5 !px-4 !rounded-md'
                    }`}
                >
                  {dur}s
                </button>
              ))}
              <input
                type="number"
                value={customDuration}
                onChange={e => setCustomDuration(Number(e.target.value))}
                className="glass-input w-20 px-2 py-2.5 rounded-md text-xs font-mono text-center"
              />
            </div>

            <span className="w-0.5 h-7 rounded-full bg-borderStrong hidden sm:block" />

            {/* Bidding Mode */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setTargetMode('normal')}
                className={`px-3 py-2 text-[11px] font-bold rounded-md border transition ${targetMode === 'normal'
                  ? 'bg-successGreen text-darkBg border-neonGreen font-extrabold'
                  : 'bg-cardBg text-secondaryText border-cardBorder'
                  }`}
              >
                Normal Mode
              </button>
              <button
                type="button"
                onClick={() => setTargetMode('blind')}
                className={`px-3 py-2 text-[11px] font-bold rounded-md border transition ${targetMode === 'blind'
                  ? 'bg-warningGold text-darkBg border-warningGold font-extrabold'
                  : 'bg-cardBg text-secondaryText border-cardBorder'
                  }`}
              >
                Blind Mode
              </button>
            </div>

            <span className="w-0.5 h-7 rounded-full bg-borderStrong hidden sm:block" />

            {/* Quick Launch */}
            <div className="flex items-center gap-1.5 sm:ml-auto">
              <button
                onClick={handleSelectRandom}
                disabled={!!podiumPlayer || unsoldPlayers.length === 0}
                className="py-2 px-3 bg-warningGold/20 hover:bg-warningGold text-warningGold hover:text-darkBg border border-warningGold/40 rounded-md text-[10px] font-bold transition flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
              >
                <Shuffle className="w-3 h-3" /> Random Lottery Pick
              </button>
              <button
                onClick={handleMoveNext}
                disabled={!!podiumPlayer || unsoldPlayers.length === 0}
                className="py-2 px-3 bg-successGreen/20 hover:bg-successGreen text-neonGreenHover hover:text-darkBg border border-neonGreen/40 rounded-md text-[10px] font-bold transition flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
              >
                <SkipForward className="w-3 h-3" /> Next Player in Queue
              </button>
            </div>
          </div>

          {/* Unified Player Display panel — cinematic spotlight on top,
              Live Podium Bid Log pinned at the BOTTOM of the same card. */}
          <div className="glass-card flex-1 min-h-[380px] sm:min-h-[440px] lg:min-h-0 rounded-xl sm:rounded-2xl border border-cardBorder overflow-hidden bg-gradient-to-b from-cardBg via-cardBg/90 to-successGreen/20 flex flex-col">
            <div className="relative flex-1 min-h-0">
              <FullscreenWrapper showToggle={Boolean(broadcastVideoUrl || displayVideoUrl)}>
                <div className="relative h-full">
                  {/* Global sound on/off — top-right corner of the stage */}
                  <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 z-40">
                    <SoundToggle iconClassName="w-3.5 h-3.5 sm:w-4 sm:h-4" className="!p-1.5 sm:!p-2" />
                  </div>

                  {(broadcastVideoUrl || displayVideoUrl) ? (
                    <EmbeddedVideoPlayer
                      url={broadcastVideoUrl || displayVideoUrl}
                      videoStartTime={videoBroadcastState?.videoStartTime}
                      videoState={videoBroadcastState?.videoState}
                      pausedAtPosition={videoBroadcastState?.pausedAtPosition}
                    />
                  ) : (introLoopState?.isPlaying || isIntroLoopActive) ? (
                    <div className="absolute inset-0 overflow-hidden flex items-center justify-center bg-darkBg p-4">
                      {(() => {
                        const curPlayer = introLoopState?.players?.[introLoopState?.currentIndex] || introPlayer;
                        if (!curPlayer) {
                          return <WaitingAnimation key="podium-intro-wait" inline isActive={true} />;
                        }
                        return (
                          <div key={`podium-intro-${curPlayer._id || curPlayer.id}`} className="text-center space-y-4 max-w-lg mx-auto animate-fade-in">
                            <span className="px-3 py-1 bg-warningGold/20 text-warningGold border border-warningGold/40 rounded-full text-xs font-bold uppercase tracking-widest">
                              Player Presentation ({ (introLoopState?.currentIndex || 0) + 1 } / { introLoopState?.players?.length || 1 })
                            </span>
                            <div className="relative w-36 h-36 mx-auto rounded-2xl overflow-hidden border-2 border-warningGold/50 shadow-2xl shadow-warningGold/50">
                              <img
                                src={getImageUrl(curPlayer.imageUrl, playerFallback('indigo'))}
                                alt={curPlayer.name}
                                className="w-full h-full object-cover object-top"
                              />
                            </div>
                            <div>
                              <h2 className="text-2xl font-black text-white">{curPlayer.name}</h2>
                              <p className="text-xs font-bold text-warningGold uppercase tracking-wider mt-0.5">{curPlayer.category || curPlayer.role || 'DRAFT PLAYER'}</p>
                            </div>
                            <div className="flex justify-center gap-4 text-xs font-mono bg-cardBg/90 p-3 rounded-xl border border-cardBorder">
                              <div><span className="text-mutedText block text-[10px]">ROLE</span><span className="text-white font-bold">{curPlayer.role || curPlayer.primaryRole || 'N/A'}</span></div>
                              <div className="w-px bg-surfaceHover" />
                              <div><span className="text-mutedText block text-[10px]">BASE PRICE</span><span className="text-neonGreen font-bold">{formatCurrency(curPlayer.basePrice || 1000000)}</span></div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    <>
                      {podiumPlayer ? (
                        <div className="h-full min-h-0">

                          {/* Inline cinematic intro overlay */}
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

                          {/* SAME LandingLiveStageCard design as Manager & Landing page.
                              Bottom action row = podium admin controls via podiumControls. */}
                          <LandingLiveStageCard
                            player={podiumPlayer}
                            categories={categories}
                            currentBid={currentBid}
                            highestBidder={highestBidder}
                            timerRemaining={timerRemaining}
                            timerStatus={timerStatus}
                            mode="podium"
                            fitContainer
                            formatCurrency={formatCurrency}
                            podiumControls={
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full">
                                {timerStatus === 'running' ? (
                                  <button
                                    onClick={pauseTimer}
                                    className="py-2.5 px-3 bg-warningGold/20 hover:bg-warningGold text-warningGold hover:text-[#050505] border border-warningGold/40 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1.5"
                                  >
                                    <Pause className="w-3.5 h-3.5" /> Pause
                                  </button>
                                ) : (
                                  <button
                                    onClick={resumeTimer}
                                    className="py-2.5 px-3 bg-[#58D20A]/20 hover:bg-[#58D20A] text-[#58D20A] hover:text-[#050505] border border-[#58D20A]/40 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1.5"
                                  >
                                    <Play className="w-3.5 h-3.5" /> Resume
                                  </button>
                                )}

                                <button
                                  onClick={rollbackBid}
                                  className="py-2.5 px-3 bg-slate-700/50 hover:bg-slate-600 text-slate-300 hover:text-white border border-slate-600/40 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1.5"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" /> Rollback
                                </button>

                                <button
                                  onClick={hammerSell}
                                  className="py-2.5 px-3 bg-[#58D20A] hover:bg-[#68e21a] text-[#050505] rounded-xl text-[11px] font-black transition flex items-center justify-center gap-1.5 shadow-[0_0_20px_rgba(88,210,10,0.4)]"
                                >
                                  <Gavel className="w-3.5 h-3.5" /> SELL
                                </button>

                                <button
                                  onClick={cancelAuction}
                                  className="py-2.5 px-3 bg-red-950/50 hover:bg-red-600 text-red-400 hover:text-white border border-red-700/40 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1.5"
                                >
                                  <XCircle className="w-3.5 h-3.5" /> Cancel
                                </button>
                              </div>
                            }
                          />
                        </div>
                      ) : (
                        <div className="absolute inset-0 overflow-hidden">
                          <WaitingAnimation inline isActive />
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
            </div>
            {/* end spotlight area */}

            {/* Live Podium Bid Log History — stays at the BOTTOM of the stage
                card; the list scrolls internally so it never grows the page. */}
            <div className="flex-none border-t border-cardBorder/80 px-3 py-1.5">
              <h4 className="text-[9px] font-bold uppercase tracking-widest text-secondaryText mb-1">Live Podium Bid Log</h4>
              <div className="max-h-20 sm:max-h-24 overflow-y-auto custom-scrollbar space-y-1 text-[11px]">
                {bidHistory.length === 0 ? (
                  <p className="text-mutedText text-center py-2">No bids logged yet.</p>
                ) : (
                  bidHistory.map((log) => (
                    <div key={log.id} className="bg-cardBg/60 p-1.5 rounded-lg border border-cardBorder/80 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-bold text-white truncate">{log.bidder}</span>
                        <span className="text-[9px] text-secondaryText shrink-0">({log.type})</span>
                      </div>
                      <div className="flex items-center gap-2.5 font-mono shrink-0">
                        <span className="text-neonGreen font-bold tabular-nums">{formatCurrency(log.amount)}</span>
                        <span className="text-[9px] text-mutedText">{log.time}</span>
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