import  { useState, useEffect } from 'react';

import { Trophy, Loader2, Clock, ShieldOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { playerFallback } from '../../utils/playerFallback';
import { getImageUrl } from '../../utils/imageUrl';
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
        <Loader2 className="w-8 h-8 animate-spin text-warningGold" />
      </div>
    );
  }

  const isSold = myPlayer?.status === 'SOLD' || !!ledgerEntry;

  return (
    <div className="max-w-8xl w-full mx-auto px-4 py-8 space-y-12">
        <div className="glass-card rounded-2xl p-8 border border-cardBorder space-y-6 text-center shadow-2xl">

          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-lg ${
            isSold
              ? 'bg-gradient-to-tr from-warningGold to-warningGold text-darkBg'
              : 'bg-surfaceHover text-secondaryText'
          }`}>
            {isSold ? <Trophy className="w-8 h-8" /> : <Clock className="w-8 h-8" />}
          </div>

          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-warningGold">Post-Auction Official Ledger</span>
            <h1 className="text-2xl font-black font-heading text-white mt-1">Auction Result Certificate</h1>
          </div>

          {myPlayer ? (
            <div className="bg-darkBg/80 p-6 rounded-2xl border border-cardBorder space-y-4 max-w-md mx-auto">
              <div className="flex items-center justify-center gap-3">
                {/* GAP 1 FIX: imageUrl not picture */}
                <img
                  src={getImageUrl(myPlayer.imageUrl, playerFallback('gold'))}
                  alt={myPlayer.name}
                  className="w-16 h-16 rounded-full object-cover border-2 border-warningGold/40"
                />
                <div className="text-left">
                  <h3 className="font-black text-lg text-white">{myPlayer.name || 'Unnamed Player'}</h3>
                  <p className="text-xs text-secondaryText">{myPlayer.jerseyName || '—'} &bull; {myPlayer.category || 'Unranked'}</p>
                </div>
              </div>

              <div className="pt-3 border-t border-cardBorder space-y-2 text-xs">
                <div className="flex justify-between items-center text-secondaryText">
                  <span>Sale Status:</span>
                  <span className={`font-extrabold uppercase ${isSold ? 'text-neonGreen' : 'text-secondaryText'}`}>
                    {isSold ? 'SOLD' : (myPlayer.status || 'PENDING')}
                  </span>
                </div>

                {isSold && (
                  <>
                    <div className="flex justify-between items-center text-secondaryText">
                      <span>Final Hammer Price:</span>
                      <span className="font-mono font-bold text-xl text-neonGreen">
                        {formatCurrency(myPlayer.finalPrice || ledgerEntry?.soldPrice)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-secondaryText">
                      <span>Assigned Franchise Team:</span>
                      <span className="font-extrabold text-white">
                        {ledgerEntry?.teamName || 'See Admin'}
                      </span>
                    </div>
                  </>
                )}

                {!isSold && (
                  <div className="p-3 bg-cardBg border border-borderStrong rounded-xl text-secondaryText text-center">
                    <ShieldOff className="w-6 h-6 mx-auto mb-1 text-mutedText" />
                    <p>Auction result not yet available for your profile.</p>
                    <p className="text-[10px] mt-0.5 text-mutedText">Check back after the live auction concludes.</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-secondaryText text-sm">No player profile found for your account.</div>
          )}

        </div>

    </div>
  );
}
