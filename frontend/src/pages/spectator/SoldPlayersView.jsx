import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, ShoppingBag, ArrowUpDown, TrendingUp, Users } from 'lucide-react';
import { useAuction } from '../../context/AuctionContext';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/Navbar';
import CompetitionHeader from '../../components/common/CompetitionHeader';
import PlayerCardCard from '../../components/common/PlayerCardCard';
import PlayerStageModal from '../../components/common/PlayerStageModal';

const SORTS = [
  { key: 'recent', label: 'Most Recent' },
  { key: 'price-high', label: 'Price: High → Low' },
  { key: 'price-low', label: 'Price: Low → High' },
  { key: 'name', label: 'Name A → Z' },
];

export default function SoldPlayersView() {
  const { players, teams, categories = [], sessions = [], formatCurrency } = useAuction();
  const { user } = useAuth();

  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  // Only SOLD players — this page is the full ledger of the auction.
  const soldPlayers = useMemo(
    () => (Array.isArray(players) ? players.filter((p) => p.status === 'SOLD') : []),
    [players]
  );

  useEffect(() => {
    document.title = 'Sold Players | Franchise Auction';
  }, []);

  const resolveTeam = (p) => {
    const tid = typeof p.soldToTeam === 'object' ? p.soldToTeam?._id : p.soldToTeam;
    return (
      teams.find((t) => String(t._id || t.id) === String(tid || '')) ||
      teams.find((t) => (t.name || '').toLowerCase() === String(tid || '').toLowerCase())
    );
  };

  const filtered = useMemo(() => {
    let list = soldPlayers.filter((p) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        p.name?.toLowerCase().includes(q) ||
        p.jerseyName?.toLowerCase().includes(q) ||
        p.primaryPosition?.toLowerCase().includes(q)
      );
    });

    list = [...list].sort((a, b) => {
      switch (sortBy) {
        case 'price-high': return (b.finalPrice || 0) - (a.finalPrice || 0);
        case 'price-low': return (a.finalPrice || 0) - (b.finalPrice || 0);
        case 'name': return (a.name || '').localeCompare(b.name || '');
        default: return new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0);
      }
    });
    return list;
  }, [soldPlayers, search, sortBy]);

  const totalSpent = useMemo(
    () => soldPlayers.reduce((sum, p) => sum + (p.finalPrice || 0), 0),
    [soldPlayers]
  );
  const topSale = useMemo(
    () => soldPlayers.reduce((max, p) => ((p.finalPrice || 0) > (max?.finalPrice || 0) ? p : max), null),
    [soldPlayers]
  );

  return (
    <div className="min-h-screen flex flex-col bg-darkBg text-primaryText">
      {!user && <Navbar />}

      <main className={`flex-1 w-full space-y-6 ${!user ? 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6' : 'px-4 py-6'}`}>

        {/* Same competition banner as PublicPlayersView */}
        <CompetitionHeader
          competitionName="Championship"
          sessionName={sessions?.[0]?.name || 'Current Season'}
          user={user}
          active="players"
        />

        {/* ── Page Header ── */}
        <div className="glass-card border border-cardBorder rounded-3xl p-6 sm:p-8 relative overflow-hidden">
          <div className="absolute -top-20 -right-16 w-72 h-72 bg-neonGreen/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-primaryText flex items-center gap-3">
                <ShoppingBag className="w-8 h-8 text-neonGreen" />
                Sold Players
              </h1>
              <p className="text-sm text-secondaryText mt-2 font-medium">
                Every player who found a franchise under the hammer.
              </p>
            </div>
            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-surfaceHover/60 border border-borderStrong rounded-xl px-4 py-3 text-center">
                <Users className="w-4 h-4 text-neonGreen mx-auto" />
                <span className="block text-lg font-black font-mono text-primaryText mt-1">{soldPlayers.length}</span>
                <span className="block text-[9px] uppercase tracking-widest text-mutedText font-bold">Sold</span>
              </div>
              <div className="bg-surfaceHover/60 border border-borderStrong rounded-xl px-4 py-3 text-center">
                <TrendingUp className="w-4 h-4 text-neonGreen mx-auto" />
                <span className="block text-lg font-black font-mono text-primaryText mt-1">{formatCurrency(topSale?.finalPrice || 0)}</span>
                <span className="block text-[9px] uppercase tracking-widest text-mutedText font-bold">Top Sale</span>
              </div>
              <div className="bg-surfaceHover/60 border border-borderStrong rounded-xl px-4 py-3 text-center">
                <ShoppingBag className="w-4 h-4 text-neonGreen mx-auto" />
                <span className="block text-lg font-black font-mono text-primaryText mt-1">{formatCurrency(totalSpent)}</span>
                <span className="block text-[9px] uppercase tracking-widest text-mutedText font-bold">Total Spent</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Search & Sort ── */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-mutedText" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search sold players by name or position…"
              className="w-full bg-cardBg border border-cardBorder focus:border-neonGreen/60 rounded-xl pl-10 pr-4 py-3 text-sm text-primaryText placeholder:text-mutedText outline-none transition"
            />
          </div>
          <div className="relative">
            <ArrowUpDown className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-mutedText pointer-events-none" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="appearance-none bg-cardBg border border-cardBorder focus:border-neonGreen/60 rounded-xl pl-10 pr-8 py-3 text-sm text-primaryText outline-none transition cursor-pointer"
            >
              {SORTS.map((s) => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Sold Players Grid ── */}
        {filtered.length === 0 ? (
          <div className="glass-card border border-cardBorder rounded-3xl py-20 text-center">
            <ShoppingBag className="w-10 h-10 text-mutedText mx-auto mb-3" />
            <p className="text-sm font-bold text-secondaryText">No sold players yet.</p>
            <p className="text-xs text-mutedText mt-1">Check back once the auction is live.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 auto-rows-fr pb-6">
            {filtered.map((player) => (
              <PlayerCardCard
                key={player._id || player.id}
                player={player}
                formatCurrency={formatCurrency}
                teams={teams}
                categories={categories}
                onCardClick={() => setSelectedPlayer(player)}
              />
            ))}
          </div>
        )}

        {/* Back link */}
        <div className="pb-8">
          <Link to="/" className="text-xs font-bold text-neonGreen hover:text-neonGreenHover hover:underline">← Back to Home</Link>
        </div>
      </main>

      {/* Podium-push style stage presentation on card click */}
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
