import React from 'react';
import { Tag, TrendingUp, Trophy, Target, Clock, Calendar, Zap, Radio, Eye } from 'lucide-react';
import { getImageUrl } from '../../utils/imageUrl';
import { playerFallback } from '../../utils/playerFallback';
import { getBatchFromSession } from '../../utils/batchFromSession';

export default function PlayerAuctionStageCard({
  player,
  currentBid = 2600,
  highestBidder = null,
  nextMinBid = null,
  timerRemaining = 28,
  timerStatus = 'RUNNING',
  mode = 'spectator', // 'spectator' | 'manager' | 'podium'
  onPlaceBid = null,
  podiumControls = null,
  formatCurrency = (val) => val != null ? `Tk ${Number(val).toLocaleString('en-US')}` : 'Tk 0',
}) {
  // Extract details with fallback matching reference image
  const name = player?.name || 'RIYAD HOSSAIN';
  const nameParts = name.trim().split(' ');
  const firstName = nameParts.slice(0, -1).join(' ') || nameParts[0] || 'RIYAD';
  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';

  const position = player?.primaryPosition || 'MIDFIELDER';
  const posCode = player?.positionCode || (position.toUpperCase().includes('MID') ? 'CM' : position.toUpperCase().includes('FOR') || position.toUpperCase().includes('ST') ? 'ST' : position.toUpperCase().includes('DEF') || position.toUpperCase().includes('CB') ? 'CB' : position.toUpperCase().includes('GOAL') || position.toUpperCase().includes('GK') ? 'GK' : 'CM');
  const jerseyNumber = player?.jerseyNumber || player?.jerseyName || '17';
  const basePrice = player?.basePrice || 1000;

  const activeCurrentBid = currentBid || basePrice || 2600;
  const computedNextMinBid = nextMinBid || (activeCurrentBid + 100);

  const teamName = typeof highestBidder === 'string'
    ? highestBidder
    : (highestBidder?.name || 'Comilla Victorians');

  const sessionLabel = player?.session || '23-24';
  const batchLabel = player?.batch || getBatchFromSession(player?.session) || '13';

  const imageUrl = getImageUrl(player, playerFallback(position));

  return (
    <div className="bg-[#08080a] border border-red-950/60 rounded-3xl p-5 sm:p-7 shadow-[0_0_50px_rgba(225,29,72,0.12)] relative overflow-hidden text-slate-100 font-sans">
      
      {/* Radial crimson ambient background glow */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* ── Top Bar Header (LIVE NOW & WATCH LIVE) ── */}
      <div className="flex items-center justify-between pb-5 border-b border-red-950/40 relative z-10">
        
        {/* LIVE NOW Pill */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#0B2B26] bg-[#0B2B26]/30 text-white text-xs font-mono font-bold shadow-[0_0_15px_rgba(11,43,38,0.85)]">
          <span className="w-2 h-2 rounded-full bg-white animate-ping" />
          <span>LIVE NOW</span>
        </div>

        {/* WATCH LIVE Pill */}
        <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-white/40 bg-white/5 text-white text-xs font-mono font-bold tracking-wider hover:bg-white/10 transition cursor-pointer">
          <Eye className="w-3.5 h-3.5" />
          <span>WATCH LIVE</span>
        </div>

      </div>

      {/* ── Main Stage Grid (Left: Hexagon Photo & Name, Right: Bidding Cards) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-center pt-6 relative z-10">

        {/* ── Left Column: Player Hexagon & Identity ── */}
        <div className="lg:col-span-5 flex flex-col items-center text-center space-y-4">
          
          {/* Hexagon Photo Frame with Jersey Badge */}
          <div className="relative w-48 h-52 sm:w-56 sm:h-60 flex items-center justify-center">
            
            {/* Top Left Jersey Badge */}
            <div className="absolute top-0 left-0 z-20 w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#e11d48] text-white font-mono font-black text-sm sm:text-base flex items-center justify-center shadow-lg border border-red-400">
              {jerseyNumber}
            </div>

            {/* SVG Red Hexagon Frame */}
            <svg viewBox="0 0 100 115" className="absolute inset-0 w-full h-full drop-shadow-[0_0_20px_rgba(225,29,72,0.4)] pointer-events-none">
              <polygon
                points="50 3, 97 28, 97 87, 50 112, 3 87, 3 28"
                fill="none"
                stroke="#e11d48"
                strokeWidth="2.5"
              />
            </svg>

            {/* Inner Hexagonal Image Container */}
            <div
              className="w-[88%] h-[88%] bg-[#0e0f14] flex items-center justify-center overflow-hidden"
              style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
            >
              <img
                src={imageUrl}
                alt={name}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Bottom Position Pill & Country Flag Row */}
            <div className="absolute -bottom-2 inset-x-0 flex items-center justify-between px-2 z-20 pointer-events-none">
              <div className="w-8 h-6 rounded-lg bg-[#0e0f14] border border-slate-700 flex items-center justify-center text-sm shadow-md pointer-events-auto">
                🇧🇩
              </div>
              <div className="px-3 py-1 rounded-xl bg-[#0e0f14] border border-white/60 text-white font-mono font-extrabold text-xs shadow-md uppercase pointer-events-auto">
                {posCode}
              </div>
            </div>

          </div>

          {/* Player Name Header */}
          <div className="pt-2">
            <h2 className="text-2xl sm:text-4xl font-black uppercase tracking-tight leading-tight">
              <span className="text-white">{firstName} </span>
              <span className="text-[#e11d48]">{lastName}</span>
            </h2>
            <div className="inline-block mt-1">
              <span className="text-xs font-mono font-bold text-[#e11d48] uppercase tracking-widest block">
                {position}
              </span>
              <div className="w-12 h-0.5 bg-[#e11d48] mx-auto mt-1 rounded-full" />
            </div>
          </div>

          {/* ── Mode-Based Primary Action Button (Bottom Left) ── */}
          <div className="w-full pt-2">
            
            {/* 1. SPECTATOR MODE: No Bid Button (as requested by user) */}
            {mode === 'spectator' && null}

            {/* 2. MANAGER MODE: Shows PLACE BID NOW button */}
            {mode === 'manager' && (
              <button
                onClick={onPlaceBid}
                className="w-full py-4 bg-[#e11d48] hover:bg-red-500 text-white font-black text-sm uppercase tracking-wider rounded-2xl shadow-[0_0_30px_rgba(225,29,72,0.45)] transition transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
              >
                <Zap className="w-5 h-5 fill-white" />
                <span>PLACE BID NOW</span>
              </button>
            )}

            {/* 3. PODIUM MODE: Custom Podium Controls rendered here */}
            {mode === 'podium' && podiumControls && (
              <div className="w-full space-y-2">
                {podiumControls}
              </div>
            )}

          </div>

        </div>

        {/* ── Right Column: Bidding Details Metric Stack ── */}
        <div className="lg:col-span-7 space-y-3">
          
          {/* Row 1: BASE PRICE */}
          <div className="bg-[#0e0f14] border border-red-950/40 rounded-2xl p-3.5 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-950/40 border border-red-600/40 flex items-center justify-center text-[#e11d48] shrink-0">
                <Tag className="w-5 h-5" />
              </div>
              <span className="text-xs font-mono font-bold text-slate-400 uppercase">BASE PRICE</span>
            </div>
            <span className="text-lg sm:text-xl font-black font-mono text-white">
              {formatCurrency(basePrice)}
            </span>
          </div>

          {/* Row 2: CURRENT BID */}
          <div className="bg-[#0e0f14] border border-red-950/40 rounded-2xl p-3.5 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-950/40 border border-red-600/40 flex items-center justify-center text-[#e11d48] shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
              <span className="text-xs font-mono font-bold text-slate-400 uppercase">CURRENT BID</span>
            </div>
            <span className="text-lg sm:text-xl font-black font-mono text-[#e11d48]">
              {formatCurrency(activeCurrentBid)}
            </span>
          </div>

          {/* Row 3: BIDDING TEAM */}
          <div className="bg-[#0e0f14] border border-red-950/40 rounded-2xl p-3.5 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-950/40 border border-red-600/40 flex items-center justify-center text-[#e11d48] shrink-0">
                <Trophy className="w-5 h-5" />
              </div>
              <span className="text-xs font-mono font-bold text-slate-400 uppercase">BIDDING TEAM</span>
            </div>
            <span className="text-base sm:text-lg font-black text-white truncate max-w-[180px] sm:max-w-[220px]">
              {teamName}
            </span>
          </div>

          {/* Row 4: NEXT MINIMUM BID (Highlighted Green) */}
          <div className="bg-[#0e0f14] border border-[#0B2B26]/50 rounded-2xl p-3.5 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#0B2B26]/40 border border-[#0B2B26]/50 flex items-center justify-center text-white shrink-0">
                <Target className="w-5 h-5" />
              </div>
              <span className="text-xs font-mono font-bold text-slate-400 uppercase">NEXT MINIMUM BID</span>
            </div>
            <span className="text-lg sm:text-xl font-black font-mono text-white">
              {formatCurrency(computedNextMinBid)}
            </span>
          </div>

          {/* Row 5: TIME LEFT & Countdown Ring */}
          <div className="bg-[#0e0f14] border border-red-950/40 rounded-2xl p-3.5 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-950/40 border border-red-600/40 flex items-center justify-center text-[#e11d48] shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-mono font-bold text-slate-400 uppercase block">TIME LEFT</span>
                <span className="text-[10px] text-slate-500 font-mono block">30 SEC PER BID</span>
              </div>
            </div>

            {/* Circular Countdown Ring */}
            <div className="w-12 h-12 rounded-full border-2 border-red-500 shadow-[0_0_15px_rgba(225,29,72,0.4)] flex items-center justify-center font-mono font-black text-white text-sm bg-red-950/30">
              00:{String(timerRemaining).padStart(2, '0')}
            </div>
          </div>

          {/* Row 6: SESSION & BATCH (2 columns) */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            
            {/* Left: SESSION */}
            <div className="bg-[#0e0f14] border border-red-950/40 rounded-2xl p-3 flex items-center gap-3 shadow-md">
              <div className="w-9 h-9 rounded-xl bg-red-950/40 border border-red-600/40 flex items-center justify-center text-[#e11d48] shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">SESSION</span>
                <span className="text-xs font-black font-mono text-white">{sessionLabel}</span>
              </div>
            </div>

            {/* Right: BATCH */}
            <div className="bg-[#0e0f14] border border-red-950/40 rounded-2xl p-3 flex items-center gap-3 shadow-md">
              <div className="w-9 h-9 rounded-xl bg-red-950/40 border border-red-600/40 flex items-center justify-center text-[#e11d48] shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">BATCH</span>
                <span className="text-xs font-black font-mono text-white">{batchLabel}</span>
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
