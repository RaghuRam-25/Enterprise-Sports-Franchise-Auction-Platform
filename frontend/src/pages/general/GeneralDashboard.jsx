import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Radio, Trophy, CalendarClock, History, ArrowRight, Sparkles, Volleyball,
  User, Mail, Save, CheckCircle, ImagePlus, CalendarDays
} from 'lucide-react';
import api from '../../services/api';
import { authAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useAuction } from '../../context/AuctionContext';
import { usePhase } from '../../context/PhaseContext';

const getMatchDateTime = (match) => {
  if (!match?.matchDate) return null;
  try {
    const base = new Date(match.matchDate);
    if (isNaN(base.getTime())) return null;
    if (match.matchTime && /^\d{1,2}:\d{2}/.test(match.matchTime)) {
      const [h, m] = match.matchTime.split(':').map(Number);
      base.setHours(h, m, 0, 0);
    }
    return base;
  } catch {
    return null;
  }
};

const getCalculatedStatus = (match) => {
  if (match.status && match.status !== 'Upcoming') return match.status;
  const matchDT = getMatchDateTime(match);
  if (!matchDT) return match.status || 'Upcoming';
  const now = new Date();
  const end = new Date(matchDT.getTime() + 3 * 60 * 60 * 1000);
  if (now > end) return 'Finished';
  if (now >= matchDT && now <= end) return 'Live';
  return 'Upcoming';
};

const teamNameOf = (m, side) =>
  side === 'a'
    ? m.teamAName || m.homeTeam || (typeof m.teamA === 'object' ? m.teamA?.name : '') || 'Team A'
    : m.teamBName || m.awayTeam || (typeof m.teamB === 'object' ? m.teamB?.name : '') || 'Team B';

const PHASE_LABELS = {
  SETUP: 'Pre-Season Setup',
  REGISTRATION: 'Player Registration',
  AUCTION: 'Live Auction Season',
  TOURNAMENT: 'Tournament Live',
};

