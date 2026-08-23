import { useState } from 'react';
import { UserCheck, Ban, CheckCircle2, Search, Edit3, Lock, Unlock, X, Save, Trash2, AlertTriangle } from 'lucide-react';
import { useAuction } from '../../context/AuctionContext';
import { useAuth } from '../../context/AuthContext';
import { adminAPI } from '../../services/api';
import api from '../../services/api';
import { getImageUrl } from '../../utils/imageUrl';
import PlayerCardCard from '../../components/common/PlayerCardCard';
import PlayerStageModal from '../../components/common/PlayerStageModal';

const STATUS_STYLES = {
  SOLD: 'bg-neonGreen/20 text-white border-neonGreen/30',
  ON_PODIUM: 'bg-neonGreen/20 text-white border-neonGreen/30 animate-pulse',
  BANNED: 'bg-urgentRed/20 text-urgentRedText border-urgentRed/30',
  WITHDRAWN: 'bg-surfaceHover/50 text-secondaryText border-borderStrong/30',
  APPROVED: 'bg-neonGreen/20 text-white border-neonGreen/30',
  REGISTERED: 'bg-warningGold/20 text-warningGold border-warningGold/30',
  UNSOLD: 'bg-warningGold/20 text-warningGold border-warningGold/30',
};

const getCategoryRowStyle = (category) => {
  switch (category) {
    case 'Icon Category':
      return 'bg-warningGold/20 hover:bg-warningGold/40 border-l-4 border-warningGold';
    case 'A Grade':
      return 'bg-successGreen/20 hover:bg-successGreen/40 border-l-4 border-neonGreen';
    case 'B Grade':
      return 'bg-successGreen/20 hover:bg-successGreen/40 border-l-4 border-neonGreen';
    case 'Emerging Youth':
      return 'bg-warningGold/20 hover:bg-warningGold/40 border-l-4 border-warningGold';
    default:
      return 'hover:bg-surfaceHover/30 border-l-4 border-borderStrong';
  }
};

