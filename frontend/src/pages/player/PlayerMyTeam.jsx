import { useState, useEffect, useMemo } from 'react';
import { Shield, User, Users, Mail, Loader2, Trophy, Shirt, Award, Lock, Sparkles, CheckCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAuction } from '../../context/AuctionContext';
import { playerAPI } from '../../services/api';
import TeamBadge from '../../components/common/TeamBadge';
import { getImageUrl } from '../../utils/imageUrl';
import { playerFallback } from '../../utils/playerFallback';

/* Formations layout configuration for read-only pitch rendering */
const FORMATIONS = {
  '4-3-3': [
    { id: 'GK', label: 'GK', x: 50, y: 91 }, { id: 'LB', label: 'LB', x: 12, y: 68 }, { id: 'CB1', label: 'CB', x: 36, y: 72 },
    { id: 'CB2', label: 'CB', x: 64, y: 72 }, { id: 'RB', label: 'RB', x: 88, y: 68 },
    { id: 'CDM', label: 'CDM', x: 50, y: 56 }, { id: 'CM1', label: 'CM', x: 28, y: 44 }, { id: 'CM2', label: 'CM', x: 72, y: 44 },
    { id: 'LW', label: 'LW', x: 16, y: 20 }, { id: 'ST', label: 'ST', x: 50, y: 12 }, { id: 'RW', label: 'RW', x: 84, y: 20 },
  ],
  '4-4-2': [
    { id: 'GK', label: 'GK', x: 50, y: 91 }, { id: 'LB', label: 'LB', x: 12, y: 70 }, { id: 'CB1', label: 'CB', x: 36, y: 74 },
    { id: 'CB2', label: 'CB', x: 64, y: 74 }, { id: 'RB', label: 'RB', x: 88, y: 70 },
    { id: 'LM', label: 'LM', x: 13, y: 48 }, { id: 'CM1', label: 'CM', x: 38, y: 53 }, { id: 'CM2', label: 'CM', x: 62, y: 53 }, { id: 'RM', label: 'RM', x: 87, y: 48 },
    { id: 'ST1', label: 'ST', x: 37, y: 17 }, { id: 'ST2', label: 'ST', x: 63, y: 17 },
  ],
  '4-2-3-1': [
    { id: 'GK', label: 'GK', x: 50, y: 91 }, { id: 'LB', label: 'LB', x: 12, y: 70 }, { id: 'CB1', label: 'CB', x: 36, y: 74 },
    { id: 'CB2', label: 'CB', x: 64, y: 74 }, { id: 'RB', label: 'RB', x: 88, y: 70 },
    { id: 'CDM1', label: 'CDM', x: 35, y: 59 }, { id: 'CDM2', label: 'CDM', x: 65, y: 59 },
    { id: 'LW', label: 'LW', x: 16, y: 33 }, { id: 'CAM', label: 'CAM', x: 50, y: 30 }, { id: 'RW', label: 'RW', x: 84, y: 33 },
    { id: 'ST', label: 'ST', x: 50, y: 11 },
  ],
  '3-5-2': [
    { id: 'GK', label: 'GK', x: 50, y: 91 }, { id: 'CB1', label: 'CB', x: 28, y: 73 }, { id: 'CB2', label: 'CB', x: 50, y: 76 }, { id: 'CB3', label: 'CB', x: 72, y: 73 },
    { id: 'LM', label: 'LM', x: 11, y: 52 }, { id: 'CM1', label: 'CM', x: 33, y: 57 }, { id: 'CAM', label: 'CAM', x: 50, y: 43 },
    { id: 'CM2', label: 'CM', x: 67, y: 57 }, { id: 'RM', label: 'RM', x: 89, y: 52 },
    { id: 'ST1', label: 'ST', x: 39, y: 16 }, { id: 'ST2', label: 'ST', x: 61, y: 16 },
  ],
  '3-4-3': [
    { id: 'GK', label: 'GK', x: 50, y: 91 }, { id: 'CB1', label: 'CB', x: 28, y: 73 }, { id: 'CB2', label: 'CB', x: 50, y: 76 }, { id: 'CB3', label: 'CB', x: 72, y: 73 },
    { id: 'LM', label: 'LM', x: 12, y: 54 }, { id: 'CM1', label: 'CM', x: 38, y: 55 }, { id: 'CM2', label: 'CM', x: 62, y: 55 }, { id: 'RM', label: 'RM', x: 88, y: 54 },
    { id: 'LW', label: 'LW', x: 18, y: 22 }, { id: 'ST', label: 'ST', x: 50, y: 14 }, { id: 'RW', label: 'RW', x: 82, y: 22 },
  ]
};

