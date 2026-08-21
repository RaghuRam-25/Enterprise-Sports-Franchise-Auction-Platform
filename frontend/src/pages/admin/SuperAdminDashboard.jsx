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
  const { phase, phases, loading: phaseLoading, isLocked } = usePhase();
  const [activeSection, setActiveSection] = useState('SETUP'); // Top nav section: Setup | Registration | Auction | Results
  const [transitioning, setTransitioning] = useState(false);
  const [togglingLock, setTogglingLock] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);

  const totalRegistered = players.length;
  // GAP-15 FIX: status values are uppercase in DB
  const soldPlayers = players.filter(p => (p.status || '').toUpperCase() === 'SOLD').length;
  const unsoldPlayers = players.filter(p => (p.status || '').toUpperCase() === 'UNSOLD').length;
  const totalPurse = teams.reduce((acc, t) => acc + (t.totalBudget || 0), 0);

  // Sync activeSection with current phase if not manually overridden by user click
  const currentPhaseIndex = phase ? phases.indexOf(phase) : 0;

  // ── Bi-directional Phase Transition (Next / Previous / Direct Click) ───────────
  const handlePhaseChange = async (targetPhase) => {
    if (!targetPhase || targetPhase === phase || transitioning) return;
    if (isLocked) {
      triggerToast(`Stage ${phase} is locked. Unlock it first to move stages.`, 'warning');
      return;
    }

    setTransitioning(true);
    try {
      const res = await api.patch('/phase', { phase: targetPhase });
      if (res?.data) {
        triggerToast(`Stage changed → ${targetPhase}`, 'success');
        setActiveSection(targetPhase === 'TOURNAMENT' ? 'RESULTS' : targetPhase);
      }
    } catch (err) {
      triggerToast(err?.response?.data?.message || `Could not transition to ${targetPhase}`, 'error');
    } finally {
      setTransitioning(false);
    }
  };

  const advancePhase = () => {
    const nextIdx = currentPhaseIndex + 1;
    if (nextIdx < phases.length) {
      handlePhaseChange(phases[nextIdx]);
    }
  };

  const regressedPhase = () => {
    const prevIdx = currentPhaseIndex - 1;
    if (prevIdx >= 0) {
      handlePhaseChange(phases[prevIdx]);
    }
  };

  const toggleStageLock = async () => {
    setTogglingLock(true);
    try {
      const res = await api.patch('/phase', { action: 'TOGGLE_LOCK' });
      if (res?.data) {
        triggerToast(res.data.message, 'info');
      }
    } catch (err) {
      triggerToast(err?.response?.data?.message || 'Failed to toggle lock state.', 'error');
    } finally {
      setTogglingLock(false);
    }
  };

  const executeReset = async () => {
    setResetting(true);
    try {
      const res = await api.patch('/phase', { phase: 'SETUP' });
      if (res?.data) {
        triggerToast('Current stage has been safely reset to SETUP.', 'success');
        setActiveSection('SETUP');
      }
    } catch (err) {
      triggerToast(err?.response?.data?.message || 'Failed to reset stage.', 'error');
    } finally {
      setResetting(false);
      setShowResetConfirm(false);
    }
  };

  // Map top nav tabs
  const topNavTabs = [
    { key: 'SETUP', label: 'Setup', targetPhase: 'SETUP' },
    { key: 'REGISTRATION', label: 'Registration', targetPhase: 'REGISTRATION' },
    { key: 'AUCTION', label: 'Auction', targetPhase: 'AUCTION' },
    { key: 'RESULTS', label: 'Results', targetPhase: 'TOURNAMENT' },
  ];

  return (
    <div className="space-y-6">

      {/* Top Navigation Tabs: Setup, Registration, Auction, Results */}
      <div className="glass-card rounded-2xl p-2 border border-cardBorder bg-cardBg/90 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto w-full sm:w-auto">
          {topNavTabs.map((tab) => {
            const isTabActive = activeSection === tab.key;
            const isStageCurrent = phase === tab.targetPhase;
            return (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveSection(tab.key);
                  if (tab.targetPhase === 'REGISTRATION' && phase === 'SETUP' && !isLocked) {
                    handlePhaseChange('REGISTRATION');
                  }
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
                  isTabActive
                    ? 'bg-[#58D20A] text-[#050505] shadow-lg font-black border border-[#58D20A]'
                    : 'bg-[#151515] text-[#F5F5F5] border border-[#333333] hover:border-[#58D20A] hover:text-[#58D20A]'
                }`}
              >
                <span>{tab.label}</span>
                {isStageCurrent && (
                  <span className="w-2 h-2 rounded-full bg-[#58D20A] animate-pulse" title="Active Platform Stage" />
                )}
              </button>
            );
          })}
        </div>

        {/* Action Controls: Lock & Reset */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end px-2">
          <button
            onClick={toggleStageLock}
            disabled={togglingLock}
            className={`btn-secondary flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs ${
              isLocked
                ? 'bg-warningGold/20 text-warningGold border-warningGold/50'
                : ''
            }`}
          >
            <Lock className={`w-3.5 h-3.5 ${isLocked ? 'text-warningGold' : 'text-[#F5F5F5]'}`} />
            <span>{isLocked ? 'Stage Locked' : 'Stage Unlocked'}</span>
          </button>
          <button
            onClick={() => setShowResetConfirm(true)}
            className="btn-danger flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Stage</span>
          </button>
        </div>
      </div>

      {/* Top Banner — Global Phase Control */}
      <div className="glass-card rounded-2xl p-6 border border-cardBorder bg-gradient-to-r from-cardBg via-cardBg/90 to-successGreen/40 space-y-5">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-neonGreen">Architect Dashboard &bull; {activeSection} Section</span>
            <h1 className="text-2xl font-black font-heading text-white">Global Event Control</h1>
          </div>

          {/* Bi-directional Stage Stepper Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={regressedPhase}
              disabled={currentPhaseIndex === 0 || transitioning || phaseLoading || isLocked}
              className="btn-secondary flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span>&larr; Previous Stage</span>
            </button>
            <button
              onClick={advancePhase}
              disabled={currentPhaseIndex === phases.length - 1 || transitioning || phaseLoading || isLocked}
              className="btn-primary flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-xs shadow-xl disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {transitioning ? <Loader className="w-4 h-4 animate-spin" /> : null}
              <span>Next Stage &rarr;</span>
            </button>
          </div>
        </div>

        {/* Phase stepper with direct bi-directional clicking */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {phases.map((p, i) => {
            const currentIdx = phase ? phases.indexOf(phase) : -1;
            const isCurrent = p === phase;
            const isDone = currentIdx > i;
            return (
              <div
                key={p}
                onClick={() => !isLocked && handlePhaseChange(p)}
                className={`rounded-xl p-3 border transition cursor-pointer ${
                  isCurrent
                    ? 'border-neonGreen bg-neonGreen/15 ring-1 ring-neonGreen/40'
                    : isDone
                    ? 'border-successGreen/40 bg-neonGreen/10 hover:border-neonGreen'
                    : 'border-cardBorder bg-cardBg/50 hover:border-borderStrong'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-mono font-bold ${isCurrent ? 'text-neonGreenHover' : isDone ? 'text-neonGreen' : 'text-mutedText'}`}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  {isCurrent && <span className="text-[9px] font-bold uppercase text-neonGreenHover tracking-wider">Active</span>}
                  {isDone && <span className="text-[9px] font-bold uppercase text-neonGreen tracking-wider">Passed</span>}
                </div>
                <p className={`text-sm font-extrabold mt-1 ${isCurrent ? 'text-white' : 'text-secondaryText'}`}>
                  {PHASE_META[p]?.label || p}
                </p>
                <p className="text-[10px] text-mutedText mt-0.5">{PHASE_META[p]?.desc}</p>
              </div>
            );
          })}
        </div>

        {/* Quick Registration Status Toggle Box */}
        <div className="pt-2 border-t border-cardBorder/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-darkBg/40 p-3.5 rounded-xl">
          <div className="flex items-center gap-3">
            <span className={`w-3 h-3 rounded-full ${phase === 'REGISTRATION' ? 'bg-neonGreen animate-pulse' : 'bg-urgentRed'}`} />
            <div>
              <p className="text-xs font-extrabold text-white uppercase tracking-wider">
                Player Registration Status: <span className={phase === 'REGISTRATION' ? 'text-neonGreen' : 'text-urgentRedText'}>{phase === 'REGISTRATION' ? 'OPEN & ACTIVE' : 'CLOSED / FROZEN'}</span>
              </p>
            </div>
          </div>
          <button
            onClick={() => handlePhaseChange(phase === 'REGISTRATION' ? 'SETUP' : 'REGISTRATION')}
            disabled={transitioning || phaseLoading || isLocked}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition shadow-md whitespace-nowrap ${
              phase === 'REGISTRATION'
                ? 'bg-urgentRed/20 text-urgentRedText border border-urgentRed/40 hover:bg-urgentRed hover:text-white'
                : 'bg-neonGreen hover:bg-neonGreen text-darkBg shadow-neonGreen/20'
            }`}
          >
            {transitioning ? (
              <span className="flex items-center gap-1.5"><Loader className="w-3.5 h-3.5 animate-spin" /> Updating...</span>
            ) : phase === 'REGISTRATION' ? (
              'Close Registration'
            ) : (
              'Enable Player Registration'
            )}
          </button>
        </div>
      </div>


      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card rounded-2xl p-5 border border-cardBorder relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-secondaryText uppercase">Total Registrations</p>
              <h3 className="text-2xl font-black text-white mt-1">{totalRegistered}</h3>
              <p className="text-[11px] text-neonGreen mt-1">{soldPlayers} Sold &bull; {unsoldPlayers} Unsold</p>
            </div>
            <div className="p-3 bg-neonGreen/10 text-neonGreen rounded-xl border border-neonGreen/20">
              <Users className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-cardBorder relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-secondaryText uppercase">Franchise Teams</p>
              <h3 className="text-2xl font-black text-white mt-1">{teams.length}</h3>
              <p className="text-[11px] text-neonGreen mt-1">Active Franchise Buyers</p>
            </div>
            <div className="p-3 bg-neonGreen/10 text-neonGreen rounded-xl border border-neonGreen/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-cardBorder relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-secondaryText uppercase">Total Event Purse</p>
              <h3 className="text-xl font-black text-white mt-1">{formatCurrency(totalPurse)}</h3>
              <p className="text-[11px] text-warningGold mt-1">Combined Franchise Capital</p>
            </div>
            <div className="p-3 bg-warningGold/10 text-warningGold rounded-xl border border-warningGold/20">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-cardBorder relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-secondaryText uppercase">Dynamic Configs</p>
              <h3 className="text-2xl font-black text-white mt-1">{biddingTiers.length} Tiers</h3>
              <p className="text-[11px] text-warningGold mt-1">{categories.length} Categories &bull; {positions.length} Positions &bull; {sessions.length} Sessions</p>
            </div>
            <div className="p-3 bg-warningGold/10 text-warningGold rounded-xl border border-warningGold/20">
              <Settings className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Franchise Team Summary Table */}
      <div className="glass-card rounded-2xl p-6 border border-cardBorder space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-bold uppercase tracking-wider text-secondaryText flex items-center gap-2">
            <Trophy className="w-4 h-4 text-warningGold" /> Active Franchises
          </h3>
          <Link
            to="/admin/teams"
            className="text-xs text-neonGreen hover:text-neonGreenHover font-semibold flex items-center gap-1"
          >
            Manage Teams &rarr;
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-secondaryText">
            <thead className="bg-cardBg/80 text-secondaryText uppercase font-bold text-[11px] border-b border-cardBorder">
              <tr>
                <th className="py-3 px-4">Franchise</th>
                <th className="py-3 px-4">Initial Purse</th>
                <th className="py-3 px-4">Remaining Purse</th>
                <th className="py-3 px-4">Roster Count</th>
                <th className="py-3 px-4">Min Target</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cardBorder/60">
              {teams.map(team => (
                <tr key={team.id} className="hover:bg-surfaceHover/30">
                  <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                    <span>{team.logo}</span>
                    <span>{team.name}</span>
                  </td>
                  <td className="py-3 px-4 font-mono">{formatCurrency(team.totalBudget)}</td>
                  <td className="py-3 px-4 font-mono text-neonGreen font-semibold">{formatCurrency(team.remainingBudget)}</td>
                  <td className="py-3 px-4 font-bold">{team.currentRoster.length} Players</td>
                  <td className="py-3 px-4 text-secondaryText">{team.minRoster} Players</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-md rounded-2xl p-6 border border-urgentRed/30 space-y-5 shadow-2xl">
            <h2 className="text-lg font-black text-white flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-urgentRedText" /> Confirm Event Reset</h2>
            <p className="text-sm text-secondaryText">
              This will reset the entire event lifecycle back to the <strong>SETUP</strong> phase.
              This is a destructive action and should only be used to start a new season.
              Are you absolutely sure you want to proceed?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowResetConfirm(false)} className="flex-1 py-2.5 border border-borderStrong text-secondaryText hover:bg-surfaceHover rounded-xl text-xs font-semibold transition">
                Cancel
              </button>
              <button
                onClick={executeReset}
                disabled={resetting}
                className="flex-1 py-2.5 bg-urgentRed hover:bg-urgentRed text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
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
