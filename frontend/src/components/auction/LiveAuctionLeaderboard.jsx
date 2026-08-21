import React, { useEffect, useRef } from 'react';
import { useAuction } from '../../context/AuctionContext';
import { Clock } from 'lucide-react';

export default function LiveAuctionLeaderboard() {
    const { bidHistory, formatCurrency } = useAuction();
    const scrollRef = useRef(null);

    const safeHistory = Array.isArray(bidHistory) ? bidHistory : [];

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [safeHistory.length]);

    return (
        <div className="w-full h-full bg-darkBg/80 backdrop-blur-sm border-t-2 border-cardBorder p-3 flex flex-col rounded-b-2xl">
            <h5 className="text-xs font-bold uppercase tracking-wider text-secondaryText flex items-center gap-2 mb-2">
                <Clock className="w-3 h-3 text-neonGreen" /> Live Bids
            </h5>
            <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar text-xs space-y-1.5 pr-1">
                {safeHistory.length === 0 ? (
                    <p className="text-mutedText text-center py-2">Waiting for the first bid...</p>
                ) : (
                    [...safeHistory].reverse().map((bid, index) => (
                        <div key={bid.id || index} className={`flex justify-between items-center text-secondaryText transition-colors p-1 rounded ${index === 0 ? 'bg-neonGreen/10' : ''}`}>
                            <span className={`font-semibold ${index === 0 ? 'text-white' : 'text-secondaryText'}`}>{bid.bidder}</span>
                            <span className={`font-mono font-bold ${index === 0 ? 'text-neonGreenHover' : 'text-neonGreen'}`}>{formatCurrency(bid.amount)}</span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}