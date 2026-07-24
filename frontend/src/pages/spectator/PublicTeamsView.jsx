import React from 'react';
import { Shield, Users, DollarSign, Trophy } from 'lucide-react';
import { useAuction } from '../../context/AuctionContext';
import Navbar from '../../components/Navbar';

export default function PublicTeamsView() {
  const { teams, formatCurrency } = useAuction();

  return (
    <div className="min-h-screen flex flex-col bg-darkBg text-slate-100">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        <div className="glass-card rounded-2xl p-6 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">Public Franchise Directory</span>
            <h1 className="text-2xl font-black font-heading text-white">Franchise Teams & Rosters</h1>
            <p className="text-xs text-slate-400 mt-1">Explore all competing franchises, remaining purse balances, and acquired rosters.</p>
          </div>
          <Shield className="w-8 h-8 text-emerald-400 opacity-80" />
        </div>

        {/* Teams Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {teams.map(team => {
            const totalSpent = team.totalBudget - team.remainingBudget;
            return (
              <div key={team.id} className="glass-card rounded-2xl p-6 border border-slate-800 space-y-6">
                
                {/* Team Info Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl">{team.logo}</span>
                    <div>
                      <h2 className="text-xl font-black text-white">{team.name}</h2>
                      <span className="font-mono text-xs text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        {team.code}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Remaining Purse</span>
                    <p className="font-mono font-bold text-emerald-400 text-sm">{formatCurrency(team.remainingBudget)}</p>
                  </div>
                </div>

                {/* Purse Progress Bar */}
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-slate-400 text-[11px]">
                    <span>Purse Spent: {formatCurrency(totalSpent)}</span>
                    <span>Total Purse: {formatCurrency(team.totalBudget)}</span>
                  </div>
                  <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all"
                      style={{ width: `${Math.min(100, (totalSpent / team.totalBudget) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Roster Squad List */}
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-bold uppercase text-slate-400 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-blue-400" /> Acquired Squad ({team.currentRoster.length} Players)
                  </h4>

                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {team.currentRoster.length === 0 ? (
                      <p className="text-xs text-slate-500 py-4 text-center">No players acquired yet.</p>
                    ) : (
                      team.currentRoster.map((player, idx) => (
                        <div key={idx} className="bg-slate-900/70 border border-slate-800 p-2.5 rounded-xl flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-white">{player.name}</span>
                            <span className="text-[10px] text-slate-400 ml-2">({player.position})</span>
                          </div>
                          <span className="font-mono font-bold text-emerald-400">{formatCurrency(player.price)}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            );
          })}
        </div>

      </main>
    </div>
  );
}
