import React from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Shield, ArrowLeft, CheckCircle2, DollarSign } from 'lucide-react';
import { useAuction } from '../../context/AuctionContext';
import Navbar from '../../components/Navbar';

export default function PlayerResults() {
  const { players, teams, formatCurrency } = useAuction();
  const player = players[0];

  const assignedTeam = teams.find(t => t.id === player.soldToTeamId) || teams[0];
  const isSold = player.status === 'sold' || player.soldPrice;

  return (
    <div className="min-h-screen flex flex-col bg-darkBg text-slate-100">
      <Navbar />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8 space-y-6">
        
        <Link to="/player/dashboard" className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        <div className="glass-card rounded-2xl p-8 border border-slate-800 space-y-6 text-center shadow-2xl">
          
          <div className="w-16 h-16 bg-gradient-to-tr from-amber-500 to-yellow-300 rounded-2xl flex items-center justify-center mx-auto shadow-lg text-slate-950">
            <Trophy className="w-8 h-8" />
          </div>

          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-amber-400">Post-Auction Official Ledger</span>
            <h1 className="text-2xl font-black font-heading text-white mt-1">Auction Result Certificate</h1>
          </div>

          <div className="bg-slate-950/80 p-6 rounded-2xl border border-slate-800 space-y-4 max-w-md mx-auto">
            <div className="flex items-center justify-center gap-3">
              <img src={player.picture} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-amber-500/40" />
              <div className="text-left">
                <h3 className="font-black text-lg text-white">{player.name}</h3>
                <p className="text-xs text-slate-400">{player.jerseyName} &bull; {player.category}</p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-400">
                <span>Sale Status:</span>
                <span className="font-extrabold text-emerald-400 uppercase">{isSold ? 'SOLD' : player.status}</span>
              </div>

              <div className="flex justify-between items-center text-slate-400">
                <span>Final Hammer Price:</span>
                <span className="font-mono font-bold text-xl text-emerald-400">
                  {formatCurrency(player.soldPrice || 21500000)}
                </span>
              </div>

              <div className="flex justify-between items-center text-slate-400">
                <span>Assigned Franchise Team:</span>
                <span className="font-extrabold text-white flex items-center gap-1.5">
                  <span>{assignedTeam.logo}</span>
                  <span>{assignedTeam.name}</span>
                </span>
              </div>
            </div>
          </div>

        </div>

      </main>
    </div>
  );
}
