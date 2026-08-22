import { AnimatePresence, motion } from 'framer-motion';
import WaitingAnimation from './WaitingAnimation';
import PlayerRevealAnimation from './PlayerRevealAnimation';
import WinnerAnimation from './WinnerAnimation';
import RosterAnimation from './RosterAnimation';
import LiveAuctionLeaderboard from './LiveAuctionLeaderboard';
import FullscreenWrapper from './FullscreenWrapper';
import EmbeddedVideoPlayer from './EmbeddedVideoPlayer';
import { useAuction } from '../../context/AuctionContext';
import { playerFallback } from '../../utils/playerFallback';
import { getImageUrl } from '../../utils/imageUrl';

/**
 * PlayerDisplayStage — the single, reusable "Player Details" cinematic surface.
 *
 * This is the shared component required across Podium Admin, Manager/Player,
 * and Spectator / Live Auction views. It is ALWAYS confined to its own
 * container (every child animation renders as an `absolute inset-0` layer via
 * the `inline` prop) — it never goes full-screen, so the surrounding page
 * layout (navbar, sidebar, player list, controls, timer, leaderboard, bids)
 * stays fully visible. Only the surrounding layout differs between views; the
 * cinematic behavior is identical everywhere.
 *
 * The parent supplies the auction-animation state machine values (from
 * useAuctionAnimation) plus the live-bidding UI as `children`. This component
 * decides which cinematic to show for the current phase and renders the live
 * children only once bidding is actually LIVE — it does not own any business
 * logic, sockets, timers, or RBAC. Contract:
 *
 * Props:
 *   - animState:        current ANIM_STATES value (from useAuctionAnimation)
 *   - ANIM_STATES:      the enum object (from useAuctionAnimation)
 *   - introPlayer:      player object for the INTRO reveal
 *   - winnerData:       { player, team, price } for the SELL celebration
 *   - rosterUpdate:     { player, team, price } for the ROSTER stage
 *   - onAnimationComplete: () => void  (advances the state machine)
 *   - isManagerWinner:  boolean (Manager view highlights own wins)
 *   - waitingStats:     { teamsConnected, managersReady } for the idle scene
 *   - showWaiting:      boolean — parent decides when the idle/waiting scene
 *                       is appropriate (usually: no podium player + idle)
 *   - children:         the view's own LIVE bidding UI (shown during LIVE)
 *   - className:        optional extra classes for the positioned container
 *
 * IMPORTANT: the container MUST be positioned (this component adds `relative`)
 * so the confined `absolute inset-0` overlays fill exactly this box.
 */
