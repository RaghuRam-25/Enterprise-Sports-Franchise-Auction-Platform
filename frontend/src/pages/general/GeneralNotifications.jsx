import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Radio, Trophy, CalendarClock, History, ArrowRight } from 'lucide-react';
import api from '../../services/api';
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

const PHASE_NOTICES = {
  AUCTION: { icon: Radio, tone: 'text-urgentRedText bg-urgentRed/50 border-urgentRed/30', title: 'Live auction is running', body: 'Players are on the block right now — watch the action unfold.', to: '/general/live', cta: 'Watch Live' },
  REGISTRATION: { icon: Trophy, tone: 'text-white bg-successGreen/50 border-neonGreen/30', title: 'Player registration is open', body: 'New players are joining the tournament pool.', to: '/general/players', cta: 'Browse Players' },
  TOURNAMENT: { icon: Trophy, tone: 'text-white bg-successGreen/50 border-neonGreen/30', title: 'Tournament in progress', body: 'Matches are being played — follow scores and standings.', to: '/general/matches', cta: 'Match Center' },
};

/**
 * Lightweight notifications derived from live platform state
 * (phase + matches). Uses existing public data — no separate
 * notification backend needed.
 */
export default function GeneralNotifications() {
  const { phase } = usePhase();
  const [matches, setMatches] = useState([]);
  const [readIds, setReadIds] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('gu_read_notifications') || '[]')); }
    catch { return new Set(); }
  });

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

  const notifications = useMemo(() => {
    const items = [];
    const processed = matches.map(m => ({ ...m, calculatedStatus: getCalculatedStatus(m) }));

    // Platform-level notice from current phase
    if (PHASE_NOTICES[phase]) items.push({ id: `phase-${phase}`, ...PHASE_NOTICES[phase] });

    // Live matches
    for (const m of processed.filter(m => m.calculatedStatus === 'Live').slice(0, 3)) {
      items.push({
        id: `live-${m._id || m.id}`,
        icon: Radio,
        tone: 'text-urgentRedText bg-urgentRed/40 border-urgentRed/20',
        title: `LIVE: ${teamNameOf(m, 'a')} vs ${teamNameOf(m, 'b')}`,
        body: 'This match is happening right now.',
        to: '/general/matches',
        cta: 'Match Center'
      });
    }

    // Upcoming today/tomorrow
    const soon = processed
      .filter(m => m.calculatedStatus === 'Upcoming' && getMatchDateTime(m))
      .sort((a, b) => getMatchDateTime(a) - getMatchDateTime(b))
      .slice(0, 3);
    for (const m of soon) {
      items.push({
        id: `up-${m._id || m.id}`,
        icon: CalendarClock,
        tone: 'text-white bg-successGreen/40 border-neonGreen/20',
        title: `Match starting soon: ${teamNameOf(m, 'a')} vs ${teamNameOf(m, 'b')}`,
        body: `${m.matchDate || 'TBD'}${m.matchTime ? ` · ${m.matchTime}` : ''}`,
        to: '/general/schedule',
        cta: 'View Schedule'
      });
    }

    // Latest result
    const latestResult = processed
      .filter(m => m.calculatedStatus === 'Finished')
      .sort((a, b) => (getMatchDateTime(b)?.getTime() || 0) - (getMatchDateTime(a)?.getTime() || 0))[0];
    if (latestResult) {
      items.push({
        id: `res-${latestResult._id || latestResult.id}`,
        icon: History,
        tone: 'text-white bg-successGreen/40 border-neonGreen/20',
        title: `Result published: ${teamNameOf(latestResult, 'a')} ${latestResult.scoreA ?? 0} - ${latestResult.scoreB ?? 0} ${teamNameOf(latestResult, 'b')}`,
        body: latestResult.matchDate || '',
        to: '/general/results',
        cta: 'All Results'
      });
    }

    return items;
  }, [matches, phase]);

  const markRead = (id) => {
    setReadIds(prev => {
      const next = new Set([...prev, id]);
      localStorage.setItem('gu_read_notifications', JSON.stringify([...next]));
      return next;
    });
  };

  const unreadCount = notifications.filter(n => !readIds.has(n.id)).length;

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-black text-white">
            <Bell className="w-5 h-5 text-white" /> Notifications
          </h1>
        </div>
        {unreadCount > 0 && (
          <span className="text-[11px] font-bold text-white bg-neonGreen/10 border border-neonGreen/30 rounded-full px-3 py-1">
            {unreadCount} new
          </span>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="glass-card rounded-2xl p-10 border border-cardBorder text-center space-y-2">
          <Bell className="w-8 h-8 mx-auto text-mutedText" />
          <p className="text-sm font-bold text-secondaryText">No notifications right now</p>
          <p className="text-xs text-mutedText">Updates will appear here as the tournament progresses.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {notifications.map(n => {
            const Icon = n.icon;
            const isUnread = !readIds.has(n.id);
            return (
              <li
                key={n.id}
                className={`glass-card rounded-2xl p-4 border flex items-start gap-3 transition ${isUnread ? 'border-borderStrong' : 'border-cardBorder opacity-70'}`}
              >
                <span className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${n.tone}`}>
                  <Icon className="w-4 h-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-primaryText">{n.title}</p>
                  {n.body && <p className="text-[11px] text-mutedText mt-0.5">{n.body}</p>}
                  <Link to={n.to} onClick={() => markRead(n.id)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-white hover:text-white mt-1.5">
                    {n.cta} <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
                {isUnread && <span className="w-2 h-2 rounded-full bg-white mt-1.5 shrink-0" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
