import React, { useState, useEffect, useMemo } from 'react';
import {
    Calendar, Clock, MapPin, Plus, Trash2, Edit3, X, Save, Lock,
    Wand2, ListChecks, Shuffle, Trophy, Search, ChevronRight, Shield
} from 'lucide-react';
import { useAuction } from '../../context/AuctionContext';
import { useAuth } from '../../context/AuthContext';
import TeamBadge from '../../components/common/TeamBadge';
import api from '../../services/api';

const GENERATION_TYPES = [
    { key: 'round_robin', label: 'Round Robin' },
    { key: 'knockout', label: 'Knockout' },
];

const formatDate = (dateString) => {
    if (!dateString) return 'Date TBD';
    const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
};

/* ---------------------------------------------------------
   Distinct per-team color themes — identical palette/hash
   logic used on the Public Teams and Admin Teams pages, so
   a given team's color stays consistent everywhere.
---------------------------------------------------------- */
const TEAM_THEMES = [
    { name: 'crimson',  bgGradient: 'from-[#FF5C5C] to-[#FF5C5C]',   borderColor: 'border-[#FF5C5C]/50',    badgeBg: 'bg-[#FF5C5C]/15 text-[#FF5C5C] border-[#FF5C5C]/30',       stat: 'text-[#FF5C5C]' },
    { name: 'amber',    bgGradient: 'from-warningGold to-warningGold', borderColor: 'border-warningGold/50', badgeBg: 'bg-warningGold/15 text-warningGold border-warningGold/30', stat: 'text-warningGold' },
    { name: 'emerald',  bgGradient: 'from-neonGreen to-neonGreen',     borderColor: 'border-neonGreen/50',   badgeBg: 'bg-neonGreen/15 text-white border-neonGreen/30',  stat: 'text-white' },
    { name: 'sky',      bgGradient: 'from-[#0B2B26] to-[#0B2B26]',     borderColor: 'border-[#0B2B26]/60',   badgeBg: 'bg-[#0B2B26]/25 text-white border-[#0B2B26]/60',           stat: 'text-white' },
    { name: 'violet',   bgGradient: 'from-[#A78BFA] to-[#A78BFA]',     borderColor: 'border-[#A78BFA]/50',   badgeBg: 'bg-[#A78BFA]/15 text-[#A78BFA] border-[#A78BFA]/30',       stat: 'text-[#A78BFA]' },
    { name: 'fuchsia',  bgGradient: 'from-[#E879F9] to-[#E879F9]',     borderColor: 'border-[#E879F9]/50',   badgeBg: 'bg-[#E879F9]/15 text-[#E879F9] border-[#E879F9]/30',       stat: 'text-[#E879F9]' },
    { name: 'teal',     bgGradient: 'from-[#0B2B26] to-[#0B2B26]',     borderColor: 'border-[#0B2B26]/60',   badgeBg: 'bg-[#0B2B26]/25 text-white border-[#0B2B26]/60',           stat: 'text-white' },
    { name: 'orange',   bgGradient: 'from-[#FB923C] to-[#FB923C]',     borderColor: 'border-[#FB923C]/50',   badgeBg: 'bg-[#FB923C]/15 text-[#FB923C] border-[#FB923C]/30',       stat: 'text-[#FB923C]' },
    { name: 'indigo',   bgGradient: 'from-[#818CF8] to-[#818CF8]',     borderColor: 'border-[#818CF8]/50',   badgeBg: 'bg-[#818CF8]/15 text-[#818CF8] border-[#818CF8]/30',       stat: 'text-[#818CF8]' },
    { name: 'lime',     bgGradient: 'from-neonGreenHover to-neonGreenHover', borderColor: 'border-neonGreenHover/50', badgeBg: 'bg-neonGreenHover/15 text-white border-neonGreenHover/30', stat: 'text-white' },
];

function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash);
}

// Accepts either a full team object ({_id, name, ...}) or just a name string,
// since fixture cards sometimes only have team names on hand.
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

