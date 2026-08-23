import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Calendar, Clock, MapPin, Trophy, Shield, Search, RefreshCw,
  Hourglass, Filter, ArrowUpDown, X, AlertCircle, Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../../components/Navbar';
import TeamBadge from '../../components/common/TeamBadge';
import CompetitionHeader from '../../components/common/CompetitionHeader';
import api from '../../services/api';
import { getImageUrl } from '../../utils/imageUrl';
import { useAuction } from '../../context/AuctionContext';
import { useAuth } from '../../context/AuthContext';
import io from 'socket.io-client';

// ─────────────────────────────────────────────────────────────────────────
// Distinct per-team color themes — same palette/hash logic used on
// PublicTeamsView, AdminTeams, and AdminFixtures, so a given team's color
// stays consistent across every page. This page has no `teams` context
// (it fetches matches directly), so the hash key here is the team NAME —
// which matches as long as the name string is identical to what the
// Teams pages use for that team.
// ─────────────────────────────────────────────────────────────────────────
const TEAM_THEMES = [
  { name: 'crimson', bgGradient: 'from-urgentRed to-urgentRed', ring: 'ring-urgentRed/60', borderColor: 'border-urgentRed/40' },
  { name: 'amber', bgGradient: 'from-warningGold to-warningGold', ring: 'ring-warningGold/60', borderColor: 'border-warningGold/40' },
  { name: 'emerald', bgGradient: 'from-successGreen to-successGreen', ring: 'ring-neonGreen/60', borderColor: 'border-neonGreen/40' },
  { name: 'sky', bgGradient: 'from-successGreen to-successGreen', ring: 'ring-neonGreen/60', borderColor: 'border-neonGreen/40' },
  { name: 'violet', bgGradient: 'from-warningGold to-warningGold', ring: 'ring-warningGold/60', borderColor: 'border-warningGold/40' },
  { name: 'fuchsia', bgGradient: 'from-warningGold to-warningGold', ring: 'ring-warningGold/60', borderColor: 'border-warningGold/40' },
  { name: 'teal', bgGradient: 'from-successGreen to-successGreen', ring: 'ring-neonGreen/60', borderColor: 'border-neonGreen/40' },
  { name: 'orange', bgGradient: 'from-warningGold to-warningGold', ring: 'ring-warningGold/60', borderColor: 'border-warningGold/40' },
  { name: 'indigo', bgGradient: 'from-warningGold to-warningGold', ring: 'ring-warningGold/60', borderColor: 'border-warningGold/40' },
  { name: 'lime', bgGradient: 'from-successGreen to-successGreen', ring: 'ring-neonGreen/60', borderColor: 'border-neonGreen/40' },
];

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// Same key logic as the Teams pages: prefer an id, fall back to name.
function getTeamTheme(teamOrName) {
  const key = typeof teamOrName === 'string'
    ? teamOrName
    : String(teamOrName?._id || teamOrName?.id || teamOrName?.name || 'team');
  const idx = hashString(key) % TEAM_THEMES.length;
  return TEAM_THEMES[idx];
}

function getInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase() || 'TM';
}

const formatCurrency = (val) => {
  if (val == null || isNaN(val)) return '0 BDT';
  return `${Number(val).toLocaleString('en-IN')} BDT`;
};

// ─────────────────────────────────────────────────────────────────────────
// Helpers & Auto Status Calculation
// ─────────────────────────────────────────────────────────────────────────

const formatDate = (dateString) => {
  if (!dateString) return 'TBD';
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-US', options);
  } catch {
    return dateString;
  }
};

const isSameDay = (dateString) => {
  if (!dateString) return false;
  const d = new Date(dateString);
  const today = new Date();
  return d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
};

// Attempts to build a real Date from matchDate + matchTime
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

