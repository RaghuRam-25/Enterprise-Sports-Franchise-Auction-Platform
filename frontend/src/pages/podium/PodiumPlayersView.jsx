import 'react';
import { useParams } from 'react-router-dom';
import { useAuction } from '../../context/AuctionContext';
import { Trophy, Clock } from 'lucide-react';
import PlayerCardCard from '../../components/common/PlayerCardCard';

export default function PodiumPlayersView() {
    const { filter } = useParams(); // 'sold' or 'unsold'
    const { players, teams = [], formatCurrency } = useAuction();

    const statusFilter = filter.toUpperCase();
    const filteredPlayers = players.filter(p => p.status === statusFilter);

    const pageTitle = statusFilter === 'SOLD' ? 'Sold Players' : 'Unsold Player Pool';
    const Icon = statusFilter === 'SOLD' ? Trophy : Clock;

    return (
        <div className="space-y-6">
            <div className="glass-card rounded-2xl p-6 border border-slate-800">
                <div className="flex items-center gap-3">
                    <Icon className="w-6 h-6 text-blue-400" />
                    <div>
                        <h1 className="text-xl font-black text-white">{pageTitle}</h1>
                        <p className="text-xs text-slate-400">
                            {filteredPlayers.length} players found with status: {statusFilter}
                        </p>
                    </div>
                </div>
            </div>

            <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
                {filteredPlayers.length === 0 ? (
                    <div className="py-12 text-center text-slate-500">
                        No {statusFilter.toLowerCase()} players found.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredPlayers.map(player => (
                            <PlayerCardCard
                                key={player._id || player.id}
                                player={player}
                                formatCurrency={formatCurrency}
                                teams={teams}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}