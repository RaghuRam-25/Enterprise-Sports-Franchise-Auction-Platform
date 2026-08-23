import {
  PHASES,
  getCurrentPhase,
  forceSetPhase,
  isRegistrationFrozen,
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

    const registrationStartTime = await getConfig('registration_start_time', null);
    const registrationEndTime = await getConfig('registration_end_time', null);
    const auctionStartTime = await getConfig('auction_start_time', null);
    const auctionEndTime = await getConfig('auction_end_time', null);
    const tournamentStartTime = await getConfig('tournament_start_time', null);
    const tournamentEndTime = await getConfig('tournament_end_time', null);

    res.json({
      success: true,
      data: {
        phase,
        phases: PHASES,
        isRegistrationOpen: phase === 'REGISTRATION',
        rosterSizing: minRosterSize != null ? { minRosterSize, maxRosterSize } : null,
        registrationStartTime,
        registrationEndTime,
        auctionStartTime,
        auctionEndTime,
        tournamentStartTime,
        tournamentEndTime,
      },
    });
  } catch (e) { next(e); }
};

// ── PATCH /api/phase/schedule — Super Admin only: update full multi-phase event schedule ──
export const setEventSchedule = async (req, res, next) => {
  try {
    const {
      registrationStartTime,
      registrationEndTime,
      auctionStartTime,
      auctionEndTime,
      tournamentStartTime,
      tournamentEndTime,
    } = req.body;
    const performedBy = req.user?.email || req.user?.name || 'super_admin';

    const parseDate = (val) => {
      if (val === null || val === '') return null;
      if (!val) return undefined;
      const d = new Date(val);
      return isNaN(d.getTime()) ? null : d.toISOString();
    };

    const schedule = {};
    if (registrationStartTime !== undefined) schedule.registrationStartTime = parseDate(registrationStartTime);
    if (registrationEndTime !== undefined) schedule.registrationEndTime = parseDate(registrationEndTime);
    if (auctionStartTime !== undefined) schedule.auctionStartTime = parseDate(auctionStartTime);
    if (auctionEndTime !== undefined) schedule.auctionEndTime = parseDate(auctionEndTime);
    if (tournamentStartTime !== undefined) schedule.tournamentStartTime = parseDate(tournamentStartTime);
    if (tournamentEndTime !== undefined) schedule.tournamentEndTime = parseDate(tournamentEndTime);

    const keyMap = {
      registrationStartTime: 'registration_start_time',
      registrationEndTime: 'registration_end_time',
      auctionStartTime: 'auction_start_time',
      auctionEndTime: 'auction_end_time',
      tournamentStartTime: 'tournament_start_time',
      tournamentEndTime: 'tournament_end_time',
    };

    for (const [prop, configKey] of Object.entries(keyMap)) {
      if (schedule[prop] !== undefined) {
        await setConfig(configKey, schedule[prop], performedBy);
      }
    }

    await logPhaseAction('EVENT_SCHEDULE_SET', performedBy, schedule);

    const currentSchedule = {
      registrationStartTime: await getConfig('registration_start_time', null),
      registrationEndTime: await getConfig('registration_end_time', null),
      auctionStartTime: await getConfig('auction_start_time', null),
      auctionEndTime: await getConfig('auction_end_time', null),
      tournamentStartTime: await getConfig('tournament_start_time', null),
      tournamentEndTime: await getConfig('tournament_end_time', null),
    };

    const io = req.app.get('io');
    if (io) {
      io.emit('phase:schedule-updated', currentSchedule);
      io.emit('phase:auction-start-changed', { auctionStartTime: currentSchedule.auctionStartTime });
    }

    return res.json({
      success: true,
      message: 'Event schedule updated successfully.',
      data: currentSchedule,
    });
  } catch (e) { next(e); }
};

