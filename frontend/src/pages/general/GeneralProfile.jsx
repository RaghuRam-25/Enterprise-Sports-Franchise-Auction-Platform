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
          <User className="w-6 h-6 text-white" /> General Member Profile
        </h1>
      </div>

      {/* Hero Account Overview Banner */}
      <section className="glass-card rounded-3xl p-6 sm:p-8 border border-cardBorder relative overflow-hidden bg-gradient-to-r from-successGreen/40 via-cardBg to-darkBg shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-neonGreen/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Avatar with photo upload trigger */}
          <div className="relative shrink-0">
            {photoPreview ? (
              <img src={photoPreview} alt="Profile" className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl object-cover border-2 border-neonGreen/50 shadow-xl" />
            ) : (
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-tr from-neonGreen via-neonGreenHover to-successGreen flex items-center justify-center text-3xl sm:text-4xl font-black text-white uppercase shadow-xl">
                {user?.name?.[0] || 'U'}
              </div>
            )}
            <label className="absolute -bottom-2 -right-2 w-9 h-9 rounded-2xl bg-cardBg border border-borderStrong flex items-center justify-center cursor-pointer hover:border-neonGreen hover:scale-105 transition shadow-lg" title="Upload new photo">
              <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
              <ImagePlus className="w-4 h-4 text-white" />
            </label>
          </div>

          {/* User Details Badges */}
          <div className="space-y-3 text-center sm:text-left min-w-0 flex-1">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-white mt-1.5 truncate">{user?.name}</h2>
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-5 gap-y-2 text-xs text-secondaryText">
              <span className="flex items-center gap-1.5 bg-darkBg/60 px-3 py-1.5 rounded-xl border border-cardBorder">
                <Mail className="w-3.5 h-3.5 text-white" /> {user?.email}
              </span>
              {user?.phone && (
                <span className="flex items-center gap-1.5 bg-darkBg/60 px-3 py-1.5 rounded-xl border border-cardBorder font-mono">
                  📱 {user.phone}
                </span>
              )}
              {user?.createdAt && (
                <span className="flex items-center gap-1.5 text-secondaryText">
                  <CalendarDays className="w-3.5 h-3.5" /> Joined {new Date(user.createdAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Edit Personal Information */}
      <section className="glass-card rounded-3xl p-6 sm:p-8 border border-cardBorder space-y-5">
        <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
          Edit Account Information
        </h3>

        {message && (
          <p className="flex items-center gap-2 bg-successGreen/60 border border-neonGreen/40 rounded-2xl p-4 text-xs font-bold text-white">
            <CheckCircle className="w-4.5 h-4.5 shrink-0" /> {message}
          </p>
        )}
        {error && (
          <p className="bg-urgentRed/60 border border-urgentRed/40 rounded-2xl p-4 text-xs font-bold text-urgentRedText">{error}</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="gp-name" className="block text-[11px] font-bold uppercase tracking-wider text-secondaryText mb-1.5">Full Name</label>
            <input
              id="gp-name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="glass-input w-full rounded-2xl px-4 py-3 text-xs text-white"
            />
          </div>

          <div>
            <label htmlFor="gp-phone" className="block text-[11px] font-bold uppercase tracking-wider text-secondaryText mb-1.5">Mobile Phone Number</label>
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
            <label htmlFor="gp-email" className="block text-[11px] font-bold uppercase tracking-wider text-secondaryText mb-1.5">Email Address (Read-only)</label>
            <input
              id="gp-email"
              type="email"
              value={user?.email || ''}
              disabled
              className="glass-input w-full rounded-2xl px-4 py-3 text-xs opacity-60 cursor-not-allowed text-secondaryText"
            />
          </div>

          <div>
            <label htmlFor="gp-role" className="block text-[11px] font-bold uppercase tracking-wider text-secondaryText mb-1.5">Account Role (Fixed)</label>
            <input
              id="gp-role"
              type="text"
              value="GENERAL_USER"
              disabled
              className="glass-input w-full rounded-2xl px-4 py-3 text-xs font-mono uppercase opacity-60 cursor-not-allowed text-white font-bold"
            />
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary px-6 h-[40px] text-xs flex items-center gap-2 disabled:opacity-50"
        >
          {saving ? (
            <span className="w-4 h-4 border-2 border-[#050505] border-t-transparent rounded-full animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save Changes
        </button>
      </section>

      {/* ── Role Upgrade Requests Section ───────────────────────────────────── */}
      <RoleRequestsSection user={user} updateUser={updateUser} />
    </div>
  );
}

function RoleRequestsSection({ user, updateUser }) {
  const [notes, setNotes] = useState({ player: '', manager: '', podium: '', superadmin: '' });
  const [submitting, setSubmitting] = useState({});
  const [msgs, setMsgs] = useState({});

  const setNote = (k) => (e) => setNotes(prev => ({ ...prev, [k]: e.target.value }));
  const setBusy = (k, v) => setSubmitting(prev => ({ ...prev, [k]: v }));
  const setMsg = (k, v) => setMsgs(prev => ({ ...prev, [k]: v }));

  // Card registry — one entry per upgradeable role. Status lives on the user
  // object; submit calls the matching playerAPI endpoint.
  const ROLE_CARDS = [
    {
      key: 'player',
      title: 'Player Role',
      statusKey: 'playerRequestStatus',
      noteKey: 'playerRequestNote',
      notePlaceholder: 'Optional note for admin (e.g. position, experience)',
      cta: 'Request Player Role',
      approvedBlurb: 'Approved! You are a registered Player.',
      submit: async (note) => {
        const m = await import('../../services/api');
        return m.playerAPI.requestPlayerRole(note);
      },
    },
    {
      key: 'manager',
      title: 'Team Manager Role',
      statusKey: 'managerRequestStatus',
      noteKey: 'managerRequestNote',
      notePlaceholder: 'Optional note for admin (e.g. franchise preference)',
      cta: 'Request Team Manager Role',
      approvedBlurb: 'Approved! You are a Team Manager.',
      submit: async (note) => {
        const m = await import('../../services/api');
        return m.playerAPI.requestManagerRole(note);
      },
    },
    {
      key: 'podium',
      title: 'Podium Admin Role',
      targetRole: 'PODIUM_ADMIN',
      statusKey: 'podiumAdminRequestStatus',
      noteKey: 'podiumAdminRequestNote',
      notePlaceholder: 'Optional note for admin (e.g. why you need display access)',
      cta: 'Request Podium Admin Role',
      approvedBlurb: 'Approved! You are a Podium Admin.',
      submit: async (note) => {
        const m = await import('../../services/api');
        return m.playerAPI.requestAdminRole('PODIUM_ADMIN', note);
      },
    },
    {
      key: 'superadmin',
      title: 'Super Admin Role',
      targetRole: 'SUPER_ADMIN',
      statusKey: 'superAdminRequestStatus',
      noteKey: 'superAdminRequestNote',
      notePlaceholder: 'Optional note for admin (e.g. responsibility statement)',
      cta: 'Request Super Admin Role',
      approvedBlurb: 'Approved! You are a Super Admin.',
      submit: async (note) => {
        const m = await import('../../services/api');
        return m.playerAPI.requestAdminRole('SUPER_ADMIN', note);
      },
    },
  ];

  const handleSubmitCard = async (card) => {
    setMsg(card.key, '');
    setBusy(card.key, true);
    try {
      const resp = await card.submit(notes[card.key]);
      if (resp?.success) {
        updateUser({ [card.statusKey]: 'PENDING', [card.noteKey]: notes[card.key] });
        setMsg(card.key, `${card.title.replace(' Role', '')} request submitted to Super Admin!`);
      }
    } catch (err) {
      setMsg(card.key, err?.response?.data?.message || 'Failed to submit request.');
    } finally {
      setBusy(card.key, false);
    }
  };

  const statusBadgeCls = (status) =>
    status === 'APPROVED' ? 'bg-neonGreen/20 text-white border border-neonGreen/30'
    : status === 'PENDING' ? 'bg-warningGold/20 text-warningGold border border-warningGold/30 animate-pulse'
    : status === 'REJECTED' ? 'bg-urgentRed/20 text-urgentRedText border border-urgentRed/30'
    : 'bg-surfaceHover text-secondaryText';

  return (
    <section className="glass-card rounded-2xl p-6 border border-cardBorder space-y-6">
      <div>
        <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
          Role Upgrade Requests
        </h3>
        <p className="text-[11px] text-mutedText mt-1">
          Submit a request and the Super Admin will review it from the Admin Panel.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {ROLE_CARDS.map((card) => {
          const status = user?.[card.statusKey] || 'NONE';
          const busy = !!submitting[card.key];

          return (
            <div key={card.key} className="p-4 rounded-xl border border-cardBorder bg-darkBg/60 space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-black text-white uppercase tracking-wider">{card.title}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${statusBadgeCls(status)}`}>
                    {status === 'NONE' ? 'Not Requested' : status}
                  </span>
                </div>
              </div>

              {user?.role === card.targetRole ? (
                <div className="p-2.5 bg-neonGreen/10 border border-neonGreen/20 rounded-lg text-[11px] text-white">
                  ✓ You already have this role.
                </div>
              ) : status === 'NONE' || status === 'REJECTED' ? (
                <div className="space-y-2 pt-2 border-t border-cardBorder">
                  <input
                    type="text"
                    value={notes[card.key]}
                    onChange={setNote(card.key)}
                    placeholder={card.notePlaceholder}
                    className="glass-input w-full rounded-lg px-3 py-1.5 text-[11px]"
                  />
                  <button
                    onClick={() => handleSubmitCard(card)}
                    disabled={busy}
                    className="btn-primary w-full py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {busy ? 'Submitting...' : card.cta}
                  </button>
                </div>
              ) : status === 'PENDING' ? (
                <div className="p-2.5 bg-warningGold/10 border border-warningGold/20 rounded-lg text-[11px] text-warningGold">
                  ⏳ Request is under review by Super Admin.
                </div>
              ) : (
                <div className="p-2.5 bg-neonGreen/10 border border-neonGreen/20 rounded-lg text-[11px] text-white">
                  ✓ {card.approvedBlurb}
                </div>
              )}

              {msgs[card.key] && <p className="text-[11px] text-warningGold mt-1">{msgs[card.key]}</p>}
            </div>
          );
        })}
      </div>
    </section>
  );
}