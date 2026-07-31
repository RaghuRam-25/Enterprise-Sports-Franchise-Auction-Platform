import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Settings, Lock, AlertTriangle, ArrowLeft, Loader2, Key, ShieldCheck, CheckCircle2, Clock, XCircle, Bell, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAuction } from '../../context/AuctionContext';
import { playerAPI } from '../../services/api';
import api from '../../services/api';

export default function PlayerSettings() {
  const { user, updateUser, logout } = useAuth();
  const { isRegistrationFrozen, triggerToast } = useAuction();
  const navigate = useNavigate();

  const [myPlayer, setMyPlayer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState(false);

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Team Manager Request Status
  const [managerRequestStatus, setManagerRequestStatus] = useState(user?.managerRequestStatus || 'none');
  const [requestingManager, setRequestingManager] = useState(false);

  // Notification Preferences State
  const [notifications, setNotifications] = useState({
    auctionAlerts: true,
    bidUpdates: true,
    emailDigest: false
  });

  useEffect(() => {
    const loadMyProfile = async () => {
      try {
        const res = await playerAPI.getMyProfile();
        setMyPlayer(res.data || null);
      } catch (err) {
        console.error('Failed to load player profile:', err);
      } finally {
        setLoading(false);
      }
    };
    if (user) loadMyProfile();
  }, [user]);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      triggerToast('Please fill in all password fields.', 'error');
      return;
    }
    setChangingPassword(true);
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword });
      triggerToast('Password changed successfully.', 'success');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      triggerToast(err.response?.data?.message || 'Failed to change password.', 'error');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleRequestTeamManager = async () => {
    setRequestingManager(true);
    try {
      // Correct endpoint: POST /api/players/request-manager
      await api.post('/players/request-manager');
      setManagerRequestStatus('PENDING');
      if (typeof updateUser === 'function') {
        updateUser({ managerRequestStatus: 'PENDING' });
      }
      triggerToast('Team Manager access request submitted! Awaiting Super Admin review.', 'success');
    } catch (err) {
      const msg = err?.response?.data?.message || '';
      if (msg.includes('already') || msg.includes('pending')) {
        // Request already exists
        setManagerRequestStatus('PENDING');
        if (typeof updateUser === 'function') {
          updateUser({ managerRequestStatus: 'PENDING' });
        }
        triggerToast('You already have a pending request. Awaiting Super Admin review.', 'info');
      } else {
        triggerToast(msg || 'Failed to submit request. Please try again.', 'error');
      }
    } finally {
      setRequestingManager(false);
    }
  };

  const handleWithdraw = async () => {
    if (isRegistrationFrozen) {
      triggerToast('Cannot withdraw: Super Admin registration freeze is active.', 'error');
      return;
    }
    if (!myPlayer) return;

    if (!window.confirm('Are you sure you want to withdraw your draft registration? This action cannot be undone.')) {
      return;
    }

    setWithdrawing(true);
    try {
      const id = myPlayer._id || myPlayer.id;
      await playerAPI.withdraw(id);
      setMyPlayer((prev) => ({ ...prev, status: 'WITHDRAWN' }));
      triggerToast('Participation withdrawn successfully.', 'warning');
    } catch (err) {
      triggerToast(err.response?.data?.message || 'Failed to withdraw participation.', 'error');
    } finally {
      setWithdrawing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black font-heading text-white flex items-center gap-2">
            <Settings className="w-6 h-6 text-purple-400" /> Account Settings
          </h1>
          <p className="text-xs text-slate-400 mt-1">Manage security credentials, preferences, and platform role requests.</p>
        </div>
        <Link
          to="/player/profile"
          className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-800 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to My Profile
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* 1. Change Password */}
        <div className="bg-slate-900/90 rounded-2xl p-6 border border-slate-800 space-y-4">
          <h2 className="text-sm font-extrabold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <Key className="w-4 h-4 text-emerald-400" /> Change Password
          </h2>

          <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-emerald-500 font-mono"
                placeholder="Enter current password"
                required
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-emerald-500 font-mono"
                placeholder="Enter new password (min 6 chars)"
                required
              />
            </div>

            <button
              type="submit"
              disabled={changingPassword}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-xl transition flex items-center justify-center gap-2"
            >
              {changingPassword && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Update Password
            </button>
          </form>
        </div>

        {/* 2. Team Manager Access Request */}
        <div className="bg-slate-900/90 rounded-2xl p-6 border border-slate-800 space-y-4">
          <h2 className="text-sm font-extrabold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <ShieldCheck className="w-4 h-4 text-purple-400" /> Request Team Manager Access
          </h2>

          <div className="space-y-3 text-xs">
            <p className="text-slate-400">
              Submit a request to Super Admin to upgrade your role to <span className="text-purple-400 font-bold">TEAM_MANAGER</span>.
            </p>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
              <span className="font-semibold text-slate-300">Request Status:</span>
              {managerRequestStatus === 'PENDING' || managerRequestStatus === 'pending' ? (
                <span className="flex items-center gap-1 text-amber-400 font-bold px-2 py-0.5 bg-amber-500/10 rounded border border-amber-500/20">
                  <Clock className="w-3.5 h-3.5" /> Pending Review
                </span>
              ) : managerRequestStatus === 'APPROVED' || managerRequestStatus === 'approved' ? (
                <span className="flex items-center gap-1 text-emerald-400 font-bold px-2 py-0.5 bg-emerald-500/10 rounded border border-emerald-500/20">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                </span>
              ) : managerRequestStatus === 'REJECTED' || managerRequestStatus === 'rejected' ? (
                <span className="flex items-center gap-1 text-rose-400 font-bold px-2 py-0.5 bg-rose-500/10 rounded border border-rose-500/20">
                  <XCircle className="w-3.5 h-3.5" /> Declined
                </span>
              ) : (
                <span className="text-slate-500 font-bold">None</span>
              )}
            </div>

            <button
              onClick={handleRequestTeamManager}
              disabled={requestingManager || managerRequestStatus === 'PENDING' || managerRequestStatus === 'APPROVED'}
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold rounded-xl transition flex items-center justify-center gap-2"
            >
              {requestingManager && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {managerRequestStatus === 'PENDING' ? 'Request Pending Approval' : 'Submit Team Manager Request'}
            </button>
          </div>
        </div>

        {/* 3. Notification Preferences */}
        <div className="bg-slate-900/90 rounded-2xl p-6 border border-slate-800 space-y-4">
          <h2 className="text-sm font-extrabold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <Bell className="w-4 h-4 text-blue-400" /> Notification Preferences
          </h2>

          <div className="space-y-3 text-xs">
            <label className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800 cursor-pointer">
              <span className="text-slate-300 font-semibold">Live Auction Calls</span>
              <input
                type="checkbox"
                checked={notifications.auctionAlerts}
                onChange={(e) => setNotifications(p => ({ ...p, auctionAlerts: e.target.checked }))}
                className="w-4 h-4 rounded accent-purple-600"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800 cursor-pointer">
              <span className="text-slate-300 font-semibold">Bid Status Updates</span>
              <input
                type="checkbox"
                checked={notifications.bidUpdates}
                onChange={(e) => setNotifications(p => ({ ...p, bidUpdates: e.target.checked }))}
                className="w-4 h-4 rounded accent-purple-600"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800 cursor-pointer">
              <span className="text-slate-300 font-semibold">Email Summary Digest</span>
              <input
                type="checkbox"
                checked={notifications.emailDigest}
                onChange={(e) => setNotifications(p => ({ ...p, emailDigest: e.target.checked }))}
                className="w-4 h-4 rounded accent-purple-600"
              />
            </label>
          </div>
        </div>

        {/* 4. Withdraw Registration & Session Actions */}
        <div className="bg-slate-900/90 rounded-2xl p-6 border border-slate-800 space-y-4">
          <h2 className="text-sm font-extrabold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <AlertTriangle className="w-4 h-4 text-rose-400" /> Account & Draft Status
          </h2>

          <div className="space-y-3 text-xs">
            {isRegistrationFrozen ? (
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                  <Lock className="w-3.5 h-3.5" /> Registration Frozen
                </div>
                <p className="text-slate-400">
                  Draft participation withdrawal is currently locked because Registration Freeze is active.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-slate-400">
                  Withdrawing will remove your profile from the live auction pool.
                </p>
                <button
                  onClick={handleWithdraw}
                  disabled={myPlayer?.status === 'WITHDRAWN' || myPlayer?.status === 'withdrawn' || withdrawing}
                  className={`w-full py-2.5 rounded-xl font-bold transition border flex items-center justify-center gap-2 ${
                    myPlayer?.status === 'WITHDRAWN' || myPlayer?.status === 'withdrawn'
                      ? 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
                      : 'bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white border-rose-500/40'
                  }`}
                >
                  {withdrawing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {myPlayer?.status === 'WITHDRAWN' || myPlayer?.status === 'withdrawn'
                    ? 'Participation Withdrawn'
                    : 'Withdraw Registration'}
                </button>
              </div>
            )}

            <div className="pt-2 border-t border-slate-800">
              <button
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
                className="w-full py-2.5 bg-slate-950 hover:bg-rose-950/40 text-slate-300 hover:text-rose-300 border border-slate-800 hover:border-rose-800 rounded-xl font-bold transition flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4 text-rose-400" /> Sign Out of Account
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}