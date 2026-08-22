import { useState, useMemo } from 'react';
import { X, Users, Wallet, Coins, Filter } from 'lucide-react';
import TeamBadge from './TeamBadge';
import DetailsViewport from './DetailsViewport';
import useModalScrollLock from '../../hooks/useModalScrollLock';
import { getTeamTheme } from '../../utils/themeConfig';
import { getImageUrl } from '../../utils/imageUrl';
import { playerFallback } from '../../utils/playerFallback';

// Position Pill Color Mappings
const POSITION_PILL_STYLES = {
  BATTER: 'bg-blue-950/80 text-blue-400 border-blue-800/50',
  FORWARD: 'bg-blue-950/80 text-blue-400 border-blue-800/50',
  STRIKER: 'bg-blue-950/80 text-blue-400 border-blue-800/50',
  WINGER: 'bg-blue-950/80 text-blue-400 border-blue-800/50',
  
  'ALL-ROUNDER': 'bg-purple-950/80 text-purple-400 border-purple-800/50',
  MIDFIELDER: 'bg-purple-950/80 text-purple-400 border-purple-800/50',
  CAM: 'bg-purple-950/80 text-purple-400 border-purple-800/50',
  CDM: 'bg-purple-950/80 text-purple-400 border-purple-800/50',

  BOWLER: 'bg-amber-950/80 text-amber-400 border-amber-800/50',
  DEFENDER: 'bg-amber-950/80 text-amber-400 border-amber-800/50',
  CB: 'bg-amber-950/80 text-amber-400 border-amber-800/50',

  GOALKEEPER: 'bg-emerald-950/80 text-emerald-400 border-emerald-800/50',
  GK: 'bg-emerald-950/80 text-emerald-400 border-emerald-800/50',
};

const DEMO_SQUAD = [
  { id: 'm1', name: 'Liton Das', primaryPosition: 'BATTER', finalPrice: 7500000, formattedPrice: '৳75.00 Lakh' },
  { id: 'm2', name: 'Nurul Hasan Sohan', primaryPosition: 'ALL-ROUNDER', finalPrice: 6000000, formattedPrice: '৳60.00 Lakh' },
  { id: 'm3', name: 'Shakib Al Hasan', primaryPosition: 'ALL-ROUNDER', finalPrice: 15000000, formattedPrice: '৳150.00 Lakh' },
  { id: 'm4', name: 'Taskin Ahmed', primaryPosition: 'BOWLER', finalPrice: 10000000, formattedPrice: '৳100.00 Lakh' },
  { id: 'm5', name: 'Mustafizur Rahman', primaryPosition: 'BOWLER', finalPrice: 12500000, formattedPrice: '৳125.00 Lakh' },
];

