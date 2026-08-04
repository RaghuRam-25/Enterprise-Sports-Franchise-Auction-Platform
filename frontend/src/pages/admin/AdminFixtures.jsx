import React, { useState, useEffect, useMemo } from 'react';
import {
    Calendar, Clock, MapPin, Plus, Trash2, Edit3, X, Save, Lock,
    Wand2, ListChecks, Shuffle, Trophy, Search, ChevronRight
} from 'lucide-react';
import { useAuction } from '../../context/AuctionContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const GENERATION_TYPES = [
    { key: 'round_robin', label: 'Round Robin', description: 'Every team plays every other team once.' },
    { key: 'knockout', label: 'Knockout', description: 'Single-elimination bracket — teams are paired off in order.' },
];

const formatDate = (dateString) => {
    if (!dateString) return 'Date TBD';
    const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
};

export default function AdminFixtures() {
    const {
        teams = [], triggerToast,
        // Optional — falls back gracefully if your AuctionContext doesn't expose these yet.
        eventPhase,
    } = useAuction();
    const { user } = useAuth();
    const isSuperAdmin = user?.role === 'SUPER_ADMIN';

    // Fixture management should only really matter once the auction is done —
    // fail-open (don't block) if eventPhase isn't wired up in context yet.
    const isTournamentPhase = !eventPhase || eventPhase === 'TOURNAMENT';

    const [mode, setMode] = useState('automatic'); // 'automatic' | 'manual'
    const [fixtures, setFixtures] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    // ── Automatic generation state ────────────────────────────────────────
    const [genType, setGenType] = useState('round_robin');
    const [generating, setGenerating] = useState(false);
    const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);

    // ── Manual creation form state ────────────────────────────────────────
    const [manualForm, setManualForm] = useState({ teamA: '', teamB: '', date: '', time: '', venue: '', round: '' });
    const [creating, setCreating] = useState(false);

    // ── Edit / delete state ───────────────────────────────────────────────
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

    useEffect(() => { loadFixtures(); }, []);

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

    // ── Automatic generation ─────────────────────────────────────────────
    const runGenerate = async () => {
        setShowRegenerateConfirm(false);
        if (teams.length < 2) {
            triggerToast('You need at least 2 teams to generate fixtures.', 'error');
            return;
        }
        setGenerating(true);
        try {
            // The backend does not currently have an automatic generation endpoint.
            triggerToast('Automatic fixture generation is not yet implemented on the backend.', 'warning');
        } catch (err) {
            // This block will likely not be reached unless the above line is changed.
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

    // ── Manual creation ──────────────────────────────────────────────────
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

    // ── Edit ──────────────────────────────────────────────────────────────
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

    // ── Delete ────────────────────────────────────────────────────────────
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
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center gap-3 text-amber-300 text-xs font-semibold">
                <Lock className="w-5 h-5 flex-shrink-0 text-amber-400" />
                <p>Fixtures & Scheduling is restricted to Super Admin.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <span className="text-xs font-bold uppercase tracking-widest text-blue-400">Tournament Management</span>
                    <h1 className="text-2xl font-black font-heading text-white">Fixtures & Scheduling</h1>
                    <p className="text-xs text-slate-400 mt-0.5">Decide which team plays which, and when.</p>
                </div>
                {teams.length > 0 && (
                    <div className="relative sm:w-56">
                        <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
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
                <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center gap-3 text-rose-300 text-xs font-semibold">
                    <Lock className="w-5 h-5 flex-shrink-0 text-rose-400" />
                    <div>
                        <p className="font-bold">Fixtures Locked</p>
                        <p className="text-[11px] text-rose-400/80 font-normal">
                            Scheduling normally opens once the auction concludes and the event enters the TOURNAMENT phase. Current phase: {eventPhase}.
                        </p>
                    </div>
                </div>
            )}

            {teams.length < 2 && (
                <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl text-xs text-slate-400">
                    You need at least 2 franchise teams before you can schedule fixtures.
                </div>
            )}

            {/* Mode toggle */}
            <div className={`glass-card rounded-2xl p-6 border border-slate-800 space-y-5 ${!isTournamentPhase ? 'opacity-60 pointer-events-none' : ''}`}>
                <div className="flex gap-2">
                    {[
                        { key: 'automatic', label: 'Automatic', icon: Wand2 },
                        { key: 'manual', label: 'Manual', icon: ListChecks },
                    ].map(({ key, label, icon: Icon }) => (
                        <button
                            key={key}
                            onClick={() => setMode(key)}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition ${mode === key
                                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 border-blue-500 text-white shadow-md shadow-blue-900/40'
                                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
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
                                            ? 'bg-blue-500/10 border-blue-500/50'
                                            : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                                        }`}
                                >
                                    <p className={`text-sm font-bold flex items-center gap-1.5 ${genType === key ? 'text-blue-300' : 'text-slate-200'}`}>
                                        <Shuffle className="w-3.5 h-3.5" /> {label}
                                    </p>
                                    <p className="text-[11px] text-slate-500 mt-1">{description}</p>
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={handleGenerateClick}
                            disabled={generating || teams.length < 2}
                            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition"
                        >
                            <Wand2 className="w-4 h-4" />
                            {generating ? 'Generating...' : fixtures.length > 0 ? 'Regenerate Fixtures' : 'Generate Fixtures'}
                        </button>
                        {fixtures.length > 0 && (
                            <p className="text-[11px] text-amber-400/80">Regenerating will replace all existing fixtures.</p>
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
                            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition"
                        >
                            <Plus className="w-4 h-4" /> {creating ? 'Adding...' : 'Add Fixture'}
                        </button>
                    </form>
                )}
            </div>

            {/* Fixture list */}
            {loading ? (
                <div className="glass-card rounded-2xl p-10 text-center text-slate-500 border border-slate-800">Loading fixtures...</div>
            ) : fixtures.length === 0 ? (
                <div className="glass-card rounded-2xl p-10 text-center text-slate-500 border border-slate-800 space-y-1">
                    <Trophy className="w-8 h-8 mx-auto text-slate-700" />
                    <p className="font-bold text-slate-400">No fixtures scheduled yet</p>
                    <p className="text-xs">Generate them automatically or add one manually above.</p>
                </div>
            ) : filteredFixtures.length === 0 ? (
                <div className="glass-card rounded-2xl p-10 text-center text-slate-500 border border-slate-800">
                    No fixtures match "{search}"
                </div>
            ) : (
                <div className="space-y-6">
                    {Object.entries(groupedByDate).map(([date, dateFixtures]) => (
                        <div key={date} className="space-y-3">
                            <div className="flex items-center gap-3">
                                <Calendar className="w-4 h-4 text-blue-400" />
                                <h2 className="text-sm font-bold text-white">{date}</h2>
                                <div className="flex-grow h-px bg-slate-800" />
                            </div>
                            <div className="space-y-2">
                                {dateFixtures.map(f => {
                                    const id = f._id || f.id;
                                    const isDeleting = deletingId === id;
                                    return (
                                        <div key={id} className="glass-card rounded-xl border border-slate-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group">
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                {f.round && (
                                                    <span className="hidden sm:inline-block text-[10px] font-bold uppercase tracking-wider text-purple-300 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full flex-shrink-0">
                                                        {f.round}
                                                    </span>
                                                )}
                                                <span className="font-bold text-white text-sm truncate">{teamName(f.teamA)}</span>
                                                <ChevronRight className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
                                                <span className="font-bold text-white text-sm truncate">{teamName(f.teamB)}</span>
                                            </div>
                                            <div className="flex items-center gap-4 text-[11px] text-slate-400 flex-shrink-0">
                                                {f.matchTime && (
                                                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {f.matchTime}</span>
                                                )}
                                                {f.venue && (
                                                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {f.venue}</span>
                                                )}
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => openEdit(f)} className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition">
                                                        <Edit3 className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => setDeleteTarget({ id, label: `${teamName(f.teamA)} vs ${teamName(f.teamB)}` })}
                                                        disabled={isDeleting}
                                                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition disabled:opacity-50"
                                                    >
                                                        {isDeleting
                                                            ? <span className="w-3.5 h-3.5 border-2 border-rose-400 border-t-transparent rounded-full animate-spin block" />
                                                            : <Trash2 className="w-3.5 h-3.5" />}
                                                    </button>
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
                    <div className="glass-card w-full max-w-sm rounded-2xl p-6 border border-amber-500/30 space-y-5 shadow-2xl">
                        <h2 className="text-base font-black text-white">Replace existing fixtures?</h2>
                        <p className="text-sm text-slate-300">This will regenerate the schedule and remove all {fixtures.length} current fixtures. This cannot be undone.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowRegenerateConfirm(false)} className="flex-1 py-2.5 border border-slate-700 text-slate-300 hover:bg-slate-800 rounded-xl text-xs font-semibold transition">
                                Cancel
                            </button>
                            <button onClick={runGenerate} className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition">
                                Yes, Regenerate
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit modal */}
            {editingFixture && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="glass-card w-full max-w-md rounded-2xl p-6 border border-slate-700 space-y-5 shadow-2xl">
                        <div className="flex justify-between items-center">
                            <h2 className="text-lg font-black text-white">Edit Fixture</h2>
                            <button onClick={() => setEditingFixture(null)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition">
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
                            <button onClick={() => setEditingFixture(null)} className="flex-1 py-2.5 border border-slate-700 text-slate-300 hover:bg-slate-800 rounded-xl text-xs font-semibold transition">
                                Cancel
                            </button>
                            <button onClick={handleSaveEdit} disabled={saving} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition">
                                {saving ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete confirm */}
            {deleteTarget && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="glass-card w-full max-w-sm rounded-2xl p-6 border border-rose-500/30 space-y-5 shadow-2xl">
                        <h2 className="text-base font-black text-white">Remove this fixture?</h2>
                        <p className="text-sm text-slate-300">
                            <span className="font-bold text-white">{deleteTarget.label}</span> will be removed from the schedule.
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 border border-slate-700 text-slate-300 hover:bg-slate-800 rounded-xl text-xs font-semibold transition">
                                Cancel
                            </button>
                            <button onClick={executeDelete} className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition">
                                <Trash2 className="w-3.5 h-3.5" /> Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}