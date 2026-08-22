/*
 * ── Player Bidding Logic — Reserve-Budget Guardrail Suite ─────────────────────
 *
 * Deterministic (no DB) coverage of the league bidding policy:
 *
 *   Minimum Players per Team   = floor(Total Auction Players / Total Teams)
 *   Remaining Minimum Players  = Minimum Per Team - Team Purchased Count
 *   Required Reserve Budget    = Remaining Minimum Players × Current Min Price
 *   Available Bid Balance      = Remaining Budget - Required Reserve
 *   Bid Allowed                = Available Bid Balance >= Proposed Bid Amount
 *
 * Every scenario mirrors a numbered rule from the PRD's "Player Bidding Logic"
 * spec so regressions map straight back to requirements.
 */
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

const {
  computeMinimumPlayersPerTeam,
  computeCurrentMinimumPlayerPrice,
  computeBiddingEligibility,
  ELIGIBILITY_REASON_MESSAGES,
} = await import('../src/utils/biddingRules.js');

// ══════════════════════════════════════════════════════════════════════════════
describe('§1 — Minimum player requirement derivation', () => {
  test('3 teams / 35 players → floor(35/3) = 11 per team, 2 extras', () => {
    assert.equal(computeMinimumPlayersPerTeam(3, 35), 11);
  });

  test('evenly divisible pools have zero extras', () => {
    // 36 players / 3 teams → exactly 12 each, 0 extra
    const e = computeBiddingEligibility({ totalTeams: 3, totalAuctionPlayers: 36 });
    assert.equal(e.minimumPerTeam, 12);
    assert.equal(e.leagueExtraPlayers, 0);
  });

  test('returns 0 when teams or players are missing', () => {
    assert.equal(computeMinimumPlayersPerTeam(0, 35), 0);
    assert.equal(computeMinimumPlayersPerTeam(3, 0), 0);
    assert.equal(computeMinimumPlayersPerTeam(undefined, 35), 0);
  });

  test('fractional inputs are floored defensively', () => {
    assert.equal(computeMinimumPlayersPerTeam(3.9, 35.9), 11);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
describe('§7 — Dynamic current minimum player price', () => {
  test('lowest base price among available players wins (never a fixed best price)', () => {
    assert.equal(computeCurrentMinimumPlayerPrice([3000, 1000, 2000], []), 1000);
  });

  test('falls back to lowest active category price when the pool is empty', () => {
    assert.equal(computeCurrentMinimumPlayerPrice([], [2500, 1500]), 1500);
  });

  test('falls back to provided floor (e.g. podium base price) last', () => {
    assert.equal(computeCurrentMinimumPlayerPrice([], [], 750), 750);
    assert.equal(computeCurrentMinimumPlayerPrice([], [], 750), 750);
  });

  test('zero and invalid prices are ignored inside the pool', () => {
    assert.equal(computeCurrentMinimumPlayerPrice([0, NaN, undefined, 2000], [999]), 2000);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
describe('§3–§4 — Reserved budget math', () => {
  const base = { totalTeams: 1, totalAuctionPlayers: 10, availablePlayersCount: 10, minimumPlayerPrice: 1000 };

  test('PRD example: requirement 10, price ৳1,000, budget ৳50,000 → reserve ৳10,000, bid balance ৳40,000', () => {
    const e = computeBiddingEligibility({ ...base, purchasedCount: 0, remainingBudget: 50000, proposedBidAmount: 0 });
    assert.equal(e.minimumPerTeam, 10);
    assert.equal(e.remainingMinimumPlayers, 10);
    assert.equal(e.requiredReserveBudget, 10000);
    assert.equal(e.availableBidBalance, 40000);
    assert.equal(e.maxAllowableBid, 40000);
  });

  test('reserve shrinks dynamically with every purchase', () => {
    const run = (purchased) =>
      computeBiddingEligibility({ ...base, purchasedCount: purchased, remainingBudget: 50000 }).requiredReserveBudget;
    assert.equal(run(0), 10000);
    assert.equal(run(1), 9000);   // 9 × 1000
    assert.equal(run(2), 8000);   // 8 × 1000
    assert.equal(run(10), 0);     // minimum fulfilled → nothing reserved
  });

  test('minimum price change recalculates the reserve', () => {
    // §7: remaining 8 @ 1000 → 8000; same team after price moves to 1200 → 9600
    const args = { totalTeams: 1, totalAuctionPlayers: 10, availablePlayersCount: 10, purchasedCount: 2, remainingBudget: 50000 };
    assert.equal(
      computeBiddingEligibility({ ...args, minimumPlayerPrice: 1000 }).requiredReserveBudget,
      8000
    );
    assert.equal(
      computeBiddingEligibility({ ...args, minimumPlayerPrice: 1200 }).requiredReserveBudget,
      9600
    );
  });
});

// ══════════════════════════════════════════════════════════════════════════════
describe('§5–§6 — Place Bid hidden at zero bidding balance', () => {
  const args = { totalTeams: 1, totalAuctionPlayers: 10, availablePlayersCount: 10, minimumPlayerPrice: 1000 };

  test('budget 10,000 / reserve 9,000 → only bids ≤ 1,000 allowed', () => {
    const e = computeBiddingEligibility({ ...args, purchasedCount: 1, remainingBudget: 10000, proposedBidAmount: 1000 });
    assert.equal(e.availableBidBalance, 1000);
    assert.equal(e.bidAllowed, true);

    const over = computeBiddingEligibility({ ...args, purchasedCount: 1, remainingBudget: 10000, proposedBidAmount: 1001 });
    assert.equal(over.bidAllowed, false);
    assert.deepEqual(over.reasons, ['INSUFFICIENT_BID_BALANCE']);
    assert.match(ELIGIBILITY_REASON_MESSAGES.INSUFFICIENT_BID_BALANCE, /reserved/i);
  });

  test('budget 9,000 / reserve 9,000 → zero balance blocks every bid', () => {
    const e = computeBiddingEligibility({ ...args, purchasedCount: 1, remainingBudget: 9000, proposedBidAmount: 1 });
    assert.equal(e.availableBidBalance, 0);
    assert.equal(e.bidAllowed, false);
  });

  test('total wallet alone never authorises a bid — reserve is always excluded (§6)', () => {
    // Wallet looks huge, but 10 pending minimums × 1000 must stay reserved.
    const e = computeBiddingEligibility({
      totalTeams: 1, totalAuctionPlayers: 20, availablePlayersCount: 20,
      purchasedCount: 10, minimumPlayerPrice: 5000, remainingBudget: 60000, proposedBidAmount: 11000,
    });
    // minimum = 20, remaining = 10 → reserve 50,000 → balance 10,000 < 11,000
    assert.equal(e.bidAllowed, false);
    assert.equal(e.reasons.includes('INSUFFICIENT_BID_BALANCE'), true);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
describe('§8–§9 — Extra-player eligibility & button final conditions', () => {
  // League: 3 teams, 35 players → min 11, extras 2
  const league = { totalTeams: 3, totalAuctionPlayers: 35, availablePlayersCount: 14, minimumPlayerPrice: 1000, remainingBudget: 50000, proposedBidAmount: 1000 };

  test('team below minimum may always bid while the pool has players', () => {
    const e = computeBiddingEligibility({ ...league, purchasedCount: 5 });
    assert.equal(e.isBelowMinimum, true);
    assert.equal(e.bidAllowed, true);
  });

  test('team that completed its minimum may bid for the 2 league extras', () => {
    const e = computeBiddingEligibility({ ...league, purchasedCount: 11, maxRoster: 13 });
    assert.equal(e.isBelowMinimum, false);
    assert.equal(e.leagueExtraPlayers, 2);
    assert.equal(e.requiredReserveBudget, 0);
    assert.equal(e.bidAllowed, true);
  });

  test('overall squad limit reached → Place Bid hidden (ROSTER_LIMIT_REACHED)', () => {
    const e = computeBiddingEligibility({ ...league, purchasedCount: 12, maxRoster: 12 });
    assert.equal(e.rosterSlotsRemaining, 0);
    assert.equal(e.bidAllowed, false);
    assert.equal(e.reasons.includes('ROSTER_LIMIT_REACHED'), true);
  });

  test('minimum met but no league extras left → NO_EXTRA_PLAYERS', () => {
    const e = computeBiddingEligibility({ ...league, totalAuctionPlayers: 36, purchasedCount: 12, maxRoster: 15 });
    assert.equal(e.leagueExtraPlayers, 0);
    assert.equal(e.bidAllowed, false);
    assert.equal(e.reasons.includes('NO_EXTRA_PLAYERS'), true);
  });

  test('empty buyable pool blocks bids even with budget and squad space', () => {
    const e = computeBiddingEligibility({ ...league, availablePlayersCount: 0, purchasedCount: 5 });
    assert.equal(e.bidAllowed, false);
    assert.equal(e.reasons.includes('NO_PLAYERS_AVAILABLE'), true);
  });

  test('missing auction pool configuration blocks bids outright', () => {
    const e = computeBiddingEligibility({ totalTeams: 0, totalAuctionPlayers: 0, availablePlayersCount: 5, remainingBudget: 50000, proposedBidAmount: 1000 });
    assert.equal(e.bidAllowed, false);
    assert.equal(e.reasons.includes('NO_AUCTION_POOL'), true);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
describe('§10 — Core invariant: bid can never break the reserve', () => {
  const evaluate = ({ budget, purchased, proposed }) =>
    computeBiddingEligibility({
      totalTeams: 3,
      totalAuctionPlayers: 35,
      availablePlayersCount: 35 - purchased - 1,
      purchasedCount: purchased,
      maxRoster: 13,
      remainingBudget: budget,
      minimumPlayerPrice: 1000,
      proposedBidAmount: proposed,
    });

  test('Total Budget − Current Bid ≥ Required Reserve → allowed', () => {
    // bought 0 → reserve 11,000; bidding 39,000 leaves exactly 0 ≥ 0
    const e = evaluate({ budget: 50000, purchased: 0, proposed: 39000 });
    assert.equal(e.bidAllowed, true);
  });

  test('Total Budget − Current Bid < Required Reserve → rejected', () => {
    const e = evaluate({ budget: 50000, purchased: 0, proposed: 39001 });
    assert.equal(e.bidAllowed, false);
  });

  test('final expected behaviour walkthrough (PRD table)', () => {
    const state = (bought) => evaluate({ budget: 50000, purchased: bought, proposed: 0 });
    assert.equal(state(0).availableBidBalance, 39000); // reserve 11,000
    assert.equal(state(1).availableBidBalance, 40000); // reserve 10,000
    assert.equal(state(5).availableBidBalance, 44000); // reserve 6,000
    assert.equal(state(11).requiredReserveBudget, 0);  // minimum complete
  });
});
