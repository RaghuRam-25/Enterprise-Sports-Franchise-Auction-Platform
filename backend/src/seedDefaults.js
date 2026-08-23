import { Session } from './models/Session.js';
import { Position } from './models/Position.js';
import { PlayerCategory } from './models/PlayerCategory.js';
import { BiddingTier } from './models/BiddingTier.js';

/**
 * Auto-seed base platform configuration on startup.
 *
 * Problem it fixes: on a fresh/hosted database (e.g. Vercel + a production
 * MongoDB), the config collections (Session, Position, PlayerCategory,
 * BiddingTier) are empty because the demo seed only ever ran against the local
 * database. That made the Super Admin "Configurations" pages (and the bidding
 * tiers) render blank on Vercel even though they worked on localhost.
 *
 * This helper ONLY inserts records when the collection is empty, so it never
 * overwrites or duplicates admin-created data. It is safe to run on boot.
 */
const DEFAULT_SESSIONS = [
  { name: '22-23 Academic Session', isActive: true },
  { name: '23-24 Academic Session', isActive: true },
];

const DEFAULT_POSITIONS = [
  { code: 'GK', name: 'Goalkeeper', icon: 'Hand', fieldX: 6, fieldY: 50 },
  { code: 'CB', name: 'Centre Back', icon: 'Shield', fieldX: 22, fieldY: 50 },
  { code: 'LB', name: 'Left Back', icon: 'Footprints', fieldX: 28, fieldY: 16 },
  { code: 'RB', name: 'Right Back', icon: 'Activity', fieldX: 28, fieldY: 84 },
  { code: 'CDM', name: 'Central Defensive Midfielder', icon: 'Anchor', fieldX: 40, fieldY: 50 },
  { code: 'CMF', name: 'Central Midfielder', icon: 'Zap', fieldX: 52, fieldY: 50 },
  { code: 'CAM', name: 'Central Attacking Midfielder', icon: 'Star', fieldX: 64, fieldY: 50 },
  { code: 'LM', name: 'Left Midfielder', icon: 'Flag', fieldX: 55, fieldY: 18 },
  { code: 'RM', name: 'Right Midfielder', icon: 'Wind', fieldX: 55, fieldY: 82 },
  { code: 'CF', name: 'Centre Forward', icon: 'Volleyball', fieldX: 86, fieldY: 50 },
  { code: 'LW', name: 'Left Winger', icon: 'ArrowUpLeft', fieldX: 78, fieldY: 18 },
  { code: 'RW', name: 'Right Winger', icon: 'ArrowUpRight', fieldX: 78, fieldY: 82 },
  { code: 'ST', name: 'Striker', icon: 'Volleyball', fieldX: 86, fieldY: 50 },
];

// Icons auto-assigned by the PREVIOUS seed generation. On boot, a stored icon
// equal to one of these is migrated forward to the current default — while a
// genuinely custom Super-Admin pick is never touched.
const LEGACY_POSITION_ICONS = {
  GK: 'Hand',
  CB: 'Shield',
  LB: 'Footprints',
  RB: 'Footprints',
  CDM: 'Shield',
  CMF: 'Zap',
  CAM: 'Star',
  LM: 'Zap',
  RM: 'Zap',
  CF: 'Volleyball',
  LW: 'Footprints',
  RW: 'Footprints',
};

const DEFAULT_CATEGORIES = [
  { name: 'Icon Category', priorityLevel: 1, basePrice: 5000000 },
  { name: 'A Grade', priorityLevel: 2, basePrice: 3000000 },
  { name: 'B Grade', priorityLevel: 3, basePrice: 1500000 },
];

const DEFAULT_TIERS = [
  { minPercent: 0, maxPercent: 3, raisePercent: 0.15 },
  { minPercent: 3, maxPercent: 5, raisePercent: 0.25 },
  { minPercent: 5, maxPercent: 10, raisePercent: 0.50 },
  { minPercent: 10, maxPercent: 100, raisePercent: 1.00 },
];

const ensureCollection = async (Model, records, label) => {
  try {
    const count = await Model.countDocuments();
    if (count === 0) {
      await Model.insertMany(records);
      console.log(`[AutoSeed] Seeded ${records.length} ${label}`);
    } else {
      console.log(`[AutoSeed] ${label} already populated (${count}); skipped`);
    }
  } catch (err) {
    console.warn(`[AutoSeed] Skipped ${label}:`, err.message);
  }
};

export async function autoSeedDefaults() {
  await ensureCollection(Session, DEFAULT_SESSIONS, 'sessions');
  await ensureCollection(Position, DEFAULT_POSITIONS, 'positions');
  // The registration form offers a canonical set of 12 football positions and
  // the backend validates submissions against this collection — so EVERY
  // default code must exist, not just on fresh databases. $setOnInsert keeps
  // admin-customized names/coordinates untouched; only missing codes appear.
  for (const pos of DEFAULT_POSITIONS) {
    try {
      await Position.updateOne(
        { code: pos.code },
        { $setOnInsert: { ...pos } },
        { upsert: true }
      );
      // Icon migration: fill empty icons and advance stale auto-assigned ones
      // (from the previous 6-icon generation) — custom picks are preserved.
      const legacy = LEGACY_POSITION_ICONS[pos.code];
      await Position.updateOne(
        {
          code: pos.code,
          $or: [{ icon: '' }, { icon: null }, ...(legacy ? [{ icon: legacy }] : [])],
        },
        { $set: { icon: pos.icon } }
      );
    } catch (err) {
      console.warn(`[AutoSeed] Skipped position ${pos.code}:`, err.message);
    }
  }
  await ensureCollection(PlayerCategory, DEFAULT_CATEGORIES, 'categories');
  await ensureCollection(BiddingTier, DEFAULT_TIERS, 'bidding tiers');
}