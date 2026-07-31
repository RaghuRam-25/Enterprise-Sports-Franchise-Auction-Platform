import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Settings, Lock, AlertTriangle, ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAuction } from '../../context/AuctionContext';
import { playerAPI } from '../../services/api';
import api from '../../services/api';
import Navbar from '../../components/Navbar';

export default function PlayerSettings() {
  const { user } = useAuth();
  const { isRegistrationFrozen, triggerToast } = useAuction();

  const [myPlayer, setMyPlayer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState(false);

  // GAP 1 FIX: Load own player profile
  useEffect(() => {
    const loadMyProfile = async () => {
      try {
        const res = await api.get('/players', { params: { search: user?.name } });
        const allPlayers = res.data?.data || res.data || [];
        const mine = allPlayers.find(p => p.userId === user?._id || p.userId === user?.id || p.email === user?.email);
        setMyPlayer(mine || allPlayers[0] || null);
      } catch (err) {
        console.error('Failed to load player profile:', err);
      } finally {
        setLoading(false);
      }
    };
    if (user) loadMyProfile();
  }, [user]);

  // GAP 2 FIX: Call real API for withdrawal
  const handleWithdraw = async () => {
    if (isRegistrationFrozen) {
      triggerToast('Cannot withdraw: Super Admin registration freeze is active.', 'error');
      return;
    }
    if (!myPlayer) return;

    setWithdrawing(true);
    try {
      const id = myPlayer._id || myPlayer.id;
      await playerAPI.withdraw(id);
      setMyPlayer(prev => ({ ...prev, status: 'WITHDRAWN' }));
      triggerToast('Participation withdrawn successfully.', 'warning');
    } catch (err) {
      triggerToast(err.response?.data?.message || 'Failed to withdraw participation.', 'error');
    } finally {
      setWithdrawing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-darkBg text-slate-100">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-darkBg text-slate-100">
      <Navbar />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8 space-y-6">

        <Link to="/player/profile" className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition">
          <ArrowLeft className="w-4 h-4" /> Back to Profile
        </Link>

        <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-6">

          <div className="border-b border-slate-800 pb-4">
            <h1 className="text-xl font-black font-heading text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-purple-400" /> Participation Settings & Withdrawal
            </h1>
            <p className="text-xs text-slate-400 mt-1">Manage your active draft status prior to registration freeze.</p>
          </div>

          {isRegistrationFrozen ? (
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                <Lock className="w-4 h-4 text-amber-400" /> REGISTRATION FROZEN BY SUPER ADMIN
              </div>
              <p className="text-xs text-slate-400">
                The Super Admin has triggered the global registration freeze. Profile updates and participation withdrawal buttons are automatically disabled.
              </p>
            </div>
          ) : (
            <div className="p-5 bg-rose-950/40 border border-rose-500/30 rounded-2xl space-y-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-rose-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-extrabold text-sm text-rose-300">Withdraw Participation</h3>
                  <p className="text-xs text-slate-300 mt-1">
                    Withdrawing will remove your profile from the unsold auction lottery pool. This action can only be taken before the registration freeze.
                  </p>
                </div>
              </div>

              <button
                onClick={handleWithdraw}
                disabled={myPlayer?.status === 'WITHDRAWN' || myPlayer?.status === 'withdrawn' || withdrawing}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs transition border shadow flex items-center gap-2 ${
                  myPlayer?.status === 'WITHDRAWN' || myPlayer?.status === 'withdrawn'
                    ? 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
                    : 'bg-rose-600 hover:bg-rose-500 text-white border-rose-500'
                }`}
              >
                {withdrawing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {myPlayer?.status === 'WITHDRAWN' || myPlayer?.status === 'withdrawn'
                  ? 'Participation Withdrawn'
                  : 'Withdraw Participation'}
              </button>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
