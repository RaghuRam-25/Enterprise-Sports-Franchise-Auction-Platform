import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, ArrowLeft, Loader2, Clock, ShieldOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';


const formatCurrency = (val) => {
  if (!val && val !== 0) return '— BDT';
  return `${Number(val).toLocaleString('en-IN')} BDT`;
};

export default function PlayerResults() {
  const { user } = useAuth();
  const [myPlayer, setMyPlayer] = useState(null);
  const [ledgerEntry, setLedgerEntry] = useState(null);
  const [loading, setLoading] = useState(true);

  // GAP 15 FIX: Load own player + AuctionLedger data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [playersRes, historyRes] = await Promise.allSettled([
          api.get('/players', { params: { search: user?.name } }),
          api.get('/manager/history')
        ]);

        let mine = null;
        if (playersRes.status === 'fulfilled') {
          const allPlayers = playersRes.value.data?.data || playersRes.value.data || [];
          mine = allPlayers.find(p =>
            p.userId === user?._id || p.userId === user?.id || p.email === user?.email
          ) || allPlayers[0];
          setMyPlayer(mine);
        }

        if (historyRes.status === 'fulfilled' && mine) {
          const history = historyRes.value.data?.data || [];
          const myEntry = history.find(h => h.playerName === mine?.name || h.playerId === (mine?._id || mine?.id));
          setLedgerEntry(myEntry || null);
        }
      } catch (err) {
        console.error('Failed to load player results:', err);
      } finally {
        setLoading(false);
      }
    };
    if (user) loadData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  const isSold = myPlayer?.status === 'SOLD' || !!ledgerEntry;

  return (
    <div className="max-w-3xl w-full mx-auto px-4 py-8 space-y-6">

        <Link to="/player/profile" className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        <div className="glass-card rounded-2xl p-8 border border-slate-800 space-y-6 text-center shadow-2xl">

          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-lg ${
            isSold
              ? 'bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950'
              : 'bg-slate-800 text-slate-400'
          }`}>
            {isSold ? <Trophy className="w-8 h-8" /> : <Clock className="w-8 h-8" />}
          </div>

          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-amber-400">Post-Auction Official Ledger</span>
            <h1 className="text-2xl font-black font-heading text-white mt-1">Auction Result Certificate</h1>
          </div>

          {myPlayer ? (
            <div className="bg-slate-950/80 p-6 rounded-2xl border border-slate-800 space-y-4 max-w-md mx-auto">
              <div className="flex items-center justify-center gap-3">
                {/* GAP 1 FIX: imageUrl not picture */}
                <img
                  src={myPlayer.imageUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80'}
                  alt={myPlayer.name}
                  className="w-16 h-16 rounded-full object-cover border-2 border-amber-500/40"
                />
                <div className="text-left">
                  <h3 className="font-black text-lg text-white">{myPlayer.name}</h3>
                  <p className="text-xs text-slate-400">{myPlayer.jerseyName} &bull; {myPlayer.category}</p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-400">
                  <span>Sale Status:</span>
                  <span className={`font-extrabold uppercase ${isSold ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {isSold ? 'SOLD' : (myPlayer.status || 'PENDING')}
                  </span>
                </div>

                {isSold && (
                  <>
                    <div className="flex justify-between items-center text-slate-400">
                      <span>Final Hammer Price:</span>
                      <span className="font-mono font-bold text-xl text-emerald-400">
                        {formatCurrency(myPlayer.finalPrice || ledgerEntry?.soldPrice)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-slate-400">
                      <span>Assigned Franchise Team:</span>
                      <span className="font-extrabold text-white">
                        {ledgerEntry?.teamName || 'See Admin'}
                      </span>
                    </div>
                  </>
                )}

                {!isSold && (
                  <div className="p-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-400 text-center">
                    <ShieldOff className="w-6 h-6 mx-auto mb-1 text-slate-600" />
                    <p>Auction result not yet available for your profile.</p>
                    <p className="text-[10px] mt-0.5 text-slate-500">Check back after the live auction concludes.</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-slate-400 text-sm">No player profile found for your account.</div>
          )}

        </div>

    </div>
  );
}
