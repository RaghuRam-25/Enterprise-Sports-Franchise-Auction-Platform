import  { useState } from 'react';
import {  useParams } from 'react-router-dom';
import {  Plus, Trash2, Calculator, PenLine, X, Save, Medal, Diamond, Coins, Sparkle, BadgeCheck, StarHalf, CircleDollarSign, Banknote, Pentagon, Hexagon, Octagon, Triangle, Square, CircleDot, Circle } from 'lucide-react';
import { useAuction } from '../../context/AuctionContext';

/* Tier/rank-flavoured category icons (Diamond/Gold-style) — deliberately a
   different set from the Team icons so the two never collide. */
const CATEGORY_ICON_OPTIONS = [
  { name: 'Diamond', Icon: Diamond },
  { name: 'Medal', Icon: Medal },
  { name: 'Coins', Icon: Coins },
  { name: 'Sparkle', Icon: Sparkle },
  { name: 'Badge Check', Icon: BadgeCheck },
  { name: 'Half Star', Icon: StarHalf },
  { name: 'Dollar', Icon: CircleDollarSign },
  { name: 'Banknote', Icon: Banknote },
  { name: 'Pentagon', Icon: Pentagon },
  { name: 'Hexagon', Icon: Hexagon },
  { name: 'Octagon', Icon: Octagon },
  { name: 'Triangle', Icon: Triangle },
  { name: 'Square', Icon: Square },
  { name: 'Circle Dot', Icon: CircleDot },
  { name: 'Circle', Icon: Circle },
];

