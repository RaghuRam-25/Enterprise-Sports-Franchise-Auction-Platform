import { getConfig, setConfig } from '../models/SystemConfig.js';

/*
 * ── Global Event Phase State Machine ──────────────────────────────────────────
 * Single source-of-truth for the whole platform lifecycle. Persisted as one row
 * in SystemConfig under the key `event_phase` (never per-user, never cached
 * client-side as truth — always re-read server-side before gating a write).
 *
 *   SETUP → REGISTRATION → AUCTION → TOURNAMENT
 *
 * The Nuke/reset protocol (Section 5) is the only path back to SETUP.
 */

export const PHASES = ['SETUP', 'REGISTRATION', 'AUCTION', 'TOURNAMENT'];
export const PHASE_CONFIG_KEY = 'event_phase';
const DEFAULT_PHASE = 'SETUP';

// Legal forward transitions. Reset-to-SETUP is intentionally NOT here — it is
// performed only by the Nuke protocol via forceSetPhase(), not the normal
// admin transition endpoint, so a season can't be silently rewound mid-flight.
const LEGAL_TRANSITIONS = {
  SETUP:        ['REGISTRATION'],
  REGISTRATION: ['AUCTION'],
  AUCTION:      ['TOURNAMENT'],
  TOURNAMENT:   [],
};

// ── Read the current phase (defaults to SETUP if never set) ───────────────────
export const getCurrentPhase = async () => {
  const phase = await getConfig(PHASE_CONFIG_KEY, DEFAULT_PHASE);
  return PHASES.includes(phase) ? phase : DEFAULT_PHASE;
};

// ── Is a transition from → to allowed by the state machine? ───────────────────
export const isLegalTransition = (from, to) => {
  if (!PHASES.includes(to)) return false;
  return (LEGAL_TRANSITIONS[from] || []).includes(to);
};

// ── Perform a phase transition (forward or backward) ───────
export const transitionPhase = async (to, updatedBy = 'system') => {
  const from = await getCurrentPhase();
  if (from === to) {
    return { ok: false, phase: from, message: `Already in ${to} phase` };
  }
  if (!PHASES.includes(to)) {
    return {
      ok: false,
      phase: from,
      message: `Invalid target phase: ${to}`,
    };
  }
  await setConfig(PHASE_CONFIG_KEY, to, updatedBy);
  return { ok: true, phase: to, from, message: `Phase changed ${from} → ${to}` };
};


// ── Force-set phase, bypassing transition rules (Nuke reset → SETUP only) ──────
export const forceSetPhase = async (to, updatedBy = 'system') => {
  if (!PHASES.includes(to)) throw new Error(`Invalid phase: ${to}`);
  await setConfig(PHASE_CONFIG_KEY, to, updatedBy);
  return to;
};

/*
 * ── Legacy compatibility shim ─────────────────────────────────────────────────
 * The pre-existing code gates registration writes on a boolean
 * `isRegistrationFrozen`. Rather than rip that out (and risk destabilising the
 * working registration/auction flow), we DERIVE it from the phase:
 * registration is "open" only while the phase is REGISTRATION. Any other phase
 * (SETUP before it opens, AUCTION/TOURNAMENT after it closes) reads as frozen.
 *
 * This lets existing freeze checks keep passing while the phase machine becomes
 * the real source of truth. New code should prefer getCurrentPhase()/requirePhase.
 */
export const isRegistrationFrozen = async () => {
  const phase = await getCurrentPhase();
  return phase !== 'REGISTRATION';
};
