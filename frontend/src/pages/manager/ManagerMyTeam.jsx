import { useState, useEffect, useCallback, useMemo } from 'react';

import {
  ShieldCheck, Save, Loader2, DollarSign, Users, Award, Edit3, X,
  Wallet, TrendingUp, Camera, Sparkles, Quote,
  MapPin, Mail, UserCog, CalendarDays, Palette, Info, Key, Shirt
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAuction } from '../../context/AuctionContext';
import api, { managerAPI } from '../../services/api';
import TeamBadge from '../../components/common/TeamBadge';
import PlayerCardCard from '../../components/common/PlayerCardCard';

export default function ManagerMyTeam() {
  const { user } = useAuth();
  const { triggerToast, formatCurrency, refetchTeams, teams: allTeams = [] } = useAuction();

  const [team, setTeam] = useState(null);
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal and form state
  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [teamForm, setTeamForm] = useState({
    name: '', shortCode: '', description: '', motto: '',
    ownerName: '', venue: '', contactEmail: '', primaryColor: '#10b981'
  });
  const [teamLogoFile, setTeamLogoFile] = useState(null);
  const [teamLogoPreview, setTeamLogoPreview] = useState(null);
  const [removeTeamLogo, setRemoveTeamLogo] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [changingPass, setChangingPass] = useState(false);

  const fetchTeamDetails = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/manager/roster');
      const data = res.data?.data || res.data || null;
      if (data && data.team) {
        setTeam(data.team);
        // Roster players can arrive under a few different keys depending on
        // how the backend shapes the response — check the common ones.
        const rosterList = data.roster || data.players || data.team.currentRoster || [];
        setRoster(Array.isArray(rosterList) ? rosterList : []);
      } else {
        triggerToast('Could not find an assigned team for your account.', 'warning');
      }
    } catch (err) {
      console.error('Failed to load team details:', err);
      triggerToast('Failed to load team data.', 'error');
    } finally {
      setLoading(false);
    }
  }, [triggerToast]);

  useEffect(() => {
    if (user) fetchTeamDetails();
  }, [user, fetchTeamDetails]);

  const openEditModal = () => {
    if (!team) return;
    setTeamForm({
      name: team.name || '',
      shortCode: team.shortCode || team.code || '',
      description: team.description || '',
      motto: team.motto || '',
      ownerName: team.ownerName || '',
      venue: team.venue || '',
      contactEmail: team.contactEmail || '',
      primaryColor: team.primaryColor || '#10b981'
    });
    setTeamLogoFile(null);
    setTeamLogoPreview(team.logoUrl || null);
    setRemoveTeamLogo(false);
    setShowEditModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const formData = new FormData();
      if (teamForm.name) formData.append('name', teamForm.name);
      if (teamForm.shortCode) formData.append('shortCode', teamForm.shortCode.toUpperCase());
      formData.append('description', teamForm.description || '');
      formData.append('motto', teamForm.motto || '');
      formData.append('ownerName', teamForm.ownerName || '');
      formData.append('venue', teamForm.venue || '');
      formData.append('contactEmail', teamForm.contactEmail || '');
      formData.append('primaryColor', teamForm.primaryColor || '');

      if (teamLogoFile) {
        formData.append('logo', teamLogoFile);
      } else if (removeTeamLogo) {
        formData.append('removeLogo', 'true');
      }

      const res = await managerAPI.updateTeam(formData);
      if (res?.success || res?.data) {
        triggerToast('Team profile updated successfully!', 'success');
        setShowEditModal(false);
        fetchTeamDetails();
        if (typeof refetchTeams === 'function') refetchTeams();
      }
    } catch (err) {
      triggerToast(err?.response?.data?.message || 'Failed to update team profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPass !== confirmPass) {
      triggerToast('New passwords do not match.', 'error');
      return;
    }
    if (newPass.length < 6) {
      triggerToast('Password must be at least 6 characters.', 'error');
      return;
    }
    setChangingPass(true);
    try {
      await api.put('/manager/password', { currentPassword: currentPass, newPassword: newPass });
      triggerToast('Password changed successfully!', 'success');
      setShowPasswordModal(false);
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
    } catch (err) {
      triggerToast(err?.response?.data?.message || 'Failed to change password.', 'error');
    } finally {
      setChangingPass(false);
    }
  };

  // Normalize roster entries — they may be full player objects, or IDs that
  // still need resolving against the full player list. We only have the
  // player objects returned in `roster` here, so just filter out any junk.
  const rosterPlayers = useMemo(() => {
    return roster.filter(p => p && typeof p === 'object' && (p._id || p.id));
  }, [roster]);

  const positionGroups = useMemo(() => {
    const groups = {};
    rosterPlayers.forEach(p => {
      const pos = p.primaryPosition || 'Unassigned';
      if (!groups[pos]) groups[pos] = 0;
      groups[pos] += 1;
    });
    return groups;
  }, [rosterPlayers]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-slate-400">Could not load team information.</p>
      </div>
    );
  }

  const totalBudget = team.totalBudget || 0;
  const remainingBudget = team.remainingBudget || 0;
  const spentBudget = totalBudget - remainingBudget;
  const utilization = totalBudget > 0 ? Math.min(100, Math.round((spentBudget / totalBudget) * 100)) : 0;
  const squadSize = rosterPlayers.length || team.rosterCount || team.playerCount || 0;
  const squadTarget = team.requiredSlots ?? team.squadTarget ?? team.minRoster ?? null;

  const stats = [
    {
      label: 'Total Purse',
      value: formatCurrency ? formatCurrency(totalBudget) : totalBudget,
      icon: Wallet,
      tone: 'text-blue-300 bg-blue-500/10 border-blue-500/20',
    },
    {
      label: 'Spent',
      value: formatCurrency ? formatCurrency(spentBudget) : spentBudget,
      icon: TrendingUp,
      tone: 'text-amber-300 bg-amber-500/10 border-amber-500/20',
    },
    {
      label: 'Remaining',
      value: formatCurrency ? formatCurrency(remainingBudget) : remainingBudget,
      icon: DollarSign,
      tone: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
    },
    {
      label: 'Squad Size',
      value: squadTarget ? `${squadSize} / ${squadTarget}` : squadSize,
      icon: Users,
      tone: 'text-purple-300 bg-purple-500/10 border-purple-500/20',
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── Profile Header Card ─────────────────────────────────────────── */}
      <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden shadow-2xl shadow-purple-950/10">
        {/* Banner */}
        <div className="relative h-40 md:h-52 bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950 overflow-hidden">
          <div
            className="absolute inset-0 opacity-40"
            style={{
              backgroundImage: 'radial-gradient(circle, rgba(148,163,184,0.35) 1px, transparent 1px)',
              backgroundSize: '18px 18px',
            }}
          />
          <div className="absolute -top-16 -right-16 w-64 h-64 bg-purple-600/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-10 w-56 h-56 bg-emerald-500/10 rounded-full blur-3xl" />

          <div className="relative h-full p-6 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/30 border border-white/10 text-[10px] font-bold tracking-wider uppercase text-slate-200 backdrop-blur-sm">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                Franchise Profile
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/30 border border-white/10 text-[10px] font-bold tracking-wider uppercase text-slate-200 backdrop-blur-sm">
                <UserCog className="w-3 h-3 text-blue-400" />
                {user?.name || 'Team Manager'}
              </span>
            </div>
            <button
              onClick={openEditModal}
              className="self-end px-4 py-2 bg-white/10 hover:bg-white text-white hover:text-slate-900 border border-white/20 text-xs font-bold rounded-xl transition backdrop-blur-sm flex items-center gap-1.5"
            >
              <Edit3 className="w-3.5 h-3.5" /> Edit Profile
            </button>
          </div>
        </div>

        {/* Identity row */}
        <div className="px-6 pb-6">
          <div className="flex flex-col md:flex-row md:items-end gap-5 -mt-16 md:-mt-14">
            <div className="relative flex-shrink-0 mx-auto md:mx-0">
              <TeamBadge team={team} size="xl" showName={false} showCode={false} />
              <button
                onClick={openEditModal}
                className="absolute -bottom-2 -right-2 w-9 h-9 rounded-xl bg-emerald-500 hover:bg-emerald-400 border-4 border-slate-900 flex items-center justify-center shadow-lg transition"
                title="Change logo"
              >
                <Camera className="w-4 h-4 text-slate-950" />
              </button>
            </div>

            {/* Name + meta */}
            <div className="flex-1 text-center md:text-left pb-1">
              <div className="flex flex-col md:flex-row md:items-center gap-2 justify-center md:justify-start">
                <h1 className="text-2xl md:text-3xl font-black font-heading text-white">
                  {team.name || 'Franchise Team'}
                </h1>
                {(team.shortCode || team.code) && (
                  <span className="inline-flex w-fit mx-auto md:mx-0 px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs font-mono font-bold text-slate-300 tracking-widest">
                    {team.shortCode || team.code}
                  </span>
                )}
              </div>
              {team.motto && (
                <p className="text-sm text-purple-300/80 italic mt-1 flex items-center gap-1.5 justify-center md:justify-start">
                  <Quote className="w-3.5 h-3.5 flex-shrink-0" />
                  {team.motto}
                </p>
              )}
            </div>

            <button
              onClick={() => setShowPasswordModal(true)}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-bold rounded-xl transition shadow flex items-center gap-1.5"
            >
              <Key className="w-3.5 h-3.5 text-amber-400" /> Change Password
            </button>
          </div>
        </div>
      </div>

      {/* ── Budget Utilization ──────────────────────────────────────────── */}
      <div className="glass-card rounded-2xl border border-slate-800 p-5 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Award className="w-4 h-4 text-emerald-400" /> Purse Utilization
          </h3>
          <span className="text-sm font-black text-white">{utilization}%</span>
        </div>
        <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-blue-500 transition-all duration-700"
            style={{ width: `${utilization}%` }}
          />
        </div>
      </div>

      {/* ── Stat Cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="glass-card rounded-2xl border border-slate-800 p-4 shadow-lg">
            <div className={`w-9 h-9 rounded-xl border flex items-center justify-center mb-3 ${tone}`}>
              <Icon className="w-4.5 h-4.5" />
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
            <p className="text-lg font-black text-white mt-0.5 truncate">{value}</p>
          </div>
        ))}
      </div>

      {/* ── Team Details ────────────────────────────────────────────────── */}
      <div className="glass-card rounded-2xl border border-slate-800 p-6 shadow-xl">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
          <Info className="w-4 h-4 text-emerald-400" /> Team Details
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-800/60 border border-slate-700 flex items-center justify-center flex-shrink-0">
              <UserCog className="w-4 h-4 text-slate-400" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Owner / Manager</p>
              <p className="text-sm font-semibold text-white truncate">{team.ownerName || 'Not set'}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-800/60 border border-slate-700 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-4 h-4 text-slate-400" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Home Venue</p>
              <p className="text-sm font-semibold text-white truncate">{team.venue || 'Not set'}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-800/60 border border-slate-700 flex items-center justify-center flex-shrink-0">
              <Mail className="w-4 h-4 text-slate-400" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Contact Email</p>
              <p className="text-sm font-semibold text-white truncate">{team.contactEmail || 'Not set'}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-800/60 border border-slate-700 flex items-center justify-center flex-shrink-0">
              <CalendarDays className="w-4 h-4 text-slate-400" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Founded Session</p>
              <p className="text-sm font-semibold text-white truncate">{team.session || team.foundedSession || 'Not set'}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 sm:col-span-2">
            <div className="w-9 h-9 rounded-xl bg-slate-800/60 border border-slate-700 flex items-center justify-center flex-shrink-0">
              <Palette className="w-4 h-4 text-slate-400" />
            </div>
            <div className="min-w-0 flex items-center gap-2">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Team Color</p>
                <p className="text-sm font-semibold text-white truncate">{team.primaryColor || 'Not set'}</p>
              </div>
              {team.primaryColor && (
                <span
                  className="w-6 h-6 rounded-lg border border-white/10 flex-shrink-0"
                  style={{ backgroundColor: team.primaryColor }}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── About ───────────────────────────────────────────────────────── */}
      {team.description && (
        <div className="glass-card rounded-2xl border border-slate-800 p-6 shadow-xl">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" /> About This Franchise
          </h3>
          <p className="text-sm text-slate-300 leading-relaxed">{team.description}</p>
        </div>
      )}

      {/* ── My Squad — Acquired Players as Cards ───────────────────────── */}
      <div className="glass-card rounded-2xl border border-slate-800 p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Shirt className="w-4 h-4 text-emerald-400" /> My Squad
            <span className="ml-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono font-bold normal-case tracking-normal">
              {squadSize}{squadTarget ? ` / ${squadTarget}` : ''} Players
            </span>
          </h3>

          {/* Position breakdown pills */}
          {Object.keys(positionGroups).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(positionGroups).map(([pos, count]) => (
                <span
                  key={pos}
                  className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700 text-[10px] font-bold text-slate-300"
                >
                  {pos}: <span className="text-white">{count}</span>
                </span>
              ))}
            </div>
          )}
        </div>

        {rosterPlayers.length === 0 ? (
          <div className="py-12 text-center space-y-3 border border-dashed border-slate-800 rounded-2xl">
            <Users className="w-10 h-10 mx-auto text-slate-700" />
            <p className="text-sm font-bold text-slate-400">No players acquired yet</p>
            <p className="text-xs text-slate-600 max-w-sm mx-auto">
              Players you win in the live auction will automatically appear here as part of your squad.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {rosterPlayers.map(player => (
              <PlayerCardCard
                key={player._id || player.id}
                player={player}
                formatCurrency={formatCurrency}
                teams={allTeams}
              />
            ))}
          </div>
        )}
      </div>

      {/* Edit Team Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-md rounded-2xl p-6 border border-slate-700 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" /> Edit Franchise Profile
              </h2>
              <button onClick={() => setShowEditModal(false)} className="p-2 text-slate-400 hover:text-white rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-400 mb-1">Team Logo</label>
                <div className="flex items-center gap-3">
                  {removeTeamLogo ? (
                    <div className="w-14 h-14 rounded-xl bg-slate-800 flex items-center justify-center text-white font-black text-lg">
                      {(teamForm.name || 'T')[0]}
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-xl overflow-hidden border border-slate-700 bg-slate-950 flex items-center justify-center flex-shrink-0">
                      {teamLogoPreview ? (
                        <img src={teamLogoPreview} alt="Logo Preview" className="w-full h-full object-contain" />
                      ) : (
                        <span className="text-2xl">🏆</span>
                      )}
                    </div>
                  )}
                  <div className="flex-1 space-y-1">
                    <label className="cursor-pointer px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-semibold text-xs inline-flex items-center gap-1.5 border border-slate-700">
                      <Camera className="w-3.5 h-3.5" />
                      <span>Upload Logo</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={e => {
                          const file = e.target.files[0];
                          if (file) {
                            setTeamLogoFile(file);
                            setTeamLogoPreview(URL.createObjectURL(file));
                            setRemoveTeamLogo(false);
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                    {(team.logoUrl || teamLogoPreview) && !removeTeamLogo && (
                      <button
                        type="button"
                        onClick={() => {
                          setTeamLogoFile(null);
                          setTeamLogoPreview(null);
                          setRemoveTeamLogo(true);
                        }}
                        className="block text-[11px] text-rose-400 hover:text-rose-300 font-semibold"
                      >
                        Remove Logo
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block font-semibold text-slate-400 mb-1">Franchise Team Name *</label>
                  <input
                    type="text"
                    value={teamForm.name}
                    onChange={e => setTeamForm(prev => ({ ...prev, name: e.target.value }))}
                    className="glass-input w-full px-3 py-2 rounded-xl text-white font-semibold"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Code *</label>
                  <input
                    type="text"
                    maxLength={4}
                    value={teamForm.shortCode}
                    onChange={e => setTeamForm(prev => ({ ...prev, shortCode: e.target.value.toUpperCase() }))}
                    className="glass-input w-full px-3 py-2 rounded-xl text-white font-mono uppercase"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-400 mb-1">Description (Optional)</label>
                <textarea
                  rows={2}
                  value={teamForm.description}
                  onChange={e => setTeamForm(prev => ({ ...prev, description: e.target.value }))}
                  className="glass-input w-full px-3 py-2 rounded-xl text-white"
                  placeholder="Team details or about section..."
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-400 mb-1">Team Motto (Optional)</label>
                <input
                  type="text"
                  maxLength={80}
                  value={teamForm.motto}
                  onChange={e => setTeamForm(prev => ({ ...prev, motto: e.target.value }))}
                  className="glass-input w-full px-3 py-2 rounded-xl text-white italic"
                  placeholder='e.g. "Play hard. Win harder."'
                />
              </div>

              <div className="pt-1 border-t border-slate-800" />
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Team Details</p>

              <div>
                <label className="block font-semibold text-slate-400 mb-1">Owner / Manager Name (Optional)</label>
                <input
                  type="text"
                  value={teamForm.ownerName}
                  onChange={e => setTeamForm(prev => ({ ...prev, ownerName: e.target.value }))}
                  className="glass-input w-full px-3 py-2 rounded-xl text-white"
                  placeholder="e.g. Topon Rahman"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-400 mb-1">Home Venue (Optional)</label>
                <input
                  type="text"
                  value={teamForm.venue}
                  onChange={e => setTeamForm(prev => ({ ...prev, venue: e.target.value }))}
                  className="glass-input w-full px-3 py-2 rounded-xl text-white"
                  placeholder="e.g. University Ground"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block font-semibold text-slate-400 mb-1">Contact Email (Optional)</label>
                  <input
                    type="email"
                    value={teamForm.contactEmail}
                    onChange={e => setTeamForm(prev => ({ ...prev, contactEmail: e.target.value }))}
                    className="glass-input w-full px-3 py-2 rounded-xl text-white"
                    placeholder="team@franchise.com"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Color</label>
                  <input
                    type="color"
                    value={teamForm.primaryColor}
                    onChange={e => setTeamForm(prev => ({ ...prev, primaryColor: e.target.value }))}
                    className="w-full h-[38px] rounded-xl border border-slate-700 bg-slate-900 cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-2.5 border border-slate-700 text-slate-300 hover:bg-slate-800 rounded-xl text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition disabled:opacity-60"
                >
                  {saving ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-sm rounded-2xl p-6 border border-slate-700 space-y-5 shadow-2xl">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-400" /> Change Password
              </h2>
              <button onClick={() => setShowPasswordModal(false)} className="p-2 text-slate-400 hover:text-white rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-400 mb-1">Current Password</label>
                <input
                  type="password"
                  value={currentPass}
                  onChange={e => setCurrentPass(e.target.value)}
                  className="glass-input w-full px-3 py-2 rounded-xl text-white"
                  required
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-400 mb-1">New Password</label>
                <input
                  type="password"
                  value={newPass}
                  onChange={e => setNewPass(e.target.value)}
                  placeholder="At least 6 characters"
                  className="glass-input w-full px-3 py-2 rounded-xl text-white"
                  required
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-400 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPass}
                  onChange={e => setConfirmPass(e.target.value)}
                  className="glass-input w-full px-3 py-2 rounded-xl text-white"
                  required
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowPasswordModal(false)} className="flex-1 py-2.5 border border-slate-700 text-slate-300 hover:bg-slate-800 rounded-xl text-xs font-semibold transition">
                  Cancel
                </button>
                <button type="submit" disabled={changingPass} className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition disabled:opacity-60">
                  {changingPass ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Key className="w-3.5 h-3.5" />}
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}