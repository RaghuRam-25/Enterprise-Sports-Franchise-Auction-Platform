import  { useState, useEffect } from 'react';
import {  useNavigate } from 'react-router-dom';
import { Settings, Lock, AlertTriangle, Loader2, Key, ShieldCheck, CheckCircle2, Clock, XCircle, Bell, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAuction } from '../../context/AuctionContext';
import api from '../../services/api';

export default function PlayerSettings() {
  const { user, updateUser, logout } = useAuth();
  const { isRegistrationFrozen, triggerToast, refetchPlayers } = useAuction();
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
        const res = await api.get('/players/me');
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
      await api.put(`/players/${id}/withdraw`);
      setMyPlayer((prev) => ({ ...prev, status: 'WITHDRAWN' }));
      if (typeof refetchPlayers === 'function') {
        refetchPlayers();
      }
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
        <Loader2 className="w-8 h-8 animate-spin text-warningGold" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black font-heading text-white flex items-center gap-2">
            <Settings className="w-6 h-6 text-warningGold" /> Account Settings
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* 1. Change Password */}
        <div className="bg-cardBg/90 rounded-2xl p-6 border border-cardBorder space-y-4">
          <h2 className="text-sm font-extrabold text-white flex items-center gap-2 border-b border-cardBorder pb-3">
            <Key className="w-4 h-4 text-neonGreen" /> Change Password
          </h2>

          <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
            <div>
              <label className="block text-secondaryText font-semibold mb-1">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full bg-darkBg border border-borderStrong rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-neonGreen font-mono"
                placeholder="Enter current password"
                required
              />
            </div>

            <div>
              <label className="block text-secondaryText font-semibold mb-1">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-darkBg border border-borderStrong rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-neonGreen font-mono"
                placeholder="Enter new password (min 6 chars)"
                required
              />
            </div>

            <button
              type="submit"
              disabled={changingPassword}
              className="btn-primary w-full py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
            >
              {changingPassword && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Update Password
            </button>
          </form>
        </div>

        {/* 2. Team Manager Access Request */}
        <div className="bg-cardBg/90 rounded-2xl p-6 border border-cardBorder space-y-4">
          <h2 className="text-sm font-extrabold text-white flex items-center gap-2 border-b border-cardBorder pb-3">
            <ShieldCheck className="w-4 h-4 text-warningGold" /> Request Team Manager Access
          </h2>

          <div className="space-y-3 text-xs">
            <p className="text-secondaryText">
              Submit a request to Super Admin to upgrade your role to <span className="text-warningGold font-bold">TEAM_MANAGER</span>.
            </p>

            <div className="p-3 bg-darkBg border border-cardBorder rounded-xl flex items-center justify-between">
              <span className="font-semibold text-secondaryText">Request Status:</span>
              {managerRequestStatus === 'PENDING' || managerRequestStatus === 'pending' ? (
                <span className="flex items-center gap-1 text-warningGold font-bold px-2 py-0.5 bg-warningGold/10 rounded border border-warningGold/20">
                  <Clock className="w-3.5 h-3.5" /> Pending Review
                </span>
              ) : managerRequestStatus === 'APPROVED' || managerRequestStatus === 'approved' ? (
                <span className="flex items-center gap-1 text-neonGreen font-bold px-2 py-0.5 bg-neonGreen/10 rounded border border-neonGreen/20">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                </span>
              ) : managerRequestStatus === 'REJECTED' || managerRequestStatus === 'rejected' ? (
                <span className="flex items-center gap-1 text-urgentRedText font-bold px-2 py-0.5 bg-urgentRed/10 rounded border border-urgentRed/20">
                  <XCircle className="w-3.5 h-3.5" /> Declined
                </span>
              ) : (
                <span className="text-mutedText font-bold">None</span>
              )}
            </div>

            <button
              onClick={handleRequestTeamManager}
              disabled={requestingManager || managerRequestStatus === 'PENDING' || managerRequestStatus === 'APPROVED'}
              className={`w-full py-2.5 rounded-xl font-bold transition flex items-center justify-center gap-2 ${
                managerRequestStatus === 'PENDING' || managerRequestStatus === 'APPROVED'
                  ? 'btn-secondary opacity-60 cursor-not-allowed'
                  : 'btn-primary'
              }`}
            >
              {requestingManager && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {managerRequestStatus === 'PENDING' ? 'Request Pending Approval' : managerRequestStatus === 'APPROVED' ? 'Access Approved' : 'Submit Team Manager Request'}
            </button>
          </div>
        </div>

        {/* 3. Notification Preferences */}
        <div className="bg-cardBg/90 rounded-2xl p-6 border border-cardBorder space-y-4">
          <h2 className="text-sm font-extrabold text-white flex items-center gap-2 border-b border-cardBorder pb-3">
            <Bell className="w-4 h-4 text-neonGreen" /> Notification Preferences
          </h2>

          <div className="space-y-3 text-xs">
            <label className="flex items-center justify-between p-3 bg-darkBg rounded-xl border border-borderStrong cursor-pointer">
              <span className="text-secondaryText font-semibold">Live Auction Calls</span>
              <input
                type="checkbox"
                checked={notifications.auctionAlerts}
                onChange={(e) => setNotifications(p => ({ ...p, auctionAlerts: e.target.checked }))}
                className="w-4 h-4 rounded accent-warningGold"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-darkBg rounded-xl border border-borderStrong cursor-pointer">
              <span className="text-secondaryText font-semibold">Bid Status Updates</span>
              <input
                type="checkbox"
                checked={notifications.bidUpdates}
                onChange={(e) => setNotifications(p => ({ ...p, bidUpdates: e.target.checked }))}
                className="w-4 h-4 rounded accent-warningGold"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-darkBg rounded-xl border border-borderStrong cursor-pointer">
              <span className="text-secondaryText font-semibold">Email Summary Digest</span>
              <input
                type="checkbox"
                checked={notifications.emailDigest}
                onChange={(e) => setNotifications(p => ({ ...p, emailDigest: e.target.checked }))}
                className="w-4 h-4 rounded accent-warningGold"
              />
            </label>
          </div>
        </div>

        {/* 4. Withdraw Registration & Session Actions */}
        <div className="bg-cardBg/90 rounded-2xl p-6 border border-cardBorder space-y-4">
          <h2 className="text-sm font-extrabold text-white flex items-center gap-2 border-b border-cardBorder pb-3">
            <AlertTriangle className="w-4 h-4 text-urgentRedText" /> Account & Draft Status
          </h2>

          <div className="space-y-3 text-xs">
            {isRegistrationFrozen ? (
              <div className="p-3 bg-darkBg border border-cardBorder rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 text-warningGold font-bold">
                  <Lock className="w-3.5 h-3.5" /> Registration Frozen
                </div>
                <p className="text-secondaryText">
                  Draft participation withdrawal is currently locked because Registration Freeze is active.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-secondaryText">
                  Withdrawing will remove your profile from the live auction pool.
                </p>
                <button
                  onClick={handleWithdraw}
                  disabled={myPlayer?.status === 'WITHDRAWN' || myPlayer?.status === 'withdrawn' || withdrawing}
                  className={`w-full py-2.5 rounded-xl font-bold transition flex items-center justify-center gap-2 ${
                    myPlayer?.status === 'WITHDRAWN' || myPlayer?.status === 'withdrawn'
                      ? 'btn-secondary opacity-50 cursor-not-allowed'
                      : 'btn-danger'
                  }`}
                >
                  {withdrawing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {myPlayer?.status === 'WITHDRAWN' || myPlayer?.status === 'withdrawn'
                    ? 'Participation Withdrawn'
                    : 'Withdraw Registration'}
                </button>
              </div>
            )}

            <div className="pt-2 border-t border-cardBorder">
              <button
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
                className="btn-danger w-full py-3 text-xs flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" /> Sign Out of Account
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}