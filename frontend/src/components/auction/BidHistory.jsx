import React, { useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { gsap } from 'gsap';
import { Clock, Shield, Zap } from 'lucide-react';

/**
 * BidHistory — Real-time scrolling bid ledger with animated entries.
 *
 * Features:
 *   - New bids slide in from the right with a stamp effect
 *   - Each bid pulses green briefly on entry
 *   - Auto-scroll to bottom on new bid
 *   - Empty state with animated placeholder
 *
 * Props:
 *   - history: array of { id, bidder, amount, time, type }
 *   - formatCurrency: function(val) => string
 *   - maxHeight: string (default '240px')
 *   - showHeader: boolean (default true)
 */

export default function BidHistory({ history = [], maxHeight = '240px', showHeader = true }) {
  const containerRef = useRef(null);
  const itemRefs = useRef({});

  const safeHistory = useMemo(() => (Array.isArray(history) ? history : []), [history]);

  useEffect(() => {
    const lastItem = safeHistory[safeHistory.length - 1];
    if (!lastItem || !itemRefs.current[lastItem.id]) return;

    const el = itemRefs.current[lastItem.id];
    gsap.fromTo(el,
      { scale: 0.8, opacity: 0, x: 30 },
      { scale: 1, opacity: 1, x: 0, duration: 0.5, ease: 'back.out(1.5)' }
    );
  }, [safeHistory]);

  const scrollToBottom = () => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [safeHistory.length]);

  return (
    <motion.div
      className="rounded-2xl p-4 border border-[#222222] bg-[#101010] space-y-3"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.8, duration: 0.5 }}
    >
      {showHeader && (
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#A3A3A3] flex items-center gap-2">
            <Clock className="w-4 h-4 text-white" />
            Live Bid Ledger ({safeHistory.length})
          </h3>
          {safeHistory.length > 0 && safeHistory.length > 1 && (
            <span className="text-[10px] font-mono text-[#666666]">
              Latest first
            </span>
          )}
        </div>
      )}

      <div
        ref={containerRef}
        className="space-y-2 overflow-y-auto"
        style={{ maxHeight }}
      >
        <AnimatePresence>
          {safeHistory.length === 0 ? (
            <motion.div
              className="text-center py-8 text-mutedText text-xs"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <Zap className="w-6 h-6 mx-auto text-[#222222] mb-2" />
              <p>No bids placed yet on this player.</p>
            </motion.div>
          ) : (
            [...safeHistory].reverse().map((bid, idx) => (
              <BidRow
                key={bid.id || idx}
                bid={bid}
                idx={idx}
                isLatest={idx === 0}
                refCallback={(el) => {
                  if (el && bid.id) itemRefs.current[bid.id] = el;
                }}
              />
            ))
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

const BidRow = React.forwardRef(({ bid, idx, isLatest }, ref) => {
  const isBlind = bid.type === 'Blind' || bid.type === 'BLIND';

  return (
    <motion.div
      ref={ref}
      layout
      className={`
        flex items-center justify-between px-3 py-2 rounded-lg text-xs
        transition-all duration-200
        ${isLatest
          ? 'bg-[#0B2B26] border border-[#0B2B26]/40 text-white'
          : 'bg-[#0B0B0B] border border-[#222222] text-[#A3A3A3]'
        }
      `}
      initial={{ opacity: 0, x: 30, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{
        delay: idx * 0.03,
        duration: 0.4,
        type: 'spring',
        stiffness: 200,
      }}
    >
      <div className="flex items-center gap-2">
        {isLatest && (
          <motion.span
            className="w-1.5 h-1.5 rounded-full bg-[#0B2B26]"
            animate={{ scale: [1, 1.5, 1], opacity: [1, 0.7, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}
        <span className={`font-bold ${isLatest ? 'text-[#F5F5F5]' : 'text-[#A3A3A3]'}`}>
          {bid.bidder}
        </span>
        {isBlind && (
          <Shield className="w-3 h-3 text-[#F4C542]" title="Blind Bid" />
        )}
        <span className="text-[10px] text-[#666666] font-mono">
          {bid.time || ''}
        </span>
      </div>

      <span className={`font-mono font-bold ${isLatest ? 'text-white text-lg' : 'text-[#666666]'}`}>
        {bid.amount !== undefined ? `৳${Number(bid.amount).toLocaleString('en-IN')}` : '—'}
      </span>
    </motion.div>
  );
});
BidRow.displayName = 'BidRow';
