import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX, Radio, Trophy, Clock, Flame, Wifi, WifiOff } from 'lucide-react';
import { useAuction } from '../../context/AuctionContext';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import {
  PlayerDisplayStage,
} from '../../components/auction';
import { useAuctionAnimation } from '../../hooks/useAuctionAnimation';
import { playerFallback } from '../../utils/playerFallback';
import Navbar from '../../components/Navbar';

export default function PublicLiveView() {
  const {
    teams = [],
    podiumPlayer,
    currentBid = 0,
    highestBidder,
    biddingMode = 'normal',
    timerRemaining = 0,
    timerStatus = 'idle',
    bidHistory = [],
    formatCurrency = (value) => `${value || 0} BDT`,
  } = useAuction();

  const { socket, isConnected } = useSocket();
  const { user } = useAuth();
  const {
    animState,
    introPlayer,
    winnerData,
    rosterUpdate,
    ANIM_STATES,
    onAnimationComplete,
  } = useAuctionAnimation();

  const [soundEnabled, setSoundEnabled] = useState(true);

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

  const showWaiting = !podiumPlayer && timerStatus === 'idle' && animState === ANIM_STATES.IDLE;
  const isUrgent = animState === ANIM_STATES.LAST5 || (timerRemaining <= 5 && timerStatus === 'running');

  return (
    <div className="min-h-screen flex flex-col bg-darkBg text-slate-100 relative overflow-hidden">
      {!user && <Navbar />}

      <main
        className={`flex-1 space-y-6 ${!user ? 'max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6' : ''}`}
      >
        <div className="glass-card rounded-2xl p-4 border border-slate-800 flex items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-blue-950/30 to-slate-900">
          <div className="flex items-center space-x-3 min-w-0">
            <span className="relative flex h-3 w-3 flex-shrink-0">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isConnected ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              <span className={`relative inline-flex rounded-full h-3 w-3 ${isConnected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            </span>
            <span className="text-xs font-black uppercase tracking-widest text-emerald-400 flex items-center gap-1.5">
              <Radio className="w-4 h-4 text-emerald-400" /> LIVE STADIUM BROADCAST
            </span>
            <span className={`hidden sm:flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${isConnected
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              }`}>
              {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {isConnected ? 'WS LIVE' : 'RECONNECTING'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setSoundEnabled((enabled) => !enabled)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-xs font-bold rounded-xl border border-slate-700 transition flex-shrink-0"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            <span className="hidden sm:inline">{soundEnabled ? 'Audio FX Enabled' : 'Audio Muted'}</span>
          </button>
        </div>

        {/* One continuous premium broadcast panel — the cinematic stage, the
            live auction information, and the bid ledger all live inside a
            SINGLE glass card, separated by smooth dividers. No detached columns
            and no empty gap beneath the animation. */}
        <motion.div
          className="glass-card rounded-3xl border overflow-hidden bg-gradient-to-b from-slate-900/90 via-slate-900 to-blue-950/20 shadow-2xl"
          animate={{
            borderColor: isUrgent ? 'rgba(244,63,94,0.6)' : 'rgba(30,41,59,1)',
            boxShadow: isUrgent
              ? '0 0 40px rgba(244,63,94,0.25)'
              : '0 25px 50px -12px rgba(0,0,0,0.5)',
          }}
          transition={{ duration: 0.4 }}
        >
          {/* Shared confined Player Display stage — the premium cinematic
              surface. Collapses flush during LIVE so the auction info sits
              directly beneath it with no reserved gap. */}
          <PlayerDisplayStage
            className="rounded-none"
            cinematicHeight="min-h-[480px] sm:min-h-[620px] lg:min-h-[720px]"
            animState={animState}
            ANIM_STATES={ANIM_STATES}
            introPlayer={introPlayer}
            winnerData={winnerData}
            rosterUpdate={rosterUpdate}
            onAnimationComplete={onAnimationComplete}
            showWaiting={showWaiting}
            waitingStats={{ teamsConnected, managersReady }}
          >
          <div className="relative p-6 sm:p-8 space-y-8">
            <AnimatePresence mode="wait">
            {podiumPlayer ? (
              <motion.div
                key="live"
                className="space-y-8"
                initial={{ opacity: 0, scale: 1.06, filter: 'blur(8px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 0.96, filter: 'blur(6px)' }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 border-b border-slate-800 pb-6">
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    <div className="relative flex-shrink-0">
                      <img
                        src={podiumPlayer.imageUrl || podiumPlayer.image || playerFallback('slate')}
                        alt={podiumPlayer.name}
                        className="w-32 h-32 rounded-3xl object-cover border-4 border-emerald-500/50 shadow-2xl"
                      />
                      <span className="absolute -bottom-2 -right-2 px-3 py-1 bg-emerald-400 text-slate-950 font-black text-xs rounded-lg uppercase tracking-wider shadow-lg">
                        {podiumPlayer.category || 'Player'}
                      </span>
                    </div>

                    <div className="space-y-1 text-center sm:text-left">
                      <span className="text-xs font-extrabold text-blue-400 uppercase tracking-widest flex items-center justify-center sm:justify-start gap-1">
                        <Flame className="w-4 h-4 text-amber-400 animate-bounce" /> CURRENT PLAYER ON PODIUM
                      </span>
                      <h1 className="text-3xl sm:text-4xl font-black font-heading text-white">{podiumPlayer.name}</h1>
                      <p className="text-sm text-slate-300 font-semibold">{podiumPlayer.jerseyName}</p>
                      <p className="text-xs text-slate-400 font-mono">
                        Base Opening Price: <strong className="text-emerald-400">{formatCurrency(podiumPlayer.basePrice)}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-center flex-shrink-0">
                    <motion.div
                      className={`relative w-28 h-28 rounded-full flex items-center justify-center border-4 shadow-2xl ${isUrgent ? 'border-rose-500 text-rose-400' : 'border-emerald-500 text-emerald-400'}`}
                      animate={isUrgent
                        ? { scale: [1, 1.08, 1], boxShadow: ['0 0 0 rgba(244,63,94,0)', '0 0 28px rgba(244,63,94,0.7)', '0 0 0 rgba(244,63,94,0)'] }
                        : { scale: 1 }}
                      transition={isUrgent ? { duration: 1, repeat: Infinity } : { duration: 0.3 }}
                      style={{ willChange: 'transform' }}
                    >
                      <span className="text-4xl font-black font-mono">{timerRemaining}s</span>
                    </motion.div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                      Mode: <strong className="text-white uppercase">{biddingMode}</strong>
                    </span>
                  </div>
                </div>

                <div className="bg-slate-950/90 border-2 border-emerald-500/40 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl">
                  <div className="text-center sm:text-left">
                    <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">HIGHEST BID AMOUNT</span>
                    <h2 className="text-4xl sm:text-5xl font-black font-mono text-emerald-400 mt-1">
                      {formatCurrency(currentBid)}
                    </h2>
                  </div>

                  <div className="text-center sm:text-right">
                    <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">LEADING FRANCHISE</span>
                    <div className="flex items-center gap-3 mt-1 justify-center sm:justify-end">
                      <span className="text-3xl">{highestBidder ? highestBidder.logo : '--'}</span>
                      <span className="text-xl font-black text-white">{highestBidder ? highestBidder.name : 'Opening / Base'}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="standby"
                className="text-center py-24 space-y-4"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.04, filter: 'blur(6px)' }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              >         
                
              </motion.div>
            )}
            </AnimatePresence>
          </div>
          </PlayerDisplayStage>

          {/* Live Bid Ledger — same continuous panel, separated by a divider. */}
          <div className="border-t border-slate-800/80 p-6 sm:p-8 space-y-4">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" /> Live Bid Ledger
              </h3>
              <p className="text-[11px] text-slate-400">Real-time audited auction bid stream</p>
            </div>

            <div className="max-h-[320px] overflow-y-auto space-y-3 pr-1">
              {safeBidHistory.length === 0 ? (
                <div className="text-center py-16 text-slate-500 text-xs">No bids logged in ledger yet.</div>
              ) : (
                safeBidHistory.slice().reverse().map((log, index) => (
                  <div
                    key={log.id || `${log.bidder}-${log.amount}-${index}`}
                    className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-xl flex items-center justify-between gap-3 hover:border-emerald-500/30 transition"
                  >
                    <div className="min-w-0">
                      <p className="font-extrabold text-xs text-white truncate">{log.bidder || 'Unknown Team'}</p>
                      <span className="text-[10px] text-slate-500">{log.time || '--'} &bull; {log.type || 'Normal'}</span>
                    </div>
                    <span className="font-mono font-black text-sm text-emerald-400 flex-shrink-0">
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
