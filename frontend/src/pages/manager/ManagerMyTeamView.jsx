import  { useState, useEffect } from 'react';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAuction } from '../../context/AuctionContext';
import api from '../../services/api';
import TeamRosterList from './TeamRosterList';

export default function ManagerMyTeamView() {
    const { user } = useAuth();
    const { triggerToast, formatCurrency } = useAuction();

    const [team, setTeam] = useState(null);
    const [players, setPlayers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTeamDetails = async () => {
            setLoading(true);
            try {
                const res = await api.get('/manager/roster');
                const data = res.data?.data || res.data || null;
                if (data && data.team) {
                    setTeam(data.team);
                    setPlayers(data.players || []);
                }
            } catch (err) {
                console.error('Failed to load team details:', err);
                triggerToast('Failed to load your team data.', 'error');
            } finally {
                setLoading(false);
            }
        };
        if (user) fetchTeamDetails();
    }, [user, triggerToast]);

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

    const spentBudget = (team.totalBudget || 0) - (team.remainingBudget || 0);

    return (
        <div className="space-y-6">
            {/* Team Header */}
            <div className="glass-card rounded-2xl p-6 border border-slate-800 flex flex-col md:flex-row items-start md:items-center gap-6">
                <div className="w-24 h-24 rounded-2xl bg-slate-900 border-2 border-slate-700 flex items-center justify-center overflow-hidden p-2 flex-shrink-0">
                    {team.logoUrl ? (
                        <img src={team.logoUrl} alt={team.name} className="w-full h-full object-contain" />
                    ) : (
                        <span className="text-5xl">{team.logo || '🏆'}</span>
                    )}
                </div>
                <div className="flex-1">
                    <h1 className="text-2xl font-black font-heading text-white flex items-center gap-2">
                        <ShieldCheck className="w-6 h-6 text-emerald-400" /> {team.name || 'Franchise Team'}
                    </h1>
                    {team.motto && <p className="text-sm text-emerald-400/80 italic mt-1">"{team.motto}"</p>}
                    {team.description && <p className="text-xs text-slate-400 mt-2">{team.description}</p>}
                </div>
            </div>

            {/* Budget Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="glass-card rounded-xl p-4 border border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Initial Purse</span>
                    <p className="text-xl font-black font-mono text-white mt-1">{formatCurrency(team.totalBudget)}</p>
                </div>
                <div className="glass-card rounded-xl p-4 border border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Total Spent</span>
                    <p className="text-xl font-black font-mono text-rose-400 mt-1">{formatCurrency(spentBudget)}</p>
                </div>
                <div className="glass-card rounded-xl p-4 border border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Remaining Purse</span>
                    <p className="text-xl font-black font-mono text-emerald-400 mt-1">{formatCurrency(team.remainingBudget)}</p>
                </div>
            </div>

            {/* Roster List */}
            {players && team && <TeamRosterList players={players} team={team} />}
        </div>
    );
}