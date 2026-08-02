import 'react';
import { Users } from 'lucide-react';
import { useAuction } from '../../context/AuctionContext';
import { playerFallback } from '../../utils/playerFallback';

export default function TeamRosterList({ players, team }) {
    const { formatCurrency } = useAuction();

    return (
        <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                Acquired Franchise Squad ({players.length} / {team?.minRoster || 11} min)
            </h3>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-900/80 text-slate-400 uppercase font-bold text-[11px] border-b border-slate-800">
                        <tr>
                            <th className="py-3 px-4">#</th>
                            <th className="py-3 px-4">Player</th>
                            <th className="py-3 px-4">Position</th>
                            <th className="py-3 px-4">Category</th>
                            <th className="py-3 px-4">Acquisition Price</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                        {players.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="py-8 text-center text-slate-500">
                                    No players acquired yet in live auction.
                                </td>
                            </tr>
                        ) : (
                            players.map((player, idx) => (
                                <tr key={player._id || idx} className="hover:bg-slate-800/30">
                                    <td className="py-3 px-4 font-mono font-bold text-slate-400">{idx + 1}</td>
                                    <td className="py-3 px-4">
                                        <div className="flex items-center gap-2">
                                            <img
                                                src={player.imageUrl || playerFallback('emerald')}
                                                alt={player.name}
                                                className="w-8 h-8 rounded-lg object-cover border border-slate-700"
                                            />
                                            <div>
                                                <p className="font-extrabold text-white">{player.name}</p>
                                                <p className="text-[10px] text-slate-500 font-mono">{player.jerseyName}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-3 px-4 text-emerald-400 font-semibold">{player.primaryPosition}</td>
                                    <td className="py-3 px-4 font-semibold text-amber-400">{player.category}</td>
                                    <td className="py-3 px-4 font-mono font-bold text-emerald-400">{formatCurrency(player.finalPrice)}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}