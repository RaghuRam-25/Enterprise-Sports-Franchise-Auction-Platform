import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, CalendarClock, History, ListOrdered, ShieldCheck, Radio, ArrowRight, Info } from 'lucide-react';
import api from '../../services/api';
import { useAuction } from '../../context/AuctionContext';
import { usePhase } from '../../context/PhaseContext';

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

const PHASE_META = {
  SETUP: { label: 'Pre-Season Setup', color: 'text-slate-300 bg-slate-800 border-slate-700' },
  REGISTRATION: { label: 'Player Registration Open', color: 'text-sky-300 bg-sky-950/60 border-sky-500/40' },
  AUCTION: { label: 'Live Auction Season', color: 'text-rose-300 bg-rose-950/60 border-rose-500/40' },
  TOURNAMENT: { label: 'Tournament In Progress', color: 'text-emerald-300 bg-emerald-950/60 border-emerald-500/40' },
};

export default function GeneralTournaments() {
  const { teams, sessions } = useAuction();
  const { phase } = usePhase();
  const [matches, setMatches] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/matches');
        const data = res?.data?.data || res?.data || [];
        if (!cancelled) setMatches(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setMatches([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const processed = useMemo(() => matches.map(m => ({ ...m, calculatedStatus: getCalculatedStatus(m) })), [matches]);
  const upcoming = useMemo(() =>
    processed.filter(m => m.calculatedStatus === 'Upcoming')
      .sort((a, b) => (getMatchDateTime(a)?.getTime() || 0) - (getMatchDateTime(b)?.getTime() || 0))
      .slice(0, 5), [processed]);
  const recent = useMemo(() =>
    processed.filter(m => m.calculatedStatus === 'Finished')
      .sort((a, b) => (getMatchDateTime(b)?.getTime() || 0) - (getMatchDateTime(a)?.getTime() || 0))
      .slice(0, 5), [processed]);

  const tournamentName = sessions?.[0]?.name || 'Enterprise Sports League';
  const phaseMeta = PHASE_META[phase] || PHASE_LABELS_FALLBACK;

  return (
    <div className="space-y-6">
      {/* Tournament hero */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-950 p-6 sm:p-8">
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
        <div className="relative space-y-3">
          <p className="flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase tracking-widest text-amber-400">
            <Trophy className="w-3.5 h-3.5" /> Tournament
          </p>
          <h1 className="text-2xl sm:text-3xl font-black text-white">{tournamentName}</h1>
          <span className={`inline-block px-3 py-1 rounded-full text-[11px] font-bold border ${phaseMeta.color}`}>
            {phaseMeta.label}
          </span>
          <div className="flex flex-wrap gap-x-6 gap-y-1 pt-2 text-xs text-slate-400">
            <span>Season: <strong className="text-slate-200">{sessions?.length || 0}</strong></span>
            <span>Franchises: <strong className="text-slate-200">{teams?.length || 0}</strong></span>
            <span>Total Matches: <strong className="text-slate-200">{processed.length}</strong></span>
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Live Auction', icon: Radio, to: '/general/live', accent: 'text-rose-400' },
          { label: 'Schedule', icon: CalendarClock, to: '/general/schedule', accent: 'text-sky-400' },
          { label: 'Standings', icon: ListOrdered, to: '/general/standings', accent: 'text-emerald-400' },
          { label: 'Teams', icon: ShieldCheck, to: '/general/teams', accent: 'text-purple-400' },
        ].map(link => {
          const Icon = link.icon;
          return (
            <Link key={link.label} to={link.to}
              className="glass-card glass-card-hover rounded-2xl p-4 border border-slate-800 flex items-center gap-3 group">
              <Icon className={`w-5 h-5 ${link.accent}`} />
              <span className="text-xs font-bold text-slate-200 group-hover:text-white">{link.label}</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-600 ml-auto group-hover:text-slate-400" />
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Upcoming fixtures */}
        <section className="glass-card rounded-2xl p-5 border border-slate-800 space-y-4">
          <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
            <CalendarClock className="w-4 h-4 text-sky-400" /> Upcoming Matches
          </h3>
          {upcoming.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">No matches scheduled yet.</p>
          ) : (
            <ul className="divide-y divide-slate-800/70">
              {upcoming.map(m => (
                <li key={m._id || m.id} className="py-2.5 text-xs">
                  <p className="font-bold text-slate-200 truncate">
                    {teamNameOf(m, 'a')} <span className="text-slate-500 font-medium">vs</span> {teamNameOf(m, 'b')}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {m.matchDate || 'TBD'}{m.matchTime ? ` · ${m.matchTime}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Recent results */}
        <section className="glass-card rounded-2xl p-5 border border-slate-800 space-y-4">
          <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
            <History className="w-4 h-4 text-emerald-400" /> Recent Results
          </h3>
          {recent.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">No results published yet.</p>
          ) : (
            <ul className="divide-y divide-slate-800/70">
              {recent.map(m => (
                <li key={m._id || m.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <p className="font-bold text-slate-200 truncate">
                    {teamNameOf(m, 'a')} <span className="text-slate-500 font-medium">vs</span> {teamNameOf(m, 'b')}
                  </p>
                  <span className="font-mono font-black text-sm text-emerald-400 shrink-0">
                    {m.scoreA ?? 0} : {m.scoreB ?? 0}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Participating franchises */}
      <section className="glass-card rounded-2xl p-5 border border-slate-800 space-y-4">
        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
          <ShieldCheck className="w-4 h-4 text-purple-400" /> Participating Franchises
        </h3>
        {teams?.length ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {teams.map(t => (
              <Link
                key={t._id || t.id}
                to={`/general/teams/${t._id || t.id}`}
                className="flex items-center gap-2 bg-slate-900/60 border border-slate-800 hover:border-slate-600 rounded-xl px-3 py-2 transition"
              >
                <span className="font-mono text-[10px] font-black text-sky-400 bg-sky-500/10 border border-sky-500/30 rounded px-1.5 py-0.5">
                  {t.shortCode || t.code || 'TM'}
                </span>
                <span className="text-xs font-bold text-slate-200 truncate">{t.name}</span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="flex items-center gap-2 text-xs text-slate-500 py-4 justify-center">
            <Info className="w-4 h-4" /> No franchises created yet.
          </p>
        )}
      </section>
    </div>
  );
}

const PHASE_LABELS_FALLBACK = { label: 'Coming Soon', color: 'text-slate-300 bg-slate-800 border-slate-700' };
