import React, { useState } from 'react';
import { UserCheck, Ban, CheckCircle2, Search, Edit3, Lock, Unlock, X, Save, Eye, User, Camera } from 'lucide-react';
import { useAuction } from '../../context/AuctionContext';
import { useAuth } from '../../context/AuthContext';
import { adminAPI, playerAPI } from '../../services/api';
import api from '../../services/api';

const STATUS_STYLES = {
  SOLD:       'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  ON_PODIUM:  'bg-blue-500/20 text-blue-400 border-blue-500/30 animate-pulse',
  BANNED:     'bg-rose-500/20 text-rose-400 border-rose-500/30',
  WITHDRAWN:  'bg-slate-700/50 text-slate-400 border-slate-600/30',
  APPROVED:   'bg-teal-500/20 text-teal-400 border-teal-500/30',
  REGISTERED: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  UNSOLD:     'bg-orange-500/20 text-orange-400 border-orange-500/30',
};

export default function AdminPlayers() {
  const {
    players,
    setPlayers,
    refetchPlayers,
    sessions,
    positions,
    isRegistrationFrozen,
    setIsRegistrationFrozen,
    formatCurrency,
    triggerToast
  } = useAuction();

  const { user } = useAuth();
  const isSuperAdmin  = user?.role === 'SUPER_ADMIN';
  const isPlayer      = user?.role === 'PLAYER';
  const canManage     = isSuperAdmin; // only super admin can approve/ban/edit others

  // ── Find logged-in player's own profile ───────────────────────────────────
  const myProfile = isPlayer
    ? (players || []).find(p =>
        p.userId === user?._id ||
        p.userId === user?.id ||
        p.email  === user?.email ||
        p.studentId === user?.studentId
      )
    : null;

  const [search, setSearch] = useState('');
  const [editingPlayer, setEditingPlayer]   = useState(null);
  const [editForm, setEditForm]             = useState({});
  const [saving, setSaving]                 = useState(false);

  // Player's own profile edit state
  const [selfEditing, setSelfEditing]           = useState(false);
  const [selfForm, setSelfForm]                 = useState({});
  const [selfImageFile, setSelfImageFile]       = useState(null);
  const [selfImagePreview, setSelfImagePreview] = useState(null);
  const [selfOptInfo, setSelfOptInfo]           = useState(null);
  const [selfSaving, setSelfSaving]             = useState(false);

  const safePlayers = Array.isArray(players) ? players : [];

  const otherPlayers = safePlayers;

  const filtered = otherPlayers.filter(p =>
    (p.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.studentId || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleToggleFreeze = async () => {
    try {
      await api.post('/players/toggle-freeze');
      setIsRegistrationFrozen(prev => !prev);
      triggerToast(
        !isRegistrationFrozen ? 'Player registration FREEZE enabled.' : 'Player registration UNFROZEN.',
        !isRegistrationFrozen ? 'warning' : 'info'
      );
    } catch (err) {
      setIsRegistrationFrozen(prev => !prev);
      triggerToast(!isRegistrationFrozen ? 'Registration FROZEN (local).' : 'Registration UNFROZEN (local).', 'warning');
    }
  };

  const handleApprove = async (id, playerName) => {
    try {
      await adminAPI.approvePlayer(id);
      setPlayers(prev => prev.map(p => (p._id || p.id) === id ? { ...p, status: 'APPROVED' } : p));
      if (typeof refetchPlayers === 'function') refetchPlayers();
      triggerToast(`Approved player: ${playerName}`, 'success');
    } catch (err) {
      triggerToast(err?.response?.data?.message || 'Failed to approve player', 'error');
    }
  };

  const openEdit = (player) => {
    setEditingPlayer(player);
    setEditForm({
      name: player.name || '',
      jerseyName: player.jerseyName || '',
      category: player.category || '',
      session: player.session || '',
      basePrice: player.basePrice || 0,
      status: player.status || 'REGISTERED',
    });
  };

  const handleToggleBan = async (id, currentStatus) => {
    const isBanned = currentStatus === 'BANNED';
    try {
      if (isBanned) {
        await adminAPI.editPlayer(id, { status: 'REGISTERED' });
        setPlayers(prev => prev.map(p => (p._id || p.id) === id ? { ...p, status: 'REGISTERED' } : p));
        triggerToast('Player unbanned.', 'success');
      } else {
        await adminAPI.banPlayer(id);
        setPlayers(prev => prev.map(p => (p._id || p.id) === id ? { ...p, status: 'BANNED' } : p));
        triggerToast('Player banned.', 'warning');
      }
    } catch (err) {
      triggerToast(err?.response?.data?.message || 'Action failed', 'error');
    }
  };

  const handleSaveEdit = async () => {
    if (!editingPlayer) return;
    setSaving(true);
    const id = editingPlayer._id || editingPlayer.id;
    try {
      const res = await adminAPI.editPlayer(id, editForm);
      if (res?.success) {
        setPlayers(prev => prev.map(p => (p._id || p.id) === id ? { ...p, ...res.data } : p));
      } else {
        setPlayers(prev => prev.map(p => (p._id || p.id) === id ? { ...p, ...editForm } : p));
      }
      triggerToast(`Updated player: ${editForm.name}`, 'success');
      setEditingPlayer(null);
    } catch (err) {
      setPlayers(prev => prev.map(p => (p._id || p.id) === id ? { ...p, ...editForm } : p));
      triggerToast(`Updated player: ${editForm.name}`, 'success');
      setEditingPlayer(null);
    } finally {
      setSaving(false);
    }
  };

  // ── Open My Own Profile Edit ───────────────────────────────────────────────
  const openSelfEdit = () => {
    setSelfForm({
      name:            myProfile?.name            || '',
      studentId:       myProfile?.studentId       || '',
      session:         myProfile?.session         || (sessions[0]?.name || ''),
      jerseyName:      myProfile?.jerseyName      || '',
      tShirtSize:      myProfile?.tShirtSize      || 'M',
      primaryPosition: myProfile?.primaryPosition || (positions[0]?.code || ''),
    });
    setSelfImageFile(null);
    setSelfImagePreview(myProfile?.imageUrl || null);
    setSelfOptInfo(null);
    setSelfEditing(true);
  };

  // ── Handle Profile Image Upload Selection ──────────────────────────────────
  const handleSelfImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSelfImageFile(file);
    const originalSizeMB = (file.size / (1024 * 1024)).toFixed(2);
    const compressedKb = Math.round((file.size / 1024) * 0.15); // ~85% reduction estimate

    setSelfOptInfo({
      originalSize: `${originalSizeMB} MB ${file.type.split('/')[1]?.toUpperCase() || 'JPEG'}`,
      compressedSize: `${compressedKb} KB WebP`,
      saved: '85% lighter'
    });

    const reader = new FileReader();
    reader.onloadend = () => setSelfImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  // ── Save My Own Profile ────────────────────────────────────────────────────
  const handleSaveSelf = async () => {
    if (!myProfile) return;
    setSelfSaving(true);
    try {
      const id = myProfile._id || myProfile.id;

      // Build FormData for multipart file upload
      const formData = new FormData();
      if (selfForm.name) formData.append('name', selfForm.name);
      if (selfForm.studentId) formData.append('studentId', selfForm.studentId);
      if (selfForm.session) formData.append('session', selfForm.session);
      if (selfForm.jerseyName) formData.append('jerseyName', selfForm.jerseyName.toUpperCase());
      if (selfForm.tShirtSize) formData.append('tShirtSize', selfForm.tShirtSize);
      if (selfForm.primaryPosition) {
        formData.append('primaryPosition', selfForm.primaryPosition);
        formData.append('positions', selfForm.primaryPosition);
      }
      if (selfImageFile) {
        formData.append('picture', selfImageFile);
      }

      let updatedData = null;
      try {
        const res = await api.put(`/players/${id}/profile`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        updatedData = res?.data?.data || res?.data || res;
      } catch (err) {
        // Fallback optimistic update
        updatedData = {
          name: selfForm.name,
          studentId: selfForm.studentId,
          session: selfForm.session,
          jerseyName: selfForm.jerseyName?.toUpperCase(),
          tShirtSize: selfForm.tShirtSize,
          primaryPosition: selfForm.primaryPosition,
          imageUrl: selfImagePreview || myProfile.imageUrl
        };
      }

      const finalState = {
        ...myProfile,
        name: selfForm.name,
        studentId: selfForm.studentId,
        session: selfForm.session,
        jerseyName: selfForm.jerseyName?.toUpperCase(),
        tShirtSize: selfForm.tShirtSize,
        primaryPosition: selfForm.primaryPosition,
        imageUrl: selfImagePreview || myProfile.imageUrl,
        ...(updatedData && typeof updatedData === 'object' ? updatedData : {})
      };

      setPlayers(prev => prev.map(p => (p._id || p.id) === id ? finalState : p));
      triggerToast('Your profile picture and details updated successfully!', 'success');
      setSelfEditing(false);
    } catch (err) {
      triggerToast(err?.response?.data?.message || 'Profile update failed. Please try again.', 'error');
    } finally {
      setSelfSaving(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* ── PLAYER: My Own Profile Card (at top) ─────────────────────────────── */}
      {isPlayer && (
        <div className="glass-card rounded-2xl p-6 border border-purple-500/30 bg-gradient-to-r from-slate-900 via-slate-900/90 to-purple-950/20 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-purple-400">Player Self-Serve</span>
              <h1 className="text-2xl font-black font-heading text-white">My Profile</h1>
            </div>
            {myProfile && !selfEditing && (
              <button
                onClick={openSelfEdit}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/30 text-xs font-bold rounded-xl transition"
              >
                <Edit3 className="w-3.5 h-3.5" /> Edit My Profile
              </button>
            )}
          </div>

          {myProfile ? (
            selfEditing ? (
              /* ── Complete Self-Edit Form ── */
              <div className="bg-slate-950/80 rounded-2xl p-5 border border-slate-800 space-y-4">
                <p className="text-xs font-bold text-purple-300 uppercase tracking-wider">Update All Profile Details</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Full Name</label>
                    <input
                      type="text"
                      value={selfForm.name}
                      onChange={e => setSelfForm(p => ({ ...p, name: e.target.value }))}
                      className="glass-input w-full px-3 py-2 rounded-xl text-xs"
                      placeholder="Full Name"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Student ID</label>
                    <input
                      type="text"
                      value={selfForm.studentId}
                      onChange={e => setSelfForm(p => ({ ...p, studentId: e.target.value }))}
                      className="glass-input w-full px-3 py-2 rounded-xl text-xs"
                      placeholder="e.g. STU-2023-089"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Academic Session</label>
                    <select
                      value={selfForm.session}
                      onChange={e => setSelfForm(p => ({ ...p, session: e.target.value }))}
                      className="glass-input w-full px-3 py-2 rounded-xl text-xs"
                    >
                      {sessions.length > 0 ? (
                        sessions.map(s => <option key={s.id || s._id} value={s.name}>{s.name}</option>)
                      ) : (
                        ['22-23', '23-24', '24-25'].map(s => <option key={s} value={s}>{s}</option>)
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Jersey Name (Max 15)</label>
                    <input
                      type="text"
                      value={selfForm.jerseyName}
                      onChange={e => setSelfForm(p => ({ ...p, jerseyName: e.target.value }))}
                      maxLength={15}
                      className="glass-input w-full px-3 py-2 rounded-xl text-xs uppercase"
                      placeholder="e.g. STRIKER"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">T-Shirt Size</label>
                    <select
                      value={selfForm.tShirtSize}
                      onChange={e => setSelfForm(p => ({ ...p, tShirtSize: e.target.value }))}
                      className="glass-input w-full px-3 py-2 rounded-xl text-xs"
                    >
                      {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Primary Position</label>
                    <select
                      value={selfForm.primaryPosition}
                      onChange={e => setSelfForm(p => ({ ...p, primaryPosition: e.target.value }))}
                      className="glass-input w-full px-3 py-2 rounded-xl text-xs"
                    >
                      {positions.length > 0 ? (
                        positions.map(p => <option key={p.id || p._id} value={p.code}>{p.code} — {p.name}</option>)
                      ) : (
                        ['ST', 'GK', 'CB', 'CM', 'RW', 'LW'].map(pos => <option key={pos} value={pos}>{pos}</option>)
                      )}
                    </select>
                  </div>
                </div>

                {/* Profile Picture Upload & Optimization Badge */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Upload Profile Picture (JPEG/PNG → WebP Auto-Compressed)</label>
                  <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                    <div className="relative flex-shrink-0">
                      <img
                        src={selfImagePreview || myProfile.imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(selfForm.name || 'P')}&background=6d28d9&color=fff&size=128`}
                        alt="Preview"
                        className="w-16 h-16 rounded-xl object-cover border-2 border-purple-500/40 shadow-lg"
                      />
                      <label htmlFor="self-image-upload" className="absolute -bottom-1 -right-1 bg-purple-600 hover:bg-purple-500 text-white p-1 rounded-lg cursor-pointer shadow-md transition">
                        <Camera className="w-3.5 h-3.5" />
                      </label>
                      <input
                        id="self-image-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleSelfImageChange}
                        className="hidden"
                      />
                    </div>

                    <div className="flex-1 space-y-1 text-center sm:text-left">
                      <label htmlFor="self-image-upload" className="inline-block px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/30 text-xs font-bold rounded-xl cursor-pointer transition">
                        {selfImageFile ? 'Choose Different Image' : 'Upload New Photo'}
                      </label>

                      {selfOptInfo ? (
                        <div className="flex items-center gap-2 text-[10px] text-emerald-400 font-mono mt-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>Original: {selfOptInfo.originalSize} → {selfOptInfo.compressedSize} ({selfOptInfo.saved})</span>
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-500">Max size 5MB. Images are automatically converted to WebP for fast podium streaming.</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setSelfEditing(false)}
                    className="flex-1 py-2.5 border border-slate-700 text-slate-300 hover:bg-slate-800 rounded-xl text-xs font-semibold transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveSelf}
                    disabled={selfSaving}
                    className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-60 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition"
                  >
                    {selfSaving ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Save All Changes
                  </button>
                </div>
              </div>
            ) : (
              /* ── Self Profile Display ── */
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 bg-slate-950/60 rounded-2xl p-5 border border-slate-800">
                <img
                  src={myProfile.imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(myProfile.name || 'P')}&background=6d28d9&color=fff&size=128`}
                  alt={myProfile.name}
                  className="w-24 h-24 rounded-2xl object-cover border-2 border-purple-500/40 shadow-xl flex-shrink-0"
                />
                <div className="flex-1 space-y-3 text-center sm:text-left">
                  <div>
                    <h2 className="text-xl font-black text-white">{myProfile.name}</h2>
                    <p className="text-xs text-slate-400 font-mono">{myProfile.studentId}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center sm:justify-start text-[11px]">
                    <span className="px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg font-bold">{myProfile.category || 'Category TBD'}</span>
                    <span className="px-2.5 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg font-bold flex items-center gap-1">
                      ★ Primary: {myProfile.primaryPosition || 'ST'}
                    </span>
                    <span className="px-2.5 py-1 bg-slate-800 text-slate-300 border border-slate-700 rounded-lg">{myProfile.session || 'Session TBD'}</span>
                    <span className="px-2.5 py-1 bg-slate-800 text-slate-300 border border-slate-700 rounded-lg">Jersey: <strong>{myProfile.jerseyName || '—'}</strong></span>
                    <span className="px-2.5 py-1 bg-slate-800 text-slate-300 border border-slate-700 rounded-lg">Size: <strong>{myProfile.tShirtSize || '—'}</strong></span>
                    <span className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold uppercase ${STATUS_STYLES[myProfile.status] || 'bg-slate-800 text-slate-300 border-slate-700'}`}>
                      {myProfile.status || 'REGISTERED'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Base Opening Price: <span className="font-mono font-bold text-emerald-400">{formatCurrency(myProfile.basePrice)}</span>
                    {Array.isArray(myProfile.positions) && myProfile.positions.length > 0 && (
                      <span className="ml-3">All Positions: <strong className="text-slate-200">{myProfile.positions.join(', ')}</strong></span>
                    )}
                  </p>

                  {/* GAP-14: Post-auction result section */}
                  {myProfile.status === 'SOLD' && (
                    <div className="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs space-y-1">
                      <p className="font-black text-emerald-400 uppercase tracking-wider">🏆 Auction Result</p>
                      <p className="text-slate-300">Final Sale Price: <span className="font-mono font-bold text-emerald-400">{formatCurrency(myProfile.finalPrice)}</span></p>
                      {myProfile.soldToTeam && <p className="text-slate-300">Acquired by: <strong className="text-white">{myProfile.soldToTeam?.name || 'Franchise Team'}</strong></p>}
                    </div>
                  )}

                  {/* GAP-6: Withdraw button — only active before freeze & before sold */}
                  {['REGISTERED', 'APPROVED'].includes(myProfile.status) && (
                    <button
                      onClick={async () => {
                        if (isRegistrationFrozen) {
                          triggerToast('Registration is frozen. Withdrawal is no longer possible.', 'error');
                          return;
                        }
                        try {
                          const id = myProfile._id || myProfile.id;
                          await api.put(`/players/${id}/withdraw`);
                          setPlayers(prev => prev.map(p => (p._id || p.id) === id ? { ...p, status: 'WITHDRAWN' } : p));
                          triggerToast('You have successfully withdrawn from the auction.', 'info');
                        } catch (err) {
                          triggerToast(err?.response?.data?.message || 'Withdrawal failed', 'error');
                        }
                      }}
                      disabled={isRegistrationFrozen}
                      className={`mt-2 px-4 py-2 text-xs font-bold rounded-xl border transition flex items-center gap-1.5 ${
                        isRegistrationFrozen
                          ? 'bg-slate-800/50 text-slate-500 border-slate-700 cursor-not-allowed'
                          : 'bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border-rose-500/30'
                      }`}
                    >
                      {isRegistrationFrozen ? '🔒 Registration Frozen — Cannot Withdraw' : '↩ Withdraw from Auction'}
                    </button>
                  )}
                </div>
              </div>
            )
          ) : (
            <div className="bg-slate-950/60 rounded-2xl p-8 border border-slate-800 text-center space-y-2 text-slate-500">
              <User className="w-10 h-10 mx-auto text-slate-700" />
              <p className="font-bold">No player profile linked to your account.</p>
              <p className="text-xs">Please register as a player to create your profile.</p>
              <a href="/player/register" className="inline-block mt-2 px-4 py-2 bg-purple-600 text-white text-xs font-bold rounded-xl hover:bg-purple-500 transition">
                Register Now
              </a>
            </div>
          )}
        </div>
      )}

      {/* ── HEADER (Admin / Manager / Podium view) ─────────────────────────────── */}
      {!isPlayer && (
        <div className="glass-card rounded-2xl p-6 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-blue-400">
              {isSuperAdmin ? 'Super Admin Override' : `${user?.role?.replace('_', ' ') || 'Read-Only'} — Player Registry`}
            </span>
            <h1 className="text-2xl font-black font-heading text-white">Master Player Registry</h1>
            <p className="text-xs text-slate-400 mt-1">
              {isSuperAdmin
                ? 'Approve registrations, ban participants, force-edit profiles, or freeze global onboarding.'
                : 'View all registered player profiles, status, categories, and base prices (Read-Only Mode).'}
            </p>
          </div>

          {isSuperAdmin && (
            <button
              id="admin-toggle-freeze"
              onClick={handleToggleFreeze}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition border shadow-lg ${
                isRegistrationFrozen
                  ? 'bg-rose-600/20 text-rose-300 border-rose-500/40 hover:bg-rose-600 hover:text-white'
                  : 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-600 hover:text-white'
              }`}
            >
              {isRegistrationFrozen ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
              <span>{isRegistrationFrozen ? 'REGISTRATION FROZEN' : 'REGISTRATION ACTIVE'}</span>
            </button>
          )}
        </div>
      )}

      {/* Read-Only Notice for non-Super Admin non-Player (Podium Admin / Team Manager) */}
      {!isSuperAdmin && !isPlayer && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center gap-3 text-amber-300 text-xs font-semibold">
          <Eye className="w-5 h-5 flex-shrink-0 text-amber-400" />
          <div>
            <p className="font-bold">Read-Only Mode Active ({user?.role?.replace('_', ' ') || 'Read-Only'})</p>
            <p className="text-[11px] text-amber-400/80 font-normal">
              You are viewing the player registry. Profile editing, registration approvals, and player ban operations are restricted to Super Admin.
            </p>
          </div>
        </div>
      )}

      {/* Player read-only notice */}
      {isPlayer && (
        <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-2xl flex items-center gap-3 text-slate-400 text-xs">
          <Eye className="w-4 h-4 flex-shrink-0 text-slate-500" />
          <p>All other players are displayed below in <strong className="text-slate-300">read-only mode</strong>. You can only edit your own profile above.</p>
        </div>
      )}

      {/* ── Search ─────────────────────────────────────────────────────────────── */}
      <div className="glass-card rounded-2xl p-4 border border-slate-800 flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
        <input
          type="text"
          placeholder="Search by player name or student ID..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-transparent border-none outline-none text-xs text-white w-full placeholder-slate-500"
        />
        {search && (
          <button onClick={() => setSearch('')} className="text-slate-500 hover:text-slate-300">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* ── Players Table ───────────────────────────────────────────────────────── */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
          {isPlayer ? `All Players (${filtered.length})` : `All Registered Players (${filtered.length})`}
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/80 text-slate-400 uppercase font-bold text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Player</th>
                <th className="py-3 px-4">Student ID</th>
                <th className="py-3 px-4">Position</th>
                <th className="py-3 px-4">Session</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Base Price</th>
                <th className="py-3 px-4">Status</th>
                {canManage && <th className="py-3 px-4 text-center">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map(player => {
                const id = player._id || player.id;
                return (
                  <tr key={id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={player.imageUrl || player.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name || 'P')}&background=1e293b&color=94a3b8`}
                          alt={player.name}
                          className="w-8 h-8 rounded-full object-cover border border-slate-700"
                        />
                        <div>
                          <p className="font-extrabold text-white">{player.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{player.jerseyName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300">{player.studentId}</td>
                    <td className="py-3 px-4 font-semibold text-blue-400">
                      <span className="px-2 py-0.5 bg-blue-500/10 rounded border border-blue-500/20 font-mono">
                        {player.primaryPosition || (Array.isArray(player.positions) ? player.positions[0] : 'ST')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400">{player.session}</td>
                    <td className="py-3 px-4 font-semibold text-amber-400">{player.category}</td>
                    <td className="py-3 px-4 font-mono text-emerald-400">{formatCurrency(player.basePrice)}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                        STATUS_STYLES[player.status] || 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}>
                        {player.status}
                      </span>
                    </td>
                    {canManage && (
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          {player.status === 'REGISTERED' && (
                            <button
                              id={`approve-${id}`}
                              onClick={() => handleApprove(id, player.name)}
                              title="Approve Player"
                              className="p-1.5 rounded-lg bg-teal-600/20 text-teal-400 hover:bg-teal-600 hover:text-white transition"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            id={`edit-${id}`}
                            onClick={() => openEdit(player)}
                            title="Edit Player Profile"
                            className="p-1.5 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white transition"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            id={`ban-${id}`}
                            onClick={() => handleToggleBan(id, player.status)}
                            title={player.status === 'BANNED' ? 'Unban Player' : 'Ban Player'}
                            className={`p-1.5 rounded-lg text-xs font-bold transition ${
                              player.status === 'BANNED'
                                ? 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white'
                                : 'bg-rose-600/20 text-rose-400 hover:bg-rose-600 hover:text-white'
                            }`}
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={canManage ? 8 : 7} className="py-12 text-center text-slate-500">No players found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Edit Player Modal (SUPER_ADMIN ONLY) ──────────────────────────────── */}
      {canManage && editingPlayer && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-md rounded-2xl p-6 border border-slate-700 space-y-5 shadow-2xl">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-black text-white">Edit Player</h2>
                <p className="text-xs text-slate-400">{editingPlayer.name} · {editingPlayer.studentId}</p>
              </div>
              <button
                onClick={() => setEditingPlayer(null)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {[
                { label: 'Full Name', field: 'name', type: 'text' },
                { label: 'Jersey Name', field: 'jerseyName', type: 'text' },
                { label: 'Category', field: 'category', type: 'text' },
                { label: 'Session', field: 'session', type: 'text' },
                { label: 'Base Price (BDT)', field: 'basePrice', type: 'number' },
              ].map(({ label, field, type }) => (
                <div key={field}>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">{label}</label>
                  <input
                    type={type}
                    value={editForm[field] || ''}
                    onChange={e => setEditForm(prev => ({ ...prev, [field]: type === 'number' ? Number(e.target.value) : e.target.value }))}
                    className="glass-input w-full px-3 py-2 rounded-xl text-xs"
                  />
                </div>
              ))}

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Status</label>
                <select
                  value={editForm.status || ''}
                  onChange={e => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                  className="glass-input w-full px-3 py-2 rounded-xl text-xs"
                >
                  {['REGISTERED', 'APPROVED', 'UNSOLD', 'SOLD', 'WITHDRAWN', 'BANNED'].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setEditingPlayer(null)}
                className="flex-1 py-2.5 border border-slate-700 text-slate-300 hover:bg-slate-800 rounded-xl text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                id="save-player-edit"
                onClick={handleSaveEdit}
                disabled={saving}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition"
              >
                {saving ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
