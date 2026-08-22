import { getConfig } from '../models/SystemConfig.js';
import { getCurrentPhase } from './phaseService.js';

/*
 * ── Automatic Player Registration Schedule ────────────────────────────────────
 *
 * Super Admin sets a registration window (SystemConfig keys
 * `registration_start_time` / `registration_end_time`, stored as UTC ISO).
 * The window then drives registration open/close AUTOMATICALLY — no manual
 * phase flip required at the start moment:
 *
 *   before startTime          → CLOSED
 *   startTime ≤ now ≤ endTime → OPEN
 *   after endTime (if set)    → CLOSED
 *   no times configured       → legacy behaviour (SETUP/REGISTRATION phases)
 *
 * All comparisons use absolute UTC instants, so the schedule is timezone-safe;
 * the UI presents the timestamps in Asia/Dhaka (UTC+6, no DST).
 */

// Phases in which registration writes are conceptually possible. The global
// event phase remains an upper bound: once AUCTION begins, rosters are sized
// and registration stays closed even if an end time is still in the future.
export const REGISTRATION_ELIGIBLE_PHASES = ['SETUP', 'REGISTRATION'];

export const CONFIG_KEYS = {
  START: 'registration_start_time',
  END: 'registration_end_time',
};

/** Raw configured window straight from SystemConfig. */
export const getRegistrationSchedule = async () => {
  const [startTime, endTime] = await Promise.all([
    getConfig(CONFIG_KEYS.START, null),
    getConfig(CONFIG_KEYS.END, null),
  ]);
  return { startTime, endTime };
};

/**
 * Pure resolver — evaluates the window against a moment in time.
 * @returns {{
 *   startTime: string|null, endTime: string|null, now: string,
 *   state: 'NOT_CONFIGURED'|'BEFORE_START'|'OPEN'|'AFTER_END',
 *   withinWindow: boolean,
 *   msUntilStart: number, msUntilEnd: number
 * }}
 */
export const resolveRegistrationWindow = ({ startTime, endTime } = {}, now = new Date()) => {
  const t = now.getTime();
  const startMs = startTime ? new Date(startTime).getTime() : null;
  const endMs = endTime ? new Date(endTime).getTime() : null;
  const validStart = startMs != null && !isNaN(startMs);
  const validEnd = endMs != null && !isNaN(endMs);

  let state;
  let withinWindow;
  if (!validStart && !validEnd) {
    state = 'NOT_CONFIGURED';
    withinWindow = true; // no window configured → fall back to phase gating
  } else if (validStart && t < startMs) {
    state = 'BEFORE_START';
    withinWindow = false;
  } else if (validEnd && t > endMs) {
    state = 'AFTER_END';
    withinWindow = false;
  } else {
    state = 'OPEN';
    withinWindow = true;
  }

  return {
    startTime: validStart ? new Date(startMs).toISOString() : null,
    endTime: validEnd ? new Date(endMs).toISOString() : null,
    now: new Date(t).toISOString(),
    state,
    withinWindow,
    msUntilStart: validStart && t < startMs ? startMs - t : 0,
    msUntilEnd: validEnd && t <= endMs ? endMs - t : 0,
  };
};

/**
 * Combined server-side gate used by every registration write path.
 * PRD rule — a CONFIGURED window is fully AUTHORITATIVE (pure time check):
 *
 *   IF currentTime >= startTime AND currentTime <= endTime → Allowed
 *   ELSE → Blocked
 *
 * Only when NO window is configured do we fall back to the legacy lifecycle
 * phase behaviour (SETUP/REGISTRATION phases permit registration writes).
 */
export const isRegistrationOpen = (phase, win) => {
  if (win && win.state !== 'NOT_CONFIGURED') {
    return Boolean(win.withinWindow);
  }
  return REGISTRATION_ELIGIBLE_PHASES.includes(phase);
};

/** Human-readable reason for the current closed/open state. */
export const describeWindowState = (win) => {
  switch (win?.state) {
    case 'BEFORE_START':
      return `Registration opens on ${win.startTime}`;
    case 'AFTER_END':
      return `Registration closed on ${win.endTime}`;
    case 'OPEN':
      return win.endTime ? `Registration is open until ${win.endTime}` : 'Registration is open';
    default:
      return 'No registration window configured';
  }
};

/**
 * Convenience resolver for controllers/middleware — fetches config and
 * evaluates against the server clock in one call.
 */
export const evaluateRegistrationAccess = async () => {
  const [phase, schedule] = await Promise.all([getCurrentPhase(), getRegistrationSchedule()]);
  const win = resolveRegistrationWindow(schedule);
  return {
    phase,
    win,
    isOpen: isRegistrationOpen(phase, win),
    message: describeWindowState(win),
  };
};
