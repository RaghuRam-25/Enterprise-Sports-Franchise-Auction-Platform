import { useEffect } from 'react';
import { X } from 'lucide-react';
import LandingLiveStageCard from '../LandingLiveStageCard';
import DetailsViewport from './DetailsViewport';
import useModalScrollLock from '../../hooks/useModalScrollLock';

/**
 * PlayerStageModal — opens the EXACT stage presentation used when a player is
 * pushed onto the auction podium (LandingLiveStageCard), as a full-screen
 * overlay. Used wherever a player card is clicked.
 *
 * Props:
 *   - player          player document to present
 *   - teams           teams array to resolve soldToTeam → team object
 *   - formatCurrency  currency formatter from AuctionContext
 *   - onClose         close handler
 */
export default function PlayerStageModal({ player, teams = [], categories = [], formatCurrency, onClose }) {
  // Esc key closes the overlay
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useModalScrollLock(!!player);

  if (!player) return null;

  // Resolve the buying team (object or raw id)
  const tid = typeof player.soldToTeam === 'object' ? player.soldToTeam?._id : player.soldToTeam;
  const teamObj =
    teams.find((t) => String(t._id || t.id) === String(tid || '')) ||
    teams.find((t) => (t.name || '').toLowerCase() === String(tid || '').toLowerCase());

  return (
    <DetailsViewport onClose={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex flex-col w-full max-w-[800px] max-h-full"
      >
        {/* Close — attached to the modal's top-right corner (never viewport-fixed) */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onClose?.(); }}
          title="Close"
          className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-[#0c0e12] border border-white/20 text-slate-200 hover:text-white hover:border-[#58D20A]/60 flex items-center justify-center shadow-lg transition"
        >
          <X className="w-4 h-4" />
        </button>

        <div
          data-modal-scroll="true"
          className="w-full min-h-0 overflow-y-auto overscroll-contain custom-scrollbar rounded-2xl"
        >
          {/* The podium-push stage card, verbatim */}
          <LandingLiveStageCard
            player={player}
            currentBid={player.finalPrice || player.basePrice || 0}
            highestBidder={teamObj || null}
            timerRemaining={0}
            timerStatus="idle"
            mode="spectator"
            categories={categories}
            formatCurrency={formatCurrency}
          />
        </div>
      </div>
    </DetailsViewport>
  );
}
