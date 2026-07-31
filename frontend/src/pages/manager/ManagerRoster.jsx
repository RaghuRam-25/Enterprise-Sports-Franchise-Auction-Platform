import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Users, ArrowLeft, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuction } from '../../context/AuctionContext';
import api from '../../services/api';
import Navbar from '../../components/Navbar';

const formatCurrency = (val) => {
  if (!val && val !== 0) return '—';
  return `${Number(val).toLocaleString('en-IN')} BDT`;
};

export default function ManagerRoster() {
  const { getLowestCategoryBasePrice } = useAuction();

  const [rosterData, setRosterData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // GAP 8 FIX: Load real roster data from backend
  useEffect(() => {
    const loadRoster = async () => {
      try {
        setLoading(true);
        const res = await api.get('/manager/roster');
        setRosterData(res.data?.data || null);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load roster data');
      } finally {
        setLoading(false);
      }
    };
    loadRoster();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-darkBg text-slate-100">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
        </div>
      </div>
    );
  }

  if (error || !rosterData) {
    return (
      <div className="min-h-screen flex flex-col bg-darkBg text-slate-100">
        <Navbar />
        <main className="flex-1 max-w-3xl mx-auto px-4 py-8">
          <div className="glass-card rounded-2xl p-8 border border-rose-800/50 text-center text-rose-400 space-y-2">
            <AlertCircle className="w-10 h-10 mx-auto" />
            <p className="font-bold">{error || 'Roster data unavailable'}</p>
          </div>
        </main>
      </div>
    );
  }

  const { team, players } = rosterData;
  const lowestBasePrice = getLowestCategoryBasePrice();
  const remainingSlotsNeeded = Math.max(0, team.minRoster - team.currentRosterCount);
  const requiredReserve = remainingSlotsNeeded * lowestBasePrice;

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
            Franchise: <strong className="text-white">{team.name}</strong>
          </span>
        </div>

        {/* Budget Summary Banner */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Initial Purse</span>
            <p className="text-xl font-black font-mono text-white mt-1">{formatCurrency(team.totalBudget)}</p>
          </div>
          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Total Spent</span>
            <p className="text-xl font-black font-mono text-rose-400 mt-1">{formatCurrency(team.spentBudget)}</p>
          </div>
          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Remaining Purse</span>
            <p className="text-xl font-black font-mono text-emerald-400 mt-1">{formatCurrency(team.remainingBudget)}</p>
          </div>
          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Required Reserve</span>
            <p className="text-xl font-black font-mono text-amber-400 mt-1">{formatCurrency(requiredReserve)}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {remainingSlotsNeeded > 0
                ? `${remainingSlotsNeeded} more slot${remainingSlotsNeeded > 1 ? 's' : ''} needed`
                : <span className="text-emerald-500 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Min roster fulfilled</span>}
            </p>
          </div>
        </div>

        {/* Acquired Roster Table */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400" />
            Acquired Franchise Squad ({team.currentRosterCount} / {team.minRoster} min)
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 text-slate-400 uppercase font-bold text-[11px] border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">Player</th>
                  <th className="py-3 px-4">Position</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Acquisition Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {players.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-slate-500">
                      No players acquired yet in live auction.
                    </td>
                  </tr>
                ) : (
                  players.map((player, idx) => (
                    <tr key={player._id || idx} className="hover:bg-slate-800/30">
                      <td className="py-3 px-4 font-mono font-bold text-slate-400">{idx + 1}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <img
                            src={player.imageUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                            alt={player.name}
                            className="w-8 h-8 rounded-lg object-cover border border-slate-700"
                          />
                          <div>
                            <p className="font-extrabold text-white">{player.name}</p>
                            <p className="text-[10px] text-slate-500 font-mono">{player.jerseyName}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-emerald-400 font-semibold">{player.primaryPosition}</td>
                      <td className="py-3 px-4 font-semibold text-amber-400">{player.category}</td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-400">{formatCurrency(player.finalPrice)}</td>
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
