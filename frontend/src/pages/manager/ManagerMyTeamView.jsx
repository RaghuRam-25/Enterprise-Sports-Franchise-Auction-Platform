import { useState, useEffect, useCallback } from 'react';
import { Loader2, UserCircle2, Mail, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAuction } from '../../context/AuctionContext';
import { useSocket } from '../../context/SocketContext';
import api from '../../services/api';
import TeamRosterList from './TeamRosterList';
import TeamBadge from '../../components/common/TeamBadge';

export default function ManagerMyTeamView() {
    const { user } = useAuth();
    const { triggerToast, formatCurrency } = useAuction();
    const { socket } = useSocket();

    const [team, setTeam] = useState(null);
    const [players, setPlayers] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchTeamDetails = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const res = await api.get('/manager/roster');
            // axios interceptor unwraps response.data, so res = { success, data }
            const data = res?.data || res || null;
            if (data && data.team) {
                setTeam(data.team);
                setPlayers(data.players || []);
            }
        } catch (err) {
            console.error('Failed to load team details:', err);
            if (!silent) triggerToast('Failed to load your team data.', 'error');
        } finally {
            if (!silent) setLoading(false);
        }
    }, [triggerToast]);

    useEffect(() => {
        if (user) fetchTeamDetails();
    }, [user, fetchTeamDetails]);

    // Real-time sync: refresh the roster the moment a player is sold to this
    // team (or any auction completes), so the "My Team" page always matches the
    // live podium without a manual reload.
    useEffect(() => {
        if (!socket) return;
        const handleSaleEvent = () => fetchTeamDetails(true);
        socket.on('teams:updated', handleSaleEvent);
        socket.on('player:updated', handleSaleEvent);
        socket.on('auction:completed', handleSaleEvent);
        socket.on('auction:new-bid', handleSaleEvent);
        return () => {
            socket.off('teams:updated', handleSaleEvent);
            socket.off('player:updated', handleSaleEvent);
            socket.off('auction:completed', handleSaleEvent);
            socket.off('auction:new-bid', handleSaleEvent);
        };
    }, [socket, fetchTeamDetails]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-neonGreen" />
            </div>
        );
    }

    if (!team) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <p className="text-secondaryText">Could not load team information.</p>
            </div>
        );
    }

    const spentBudget = (team.totalBudget || 0) - (team.remainingBudget || 0);
    const managerInitial = (user?.name || 'M')[0].toUpperCase();

    return (
        <div className="space-y-6">
            {/* Team Header */}
            <div className="glass-card rounded-2xl p-6 border border-cardBorder flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                {/* Left: Team identity */}
                <div className="flex flex-col gap-1">
                    <TeamBadge team={team} size="xl" showManager={false} />
                    {team.motto && <p className="text-sm text-neonGreen/80 italic mt-1">"{team.motto}"</p>}
                </div>

                {/* Right: Manager profile card */}
                <div className="flex items-center gap-3 bg-cardBg/70 border border-cardBorder rounded-2xl px-4 py-3 self-stretch md:self-auto shadow-inner">
                    {user?.avatarUrl || user?.profilePicture ? (
                        <img
                            src={user.avatarUrl || user.profilePicture}
                            alt={user?.name || 'Manager'}
                            className="w-12 h-12 rounded-xl object-cover border-2 border-neonGreen/40 flex-shrink-0"
                        />
                    ) : (
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-neonGreen to-neonGreen flex items-center justify-center text-darkBg font-black text-lg border-2 border-neonGreen/40 flex-shrink-0">
                            {managerInitial}
                        </div>
                    )}
                    <div className="min-w-0">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-mutedText flex items-center gap-1">
                            <UserCircle2 className="w-3 h-3 text-neonGreen" /> Franchise Manager
                        </span>
                        <p className="text-sm font-extrabold text-white truncate max-w-[160px]">
                            {user?.name || 'Team Manager'}
                        </p>
                        {user?.email && (
                            <p className="text-[10px] text-mutedText truncate max-w-[160px] flex items-center gap-1 mt-0.5">
                                <Mail className="w-2.5 h-2.5 flex-shrink-0" />
                                {user.email}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Budget Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="glass-card rounded-xl p-4 border border-cardBorder">
                    <span className="text-[10px] font-bold text-secondaryText uppercase">Initial Purse</span>
                    <p className="text-xl font-black font-mono text-white mt-1">{formatCurrency(team.totalBudget)}</p>
                </div>
                <div className="glass-card rounded-xl p-4 border border-cardBorder">
                    <span className="text-[10px] font-bold text-secondaryText uppercase">Total Spent</span>
                    <p className="text-xl font-black font-mono text-urgentRedText mt-1">{formatCurrency(spentBudget)}</p>
                </div>
                <div className="glass-card rounded-xl p-4 border border-cardBorder">
                    <span className="text-[10px] font-bold text-secondaryText uppercase">Remaining Purse</span>
                    <p className="text-xl font-black font-mono text-neonGreen mt-1">{formatCurrency(team.remainingBudget)}</p>
                </div>
            </div>

            {/* Roster List */}
            <div className="flex items-center justify-end">
                <button
                    onClick={() => fetchTeamDetails(true)}
                    className="btn-secondary flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px]"
                    title="Refresh roster"
                    aria-label="Refresh roster"
                >
                    <RefreshCw className="w-3.5 h-3.5" /> Refresh
                </button>
            </div>
            {players && team && <TeamRosterList players={players} team={team} />}
        </div>
    );
}