// ── PATCH /api/phase/auction-start — Super Admin only: set/clear public auction start target ─────────
export const setAuctionStart = async (req, res, next) => {
  try {
    const { auctionStartTime } = req.body;
    const performedBy = req.user?.email || req.user?.name || 'super_admin';

    let normalized = null;
    if (auctionStartTime) {
      const d = new Date(auctionStartTime);
      if (isNaN(d.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid auction start time provided.',
        });
      }
      normalized = d.toISOString();
    }

    await setConfig('auction_start_time', normalized, performedBy);
    await logPhaseAction('AUCTION_SCHEDULE_SET', performedBy, { auctionStartTime: normalized });

    const io = req.app.get('io');
    if (io) {
      io.emit('phase:schedule-updated', { auctionStartTime: normalized });
      io.emit('phase:auction-start-changed', { auctionStartTime: normalized });
    }

    return res.json({
      success: true,
      message: normalized ? 'Auction start time scheduled successfully.' : 'Auction schedule cleared.',
      data: { auctionStartTime: normalized },
    });
  } catch (e) { next(e); }
};

// ── PATCH /api/phase — Super Admin only; supports forward/backward transition, lock & reset ─────────
export const setPhase = async (req, res, next) => {
  try {
    const { phase: target, action, lock } = req.body;

    const performedBy = req.user?.email || req.user?.name || 'super_admin';
    const currentPhase = await getCurrentPhase();

    // Check stage locking if attempting to change phase
    const isLocked = await getConfig('event_phase_locked', false);

    if (action === 'TOGGLE_LOCK') {
      const nextLockState = lock !== undefined ? Boolean(lock) : !isLocked;
      await setConfig('event_phase_locked', nextLockState, performedBy);

      const io = req.app.get('io');
      if (io) {
        io.emit('phase:lock-toggled', { locked: nextLockState, phase: currentPhase });
      }

      return res.json({
        success: true,
        message: `Stage ${currentPhase} ${nextLockState ? 'LOCKED' : 'UNLOCKED'} successfully.`,
        data: { phase: currentPhase, locked: nextLockState }
      });
    }

    if (isLocked && target && target !== currentPhase) {
      return res.status(423).json({
        success: false,
        message: `Stage '${currentPhase}' is currently LOCKED. Unlock it before changing stages.`,
        currentPhase,
        locked: true
      });
    }

    if (target) {
      if (!PHASES.includes(target)) {
        return res.status(400).json({
          success: false,
          message: `Invalid target phase '${target}'. Must be one of: ${PHASES.join(', ')}`,
        });
      }

      if (target === currentPhase) {
        return res.status(409).json({
          success: false,
          message: `Already in ${target} phase`,
          currentPhase,
        });
      }

      // SUPER_ADMIN free navigation: jump to any stage (forward, backward, or
      // skipping ahead) via forceSetPhase, so the admin can re-enable e.g.
      // REGISTRATION at any time. Every transition is still audited below.
      const from = currentPhase;
      await forceSetPhase(target, performedBy);

      // ── Side-effect: freeze registration & size rosters on entering AUCTION ──
      let rosterSizing = null;
      if (target === 'AUCTION') {
        rosterSizing = await computeAndStoreRosterSizes(performedBy);
      }

      await logPhaseAction('PHASE_TRANSITION', performedBy, {
        from,
        to: target,
        rosterSizing,
        action: action || 'FREE_NAVIGATION'
      });

      // Broadcast so every connected client re-renders
      const io = req.app.get('io');
      if (io) {
        io.emit('phase:changed', { phase: target, rosterSizing, locked: isLocked });

        // GAP FIX: the frontend (AuctionContext) listens for
        // 'registration:freeze-toggled' with { isRegistrationFrozen } but the
        // backend never emitted it — registration freeze state changes were
        // only inferable from phase:changed. Emit it explicitly whenever the
        // transition enters or leaves the REGISTRATION stage.
        if (target === 'REGISTRATION' || target === 'AUCTION' || target === 'TOURNAMENT') {
          const isRegistrationFrozenNow = await isRegistrationFrozen();
          io.emit('registration:freeze-toggled', { isRegistrationFrozen: isRegistrationFrozenNow });
        }
      }

      return res.json({
        success: true,
        message: `Phase changed ${from} → ${target}`,
        data: { phase: target, rosterSizing, locked: isLocked },
      });
    }

    return res.status(400).json({ success: false, message: 'No target phase or action provided.' });
  } catch (e) { next(e); }
};

