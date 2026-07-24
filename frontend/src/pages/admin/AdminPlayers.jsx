import React, { useState } from 'react';
import { UserCheck, ShieldAlert, Lock, Unlock, Edit3, Ban, CheckCircle2, Search } from 'lucide-react';
import { useAuction } from '../../context/AuctionContext';

export default function AdminPlayers() {
  const {
    players,
    setPlayers,
    isRegistrationFrozen,
    setIsRegistrationFrozen,
    formatCurrency,
    triggerToast
  } = useAuction();

  const [search, setSearch] = useState('');
  const [editingPlayer, setEditingPlayer] = useState(null);

  const filtered = players.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.studentId.toLowerCase().includes(search.toLowerCase()));

  const handleToggleBan = (id, currentStatus) => {
    const nextStatus = currentStatus === 'banned' ? 'unsold' : 'banned';
    setPlayers(prev => prev.map(p => p.id === id ? { ...p, status: nextStatus } : p));
    triggerToast(nextStatus === 'banned' ? 'Player BANNED from auction.' : 'Player UNBANNED.', nextStatus === 'banned' ? 'error' : 'success');
  };

  return (
    <div className="space-y-6">
      
      <div className="glass-card rounded-2xl p-6 border border-slate-800 flex items-center justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-blue-400">Super Admin Override</span>
          <h1 className="text-2xl font-black font-heading text-white">Master Player Registry Controls</h1>
          <p className="text-xs text-slate-400 mt-1">
            Override control panel: Force-edit profiles, ban participants, manually approve registrations, or freeze global onboarding.
          </p>
        </div>

        <button
          onClick={() => {
            setIsRegistrationFrozen(!isRegistrationFrozen);
            triggerToast(!isRegistrationFrozen ? 'Registration Frozen globally!' : 'Registration Unfrozen!', 'warning');
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition border shadow-lg ${
            isRegistrationFrozen
              ? 'bg-rose-600/20 text-rose-300 border-rose-500/40 hover:bg-rose-600'
              : 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-600'
          }`}
        >
          {isRegistrationFrozen ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
          <span>{isRegistrationFrozen ? 'FROZEN' : 'ACTIVE'}</span>
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="glass-card rounded-2xl p-4 border border-slate-800 flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by player name or student ID..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-transparent border-none outline-none text-xs text-white w-full"
        />
      </div>

      {/* Players Master List */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
          All Registered Players ({filtered.length})
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/80 text-slate-400 uppercase font-bold text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Player</th>
                <th className="py-3 px-4">Student ID</th>
                <th className="py-3 px-4">Academic Session</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Base Price</th>
                <th className="py-3 px-4">Auction Status</th>
                <th className="py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map(player => (
                <tr key={player.id} className="hover:bg-slate-800/30">
                  <td className="py-3 px-4 flex items-center gap-3">
                    <img src={player.picture} alt="" className="w-8 h-8 rounded-full object-cover border border-slate-700" />
                    <div>
                      <p className="font-extrabold text-white">{player.name}</p>
                      <p className="text-[10px] text-slate-400">{player.jerseyName}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-300">{player.studentId}</td>
                  <td className="py-3 px-4 text-slate-400">{player.session}</td>
                  <td className="py-3 px-4 font-semibold text-amber-400">{player.category}</td>
                  <td className="py-3 px-4 font-mono text-emerald-400">{formatCurrency(player.basePrice)}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      player.status === 'sold' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                      player.status === 'podium' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 animate-pulse' :
                      player.status === 'banned' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                      'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}>
                      {player.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 flex items-center gap-2">
                    <button
                      onClick={() => handleToggleBan(player.id, player.status)}
                      className={`p-1.5 rounded-lg text-xs font-bold transition ${
                        player.status === 'banned'
                          ? 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white'
                          : 'bg-rose-600/20 text-rose-400 hover:bg-rose-600 hover:text-white'
                      }`}
                      title={player.status === 'banned' ? 'Unban Player' : 'Ban Player'}
                    >
                      <Ban className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
