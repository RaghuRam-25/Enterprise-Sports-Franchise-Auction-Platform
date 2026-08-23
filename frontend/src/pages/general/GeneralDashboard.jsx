import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Radio, Trophy, CalendarClock, History, ArrowRight, Sparkles, Volleyball, Users, ShieldCheck
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useAuction } from '../../context/AuctionContext';
import { usePhase } from '../../context/PhaseContext';
import TeamBadge from '../../components/common/TeamBadge';

const getMatchDateTime = (match) => {
  if (!match?.matchDate) return null;
  try {
    const base = new Date(match.matchDate);
    if (isNaN(base.getTime())) return null;
    if (match.matchTime && /^\d{1,2}:\d{2}/.test(match.matchTime)) {
      const [h, m] = match.matchTime.split(':').map(Number);
      base.setHours(h, m, 0, 0);
    }
    return base;
  } catch {
    return null;
  }
};

const getCalculatedStatus = (match) => {
  if (match.status && match.status !== 'Upcoming') return match.status;
  const matchDT = getMatchDateTime(match);
  if (!matchDT) return match.status || 'Upcoming';
  const now = new Date();
  const end = new Date(matchDT.getTime() + 3 * 60 * 60 * 1000);
  if (now > end) return 'Finished';
  if (now >= matchDT && now <= end) return 'Live';
  return 'Upcoming';
};

const teamNameOf = (m, side) =>
  side === 'a'
    ? m.teamAName || m.homeTeam || (typeof m.teamA === 'object' ? m.teamA?.name : '') || 'Team A'
    : m.teamBName || m.awayTeam || (typeof m.teamB === 'object' ? m.teamB?.name : '') || 'Team B';

const PHASE_LABELS = {
  SETUP: 'Pre-Season Setup',
  REGISTRATION: 'Player Registration',
  AUCTION: 'Live Auction Season',
  TOURNAMENT: 'Tournament Live',
};

export default function GeneralDashboard() {
  const { user } = useAuth();
  const { teams } = useAuction();
  const { phase } = usePhase();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/matches');
        const data = res?.data?.data || res?.data || [];
        if (!cancelled) setMatches(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setMatches([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const processed = useMemo(() => matches.map(m => ({ ...m, calculatedStatus: getCalculatedStatus(m) })), [matches]);
  const liveMatches = useMemo(() => processed.filter(m => m.calculatedStatus === 'Live'), [processed]);
  const upcoming = useMemo(() =>
    processed
      .filter(m => m.calculatedStatus === 'Upcoming')
      .sort((a, b) => (getMatchDateTime(a)?.getTime() || 0) - (getMatchDateTime(b)?.getTime() || 0))
      .slice(0, 4), [processed]);
  const recentResults = useMemo(() =>
    processed
      .filter(m => m.calculatedStatus === 'Finished')
      .sort((a, b) => (getMatchDateTime(b)?.getTime() || 0) - (getMatchDateTime(a)?.getTime() || 0))
      .slice(0, 4), [processed]);

  const firstName = user?.name?.split(' ')[0] || 'Fan';

  const overviewCards = [
    {
      label: 'Live Matches',
      value: loading ? '—' : liveMatches.length,
      icon: Radio,
      accent: 'text-urgentRedText bg-urgentRed/10 border-urgentRed/30',
      to: '/general/matches',
    },
    {
      label: 'Active Tournament',
      value: PHASE_LABELS[phase] || 'Coming Soon',
      icon: Trophy,
      accent: 'text-warningGold bg-warningGold/10 border-warningGold/30',
      to: '/general/tournaments',
      small: true,
    },
    {
      label: 'Upcoming Matches',
      value: loading ? '—' : processed.filter(m => m.calculatedStatus === 'Upcoming').length,
      icon: CalendarClock,
      accent: 'text-white bg-neonGreen/10 border-neonGreen/30',
      to: '/general/schedule',
    },
    {
      label: 'Recent Results',
      value: loading ? '—' : processed.filter(m => m.calculatedStatus === 'Finished').length,
      icon: History,
      accent: 'text-white bg-neonGreen/10 border-neonGreen/30',
      to: '/general/results',
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── Welcome Area ─────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-cardBorder bg-gradient-to-r from-successGreen/60 via-cardBg to-darkBg p-6 sm:p-8">
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-[#0B2B26]/45 blur-3xl pointer-events-none" />
        <div className="relative space-y-2">
          <p className="flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase tracking-widest text-white">
            <Sparkles className="w-3.5 h-3.5" /> Fan Zone
          </p>
          <h1 className="text-2xl sm:text-3xl font-black text-white">Welcome back, {firstName}</h1>
        </div>
      </div>

      {/* ── Quick Overview ───────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-secondaryText">Quick Overview</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {overviewCards.map(card => {
            const Icon = card.icon;
            return (
              <Link
                key={card.label}
                to={card.to}
                className="glass-card glass-card-hover rounded-2xl p-5 border border-borderStrong flex items-start justify-between gap-3 group"
              >
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-mutedText">{card.label}</p>
                  <p className={`mt-1.5 font-black text-white truncate ${card.small ? 'text-sm' : 'text-2xl'}`}>
                    {card.value}
                  </p>
                </div>
                <span className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${card.accent}`}>
                  <Icon className="w-5 h-5" />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── Upcoming + Recent row ────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Upcoming Matches */}
        <section className="glass-card rounded-2xl p-5 border border-cardBorder space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-secondaryText">
              <CalendarClock className="w-4 h-4 text-white" /> Upcoming Matches
            </h3>
            <Link to="/general/schedule" className="flex items-center gap-1 text-[11px] font-bold text-white hover:text-white">
              Schedule <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <p className="text-xs text-mutedText py-6 text-center">No upcoming matches scheduled yet.</p>
          ) : (
            <ul className="divide-y divide-cardBorder/70">
              {upcoming.map(m => (
                <li key={m._id || m.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0 text-xs">
                    <p className="font-bold text-primaryText truncate">
                      {teamNameOf(m, 'a')} <span className="text-mutedText font-medium">vs</span> {teamNameOf(m, 'b')}
                    </p>
                    <p className="text-[11px] text-mutedText mt-0.5">
                      {m.matchDate || 'TBD'}{m.matchTime ? ` · ${m.matchTime}` : ''}
                    </p>
                  </div>
                  <Volleyball className="w-4 h-4 text-mutedText shrink-0" />
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Recent Results */}
        <section className="glass-card rounded-2xl p-5 border border-cardBorder space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-secondaryText">
              <History className="w-4 h-4 text-white" /> Recent Results
            </h3>
            <Link to="/general/results" className="flex items-center gap-1 text-[11px] font-bold text-white hover:text-white">
              All results <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {recentResults.length === 0 ? (
            <p className="text-xs text-mutedText py-6 text-center">No results published yet.</p>
          ) : (
            <ul className="divide-y divide-cardBorder/70">
              {recentResults.map(m => (
                <li key={m._id || m.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0 text-xs">
                    <p className="font-bold text-primaryText truncate">
                      {teamNameOf(m, 'a')} <span className="text-mutedText font-medium">vs</span> {teamNameOf(m, 'b')}
                    </p>
                    <p className="text-[11px] text-mutedText mt-0.5">{m.matchDate || ''}</p>
                  </div>
                  <span className="font-mono font-black text-sm text-white shrink-0">
                    {m.scoreA ?? 0} : {m.scoreB ?? 0}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
