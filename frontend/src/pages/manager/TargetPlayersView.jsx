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
import { useSocket } from '../../context/SocketContext';
import api from '../../services/api';
import { playerFallback } from '../../utils/playerFallback';
import PlayerCardCard from '../../components/common/PlayerCardCard';
import PlayerStageModal from '../../components/common/PlayerStageModal';

const getCategoryCardStyle = (category) => {
  switch (category) {
    case 'Icon Category':
      return 'border-warningGold/50 bg-warningGold/50 hover:border-warningGold/70';
    case 'A Grade':
      return 'border-successGreen/60 bg-successGreen/50 hover:border-successGreen/70';
    case 'B Grade':
      return 'border-successGreen/50 bg-successGreen/50 hover:border-successGreen/70';
    case 'Emerging Youth':
      return 'border-warningGold/50 bg-warningGold/50 hover:border-warningGold/70';
    default:
      return 'border-white/5 bg-cardBg/60 hover:border-borderStrong';
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

  // Stage presentation modal on card click
  const [selectedPlayer, setSelectedPlayer] = useState(null);

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
      // Safety net: sold players are auto-removed server-side; filter any stragglers.
      setTargetList(raw.filter(t => t?.playerId?.status !== 'SOLD'));
    } catch (err) {
      triggerToast('Failed to load Target Players list', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [triggerToast]);

  useEffect(() => {
    fetchTargetList();
  }, [fetchTargetList]);

  // Live removal: the moment a targeted player is sold in the auction, drop them
  // from the list without waiting for a refetch.
  const { socket } = useSocket();
  useEffect(() => {
    if (!socket) return;
    const handlePlayerSold = (payload) => {
      const pid = String(payload?._id || payload?.id || '');
      if (!pid) return;
      setTargetList(prev => prev.filter(t => {
        const tid = String(t.playerId?._id || t.playerId?.id || t.playerId || '');
        return tid !== pid;
      }));
    };
    socket.on('player:updated', handlePlayerSold);
    return () => socket.off('player:updated', handlePlayerSold);
  }, [socket]);

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
      // Exclude players who are not available for targeting (sold, banned, or withdrawn)
      const playerStatus = p.status?.toUpperCase();
      if (playerStatus === 'SOLD' || playerStatus === 'BANNED' || playerStatus === 'WITHDRAWN') {
        return false;
      }

      // Hide players already added to the target list
      if (targetPlayerIds.has(p._id || p.id)) return false;

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
  }, [players, targetPlayerIds, searchQuery, selectedPosition, selectedCategory, selectedSession, maxBasePriceFilter]);

  return (
    <div className="space-y-6">
      {/* Header Band */}
      <div className="relative overflow-hidden glass-card rounded-3xl p-6 sm:p-7 border border-warningGold/20 bg-gradient-to-br from-cardBg via-cardBg/90 to-warningGold/30 shadow-2xl">
        <div className="pointer-events-none absolute -top-16 -right-10 w-72 h-72 bg-warningGold/10 blur-3xl rounded-full" />
        <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Star className="w-6 h-6 text-warningGold fill-warningGold animate-pulse" />
              <h1 className="text-2xl sm:text-3xl font-black font-heading text-white tracking-tight">
                Target Players
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-darkBg/70 p-1.5 rounded-2xl border border-cardBorder self-stretch sm:self-auto">
            <button
              onClick={() => setActiveTab('MY_TARGETS')}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${activeTab === 'MY_TARGETS'
                ? 'bg-warningGold text-darkBg shadow-lg font-black border border-warningGold'
                : 'bg-[#151515] text-[#F5F5F5] border border-[#333333] hover:border-[#F4C542] hover:text-[#F4C542]'
                }`}
            >
              <Star className="w-3.5 h-3.5 fill-current" /> My Target List ({targetList.length})
            </button>
            <button
              onClick={() => setActiveTab('PLAYER_POOL')}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${activeTab === 'PLAYER_POOL'
                ? 'bg-warningGold text-darkBg shadow-lg font-black border border-warningGold'
                : 'bg-[#151515] text-[#F5F5F5] border border-[#333333] hover:border-[#F4C542] hover:text-[#F4C542]'
                }`}
            >
              <Users className="w-3.5 h-3.5" /> Player Pool ({filteredPlayers.length})
            </button>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass-card rounded-2xl p-4 border border-white/5 bg-cardBg/80 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 text-secondaryText absolute left-3 top-3" />
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
              className="glass-input w-full px-3 py-2 rounded-xl text-xs text-primaryText bg-cardBg"
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
              className="glass-input w-full px-3 py-2 rounded-xl text-xs text-primaryText bg-cardBg"
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
              className="glass-input w-full px-3 py-2 rounded-xl text-xs text-primaryText bg-cardBg"
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
            <h2 className="text-sm font-bold uppercase tracking-wider text-secondaryText flex items-center gap-2">
              <Star className="w-4 h-4 text-warningGold fill-warningGold" /> Ranked Target Shortlist
            </h2>
          </div>

          {isLoading ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-8 h-8 rounded-full border-2 border-borderStrong border-t-warningGold animate-spin mx-auto" />
              <p className="text-xs text-mutedText">Loading your private Target List...</p>
            </div>
          ) : targetList.length === 0 ? (
            <div className="glass-card rounded-3xl p-12 text-center space-y-4 border border-white/5">
              <Sparkles className="w-12 h-12 text-warningGold/50 mx-auto" />
              <h3 className="text-lg font-extrabold text-white">Your Target List is Empty</h3>
              <p className="text-xs text-secondaryText max-w-md mx-auto">
                No target players added yet. Switch to the <strong>Player Pool</strong> tab to browse and add high-priority targets.
              </p>
              <button
                onClick={() => setActiveTab('PLAYER_POOL')}
                className="px-5 py-2.5 bg-warningGold hover:bg-warningGold text-darkBg font-black text-xs uppercase tracking-wider rounded-xl transition shadow-lg inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Browse Player Pool
              </button>
            </div>
          ) : (
            /* Card Grid — matches PublicPlayersView layout */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 auto-rows-fr">
              {targetList.map((target, idx) => {
                const player = target.playerId || {};
                const pId = player._id || player.id;
                if (!pId) return null;

                return (
                  <div key={target._id || target.id} className="relative h-full">
                    {/* Priority Badge — floats over the top-left corner of the card */}
                    <div className="absolute -top-2.5 -left-2.5 z-20 flex items-center gap-1">
                      <span className="w-8 h-8 rounded-xl bg-warningGold text-darkBg font-black font-mono text-xs flex items-center justify-center shadow-lg border-2 border-cardBorder">
                        #{target.priority ?? idx + 1}
                      </span>
                    </div>

                    <PlayerCardCard
                      player={player}
                      formatCurrency={formatCurrency}
                      teams={teams}
                      categories={categories}
                      onCardClick={() => setSelectedPlayer(player)}
                      customActions={
                        <div className="w-full space-y-2">
                          {/* Note & Budget Cap badges */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            {target.optionalBudgetLimit ? (
                              <span className="px-2 py-1 rounded-lg bg-darkBg border border-warningGold/30 text-warningGold font-mono text-[10px] font-bold flex items-center gap-1">
                                <DollarSign className="w-3 h-3 text-warningGold" />
                                {formatCurrency(target.optionalBudgetLimit)}
                              </span>
                            ) : (
                              <span className="text-[10px] text-mutedText italic">No budget cap</span>
                            )}
                          </div>
                          {target.note && (
                            <p className="text-[10px] text-secondaryText italic truncate flex items-center gap-1">
                              <FileText className="w-3 h-3 text-warningGold flex-shrink-0" />
                              "{target.note}"
                            </p>
                          )}

                          {/* Priority + Edit + Remove Controls */}
                          <div className="flex items-center gap-1.5 pt-1">
                            <button
                              onClick={() => handleMovePriority(idx, 'up')}
                              disabled={idx === 0}
                              className="btn-secondary p-1.5 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Move Priority Up"
                            >
                              <MoveUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleMovePriority(idx, 'down')}
                              disabled={idx === targetList.length - 1}
                              className="btn-secondary p-1.5 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Move Priority Down"
                            >
                              <MoveDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => openEditModal(target)}
                              className="btn-secondary flex-1 px-2 py-1.5 rounded-lg text-[10px] flex items-center justify-center gap-1"
                            >
                              <FileText className="w-3 h-3 text-warningGold" /> Edit
                            </button>
                            <button
                              onClick={() => handleRemoveTarget(target._id || target.id, player.name)}
                              className="btn-danger p-1.5 rounded-lg"
                              title="Remove Target"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      }
                    />
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
            <h2 className="text-sm font-bold uppercase tracking-wider text-secondaryText flex items-center gap-2">
              <Users className="w-4 h-4 text-neonGreen" /> Available Player Pool ({filteredPlayers.length})
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-fr">
            {filteredPlayers.map((player) => {
              const pId = player._id || player.id;
              const isTargeted = targetPlayerIds.has(pId);
              return (
                <PlayerCardCard
                  key={pId}
                  player={player}
                  formatCurrency={formatCurrency}
                  teams={teams}
                  categories={categories}
                  onCardClick={() => setSelectedPlayer(player)}
                  customActions={
                    isTargeted ? (
                      <button
                        onClick={() => handleRemoveTarget(pId, player.name)}
                        className="px-2.5 py-1 bg-warningGold/20 text-warningGold border border-warningGold/40 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-urgentRed/20 hover:text-urgentRedText hover:border-urgentRed/40 transition"
                      >
                        <Check className="w-3.5 h-3.5 text-warningGold" /> Targeted
                      </button>
                    ) : (
                      <button
                        onClick={() => handleAddTarget(player)}
                        disabled={player.status === 'SOLD'}
                        className="px-2.5 py-1 bg-successGreen hover:bg-neonGreen disabled:opacity-50 text-darkBg rounded-lg text-xs font-bold flex items-center gap-1 transition shadow"
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
          <div className="glass-card max-w-md w-full rounded-3xl p-6 border border-warningGold/30 bg-cardBg shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-cardBorder pb-3">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-warningGold fill-warningGold" />
                <h3 className="text-base font-extrabold text-white">Target Strategy Config</h3>
              </div>
              <button
                onClick={() => setEditingTarget(null)}
                className="btn-secondary w-8 h-8 rounded-lg flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-secondaryText font-bold mb-1">
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
                <label className="block text-secondaryText font-bold mb-1">
                  Planned Maximum Budget Cap (BDT)
                </label>
                <input
                  type="number"
                  value={budgetLimitInput}
                  onChange={(e) => setBudgetLimitInput(e.target.value)}
                  placeholder="e.g., 15000000"
                  className="glass-input w-full px-3 py-2.5 rounded-xl font-mono text-white text-xs"
                />
                <span className="text-[10px] text-mutedText mt-1 block">
                  Optional reminder limit displayed during live auction bidding.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setEditingTarget(null)}
                className="btn-secondary flex-1 py-2.5 rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveModalDetails}
                className="btn-primary flex-1 py-2.5 rounded-xl text-xs uppercase tracking-wider shadow-lg"
              >
                Save Details
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