import { useState, useEffect, useMemo } from 'react';
import { Trophy, Users, ShieldCheck, Target, Goal, Footprints, Square } from 'lucide-react';
import Navbar from '../../components/Navbar';
import CompetitionHeader from '../../components/common/CompetitionHeader';
import api from '../../services/api';
import { getImageUrl } from '../../utils/imageUrl';
import { playerFallback } from '../../utils/playerFallback';
import { useAuction } from '../../context/AuctionContext';
import { useAuth } from '../../context/AuthContext';

// ─────────────────────────────────────────────────────────────────────────
// Standings — derived live from finished matches (3 pts win / 1 pt draw).
// Reused here so the Stats page's team table matches the League Table page.
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
      if (!a || !b) return;
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

const STATUS_STYLES = {
  REGISTERED: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  SOLD: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  UNSOLD: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  WITHDRAWN: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
};

const CATEGORY_COLORS = [
  'from-amber-500 to-orange-600',
  'from-blue-500 to-sky-600',
  'from-teal-500 to-emerald-600',
  'from-purple-500 to-violet-600',
];

const CATEGORY_ORDER = ['Icon Category', 'A Grade', 'B Grade', 'Emerging Youth'];

// ── Player stat leaderboards ─────────────────────────────────────────────
const STAT_TABS = [
  { id: 'goals', label: 'Goals', icon: Goal },
  { id: 'assists', label: 'Assists', icon: Footprints },
  { id: 'yellowCards', label: 'Yellow Cards', icon: Square },
  { id: 'redCards', label: 'Red Cards', icon: Square },
];

