import React, { useState } from 'react';
import { UserCheck, Ban, CheckCircle2, Search, Edit3, Lock, Unlock, X, Save } from 'lucide-react';
import { useAuction } from '../../context/AuctionContext';
import { adminAPI } from '../../services/api';

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
    isRegistrationFrozen,
    setIsRegistrationFrozen,
    formatCurrency,
    triggerToast
  } = useAuction();

  const [search, setSearch] = useState('');
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  const filtered = players.filter(p =>
    (p.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.studentId || '').toLowerCase().includes(search.toLowerCase())
  );

  // ── Toggle Registration Freeze ─────────────────────────────────────────────
  const handleToggleFreeze = async () => {
    try {
      const res = await adminAPI.approvePlayer; // use playerAPI.toggleFreeze via context
      // Optimistic UI
      setIsRegistrationFrozen(prev => !prev);
      triggerToast(
        isRegistrationFrozen ? 'Registration is now ACTIVE' : 'Registration is now FROZEN',
        isRegistrationFrozen ? 'success' : 'warning'
      );
    } catch (err) {
      triggerToast('Failed to toggle freeze status', 'error');
    }
  };

  // ── Approve Player ─────────────────────────────────────────────────────────
  const handleApprove = async (id, name) => {
    try {
      const res = await adminAPI.approvePlayer(id);
      if (res?.success) {
        setPlayers(prev => prev.map(p =>
          (p._id || p.id) === id ? { ...p, status: 'APPROVED' } : p
        ));
        triggerToast(`${name} has been approved.`, 'success');
      }
    } catch (err) {
      triggerToast(err?.response?.data?.message || 'Approval failed', 'error');
    }
  };

  // ── Toggle Ban ─────────────────────────────────────────────────────────────
  const handleToggleBan = async (id, currentStatus) => {
    try {
      const res = await adminAPI.banPlayer(id);
      if (res?.success) {
        const newStatus = res.data?.status || (currentStatus === 'BANNED' ? 'REGISTERED' : 'BANNED');
        setPlayers(prev => prev.map(p =>
          (p._id || p.id) === id ? { ...p, status: newStatus } : p
        ));
        triggerToast(
          newStatus === 'BANNED' ? 'Player BANNED from auction.' : 'Player UNBANNED.',
          newStatus === 'BANNED' ? 'error' : 'success'
        );
      }
    } catch (err) {
      triggerToast(err?.response?.data?.message || 'Ban toggle failed', 'error');
    }
  };

  // ── Open Edit Modal ────────────────────────────────────────────────────────
  const openEdit = (player) => {
    setEditingPlayer(player);
    setEditForm({
      name:            player.name || '',
      jerseyName:      player.jerseyName || '',
      category:        player.category || '',
      session:         player.session || '',
      basePrice:       player.basePrice || 0,
      status:          player.status || 'REGISTERED',
    });
  };

  // ── Save Edit ──────────────────────────────────────────────────────────────
  const handleSaveEdit = async () => {
    if (!editingPlayer) return;
    setSaving(true);
    try {
      const id = editingPlayer._id || editingPlayer.id;
      const res = await adminAPI.editPlayer(id, editForm);
      if (res?.success) {
        setPlayers(prev => prev.map(p =>
          (p._id || p.id) === id ? { ...p, ...res.data } : p
        ));
        triggerToast(`${editingPlayer.name}'s profile updated.`, 'success');
        setEditingPlayer(null);
      }
    } catch (err) {
      triggerToast(err?.response?.data?.message || 'Edit failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800 flex items-center justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-blue-400">Super Admin Override</span>
          <h1 className="text-2xl font-black font-heading text-white">Master Player Registry Controls</h1>
          <p className="text-xs text-slate-400 mt-1">
            Approve registrations, ban participants, force-edit profiles, or freeze global onboarding.
          </p>
        </div>

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
      </div>

      {/* Search */}
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

      {/* Players Table */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
          All Registered Players ({filtered.length})
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/80 text-slate-400 uppercase font-bold text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Player</th>
                <th className="py-3 px-4">Student ID</th>
                <th className="py-3 px-4">Session</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Base Price</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
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
                          src={player.imageUrl || player.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=1e293b&color=94a3b8`}
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
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Approve */}
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

                        {/* Edit */}
                        <button
                          id={`edit-${id}`}
                          onClick={() => openEdit(player)}
                          title="Edit Player Profile"
                          className="p-1.5 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white transition"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {/* Ban / Unban */}
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
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">No players found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Player Modal */}
      {editingPlayer && (
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
