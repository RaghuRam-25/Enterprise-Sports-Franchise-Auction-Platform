import { useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX, Radio, Trophy, Clock, Flame, Wifi, WifiOff } from 'lucide-react';
import { useAuction } from '../../context/AuctionContext';
import { useAuth } from '../../context/AuthContext';
import { usePhase } from '../../context/PhaseContext';
import { useSocket } from '../../context/SocketContext';
import {
  PlayerDisplayStage,
} from '../../components/auction';
import { useAuctionAnimation } from '../../hooks/useAuctionAnimation';
import { playerFallback } from '../../utils/playerFallback';
import { getImageUrl } from '../../utils/imageUrl';
import Navbar from '../../components/Navbar';
import WaitingForAuction from '../../components/WaitingForAuction';
import SoundToggle from '../../components/SoundToggle';
import { WaitingAnimation } from '../../components/auction';
import LandingLiveStageCard from '../../components/LandingLiveStageCard';

export default function PublicLiveView() {
  const {
    teams = [],
    categories = [],
    podiumPlayer,
    currentBid = 0,
    highestBidder,
    biddingMode = 'normal',
    timerRemaining = 0,
    timerStatus = 'idle',
    bidHistory = [],
    broadcastVideoUrl,
    formatCurrency = (value) => `${value || 0} BDT`,
  } = useAuction();

  const { socket, isConnected } = useSocket();
  const { user } = useAuth();
  const { auctionStartTime, phase, isAuctionActive } = usePhase();
  const {
    animState,
    introPlayer,
    winnerData,
    rosterUpdate,
    ANIM_STATES,
    onAnimationComplete,
  } = useAuctionAnimation();

  const safeTeams = useMemo(() => (Array.isArray(teams) ? teams : []), [teams]);
  const safeBidHistory = Array.isArray(bidHistory) ? bidHistory : [];
  const teamsConnected = safeTeams.length;
  const managersReady = useMemo(
    () => safeTeams.filter((team) => !!team.managerId).length,
    [safeTeams]
  );

  useEffect(() => {
    if (socket && isConnected) {
      socket.emit('auction:sync-request');
    }
  }, [socket, isConnected]);

  const showWaiting = !podiumPlayer && animState === ANIM_STATES.IDLE;
  const isUrgent = animState === ANIM_STATES.LAST5 || (timerRemaining <= 5 && timerStatus === 'running');

  return (
    // Full-viewport live auction surface — the page itself NEVER scrolls.
    // Standalone (no login): owns its navbar inside the h-dvh shell; when
    // rendered inside DashboardLayout it fills the layout's flex column.
    <div className={`${user ? 'h-full' : 'h-dvh'} flex flex-col bg-darkBg text-primaryText relative overflow-hidden`}>
      {!user && <Navbar />}

      <main
        className={`flex-1 min-h-0 min-w-0 w-full ${!user ? 'max-w-7xl mx-auto px-2.5 sm:px-4 lg:px-6 py-2 sm:py-3' : ''}`}
      >
        <motion.div
          className="h-full min-h-0 glass-card rounded-2xl sm:rounded-3xl border overflow-hidden bg-gradient-to-b from-cardBg/90 via-cardBg to-successGreen/20 shadow-2xl flex flex-col"
          animate={{
            borderColor: isUrgent ? 'rgba(255,92,92,0.6)' : 'rgba(16,16,16,1)',
            boxShadow: isUrgent
              ? '0 0 40px rgba(255,92,92,0.25)'
              : '0 25px 50px -12px rgba(0,0,0,0.5)',
          }}
          transition={{ duration: 0.4 }}
        >
          {/* Body — stage (~72%) + Live Bid Ledger (~28%) side-by-side on
              desktop. On tablet/mobile the podium comes first and the ledger
              stacks below; THIS region is the page's only scrollable section. */}
          <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-2 p-1.5 sm:p-2 overflow-y-auto lg:overflow-visible custom-scrollbar">

            {/* ── LEFT (~72%) — Podium Display / Live Auction stage ── */}
            <div className="relative min-h-[380px] sm:min-h-[440px] lg:min-h-0 lg:flex-[72] min-w-0">
              {/* Broadcast badge + sound — anchored to the stage corners so
                  they never create extra bars or blank space */}
              {Boolean(broadcastVideoUrl) && (
                <div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 z-40">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#050505]/85 backdrop-blur-md border border-red-500/60 text-red-400 text-[10px] font-mono font-black tracking-widest uppercase">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    Live Broadcast
                  </span>
                </div>
              )}
              <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 z-40">
                <SoundToggle iconClassName="w-3.5 h-3.5 sm:w-4 sm:h-4" className="!p-1.5 sm:!p-2" />
              </div>

              <PlayerDisplayStage
                className="rounded-xl"
                fillHeight
                transparentBg
                showLeaderboard={false}
                cinematicHeight="min-h-[260px] sm:min-h-[320px]"
                animState={animState}
                ANIM_STATES={ANIM_STATES}
                introPlayer={introPlayer}
                winnerData={winnerData}
                rosterUpdate={rosterUpdate}
                onAnimationComplete={onAnimationComplete}
                showWaiting={showWaiting}
                waitingStats={{ teamsConnected, managersReady }}
              >
                {podiumPlayer && (
                  <LandingLiveStageCard
                    player={podiumPlayer}
                    currentBid={currentBid}
                    highestBidder={highestBidder}
                    timerRemaining={timerRemaining}
                    timerStatus={timerStatus}
                    mode="spectator"
                    fitContainer
                    categories={categories}
                    formatCurrency={formatCurrency}
                  />
                )}
              </PlayerDisplayStage>
            </div>

            {/* ── RIGHT (~28%) — Live Bid Ledger ── */}
            <aside className="w-full lg:w-auto lg:max-w-[320px] xl:max-w-[360px] lg:flex-[28] min-w-0 flex flex-col rounded-xl sm:rounded-2xl border border-cardBorder/80 bg-black/30 min-h-0">
              <div className="flex-none px-3 sm:px-3.5 pt-2.5 pb-1.5">
                <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-secondaryText flex items-center gap-2">
                  <Clock className="w-4 h-4 text-neonGreen shrink-0" /> Live Bid Ledger
                </h3>
                <p className="text-[10px] text-secondaryText truncate">Real-time audited auction bid stream</p>
              </div>

              {/* THE scrolling section — ledger list scrolls internally only */}
              <div className="flex-1 min-h-0 max-h-56 sm:max-h-64 lg:max-h-none overflow-y-auto custom-scrollbar space-y-2 px-2 sm:px-2.5 pb-2.5">
                {safeBidHistory.length === 0 ? (
                  <div className="text-center py-10 text-mutedText text-xs">No bids logged in ledger yet.</div>
                ) : (
                  safeBidHistory.slice().reverse().map((log, index) => (
                    <div
                      key={log.id || `${log.bidder}-${log.amount}-${index}`}
                      className="bg-darkBg/80 border border-cardBorder p-2.5 rounded-xl flex items-center justify-between gap-3 hover:border-neonGreen/30 transition"
                    >
                      <div className="min-w-0">
                        <p className="font-extrabold text-xs text-white truncate">{log.bidder || 'Unknown Team'}</p>
                        <span className="text-[10px] text-mutedText">{log.time || '--'} &bull; {log.type || 'Normal'}</span>
                      </div>
                      <span className="font-mono font-black text-sm tabular-nums text-neonGreen flex-shrink-0">
                        {formatCurrency(log.amount)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </aside>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
