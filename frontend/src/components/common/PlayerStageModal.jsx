import { useEffect } from 'react';
import { X } from 'lucide-react';
import LandingLiveStageCard from '../LandingLiveStageCard';

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

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  if (!player) return null;

  // Resolve the buying team (object or raw id)
  const tid = typeof player.soldToTeam === 'object' ? player.soldToTeam?._id : player.soldToTeam;
  const teamObj =
    teams.find((t) => String(t._id || t.id) === String(tid || '')) ||
    teams.find((t) => (t.name || '').toLowerCase() === String(tid || '').toLowerCase());

  return (
    <div
      className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className="min-h-full flex items-center justify-center p-4 sm:p-8">
        <div className="relative w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>

          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            title="Close"
            className="absolute -top-3 -right-3 z-10 w-9 h-9 rounded-full bg-[#0c0e12] border border-white/20 text-slate-200 hover:text-white hover:border-[#58D20A]/60 flex items-center justify-center shadow-lg transition"
          >
            <X className="w-4 h-4" />
          </button>

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
    </div>
  );
}
