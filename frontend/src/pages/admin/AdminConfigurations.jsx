import  { useState } from 'react';
import {  useParams } from 'react-router-dom';
import {  Plus, Trash2, Calculator, PenLine, X, Save, Medal, Diamond, Coins, Sparkle, BadgeCheck, StarHalf, CircleDollarSign, Banknote, Pentagon, Hexagon, Octagon, Triangle, Square, CircleDot, Circle } from 'lucide-react';
import { useAuction } from '../../context/AuctionContext';
import { POSITION_ICON_OPTIONS, POSITION_ICON_MAP, getPositionIcon } from '../../utils/positionIcons';

/* Standard football position codes — pick from dropdown instead of typing. */
const STANDARD_POSITION_CODES = [
  { code: 'GK', name: 'Goalkeeper' },
  { code: 'CB', name: 'Centre Back' },
  { code: 'LB', name: 'Left Back' },
  { code: 'RB', name: 'Right Back' },
  { code: 'LWB', name: 'Left Wing Back' },
  { code: 'RWB', name: 'Right Wing Back' },
  { code: 'CDM', name: 'Defensive Midfielder' },
  { code: 'CM', name: 'Central Midfielder' },
  { code: 'CAM', name: 'Attacking Midfielder' },
  { code: 'LM', name: 'Left Midfielder' },
  { code: 'RM', name: 'Right Midfielder' },
  { code: 'LW', name: 'Left Winger' },
  { code: 'RW', name: 'Right Winger' },
  { code: 'CF', name: 'Centre Forward' },
  { code: 'ST', name: 'Striker' },
];

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
  const [newPosIcon, setNewPosIcon] = useState('');
  const [posIconMenuOpen, setPosIconMenuOpen] = useState(false);
  
  const [newCatName, setNewCatName] = useState('');
  const [newCatPriority, setNewCatPriority] = useState(1);
  const [newCatBasePrice, setNewCatBasePrice] = useState('');
  const [newCatColor, setNewCatColor] = useState('#0B2B26');
  const [newCatIcon, setNewCatIcon] = useState('Medal');
  const [newCatHidePrice, setNewCatHidePrice] = useState(false);
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
    if (positions.some(p => (p.code || '').toUpperCase() === newPosCode.toUpperCase())) {
      triggerToast(`Position "${newPosCode.toUpperCase()}" already exists.`, 'warning');
      return;
    }
    addPosition({ code: newPosCode.toUpperCase(), name: newPosName, icon: newPosIcon });
    setNewPosCode('');
    setNewPosName('');
    setNewPosIcon('');
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
    setNewCatColor('#0B2B26');
    setNewCatIcon('Medal');
    triggerToast(`Added category: ${newCatName}`, 'success');
  };

  const openEditCategory = (c) => {
    setEditingCat(c);
    setEditForm({
      name: c.name || '',
      priorityLevel: c.priority || c.priorityLevel || 1,
      basePrice: c.basePrice || 0,
      color: (c.color || '#0B2B26').toLowerCase(),
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
      <div className="glass-card rounded-2xl p-6 border border-cardBorder">
        {/* 1. Academic Sessions Tab */}
        {activeTab === 'sessions' && (
          <div className="space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-secondaryText">
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
                className="btn-primary"
              >
                <Plus className="w-4 h-4" /> Add Session
              </button>
            </form>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-4">
              {sessions.map(s => (
                <div key={s.id} className="bg-cardBg/60 border border-cardBorder p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="font-bold text-sm text-white">{s.name}</p>
                    <p className="text-[11px] text-secondaryText">{s.isDefault ? 'Default Active Session' : 'Active Batch'}</p>
                  </div>
                  <button
                    onClick={() => {
                      deleteSession(s.id);
                      triggerToast(`Deleted session ${s.name}`, 'info');
                    }}
                    className="btn-secondary p-2 text-rose-400 hover:text-rose-300 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2. Sports Positions Tab — dark + neon-lime football card grid */}
        {activeTab === 'positions' && (
          <div className="space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-secondaryText">
              Manage Sports Positions (CRUD)
            </h3>

            <form onSubmit={handleAddPosition} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 max-w-2xl">
              <select
                value={newPosCode}
                onChange={e => {
                  const code = e.target.value;
                  setNewPosCode(code);
                  const match = STANDARD_POSITION_CODES.find(s => s.code === code);
                  if (match) setNewPosName(match.name);
                }}
                className="glass-input rounded-xl px-4 py-2 text-xs font-bold cursor-pointer"
              >
                <option value="">Select Code ▾</option>
                {STANDARD_POSITION_CODES.map(s => (
                  <option key={s.code} value={s.code}>{s.code}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Name (e.g. Striker)"
                value={newPosName}
                onChange={e => setNewPosName(e.target.value)}
                className="glass-input rounded-xl px-4 py-2 text-xs"
              />

              {/* Icon picker — optional; auto-maps from code when left empty */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setPosIconMenuOpen(prev => !prev)}
                  className="glass-input w-full rounded-xl px-4 py-2 text-xs flex items-center justify-between gap-2 hover:border-borderStrong transition"
                  title={newPosIcon ? `Icon: ${newPosIcon}` : 'Icon: auto (by code)'}
                >
                  <span className="flex items-center gap-1.5 text-primaryText font-semibold">
                    {(() => {
                      const Selected = newPosIcon
                        ? (POSITION_ICON_OPTIONS.find(o => o.name === newPosIcon) || POSITION_ICON_OPTIONS[0]).Icon
                        : POSITION_ICON_MAP.Volleyball;
                      return <Selected className="w-4 h-4" />;
                    })()}
                    {newPosIcon || 'Auto Icon'}
                  </span>
                </button>
                {posIconMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setPosIconMenuOpen(false)} />
                    <div className="absolute z-30 top-full mt-1 left-0 bg-darkBg border border-borderStrong rounded-xl p-2 shadow-2xl flex flex-col gap-1 max-h-[280px] overflow-y-auto custom-scrollbar min-w-[140px]">
                      <button
                        type="button"
                        onClick={() => { setNewPosIcon(''); setPosIconMenuOpen(false); }}
                        className={`h-8 px-2 rounded-md flex items-center gap-2 text-[11px] font-semibold whitespace-nowrap transition ${!newPosIcon ? 'bg-warningGold text-darkBg shadow-md' : 'text-secondaryText hover:text-white hover:bg-surfaceHover'}`}
                      >
                        Auto (by code)
                      </button>
                      {POSITION_ICON_OPTIONS.map(({ name: iconName, label, Icon }) => (
                        <button
                          key={iconName}
                          type="button"
                          onClick={() => { setNewPosIcon(iconName); setPosIconMenuOpen(false); }}
                          title={label}
                          className={`h-8 px-2 rounded-md flex items-center gap-2 text-[11px] font-semibold whitespace-nowrap transition ${newPosIcon === iconName ? 'bg-warningGold text-darkBg shadow-md' : 'text-secondaryText hover:text-white hover:bg-surfaceHover'}`}
                        >
                          <Icon className="w-4 h-4" />
                          {label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <button
                type="submit"
                className="btn-primary"
              >
                <Plus className="w-4 h-4" /> Add Position
              </button>
            </form>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 pt-4">
              {positions.map(p => {
                const PosIcon = getPositionIcon(p);
                return (
                  <div
                    key={p.id}
                    className="relative rounded-xl border border-[#262b26] bg-[#060806] px-3 py-4 flex flex-col items-center gap-1.5 transition hover:border-[#39413a] group"
                  >
                    {/* Delete — subtle, top-right, appears on hover */}
                    <button
                      onClick={() => {
                        deletePosition(p.id);
                        triggerToast(`Deleted position ${p.code}`, 'info');
                      }}
                      title={`Delete ${p.code}`}
                      className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-mutedText/60 hover:text-rose-400 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 focus:opacity-100 transition"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>

                    <PosIcon className="w-7 h-7 text-white" strokeWidth={1.5} />

                    <span className="font-mono font-black text-white text-sm tracking-[0.14em] leading-none">
                      {p.code}
                    </span>
                    <span className="text-white text-[10px] font-semibold text-center leading-tight">
                      {p.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. Player Categories Tab */}
        {activeTab === 'categories' && (
          <div className="space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-secondaryText">
              Player Categories, Priority Levels & Base Prices
            </h3>

            <form onSubmit={handleAddCategory} className="grid grid-cols-1 sm:grid-cols-4 lg:grid-cols-7 gap-2 w-full">
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
              <label className="glass-input rounded-xl px-4 py-2 text-xs flex items-center justify-between gap-2 cursor-pointer hover:border-borderStrong transition">
                <span className="text-secondaryText font-semibold whitespace-nowrap">Color</span>
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
                  className="glass-input w-full rounded-xl px-4 py-2 text-xs flex items-center justify-between gap-2 hover:border-borderStrong transition"
                  title={`Icon: ${newCatIcon}`}
                >
                  <span className="text-secondaryText font-semibold whitespace-nowrap">Icon</span>
                  <span className="flex items-center gap-1.5 text-primaryText font-semibold">
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
                    <div className="absolute z-30 top-full mt-1 left-0 bg-darkBg border border-borderStrong rounded-xl p-2 shadow-2xl flex flex-col gap-1 max-h-[280px] overflow-y-auto custom-scrollbar">
                      {CATEGORY_ICON_OPTIONS.map(({ name: iconName, Icon }) => (
                        <button
                          key={iconName}
                          type="button"
                          onClick={() => { setNewCatIcon(iconName); setCatIconMenuOpen(false); }}
                          title={iconName}
                          className={`h-8 px-2 rounded-md flex items-center gap-2 text-[11px] font-semibold whitespace-nowrap transition ${newCatIcon === iconName ? 'bg-warningGold text-darkBg shadow-md' : 'text-secondaryText hover:text-white hover:bg-surfaceHover'}`}
                        >
                          <Icon className="w-4 h-4" />
                          {iconName}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <label className="glass-input rounded-xl px-3 py-2 text-xs flex items-center justify-between gap-2 cursor-pointer select-none">
                <span className={`text-secondaryText font-semibold whitespace-nowrap ${newCatHidePrice ? 'text-warningGold' : ''}`}>
                  No Prize
                </span>
                <input
                  type="checkbox"
                  checked={newCatHidePrice}
                  onChange={e => setNewCatHidePrice(e.target.checked)}
                  className="w-4 h-4 accent-amber-400"
                  title="Hide base price on player cards for this category"
                />
              </label>
              <button
                type="submit"
                className="btn-primary px-5 h-[36px] text-xs shadow-lg flex items-center justify-center gap-1.5 sm:col-span-2 lg:col-span-1"
              >
                <Plus className="w-4 h-4" /> Add Category
              </button>
            </form>

            <div className="overflow-x-auto pt-2">
              <table className="w-full text-left text-xs text-secondaryText">
                <thead className="bg-cardBg/80 text-secondaryText uppercase font-bold text-[11px] border-b border-cardBorder">
                  <tr>
                    <th className="py-3 px-4">Priority</th>
                    <th className="py-3 px-4">Category Name</th>
                    <th className="py-3 px-4">Color</th>
                    <th className="py-3 px-4">Base Price</th>
                    <th className="py-3 px-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cardBorder/60">
                  {categories.map(c => {
                    const CatIcon = (CATEGORY_ICON_OPTIONS.find(o => o.name === c.icon) || CATEGORY_ICON_OPTIONS.find(o => o.name === 'Medal')).Icon;
                    return (
                    <tr key={c.id} className="hover:bg-surfaceHover/30">
                      <td className="py-3 px-4 font-bold text-warningGold">Level {c.priority || c.priorityLevel}</td>
                      <td className="py-3 px-4 font-extrabold text-white">
                        <span className="flex items-center gap-2">
                          <CatIcon className="w-4 h-4 text-warningGold" />
                          {c.name}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-6 h-6 rounded-lg border border-borderStrong shadow-inner shrink-0"
                            style={{ backgroundColor: c.color || '#0B2B26' }}
                          />
                          <span className="font-mono text-[11px] text-secondaryText uppercase">{(c.color || '#0B2B26').toUpperCase()}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold">
                        {c.hideBasePrice
                          ? <span className="px-2 py-0.5 rounded-md bg-[#141C26] border border-[#26313D] text-secondaryText text-[10px] font-black uppercase tracking-wider">No Prize</span>
                          : <span className="text-white">{formatCurrency(c.basePrice)}</span>}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditCategory(c)}
                            className="p-1.5 text-secondaryText hover:text-white hover:bg-neonGreen/10 rounded-lg transition"
                            title={`Edit ${c.name}`}
                          >
                            <PenLine className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              deleteCategory(c.id);
                              triggerToast(`Deleted category ${c.name}`, 'info');
                            }}
                            className="p-1.5 text-secondaryText hover:text-urgentRedText hover:bg-urgentRed/10 rounded-lg transition"
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
              <h3 className="text-sm font-bold uppercase tracking-wider text-secondaryText">
                Percentage-Based Dynamic Raise Logic (PRD Section 2.A)
              </h3>
              <p className="text-xs text-secondaryText mt-1">
                Configure raise percentage bounds of team budget (e.g. 0-3% = 0.15% raise).
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Tiers List */}
              <div className="space-y-3">
                {biddingTiers.length === 0 && (
                  <div className="bg-cardBg/60 border border-dashed border-borderStrong p-6 rounded-xl text-center space-y-2">
                    <Calculator className="w-8 h-8 mx-auto text-mutedText" />
                    <p className="text-sm font-bold text-secondaryText">No Bidding Tiers configured yet</p>
                    <p className="text-xs text-mutedText max-w-xs mx-auto">
                      Run <code className="text-white font-mono">npm run seed</code> in the backend to load the default 4 tiers, or check the database.
                    </p>
                  </div>
                )}
                {biddingTiers.map((tier, idx) => (
                  <div key={tier.id} className="bg-cardBg/60 border border-cardBorder p-4 rounded-xl space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-warningGold uppercase">Tier #{idx + 1}</span>
                      <span className="text-[11px] text-secondaryText">
                        {tier.minPercent}% to {tier.maxPercent}% of Total Purse
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <label className="text-xs text-secondaryText">Raise Percent:</label>
                      <input
                        type="number"
                        step="0.05"
                        value={tier.raisePercent}
                        onChange={(e) => updateBiddingTier(tier.id, { raisePercent: parseFloat(e.target.value) || 0 })}
                        className="glass-input w-24 px-3 py-1 rounded-lg text-xs font-mono font-bold text-white"
                      />
                      <span className="text-xs font-mono text-secondaryText">%</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Dynamic Monetary Value Calculator Preview */}
              <div className="bg-darkBg/80 border border-warningGold/30 rounded-2xl p-5 space-y-4 shadow-xl">
                <div className="flex items-center gap-2 text-warningGold font-bold text-xs uppercase tracking-wider">
                  <Calculator className="w-4 h-4" /> Live Raise Monetary Calculator
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-secondaryText mb-1">Franchise Purse Total:</label>
                    <input
                      type="number"
                      value={testPurse}
                      onChange={e => setTestPurse(Number(e.target.value))}
                      className="glass-input w-full px-3 py-2 rounded-xl font-mono text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-secondaryText mb-1">Current Player Bid Price:</label>
                    <input
                      type="number"
                      value={testCurrentBid}
                      onChange={e => setTestCurrentBid(Number(e.target.value))}
                      className="glass-input w-full px-3 py-2 rounded-xl font-mono text-white"
                    />
                  </div>

                  <div className="p-4 bg-warningGold/10 border border-warningGold/20 rounded-xl space-y-2">
                    <p className="text-[11px] text-warningGold uppercase font-semibold">Calculated Next Exact Raise:</p>
                    <p className="text-xl font-black font-mono text-white">
                      {formatCurrency(calculateNextBidAmount(testCurrentBid, testPurse))}
                    </p>
                    <p className="text-[10px] text-secondaryText">
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
          <div className="glass-card w-full max-w-md rounded-2xl p-6 border border-borderStrong space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-black text-white">Edit Category</h2>
                <p className="text-xs text-secondaryText">Level {editForm.priorityLevel} · {formatCurrency(Number(editForm.basePrice) || 0)}</p>
              </div>
              <button
                onClick={() => setEditingCat(null)}
                className="p-2 text-secondaryText hover:text-white hover:bg-surfaceHover rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-secondaryText mb-1">Category Name</label>
                <input
                  type="text"
                  value={editForm.name || ''}
                  onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  className="glass-input w-full px-3 py-2 rounded-xl text-xs"
                />
              </div>

              <label className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl bg-[#0B1118] border border-[#26313D] cursor-pointer select-none">
                <span className="text-[11px] font-bold text-secondaryText">
                  No Prize
                  <span className="block text-[9px] font-normal text-mutedText normal-case">Hide base price on player cards</span>
                </span>
                <input
                  type="checkbox"
                  checked={!!editForm.hideBasePrice}
                  onChange={e => setEditForm(prev => ({ ...prev, hideBasePrice: e.target.checked }))}
                  className="w-4 h-4 accent-amber-400"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-secondaryText mb-1">Priority Level (1-5)</label>
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
                  <label className="block text-[11px] font-semibold text-secondaryText mb-1">Base Price (BDT)</label>
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
                <label className="block text-[11px] font-semibold text-secondaryText mb-1">Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={/^#[0-9a-fA-F]{6}$/.test(editForm.color || '') ? editForm.color : '#0B2B26'}
                    onChange={e => setEditForm(prev => ({ ...prev, color: e.target.value }))}
                    className="w-14 h-9 rounded-xl cursor-pointer bg-transparent border border-borderStrong p-1"
                  />
                  <span
                    className="w-8 h-8 rounded-lg border border-borderStrong shrink-0"
                    style={{ backgroundColor: /^#[0-9a-fA-F]{6}$/.test(editForm.color || '') ? editForm.color : '#0B2B26' }}
                  />
                  <span className="font-mono text-[11px] text-secondaryText uppercase">{(editForm.color || '#0B2B26').toUpperCase()}</span>
                </div>
              </div>

              <div className="relative">
                <label className="block text-[11px] font-semibold text-secondaryText mb-1">Icon</label>
                <button
                  type="button"
                  onClick={() => setEditCatIconMenuOpen(prev => !prev)}
                  className="w-full h-[36px] flex items-center justify-between gap-2 bg-cardBg/60 border border-cardBorder hover:border-borderStrong rounded-xl px-3 transition"
                  title={`Icon: ${editForm.icon || 'Medal'}`}
                >
                  <span className="flex items-center gap-2 text-xs text-primaryText font-semibold">
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
                    <div className="absolute z-30 top-full mt-1 left-0 right-0 bg-darkBg border border-borderStrong rounded-xl p-2 shadow-2xl flex flex-col gap-1 max-h-[280px] overflow-y-auto custom-scrollbar">
                      {CATEGORY_ICON_OPTIONS.map(({ name: iconName, Icon }) => (
                        <button
                          key={iconName}
                          type="button"
                          onClick={() => { setEditForm(prev => ({ ...prev, icon: iconName })); setEditCatIconMenuOpen(false); }}
                          title={iconName}
                          className={`h-8 px-2 rounded-md flex items-center gap-2 text-[11px] font-semibold whitespace-nowrap transition ${(editForm.icon || 'Medal') === iconName ? 'bg-warningGold text-darkBg shadow-md' : 'text-secondaryText hover:text-white hover:bg-surfaceHover'}`}
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
                className="flex-1 py-2.5 border border-borderStrong text-secondaryText hover:bg-surfaceHover rounded-xl text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCategoryEdit}
                disabled={saving}
                className="flex-1 py-2.5 bg-successGreen hover:bg-neonGreen disabled:opacity-60 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition"
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
