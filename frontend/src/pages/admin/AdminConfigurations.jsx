import  { useState } from 'react';
import {  useParams } from 'react-router-dom';
import {  Plus, Trash2, Calculator } from 'lucide-react';
import { useAuction } from '../../context/AuctionContext';

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
      basePrice: Number(newCatBasePrice)
    });
    setNewCatName('');
    setNewCatBasePrice('');
    triggerToast(`Added category: ${newCatName}`, 'success');
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

            <form onSubmit={handleAddCategory} className="grid grid-cols-1 sm:grid-cols-4 gap-3 max-w-2xl">
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
                    <th className="py-3 px-4">Base Price</th>
                    <th className="py-3 px-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {categories.map(c => (
                    <tr key={c.id} className="hover:bg-slate-800/30">
                      <td className="py-3 px-4 font-bold text-amber-400">Level {c.priority}</td>
                      <td className="py-3 px-4 font-extrabold text-white">{c.name}</td>
                      <td className="py-3 px-4 font-mono font-semibold text-emerald-400">{formatCurrency(c.basePrice)}</td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => {
                            deleteCategory(c.id);
                            triggerToast(`Deleted category ${c.name}`, 'info');
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
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

    </div>
  );
}
