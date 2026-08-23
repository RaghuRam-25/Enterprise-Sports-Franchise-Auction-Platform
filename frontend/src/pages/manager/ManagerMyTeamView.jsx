import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shirt, Trophy, Users, Save, RotateCcw, Zap, Search, X, Star, Wallet,
  BarChart3, AlertCircle, ShieldAlert, ArrowUp,
  SlidersHorizontal, User
} from 'lucide-react';
import { useAuction } from '../../context/AuctionContext';
import { managerAPI } from '../../services/api';
import { getImageUrl } from '../../utils/imageUrl';

/* ═══════════════════════ FORMATIONS ═══════════════════════ */
const RAW_FORMATIONS = {
  '4-3-3': [
    ['GK','GK','GK',50,91], ['LB','LB','DEF',12,68], ['CB1','CB','DEF',36,72],
    ['CB2','CB','DEF',64,72], ['RB','RB','DEF',88,68],
    ['CDM','CDM','MID',50,56], ['CM1','CM','MID',28,44], ['CM2','CM','MID',72,44],
    ['LW','LW','FWD',16,20], ['ST','ST','FWD',50,12], ['RW','RW','FWD',84,20],
  ],
  '4-4-2': [
    ['GK','GK','GK',50,91], ['LB','LB','DEF',12,70], ['CB1','CB','DEF',36,74],
    ['CB2','CB','DEF',64,74], ['RB','RB','DEF',88,70],
    ['LM','LM','MID',13,48], ['CM1','CM','MID',38,53], ['CM2','CM','MID',62,53], ['RM','RM','MID',87,48],
    ['ST1','ST','FWD',37,17], ['ST2','ST','FWD',63,17],
  ],
  '4-2-3-1': [
    ['GK','GK','GK',50,91], ['LB','LB','DEF',12,70], ['CB1','CB','DEF',36,74],
    ['CB2','CB','DEF',64,74], ['RB','RB','DEF',88,70],
    ['CDM1','CDM','MID',35,59], ['CDM2','CDM','MID',65,59],
    ['LW','LW','FWD',16,33], ['CAM','CAM','MID',50,30], ['RW','RW','FWD',84,33],
    ['ST','ST','FWD',50,11],
  ],
  '4-3-2-1': [
    ['GK','GK','GK',50,91], ['LB','LB','DEF',12,70], ['CB1','CB','DEF',36,74],
    ['CB2','CB','DEF',64,74], ['RB','RB','DEF',88,70],
    ['CDM','CDM','MID',50,60], ['CM1','CM','MID',28,49], ['CM2','CM','MID',72,49],
    ['LW1','LW','FWD',32,27], ['RW1','RW','FWD',68,27],
    ['ST','ST','FWD',50,11],
  ],
  '3-5-2': [
    ['GK','GK','GK',50,91], ['CB1','CB','DEF',28,73], ['CB2','CB','DEF',50,76], ['CB3','CB','DEF',72,73],
    ['LM','LM','MID',11,52], ['CM1','CM','MID',33,57], ['CAM','CAM','MID',50,43],
    ['CM2','CM','MID',67,57], ['RM','RM','MID',89,52],
    ['ST1','ST','FWD',39,16], ['ST2','ST','FWD',61,16],
  ],
  '3-4-3': [
    ['GK','GK','GK',50,91], ['CB1','CB','DEF',28,73], ['CB2','CB','DEF',50,76], ['CB3','CB','DEF',72,73],
    ['LM','LM','MID',12,54], ['CM1','CM','MID',38,55], ['CM2','CM','MID',62,55], ['RM','RM','MID',88,54],
    ['LW','LW','FWD',18,22], ['ST','ST','FWD',50,14], ['RW','RW','FWD',82,22],
  ],
  '5-3-2': [
    ['GK','GK','GK',50,91], ['LWB','LWB','DEF',9,62], ['CB1','CB','DEF',29,75],
    ['CB2','CB','DEF',50,78], ['CB3','CB','DEF',71,75], ['RWB','RWB','DEF',91,62],
    ['CM1','CM','MID',30,50], ['CM2','CM','MID',50,55], ['CM3','CM','MID',70,50],
    ['ST1','ST','FWD',39,18], ['ST2','ST','FWD',61,18],
  ],
  '5-4-1': [
    ['GK','GK','GK',50,91], ['LWB','LWB','DEF',9,63], ['CB1','CB','DEF',29,76],
    ['CB2','CB','DEF',50,79], ['CB3','CB','DEF',71,76], ['RWB','RWB','DEF',91,63],
    ['LM','LM','MID',14,47], ['CM1','CM','MID',38,51], ['CM2','CM','MID',62,51], ['RM','RM','MID',86,47],
    ['ST','ST','FWD',50,15],
  ],
};

const FORMATIONS = Object.fromEntries(
  Object.entries(RAW_FORMATIONS).map(([key, rows]) => [
    key,
    rows.map(([id, label, group, x, y]) => ({ id, label, group, x, y })),
  ])
);
/* ═══════════════════════ POSITION / FIT SYSTEM ═══════════════════════ */
const normalizePos = (pos = '') =>
  String(pos).toUpperCase().replace(/[^A-Z]/g, '')
    .replace('GOALKEEPER', 'GK').replace('DEFENDER', 'DEF').replace('MIDFIELDER', 'MID')
    .replace('FORWARD', 'FW').replace('STRIKER', 'ST');