export default function LeagueStats() {
  const { user } = useAuth();
  const { teams = [], players = [], sessions = [] } = useAuction();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statTab, setStatTab] = useState('goals');

  const sessionName = sessions?.[0]?.name || 'Current Season';

  const fetchMatches = async () => {
    try {
      const res = await api.get('/matches');
      const data = res?.data?.data || res?.data || [];
      setMatches(Array.isArray(data) ? data : []);
      setError('');
    } catch (err) {
      console.error('Failed to fetch matches:', err);
      setError('Failed to load statistics. Please verify server connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMatches(); }, []);

  const competitionName = matches[0]?.tournament || 'Championship';

  const standings = useMemo(() => computeStandings(teams, matches), [teams, matches]);

  // ── Player snapshot ──────────────────────────────────────────────────────
  const playerStats = useMemo(() => {
    const statusCounts = {};
    players.forEach(p => {
      const s = p.status?.toUpperCase() || 'REGISTERED';
      statusCounts[s] = (statusCounts[s] || 0) + 1;
    });

    const categoryCounts = {};
    players.forEach(p => {
      const c = p.category || 'B Grade';
      categoryCounts[c] = (categoryCounts[c] || 0) + 1;
    });

    const totalBudget = teams.reduce((sum, t) => sum + (Number(t.budget) || 0), 0);
    const spent = teams.reduce((sum, t) => sum + Number(t.spentBudget || 0), 0);

    return {
      total: players.length,
      statusCounts,
      categoryCounts,
      totalBudget,
      spent,
      remaining: totalBudget - spent,
    };
  }, [players, teams]);

  const finishedMatches = matches.filter(m => m.status === 'Finished');
  const upcomingMatches = matches.filter(m => m.status !== 'Finished' && m.status !== 'Live');

  const totalGoals = finishedMatches.reduce((sum, m) => sum + (Number(m.scoreA) || 0) + (Number(m.scoreB) || 0), 0);

  // ── Cards config ─────────────────────────────────────────────────────────
  const statCards = [
    { label: 'Franchises', value: teams.length, icon: ShieldCheck, tone: 'text-sky-400 bg-sky-500/10 border-sky-500/30' },
    { label: 'Players', value: playerStats.total, icon: Users, tone: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
    { label: 'Players Sold', value: playerStats.statusCounts.SOLD || 0, icon: Trophy, tone: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
    { label: 'Matches Played', value: finishedMatches.length, icon: Target, tone: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  ];

  const totalStatus = Object.values(playerStats.statusCounts).reduce((a, b) => a + b, 0) || 1;

  const maxCategory = Math.max(1, ...Object.values(playerStats.categoryCounts));

  const sortedCategories = CATEGORY_ORDER
    .map(c => ({ name: c, count: playerStats.categoryCounts[c] || 0 }))
    .filter(c => c.count > 0)
    .concat(
      Object.entries(playerStats.categoryCounts)
        .filter(([name]) => !CATEGORY_ORDER.includes(name))
        .map(([name, count]) => ({ name, count }))
    );

  // ── Leaderboard for the active stat tab ─────────────────────────────────
  const teamIdMap = useMemo(() => {
    const map = {};
    teams.forEach(t => { map[String(t._id || t.id)] = t; });
    return map;
  }, [teams]);

  const leaderboard = useMemo(() => {
    return players
      .filter(p => (Number(p[statTab]) || 0) > 0)
      .map(p => ({
        player: p,
        value: Number(p[statTab]) || 0,
        team: teamIdMap[String(p.soldToTeam?._id || p.soldToTeam)] || null,
      }))
      .sort((a, b) => b.value - a.value);
  }, [players, statTab, teamIdMap]);

  const activeTab = STAT_TABS.find(t => t.id === statTab) || STAT_TABS[0];

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0f19] text-slate-100 font-sans selection:bg-blue-500 selection:text-white">
      {!user && <Navbar />}

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4">

        <CompetitionHeader
          competitionName={competitionName}
          sessionName={sessionName}
          user={user}
          active="stats"
        />

        {/* Error / Loading */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="h-24 rounded-3xl bg-slate-800/40 animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-2xl p-6 text-center">
            {error}
          </p>
        ) : (
          <div className="flex flex-col gap-4">

            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {statCards.map(({ label, value, icon: Icon }) => (
                <div key={label} className="glass-card rounded-3xl p-4 flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-mono font-black text-2xl text-white leading-none">{value}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">{label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Player stat leaderboard */}
            <section className="glass-card rounded-3xl overflow-hidden">
              <div className="px-4 sm:px-6 py-3.5 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 shrink-0">
                    <activeTab.icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="font-heading font-black text-lg tracking-wide text-white leading-tight">{activeTab.label} Leaderboard</h1>
                    <p className="text-[10px] text-slate-500">{competitionName} &bull; {sessionName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex rounded-xl overflow-hidden border border-slate-800 bg-slate-950/50 p-0.5">
                    {STAT_TABS.map(tab => {
                      const isActive = tab.id === statTab;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setStatTab(tab.id)}
                          className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition ${isActive
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                          }`}
                        >
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div>
                {leaderboard.length === 0 ? (
                  <p className="text-xs text-slate-500 border border-dashed border-slate-700 rounded-xl p-8 text-center my-5 mx-5">
                    No {activeTab.label.toLowerCase()} recorded yet.
                  </p>
                ) : (
                  <ul className="divide-y divide-slate-800/50">
                    {leaderboard.slice(0, 10).map((row, idx) => (
                      <li key={row.player.id || row.player._id || idx} className="flex items-center gap-3 px-4 sm:px-6 py-3 hover:bg-slate-800/30 transition">
                        <span className="w-6 text-center font-mono font-black text-sm text-slate-500">{idx + 1}</span>
                        <img
                          src={getImageUrl(row.player.imageUrl, playerFallback('slate'))}
                          alt={row.player.name}
                          onError={e => { e.currentTarget.src = playerFallback('slate'); }}
                          className="w-9 h-9 rounded-xl object-cover border border-slate-700 bg-slate-800 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-white text-sm truncate">{row.player.name}</p>
                          <p className="text-[10px] text-slate-500 truncate">
                            {row.team?.name || row.player.category || 'No squad'}
                            {row.team && ` (${row.team.shortCode || ''})`}
                          </p>
                        </div>
                        <span className={`font-mono font-black text-lg ${statTab === 'redCards' ? 'text-rose-400' : statTab === 'yellowCards' ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {row.value}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>

            {/* Main content */}
            <div className="lg:grid lg:grid-cols-2 gap-4 flex flex-col gap-4">

              {/* Players by category */}
              <section className="glass-card rounded-3xl p-5 space-y-4">
                <h2 className="font-heading font-black text-sm tracking-wide text-white">Players by Category</h2>
                {sortedCategories.length === 0 ? (
                  <p className="text-xs text-slate-500 border border-dashed border-slate-700 rounded-xl p-4 text-center">No players registered yet.</p>
                ) : (
                  <div className="space-y-3">
                    {sortedCategories.map(({ name, count }, idx) => {
                      const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
                      return (
                        <div key={name}>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="font-bold text-slate-300">{name}</span>
                            <span className="font-mono font-black text-white">{count}</span>
                          </div>
                          <span className="block h-1.5 rounded-full bg-slate-800 overflow-hidden">
                            <span className={`block h-full bg-gradient-to-r ${color} rounded-full`} style={{ width: `${(count / maxCategory) * 100}%` }} />
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* Squad status */}
              <section className="glass-card rounded-3xl p-5 space-y-4">
                <h2 className="font-heading font-black text-sm tracking-wide text-white">Squad Status</h2>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(STATUS_STYLES).map(([status, style]) => {
                    const count = playerStats.statusCounts[status] || 0;
                    if (count === 0) return null;
                    const pct = ((count / totalStatus) * 100).toFixed(1);
                    return (
                      <div key={status} className={`flex-1 min-w-[110px] rounded-xl border px-3 py-2.5 ${style}`}>
                        <p className="font-mono font-black text-lg leading-none">{count}</p>
                        <p className="text-[9px] font-bold uppercase tracking-widest mt-1 opacity-80">{status} &bull; {pct}%</p>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Fixture summary */}
              <section className="glass-card rounded-3xl p-5 space-y-4">
                <h2 className="font-heading font-black text-sm tracking-wide text-white">Fixtures</h2>
                <div className="flex items-stretch gap-3">
                  {[
                    { label: 'Played', value: finishedMatches.length, cls: 'text-emerald-400' },
                    { label: 'Upcoming', value: upcomingMatches.length, cls: 'text-sky-400' },
                    { label: 'Goals', value: totalGoals, cls: 'text-amber-400' },
                  ].map(({ label, value, cls }) => (
                    <div key={label} className="flex-1 rounded-2xl border border-slate-800 bg-slate-950/50 p-3 text-center">
                      <p className={`font-mono font-black text-2xl ${cls}`}>{value}</p>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mt-1">{label}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Current leaders */}
              <section className="glass-card rounded-3xl p-5 space-y-4">
                <h2 className="font-heading font-black text-sm tracking-wide text-white">Current Leaders</h2>
                {standings.length === 0 ? (
                  <p className="text-xs text-slate-500 border border-dashed border-slate-700 rounded-xl p-4 text-center">Standings appear once matches are finished.</p>
                ) : (
                  <div className="space-y-2.5">
                    {standings.slice(0, 3).map((row, idx) => (
                      <div key={row.team._id || row.team.id || idx} className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                        <span className="font-mono font-black text-lg text-amber-400">{idx + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-white text-sm truncate">{row.team.name}</p>
                          <p className="text-[10px] text-slate-500">P {row.mp} &bull; W{row.w} D{row.d} L{row.l}</p>
                        </div>
                        <span className="font-mono font-black text-emerald-400">{row.pts}</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}