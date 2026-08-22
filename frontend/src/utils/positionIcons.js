/*
 * ── Football Position Icons (shared) ──────────────────────────────────────────
 * Twelve DISTINCT neon lime-green line icons — one per football position —
 * shared by the Super Admin Positions setup and the Player Registration page
 * so both render identically.
 *
 * Resolution order for a Position:
 *   1. admin-picked `icon` (Lucide name persisted on the document)
 *   2. automatic per-code mapping below
 *   3. ball fallback
 */
import {
  Hand, Shield, Footprints, Activity, Anchor, Zap,
  Star, Flag, Wind, Volleyball, ArrowUpLeft, ArrowUpRight,
} from 'lucide-react';

export const POSITION_ICON_MAP = {
  Hand,
  Shield,
  Footprints,
  Activity,
  Anchor,
  Zap,
  Star,
  Flag,
  Wind,
  Volleyball,
  ArrowUpLeft,
  ArrowUpRight,
};

export const POSITION_ICON_OPTIONS = [
  { name: 'Hand', label: 'Gloves', Icon: Hand },
  { name: 'Shield', label: 'Wall', Icon: Shield },
  { name: 'Footprints', label: 'Boots', Icon: Footprints },
  { name: 'Activity', label: 'Sprint', Icon: Activity },
  { name: 'Anchor', label: 'Anchor', Icon: Anchor },
  { name: 'Zap', label: 'Engine', Icon: Zap },
  { name: 'Star', label: 'Playmaker', Icon: Star },
  { name: 'Flag', label: 'Flank', Icon: Flag },
  { name: 'Wind', label: 'Wing', Icon: Wind },
  { name: 'Volleyball', label: 'Striker', Icon: Volleyball },
  { name: 'ArrowUpLeft', label: 'Left Wing', Icon: ArrowUpLeft },
  { name: 'ArrowUpRight', label: 'Right Wing', Icon: ArrowUpRight },
];

// Canonical default icon per position code — all twelve are unique.
const CODE_DEFAULT_ICONS = {
  GK: 'Hand',
  CB: 'Shield',
  LB: 'Footprints',
  RB: 'Activity',
  CDM: 'Anchor',
  CMF: 'Zap',
  CAM: 'Star',
  LM: 'Flag',
  RM: 'Wind',
  CF: 'Volleyball',
  LW: 'ArrowUpLeft',
  RW: 'ArrowUpRight',
};

export function getPositionIcon(position = {}) {
  if (position.icon && POSITION_ICON_MAP[position.icon]) {
    return POSITION_ICON_MAP[position.icon];
  }
  const byCode = CODE_DEFAULT_ICONS[(position.code || '').toUpperCase()];
  return (byCode && POSITION_ICON_MAP[byCode]) || Volleyball;
}
