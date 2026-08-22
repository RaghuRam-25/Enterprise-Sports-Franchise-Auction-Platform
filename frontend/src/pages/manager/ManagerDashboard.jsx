import { useState, useEffect, useMemo } from 'react';
import { TrendingUp, LogOut, ShieldOff, Wallet, Users, Crown, Radio } from 'lucide-react';
import { useAuction } from '../../context/AuctionContext';
import { useAuth } from '../../context/AuthContext';
import { usePhase } from '../../context/PhaseContext';
import { PlayerDisplayStage, TargetPlayerAlert } from '../../components/auction';
import { useAuctionAnimation } from '../../hooks/useAuctionAnimation';

import { playerFallback } from '../../utils/playerFallback';
import { getImageUrl } from '../../utils/imageUrl';

import LandingLiveStageCard from '../../components/LandingLiveStageCard';
import WaitingForAuction from '../../components/WaitingForAuction';
import SoundToggle from '../../components/SoundToggle';
import { WaitingAnimation } from '../../components/auction';

export const ManagerDashboard = () => {
  const { user } = useAuth();
  const { auctionStartTime, isAuctionActive } = usePhase();
  const {
    teams = [],
    categories = [],
    positions = [],
    podiumPlayer,
    currentBid = 0,
    highestBidder,
    biddingMode = 'normal',
    timerRemaining = 0,
    timerStatus = 'idle',
    bidHistory = [],
    calculateNextBidAmount,
    placeNormalBid,
    placeBlindBid,
    getTeamBiddingEligibility,
    formatCurrency = (v) => `${v} BDT`,
    triggerToast = () => { },
    targetAlert = null,
    dismissTargetAlert = () => { },
  } = useAuction();

  const {
    animState,
    introPlayer,
    winnerData,
    rosterUpdate,
    onAnimationComplete,
    ANIM_STATES: ANIM_STATES_HOOK,
  } = useAuctionAnimation();

  const [blindBidAmount, setBlindBidAmount] = useState('');
  const [isBidding, setIsBidding] = useState(false);
  const [hasOptedOut, setHasOptedOut] = useState(false);
  const podiumPlayerId = podiumPlayer?._id || podiumPlayer?.id || null;

  const defaultTeam = {
    id: 'team-default',
    name: 'Franchise Team',
    code: 'TEAM',
    logo: '🏆',
    totalBudget: 100000000,
    remainingBudget: 100000000,
    minRoster: 11,
    currentRoster: []
  };

  const safeTeams = Array.isArray(teams) ? teams : [];
  const activeTeam = safeTeams.find(t => (t.id || t._id) === user?.teamId) || safeTeams[0] || defaultTeam;

  const activeRoster = Array.isArray(activeTeam?.currentRoster) ? activeTeam.currentRoster : [];
  const safeBidHistory = Array.isArray(bidHistory) ? bidHistory : [];
  const currentRosterCount = activeRoster.length;

  // Progress-bar fill percentages for the franchise stat cards.
  const totalBudget = activeTeam?.totalBudget || 100000000;
  const remainingBudget = activeTeam?.remainingBudget ?? totalBudget;
  const minRoster = activeTeam?.minRoster || 11;
  const pursePct = Math.max(0, Math.min(100, (remainingBudget / totalBudget) * 100));
  const rosterPct = Math.max(0, Math.min(100, (currentRosterCount / minRoster) * 100));

  const safeCurrentBid = currentBid || 0;
  const nextExactBid = typeof calculateNextBidAmount === 'function'
    ? calculateNextBidAmount(safeCurrentBid, activeTeam?.totalBudget || 100000000)
    : safeCurrentBid + 150000;

  // ── Reserve-Budget Eligibility (§3–§10 of the bidding spec) ──────────────────
  // Recomputed live from teams/players/categories state — every purchase,
  // price change or roster change instantly re-gates the Place Bid button.
  const activeTeamId = activeTeam.id || activeTeam._id;
  const eligibility = useMemo(
    () => (typeof getTeamBiddingEligibility === 'function'
      ? getTeamBiddingEligibility(activeTeamId, nextExactBid)
      : null),
    [getTeamBiddingEligibility, activeTeamId, nextExactBid]
  );
  const reserveBudget = eligibility?.requiredReserveBudget ?? 0;
  const bidBalance = eligibility?.availableBidBalance ?? remainingBudget;

  const isCurrentlyHighestBidder = Boolean(
    highestBidder &&
    ((highestBidder.id && highestBidder.id === activeTeam.id) ||
      (highestBidder._id && highestBidder._id === activeTeam._id) ||
      (highestBidder.id && highestBidder.id === activeTeam._id) ||
      (highestBidder._id && highestBidder._id === activeTeam.id))
  );

  const handleNormalBidSubmit = () => {
    if (isBidding || hasOptedOut) return;
    setIsBidding(true);

    const targetTeamId = activeTeam.id || activeTeam._id;
    if (!targetTeamId) {
      triggerToast('Cannot place bid: Franchise team profile not loaded.', 'error');
      setIsBidding(false);
      return;
    }

    const res = placeNormalBid ? placeNormalBid(targetTeamId) : { success: false, error: 'Bidding service unavailable' };

    if (!res.success) {
      triggerToast(res.error || 'Bid placement failed', 'error');
    } else {
      triggerToast(`Bid of ${formatCurrency(res.nextAmount)} placed successfully!`, 'success');
    }

    setTimeout(() => setIsBidding(false), 500);
  };

  const submitSealedBid = () => {
    if (!podiumPlayer || hasOptedOut || rosterFull) return;

    const targetTeamId = activeTeam.id || activeTeam._id;
    const res = placeBlindBid ? placeBlindBid(targetTeamId, blindBidAmount) : { success: false, error: 'Blind bid service unavailable' };

    if (!res.success) {
      triggerToast(res.error || 'Blind bid validation failed', 'error');
    } else {
      triggerToast('Sealed blind bid submitted. Result reveals when the round ends.', 'success');
      setBlindBidAmount('');
    }
  };

  // One bidding surface: normal → open raise, blind → sealed input + push.
  const handleStageAction = () => {
    if (isBlindMode) submitSealedBid();
    else handleNormalBidSubmit();
  };

  const handleOptOut = () => {
    if (!podiumPlayer || hasOptedOut) return;
    setHasOptedOut(true);
    triggerToast(`You've opted out of bidding on ${podiumPlayer.name}.`, 'info');
  };

  const isBlindMode = biddingMode === 'blind';

  // §9 — Place Bid button final conditions. The button is HIDDEN entirely when
  // the squad limit is reached (§2), and disabled with a reason label for every
  // other failed condition (reserve unaffordable, zero bid balance, etc.).
  const rosterFull = eligibility?.reasons?.includes('ROSTER_LIMIT_REACHED') || false;
  const biddingBlocked = Boolean(eligibility && !eligibility.bidAllowed);
  const bidButtonDisabled = !podiumPlayer || timerStatus !== 'running' || isCurrentlyHighestBidder || hasOptedOut || biddingBlocked || nextExactBid > activeTeam.remainingBudget;

  const blockedReasonLabel = (() => {
    if (!eligibility) return null;
    if (eligibility.reasons.includes('ROSTER_LIMIT_REACHED')) return 'Squad Limit Reached';
    if (eligibility.reasons.includes('RESERVE_EXCEEDS_BUDGET')) return 'Budget Reserved';
    if (eligibility.reasons.includes('NO_EXTRA_PLAYERS')) return 'No Extra Players Left';
    if (eligibility.reasons.includes('INSUFFICIENT_BID_BALANCE')) return `Bid Balance: ${formatCurrency(Math.max(0, eligibility.availableBidBalance))}`;
    return null;
  })();

  const bidButtonLabel = hasOptedOut
    ? 'You Are Sitting This Out'
    : isCurrentlyHighestBidder
      ? 'You Are Highest Bidder'
      : !podiumPlayer
        ? 'Podium Empty'
        : timerStatus !== 'running'
          ? 'Auction Clock Paused'
          : nextExactBid > activeTeam.remainingBudget
            ? 'Exceeds Purse'
            : blockedReasonLabel && biddingBlocked
              ? `Place Bid — ${blockedReasonLabel}`
              : `Place Bid: ${formatCurrency(nextExactBid)}`;

  // ── Blind Mode — single input + push on the stage card itself (§2) ──────────
  // Minimum hint lives in the input placeholder; full §8 validation happens in
  // placeBlindBid (client context) and again server-side against the live DB.
  const bestPrice = Number(podiumPlayer?.basePrice) || 0;
  const blindBidNum = Number(blindBidAmount);
  const maxAllowableBid = eligibility ? Math.max(0, eligibility.maxAllowableBid) : remainingBudget;
  const blindReady = Boolean(
    podiumPlayer &&
    timerStatus === 'running' &&
    !hasOptedOut &&
    !rosterFull &&
    !biddingBlocked &&
    blindBidAmount &&
    Number.isFinite(blindBidNum) &&
    blindBidNum >= bestPrice &&      // §6 — minimum valid bid
    blindBidNum <= maxAllowableBid   // §7/§15 — reserve stays protected
  );

  // Target Players List state & Live Target Alert integration
  const [targetList, setTargetList] = useState([]);
  const [dismissedAlertPlayerId, setDismissedAlertPlayerId] = useState(null);

  useEffect(() => {
    if (user?.role === 'TEAM_MANAGER') {
      import('../../services/api').then(({ default: api }) => {
        api.get('/manager/targets')
          .then((res) => {
            const raw = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
            setTargetList(raw);
          })
          .catch(() => { });
      });
    }
  }, [user]);

  // Identify if current podium player is on this manager's target list
  const activeTargetItem = useMemo(() => {
    if (!podiumPlayerId || !targetList.length) return null;
    return targetList.find(
      (t) => (t.playerId?._id || t.playerId?.id || t.playerId) === podiumPlayerId
    );
  }, [podiumPlayerId, targetList]);

  const showTargetAlert = Boolean(activeTargetItem && activeTargetItem.playerId?._id !== dismissedAlertPlayerId && activeTargetItem.playerId?.id !== dismissedAlertPlayerId);

  return (
    <div className="space-y-6">

      {/* Top Team Header — premium franchise identity band */}
      <div className="relative overflow-hidden glass-card rounded-3xl p-6 sm:p-7 border border-white/5 bg-gradient-to-br from-cardBg via-cardBg/80 to-successGreen/30 shadow-2xl shadow-successGreen/20">
        <div className="pointer-events-none absolute -top-16 -right-10 w-72 h-72 bg-neonGreen/10 blur-3xl rounded-full" />
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-5">
          <div className="flex items-center gap-4">
            {activeTeam.logoUrl ? (
              <img
                src={activeTeam.logoUrl}
                alt={activeTeam.name}
                className="w-16 h-16 rounded-2xl object-cover border border-neonGreen/30 shadow-lg shadow-successGreen/40 ring-2 ring-neonGreen/10"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-neonGreen/20 to-neonGreen/5 border border-neonGreen/20 flex items-center justify-center text-3xl shadow-lg shadow-successGreen/40">
                {activeTeam.logo || '🏆'}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black font-heading text-white tracking-tight">{activeTeam.name}</h1>
                <span className="font-mono text-[11px] font-bold text-neonGreenHover bg-neonGreen/10 px-2 py-0.5 rounded-md border border-neonGreen/25">
                  {activeTeam.shortCode || activeTeam.code}
                </span>
              </div>
              {activeTeam.motto ? (
                <p className="text-xs text-neonGreen/80 italic mt-1">{activeTeam.motto}</p>
              ) : (
                <p className="text-xs text-secondaryText mt-1">Franchise Manager: {user?.name || 'Manager'}</p>
              )}
              {activeTeam.description && (
                <p className="text-[11px] text-mutedText mt-0.5">{activeTeam.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 self-stretch md:self-auto">
            <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider border ${biddingMode === 'blind'
              ? 'bg-warningGold/15 text-warningGold border-warningGold/40'
              : 'bg-neonGreen/15 text-neonGreenHover border-neonGreen/40'
              }`}>
              <Radio className="w-3.5 h-3.5" /> {biddingMode || 'normal'} Mode
            </span>
          </div>
        </div>
      </div>

      {/* Franchise stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="group glass-card rounded-2xl p-4 border border-white/5 bg-gradient-to-br from-cardBg to-successGreen/20 hover:border-neonGreen/30 transition-all duration-300 hover:-translate-y-0.5">
          <div className="flex items-center gap-2 text-neonGreen">
            <div className="w-9 h-9 rounded-xl bg-neonGreen/10 border border-neonGreen/20 flex items-center justify-center">
              <Wallet className="w-4.5 h-4.5" />
            </div>
            <span className="text-[10px] font-bold text-secondaryText uppercase tracking-widest">Available Purse</span>
          </div>
          <h3 className="mt-3 text-xl font-black font-mono text-neonGreen">{formatCurrency(activeTeam.remainingBudget)}</h3>
          <p className="mt-1 text-[10px] font-mono text-mutedText truncate" title={`Reserve for ${eligibility?.remainingMinimumPlayers ?? 0} more minimum players`}>
            Reserve: {formatCurrency(reserveBudget)} · Bid Bal: {formatCurrency(Math.max(0, bidBalance))}
          </p>
          <div className="mt-2 h-1.5 rounded-full bg-surfaceHover overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-neonGreen to-neonGreen transition-all duration-500" style={{ width: `${pursePct}%` }} />
          </div>
        </div>

        <div className="group glass-card rounded-2xl p-4 border border-white/5 bg-gradient-to-br from-cardBg to-successGreen/20 hover:border-neonGreen/30 transition-all duration-300 hover:-translate-y-0.5">
          <div className="flex items-center gap-2 text-neonGreen">
            <div className="w-9 h-9 rounded-xl bg-neonGreen/10 border border-neonGreen/20 flex items-center justify-center">
              <Users className="w-4.5 h-4.5" />
            </div>
            <span className="text-[10px] font-bold text-secondaryText uppercase tracking-widest">Roster Slots</span>
          </div>
          <h3 className="mt-3 text-xl font-black font-mono text-primaryText">{currentRosterCount}<span className="text-mutedText text-sm"> / {eligibility?.minimumPerTeam || minRoster} required</span></h3>
          <p className="mt-1 text-[10px] font-mono text-mutedText truncate">
            {eligibility?.remainingMinimumPlayers > 0
              ? `${eligibility.remainingMinimumPlayers} more to secure`
              : eligibility?.leagueExtraPlayers > 0
                ? `${eligibility.leagueExtraPlayers} extra in pool`
                : 'Minimum complete'}
          </p>
          <div className="mt-2 h-1.5 rounded-full bg-surfaceHover overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-neonGreen to-neonGreen transition-all duration-500" style={{ width: `${rosterPct}%` }} />
          </div>
        </div>

        <div className="group glass-card rounded-2xl p-4 border border-white/5 bg-gradient-to-br from-cardBg to-warningGold/20 hover:border-warningGold/30 transition-all duration-300 hover:-translate-y-0.5">
          <div className="flex items-center gap-2 text-warningGold">
            <div className="w-9 h-9 rounded-xl bg-warningGold/10 border border-warningGold/20 flex items-center justify-center">
              <Crown className="w-4.5 h-4.5" />
            </div>
            <span className="text-[10px] font-bold text-secondaryText uppercase tracking-widest">{isBlindMode ? 'Sealed Bids' : 'Leading Bid'}</span>
          </div>
          {isBlindMode ? (
            <>
              {/* §1/§3/§4 — no amounts, no team identities during a blind round */}
              <h3 className="mt-3 text-xl font-black font-mono text-slate-500 tracking-widest select-none">•••••</h3>
              <p className="mt-2 text-[11px] text-mutedText truncate">All bids are confidential until the round ends</p>
            </>
          ) : (
            <>
              <h3 className="mt-3 text-xl font-black font-mono text-warningGold">{formatCurrency(safeCurrentBid)}</h3>
              <p className="mt-2 text-[11px] text-mutedText truncate">{highestBidder ? highestBidder.name : 'Awaiting opening bid'}</p>
            </>
          )}
        </div>

        <div className={`group glass-card rounded-2xl p-4 border transition-all duration-300 hover:-translate-y-0.5 ${isCurrentlyHighestBidder ? 'border-neonGreen/40 bg-gradient-to-br from-successGreen/40 to-cardBg' : 'border-white/5 bg-gradient-to-br from-cardBg to-darkBg'}`}>
          <div className={`flex items-center gap-2 ${isCurrentlyHighestBidder ? 'text-neonGreen' : 'text-secondaryText'}`}>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${isCurrentlyHighestBidder ? 'bg-neonGreen/15 border-neonGreen/30' : 'bg-surfaceHover/60 border-borderStrong'}`}>
              <TrendingUp className="w-4.5 h-4.5" />
            </div>
            <span className="text-[10px] font-bold text-secondaryText uppercase tracking-widest">Your Status</span>
          </div>
          <h3 className={`mt-3 text-base font-black ${isCurrentlyHighestBidder ? 'text-neonGreen' : hasOptedOut ? 'text-warningGold' : 'text-primaryText'}`}>
            {isCurrentlyHighestBidder ? 'Leading' : hasOptedOut ? 'Sitting Out' : podiumPlayer ? 'In The Race' : 'Standby'}
          </h3>
          <p className="mt-2 text-[11px] text-mutedText truncate">{podiumPlayer ? podiumPlayer.name : 'No active player'}</p>
        </div>
      </div>

      {/* Full-width main content */}
      <div className="glass-card rounded-3xl p-5 sm:p-6 border border-white/5 space-y-6 shadow-2xl shadow-black/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neonGreen opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-neonGreen" />
            </span>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-neonGreen">Live Stage</span>
              <h2 className="text-lg font-black font-heading text-white leading-tight">Podium Display</h2>
            </div>
          </div>
        </div>

        {/* Target Player Alert — shown INSIDE the live auction stage (not above
            the dashboard). Socket-pushed alert beats the polling-derived one. */}
        {targetAlert && targetAlert.player && (
          <TargetPlayerAlert
            targetItem={{
              playerId: targetAlert.player,
              note: targetAlert.note,
              optionalBudgetLimit: targetAlert.optionalBudgetLimit,
              priority: targetAlert.priority,
            }}
            onQuickBid={handleNormalBidSubmit}
            onDismiss={dismissTargetAlert}
          />
        )}

        {showTargetAlert && !targetAlert && (
          <TargetPlayerAlert
            targetItem={activeTargetItem}
            onQuickBid={handleNormalBidSubmit}
            onDismiss={() => setDismissedAlertPlayerId(podiumPlayerId)}
          />
        )}

        {/* Shared confined Player Display stage — premium cinematic surface for
            the Manager / Player panel. Confined to this card; the team header,
            bid controls, opt-out, and bid stream below all stay visible. */}
        <div className="relative">
          {/* Global sound on/off — same spot as the live auction page */}
          <div className="absolute top-3 left-3 z-40">
            <SoundToggle />
          </div>

          <PlayerDisplayStage
          className="rounded-2xl"
          cinematicHeight="min-h-[440px] sm:min-h-[520px] lg:min-h-[600px]"
          animState={animState}
          ANIM_STATES={ANIM_STATES_HOOK}
          introPlayer={introPlayer}
          winnerData={winnerData}
          rosterUpdate={rosterUpdate}
          onAnimationComplete={onAnimationComplete}
          isManagerWinner={Boolean(
            highestBidder &&
            (highestBidder.id === activeTeam.id || highestBidder._id === activeTeam._id)
          )}
          showWaiting={!podiumPlayer && animState === ANIM_STATES_HOOK.IDLE}
        >
          {podiumPlayer && (
            <LandingLiveStageCard
              player={podiumPlayer}
              currentBid={currentBid}
              highestBidder={highestBidder}
              timerRemaining={timerRemaining}
              timerStatus={timerStatus}
              mode="manager"
              onPlaceBid={handleStageAction}
              hideBidButton={rosterFull}
              blindMode={isBlindMode}
              blindAmount={blindBidAmount}
              onBlindAmountChange={setBlindBidAmount}
              bidLabel={isBlindMode
                ? 'Place Blind Bid'
                : (isBidding ? 'Placing Bid…' : bidButtonLabel)}
              bidDisabled={isBlindMode ? !blindReady : (bidButtonDisabled || isBidding)}
              categories={categories}
              positions={positions}
              formatCurrency={formatCurrency}
            />
          )}
          </PlayerDisplayStage>
        </div>

        {/* My Bid Out Card */}
        <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 p-4 sm:p-5 rounded-2xl border ${hasOptedOut ? 'bg-warningGold/10 border-warningGold/30' : 'bg-darkBg/60 border-cardBorder'}`}>
          <div className="flex items-center gap-3 text-center sm:text-left">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border ${hasOptedOut ? 'bg-warningGold/15 border-warningGold/30 text-warningGold' : 'bg-surfaceHover/60 border-borderStrong text-secondaryText'}`}>
              <ShieldOff className="w-4.5 h-4.5" />
            </div>
            <div>
              <p className={`text-sm font-bold ${hasOptedOut ? 'text-warningGold' : 'text-primaryText'}`}>
                {hasOptedOut ? "You're sitting this player out" : 'Not interested in this player?'}
              </p>
            </div>
          </div>
          <button
            onClick={handleOptOut}
            disabled={!podiumPlayer || hasOptedOut}
            className="flex-shrink-0 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider border transition flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed bg-surfaceActive border-urgentRed/30 text-urgentRedText hover:bg-urgentRed/10 hover:border-urgentRed/50"
          >
            <LogOut className="w-3.5 h-3.5" /> {hasOptedOut ? 'Bid Out' : 'My Bid Out'}
          </button>
        </div>

        {/* Bid History Table — §1/§11: hidden entirely during Blind Mode so no
            team identity or amount is ever surfaced to competing managers. */}
        {!isBlindMode && (
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-secondaryText flex items-center justify-between">
            <span>Live Bid Stream ({safeBidHistory.length})</span>
            {highestBidder && (
              <span className="text-neonGreen flex items-center gap-1 font-mono text-[11px]">
                <TrendingUp className="w-3.5 h-3.5" /> Leader: {highestBidder.name}
              </span>
            )}
          </h3>

          <div className="bg-darkBg/70 rounded-xl border border-white/5 p-3 max-h-40 overflow-y-auto space-y-1.5">
            {safeBidHistory.length === 0 ? (
              <p className="text-xs text-mutedText text-center py-4">No bids placed on current player yet.</p>
            ) : (
              [...safeBidHistory].reverse().map((bid, idx) => (
                <div key={bid.id || idx} className="flex justify-between items-center text-xs px-3 py-2 rounded-lg bg-cardBg/60 border border-white/5 hover:border-neonGreen/25 transition-colors">
                  <span className="font-bold text-white">{bid.bidder}</span>
                  <span className="font-mono font-bold text-neonGreen">{formatCurrency(bid.amount)}</span>
                </div>
              ))
            )}
          </div>
        </div>
        )}
      </div>

      {/* Cinematic overlays are now rendered confined inside the Podium Display
          stage above (via PlayerDisplayStage) — no full-screen overlays. */}

    </div>
  );
};
