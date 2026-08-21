import { useState, useEffect, useMemo } from 'react';
import { Zap, Gavel, CheckCircle2, TrendingUp, LogOut, ShieldOff, Wallet, Users, Crown, Radio } from 'lucide-react';
import { useAuction } from '../../context/AuctionContext';
import { useAuth } from '../../context/AuthContext';
import { PlayerDisplayStage, TargetPlayerAlert } from '../../components/auction';
import { useAuctionAnimation } from '../../hooks/useAuctionAnimation';

import { playerFallback } from '../../utils/playerFallback';
import { getImageUrl } from '../../utils/imageUrl';

export const ManagerDashboard = () => {
  const { user } = useAuth();
  const {
    teams = [],
    podiumPlayer,
    currentBid = 0,
    highestBidder,
    biddingMode = 'normal',
    timerStatus = 'idle',
    bidHistory = [],
    calculateNextBidAmount,
    placeNormalBid,
    placeBlindBid,
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
  const [blindBidError, setBlindBidError] = useState('');
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

  const handleBlindBidSubmit = (e) => {
    e.preventDefault();
    setBlindBidError('');
    if (hasOptedOut) return;

    const targetTeamId = activeTeam.id || activeTeam._id;
    const res = placeBlindBid ? placeBlindBid(targetTeamId, blindBidAmount) : { success: false, error: 'Blind bid service unavailable' };

    if (!res.success) {
      setBlindBidError(res.error || 'Validation failed');
      triggerToast('Blind Bid Failed validation check!', 'error');
    } else {
      triggerToast(`Sealed blind bid of ${formatCurrency(blindBidAmount)} submitted.`, 'success');
      setBlindBidAmount('');
    }
  };

  const handleOptOut = () => {
    if (!podiumPlayer || hasOptedOut) return;
    setHasOptedOut(true);
    triggerToast(`You've opted out of bidding on ${podiumPlayer.name}.`, 'info');
  };

  const bidButtonDisabled = !podiumPlayer || timerStatus !== 'running' || isCurrentlyHighestBidder || hasOptedOut || nextExactBid > activeTeam.remainingBudget;

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
            : `Place Bid: ${formatCurrency(nextExactBid)}`;

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

      {/* Real-Time Target Player Alert Notification Banner */}
      {/* Live socket-pushed alert fired the moment this manager's target player
          hits the podium — beats the polling-derived banner below. */}
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

      {/* Real-Time Target Player Alert Notification Banner */}
      {showTargetAlert && !targetAlert && (
        <TargetPlayerAlert
          targetItem={activeTargetItem}
          onQuickBid={handleNormalBidSubmit}
          onDismiss={() => setDismissedAlertPlayerId(podiumPlayerId)}
        />
      )}


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
          <h3 className="mt-3 text-xl font-black font-mono text-primaryText">{currentRosterCount}<span className="text-mutedText text-sm"> / {activeTeam.minRoster || 11} min</span></h3>
          <div className="mt-2 h-1.5 rounded-full bg-surfaceHover overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-neonGreen to-neonGreen transition-all duration-500" style={{ width: `${rosterPct}%` }} />
          </div>
        </div>

        <div className="group glass-card rounded-2xl p-4 border border-white/5 bg-gradient-to-br from-cardBg to-warningGold/20 hover:border-warningGold/30 transition-all duration-300 hover:-translate-y-0.5">
          <div className="flex items-center gap-2 text-warningGold">
            <div className="w-9 h-9 rounded-xl bg-warningGold/10 border border-warningGold/20 flex items-center justify-center">
              <Crown className="w-4.5 h-4.5" />
            </div>
            <span className="text-[10px] font-bold text-secondaryText uppercase tracking-widest">Leading Bid</span>
          </div>
          <h3 className="mt-3 text-xl font-black font-mono text-warningGold">{formatCurrency(safeCurrentBid)}</h3>
          <p className="mt-2 text-[11px] text-mutedText truncate">{highestBidder ? highestBidder.name : 'Awaiting opening bid'}</p>
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

        {/* Shared confined Player Display stage — premium cinematic surface for
            the Manager / Player panel. Confined to this card; the team header,
            bid controls, opt-out, and bid stream below all stay visible. */}
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
          showWaiting={!podiumPlayer && (animState === ANIM_STATES_HOOK?.IDLE || !animState)}
          waitingStats={{
            teamsConnected: safeTeams.length,
            managersReady: safeTeams.filter((t) => t.managerId).length,
          }}
        >
          {podiumPlayer ? (
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center bg-gradient-to-br from-darkBg/90 to-cardBg/60 p-6 rounded-2xl border border-white/5 shadow-inner">
              <div className="relative mx-auto md:mx-0">
                <div className="absolute -inset-1.5 rounded-2xl bg-gradient-to-br from-neonGreen/30 to-transparent blur-md" />
                <img
                  src={getImageUrl(podiumPlayer.imageUrl, playerFallback('emerald'))}
                  alt={podiumPlayer.name}
                  className="relative w-36 h-36 rounded-2xl object-cover border-2 border-neonGreen/40 shadow-2xl"
                />
                <span className="absolute -bottom-2 -right-2 px-2.5 py-0.5 bg-neonGreen text-darkBg font-black text-[10px] rounded-lg uppercase tracking-wider shadow-lg">
                  {podiumPlayer.category}
                </span>
              </div>

              <div className="md:col-span-2 space-y-3 text-center md:text-left">
                <div>
                  <h3 className="text-2xl font-black text-white tracking-tight">{podiumPlayer.name}</h3>
                  <p className="text-xs text-secondaryText mt-0.5">
                    Jersey: <strong className="text-primaryText">{podiumPlayer.jerseyName}</strong> &bull; Student ID: <span className="font-mono">{podiumPlayer.studentId}</span>
                  </p>
                </div>

                <div className="flex flex-wrap gap-1.5 justify-center md:justify-start text-[11px]">
                  <span className="px-2.5 py-1 bg-surfaceHover/80 text-secondaryText rounded-lg font-semibold border border-white/5">
                    Primary: {podiumPlayer.primaryPosition}
                  </span>
                  <span className="px-2.5 py-1 bg-surfaceHover/80 text-secondaryText rounded-lg font-semibold border border-white/5">
                    Session: {podiumPlayer.session}
                  </span>
                </div>

                <div className="pt-3 border-t border-white/5 grid grid-cols-2 gap-4 text-xs">
                  <div className="rounded-xl bg-cardBg/60 border border-white/5 px-3 py-2">
                    <span className="text-[10px] text-mutedText uppercase tracking-widest">Base Price</span>
                    <p className="font-mono font-bold text-primaryText mt-0.5">{formatCurrency(podiumPlayer.basePrice)}</p>
                  </div>
                  <div className="rounded-xl bg-neonGreen/5 border border-neonGreen/20 px-3 py-2">
                    <span className="text-[10px] text-mutedText uppercase tracking-widest">Current High Bid</span>
                    <p className="font-mono font-bold text-xl text-neonGreen mt-0.5">{formatCurrency(safeCurrentBid)}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-16 text-center text-mutedText bg-gradient-to-b from-darkBg/60 to-transparent rounded-2xl border border-white/5 space-y-2">
              <Gavel className="w-12 h-12 mx-auto text-mutedText animate-pulse" />
              <p className="font-bold text-secondaryText">Podium is currently empty</p>
              <p className="text-xs text-mutedText">Waiting for Podium Admin to launch the next player.</p>
            </div>
          )}
        </PlayerDisplayStage>

        {/* Bid Action Card */}
        {biddingMode === 'normal' ? (
          <div className="relative overflow-hidden bg-darkBg/80 p-5 sm:p-6 rounded-2xl border border-neonGreen/20">
            <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 w-64 h-32 bg-neonGreen/20 blur-3xl rounded-full" />

            <div className="relative flex flex-col sm:flex-row items-center gap-5">
              <div className="text-center sm:text-left flex-shrink-0">
                <span className="text-[10px] text-secondaryText uppercase tracking-widest">Next Minimum Bid Required</span>
                <p className="text-3xl font-black font-mono text-neonGreen">{formatCurrency(nextExactBid)}</p>
              </div>

              <button
                onClick={handleNormalBidSubmit}
                disabled={bidButtonDisabled}
                className={`group relative flex-1 w-full py-5 rounded-2xl font-black text-sm sm:text-base uppercase tracking-wider transition-all duration-300 shadow-2xl flex items-center justify-center gap-2.5 overflow-hidden ${isCurrentlyHighestBidder
                  ? 'bg-successGreen/90 text-darkBg border border-neonGreen/40 cursor-default'
                  : hasOptedOut
                    ? 'bg-surfaceActive text-secondaryText border border-borderStrong cursor-not-allowed'
                    : !podiumPlayer || timerStatus !== 'running'
                      ? 'bg-surfaceActive text-secondaryText border border-borderStrong cursor-not-allowed'
                      : nextExactBid > activeTeam.remainingBudget
                        ? 'bg-urgentRed text-urgentRedText border border-urgentRed cursor-not-allowed'
                        : 'bg-gradient-to-r from-neonGreen via-neonGreen to-neonGreen bg-[length:200%_100%] hover:bg-[position:100%_0] text-darkBg shadow-successGreen/60 hover:shadow-neonGreen/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99]'
                  }`}
              >
                {!bidButtonDisabled && (
                  <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
                    <span className="absolute -inset-y-full -left-1/2 w-1/3 rotate-12 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-[130%] group-hover:translate-x-[420%] transition-transform duration-[900ms] ease-out" />
                  </span>
                )}
                <Zap className={`w-5 h-5 sm:w-6 sm:h-6 fill-current relative ${!bidButtonDisabled ? 'animate-pulse' : ''}`} />
                <span className="relative">{bidButtonLabel}</span>
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleBlindBidSubmit} className="space-y-4 bg-darkBg/80 p-5 sm:p-6 rounded-2xl border border-warningGold/20 hidden group-[:fullscreen]:block">
            <div>
              <label className="block text-xs font-bold text-warningGold uppercase mb-1">Sealed Blind Bid Amount (BDT)</label>
              <input
                type="number"
                value={blindBidAmount}
                onChange={e => setBlindBidAmount(e.target.value)}
                placeholder="Enter sealed bid..."
                className="glass-input w-full px-3 py-2.5 rounded-xl font-mono text-sm text-white"
                disabled={hasOptedOut}
                required
              />
              {blindBidError && (
                <p className="text-[11px] text-urgentRedText font-semibold mt-1">{blindBidError}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={!podiumPlayer || timerStatus !== 'running' || !blindBidAmount || hasOptedOut}
              className="w-full py-3.5 bg-gradient-to-r from-warningGold to-warningGold hover:from-warningGold hover:to-warningGold text-darkBg font-bold text-xs uppercase tracking-wider rounded-xl transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" /> Submit Sealed Blind Bid
            </button>
          </form>
        )}

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
              <p className="text-[11px] text-mutedText">
                {hasOptedOut
                  ? 'You will re-enter bidding automatically when the next player comes up.'
                  : 'You can opt out of bidding for the current player at any time.'}
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

        {/* Bid History Table */}
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
      </div>

      {/* Cinematic overlays are now rendered confined inside the Podium Display
          stage above (via PlayerDisplayStage) — no full-screen overlays. */}

    </div>
  );
};
