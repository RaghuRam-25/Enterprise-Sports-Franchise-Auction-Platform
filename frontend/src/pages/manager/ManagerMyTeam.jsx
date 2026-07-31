import React, { useState, useEffect } from 'react';
import { ShieldCheck, Image, Save, Loader2, DollarSign, Users, Award, FileText } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAuction } from '../../context/AuctionContext';
import api from '../../services/api';

export default function ManagerMyTeam() {
  const { user } = useAuth();
  const { triggerToast, teams } = useAuction();

  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [logo, setLogo] = useState('');
  const [description, setDescription] = useState('');
  const [motto, setMotto] = useState('');

  useEffect(() => {
    const fetchTeamDetails = async () => {
      try {
        const res = await api.get('/teams');
        const allTeams = res.data?.data || res.data || [];
        // Find team belonging to manager
        const myTeam = allTeams.find(
          (t) => t.managerId === user?.id || t.managerId === user?._id || t.managerName === user?.name
        ) || allTeams[0];

        if (myTeam) {
          setTeam(myTeam);
          setName(myTeam.name || '');
          setLogo(myTeam.logo || myTeam.logoUrl || '');
          setDescription(myTeam.description || '');
          setMotto(myTeam.motto || '');
        }
      } catch (err) {
        console.error('Failed to load team details:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTeamDetails();
  }, [user]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!team) return;

    setSaving(true);
    try {
      const id = team._id || team.id;
      await api.put(`/teams/${id}`, {
        name,
        logo,
        description,
        motto,
      });
      triggerToast('Team branding updated successfully!', 'success');
    } catch (err) {
      triggerToast(err.response?.data?.message || 'Failed to update team branding.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black font-heading text-white flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-emerald-400" /> My Franchise Team Profile
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Customize your franchise team name, logo, description, and team motto.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Team Preview Card */}
        <div className="bg-slate-900/90 rounded-2xl p-6 border border-slate-800 space-y-4 text-center">
          <div className="w-24 h-24 mx-auto rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden p-2">
            {logo ? (
              <img src={logo} alt={name} className="w-full h-full object-contain" />
            ) : (
              <ShieldCheck className="w-12 h-12 text-slate-600" />
            )}
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-white">{name || 'Franchise Team'}</h2>
            <p className="text-xs text-emerald-400 font-semibold italic mt-0.5">"{motto || 'No Motto Set'}"</p>
          </div>

          <div className="pt-4 border-t border-slate-800 space-y-2 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Manager:</span>
              <span className="font-bold text-slate-200">{user?.name}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Purse Remaining:</span>
              <span className="font-mono font-bold text-emerald-400">
                ${(team?.budget || team?.purseRemaining || 10000000).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Team Edit Form */}
        <div className="md:col-span-2 bg-slate-900/90 rounded-2xl p-6 border border-slate-800 space-y-4">
          <h2 className="text-sm font-extrabold text-white border-b border-slate-800 pb-3">
            Franchise Customization
          </h2>

          <form onSubmit={handleSave} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Franchise Team Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Logo URL</label>
              <input
                type="text"
                placeholder="https://example.com/team-logo.png"
                value={logo}
                onChange={(e) => setLogo(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Team Motto</label>
              <input
                type="text"
                placeholder="e.g. Victory Through Honor"
                value={motto}
                onChange={(e) => setMotto(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Team Description</label>
              <textarea
                rows={4}
                placeholder="Brief description of the franchise..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-xl transition flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Team Details
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
