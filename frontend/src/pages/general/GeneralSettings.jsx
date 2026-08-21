import { useState } from 'react';
import { Settings, KeyRound, Bell, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../services/api';
import api from '../../services/api';

/**
 * GENERAL_USER settings — account info, password change and
 * notification preferences. No administrative settings exposed.
 */
export default function GeneralSettings() {
  const { user, updateUser } = useAuth();

  // Password change state
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwMessage, setPwMessage] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSaving, setPwSaving] = useState(false);

  // Notification preferences state
  const [prefs, setPrefs] = useState(() => ({
    tournamentUpdates: true,
    matchReminders: true,
    auctionAlerts: true,
    resultsPublished: true,
    ...(user?.notificationPrefs || {})
  }));
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [prefsMessage, setPrefsMessage] = useState('');

  const setPwField = (key) => (e) => setPwForm(prev => ({ ...prev, [key]: e.target.value }));

  const handlePasswordChange = async () => {
    setPwMessage(''); setPwError('');
    if (!pwForm.currentPassword || !pwForm.newPassword) {
      setPwError('Both current and new password are required');
      return;
    }
    if (pwForm.newPassword.length < 6) {
      setPwError('New password must be at least 6 characters');
      return;
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwError('New passwords do not match');
      return;
    }

    setPwSaving(true);
    try {
      const data = await api.post('/auth/change-password', {
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword
      });
      if (data?.success) {
        setPwMessage('Password changed successfully');
        setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        setPwError(data?.message || 'Failed to change password');
      }
    } catch (err) {
      setPwError(err?.response?.data?.message || 'Failed to reach the server');
    } finally {
      setPwSaving(false);
    }
  };

  const togglePref = async (key) => {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    setPrefsMessage('');
    setPrefsSaving(true);
    try {
      const res = await authAPI.updateMe({ notificationPrefs: next });
      if (res?.success) {
        updateUser({ notificationPrefs: next });
        setPrefsMessage('Notification preferences saved');
      }
    } catch {
      /* revert silently on failure */
      setPrefs(prefs);
    } finally {
      setPrefsSaving(false);
    }
  };

  const prefRows = [
    { key: 'tournamentUpdates', label: 'Tournament updates', desc: 'Phase changes and tournament announcements' },
    { key: 'matchReminders', label: 'Match reminders', desc: 'Heads-up before upcoming matches kick off' },
    { key: 'auctionAlerts', label: 'Live auction alerts', desc: 'Notify me when the auction goes live' },
    { key: 'resultsPublished', label: 'Result publications', desc: 'Alert me when new results are published' },
  ];

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-black text-white">
          <Settings className="w-5 h-5 text-sky-400" /> Settings
        </h1>
        <p className="text-xs text-slate-400 mt-1">Manage your fan account preferences.</p>
      </div>

      {/* Account overview */}
      <section className="glass-card rounded-2xl p-6 border border-slate-800 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Account</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Name</p>
            <p className="font-bold text-slate-100">{user?.name}</p>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Email</p>
            <p className="font-bold text-slate-100 truncate">{user?.email}</p>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-1 sm:col-span-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Role</p>
            <p className="font-mono font-bold text-sky-300 uppercase">GENERAL_USER — Spectator / Fan access only</p>
          </div>
        </div>
      </section>

      {/* Password change */}
      <section className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
          <KeyRound className="w-4 h-4 text-emerald-400" /> Change Password
        </h3>

        {pwMessage && (
          <p className="flex items-center gap-2 bg-emerald-950/50 border border-emerald-500/30 rounded-xl p-3 text-xs text-emerald-300">
            <CheckCircle className="w-4 h-4 shrink-0" /> {pwMessage}
          </p>
        )}
        {pwError && (
          <p className="flex items-center gap-2 bg-rose-950/50 border border-rose-500/30 rounded-xl p-3 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0" /> {pwError}
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            type="password"
            placeholder="Current password"
            value={pwForm.currentPassword}
            onChange={setPwField('currentPassword')}
            autoComplete="current-password"
            className="glass-input rounded-xl px-4 py-2.5 text-xs"
          />
          <input
            type="password"
            placeholder="New password (min 6)"
            value={pwForm.newPassword}
            onChange={setPwField('newPassword')}
            autoComplete="new-password"
            className="glass-input rounded-xl px-4 py-2.5 text-xs"
          />
          <input
            type="password"
            placeholder="Confirm new password"
            value={pwForm.confirmPassword}
            onChange={setPwField('confirmPassword')}
            autoComplete="new-password"
            className="glass-input rounded-xl px-4 py-2.5 text-xs"
          />
        </div>

        <button
          onClick={handlePasswordChange}
          disabled={pwSaving}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold text-xs rounded-xl shadow-md transition"
        >
          {pwSaving ? (
            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <KeyRound className="w-4 h-4" />
          )}
          Update Password
        </button>
      </section>

      {/* Notification preferences */}
      <section className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
          <Bell className="w-4 h-4 text-amber-400" /> Notification Preferences
        </h3>
        {prefsMessage && (
          <p className="flex items-center gap-2 bg-emerald-950/50 border border-emerald-500/30 rounded-xl p-3 text-xs text-emerald-300">
            <CheckCircle className="w-4 h-4 shrink-0" /> {prefsMessage}
          </p>
        )}
        <ul className="divide-y divide-slate-800/70">
          {prefRows.map(row => (
            <li key={row.key} className="py-3 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-200">{row.label}</p>
                <p className="text-[11px] text-slate-500">{row.desc}</p>
              </div>
              <button
                role="switch"
                aria-checked={!!prefs[row.key]}
                disabled={prefsSaving}
                onClick={() => togglePref(row.key)}
                className={`relative w-10 h-5.5 h-[22px] rounded-full transition shrink-0 ${prefs[row.key] ? 'bg-sky-600' : 'bg-slate-700'}`}
              >
                <span
                  className={`absolute top-[3px] w-4 h-4 rounded-full bg-white shadow transition-all ${prefs[row.key] ? 'left-[22px]' : 'left-[3px]'}`}
                />
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
