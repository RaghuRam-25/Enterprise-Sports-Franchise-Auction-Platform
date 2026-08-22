import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useSocket } from './SocketContext';
import api from '../services/api';
import { msUntil } from '../utils/dhakaTime';

/*
 * ── PhaseContext ──────────────────────────────────────────────────────────────
 * Mirrors the backend's global event-phase state machine
 * (SETUP → REGISTRATION → AUCTION → TOURNAMENT) into React context.
 *
 * The phase is fetched once on mount (GET /api/phase, zero auth) and then kept
 * fresh via the `phase:changed` socket broadcast. It is NEVER treated as truth
 * for authorization — the backend re-verifies role + phase on every request.
 * This context is purely for rendering (which modules to show, whether to
 * disable a form) and for surfacing helpful "phase locked" states.
 */
const PHASES = ['SETUP', 'REGISTRATION', 'AUCTION', 'TOURNAMENT'];

const PhaseContext = createContext(null);
export const usePhase = () => useContext(PhaseContext);

export const PhaseProvider = ({ children }) => {
  const { socket } = useSocket();
  const [phase, setPhase] = useState(null); // null = still loading / unknown
  const [isLocked, setIsLocked] = useState(false);
  const [rosterSizing, setRosterSizing] = useState(null);

  // All multi-phase schedule timestamps
  const [registrationStartTime, setRegistrationStartTime] = useState(null);
  const [registrationEndTime, setRegistrationEndTime] = useState(null);
  const [auctionStartTime, setAuctionStartTime] = useState(null);
  const [auctionEndTime, setAuctionEndTime] = useState(null);
  const [tournamentStartTime, setTournamentStartTime] = useState(null);
  const [tournamentEndTime, setTournamentEndTime] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const applyPhasePayload = useCallback((payload) => {
    if (!payload) return;
    if (PHASES.includes(payload.phase)) {
      setPhase(payload.phase);
    }
    if (payload.rosterSizing) {
      setRosterSizing(payload.rosterSizing);
    }
    if (typeof payload.locked === 'boolean') {
      setIsLocked(payload.locked);
    }
    if (payload.registrationStartTime !== undefined) setRegistrationStartTime(payload.registrationStartTime || null);
    if (payload.registrationEndTime !== undefined) setRegistrationEndTime(payload.registrationEndTime || null);
    if (payload.auctionStartTime !== undefined) setAuctionStartTime(payload.auctionStartTime || null);
    if (payload.auctionEndTime !== undefined) setAuctionEndTime(payload.auctionEndTime || null);
    if (payload.tournamentStartTime !== undefined) setTournamentStartTime(payload.tournamentStartTime || null);
    if (payload.tournamentEndTime !== undefined) setTournamentEndTime(payload.tournamentEndTime || null);
  }, []);

  // Initial fetch (public endpoint, no auth needed)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/phase');
        if (!cancelled && res?.data) {
          applyPhasePayload(res.data);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          console.warn('[PhaseContext] Could not fetch event phase:', e?.message);
          setError(e?.message || 'Could not load event phase');
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [applyPhasePayload]);

  // Keep fresh in real time while connected
  useEffect(() => {
    if (!socket) return;
    const onChange = (payload) => {
      console.log('[PhaseContext] phase:changed', payload);
      applyPhasePayload(payload);
    };
    const onLockToggle = (payload) => {
      console.log('[PhaseContext] phase:lock-toggled', payload);
      if (typeof payload?.locked === 'boolean') {
        setIsLocked(payload.locked);
      }
    };
    const onScheduleChange = (payload) => {
      applyPhasePayload(payload);
    };

    socket.on('phase:changed', onChange);
    socket.on('phase:lock-toggled', onLockToggle);
    socket.on('phase:schedule-updated', onScheduleChange);
    socket.on('phase:auction-start-changed', onScheduleChange);

    return () => {
      socket.off('phase:changed', onChange);
      socket.off('phase:lock-toggled', onLockToggle);
      socket.off('phase:schedule-updated', onScheduleChange);
      socket.off('phase:auction-start-changed', onScheduleChange);
    };
  }, [socket, applyPhasePayload]);

  // Dynamic calculation for the next active schedule milestone
  // ── Automatic Registration Window (live, ticking) ───────────────────────────
  // Mirrors the backend's server-side rule: a configured start/end window is
  // authoritative — before start → CLOSED, at start → OPEN, after end → CLOSED.
  // A 1s ticker flips the state the moment times are reached without any
  // refresh; the backend still re-validates on every actual submission.
  const [nowTs, setNowTs] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const registrationWindow = useMemo(() => {
    const hasWindow = Boolean(registrationStartTime || registrationEndTime);
    const startMs = registrationStartTime ? new Date(registrationStartTime).getTime() : null;
    const endMs = registrationEndTime ? new Date(registrationEndTime).getTime() : null;
    const validStart = startMs != null && !isNaN(startMs);
    const validEnd = endMs != null && !isNaN(endMs);

    let state;
    let withinWindow;
    if (!validStart && !validEnd) {
      state = 'NOT_CONFIGURED';
      withinWindow = true;
    } else if (validStart && nowTs < startMs) {
      state = 'BEFORE_START';
      withinWindow = false;
    } else if (validEnd && nowTs > endMs) {
      state = 'AFTER_END';
      withinWindow = false;
    } else {
      state = 'OPEN';
      withinWindow = true;
    }

    return {
      hasWindow,
      state,
      withinWindow,
      startTime: registrationStartTime,
      endTime: registrationEndTime,
      msUntilStart: msUntil(registrationStartTime, nowTs),
      msUntilEnd: msUntil(registrationEndTime, nowTs),
    };
  }, [registrationStartTime, registrationEndTime, nowTs]);

  // Open ⇔ the scheduled window allows (PRD pure time rule when configured);
  // with no window set, legacy phase behaviour applies (SETUP/REGISTRATION).
  const isRegistrationOpen = useMemo(() => (
    registrationWindow.hasWindow
      ? registrationWindow.withinWindow
      : ['SETUP', 'REGISTRATION'].includes(phase)
  ), [phase, registrationWindow]);

  const getActiveScheduleMilestone = useCallback(() => {
    const now = Date.now();
    const milestones = [
      { key: 'registrationStartTime', label: 'REGISTRATION OPENS IN', time: registrationStartTime },
      { key: 'registrationEndTime', label: 'REGISTRATION CLOSES IN', time: registrationEndTime },
      { key: 'auctionStartTime', label: 'AUCTION STARTS IN', time: auctionStartTime },
      { key: 'auctionEndTime', label: 'AUCTION ENDS IN', time: auctionEndTime },
      { key: 'tournamentStartTime', label: 'TOURNAMENT STARTS IN', time: tournamentStartTime },
      { key: 'tournamentEndTime', label: 'TOURNAMENT ENDS IN', time: tournamentEndTime },
    ];

    for (const m of milestones) {
      if (m.time) {
        const ms = new Date(m.time).getTime();
        if (!isNaN(ms) && ms > now) {
          return { ...m, targetMs: ms };
        }
      }
    }
    return null;
  }, [registrationStartTime, registrationEndTime, auctionStartTime, auctionEndTime, tournamentStartTime, tournamentEndTime]);

  const value = {
    phase,
    phases: PHASES,
    loading,
    error,
    rosterSizing,
    isLocked,
    registrationStartTime,
    registrationEndTime,
    auctionStartTime,
    auctionEndTime,
    tournamentStartTime,
    tournamentEndTime,
    getActiveScheduleMilestone,
    registrationWindow,
    isRegistrationOpen,
    isAuctionActive: phase === 'AUCTION',
    isTournamentActive: phase === 'TOURNAMENT',
    phaseIndex: phase ? PHASES.indexOf(phase) : -1,
  };

  return <PhaseContext.Provider value={value}>{children}</PhaseContext.Provider>;
};

export default PhaseContext;
