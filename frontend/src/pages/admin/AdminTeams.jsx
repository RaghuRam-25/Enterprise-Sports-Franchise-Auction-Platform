import React, { useState } from 'react';
import { ShieldCheck, Plus, Trash2, Edit3, X, Save, Eye, Lock } from 'lucide-react';
import { useAuction } from '../../context/AuctionContext';
import { useAuth } from '../../context/AuthContext';
import { adminAPI } from '../../services/api';

export default function AdminTeams() {
  const { teams, setTeams, formatCurrency, triggerToast } = useAuction();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  // ── Create form ────────────────────────────────────────────────────────────
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [logo, setLogo] = useState('🔥');
  const [budget, setBudget] = useState('100000000');
  const [minRoster, setMinRoster] = useState('11');
  const [creating, setCreating] = useState(false);

  // ── Edit modal ────────────────────────────────────────────────────────────
  const [editingTeam, setEditingTeam] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  // ── Create Team ────────────────────────────────────────────────────────────
  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      triggerToast('Permission Denied: Only Super Admin can manage teams.', 'error');
      return;
    }
    if (!name || !code) return;
    setCreating(true);
    try {
      const res = await adminAPI.createTeam({
        name,
        shortCode: code.toUpperCase(),
        totalBudget: Number(budget),
        minRoster: Number(minRoster)
      });

      if (res?.success) {
        const newTeam = {
          ...res.data,
          id: res.data._id || res.data.id,
          logo,
          currentRoster: [],
        };
        setTeams(prev => [...prev, newTeam]);
        setName(''); setCode(''); setLogo('🔥');
        triggerToast(`Created Franchise Team: ${name}`, 'success');
      }
    } catch (err) {
      // Optimistic fallback for offline/demo
      const newTeam = {
        id: `team-${Date.now()}`,
        name, shortCode: code.toUpperCase(), logo,
        totalBudget: Number(budget), remainingBudget: Number(budget),
        minRoster: Number(minRoster), currentRosterCount: 0, currentRoster: []
      };
      setTeams(prev => [...prev, newTeam]);
      setName(''); setCode(''); setLogo('🔥');
      triggerToast(`Created Franchise Team: ${name}`, 'success');
    } finally {
      setCreating(false);
    }
  };

  // ── Delete Team ────────────────────────────────────────────────────────────
  const handleDeleteTeam = async (id, teamName) => {
    if (!isSuperAdmin) {
      triggerToast('Permission Denied: Only Super Admin can manage teams.', 'error');
      return;
    }
    if (!window.confirm(`Delete "${teamName}"? This cannot be undone.`)) return;
    try {
      await adminAPI.deleteTeam(id);
    } catch (_) { /* allow optimistic */ }
    setTeams(prev => prev.filter(t => (t._id || t.id) !== id));
    triggerToast(`Deleted team: ${teamName}`, 'warning');
  };

  // ── Open Edit Modal ────────────────────────────────────────────────────────
  const openEdit = (team) => {
    if (!isSuperAdmin) {
      triggerToast('Permission Denied: Only Super Admin can manage teams.', 'error');
      return;
    }
    setEditingTeam(team);
    setEditForm({
      name:            team.name || '',
      shortCode:       team.shortCode || team.code || '',
      totalBudget:     team.totalBudget || 0,
      remainingBudget: team.remainingBudget || 0,
      minRoster:       team.minRoster || 11,
    });
  };

  // ── Save Edit ──────────────────────────────────────────────────────────────
  const handleSaveEdit = async () => {
    if (!editingTeam || !isSuperAdmin) return;
    setSaving(true);
    const id = editingTeam._id || editingTeam.id;
    try {
      const res = await adminAPI.editTeam(id, editForm);
      if (res?.success) {
        setTeams(prev => prev.map(t => (t._id || t.id) === id ? { ...t, ...res.data } : t));
      } else {
        setTeams(prev => prev.map(t => (t._id || t.id) === id ? { ...t, ...editForm } : t));
      }
      triggerToast(`${editingTeam.name} updated.`, 'success');
      setEditingTeam(null);
    } catch (err) {
      setTeams(prev => prev.map(t => (t._id || t.id) === id ? { ...t, ...editForm } : t));
      triggerToast(`${editingTeam.name} updated.`, 'success');
      setEditingTeam(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800 flex items-center justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-blue-400">
            {isSuperAdmin ? 'Super Admin Management' : 'Podium Admin Directory'}
          </span>
          <h1 className="text-2xl font-black font-heading text-white">Franchise Teams & Budget Allocation</h1>
          <p className="text-xs text-slate-400 mt-1">
            {isSuperAdmin
              ? 'Create, edit, or delete franchise teams and manage budget allocations.'
              : 'View franchise team purses, remaining budgets, and roster sizes (Read-Only Mode).'}
          </p>
        </div>
        <ShieldCheck className="w-8 h-8 text-blue-400 opacity-80" />
      </div>

      {/* Read-Only Notice for Podium Admin */}
      {!isSuperAdmin && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center gap-3 text-amber-300 text-xs font-semibold">
          <Eye className="w-5 h-5 flex-shrink-0 text-amber-400" />
          <div>
            <p className="font-bold">Read-Only Mode Active (Podium Admin)</p>
            <p className="text-[11px] text-amber-400/80 font-normal">
              You are viewing franchise team details. Creating, editing, or deleting teams is restricted to Super Admin.
            </p>
          </div>
        </div>
      )}

      {/* Create Team Form (SUPER_ADMIN ONLY) */}
      {isSuperAdmin && (
        <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">Create New Franchise Team</h3>

          <form onSubmit={handleCreateTeam} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            <input
              type="text"
              placeholder="Team Name (e.g. Dhaka Dynamites)"
              value={name}
              onChange={e => setName(e.target.value)}
              className="glass-input rounded-xl px-4 py-2 text-xs"
              required
            />
            <input
              type="text"
              placeholder="Short Code (e.g. DHD)"
              value={code}
              onChange={e => setCode(e.target.value)}
              className="glass-input rounded-xl px-4 py-2 text-xs"
              required
            />
            <input
              type="text"
              placeholder="Emoji/Logo (e.g. ⚡)"
              value={logo}
              onChange={e => setLogo(e.target.value)}
              className="glass-input rounded-xl px-4 py-2 text-xs text-center"
            />
            <input
              type="number"
              placeholder="Total Budget (BDT)"
              value={budget}
              onChange={e => setBudget(e.target.value)}
              className="glass-input rounded-xl px-4 py-2 text-xs"
              required
            />
            <button
              type="submit"
              id="create-team-btn"
              disabled={creating}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1 shadow-md transition"
            >
              <Plus className="w-4 h-4" />
              {creating ? 'Creating…' : 'Create Team'}
            </button>
          </form>
        </div>
      )}

      {/* Franchise List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {teams.map(team => {
          const id = team._id || team.id;
          const rosterCount = team.currentRosterCount ?? (team.currentRoster?.length || 0);
          return (
            <div key={id} className="glass-card rounded-2xl p-5 border border-slate-800 space-y-4 group">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{team.logo || '🏆'}</span>
                  <div>
                    <h3 className="font-extrabold text-base text-white">{team.name}</h3>
                    <span className="font-mono text-xs text-blue-400 font-bold bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                      {team.shortCode || team.code}
                    </span>
                  </div>
                </div>

                {/* Action Buttons (SUPER_ADMIN ONLY) */}
                {isSuperAdmin && (
                  <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      id={`edit-team-${id}`}
                      onClick={() => openEdit(team)}
                      title="Edit Team"
                      className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      id={`delete-team-${id}`}
                      onClick={() => handleDeleteTeam(id, team.name)}
                      title="Delete Team"
                      className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                  <span className="text-[11px] text-slate-400 uppercase">Total Purse:</span>
                  <p className="font-mono font-bold text-white mt-0.5">{formatCurrency(team.totalBudget)}</p>
                </div>
                <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                  <span className="text-[11px] text-slate-400 uppercase">Remaining Purse:</span>
                  <p className="font-mono font-bold text-emerald-400 mt-0.5">{formatCurrency(team.remainingBudget)}</p>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                <span>Roster: <strong className="text-white">{rosterCount}</strong> / {team.minRoster} min</span>
                <span className="text-emerald-400 font-semibold">Active Franchise</span>
              </div>
            </div>
          );
        })}

        {teams.length === 0 && (
          <div className="col-span-2 py-12 text-center text-slate-500 glass-card rounded-2xl border border-slate-800">
            No teams created yet
          </div>
        )}
      </div>

      {/* Edit Team Modal (SUPER_ADMIN ONLY) */}
      {isSuperAdmin && editingTeam && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-md rounded-2xl p-6 border border-slate-700 space-y-5 shadow-2xl">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-black text-white">Edit Team</h2>
                <p className="text-xs text-slate-400">{editingTeam.name}</p>
              </div>
              <button onClick={() => setEditingTeam(null)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {[
                { label: 'Team Name',       field: 'name',            type: 'text'   },
                { label: 'Short Code',      field: 'shortCode',       type: 'text'   },
                { label: 'Total Budget',    field: 'totalBudget',     type: 'number' },
                { label: 'Remaining Budget',field: 'remainingBudget', type: 'number' },
                { label: 'Min Roster',      field: 'minRoster',       type: 'number' },
              ].map(({ label, field, type }) => (
                <div key={field}>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">{label}</label>
                  <input
                    type={type}
                    value={editForm[field] ?? ''}
                    onChange={e => setEditForm(prev => ({ ...prev, [field]: type === 'number' ? Number(e.target.value) : e.target.value }))}
                    className="glass-input w-full px-3 py-2 rounded-xl text-xs"
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditingTeam(null)} className="flex-1 py-2.5 border border-slate-700 text-slate-300 hover:bg-slate-800 rounded-xl text-xs font-semibold transition">
                Cancel
              </button>
              <button
                id="save-team-edit"
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
