/*
 * ── RBAC + Phase-Gate Regression Suite (deterministic, no DB required) ─────────
 *
 * Covers Milestone 1's two core invariants:
 *   1. RBAC allow-lists (authorize / authorizeOwn) — strict allow-list, never
 *      deny-list; row-level ownership; SUPER_ADMIN bypass on ownership only.
 *   2. The global event-phase state machine (SETUP → REGISTRATION → AUCTION →
 *      TOURNAMENT), the requirePhase gate (409 on wrong phase), and
 *      transitionPhase legality.
 *
 * Run:  npm run test   (uses --experimental-test-module-mocks)
 *
 * The SystemConfig persistence layer is mocked ONCE at module scope with a shared
 * mutable `store`, so the whole suite runs without a live MongoDB. Regression
 * targets called out in the spec (no role must resolve to Super Admin) are
 * asserted directly.
 */
import { test, mock, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const { auctionEngine } = await import('../src/services/auctionEngine.js');
const { timerService } = await import('../src/services/timerService.js');

// ── Shared in-memory config store standing in for the SystemConfig collection ──
const store = { event_phase: 'SETUP' };

// Mock BEFORE importing anything that (transitively) pulls in SystemConfig, and
// only once — node:test forbids re-mocking the same specifier.
mock.module('../src/models/SystemConfig.js', {
  exports: {
    getConfig: async (key, dflt) => (key in store ? store[key] : dflt),
    setConfig: async (key, value, updatedBy = 'system') => {
      store[key] = value;
      return { key, value, updatedBy };
    },
    SystemConfig: {},
  },
});

// Imports resolve against the mock above. auth.js has no SystemConfig dependency
// but is imported here for co-location.
const { authorize, authorizeOwn, ROLES } = await import('../src/middleware/auth.js');
const { isLegalTransition, transitionPhase, getCurrentPhase, PHASES } =
  await import('../src/services/phaseService.js');
const { requirePhase } = await import('../src/middleware/phase.js');

// ── Minimal Express req/res/next test doubles ─────────────────────────────────
function makeRes() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
}
function makeNext() {
  const fn = (...args) => { fn.called = true; fn.args = args; };
  fn.called = false;
  return fn;
}

