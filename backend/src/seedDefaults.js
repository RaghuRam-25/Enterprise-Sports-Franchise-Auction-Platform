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
  { code: 'ST', name: 'Striker', fieldX: 88, fieldY: 50 },
  { code: 'GK', name: 'Goalkeeper', fieldX: 6, fieldY: 50 },
  { code: 'RW', name: 'Right Winger', fieldX: 78, fieldY: 82 },
  { code: 'LW', name: 'Left Winger', fieldX: 78, fieldY: 18 },
  { code: 'CM', name: 'Central Midfielder', fieldX: 52, fieldY: 50 },
  { code: 'CB', name: 'Center Back', fieldX: 22, fieldY: 50 },
];

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
  await ensureCollection(PlayerCategory, DEFAULT_CATEGORIES, 'categories');
  await ensureCollection(BiddingTier, DEFAULT_TIERS, 'bidding tiers');
}