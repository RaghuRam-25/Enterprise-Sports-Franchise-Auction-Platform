import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Radio, Trophy, Shield, Clock, Flame, Sparkles, Wifi, WifiOff } from 'lucide-react';
import { useAuction } from '../../context/AuctionContext';
import { useSocket } from '../../context/SocketContext';
import Navbar from '../../components/Navbar';

export default function PublicLiveView() {
  const {
    podiumPlayer,
    currentBid,
    highestBidder,
    biddingMode,
    timerRemaining,
    timerStatus,
    bidHistory,
    formatCurrency
  } = useAuction();

  const { socket, isConnected } = useSocket();
  const [soundEnabled, setSoundEnabled] = useState(true);

  // GAP-9: Request fresh auction state from server on mount (reconnect pattern)
  useEffect(() => {
    if (socket && isConnected) {
      socket.emit('auction:sync-request');
    }
  }, [socket, isConnected]);

  return (
    <div className="min-h-screen flex flex-col bg-darkBg text-slate-100 relative overflow-hidden">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Top Stadium Live Banner */}
        <div className="glass-card rounded-2xl p-4 border border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-900 via-blue-950/30 to-slate-900">
          <div className="flex items-center space-x-3">
            <span className="relative flex h-3 w-3">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isConnected ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-3 w-3 ${isConnected ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
            </span>
            <span className="text-xs font-black uppercase tracking-widest text-emerald-400 flex items-center gap-1.5">
              <Radio className="w-4 h-4 text-emerald-400" /> LIVE STADIUM BROADCAST
            </span>
            {/* WebSocket connection badge */}
            <span className={`hidden sm:flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${
              isConnected
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
            }`}>
              {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {isConnected ? 'WS LIVE' : 'RECONNECTING'}
            </span>
          </div>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-xs font-bold rounded-xl border border-slate-700 transition"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            <span>{soundEnabled ? 'Audio FX Enabled' : 'Audio Muted'}</span>
          </button>
        </div>

        {/* Big Screen Arena Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Stadium Centerpiece Card */}
          <div className="lg:col-span-2 glass-card rounded-3xl p-8 border border-slate-800 space-y-8 bg-gradient-to-b from-slate-900/90 via-slate-900 to-blue-950/20 shadow-2xl relative">
            
            {podiumPlayer ? (
              <div className="space-y-8">
                
                {/* Header Spotlight */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 border-b border-slate-800 pb-6">
                  
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      <img
                        src={podiumPlayer.imageUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80'}
                        alt={podiumPlayer.name}
                        className="w-32 h-32 rounded-3xl object-cover border-4 border-emerald-500/50 shadow-2xl"
                      />
                      <span className="absolute -bottom-2 -right-2 px-3 py-1 bg-emerald-400 text-slate-950 font-black text-xs rounded-lg uppercase tracking-wider shadow-lg">
                        {podiumPlayer.category}
                      </span>
                    </div>

                    <div className="space-y-1 text-left">
                      <span className="text-xs font-extrabold text-blue-400 uppercase tracking-widest flex items-center gap-1">
                        <Flame className="w-4 h-4 text-amber-400 animate-bounce" /> CURRENT PLAYER ON PODIUM
                      </span>
                      <h1 className="text-3xl sm:text-4xl font-black font-heading text-white">{podiumPlayer.name}</h1>
                      <p className="text-sm text-slate-300 font-semibold">{podiumPlayer.jerseyName}</p>
                      <p className="text-xs text-slate-400 font-mono">
                        Base Opening Price: <strong className="text-emerald-400">{formatCurrency(podiumPlayer.basePrice)}</strong>
                      </p>
                    </div>
                  </div>

                  {/* Stadium Clock Ring */}
                  <div className="flex flex-col items-center">
                    <div className={`relative w-28 h-28 rounded-full flex items-center justify-center border-4 shadow-2xl ${
                      timerRemaining <= 10 ? 'border-rose-500 text-rose-400 animate-pulse' : 'border-emerald-500 text-emerald-400'
                    }`}>
                      <span className="text-4xl font-black font-mono">{timerRemaining}s</span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                      Mode: <strong className="text-white uppercase">{biddingMode}</strong>
                    </span>
                  </div>

                </div>

                {/* Big Screen Bid Spotlight Banner */}
                <div className="bg-slate-950/90 border-2 border-emerald-500/40 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl">
                  <div>
                    <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">HIGHEST BID AMOUNT</span>
                    <h2 className="text-4xl sm:text-5xl font-black font-mono text-emerald-400 mt-1">
                      {formatCurrency(currentBid)}
                    </h2>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">LEADING FRANCHISE</span>
                    <div className="flex items-center gap-3 mt-1 justify-end">
                      <span className="text-3xl">{highestBidder ? highestBidder.logo : '🏆'}</span>
                      <span className="text-xl font-black text-white">{highestBidder ? highestBidder.name : 'Opening / Base'}</span>
                    </div>
                  </div>
                </div>

              </div>
            ) : (
              <div className="text-center py-24 space-y-4">
                <Trophy className="w-16 h-16 text-slate-600 mx-auto animate-pulse" />
                <h2 className="text-xl font-black text-slate-300">Podium Standing By</h2>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  The auctioneer is preparing the next player for the live draft. Stand by for real-time bid updates!
                </p>
              </div>
            )}

          </div>

          {/* Right Column: Real-Time Scrolling Live Bid Ledger */}
          <div className="glass-card rounded-3xl p-6 border border-slate-800 space-y-4 flex flex-col h-[520px]">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" /> Live Bid Ledger
              </h3>
              <p className="text-[11px] text-slate-400">Real-time audited auction bid stream</p>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {bidHistory.length === 0 ? (
                <div className="text-center py-16 text-slate-500 text-xs">No bids logged in ledger yet.</div>
              ) : (
                bidHistory.slice().reverse().map((log) => (
                  <div
                    key={log.id}
                    className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-xl flex items-center justify-between hover:border-emerald-500/30 transition"
                  >
                    <div>
                      <p className="font-extrabold text-xs text-white">{log.bidder}</p>
                      <span className="text-[10px] text-slate-500">{log.time} &bull; {log.type}</span>
                    </div>
                    <span className="font-mono text-xs font-bold text-emerald-400">{formatCurrency(log.amount)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </main>
    </div>
  );
}