export default function PlayerMyTeam() {
  const { user } = useAuth();
  const { formatCurrency, triggerToast } = useAuction();

  const [squadData, setSquadData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadSquad() {
      setLoading(true);
      try {
        const res = await playerAPI.getMyTeam();
        const data = res?.data?.data || res?.data || null;
        if (active && data) {
          setSquadData(data);
        }
      } catch (err) {
        if (active) {
          const status = err?.response?.status;
          if (status !== 404) {
            triggerToast('Failed to load your team squad.', 'error');
          }
          setSquadData(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    if (user) loadSquad();
    return () => { active = false; };
  }, [user, triggerToast]);

  const currentUserId = String(user?._id || user?.id || '');

  const team = squadData?.team;
  const manager = squadData?.manager;
  const formationKey = squadData?.formation || '4-3-3';
  const formationSlots = FORMATIONS[formationKey] || FORMATIONS['4-3-3'];

  // Map slotId -> populated player object from manager's saved lineup
  const assignmentMap = useMemo(() => {
    const map = {};
    if (Array.isArray(squadData?.lineup)) {
      squadData.lineup.forEach(item => {
        if (item && item.slot && item.playerId) {
          map[item.slot] = item.playerId;
        }
      });
    }
    return map;
  }, [squadData?.lineup]);

  const substitutes = useMemo(() => {
    return Array.isArray(squadData?.substitutes) ? squadData.substitutes.filter(Boolean) : [];
  }, [squadData?.substitutes]);

  const roster = useMemo(() => {
    return Array.isArray(squadData?.roster) ? squadData.roster : [];
  }, [squadData?.roster]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-warningGold" />
      </div>
    );
  }

  if (!squadData || !team) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="glass-card rounded-2xl p-10 border border-cardBorder text-center">
          <Shield className="w-12 h-12 mx-auto text-mutedText mb-3" />
          <h2 className="text-xl font-bold text-white">No Team Assigned Yet</h2>
          <p className="text-sm text-secondaryText mt-1 max-w-md mx-auto">
            You have not been drafted to a franchise team yet. Your team details and starting XI position will appear here after the live auction!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* ── Team Header Card ──────────────────────────────────────────────── */}
      <div className="glass-card rounded-2xl p-6 border border-cardBorder shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 border border-white/10 text-[10px] font-bold uppercase tracking-wider text-warningGold backdrop-blur-sm">
            <Lock className="w-3 h-3" /> Read-Only Squad View
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <TeamBadge team={team} size="xl" showManager={false} />

          <div className="flex flex-wrap gap-4 text-xs font-semibold text-secondaryText">
            {manager && (
              <div className="px-4 py-2.5 rounded-xl bg-surfaceHover/60 border border-borderStrong flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-warningGold/20 text-warningGold font-bold flex items-center justify-center text-xs">
                  {manager.name?.[0] || 'M'}
                </div>
                <div>
                  <p className="text-[10px] font-mono text-mutedText uppercase">Manager</p>
                  <p className="font-bold text-white">{manager.name}</p>
                </div>
              </div>
            )}

            <div className="px-4 py-2.5 rounded-xl bg-surfaceHover/60 border border-borderStrong flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-neonGreen/20 text-neonGreen font-bold flex items-center justify-center text-xs">
                <Shirt className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-[10px] font-mono text-mutedText uppercase">Formation</p>
                <p className="font-bold text-white font-mono">{formationKey}</p>
              </div>
            </div>

            <div className="px-4 py-2.5 rounded-xl bg-surfaceHover/60 border border-borderStrong flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-sky-500/20 text-sky-400 font-bold flex items-center justify-center text-xs">
                <Trophy className="w-4 h-4 text-sky-400" />
              </div>
              <div>
                <p className="text-[10px] font-mono text-mutedText uppercase">Squad Strength</p>
                <p className="font-bold text-white">{squadData.collectiveStrength || 0}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Content Grid: Tactical Pitch & Substitutes ───────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Pitch Diagram (2 cols) */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-wider text-secondaryText flex items-center gap-2">
              <Shirt className="w-4 h-4 text-warningGold" /> Starting XI Lineup ({Object.keys(assignmentMap).length}/11)
            </h2>
            <span className="text-[11px] font-mono font-bold text-warningGold">
              Formation: {formationKey}
            </span>
          </div>

          <div
            className="relative w-full aspect-[68/95] sm:aspect-[68/88] rounded-2xl overflow-hidden border border-[#26313D] shadow-2xl"
            style={{
              background:
                'repeating-linear-gradient(90deg, rgba(255,255,255,0.026) 0 6.25%, transparent 6.25% 12.5%), linear-gradient(180deg, #0f3a2c 0%, #0B2B26 46%, #08201a 100%)',
            }}
          >
            {/* Pitch markings */}
            <div className="absolute inset-2 border border-white/20 pointer-events-none" />
            <div className="absolute left-2 right-2 top-1/2 border-t border-white/20 pointer-events-none" />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[24%] aspect-square rounded-full border border-white/20 pointer-events-none" />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white/40 pointer-events-none" />

            {/* Starting XI Player Cards on Pitch */}
            {formationSlots.map(slot => {
              const player = assignmentMap[slot.id];
              const isMe = player && (String(player._id || player.id) === currentUserId);

              if (!player) {
                return (
                  <div
                    key={slot.id}
                    className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none"
                    style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
                  >
                    <span className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl border border-dashed border-white/30 bg-black/40 flex items-center justify-center backdrop-blur-sm">
                      <span className="text-[10px] font-black text-white/60">{slot.label}</span>
                    </span>
                  </div>
                );
              }

              return (
                <div
                  key={slot.id}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center select-none z-10 transition-transform ${
                    isMe ? 'scale-110' : ''
                  }`}
                  style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
                >
                  <div className={`relative w-11 sm:w-13 rounded-lg overflow-hidden border-2 bg-[#101720]/90 shadow-xl ${
                    isMe ? 'border-warningGold ring-4 ring-warningGold/30 animate-pulse' : 'border-white/70'
                  }`}>
                    <img
                      src={getImageUrl(player, playerFallback('emerald'))}
                      alt={player.name || ''}
                      className="w-full aspect-square object-cover"
                    />
                    {isMe && (
                      <span className="absolute top-0 right-0 px-1 bg-warningGold text-[8px] font-black text-darkBg">
                        YOU
                      </span>
                    )}
                  </div>
                  <span className={`mt-0.5 px-1.5 py-0.5 rounded text-[8px] font-bold whitespace-nowrap max-w-[85px] truncate shadow ${
                    isMe ? 'bg-warningGold text-darkBg font-black' : 'bg-black/75 text-white border border-white/15'
                  }`}>
                    {(player.jerseyName || player.name || '').toUpperCase()}
                  </span>
                  <span className="text-[8px] font-mono font-black uppercase text-sky-300">
                    {slot.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Substitutes & Team Roster (1 col) */}
        <div className="space-y-6">

          {/* Substitutes / Bench */}
          <div className="glass-card rounded-2xl p-5 border border-cardBorder space-y-3">
            <h2 className="text-xs font-black uppercase tracking-wider text-secondaryText flex items-center gap-2">
              <Users className="w-4 h-4 text-warningGold" /> Bench / Substitutes ({substitutes.length})
            </h2>

            {substitutes.length === 0 ? (
              <p className="text-xs text-mutedText py-4 text-center border border-dashed border-cardBorder rounded-xl">
                No substitute players assigned to bench.
              </p>
            ) : (
              <div className="space-y-2">
                {substitutes.map(sub => {
                  const isMe = String(sub._id || sub.id) === currentUserId;
                  return (
                    <div
                      key={sub._id || sub.id}
                      className={`p-2.5 rounded-xl border flex items-center gap-3 ${
                        isMe ? 'bg-warningGold/10 border-warningGold/40' : 'bg-surfaceHover/50 border-borderStrong'
                      }`}
                    >
                      <img
                        src={getImageUrl(sub.imageUrl, playerFallback('emerald'))}
                        alt={sub.name}
                        className="w-9 h-9 rounded-full object-cover border border-white/10 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className={`text-xs font-bold truncate ${isMe ? 'text-warningGold' : 'text-white'}`}>
                          {sub.name} {isMe && '(You)'}
                        </p>
                        <p className="text-[10px] text-secondaryText font-mono uppercase">
                          {sub.primaryPosition} &bull; Bench
                        </p>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] font-mono font-bold text-white">
                        SUB
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Complete Squad List */}
          <div className="glass-card rounded-2xl p-5 border border-cardBorder space-y-3">
            <h2 className="text-xs font-black uppercase tracking-wider text-secondaryText flex items-center gap-2">
              <Award className="w-4 h-4 text-warningGold" /> Complete Roster ({roster.length})
            </h2>

            <div className="space-y-2 max-h-[360px] overflow-y-auto custom-scrollbar pr-1">
              {roster.map(p => {
                const isMe = String(p._id || p.id) === currentUserId;
                const starterEntry = Object.entries(assignmentMap).find(([, pl]) => String(pl._id || pl.id || pl) === String(p._id || p.id));
                const isSub = substitutes.some(s => String(s._id || s.id) === String(p._id || p.id));
                const squadRole = starterEntry ? `Starting XI (${starterEntry[0]})` : isSub ? 'Bench' : 'Unassigned';

                return (
                  <div
                    key={p._id || p.id}
                    className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                      isMe ? 'bg-warningGold/10 border-warningGold/40' : 'bg-surfaceHover/40 border-borderStrong'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={getImageUrl(p.imageUrl, playerFallback('emerald'))}
                        alt={p.name}
                        className="w-8 h-8 rounded-full object-cover border border-white/10 shrink-0"
                      />
                      <div className="min-w-0">
                        <p className={`font-bold truncate ${isMe ? 'text-warningGold' : 'text-white'}`}>
                          {p.name} {isMe && '(You)'}
                        </p>
                        <p className="text-[10px] text-mutedText">
                          {p.primaryPosition} &bull; <span className="text-white font-mono">{formatCurrency(p.finalPrice || 0)}</span>
                        </p>
                      </div>
                    </div>

                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono shrink-0 ${
                      starterEntry ? 'bg-neonGreen/10 text-white border border-neonGreen/30' : isSub ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30' : 'bg-white/5 text-mutedText border border-white/10'
                    }`}>
                      {squadRole}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
