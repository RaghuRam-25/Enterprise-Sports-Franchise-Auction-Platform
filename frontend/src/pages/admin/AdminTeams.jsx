import React, { useState } from 'react';
import { ShieldCheck, Plus, DollarSign, Users, Trash2, Edit3 } from 'lucide-react';
import { useAuction } from '../../context/AuctionContext';

export default function AdminTeams() {
  const { teams, setTeams, formatCurrency, triggerToast } = useAuction();

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [logo, setLogo] = useState('🔥');
  const [budget, setBudget] = useState('100000000');
  const [minRoster, setMinRoster] = useState('11');

  const handleCreateTeam = (e) => {
    e.preventDefault();
    if (!name || !code) return;
    const newTeam = {
      id: `team-${Date.now()}`,
      name,
      code: code.toUpperCase(),
      logo,
      primaryColor: '#3b82f6',
      totalBudget: Number(budget),
      remainingBudget: Number(budget),
      minRoster: Number(minRoster),
      currentRoster: []
    };
    setTeams(prev => [...prev, newTeam]);
    setName('');
    setCode('');
    triggerToast(`Created Franchise Team: ${name}`, 'success');
  };

  const handleDeleteTeam = (id, teamName) => {
    setTeams(prev => prev.filter(t => t.id !== id));
    triggerToast(`Deleted team ${teamName}`, 'warning');
  };

  return (
    <div className="space-y-6">
      
      <div className="glass-card rounded-2xl p-6 border border-slate-800 flex items-center justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-blue-400">Super Admin Management</span>
          <h1 className="text-2xl font-black font-heading text-white">Franchise Teams & Budget Allocation</h1>
          <p className="text-xs text-slate-400 mt-1">
            Create franchise buyers, set initial total budgets, and define minimum required roster slots.
          </p>
        </div>
        <ShieldCheck className="w-8 h-8 text-blue-400 opacity-80" />
      </div>

      {/* Create Team Form */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
          Create New Franchise Team
        </h3>

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
            placeholder="Code (e.g. DHD)"
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
            placeholder="Total Budget BDT"
            value={budget}
            onChange={e => setBudget(e.target.value)}
            className="glass-input rounded-xl px-4 py-2 text-xs"
            required
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1 shadow-md"
          >
            <Plus className="w-4 h-4" /> Create Team
          </button>
        </form>
      </div>

      {/* Franchise List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {teams.map(team => (
          <div key={team.id} className="glass-card rounded-2xl p-5 border border-slate-800 space-y-4">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{team.logo}</span>
                <div>
                  <h3 className="font-extrabold text-base text-white">{team.name}</h3>
                  <span className="font-mono text-xs text-blue-400 font-bold bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                    {team.code}
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleDeleteTeam(team.id, team.name)}
                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
              >
                <Trash2 className="w-4 h-4" />
              </button>
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
              <span>Roster Count: <strong className="text-white">{team.currentRoster.length}</strong> / {team.minRoster} min</span>
              <span className="text-emerald-400 font-semibold">Active Franchise</span>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
