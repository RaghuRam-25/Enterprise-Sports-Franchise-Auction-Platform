import { useState, useEffect, useMemo } from 'react';
import { Trophy, Shield, RefreshCw, ArrowUp } from 'lucide-react';
import Navbar from '../../components/Navbar';
import CompetitionHeader from '../../components/common/CompetitionHeader';
import api from '../../services/api';
import { getImageUrl } from '../../utils/imageUrl';
import { getTeamAvatarConfig } from '../../utils/themeConfig';
import { useAuction } from '../../context/AuctionContext';
import { useAuth } from '../../context/AuthContext';

// ─────────────────────────────────────────────────────────────────────────
// Live league table — derived from finished matches (3 pts win / 1 pt draw).
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

const getInitials = (name = '') =>
  (name || '').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'T';

function TeamCrest({ team, size = 'md' }) {
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
    'xs': 'w-10 h-10 rounded-xl text-[9px]',
    'sm': 'w-12 h-12 rounded-2xl text-[10px]',
    'md': 'w-14 h-14 rounded-2xl text-xs',
  }[size] || 'w-12 h-12 rounded-2xl text-[10px]';

  return (
    <div
      className={`relative flex-shrink-0 flex items-center justify-center font-black overflow-hidden border shadow-md ${dims} ${avatarConfig.borderColor}`}
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

export default function LeagueTable() {
  const { user } = useAuth();
  const { teams = [], sessions = [] } = useAuction();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [manualRows, setManualRows] = useState(null);

  const sessionName = sessions?.[0]?.name || 'Current Season';

  const fetchMatches = async () => {
    try {
      const res = await api.get('/matches');
      const data = res?.data?.data || res?.data || [];
      setMatches(Array.isArray(data) ? data : []);
      setError('');
    } catch (err) {
      console.error('Failed to fetch matches:', err);
      setError('Failed to load standings. Please verify server connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMatches(); }, []);

  // Manual override published from Admin → Match Center → Table Override.
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
        /* overrides are optional — silently fall back to computed standings */
      }
    })();
  }, []);

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
    return computeStandings(teams, matches);
  }, [manualRows, teams, matches]);

  const competitionName = matches[0]?.tournament || 'Championship';

  const maxPoints = standings[0]?.pts || 0;

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0f19] text-primaryText font-sans selection:bg-neonGreen selection:text-darkBg">
      {!user && <Navbar />}

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4">

        <CompetitionHeader
          competitionName={competitionName}
          sessionName={sessionName}
          user={user}
          active="table"
        />

        {/* Standings Card */}
        <section className="glass-card rounded-3xl overflow-hidden ui-fade-up shadow-lg shadow-black/30">
          {/* Card header — slim bar instead of a big hero */}
          <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3.5 border-b border-cardBorder/80">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 rounded-xl bg-warningGold/10 border border-warningGold/20 text-warningGold shrink-0">
                <Trophy className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h1 className="font-heading font-black text-lg tracking-wide text-white leading-tight">League Table</h1>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {manualRows && (
                <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-warningGold/15 text-warningGold border border-warningGold/30">Manual</span>
              )}
            </div>
          </div>

          {loading ? (
            <div className="space-y-3 p-5">
              {[0, 1, 2, 3, 4].map(i => (
                <div key={i} className="h-12 rounded-xl bg-surfaceHover/40 animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <p className="text-xs text-urgentRedText bg-urgentRed/10 border border-urgentRed/30 rounded-2xl p-6 text-center my-5 mx-5">
              {error}
            </p>
          ) : standings.length === 0 ? (
            <p className="text-xs text-mutedText bg-darkBg/50 border border-dashed border-borderStrong rounded-2xl p-8 text-center my-5 mx-5">
              Standings appear once the tournament phase begins and matches are finished.
            </p>
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
                  {standings.map((row, idx) => {
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
        </section>
      </main>
    </div>
  );
}