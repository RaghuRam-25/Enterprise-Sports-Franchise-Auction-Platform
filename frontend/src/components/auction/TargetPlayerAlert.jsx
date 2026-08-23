import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, ShieldAlert, Zap, X, FileText, Target, AlertCircle } from 'lucide-react';
import { useAuction } from '../../context/AuctionContext';
import { playerFallback } from '../../utils/playerFallback';


export default function TargetPlayerAlert({ targetItem, onQuickBid, onDismiss }) {
  const { formatCurrency } = useAuction();
  const [isNoteExpanded, setIsNoteExpanded] = useState(false);

  if (!targetItem || !targetItem.playerId) return null;

  const player = targetItem.playerId;
  const note = targetItem.note;
  const budgetLimit = targetItem.optionalBudgetLimit;
  const priority = targetItem.priority;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.96 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-xl sm:rounded-2xl border-2 border-warningGold/60 bg-gradient-to-r from-warningGold/90 via-cardBg/95 to-darkBg shadow-2xl shadow-warningGold/20 p-2.5 sm:p-4 backdrop-blur-xl flex-none"
      >
        {/* Animated background glow */}
        <div className="pointer-events-none absolute -top-12 -right-12 w-48 h-48 bg-warningGold/20 blur-3xl rounded-full animate-pulse" />

        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-2.5 sm:gap-4">
          
          {/* Header & Target Identity */}
          <div className="flex items-start sm:items-center gap-2.5 sm:gap-3.5 min-w-0">
            <div className="relative flex-shrink-0">
              <img
                src={player.imageUrl || playerFallback('amber')}
                alt={player.name}
                className="w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl object-cover border-2 border-warningGold/80 shadow-lg"
              />
              <span className="absolute -top-2 -left-2 px-2 py-0.5 bg-warningGold text-darkBg font-black text-[10px] rounded-full uppercase shadow">
                #{priority}
              </span>
            </div>

            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 bg-warningGold/20 text-warningGold font-extrabold text-[10px] rounded-md border border-warningGold/30 uppercase tracking-widest flex items-center gap-1">
                  <Star className="w-3 h-3 text-warningGold fill-warningGold" /> Target Player Alert
                </span>
                <span className="text-[10px] text-warningGold/80 font-mono font-semibold">
                  (On Your Private Shortlist)
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white truncate">{player.name}</h3>
              <div className="hidden sm:flex items-center gap-2 text-xs text-secondaryText">
                <span>{player.primaryPosition}</span>
                <span>&bull;</span>
                <span>{player.category}</span>
                <span>&bull;</span>
                <span className="font-mono text-neonGreen">Base: {formatCurrency(player.basePrice)}</span>
              </div>
              <div className="sm:hidden flex items-center gap-1.5 text-[10px] text-secondaryText truncate">
                <span>{player.primaryPosition}</span>
                <span>&bull;</span>
                <span className="font-mono text-neonGreen">Base: {formatCurrency(player.basePrice)}</span>
              </div>
            </div>
          </div>

          {/* Smart Reminders Badges (Budget & Note Preview) */}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {budgetLimit && (
              <div className="px-3 py-1.5 rounded-xl bg-cardBg/80 border border-warningGold/30 text-warningGold text-xs font-mono font-bold flex items-center gap-1.5 shadow-sm">
                <Target className="w-3.5 h-3.5 text-warningGold" />
                <span>Planned Cap: {formatCurrency(budgetLimit)}</span>
              </div>
            )}

            {note && (
              <button
                onClick={() => setIsNoteExpanded(!isNoteExpanded)}
                className="px-3 py-1.5 rounded-xl bg-cardBg/80 border border-borderStrong hover:border-warningGold/40 text-secondaryText hover:text-white text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <FileText className="w-3.5 h-3.5 text-warningGold" />
                <span>{isNoteExpanded ? 'Hide Note' : 'View Note'}</span>
              </button>
            )}

            {/* Quick Actions */}
            {onQuickBid && (
              <button
                onClick={onQuickBid}
                className="px-4 py-2 bg-gradient-to-r from-warningGold to-warningGold hover:from-warningGold hover:to-warningGold text-darkBg font-black text-xs uppercase tracking-wider rounded-xl transition shadow-lg shadow-warningGold/40 flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5 fill-current" /> Quick Bid
              </button>
            )}

            {onDismiss && (
              <button
                onClick={onDismiss}
                className="p-1.5 text-secondaryText hover:text-white hover:bg-surfaceHover rounded-lg transition"
                title="Dismiss Reminder"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Note Collapsible Drawer */}
        <AnimatePresence>
          {note && isNoteExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-warningGold/30 bg-darkBg/80 p-3">
                <AlertCircle className="w-4 h-4 text-warningGold flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-warningGold mb-0.5">
                    Your Private Strategy Note
                  </span>
                  <p className="text-xs leading-relaxed text-primaryText break-words">{note}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}
