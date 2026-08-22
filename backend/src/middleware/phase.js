import { getCurrentPhase } from '../services/phaseService.js';
import { evaluateRegistrationAccess } from '../services/registrationSchedule.js';

/*
 * ── Phase-gating middleware ───────────────────────────────────────────────────
 * Every protected write must check BOTH role (via authorize) AND the current
 * global event phase. A request that is role-valid but phase-invalid — e.g. a
 * Team Manager trying to bid while the phase is TOURNAMENT — must still be
 * rejected. We re-read the phase from the DB on every call (never trust a
 * client-supplied or cached phase).
 *
 * Usage:  router.post('/bid', protect, authorize('TEAM_MANAGER'), requirePhase('AUCTION'), placeBid)
 *
 * Returns 409 Conflict (the resource exists but the platform state forbids the
 * action right now) rather than 403, so clients can distinguish "you're the
 * wrong role" (403) from "wrong time" (409). SUPER_ADMIN is NOT auto-exempted:
 * phase is a global lifecycle invariant, not an ownership concern — if the admin
 * needs to act out of phase they advance the phase first.
 */
export const requirePhase = (...allowedPhases) => {
  return async (req, res, next) => {
    try {
      const phase = await getCurrentPhase();
      if (!allowedPhases.includes(phase)) {
        return res.status(409).json({
          success: false,
          message:
            `Action not permitted in the current event phase (${phase}). ` +
            `Allowed phase(s): ${allowedPhases.join(', ')}.`,
          currentPhase: phase,
          requiredPhases: allowedPhases,
        });
      }
      next();
    } catch (e) {
      next(e);
    }
  };
};

/*
 * ── requireRegistrationOpen — automatic registration window gate ─────────────
 * Server-side enforcement of the scheduled Player Registration window:
 * before startTime → blocked, at startTime → open, after endTime → blocked.
 * SUPER_ADMIN keeps an operational bypass (same as the controller-level check).
 */
export const requireRegistrationOpen = () => {
  return async (req, res, next) => {
    try {
      const access = await evaluateRegistrationAccess();
      if (access.isOpen || req.user?.role === 'SUPER_ADMIN') {
        return next();
      }
      return res.status(403).json({
        success: false,
        message: `Registration is currently closed. ${access.message}.`,
        registrationWindow: access.win,
        serverTime: new Date().toISOString(),
      });
    } catch (e) {
      next(e);
    }
  };
};
