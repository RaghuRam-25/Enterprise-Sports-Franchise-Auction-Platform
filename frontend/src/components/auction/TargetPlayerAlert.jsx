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
        className="relative overflow-hidden rounded-2xl border-2 border-amber-500/60 bg-gradient-to-r from-amber-950/90 via-slate-900/95 to-slate-950 shadow-2xl shadow-amber-500/20 p-4 sm:p-5 backdrop-blur-xl"
      >
        {/* Animated background glow */}
        <div className="pointer-events-none absolute -top-12 -right-12 w-48 h-48 bg-amber-500/20 blur-3xl rounded-full animate-pulse" />

        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          
          {/* Header & Target Identity */}
          <div className="flex items-start sm:items-center gap-3.5 min-w-0">
            <div className="relative flex-shrink-0">
              <img
                src={player.imageUrl || playerFallback('amber')}
                alt={player.name}
                className="w-14 h-14 rounded-2xl object-cover border-2 border-amber-400/80 shadow-lg"
              />
              <span className="absolute -top-2 -left-2 px-2 py-0.5 bg-amber-400 text-slate-950 font-black text-[10px] rounded-full uppercase shadow">
                #{priority}
              </span>
            </div>

            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 font-extrabold text-[10px] rounded-md border border-amber-500/30 uppercase tracking-widest flex items-center gap-1">
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400" /> Target Player Alert
                </span>
                <span className="text-[10px] text-amber-200/80 font-mono font-semibold">
                  (On Your Private Shortlist)
                </span>
              </div>
              <h3 className="text-lg font-black text-white truncate">{player.name}</h3>
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <span>{player.primaryPosition}</span>
                <span>&bull;</span>
                <span>{player.category}</span>
                <span>&bull;</span>
                <span className="font-mono text-emerald-400">Base: {formatCurrency(player.basePrice)}</span>
              </div>
            </div>
          </div>

          {/* Smart Reminders Badges (Budget & Note Preview) */}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {budgetLimit && (
              <div className="px-3 py-1.5 rounded-xl bg-slate-900/80 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold flex items-center gap-1.5 shadow-sm">
                <Target className="w-3.5 h-3.5 text-amber-400" />
                <span>Planned Cap: {formatCurrency(budgetLimit)}</span>
              </div>
            )}

            {note && (
              <button
                onClick={() => setIsNoteExpanded(!isNoteExpanded)}
                className="px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-700 hover:border-amber-500/40 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                <span>{isNoteExpanded ? 'Hide Note' : 'View Note'}</span>
              </button>
            )}

            {/* Quick Actions */}
            {onQuickBid && (
              <button
                onClick={onQuickBid}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition shadow-lg shadow-amber-900/40 flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5 fill-current" /> Quick Bid
              </button>
            )}

            {onDismiss && (
              <button
                onClick={onDismiss}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                title="Dismiss Reminder"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Note Collapsible Drawer */}
        {note && isNoteExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 pt-3 border-t border-amber-500/20 text-xs text-amber-200/90 italic bg-amber-950/40 p-3 rounded-xl border border-amber-500/10 flex items-start gap-2"
          >
            <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="not-italic font-bold text-amber-300 block text-[10px] uppercase tracking-wider">Your Private Strategy Note:</strong>
              "{note}"
            </div>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