const POSITION_GROUP_MAP = {
  GK: 'GK',
  CB: 'DEF', LB: 'DEF', RB: 'DEF', LWB: 'DEF', RWB: 'DEF',
  CDM: 'MID', CM: 'MID', CAM: 'MID', LM: 'MID', RM: 'MID',
  ST: 'FWD', LW: 'FWD', RW: 'FWD', CF: 'FWD',
};

const GROUP_OF = (pos) => POSITION_GROUP_MAP[normalizePos(pos)] || 'MID';

const playerPosSet = (p) => {
  const set = new Set();
  if (p?.primaryPosition) {
    const n = normalizePos(p.primaryPosition);
    if (n) set.add(n);
  }
  (p?.positions || []).forEach(pos => {
    const n = normalizePos(pos);
    if (n) set.add(n);
  });
  return set;
};

// Fit of a player into a slot label: PRIMARY(100) → SECONDARY/GROUP(90) → MISMATCH(-14)
const fitFor = (player, slotLabel, slotGroup) => {
  const codes = [...playerPosSet(player)];
  const primary = normalizePos(player.primaryPosition);
  if (codes.includes(slotLabel)) {
    return primary === slotLabel ? { kind: 'PRIMARY', pct: 100 } : { kind: 'SECONDARY', pct: 90 };
  }
  const group = GROUP_OF(primary || codes[0]);
  const sameGroup = codes.some(c => GROUP_OF(c) === slotGroup) || group === slotGroup;
  if (sameGroup) return { kind: 'GROUP', pct: 90 };
  return { kind: 'MISMATCH', pct: 0, delta: -14 };
};

const effRating = (player, slot) => {
  const r = ratingOf(player);
  const fit = fitFor(player, slot.label, slot.group);
  return fit.kind === 'MISMATCH' ? r + fit.delta : Math.round((r * fit.pct) / 100);
};

const ratingOf = (p) => Math.min(99, Math.max(55, 62 + Math.round((p.finalPrice || 0) / 300000)));
const fmtMoney = (v) => `৳${Number(v || 0).toLocaleString('en-IN')}`;
const fmtLakh = (v) => `${(Number(v || 0) / 100000).toFixed(0)} Lakh`;

/* Chemistry: fit quality + line completeness. 40–99 */
const calcChemistry = (slots, assignment) => {
  let pts = 55;
  let primaries = 0, secondaries = 0, mismatches = 0;
  slots.forEach(slot => {
    const p = assignment[slot.id];
    if (!p) return;
    const fit = fitFor(p, slot.label, slot.group);
    if (fit.kind === 'PRIMARY') { primaries++; pts += 4; }
    else if (fit.kind === 'SECONDARY' || fit.kind === 'GROUP') { secondaries++; pts += 2; }
    else { mismatches++; pts -= 3; }
  });
  const groupsFilled = { GK: false, DEF: false, MID: false, FWD: false };
  slots.forEach(slot => { if (assignment[slot.id]) groupsFilled[slot.group] = true; });
  Object.values(groupsFilled).forEach(filled => { if (filled) pts += 4; });
  if (mismatches === 0 && primaries >= 7) pts += 6;
  return Math.max(40, Math.min(99, pts));
};

/* Collective strength = Σ(effective rating × 3) + chemistry bonus */
const calcStrength = (slots, assignment, chemistry) => {
  let sum = 0;
  slots.forEach(slot => {
    const p = assignment[slot.id];
    if (!p) return;
    sum += effRating(p, slot);
  });
  return Math.round(sum * 3 + chemistry * 3);
};

