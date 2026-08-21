import 'react';
import { useParams } from 'react-router-dom';
import { useAuction } from '../../context/AuctionContext';
import { DollarSign, Users } from 'lucide-react';
import TeamBadge from '../../components/common/TeamBadge';

export default function PodiumTeamsView() {
    const { filter } = useParams(); // 'budgets' or 'bought'
    const { teams, formatCurrency } = useAuction();

    const pageTitle = filter === 'budgets' ? 'Team Budgets & Purse' : 'Team Purchases & Rosters';
    const Icon = filter === 'budgets' ? DollarSign : Users;

    return (
        <div className="space-y-6">
            <div className="glass-card rounded-2xl p-6 border border-cardBorder">
                <div className="flex items-center gap-3">
                    <Icon className="w-6 h-6 text-neonGreen" />
                    <div>
                        <h1 className="text-xl font-black text-white">{pageTitle}</h1>
                        <p className="text-xs text-secondaryText">
                            {filter === 'budgets'
                                ? 'Live overview of all franchise financial statuses.'
                                : 'Review of players acquired by each franchise.'}
                        </p>
                    </div>
                </div>
            </div>

            {filter === 'budgets' ? (
                <BudgetsView teams={teams} formatCurrency={formatCurrency} />
            ) : (
                <PurchasesView teams={teams} formatCurrency={formatCurrency} />
            )}
        </div>
    );
}

function BudgetsView({ teams, formatCurrency }) {
    return (
        <div className="glass-card rounded-2xl p-6 border border-cardBorder space-y-4">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-secondaryText">
                    <thead className="bg-cardBg/80 text-secondaryText uppercase font-bold text-[11px] border-b border-cardBorder">
                        <tr>
                            <th className="py-3 px-4">Franchise</th>
                            <th className="py-3 px-4">Total Purse</th>
                            <th className="py-3 px-4">Spent</th>
                            <th className="py-3 px-4">Remaining Purse</th>
                            <th className="py-3 px-4">Roster Size</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-cardBorder/60">
                        {teams.map(team => (
                            <tr key={team._id || team.id} className="hover:bg-surfaceHover/30">
                                <td className="py-3 px-4">
                                    <TeamBadge team={team} size="sm" showManager={true} />
                                </td>
                                <td className="py-3 px-4 font-mono">{formatCurrency(team.totalBudget)}</td>
                                <td className="py-3 px-4 font-mono text-urgentRedText">{formatCurrency((team.totalBudget || 0) - (team.remainingBudget || 0))}</td>
                                <td className="py-3 px-4 font-mono font-bold text-neonGreen">{formatCurrency(team.remainingBudget)}</td>
                                <td className="py-3 px-4 font-bold">{team.currentRoster?.length || 0}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function PurchasesView({ teams, formatCurrency }) {
    return (
        <div className="space-y-6">
            {teams.map(team => (
                <div key={team._id || team.id} className="glass-card rounded-2xl p-6 border border-cardBorder">
                    <div className="flex items-center justify-between mb-4">
                        <TeamBadge team={team} size="md" showManager={true} />
                        <span className="text-xs font-bold text-secondaryText">
                            {team.currentRoster?.length || 0} players bought
                        </span>
                    </div>
                    {team.currentRoster && team.currentRoster.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs text-secondaryText">
                                <thead className="bg-cardBg/80 text-secondaryText uppercase font-bold text-[11px] border-b border-cardBorder">
                                    <tr>
                                        <th className="py-2 px-3">Player</th>
                                        <th className="py-2 px-3">Position</th>
                                        <th className="py-2 px-3">Category</th>
                                        <th className="py-2 px-3">Sold For</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-cardBorder/60">
                                    {team.currentRoster.map(player => (
                                        <tr key={player._id || player.id} className="hover:bg-surfaceHover/30">
                                            <td className="py-2 px-3 font-bold text-white">{player.name}</td>
                                            <td className="py-2 px-3">{player.primaryPosition}</td>
                                            <td className="py-2 px-3">{player.category}</td>
                                            <td className="py-2 px-3 font-mono text-neonGreen">{formatCurrency(player.finalPrice)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="text-center text-mutedText text-xs py-4">This team has not bought any players yet.</p>
                    )}
                </div>
            ))}
        </div>
    );
}