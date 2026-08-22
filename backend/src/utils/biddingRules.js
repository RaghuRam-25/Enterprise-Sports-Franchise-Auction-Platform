/*
 * ── Bidding Rules (Single Source of Truth for Reserve-Budget Guardrails) ──────
 *
 * Implements the league-wide player bidding policy:
 *
 *   Minimum Players per Team   = floor(Total Auction Players / Total Teams)
 *   Remaining Minimum Players  = Minimum Per Team - Team Purchased Count
 *   Required Reserve Budget    = Remaining Minimum Players × Current Min Price
 *   Available Bid Balance      = Team Remaining Budget - Required Reserve
 *   Bid Allowed                = Available Bid Balance >= Proposed Bid Amount
 *
 * "Current Minimum Player Price" is DYNAMIC — always the lowest base price
 * among currently available (unsold) players, never a static "best price".
 *
 * These functions are PURE so the exact same math can run on the backend
 * (authoritative enforcement) and the frontend (UI gating) without drift.
 */

// Players who have left the auction pool permanently. Everyone else counts
// towards the total-auction-players denominator (SOLD stays counted so the
// minimum-per-team does NOT shrink every time a sale happens).
export const AUCTION_POOL_EXCLUDED_STATUSES = ['WITHDRAWN', 'BANNED'];

// Players that can still be bought right now.
export const AVAILABLE_PLAYER_STATUSES = ['REGISTERED', 'APPROVED', 'ON_PODIUM', 'UNSOLD'];

const safeNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

/**
 * Minimum players each team must secure.
 * Super Admin controls the inputs (total registered players + total teams);
 * the requirement itself is derived, not configured.
 */
export function computeMinimumPlayersPerTeam(totalTeams, totalAuctionPlayers) {
  const teams = Math.floor(safeNumber(totalTeams));
  const players = Math.floor(safeNumber(totalAuctionPlayers));
  if (teams <= 0 || players <= 0) return 0;
  return Math.floor(players / teams);
}

/**
 * Lowest base price among the currently available players.
 * Falls back to the lowest active category price when the pool is empty,
 * then to `fallbackPrice` (e.g. the podium player's own base price).
 */
export function computeCurrentMinimumPlayerPrice(availablePlayerPrices = [], categoryPrices = [], fallbackPrice = 0) {
  const fromPool = availablePlayerPrices.map(safeNumber).filter((p) => p > 0);
  if (fromPool.length > 0) return Math.min(...fromPool);

  const fromCategories = categoryPrices.map(safeNumber).filter((p) => p > 0);
  if (fromCategories.length > 0) return Math.min(...fromCategories);

  return Math.max(0, safeNumber(fallbackPrice));
}

/**
 * Full eligibility evaluation for one team's proposed bid.
 *
 * @returns {{
 *   minimumPerTeam: number,
 *   remainingMinimumPlayers: number,
 *   requiredReserveBudget: number,
 *   availableBidBalance: number,
 *   maxAllowableBid: number,
 *   rosterLimit: number|null,
 *   rosterSlotsRemaining: number,
 *   leagueExtraPlayers: number,
 *   isBelowMinimum: boolean,
 *   bidAllowed: boolean,
 *   reasons: string[]
 * }}
 */
export function computeBiddingEligibility({
  totalTeams = 0,
  totalAuctionPlayers = 0,
  availablePlayersCount = 0,
  purchasedCount = 0,
  maxRoster = null,
  remainingBudget = 0,
  minimumPlayerPrice = 0,
  proposedBidAmount = 0,
}) {
  const purchased = Math.max(0, Math.floor(safeNumber(purchasedCount)));
  const budget = safeNumber(remainingBudget);
  const minPrice = safeNumber(minimumPlayerPrice);
  const proposedBid = safeNumber(proposedBidAmount);

  // §Core Formula — minimum & reserve math
  const minimumPerTeam = computeMinimumPlayersPerTeam(totalTeams, totalAuctionPlayers);
  const remainingMinimumPlayers = Math.max(0, minimumPerTeam - purchased);
  const requiredReserveBudget = remainingMinimumPlayers * minPrice;
  const availableBidBalance = budget - requiredReserveBudget;

  // League-wide surplus players beyond the guaranteed minimums (the "extras")
  const leagueExtraPlayers = Math.max(
    0,
    Math.floor(safeNumber(totalAuctionPlayers)) - minimumPerTeam * Math.max(Math.floor(safeNumber(totalTeams)), 0)
  );

  // Overall squad limit from auction configuration (null/0 → unlimited)
  const limit = safeNumber(maxRoster);
  const rosterLimit = limit > 0 ? Math.floor(limit) : null;
  const rosterSlotsRemaining = rosterLimit == null
    ? Infinity
    : Math.max(0, rosterLimit - purchased);

  const isBelowMinimum = minimumPerTeam > 0 && purchased < minimumPerTeam;

  // §9 — Place Bid button final conditions
  const reasons = [];
  if (minimumPerTeam <= 0) reasons.push('NO_AUCTION_POOL');
  if (safeNumber(availablePlayersCount) <= 0) reasons.push('NO_PLAYERS_AVAILABLE');
  if (rosterLimit != null && rosterSlotsRemaining <= 0) reasons.push('ROSTER_LIMIT_REACHED');
  if (!isBelowMinimum && minimumPerTeam > 0 && leagueExtraPlayers <= 0) reasons.push('NO_EXTRA_PLAYERS');
  if (minPrice > 0 && requiredReserveBudget > budget) reasons.push('RESERVE_EXCEEDS_BUDGET');
  if (proposedBid > availableBidBalance) reasons.push('INSUFFICIENT_BID_BALANCE');

  return {
    minimumPerTeam,
    remainingMinimumPlayers,
    requiredReserveBudget,
    availableBidBalance,
    maxAllowableBid: Math.max(0, availableBidBalance),
    rosterLimit,
    rosterSlotsRemaining,
    leagueExtraPlayers,
    isBelowMinimum,
    bidAllowed: reasons.length === 0,
    reasons,
  };
}

/** Human-readable copy for a rejection reason (used by API errors / toasts). */
export const ELIGIBILITY_REASON_MESSAGES = {
  NO_AUCTION_POOL: 'Auction pool is not configured yet',
  NO_PLAYERS_AVAILABLE: 'No players are currently available in the auction pool',
  ROSTER_LIMIT_REACHED: 'Your squad has reached its maximum player limit',
  NO_EXTRA_PLAYERS: 'Your minimum squad is complete and no extra players remain',
  RESERVE_EXCEEDS_BUDGET: 'Your remaining budget cannot cover the reserve required to complete your minimum squad',
  INSUFFICIENT_BID_BALANCE: 'This bid would break your reserved minimum-squad budget',
};

export const describeEligibilityReason = (reason) =>
  ELIGIBILITY_REASON_MESSAGES[reason] || 'Bid not allowed';
