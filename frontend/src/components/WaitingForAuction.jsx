import { Link } from 'react-router-dom';
import { Radio, Eye } from 'lucide-react';

/**
 * WaitingForAuction — shared idle state shown EVERYWHERE the auction is not
 * live (no player on the podium): landing, /live, manager, player, podium.
 * PublicLiveView is the reference — every surface renders the EXACT same thing.
 *
 * Two states, identical visuals:
 *   - auction start time NOT set yet    → WAITING FOR AUCTION
 *   - auction scheduled, podium empty   → WAITING FOR THE NEXT PLAYER
 *
 * Props:
 *   - auctionStartTime: ISO date from PhaseContext — decides which state shows
 *   - detailLine:       optional extra line (e.g. "STARTS ON 22 MAY …")
 *   - message:          optional subtitle override
 *   - ctaTo/ctaLabel:   optional call-to-action button (omit to hide)
 */
export default function WaitingForAuction({
  auctionStartTime = null,
  detailLine = null,
  message,
  ctaTo,
  ctaLabel = 'GO TO LIVE AUCTION',
}) {
  const scheduled = Boolean(auctionStartTime);
  const title = scheduled ? 'WAITING FOR THE NEXT PLAYER' : 'WAITING FOR AUCTION';
  const subline = message
    || (scheduled ? 'PODIUM IS EMPTY — STAY TUNED' : 'THE AUCTION HAS NOT BEEN SCHEDULED YET');

  return (
    <div className="py-12 flex flex-col items-center justify-center gap-6 text-center">
      {/* Pulsing broadcast ring */}
      <div className="relative w-24 h-24">
        <span className="absolute inset-0 rounded-full border-2 border-[#0B2B26]/30 animate-ping" />
        <span className="absolute inset-0 rounded-full border-2 border-dashed border-[#0B2B26]/50 animate-spin [animation-duration:6s]" />
        <div className="absolute inset-2 rounded-full bg-[#0B2B26] border border-[#0B2B26]/50 flex items-center justify-center shadow-[0_0_30px_rgba(11, 43, 38,0.25)]">
          <Radio className="w-9 h-9 text-white animate-pulse" />
        </div>
      </div>

      <div>
        <h3 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-white">{title}</h3>
        <p className="text-xs font-mono font-bold text-white uppercase tracking-widest mt-2">{subline}</p>
        {detailLine && (
          <p className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest mt-1.5">{detailLine}</p>
        )}
      </div>

      {/* Bouncing dots */}
      <div className="flex items-center gap-2.5">
        {[0, 1, 2].map((i) => (
          <span key={i} className="w-2.5 h-2.5 rounded-full bg-white animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>

      {ctaTo && (
        <Link
          to={ctaTo}
          className="mt-2 px-6 py-3 bg-white/5 hover:bg-white/10 text-slate-200 font-bold text-xs uppercase tracking-wider rounded-xl border border-white/15 transition flex items-center gap-2"
        >
          <Eye className="w-4 h-4" />
          <span>{ctaLabel}</span>
        </Link>
      )}
    </div>
  );
}