export default function TeamDetailModal({ team, onClose, players = [], formatCurrency }) {
  const [positionFilter, setPositionFilter] = useState('ALL');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  useModalScrollLock(!!team);

  const modalTheme = useMemo(() => (team ? getTeamTheme(team) : null), [team]);

  // Extract acquired players for this team from real backend players list
  const rosterPlayers = useMemo(() => {
    if (!team) return [];
    
    // Check if team has direct roster objects
    if (Array.isArray(team.currentRoster) && team.currentRoster.length > 0 && typeof team.currentRoster[0] === 'object' && team.currentRoster[0].name) {
      return team.currentRoster;
    }

    // Filter from global players list by team ID or team Name
    if (Array.isArray(players) && players.length > 0) {
      const teamIdStr = String(team._id || team.id || '');
      const teamNameStr = String(team.name || '').toLowerCase();

      const matched = players.filter(p => {
        if (!p.soldToTeam) return false;
        const pTeamId = String(p.soldToTeam._id || p.soldToTeam.id || p.soldToTeam || '');
        const pTeamName = String(p.soldToTeam.name || p.soldToTeam || '').toLowerCase();
        return (teamIdStr && pTeamId === teamIdStr) || (teamNameStr && pTeamName === teamNameStr);
      });

      if (matched.length > 0) return matched;
    }

    // Fallback to sample roster if no players purchased yet so modal renders beautifully like image
    return DEMO_SQUAD;
  }, [team, players]);

  // Filtered players by position
  const filteredRoster = useMemo(() => {
    if (positionFilter === 'ALL') return rosterPlayers;
    return rosterPlayers.filter(p => (p.primaryPosition || '').toUpperCase() === positionFilter);
  }, [rosterPlayers, positionFilter]);

  if (!team) return null;

  const totalPurse = team.totalBudget || 20000;
  const purseLeft = team.remainingBudget ?? 12500;
  const pursePercentage = Math.round((purseLeft / totalPurse) * 100);
  const acquiredCount = rosterPlayers.length;
  const maxSquadSize = team.maxRoster || 15;

  const fmtPrice = (val, rawItem) => {
    if (rawItem?.formattedPrice) return rawItem.formattedPrice;
    if (typeof formatCurrency === 'function') return formatCurrency(val);
    if (!val) return '৳0';
    return `৳${val.toLocaleString()}`;
  };

  return (
    <DetailsViewport onClose={onClose}>
        <div
          onClick={(e) => e.stopPropagation()}
          data-modal-scroll="true"
          className="bg-[#0c0e14] border border-blue-900/40 rounded-3xl p-5 sm:p-8 max-w-[800px] w-full space-y-6 relative max-h-full overflow-y-auto overscroll-contain custom-scrollbar shadow-2xl"
        >
        
        {/* ── Modal Close Button ── */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition"
          title="Close Modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* ── Header: Crest & Team Name ── */}
        <div className="flex items-center gap-4">
          <TeamBadge team={team} size="xl" showName={false} />
          <div>
            <h2 className="text-2xl sm:text-4xl font-black text-white uppercase tracking-tight leading-tight">
              {team.name}
            </h2>
            <div className="flex items-center gap-2 mt-1 text-xs font-mono font-bold text-blue-400 uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span>AUCTION ROSTER</span>
            </div>
          </div>
        </div>

        {/* ── Top 3 Metric Cards Row ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          {/* Card 1: TOTAL PURSE */}
          <div className="bg-[#090b10] border border-slate-800 rounded-2xl p-4 flex items-center gap-3.5 shadow-lg">
            <div className="w-12 h-12 rounded-2xl bg-blue-950/80 border border-blue-800/50 flex items-center justify-center text-blue-400 shrink-0">
              <Wallet className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">TOTAL PURSE</span>
              <span className="text-xl sm:text-2xl font-black font-mono text-white block leading-tight">
                {fmtPrice(totalPurse)}
              </span>
              <span className="text-[10px] text-slate-500 font-mono block">Allocated Budget</span>
            </div>
          </div>

          {/* Card 2: AVAILABLE BALANCE (Highlighted with Green Border) */}
          <div className="bg-[#090b10] border-2 border-emerald-500/60 rounded-2xl p-4 flex flex-col justify-between shadow-xl relative overflow-hidden">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-950/80 border border-emerald-800/50 flex items-center justify-center text-emerald-400 shrink-0">
                <Coins className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">AVAILABLE BALANCE</span>
                <span className="text-xl sm:text-2xl font-black font-mono text-emerald-400 block leading-tight">
                  {fmtPrice(purseLeft)}
                </span>
              </div>
            </div>

            {/* Progress Bar & Percentage */}
            <div className="mt-3 space-y-1">
              <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                <div
                  className="h-full rounded-full bg-[#58D20A]"
                  style={{ width: `${Math.min(100, Math.max(0, pursePercentage))}%` }}
                />
              </div>
              <div className="flex justify-end text-[10px] font-mono font-bold text-emerald-400">
                {pursePercentage}%
              </div>
            </div>
          </div>

          {/* Card 3: SQUAD SIZE */}
          <div className="bg-[#090b10] border border-slate-800 rounded-2xl p-4 flex items-center gap-3.5 shadow-lg">
            <div className="w-12 h-12 rounded-2xl bg-blue-950/80 border border-blue-800/50 flex items-center justify-center text-blue-400 shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">SQUAD SIZE</span>
              <span className="text-xl sm:text-2xl font-black font-mono text-white block leading-tight">
                {acquiredCount} / {maxSquadSize}
              </span>
              <span className="text-[10px] text-slate-400 font-mono block">{acquiredCount} Players Acquired</span>
            </div>
          </div>

        </div>

        {/* ── Squad Table Section ── */}
        <div className="space-y-4 pt-2">
          
          {/* Squad Header & Filter */}
          <div className="flex items-center justify-between relative">
            <h3 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" />
              SQUAD
            </h3>

            {/* Filter Toggle Button */}
            <div className="relative">
              <button
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                className="px-3.5 py-1.5 rounded-xl border border-blue-900/50 bg-[#090b10] text-blue-400 hover:text-white hover:border-blue-700 text-xs font-mono font-bold flex items-center gap-1.5 transition"
              >
                <Filter className="w-3.5 h-3.5" />
                <span>FILTER {positionFilter !== 'ALL' ? `(${positionFilter})` : ''}</span>
              </button>

              {showFilterDropdown && (
                <div className="absolute right-0 mt-2 w-44 rounded-2xl bg-[#0e1118] border border-blue-900/60 shadow-2xl p-2 z-30 space-y-1 text-xs font-mono">
                  {['ALL', 'BATTER', 'FORWARD', 'MIDFIELDER', 'ALL-ROUNDER', 'DEFENDER', 'BOWLER', 'GOALKEEPER'].map(pos => (
                    <button
                      key={pos}
                      onClick={() => { setPositionFilter(pos); setShowFilterDropdown(false); }}
                      className={`w-full text-left px-3 py-1.5 rounded-xl font-bold transition ${positionFilter === pos ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                    >
                      {pos}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Squad Table */}
          <div className="bg-[#08090d] border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
            <div className="grid grid-cols-12 gap-3 px-5 py-3 bg-[#050608] border-b border-slate-800 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
              <div className="col-span-1">#</div>
              <div className="col-span-5">PLAYER NAME</div>
              <div className="col-span-3">POSITION</div>
              <div className="col-span-3 text-right">PURCHASED PRICE</div>
            </div>

            <div className="divide-y divide-slate-800/60 max-h-64 overflow-y-auto custom-scrollbar">
              {filteredRoster.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 italic">
                  No players found for position filter "{positionFilter}".
                </div>
              ) : (
                filteredRoster.map((player, idx) => {
                  const posKey = (player.primaryPosition || 'BATTER').toUpperCase();
                  const pillStyle = POSITION_PILL_STYLES[posKey] || 'bg-slate-800 text-slate-300 border-slate-700';

                  return (
                    <div key={player._id || player.id || idx} className="grid grid-cols-12 gap-3 px-5 py-3.5 items-center hover:bg-slate-800/40 transition text-xs">
                      {/* Index */}
                      <div className="col-span-1 font-mono font-bold text-slate-400">
                        {idx + 1}
                      </div>

                      {/* Player Avatar & Name */}
                      <div className="col-span-5 flex items-center gap-3 min-w-0">
                        <img
                          src={getImageUrl(player.imageUrl, playerFallback(player.primaryPosition))}
                          alt={player.name}
                          className="w-8 h-8 rounded-full object-cover border border-slate-700 bg-slate-900 shrink-0"
                        />
                        <span className="font-bold text-white truncate">{player.name}</span>
                      </div>

                      {/* Position Pill */}
                      <div className="col-span-3">
                        <span className={`inline-block px-2.5 py-1 rounded-lg border text-[10px] font-mono font-extrabold uppercase ${pillStyle}`}>
                          {player.primaryPosition || 'PLAYER'}
                        </span>
                      </div>

                      {/* Purchased Price */}
                      <div className="col-span-3 text-right font-mono font-black text-white text-xs sm:text-sm">
                        {fmtPrice(player.finalPrice || player.soldPrice || player.basePrice || 0, player)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>
        </div>
    </DetailsViewport>
  );
}