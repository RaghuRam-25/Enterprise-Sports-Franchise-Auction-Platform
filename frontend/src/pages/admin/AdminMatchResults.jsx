import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Trophy, Calendar, Clock, MapPin, Save, X, RefreshCw,
  Lock, Search, CheckCircle2, PenLine, Table2, BarChart3,
  Wand2, ExternalLink
} from 'lucide-react';
import { useAuction } from '../../context/AuctionContext';
import { useAuth } from '../../context/AuthContext';
import TeamBadge from '../../components/common/TeamBadge';
import api from '../../services/api';
import { getImageUrl } from '../../utils/imageUrl';
import { playerFallback } from '../../utils/playerFallback';

const STATUS_OPTIONS = ['Upcoming', 'Live', 'Finished', 'Cancelled'];

const TABS = [
  { id: 'results', label: 'Results', icon: Trophy },
  { id: 'table', label: 'Table Override', icon: Table2 },
  {id: 'stats', label: 'Player Stats', icon: BarChart3 },
];

const formatDate = (dateString) => {
  if (!dateString) return 'Date TBD';
  try {
    return new Date(dateString).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return dateString;
  }
};

const statusStyle = (status) => ({
  'Upcoming': 'bg-neonGreen/15 text-neonGreenHover border-neonGreen/30',
  'Live': 'bg-urgentRed/20 text-urgentRedText border-urgentRed/40 animate-pulse',
  'Finished': 'bg-neonGreen/15 text-neonGreenHover border-neonGreen/30',
  'Cancelled': 'bg-surfaceHover text-secondaryText border-borderStrong',
}[status] || 'bg-surfaceHover text-secondaryText border-borderStrong');

// Same derivation as the public LeagueTable page — used to auto-fill override rows.
function computeAutoRows(teams, matches) {
  const map = new Map();
  teams.forEach(t => {
    const id = String(t._id || t.id);
    map.set(id, {
      teamId: id, teamName: t.name || 'Team', shortCode: t.shortCode || '',
      mp: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0,
    });
  });
  matches
    .filter(m => m.status === 'Finished' && m.scoreA != null && m.scoreB != null)
    .forEach(m => {
      const aId = String(m.teamA?._id || m.teamA);
      const bId = String(m.teamB?._id || m.teamB);
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
    (y.pts - x.pts) || ((y.gf - y.ga) - (x.gf - x.ga)) || (y.gf - x.gf)
  );
}

const numVal = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
};

const TABLE_FIELDS = [
  { key: 'mp', header: 'Played', cls: 'text-secondaryText' },
  { key: 'w', header: 'Won', cls: 'text-neonGreenHover' },
  { key: 'd', header: 'Drawn', cls: 'text-neonGreenHover' },
  { key: 'l', header: 'Lost', cls: 'text-urgentRedText' },
  { key: 'gf', header: 'Goals For', cls: 'text-secondaryText' },
  { key: 'ga', header: 'Goals Against', cls: 'text-secondaryText' },
  { key: 'pts', header: 'Points', cls: 'text-warningGold' },
];

