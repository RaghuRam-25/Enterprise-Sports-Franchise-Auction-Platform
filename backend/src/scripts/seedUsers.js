/**
 * ─────────────────────────────────────────────────────────────────────────────
 * SEED SCRIPT — Enterprise Sports Franchise Auction Platform
 * ─────────────────────────────────────────────────────────────────────────────
 * Run once to populate the database with one account per role.
 *
 *   node src/scripts/seedUsers.js
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * DEFAULT CREDENTIALS (change after first login)
 * ─────────────────────────────────────────────────────────────────────────────
 *  Role          | Email                    | Password
 * ───────────────┼──────────────────────────┼──────────────
 *  SUPER_ADMIN   | superadmin@auction.com   | Admin@1234
 *  PODIUM_ADMIN  | podium@auction.com       | Podium@1234
 *  TEAM_MANAGER  | manager@auction.com      | Manager@1234
 *  PLAYER        | player@auction.com       | Player@1234
 * ─────────────────────────────────────────────────────────────────────────────
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

// ── Load .env ─────────────────────────────────────────────────────────────────
const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read .env manually since dotenv may not be configured
import { readFileSync } from 'fs';
const envPath = join(__dirname, '../../.env');
try {
  const envContent = readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, ...vals] = line.split('=');
    if (key && key.trim() && !key.startsWith('#')) {
      process.env[key.trim()] = vals.join('=').trim();
    }
  });
} catch (_) {
  // .env not found, use defaults
}

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/sports_auction_db';

// ── User Model (inline to avoid circular imports) ─────────────────────────────
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  role: {
    type: String,
    enum: ['SUPER_ADMIN', 'PODIUM_ADMIN', 'TEAM_MANAGER', 'PLAYER', 'SPECTATOR', 'GENERAL_USER'],
    default: 'SPECTATOR'
  },
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
  isActive: { type: Boolean, default: true },
  mustResetPassword: { type: Boolean, default: false }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

// ── Seed Data ─────────────────────────────────────────────────────────────────
const SEED_USERS = [
  {
    name: 'Super Admin',
    email: 'superadmin@auction.com',
    password: 'Admin@1234',
    role: 'SUPER_ADMIN',
    mustResetPassword: false,
  },
  {
    name: 'Podium Admin',
    email: 'podium@auction.com',
    password: 'Podium@1234',
    role: 'PODIUM_ADMIN',
    mustResetPassword: false,
  },
  {
    name: 'Team Manager',
    email: 'manager@auction.com',
    password: 'Manager@1234',
    role: 'TEAM_MANAGER',
    mustResetPassword: false,
  },
  {
    name: 'Test Player',
    email: 'player@auction.com',
    password: 'Player@1234',
    role: 'PLAYER',
    mustResetPassword: false,
  },
];

// ── Run Seed ──────────────────────────────────────────────────────────────────
async function seed() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  FRANCHISE AUCTION PLATFORM — DATABASE SEED SCRIPT');
  console.log('═══════════════════════════════════════════════════════════════\n');

  try {
    await mongoose.connect(MONGO_URI);
    console.log(`✅ Connected to MongoDB: ${MONGO_URI}\n`);
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  }

  let created = 0;
  let skipped = 0;

  for (const userData of SEED_USERS) {
    const existing = await User.findOne({ email: userData.email });
    if (existing) {
      console.log(`⚠️  SKIP  [${userData.role.padEnd(12)}]  ${userData.email}  (already exists)`);
      skipped++;
      continue;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(userData.password, salt);

    await User.create({
      name: userData.name,
      email: userData.email,
      passwordHash,
      role: userData.role,
      mustResetPassword: userData.mustResetPassword,
    });

    console.log(`✅ CREATED [${userData.role.padEnd(12)}]  ${userData.email}  /  password: ${userData.password}`);
    created++;
  }

  console.log(`\n───────────────────────────────────────────────────────────────`);
  console.log(`  Created: ${created}   Skipped: ${skipped}   Total: ${SEED_USERS.length}`);
  console.log(`───────────────────────────────────────────────────────────────`);
  console.log('\n📋 LOGIN CREDENTIALS SUMMARY:');
  console.log('┌─────────────────┬──────────────────────────┬──────────────────┐');
  console.log('│ Role            │ Email                    │ Password         │');
  console.log('├─────────────────┼──────────────────────────┼──────────────────┤');
  console.log('│ SUPER_ADMIN     │ superadmin@auction.com   │ Admin@1234       │');
  console.log('│ PODIUM_ADMIN    │ podium@auction.com       │ Podium@1234      │');
  console.log('│ TEAM_MANAGER    │ manager@auction.com      │ Manager@1234     │');
  console.log('│ PLAYER          │ player@auction.com       │ Player@1234      │');
  console.log('└─────────────────┴──────────────────────────┴──────────────────┘');
  console.log('\n✅ Seed complete.\n');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(err => {
  console.error('\n❌ Seed failed:', err);
  process.exit(1);
});
