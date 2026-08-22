import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Trophy, Calendar, ChevronRight, Clock, MapPin,
  Shield, X, ArrowUp
} from 'lucide-react';
import Navbar from '../../components/Navbar';
import CompetitionHeader from '../../components/common/CompetitionHeader';
import api from '../../services/api';
import { getImageUrl } from '../../utils/imageUrl';
import { getTeamAvatarConfig } from '../../utils/themeConfig';
import { useAuction } from '../../context/AuctionContext';
import { useAuth } from '../../context/AuthContext';

// ─────────────────────────────────────────────────────────────────────────
// Date / time helpers — match records carry plain `matchDate` strings and
// `matchTime` strings (e.g. "1:00 PM"), with NO explicit stored timezone.
// ─────────────────────────────────────────────────────────────────────────
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

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

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

// "Today" / "Tomorrow" / "Fri, Sep 4" label for a match's kickoff.
const matchDayLabel = (match) => {
  const dt = getMatchDateTime(match);
  if (!dt) return match.matchTime || 'TBD';
  const diffDays = Math.round((startOfDay(dt) - startOfDay(new Date())) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  try {
    return dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  } catch {
    return dt.toISOString().slice(0, 10);
  }
};

const formatFullDate = (match) => {
  const dt = getMatchDateTime(match);
  if (!dt) return 'Date TBD';
  try {
    return dt.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return match.matchDate;
  }
};

// Day label for a finished result — "Today" / "Yesterday" / "Tue, Aug 18".
const resultDayLabel = (match) => {
  const dt = getMatchDateTime(match);
  if (!dt) return '';
  const diffDays = Math.round((startOfDay(new Date()) - startOfDay(dt)) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  try {
    return dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
};

const getInitials = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'TM';

// ─────────────────────────────────────────────────────────────────────────
// TeamCrest — deterministic per-team crest (uploaded logo or auto icon),
// same colouring logic as TeamBadge across the rest of the platform.
// ─────────────────────────────────────────────────────────────────────────
function TeamCrest({ team, size = 'md', ring = false }) {
  const teamRef = typeof team === 'string' ? null : team;
  const name = teamRef?.name || (typeof team === 'string' ? team : 'Team');
  const shortCode = teamRef?.shortCode || teamRef?.code || name.slice(0, 3).toUpperCase();
  const avatarConfig = getTeamAvatarConfig(teamRef && teamRef.name ? teamRef : { name, shortCode });
  const IconComponent = avatarConfig.IconComponent;

  const logoUrl = teamRef?.logoUrl || (teamRef?.logo && typeof teamRef.logo === 'string' && (teamRef.logo.startsWith('http') || teamRef.logo.startsWith('/')) ? teamRef.logo : '');
  const customColors = teamRef?.primaryColor || teamRef?.secondaryColor;
  const [imgError, setImgError] = useState(false);
  const showImg = !!logoUrl && !imgError;

  const dims = {
    'xs': 'w-8 h-8 rounded-lg text-[8px]',
    'sm': 'w-10 h-10 rounded-xl text-[10px]',
    'md': 'w-12 h-12 rounded-2xl text-xs',
    'lg': 'w-14 h-14 rounded-2xl text-sm',
  }[size] || 'w-12 h-12 rounded-2xl text-xs';

  return (
    <div
      className={`relative flex-shrink-0 flex items-center justify-center font-black overflow-hidden border shadow-md ${dims} ${avatarConfig.borderColor} ${ring ? 'ring-1 ring-borderStrong ring-offset-1 ring-offset-slate-950' : ''}`}
      style={customColors
        ? { backgroundImage: `linear-gradient(135deg, ${teamRef.primaryColor || '#58D20A'}, ${teamRef.secondaryColor || '#050505'})` }
        : undefined}
    >
      {showImg ? (
        <img
          src={getImageUrl(logoUrl)}
          alt={name}
          onError={() => setImgError(true)}
          className="w-full h-full object-contain p-1"
        />
      ) : (
        <div className={`flex flex-col items-center justify-center text-white leading-none ${customColors ? '' : `bg-gradient-to-tr ${avatarConfig.bgGradient}`}`}>
          <IconComponent className="w-1/2 h-1/2 text-white/90 drop-shadow mb-0.5" />
          <span className="font-mono tracking-tight text-white drop-shadow">{getInitials(name)}</span>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Standings — derived live from finished matches (3 pts win / 1 pt draw).
// Never stored; pure function so it can never diverge from match results.
// ─────────────────────────────────────────────────────────────────────────
function computeStandings(teams, matches) {
  const map = new Map();
  teams.forEach(t => {
    map.set(t._id || t.id, { team: t, mp: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 });
  });

  matches
    .filter(m => m.status === 'Finished' && m.scoreA != null && m.scoreB != null)
    .forEach((m) => {
      const aId = m.teamA?._id || m.teamA;
      const bId = m.teamB?._id || m.teamB;
      const a = map.get(aId);
      const b = map.get(bId);
      if (!a || !b) return; // legacy name-only fixtures — skip
      const sa = Number(m.scoreA) || 0;
      const sb = Number(m.scoreB) || 0;
      a.mp += 1; b.mp += 1;
      a.gf += sa; a.ga += sb; b.gf += sb; b.ga += sa;
      if (sa > sb) { a.w += 1; b.l += 1; a.pts += 3; }
      else if (sa < sb) { b.w += 1; a.l += 1; b.pts += 3; }
      else { a.d += 1; b.d += 1; a.pts += 1; b.pts += 1; }
    });

  return [...map.values()].sort((x, y) =>
    (y.pts - x.pts) || (y.gd - x.gd) || (y.gf - x.gf) || (x.team.name || '').localeCompare(y.team.name || '')
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Match detail modal — rosters come straight from the populated match doc.
// ─────────────────────────────────────────────────────────────────────────
function RosterColumn({ label, team }) {
  const roster = team?.currentRoster || [];
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <TeamCrest team={team} size="sm" />
        <span className="text-sm font-black text-white truncate">{label}</span>
      </div>
      <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
        {roster.length > 0 ? roster.map(p => (
          <div key={p._id || p.id} className="flex items-center gap-2.5 p-2 rounded-xl border border-cardBorder bg-darkBg/60">
            <img
              src={getImageUrl(p.imageUrl)}
              alt={p.name}
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
              className="w-8 h-8 rounded-md object-cover border border-borderStrong flex-shrink-0"
            />
            <div className="min-w-0">
              <p className="font-bold text-xs text-white truncate">{p.name}</p>
              <p className="text-[10px] text-secondaryText">{p.primaryPosition || 'Player'}</p>
            </div>
          </div>
        )) : (
          <p className="text-[11px] text-mutedText italic border border-dashed border-borderStrong rounded-xl p-3 text-center">
            Squad revealed after auction.
          </p>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Match detail modal — rosters come straight from the populated match doc.
// ─────────────────────────────────────────────────────────────────────────
function MatchDetailModal({ match, onClose }) {
  if (!match) return null;
  const status = getCalculatedStatus(match);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-darkBg/80 backdrop-blur-md">
      <div className="glass-card rounded-3xl p-6 border border-borderStrong max-w-4xl w-full space-y-5 relative max-h-[90vh] flex flex-col overflow-y-auto custom-scrollbar">
        <button onClick={onClose} className="btn-secondary absolute top-4 right-4 p-2 rounded-lg z-10" aria-label="Close">
          <X className="w-5 h-5" />
        </button>

        <div className="text-center">
          <h2 className="text-xl font-black text-white">{match.round || 'Match Details'}</h2>
          <p className="text-sm text-secondaryText mt-0.5">
            {formatFullDate(match)} at {match.matchTime} &bull; {match.venue || 'Stadium TBD'}
          </p>
          <div className="mt-2 flex items-center justify-center gap-2 text-xs font-bold">
            {status === 'Live' ? (
              <span className="inline-flex items-center gap-1.5 text-urgentRedText bg-urgentRed/15 border border-urgentRed/40 px-2.5 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-urgentRed animate-ping" /> Live Now
              </span>
            ) : status === 'Finished' ? (
              <span className="inline-flex items-center gap-1.5 text-neonGreenHover bg-neonGreen/15 border border-neonGreen/40 px-2.5 py-0.5 rounded-full">
                {match.scoreA} : {match.scoreB} Full Time
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-secondaryText bg-surfaceHover/60 border border-borderStrong px-2.5 py-0.5 rounded-full">
                Upcoming
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-cardBorder">
          <RosterColumn label={match.teamAName || match.homeTeam || 'Team A'} team={match.teamA} />
          <RosterColumn label={match.teamBName || match.awayTeam || 'Team B'} team={match.teamB} />
        </div>

        {status === 'Finished' && match.winnerNotes && (
          <p className="text-xs text-secondaryText italic border-t border-cardBorder pt-3">
            "{match.winnerNotes}"
          </p>
        )}
      </div>
    </div>
  );
}



// ─────────────────────────────────────────────────────────────────────────
// Main — Competition Matches Hub
// ─────────────────────────────────────────────────────────────────────────
export default function MatchesHub() {
  const { user } = useAuth();
  const { teams = [], sessions = [] } = useAuction();
  const navigate = useNavigate();

  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [manualRows, setManualRows] = useState(null);

  const sessionName = sessions?.[0]?.name || 'Current Season';

  const fetchMatches = async () => {
    try {
      const res = await api.get('/matches');
      const data = res?.data?.data || res?.data || [];
      setMatches(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch matches:', err);
      setMatches([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMatches(); }, []);

  // Manual table override (Admin → Match Center) — keeps this preview identical
  // to the full /matches/table page.
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/config/display');
        const payload = res?.data?.data || res?.data || {};
        const ov = payload.tableOverride;
        if (ov?.enabled && Array.isArray(ov.rows) && ov.rows.length > 0) {
          setManualRows(ov.rows);
        }
      } catch {
        /* overrides are optional */
      }
    })();
  }, []);

  const processed = useMemo(() => matches.map(m => ({ ...m, calculatedStatus: getCalculatedStatus(m) })), [matches]);

  // Chronological ordering
  const sortByKickoff = (a, b) => (getMatchDateTime(a)?.getTime() || 0) - (getMatchDateTime(b)?.getTime() || 0);

  const liveMatches = useMemo(() => processed.filter(m => m.calculatedStatus === 'Live').sort(sortByKickoff), [processed]);
  const upcoming = useMemo(() =>
    processed.filter(m => m.calculatedStatus === 'Upcoming').sort(sortByKickoff), [processed]);
  const finished = useMemo(() =>
    processed.filter(m => m.calculatedStatus === 'Finished').sort((a, b) => sortByKickoff(b, a)), [processed]);

  // Featured = live match if any, else the nearest upcoming fixture, else the most recent result.
  const featured = liveMatches[0] || upcoming[0] || finished[0] || null;

  // Recent finished results for the match recap (skip the featured one).
  const recentResults = useMemo(() => finished.filter(m => m !== featured).slice(0, 4), [finished, featured]);

  const standings = useMemo(() => {
    if (manualRows) {
      return manualRows.map(r => {
        const team = teams.find(t => String(t._id || t.id) === String(r.teamId)) ||
          { name: r.teamName || 'Unknown', shortCode: r.shortCode || '' };
        return {
          team,
          mp: Number(r.mp) || 0,
          w: Number(r.w) || 0,
          d: Number(r.d) || 0,
          l: Number(r.l) || 0,
          gf: Number(r.gf) || 0,
          ga: Number(r.ga) || 0,
          gd: (Number(r.gf) || 0) - (Number(r.ga) || 0),
          pts: Number(r.pts) || 0,
        };
      });
    }
    return computeStandings(teams, processed);
  }, [manualRows, teams, processed]);

  const competitionName = processed[0]?.tournament || 'Championship';

  const maxPoints = standings[0]?.pts || 0;

  // "Full Match Schedule" destination — keep authenticated users inside their layout.
  const schedulePath = user?.role === 'TEAM_MANAGER'
    ? '/manager/matches/schedule'
    : user?.role === 'PLAYER'
      ? '/player/matches/schedule'
      : user?.role === 'GENERAL_USER'
        ? '/general/matches/schedule'
        : '/matches/schedule';

  // "View All Table" destination — keep authenticated users inside their layout.
  const tablePath = user?.role === 'TEAM_MANAGER'
    ? '/manager/matches/table'
    : user?.role === 'PLAYER'
      ? '/player/matches/table'
      : user?.role === 'GENERAL_USER'
        ? '/general/matches/table'
        : '/matches/table';

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0f19] text-primaryText font-sans selection:bg-neonGreen selection:text-darkBg">
      {!user && <Navbar />}

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4">

        {/* ── Competition Header (sticky — always visible like the navbar) ── */}
        <CompetitionHeader competitionName={competitionName} sessionName={sessionName} user={user} active="overview" />

        {/* ── Two-column content ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">

          {/* ── LEFT: Matches Card ──────────────────────────────────────── */}
          <section className="glass-card rounded-3xl overflow-hidden ui-fade-up" style={{ animationDelay: '80ms' }}>
            {/* Card header */}
            <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-cardBorder/80">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-xl bg-neonGreen/10 border border-neonGreen/20 text-neonGreen shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-heading font-black text-lg tracking-wide text-white leading-tight">Matches</h2>
                </div>
              </div>
              <Link to={schedulePath} className="flex items-center gap-1 text-xs font-bold text-secondaryText hover:text-white transition shrink-0">
                Schedule <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="p-5 sm:p-6 space-y-5">

            {loading ? (
              <div className="space-y-4">
                <div className="h-44 rounded-2xl ui-skeleton" />
                <div className="space-y-2">{[0, 1, 2].map(i => <div key={i} className="h-14 rounded-xl ui-skeleton" />)}</div>
              </div>
            ) : !featured ? (
              <div className="rounded-2xl border border-dashed border-borderStrong p-10 text-center text-secondaryText space-y-2">
                <Shield className="w-10 h-10 mx-auto text-mutedText" />
                <p className="font-bold text-secondaryText">No Matches Scheduled Yet</p>
                <p className="text-xs text-mutedText">Fixtures created by admin appear here automatically when the tournament phase begins.</p>
              </div>
            ) : (
              <>
                {/* Featured match */}
                <div className="rounded-2xl border border-cardBorder/80 bg-gradient-to-br from-cardBg/80 via-darkBg/90 to-cardBg/60 p-5 relative overflow-hidden">
                  <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full blur-3xl pointer-events-none opacity-30 bg-successGreen" />
                  {featured.calculatedStatus === 'Live' && (
                    <div className="absolute inset-0 bg-urgentRed/10 pointer-events-none animate-pulse" />
                  )}

                  {/* Featured row */}
                  <div className="relative z-10 flex items-stretch justify-between gap-2 sm:gap-4">
                    {/* Home */}
                    <div className="flex flex-col items-center gap-2.5 flex-1 min-w-0">
                      <TeamCrest team={featured.teamA} size="lg" ring />
                      <span className="text-xs sm:text-sm font-black text-white truncate max-w-full text-center">
                        {featured.teamAName || featured.homeTeam || 'Team A'}
                      </span>
                    </div>

                    {/* Center — date / time / live */}
                    <div className="flex flex-col items-center justify-center shrink-0 px-2 sm:px-4">
                      {featured.calculatedStatus === 'Live' ? (
                        <>
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-urgentRedText bg-urgentRed/20 border border-urgentRed/40 px-2.5 py-1 rounded-full animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-urgentRed animate-ping" />
                            Live Now
                          </span>
                          <span className="text-sm font-black font-mono tabular-nums text-white mt-2">
                            {featured.scoreA ?? 0} : {featured.scoreB ?? 0}
                          </span>
                        </>
                      ) : featured.calculatedStatus === 'Finished' ? (
                        <>
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-neonGreenHover bg-neonGreen/15 border border-neonGreen/40 px-2.5 py-1 rounded-full">
                            Full-time
                          </span>
                          <span className="text-sm font-black font-mono tabular-nums text-white mt-2">
                            {featured.scoreA ?? 0} : {featured.scoreB ?? 0}
                          </span>
                          <span className="mt-1.5 text-[10px] font-bold text-secondaryText uppercase">{resultDayLabel(featured)}</span>
                        </>
                      ) : (
                        <>
                          <span className="text-[10px] font-black uppercase tracking-widest text-neonGreenHover bg-neonGreen/10 border border-neonGreen/30 px-2.5 py-1 rounded-full">
                            {matchDayLabel(featured)}
                          </span>
                          <span className="text-sm sm:text-lg font-black font-mono text-white mt-2">
                            {featured.matchTime || 'TBD'}
                          </span>
                        </>
                      )}
                      {featured.venue && (
                        <span className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-secondaryText truncate max-w-[120px]">
                          <MapPin className="w-3 h-3 shrink-0 text-urgentRedText" /> {featured.venue}
                        </span>
                      )}
                    </div>

                    {/* Away */}
                    <div className="flex flex-col items-center gap-2.5 flex-1 min-w-0">
                      <TeamCrest team={featured.teamB} size="lg" ring />
                      <span className="text-xs sm:text-sm font-black text-white truncate max-w-full text-center">
                        {featured.teamBName || featured.awayTeam || 'Team B'}
                      </span>
                    </div>
                  </div>
                </div>



                {/* Recent results recap */}
                {recentResults.length > 0 && (
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-secondaryText mb-2 flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-neonGreen" /> Match Recap
                    </p>
                    <div className="divide-y divide-cardBorder/60 border border-cardBorder/70 rounded-2xl overflow-hidden bg-darkBg/40">
                      {recentResults.map(m => (
                        <button
                          key={m._id || m.id}
                          onClick={() => setSelectedMatch(m)}
                          className="w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3 hover:bg-surfaceHover/40 transition text-left"
                        >
                          <TeamCrest team={m.teamA} size="xs" />
                          <span className="text-xs font-bold text-primaryText truncate flex-1 min-w-0">
                            {m.teamAName || m.homeTeam}
                          </span>
                          <span className="shrink-0 rounded-lg bg-darkBg/80 border border-cardBorder px-1.5 py-0.5 font-mono font-black text-xs tabular-nums text-white">
                            {m.scoreA ?? 0} : {m.scoreB ?? 0}
                          </span>
                          <span className="text-xs font-bold text-primaryText truncate flex-1 min-w-0 text-right">
                            {m.teamBName || m.awayTeam}
                          </span>
                          <TeamCrest team={m.teamB} size="xs" />
                          <span className="shrink-0 w-24 text-right">
                            <span className="block text-[10px] font-bold text-neonGreenHover uppercase">FT</span>
                            <span className="block text-[10px] font-mono text-secondaryText">{resultDayLabel(m)}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
            </div>
          </section>

          {/* ── RIGHT: Table + Updates ───────────────────────────────────── */}
          <div className="space-y-5">

            {/* Table / Standings */}
            <section id="standings-table" className="glass-card rounded-3xl overflow-hidden scroll-mt-24 ui-fade-up flex flex-col" style={{ animationDelay: '140ms' }}>
              <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-cardBorder/80">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 rounded-xl bg-warningGold/10 border border-warningGold/20 text-warningGold shrink-0">
                    <Trophy className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-heading font-black text-lg tracking-wide text-white leading-tight">Table</h2>
                  </div>
                </div>
                <Link to={tablePath} className="flex items-center gap-1 text-xs font-bold text-secondaryText hover:text-white transition shrink-0">
                  View All <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              {standings.length === 0 ? (
                <div className="p-5">
                  <p className="text-xs text-mutedText bg-darkBg/50 border border-dashed border-borderStrong rounded-2xl p-8 text-center">
                    Standings appear once the tournament phase begins and matches are finished.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full min-w-[880px] text-sm border-collapse">
                    <thead>
                      <tr className="text-[10px] font-black uppercase tracking-wider bg-darkBg/60">
                        <th className="text-left py-3 pl-4 sm:pl-6 pr-2 text-mutedText">#</th>
                        <th className="text-left py-3 pr-2 text-mutedText">Team</th>
                        <th className="text-center py-3 px-2 text-secondaryText">Played</th>
                        <th className="text-center py-3 px-2 text-neonGreen">Won</th>
                        <th className="text-center py-3 px-2 text-neonGreen">Drawn</th>
                        <th className="text-center py-3 px-2 text-urgentRedText">Lost</th>
                        <th className="text-center py-3 px-2 text-secondaryText">Goals For</th>
                        <th className="text-center py-3 px-2 text-secondaryText">Goals Against</th>
                        <th className="text-center py-3 pl-2 pr-4 sm:pr-6 text-warningGold">Points</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-cardBorder/50">
                      {standings.slice(0, 8).map((row, idx) => {
                        const posClass = idx === 0 ? 'text-neonGreen' : idx === 1 ? 'text-neonGreen' : idx === 2 ? 'text-warningGold' : 'text-mutedText';
                        const promotionTint = idx <= 2 ? 'bg-neonGreen/[0.04]' : '';
                        const pct = maxPoints > 0 ? (row.pts / maxPoints) * 100 : 0;
                        return (
                          <tr key={row.team._id || row.team.id || idx} className={`hover:bg-surfaceHover/30 transition ${promotionTint}`}>
                            <td className="py-3 pl-4 sm:pl-6 pr-2">
                              <span className={`inline-flex w-7 h-7 items-center justify-center rounded-lg font-mono font-black text-sm ${posClass}`}>
                                {idx + 1}
                              </span>
                            </td>
                            <td className="py-3 pr-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <TeamCrest team={row.team} size="xs" />
                                <span className="font-bold text-white truncate">{row.team.name}</span>
                                <span className="font-mono text-[9px] text-mutedText hidden sm:inline">{row.team.shortCode || row.team.code}</span>
                              </div>
                            </td>
                            <td className="text-center py-3 px-2 font-mono font-bold text-base text-secondaryText">{row.mp}</td>
                            <td className="text-center py-3 px-2 font-mono font-bold text-base text-neonGreen">{row.w}</td>
                            <td className="text-center py-3 px-2 font-mono font-bold text-base text-secondaryText">{row.d}</td>
                            <td className="text-center py-3 px-2 font-mono font-bold text-base text-urgentRedText">{row.l}</td>
                            <td className="text-center py-3 px-2 font-mono font-bold text-base text-secondaryText">{row.gf}</td>
                            <td className="text-center py-3 px-2 font-mono font-bold text-base text-secondaryText">{row.ga}</td>
                            <td className="py-3 pl-2 pr-4 sm:pr-6">
                              <div className="inline-flex flex-col items-center gap-1">
                                <span className="font-mono font-black text-white text-lg leading-none">{row.pts}</span>
                                <span className="block w-14 h-1 rounded-full bg-surfaceHover overflow-hidden">
                                  <span className="block h-full bg-gradient-to-r from-warningGold to-warningGold rounded-full" style={{ width: `${pct}%` }} />
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Legend */}
              <div className="mt-auto flex flex-wrap items-center justify-center gap-2 text-[10px] font-bold text-mutedText uppercase tracking-widest py-3 px-5 border-t border-cardBorder/60">
                <span className="inline-flex h-8 w-52 items-center justify-center gap-1.5"><ArrowUp className="w-3 h-3 text-neonGreen shrink-0" /> Points = 3 win / 1 draw</span>
                <span className="inline-flex h-8 w-52 items-center justify-center gap-1.5"><Shield className="w-3 h-3 text-neonGreen shrink-0" /> Top 3 shaded</span>
                {maxPoints > 0 && <span className="inline-flex h-8 w-52 items-center justify-center gap-1.5"><Trophy className="w-3 h-3 text-warningGold shrink-0" /> Max {maxPoints} pts</span>}
              </div>
            </section>

            </div>
        </div>
      </main>

      {selectedMatch && (
        <MatchDetailModal match={selectedMatch} onClose={() => setSelectedMatch(null)} />
      )}
    </div>
  );
}