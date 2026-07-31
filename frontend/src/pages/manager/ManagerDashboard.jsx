import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Zap, DollarSign, AlertCircle, Users, Gavel, Clock, Lock, CheckCircle2, TrendingUp, Search, Key, X } from 'lucide-react';
import { useAuction } from '../../context/AuctionContext';
import { useAuth } from '../../context/AuthContext';
import api, { managerAPI } from '../../services/api';
import Navbar from '../../components/Navbar';

export const ManagerDashboard = () => {
  const { user } = useAuth();
  const {
    teams = [],
    podiumPlayer,
    currentBid = 0,
    highestBidder,
    biddingMode = 'normal',
    timerRemaining = 0,
    timerStatus = 'idle',
    bidHistory = [],
    calculateNextBidAmount,
    placeNormalBid,
    placeBlindBid,
    getLowestCategoryBasePrice,
    formatCurrency = (v) => `${v} BDT`,
    triggerToast = () => {},
    refetchTeams
  } = useAuction();

  // Fallback default team object so page never crashes if teams list is initializing
  const defaultTeam = {
    id: 'team-default',
    name: 'Franchise Team',
    code: 'TEAM',
    logo: '🏆',
    totalBudget: 100000000,
    remainingBudget: 100000000,
    minRoster: 11,
    currentRoster: []
  };

  const safeTeams = Array.isArray(teams) ? teams : [];
  const activeTeam = safeTeams.find(t => (t.id || t._id) === user?.teamId) || safeTeams[0] || defaultTeam;

  const [blindBidAmount, setBlindBidAmount] = useState('');
  const [blindBidError, setBlindBidError] = useState('');
  const [isBidding, setIsBidding] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [changingPass, setChangingPass] = useState(false);

  // Team Edit Modal state
  const [showEditTeamModal, setShowEditTeamModal] = useState(false);
  const [teamForm, setTeamForm] = useState({ name: '', shortCode: '', description: '' });
  const [teamLogoFile, setTeamLogoFile] = useState(null);
  const [teamLogoPreview, setTeamLogoPreview] = useState(null);
  const [removeTeamLogo, setRemoveTeamLogo] = useState(false);
  const [savingTeam, setSavingTeam] = useState(false);

  const openTeamEdit = () => {
    setTeamForm({
      name: activeTeam?.name || '',
      shortCode: activeTeam?.shortCode || activeTeam?.code || '',
      description: activeTeam?.description || ''
    });
    setTeamLogoFile(null);
    setTeamLogoPreview(null);
    setRemoveTeamLogo(false);
    setShowEditTeamModal(true);
  };

  const handleSaveTeamProfile = async (e) => {
    e.preventDefault();
    setSavingTeam(true);
    try {
      const formData = new FormData();
      if (teamForm.name) formData.append('name', teamForm.name);
      if (teamForm.shortCode) formData.append('shortCode', teamForm.shortCode.toUpperCase());
      formData.append('description', teamForm.description || '');

      if (teamLogoFile) {
        formData.append('logo', teamLogoFile);
      } else if (removeTeamLogo) {
        formData.append('removeLogo', 'true');
      }

      const res = await managerAPI.updateTeam(formData);
      if (res?.success || res?.data) {
        triggerToast('Team profile updated successfully!', 'success');
        if (typeof refetchTeams === 'function') refetchTeams();
        setShowEditTeamModal(false);
      }
    } catch (err) {
      triggerToast(err?.response?.data?.message || 'Failed to update team profile', 'error');
    } finally {
      setSavingTeam(false);
    }
  };

  const activeRoster = Array.isArray(activeTeam?.currentRoster) ? activeTeam.currentRoster : [];
  const safeBidHistory = Array.isArray(bidHistory) ? bidHistory : [];
  const lowestBasePrice = typeof getLowestCategoryBasePrice === 'function' ? getLowestCategoryBasePrice() : 1500000;
  const currentRosterCount = activeRoster.length;
  const remainingSlotsNeeded = Math.max(0, (activeTeam?.minRoster || 11) - currentRosterCount);
  const requiredReserve = remainingSlotsNeeded * lowestBasePrice;
  const maxAllowableBidPurse = Math.max(0, (activeTeam?.remainingBudget || 0) - requiredReserve);

  const safeCurrentBid = currentBid || 0;
  const nextExactBid = typeof calculateNextBidAmount === 'function'
    ? calculateNextBidAmount(safeCurrentBid, activeTeam?.totalBudget || 100000000)
    : safeCurrentBid + 150000;

  const isCurrentlyHighestBidder = Boolean(
    highestBidder &&
    ((highestBidder.id && highestBidder.id === activeTeam.id) ||
     (highestBidder._id && highestBidder._id === activeTeam._id) ||
     (highestBidder.id && highestBidder.id === activeTeam._id) ||
     (highestBidder._id && highestBidder._id === activeTeam.id))
  );

  const handleNormalBidSubmit = () => {
    if (isBidding) return;
    setIsBidding(true);

    const targetTeamId = activeTeam.id || activeTeam._id;
    if (!targetTeamId) {
      triggerToast('Cannot place bid: Franchise team profile not loaded.', 'error');
      setIsBidding(false);
      return;
    }

    const res = placeNormalBid ? placeNormalBid(targetTeamId) : { success: false, error: 'Bidding service unavailable' };

    if (!res.success) {
      triggerToast(res.error || 'Bid placement failed', 'error');
    } else {
      triggerToast(`Bid of ${formatCurrency(res.nextAmount)} placed successfully!`, 'success');
    }

    setTimeout(() => setIsBidding(false), 500);
  };

  const handleBlindBidSubmit = (e) => {
    e.preventDefault();
    setBlindBidError('');

    const targetTeamId = activeTeam.id || activeTeam._id;
    const res = placeBlindBid ? placeBlindBid(targetTeamId, blindBidAmount) : { success: false, error: 'Blind bid service unavailable' };

    if (!res.success) {
      setBlindBidError(res.error || 'Validation failed');
      triggerToast('Blind Bid Failed validation check!', 'error');
    } else {
      triggerToast(`Sealed blind bid of ${formatCurrency(blindBidAmount)} submitted.`, 'success');
      setBlindBidAmount('');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPass !== confirmPass) {
      triggerToast('New passwords do not match.', 'error');
      return;
    }
    if (newPass.length < 6) {
      triggerToast('Password must be at least 6 characters.', 'error');
      return;
    }
    setChangingPass(true);
    try {
      await api.put('/manager/password', { currentPassword: currentPass, newPassword: newPass });
      triggerToast('Password changed successfully!', 'success');
      setShowPasswordModal(false);
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
    } catch (err) {
      triggerToast(err?.response?.data?.message || 'Failed to change password.', 'error');
    } finally {
      setChangingPass(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-darkBg text-slate-100">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Top Team Header */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-slate-900 via-slate-900/90 to-emerald-950/20">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-3xl shadow-lg">
              {activeTeam.logo || '🏆'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black font-heading text-white">{activeTeam.name}</h1>
                <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  {activeTeam.shortCode || activeTeam.code}
                </span>
              </div>
              <p className="text-xs text-slate-400">Authenticated Manager: {user?.name || 'Franchise Manager'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Available Purse</span>
              <h3 className="text-xl font-black font-mono text-emerald-400">{formatCurrency(activeTeam.remainingBudget)}</h3>
            </div>

            <button
              onClick={openTeamEdit}
              className="px-3.5 py-2 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 text-xs font-bold rounded-xl transition shadow flex items-center gap-1.5"
            >
              <Shield className="w-3.5 h-3.5" /> Edit Team
            </button>

            <Link
              to="/manager/roster"
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-bold rounded-xl transition shadow flex items-center gap-1.5"
            >
              <Users className="w-3.5 h-3.5 text-emerald-400" /> View Roster ({currentRosterCount}/{activeTeam.minRoster || 11})
            </Link>

            <Link
              to="/players"
              className="px-3.5 py-2 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 text-xs font-bold rounded-xl transition shadow flex items-center gap-1.5"
            >
              <Search className="w-3.5 h-3.5" /> Player Pool (Read-Only)
            </Link>

            <button
              onClick={() => setShowPasswordModal(true)}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-bold rounded-xl transition shadow flex items-center gap-1.5"
            >
              <Key className="w-3.5 h-3.5 text-amber-400" /> Change Password
            </button>
          </div>
        </div>

        {/* PRD Blind Bid Budget Guardrail Banner */}
        <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-slate-300">
            <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <div>
              <strong className="text-amber-400">PRD Reserve Guardrail Status:</strong> Required Reserve = ({activeTeam.minRoster || 11} min - {currentRosterCount} current) &times; {formatCurrency(lowestBasePrice)} = <span className="font-mono font-bold text-white">{formatCurrency(requiredReserve)}</span>
            </div>
          </div>
          <div className="font-mono font-bold text-slate-200 bg-slate-900 px-3 py-1 rounded-lg border border-slate-800">
            Max Allowable Single Bid: <span className="text-emerald-400">{formatCurrency(maxAllowableBidPurse)}</span>
          </div>
        </div>

        {/* Main Grid: Live Podium Viewer vs Action Deck */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Live Podium Viewer Component */}
          <div className="lg:col-span-2 glass-card rounded-2xl p-6 border border-slate-800 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">Live Stage</span>
                <h2 className="text-xl font-black font-heading text-white">Podium Display</h2>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  biddingMode === 'blind'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                }`}>
                  {biddingMode || 'normal'} Bidding Mode
                </span>
              </div>
            </div>

            {podiumPlayer ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center bg-slate-950/80 p-6 rounded-2xl border border-slate-800">
                <div className="relative mx-auto md:mx-0">
                  <img
                    src={podiumPlayer.imageUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80'}
                    alt={podiumPlayer.name}
                    className="w-36 h-36 rounded-2xl object-cover border-2 border-emerald-500/40 shadow-2xl"
                  />
                  <span className="absolute -bottom-2 -right-2 px-2 py-0.5 bg-emerald-500 text-slate-950 font-black text-[10px] rounded uppercase tracking-wider">
                    {podiumPlayer.category}
                  </span>
                </div>

                <div className="md:col-span-2 space-y-3 text-center md:text-left">
                  <div>
                    <h3 className="text-2xl font-black text-white">{podiumPlayer.name}</h3>
                    <p className="text-xs text-slate-400">
                      Jersey: <strong className="text-slate-200">{podiumPlayer.jerseyName}</strong> &bull; Student ID: <span className="font-mono">{podiumPlayer.studentId}</span>
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-1.5 justify-center md:justify-start text-[11px]">
                    <span className="px-2.5 py-0.5 bg-slate-800 text-slate-300 rounded font-semibold">
                      Primary: {podiumPlayer.primaryPosition}
                    </span>
                    <span className="px-2.5 py-0.5 bg-slate-800 text-slate-300 rounded font-semibold">
                      Session: {podiumPlayer.session}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase">Base Price</span>
                      <p className="font-mono font-bold text-slate-300">{formatCurrency(podiumPlayer.basePrice)}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase">Current High Bid</span>
                      <p className="font-mono font-bold text-xl text-emerald-400">{formatCurrency(safeCurrentBid)}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-16 text-center text-slate-500 glass-card rounded-2xl border border-slate-800 space-y-2">
                <Gavel className="w-12 h-12 mx-auto text-slate-700 animate-pulse" />
                <p className="font-bold text-slate-400">Podium is currently empty</p>
                <p className="text-xs text-slate-600">Waiting for Podium Admin to launch the next player.</p>
              </div>
            )}

            {/* Bid History Table */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Live Bid Stream ({safeBidHistory.length})</span>
                {highestBidder && (
                  <span className="text-emerald-400 flex items-center gap-1 font-mono text-[11px]">
                    <TrendingUp className="w-3.5 h-3.5" /> Leader: {highestBidder.name}
                  </span>
                )}
              </h3>

              <div className="bg-slate-950/70 rounded-xl border border-slate-800 p-3 max-h-40 overflow-y-auto space-y-1.5">
                {safeBidHistory.length === 0 ? (
                  <p className="text-xs text-slate-600 text-center py-4">No bids placed on current player yet.</p>
                ) : (
                  [...safeBidHistory].reverse().map((bid, idx) => (
                    <div key={bid.id || idx} className="flex justify-between items-center text-xs px-3 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800/50">
                      <span className="font-bold text-white">{bid.bidder}</span>
                      <span className="font-mono font-bold text-emerald-400">{formatCurrency(bid.amount)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Bid Execution Controls */}
          <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-6 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">Execution Panel</span>
              <h2 className="text-xl font-black font-heading text-white mt-0.5">War Room Bidding</h2>
            </div>

            {biddingMode === 'normal' ? (
              <div className="space-y-5 bg-slate-950/80 p-5 rounded-2xl border border-slate-800">
                <div className="text-center space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest">Next Minimum Bid Required</span>
                  <p className="text-3xl font-black font-mono text-emerald-400">{formatCurrency(nextExactBid)}</p>
                </div>

                <button
                  onClick={handleNormalBidSubmit}
                  disabled={!podiumPlayer || timerStatus !== 'running' || isCurrentlyHighestBidder || nextExactBid > activeTeam.remainingBudget}
                  className={`w-full py-4 rounded-xl font-black text-sm uppercase tracking-wider transition shadow-xl flex items-center justify-center gap-2 ${
                    isCurrentlyHighestBidder
                      ? 'bg-emerald-950/90 text-emerald-400 border border-emerald-500/40 cursor-default'
                      : !podiumPlayer || timerStatus !== 'running'
                      ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                      : nextExactBid > activeTeam.remainingBudget
                      ? 'bg-rose-950 text-rose-400 border border-rose-800 cursor-not-allowed'
                      : 'bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-slate-950 font-black shadow-emerald-950/50'
                  }`}
                >
                  <Zap className="w-5 h-5 fill-current" />
                  {isCurrentlyHighestBidder
                    ? 'You Are Highest Bidder'
                    : !podiumPlayer
                    ? 'Podium Empty'
                    : timerStatus !== 'running'
                    ? 'Auction Clock Paused'
                    : nextExactBid > activeTeam.remainingBudget
                    ? 'Exceeds Purse'
                    : `Place Bid: ${formatCurrency(nextExactBid)}`}
                </button>
              </div>
            ) : (
              <form onSubmit={handleBlindBidSubmit} className="space-y-4 bg-slate-950/80 p-5 rounded-2xl border border-slate-800">
                <div>
                  <label className="block text-xs font-bold text-purple-300 uppercase mb-1">Sealed Blind Bid Amount (BDT)</label>
                  <input
                    type="number"
                    value={blindBidAmount}
                    onChange={e => setBlindBidAmount(e.target.value)}
                    placeholder="Enter sealed bid..."
                    className="glass-input w-full px-3 py-2.5 rounded-xl font-mono text-sm text-white"
                    required
                  />
                  {blindBidError && (
                    <p className="text-[11px] text-rose-400 font-semibold mt-1">{blindBidError}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={!podiumPlayer || timerStatus !== 'running' || !blindBidAmount}
                  className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Lock className="w-4 h-4" /> Submit Sealed Blind Bid
                </button>
              </form>
            )}

            <div className="pt-4 border-t border-slate-800 text-xs text-slate-400 space-y-2">
              <div className="flex justify-between items-center">
                <span>Franchise Team:</span>
                <strong className="text-white">{activeTeam.name}</strong>
              </div>
              <div className="flex justify-between items-center">
                <span>Total Roster Slots:</span>
                <span className="font-mono text-emerald-400 font-bold">{currentRosterCount} / {activeTeam.minRoster || 11} min</span>
              </div>
            </div>

          </div>

        </div>

      </main>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-sm rounded-2xl p-6 border border-slate-700 space-y-5 shadow-2xl">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-400" /> Change Password
              </h2>
              <button onClick={() => setShowPasswordModal(false)} className="p-2 text-slate-400 hover:text-white rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-400 mb-1">Current Password</label>
                <input
                  type="password"
                  value={currentPass}
                  onChange={e => setCurrentPass(e.target.value)}
                  className="glass-input w-full px-3 py-2 rounded-xl text-white"
                  required
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-400 mb-1">New Password</label>
                <input
                  type="password"
                  value={newPass}
                  onChange={e => setNewPass(e.target.value)}
                  placeholder="At least 6 characters"
                  className="glass-input w-full px-3 py-2 rounded-xl text-white"
                  required
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-400 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPass}
                  onChange={e => setConfirmPass(e.target.value)}
                  className="glass-input w-full px-3 py-2 rounded-xl text-white"
                  required
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="flex-1 py-2.5 border border-slate-700 text-slate-300 hover:bg-slate-800 rounded-xl text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={changingPass}
                  className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition disabled:opacity-60"
                >
                  {changingPass ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Key className="w-3.5 h-3.5" />}
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Edit Team Modal */}
      {showEditTeamModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-sm rounded-2xl p-6 border border-slate-700 space-y-5 shadow-2xl">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-400" /> Edit Franchise Profile
              </h2>
              <button onClick={() => setShowEditTeamModal(false)} className="p-2 text-slate-400 hover:text-white rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTeamProfile} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-400 mb-1">Team Logo</label>
                <div className="flex items-center gap-3">
                  {removeTeamLogo ? (
                    <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-white font-black">
                      {(teamForm.name || 'T')[0]}
                    </div>
                  ) : (
                    <img
                      src={teamLogoPreview || activeTeam.logoUrl || 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=200&auto=format&fit=crop&q=80'}
                      alt="Logo Preview"
                      className="w-12 h-12 rounded-xl object-cover border border-slate-700"
                    />
                  )}
                  <div className="flex-1 space-y-1">
                    <label className="cursor-pointer px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-semibold text-xs inline-flex items-center gap-1.5 border border-slate-700">
                      <span>Upload Logo</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={e => {
                          const file = e.target.files[0];
                          if (file) {
                            setTeamLogoFile(file);
                            setTeamLogoPreview(URL.createObjectURL(file));
                            setRemoveTeamLogo(false);
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                    {(activeTeam.logoUrl || teamLogoPreview) && !removeTeamLogo && (
                      <button
                        type="button"
                        onClick={() => {
                          setTeamLogoFile(null);
                          setTeamLogoPreview(null);
                          setRemoveTeamLogo(true);
                        }}
                        className="block text-[11px] text-rose-400 hover:text-rose-300 font-semibold"
                      >
                        Remove Logo
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-400 mb-1">Franchise Team Name *</label>
                <input
                  type="text"
                  value={teamForm.name}
                  onChange={e => setTeamForm(prev => ({ ...prev, name: e.target.value }))}
                  className="glass-input w-full px-3 py-2 rounded-xl text-white font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-400 mb-1">Short Code (3-4 Chars) *</label>
                <input
                  type="text"
                  maxLength={4}
                  value={teamForm.shortCode}
                  onChange={e => setTeamForm(prev => ({ ...prev, shortCode: e.target.value.toUpperCase() }))}
                  className="glass-input w-full px-3 py-2 rounded-xl text-white font-mono uppercase"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-400 mb-1">Description (Optional)</label>
                <textarea
                  rows={2}
                  value={teamForm.description}
                  onChange={e => setTeamForm(prev => ({ ...prev, description: e.target.value }))}
                  className="glass-input w-full px-3 py-2 rounded-xl text-white"
                  placeholder="Team slogan or details..."
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowEditTeamModal(false)}
                  className="flex-1 py-2.5 border border-slate-700 text-slate-300 hover:bg-slate-800 rounded-xl text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingTeam}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition disabled:opacity-60"
                >
                  {savingTeam ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Shield className="w-3.5 h-3.5" />}
                  Save Team
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};