export default function AdminConfigurations() {
  const { subtab } = useParams();
  const activeTab = subtab || 'sessions';
  

  const {
    sessions,
    addSession,
    deleteSession,
    positions,
    addPosition,
    deletePosition,
    categories,
    addCategory,
    updateCategory,
    deleteCategory,
    biddingTiers,
    updateBiddingTier,
    formatCurrency,
    calculateNextBidAmount,
    triggerToast
  } = useAuction();

  // Form states
  const [newSessionName, setNewSessionName] = useState('');
  const [newPosCode, setNewPosCode] = useState('');
  const [newPosName, setNewPosName] = useState('');
  
  const [newCatName, setNewCatName] = useState('');
  const [newCatPriority, setNewCatPriority] = useState(1);
  const [newCatBasePrice, setNewCatBasePrice] = useState('');
  const [newCatColor, setNewCatColor] = useState('#3b82f6');
  const [newCatIcon, setNewCatIcon] = useState('Medal');
  const [catIconMenuOpen, setCatIconMenuOpen] = useState(false);
  const [editCatIconMenuOpen, setEditCatIconMenuOpen] = useState(false);

  // Edit Category modal state (same pattern as player edit)
  const [editingCat, setEditingCat] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  // Interactive Test Calculator state
  const [testPurse, setTestPurse] = useState(100000000);
  const [testCurrentBid, setTestCurrentBid] = useState(2500000);

  const handleAddSession = (e) => {
    e.preventDefault();
    if (!newSessionName.trim()) return;
    addSession({ name: newSessionName, isDefault: false });
    setNewSessionName('');
    triggerToast(`Added session: ${newSessionName}`, 'success');
  };

  const handleAddPosition = (e) => {
    e.preventDefault();
    if (!newPosCode.trim() || !newPosName.trim()) return;
    addPosition({ code: newPosCode.toUpperCase(), name: newPosName });
    setNewPosCode('');
    setNewPosName('');
    triggerToast(`Added position: ${newPosCode.toUpperCase()}`, 'success');
  };

  const handleAddCategory = (e) => {
    e.preventDefault();
    if (!newCatName.trim() || !newCatBasePrice) return;
    addCategory({
      name: newCatName,
      priority: Number(newCatPriority),
      basePrice: Number(newCatBasePrice),
      color: newCatColor,
      icon: newCatIcon
    });
    setNewCatName('');
    setNewCatBasePrice('');
    setNewCatColor('#3b82f6');
    setNewCatIcon('Medal');
    triggerToast(`Added category: ${newCatName}`, 'success');
  };

  const openEditCategory = (c) => {
    setEditingCat(c);
    setEditForm({
      name: c.name || '',
      priorityLevel: c.priority || c.priorityLevel || 1,
      basePrice: c.basePrice || 0,
      color: (c.color || '#3b82f6').toLowerCase(),
      icon: c.icon || 'Medal'
    });
    setEditCatIconMenuOpen(false);
  };

  const handleSaveCategoryEdit = async () => {
    if (!editingCat) return;
    if (!editForm.name?.trim() || !editForm.basePrice) {
      triggerToast('Name and Base Price are required', 'error');
      return;
    }
    setSaving(true);
    await updateCategory(editingCat.id, {
      name: editForm.name.trim(),
      priorityLevel: Number(editForm.priorityLevel),
      basePrice: Number(editForm.basePrice),
      color: editForm.color,
      icon: editForm.icon || 'Medal'
    });
    setSaving(false);
    setEditingCat(null);
  };

  return (
    <div className="space-y-6">
      {/* Tab Content */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800">
        {/* 1. Academic Sessions Tab */}
        {activeTab === 'sessions' && (
          <div className="space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
              Manage Sessions/Batches
            </h3>
            <form onSubmit={handleAddSession} className="flex gap-3 max-w-md">
              <input
                type="text"
                placeholder="e.g. 24-25 Academic Session"
                value={newSessionName}
                onChange={e => setNewSessionName(e.target.value)}
                className="glass-input rounded-xl px-4 py-2 text-xs flex-1"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center gap-1 shadow-md"
              >
                <Plus className="w-4 h-4" /> Add Session
              </button>
            </form>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-4">
              {sessions.map(s => (
                <div key={s.id} className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="font-bold text-sm text-white">{s.name}</p>
                    <p className="text-[11px] text-slate-400">{s.isDefault ? 'Default Active Session' : 'Active Batch'}</p>
                  </div>
                  <button
                    onClick={() => {
                      deleteSession(s.id);
                      triggerToast(`Deleted session ${s.name}`, 'info');
                    }}
                    className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2. Sports Positions Tab */}
        {activeTab === 'positions' && (
          <div className="space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
              Manage Sports Positions (CRUD)
            </h3>

            <form onSubmit={handleAddPosition} className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg">
              <input
                type="text"
                placeholder="Code (e.g. ST)"
                value={newPosCode}
                onChange={e => setNewPosCode(e.target.value)}
                className="glass-input rounded-xl px-4 py-2 text-xs"
              />
              <input
                type="text"
                placeholder="Name (e.g. Striker)"
                value={newPosName}
                onChange={e => setNewPosName(e.target.value)}
                className="glass-input rounded-xl px-4 py-2 text-xs"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1 shadow-md"
              >
                <Plus className="w-4 h-4" /> Add Position
              </button>
            </form>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-4">
              {positions.map(p => (
                <div key={p.id} className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      {p.code}
                    </span>
                    <p className="font-bold text-sm text-white mt-1">{p.name}</p>
                  </div>
                  <button
                    onClick={() => {
                      deletePosition(p.id);
                      triggerToast(`Deleted position ${p.code}`, 'info');
                    }}
                    className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. Player Categories Tab */}
        {activeTab === 'categories' && (
          <div className="space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
              Player Categories, Priority Levels & Base Prices
            </h3>

            <form onSubmit={handleAddCategory} className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-6 gap-3 max-w-4xl">
              <input
                type="text"
                placeholder="Category Name"
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                className="glass-input rounded-xl px-4 py-2 text-xs"
              />
              <input
                type="number"
                placeholder="Priority (1-5)"
                min="1"
                max="5"
                value={newCatPriority}
                onChange={e => setNewCatPriority(e.target.value)}
                className="glass-input rounded-xl px-4 py-2 text-xs"
              />
              <input
                type="number"
                placeholder="Base Price (BDT)"
                value={newCatBasePrice}
                onChange={e => setNewCatBasePrice(e.target.value)}
                className="glass-input rounded-xl px-4 py-2 text-xs"
              />
              <label className="glass-input rounded-xl px-4 py-2 text-xs flex items-center justify-between gap-2 cursor-pointer hover:border-slate-600 transition">
                <span className="text-slate-400 font-semibold whitespace-nowrap">Color</span>
                <input
                  type="color"
                  value={newCatColor}
                  onChange={e => setNewCatColor(e.target.value)}
                  className="w-8 h-6 rounded cursor-pointer bg-transparent border-0 p-0"
                  title={`Selected: ${newCatColor}`}
                />
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setCatIconMenuOpen(prev => !prev)}
                  className="glass-input w-full rounded-xl px-4 py-2 text-xs flex items-center justify-between gap-2 hover:border-slate-600 transition"
                  title={`Icon: ${newCatIcon}`}
                >
                  <span className="text-slate-400 font-semibold whitespace-nowrap">Icon</span>
                  <span className="flex items-center gap-1.5 text-slate-200 font-semibold">
                    {(() => {
                      const Selected = (CATEGORY_ICON_OPTIONS.find(o => o.name === newCatIcon) || CATEGORY_ICON_OPTIONS[0]).Icon;
                      return <Selected className="w-4 h-4" />;
                    })()}
                    {newCatIcon}
                  </span>
                </button>
                {catIconMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setCatIconMenuOpen(false)} />
                    <div className="absolute z-30 top-full mt-1 left-0 bg-slate-950 border border-slate-700 rounded-xl p-2 shadow-2xl flex flex-col gap-1 max-h-[280px] overflow-y-auto custom-scrollbar">
                      {CATEGORY_ICON_OPTIONS.map(({ name: iconName, Icon }) => (
                        <button
                          key={iconName}
                          type="button"
                          onClick={() => { setNewCatIcon(iconName); setCatIconMenuOpen(false); }}
                          title={iconName}
                          className={`h-8 px-2 rounded-md flex items-center gap-2 text-[11px] font-semibold whitespace-nowrap transition ${newCatIcon === iconName ? 'bg-amber-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                        >
                          <Icon className="w-4 h-4" />
                          {iconName}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1 shadow-md"
              >
                <Plus className="w-4 h-4" /> Add Category
              </button>
            </form>

            <div className="overflow-x-auto pt-2">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/80 text-slate-400 uppercase font-bold text-[11px] border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Priority</th>
                    <th className="py-3 px-4">Category Name</th>
                    <th className="py-3 px-4">Color</th>
                    <th className="py-3 px-4">Base Price</th>
                    <th className="py-3 px-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {categories.map(c => {
                    const CatIcon = (CATEGORY_ICON_OPTIONS.find(o => o.name === c.icon) || CATEGORY_ICON_OPTIONS.find(o => o.name === 'Medal')).Icon;
                    return (
                    <tr key={c.id} className="hover:bg-slate-800/30">
                      <td className="py-3 px-4 font-bold text-amber-400">Level {c.priority || c.priorityLevel}</td>
                      <td className="py-3 px-4 font-extrabold text-white">
                        <span className="flex items-center gap-2">
                          <CatIcon className="w-4 h-4 text-amber-400" />
                          {c.name}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-6 h-6 rounded-lg border border-slate-600 shadow-inner shrink-0"
                            style={{ backgroundColor: c.color || '#3b82f6' }}
                          />
                          <span className="font-mono text-[11px] text-slate-400 uppercase">{(c.color || '#3b82f6').toUpperCase()}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-emerald-400">{formatCurrency(c.basePrice)}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditCategory(c)}
                            className="p-1.5 text-slate-400 hover:text-sky-400 hover:bg-sky-500/10 rounded-lg transition"
                            title={`Edit ${c.name}`}
                          >
                            <PenLine className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              deleteCategory(c.id);
                              triggerToast(`Deleted category ${c.name}`, 'info');
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                     </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 4. Dynamic Bidding Tiers Tab */}
        {activeTab === 'bidding-tiers' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
                Percentage-Based Dynamic Raise Logic (PRD Section 2.A)
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Configure raise percentage bounds of team budget (e.g. 0-3% = 0.15% raise).
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Tiers List */}
              <div className="space-y-3">
                {biddingTiers.length === 0 && (
                  <div className="bg-slate-900/60 border border-dashed border-slate-700 p-6 rounded-xl text-center space-y-2">
                    <Calculator className="w-8 h-8 mx-auto text-slate-600" />
                    <p className="text-sm font-bold text-slate-300">No Bidding Tiers configured yet</p>
                    <p className="text-xs text-slate-500 max-w-xs mx-auto">
                      Run <code className="text-emerald-400 font-mono">npm run seed</code> in the backend to load the default 4 tiers, or check the database.
                    </p>
                  </div>
                )}
                {biddingTiers.map((tier, idx) => (
                  <div key={tier.id} className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-purple-400 uppercase">Tier #{idx + 1}</span>
                      <span className="text-[11px] text-slate-400">
                        {tier.minPercent}% to {tier.maxPercent}% of Total Purse
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <label className="text-xs text-slate-400">Raise Percent:</label>
                      <input
                        type="number"
                        step="0.05"
                        value={tier.raisePercent}
                        onChange={(e) => updateBiddingTier(tier.id, { raisePercent: parseFloat(e.target.value) || 0 })}
                        className="glass-input w-24 px-3 py-1 rounded-lg text-xs font-mono font-bold text-emerald-400"
                      />
                      <span className="text-xs font-mono text-slate-300">%</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Dynamic Monetary Value Calculator Preview */}
              <div className="bg-slate-950/80 border border-purple-500/30 rounded-2xl p-5 space-y-4 shadow-xl">
                <div className="flex items-center gap-2 text-purple-400 font-bold text-xs uppercase tracking-wider">
                  <Calculator className="w-4 h-4" /> Live Raise Monetary Calculator
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-400 mb-1">Franchise Purse Total:</label>
                    <input
                      type="number"
                      value={testPurse}
                      onChange={e => setTestPurse(Number(e.target.value))}
                      className="glass-input w-full px-3 py-2 rounded-xl font-mono text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Current Player Bid Price:</label>
                    <input
                      type="number"
                      value={testCurrentBid}
                      onChange={e => setTestCurrentBid(Number(e.target.value))}
                      className="glass-input w-full px-3 py-2 rounded-xl font-mono text-white"
                    />
                  </div>

                  <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl space-y-2">
                    <p className="text-[11px] text-purple-300 uppercase font-semibold">Calculated Next Exact Raise:</p>
                    <p className="text-xl font-black font-mono text-emerald-400">
                      {formatCurrency(calculateNextBidAmount(testCurrentBid, testPurse))}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Minimum Raise Amount: +{formatCurrency(calculateNextBidAmount(testCurrentBid, testPurse) - testCurrentBid)}
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>

      {/* ── Edit Category Modal (same pattern as player edit) ─────────────────── */}
      {editingCat && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-md rounded-2xl p-6 border border-slate-700 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-black text-white">Edit Category</h2>
                <p className="text-xs text-slate-400">Level {editForm.priorityLevel} · {formatCurrency(Number(editForm.basePrice) || 0)}</p>
              </div>
              <button
                onClick={() => setEditingCat(null)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Category Name</label>
                <input
                  type="text"
                  value={editForm.name || ''}
                  onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  className="glass-input w-full px-3 py-2 rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Priority Level (1-5)</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={editForm.priorityLevel || ''}
                    onChange={e => setEditForm(prev => ({ ...prev, priorityLevel: e.target.value }))}
                    className="glass-input w-full px-3 py-2 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Base Price (BDT)</label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.basePrice || ''}
                    onChange={e => setEditForm(prev => ({ ...prev, basePrice: e.target.value }))}
                    className="glass-input w-full px-3 py-2 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={/^#[0-9a-fA-F]{6}$/.test(editForm.color || '') ? editForm.color : '#3b82f6'}
                    onChange={e => setEditForm(prev => ({ ...prev, color: e.target.value }))}
                    className="w-14 h-9 rounded-xl cursor-pointer bg-transparent border border-slate-700 p-1"
                  />
                  <span
                    className="w-8 h-8 rounded-lg border border-slate-600 shrink-0"
                    style={{ backgroundColor: /^#[0-9a-fA-F]{6}$/.test(editForm.color || '') ? editForm.color : '#3b82f6' }}
                  />
                  <span className="font-mono text-[11px] text-slate-400 uppercase">{(editForm.color || '#3b82f6').toUpperCase()}</span>
                </div>
              </div>

              <div className="relative">
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Icon</label>
                <button
                  type="button"
                  onClick={() => setEditCatIconMenuOpen(prev => !prev)}
                  className="w-full h-[36px] flex items-center justify-between gap-2 bg-slate-900/60 border border-slate-800 hover:border-slate-600 rounded-xl px-3 transition"
                  title={`Icon: ${editForm.icon || 'Medal'}`}
                >
                  <span className="flex items-center gap-2 text-xs text-slate-200 font-semibold">
                    {(() => {
                      const Selected = (CATEGORY_ICON_OPTIONS.find(o => o.name === (editForm.icon || 'Medal')) || CATEGORY_ICON_OPTIONS[0]).Icon;
                      return <Selected className="w-4 h-4" />;
                    })()}
                    {editForm.icon || 'Medal'}
                  </span>
                </button>
                {editCatIconMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setEditCatIconMenuOpen(false)} />
                    <div className="absolute z-30 top-full mt-1 left-0 right-0 bg-slate-950 border border-slate-700 rounded-xl p-2 shadow-2xl flex flex-col gap-1 max-h-[280px] overflow-y-auto custom-scrollbar">
                      {CATEGORY_ICON_OPTIONS.map(({ name: iconName, Icon }) => (
                        <button
                          key={iconName}
                          type="button"
                          onClick={() => { setEditForm(prev => ({ ...prev, icon: iconName })); setEditCatIconMenuOpen(false); }}
                          title={iconName}
                          className={`h-8 px-2 rounded-md flex items-center gap-2 text-[11px] font-semibold whitespace-nowrap transition ${(editForm.icon || 'Medal') === iconName ? 'bg-amber-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                        >
                          <Icon className="w-4 h-4" />
                          {iconName}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setEditingCat(null)}
                className="flex-1 py-2.5 border border-slate-700 text-slate-300 hover:bg-slate-800 rounded-xl text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCategoryEdit}
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