export default function PlayerDisplayStage({
  animState,
  ANIM_STATES,
  introPlayer,
  winnerData,
  rosterUpdate,
  onAnimationComplete,
  isManagerWinner = false,
  waitingStats = {},
  showWaiting = false,
  showLeaderboard = true,
  children,
  className = '',
  // Responsive broadcast height reserved for the cinematic surface. It is
  // applied ONLY while a scene is actually playing; during LIVE bidding the
  // surface collapses so the live content sits flush beneath it — no empty gap.
  cinematicHeight = 'min-h-[440px] sm:min-h-[520px] lg:min-h-[600px]',
}) {
  // Pull global broadcast state so every view renders the same overlay simultaneously
  const { broadcastVideoUrl, videoBroadcastState, introLoopState, systemAuctionState, hasStartedAuction } = useAuction();

  const isIntro = animState === ANIM_STATES?.INTRO && !!introPlayer;
  const isSell = animState === ANIM_STATES?.SELL && !!winnerData;
  const isRoster = animState === ANIM_STATES?.ROSTER && !!rosterUpdate;

  // A cinematic owns the surface whenever one of the confined scenes is active.
  const cinematicActive = showWaiting || isIntro || isSell || isRoster;

  // Broadcast overlay takes priority ONLY when in LIVE_BROADCAST or CLOSING_BROADCAST state,
  // or when no player has been pushed to the auction yet. During an active auction, broadcast video is hidden.
  const isBroadcastingVideo = Boolean(broadcastVideoUrl) && (
    systemAuctionState === 'LIVE_BROADCAST' ||
    systemAuctionState === 'CLOSING_BROADCAST' ||
    !hasStartedAuction
  );
  const isBroadcastingIntro = introLoopState?.isPlaying && introLoopState?.players?.length > 0 && !isBroadcastingVideo;
  const hasBroadcastOverlay = isBroadcastingVideo || isBroadcastingIntro;

  const currentIntroPlayer = isBroadcastingIntro
    ? introLoopState.players[introLoopState.currentIndex]
    : null;

  return (
    <div className={`relative ${className} h-full`}>
      {/* Fullscreen toggle is offered ONLY while the Podium Admin's broadcast
          video (Video Control) is playing — every other scene stays inline. */}
      <FullscreenWrapper showToggle={isBroadcastingVideo}>
        <div className="relative h-full flex flex-col">
          <div className="flex-1 relative overflow-hidden rounded-t-2xl">
            {/* Cinematic broadcast surface */}
            <div
              className={`relative overflow-hidden rounded-2xl ${cinematicActive || hasBroadcastOverlay ? `${cinematicHeight} h-full` : 'h-0'
                }`}
              aria-hidden={!cinematicActive && !hasBroadcastOverlay}
            >
              {/* Confined idle / waiting scene */}
              <WaitingAnimation
                inline
                isActive={showWaiting && !hasBroadcastOverlay}
                teamsConnected={waitingStats.teamsConnected || 0}
                managersReady={waitingStats.managersReady || 0}
              />

              {/* Confined player introduction reveal */}
              <PlayerRevealAnimation
                inline
                isActive={isIntro && !hasBroadcastOverlay}
                player={introPlayer}
                onComplete={onAnimationComplete}
              />

              {/* Confined "SOLD" championship celebration */}
              <WinnerAnimation
                inline
                isActive={isSell && !hasBroadcastOverlay}
                winnerData={winnerData}
                isManagerWinner={isManagerWinner}
                onComplete={onAnimationComplete}
              />

              {/* Confined roster-update stage */}
              <RosterAnimation
                inline
                isActive={isRoster && !hasBroadcastOverlay}
                rosterUpdate={rosterUpdate}
                onComplete={onAnimationComplete}
              />

              {/* ── BROADCAST VIDEO OVERLAY ─────────────────────────────────────
                  Shown when Podium Admin plays a YouTube/uploaded video via
                  the Video Control panel. Covers all other stages on every view. */}
              <AnimatePresence>
                {isBroadcastingVideo && (
                  <motion.div
                    key="broadcast-video"
                    className="absolute inset-0 z-30 bg-black rounded-2xl overflow-hidden"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <EmbeddedVideoPlayer
                      url={broadcastVideoUrl}
                      videoStartTime={videoBroadcastState?.videoStartTime}
                      videoState={videoBroadcastState?.videoState}
                      pausedAtPosition={videoBroadcastState?.pausedAtPosition}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── PLAYER INTRO LOOP OVERLAY ───────────────────────────────────
                  Shown when Podium Admin starts the Player Intro Sequence.
                  Players are displayed one-by-one (auto-advancing via backend timer).
                  Order: ICON → A Grade → B Grade → C Grade → D Grade → Remaining. */}
              <AnimatePresence mode="wait">
                {isBroadcastingIntro && !isBroadcastingVideo && currentIntroPlayer && (
                  <motion.div
                    key={`intro-player-${introLoopState.currentIndex}`}
                    className="absolute inset-0 z-20 flex items-center justify-center bg-gradient-to-br from-darkBg via-cardBg to-warningGold/40 rounded-2xl overflow-hidden"
                    initial={{ opacity: 0, scale: 1.04 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                  >
                    {/* Ambient glow */}
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-warningGold/10 rounded-full blur-[80px]" />
                      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-warningGold/10 rounded-full blur-[80px]" />
                    </div>

                    {/* Category badge + sequence position */}
                    <div className="absolute top-4 inset-x-0 flex items-center justify-between px-6 z-10">
                      <span className="px-3 py-1 bg-warningGold/20 border border-warningGold/40 text-warningGold text-[11px] font-bold uppercase tracking-widest rounded-full">
                        {currentIntroPlayer.category || 'B Grade'}
                      </span>
                      <span className="px-3 py-1 bg-cardBg/80 border border-borderStrong text-secondaryText text-[11px] font-mono font-bold rounded-full">
                        {introLoopState.currentIndex + 1} / {introLoopState.players.length}
                        {introLoopState.repeat && ' 🔁'}
                      </span>
                    </div>

                    {/* Central player card */}
                    <div className="relative z-10 flex flex-col items-center gap-5 px-6 text-center max-w-sm w-full">
                      {/* Player photo */}
                      <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.15, duration: 0.5 }}
                        className="relative"
                      >
                        <div className="absolute -inset-3 rounded-full bg-gradient-to-tr from-warningGold/30 via-warningGold/20 to-transparent blur-xl" />
                        <img
                          src={getImageUrl(currentIntroPlayer.imageUrl, playerFallback('indigo'))}
                          alt={currentIntroPlayer.name}
                          className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-2xl object-cover border-2 border-warningGold/60 shadow-2xl"
                        />
                      </motion.div>

                      {/* Player name + info */}
                      <motion.div
                        initial={{ y: 15, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.25, duration: 0.5 }}
                        className="space-y-1.5"
                      >
                        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
                          {currentIntroPlayer.name}
                        </h2>
                        {currentIntroPlayer.jerseyName && (
                          <p className="text-xs font-mono font-bold text-warningGold tracking-widest uppercase">
                            # {currentIntroPlayer.jerseyName}
                          </p>
                        )}
                        <p className="text-sm text-secondaryText font-medium">
                          {currentIntroPlayer.primaryPosition || 'Player'}
                          {currentIntroPlayer.session && ` · ${currentIntroPlayer.session}`}
                        </p>
                      </motion.div>

                      {/* Base price */}
                      <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.35, duration: 0.4 }}
                        className="px-5 py-2.5 bg-darkBg/80 border border-warningGold/30 rounded-2xl"
                      >
                        <span className="block text-[10px] text-mutedText font-bold uppercase tracking-widest">Base Price</span>
                        <span className="block text-xl font-black font-mono text-neonGreen mt-0.5">
                          ৳{(currentIntroPlayer.basePrice || 0).toLocaleString('en-IN')}
                        </span>
                      </motion.div>
                    </div>

                    {/* Progress bar — fills during the player's display window */}
                    <div className="absolute bottom-0 inset-x-0 h-1 bg-cardBg/60 z-10">
                      <motion.div
                        className="h-full bg-gradient-to-r from-warningGold to-urgentRed"
                        initial={{ width: '0%' }}
                        animate={{ width: '100%' }}
                        transition={{
                          duration: introLoopState.durationPerPlayer || 4,
                          ease: 'linear'
                        }}
                      />
                    </div>

                    {/* PAUSED indicator */}
                    {introLoopState.isPaused && (
                      <div className="absolute inset-0 z-40 bg-black/60 flex items-center justify-center rounded-2xl backdrop-blur-sm">
                        <div className="px-6 py-3 bg-warningGold/20 border border-warningGold/40 rounded-2xl text-warningGold font-black text-sm uppercase tracking-widest">
                          ⏸ PAUSED
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* The view's own live-bidding UI. It stays mounted so React/socket state
          is preserved; it is only visually suppressed (overlaid off-screen)
          while a cinematic plays, then smoothly restored in normal flow — no
          layout shift, no remount, and no reserved gap once the scene ends. */}
            <AnimatePresence>
              <div
                className={`transition-opacity duration-500 ease-out ${(cinematicActive || hasBroadcastOverlay) && children // This is a manager view with controls
                    ? 'absolute inset-0 z-10 flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-[:fullscreen]:opacity-100'
                    : (cinematicActive || hasBroadcastOverlay) // This is a spectator view or admin view
                      ? 'pointer-events-none absolute inset-0 select-none opacity-0'
                      : 'relative opacity-100' // Not cinematic, normal view
                  }`}
                aria-hidden={cinematicActive || hasBroadcastOverlay}
              >
                {children}
              </div>
            </AnimatePresence>
          </div>

          {/* Spectator Leaderboard: shown only if cinematic is active, it's NOT a
              manager view (no children), and the page allows it (players opt out). */}
          {(cinematicActive || hasBroadcastOverlay) && !children && showLeaderboard && (
            <div className="h-28 flex-shrink-0">
              <LiveAuctionLeaderboard />
            </div>
          )}
        </div>
      </FullscreenWrapper>
    </div>
  );
}

