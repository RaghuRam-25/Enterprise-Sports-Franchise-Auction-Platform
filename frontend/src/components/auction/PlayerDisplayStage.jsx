import { AnimatePresence } from 'framer-motion';
import WaitingAnimation from './WaitingAnimation';
import PlayerRevealAnimation from './PlayerRevealAnimation';
import WinnerAnimation from './WinnerAnimation';
import RosterAnimation from './RosterAnimation';

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
  children,
  className = '',
  // Responsive broadcast height reserved for the cinematic surface. It is
  // applied ONLY while a scene is actually playing; during LIVE bidding the
  // surface collapses so the live content sits flush beneath it — no empty gap.
  cinematicHeight = 'min-h-[440px] sm:min-h-[520px] lg:min-h-[600px]',
}) {
  const isIntro = animState === ANIM_STATES?.INTRO && !!introPlayer;
  const isSell = animState === ANIM_STATES?.SELL && !!winnerData;
  const isRoster = animState === ANIM_STATES?.ROSTER && !!rosterUpdate;

  // A cinematic owns the surface whenever one of the confined scenes is active.
  const cinematicActive = showWaiting || isIntro || isSell || isRoster;

  return (
    <div className={`relative ${className}`}>
      {/* Cinematic broadcast surface — a positioned, self-contained layer that
          reserves its full premium height ONLY while a scene is playing. When
          bidding goes LIVE it collapses to zero height and the live content
          below rises flush against the player card, eliminating the dead space
          that used to sit between the animation and the controls. */}
      <div
        className={`relative overflow-hidden rounded-2xl ${
          cinematicActive ? cinematicHeight : 'h-0'
        }`}
        aria-hidden={!cinematicActive}
      >
        {/* Confined idle / waiting scene */}
        <WaitingAnimation
          inline
          isActive={showWaiting}
          teamsConnected={waitingStats.teamsConnected || 0}
          managersReady={waitingStats.managersReady || 0}
        />

        {/* Confined player introduction reveal */}
        <PlayerRevealAnimation
          inline
          isActive={isIntro}
          player={introPlayer}
          onComplete={onAnimationComplete}
        />

        {/* Confined "SOLD" championship celebration */}
        <WinnerAnimation
          inline
          isActive={isSell}
          winnerData={winnerData}
          isManagerWinner={isManagerWinner}
          onComplete={onAnimationComplete}
        />

        {/* Confined roster-update stage */}
        <RosterAnimation
          inline
          isActive={isRoster}
          rosterUpdate={rosterUpdate}
          onComplete={onAnimationComplete}
        />
      </div>

      {/* The view's own live-bidding UI. It stays mounted so React/socket state
          is preserved; it is only visually suppressed (overlaid off-screen)
          while a cinematic plays, then smoothly restored in normal flow — no
          layout shift, no remount, and no reserved gap once the scene ends. */}
      <AnimatePresence>
        <div
          className={`transition-opacity duration-500 ease-out ${
            cinematicActive
              ? 'pointer-events-none absolute inset-0 select-none opacity-0'
              : 'relative opacity-100'
          }`}
          aria-hidden={cinematicActive}
        >
          {children}
        </div>
      </AnimatePresence>
    </div>
  );
}