export default function AdminPlayers() {
  const {
    players,
    setPlayers,
    refetchPlayers,
    sessions,
    positions,
    categories,
    teams = [],
    isRegistrationFrozen,
    formatCurrency,
    triggerToast
  } = useAuction();

  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const canManage = isSuperAdmin; // only super admin can approve/ban/edit others

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [positionFilter, setPositionFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const safePlayers = Array.isArray(players) ? players : [];

  const filtered = safePlayers.filter(p => {
    const searchMatch = (p.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.studentId || '').toLowerCase().includes(search.toLowerCase());
    const categoryMatch = categoryFilter === 'ALL' || p.category === categoryFilter;
    const positionMatch = positionFilter === 'ALL' || p.primaryPosition === positionFilter || (p.positions || []).includes(positionFilter);
    const statusMatch = statusFilter === 'ALL' || p.status === statusFilter;

    return searchMatch && categoryMatch && positionMatch && statusMatch;
  });

  const handleApprove = async (id, playerName) => {
    try {
      await adminAPI.approvePlayer(id);
      setPlayers(prev => prev.map(p => (p._id || p.id) === id ? { ...p, status: 'APPROVED' } : p));
      if (typeof refetchPlayers === 'function') refetchPlayers();
      triggerToast(`Approved player: ${playerName}`, 'success');
    } catch {
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

  // Permanently deletes the player from the database (full cascade:
  // team rosters, lineups, auction references, Cloudinary image).
  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;
    const id = deleteConfirm._id || deleteConfirm.id;
    setDeleting(true);
    try {
      await adminAPI.deletePlayer(id);
      setPlayers(prev => prev.filter(p => (p._id || p.id) !== id));
      if (typeof refetchPlayers === 'function') refetchPlayers();
      triggerToast(`Player '${deleteConfirm.name}' permanently deleted.`, 'success');
      setDeleteConfirm(null);
    } catch (err) {
      triggerToast(err?.response?.data?.message || 'Failed to delete player.', 'error');
    } finally {
      setDeleting(false);
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

  return (
    <div className="space-y-6">

      {/* ── HEADER (Admin / Manager / Podium view) ─────────────────────────────── */}
      <div className="glass-card rounded-2xl p-6 border border-cardBorder flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black font-heading text-white">Player List</h1>
        </div>

      </div>

      {/* ── Search & Filters ─────────────────────────────────────────────────── */}
      <div className="glass-card rounded-2xl p-4 border border-cardBorder space-y-3">
        <div className="flex items-center gap-3">
          <Search className="w-4 h-4 text-secondaryText flex-shrink-0" />
          <input
            type="text"
            placeholder="Search by player name or student ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none text-xs text-white w-full placeholder-mutedText"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-mutedText hover:text-secondaryText">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-3 border-t border-cardBorder">
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="glass-input w-full px-3 py-1.5 rounded-lg text-[11px] text-secondaryText"
          >
            <option value="ALL">All Categories</option>
            {categories.map(c => <option key={c.id || c._id} value={c.name}>{c.name}</option>)}
          </select>
          <select
            value={positionFilter}
            onChange={e => setPositionFilter(e.target.value)}
            className="glass-input w-full px-3 py-1.5 rounded-lg text-[11px] text-secondaryText"
          >
            <option value="ALL">All Positions</option>
            {positions.map(p => <option key={p.id || p._id} value={p.code}>{p.name} ({p.code})</option>)}
          </select>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="glass-input w-full px-3 py-1.5 rounded-lg text-[11px] text-secondaryText"
          >
            <option value="ALL">All Statuses</option>
            {Object.keys(STATUS_STYLES).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* ── Players Card Grid ─────────────────────────────────────────────────────── */}
      <div className="glass-card rounded-2xl p-6 border border-cardBorder space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-secondaryText">
            All Registered Players ({filtered.length})
          </h3>
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center text-mutedText font-medium">
            No players found matching current filters.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 auto-rows-fr">
            {filtered.map(player => (
              <PlayerCardCard
                key={player._id || player.id}
                player={player}
                formatCurrency={formatCurrency}
                canManage={canManage}
                categories={categories}
                onApprove={handleApprove}
                onEdit={openEdit}
                onToggleBan={canManage ? handleToggleBan : undefined}
                onDelete={canManage ? (p) => setDeleteConfirm(p) : undefined}
                onCardClick={() => setSelectedPlayer(player)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Edit Player Modal (SUPER_ADMIN ONLY) ──────────────────────────────── */}
      {canManage && editingPlayer && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-md rounded-2xl p-6 border border-borderStrong space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-black text-white">Edit Player</h2>
                <p className="text-xs text-secondaryText">{editingPlayer.name} · {editingPlayer.studentId}</p>
              </div>
              <button
                onClick={() => setEditingPlayer(null)}
                className="p-2 text-secondaryText hover:text-white hover:bg-surfaceHover rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-secondaryText mb-1">Category</label>
                <select
                  value={editForm.category || ''}
                  onChange={e => setEditForm(prev => ({ ...prev, category: e.target.value }))}
                  className="glass-input w-full px-3 py-2 rounded-xl text-xs"
                >
                  <option value="">-- Select Category --</option>
                  {categories.map(c => (
                    <option key={c._id || c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-secondaryText mb-1">Base Price (BDT)</label>
                <input
                  type="number"
                  value={editForm.basePrice || ''}
                  onChange={e => setEditForm(prev => ({ ...prev, basePrice: Number(e.target.value) }))}
                  className="glass-input w-full px-3 py-2 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-secondaryText mb-1">Status</label>
                <select
                  value={editForm.status || ''}
                  onChange={e => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                  className="glass-input w-full px-3 py-2 rounded-xl text-xs"
                >
                  {['APPROVED', 'BANNED'].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setEditingPlayer(null)}
                className="btn-secondary flex-1 py-2.5 text-xs"
              >
                Cancel
              </button>
              <button
                id="save-player-edit"
                onClick={handleSaveEdit}
                disabled={saving}
                className="btn-primary flex-1 py-2.5 text-xs flex items-center justify-center gap-2"
              >
                {saving ? <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Player Confirmation Modal (SUPER_ADMIN ONLY) ─────────────── */}
      {canManage && deleteConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => !deleting && setDeleteConfirm(null)}>
          <div className="glass-card w-full max-w-sm rounded-2xl p-6 border border-urgentRed/40 space-y-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3">
              <span className="w-10 h-10 rounded-xl bg-urgentRed/15 border border-urgentRed/30 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-urgentRedText" />
              </span>
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                  Delete Player? <AlertTriangle className="w-4 h-4 text-warningGold" />
                </h3>
                <p className="text-xs text-secondaryText mt-1">
                  <strong className="text-white">{deleteConfirm.name}</strong> ({deleteConfirm.studentId || '—'}) will be
                  <strong className="text-urgentRedText"> permanently removed</strong> from the database — including team rosters, lineups and auction references.
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deleting}
                className="btn-secondary flex-1 py-2.5 text-xs"
              >
                Cancel
              </button>
              <button
                id={`confirm-delete-${deleteConfirm._id || deleteConfirm.id}`}
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black uppercase tracking-wide flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                {deleting ? (
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Podium-push style stage presentation on card click */}
      {selectedPlayer && (
        <PlayerStageModal
          player={selectedPlayer}
          teams={teams}
          categories={categories}
          formatCurrency={formatCurrency}
          onClose={() => setSelectedPlayer(null)}
        />
      )}

    </div>
  );
}
