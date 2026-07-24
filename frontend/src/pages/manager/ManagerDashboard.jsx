import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Zap, DollarSign, AlertCircle, Users, Gavel, Clock, Lock, CheckCircle2, TrendingUp } from 'lucide-react';
import { useAuction } from '../../context/AuctionContext';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/Navbar';

export const ManagerDashboard = () => {
  const { user } = useAuth();
  const {
    teams,
    podiumPlayer,
    currentBid,
    highestBidder,
    biddingMode,
    timerRemaining,
    timerStatus,
    calculateNextBidAmount,
    placeNormalBid,
    placeBlindBid,
    getLowestCategoryBasePrice,
    formatCurrency,
    triggerToast
  } = useAuction();

  // Find active team manager's franchise
  const activeTeam = teams.find(t => t.id === user?.teamId) || teams[0];

  const [blindBidAmount, setBlindBidAmount] = useState('');
  const [blindBidError, setBlindBidError] = useState('');
  const [isBidding, setIsBidding] = useState(false);

  const nextExactBid = calculateNextBidAmount(currentBid, activeTeam.totalBudget);
  const isCurrentlyHighestBidder = highestBidder?.id === activeTeam.id;

  // Calculate Budget Guardrail Metrics for Manager Dashboard
  const lowestBasePrice = getLowestCategoryBasePrice();
  const currentRosterCount = activeTeam.currentRoster.length;
  const remainingSlotsNeeded = Math.max(0, activeTeam.minRoster - currentRosterCount);
  const requiredReserve = remainingSlotsNeeded * lowestBasePrice;
  const maxAllowableBidPurse = activeTeam.remainingBudget - requiredReserve;

  const handleNormalBidSubmit = () => {
    if (isBidding) return;
    setIsBidding(true);

    const res = placeNormalBid(activeTeam.id);
    if (!res.success) {
      triggerToast(res.error, 'error');
    } else {
      triggerToast(`Bid of ${formatCurrency(res.nextAmount)} placed successfully!`, 'success');
    }

    setTimeout(() => setIsBidding(false), 500);
  };

  const handleBlindBidSubmit = (e) => {
    e.preventDefault();
    setBlindBidError('');

    const res = placeBlindBid(activeTeam.id, blindBidAmount);
    if (!res.success) {
      setBlindBidError(res.error);
      triggerToast('Blind Bid Failed validation check!', 'error');
    } else {
      triggerToast(`Sealed blind bid of ${formatCurrency(blindBidAmount)} submitted.`, 'success');
      setBlindBidAmount('');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-darkBg text-slate-100">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Top Team Header */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-slate-900 via-slate-900/90 to-emerald-950/20">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-3xl shadow-lg">
              {activeTeam.logo}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black font-heading text-white">{activeTeam.name}</h1>
                <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  {activeTeam.code}
                </span>
              </div>
              <p className="text-xs text-slate-400">Authenticated Manager: {user?.name || 'Franchise Manager'}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Available Purse</span>
              <h3 className="text-xl font-black font-mono text-emerald-400">{formatCurrency(activeTeam.remainingBudget)}</h3>
            </div>

            <Link
              to="/manager/roster"
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-bold rounded-xl transition shadow"
            >
              View Roster ({currentRosterCount}/{activeTeam.minRoster})
            </Link>
          </div>
        </div>

        {/* PRD Blind Bid Budget Guardrail Banner */}
        <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-slate-300">
            <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <div>
              <strong className="text-amber-400">PRD Reserve Guardrail Status:</strong> Required Reserve = ({activeTeam.minRoster} min - {currentRosterCount} current) &times; {formatCurrency(lowestBasePrice)} = <span className="font-mono font-bold text-white">{formatCurrency(requiredReserve)}</span>
            </div>
          </div>
          <div className="font-mono font-bold text-slate-200 bg-slate-900 px-3 py-1 rounded-lg border border-slate-800">
            Max Allowable Single Bid: <span className="text-emerald-400">{formatCurrency(maxAllowableBidPurse)}</span>
          </div>
        </div>

        {/* Main Grid: Live Podium Viewer vs Action Deck */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Live Podium Viewer Component */}
          <div className="lg:col-span-2 glass-card rounded-2xl p-6 border border-slate-800 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Gavel className="w-4 h-4 text-emerald-400" /> Live Podium Viewer
              </h3>

              <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase border ${
                biddingMode === 'blind' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
              }`}>
                Mode: {biddingMode}
              </span>
            </div>

            {podiumPlayer ? (
              <div className="space-y-6">
                
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 bg-slate-950/80 p-6 rounded-2xl border border-slate-800">
                  <div className="flex items-center gap-4">
                    <img src={podiumPlayer.picture} alt="" className="w-24 h-24 rounded-2xl object-cover border-2 border-emerald-500/40 shadow-xl" />
                    <div>
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">{podiumPlayer.category}</span>
                      <h2 className="text-2xl font-black font-heading text-white">{podiumPlayer.name}</h2>
                      <p className="text-xs text-slate-300">{podiumPlayer.jerseyName}</p>
                      <p className="text-xs text-slate-400 font-mono mt-1">Base Price: {formatCurrency(podiumPlayer.basePrice)}</p>
                    </div>
                  </div>

                  {/* Countdown Timer */}
                  <div className="flex flex-col items-center">
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center border-4 font-mono text-2xl font-black shadow-xl ${
                      timerRemaining <= 10 ? 'border-rose-500 text-rose-400 animate-pulse' : 'border-emerald-500 text-emerald-400'
                    }`}>
                      {timerRemaining}s
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Timer</span>
                  </div>
                </div>

                {/* Current Bid & Leading Bidder */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Current Leading Bid</span>
                    <p className="text-2xl font-black font-mono text-emerald-400 mt-1">{formatCurrency(currentBid)}</p>
                  </div>

                  <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Highest Bidder Franchise</span>
                    <p className="text-base font-extrabold text-white mt-1 flex items-center gap-2">
                      <span>{highestBidder ? highestBidder.logo : '—'}</span>
                      <span>{highestBidder ? highestBidder.name : 'Opening Base Price'}</span>
                    </p>
                  </div>
                </div>

              </div>
            ) : (
              <div className="text-center py-16 text-slate-500 space-y-2">
                <Gavel className="w-10 h-10 mx-auto text-slate-600" />
                <p className="font-bold text-sm">No player currently on podium.</p>
                <p className="text-xs text-slate-400">Waiting for Podium Admin to launch the next player.</p>
              </div>
            )}
          </div>

          {/* Action Deck (The Bidding Controls) */}
          <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-6 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2 mb-4">
                <Zap className="w-4 h-4 text-emerald-400" /> Franchise Action Deck
              </h3>

              {!podiumPlayer ? (
                <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 text-xs text-slate-400 text-center">
                  Bidding controls will activate when a player is pushed to the live podium.
                </div>
              ) : biddingMode === 'normal' ? (
                
                /* NORMAL BIDDING MODE */
                <div className="space-y-4">
                  <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-2 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Next Exact Dynamic Raise</span>
                    <p className="text-2xl font-black font-mono text-emerald-400">{formatCurrency(nextExactBid)}</p>
                    <p className="text-[10px] text-slate-500">Calculated based on percentage tier of franchise purse</p>
                  </div>

                  {isCurrentlyHighestBidder && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold rounded-xl text-center flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Your team currently holds the highest bid!
                    </div>
                  )}

                  <button
                    onClick={handleNormalBidSubmit}
                    disabled={isBidding || isCurrentlyHighestBidder || timerStatus !== 'running'}
                    className={`w-full py-4 rounded-xl font-black text-sm uppercase tracking-wider transition shadow-2xl flex items-center justify-center gap-2 ${
                      isCurrentlyHighestBidder
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                        : timerStatus !== 'running'
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-emerald-900/50'
                    }`}
                  >
                    <Zap className="w-5 h-5" />
                    <span>BID {formatCurrency(nextExactBid)}</span>
                  </button>
                </div>
              ) : (
                
                /* BLIND BIDDING MODE */
                <form onSubmit={handleBlindBidSubmit} className="space-y-4">
                  <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-2">
                    <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">Sealed Blind Bid Payload</span>
                    <p className="text-[11px] text-slate-400">
                      Submit one hidden monetary value. Backend aggregates payloads and resolves the highest bidder at T=0.
                    </p>
                  </div>

                  {blindBidError && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold rounded-xl space-y-1">
                      <p className="font-bold flex items-center gap-1"><AlertCircle className="w-4 h-4 text-rose-400" /> Guardrail Violation:</p>
                      <p className="text-[11px]">{blindBidError}</p>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Enter Sealed Monetary Bid (BDT):</label>
                    <input
                      type="number"
                      value={blindBidAmount}
                      onChange={e => setBlindBidAmount(e.target.value)}
                      placeholder="e.g. 2500000"
                      className="glass-input w-full px-4 py-3 rounded-xl font-mono text-sm text-white"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-xl transition"
                  >
                    SUBMIT SEALED BLIND BID
                  </button>
                </form>
              )}
            </div>

            {/* Roster & Purse Quick Summary */}
            <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 text-xs space-y-2">
              <div className="flex justify-between items-center text-slate-400">
                <span>Roster Slots Acquired:</span>
                <span className="font-bold text-white">{currentRosterCount} / {activeTeam.minRoster} min</span>
              </div>
              <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full transition-all"
                  style={{ width: `${Math.min(100, (currentRosterCount / activeTeam.minRoster) * 100)}%` }}
                />
              </div>
            </div>

          </div>

        </div>

      </main>
    </div>
  );
};