import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSocket } from './SocketContext';
import api from '../services/api';

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
  const [rosterSizing, setRosterSizing] = useState(null);
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
    socket.on('phase:changed', onChange);
    return () => {
      socket.off('phase:changed', onChange);
    };
  }, [socket, applyPhasePayload]);

  const value = {
    phase,
    phases: PHASES,
    loading,
    error,
    rosterSizing,
    isRegistrationOpen: phase === 'REGISTRATION',
    isAuctionActive: phase === 'AUCTION',
    isTournamentActive: phase === 'TOURNAMENT',
    // index helpers for ordering/UI
    phaseIndex: phase ? PHASES.indexOf(phase) : -1,
  };

  return <PhaseContext.Provider value={value}>{children}</PhaseContext.Provider>;
};

export default PhaseContext;
