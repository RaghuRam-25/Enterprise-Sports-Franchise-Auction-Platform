import { useState, useEffect, useMemo } from 'react';
import { History, CalendarDays } from 'lucide-react';
import api from '../../services/api';

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

const dayLabel = (match) => {
  const dt = getMatchDateTime(match);
  if (!dt) return match.matchDate || '';
  const today = new Date();
  const diffDays = Math.round(
    (new Date(today.getFullYear(), today.getMonth(), today.getDate()) -
      new Date(dt.getFullYear(), dt.getMonth(), dt.getDate())) / 86400000
  );
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  try {
    return dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  } catch {
    return match.matchDate || '';
  }
};

export default function GeneralResults() {
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

  // Group finished matches by day label, newest first
  const grouped = useMemo(() => {
    const finished = matches
      .map(m => ({ ...m, calculatedStatus: getCalculatedStatus(m) }))
      .filter(m => m.calculatedStatus === 'Finished')
      .sort((a, b) => (getMatchDateTime(b)?.getTime() || 0) - (getMatchDateTime(a)?.getTime() || 0));

    const groups = new Map();
    for (const m of finished) {
      const label = dayLabel(m);
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label).push(m);
    }
    return Array.from(groups.entries());
  }, [matches]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-black text-white">
          <History className="w-5 h-5 text-white" /> Results
        </h1>
        <p className="text-xs text-secondaryText mt-1">Completed matches and final scores.</p>
      </div>

      {loading ? (
        <div className="glass-card rounded-2xl p-10 border border-cardBorder text-center">
          <span className="inline-block w-6 h-6 border-2 border-borderStrong border-t-neonGreen rounded-full animate-spin" />
        </div>
      ) : grouped.length === 0 ? (
        <div className="glass-card rounded-2xl p-10 border border-cardBorder text-center space-y-2">
          <CalendarDays className="w-8 h-8 mx-auto text-mutedText" />
          <p className="text-sm font-bold text-secondaryText">No results published yet</p>
          <p className="text-xs text-mutedText">Check back after the first match day.</p>
        </div>
      ) : (
        grouped.map(([dayLabelStr, dayMatches]) => (
          <section key={dayLabelStr} className="glass-card rounded-2xl border border-cardBorder overflow-hidden">
            <div className="px-5 py-3 bg-cardBg/80 border-b border-cardBorder">
              <h3 className="text-xs font-bold uppercase tracking-wider text-secondaryText">{dayLabelStr}</h3>
            </div>
            <ul className="divide-y divide-cardBorder/70">
              {dayMatches.map(m => {
                const sa = Number(m.scoreA) || 0;
                const sb = Number(m.scoreB) || 0;
                const aWon = sa > sb;
                const bWon = sb > sa;
                return (
                  <li key={m._id || m.id} className="px-5 py-3.5 flex items-center justify-between gap-4 hover:bg-surfaceHover/30 transition">
                    <div className="flex-1 min-w-0 text-right sm:text-left sm:flex sm:items-center sm:justify-end sm:gap-3">
                      <span className={`block sm:text-right text-xs font-bold truncate ${aWon ? 'text-white' : 'text-secondaryText'}`}>
                        {teamNameOf(m, 'a')}
                      </span>
                    </div>
                    <span className={`font-mono font-black text-base px-3 py-1 rounded-lg border shrink-0 ${m.calculatedStatus === 'Finished' ? 'bg-darkBg border-borderStrong text-white' : ''}`}>
                      {sa} : {sb}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className={`block text-xs font-bold truncate ${bWon ? 'text-white' : 'text-secondaryText'}`}>
                        {teamNameOf(m, 'b')}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