export default function AdminMatchResults() {
  const { teams = [], triggerToast } = useAuction();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [tab, setTab] = useState('results');
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  const loadMatches = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/matches');
      const data = res?.data?.data || res?.data || [];
      setMatches(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load matches:', err);
      triggerToast('Could not load matches.', 'error');
    } finally {
      setLoading(false);
    }
  }, [triggerToast]);

  useEffect(() => { loadMatches(); }, [loadMatches]);

  const teamName = (idOrTeam) => {
    if (!idOrTeam) return 'TBD';
    if (typeof idOrTeam === 'object') return idOrTeam.name || idOrTeam.shortCode || 'TBD';
    const t = teams.find(t => (t._id || t.id) === idOrTeam);
    return t?.name || 'TBD';
  };

  const filteredMatches = useMemo(() => {
    if (!search.trim()) return matches;
    const q = search.trim().toLowerCase();
    return matches.filter(m =>
      (m.teamAName || teamName(m.teamA) || '').toLowerCase().includes(q) ||
      (m.teamBName || teamName(m.teamB) || '').toLowerCase().includes(q)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matches, search, teams]);

  const openEdit = (match) => {
    setEditing(match);
    setEditForm({
      status: match.status || 'Upcoming',
      scoreA: typeof match.scoreA !== 'undefined' && match.scoreA !== null ? String(match.scoreA) : '0',
      scoreB: typeof match.scoreB !== 'undefined' && match.scoreB !== null ? String(match.scoreB) : '0',
    });
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    const id = editing._id || editing.id;
    try {
      const res = await api.put(`/matches/${id}`, {
        status: editForm.status,
        scoreA: editForm.scoreA,
        scoreB: editForm.scoreB,
      });
      const updated = res?.data?.data || res?.data;
      setMatches(prev => prev.map(m => (m._id || m.id) === id ? { ...m, ...updated } : m));
      triggerToast('Match result updated.', 'success');
      setEditing(null);
    } catch (err) {
      triggerToast(err?.response?.data?.message || 'Failed to update match result.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="p-4 bg-warningGold/10 border border-warningGold/30 rounded-2xl flex items-center gap-3 text-warningGold text-xs font-semibold">
        <Lock className="w-5 h-5 flex-shrink-0 text-warningGold" />
        <p>Match Results is restricted to Super Admin.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <span className="text-xs font-bold uppercase tracking-widest text-neonGreen">Tournament Management</span>
        <h1 className="text-2xl font-black font-heading text-white">Match Center</h1>
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl overflow-hidden border border-cardBorder bg-darkBg/50 p-1 w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition ${tab === id
              ? 'bg-[#58D20A] text-[#050505] font-black shadow-md'
              : 'bg-[#151515] text-[#F5F5F5] border border-[#333333] hover:border-[#58D20A] hover:text-[#58D20A]'
            }`}
          >
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>

      {/* ── Results tab ── */}
      {tab === 'results' && (
        <>
          <div className="flex items-center justify-end gap-2">
            <div className="relative sm:w-56">
              <Search className="w-3.5 h-3.5 text-mutedText absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by team..."
                className="glass-input w-full pl-8 pr-3 py-2 rounded-lg text-xs text-white"
              />
            </div>
            <button
              type="button"
              onClick={loadMatches}
              className="btn-secondary flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>

          {loading ? (
            <div className="glass-card rounded-2xl p-10 text-center text-mutedText border border-cardBorder">Loading matches...</div>
          ) : filteredMatches.length === 0 ? (
            <div className="glass-card rounded-2xl p-10 text-center text-mutedText border border-cardBorder space-y-1">
              <Trophy className="w-8 h-8 mx-auto text-mutedText" />
              <p className="font-bold text-secondaryText">{matches.length === 0 ? 'No matches scheduled yet' : `No matches match "${search}"`}</p>
              <p className="text-xs">Create fixtures from Fixtures &amp; Scheduling first.</p>
            </div>
          ) : (
            <div className="glass-card rounded-2xl overflow-hidden border border-cardBorder">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full min-w-[760px] text-sm border-collapse">
                  <thead>
                    <tr className="text-[9px] font-black uppercase tracking-widest text-mutedText bg-darkBg/60">
                      <th className="text-left py-2.5 pl-4 sm:pl-6 pr-2">Fixture</th>
                      <th className="text-left py-2.5 pr-2">Date &amp; Venue</th>
                      <th className="text-center py-2.5 px-1">Status</th>
                      <th className="text-center py-2.5 px-1">Score</th>
                      <th className="text-right py-2.5 pl-2 pr-4 sm:pr-6">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cardBorder/50">
                    {filteredMatches.map(m => {
                      const id = m._id || m.id;
                      const teamARecord = (typeof m.teamA === 'object' && m.teamA?._id
                          ? m.teamA
                          : teams.find(t => String(t._id || t.id) === String(m.teamA?._id || m.teamA))) ||
                        { name: m.teamAName || teamName(m.teamA) };
                      const teamBRecord = (typeof m.teamB === 'object' && m.teamB?._id
                          ? m.teamB
                          : teams.find(t => String(t._id || t.id) === String(m.teamB?._id || m.teamB))) ||
                        { name: m.teamBName || teamName(m.teamB) };

                      const isFinished = m.status === 'Finished';
                      const isLive = m.status === 'Live';

                      return (
                        <tr key={id} className="hover:bg-surfaceHover/30 transition">
                          <td className="py-3 pl-4 sm:pl-6 pr-2">
                            <div className="flex items-center gap-3 min-w-0">
                              <TeamBadge team={teamARecord} size="sm" showManager={false} />
                              <span className="text-[10px] font-black text-mutedText mx-1 shrink-0">
                                {isFinished || (isLive && (m.scoreA || m.scoreB)) ? (
                                  `${m.scoreA || 0} : ${m.scoreB || 0}`
                                ) : 'VS'}
                              </span>
                              <TeamBadge team={teamBRecord} size="sm" showManager={false} />
                            </div>
                          </td>
                          <td className="py-3 pr-2 text-xs text-secondaryText">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3 h-3 text-neonGreen shrink-0" />
                              <span className="font-semibold">{formatDate(m.matchDate)}</span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5 text-mutedText">
                              <Clock className="w-3 h-3 shrink-0" />
                              <span>{m.matchTime || 'TBD'}</span>
                              <MapPin className="w-3 h-3 ml-1 shrink-0" />
                              <span className="truncate">{m.venue || 'TBD'}</span>
                            </div>
                          </td>
                          <td className="py-3 px-1 text-center">
                            <span className={`inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${statusStyle(m.status)}`}>
                              {m.status || 'Upcoming'}
                            </span>
                          </td>
                          <td className="py-3 px-1 text-center font-mono font-black text-white text-sm">
                            {isFinished ? `${m.scoreA || 0} : ${m.scoreB || 0}` : '—'}
                          </td>
                          <td className="py-3 pl-2 pr-4 sm:pr-6 text-right">
                            <button
                              type="button"
                              onClick={() => openEdit(m)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neonGreen/40 bg-neonGreen/10 text-neonGreenHover hover:bg-neonGreen/20 text-[11px] font-bold transition"
                            >
                              <PenLine className="w-3 h-3" /> Edit Result
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="px-4 sm:px-6 py-3 text-[10px] font-bold text-mutedText uppercase tracking-widest border-t border-cardBorder/60 text-center">
                {filteredMatches.length} fixture{filteredMatches.length !== 1 ? 's' : ''} · Finished matches feed the Overview recap &amp; standings
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Table Override tab ── */}
      {tab === 'table' && <TableOverrideTab matches={matches} teams={teams} triggerToast={triggerToast} />}

      {/* ── Stats tab ── */}
      {tab === 'stats' && <StatsOverrideTab triggerToast={triggerToast} />}

      {/* Edit result modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-md rounded-2xl p-6 border border-borderStrong space-y-5 shadow-2xl">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-neonGreen" /> Edit Match Result
              </h2>
              <button onClick={() => setEditing(null)} className="p-2 text-secondaryText hover:text-white hover:bg-surfaceHover rounded-lg transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-xl border border-cardBorder bg-darkBg/60 p-3 flex items-center justify-between gap-2">
              <TeamBadge team={(typeof editing.teamA === 'object' ? editing.teamA : null) || { name: editing.teamAName || teamName(editing.teamA) }} size="sm" showManager={false} />
              <span className="text-[10px] font-black text-mutedText">VS</span>
              <TeamBadge team={(typeof editing.teamB === 'object' ? editing.teamB : null) || { name: editing.teamBName || teamName(editing.teamB) }} size="sm" showManager={false} />
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-mutedText mb-1.5">Match Status</label>
                <div className="grid grid-cols-2 gap-2">
                  {STATUS_OPTIONS.map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setEditForm(prev => ({ ...prev, status: s }))}
                      className={`py-2 rounded-xl border text-xs font-bold transition ${editForm.status === s
                        ? 'bg-successGreen/20 border-neonGreen/50 text-neonGreenHover'
                        : 'bg-cardBg/60 border-cardBorder text-secondaryText hover:border-borderStrong'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {editForm.status === 'Finished' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-mutedText mb-1.5">
                      {editing.teamAName || teamName(editing.teamA)} Score
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editForm.scoreA}
                      onChange={e => setEditForm(prev => ({ ...prev, scoreA: e.target.value }))}
                      className="glass-input w-full px-3 py-2 rounded-xl text-sm font-mono font-black text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-mutedText mb-1.5">
                      {editing.teamBName || teamName(editing.teamB)} Score
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editForm.scoreB}
                      onChange={e => setEditForm(prev => ({ ...prev, scoreB: e.target.value }))}
                      className="glass-input w-full px-3 py-2 rounded-xl text-sm font-mono font-black text-white"
                    />
                  </div>
                </div>
              )}

              {editForm.status !== 'Finished' && (
                <p className="text-[11px] text-mutedText bg-darkBg/60 border border-dashed border-cardBorder rounded-xl p-3">
                  Scores only apply to Finished matches. Switch status to <span className="font-bold text-neonGreen">Finished</span> to record a result.
                </p>
              )}
            </div>

            <div className="flex gap-3 pt-1">
              <button onClick={() => setEditing(null)} className="flex-1 py-2.5 border border-borderStrong text-secondaryText hover:bg-surfaceHover rounded-xl text-xs font-semibold transition">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 bg-successGreen hover:bg-neonGreen disabled:opacity-60 text-darkBg rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition"
              >
                {saving ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Table Override tab — manual standings that replace the auto-computed table
   on /matches/table when enabled.
   ═══════════════════════════════════════════════════════════════════════════ */
function TableOverrideTab({ matches, teams, triggerToast }) {
  const [configLoaded, setConfigLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [rows, setRows] = useState([]);

  const autoRows = useMemo(() => computeAutoRows(teams, matches), [teams, matches]);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/admin/display');
        const payload = res?.data?.data || res?.data || {};
        const to = payload.tableOverride || {};
        setEnabled(!!to.enabled);
        if (Array.isArray(to.rows) && to.rows.length > 0) {
          setRows(to.rows.map(r => ({
            teamId: r.teamId || '',
            teamName: r.teamName || 'Team',
            shortCode: r.shortCode || '',
            mp: numVal(r.mp), w: numVal(r.w), d: numVal(r.d), l: numVal(r.l),
            gf: numVal(r.gf), ga: numVal(r.ga), pts: numVal(r.pts),
          })));
        }
      } catch (err) {
        console.error('Failed to load display config:', err);
        triggerToast('Could not load saved table override.', 'error');
      } finally {
        setConfigLoaded(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Prefill from computed standings once both config + data are ready.
  useEffect(() => {
    if (configLoaded && rows.length === 0 && autoRows.length > 0) {
      setRows(autoRows);
    }
  }, [configLoaded, rows.length, autoRows]);

  const updateRow = (idx, field, value) => {
    setRows(prev => prev.map((r, i) => (i === idx ? { ...r, [field]: numVal(value) } : r)));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/admin/display', {
        tableOverride: {
          enabled,
          rows: rows.map(r => ({
            teamId: r.teamId, teamName: r.teamName, shortCode: r.shortCode,
            mp: numVal(r.mp), w: numVal(r.w), d: numVal(r.d), l: numVal(r.l),
            gf: numVal(r.gf), ga: numVal(r.ga), pts: numVal(r.pts),
          })),
        },
      });
      triggerToast(enabled ? 'League table override is LIVE.' : 'Override saved (currently disabled).', 'success');
    } catch (err) {
      triggerToast(err?.response?.data?.message || 'Failed to save table override.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls bar */}
      <div className="glass-card rounded-2xl border border-cardBorder p-4 flex flex-col lg:flex-row lg:items-center gap-3 justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            onClick={() => setEnabled(v => !v)}
            className={`relative w-11 h-6 rounded-full transition shrink-0 ${enabled ? 'bg-neonGreen' : 'bg-surfaceHover'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-5' : ''}`} />
          </button>
          <div>
            <p className="text-xs font-black text-white">
              Manual Override {enabled ? (
                <span className="ml-1.5 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-neonGreen/15 text-neonGreenHover border border-neonGreen/30">Live</span>
              ) : (
                <span className="ml-1.5 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-surfaceHover text-secondaryText border border-borderStrong">Off</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setRows(autoRows)}
            disabled={autoRows.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-cardBorder bg-cardBg/60 text-xs font-bold text-secondaryText hover:text-white hover:border-borderStrong transition disabled:opacity-40"
          >
            <Wand2 className="w-3.5 h-3.5" /> Auto-fill from results
          </button>
          <a
            href="/matches/table"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-borderStrong bg-surfaceActive text-xs font-bold text-secondaryText hover:text-white hover:border-borderStrong transition"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Preview
          </a>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || rows.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-successGreen hover:bg-neonGreen disabled:opacity-60 text-darkBg text-xs font-bold transition"
          >
            {saving ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save Table
          </button>
        </div>
      </div>

      {/* Editable standings grid */}
      {rows.length === 0 ? (
        <div className="glass-card rounded-2xl p-10 text-center text-mutedText border border-cardBorder">
          <Table2 className="w-8 h-8 mx-auto text-mutedText mb-2" />
          <p className="font-bold text-secondaryText">No teams available</p>
          <p className="text-xs mt-1">Create franchises first — rows auto-fill from your results.</p>
        </div>
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden border border-cardBorder">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full min-w-[880px] text-sm border-collapse">
              <thead>
                <tr className="text-[10px] font-black uppercase tracking-widest bg-darkBg/60">
                  <th className="text-left py-3 pl-4 sm:pl-6 pr-2 text-secondaryText">#</th>
                  <th className="text-left py-3 pr-4 text-secondaryText">Team</th>
                  {TABLE_FIELDS.map(f => (
                    <th key={f.key} className={`text-center py-3 px-2 min-w-[76px] ${f.cls}`}>{f.header}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-cardBorder/50">
                {rows.map((row, idx) => (
                  <tr key={row.teamId || idx} className="hover:bg-surfaceHover/30 transition">
                    <td className="py-3 pl-4 sm:pl-6 pr-2 font-mono font-black text-sm text-mutedText">{idx + 1}</td>
                    <td className="py-3 pr-4">
                      <TeamBadge
                        team={teams.find(t => String(t._id || t.id) === String(row.teamId)) || { name: row.teamName, shortCode: row.shortCode }}
                        size="sm"
                        showManager={false}
                      />
                    </td>
                    {TABLE_FIELDS.map(f => (
                      <td key={f.key} className="py-3 px-2 text-center">
                        <input
                          type="number"
                          min="0"
                          value={row[f.key]}
                          onChange={e => updateRow(idx, f.key, e.target.value)}
                          className={`w-16 mx-auto px-2 py-2 rounded-xl bg-darkBg/70 border text-center font-mono font-black text-base transition focus:outline-none focus:ring-1 ${
                            f.key === 'pts'
                              ? 'border-warningGold/40 text-warningGold focus:ring-warningGold/50'
                              : f.key === 'w'
                                ? 'border-cardBorder text-neonGreenHover focus:ring-neonGreen/50'
                                : f.key === 'l'
                                  ? 'border-cardBorder text-urgentRedText focus:ring-neonGreen/50'
                                  : 'border-cardBorder text-white focus:ring-neonGreen/50'
                          }`}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 sm:px-6 py-3 text-[10px] font-bold text-mutedText uppercase tracking-widest border-t border-cardBorder/60 text-center">
            Rows display in this exact order · Pts column drives the amber progress bars
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Player Stats tab — quick edits for goals / assists / cards that feed the
   leaderboards on /matches/stats. (Summary cards are computed automatically.)
   ═══════════════════════════════════════════════════════════════════════════ */
const STAT_FIELDS = [
  { key: 'goals', header: 'Goals', cls: 'text-neonGreenHover' },
  { key: 'assists', header: 'Assists', cls: 'text-neonGreenHover' },
  { key: 'yellowCards', header: 'Yellow', cls: 'text-warningGold' },
  { key: 'redCards', header: 'Red', cls: 'text-urgentRedText' },
];

function StatsOverrideTab({ triggerToast }) {
  // Player stats state
  const [playerSearch, setPlayerSearch] = useState('');
  const [players, setPlayers] = useState([]);
  const [playersLoading, setPlayersLoading] = useState(false);
  const [drafts, setDrafts] = useState({});
  const [savingPlayerId, setSavingPlayerId] = useState(null);

  const searchPlayers = useCallback(async (q = '') => {
    setPlayersLoading(true);
    try {
      const res = await api.get('/admin/players', { params: q.trim() ? { search: q.trim() } : {} });
      const data = res?.data?.data || res?.data || [];
      const list = Array.isArray(data) ? data.slice(0, 25) : [];
      setPlayers(list);
      setDrafts(prev => {
        const next = { ...prev };
        list.forEach(p => {
          const id = p._id || p.id;
          if (!next[id]) {
            next[id] = {
              goals: numVal(p.goals), assists: numVal(p.assists),
              yellowCards: numVal(p.yellowCards), redCards: numVal(p.redCards),
            };
          }
        });
        return next;
      });
    } catch (err) {
      console.error('Failed to load players:', err);
      triggerToast('Could not load players.', 'error');
    } finally {
      setPlayersLoading(false);
    }
  }, [triggerToast]);

  useEffect(() => { searchPlayers(); }, [searchPlayers]);

  const updateDraft = (id, field, value) => {
    setDrafts(prev => ({ ...prev, [id]: { ...prev[id], [field]: numVal(value) } }));
  };

  const savePlayerStats = async (player) => {
    const id = player._id || player.id;
    setSavingPlayerId(id);
    try {
      await api.put(`/admin/players/${id}`, drafts[id]);
      triggerToast(`Stats saved for ${player.name}.`, 'success');
    } catch (err) {
      triggerToast(err?.response?.data?.message || `Failed to save stats for ${player.name}.`, 'error');
    } finally {
      setSavingPlayerId(null);
    }
  };

  return (
    <div className="glass-card rounded-2xl border border-cardBorder overflow-hidden flex flex-col" style={{ maxHeight: '72vh' }}>
      <div className="px-4 py-4 border-b border-cardBorder/80 space-y-3">
        <div>
          <h2 className="text-sm font-black text-white">Player Statistics</h2>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-mutedText absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={playerSearch}
              onChange={e => setPlayerSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && searchPlayers(playerSearch)}
              placeholder="Search players..."
              className="glass-input w-full pl-9 pr-3 py-2.5 rounded-xl text-sm text-white"
            />
          </div>
          <button
            type="button"
            onClick={() => searchPlayers(playerSearch)}
            className="px-4 py-2.5 rounded-xl bg-successGreen hover:bg-neonGreen text-darkBg text-sm font-bold transition"
          >
            Search
          </button>
        </div>
      </div>

      <div className="overflow-auto custom-scrollbar flex-1">
        {playersLoading ? (
          <p className="p-10 text-center text-sm text-mutedText">Loading players...</p>
        ) : players.length === 0 ? (
          <p className="p-10 text-center text-sm text-mutedText">No players found.</p>
        ) : (
          <table className="w-full min-w-[720px] text-sm border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="text-[10px] font-black uppercase tracking-widest text-secondaryText bg-darkBg/95 backdrop-blur">
                <th className="text-left py-3 pl-4 pr-2">Player</th>
                {STAT_FIELDS.map(f => (
                  <th key={f.key} className={`text-center py-3 px-2 w-24 ${f.cls}`}>{f.header}</th>
                ))}
                <th className="text-right py-3 pl-2 pr-4 w-32">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cardBorder/50">
              {players.map(p => {
                const id = p._id || p.id;
                const draft = drafts[id] || {};
                return (
                  <tr key={id} className="hover:bg-surfaceHover/30 transition">
                    <td className="py-3 pl-4 pr-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={getImageUrl(p.imageUrl, playerFallback('slate'))}
                          alt=""
                          onError={e => { e.currentTarget.src = playerFallback('slate'); }}
                          className="w-10 h-10 rounded-xl object-cover border border-borderStrong bg-surfaceHover shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-white truncate">{p.name}</p>
                          <p className="text-[10px] text-mutedText mt-0.5">{p.category || '—'} · {p.primaryPosition || p.positions?.[0] || '—'}</p>
                        </div>
                      </div>
                    </td>
                    {STAT_FIELDS.map(f => (
                      <td key={f.key} className="px-2 py-3 text-center">
                        <input
                          type="number"
                          min="0"
                          value={draft[f.key] ?? 0}
                          onChange={e => updateDraft(id, f.key, e.target.value)}
                          className={`w-16 mx-auto px-2 py-2 rounded-xl bg-darkBg/70 border border-cardBorder text-center font-mono font-black text-base focus:outline-none focus:ring-1 focus:ring-neonGreen/50 ${f.cls}`}
                        />
                      </td>
                    ))}
                    <td className="py-3 pl-2 pr-4 text-right">
                      <button
                        type="button"
                        onClick={() => savePlayerStats(p)}
                        disabled={savingPlayerId === id}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-successGreen/20 border border-neonGreen/40 text-neonGreenHover hover:bg-successGreen/30 disabled:opacity-50 text-xs font-bold transition"
                      >
                        {savingPlayerId === id
                          ? <span className="block w-3.5 h-3.5 border-2 border-neonGreenHover border-t-transparent rounded-full animate-spin" />
                          : <Save className="w-3.5 h-3.5" />}
                        Save
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      <div className="px-4 py-3 text-[10px] font-bold text-mutedText uppercase tracking-widest border-t border-cardBorder/60 text-center">
        Showing {players.length} player{players.length !== 1 ? 's' : ''} · per-row save
      </div>
    </div>
  );
}
