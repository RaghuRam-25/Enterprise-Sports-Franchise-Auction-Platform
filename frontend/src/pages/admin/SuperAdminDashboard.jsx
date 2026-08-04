import { useState } from 'react';
import { Users, ShieldCheck, Trophy, Lock, DollarSign, Settings, Layers, ChevronRight, Loader, RotateCcw, AlertTriangle } from 'lucide-react';
import { useAuction } from '../../context/AuctionContext';
import { usePhase } from '../../context/PhaseContext';
import { Link } from 'react-router-dom';
import api from '../../services/api';

// Visual label per phase for the control stepper
const PHASE_META = {
  SETUP: { label: 'Setup', desc: 'Configure rules & teams' },
  REGISTRATION: { label: 'Registration', desc: 'Players sign up' },
  AUCTION: { label: 'Auction', desc: 'Live bidding on podium' },
  TOURNAMENT: { label: 'Tournament', desc: 'Matches, stats & awards' },
};

export default function SuperAdminDashboard() {
  const {
    players,
    teams,
    sessions,
    positions,
    categories,
    biddingTiers,
    isRegistrationFrozen,
    formatCurrency,
    triggerToast
  } = useAuction();

  // ── Phase state machine (global lifecycle) ─────────────────────────────────
  const { phase, phases, loading: phaseLoading, rosterSizing } = usePhase();
  const [advancing, setAdvancing] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);

  const totalRegistered = players.length;
  // GAP-15 FIX: status values are uppercase in DB
  const soldPlayers = players.filter(p => (p.status || '').toUpperCase() === 'SOLD').length;

  const unsoldPlayers = players.filter(p => (p.status || '').toUpperCase() === 'UNSOLD').length;
  const totalPurse = teams.reduce((acc, t) => acc + (t.totalBudget || 0), 0);

  // ── Advance the state machine (Super Admin only; backend validates legality) ─
  const advancePhase = async () => {
    if (!phase || advancing) return;
    const idx = phases.indexOf(phase);
    const next = phases[idx + 1];
    if (!next) return;

    setAdvancing(true);
    try {
      const res = await api.patch('/phase', { phase: next });
      if (res?.data) {
        triggerToast(`Phase advanced → ${next}`, 'success');
      }
    } catch (err) {
      triggerToast(err?.response?.data?.message || `Could not advance to ${next}`, 'error');
    } finally {
      setAdvancing(false);
    }
  };

  const executeReset = async () => {
    setResetting(true);
    try {
      const res = await api.patch('/phase', { phase: 'SETUP' });
      if (res?.data) {
        triggerToast('Event has been reset to SETUP phase.', 'success');
      }
    } catch (err) {
      triggerToast(err?.response?.data?.message || 'Failed to reset event.', 'error');
    } finally {
      setResetting(false);
      setShowResetConfirm(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* Top Banner — Global Phase Control */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900/90 to-blue-950/40 space-y-5">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-blue-400">Architect Dashboard</span>
            <h1 className="text-2xl font-black font-heading text-white">Global Event Control</h1>
          </div>

          {/* Advance-phase action */}
          {phase && phases.indexOf(phase) < phases.length - 1 ? (
            <button
              onClick={advancePhase}
              disabled={advancing || phaseLoading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition shadow-lg bg-blue-600/20 text-blue-200 border border-blue-500/40 hover:bg-blue-600 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {advancing ? <Loader className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
              <span>
                Advance to {PHASE_META[phases[phases.indexOf(phase) + 1]]?.label || phases[phases.indexOf(phase) + 1]}
              </span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs bg-slate-800/60 text-slate-400 border border-slate-700">
                <Lock className="w-4 h-4" /> Final phase
              </span>
              <button
                onClick={() => setShowResetConfirm(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition shadow-lg bg-rose-600/20 text-rose-200 border border-rose-500/40 hover:bg-rose-600 hover:text-white"
              >
                <RotateCcw className="w-4 h-4" /> Reset Event
              </button>
            </div>
          )}
        </div>

        {/* Phase stepper */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {phases.map((p, i) => {
            const currentIdx = phase ? phases.indexOf(phase) : -1;
            const isCurrent = p === phase;
            const isDone = currentIdx > i;
            return (
              <div
                key={p}
                className={`rounded-xl p-3 border transition ${isCurrent
                    ? 'border-blue-500 bg-blue-500/15 ring-1 ring-blue-500/40'
                    : isDone
                      ? 'border-emerald-600/40 bg-emerald-500/10'
                      : 'border-slate-800 bg-slate-900/50'
                  }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-mono font-bold ${isCurrent ? 'text-blue-300' : isDone ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  {isCurrent && <span className="text-[9px] font-bold uppercase text-blue-300 tracking-wider">Active</span>}
                  {isDone && <span className="text-[9px] font-bold uppercase text-emerald-400 tracking-wider">Done</span>}
                </div>
                <p className={`text-sm font-extrabold mt-1 ${isCurrent ? 'text-white' : 'text-slate-300'}`}>
                  {PHASE_META[p]?.label || p}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">{PHASE_META[p]?.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card rounded-2xl p-5 border border-slate-800 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase">Total Registrations</p>
              <h3 className="text-2xl font-black text-white mt-1">{totalRegistered}</h3>
              <p className="text-[11px] text-emerald-400 mt-1">{soldPlayers} Sold &bull; {unsoldPlayers} Unsold</p>
            </div>
            <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
              <Users className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-slate-800 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase">Franchise Teams</p>
              <h3 className="text-2xl font-black text-white mt-1">{teams.length}</h3>
              <p className="text-[11px] text-blue-400 mt-1">Active Franchise Buyers</p>
            </div>
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-slate-800 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase">Total Event Purse</p>
              <h3 className="text-xl font-black text-white mt-1">{formatCurrency(totalPurse)}</h3>
              <p className="text-[11px] text-amber-400 mt-1">Combined Franchise Capital</p>
            </div>
            <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-slate-800 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase">Dynamic Configs</p>
              <h3 className="text-2xl font-black text-white mt-1">{categories.length} Tiers</h3>
              <p className="text-[11px] text-purple-400 mt-1">{positions.length} Positions &bull; {sessions.length} Sessions</p>
            </div>
            <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20">
              <Settings className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Franchise Team Summary Table */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" /> Active Franchises
          </h3>
          <Link
            to="/admin/teams"
            className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
          >
            Manage Teams &rarr;
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/80 text-slate-400 uppercase font-bold text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Franchise</th>
                <th className="py-3 px-4">Initial Purse</th>
                <th className="py-3 px-4">Remaining Purse</th>
                <th className="py-3 px-4">Roster Count</th>
                <th className="py-3 px-4">Min Target</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {teams.map(team => (
                <tr key={team.id} className="hover:bg-slate-800/30">
                  <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                    <span>{team.logo}</span>
                    <span>{team.name}</span>
                  </td>
                  <td className="py-3 px-4 font-mono">{formatCurrency(team.totalBudget)}</td>
                  <td className="py-3 px-4 font-mono text-emerald-400 font-semibold">{formatCurrency(team.remainingBudget)}</td>
                  <td className="py-3 px-4 font-bold">{team.currentRoster.length} Players</td>
                  <td className="py-3 px-4 text-slate-400">{team.minRoster} Players</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-md rounded-2xl p-6 border border-rose-500/30 space-y-5 shadow-2xl">
            <h2 className="text-lg font-black text-white flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-rose-400" /> Confirm Event Reset</h2>
            <p className="text-sm text-slate-300">
              This will reset the entire event lifecycle back to the <strong>SETUP</strong> phase.
              This is a destructive action and should only be used to start a new season.
              Are you absolutely sure you want to proceed?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowResetConfirm(false)} className="flex-1 py-2.5 border border-slate-700 text-slate-300 hover:bg-slate-800 rounded-xl text-xs font-semibold transition">
                Cancel
              </button>
              <button
                onClick={executeReset}
                disabled={resetting}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
              >
                {resetting ? <Loader className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                Yes, Reset Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
