import React from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Radio, Shield, Users, UserPlus, ArrowRight, Zap, Sparkles } from 'lucide-react';
import { useAuction } from '../../context/AuctionContext';
import Navbar from '../../components/Navbar';

export default function LandingPage() {
  const { players, teams, formatCurrency } = useAuction();

  const totalPurse = teams.reduce((acc, t) => acc + t.totalBudget, 0);

  return (
    <div className="min-h-screen flex flex-col bg-darkBg text-slate-100 relative overflow-hidden">
      <Navbar />

      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center space-y-8">
        
        {/* Glow ambient */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl -z-10 pointer-events-none" />

        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-xs font-bold text-emerald-400 shadow-xl">
          <Sparkles className="w-4 h-4 text-emerald-400 animate-spin" />
          <span>ENTERPRISE SPORTS FRANCHISE AUCTION PLATFORM 2026</span>
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black font-heading uppercase tracking-tight text-white max-w-4xl mx-auto leading-none">
          THE ULTIMATE <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-emerald-400 bg-clip-text text-transparent">LIVE DRAFT</span> EXPERIENCE
        </h1>

        <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto font-medium">
          Real-time serialized bidding engine, dynamic monetary raise logic, blind budget guardrails, and stadium-grade live spectator view.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <Link
            to="/live"
            className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-sm uppercase tracking-wider rounded-2xl shadow-2xl transition transform hover:scale-105 flex items-center gap-2"
          >
            <Radio className="w-5 h-5 animate-pulse text-slate-950" />
            <span>ENTER LIVE STADIUM</span>
          </Link>

          <Link
            to="/teams"
            className="px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white border border-slate-700 font-extrabold text-sm uppercase tracking-wider rounded-2xl transition"
          >
            EXPLORE FRANCHISES
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-12 max-w-4xl mx-auto">
          <div className="glass-card rounded-2xl p-4 border border-slate-800 text-center">
            <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-400">{players.length}</span>
            <p className="text-[11px] text-slate-400 font-bold uppercase mt-1">Draft Participants</p>
          </div>

          <div className="glass-card rounded-2xl p-4 border border-slate-800 text-center">
            <span className="text-2xl sm:text-3xl font-black font-mono text-blue-400">{teams.length}</span>
            <p className="text-[11px] text-slate-400 font-bold uppercase mt-1">Franchise Teams</p>
          </div>

          <div className="glass-card rounded-2xl p-4 border border-slate-800 text-center">
            <span className="text-xl sm:text-2xl font-black font-mono text-amber-400">{formatCurrency(totalPurse)}</span>
            <p className="text-[11px] text-slate-400 font-bold uppercase mt-1">Total Franchise Capital</p>
          </div>

          <div className="glass-card rounded-2xl p-4 border border-slate-800 text-center">
            <span className="text-2xl sm:text-3xl font-black font-mono text-purple-400">100%</span>
            <p className="text-[11px] text-slate-400 font-bold uppercase mt-1">Real-Time Sync</p>
          </div>
        </div>

        {/* Portals Access Grid */}
        <div className="pt-16 grid grid-cols-1 md:grid-cols-3 gap-6 text-left max-w-5xl mx-auto">
          <Link to="/podium/dashboard" className="glass-card glass-card-hover rounded-2xl p-6 border border-slate-800 space-y-3">
            <div className="p-3 bg-rose-500/10 text-rose-400 rounded-xl w-fit border border-rose-500/20">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-white">Podium Admin Control</h3>
            <p className="text-xs text-slate-400">Auctioneer room: player selection, timer duration, blind/normal mode, dispute overrides.</p>
          </Link>

          <Link to="/manager/dashboard" className="glass-card glass-card-hover rounded-2xl p-6 border border-slate-800 space-y-3">
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl w-fit border border-emerald-500/20">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-white">Manager War Room</h3>
            <p className="text-xs text-slate-400">Authenticated franchise bidding deck with exact monetary raises and budget guardrails.</p>
          </Link>

          <Link to="/player/register" className="glass-card glass-card-hover rounded-2xl p-6 border border-slate-800 space-y-3">
            <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl w-fit border border-blue-500/20">
              <UserPlus className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-white">Player Onboarding</h3>
            <p className="text-xs text-slate-400">Participant registration form with primary position designation and WebP compression.</p>
          </Link>
        </div>

      </section>
    </div>
  );
}
