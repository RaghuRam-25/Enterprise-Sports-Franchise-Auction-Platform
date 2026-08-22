import { useState } from 'react';
import { Users } from 'lucide-react';
import { useAuction } from '../../context/AuctionContext';
import { playerFallback } from '../../utils/playerFallback';
import { getImageUrl } from '../../utils/imageUrl';
import PlayerCardCard from '../../components/common/PlayerCardCard';
import PlayerStageModal from '../../components/common/PlayerStageModal';

export default function TeamRosterList({ players, team }) {
    const { formatCurrency, teams, categories } = useAuction();
    const [selectedPlayer, setSelectedPlayer] = useState(null);

    const count = players.length;
    const minTarget = Number(team?.minRoster) || 0;
    const pct = minTarget > 0 ? Math.min(100, Math.round((count / minTarget) * 100)) : 0;
    const complete = minTarget > 0 && count >= minTarget;

    return (
        <div className="glass-card rounded-2xl p-5 sm:p-6 border border-cardBorder space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-secondaryText flex items-center gap-2">
                    <Users className="w-4 h-4 text-neonGreen" />
                    Acquired Franchise Squad
                </h3>

                <div className="flex items-center gap-2.5">
                    <div className="h-1.5 w-24 sm:w-32 bg-darkBg/80 border border-cardBorder/60 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-500 ${complete ? 'bg-successGreen' : pct >= 50 ? 'bg-neonGreen' : 'bg-warningGold'}`}
                            style={{ width: `${Math.max(pct, 6)}%` }}
                        />
                    </div>
                    <span className={`font-mono text-xs font-bold shrink-0 ${complete ? 'text-successGreen' : 'text-secondaryText'}`}>
                        {count}
                        <span className="text-mutedText font-medium">/{minTarget || '–'} min</span>
                    </span>
                </div>
            </div>

            {count === 0 ? (
                <div className="py-10 flex flex-col items-center gap-2 text-center border border-dashed border-borderStrong rounded-xl">
                    <Users className="w-8 h-8 text-mutedText opacity-60" />
                    <p className="text-xs font-semibold text-secondaryText">No players acquired yet</p>
                    <p className="text-[11px] text-mutedText">Players won in the live auction will appear here automatically.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 auto-rows-fr">
                    {players.map(player => {
                        // Normalize category to its NAME string, resolving ids →
                        // the matching DB category so every card picks up its
                        // correct brand color via getCategoryTheme.
                        let category = typeof player.category === 'object'
                            ? player.category?.name
                            : player.category;
                        if (category) {
                            const raw = String(category).toLowerCase();
                            const match = categories.find(c =>
                                [c._id, c.name].some(v => String(v || '').toLowerCase() === raw)
                            );
                            if (match) category = match.name;
                        }

                        return (
                            <PlayerCardCard
                                key={player._id || player.id}
                                player={{ ...player, category }}
                                formatCurrency={formatCurrency}
                                teams={teams}
                                categories={categories}
                                onCardClick={() => setSelectedPlayer({ ...player, category })}
                            />
                        );
                    })}
                </div>
            )}

            {selectedPlayer && (
                <PlayerStageModal
                    player={selectedPlayer}
                    teams={teams}
                    categories={categories}
                    formatCurrency={formatCurrency}
                    onClose={() => setSelectedPlayer(null)}
                />
            )}
        </div>
    );
}
