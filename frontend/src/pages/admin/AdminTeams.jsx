import { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Edit3, X, Save, Eye, Copy, CheckCircle, AlertTriangle, Lock, Users } from 'lucide-react';
import { useAuction } from '../../context/AuctionContext';
import { useAuth } from '../../context/AuthContext';
import { adminAPI } from '../../services/api';
import Navbar from '../../components/Navbar';
import TeamBadge from '../../components/common/TeamBadge';
import { getTeamAvatarConfig } from '../../utils/themeConfig';
import { getImageUrl } from '../../utils/imageUrl';
import { playerFallback } from '../../utils/playerFallback';

const getCategoryStyles = (category) => {
  switch (category) {
    case 'Icon Category':
      return 'bg-amber-950/50 border-amber-700/50';
    case 'A Grade':
      return 'bg-blue-950/50 border-blue-800/60';
    case 'B Grade':
      return 'bg-teal-950/50 border-teal-800/50';
    case 'Emerging Youth':
      return 'bg-purple-950/50 border-purple-800/50';
    default:
      return 'bg-slate-900/60 border-slate-800';
  }
};

/* ---------------------------------------------------------
   Distinct per-team color themes — same palette/hash logic
   as PublicTeamsView so a given team looks identical across
   both pages (public list + admin management).
---------------------------------------------------------- */
const TEAM_THEMES = [
  { name: 'crimson', gradient: 'from-rose-500/15 via-slate-950/60 to-slate-950', border: 'border-rose-500/40', ring: 'hover:shadow-rose-500/20', accent: 'bg-rose-500', badgeBg: 'bg-rose-500/15 text-rose-300 border-rose-500/30', stat: 'text-rose-300' },
  { name: 'amber', gradient: 'from-amber-500/15 via-slate-950/60 to-slate-950', border: 'border-amber-500/40', ring: 'hover:shadow-amber-500/20', accent: 'bg-amber-500', badgeBg: 'bg-amber-500/15 text-amber-300 border-amber-500/30', stat: 'text-amber-300' },
  { name: 'emerald', gradient: 'from-emerald-500/15 via-slate-950/60 to-slate-950', border: 'border-emerald-500/40', ring: 'hover:shadow-emerald-500/20', accent: 'bg-emerald-500', badgeBg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', stat: 'text-emerald-300' },
  { name: 'sky', gradient: 'from-sky-500/15 via-slate-950/60 to-slate-950', border: 'border-sky-500/40', ring: 'hover:shadow-sky-500/20', accent: 'bg-sky-500', badgeBg: 'bg-sky-500/15 text-sky-300 border-sky-500/30', stat: 'text-sky-300' },
  { name: 'violet', gradient: 'from-violet-500/15 via-slate-950/60 to-slate-950', border: 'border-violet-500/40', ring: 'hover:shadow-violet-500/20', accent: 'bg-violet-500', badgeBg: 'bg-violet-500/15 text-violet-300 border-violet-500/30', stat: 'text-violet-300' },
  { name: 'fuchsia', gradient: 'from-fuchsia-500/15 via-slate-950/60 to-slate-950', border: 'border-fuchsia-500/40', ring: 'hover:shadow-fuchsia-500/20', accent: 'bg-fuchsia-500', badgeBg: 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30', stat: 'text-fuchsia-300' },
  { name: 'teal', gradient: 'from-teal-500/15 via-slate-950/60 to-slate-950', border: 'border-teal-500/40', ring: 'hover:shadow-teal-500/20', accent: 'bg-teal-500', badgeBg: 'bg-teal-500/15 text-teal-300 border-teal-500/30', stat: 'text-teal-300' },
  { name: 'orange', gradient: 'from-orange-500/15 via-slate-950/60 to-slate-950', border: 'border-orange-500/40', ring: 'hover:shadow-orange-500/20', accent: 'bg-orange-500', badgeBg: 'bg-orange-500/15 text-orange-300 border-orange-500/30', stat: 'text-orange-300' },
  { name: 'indigo', gradient: 'from-indigo-500/15 via-slate-950/60 to-slate-950', border: 'border-indigo-500/40', ring: 'hover:shadow-indigo-500/20', accent: 'bg-indigo-500', badgeBg: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30', stat: 'text-indigo-300' },
  { name: 'lime', gradient: 'from-lime-500/15 via-slate-950/60 to-slate-950', border: 'border-lime-500/40', ring: 'hover:shadow-lime-500/20', accent: 'bg-lime-500', badgeBg: 'bg-lime-500/15 text-lime-300 border-lime-500/30', stat: 'text-lime-300' },
];

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getTeamTheme(team) {
  const key = String(team._id || team.id || team.name || team.shortCode || 'team');
  const idx = hashString(key) % TEAM_THEMES.length;
  return TEAM_THEMES[idx];
}

export default function AdminTeams() {
  const {
    teams, setTeams, managers, loadManagers, formatCurrency, triggerToast, players, refetchTeams,
    eventPhase, eventConfig,
  } = useAuction();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const isSetupPhase = !eventPhase || eventPhase === 'SETUP';

  useEffect(() => {
    if (!teams || teams.length === 0) {
      refetchTeams();
    }
    loadManagers();
  }, [loadManagers, refetchTeams, teams]);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [budget, setBudget] = useState(eventConfig?.defaultTeamBudget?.toString() || '100000000');
  const [selectedExistingManagerId, setSelectedExistingManagerId] = useState('');
  const [creating, setCreating] = useState(false);

  const [selectedManager, setSelectedManager] = useState(null);
  const [tempPass, setTempPass] = useState('');

  const [editingTeam, setEditingTeam] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const [viewingRoster, setViewingRoster] = useState(null);

  const [search] = useState('');

  const unassignedManagers = managers.filter(m => !m.teamId && m.role === 'TEAM_MANAGER');

  const filteredTeams = useMemo(() => {
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
    if (!name || !code) {
      triggerToast('Team Name and Short Code are required.', 'error');
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
    let createdTeam = null;

    try {
      // 1. Create the team first
      const teamPayload = {
        name,
        shortCode: code.toUpperCase(),
        totalBudget: budgetNum,
        minRoster: eventConfig?.minRosterSize ?? 11,
      };
      const teamRes = await adminAPI.createTeam(teamPayload);
      createdTeam = teamRes.data;
      if (!createdTeam?._id) throw new Error("Team creation failed.");

      let finalTeam = createdTeam;

      // 2. If a manager was selected, assign them
      if (selectedExistingManagerId) {
        const existingMgr = managers.find(m => m._id === selectedExistingManagerId);
        if (!existingMgr) throw new Error("Selected manager not found.");

        // Assign team to manager
        await adminAPI.editManager(existingMgr._id, { teamId: createdTeam._id });

        // Assign manager to team
        const finalTeamRes = await adminAPI.editTeam(createdTeam._id, { managerId: existingMgr._id });
        finalTeam = finalTeamRes.data;

        triggerToast(`Assigned manager '${existingMgr.name}' to ${name}.`, 'info');
      }

      loadManagers();
      setTeams(prev => [...prev, finalTeam]);

      // Reset form
      setName(''); setCode(''); setBudget(eventConfig?.defaultTeamBudget?.toString() || '100000000'); setSelectedExistingManagerId('');
      triggerToast(`Franchise "${name}" created successfully!`, 'success');

    } catch (err) {
      triggerToast(err.message || 'Franchise creation failed.', 'error');
      // If team was created but manager assignment failed, roll back team creation
      if (createdTeam?._id) {
        await adminAPI.deleteTeam(createdTeam._id).catch(() => { });
      }
    } finally {
      setCreating(false);
    }
  };

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
      setTeams(prev => prev.filter(t => (t._id || t.id) !== id));
      triggerToast(`Deleted team: ${teamName}`, 'warning');
    } catch (err) {
      triggerToast(err?.response?.data?.message || `Failed to delete "${teamName}". It still exists.`, 'error');
    } finally {
      setDeletingId(null);
      setDeleteTarget(null);
    }
  };

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
    <div className={!user ? "min-h-screen flex flex-col bg-darkBg text-slate-100" : ""}>
      {!user && <Navbar />}
      <main className={`space-y-6 ${!user ? 'max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8' : ''}`}>

        {!isSuperAdmin && (
          <div className="mb-6 border-b border-gray-700 pb-3">
            <h1 className="text-2xl font-bold text-white">All Teams</h1>
          </div>
        )}

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

        {isSuperAdmin && isSetupPhase && (
          <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">Create New Franchise</h3>
            </div>

            <form onSubmit={handleCreateFranchise} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input type="text" placeholder="Team Name*" value={name} onChange={e => setName(e.target.value)} className="glass-input rounded-xl px-4 py-2 text-xs" required disabled={!isSetupPhase} />
                <input type="text" placeholder="Short Code (e.g. DHD)*" maxLength={4} value={code} onChange={e => setCode(e.target.value.toUpperCase())} className="glass-input rounded-xl px-4 py-2 text-xs font-mono uppercase" required disabled={!isSetupPhase} />
                <input type="number" min="1" placeholder="Total Budget (BDT)*" value={budget} onChange={e => setBudget(e.target.value)} className="glass-input rounded-xl px-4 py-2 text-xs" required disabled={!isSetupPhase} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Assign Manager (Optional)</label>
                  <select
                    value={selectedExistingManagerId}
                    onChange={e => setSelectedExistingManagerId(e.target.value)}
                    className="glass-input w-full rounded-xl px-4 py-2 text-xs"
                    disabled={!isSetupPhase}
                  >
                    <option value="">-- No Manager --</option>
                    {unassignedManagers.map(m => (
                      <option key={m._id} value={m._id}>
                        {m.name} ({m.email || m.username})
                      </option>
                    ))}
                  </select>
                </div>
                <button type="submit" id="create-team-btn" disabled={creating || !isSetupPhase} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1 shadow-md transition md:col-span-1 md:self-end">
                  <Plus className="w-4 h-4" />
                  {creating ? 'Creating Franchise...' : 'Create Franchise'}
                </button>
              </div>
            </form>
          </div>
        )}

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

        {/* Franchise List Grid — now with distinct per-team color themes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTeams.map(team => {
            const id = team._id || team.id;
            const rosterCount = team.currentRosterCount ?? (team.currentRoster?.length || 0);
            const manager = managers.find(m => {
              const mTeamId = m.teamId?._id || m.teamId;
              return mTeamId != null && String(mTeamId) === String(id);
            });
            const isDeleting = deletingId === id;
            const theme = getTeamTheme(team);

            return (
              <div
                key={id}
                className={`relative overflow-hidden rounded-2xl border ${theme.border} space-y-0 group cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${theme.ring} bg-gradient-to-br ${theme.gradient}`}
                onClick={() => setViewingRoster(team)}
              >
                {/* Colored top accent bar */}
                <div className={`h-1 w-full ${theme.accent}`} />

                <div className="p-5 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <TeamBadge team={team} managerName={manager?.name} size="md" showManager={true} />
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${theme.badgeBg}`}>
                        {team.shortCode || team.code || 'TEAM'}
                      </span>
                    </div>

                    {isSuperAdmin && (
                      <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          id={`edit-team-${id}`}
                          onClick={(e) => { e.stopPropagation(); openEdit(team); }}
                          title="Edit Team"
                          className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          id={`delete-team-${id}`}
                          onClick={(e) => { e.stopPropagation(); confirmDeleteTeam(id, team.name); }}
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
                    <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                      <span className="text-[11px] text-slate-400 uppercase">Total Purse:</span>
                      <p className="font-mono font-bold text-white mt-0.5">{formatCurrency(team.totalBudget)}</p>
                    </div>
                    <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                      <span className="text-[11px] text-slate-400 uppercase">Remaining Purse:</span>
                      <p className={`font-mono font-bold mt-0.5 ${theme.stat}`}>{formatCurrency(team.remainingBudget)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className={`p-3 rounded-xl border ${manager ? 'bg-slate-950/70 border-slate-800' : 'bg-amber-500/10 border-amber-500/30'}`}>
                      <span className={`text-[11px] uppercase flex items-center gap-1 ${manager ? 'text-slate-400' : 'text-amber-400 font-bold'}`}>
                        {!manager && <AlertTriangle className="w-3 h-3" />} Manager:
                      </span>
                      <p className={`font-bold mt-0.5 truncate ${manager ? 'text-white' : 'text-amber-300'}`}>
                        {manager ? manager.name : 'Unassigned'}
                      </p>
                    </div>
                    <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                      <span className="text-[11px] text-slate-400 uppercase">Roster:</span>
                      <p className="font-bold text-white mt-0.5">{rosterCount} / {team.minRoster ?? '—'} min</p>
                    </div>
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

        {/* Roster View Modal */}
        {viewingRoster && (() => {
          const modalTheme = getTeamTheme(viewingRoster);
          return (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className={`glass-card w-full max-w-lg rounded-2xl p-6 border ${modalTheme.border} space-y-5 shadow-2xl flex flex-col bg-gradient-to-br ${modalTheme.gradient}`}>
                <div className="flex justify-between items-center flex-shrink-0">
                  <div>
                    <h2 className="text-lg font-black text-white flex items-center gap-2">
                      <span className="text-2xl">{viewingRoster.logo || '🏆'}</span>
                      {viewingRoster.name} Roster
                    </h2>
                    <p className="text-xs text-slate-400">Players acquired in the auction.</p>
                  </div>
                  <button onClick={() => setViewingRoster(null)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <RosterModalContent team={viewingRoster} />

              </div>
            </div>
          );
        })()}

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
      </main>
    </div>
  );
}

function RosterModalContent({ team }) {
  const { players, formatCurrency } = useAuction();

  const rosterPlayerIds = useMemo(() => {
    if (!team.currentRoster || !Array.isArray(team.currentRoster)) return new Set();
    return new Set(team.currentRoster.map(p => typeof p === 'string' ? p : (p._id || p.id)));
  }, [team.currentRoster]);

  const rosterPlayers = useMemo(() => {
    if (!Array.isArray(players)) return [];
    return players.filter(p => rosterPlayerIds.has(p._id || p.id));
  }, [players, rosterPlayerIds]);

  if (rosterPlayers.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500 text-sm flex flex-col items-center gap-3">
        <Users className="w-10 h-10 text-slate-600" />
        This team has not acquired any players yet.
      </div>
    );
  }

  return (
    <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
      {rosterPlayers.map(player => {
        const categoryStyle = getCategoryStyles(player.category);
        return (<div key={player._id || player.id} className={`border p-3 rounded-xl flex items-center justify-between gap-3 ${categoryStyle}`}>
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={getImageUrl(player.imageUrl, playerFallback('emerald'))}
              alt={player.name}
              className="w-10 h-10 rounded-full object-cover border-2 border-slate-700 flex-shrink-0"
            />
            <div className="min-w-0">
              <p className="font-bold text-sm text-white truncate">{player.name}</p>
              <p className="text-xs text-slate-400">{player.primaryPosition || 'N/A'}</p>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="font-mono font-bold text-sm text-emerald-400">{formatCurrency(player.finalPrice || player.soldPrice || 0)}</p>
            <p className="text-[10px] text-slate-500">Sold Price</p>
          </div>
        </div>);
      })}
    </div>
  );
}