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
    <div className="min-h-screen flex flex-col bg-darkBg text-primaryText relative overflow-clip">
      {!user && <Navbar />}

      <main
        className={`flex-1 space-y-6 ${!user ? 'max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6' : ''}`}
      >
        <motion.div
          className="glass-card rounded-3xl border overflow-hidden bg-gradient-to-b from-cardBg/90 via-cardBg to-successGreen/20 shadow-2xl"
          animate={{
            borderColor: isUrgent ? 'rgba(255,92,92,0.6)' : 'rgba(16,16,16,1)',
            boxShadow: isUrgent
              ? '0 0 40px rgba(255,92,92,0.25)'
              : '0 25px 50px -12px rgba(0,0,0,0.5)',
          }}
          transition={{ duration: 0.4 }}
        >
          {/* Global sound on/off — anchored to the stage card, right beside
              the LIVE BROADCAST badge when a broadcast is playing */}
          <div className="relative">
            <div className="absolute top-3 left-3 z-40 flex items-center gap-2">
              {Boolean(broadcastVideoUrl) && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#050505]/85 backdrop-blur-md border border-red-500/60 text-red-400 text-[10px] font-mono font-black tracking-widest uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  Live Broadcast
                </span>
              )}
              <SoundToggle />
            </div>

            <PlayerDisplayStage
            className="rounded-none"
            cinematicHeight="min-h-[480px] sm:min-h-[620px] lg:min-h-[720px]"
            showLeaderboard={user?.role !== 'PLAYER'}
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
              <div className="relative p-2 sm:p-4">
                <LandingLiveStageCard
                  player={podiumPlayer}
                  currentBid={currentBid}
                  highestBidder={highestBidder}
                  timerRemaining={timerRemaining}
                  timerStatus={timerStatus}
                  mode="spectator"
                  categories={categories}
                  formatCurrency={formatCurrency}
                />
              </div>
            )}
            </PlayerDisplayStage>
          </div>

          {/* Live Bid Ledger — same continuous panel, separated by a divider. */}
          <div className="border-t border-cardBorder/80 p-6 sm:p-8 space-y-4">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-secondaryText flex items-center gap-2">
                <Clock className="w-4 h-4 text-neonGreen" /> Live Bid Ledger
              </h3>
              <p className="text-[11px] text-secondaryText">Real-time audited auction bid stream</p>
            </div>

            <div className="max-h-[320px] overflow-y-auto space-y-3 pr-1">
              {safeBidHistory.length === 0 ? (
                <div className="text-center py-16 text-mutedText text-xs">No bids logged in ledger yet.</div>
              ) : (
                safeBidHistory.slice().reverse().map((log, index) => (
                  <div
                    key={log.id || `${log.bidder}-${log.amount}-${index}`}
                    className="bg-darkBg/80 border border-cardBorder p-3.5 rounded-xl flex items-center justify-between gap-3 hover:border-neonGreen/30 transition"
                  >
                    <div className="min-w-0">
                      <p className="font-extrabold text-xs text-white truncate">{log.bidder || 'Unknown Team'}</p>
                      <span className="text-[10px] text-mutedText">{log.time || '--'} &bull; {log.type || 'Normal'}</span>
                    </div>
                    <span className="font-mono font-black text-sm text-neonGreen flex-shrink-0">
                      {formatCurrency(log.amount)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
