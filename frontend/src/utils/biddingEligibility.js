/*
 * ── Bidding Eligibility (Frontend mirror of backend/src/utils/biddingRules.js) ─
 *
 * The exact same reserve-budget policy runs on both sides:
 *
 *   Minimum Players per Team   = floor(Total Auction Players / Total Teams)
 *   Remaining Minimum Players  = Minimum Per Team - Team Purchased Count
 *   Required Reserve Budget    = Remaining Minimum Players × Current Min Price
 *   Available Bid Balance      = Remaining Budget - Required Reserve
 *   Bid Allowed                = Available Bid Balance >= Proposed Bid Amount
 *
 * The backend remains authoritative — this mirror only drives UI gating
 * (Place Bid button visibility / labels) so managers never see stale or
 * misleading bidding state.
 */

export const AUCTION_POOL_EXCLUDED_STATUSES = ['WITHDRAWN', 'BANNED'];
export const AVAILABLE_PLAYER_STATUSES = ['REGISTERED', 'APPROVED', 'ON_PODIUM', 'UNSOLD'];

const safeNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

/** Players that count towards the league auction pool denominator. */
export const isInAuctionPool = (player) =>
  !AUCTION_POOL_EXCLUDED_STATUSES.includes(player?.status);

/** Players that can still be bought right now. */
export const isAvailableForBidding = (player) =>
  AVAILABLE_PLAYER_STATUSES.includes(player?.status);

/**
 * Live auction pool snapshot derived from client-side state.
 * @param {Array} players  all players (any status)
 * @param {Array} categories active player categories (fallback pricing)
 */
export const getAuctionPoolStats = (players = [], categories = []) => {
  const list = Array.isArray(players) ? players : [];
  const poolPlayers = list.filter(isInAuctionPool);
  const availablePlayers = list.filter(isAvailableForBidding);

  // §7 — current minimum price: lowest base price among available players,
  // falling back to the lowest active category price.
  let minimumPlayerPrice = 0;
  const poolPrices = availablePlayers.map((p) => safeNumber(p.basePrice)).filter((p) => p > 0);
  if (poolPrices.length > 0) {
    minimumPlayerPrice = Math.min(...poolPrices);
  } else {
    const catPrices = (Array.isArray(categories) ? categories : [])
      .filter((c) => c?.isActive !== false)
      .map((c) => safeNumber(c.basePrice))
      .filter((p) => p > 0);
    if (catPrices.length > 0) minimumPlayerPrice = Math.min(...catPrices);
  }

  return {
    totalTeams: 0, // filled in by the caller from the teams collection
    totalAuctionPlayers: poolPlayers.length,
    availablePlayersCount: availablePlayers.length,
    minimumPlayerPrice,
  };
};

/** §Core Formula — minimum players each team must secure. */
export function computeMinimumPlayersPerTeam(totalTeams, totalAuctionPlayers) {
  const teams = Math.floor(safeNumber(totalTeams));
  const players = Math.floor(safeNumber(totalAuctionPlayers));
  if (teams <= 0 || players <= 0) return 0;
  return Math.floor(players / teams);
}

/**
 * Full eligibility evaluation for one team's proposed bid — mirrors the
 * backend's computeBiddingEligibility output shape exactly.
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

  const minimumPerTeam = computeMinimumPlayersPerTeam(totalTeams, totalAuctionPlayers);
  const remainingMinimumPlayers = Math.max(0, minimumPerTeam - purchased);
  const requiredReserveBudget = remainingMinimumPlayers * minPrice;
  const availableBidBalance = budget - requiredReserveBudget;

  const leagueExtraPlayers = Math.max(
    0,
    Math.floor(safeNumber(totalAuctionPlayers)) - minimumPerTeam * Math.max(Math.floor(safeNumber(totalTeams)), 0)
  );

  const limit = safeNumber(maxRoster);
  const rosterLimit = limit > 0 ? Math.floor(limit) : null;
  const rosterSlotsRemaining = rosterLimit == null
    ? Infinity
    : Math.max(0, rosterLimit - purchased);

  const isBelowMinimum = minimumPerTeam > 0 && purchased < minimumPerTeam;

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
