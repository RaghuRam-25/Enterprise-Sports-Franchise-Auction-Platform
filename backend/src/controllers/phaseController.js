import {
  PHASES,
  getCurrentPhase,
  transitionPhase,
} from '../services/phaseService.js';
import { Player } from '../models/Player.js';
import { Team } from '../models/Team.js';
import { AuditLog } from '../models/AuditLog.js';
import { setConfig, getConfig } from '../models/SystemConfig.js';

const logPhaseAction = async (action, performedBy, details) => {
  try {
    await AuditLog.create({ action, performedBy, details });
  } catch (_) { /* silent */ }
};

// Player statuses that count as a "confirmed registration" for roster sizing.
// WITHDRAWN / BANNED players do not get a squad slot.
const ACTIVE_REG_STATUSES = ['REGISTERED', 'APPROVED', 'UNSOLD', 'ON_PODIUM', 'SOLD'];

/*
 * ── Dynamic min/max roster sizing (Section 9.2) ───────────────────────────────
 * Computed ONCE, at the moment registration freezes (REGISTRATION → AUCTION),
 * from the final registration counts — never a hardcoded 11/15, never
 * recalculated live during bidding.
 *
 *   baseSize  = floor(totalRegisteredPlayers / totalTeams)
 *   remainder = totalRegisteredPlayers % totalTeams
 *   min = baseSize
 *   max = baseSize + 1  (if remainder > 0)  else baseSize
 *
 * Only `remainder` teams will actually reach max, but every team is shown the
 * same min–max range. Stored both as event-level config (for display) and
 * written identically onto every Team so the reserve formula can read it.
 */
export const computeAndStoreRosterSizes = async (performedBy = 'system') => {
  const totalRegisteredPlayers = await Player.countDocuments({
    status: { $in: ACTIVE_REG_STATUSES },
  });
  const totalTeams = await Team.countDocuments();

  if (totalTeams === 0) {
    // Nothing to size against yet — leave existing team defaults untouched.
    return { totalRegisteredPlayers, totalTeams, minRosterSize: 0, maxRosterSize: 0 };
  }

  const baseSize = Math.floor(totalRegisteredPlayers / totalTeams);
  const remainder = totalRegisteredPlayers % totalTeams;
  const minRosterSize = baseSize;
  const maxRosterSize = remainder > 0 ? baseSize + 1 : baseSize;

  // Persist at event level (single source of truth for display + reserve calc).
  await setConfig('minRosterSize', minRosterSize, performedBy);
  await setConfig('maxRosterSize', maxRosterSize, performedBy);

  // Mirror onto every team so existing per-team reads keep working.
  await Team.updateMany({}, { $set: { minRoster: minRosterSize, maxRoster: maxRosterSize } });

  return { totalRegisteredPlayers, totalTeams, baseSize, remainder, minRosterSize, maxRosterSize };
};

// ── GET /api/phase — public, zero auth (spectators / landing page read this) ──
export const getPhase = async (req, res, next) => {
  try {
    const phase = await getCurrentPhase();
    const minRosterSize = await getConfig('minRosterSize', null);
    const maxRosterSize = await getConfig('maxRosterSize', null);
    res.json({
      success: true,
      data: {
        phase,
        phases: PHASES,
        // registration is only "open" while phase === REGISTRATION
        isRegistrationOpen: phase === 'REGISTRATION',
        rosterSizing: minRosterSize != null ? { minRosterSize, maxRosterSize } : null,
      },
    });
  } catch (e) { next(e); }
};

// ── PATCH /api/phase — Super Admin only; validated forward transition ─────────
export const setPhase = async (req, res, next) => {
  try {
    const { phase: target } = req.body;
    if (!PHASES.includes(target)) {
      return res.status(400).json({
        success: false,
        message: `Invalid target phase '${target}'. Must be one of: ${PHASES.join(', ')}`,
      });
    }

    const performedBy = req.user?.email || req.user?.name || 'super_admin';
    const result = await transitionPhase(target, performedBy);

    if (!result.ok) {
      // 409: legal-role request, but the state machine forbids this move now.
      return res.status(409).json({ success: false, message: result.message, currentPhase: result.phase });
    }

    // ── Side-effect: freeze registration & size rosters on entering AUCTION ──
    let rosterSizing = null;
    if (result.from === 'REGISTRATION' && result.phase === 'AUCTION') {
      rosterSizing = await computeAndStoreRosterSizes(performedBy);
    }

    await logPhaseAction('PHASE_TRANSITION', performedBy, {
      from: result.from,
      to: result.phase,
      rosterSizing,
    });

    // Broadcast so every connected client (dashboards, landing, live views)
    // re-renders to the new phase without polling.
    const io = req.app.get('io');
    if (io) {
      io.emit('phase:changed', { phase: result.phase, rosterSizing });
    }

    res.json({
      success: true,
      message: result.message,
      data: { phase: result.phase, rosterSizing },
    });
  } catch (e) { next(e); }
};
