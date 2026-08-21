import 'react';
import { Users } from 'lucide-react';
import { useAuction } from '../../context/AuctionContext';
import { playerFallback } from '../../utils/playerFallback';
import { getImageUrl } from '../../utils/imageUrl';

export default function TeamRosterList({ players, team }) {
    const { formatCurrency } = useAuction();

    return (
        <div className="glass-card rounded-2xl p-6 border border-cardBorder space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-secondaryText flex items-center gap-2">
                <Users className="w-4 h-4 text-neonGreen" />
                Acquired Franchise Squad ({players.length} / {team?.minRoster || 11} min)
            </h3>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-secondaryText">
                    <thead className="bg-cardBg/80 text-secondaryText uppercase font-bold text-[11px] border-b border-cardBorder">
                        <tr>
                            <th className="py-3 px-4">#</th>
                            <th className="py-3 px-4">Player</th>
                            <th className="py-3 px-4">Position</th>
                            <th className="py-3 px-4">Category</th>
                            <th className="py-3 px-4">Acquisition Price</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-cardBorder/60">
                        {players.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="py-8 text-center text-mutedText">
                                    No players acquired yet in live auction.
                                </td>
                            </tr>
                        ) : (
                            players.map((player, idx) => (
                                <tr key={player._id || idx} className="hover:bg-surfaceHover/30">
                                    <td className="py-3 px-4 font-mono font-bold text-secondaryText">{idx + 1}</td>
                                    <td className="py-3 px-4">
                                        <div className="flex items-center gap-2">
                                            <img
                                                src={getImageUrl(player.imageUrl, playerFallback('emerald'))}
                                                alt={player.name}
                                                className="w-8 h-8 rounded-lg object-cover border border-borderStrong"
                                            />
                                            <div>
                                                <p className="font-extrabold text-white">{player.name}</p>
                                                <p className="text-[10px] text-mutedText font-mono">{player.jerseyName}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-3 px-4 text-neonGreen font-semibold">{player.primaryPosition}</td>
                                    <td className="py-3 px-4 font-semibold text-warningGold">{player.category}</td>
                                    <td className="py-3 px-4 font-mono font-bold text-neonGreen">{formatCurrency(player.finalPrice)}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}