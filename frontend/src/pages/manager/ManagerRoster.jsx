import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, DollarSign, Users, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuction } from '../../context/AuctionContext';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/Navbar';

export default function ManagerRoster() {
  const { user } = useAuth();
  const { teams, formatCurrency, getLowestCategoryBasePrice } = useAuction();

  const activeTeam = teams.find(t => t.id === user?.teamId) || teams[0];
  const lowestBasePrice = getLowestCategoryBasePrice();
  const currentRosterCount = activeTeam.currentRoster.length;
  const remainingSlotsNeeded = Math.max(0, activeTeam.minRoster - currentRosterCount);
  const requiredReserve = remainingSlotsNeeded * lowestBasePrice;
  const totalSpent = activeTeam.totalBudget - activeTeam.remainingBudget;

  return (
    <div className="min-h-screen flex flex-col bg-darkBg text-slate-100">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        <div className="flex items-center justify-between">
          <Link
            to="/manager/dashboard"
            className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to War Room
          </Link>

          <span className="text-xs text-slate-400">
            Franchise: <strong className="text-white">{activeTeam.name}</strong>
          </span>
        </div>

        {/* Top Summary Banner */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Initial Purse</span>
            <p className="text-xl font-black font-mono text-white mt-1">{formatCurrency(activeTeam.totalBudget)}</p>
          </div>

          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Total Purse Spent</span>
            <p className="text-xl font-black font-mono text-rose-400 mt-1">{formatCurrency(totalSpent)}</p>
          </div>

          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Remaining Purse</span>
            <p className="text-xl font-black font-mono text-emerald-400 mt-1">{formatCurrency(activeTeam.remainingBudget)}</p>
          </div>

          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Required Reserve</span>
            <p className="text-xl font-black font-mono text-amber-400 mt-1">{formatCurrency(requiredReserve)}</p>
          </div>
        </div>

        {/* Acquired Roster Table */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400" /> Acquired Franchise Squad ({currentRosterCount})
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 text-slate-400 uppercase font-bold text-[11px] border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">Player Name</th>
                  <th className="py-3 px-4">Position</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Acquisition Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {activeTeam.currentRoster.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-slate-500">
                      No players acquired yet in live auction.
                    </td>
                  </tr>
                ) : (
                  activeTeam.currentRoster.map((player, idx) => (
                    <tr key={player.id || idx} className="hover:bg-slate-800/30">
                      <td className="py-3 px-4 font-mono font-bold text-slate-400">{idx + 1}</td>
                      <td className="py-3 px-4 font-extrabold text-white">{player.name}</td>
                      <td className="py-3 px-4 text-emerald-400 font-semibold">{player.position}</td>
                      <td className="py-3 px-4 font-semibold text-amber-400">{player.category}</td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-400">{formatCurrency(player.price)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>
  );
}
