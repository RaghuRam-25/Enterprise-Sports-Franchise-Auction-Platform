import  { useEffect, useMemo } from 'react';
import { Shield, User, Users, Mail, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAuction } from '../../context/AuctionContext';

export default function PlayerMyTeam() {
    const { user } = useAuth();
    const { players, teams, managers, loadManagers, isDataLoading, formatCurrency } = useAuction();

    useEffect(() => {
        // Managers might not be loaded by default, so we trigger it.
        if (typeof loadManagers === 'function') {
            loadManagers();
        }
    }, [loadManagers]);

    const myPlayerProfile = useMemo(() => {
        if (!user || !Array.isArray(players)) return null;
        return players.find(p => p.userId === (user._id || user.id) || p.email === user.email);
    }, [user, players]);

    const myTeam = useMemo(() => {
        if (!myPlayerProfile || !myPlayerProfile.soldToTeam || !Array.isArray(teams)) return null;
        const teamId = myPlayerProfile.soldToTeam._id || myPlayerProfile.soldToTeam;
        return teams.find(t => (t._id || t.id) === teamId);
    }, [myPlayerProfile, teams]);

    const teamManager = useMemo(() => {
        if (!myTeam || !myTeam.managerId || !Array.isArray(managers)) return null;
        const managerId = myTeam.managerId._id || myTeam.managerId;
        return managers.find(m => (m._id || m.id) === managerId);
    }, [myTeam, managers]);

    const teamMembers = useMemo(() => {
        if (!myTeam || !Array.isArray(players)) return [];
        const teamId = myTeam._id || myTeam.id;
        return players.filter(p => (p.soldToTeam?._id || p.soldToTeam) === teamId);
    }, [myTeam, players]);

    if (isDataLoading || (managers.length === 0 && !isDataLoading)) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
            </div>
        );
    }

    if (!myTeam) {
        return (
            <div className="space-y-6">
                <div className="glass-card rounded-2xl p-10 border border-slate-800 text-center">
                    <Shield className="w-12 h-12 mx-auto text-slate-600 mb-3" />
                    <h2 className="text-xl font-bold text-white">No Team Assigned</h2>
                    <p className="text-sm text-slate-400">
                        You have not been sold to a franchise team yet. Your team details will appear here after the auction.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Team Header */}
            <div className="glass-card rounded-2xl p-6 border border-slate-800 flex items-center gap-4 bg-gradient-to-r from-slate-900 via-slate-900/90 to-purple-950/20">
                <div className="w-16 h-16 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-4xl shadow-lg">
                    {myTeam.logo || '🏆'}
                </div>
                <div>
                    <span className="text-xs font-bold uppercase tracking-widest text-purple-400">My Franchise</span>
                    <h1 className="text-2xl font-black font-heading text-white">{myTeam.name}</h1>
                    <p className="text-xs text-slate-400 font-mono">{myTeam.shortCode || myTeam.code}</p>
                </div>
            </div>

            {/* Manager Card */}
            {teamManager && (
                <div className="space-y-4">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                        <User className="w-4 h-4 text-purple-400" /> Team Manager
                    </h2>
                    <div className="glass-card rounded-2xl p-5 border border-slate-800 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white font-bold text-lg uppercase flex-shrink-0">
                            {teamManager.name?.[0] || 'M'}
                        </div>
                        <div>
                            <p className="font-bold text-white">{teamManager.name}</p>
                            <p className="text-xs text-slate-400 font-mono flex items-center gap-1.5">
                                <Mail className="w-3 h-3 text-slate-500" /> {teamManager.email}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Team Roster */}
            <div className="space-y-4">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <Users className="w-4 h-4 text-purple-400" /> Team Roster ({teamMembers.length})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {teamMembers.map(player => (
                        <div key={player._id || player.id} className="bg-slate-900/70 border border-slate-800 p-4 rounded-xl flex items-center gap-3">
                            <img
                                src={player.imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name || 'P')}&background=1e293b&color=94a3b8`}
                                alt={player.name}
                                className="w-10 h-10 rounded-full object-cover border border-slate-700"
                            />
                            <div>
                                <p className={`font-bold text-sm ${player.userId === (user._id || user.id) ? 'text-purple-400' : 'text-white'}`}>
                                    {player.name} {player.userId === (user._id || user.id) && '(You)'}
                                </p>
                                <p className="text-[11px] text-slate-400">
                                    {player.primaryPosition} &bull; <span className="font-mono text-emerald-400 font-semibold">{formatCurrency(player.finalPrice || player.basePrice)}</span>
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}