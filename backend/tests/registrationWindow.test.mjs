/*
 * ── Automatic Registration Window Suite ───────────────────────────────────────
 *
 * Covers the Super-Admin-scheduled Player Registration window:
 *   before startTime → CLOSED · at startTime → OPEN · after endTime → CLOSED
 * plus the combined gate against the global event lifecycle phase.
 */
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

const {
  resolveRegistrationWindow,
  isRegistrationOpen,
} = await import('../src/services/registrationSchedule.js');

// Fixed "server clock" so results are deterministic forever.
const NOW = new Date('2026-08-23T16:00:00.000Z'); // 22:00 Asia/Dhaka

describe('§resolveRegistrationWindow — time-window evaluation', () => {
  const win = (start, end) => resolveRegistrationWindow({ startTime: start, endTime: end }, NOW);

  test('no times configured → NOT_CONFIGURED (legacy phase-only gating)', () => {
    const r = win(null, null);
    assert.equal(r.state, 'NOT_CONFIGURED');
    assert.equal(r.withinWindow, true);
  });

  test('PRD example: before 23 Aug 10:00 PM Dhaka → CLOSED', () => {
    // 10:00 PM Dhaka = 16:00 UTC · 9:59 PM Dhaka = 15:59 UTC
    const r = resolveRegistrationWindow(
      { startTime: '2026-08-23T22:00:00.000+06:00', endTime: '2026-08-30T23:59:00.000+06:00' },
      new Date('2026-08-23T15:59:00.000Z')
    );
    assert.equal(r.state, 'BEFORE_START');
    assert.equal(r.withinWindow, false);
  });

  test('PRD example: exactly at start instant → OPEN', () => {
    const r = resolveRegistrationWindow(
      { startTime: '2026-08-23T22:00:00.000+06:00', endTime: '2026-08-30T23:59:00.000+06:00' },
      new Date('2026-08-23T16:00:00.000Z')
    );
    assert.equal(r.state, 'OPEN');
    assert.equal(r.withinWindow, true);
  });

  test('within an active window → OPEN, msUntilEnd counts down', () => {
    const r = win('2026-08-20T00:00:00.000Z', '2026-08-30T00:00:00.000Z');
    assert.equal(r.state, 'OPEN');
    assert.equal(r.msUntilEnd > 0, true);
  });

  test('exactly at the end instant → still OPEN (inclusive close)', () => {
    const r = win('2026-08-20T00:00:00.000Z', '2026-08-23T16:00:00.000Z');
    assert.equal(r.state, 'OPEN');
  });

  test('PRD example: after 30 Aug 11:59 PM Dhaka → CLOSED', () => {
    // 30 Aug 11:59 PM Dhaka = 17:59 UTC · one minute later registration is shut
    const r = resolveRegistrationWindow(
      { startTime: '2026-08-23T22:00:00.000+06:00', endTime: '2026-08-30T23:59:00.000+06:00' },
      new Date('2026-08-30T18:00:00.000Z')
    );
    assert.equal(r.state, 'AFTER_END');
    assert.equal(r.withinWindow, false);
  });

  test('only an end time set → open until it passes', () => {
    assert.equal(win(null, '2026-08-30T00:00:00.000Z').state, 'OPEN');
    assert.equal(win(null, '2026-08-20T00:00:00.000Z').state, 'AFTER_END');
  });

  test('invalid timestamps are ignored safely', () => {
    const r = win('not-a-date', null);
    assert.equal(r.state, 'NOT_CONFIGURED');
  });
});

describe('§isRegistrationOpen — configured window is authoritative (pure time rule)', () => {
  const openWin = { state: 'OPEN', withinWindow: true };
  const beforeWin = { state: 'BEFORE_START', withinWindow: false };
  const afterWin = { state: 'AFTER_END', withinWindow: false };

  test('within the window → open in ANY phase (time alone decides)', () => {
    for (const p of ['SETUP', 'REGISTRATION', 'AUCTION', 'TOURNAMENT']) {
      assert.equal(isRegistrationOpen(p, openWin), true);
    }
  });

  test('outside the window → closed in ANY phase', () => {
    for (const p of ['SETUP', 'REGISTRATION', 'AUCTION', 'TOURNAMENT']) {
      assert.equal(isRegistrationOpen(p, beforeWin), false);
      assert.equal(isRegistrationOpen(p, afterWin), false);
    }
  });

  test('without a window, legacy phase behaviour applies', () => {
    const none = { state: 'NOT_CONFIGURED', withinWindow: true };
    assert.equal(isRegistrationOpen('SETUP', none), true);
    assert.equal(isRegistrationOpen('REGISTRATION', none), true);
    assert.equal(isRegistrationOpen('AUCTION', none), false);
  });
});
