import  { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Edit3, X, Save, Eye, Copy, CheckCircle, AlertTriangle, Lock } from 'lucide-react';
import { useAuction } from '../../context/AuctionContext';
import { useAuth } from '../../context/AuthContext';
import { adminAPI } from '../../services/api';

export default function AdminTeams() {
  const {
    teams, setTeams, managers, loadManagers, formatCurrency, triggerToast,
    // Optional, only used if your AuctionContext exposes them — falls back gracefully if not.
    eventPhase, eventConfig,
  } = useAuction();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  // Team creation should only happen during SETUP. If the context doesn't expose
  // eventPhase yet, we don't block anything (fail-open) — wire it up when the
  // phase-gating middleware described earlier lands on the backend.
  const isSetupPhase = !eventPhase || eventPhase === 'SETUP';

  useEffect(() => {
    if (isSuperAdmin) {
      loadManagers();
    }
  }, [isSuperAdmin, loadManagers]);

  // ── Create Franchise form state ──────────────────────────────────────────
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  // Default budget/minRoster should come from Super Admin's global event config
  // (Total Budget / Bidding Tiers setup) rather than being hardcoded here.
  const [budget, setBudget] = useState(eventConfig?.defaultTeamBudget?.toString() || '100000000');
  const [managerName, setManagerName] = useState('');
  const [managerEmail, setManagerEmail] = useState('');
  const [creating, setCreating] = useState(false);

  // ── Post-creation credential display state ───────────────────────────────
  const [selectedManager, setSelectedManager] = useState(null);
  const [tempPass, setTempPass] = useState('');

  // ── Edit modal state ─────────────────────────────────────────────────────
  const [editingTeam, setEditingTeam] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  // ── Delete confirm modal state (replaces window.confirm) ─────────────────
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, name }
  const [deletingId, setDeletingId] = useState(null); // guards double-click / race condition

  // ── Search state ──────────────────────────────────────────────────────────
  const [search] = useState('');

  // --- Derived Data ---
  const unassignedManagers = managers.filter(m => !m.teamId && m.role === 'TEAM_MANAGER');

  const filteredTeams = useMemo(() => {
    // Defensive de-dupe by id — guards against upstream duplicate records
    // (e.g. AuctionContext re-fetching/appending teams more than once).
    // The real fix should happen where `teams` is loaded/set, not here.
    const seen = new Set();
    const deduped = teams.filter(t => {
      const tid = String(t._id || t.id);
      if (seen.has(tid)) return false;
      seen.add(tid);
      return true;
    });

    if (!search.trim()) return deduped;
    const q = search.trim().toLowerCase();
    return deduped.filter(t =>
      (t.name || '').toLowerCase().includes(q) ||
      (t.shortCode || t.code || '').toLowerCase().includes(q)
    );
  }, [teams, search]);

  // ── Create Franchise (Team + Manager) ────────────────────────────────────
  const handleCreateFranchise = async (e) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      triggerToast('Permission Denied: Only Super Admin can manage teams.', 'error');
      return;
    }
    if (!isSetupPhase) {
      triggerToast('Teams can only be created during the SETUP phase.', 'error');
      return;
    }
    if (!name || !code || !managerName || !managerEmail) {
      triggerToast('All fields are required to create a new franchise.', 'error');
      return;
    }
    if (code.trim().length > 4) {
      triggerToast('Short Code must be 4 characters or fewer.', 'error');
      return;
    }
    const budgetNum = Number(budget);
    if (!budgetNum || budgetNum <= 0) {
      triggerToast('Total Budget must be a positive number.', 'error');
      return;
    }

    setCreating(true);
    const generatedPass = `Pass#${Math.floor(1000 + Math.random() * 9000)}`;
    let createdTeam = null;
    let createdManager = null;

    try {
      // Step 1: Create the team
      const teamRes = await adminAPI.createTeam({
        name,
        shortCode: code.toUpperCase(),
        totalBudget: budgetNum,
        minRoster: eventConfig?.minRosterSize ?? 11,
      });
      createdTeam = teamRes.data;
      if (!createdTeam?._id) throw new Error("Team creation failed.");
      triggerToast(`Team '${name}' created.`, 'info');

      // Step 2: Create the manager and assign the new team's ID
      const managerRes = await adminAPI.createManager({
        name: managerName,
        email: managerEmail.toLowerCase(),
        password: generatedPass,
        role: 'TEAM_MANAGER',
        teamId: createdTeam._id,
      });
      createdManager = managerRes.data;
      if (!createdManager?._id) throw new Error("Manager creation failed.");
      triggerToast(`Manager '${managerName}' created.`, 'info');

      // Step 3: Update the team with the new manager's ID
      const finalTeamRes = await adminAPI.editTeam(createdTeam._id, { managerId: createdManager._id });
      const finalTeam = finalTeamRes.data;

      // Update local state
      loadManagers();
      setTeams(prev => [...prev, finalTeam]);

      // Reset form & show credentials
      setName(''); setCode(''); setBudget(eventConfig?.defaultTeamBudget?.toString() || '100000000');
      setManagerName(''); setManagerEmail('');
      setTempPass(generatedPass);
      setSelectedManager(createdManager);
      triggerToast(`Franchise "${name}" created successfully!`, 'success');

    } catch (err) {
      triggerToast(err.message || 'Franchise creation failed.', 'error');
      // Rollback logic
      if (createdManager?._id) await adminAPI.deleteManager(createdManager._id).catch(() => { });
      if (createdTeam?._id) await adminAPI.deleteTeam(createdTeam._id).catch(() => { });
    } finally {
      setCreating(false);
    }
  };

  // ── Delete Team ────────────────────────────────────────────────────────────
  const confirmDeleteTeam = (id, teamName) => {
    if (!isSuperAdmin) {
      triggerToast('Permission Denied: Only Super Admin can manage teams.', 'error');
      return;
    }
    setDeleteTarget({ id, name: teamName });
  };

  const executeDeleteTeam = async () => {
    if (!deleteTarget) return;
    const { id, name: teamName } = deleteTarget;
    setDeletingId(id);
    try {
      await adminAPI.deleteTeam(id);
      // Only remove from local state once the backend confirms deletion —
      // never remove optimistically, or a failed delete silently "un-deletes"
      // itself on next refresh while the UI already claimed success.
      setTeams(prev => prev.filter(t => (t._id || t.id) !== id));
      triggerToast(`Deleted team: ${teamName}`, 'warning');
    } catch (err) {
      triggerToast(err?.response?.data?.message || `Failed to delete "${teamName}". It still exists.`, 'error');
    } finally {
      setDeletingId(null);
      setDeleteTarget(null);
    }
  };

  // ── Open Edit Modal ────────────────────────────────────────────────────────
  const openEdit = (team) => {
    if (!isSuperAdmin) {
      triggerToast('Permission Denied: Only Super Admin can manage teams.', 'error');
      return;
    }
    setEditingTeam(team);
    setEditForm({
      name: team.name || '',
      shortCode: team.shortCode || team.code || '',
      totalBudget: team.totalBudget || 0,
      managerId: team.managerId || '',
    });
  };

  // ── Save Edit ──────────────────────────────────────────────────────────────
  const handleSaveEdit = async () => {
    if (!editingTeam || !isSuperAdmin) return;
    if (!editForm.shortCode || editForm.shortCode.length > 4) {
      triggerToast('Short Code must be 1-4 characters.', 'error');
      return;
    }
    if (!editForm.totalBudget || editForm.totalBudget <= 0) {
      triggerToast('Total Budget must be a positive number.', 'error');
      return;
    }

    setSaving(true);
    const id = editingTeam._id || editingTeam.id;
    try {
      const res = await adminAPI.editTeam(id, { name: editForm.name, shortCode: editForm.shortCode.toUpperCase(), totalBudget: editForm.totalBudget });
      const updatedTeamData = res.data;

      const oldManagerId = editingTeam.managerId;
      const newManagerId = editForm.managerId;

      if (oldManagerId !== newManagerId) {
        if (oldManagerId) await adminAPI.editManager(oldManagerId, { teamId: null });
        if (newManagerId) await adminAPI.editManager(newManagerId, { teamId: id });
      }

      loadManagers();
      setTeams(prev => prev.map(t => (t._id || t.id) === id ? { ...t, ...updatedTeamData, managerId: newManagerId } : t));

      triggerToast(`${editingTeam.name} updated.`, 'success');
      setEditingTeam(null);
    } catch (err) {
      triggerToast(err?.response?.data?.message || 'Update failed.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Clipboard copy with fallback for non-HTTPS / older browsers ─────────
  const copyCredentials = (text) => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => triggerToast('Credentials copied to clipboard!', 'info'))
        .catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  };

  const fallbackCopy = (text) => {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      triggerToast('Credentials copied to clipboard!', 'info');
    } catch {
      triggerToast('Could not copy automatically — please copy manually.', 'warning');
    }
  };

  return (
    <div className="space-y-6">
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

      {/* Phase lock notice */}
      {isSuperAdmin && !isSetupPhase && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center gap-3 text-rose-300 text-xs font-semibold">
          <Lock className="w-5 h-5 flex-shrink-0 text-rose-400" />
          <div>
            <p className="font-bold">Franchise Creation Locked</p>
            <p className="text-[11px] text-rose-400/80 font-normal">
              Teams can only be created or have their budget changed during the SETUP phase. Current phase: {eventPhase}.
            </p>
          </div>
        </div>
      )}

      {/* Create Team Form (SUPER_ADMIN ONLY) */}
      {isSuperAdmin && (
        <div className={`glass-card rounded-2xl p-6 border border-slate-800 space-y-4 ${!isSetupPhase ? 'opacity-60 pointer-events-none' : ''}`}>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">Create New Franchise</h3>

          <form onSubmit={handleCreateFranchise} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input type="text" placeholder="Team Name*" value={name} onChange={e => setName(e.target.value)} className="glass-input rounded-xl px-4 py-2 text-xs" required disabled={!isSetupPhase} />
              <input type="text" placeholder="Short Code (e.g. DHD)*" maxLength={4} value={code} onChange={e => setCode(e.target.value.toUpperCase())} className="glass-input rounded-xl px-4 py-2 text-xs font-mono uppercase" required disabled={!isSetupPhase} />
              <input type="number" min="1" placeholder="Total Budget (BDT)*" value={budget} onChange={e => setBudget(e.target.value)} className="glass-input rounded-xl px-4 py-2 text-xs" required disabled={!isSetupPhase} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input type="text" placeholder="Manager Full Name*" value={managerName} onChange={e => setManagerName(e.target.value)} className="glass-input rounded-xl px-4 py-2 text-xs md:col-span-1" required disabled={!isSetupPhase} />
              <input type="email" placeholder="Manager Email / Login ID*" value={managerEmail} onChange={e => setManagerEmail(e.target.value)} className="glass-input rounded-xl px-4 py-2 text-xs md:col-span-1" required disabled={!isSetupPhase} />
              <button type="submit" id="create-team-btn" disabled={creating || !isSetupPhase} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1 shadow-md transition md:col-span-1">
                <Plus className="w-4 h-4" />
                {creating ? 'Creating Franchise...' : 'Create Franchise'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Generated Credentials Modal */}
      {isSuperAdmin && selectedManager && (
        <div className="bg-emerald-950/90 border border-emerald-500/40 rounded-2xl p-5 space-y-3">
          <div className="flex justify-between items-center text-emerald-300 font-bold text-xs">
            <span className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4" /> Credentials Created</span>
            <button onClick={() => setSelectedManager(null)} className="text-xs text-slate-400 hover:text-white">Dismiss</button>
          </div>
          <div className="bg-slate-950 p-4 rounded-xl font-mono text-xs text-slate-200 flex items-center justify-between">
            <div>
              <p><strong className="text-slate-400">Account Name:</strong> {selectedManager.name}</p>
              <p><strong className="text-slate-400">Username/Email:</strong> {selectedManager.email || selectedManager.username}</p>
              <p><strong className="text-emerald-400">Generated Password:</strong> {tempPass}</p>
            </div>
            <button
              onClick={() => copyCredentials(`Username: ${selectedManager.email || selectedManager.username}\nPassword: ${tempPass}`)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold flex items-center gap-1"
            >
              <Copy className="w-3.5 h-3.5" /> Copy
            </button>
          </div>
        </div>
      )}

      {/* Franchise List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTeams.map(team => {
          const id = team._id || team.id;
          const rosterCount = team.currentRosterCount ?? (team.currentRoster?.length || 0);
          const manager = managers.find(m => {
            const mTeamId = m.teamId?._id || m.teamId;
            return mTeamId != null && String(mTeamId) === String(id);
          });
          const isDeleting = deletingId === id;

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
                      onClick={() => confirmDeleteTeam(id, team.name)}
                      disabled={isDeleting}
                      title="Delete Team"
                      className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition disabled:opacity-50"
                    >
                      {isDeleting
                        ? <span className="w-4 h-4 border-2 border-rose-400 border-t-transparent rounded-full animate-spin block" />
                        : <Trash2 className="w-4 h-4" />}
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

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className={`p-3 rounded-xl border ${manager ? 'bg-slate-900/60 border-slate-800' : 'bg-amber-500/10 border-amber-500/30'}`}>
                  <span className={`text-[11px] uppercase flex items-center gap-1 ${manager ? 'text-slate-400' : 'text-amber-400 font-bold'}`}>
                    {!manager && <AlertTriangle className="w-3 h-3" />} Manager:
                  </span>
                  <p className={`font-bold mt-0.5 truncate ${manager ? 'text-white' : 'text-amber-300'}`}>
                    {manager ? manager.name : 'Unassigned'}
                  </p>
                </div>
                <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                  <span className="text-[11px] text-slate-400 uppercase">Roster:</span>
                  <p className="font-bold text-white mt-0.5">{rosterCount} / {team.minRoster ?? '—'} min</p>
                </div>
              </div>
            </div>
          );
        })}

        {teams.length === 0 && (
          <div className="col-span-2 py-12 text-center text-slate-500 glass-card rounded-2xl border border-slate-800">
            No teams created yet
          </div>
        )}

        {teams.length > 0 && filteredTeams.length === 0 && (
          <div className="col-span-2 py-12 text-center text-slate-500 glass-card rounded-2xl border border-slate-800">
            No teams match "{search}"
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
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Team Name</label>
                <input
                  type="text"
                  value={editForm.name ?? ''}
                  onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  className="glass-input w-full px-3 py-2 rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Short Code (max 4 chars)</label>
                <input
                  type="text"
                  maxLength={4}
                  value={editForm.shortCode ?? ''}
                  onChange={e => setEditForm(prev => ({ ...prev, shortCode: e.target.value.toUpperCase() }))}
                  className="glass-input w-full px-3 py-2 rounded-xl text-xs font-mono uppercase"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Total Budget</label>
                <input
                  type="number"
                  min="1"
                  value={editForm.totalBudget ?? ''}
                  onChange={e => setEditForm(prev => ({ ...prev, totalBudget: Number(e.target.value) }))}
                  className="glass-input w-full px-3 py-2 rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Assign Manager</label>
                <select
                  value={editForm.managerId || ''}
                  onChange={e => setEditForm(prev => ({ ...prev, managerId: e.target.value }))}
                  className="glass-input w-full px-3 py-2 rounded-xl text-xs"
                >
                  <option value="">Unassigned</option>
                  {editingTeam?.managerId && !unassignedManagers.some(m => m._id === editingTeam.managerId) && (
                    <option value={editingTeam.managerId}>
                      {managers.find(m => m._id === editingTeam.managerId)?.name || 'Current'}
                    </option>
                  )}
                  {unassignedManagers.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
                </select>
              </div>
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

      {/* Custom Delete Confirmation Modal (replaces window.confirm for visual consistency) */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-sm rounded-2xl p-6 border border-rose-500/30 space-y-5 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-white">Delete Franchise?</h2>
                <p className="text-xs text-slate-400">This cannot be undone.</p>
              </div>
            </div>
            <p className="text-sm text-slate-300">
              Are you sure you want to permanently delete <span className="font-bold text-white">"{deleteTarget.name}"</span>? All roster and bidding history tied to this team may be affected.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deletingId === deleteTarget.id}
                className="flex-1 py-2.5 border border-slate-700 text-slate-300 hover:bg-slate-800 rounded-xl text-xs font-semibold transition disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={executeDeleteTeam}
                disabled={deletingId === deleteTarget.id}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-60 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition"
              >
                {deletingId === deleteTarget.id
                  ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <Trash2 className="w-3.5 h-3.5" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}