export default function GeneralDashboard() {
  const { user, updateUser } = useAuth();
  const { teams } = useAuction();
  const { phase } = usePhase();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  /* ── Profile state (merged from GeneralProfile) ────────────────────── */
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [photoPreview, setPhotoPreview] = useState(user?.profilePhoto || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');
  const [profileErr, setProfileErr] = useState('');

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

  const handleProfileSave = async () => {
    setProfileMsg(''); setProfileErr('');
    if (!name.trim() || name.trim().length < 2) {
      setProfileErr('Name must be at least 2 characters');
      return;
    }
    setSavingProfile(true);
    try {
      const res = await authAPI.updateMe({
        name: name.trim(),
        phone: phone.trim(),
        profilePhoto: photoPreview || ''
      });
      if (res?.success) {
        updateUser({ name: name.trim(), phone: phone.trim(), profilePhoto: photoPreview || '' });
        setProfileMsg('Profile updated successfully');
      } else {
        setProfileErr(res?.message || 'Failed to update profile');
      }
    } catch (err) {
      setProfileErr(err?.response?.data?.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  /* ── Matches state ─────────────────────────────────────────────────── */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/matches');
        const data = res?.data?.data || res?.data || [];
        if (!cancelled) setMatches(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setMatches([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const processed = useMemo(() => matches.map(m => ({ ...m, calculatedStatus: getCalculatedStatus(m) })), [matches]);
  const liveMatches = useMemo(() => processed.filter(m => m.calculatedStatus === 'Live'), [processed]);
  const upcoming = useMemo(() =>
    processed
      .filter(m => m.calculatedStatus === 'Upcoming')
      .sort((a, b) => (getMatchDateTime(a)?.getTime() || 0) - (getMatchDateTime(b)?.getTime() || 0))
      .slice(0, 4), [processed]);
  const recentResults = useMemo(() =>
    processed
      .filter(m => m.calculatedStatus === 'Finished')
      .sort((a, b) => (getMatchDateTime(b)?.getTime() || 0) - (getMatchDateTime(a)?.getTime() || 0))
      .slice(0, 4), [processed]);

  const firstName = user?.name?.split(' ')[0] || 'Fan';

  const overviewCards = [
    {
      label: 'Live Matches',
      value: loading ? '—' : liveMatches.length,
      icon: Radio,
      accent: 'text-urgentRedText bg-urgentRed/10 border-urgentRed/30',
      to: '/general/matches',
    },
    {
      label: 'Active Tournament',
      value: PHASE_LABELS[phase] || 'Coming Soon',
      icon: Trophy,
      accent: 'text-warningGold bg-warningGold/10 border-warningGold/30',
      to: '/general/tournaments',
      small: true,
    },
    {
      label: 'Upcoming Matches',
      value: loading ? '—' : processed.filter(m => m.calculatedStatus === 'Upcoming').length,
      icon: CalendarClock,
      accent: 'text-white bg-neonGreen/10 border-neonGreen/30',
      to: '/general/schedule',
    },
    {
      label: 'Recent Results',
      value: loading ? '—' : processed.filter(m => m.calculatedStatus === 'Finished').length,
      icon: History,
      accent: 'text-white bg-neonGreen/10 border-neonGreen/30',
      to: '/general/results',
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── Welcome + Account banner (merged profile hero) ───────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-cardBorder bg-gradient-to-r from-successGreen/60 via-cardBg to-darkBg p-6 sm:p-8">
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-[#0B2B26]/45 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-5">
          {/* Avatar */}
          <div className="relative shrink-0">
            {photoPreview ? (
              <img src={photoPreview} alt="Profile" className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl object-cover border-2 border-white/50 shadow-xl" />
            ) : (
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-[#0B2B26] border-2 border-white/40 flex items-center justify-center text-3xl font-black text-white uppercase shadow-xl">
                {user?.name?.[0] || 'U'}
              </div>
            )}
            <label className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl bg-cardBg border border-borderStrong flex items-center justify-center cursor-pointer hover:border-white hover:scale-105 transition shadow-lg" title="Upload new photo">
              <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
              <ImagePlus className="w-3.5 h-3.5 text-white" />
            </label>
          </div>

          <div className="space-y-2 text-center sm:text-left min-w-0">
            <p className="flex items-center justify-center sm:justify-start gap-1.5 text-[11px] font-mono font-bold uppercase tracking-widest text-white">
              <Sparkles className="w-3.5 h-3.5" /> Fan Zone
            </p>
            <h1 className="text-2xl sm:text-3xl font-black text-white">Welcome back, {firstName}</h1>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1.5 text-xs text-secondaryText">
              <span className="flex items-center gap-1.5 bg-darkBg/60 px-3 py-1 rounded-lg border border-cardBorder">
                <Mail className="w-3.5 h-3.5 text-white" /> {user?.email}
              </span>
              {user?.createdAt && (
                <span className="flex items-center gap-1.5 text-secondaryText">
                  <CalendarDays className="w-3.5 h-3.5" /> Joined {new Date(user.createdAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Quick Overview ───────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-secondaryText">Quick Overview</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {overviewCards.map(card => {
            const Icon = card.icon;
            return (
              <Link
                key={card.label}
                to={card.to}
                className="glass-card glass-card-hover rounded-2xl p-5 border border-borderStrong flex items-start justify-between gap-3 group"
              >
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-mutedText">{card.label}</p>
                  <p className={`mt-1.5 font-black text-white truncate ${card.small ? 'text-sm' : 'text-2xl'}`}>
                    {card.value}
                  </p>
                </div>
                <span className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${card.accent}`}>
                  <Icon className="w-5 h-5" />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── Upcoming + Recent row ────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Upcoming Matches */}
        <section className="glass-card rounded-2xl p-5 border border-cardBorder space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-secondaryText">
              <CalendarClock className="w-4 h-4 text-white" /> Upcoming Matches
            </h3>
            <Link to="/general/schedule" className="flex items-center gap-1 text-[11px] font-bold text-white hover:text-white">
              Schedule <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <p className="text-xs text-mutedText py-6 text-center">No upcoming matches scheduled yet.</p>
          ) : (
            <ul className="divide-y divide-cardBorder/70">
              {upcoming.map(m => (
                <li key={m._id || m.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0 text-xs">
                    <p className="font-bold text-primaryText truncate">
                      {teamNameOf(m, 'a')} <span className="text-mutedText font-medium">vs</span> {teamNameOf(m, 'b')}
                    </p>
                    <p className="text-[11px] text-mutedText mt-0.5">
                      {m.matchDate || 'TBD'}{m.matchTime ? ` · ${m.matchTime}` : ''}
                    </p>
                  </div>
                  <Volleyball className="w-4 h-4 text-mutedText shrink-0" />
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Recent Results */}
        <section className="glass-card rounded-2xl p-5 border border-cardBorder space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-secondaryText">
              <History className="w-4 h-4 text-white" /> Recent Results
            </h3>
            <Link to="/general/results" className="flex items-center gap-1 text-[11px] font-bold text-white hover:text-white">
              All results <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {recentResults.length === 0 ? (
            <p className="text-xs text-mutedText py-6 text-center">No results published yet.</p>
          ) : (
            <ul className="divide-y divide-cardBorder/70">
              {recentResults.map(m => (
                <li key={m._id || m.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0 text-xs">
                    <p className="font-bold text-primaryText truncate">
                      {teamNameOf(m, 'a')} <span className="text-mutedText font-medium">vs</span> {teamNameOf(m, 'b')}
                    </p>
                    <p className="text-[11px] text-mutedText mt-0.5">{m.matchDate || ''}</p>
                  </div>
                  <span className="font-mono font-black text-sm text-white shrink-0">
                    {m.scoreA ?? 0} : {m.scoreB ?? 0}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* ── Edit Personal Information (merged profile editor) ────────── */}
      <section className="glass-card rounded-2xl p-6 border border-cardBorder space-y-5">
        <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-white">
          <User className="w-4 h-4 text-sky-400" /> My Account
        </h3>

        {profileMsg && (
          <p className="flex items-center gap-2 bg-successGreen/60 border border-neonGreen/40 rounded-2xl p-4 text-xs font-bold text-white">
            <CheckCircle className="w-4 h-4 shrink-0" /> {profileMsg}
          </p>
        )}
        {profileErr && (
          <p className="bg-urgentRed/60 border border-urgentRed/40 rounded-2xl p-4 text-xs font-bold text-urgentRedText">{profileErr}</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="gd-name" className="block text-[11px] font-bold uppercase tracking-wider text-secondaryText mb-1.5">Full Name</label>
            <input
              id="gd-name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="glass-input w-full rounded-2xl px-4 py-3 text-xs text-white"
            />
          </div>

          <div>
            <label htmlFor="gd-phone" className="block text-[11px] font-bold uppercase tracking-wider text-secondaryText mb-1.5">Mobile Phone Number</label>
            <input
              id="gd-phone"
              type="tel"
              placeholder="+8801700000000"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="glass-input w-full rounded-2xl px-4 py-3 text-xs text-white font-mono"
            />
          </div>

          <div>
            <label htmlFor="gd-email" className="block text-[11px] font-bold uppercase tracking-wider text-secondaryText mb-1.5">Email Address (Read-only)</label>
            <input
              id="gd-email"
              type="email"
              value={user?.email || ''}
              disabled
              className="glass-input w-full rounded-2xl px-4 py-3 text-xs opacity-60 cursor-not-allowed text-secondaryText"
            />
          </div>

          <div>
            <label htmlFor="gd-role" className="block text-[11px] font-bold uppercase tracking-wider text-secondaryText mb-1.5">Account Role (Fixed)</label>
            <input
              id="gd-role"
              type="text"
              value="GENERAL_USER"
              disabled
              className="glass-input w-full rounded-2xl px-4 py-3 text-xs font-mono uppercase opacity-60 cursor-not-allowed text-white font-bold"
            />
          </div>
        </div>

        <button
          onClick={handleProfileSave}
          disabled={savingProfile}
          className="btn-primary px-6 h-[40px] text-xs flex items-center gap-2 disabled:opacity-50"
        >
          {savingProfile ? (
            <span className="w-4 h-4 border-2 border-[#050505] border-t-transparent rounded-full animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save Changes
        </button>
      </section>

      {/* ── Role Upgrade Requests Section ────────────────────────────── */}
      <RoleRequestsSection user={user} updateUser={updateUser} />
    </div>
  );
}

/* ═══════════════ ROLE UPGRADE REQUESTS ═══════════════ */
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
