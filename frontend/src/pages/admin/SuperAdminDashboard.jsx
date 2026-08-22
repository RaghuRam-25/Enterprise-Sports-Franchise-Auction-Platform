import { useState, useEffect } from 'react';
import { Users, User, ShieldCheck, Trophy, Lock, DollarSign, Settings, Loader, RotateCcw, AlertTriangle, CalendarClock, Wallet, Coins } from 'lucide-react';
import { useAuction } from '../../context/AuctionContext';
import { usePhase } from '../../context/PhaseContext';
import TeamBadge from '../../components/common/TeamBadge';
import TeamDetailModal from '../../components/common/TeamDetailModal';
import AutoFitText from '../../components/common/AutoFitText';
import { getTeamTheme } from '../../utils/themeConfig';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { isoToDhakaPicker, toDhakaIso } from '../../utils/dhakaTime';

// Visual label per phase for the control stepper
const PHASE_META = {
  SETUP: { label: 'Setup' },
  REGISTRATION: { label: 'Registration' },
  AUCTION: { label: 'Auction' },
  TOURNAMENT: { label: 'Tournament' },
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

  // ── Multi-phase Event Schedule Management ──────────────────────────────────
  const {
    phase, phases, loading: phaseLoading, isLocked,
    registrationStartTime, registrationEndTime,
    auctionStartTime, auctionEndTime,
    tournamentStartTime, tournamentEndTime,
  } = usePhase();

  const [activeSection, setActiveSection] = useState('SETUP'); // Top nav section: Setup | Registration | Auction | Results
  const [transitioning, setTransitioning] = useState(false);
  const [togglingLock, setTogglingLock] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);

  // Form input states for datetime-local
  const [schedules, setSchedules] = useState({
    registrationStartTime: '',
    registrationEndTime: '',
    auctionStartTime: '',
    auctionEndTime: '',
    tournamentStartTime: '',
    tournamentEndTime: '',
  });
  const [savingSchedule, setSavingSchedule] = useState(false);

  // datetime-local pickers display Asia/Dhaka wall-clock; stored values stay
  // absolute UTC ISO instants (converted at the edges via dhakaTime helpers).
  const formatForPicker = (isoStr) => isoToDhakaPicker(isoStr);

  useEffect(() => {
    setSchedules({
      registrationStartTime: formatForPicker(registrationStartTime),
      registrationEndTime: formatForPicker(registrationEndTime),
      auctionStartTime: formatForPicker(auctionStartTime),
      auctionEndTime: formatForPicker(auctionEndTime),
      tournamentStartTime: formatForPicker(tournamentStartTime),
      tournamentEndTime: formatForPicker(tournamentEndTime),
    });
  }, [registrationStartTime, registrationEndTime, auctionStartTime, auctionEndTime, tournamentStartTime, tournamentEndTime]);

  const saveAllSchedules = async () => {
    setSavingSchedule(true);
    try {
      const payload = {
        registrationStartTime: toDhakaIso(schedules.registrationStartTime),
        registrationEndTime: toDhakaIso(schedules.registrationEndTime),
        auctionStartTime: toDhakaIso(schedules.auctionStartTime),
        auctionEndTime: toDhakaIso(schedules.auctionEndTime),
        tournamentStartTime: toDhakaIso(schedules.tournamentStartTime),
        tournamentEndTime: toDhakaIso(schedules.tournamentEndTime),
      };
      const res = await api.patch('/phase/schedule', payload);
      triggerToast(res?.data?.message || res?.message || 'Event schedule updated successfully.', 'success');
    } catch (err) {
      triggerToast(err?.response?.data?.message || 'Failed to update event schedule.', 'error');
    } finally {
      setSavingSchedule(false);
    }
  };

  const clearScheduleKey = async (key) => {
    setSavingSchedule(true);
    try {
      const payload = { [key]: null };
      await api.patch('/phase/schedule', payload);
      triggerToast('Schedule milestone cleared.', 'info');
    } catch (err) {
      triggerToast('Failed to clear schedule.', 'error');
    } finally {
      setSavingSchedule(false);
    }
  };

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

        {/* ── Multi-Phase Event Schedule Manager ── */}
        <div className="mt-4 border-t border-cardBorder/80 pt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <CalendarClock className="w-5 h-5 text-warningGold flex-shrink-0" />
              <div>
                <h4 className="text-xs font-black text-white uppercase tracking-wider">Multi-Phase Event Schedule Manager</h4>
              </div>
            </div>
            <button
              onClick={saveAllSchedules}
              disabled={savingSchedule}
              className="btn-primary px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 disabled:opacity-40"
            >
              {savingSchedule ? <Loader className="w-3.5 h-3.5 animate-spin" /> : null}
              Save All Schedules
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Registration Phase */}
            <div className="bg-darkBg/60 border border-cardBorder/80 p-3.5 rounded-2xl space-y-3">
              <div className="flex items-center justify-between border-b border-cardBorder/60 pb-2">
                <span className="text-xs font-black text-neonGreen uppercase tracking-wider">1. Registration</span>
              </div>
              <div className="space-y-2">
                <div>
                  <label className="text-[10px] font-bold text-secondaryText uppercase block mb-1">Registration Open</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="datetime-local"
                      value={schedules.registrationStartTime}
                      onChange={(e) => setSchedules({ ...schedules, registrationStartTime: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-surfaceHover border border-borderStrong text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-neonGreen/40 [color-scheme:dark]"
                    />
                    {registrationStartTime && (
                      <button onClick={() => clearScheduleKey('registrationStartTime')} className="text-red-400 hover:text-red-300 text-xs px-1 font-bold">×</button>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-secondaryText uppercase block mb-1">Registration Close</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="datetime-local"
                      value={schedules.registrationEndTime}
                      onChange={(e) => setSchedules({ ...schedules, registrationEndTime: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-surfaceHover border border-borderStrong text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-neonGreen/40 [color-scheme:dark]"
                    />
                    {registrationEndTime && (
                      <button onClick={() => clearScheduleKey('registrationEndTime')} className="text-red-400 hover:text-red-300 text-xs px-1 font-bold">×</button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Auction Phase */}
            <div className="bg-darkBg/60 border border-cardBorder/80 p-3.5 rounded-2xl space-y-3">
              <div className="flex items-center justify-between border-b border-cardBorder/60 pb-2">
                <span className="text-xs font-black text-warningGold uppercase tracking-wider">2. Live Auction</span>
              </div>
              <div className="space-y-2">
                <div>
                  <label className="text-[10px] font-bold text-secondaryText uppercase block mb-1">Auction Start</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="datetime-local"
                      value={schedules.auctionStartTime}
                      onChange={(e) => setSchedules({ ...schedules, auctionStartTime: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-surfaceHover border border-borderStrong text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-warningGold/40 [color-scheme:dark]"
                    />
                    {auctionStartTime && (
                      <button onClick={() => clearScheduleKey('auctionStartTime')} className="text-red-400 hover:text-red-300 text-xs px-1 font-bold">×</button>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-secondaryText uppercase block mb-1">Auction End</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="datetime-local"
                      value={schedules.auctionEndTime}
                      onChange={(e) => setSchedules({ ...schedules, auctionEndTime: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-surfaceHover border border-borderStrong text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-warningGold/40 [color-scheme:dark]"
                    />
                    {auctionEndTime && (
                      <button onClick={() => clearScheduleKey('auctionEndTime')} className="text-red-400 hover:text-red-300 text-xs px-1 font-bold">×</button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Tournament Phase */}
            <div className="bg-darkBg/60 border border-cardBorder/80 p-3.5 rounded-2xl space-y-3">
              <div className="flex items-center justify-between border-b border-cardBorder/60 pb-2">
                <span className="text-xs font-black text-cyan-400 uppercase tracking-wider">3. Tournament</span>
              </div>
              <div className="space-y-2">
                <div>
                  <label className="text-[10px] font-bold text-secondaryText uppercase block mb-1">Tournament Start</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="datetime-local"
                      value={schedules.tournamentStartTime}
                      onChange={(e) => setSchedules({ ...schedules, tournamentStartTime: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-surfaceHover border border-borderStrong text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-cyan-400/40 [color-scheme:dark]"
                    />
                    {tournamentStartTime && (
                      <button onClick={() => clearScheduleKey('tournamentStartTime')} className="text-red-400 hover:text-red-300 text-xs px-1 font-bold">×</button>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-secondaryText uppercase block mb-1">Tournament End</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="datetime-local"
                      value={schedules.tournamentEndTime}
                      onChange={(e) => setSchedules({ ...schedules, tournamentEndTime: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-surfaceHover border border-borderStrong text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-cyan-400/40 [color-scheme:dark]"
                    />
                    {tournamentEndTime && (
                      <button onClick={() => clearScheduleKey('tournamentEndTime')} className="text-red-400 hover:text-red-300 text-xs px-1 font-bold">×</button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card rounded-2xl p-5 border border-cardBorder relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-secondaryText uppercase">Total Registrations</p>
              <h3 className="text-2xl font-black text-white mt-1">{totalRegistered}</h3>
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
              <div className="mt-1 max-w-[220px]">
                <AutoFitText className="font-black font-mono text-white">{formatCurrency(totalPurse)}</AutoFitText>
              </div>
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
            </div>
            <div className="p-3 bg-warningGold/10 text-warningGold rounded-xl border border-warningGold/20">
              <Settings className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Franchise Team Summary */}
      <div className="glass-card rounded-2xl p-6 border border-cardBorder space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-secondaryText flex items-center gap-2">
              <Trophy className="w-4 h-4 text-warningGold" /> Active Franchises
            </h3>
          </div>
          <Link
            to="/admin/teams"
            className="text-xs text-neonGreen hover:text-neonGreenHover font-semibold flex items-center gap-1"
          >
            Manage Teams &rarr;
          </Link>
        </div>

        {teams.length === 0 ? (
          <div className="py-10 text-center text-xs text-mutedText border border-dashed border-borderStrong rounded-xl">
            No franchises yet. Add teams from Manage Teams.
          </div>
        ) : (
          <div className="grid gap-2.5">
            {teams.map(team => {
              const rosterCount = Array.isArray(team.currentRoster)
                ? team.currentRoster.length
                : (Number(team.currentRosterCount ?? team.currentRoster) || 0);
              const minRoster = Number(team.minRoster) || 0;
              const rosterPct = minRoster > 0 ? Math.min(100, Math.round((rosterCount / minRoster) * 100)) : 0;
              const spentPct = team.totalBudget > 0
                ? Math.max(0, Math.min(100, Math.round(((team.totalBudget - (team.remainingBudget || 0)) / team.totalBudget) * 100)))
                : 0;
              const rosterComplete = minRoster > 0 && rosterCount >= minRoster;
              const brandColor = getTeamTheme(team)?.primaryColor || '#58D20A';

              return (
                <div
                  key={team.id || team._id}
                  onClick={() => setSelectedTeam(team)}
                  className="group relative flex flex-wrap items-center gap-x-4 gap-y-3 p-3 pl-4 sm:p-4 sm:pl-5 rounded-xl bg-cardBg/50 border border-cardBorder hover:border-neonGreen/25 hover:bg-surfaceHover/10 transition-all duration-200 overflow-hidden cursor-pointer"
                >
                  <div
                    className="absolute left-0 inset-y-0 w-[3px] opacity-80 group-hover:opacity-100 transition-opacity"
                    style={{ background: `linear-gradient(180deg, ${brandColor}, transparent)` }}
                  />

                  <TeamBadge team={team} size="md" showName={false} className="shrink-0" />

                  <div className="min-w-0 flex-1 basis-[180px]">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-white truncate group-hover:text-neonGreen transition-colors">
                        {team.name}
                      </p>
                      {(team.shortCode || team.code) && (
                        <span className="hidden sm:inline-flex font-mono text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-surfaceHover text-secondaryText border border-borderStrong">
                          {team.shortCode || team.code}
                        </span>
                      )}
                    </div>
                    <div className="mt-2.5 flex items-center gap-2 max-w-[240px]">
                      <Users className={`w-3.5 h-3.5 shrink-0 ${rosterComplete ? 'text-successGreen' : 'text-mutedText'}`} />
                      <div className="h-1.5 w-full bg-darkBg/80 border border-cardBorder/60 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${rosterComplete ? 'bg-successGreen' : rosterPct >= 50 ? 'bg-neonGreen' : 'bg-warningGold'}`}
                          style={{ width: `${Math.max(rosterPct, 6)}%` }}
                        />
                      </div>
                      <span className="font-mono text-xs shrink-0">
                        <span className={`font-bold ${rosterComplete ? 'text-successGreen' : 'text-white'}`}>{rosterCount}</span>
                        <span className="text-mutedText">/{minRoster || '–'}</span>
                        <span className="ml-1 font-sans text-[10px] font-medium text-mutedText">Players</span>
                      </span>
                    </div>
                  </div>

                  {(team.managerId?.name || team.ownerName) ? (
                    <div className="hidden lg:flex items-center gap-2.5 px-3 py-2 rounded-lg bg-darkBg/60 border border-cardBorder shrink-0">
                      <div className="p-1.5 rounded-md bg-warningGold/10 text-warningGold shrink-0">
                        <User className="w-3.5 h-3.5" />
                      </div>
                      <div className="leading-tight">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-mutedText">Manager</p>
                        <p className="text-xs font-semibold text-white truncate max-w-[120px] mt-0.5">{team.managerId?.name || team.ownerName}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-borderStrong/70 text-mutedText/70 shrink-0">
                      <User className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-semibold">Unassigned</span>
                    </div>
                  )}

                  <div className="flex items-stretch gap-2 sm:gap-2.5 ml-auto">
                    <div className="hidden md:flex items-center gap-2.5 px-3 py-2 rounded-lg bg-darkBg/60 border border-cardBorder">
                      <div className="p-1.5 rounded-md bg-secondaryText/10 text-secondaryText shrink-0">
                        <Wallet className="w-3.5 h-3.5" />
                      </div>
                      <div className="leading-tight">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-mutedText">Initial Purse</p>
                        <p className="font-mono text-xs text-secondaryText mt-0.5">{formatCurrency(team.totalBudget)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-neonGreen/[0.06] border border-neonGreen/20 group-hover:border-neonGreen/30 transition-colors">
                      <div className="p-1.5 rounded-md bg-neonGreen/15 text-neonGreen shrink-0">
                        <Coins className="w-3.5 h-3.5" />
                      </div>
                      <div className="leading-tight">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-mutedText">Remaining Purse</p>
                        <p className="font-mono text-xs sm:text-sm font-bold text-neonGreen mt-0.5">{formatCurrency(team.remainingBudget)}</p>
                        <div className="mt-1 flex items-center gap-1.5">
                          <div className="h-0.5 w-16 bg-surfaceHover rounded-full overflow-hidden">
                            <div
                              className="h-full bg-warningGold/90 rounded-full transition-all duration-500"
                              style={{ width: `${Math.max(spentPct, 2)}%` }}
                            />
                          </div>
                          <span className="text-[9px] font-semibold text-mutedText">{spentPct}% spent</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedTeam && (
        <TeamDetailModal
          team={selectedTeam}
          onClose={() => setSelectedTeam(null)}
          players={players}
          formatCurrency={formatCurrency}
        />
      )}

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