// Automatic Status Resolution based on date/time if status is not explicitly set or set to default
const getCalculatedStatus = (match) => {
  if (match.status && match.status !== 'Upcoming') {
    return match.status; // Respect manual overrides like Finished / Live / Cancelled
  }
  const matchDT = getMatchDateTime(match);
  if (!matchDT) return match.status || 'Upcoming';

  const now = new Date();
  const matchEndDT = new Date(matchDT.getTime() + 3 * 60 * 60 * 1000); // assume 3 hours match duration

  if (now > matchEndDT) {
    return 'Finished';
  } else if (now >= matchDT && now <= matchEndDT) {
    return 'Live';
  }
  return 'Upcoming';
};

// Countdown generator: Starts in 2D 12H, Starts in 5H, Starts in 30M
function useCountdown(targetDate) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!targetDate) return;
    const id = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(id);
  }, [targetDate]);

  if (!targetDate) return null;
  const diffMs = targetDate.getTime() - now;
  if (diffMs <= 0) return null;

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    return `Starts in ${days}D ${remHours}H`;
  }
  if (hours > 0) return `Starts in ${hours}H ${minutes}M`;
  return `Starts in ${minutes}M`;
}

// Count up for stat pills
function useCountUp(value, duration = 600) {
  const [display, setDisplay] = useState(0);
  const startRef = useRef(null);
  const fromRef = useRef(0);

  useEffect(() => {
    fromRef.current = display;
    startRef.current = null;
    let raf;
    const step = (ts) => {
      if (!startRef.current) startRef.current = ts;
      const progress = Math.min(1, (ts - startRef.current) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(fromRef.current + (value - fromRef.current) * eased));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return display;
}

const STATUS_TABS = [
  { key: 'all', label: 'All Matches' },
  { key: 'Live', label: 'Live Now' },
  { key: 'Upcoming', label: 'Upcoming' },
  { key: 'Finished', label: 'Completed' },
];

// ─────────────────────────────────────────────────────────────────────────
// Components
// ─────────────────────────────────────────────────────────────────────────

function StatPill({ label, value, tone }) {
  const count = useCountUp(value);
  return (
    <div className={`relative overflow-hidden rounded-2xl border p-3.5 text-center bg-darkBg/60 backdrop-blur-md shadow-lg ${tone}`}>
      <p className="text-2xl font-black font-mono tabular-nums">{count}</p>
      <p className="text-[10px] font-bold uppercase tracking-wider text-secondaryText mt-0.5">{label}</p>
    </div>
  );
}

const TeamAvatar = ({ logo, profilePic, name, teamRef, winner = false, live = false }) => {
  // teamRef lets callers pass the real team id/object when they have it
  // (falls back to name), so the color always matches the Teams pages.
  const theme = getTeamTheme(teamRef || name || 'Team');

  const ringMap = live
    ? 'ring-2 ring-urgentRed ring-offset-1 ring-offset-darkBg shadow-md shadow-urgentRed/30'
    : winner
      ? 'ring-2 ring-warningGold ring-offset-1 ring-offset-darkBg shadow-md shadow-warningGold/30'
      : `ring-1.5 ${theme.ring} ring-offset-1 ring-offset-darkBg shadow-sm`;

  // Build the same team record TeamBadge expects so the ORIGINAL franchise
  // crest (uploaded logo / themed shield icon) renders identically to the
  // Teams pages. Explicit logo/profilePic props stay highest priority.
  const refObj = typeof teamRef === 'object' && teamRef !== null ? teamRef : {};
  const teamRecord = {
    ...refObj,
    name: refObj.name || name,
    logoUrl: refObj.logoUrl || logo || profilePic || '',
  };

  return (
    <div
      className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center shrink-0 bg-darkBg/70 transition-all duration-300 ${ringMap}`}
    >
      <TeamBadge team={teamRecord} size="sm" showName={false} className="scale-[1.15]" />
    </div>
  );
};

function MatchCard({ match, index = 0, teams = [], onCardClick }) {
  const currentStatus = getCalculatedStatus(match);
  const isFinished = currentStatus === 'Finished';
  const isUpcoming = currentStatus === 'Upcoming';
  const isLive = currentStatus === 'Live';

  const homeTeamName = match.homeTeam || match.teamAName || 'Team A';
  const awayTeamName = match.awayTeam || match.teamBName || 'Team B';
  const homeTeamLogo = match.homeTeamLogo || match.teamALogo
    || (typeof match.teamA === 'object' && match.teamA !== null ? match.teamA.logoUrl : '');
  const awayTeamLogo = match.awayTeamLogo || match.teamBLogo
    || (typeof match.teamB === 'object' && match.teamB !== null ? match.teamB.logoUrl : '');

  // Lookup full team record from context or match payload
  const homeTeamRef = (typeof match.teamA === 'object' && match.teamA?._id ? match.teamA : null) ||
    teams.find(t => String(t._id || t.id) === String(match.teamA?._id || match.teamA) || (t.name && t.name.toLowerCase() === homeTeamName.toLowerCase())) ||
    { name: homeTeamName, logoUrl: homeTeamLogo };
  const awayTeamRef = (typeof match.teamB === 'object' && match.teamB?._id ? match.teamB : null) ||
    teams.find(t => String(t._id || t.id) === String(match.teamB?._id || match.teamB) || (t.name && t.name.toLowerCase() === awayTeamName.toLowerCase())) ||
    { name: awayTeamName, logoUrl: awayTeamLogo };

  const winner = isFinished
    ? Number(match.scoreA) > Number(match.scoreB)
      ? 'A'
      : Number(match.scoreB) > Number(match.scoreA)
        ? 'B'
        : 'draw'
    : null;

  const countdown = useCountdown(isUpcoming ? getMatchDateTime(match) : null);
  const roundLabel = match.round || match.stage || match.roundName;

  const cardGradient = isLive
    ? 'bg-gradient-to-br from-urgentRed/25 via-darkBg/95 to-cardBg/90 shadow-2xl shadow-urgentRed/20'
    : isFinished
      ? 'bg-gradient-to-br from-cardBg/95 via-darkBg/95 to-cardBg/90 shadow-xl shadow-black/60'
      : 'bg-gradient-to-br from-[#0B2B26]/80 via-darkBg/95 to-cardBg/90 shadow-xl shadow-black/40';

  const borderClass = isLive
    ? 'border-urgentRed/60 hover:border-urgentRed shadow-urgentRed/30'
    : isFinished
      ? 'border-borderStrong/80 hover:border-borderStrong shadow-cardBg/40'
      : 'border-neonGreen/50 hover:border-neonGreen/80 shadow-neonGreen/20';

  return (
    <div
      onClick={() => onCardClick(match)}
      className={`group relative rounded-3xl border overflow-hidden transition-all duration-300 will-change-transform hover:-translate-y-1.5 hover:shadow-2xl cursor-pointer ${cardGradient} ${borderClass}`}
      style={{
        backdropFilter: 'blur(20px)',
        animationDelay: `${Math.min(index, 8) * 60}ms`,
      }}
    >
      {/* Dynamic ambient backdrop light bleed */}
      <div
        className={`absolute -top-10 -left-10 w-36 h-36 rounded-full blur-3xl pointer-events-none opacity-40 transition-opacity group-hover:opacity-70 ${isLive ? 'bg-urgentRed' : 'bg-[#0B2B26]'
          }`}
      />

      {/* Glow pulse overlay for LIVE matches */}
      {isLive && (
        <div className="absolute inset-0 bg-urgentRed/10 pointer-events-none animate-pulse" />
      )}

      {/* Shine sweep effect on hover */}
      <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl z-10">
        <span className="absolute -inset-y-full -left-1/2 w-1/3 rotate-12 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent translate-x-[-120%] group-hover:translate-x-[420%] transition-transform duration-[1200ms] ease-out" />
      </span>

      {/* Top Bar: Match Number / Round / Tournament / Status Badge */}
      <div className="relative z-10 px-5 pt-4 flex items-center justify-between min-h-[32px] gap-2">
        <div className="flex items-center gap-2 overflow-hidden">
          {match.matchNumber && (
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-secondaryText bg-cardBg/80 px-2 py-0.5 rounded-md border border-cardBorder shrink-0">
              Match #{match.matchNumber}
            </span>
          )}
          {roundLabel && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-warningGold bg-warningGold/10 border border-warningGold/20 px-2.5 py-0.5 rounded-full truncate">
              {roundLabel}
            </span>
          )}
        </div>

        {/* Center/Right Status Badge */}
        {isLive ? (
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-urgentRedText bg-urgentRed/20 border border-urgentRed/40 px-2.5 py-0.5 rounded-full shadow-lg shadow-urgentRed/40 animate-pulse shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-urgentRed animate-ping" />
            Live Now
          </span>
        ) : isUpcoming ? (
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-white bg-neonGreen/15 border border-neonGreen/30 px-2.5 py-0.5 rounded-full shrink-0">
            <Hourglass className="w-3 h-3 text-white" />
            {countdown || 'Upcoming'}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-secondaryText bg-surfaceHover/40 border border-borderStrong/50 px-2.5 py-0.5 rounded-full shrink-0">
            Completed
          </span>
        )}
      </div>

      {/* Main Content: Left (Team A) - Center (VS/Score) - Right (Team B) */}
      <div className="relative z-10 px-4 py-4">
        <div className="flex items-center justify-between gap-2 sm:gap-3">

          {/* Left Side: Home Team */}
          <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
            <TeamAvatar
              logo={homeTeamLogo}
              name={homeTeamName}
              teamRef={homeTeamRef}
              winner={winner === 'A'}
              live={isLive}
            />
            <span
              className={`text-xs font-bold text-center leading-tight w-full truncate transition-colors ${winner === 'A' ? 'text-warningGold' : winner === 'B' ? 'text-mutedText' : 'text-primaryText'
                }`}
              title={homeTeamName}
            >
              {homeTeamName}
            </span>
          </div>

          {/* Center: Large VS or Live/Completed Scores */}
          <div className="flex flex-col items-center justify-center px-1 shrink-0 min-w-[55px]">
            {isFinished || (isLive && (match.scoreA || match.scoreB)) ? (
              <div className="flex items-center gap-2">
                <span
                  className={`text-xl sm:text-2xl font-black font-mono tabular-nums ${winner === 'A' ? 'text-warningGold' : 'text-white'
                    }`}
                >
                  {match.scoreA ?? 0}
                </span>
                <span className="text-mutedText text-base font-bold">:</span>
                <span
                  className={`text-xl sm:text-2xl font-black font-mono tabular-nums ${winner === 'B' ? 'text-warningGold' : 'text-white'
                    }`}
                >
                  {match.scoreB ?? 0}
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <span
                  className="text-lg sm:text-xl font-black tracking-widest select-none text-secondaryText drop-shadow-sm"
                >
                  VS
                </span>
              </div>
            )}

            {/* Winner Trophy note */}
            {isFinished && winner !== 'draw' && (
              <span className="mt-1.5 inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-warningGold">
                <Trophy className="w-3 h-3 shrink-0" />
                Winner
              </span>
            )}
          </div>

          {/* Right Side: Away Team */}
          <div className="flex flex-col items-center gap-2.5 flex-1 min-w-0">
            <TeamAvatar
              logo={awayTeamLogo}
              name={awayTeamName}
              teamRef={awayTeamRef}
              winner={winner === 'B'}
              live={isLive}
            />
            <span
              className={`text-xs sm:text-sm font-bold text-center leading-tight w-full truncate transition-colors ${winner === 'B' ? 'text-warningGold' : winner === 'A' ? 'text-mutedText' : 'text-primaryText'
                }`}
              title={awayTeamName}
            >
              {awayTeamName}
            </span>
          </div>

        </div>

        {/* Winner Notes or Match Description */}
        {(match.winnerNotes || match.description) && (
          <p className="text-center text-[11px] text-secondaryText italic mt-4 pt-3 border-t border-white/[0.06] line-clamp-2">
            "{match.winnerNotes || match.description}"
          </p>
        )}
      </div>

      {/* Bottom Bar: Bottom Left (Time) - Bottom Right (Venue) */}
      <div className="relative z-10 flex items-center justify-between px-5 py-3 border-t border-white/[0.06] bg-darkBg/60 text-xs text-secondaryText gap-3">
        <div className="flex items-center gap-1.5 min-w-0">
          <Clock className="w-3.5 h-3.5 shrink-0 text-white" />
          <span className="font-semibold truncate">{match.matchTime || 'TBD'}</span>
        </div>
        <div className="flex items-center gap-1.5 min-w-0 text-right">
          <MapPin className="w-3.5 h-3.5 shrink-0 text-urgentRedText" />
          <span className="font-semibold truncate">{match.venue || 'Stadium TBD'}</span>
        </div>
      </div>
    </div>
  );
}

function PlayerAvatar({ player }) {
  const [imgError, setImgError] = useState(false);

  const imgSrc = getImageUrl(player.imageUrl);
  const showImage = imgSrc && !imgError;

  return (
    <div className="w-10 h-10 rounded-md object-cover border-2 border-borderStrong flex-shrink-0 bg-surfaceHover flex items-center justify-center">
      {showImage ? (
        <img
          src={imgSrc}
          alt={player.name}
          className="w-full h-full object-cover rounded-sm"
          onError={() => setImgError(true)}
        />
      ) : (
        <span className="font-bold text-secondaryText text-sm">
          {getInitials(player.name)}
        </span>
      )}
    </div>
  );
}

function RosterColumn({ team, theme = {} }) {
  const roster = team?.currentRoster || [];
  const borderColor = theme?.borderColor || 'border-cardBorder';

  return (
    <div className="space-y-4">
      <TeamBadge team={team} size="md" showManager={false} />
      <div className="space-y-2 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
        {roster.length > 0 ? roster.map(player => (
          <div key={player._id || player.id} className={`flex items-center gap-3 p-2 rounded-xl border ${borderColor} bg-darkBg/60`}>
            <PlayerAvatar player={player} />
            <div className="min-w-0">
              <p className="font-bold text-sm text-white truncate">{player.name}</p>
              <p className="text-xs text-secondaryText">{player.primaryPosition || 'Player'}</p>
            </div>
            {player.finalPrice > 0 && (
              <div className="text-xs font-mono text-white font-bold ml-auto shrink-0">
                {formatCurrency(player.finalPrice)}
              </div>
            )}
          </div>
        )) : (
          <div className="text-center py-10 text-mutedText text-xs italic border border-dashed border-borderStrong rounded-xl flex flex-col items-center gap-2">
            <Users className="w-6 h-6 text-mutedText" />
            Roster not available.
          </div>
        )}
      </div>
    </div>
  );
}

function MatchDetailModal({ match, onClose }) {
  if (!match) return null;

  const themeA = getTeamTheme(match.teamA || match.teamAName);
  const themeB = getTeamTheme(match.teamB || match.teamBName);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-darkBg/80 backdrop-blur-md">
      <motion.div
        className="glass-card rounded-3xl p-6 border border-borderStrong max-w-4xl w-full space-y-5 relative max-h-[90vh] flex flex-col"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
      >
        <button onClick={onClose} className="btn-secondary absolute top-4 right-4 p-2 rounded-lg z-10">
          <X className="w-5 h-5" />
        </button>
        <div className="text-center">
          <h2 className="text-xl font-black text-white">{match.round || 'Match Details'}</h2>
          <p className="text-sm text-secondaryText">{formatDate(match.matchDate)} at {match.matchTime} &bull; {match.venue}</p>
        </div>
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto pt-4 border-t border-cardBorder custom-scrollbar">
          <RosterColumn team={match.teamA} theme={themeA} />
          <RosterColumn team={match.teamB} theme={themeB} />
        </div>
      </motion.div>
    </div>
  );
}

function MatchCardSkeleton({ index = 0 }) {
  return (
    <div
      className="rounded-3xl border border-cardBorder/80 bg-darkBg/60 overflow-hidden"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="px-5 pt-4 pb-1 h-8 flex items-center justify-between">
        <div className="h-4 w-16 rounded-md shimmer" />
        <div className="h-4 w-20 rounded-full shimmer" />
      </div>
      <div className="px-5 py-6 flex items-center justify-between gap-3">
        <div className="flex flex-col items-center gap-2.5 flex-1">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full shimmer" />
          <div className="h-3 w-20 rounded shimmer" />
        </div>
        <div className="h-8 w-12 rounded shimmer" />
        <div className="flex flex-col items-center gap-2.5 flex-1">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full shimmer" />
          <div className="h-3 w-20 rounded shimmer" />
        </div>
      </div>
      <div className="bg-darkBg/60 border-t border-white/[0.06] h-10" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Main Page Component
// ─────────────────────────────────────────────────────────────────────────

export default function TeamsScudle() {
  const { user } = useAuth();
  const { teams = [], sessions = [] } = useAuction();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Filters & Controls
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedTournament, setSelectedTournament] = useState('all');
  const [sortOrder, setSortOrder] = useState('asc'); // asc / desc
  const [selectedMatch, setSelectedMatch] = useState(null);

  const fetchMatches = async ({ silent = false } = {}) => {
    try {
      if (silent) setRefreshing(true); else setLoading(true);
      const res = await api.get('/matches');
      const matchData = res?.data?.data || res?.data || [];
      if (Array.isArray(matchData)) {
        setMatches(matchData);
        setError('');
      } else {
        throw new Error("Invalid data format received");
      }
    } catch (err) {
      console.error("Failed to fetch matches:", err);
      setError('Failed to load match schedule. Please verify server connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Socket.IO real-time updates integration
  useEffect(() => {
    fetchMatches();

    // Auto polling fallback every 30s
    const pollId = setInterval(() => fetchMatches({ silent: true }), 30000);

    // Socket connection
    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
      transports: ['websocket', 'polling']
    });

    socket.on('match_updated', () => {
      fetchMatches({ silent: true });
    });

    socket.on('score_update', () => {
      fetchMatches({ silent: true });
    });

    return () => {
      clearInterval(pollId);
      socket.disconnect();
    };
  }, []);

  // Compute calculated status for stats & filtering
  const processedMatches = useMemo(() => {
    return matches.map(m => ({
      ...m,
      calculatedStatus: getCalculatedStatus(m)
    }));
  }, [matches]);

  // Unique Tournaments list for filter dropdown
  const tournamentsList = useMemo(() => {
    const set = new Set();
    matches.forEach(m => {
      if (m.tournament) set.add(m.tournament);
    });
    return Array.from(set);
  }, [matches]);

  // Quick Stat Strip Summary
  const stats = useMemo(() => ({
    total: processedMatches.length,
    live: processedMatches.filter(m => m.calculatedStatus === 'Live').length,
    upcoming: processedMatches.filter(m => m.calculatedStatus === 'Upcoming').length,
    finished: processedMatches.filter(m => m.calculatedStatus === 'Finished').length,
  }), [processedMatches]);

  // Filtering & Sorting Logic
  const filteredMatches = useMemo(() => {
    let list = processedMatches;

    // Filter by status tab
    if (activeTab !== 'all') {
      list = list.filter(m => m.calculatedStatus === activeTab);
    }

    // Filter by tournament
    if (selectedTournament !== 'all') {
      list = list.filter(m => m.tournament === selectedTournament);
    }

    // Search by Team Name, Venue, or Match Number
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(m =>
        (m.homeTeam || m.teamAName || '').toLowerCase().includes(q) ||
        (m.awayTeam || m.teamBName || '').toLowerCase().includes(q) ||
        (m.venue || '').toLowerCase().includes(q) ||
        (m.matchNumber || '').toString().toLowerCase().includes(q)
      );
    }

    // Sort by Date
    list = [...list].sort((a, b) => {
      const dateA = new Date(a.matchDate || 0);
      const dateB = new Date(b.matchDate || 0);
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });

    return list;
  }, [processedMatches, activeTab, selectedTournament, search, sortOrder]);

  // Group Matches by Date
  const groupedMatches = useMemo(() => {
    if (!filteredMatches.length) return {};
    return filteredMatches.reduce((acc, match) => {
      const date = formatDate(match.matchDate);
      if (!acc[date]) acc[date] = [];
      acc[date].push(match);
      return acc;
    }, {});
  }, [filteredMatches]);

  const sortedDates = Object.keys(groupedMatches);

  return (
    <div className="min-h-screen flex flex-col bg-black text-primaryText font-sans selection:bg-neonGreen selection:text-white">
      <style>{`
        @keyframes shimmerSweep {
          from { background-position: -400px 0; }
          to { background-position: 400px 0; }
        }
        .shimmer {
          background: linear-gradient(90deg, rgba(16,16,16,0.5) 25%, rgba(34,34,34,0.7) 37%, rgba(16,16,16,0.5) 63%);
          background-size: 400px 100%;
          animation: shimmerSweep 1.4s ease-in-out infinite;
        }
      `}</style>

      {!user && <Navbar />}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4">

        {/* Competition Header — kept sticky so navigation never drops the
            Championship / Overview / Matches / Table / Stats / Players bar */}
        <CompetitionHeader
          competitionName={matches[0]?.tournament || 'Championship'}
          sessionName={sessions?.[0]?.name || 'Current Season'}
          user={user}
          active="matches"
        />

        {/* Page Header — compact bar so the content sits right below the
            CompetitionHeader without dead space */}
        <div className="glass-card rounded-3xl overflow-hidden ui-fade-up">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 rounded-xl bg-neonGreen/10 border border-neonGreen/20 text-white shrink-0">
                <Trophy className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h1 className="font-heading font-black text-lg tracking-wide text-white leading-tight truncate">
                  Tournament Match Schedule
                </h1>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <StatPill label="Total Matches" value={stats.total} tone="text-primaryText border-cardBorder" />
              <StatPill label="Live Now" value={stats.live} tone="text-urgentRedText border-urgentRed/30" />
              <StatPill label="Upcoming" value={stats.upcoming} tone="text-white border-neonGreen/30" />
              <StatPill label="Completed" value={stats.finished} tone="text-white border-neonGreen/30" />
            </div>
          </div>
        </div>

        {!loading && !error && (
          <>
            {/* Filter Bar */}
            <div className="sticky top-16 z-20 flex flex-col md:flex-row gap-3 md:items-center md:justify-between rounded-2xl border border-cardBorder/90 bg-darkBg/80 backdrop-blur-xl px-4 py-3 shadow-2xl shadow-black/40">

              {/* Status Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                {STATUS_TABS.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 shrink-0 ${activeTab === tab.key
                      ? 'bg-[#0B2B26] border border-[#0B2B26] text-white font-black shadow-lg shadow-[#0B2B26]/30'
                      : 'bg-[#151515] border border-[#333333] text-[#F5F5F5] hover:text-white hover:border-[#0B2B26]'
                      }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Search & Extra Dropdowns */}
              <div className="flex flex-wrap items-center gap-2">

                {/* Search Box */}
                <div className="relative flex-1 min-w-[180px] sm:w-60">
                  <Search className="w-3.5 h-3.5 text-secondaryText absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search team, venue, match #..."
                    className="w-full pl-8 pr-7 py-1.5 rounded-xl text-xs text-white bg-cardBg/80 border border-cardBorder focus:outline-none focus:border-neonGreen/60 transition"
                  />
                  {search && (
                    <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-secondaryText hover:text-white">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Tournament Filter */}
                {tournamentsList.length > 0 && (
                  <div className="relative">
                    <select
                      value={selectedTournament}
                      onChange={e => setSelectedTournament(e.target.value)}
                      className="px-3 py-1.5 rounded-xl text-xs bg-cardBg/80 border border-cardBorder text-secondaryText focus:outline-none focus:border-neonGreen/60"
                    >
                      <option value="all">All Tournaments</option>
                      {tournamentsList.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Sort Order */}
                <button
                  onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                  className="btn-secondary p-2 rounded-xl flex items-center gap-1 text-xs"
                  title="Sort by date"
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  <span className="capitalize">{sortOrder}</span>
                </button>
              </div>
            </div>
          </>
        )}

        {/* Content States */}
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <MatchCardSkeleton key={i} index={i} />)}
          </div>
        ) : error ? (
          <div className="rounded-3xl p-10 text-center bg-urgentRed/20 border border-urgentRed/30 text-urgentRedText space-y-2">
            <AlertCircle className="w-10 h-10 mx-auto text-urgentRedText" />
            <p className="font-bold text-base">{error}</p>
            <button
              onClick={() => fetchMatches()}
              className="mt-3 px-4 py-2 text-xs font-bold bg-urgentRed/20 hover:bg-urgentRed/30 border border-urgentRed/40 rounded-xl text-white transition"
            >
              Try Again
            </button>
          </div>
        ) : matches.length === 0 ? (
          <div className="rounded-3xl p-12 text-center bg-darkBg/40 border border-cardBorder text-secondaryText space-y-2">
            <Shield className="w-10 h-10 mx-auto text-mutedText" />
            <p className="font-bold text-base text-secondaryText">No Matches Scheduled Yet</p>
            <p className="text-xs text-mutedText">Matches created by admin will automatically appear here live.</p>
          </div>
        ) : sortedDates.length === 0 ? (
          <div className="rounded-3xl p-12 text-center bg-darkBg/40 border border-cardBorder text-secondaryText space-y-2">
            <Filter className="w-10 h-10 mx-auto text-mutedText" />
            <p className="font-bold text-base text-secondaryText">No Matches Match Your Filters</p>
            <p className="text-xs text-mutedText">Try adjusting your search terms or status filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {sortedDates.map(date => (
              <div key={date} className="space-y-4 bg-cardBg/30 border border-cardBorder/60 p-4 rounded-3xl backdrop-blur-sm">

                {/* Date Section Header */}
                <div className="flex items-center gap-2.5 pb-1 border-b border-cardBorder/80">
                  <div className="p-1.5 rounded-lg bg-neonGreen/10 border border-neonGreen/20 text-white">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <h2 className="text-sm font-bold text-white tracking-wide">{date}</h2>
                  {isSameDay(groupedMatches[date][0]?.matchDate) && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-neonGreen/15 text-white border border-neonGreen/30">
                      Today
                    </span>
                  )}
                </div>

                {/* Match Cards for this Date */}
                <div className="space-y-4">
                  {groupedMatches[date].map((match, i) => (
                    <MatchCard key={match._id || match.id || i} match={match} index={i} teams={teams} onCardClick={setSelectedMatch} />
                  ))}
                </div>

              </div>
            ))}
          </div>
        )}

        <AnimatePresence>
          {selectedMatch && (
            <MatchDetailModal
              match={selectedMatch}
              onClose={() => setSelectedMatch(null)}
            />
          )}
        </AnimatePresence>

      </main>
    </div>
  );
}
