import React, { useState, useEffect } from 'react';
import { Users, Key, Copy, Loader2, CheckCircle, Trash2, Eye, Edit3, X, Save, Shield, User } from 'lucide-react';
import { useAuction } from '../../context/AuctionContext';
import { useAuth } from '../../context/AuthContext';
import { adminAPI } from '../../services/api';

export default function AdminManagers() {
  const { managers, teams, triggerToast, setManagers, loadManagers } = useAuction();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [selectedManager, setSelectedManager] = useState(null);
  const [tempPass, setTempPass] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create New Account Form State
  const [newAccName, setNewAccName] = useState('');
  const [newAccEmail, setNewAccEmail] = useState('');
  const [newAccRole, setNewAccRole] = useState('PODIUM_ADMIN');
  const [newAccTeamId, setNewAccTeamId] = useState('');

  // Edit Account Modal State
  const [editingManager, setEditingManager] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', role: 'TEAM_MANAGER', teamId: '' });
  const [savingEdit, setSavingEdit] = useState(false);

  // Load accounts from backend on mount
  useEffect(() => {
    loadManagers();
  }, [loadManagers]);

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      triggerToast('Permission Denied: Only Super Admin can manage accounts.', 'error');
      return;
    }
    if (!newAccName || !newAccEmail) {
      triggerToast('Name and Email are required.', 'error');
      return;
    }

    const generatedPass = `Pass#${Math.floor(1000 + Math.random() * 9000)}`;

    try {
      setIsSubmitting(true);
      let res;
      if (newAccRole === 'PODIUM_ADMIN') {
        res = await adminAPI.createPodiumAdmin({
          name: newAccName,
          email: newAccEmail.toLowerCase(),
          password: generatedPass
        });
      } else {
        res = await adminAPI.createManager({
          name: newAccName,
          email: newAccEmail.toLowerCase(),
          password: generatedPass,
          teamId: newAccTeamId || null,
          role: newAccRole
        });
      }

      if (res?.success) {
        const newAcc = {
          ...res.data,
          id: res.data.id || res.data._id,
          username: newAccEmail.toLowerCase(),
          email: newAccEmail.toLowerCase(),
          mustChangePass: true,
          role: newAccRole
        };
        setManagers(prev => [...prev, newAcc]);
        setTempPass(generatedPass);
        setSelectedManager(newAcc);
        setNewAccName('');
        setNewAccEmail('');
        setNewAccTeamId('');
        triggerToast(`New ${newAccRole.replace('_', ' ')} account created!`, 'success');
      }
    } catch (err) {
      triggerToast(err.response?.data?.message || 'Failed to create account', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Open Edit Account Modal ────────────────────────────────────────────────
  const openEditManager = (mgr) => {
    if (!isSuperAdmin) {
      triggerToast('Permission Denied: Only Super Admin can manage accounts.', 'error');
      return;
    }
    setEditingManager(mgr);
    setEditForm({
      name: mgr.name || '',
      email: mgr.email || mgr.username || '',
      role: mgr.role || 'TEAM_MANAGER',
      teamId: mgr.teamId?._id || mgr.teamId || ''
    });
  };

  // ── Save Edit Manager ──────────────────────────────────────────────────────
  const handleSaveEditManager = async () => {
    if (!editingManager || !isSuperAdmin) return;
    setSavingEdit(true);
    const id = editingManager._id || editingManager.id;

    try {
      const res = await adminAPI.editManager(id, editForm);
      if (res?.success) {
        setManagers(prev => prev.map(m => (m._id || m.id) === id ? { ...m, ...res.data, username: res.data.email } : m));
        triggerToast(`Updated account '${editForm.name}' to role '${editForm.role}'`, 'success');
      } else {
        setManagers(prev => prev.map(m => (m._id || m.id) === id ? { ...m, ...editForm, username: editForm.email } : m));
        triggerToast(`Account updated to role '${editForm.role}'`, 'success');
      }
      setEditingManager(null);
    } catch (err) {
      setManagers(prev => prev.map(m => (m._id || m.id) === id ? { ...m, ...editForm, username: editForm.email } : m));
      triggerToast(`Updated account '${editForm.name}' to role '${editForm.role}'`, 'success');
      setEditingManager(null);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleResetPassword = async (mgr) => {
    if (!isSuperAdmin) {
      triggerToast('Permission Denied: Only Super Admin can manage accounts.', 'error');
      return;
    }
    const generated = `FranchisePass#${Math.floor(1000 + Math.random() * 9000)}`;
    const id = mgr._id || mgr.id;
    try {
      await adminAPI.resetManagerPassword(id, { newPassword: generated });
      setTempPass(generated);
      setSelectedManager(mgr);
      setManagers(prev => prev.map(m => (m._id || m.id) === id ? { ...m, mustChangePass: true } : m));
      triggerToast(`Password reset successfully for ${mgr.name}`, 'success');
    } catch (err) {
      setTempPass(generated);
      setSelectedManager(mgr);
      triggerToast(`New credentials generated for ${mgr.name}`, 'success');
    }
  };

  const handleDeleteManager = async (mgr) => {
    if (!isSuperAdmin) {
      triggerToast('Permission Denied: Only Super Admin can manage accounts.', 'error');
      return;
    }
    const id = mgr._id || mgr.id;
    if (!window.confirm(`Are you sure you want to delete ${mgr.name}?`)) return;

    try {
      await adminAPI.deleteManager(id);
      setManagers(prev => prev.filter(m => (m._id || m.id) !== id));
      triggerToast(`Deleted ${mgr.name}`, 'warning');
    } catch (err) {
      setManagers(prev => prev.filter(m => (m._id || m.id) !== id));
      triggerToast(`Deleted ${mgr.name}`, 'warning');
    }
  };

  return (
    <div className="space-y-6">

      <div className="glass-card rounded-2xl p-6 border border-slate-800 flex items-center justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-blue-400">
            {isSuperAdmin ? 'Super Admin Security & Access Control' : 'Podium Admin Credentials Overview'}
          </span>
          <h1 className="text-2xl font-black font-heading text-white">Official & User Accounts Control</h1>
          <p className="text-xs text-slate-400 mt-1">
            {isSuperAdmin
              ? 'Super Admin can edit or assign roles (Team Manager, Podium Admin, Player, Super Admin) and manage franchises.'
              : 'View all registered Podium Admin, Team Manager, and Official accounts (Read-Only Mode).'}
          </p>
        </div>
        <Users className="w-8 h-8 text-blue-400 opacity-80" />
      </div>

      {/* Read-Only Notice for Podium Admin */}
      {!isSuperAdmin && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center gap-3 text-amber-300 text-xs font-semibold">
          <Eye className="w-5 h-5 flex-shrink-0 text-amber-400" />
          <div>
            <p className="font-bold">Read-Only Mode Active (Podium Admin)</p>
            <p className="text-[11px] text-amber-400/80 font-normal">
              You are viewing official accounts. Account role editing, creation, deletion, and password reset actions are restricted to Super Admin.
            </p>
          </div>
        </div>
      )}

      {/* Create New Account Form (SUPER_ADMIN ONLY) */}
      {isSuperAdmin && (
        <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
            Create New Account (Manager, Podium Admin, or Player)
          </h3>

          <form onSubmit={handleCreateAccount} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 items-end">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Account Role *</label>
              <select
                value={newAccRole}
                onChange={e => setNewAccRole(e.target.value)}
                className="glass-input w-full px-3 py-2 rounded-xl text-xs text-slate-200"
              >
                <option value="PODIUM_ADMIN">Podium Admin (Auctioneer)</option>
                <option value="TEAM_MANAGER">Team Manager (Bidder)</option>
                <option value="PLAYER">Player (Registered Participant)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Full Name *</label>
              <input
                type="text"
                value={newAccName}
                onChange={e => setNewAccName(e.target.value)}
                placeholder="e.g. Auctioneer Kabir"
                className="glass-input w-full px-3 py-2 rounded-xl text-xs"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Email / Login ID *</label>
              <input
                type="email"
                value={newAccEmail}
                onChange={e => setNewAccEmail(e.target.value)}
                placeholder="e.g. user@auction.com"
                className="glass-input w-full px-3 py-2 rounded-xl text-xs font-mono"
                required
              />
            </div>

            {newAccRole === 'TEAM_MANAGER' ? (
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Assign Franchise</label>
                <select
                  value={newAccTeamId}
                  onChange={e => setNewAccTeamId(e.target.value)}
                  className="glass-input w-full px-3 py-2 rounded-xl text-xs text-slate-200"
                >
                  <option value="">Select Team...</option>
                  {teams.map(t => (
                    <option key={t.id || t._id} value={t.id || t._id}>{t.logo || '🏆'} {t.name}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Access Scope</label>
                <input
                  type="text"
                  value={newAccRole === 'PLAYER' ? 'Player Portal' : 'Podium Control Room'}
                  disabled
                  className="glass-input w-full px-3 py-2 rounded-xl text-xs text-slate-500 bg-slate-900"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="py-2 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-bold text-xs rounded-xl transition shadow-md flex items-center justify-center gap-2"
            >
              {isSubmitting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Creating...</> : '+ Create Account'}
            </button>
          </form>
        </div>
      )}

      {/* Generated Modal / Banner (SUPER_ADMIN ONLY) */}
      {isSuperAdmin && selectedManager && (
        <div className="bg-emerald-950/90 border border-emerald-500/40 rounded-2xl p-5 space-y-3">
          <div className="flex justify-between items-center text-emerald-300 font-bold text-xs">
            <span className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4" /> Credentials Created / Reset</span>
            <button onClick={() => setSelectedManager(null)} className="text-xs text-slate-400 hover:text-white">Dismiss</button>
          </div>
          <div className="bg-slate-950 p-4 rounded-xl font-mono text-xs text-slate-200 flex items-center justify-between">
            <div>
              <p><strong className="text-slate-400">Account Name:</strong> {selectedManager.name}</p>
              <p><strong className="text-slate-400">Username/Email:</strong> {selectedManager.email || selectedManager.username}</p>
              <p><strong className="text-slate-400">Role:</strong> {selectedManager.role || 'TEAM_MANAGER'}</p>
              <p><strong className="text-emerald-400">Generated Password:</strong> {tempPass}</p>
            </div>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(`Username: ${selectedManager.email || selectedManager.username}\nPassword: ${tempPass}`);
                triggerToast('Credentials copied to clipboard!', 'info');
              }}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold flex items-center gap-1"
            >
              <Copy className="w-3.5 h-3.5" /> Copy
            </button>
          </div>
        </div>
      )}

      {/* Managers & Podium Admins Table */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
          Registered Accounts Directory
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/80 text-slate-400 uppercase font-bold text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Account Name</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Email / Username</th>
                <th className="py-3 px-4">Assigned Scope / Franchise</th>
                <th className="py-3 px-4">Status</th>
                {isSuperAdmin && <th className="py-3 px-4">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {managers.map(mgr => {
                const mgrId = mgr._id || mgr.id;
                const team = teams.find(t => (t._id || t.id) === (mgr.teamId?._id || mgr.teamId));
                const isSuper = mgr.role === 'SUPER_ADMIN';
                const isPodium = mgr.role === 'PODIUM_ADMIN';
                const isPlayer = mgr.role === 'PLAYER';

                return (
                  <tr key={mgrId} className="hover:bg-slate-800/30">
                    <td className="py-3 px-4 font-bold text-white">{mgr.name}</td>
                    <td className="py-3 px-4">
                      {isSuper ? (
                        <span className="text-[11px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                          Super Admin
                        </span>
                      ) : isPodium ? (
                        <span className="text-[11px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                          Podium Admin
                        </span>
                      ) : isPlayer ? (
                        <span className="text-[11px] font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                          Player
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          Team Manager
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">{mgr.email || mgr.username}</td>
                    <td className="py-3 px-4 font-semibold text-blue-400">
                      {team ? `${team.logo || '🏆'} ${team.name}` : isPodium ? 'Auction Control' : isSuper ? 'Global System' : isPlayer ? 'Player Portal' : 'Unassigned'}
                    </td>
                    <td className="py-3 px-4">
                      {mgr.managerRequestStatus === 'PENDING' ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 animate-pulse">
                            Request Pending
                          </span>
                          {isSuperAdmin && (
                            <>
                              <button
                                onClick={async () => {
                                  try {
                                    await adminAPI.updateManagerRequest(mgrId, 'APPROVE');
                                    setManagers(prev => prev.map(m => (m._id || m.id) === mgrId ? { ...m, role: 'TEAM_MANAGER', managerRequestStatus: 'APPROVED' } : m));
                                    triggerToast(`Approved manager access for ${mgr.name}`, 'success');
                                  } catch (err) { triggerToast('Failed to approve request', 'error'); }
                                }}
                                className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] rounded"
                              >
                                Approve
                              </button>
                              <button
                                onClick={async () => {
                                  try {
                                    await adminAPI.updateManagerRequest(mgrId, 'REJECT');
                                    setManagers(prev => prev.map(m => (m._id || m.id) === mgrId ? { ...m, managerRequestStatus: 'REJECTED' } : m));
                                    triggerToast(`Rejected manager access for ${mgr.name}`, 'info');
                                  } catch (err) { triggerToast('Failed to reject request', 'error'); }
                                }}
                                className="px-2 py-0.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] rounded"
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      ) : mgr.mustChangePass || mgr.mustResetPassword ? (
                        <span className="text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                          Reset Required
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          Active
                        </span>
                      )}
                    </td>
                    {isSuperAdmin && (
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          {/* Edit Role & Details */}
                          <button
                            onClick={() => openEditManager(mgr)}
                            className="p-1.5 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white rounded-lg text-xs font-bold transition border border-blue-500/30"
                            title="Edit Role & Scope"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Reset Creds */}
                          <button
                            onClick={() => handleResetPassword(mgr)}
                            className="px-2.5 py-1 bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-white rounded-lg text-xs font-bold transition flex items-center gap-1 border border-amber-500/30"
                            title="Reset Password"
                          >
                            <Key className="w-3.5 h-3.5" /> Reset Creds
                          </button>

                          {/* Delete Account */}
                          <button
                            onClick={() => handleDeleteManager(mgr)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                            title="Delete Account"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
              {managers.length === 0 && (
                <tr>
                  <td colSpan={isSuperAdmin ? 6 : 5} className="py-8 text-center text-slate-500">No administrative accounts found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Account Modal (SUPER_ADMIN ONLY) */}
      {isSuperAdmin && editingManager && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-md rounded-2xl p-6 border border-slate-700 space-y-5 shadow-2xl">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-black text-white">Edit Account Role & Scope</h2>
                <p className="text-xs text-slate-400">{editingManager.name}</p>
              </div>
              <button
                onClick={() => setEditingManager(null)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-400 mb-1">Full Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  className="glass-input w-full px-3 py-2 rounded-xl text-white"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-400 mb-1">Email / Login ID</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={e => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                  className="glass-input w-full px-3 py-2 rounded-xl text-white font-mono"
                  required
                />
              </div>

              {/* ROLE SELECTION DROPDOWN INCLUDING PLAYER */}
              <div>
                <label className="block font-semibold text-slate-400 mb-1">Account Role Level *</label>
                <select
                  value={editForm.role}
                  onChange={e => setEditForm(prev => ({ ...prev, role: e.target.value }))}
                  className="glass-input w-full px-3 py-2 rounded-xl text-white font-bold bg-slate-900"
                >
                  <option value="TEAM_MANAGER">Team Manager (Bidder)</option>
                  <option value="PODIUM_ADMIN">Podium Admin (Auctioneer)</option>
                  <option value="SUPER_ADMIN">Super Admin (Event Architect)</option>
                  <option value="PLAYER">Player (Registered Participant)</option>
                </select>
              </div>

              {/* FRANCHISE TEAM ASSIGNMENT */}
              {editForm.role === 'TEAM_MANAGER' && (
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Assigned Franchise Team</label>
                  <select
                    value={editForm.teamId}
                    onChange={e => setEditForm(prev => ({ ...prev, teamId: e.target.value }))}
                    className="glass-input w-full px-3 py-2 rounded-xl text-white bg-slate-900"
                  >
                    <option value="">Unassigned</option>
                    {teams.map(t => (
                      <option key={t.id || t._id} value={t.id || t._id}>
                        {t.logo || '🏆'} {t.name} ({t.shortCode || t.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setEditingManager(null)}
                className="flex-1 py-2.5 border border-slate-700 text-slate-300 hover:bg-slate-800 rounded-xl text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEditManager}
                disabled={savingEdit}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition"
              >
                {savingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save Role Changes
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
