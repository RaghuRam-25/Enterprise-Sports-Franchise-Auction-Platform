import { useState, useEffect, useMemo } from 'react';
import {
  Shield, Search, RefreshCw, Trophy, Users, DollarSign,
  ChevronLeft, ChevronRight, UserCheck, AlertCircle, X, ExternalLink
} from 'lucide-react';
import Navbar from '../../components/Navbar';
import TeamBadge from '../../components/common/TeamBadge';
import { getTeamAvatarConfig, getTeamTheme } from '../../utils/themeConfig';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import io from 'socket.io-client';




export default function PublicTeamsView() {
  const { user } = useAuth();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedTeam, setSelectedTeam] = useState(null);

  const ITEMS_PER_PAGE = 6;

  const fetchTeams = async ({ silent = false } = {}) => {
    try {
      if (silent) setRefreshing(true); else setLoading(true);
      const res = await api.get('/config/teams');
      const teamData = res?.data?.data || res?.data || [];
      if (Array.isArray(teamData)) {
        setTeams(teamData);
        setError('');
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('Failed to load teams:', err);
      setError('Failed to load franchises. Please check connection and try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTeams();

    const socket = io(import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000');

    socket.on('teams:created', (newTeam) => {
      if (!newTeam) return;
      setTeams(prev => [newTeam, ...prev.filter(t => (t._id || t.id) !== (newTeam._id || newTeam.id))]);
    });

    socket.on('teams:updated', (updated) => {
      if (!updated) return;
      setTeams(prev => prev.map(t => (t._id || t.id) === (updated._id || updated.id) ? { ...t, ...updated } : t));
    });

    socket.on('teams:deleted', (deleted) => {
      if (!deleted?.id) return;
      setTeams(prev => prev.filter(t => (t._id || t.id) !== deleted.id));
    });

    return () => socket.disconnect();
  }, []);

  const processedTeams = useMemo(() => {
    let result = [...teams];

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(t =>
        (t.name || '').toLowerCase().includes(q) ||
        (t.shortCode || t.code || '').toLowerCase().includes(q) ||
        (t.ownerName || t.managerId?.name || '').toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'purse') return (b.remainingBudget || 0) - (a.remainingBudget || 0);
      if (sortBy === 'roster') {
        const rA = a.currentRosterCount ?? (a.currentRoster?.length || 0);
        const rB = b.currentRosterCount ?? (b.currentRoster?.length || 0);
        return rB - rA;
      }
      if (sortBy === 'date') return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      return 0;
    });

    return result;
  }, [teams, search, sortBy]);

  const totalPages = Math.max(1, Math.ceil(processedTeams.length / ITEMS_PER_PAGE));
  const paginatedTeams = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return processedTeams.slice(start, start + ITEMS_PER_PAGE);
  }, [processedTeams, currentPage]);

  const formatCurrency = (val) => {
    if (val == null || isNaN(val)) return '0 BDT';
    return `${Number(val).toLocaleString('en-IN')} BDT`;
  };

  return (
    <div className="min-h-screen flex flex-col bg-darkBg text-slate-100">
      {!user && <Navbar />}

      <main className={`flex-1 space-y-8 ${!user
        ? 'max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8'
        : ''
        }`}>

        <div className="relative text-center py-0.5 space-y-1">
          <div
            className="absolute inset-x-0 top-0 h-24 -z-10 opacity-50 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse at center, rgba(59,130,246,0.12) 0%, transparent 70%)",
            }}
          />
          <Shield className="w-10 h-10 mx-auto text-blue-400 bg-blue-500/10 p-2 rounded-xl border border-blue-500/20 shadow-md shadow-blue-500/10" />
          <h1 className="text-2xl sm:text-3xl font-black font-heading bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent uppercase tracking-wide">All Franchises</h1>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Official league franchises competing in the auction platform.
          </p>
        </div>

        <div className="sticky top-2 z-20 flex flex-col sm:flex-row gap-3 sm:items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/80 backdrop-blur-xl px-4 py-3 shadow-xl">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
              placeholder="Search team name, code or manager..."
              className="glass-input w-full pl-10 pr-4 py-2 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Sort:</span>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="glass-input rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                <option value="name">Name (A-Z)</option>
                <option value="purse">Purse Remaining</option>
                <option value="roster">Squad Size</option>
                <option value="date">Newly Added</option>
              </select>
            </div>

            <button
              onClick={() => fetchTeams({ silent: true })}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition"
              title="Refresh Team List"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-6 space-y-4 animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-800" />
                    <div className="space-y-1.5">
                      <div className="w-24 h-4 rounded bg-slate-800" />
                      <div className="w-16 h-3 rounded bg-slate-900" />
                    </div>
                  </div>
                </div>
                <div className="h-16 rounded-xl bg-slate-900" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="glass-card rounded-2xl p-8 text-center text-rose-400 border border-rose-500/30 max-w-md mx-auto space-y-3">
            <AlertCircle className="w-10 h-10 mx-auto text-rose-400" />
            <p className="font-bold">{error}</p>
            <button
              onClick={() => fetchTeams()}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition"
            >
              Retry Loading
            </button>
          </div>
        ) : teams.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 text-center text-slate-500 border border-slate-800 max-w-md mx-auto space-y-3">
            <Shield className="w-12 h-12 mx-auto text-slate-600" />
            <p className="font-bold text-base text-slate-300">No Teams Found</p>
            <p className="text-xs">No franchises have been registered in the system yet.</p>
          </div>
        ) : processedTeams.length === 0 ? (
          <div className="glass-card rounded-2xl p-10 text-center text-slate-500 border border-slate-800 max-w-md mx-auto space-y-3">
            <Search className="w-10 h-10 mx-auto text-slate-600" />
            <p className="font-bold text-slate-300">No teams match your search</p>
            <button
              onClick={() => setSearch('')}
              className="text-xs text-blue-400 hover:underline font-semibold"
            >
              Clear Search Query
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedTeams.map(team => {
                const id = team._id || team.id;
                const avatarConfig = getTeamAvatarConfig(team);
                const theme = getTeamTheme(team);
                const rosterCount = team.currentRosterCount ?? (team.currentRoster?.length || 0);
                const managerName = team.managerId?.name || team.ownerName || 'Unassigned';

                return (
                  <div
                    key={id}
                    onClick={() => setSelectedTeam(team)}
                    style={{ ...(theme.customStyle || {}), ...(theme.customBorderStyle || {}) }}
                    className={`group relative overflow-hidden rounded-2xl cursor-pointer transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl ${theme.ring} ${theme.customStyle ? '' : `border ${theme.border} bg-gradient-to-br ${theme.gradient}`}`}
                  >
                    {/* Colored top accent bar */}
                    <div
                      style={theme.customAccentStyle || undefined}
                      className={`h-1 w-full ${theme.accent}`}
                    />

                    <div className="p-5 space-y-4">
                      {/* Top Team Badge Header */}
                      <div className="flex items-start justify-between gap-3">
                        <TeamBadge team={team} size="md" showManager={true} managerName={managerName} />
                        <span
                          style={theme.customBadgeStyle || undefined}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${theme.badgeBg}`}
                        >
                          {team.shortCode || team.code || 'TEAM'}
                        </span>
                      </div>

                      {/* Purse & Roster Grid */}
                      <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                        <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80">
                          <span className="text-[10px] text-slate-400 font-medium uppercase block">Remaining Purse</span>
                          <span
                            style={theme.customStatStyle || undefined}
                            className={`font-mono font-bold text-xs sm:text-sm mt-0.5 block ${theme.stat}`}
                          >
                            {formatCurrency(team.remainingBudget)}
                          </span>
                        </div>

                        <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80">
                          <span className="text-[10px] text-slate-400 font-medium uppercase block">Squad Count</span>
                          <span className="font-mono font-bold text-white text-xs sm:text-sm mt-0.5 block">
                            {rosterCount} / {team.minRoster || 11} min
                          </span>
                        </div>
                      </div>

                      {/* Click Card Footer */}
                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 group-hover:text-white transition">
                        <span className="font-medium">View Team Profile</span>
                        <ExternalLink
                          style={theme.customStatStyle || undefined}
                          className={`w-3.5 h-3.5 transition ${theme.stat}`}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-40 transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono font-bold text-slate-400 px-3">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-40 transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}

        {selectedTeam && (() => {
          const modalTheme = getTeamTheme(selectedTeam);
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
              <div className={`glass-card rounded-2xl p-6 border ${modalTheme.border} max-w-xl w-full space-y-6 relative max-h-[90vh] overflow-y-auto bg-gradient-to-br ${modalTheme.gradient}`}>
                <button
                  onClick={() => setSelectedTeam(null)}
                  className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-900 border border-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>

                <TeamBadge team={selectedTeam} size="lg" showManager={true} managerName={selectedTeam.managerId?.name || selectedTeam.ownerName} />

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono">
                  <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase block">Total Purse</span>
                    <span className="font-bold text-white">{formatCurrency(selectedTeam.totalBudget)}</span>
                  </div>
                  <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase block">Purse Left</span>
                    <span className={`font-bold ${modalTheme.stat}`}>{formatCurrency(selectedTeam.remainingBudget)}</span>
                  </div>
                  <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase block">Total Players</span>
                    <span className="font-bold text-white">{selectedTeam.currentRoster?.length || selectedTeam.currentRosterCount || 0}</span>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-1.5">
                    <Users className={`w-4 h-4 ${modalTheme.stat}`} /> Acquired Roster
                  </h4>
                  {Array.isArray(selectedTeam.currentRoster) && selectedTeam.currentRoster.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                      {selectedTeam.currentRoster.map(player => (
                        <div key={player._id || player.id} className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs">
                          <span className="font-bold text-white">{player.name} ({player.primaryPosition || 'Player'})</span>
                          <span className="font-mono text-amber-400 font-bold">{formatCurrency(player.finalPrice || 0)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic bg-slate-950/50 p-4 rounded-xl text-center border border-slate-800">
                      No players acquired in auction yet.
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

      </main>
    </div>
  );
}