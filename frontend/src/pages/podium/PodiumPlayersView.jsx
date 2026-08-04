import 'react';
import { useParams } from 'react-router-dom';
import { useAuction } from '../../context/AuctionContext';
import { Trophy, Clock } from 'lucide-react';

const STATUS_STYLES = {
    SOLD: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    UNSOLD: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
};

const getCategoryRowStyle = (category) => {
    switch (category) {
        case 'Icon Category':
            return 'bg-amber-950/20 hover:bg-amber-950/40 border-l-4 border-amber-500';
        case 'A Grade':
            return 'bg-blue-950/20 hover:bg-blue-950/40 border-l-4 border-blue-500';
        case 'B Grade':
            return 'bg-teal-950/20 hover:bg-teal-950/40 border-l-4 border-teal-500';
        case 'Emerging Youth':
            return 'bg-purple-950/20 hover:bg-purple-950/40 border-l-4 border-purple-500';
        default:
            return 'hover:bg-slate-800/30 border-l-4 border-slate-700';
    }
};

export default function PodiumPlayersView() {
    const { filter } = useParams(); // 'sold' or 'unsold'
    const { players, formatCurrency } = useAuction();

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
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                        <thead className="bg-slate-900/80 text-slate-400 uppercase font-bold text-[11px] border-b border-slate-800">
                            <tr>
                                <th className="py-3 px-4">Player</th>
                                <th className="py-3 px-4">Category</th>
                                <th className="py-3 px-4">Base Price</th>
                                {statusFilter === 'SOLD' && <th className="py-3 px-4">Sold For</th>}
                                {statusFilter === 'SOLD' && <th className="py-3 px-4">Sold To</th>}
                                <th className="py-3 px-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                            {filteredPlayers.map(player => {
                                const rowStyle = getCategoryRowStyle(player.category);
                                return (<tr key={player._id || player.id} className={`transition-colors ${rowStyle}`}>
                                    <td className="py-3 px-4">
                                        <div className="flex items-center gap-3">
                                            <img
                                                src={player.imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name || 'P')}&background=1e293b&color=94a3b8`}
                                                alt={player.name}
                                                className="w-8 h-8 rounded-full object-cover border border-slate-700"
                                            />
                                            <div>
                                                <p className="font-extrabold text-white">{player.name}</p>
                                                <p className="text-[10px] text-slate-400 font-mono">{player.jerseyName}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-3 px-4 font-semibold text-amber-400">{player.category}</td>
                                    <td className="py-3 px-4 font-mono text-slate-400">{formatCurrency(player.basePrice)}</td>
                                    {statusFilter === 'SOLD' && (
                                        <td className="py-3 px-4 font-mono font-bold text-emerald-400">{formatCurrency(player.finalPrice)}</td>
                                    )}
                                    {statusFilter === 'SOLD' && (
                                        <td className="py-3 px-4 font-semibold text-blue-400">{player.soldToTeam?.name || 'N/A'}</td>
                                    )}
                                    <td className="py-3 px-4">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${STATUS_STYLES[player.status] || ''}`}>
                                            {player.status}
                                        </span>
                                    </td>
                                </tr>);
                            })}
                            {filteredPlayers.length === 0 && (
                                <tr>
                                    <td colSpan={statusFilter === 'SOLD' ? 6 : 4} className="py-12 text-center text-slate-500">
                                        No {statusFilter.toLowerCase()} players found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}