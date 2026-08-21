import { useState, useEffect } from 'react';
import { User, Mail, ShieldCheck, CalendarDays, Save, CheckCircle, ImagePlus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../services/api';

/**
 * GENERAL_USER profile — view + edit own safe fields only
 * (name, profile photo, password). Role is display-only and can never be changed.
 */
export default function GeneralProfile() {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [photoPreview, setPhotoPreview] = useState(user?.profilePhoto || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Rehydrate fresh account facts
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await authAPI.getMe();
        const fresh = res?.user;
        if (!cancelled && fresh) {
          updateUser({
            name: fresh.name,
            email: fresh.email,
            phone: fresh.phone || '',
            profilePhoto: fresh.profilePhoto || '',
            notificationPrefs: fresh.notificationPrefs,
            createdAt: fresh.createdAt,
            playerRequestStatus: fresh.playerRequestStatus || 'NONE',
            managerRequestStatus: fresh.managerRequestStatus || 'NONE'
          });
          setName(fresh.name || '');
          setPhone(fresh.phone || '');
          setPhotoPreview(fresh.profilePhoto || '');
        }
      } catch {
        /* non-fatal — fall back to cached session data */
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setMessage(''); setError('');
    if (!name.trim() || name.trim().length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }
    setSaving(true);
    try {
      const res = await authAPI.updateMe({
        name: name.trim(),
        phone: phone.trim(),
        profilePhoto: photoPreview || ''
      });
      if (res?.success) {
        updateUser({ name: name.trim(), phone: phone.trim(), profilePhoto: photoPreview || '' });
        setMessage('Profile updated successfully');
      } else {
        setError(res?.message || 'Failed to update profile');
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-black font-heading text-white">
          <User className="w-6 h-6 text-sky-400" /> General Member Profile
        </h1>
        <p className="text-xs text-slate-400 mt-1">Manage your spectator account, update personal details, and request role upgrades.</p>
      </div>

      {/* Hero Account Overview Banner */}
      <section className="glass-card rounded-3xl p-6 sm:p-8 border border-slate-800 relative overflow-hidden bg-gradient-to-r from-sky-950/40 via-slate-900 to-slate-950 shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Avatar with photo upload trigger */}
          <div className="relative shrink-0">
            {photoPreview ? (
              <img src={photoPreview} alt="Profile" className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl object-cover border-2 border-sky-500/50 shadow-xl" />
            ) : (
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-tr from-sky-600 via-indigo-600 to-blue-500 flex items-center justify-center text-3xl sm:text-4xl font-black text-white uppercase shadow-xl">
                {user?.name?.[0] || 'U'}
              </div>
            )}
            <label className="absolute -bottom-2 -right-2 w-9 h-9 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center cursor-pointer hover:border-sky-400 hover:scale-105 transition shadow-lg" title="Upload new photo">
              <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
              <ImagePlus className="w-4 h-4 text-sky-300" />
            </label>
          </div>

          {/* User Details Badges */}
          <div className="space-y-3 text-center sm:text-left min-w-0 flex-1">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-black uppercase bg-sky-500/20 text-sky-300 border border-sky-500/30">
                <ShieldCheck className="w-3.5 h-3.5" /> General Member Account
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white mt-1.5 truncate">{user?.name}</h2>
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-5 gap-y-2 text-xs text-slate-300">
              <span className="flex items-center gap-1.5 bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-800">
                <Mail className="w-3.5 h-3.5 text-sky-400" /> {user?.email}
              </span>
              {user?.phone && (
                <span className="flex items-center gap-1.5 bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-800 font-mono">
                  📱 {user.phone}
                </span>
              )}
              {user?.createdAt && (
                <span className="flex items-center gap-1.5 text-slate-400">
                  <CalendarDays className="w-3.5 h-3.5" /> Joined {new Date(user.createdAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Edit Personal Information */}
      <section className="glass-card rounded-3xl p-6 sm:p-8 border border-slate-800 space-y-5">
        <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
          Edit Account Information
        </h3>

        {message && (
          <p className="flex items-center gap-2 bg-emerald-950/60 border border-emerald-500/40 rounded-2xl p-4 text-xs font-bold text-emerald-300">
            <CheckCircle className="w-4.5 h-4.5 shrink-0" /> {message}
          </p>
        )}
        {error && (
          <p className="bg-rose-950/60 border border-rose-500/40 rounded-2xl p-4 text-xs font-bold text-rose-300">{error}</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="gp-name" className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Full Name</label>
            <input
              id="gp-name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="glass-input w-full rounded-2xl px-4 py-3 text-xs text-white"
            />
          </div>

          <div>
            <label htmlFor="gp-phone" className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Mobile Phone Number</label>
            <input
              id="gp-phone"
              type="tel"
              placeholder="+8801700000000"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="glass-input w-full rounded-2xl px-4 py-3 text-xs text-white font-mono"
            />
          </div>

          <div>
            <label htmlFor="gp-email" className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Email Address (Read-only)</label>
            <input
              id="gp-email"
              type="email"
              value={user?.email || ''}
              disabled
              className="glass-input w-full rounded-2xl px-4 py-3 text-xs opacity-60 cursor-not-allowed text-slate-400"
            />
          </div>

          <div>
            <label htmlFor="gp-role" className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Account Role (Fixed)</label>
            <input
              id="gp-role"
              type="text"
              value="GENERAL_USER"
              disabled
              className="glass-input w-full rounded-2xl px-4 py-3 text-xs font-mono uppercase opacity-60 cursor-not-allowed text-sky-400 font-bold"
            />
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary"
        >
          {saving ? (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save Changes
        </button>
      </section>

      {/* ── Role Upgrade Requests Section ───────────────────────────────────── */}
      <RoleRequestsSection user={user} updateUser={updateUser} />

      {/* Password link footer */}
      <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 text-center text-xs text-slate-400">
        Need to update your login password? Go to <a href="/general/settings" className="text-sky-400 hover:text-sky-300 font-bold underline ml-1">Account Settings</a>.
      </div>
    </div>
  );
}

function RoleRequestsSection({ user, updateUser }) {
  const [playerNote, setPlayerNote] = useState('');
  const [managerNote, setManagerNote] = useState('');
  const [submittingPlayer, setSubmittingPlayer] = useState(false);
  const [submittingManager, setSubmittingManager] = useState(false);
  const [playerMsg, setPlayerMsg] = useState('');
  const [managerMsg, setManagerMsg] = useState('');

  const pStatus = user?.playerRequestStatus || 'NONE';
  const mStatus = user?.managerRequestStatus || 'NONE';

  const handlePlayerSubmit = async () => {
    setPlayerMsg('');
    setSubmittingPlayer(true);
    try {
      const res = await authAPI.getMe();
      // Use playerAPI.requestPlayerRole directly
      const resp = await import('../../services/api').then(m => m.playerAPI.requestPlayerRole(playerNote));
      if (resp?.success) {
        updateUser({ playerRequestStatus: 'PENDING', playerRequestNote: playerNote });
        setPlayerMsg('Player role request submitted to Super Admin!');
      }
    } catch (err) {
      setPlayerMsg(err?.response?.data?.message || 'Failed to submit request.');
    } finally {
      setSubmittingPlayer(false);
    }
  };

  const handleManagerSubmit = async () => {
    setManagerMsg('');
    setSubmittingManager(true);
    try {
      const resp = await import('../../services/api').then(m => m.playerAPI.requestManagerRole(managerNote));
      if (resp?.success) {
        updateUser({ managerRequestStatus: 'PENDING', managerRequestNote: managerNote });
        setManagerMsg('Team Manager role request submitted to Super Admin!');
      }
    } catch (err) {
      setManagerMsg(err?.response?.data?.message || 'Failed to submit request.');
    } finally {
      setSubmittingManager(false);
    }
  };

  return (
    <section className="glass-card rounded-2xl p-6 border border-slate-800 space-y-6">
      <div>
        <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
          Role Upgrade Requests
        </h3>
        <p className="text-xs text-slate-400 mt-0.5">
          Request elevated privileges to join the player pool or manage a franchise team.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Player Request Card */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-white uppercase tracking-wider">Player Role</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                pStatus === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                pStatus === 'PENDING' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse' :
                pStatus === 'REJECTED' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                'bg-slate-800 text-slate-400'
              }`}>
                {pStatus === 'NONE' ? 'Not Requested' : pStatus}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Enter the auction player pool to be drafted by franchise managers during live bidding.
            </p>
          </div>

          {pStatus === 'NONE' || pStatus === 'REJECTED' ? (
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <input
                type="text"
                value={playerNote}
                onChange={e => setPlayerNote(e.target.value)}
                placeholder="Optional note for admin (e.g. position, experience)"
                className="glass-input w-full rounded-lg px-3 py-1.5 text-[11px]"
              />
              <button
                onClick={handlePlayerSubmit}
                disabled={submittingPlayer}
                className="w-full py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-lg transition"
              >
                {submittingPlayer ? 'Submitting...' : 'Request Player Role'}
              </button>
            </div>
          ) : pStatus === 'PENDING' ? (
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[11px] text-amber-300">
              ⌛ Request is under review by Super Admin.
            </div>
          ) : (
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-[11px] text-emerald-300">
              ✅ Approved! You are a registered Player.
            </div>
          )}

          {playerMsg && <p className="text-[11px] text-sky-400 mt-1">{playerMsg}</p>}
        </div>

        {/* Manager Request Card */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-white uppercase tracking-wider">Team Manager Role</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                mStatus === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                mStatus === 'PENDING' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse' :
                mStatus === 'REJECTED' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                'bg-slate-800 text-slate-400'
              }`}>
                {mStatus === 'NONE' ? 'Not Requested' : mStatus}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Manage a franchise team, build target shortlists, and participate in live auction bidding.
            </p>
          </div>

          {mStatus === 'NONE' || mStatus === 'REJECTED' ? (
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <input
                type="text"
                value={managerNote}
                onChange={e => setManagerNote(e.target.value)}
                placeholder="Optional note for admin (e.g. franchise preference)"
                className="glass-input w-full rounded-lg px-3 py-1.5 text-[11px]"
              />
              <button
                onClick={handleManagerSubmit}
                disabled={submittingManager}
                className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-lg transition"
              >
                {submittingManager ? 'Submitting...' : 'Request Team Manager Role'}
              </button>
            </div>
          ) : mStatus === 'PENDING' ? (
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[11px] text-amber-300">
              ⌛ Request is under review by Super Admin.
            </div>
          ) : (
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-[11px] text-emerald-300">
              ✅ Approved! You are a Team Manager.
            </div>
          )}

          {managerMsg && <p className="text-[11px] text-amber-400 mt-1">{managerMsg}</p>}
        </div>
      </div>
    </section>
  );
}

