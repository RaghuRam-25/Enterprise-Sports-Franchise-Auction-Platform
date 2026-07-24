import React, { useState } from 'react';
import { Play, Pause, RotateCcw, XCircle, Gavel, Search, Settings2, ShieldAlert, CheckCircle2, Clock, Eye, AlertCircle } from 'lucide-react';
import { useAuction } from '../../context/AuctionContext';
import Navbar from '../../components/Navbar';

export const PodiumDashboard = () => {
  const {
    players,
    podiumPlayer,
    currentBid,
    highestBidder,
    biddingMode,
    timerDuration,
    timerRemaining,
    timerStatus,
    bidHistory,
    pushToPodium,
    pauseTimer,
    resumeTimer,
    rollbackBid,
    hammerSell,
    cancelAuction,
    formatCurrency,
    triggerToast
  } = useAuction();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');
  const [selectedPositionFilter, setSelectedPositionFilter] = useState('ALL');

  // Config settings for Launchpad
  const [customDuration, setCustomDuration] = useState(60);
  const [targetMode, setTargetMode] = useState('normal');

  const unsoldPlayers = players.filter(p => p.status === 'unsold');

  const filteredUnsold = unsoldPlayers.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.studentId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategoryFilter === 'ALL' || p.category === selectedCategoryFilter;
    const matchesPos = selectedPositionFilter === 'ALL' || p.primaryPosition === selectedPositionFilter || p.positions?.includes(selectedPositionFilter);
    return matchesSearch && matchesCat && matchesPos;
  });

  const handlePushPlayer = (player) => {
    pushToPodium(player, Number(customDuration), targetMode);
  };

  return (
    <div className="min-h-screen flex flex-col bg-darkBg text-slate-100">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Top Title Banner */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-slate-900 via-rose-950/20 to-slate-900">
          <div className="flex items-center space-x-3">
            <div className="bg-rose-600/20 p-3 rounded-2xl text-rose-400 border border-rose-500/30">
              <Gavel className="w-7 h-7 animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl font-black font-heading uppercase text-white tracking-wide">
                Podium Admin Control Room
              </h1>
              <p className="text-xs text-slate-400">
                The Auctioneer Dashboard / Live Control Deck & Real-Time Dispute Resolution
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-slate-950 px-4 py-2 rounded-xl border border-slate-800 flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${timerStatus === 'running' ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`}></span>
              <span className="text-xs font-bold text-slate-200 tracking-wide uppercase">
                STATUS: {timerStatus}
              </span>
            </div>
          </div>
        </div>

        {/* Main Grid: Unsold Pool vs Control Deck */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Unsold Player Pool */}
          <div className="glass-card rounded-2xl p-6 border border-slate-800 flex flex-col h-[650px] space-y-4">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Search className="w-4 h-4 text-blue-400" /> Unsold Player Pool ({unsoldPlayers.length})
              </h3>
              <p className="text-[11px] text-slate-400">Offline lottery selection pool</p>
            </div>

            {/* Search and Filters */}
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Search unsold by name..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="glass-input w-full px-3.5 py-2 rounded-xl text-xs"
              />

              <div className="grid grid-cols-2 gap-2">
                <select
                  value={selectedCategoryFilter}
                  onChange={e => setSelectedCategoryFilter(e.target.value)}
                  className="glass-input px-2 py-1.5 rounded-lg text-[11px] text-slate-300"
                >
                  <option value="ALL">All Categories</option>
                  <option value="Icon Category">Icon Category</option>
                  <option value="A Grade">A Grade</option>
                  <option value="B Grade">B Grade</option>
                  <option value="Emerging Youth">Emerging Youth</option>
                </select>

                <select
                  value={selectedPositionFilter}
                  onChange={e => setSelectedPositionFilter(e.target.value)}
                  className="glass-input px-2 py-1.5 rounded-lg text-[11px] text-slate-300"
                >
                  <option value="ALL">All Positions</option>
                  <option value="pos-1">Striker (ST)</option>
                  <option value="pos-2">Goalkeeper (GK)</option>
                  <option value="pos-6">Center Back (CB)</option>
                  <option value="pos-7">All-Rounder (ALL)</option>
                </select>
              </div>
            </div>

            {/* Scrollable Player List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {filteredUnsold.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  No unsold players match search criteria.
                </div>
              ) : (
                filteredUnsold.map(player => (
                  <div
                    key={player.id}
                    className="bg-slate-900/70 border border-slate-800 p-3.5 rounded-xl flex items-center justify-between hover:border-blue-500/40 transition group"
                  >
                    <div className="flex items-center gap-3">
                      <img src={player.picture} alt="" className="w-10 h-10 rounded-full object-cover border border-slate-700" />
                      <div>
                        <p className="font-extrabold text-xs text-white group-hover:text-blue-400 transition">{player.name}</p>
                        <p className="text-[11px] text-slate-400">
                          {player.jerseyName} &bull; <span className="text-emerald-400 font-mono font-bold">{formatCurrency(player.basePrice)}</span>
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handlePushPlayer(player)}
                      className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 text-xs font-bold rounded-xl transition shadow"
                    >
                      Push to Podium
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Center & Right Column: Launchpad & Live Podium Control Deck */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Launchpad Configuration Box */}
            <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-emerald-400" /> Launchpad Configuration
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950/80 p-4 rounded-xl border border-slate-800">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Timer Duration (Seconds):</label>
                  <div className="flex items-center gap-2">
                    {[30, 60, 90].map(dur => (
                      <button
                        key={dur}
                        type="button"
                        onClick={() => setCustomDuration(dur)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition ${
                          customDuration === dur
                            ? 'bg-blue-600 text-white border-blue-500'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        {dur}s
                      </button>
                    ))}
                    <input
                      type="number"
                      value={customDuration}
                      onChange={e => setCustomDuration(Number(e.target.value))}
                      className="glass-input w-20 px-2 py-1 rounded-lg text-xs font-mono text-center"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Bidding Mode:</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setTargetMode('normal')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition ${
                        targetMode === 'normal'
                          ? 'bg-emerald-600 text-white border-emerald-500'
                          : 'bg-slate-900 text-slate-400 border-slate-800'
                      }`}
                    >
                      Normal Mode
                    </button>
                    <button
                      type="button"
                      onClick={() => setTargetMode('blind')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition ${
                        targetMode === 'blind'
                          ? 'bg-purple-600 text-white border-purple-500'
                          : 'bg-slate-900 text-slate-400 border-slate-800'
                      }`}
                    >
                      Blind Mode
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Active Podium Spotlight Card */}
            {podiumPlayer ? (
              <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-6 bg-gradient-to-b from-slate-900 via-slate-900/90 to-blue-950/20">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                  
                  {/* Player Info & Photo */}
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <img
                        src={podiumPlayer.picture}
                        alt=""
                        className="w-24 h-24 rounded-2xl object-cover border-2 border-emerald-500/40 shadow-xl"
                      />
                      <span className="absolute -bottom-2 -right-2 px-2 py-0.5 bg-emerald-500 text-slate-950 font-bold text-[10px] rounded-md">
                        {podiumPlayer.category}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-blue-400 uppercase tracking-widest">ON THE PODIUM</span>
                      <h2 className="text-2xl font-black font-heading text-white">{podiumPlayer.name}</h2>
                      <p className="text-xs text-slate-300">
                        {podiumPlayer.jerseyName} &bull; <span className="font-mono text-emerald-400">Base: {formatCurrency(podiumPlayer.basePrice)}</span>
                      </p>
                      <p className="text-[11px] text-slate-400 font-mono">ID: {podiumPlayer.studentId} &bull; {podiumPlayer.session}</p>
                    </div>
                  </div>

                  {/* Countdown Timer Display */}
                  <div className="flex flex-col items-center">
                    <div className={`relative w-24 h-24 rounded-full flex items-center justify-center border-4 shadow-xl ${
                      timerRemaining <= 10 ? 'border-rose-500 text-rose-400 animate-pulse' : 'border-emerald-500 text-emerald-400'
                    }`}>
                      <span className="text-3xl font-black font-mono">{timerRemaining}s</span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                      Mode: <strong className="text-white">{biddingMode}</strong>
                    </span>
                  </div>

                </div>

                {/* Current Highest Bidder Banner */}
                <div className="bg-slate-950/90 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Current Leading Bid</span>
                    <h3 className="text-2xl font-black font-mono text-emerald-400">{formatCurrency(currentBid)}</h3>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Highest Bidder Team</span>
                    <p className="text-sm font-extrabold text-white flex items-center gap-1.5 justify-end">
                      <span>{highestBidder ? highestBidder.logo : '—'}</span>
                      <span>{highestBidder ? highestBidder.name : 'Opening / Base Price'}</span>
                    </p>
                  </div>
                </div>

                {/* Dispute Resolution Control Deck (PRD Section 3.B) */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-400" /> Admin Dispute Controls
                  </span>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {/* Pause/Resume */}
                    {timerStatus === 'running' ? (
                      <button
                        onClick={pauseTimer}
                        className="py-3 px-4 bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-white border border-amber-500/40 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow"
                      >
                        <Pause className="w-4 h-4" /> Pause Clock
                      </button>
                    ) : (
                      <button
                        onClick={resumeTimer}
                        className="py-3 px-4 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow"
                      >
                        <Play className="w-4 h-4" /> Resume Clock
                      </button>
                    )}

                    {/* Rollback Bid */}
                    <button
                      onClick={rollbackBid}
                      className="py-3 px-4 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/40 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow"
                    >
                      <RotateCcw className="w-4 h-4" /> Rollback Bid
                    </button>

                    {/* Hammer / Force Sell */}
                    <button
                      onClick={hammerSell}
                      className="py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-2 shadow-lg"
                    >
                      <Gavel className="w-4 h-4" /> HAMMER / SELL
                    </button>

                    {/* Cancel Auction */}
                    <button
                      onClick={cancelAuction}
                      className="py-3 px-4 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow"
                    >
                      <XCircle className="w-4 h-4" /> Cancel Auction
                    </button>
                  </div>
                </div>

              </div>
            ) : (
              <div className="glass-card rounded-2xl p-12 border border-slate-800 text-center space-y-3">
                <Gavel className="w-12 h-12 text-slate-600 mx-auto" />
                <h3 className="text-base font-bold text-slate-300">Podium is currently empty</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Select an unsold player from the left panel and click "Push to Podium" to start the live bidding timer.
                </p>
              </div>
            )}

            {/* Live Bid Log History */}
            <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Live Podium Bid Log</h4>
              <div className="max-h-48 overflow-y-auto space-y-2 text-xs">
                {bidHistory.length === 0 ? (
                  <p className="text-slate-500 text-center py-4">No bids logged yet.</p>
                ) : (
                  bidHistory.map((log) => (
                    <div key={log.id} className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{log.bidder}</span>
                        <span className="text-[10px] text-slate-400">({log.type})</span>
                      </div>
                      <div className="flex items-center gap-3 font-mono">
                        <span className="text-emerald-400 font-bold">{formatCurrency(log.amount)}</span>
                        <span className="text-[10px] text-slate-500">{log.time}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

        </div>

      </main>
    </div>
  );
};