// ══════════════════════════════════════════════════════════════════════════════
describe('RBAC — authorize() strict allow-list', () => {
  test('permits a role that is in the allow-list', () => {
    const res = makeRes();
    const next = makeNext();
    authorize('SUPER_ADMIN', 'PODIUM_ADMIN')({ user: { role: 'PODIUM_ADMIN' } }, res, next);
    assert.equal(next.called, true);
    assert.equal(res.statusCode, 200);
  });

  test('rejects a role NOT in the allow-list with 403', () => {
    const res = makeRes();
    const next = makeNext();
    authorize('SUPER_ADMIN')({ user: { role: 'TEAM_MANAGER' } }, res, next);
    assert.equal(next.called, false);
    assert.equal(res.statusCode, 403);
    assert.equal(res.body.success, false);
  });

  test('rejects an unauthenticated request (no req.user) with 403', () => {
    const res = makeRes();
    const next = makeNext();
    authorize('PLAYER')({}, res, next);
    assert.equal(next.called, false);
    assert.equal(res.statusCode, 403);
  });

  // Regression: "every role resolving to Super Admin after login." A Super-Admin
  // -only gate must reject every OTHER role. If any non-admin slips through, the
  // login-role bug has regressed.
  test('REGRESSION: only SUPER_ADMIN passes a SUPER_ADMIN-only gate', () => {
    for (const role of ROLES) {
      const res = makeRes();
      const next = makeNext();
      authorize('SUPER_ADMIN')({ user: { role } }, res, next);
      if (role === 'SUPER_ADMIN') {
        assert.equal(next.called, true, 'SUPER_ADMIN must pass');
      } else {
        assert.equal(res.statusCode, 403, `${role} must be rejected (403), not treated as admin`);
        assert.equal(next.called, false, `${role} must NOT pass a SUPER_ADMIN gate`);
      }
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════════
describe('RBAC — authorizeOwn() row-level ownership', () => {
  test('owner may access their own resource', () => {
    const res = makeRes();
    const next = makeNext();
    authorizeOwn('id', '_id')({ user: { role: 'PLAYER', _id: 'abc123' }, params: { id: 'abc123' } }, res, next);
    assert.equal(next.called, true);
  });

  test('non-owner is rejected with 403', () => {
    const res = makeRes();
    const next = makeNext();
    authorizeOwn('id', '_id')({ user: { role: 'PLAYER', _id: 'abc123' }, params: { id: 'other999' } }, res, next);
    assert.equal(next.called, false);
    assert.equal(res.statusCode, 403);
  });

  test('SUPER_ADMIN bypasses ownership on any resource', () => {
    const res = makeRes();
    const next = makeNext();
    authorizeOwn('id', '_id')({ user: { role: 'SUPER_ADMIN', _id: 'admin1' }, params: { id: 'someoneElse' } }, res, next);
    assert.equal(next.called, true);
  });

  test('unauthenticated request is rejected with 401', () => {
    const res = makeRes();
    const next = makeNext();
    authorizeOwn('id', '_id')({ params: { id: 'x' } }, res, next);
    assert.equal(res.statusCode, 401);
    assert.equal(next.called, false);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
describe('Phase state machine — isLegalTransition()', () => {
  test('allows exactly the forward chain SETUP→REGISTRATION→AUCTION→TOURNAMENT', () => {
    assert.equal(isLegalTransition('SETUP', 'REGISTRATION'), true);
    assert.equal(isLegalTransition('REGISTRATION', 'AUCTION'), true);
    assert.equal(isLegalTransition('AUCTION', 'TOURNAMENT'), true);
  });

  test('forbids skipping a phase', () => {
    assert.equal(isLegalTransition('SETUP', 'AUCTION'), false);
    assert.equal(isLegalTransition('SETUP', 'TOURNAMENT'), false);
    assert.equal(isLegalTransition('REGISTRATION', 'TOURNAMENT'), false);
  });

  test('forbids rewinding to an earlier phase (Nuke-only path)', () => {
    assert.equal(isLegalTransition('AUCTION', 'REGISTRATION'), false);
    assert.equal(isLegalTransition('TOURNAMENT', 'AUCTION'), false);
    assert.equal(isLegalTransition('REGISTRATION', 'SETUP'), false);
  });

  test('TOURNAMENT is terminal — no legal forward transition', () => {
    for (const p of PHASES) {
      assert.equal(isLegalTransition('TOURNAMENT', p), false);
    }
  });

  test('rejects unknown target phases', () => {
    assert.equal(isLegalTransition('SETUP', 'BOGUS'), false);
    assert.equal(isLegalTransition('AUCTION', ''), false);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
describe('Phase gate — requirePhase() distinguishes wrong-phase (409) from role (403)', () => {
  beforeEach(() => { store.event_phase = 'AUCTION'; });

  test('gate passes when the current phase is allowed', async () => {
    const res = makeRes();
    const next = makeNext();
    await requirePhase('AUCTION')({}, res, next);
    assert.equal(next.called, true);
    assert.equal(res.statusCode, 200);
  });

  test('gate returns 409 (not 403) when the current phase is not allowed', async () => {
    store.event_phase = 'AUCTION';
    const res = makeRes();
    const next = makeNext();
    await requirePhase('REGISTRATION')({}, res, next);
    assert.equal(next.called, false);
    assert.equal(res.statusCode, 409, 'wrong-phase must be 409 Conflict, distinct from a 403 role denial');
    assert.equal(res.body.currentPhase, 'AUCTION');
    assert.deepEqual(res.body.requiredPhases, ['REGISTRATION']);
  });

  test('gate accepts any one of several allowed phases', async () => {
    store.event_phase = 'TOURNAMENT';
    const res = makeRes();
    const next = makeNext();
    await requirePhase('AUCTION', 'TOURNAMENT')({}, res, next);
    assert.equal(next.called, true);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
describe('Auction engine — duplicate bids', () => {
  beforeEach(() => {
    auctionEngine.podiumPlayer = { _id: 'p-1', name: 'Test Player', basePrice: 1000000 };
    auctionEngine.currentBid = 1000000;
    auctionEngine.highestBidder = null;
    auctionEngine.bidHistory = [];
    auctionEngine.blindBids = [];
    auctionEngine.bidQueue = Promise.resolve();
    auctionEngine.auctionSessionId = 'session-1';
    auctionEngine.isAuctionCompleting = false;
    auctionEngine.recentBidSignature = null;
    auctionEngine.recentBidTimestamp = 0;
    timerService.status = 'RUNNING';
    timerService.isPaused = false;
    timerService.remainingSeconds = 60;
    timerService.duration = 60;
  });

  test('rejects a rapid duplicate bid from the same team for the same auction session', async () => {
    const team = {
      id: 'team-1',
      name: 'Team One',
      totalBudget: 100000000,
      remainingBudget: 100000000,
      minRoster: 11,
      currentRosterCount: 0
    };

    const first = await auctionEngine.placeNormalBid(team);
    assert.equal(first.success, true);

    const second = await auctionEngine.placeNormalBid(team);
    assert.equal(second.success, false);
    assert.match(second.error, /Duplicate bid detected/i);
  });
});

describe('Phase transitions — transitionPhase() enforces the machine against the store', () => {
  beforeEach(() => { store.event_phase = 'SETUP'; });

  test('a legal forward transition succeeds and persists', async () => {
    const result = await transitionPhase('REGISTRATION', 'tester');
    assert.equal(result.ok, true);
    assert.equal(result.from, 'SETUP');
    assert.equal(result.phase, 'REGISTRATION');
    assert.equal(await getCurrentPhase(), 'REGISTRATION');
  });

  test('an illegal transition is rejected and leaves the store unchanged', async () => {
    store.event_phase = 'REGISTRATION';
    const result = await transitionPhase('TOURNAMENT', 'tester');
    assert.equal(result.ok, false, 'REGISTRATION→TOURNAMENT must be rejected');
    assert.equal(await getCurrentPhase(), 'REGISTRATION', 'store must be untouched after an illegal transition');
  });

  test('a no-op transition to the same phase is rejected', async () => {
    store.event_phase = 'AUCTION';
    const result = await transitionPhase('AUCTION', 'tester');
    assert.equal(result.ok, false);
    assert.match(result.message, /Already in AUCTION/);
  });
});
