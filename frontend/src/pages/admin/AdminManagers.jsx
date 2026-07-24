import React, { useState } from 'react';
import { Users, Key, RotateCcw, ShieldAlert, CheckCircle, Copy } from 'lucide-react';
import { useAuction } from '../../context/AuctionContext';

export default function AdminManagers() {
  const { managers, teams, triggerToast } = useAuction();
  const [selectedManager, setSelectedManager] = useState(null);
  const [tempPass, setTempPass] = useState('');

  const handleGenerateCredentials = (mgr) => {
    const generated = `FranchisePass#${Math.floor(1000 + Math.random() * 9000)}`;
    setTempPass(generated);
    setSelectedManager(mgr);
    triggerToast(`New credentials generated for ${mgr.name}`, 'success');
  };

  return (
    <div className="space-y-6">
      
      <div className="glass-card rounded-2xl p-6 border border-slate-800 flex items-center justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-blue-400">Super Admin Security</span>
          <h1 className="text-2xl font-black font-heading text-white">Team Manager Credentials Management</h1>
          <p className="text-xs text-slate-400 mt-1">
            Generate and manage initial credentials for authenticated Team Managers, monitor password resets.
          </p>
        </div>
        <Users className="w-8 h-8 text-blue-400 opacity-80" />
      </div>

      {/* Generated Modal / Banner */}
      {selectedManager && (
        <div className="bg-emerald-950/90 border border-emerald-500/40 rounded-2xl p-5 space-y-3">
          <div className="flex justify-between items-center text-emerald-300 font-bold text-xs">
            <span className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4" /> Initial Password Generated</span>
            <button onClick={() => setSelectedManager(null)} className="text-xs text-slate-400 hover:text-white">Dismiss</button>
          </div>
          <div className="bg-slate-950 p-4 rounded-xl font-mono text-xs text-slate-200 flex items-center justify-between">
            <div>
              <p><strong className="text-slate-400">Target Manager:</strong> {selectedManager.name}</p>
              <p><strong className="text-slate-400">Username:</strong> {selectedManager.username}</p>
              <p><strong className="text-emerald-400">Temporary Password:</strong> {tempPass}</p>
            </div>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(`Username: ${selectedManager.username}\nPassword: ${tempPass}`);
                triggerToast('Credentials copied to clipboard!', 'info');
              }}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold flex items-center gap-1"
            >
              <Copy className="w-3.5 h-3.5" /> Copy
            </button>
          </div>
        </div>
      )}

      {/* Managers Table */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
          Active Team Manager Accounts
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/80 text-slate-400 uppercase font-bold text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Manager Name</th>
                <th className="py-3 px-4">Username</th>
                <th className="py-3 px-4">Assigned Franchise</th>
                <th className="py-3 px-4">First-Login Reset Status</th>
                <th className="py-3 px-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {managers.map(mgr => {
                const team = teams.find(t => t.id === mgr.teamId);
                return (
                  <tr key={mgr.id} className="hover:bg-slate-800/30">
                    <td className="py-3 px-4 font-bold text-white">{mgr.name}</td>
                    <td className="py-3 px-4 font-mono text-slate-400">{mgr.username}</td>
                    <td className="py-3 px-4 font-semibold text-blue-400">
                      {team ? `${team.logo} ${team.name}` : 'Unassigned'}
                    </td>
                    <td className="py-3 px-4">
                      {mgr.mustChangePass ? (
                        <span className="text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                          Password Reset Required
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          Active & Verified
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleGenerateCredentials(mgr)}
                        className="px-3 py-1 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white rounded-lg text-xs font-bold transition flex items-center gap-1 border border-blue-500/30"
                      >
                        <Key className="w-3.5 h-3.5" /> Reset Creds
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
