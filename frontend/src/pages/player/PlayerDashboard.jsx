import React from 'react';
import { Link } from 'react-router-dom';
import { User, Award, Shield, Settings, Trophy, CheckCircle2, Clock } from 'lucide-react';
import { useAuction } from '../../context/AuctionContext';
import Navbar from '../../components/Navbar';

export default function PlayerDashboard() {
  const { players, formatCurrency } = useAuction();
  
  // Showcase primary player profile
  const player = players[0];

  return (
    <div className="min-h-screen flex flex-col bg-darkBg text-slate-100">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 space-y-6">
        
        <div className="glass-card rounded-2xl p-6 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img src={player.picture} alt="" className="w-20 h-20 rounded-2xl object-cover border-2 border-purple-500/40 shadow-xl" />
            <div>
              <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">Self-Serve Player Portal</span>
              <h1 className="text-2xl font-black font-heading text-white">{player.name}</h1>
              <p className="text-xs text-slate-300">{player.jerseyName} &bull; <span className="font-mono text-slate-400">{player.studentId}</span></p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/player/settings"
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
            >
              <Settings className="w-4 h-4" /> Participation Settings
            </Link>

            <Link
              to="/player/results"
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow"
            >
              <Trophy className="w-4 h-4" /> Auction Results
            </Link>
          </div>
        </div>

        {/* Status Card Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card rounded-2xl p-5 border border-slate-800 space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Assigned Category</span>
            <p className="text-xl font-black font-heading text-amber-400">{player.category}</p>
            <p className="text-[11px] text-slate-400">Base Price: <strong className="font-mono text-emerald-400">{formatCurrency(player.basePrice)}</strong></p>
          </div>

          <div className="glass-card rounded-2xl p-5 border border-slate-800 space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Academic Session</span>
            <p className="text-base font-extrabold text-white">{player.session}</p>
            <p className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Verified Participant
            </p>
          </div>

          <div className="glass-card rounded-2xl p-5 border border-slate-800 space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Live Auction Status</span>
            <p className="text-xl font-black font-heading capitalize text-blue-400">{player.status}</p>
            <p className="text-[11px] text-slate-400">Waiting for live podium call</p>
          </div>
        </div>

      </main>
    </div>
  );
}
