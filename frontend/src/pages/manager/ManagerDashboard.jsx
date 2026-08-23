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

  // Display-only flag for the stage's floating LIVE AUCTION badge: true while
  // a broadcast cinematic (waiting / intro / sell / roster) owns the stage
  // surface — its own HUD supplies the LIVE / AUCTION CENTRE badges then.
  const stageCinematicActive = Boolean(
    (!podiumPlayer && animState === ANIM_STATES_HOOK.IDLE) ||
    (animState === ANIM_STATES_HOOK.INTRO && introPlayer) ||
    (animState === ANIM_STATES_HOOK.SELL && winnerData) ||
    (animState === ANIM_STATES_HOOK.ROSTER && rosterUpdate)
  );

  return (
    // Full-screen dashboard shell — fills the layout viewport (h-dvh chain)
    // exactly. The page itself NEVER scrolls; only the bid stream (and the
    // stage body on small screens) scroll internally.
    <div className="flex flex-col flex-1 min-h-0 gap-1.5 sm:gap-2 lg:gap-3 overflow-hidden">

      {/* Top Team Header — premium franchise identity band */}
      <div className="relative overflow-hidden flex-none glass-card rounded-xl sm:rounded-2xl lg:rounded-3xl p-2 sm:p-2.5 lg:p-3.5 border border-white/5 bg-gradient-to-br from-[#0B2B26]/60 via-cardBg/80 to-[#0B2B26]/25 shadow-md lg:shadow-xl shadow-[#0B2B26]/60">
        <div className="pointer-events-none absolute -top-16 -right-10 w-40 h-40 sm:w-56 sm:h-56 bg-[#0B2B26]/45 blur-3xl rounded-full" />
        <div className="relative flex flex-row justify-between items-center gap-2">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            {activeTeam.logoUrl ? (
              <img
                src={activeTeam.logoUrl}
                alt={activeTeam.name}
                className="w-8 h-8 sm:w-9 sm:h-9 lg:w-11 lg:h-11 xl:w-12 xl:h-12 rounded-lg lg:rounded-xl object-cover border border-[#0B2B26]/85 shadow-md lg:shadow-lg shadow-[#0B2B26]/85 ring-1 lg:ring-2 ring-[#0B2B26]/60 shrink-0"
              />
            ) : (
              <div className="w-8 h-8 sm:w-9 sm:h-9 lg:w-11 lg:h-11 xl:w-12 xl:h-12 rounded-lg lg:rounded-xl bg-gradient-to-br from-[#0B2B26]/35 to-[#0B2B26]/10 border border-[#0B2B26]/60 flex items-center justify-center text-base sm:text-lg lg:text-xl xl:text-2xl shadow-md lg:shadow-lg shadow-[#0B2B26]/85 shrink-0">
                {activeTeam.logo || '🏆'}
              </div>
            )}
            <div className="min-w-0 leading-tight">
              <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap min-w-0">
                <h1 className="text-base sm:text-lg lg:text-xl xl:text-2xl font-display font-bold uppercase tracking-wide text-white truncate max-w-full">{activeTeam.name}</h1>
                <span className="font-mono text-[8px] sm:text-[9px] lg:text-[10px] font-bold text-white bg-[#0B2B26]/25 px-1 py-px rounded border border-[#0B2B26]/60 shrink-0">
                  {activeTeam.shortCode || activeTeam.code}
                </span>
              </div>
              {activeTeam.motto ? (
                <p className="text-[9px] sm:text-[10px] lg:text-[11px] text-secondaryText/70 italic mt-0.5 truncate">{activeTeam.motto}</p>
              ) : (
                <p className="text-[9px] sm:text-[10px] lg:text-[11px] text-secondaryText mt-0.5 truncate">Franchise Manager: {user?.name || 'Manager'}</p>
              )}
              {activeTeam.description && (
                <p className="hidden md:block text-[9px] lg:text-[10px] text-mutedText mt-px truncate">{activeTeam.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center shrink-0">
            <span className={`flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[8px] sm:text-[9px] lg:text-[10px] font-bold uppercase tracking-wider border ${biddingMode === 'blind'
              ? 'bg-warningGold/15 text-warningGold border-warningGold/40'
              : 'bg-[#0B2B26]/25 text-white border-[#0B2B26]/60'
              }`}>
              <Radio className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> {biddingMode || 'normal'} Mode
            </span>
          </div>
        </div>
      </div>

      {/* Franchise stat cards now live in the right-hand manager sidebar. */}

      {/* Main surface — dark pitch-green. The Podium Display starts DIRECTLY
          beneath the team header (left, ~72%) with a compact manager sidebar
          (right, ~28%). Flexes to consume ALL remaining viewport height. */}
      <div className="relative rounded-xl sm:rounded-2xl lg:rounded-3xl flex-1 min-h-0 p-2.5 sm:p-3 lg:p-4 border border-white/5 bg-gradient-to-b from-[#0B2B26]/50 via-[#0B2B26]/25 to-[#050505] shadow-lg lg:shadow-2xl shadow-black/40 overflow-hidden">
        <div className="h-full min-h-0 flex flex-col lg:flex-row gap-2.5 sm:gap-3 overflow-y-auto lg:overflow-visible custom-scrollbar">

          {/* ── LEFT (~72%) — Podium Display / Live Auction stage ─────────── */}
          <div className="relative min-h-[420px] sm:min-h-[480px] lg:min-h-0 lg:flex-[72] min-w-0">
            {/* Decorative vertical spotlight beams — pure CSS, pointer-events-none */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-full flex justify-around px-3 sm:px-8 lg:px-12 overflow-hidden">
              <div className="podium-beam w-16 sm:w-24 lg:w-32 h-full" style={{ '--beam-color': 'rgba(11, 43, 38, 0.85)' }} />
              <div className="podium-beam w-20 sm:w-28 lg:w-36 h-full" style={{ '--beam-color': 'rgba(11, 43, 38, 0.60)' }} />
              <div className="podium-beam w-16 sm:w-24 lg:w-32 h-full" style={{ '--beam-color': 'rgba(244, 197, 66, 0.16)' }} />
            </div>

            {/* Elegant gold floor glow + podium edge line — purely decorative */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-28 overflow-hidden">
              <div className="absolute inset-x-8 sm:inset-x-24 bottom-12 h-24 rounded-full bg-warningGold/10 blur-3xl animate-pulse" />
              <div className="absolute inset-x-10 sm:inset-x-32 bottom-11 h-px bg-gradient-to-r from-transparent via-warningGold/40 to-transparent" />
            </div>

            {/* LIVE AUCTION indicator — floating badge inside the stage. Hidden
                while a broadcast cinematic owns the surface (its own LIVE /
                AUCTION CENTRE HUD badges take over then). */}
            {!stageCinematicActive && (
              <div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 z-40 flex items-center gap-1.5 pl-2 pr-2.5 py-1 rounded-full bg-black/50 backdrop-blur-md border border-neonGreen/40 shadow-lg">
                <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 bg-white" />
                </span>
                <span className="font-display font-bold uppercase tracking-[0.18em] text-[9px] sm:text-[11px] leading-none text-white">Live Auction</span>
              </div>
            )}

            {/* Global sound on/off — top-right corner of the stage */}
            <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 z-40">
              <SoundToggle iconClassName="w-3.5 h-3.5 sm:w-4 sm:h-4" className="!p-1.5 sm:!p-2" />
            </div>

            {/* Target Player Alert — floating glass overlay over the stage top
                so the podium always starts directly beneath the team header.
                Socket-pushed alert beats the polling-derived one. */}
            {(targetAlert?.player || showTargetAlert) && (
              <div className="absolute left-1/2 -translate-x-1/2 top-8 sm:top-9 z-40 w-[min(94%,600px)]">
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
              </div>
            )}

            <PlayerDisplayStage
              className="rounded-2xl"
              fillHeight
              transparentBg
              showLeaderboard={false}
              cinematicHeight="min-h-[240px] sm:min-h-[300px]"
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
                  fitContainer
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

          {/* ── RIGHT (~28%) — compact manager control sidebar.
              Order: Purse → Roster → Leading Bid → Status → Bid Out → Stream.
              Blind Mode hides the stream entirely (§1/§11). */}
          <aside className="w-full lg:w-auto lg:max-w-[320px] xl:max-w-[360px] lg:flex-[28] min-w-0 flex flex-col gap-1.5 sm:gap-2 min-h-0">
            {/* 1 · Available Purse */}
            <div className="flex-none glass-card rounded-lg border border-white/5 bg-gradient-to-r from-[#121814] to-warningGold/10 hover:border-warningGold/30 transition-colors p-2 flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 shrink-0 rounded-md bg-warningGold/10 border border-warningGold/25 flex items-center justify-center text-warningGold">
                <Wallet className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0 flex-1 leading-tight">
                <p className="text-[8px] font-bold uppercase tracking-widest text-secondaryText truncate">Available Purse</p>
                <h3 className="mt-0.5 text-xs sm:text-sm font-black font-mono tabular-nums text-warningGold truncate" title={formatCurrency(activeTeam.remainingBudget)}>{formatCurrency(activeTeam.remainingBudget)}</h3>
                <div className="mt-1 h-0.5 rounded-full bg-surfaceHover overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-white/85 to-white/40 transition-all duration-500" style={{ width: `${pursePct}%` }} />
                </div>
              </div>
            </div>

            {/* 2 · Roster Slots */}
            <div className="flex-none glass-card rounded-lg border border-white/5 bg-gradient-to-r from-[#111815] to-[#0B2B26]/25 hover:border-[#0B2B26]/85 transition-colors p-2 flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 shrink-0 rounded-md bg-[#0B2B26]/25 border border-[#0B2B26]/60 flex items-center justify-center text-white">
                <Users className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0 flex-1 leading-tight">
                <p className="text-[8px] font-bold uppercase tracking-widest text-secondaryText truncate">Roster Slots</p>
                <h3 className="mt-0.5 text-xs sm:text-sm font-black font-mono tabular-nums text-primaryText truncate">{currentRosterCount}<span className="text-mutedText text-[9px] sm:text-[10px] font-bold"> / {eligibility?.minimumPerTeam || minRoster} required</span></h3>
                <div className="mt-1 h-0.5 rounded-full bg-surfaceHover overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-white/85 to-white/40 transition-all duration-500" style={{ width: `${rosterPct}%` }} />
                </div>
              </div>
            </div>

            {/* 3 · Leading Bid / Sealed Bids */}
            <div className="flex-none glass-card rounded-lg border border-white/5 bg-gradient-to-r from-[#14120c] to-warningGold/10 hover:border-warningGold/30 transition-colors p-2 flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 shrink-0 rounded-md bg-warningGold/10 border border-warningGold/25 flex items-center justify-center text-warningGold">
                <Crown className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0 flex-1 leading-tight">
                <p className="text-[8px] font-bold uppercase tracking-widest text-secondaryText truncate">{isBlindMode ? 'Sealed Bids' : 'Leading Bid'}</p>
                {isBlindMode ? (
                  /* §1/§3/§4 — no amounts during a blind round */
                  <h3 className="mt-0.5 text-xs sm:text-sm font-black font-mono tracking-widest text-slate-500 select-none truncate">•••••</h3>
                ) : (
                  <h3 className="mt-0.5 text-xs sm:text-sm font-black font-mono tabular-nums text-warningGold truncate" title={formatCurrency(safeCurrentBid)}>{formatCurrency(safeCurrentBid)}</h3>
                )}
              </div>
            </div>

            {/* 4 · Your Status */}
            <div className={`flex-none glass-card rounded-lg border transition-colors p-2 flex items-center gap-2 min-w-0 ${isCurrentlyHighestBidder ? 'border-[#0B2B26] bg-gradient-to-r from-[#0B2B26]/35 to-cardBg' : 'border-white/5 bg-gradient-to-r from-[#101512] to-transparent'}`}>
              <div className={`w-7 h-7 shrink-0 rounded-md flex items-center justify-center border ${isCurrentlyHighestBidder ? 'bg-[#0B2B26]/35 border-[#0B2B26]/85 text-white' : 'bg-surfaceHover/60 border-borderStrong text-secondaryText'}`}>
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0 flex-1 leading-tight">
                <p className="text-[8px] font-bold uppercase tracking-widest text-secondaryText truncate">Your Status</p>
                <h3 className={`mt-0.5 text-xs sm:text-sm font-black truncate ${isCurrentlyHighestBidder ? 'text-white' : hasOptedOut ? 'text-warningGold' : 'text-primaryText'}`}>
                  {isCurrentlyHighestBidder ? 'Leading' : hasOptedOut ? 'Sitting Out' : podiumPlayer ? 'In The Race' : 'Standby'}
                </h3>
              </div>
            </div>

            {/* 5 · My Bid Out */}
            <div className={`flex-none flex items-center justify-between gap-2.5 sm:gap-3 p-2 sm:p-2.5 rounded-xl sm:rounded-2xl border ${hasOptedOut ? 'bg-warningGold/10 border-warningGold/30' : 'bg-black/30 border-white/5'}`}>
              <div className="flex items-center gap-2 sm:gap-2.5 text-left min-w-0">
                <div className={`w-7 h-7 sm:w-8 sm:h-8 lg:w-9 lg:h-9 rounded-lg flex items-center justify-center flex-shrink-0 border ${hasOptedOut ? 'bg-warningGold/15 border-warningGold/30 text-warningGold' : 'bg-surfaceHover/60 border-borderStrong text-secondaryText'}`}>
                  <ShieldOff className="w-3 h-3 sm:w-3.5 sm:h-3.5 lg:w-4 lg:h-4" />
                </div>
                <p className={`text-[11px] sm:text-xs lg:text-sm font-bold leading-snug ${hasOptedOut ? 'text-warningGold' : 'text-primaryText'}`}>
                  {hasOptedOut ? "You're sitting this player out" : 'Not interested in this player?'}
                </p>
              </div>
              <button
                onClick={handleOptOut}
                disabled={!podiumPlayer || hasOptedOut}
                className="flex-shrink-0 px-2.5 sm:px-3 lg:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-wider border transition flex items-center gap-1 sm:gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed bg-surfaceActive border-urgentRed/30 text-urgentRedText hover:bg-urgentRed/10 hover:border-urgentRed/50"
              >
                <LogOut className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> {hasOptedOut ? 'Bid Out' : 'My Bid Out'}
              </button>
            </div>

            {/* Bid History Table — §1/§11: hidden entirely during Blind Mode so
                no team identity or amount is ever surfaced to competing managers.
                The list itself is THE scrolling section: it takes whatever height
                remains and scrolls internally instead of growing the page. */}
            {!isBlindMode && (
              <div className="flex-1 min-h-0 flex flex-col gap-1.5 sm:gap-2 pt-0 lg:pt-1">
                <h3 className="flex-none text-[10px] sm:text-xs font-bold uppercase tracking-wider text-secondaryText flex items-center justify-between gap-2">
                  <span>Live Bid Stream ({safeBidHistory.length})</span>
                  {highestBidder && (
                    <span className="text-warningGold flex items-center gap-1 font-mono text-[9px] sm:text-[11px] truncate">
                      <TrendingUp className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" /> Leader: {highestBidder.name}
                    </span>
                  )}
                </h3>

                <div className="flex-1 min-h-0 max-h-36 sm:max-h-44 lg:max-h-none overflow-y-auto custom-scrollbar bg-black/30 rounded-lg sm:rounded-xl border border-white/5 p-2 space-y-1 sm:space-y-1.5">
                  {safeBidHistory.length === 0 ? (
                    <p className="text-[10px] sm:text-xs text-mutedText text-center py-3">No bids placed on current player yet.</p>
                  ) : (
                    [...safeBidHistory].reverse().map((bid, idx) => (
                      <div key={bid.id || idx} className="flex justify-between items-center text-[11px] sm:text-xs px-2 sm:px-3 py-1.5 sm:py-2 rounded-md sm:rounded-lg bg-cardBg/60 border border-white/5 hover:border-[#0B2B26]/60 transition-colors gap-2">
                        <span className="font-bold text-white truncate">{bid.bidder}</span>
                        <span className="font-mono font-bold tabular-nums text-warningGold shrink-0">{formatCurrency(bid.amount)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>

      {/* Cinematic overlays are rendered confined inside the Podium Display
          stage above (via PlayerDisplayStage) — no full-screen overlays. */}

    </div>
  );
};
