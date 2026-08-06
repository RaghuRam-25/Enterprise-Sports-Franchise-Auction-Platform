import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Star,
  Search,
  Filter,
  Plus,
  Trash2,
  MoveUp,
  MoveDown,
  FileText,
  DollarSign,
  AlertCircle,
  Users,
  Check,
  Award,
  BookOpen,
  Tag,
  Clock,
  Sparkles
} from 'lucide-react';
import { useAuction } from '../../context/AuctionContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { playerFallback } from '../../utils/playerFallback';
import PlayerCardCard from '../../components/common/PlayerCardCard';

const getCategoryCardStyle = (category) => {
  switch (category) {
    case 'Icon Category':
      return 'border-amber-700/50 bg-amber-950/50 hover:border-amber-500/70';
    case 'A Grade':
      return 'border-blue-800/60 bg-blue-950/50 hover:border-blue-600/70';
    case 'B Grade':
      return 'border-teal-800/50 bg-teal-950/50 hover:border-teal-600/70';
    case 'Emerging Youth':
      return 'border-purple-800/50 bg-purple-950/50 hover:border-purple-600/70';
    default:
      return 'border-white/5 bg-slate-900/60 hover:border-slate-700';
  }
};

export default function TargetPlayersView() {
  const { user } = useAuth();
  const {
    players = [],
    teams = [],
    positions = [],
    categories = [],
    sessions = [],
    formatCurrency = (v) => `${v} BDT`,
    triggerToast = () => { }
  } = useAuction();

  // Target Players List State
  const [targetList, setTargetList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPosition, setSelectedPosition] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedSession, setSelectedSession] = useState('ALL');
  const [maxBasePriceFilter, setMaxBasePriceFilter] = useState('');
  const [activeTab, setActiveTab] = useState('MY_TARGETS'); // 'MY_TARGETS' | 'PLAYER_POOL'

  // Notes Modal State
  const [editingTarget, setEditingTarget] = useState(null);
  const [noteInput, setNoteInput] = useState('');
  const [budgetLimitInput, setBudgetLimitInput] = useState('');

  // Fetch Manager Target List
  const fetchTargetList = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/manager/targets');
      const raw = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setTargetList(raw);
    } catch (err) {
      triggerToast('Failed to load Target Players list', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [triggerToast]);

  useEffect(() => {
    fetchTargetList();
  }, [fetchTargetList]);

  // Set of target player IDs for fast lookup
  const targetPlayerIds = useMemo(() => {
    return new Set(targetList.map((t) => (t.playerId?._id || t.playerId?.id || t.playerId)));
  }, [targetList]);

  // Handle Add to Target List
  const handleAddTarget = async (player) => {
    const pId = player._id || player.id;
    try {
      const res = await api.post('/manager/targets', { playerId: pId });
      if (res?.data) {
        setTargetList((prev) => [...prev, res.data]);
        triggerToast(`Added ${player.name} to Target List!`, 'success');
      } else {
        fetchTargetList();
      }
    } catch (err) {
      triggerToast(err.response?.data?.message || 'Failed to add player to target list', 'error');
    }
  };

  // Handle Remove from Target List
  const handleRemoveTarget = async (targetId, playerName) => {
    try {
      await api.delete(`/manager/targets/${targetId}`);
      setTargetList((prev) =>
        prev
          .filter((t) => (t._id || t.id) !== targetId)
          .map((t, idx) => ({ ...t, priority: idx + 1 }))
      );
      triggerToast(`Removed ${playerName || 'player'} from target list.`, 'info');
    } catch (err) {
      triggerToast('Failed to remove player from target list', 'error');
    }
  };

  // Handle Priority Move Up / Down
  const handleMovePriority = async (index, direction) => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= targetList.length) return;

    const newList = [...targetList];
    const [moved] = newList.splice(index, 1);
    newList.splice(newIndex, 0, moved);

    // Update local priority numbers
    const reordered = newList.map((item, idx) => ({ ...item, priority: idx + 1 }));
    setTargetList(reordered);

    // Sync to backend
    try {
      const targetOrder = reordered.map((item) => ({
        id: item._id || item.id,
        priority: item.priority
      }));
      await api.put('/manager/targets/reorder', { targetOrder });
    } catch (err) {
      triggerToast('Failed to sync priority update to server', 'error');
      fetchTargetList();
    }
  };

  // Save Note & Budget Limit Modal Edit
  const handleSaveModalDetails = async () => {
    if (!editingTarget) return;

    const targetId = editingTarget._id || editingTarget.id;
    try {
      const res = await api.put(`/manager/targets/${targetId}`, {
        note: noteInput,
        optionalBudgetLimit: budgetLimitInput !== '' ? Number(budgetLimitInput) : null
      });

      const updatedData = res?.data || res;
      setTargetList((prev) =>
        prev.map((t) => ((t._id || t.id) === targetId ? { ...t, ...updatedData } : t))
      );

      triggerToast('Strategy note & budget limit saved!', 'success');
      setEditingTarget(null);
    } catch (err) {
      triggerToast('Failed to save details', 'error');
    }
  };

  const openEditModal = (targetItem) => {
    setEditingTarget(targetItem);
    setNoteInput(targetItem.note || '');
    setBudgetLimitInput(targetItem.optionalBudgetLimit || '');
  };

  // Filtered Players Pool
  const filteredPlayers = useMemo(() => {
    return players.filter((p) => {
      // Search
      const nameMatch =
        p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.studentId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.jerseyName?.toLowerCase().includes(searchQuery.toLowerCase());
      if (!nameMatch) return false;

      // Position filter
      if (selectedPosition !== 'ALL' && p.primaryPosition !== selectedPosition) return false;

      // Category filter
      if (selectedCategory !== 'ALL' && p.category !== selectedCategory) return false;

      // Session filter
      if (selectedSession !== 'ALL' && p.session !== selectedSession) return false;

      // Base Price filter
      if (maxBasePriceFilter && p.basePrice > Number(maxBasePriceFilter)) return false;

      return true;
    });
  }, [players, searchQuery, selectedPosition, selectedCategory, selectedSession, maxBasePriceFilter]);

  return (
    <div className="space-y-6">
      {/* Header Band */}
      <div className="relative overflow-hidden glass-card rounded-3xl p-6 sm:p-7 border border-amber-500/20 bg-gradient-to-br from-slate-900 via-slate-900/90 to-amber-950/30 shadow-2xl">
        <div className="pointer-events-none absolute -top-16 -right-10 w-72 h-72 bg-amber-500/10 blur-3xl rounded-full" />
        <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Star className="w-6 h-6 text-amber-400 fill-amber-400 animate-pulse" />
              <h1 className="text-2xl sm:text-3xl font-black font-heading text-white tracking-tight">
                Target Players
              </h1>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Your confidential auction preparation shortlist. Rank your preferred targets, set budget limits, and attach private strategy notes.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-950/70 p-1.5 rounded-2xl border border-slate-800 self-stretch sm:self-auto">
            <button
              onClick={() => setActiveTab('MY_TARGETS')}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${activeTab === 'MY_TARGETS'
                ? 'bg-amber-500 text-slate-950 shadow-lg font-black'
                : 'text-slate-400 hover:text-white'
                }`}
            >
              <Star className="w-3.5 h-3.5 fill-current" /> My Target List ({targetList.length})
            </button>
            <button
              onClick={() => setActiveTab('PLAYER_POOL')}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${activeTab === 'PLAYER_POOL'
                ? 'bg-amber-500 text-slate-950 shadow-lg font-black'
                : 'text-slate-400 hover:text-white'
                }`}
            >
              <Users className="w-3.5 h-3.5" /> Player Pool ({players.length})
            </button>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass-card rounded-2xl p-4 border border-white/5 bg-slate-900/80 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search player name, student ID..."
              className="glass-input w-full pl-9 pr-3 py-2 rounded-xl text-xs text-white"
            />
          </div>

          {/* Position Filter */}
          <div>
            <select
              value={selectedPosition}
              onChange={(e) => setSelectedPosition(e.target.value)}
              className="glass-input w-full px-3 py-2 rounded-xl text-xs text-slate-200 bg-slate-900"
            >
              <option value="ALL">All Positions</option>
              {positions.map((pos) => (
                <option key={pos.id || pos._id} value={pos.name || pos.code}>
                  {pos.name}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="glass-input w-full px-3 py-2 rounded-xl text-xs text-slate-200 bg-slate-900"
            >
              <option value="ALL">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id || cat._id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Session Filter */}
          <div>
            <select
              value={selectedSession}
              onChange={(e) => setSelectedSession(e.target.value)}
              className="glass-input w-full px-3 py-2 rounded-xl text-xs text-slate-200 bg-slate-900"
            >
              <option value="ALL">All Sessions</option>
              {sessions.map((sess) => (
                <option key={sess.id || sess._id} value={sess.name}>
                  {sess.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'MY_TARGETS' ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" /> Ranked Target Shortlist
            </h2>
            <span className="text-xs text-slate-500">
              Drag & priority controls enable ranking. Reminders auto-popup during live bidding.
            </span>
          </div>

          {isLoading ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-8 h-8 rounded-full border-2 border-slate-700 border-t-amber-400 animate-spin mx-auto" />
              <p className="text-xs text-slate-500">Loading your private Target List...</p>
            </div>
          ) : targetList.length === 0 ? (
            <div className="glass-card rounded-3xl p-12 text-center space-y-4 border border-white/5">
              <Sparkles className="w-12 h-12 text-amber-400/50 mx-auto" />
              <h3 className="text-lg font-extrabold text-white">Your Target List is Empty</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                No target players added yet. Switch to the <strong>Player Pool</strong> tab to browse and add high-priority targets.
              </p>
              <button
                onClick={() => setActiveTab('PLAYER_POOL')}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition shadow-lg inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Browse Player Pool
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {targetList.map((target, idx) => {
                const player = target.playerId || {};
                const pId = player._id || player.id;
                const isSold = player.status === 'SOLD';
                const soldToTeam = isSold ? teams.find(t => (t._id || t.id) === player.soldToTeam) : null;
                if (!pId) return null;

                return (
                  <div
                    key={target._id || target.id}
                    className="glass-card rounded-2xl p-4 sm:p-5 border border-white/5 bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 hover:border-amber-500/30 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl"
                  >
                    {/* Left: Priority Badge & Player Identity */}
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="flex flex-col items-center justify-center gap-1 flex-shrink-0">
                        <span className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 font-black font-mono text-sm flex items-center justify-center shadow-inner">
                          #{target.priority}
                        </span>
                        <div className="flex flex-col gap-0.5">
                          <button
                            onClick={() => handleMovePriority(idx, 'up')}
                            disabled={idx === 0}
                            className="p-1 text-slate-500 hover:text-amber-400 disabled:opacity-30 disabled:cursor-not-allowed transition"
                            title="Move Priority Up"
                          >
                            <MoveUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleMovePriority(idx, 'down')}
                            disabled={idx === targetList.length - 1}
                            className="p-1 text-slate-500 hover:text-amber-400 disabled:opacity-30 disabled:cursor-not-allowed transition"
                            title="Move Priority Down"
                          >
                            <MoveDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <img
                        src={player.imageUrl || playerFallback('amber')}
                        alt={player.name}
                        className="w-14 h-14 rounded-2xl object-cover border-2 border-emerald-500/30 shadow-lg flex-shrink-0"
                      />

                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-extrabold text-white truncate">{player.name}</h3>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {player.category || 'Category'}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-300 flex-wrap">
                          <span>Pos: <strong className="text-white">{player.primaryPosition}</strong></span>
                          {isSold ? (
                            <>
                              <span className="text-slate-500">&bull;</span>
                              <span className="font-mono text-amber-400">Sold: {formatCurrency(player.finalPrice || player.soldPrice || 0)}</span>
                              <span className="text-slate-500">&bull;</span>
                              <span className="text-slate-400">To: <strong className="text-white">{soldToTeam?.name || 'N/A'}</strong></span>
                            </>
                          ) : (
                            <>
                              <span className="text-slate-500">&bull;</span><span className="font-mono text-emerald-400">Base: {formatCurrency(player.basePrice)}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Middle: Notes & Budget Cap Badges */}
                    <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                      {target.optionalBudgetLimit ? (
                        <span className="px-3 py-1.5 rounded-xl bg-slate-950 border border-amber-500/30 text-amber-300 font-mono text-xs font-bold flex items-center gap-1.5">
                          <DollarSign className="w-3.5 h-3.5 text-amber-400" />
                          Cap: {formatCurrency(target.optionalBudgetLimit)}
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-500 italic">No budget cap</span>
                      )}

                      {target.note ? (
                        <span className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 text-xs italic truncate max-w-xs flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                          "{target.note}"
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-500 italic">No note</span>
                      )}
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0 self-end md:self-center">
                      <button
                        onClick={() => openEditModal(target)}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition flex items-center gap-1.5"
                      >
                        <FileText className="w-3.5 h-3.5 text-amber-400" /> Edit Strategy
                      </button>

                      <button
                        onClick={() => handleRemoveTarget(target._id || target.id, player.name)}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30 transition"
                        title="Remove Target"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* PLAYER POOL TAB */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" /> Available Player Pool ({filteredPlayers.length})
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredPlayers.map((player) => {
              const pId = player._id || player.id;
              const isTargeted = targetPlayerIds.has(pId);
              return (
                <PlayerCardCard
                  key={pId}
                  player={player}
                  formatCurrency={formatCurrency}
                  teams={teams}
                  customActions={
                    isTargeted ? (
                      <button
                        onClick={() => handleRemoveTarget(pId, player.name)}
                        className="px-2.5 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-500/40 transition"
                      >
                        <Check className="w-3.5 h-3.5 text-amber-400" /> Targeted
                      </button>
                    ) : (
                      <button
                        onClick={() => handleAddTarget(player)}
                        disabled={player.status === 'SOLD'}
                        className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition shadow"
                      >
                        <Plus className="w-3.5 h-3.5" /> Target
                      </button>
                    )
                  }
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Strategy Note & Budget Cap Edit Modal */}
      {editingTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full rounded-3xl p-6 border border-amber-500/30 bg-slate-900 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                <h3 className="text-base font-extrabold text-white">Target Strategy Config</h3>
              </div>
              <button
                onClick={() => setEditingTarget(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Private Strategy Note
                </label>
                <textarea
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  placeholder='e.g., "Highest priority", "Only bid under 120", "Backup option"'
                  rows={3}
                  className="glass-input w-full p-3 rounded-xl text-white text-xs"
                  maxLength={500}
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Planned Maximum Budget Cap (BDT)
                </label>
                <input
                  type="number"
                  value={budgetLimitInput}
                  onChange={(e) => setBudgetLimitInput(e.target.value)}
                  placeholder="e.g., 15000000"
                  className="glass-input w-full px-3 py-2.5 rounded-xl font-mono text-white text-xs"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Optional reminder limit displayed during live auction bidding.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setEditingTarget(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:text-white text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveModalDetails}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider transition shadow-lg"
              >
                Save Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