export default function AdminFixtures() {
    const {
        teams = [], refetchTeams, triggerToast,
        eventPhase,
    } = useAuction();
    const { user } = useAuth();
    const isSuperAdmin = user?.role === 'SUPER_ADMIN';

    const isTournamentPhase = !eventPhase || eventPhase === 'TOURNAMENT';

    const [mode, setMode] = useState('automatic');
    const [fixtures, setFixtures] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const [genType, setGenType] = useState('round_robin');
    const [generating, setGenerating] = useState(false);
    const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);

    const [manualForm, setManualForm] = useState({ teamA: '', teamB: '', date: '', time: '', venue: '', round: '' });
    const [creating, setCreating] = useState(false);

    const [editingFixture, setEditingFixture] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [saving, setSaving] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deletingId, setDeletingId] = useState(null);

    const loadFixtures = async () => {
        setLoading(true);
        try {
            const res = await api.get('/matches');
            const data = res?.data?.data || res?.data || [];
            setFixtures(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to load fixtures:', err);
            triggerToast('Could not load fixtures.', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadFixtures();
        if (typeof refetchTeams === 'function') refetchTeams();
    }, []);

    const teamName = (idOrTeam) => {
        if (!idOrTeam) return 'TBD';
        if (typeof idOrTeam === 'object') return idOrTeam.name || idOrTeam.shortCode || 'TBD';
        const t = teams.find(t => (t._id || t.id) === idOrTeam);
        return t?.name || 'TBD';
    };

    const filteredFixtures = useMemo(() => {
        if (!search.trim()) return fixtures;
        const q = search.trim().toLowerCase();
        return fixtures.filter(f =>
            teamName(f.teamA).toLowerCase().includes(q) ||
            teamName(f.teamB).toLowerCase().includes(q)
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fixtures, search, teams]);

    const groupedByDate = useMemo(() => {
        return filteredFixtures.reduce((acc, f) => {
            const key = f.matchDate ? formatDate(f.matchDate) : 'Date To Be Announced';
            if (!acc[key]) acc[key] = [];
            acc[key].push(f);
            return acc;
        }, {});
    }, [filteredFixtures]);

    const runGenerate = async () => {
        setShowRegenerateConfirm(false);
        if (teams.length < 2) {
            triggerToast('You need at least 2 teams to generate fixtures.', 'error');
            return;
        }
        setGenerating(true);
        try {
            triggerToast('Automatic fixture generation is not yet implemented on the backend.', 'warning');
        } catch (err) {
            triggerToast(err?.response?.data?.message || 'Failed to generate fixtures.', 'error');
        } finally {
            setGenerating(false);
        }
    };

    const handleGenerateClick = () => {
        if (fixtures.length > 0) {
            setShowRegenerateConfirm(true);
        } else {
            runGenerate();
        }
    };

    const handleManualSubmit = async (e) => {
        e.preventDefault();
        if (!manualForm.teamA || !manualForm.teamB) {
            triggerToast('Select both teams.', 'error');
            return;
        }
        if (manualForm.teamA === manualForm.teamB) {
            triggerToast('A team cannot play itself.', 'error');
            return;
        }
        setCreating(true);
        try {
            const res = await api.post('/matches', {
                teamA: manualForm.teamA,
                teamB: manualForm.teamB,
                matchDate: manualForm.date || null,
                matchTime: manualForm.time || null,
                venue: manualForm.venue || null,
                round: manualForm.round || null,
                status: 'Upcoming',
            });
            const newFixture = res?.data?.data || res?.data;
            if (newFixture) setFixtures(prev => [...prev, newFixture]);
            triggerToast('Fixture added.', 'success');
            setManualForm({ teamA: '', teamB: '', date: '', time: '', venue: '', round: '' });
        } catch (err) {
            triggerToast(err?.response?.data?.message || 'Failed to add fixture.', 'error');
        } finally {
            setCreating(false);
        }
    };

    const openEdit = (fixture) => {
        setEditingFixture(fixture);
        setEditForm({
            teamA: fixture.teamA?._id || fixture.teamA || '',
            teamB: fixture.teamB?._id || fixture.teamB || '',
            date: fixture.matchDate ? fixture.matchDate.slice(0, 10) : '',
            time: fixture.matchTime || '',
            venue: fixture.venue || '',
            round: fixture.round || '',
        });
    };

    const handleSaveEdit = async () => {
        if (!editingFixture) return;
        if (editForm.teamA === editForm.teamB) {
            triggerToast('A team cannot play itself.', 'error');
            return;
        }
        setSaving(true);
        const id = editingFixture._id || editingFixture.id;
        try {
            const res = await api.put(`/matches/${id}`, {
                teamA: editForm.teamA,
                teamB: editForm.teamB,
                matchDate: editForm.date || null,
                matchTime: editForm.time || null,
                venue: editForm.venue || null,
                round: editForm.round || null,
            });
            const updated = res?.data?.data || res?.data;
            setFixtures(prev => prev.map(f => (f._id || f.id) === id ? { ...f, ...updated } : f));
            triggerToast('Fixture updated.', 'success');
            setEditingFixture(null);
        } catch (err) {
            triggerToast(err?.response?.data?.message || 'Failed to update fixture.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const executeDelete = async () => {
        if (!deleteTarget) return;
        setDeletingId(deleteTarget.id);
        try {
            await api.delete(`/matches/${deleteTarget.id}`);
            setFixtures(prev => prev.filter(f => (f._id || f.id) !== deleteTarget.id));
            triggerToast('Fixture removed.', 'warning');
        } catch (err) {
            triggerToast(err?.response?.data?.message || 'Failed to delete fixture.', 'error');
        } finally {
            setDeletingId(null);
            setDeleteTarget(null);
        }
    };

    if (!isSuperAdmin) {
        return (
            <div className="p-4 bg-warningGold/10 border border-warningGold/30 rounded-2xl flex items-center gap-3 text-warningGold text-xs font-semibold">
                <Lock className="w-5 h-5 flex-shrink-0 text-warningGold" />
                <p>Fixtures & Scheduling is restricted to Super Admin.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <span className="text-xs font-bold uppercase tracking-widest text-white">Tournament Management</span>
                    <h1 className="text-2xl font-black font-heading text-white">Fixtures & Scheduling</h1>
                    <p className="text-xs text-secondaryText mt-0.5">Decide which team plays which, and when.</p>
                </div>
                {teams.length > 0 && (
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
                )}
            </div>

            {!isTournamentPhase && (
                <div className="p-4 bg-urgentRed/10 border border-urgentRed/30 rounded-2xl flex items-center gap-3 text-urgentRedText text-xs font-semibold">
                    <Lock className="w-5 h-5 flex-shrink-0 text-urgentRedText" />
                    <div>
                        <p className="font-bold">Fixtures Locked</p>
                        <p className="text-[11px] text-urgentRedText/80 font-normal">
                            Scheduling normally opens once the auction concludes and the event enters the TOURNAMENT phase. Current phase: {eventPhase}.
                        </p>
                    </div>
                </div>
            )}

            {teams.length < 2 && (
                <div className="p-4 bg-cardBg/60 border border-cardBorder rounded-2xl text-xs text-secondaryText">
                    You need at least 2 franchise teams before you can schedule fixtures.
                </div>
            )}            {/* Mode toggle */}
            <div className={`glass-card rounded-2xl p-6 border border-cardBorder space-y-5 ${!isTournamentPhase ? 'opacity-60 pointer-events-none' : ''}`}>
                <div className="flex gap-2">
                    {[
                        { key: 'automatic', label: 'Automatic', icon: Wand2 },
                        { key: 'manual', label: 'Manual', icon: ListChecks },
                    ].map(({ key, label, icon: Icon }) => (
                        <button
                            key={key}
                            onClick={() => setMode(key)}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition ${mode === key
                                    ? 'bg-[#0B2B26] border-[#0B2B26] text-white shadow-md font-black'
                                    : 'btn-secondary'
                                }`}
                        >
                            <Icon className="w-3.5 h-3.5" /> {label}
                        </button>
                    ))}
                </div>

                {mode === 'automatic' ? (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {GENERATION_TYPES.map(({ key, label, description }) => (
                                <button
                                    key={key}
                                    onClick={() => setGenType(key)}
                                    className={`text-left p-4 rounded-xl border transition ${genType === key
                                            ? 'bg-neonGreen/10 border-neonGreen/50'
                                            : 'bg-[#151515] border-[#333333] hover:border-neonGreen/40'
                                        }`}
                                >
                                    <p className={`text-sm font-bold flex items-center gap-1.5 ${genType === key ? 'text-white' : 'text-primaryText'}`}>
                                        <Shuffle className="w-3.5 h-3.5" /> {label}
                                    </p>
                                    <p className="text-[11px] text-mutedText mt-1">{description}</p>
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={handleGenerateClick}
                            disabled={generating || teams.length < 2}
                            className="btn-primary px-6 h-[40px] text-xs shadow-xl flex items-center gap-2 disabled:opacity-50"
                        >
                            <Wand2 className="w-4 h-4" />
                            {generating ? 'Generating...' : fixtures.length > 0 ? 'Regenerate Fixtures' : 'Generate Fixtures'}
                        </button>
                        {fixtures.length > 0 && (
                            <p className="text-[11px] text-warningGold/80"></p>
                        )}
                    </div>
                ) : (
                    <form onSubmit={handleManualSubmit} className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <select
                                value={manualForm.teamA}
                                onChange={e => setManualForm(prev => ({ ...prev, teamA: e.target.value }))}
                                className="glass-input rounded-xl px-4 py-2 text-xs"
                                required
                            >
                                <option value="">Team A*</option>
                                {teams.map(t => <option key={t._id || t.id} value={t._id || t.id}>{t.name}</option>)}
                            </select>
                            <select
                                value={manualForm.teamB}
                                onChange={e => setManualForm(prev => ({ ...prev, teamB: e.target.value }))}
                                className="glass-input rounded-xl px-4 py-2 text-xs"
                                required
                            >
                                <option value="">Team B*</option>
                                {teams.filter(t => (t._id || t.id) !== manualForm.teamA).map(t => (
                                    <option key={t._id || t.id} value={t._id || t.id}>{t.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <input
                                type="date"
                                value={manualForm.date}
                                onChange={e => setManualForm(prev => ({ ...prev, date: e.target.value }))}
                                className="glass-input rounded-xl px-4 py-2 text-xs"
                            />
                            <input
                                type="time"
                                value={manualForm.time}
                                onChange={e => setManualForm(prev => ({ ...prev, time: e.target.value }))}
                                className="glass-input rounded-xl px-4 py-2 text-xs"
                            />
                            <input
                                type="text"
                                placeholder="Venue"
                                value={manualForm.venue}
                                onChange={e => setManualForm(prev => ({ ...prev, venue: e.target.value }))}
                                className="glass-input rounded-xl px-4 py-2 text-xs"
                            />
                            <input
                                type="text"
                                placeholder="Round (e.g. Semi-Final)"
                                value={manualForm.round}
                                onChange={e => setManualForm(prev => ({ ...prev, round: e.target.value }))}
                                className="glass-input rounded-xl px-4 py-2 text-xs"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={creating}
                            className="btn-primary px-6 h-[40px] text-xs shadow-xl flex items-center gap-2 disabled:opacity-50"
                        >
                            <Plus className="w-4 h-4" /> {creating ? 'Adding...' : 'Add Fixture'}
                        </button>
                    </form>
                )}
            </div>

            {/* Fixture list */}
            {loading ? (
                <div className="glass-card rounded-2xl p-10 text-center text-mutedText border border-cardBorder">Loading fixtures...</div>
            ) : fixtures.length === 0 ? (
                <div className="glass-card rounded-2xl p-10 text-center text-mutedText border border-cardBorder space-y-1">
                    <Trophy className="w-8 h-8 mx-auto text-mutedText" />
                    <p className="font-bold text-secondaryText">No fixtures scheduled yet</p>
                    <p className="text-xs">Generate them automatically or add one manually above.</p>
                </div>
            ) : filteredFixtures.length === 0 ? (
                <div className="glass-card rounded-2xl p-10 text-center text-mutedText border border-cardBorder">
                    No fixtures match "{search}"
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                    {Object.entries(groupedByDate).map(([date, dateFixtures]) => (
                        <div key={date} className="space-y-4 bg-cardBg/40 border border-cardBorder/80 p-5 rounded-3xl backdrop-blur-md">
                            <div className="flex items-center gap-2.5 pb-2 border-b border-cardBorder">
                                <div className="p-1.5 rounded-lg bg-neonGreen/10 border border-neonGreen/20 text-white">
                                    <Calendar className="w-4 h-4" />
                                </div>
                                <h2 className="text-sm font-bold text-white tracking-wide">{date}</h2>
                            </div>

                            <div className="space-y-4">
                                {dateFixtures.map(f => {
                                    const id = f._id || f.id;
                                    const isDeleting = deletingId === id;
                                    const teamAName = f.teamAName || teamName(f.teamA);
                                    const teamBName = f.teamBName || teamName(f.teamB);
                                    const teamALogo = f.teamALogo || f.teamA?.logoUrl || f.teamA?.logo || '';
                                    const teamBLogo = f.teamBLogo || f.teamB?.logoUrl || f.teamB?.logo || '';

                                    // Prefer the real team record from database/context so logo, icon, shortCode and themes match Team Management 100%
                                    const teamARecord = (typeof f.teamA === 'object' && f.teamA?._id ? f.teamA : null) ||
                                        teams.find(t => String(t._id || t.id) === String(f.teamA?._id || f.teamA) || (t.name && t.name.toLowerCase() === teamAName.toLowerCase())) ||
                                        { name: teamAName, logoUrl: teamALogo };
                                    const teamBRecord = (typeof f.teamB === 'object' && f.teamB?._id ? f.teamB : null) ||
                                        teams.find(t => String(t._id || t.id) === String(f.teamB?._id || f.teamB) || (t.name && t.name.toLowerCase() === teamBName.toLowerCase())) ||
                                        { name: teamBName, logoUrl: teamBLogo };

                                    const themeA = getTeamTheme(teamARecord);
                                    const themeB = getTeamTheme(teamBRecord);

                                    return (
                                        <div 
                                            key={id} 
                                            className="group relative rounded-2xl border border-cardBorder/90 bg-gradient-to-br from-cardBg/90 via-darkBg/95 to-cardBg/90 p-3.5 overflow-hidden transition-all duration-300 hover:border-neonGreen/40 hover:shadow-xl shadow-black/40"
                                        >
                                            {/* Top row with round & admin quick actions */}
                                            <div className="flex items-center justify-between pb-2 mb-1.5 border-b border-white/[0.06]">
                                                <span className="text-[9px] font-bold uppercase tracking-wider text-warningGold bg-warningGold/10 border border-warningGold/20 px-2 py-0.5 rounded-full">
                                                    {f.round || 'Group Stage'}
                                                </span>
                                                <div className="flex items-center gap-1">
                                                    <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                                        f.status === 'Live' ? 'bg-urgentRed/20 text-urgentRedText border-urgentRed/40 animate-pulse' :
                                                        f.status === 'Finished' ? 'bg-surfaceHover text-secondaryText border-borderStrong' :
                                                        'bg-neonGreen/15 text-white border-neonGreen/30'
                                                    }`}>
                                                        {f.status || 'Upcoming'}
                                                    </span>
                                                    <button onClick={() => openEdit(f)} className="p-1 text-secondaryText hover:text-white hover:bg-neonGreen/10 rounded-lg transition" title="Edit Match">
                                                        <Edit3 className="w-3 h-3" />
                                                    </button>
                                                    <button
                                                        onClick={() => setDeleteTarget({ id, label: `${teamAName} vs ${teamBName}` })}
                                                        disabled={isDeleting}
                                                        className="p-1 text-secondaryText hover:text-urgentRedText hover:bg-urgentRed/10 rounded-lg transition disabled:opacity-50"
                                                        title="Delete Match"
                                                    >
                                                        {isDeleting
                                                            ? <span className="w-3 h-3 border-2 border-urgentRed border-t-transparent rounded-full animate-spin block" />
                                                            : <Trash2 className="w-3 h-3" />}
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Match Teams Box */}
                                            <div className="flex items-center justify-between gap-3 py-2">
                                                {/* Team A */}
                                                <div className="flex-1 min-w-0 flex justify-start">
                                                    <TeamBadge team={teamARecord} size="sm" showManager={false} />
                                                </div>

                                                {/* VS or Score */}
                                                <div className="flex flex-col items-center justify-center px-2 shrink-0">
                                                    {f.status === 'Finished' || (f.status === 'Live' && (f.scoreA || f.scoreB)) ? (
                                                        <div className="flex items-center gap-1.5 text-base font-black font-mono text-white">
                                                            <span>{f.scoreA || 0}</span>
                                                            <span className="text-mutedText">:</span>
                                                            <span>{f.scoreB || 0}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-sm font-black tracking-widest text-secondaryText px-2 py-0.5 rounded-md bg-cardBg/80 border border-cardBorder">VS</span>
                                                    )}
                                                </div>

                                                {/* Team B */}
                                                <div className="flex-1 min-w-0 flex justify-end">
                                                    <TeamBadge team={teamBRecord} size="sm" showManager={false} />
                                                </div>
                                            </div>

                                            {/* Bottom Info: Time & Venue */}
                                            <div className="flex items-center justify-between pt-2 border-t border-white/[0.06] text-[11px] text-secondaryText">
                                                <div className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3 text-white shrink-0" />
                                                    <span className="font-semibold truncate">{f.matchTime || 'TBD'}</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <MapPin className="w-3 h-3 text-urgentRedText shrink-0" />
                                                    <span className="font-semibold truncate">{f.venue || 'TBD'}</span>
                                                </div>
                                            </div>

                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Regenerate confirm */}
            {showRegenerateConfirm && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="glass-card w-full max-w-sm rounded-2xl p-6 border border-warningGold/30 space-y-5 shadow-2xl">
                        <h2 className="text-base font-black text-white">Replace existing fixtures?</h2>
                        <p className="text-sm text-secondaryText">This will regenerate the schedule and remove all {fixtures.length} current fixtures. This cannot be undone.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowRegenerateConfirm(false)} className="btn-secondary flex-1 py-2.5 rounded-xl text-xs">
                                Cancel
                            </button>
                            <button onClick={runGenerate} className="btn-primary flex-1 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2">
                                <Wand2 className="w-3.5 h-3.5" /> Yes, Regenerate
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit modal */}
            {editingFixture && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="glass-card w-full max-w-md rounded-2xl p-6 border border-borderStrong space-y-5 shadow-2xl">
                        <div className="flex justify-between items-center">
                            <h2 className="text-lg font-black text-white">Edit Fixture</h2>
                            <button onClick={() => setEditingFixture(null)} className="p-2 text-secondaryText hover:text-white hover:bg-surfaceHover rounded-lg transition">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <select value={editForm.teamA} onChange={e => setEditForm(prev => ({ ...prev, teamA: e.target.value }))} className="glass-input px-3 py-2 rounded-xl text-xs">
                                    {teams.map(t => <option key={t._id || t.id} value={t._id || t.id}>{t.name}</option>)}
                                </select>
                                <select value={editForm.teamB} onChange={e => setEditForm(prev => ({ ...prev, teamB: e.target.value }))} className="glass-input px-3 py-2 rounded-xl text-xs">
                                    {teams.map(t => <option key={t._id || t.id} value={t._id || t.id}>{t.name}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <input type="date" value={editForm.date} onChange={e => setEditForm(prev => ({ ...prev, date: e.target.value }))} className="glass-input px-3 py-2 rounded-xl text-xs" />
                                <input type="time" value={editForm.time} onChange={e => setEditForm(prev => ({ ...prev, time: e.target.value }))} className="glass-input px-3 py-2 rounded-xl text-xs" />
                            </div>
                            <input type="text" placeholder="Venue" value={editForm.venue} onChange={e => setEditForm(prev => ({ ...prev, venue: e.target.value }))} className="glass-input w-full px-3 py-2 rounded-xl text-xs" />
                            <input type="text" placeholder="Round" value={editForm.round} onChange={e => setEditForm(prev => ({ ...prev, round: e.target.value }))} className="glass-input w-full px-3 py-2 rounded-xl text-xs" />
                        </div>
                        <div className="flex gap-3 pt-1">
                            <button onClick={() => setEditingFixture(null)} className="btn-secondary flex-1 py-2.5 rounded-xl text-xs">
                                Cancel
                            </button>
                            <button onClick={handleSaveEdit} disabled={saving} className="btn-primary flex-1 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 disabled:opacity-50">
                                {saving ? <span className="w-3.5 h-3.5 border-2 border-[#050505] border-t-transparent rounded-full animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete confirm */}
            {deleteTarget && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="glass-card w-full max-w-sm rounded-2xl p-6 border border-urgentRed/30 space-y-5 shadow-2xl">
                        <h2 className="text-base font-black text-white">Remove this fixture?</h2>
                        <p className="text-sm text-secondaryText">
                            <span className="font-bold text-white">{deleteTarget.label}</span> will be removed from the schedule.
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteTarget(null)} className="btn-secondary flex-1 py-2.5 rounded-xl text-xs">
                                Cancel
                            </button>
                            <button onClick={executeDelete} className="btn-danger flex-1 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2">
                                <Trash2 className="w-3.5 h-3.5" /> Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