export default function ManagerMyTeamView() {
  const { triggerToast } = useAuction();

  const [roster, setRoster] = useState([]);
  const [teamName, setTeamName] = useState('');
  const [teamLogoUrl, setTeamLogoUrl] = useState('');
  const [budgetRemaining, setBudgetRemaining] = useState(0);
  const [formation, setFormation] = useState('4-3-3');
  const [assignment, setAssignment] = useState({});       // slotId -> player (STARTING XI)
  const [substitutes, setSubstitutes] = useState([]);      // array of players (max rules.maxSubstitutes)
  const [rules, setRules] = useState({ maxSquadSize: 23, startingXI: 11, maxSubstitutes: 7, goalkeeperRequired: 1 });
  const [savedStrength, setSavedStrength] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [dragging, setDragging] = useState(null);          // { playerId, from: 'POOL'|'XI'|'SUB' }
  const [hoverTarget, setHoverTarget] = useState(null);    // slotId | 'SUBS'
  const [pickedPlayerId, setPickedPlayerId] = useState(null);
  const [pickedFrom, setPickedFrom] = useState(null);
  const [highlightSlot, setHighlightSlot] = useState(null); // locate-on-pitch pulse

  const [replaceModal, setReplaceModal] = useState(null);  // { slotId, current, incoming }
  const [showResetModal, setShowResetModal] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState('HIGH');
  const prevStrengthRef = useRef(null);

  const slots = FORMATIONS[formation];

  /* ── Load ───────────────────────────────────────────────────────────── */
    // Wrap interaction handlers so an unexpected edge-case can never take down
  // the whole page (errors are logged instead).
  const safe = (fn) => (...args) => {
    try { return fn(...args); } catch (err) { console.error('[SquadBuilder]', err); }
  };
useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const rosterRes = await managerAPI.getRoster();
        const data = rosterRes?.data || {};
        if (!alive) return;
        setRoster(Array.isArray(data.players) ? data.players : []);
        setTeamName(data.team?.name || '');
        setBudgetRemaining(data.team?.remainingBudget || 0);
        try {
          const res = await managerAPI.getLineup();
          const saved = res?.data;
          if (!alive || !saved) return;
          if (saved.rules) setRules(saved.rules);
          if (saved.formation && FORMATIONS[saved.formation]) setFormation(saved.formation);
          const byId = Object.fromEntries((data.players || []).map(p => [String(p._id), p]));
          const map = {};
          (saved.lineup || []).forEach(l => {
            const pl = byId[String(l.playerId)];
            if (pl) map[l.slot] = pl;
          });
          setAssignment(map);
          setSavedStrength(saved.collectiveStrength || null);
        } catch { /* optional endpoint */ }
      } catch {
        if (alive) triggerToast('Failed to load your squad.', 'error');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Derived squad state ────────────────────────────────────────────── */
  const inUseIds = useMemo(() => {
    const s = new Set(Object.values(assignment).map(p => String(p._id)));
    return s;
  }, [assignment]);

  const pool = useMemo(() => roster.filter(p => !inUseIds.has(String(p._id))), [roster, inUseIds]);
  const xiPlayers = slots.map(s => assignment[s.id]).filter(Boolean);
  const selectedCount = xiPlayers.length;

  const chemistry = useMemo(() => calcChemistry(slots, assignment), [slots, assignment]);
  const strength = useMemo(() => calcStrength(slots, assignment, chemistry), [slots, assignment, chemistry]);
  const strengthDelta = savedStrength != null ? strength - savedStrength : null;

  const gkCount = useMemo(() => xiPlayers.filter(p => GROUP_OF(p.primaryPosition) === 'GK' ||
    (assignment[slots.find(s => s.group === 'GK')?.id]?.['_id'] &&
      slots.find(s => s.group === 'GK') && assignment[slots.find(s => s.group === 'GK').id] === p)).length, [xiPlayers, assignment, slots]);

  const warnings = useMemo(() => {
    const list = [];
    const gkSlotIds = slots.filter(s => s.group === 'GK').map(s => s.id);
    const gkPlaced = gkSlotIds.filter(id => assignment[id]).length;
    return list;
  }, [slots, assignment, rules, selectedCount]);

  const groupAvg = useCallback((group) => {
    const vals = Object.entries(assignment)
      .filter(([slotId]) => slots.find(s => s.id === slotId)?.group === group)
      .map(([, p]) => ratingOf(p));
    if (!vals.length) return 0;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  }, [assignment, slots]);

  const avgRating = selectedCount ? Math.round(xiPlayers.reduce((a, p) => a + ratingOf(p), 0) / selectedCount) : 0;
  const totalValue = xiPlayers.reduce((a, p) => a + (p.finalPrice || 0), 0);
  const xiReady = selectedCount === (rules.startingXI || 11);

  /* ── Filters ────────────────────────────────────────────────────────── */
  const [query, setQuery] = useState('');
  const [posFilter, setPosFilter] = useState('ALL');
  const filteredPool = useMemo(() => {
    let list = pool.filter(p => {
      const q = query.trim().toLowerCase();
      const okQ = !q || String(p.name || '').toLowerCase().includes(q) || String(p.jerseyName || '').toLowerCase().includes(q);
      const okPos = posFilter === 'ALL' || GROUP_OF(p.primaryPosition) === posFilter;
      const price = p.finalPrice || 0;
      const okMin = minPrice === '' || price >= Number(minPrice) * 100000;
      const okMax = maxPrice === '' || price <= Number(maxPrice) * 100000;
      return okQ && okPos && okMin && okMax;
    });
    list = [...list].sort((a, b) => sortBy === 'LOW' ? (a.finalPrice || 0) - (b.finalPrice || 0) : (b.finalPrice || 0) - (a.finalPrice || 0));
    return list;
  }, [pool, query, posFilter, minPrice, maxPrice, sortBy]);

  // Placement core — pure state moves; occupied targets raise the REPLACE dialog
  const placeInSlot = (slotId, player, opts = {}) => {
    const occupant = assignment[slotId];
    if (occupant && !opts.allowSwap && !opts.confirmed) {
      setReplaceModal({ slotId, current: occupant, incoming: player });
      return;
    }
    setAssignment(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => { if (k !== slotId && String(next[k]._id) === String(player._id)) delete next[k]; });
      const current = next[slotId];
      next[slotId] = player;
      if (current && opts.sourceSlot && opts.sourceSlot !== slotId) next[opts.sourceSlot] = current;
      return next;
    });
    setDragging(null); setHoverTarget(null); setPickedPlayerId(null); setPickedFrom(null);
  };

  

  
  
  /* ── Interactions ───────────────────────────────────────────────────── */
  const startDragRaw = (e, player, source, fromSlot = null) => {
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', String(player._id)); } catch { /* legacy */ }
    setDragging({ playerId: String(player._id), source, fromSlot });
  };
  const endDragRaw = () => { setDragging(null); setHoverTarget(null); };
  const allowDropRaw = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };

  const dropOnSlotRaw = (e, slotId) => {
    e.preventDefault();
    if (!dragging) return;
    const player = roster.find(p => String(p._id) === dragging.playerId);
    if (!player) return;
    const occupant = assignment[slotId];
    const isXISwap = dragging.source === 'XI' && occupant;
    placeInSlot(slotId, player, { allowSwap: isXISwap, sourceSlot: dragging.source === 'XI' ? dragging.fromSlot || slotId : null, confirmed: true });
    if (!isXISwap && dragging.source === 'XI') removeFromSlotIfEmpty(dragging.fromSlot);
  };

  const removeFromSlotIfEmpty = (slotId) => {
    if (!slotId) return;
    setAssignment(prev => { const n = { ...prev }; delete n[slotId]; return n; });
  };

  
  // Tap-to-place
  const tapEntityRaw = (player, source, fromSlot = null) => {
    if (pickedPlayerId === String(player._id)) { setPickedPlayerId(null); setPickedFrom(null); return; }
    setPickedPlayerId(String(player._id)); setPickedFrom({ source, fromSlot });
  };
  const tapSlotPlaceRaw = (slotId) => {
    if (!pickedPlayerId) return;
    const player = roster.find(p => String(p._id) === pickedPlayerId);
    if (!player) return;
    const occupant = assignment[slotId];
    if (occupant) {
      setReplaceModal({ slotId, current: occupant, incoming: player });
      return;
    }
    placeInSlot(slotId, player, { confirmed: true, sourceSlot: pickedFrom?.fromSlot });
  };

  const startDrag = safe(startDragRaw);
  const endDrag = safe(endDragRaw);
  const allowDrop = safe(allowDropRaw);
  const dropOnSlot = safe(dropOnSlotRaw);
  const tapEntity = safe(tapEntityRaw);
  const tapSlotPlace = safe(tapSlotPlaceRaw);

  const confirmReplace = () => {
    if (!replaceModal) return;
    const { slotId, incoming, current } = replaceModal;
    // current goes back to the player pool
    setAssignment(prev => { const n = { ...prev }; delete n[slotId]; return n; });
    placeInSlot(slotId, incoming, { confirmed: true });
    setReplaceModal(null);
  };

  /* ── Actions ────────────────────────────────────────────────────────── */
  const autoPickXI = () => {
    setAssignment(prev => {
      const next = { ...prev };
      const used = new Set(Object.values(next).map(p => String(p._id)));
      const available = roster.filter(p => !used.has(String(p._id)));
      // GK first for rule safety
      const ordered = [...slots].sort((a, b) => (a.group === 'GK' ? -1 : b.group === 'GK' ? 1 : 0));
      ordered.forEach(slot => {
        if (next[slot.id]) return;
        const exact = available.filter(p => playerPosSet(p).has(slot.label));
        const sameGroup = available.filter(p => GROUP_OF(p.primaryPosition) === slot.group);
        const pick = exact.sort((a, b) => ratingOf(b) - ratingOf(a))[0]
          || sameGroup.sort((a, b) => ratingOf(b) - ratingOf(a))[0]
          || available.sort((a, b) => ratingOf(b) - ratingOf(a))[0];
        if (pick) { next[slot.id] = pick; available.splice(available.indexOf(pick), 1); }
      });
      return next;
    });
    triggerToast('⚡ BEST XI SELECTED', 'success');
  };

  const resetSquad = () => {
    setAssignment({});
    setPickedPlayerId(null); setPickedFrom(null);
    setShowResetModal(false);
    triggerToast('Squad reset.', 'info');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const lineup = Object.entries(assignment).map(([slot, p]) => ({ slot, playerId: p._id }));
      await managerAPI.saveLineup({ formation, lineup, chemistry, collectiveStrength: strength });
      setSavedStrength(strength);
      triggerToast('✓ Squad saved successfully', 'success');
    } catch {
      triggerToast('Failed to save squad.', 'error');
    } finally {
      setSaving(false);
    }
  };

  /* ── Pitch chip component ───────────────────────────────────────────── */
  const PitchCard = ({ slot }) => {
    const player = assignment[slot.id];
    const isHover = hoverTarget === slot.id && !!dragging;
    const isHighlighted = highlightSlot === slot.id;
    const compat = dragging
      ? (() => { const d = roster.find(x => String(x._id) === dragging.playerId); return d ? fitFor(d, slot.label, slot.group) : null; })()
      : null;
    const dimmed = pickedPlayerId ? (() => {
      const d = roster.find(x => String(x._id) === pickedPlayerId);
      return d ? !(fitFor(d, slot.label, slot.group).kind !== 'MISMATCH') : false;
    })() : false;

    if (!player) {
      return (
        <div role="button" tabIndex={0}
          onClick={() => tapSlotPlace(slot.id)}
          onDragOver={allowDrop}
          onDragEnter={() => setHoverTarget(slot.id)}
          onDragLeave={() => setHoverTarget(t => (t === slot.id ? null : t))}
          onDrop={(e) => dropOnSlot(e, slot.id)}
          className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center transition-all duration-200 ${dimmed ? 'opacity-25' : ''}`}
          style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
        >
          <span className={`w-11 h-11 sm:w-13 sm:h-13 sm:w-[52px] sm:h-[52px] rounded-xl border-2 border-dashed flex items-center justify-center backdrop-blur-sm ${
            isHover
              ? (compat && compat.kind !== 'MISMATCH' ? 'border-emerald-400 bg-emerald-400/25 scale-110 shadow-[0_0_20px_rgba(52,211,153,0.5)]'
                 : compat ? 'border-amber-400 bg-amber-400/20 scale-110' : 'border-slate-300 bg-white/15 scale-110')
              : pickedPlayerId ? 'border-sky-400 bg-sky-400/10 animate-pulse' : 'border-white/35 bg-black/40'
          }`}>
            <span className="text-[10px] font-black text-white/85">{slot.label}</span>
          </span>
        </div>
      );
    }

    const fit = fitFor(player, slot.label, slot.group);
    const r = effRating(player, slot);

    return (
      <div
        draggable
        onDragStart={(e) => startDrag(e, player, 'XI', slot.id)}
        onDragEnd={endDrag}
        onDragOver={allowDrop}
        onDragEnter={() => setHoverTarget(slot.id)}
        onDragLeave={() => setHoverTarget(t => (t === slot.id ? null : t))}
        onDrop={(e) => dropOnSlot(e, slot.id)}
        onClick={() => tapEntity(player, 'XI', slot.id)}
        title={`${fit.kind === 'MISMATCH' ? `POSITION MISMATCH — ${fit.delta}` : `POSITION FIT ${fit.pct}%`}`}
        className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center cursor-grab active:cursor-grabbing select-none z-10 ${dimmed ? 'opacity-25' : ''} ${
          dragging?.playerId === String(player._id) ? 'opacity-30 scale-95' : ''
        } ${isHighlighted ? 'animate-bounce drop-shadow-[0_0_12px_rgba(52,211,153,0.9)]' : ''}`}
        style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
      >
        <div className={`relative w-12 sm:w-[54px] rounded-lg overflow-hidden border-2 bg-[#101720]/90 transition-all duration-200 ${
          isHover ? 'scale-110 border-red-400' : pickedPlayerId === String(player._id) ? 'border-sky-400 scale-105' : 'border-white/70'
        }`}>
          {player.imageUrl ? (
            <img src={getImageUrl(player.imageUrl)} alt="" draggable={false} className="w-full aspect-square object-cover pointer-events-none" />
          ) : (
            <div className="w-full aspect-square flex items-center justify-center text-white font-black text-base">
              {(player.jerseyName || player.name || '?')[0]}
            </div>
          )}
          <span className="absolute top-0 left-0 px-1 bg-black/70 text-[9px] font-black text-emerald-300">{r}</span>
          <button
            onClick={(e) => { e.stopPropagation(); removeFromSlotIfEmpty(slot.id); }}
            title="Remove from pitch"
            className="hidden absolute top-0 right-0 w-4 h-4 bg-red-500 text-white items-center justify-center hover:bg-red-400 sm:flex"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        </div>
        <span className="mt-0.5 px-1 rounded bg-black/65 border border-white/15 text-[8px] font-bold text-white whitespace-nowrap max-w-[88px] truncate">
          {(player.jerseyName || player.name || '').toUpperCase()}
        </span>
        <span className={`text-[8px] font-mono font-black uppercase ${fit.kind === 'MISMATCH' ? 'text-amber-400' : 'text-sky-300'}`}>
          {player.primaryPosition || slot.label}
        </span>
      </div>
    );
  };

  const PoolCard = ({ p }) => {
    const picked = pickedPlayerId === String(p._id);
    const r = ratingOf(p);
    return (
      <div
        draggable
        onDragStart={(e) => startDrag(e, p, 'POOL')}
        onDragEnd={endDrag}
        onClick={() => tapEntity(p, 'POOL')}
        className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-grab active:cursor-grabbing select-none transition-colors ${
          picked ? 'bg-sky-500/10 border-sky-400' : 'bg-[#141C26] border-[#26313D] hover:border-sky-400/60 hover:bg-white/[0.03]'
        }`}
      >
        {p.imageUrl ? (
          <img src={getImageUrl(p.imageUrl)} alt="" draggable={false} className="w-10 h-10 rounded-lg object-cover border border-white/10 shrink-0" />
        ) : (
          <span className="w-10 h-10 rounded-lg bg-[#0B2B26] border border-white/10 flex items-center justify-center font-black text-white text-xs shrink-0">
            {(p.jerseyName || p.name || '?')[0]}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-white truncate">{p.name}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="px-1.5 py-px rounded bg-white/[0.06] border border-white/10 text-[9px] font-black uppercase text-secondaryText">{normalizePos(p.primaryPosition)}</span>
            <span className="text-[9px] text-mutedText font-mono">#{p.studentId || p.jerseyNumber || '—'}</span>
            <span className="inline-flex items-center gap-1 text-[8px] font-bold text-emerald-400"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />AVAILABLE</span>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <span className="block w-8 h-8 rounded-lg bg-white/[0.06] border border-white/10 flex items-center justify-center text-[11px] font-black text-white">{r}</span>
          <span className="text-[9px] text-mutedText font-mono">{fmtLakh(p.finalPrice)}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#070A0F] text-primaryText pb-24">
      {/* ── Page Header with team identity ── */}
      <header className="bg-[#0A0F16] border-b border-[#26313D]">
        <div className="max-w-[1500px] mx-auto px-4 py-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3 mr-auto">
            {teamLogoUrl ? (
              <img src={teamLogoUrl} alt="" className="w-11 h-11 rounded-xl object-cover border border-[#26313D]" />
            ) : (
              <span className="w-11 h-11 rounded-xl bg-[#0B2B26] border border-[#26313D] flex items-center justify-center text-white font-black">⚽</span>
            )}
            <div>
              <h1 className="text-lg sm:text-xl font-black font-heading tracking-wide text-white leading-none">SQUAD BUILDER</h1>
              <p className="text-[11px] text-secondaryText mt-0.5">Build your ultimate squad{teamName ? ` — ${teamName}` : ''}</p>
            </div>
          </div>

          {/* Formation selector */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-widest text-secondaryText font-bold hidden sm:block">Formation</span>
            <select
              value={formation}
              onChange={(e) => {
                const f = e.target.value; setFormation(f);
                setAssignment(prev => {
                  const valid = new Set(FORMATIONS[f].map(s => s.id));
                  const next = {}; Object.entries(prev).forEach(([s, p]) => { if (valid.has(s)) next[s] = p; });
                  return next;
                });
              }}
              className="bg-[#101720] border border-[#26313D] rounded-xl px-3 py-2 text-xs font-black text-white cursor-pointer"
            >
              {Object.keys(FORMATIONS).map(f => <option key={f} value={f}>{f}</option>)}
            </select>

            {/* Collective Strength */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#101720] border border-[#26313D]">
              <Zap className="w-4 h-4 text-sky-400" />
              <div className="leading-none">
                <p className="text-[8px] uppercase tracking-widest text-secondaryText font-bold">Collective</p>
                <div className="flex items-center gap-1.5">
                  <span className="text-lg font-black text-white">{strength}</span>
                  {strengthDelta != null && strengthDelta !== 0 && (
                    <span className={`text-[10px] font-black flex items-center ${strengthDelta > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {strengthDelta > 0 ? '+' : ''}{strengthDelta} <ArrowUp className={`w-2.5 h-2.5 ${strengthDelta < 0 ? 'rotate-180' : ''}`} />
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── Status strip: warnings only ── */}
      <div className="max-w-[1500px] mx-auto px-4 pt-4 space-y-2">
        {warnings.map((w, i) => (
          <p key={i} className="text-[11px] font-semibold text-amber-400 flex items-start gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-px" /> {w}
          </p>
        ))}
      </div>

      {/* ── 3-column body ── */}
      <main className="max-w-[1500px] mx-auto px-4 pt-4 grid grid-cols-1 lg:grid-cols-[290px_minmax(0,1fr)_300px] xl:grid-cols-[310px_minmax(0,1fr)_320px] gap-4">

        {/* PLAYER POOL */}
        <section className="order-2 lg:order-1 bg-[#101720]/80 border border-[#26313D] rounded-2xl overflow-hidden flex flex-col lg:max-h-[calc(100vh-210px)] lg:sticky lg:top-4">
          <div className="p-4 border-b border-[#26313D] space-y-3">
            <h2 className="flex items-center justify-between text-xs font-black uppercase tracking-widest text-white">
              <span className="flex items-center gap-2"><Users className="w-4 h-4 text-sky-400" /> Player Pool</span>
              <span className="text-[10px] text-secondaryText normal-case font-bold">{roster.length} Players</span>
            </h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-mutedText pointer-events-none" />
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search Players..."
                className="w-full rounded-xl bg-[#0B1118] border border-[#26313D] pl-9 pr-3 py-2 text-xs text-white placeholder:text-mutedText focus:border-sky-400/60 outline-none" />
            </div>
            <div className="flex items-center gap-2">
              <select value={posFilter} onChange={e => setPosFilter(e.target.value)}
                className="flex-1 rounded-xl bg-[#0B1118] border border-[#26313D] px-2.5 py-2 text-xs font-bold text-white cursor-pointer outline-none">
                <option value="ALL">All Roles</option>
                <option value="GK">Goalkeeper</option>
                <option value="DEF">Defender</option>
                <option value="MID">Midfielder</option>
                <option value="FWD">Forward</option>
              </select>
              <button onClick={() => setShowFilterPanel(v => !v)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold border transition ${
                  showFilterPanel ? 'bg-sky-500/15 border-sky-400 text-white' : 'bg-[#0B1118] border-[#26313D] text-secondaryText hover:text-white'
                }`}>
                <SlidersHorizontal className="w-3.5 h-3.5" /> FILTER
              </button>
            </div>

            <AnimatePresence>
              {showFilterPanel && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="pt-1 space-y-2">
                    <div className="flex gap-2">
                      <input type="number" value={minPrice} onChange={e => setMinPrice(e.target.value)} placeholder="MIN (Lakh)"
                        className="w-full rounded-lg bg-[#0B1118] border border-[#26313D] px-2.5 py-1.5 text-[11px] text-white outline-none" />
                      <input type="number" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} placeholder="MAX (Lakh)"
                        className="w-full rounded-lg bg-[#0B1118] border border-[#26313D] px-2.5 py-1.5 text-[11px] text-white outline-none" />
                    </div>
                    <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                      className="w-full rounded-lg bg-[#0B1118] border border-[#26313D] px-2.5 py-1.5 text-[11px] font-bold text-white outline-none">
                      <option value="HIGH">Highest to Lowest</option>
                      <option value="LOW">Lowest to Highest</option>
                    </select>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Quick chips */}
            <div className="flex gap-1.5">
              {['ALL', 'GK', 'DEF', 'MID', 'FWD'].map(g => (
                <button key={g} onClick={() => setPosFilter(g)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase border transition ${
                    posFilter === g ? 'bg-sky-500/15 border-sky-400 text-white' : 'border-[#26313D] text-secondaryText hover:text-white'
                  }`}>{g === 'ALL' ? 'All' : g}</button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2 min-h-[200px]">
            {loading ? (
              <p className="py-14 text-center text-mutedText text-xs">Loading acquired players…</p>
            ) : filteredPool.length === 0 ? (
              <p className="py-14 text-center text-mutedText text-xs">
                {pool.length === 0 ? 'Every acquired player is in the squad.' : 'No players match these filters.'}
              </p>
            ) : filteredPool.map(p => <PoolCard key={p._id} p={p} />)}
          </div>
        </section>

        {/* PITCH */}
        <section className="order-1 lg:order-2 flex flex-col items-center gap-4">
          <div
            onDragLeave={() => setHoverTarget(null)}
            className="relative w-full max-w-[520px] aspect-[68/100] rounded-2xl overflow-hidden border border-[#26313D] shadow-[0_25px_60px_rgba(0,0,0,0.55)]"
            style={{
              background:
                'repeating-linear-gradient(90deg, rgba(255,255,255,0.026) 0 6.25%, transparent 6.25% 12.5%), linear-gradient(180deg, #0f3a2c 0%, #0B2B26 46%, #08201a 100%)',
            }}
          >
            {(() => {
              const M = ({ style, extra }) => <div className={`absolute border border-white/20 pointer-events-none ${extra || ''}`} style={style} />;
              return (
                <>
                  <M style={{ inset: '2.5%' }} />
                  <M style={{ left: '2.5%', right: '2.5%', top: '50%' }} extra="border-t" />
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[24%] aspect-square rounded-full border border-white/20 pointer-events-none" />
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white/40 pointer-events-none" />
                  <M style={{ bottom: '2.5%', left: '50%', transform: 'translateX(-50%)', width: '58%', height: '16%' }} />
                  <M style={{ bottom: '2.5%', left: '50%', transform: 'translateX(-50%)', width: '28%', height: '7%' }} />
                  <div className="absolute bottom-[14.5%] left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-white/40 pointer-events-none" />
                  <div className="absolute bottom-[18.5%] left-1/2 -translate-x-1/2 w-[18%] h-[9%] border border-white/20 border-b-0 rounded-t-full pointer-events-none" />
                  <M style={{ top: '2.5%', left: '50%', transform: 'translateX(-50%)', width: '58%', height: '16%' }} />
                  <M style={{ top: '2.5%', left: '50%', transform: 'translateX(-50%)', width: '28%', height: '7%' }} />
                  <div className="absolute top-[14.5%] left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-white/40 pointer-events-none" />
                  <div className="absolute top-[18.5%] left-1/2 -translate-x-1/2 w-[18%] h-[9%] border border-white/20 border-t-0 rounded-b-full pointer-events-none" />
                  {/* subtle dark overlay for theme integration */}
                  <div className="absolute inset-0 bg-gradient-to-b from-[#070A0F]/30 via-transparent to-[#070A0F]/45 pointer-events-none" />
                </>
              );
            })()}

            {slots.map(slot => <PitchCard key={`${formation}-${slot.id}`} slot={slot} />)}
          </div>

          
        </section>

        {/* SQUAD SUMMARY */}
        <section className="order-3 space-y-4">
          <div className="bg-[#101720]/80 border border-[#26313D] rounded-2xl p-4 space-y-2.5">
            <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-white">
              <BarChart3 className="w-4 h-4 text-sky-400" /> Squad Summary
            </h2>
            {[
              { l: 'Starting XI', v: `${selectedCount} / ${rules.startingXI}` },

              { l: 'Total Squad', v: `${selectedCount} / ${rules.maxSquadSize}` },
              { l: 'Budget Remaining', v: fmtMoney(budgetRemaining), icon: Wallet },
            ].map(row => {
              const Icon = row.icon;
              return (
                <div key={row.l} className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#0B1118] border border-[#26313D] text-xs">
                  <span className="text-secondaryText font-semibold flex items-center gap-1.5">{Icon && <Icon className="w-3.5 h-3.5 text-sky-400" />}{row.l}</span>
                  <span className="font-black text-white">{row.v}</span>
                </div>
              );
            })}
          </div>

          {/* Team stats */}
          <div className="bg-[#101720]/80 border border-[#26313D] rounded-2xl p-4 space-y-3">
            <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-white">
              <Trophy className="w-4 h-4 text-sky-400" /> Team Stats
            </h2>
            {[
              { l: 'ATTACK', v: groupAvg('FWD') },
              { l: 'MIDFIELD', v: groupAvg('MID') },
              { l: 'DEFENSE', v: groupAvg('DEF') },
              { l: 'GOALKEEPING', v: groupAvg('GK') },
            ].map(row => (
              <div key={row.l}>
                <div className="flex justify-between text-[10px] font-black mb-1">
                  <span className="text-secondaryText uppercase tracking-wider">{row.l}</span>
                  <span className="text-white">{row.v || '—'}</span>
                </div>
                <div className="h-1.5 rounded-full bg-[#0B1118] overflow-hidden border border-[#26313D]">
                  <motion.div className="h-full rounded-full bg-gradient-to-r from-[#14532d] to-emerald-400"
                    animate={{ width: `${row.v}%` }} transition={{ duration: 0.25 }} />
                </div>
              </div>
            ))}
            <div className="pt-1 space-y-2">
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#0B1118] border border-[#26313D] text-xs">
                <span className="text-secondaryText font-semibold">Average Rating</span>
                <span className="font-black text-white">{avgRating || '—'}</span>
              </div>
              <div>
                <div className="flex justify-between text-[10px] font-black mb-1">
                  <span className="text-secondaryText uppercase tracking-wider">TEAM CHEMISTRY</span>
                  <span className="text-white">{chemistry}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-[#0B1118] overflow-hidden border border-[#26313D]">
                  <motion.div className="h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-400"
                    animate={{ width: `${chemistry}%` }} transition={{ duration: 0.25 }} />
                </div>
              </div>
            </div>
          </div>

          {/* Starting XI list */}
          <div className="bg-[#101720]/80 border border-[#26313D] rounded-2xl overflow-hidden">
            <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-white p-4 pb-2">
              <Shirt className="w-4 h-4 text-sky-400" /> Squad List
            </h2>
            <div className="px-2 pb-2 max-h-[280px] overflow-y-auto custom-scrollbar space-y-1.5">
              {selectedCount === 0 ? (
                <p className="text-center text-mutedText text-[11px] py-6">No players placed yet.</p>
              ) : (
                <AnimatePresence initial={false}>
                  {xiPlayers.map(p => {
                    const slotEntry = Object.entries(assignment).find(([, pl]) => String(pl._id) === String(p._id));
                    const slotObj = slots.find(s => s.id === slotEntry?.[0]);
                    return (
                      <motion.div key={String(p._id)} layout
                        initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}
                        onClick={() => { if (slotEntry) { setHighlightSlot(slotEntry[0]); setTimeout(() => setHighlightSlot(null), 1400); } }}
                        className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl bg-[#0B1118] border border-[#26313D] hover:border-sky-400/50 cursor-pointer">
                        {p.imageUrl ? (
                          <img src={getImageUrl(p.imageUrl)} alt="" className="w-8 h-8 rounded-lg object-cover border border-white/10 shrink-0" />
                        ) : (
                          <span className="w-8 h-8 rounded-lg bg-[#0B2B26] border border-white/10 flex items-center justify-center text-[10px] font-black text-white shrink-0">
                            {(p.jerseyName || p.name || '?')[0]}
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-bold text-white truncate">{p.name}</p>
                          <p className="text-[9px] text-secondaryText font-mono uppercase">{normalizePos(p.primaryPosition)} · {slotObj?.label || ''}</p>
                        </div>
                        <span className="text-[11px] font-black text-white shrink-0">{ratingOf(p)}</span>
                        <button onClick={(e) => { e.stopPropagation(); removeFromSlotIfEmpty(slotEntry[0]); }}
                          title="Remove"
                          className="shrink-0 w-6 h-6 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/20 flex items-center justify-center transition">
                          <X className="w-3 h-3" />
                        </button>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* ── Bottom actions ── */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-[#0A0F16]/95 backdrop-blur-xl border-t border-[#26313D]">
        <div className="max-w-[1500px] mx-auto px-4 py-3 flex items-center justify-end gap-2.5">
          <button type="button" onClick={autoPickXI} disabled={loading}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-sky-400/40 text-white text-[11px] font-extrabold uppercase tracking-wide hover:bg-sky-500/10 disabled:opacity-50 transition">
            <Zap className="w-3.5 h-3.5 text-sky-400" /> Auto Pick XI
          </button>
          <button type="button" onClick={() => setShowResetModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#26313D] bg-[#101720] text-white text-[11px] font-extrabold uppercase tracking-wide hover:border-white/30 transition">
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
          <button type="button" onClick={handleSave} disabled={saving || loading}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-sky-500 text-[#04121f] text-xs font-black uppercase tracking-wide hover:brightness-110 active:scale-95 disabled:opacity-50 transition">
            {saving ? <span className="w-3.5 h-3.5 border-2 border-[#04121f] border-t-transparent rounded-full animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save Squad
          </button>
        </div>
      </div>

      {/* ── REPLACE MODAL ── */}
      <AnimatePresence>
        {replaceModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setReplaceModal(null)}>
            <motion.div initial={{ scale: 0.94, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-[#101720] border border-[#26313D] rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                <User className="w-4 h-4 text-amber-400" /> Replace Player?
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#0B1118] border border-[#26313D]">
                  <span className="text-secondaryText font-semibold">Current</span>
                  <span className="font-bold text-white">{replaceModal.current.name}</span>
                </div>
                <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#0B1118] border border-[#26313D]">
                  <span className="text-secondaryText font-semibold">New</span>
                  <span className="font-bold text-white">{replaceModal.incoming.name}</span>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setReplaceModal(null)}
                  className="flex-1 py-2.5 rounded-xl border border-[#26313D] text-xs font-extrabold uppercase text-white hover:bg-white/5 transition">Cancel</button>
                <button onClick={confirmReplace}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-xs font-black uppercase tracking-wide hover:brightness-110 transition">Replace</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── RESET MODAL ── */}
      <AnimatePresence>
        {showResetModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowResetModal(false)}>
            <motion.div initial={{ scale: 0.94, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-[#101720] border border-[#26313D] rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-amber-400" /> Reset Squad?
              </h3>
              <p className="text-xs text-secondaryText">All current player positions will be removed.</p>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setShowResetModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-[#26313D] text-xs font-extrabold uppercase text-white hover:bg-white/5 transition">Cancel</button>
                <button onClick={resetSquad}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-xs font-black uppercase tracking-wide hover:brightness-110 transition">Reset</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
