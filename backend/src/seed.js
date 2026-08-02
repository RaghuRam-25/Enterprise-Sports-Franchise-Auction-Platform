import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { ENV } from './config/env.js';
import { User } from './models/User.js';
import { Session } from './models/Session.js';
import { Position } from './models/Position.js';
import { PlayerCategory } from './models/PlayerCategory.js';
import { BiddingTier } from './models/BiddingTier.js';
import { Team } from './models/Team.js';
import { Player } from './models/Player.js';

const seedData = async () => {
  try {
    console.log('Connecting to database for seeding...');
    await mongoose.connect(ENV.MONGO_URI);
    console.log('Connected to MongoDB. Clearing existing collections...');

    await User.deleteMany({});
    await Session.deleteMany({});
    await Position.deleteMany({});
    await PlayerCategory.deleteMany({});
    await BiddingTier.deleteMany({});
    await Team.deleteMany({});
    await Player.deleteMany({});

    console.log('Seeding Phase 14 Demo Data...');

    // 1. Password Hash
    const salt = await bcrypt.genSalt(10);
    const defaultPassword = await bcrypt.hash('password123', salt);

    // 2. Sessions (2)
    const sessions = await Session.insertMany([
      { name: '22-23 Academic Session', isActive: true },
      { name: '23-24 Academic Session', isActive: true }
    ]);

    // 3. Positions (6)
    const positions = await Position.insertMany([
      { code: 'ST', name: 'Striker', fieldX: 88, fieldY: 50 },
      { code: 'GK', name: 'Goalkeeper', fieldX: 6, fieldY: 50 },
      { code: 'RW', name: 'Right Winger', fieldX: 78, fieldY: 82 },
      { code: 'LW', name: 'Left Winger', fieldX: 78, fieldY: 18 },
      { code: 'CM', name: 'Central Midfielder', fieldX: 52, fieldY: 50 },
      { code: 'CB', name: 'Center Back', fieldX: 22, fieldY: 50 }
    ]);

    // 4. Categories (3)
    const categories = await PlayerCategory.insertMany([
      { name: 'Icon Category', priorityLevel: 1, basePrice: 5000000 },
      { name: 'A Grade', priorityLevel: 2, basePrice: 3000000 },
      { name: 'B Grade', priorityLevel: 3, basePrice: 1500000 }
    ]);

    // 5. Bidding Tiers (4)
    const biddingTiers = await BiddingTier.insertMany([
      { minPercent: 0, maxPercent: 3, raisePercent: 0.15 },
      { minPercent: 3, maxPercent: 5, raisePercent: 0.25 },
      { minPercent: 5, maxPercent: 10, raisePercent: 0.50 },
      { minPercent: 10, maxPercent: 100, raisePercent: 1.00 }
    ]);

    // 6. Teams (6)
    const teams = await Team.insertMany([
      { name: 'Dhaka Dynamites', shortCode: 'DHD', totalBudget: 100000000, remainingBudget: 100000000, minRoster: 11, currentRosterCount: 0 },
      { name: 'Chittagong Kings', shortCode: 'CTG', totalBudget: 100000000, remainingBudget: 100000000, minRoster: 11, currentRosterCount: 0 },
      { name: 'Sylhet Strikers', shortCode: 'SYL', totalBudget: 100000000, remainingBudget: 100000000, minRoster: 11, currentRosterCount: 0 },
      { name: 'Fortune Barishal', shortCode: 'FBR', totalBudget: 100000000, remainingBudget: 100000000, minRoster: 11, currentRosterCount: 0 },
      { name: 'Comilla Victorians', shortCode: 'COM', totalBudget: 100000000, remainingBudget: 100000000, minRoster: 11, currentRosterCount: 0 },
      { name: 'Rangpur Riders', shortCode: 'RNG', totalBudget: 100000000, remainingBudget: 100000000, minRoster: 11, currentRosterCount: 0 }
    ]);

    // 7. Users (1 Super Admin, 1 Podium Admin, 6 Managers)
    const superAdmin = await User.create({
      name: 'Super Admin Architect',
      email: 'admin@auction.com',
      passwordHash: defaultPassword,
      role: 'SUPER_ADMIN'
    });

    const podiumAdmin = await User.create({
      name: 'Podium Auctioneer Admin',
      email: 'podium@auction.com',
      passwordHash: defaultPassword,
      role: 'PODIUM_ADMIN'
    });

    const managers = [];
    for (let i = 0; i < teams.length; i++) {
      const mgr = await User.create({
        name: `${teams[i].name} Manager`,
        email: `manager_${teams[i].shortCode.toLowerCase()}@auction.com`,
        passwordHash: defaultPassword,
        role: 'TEAM_MANAGER',
        teamId: teams[i]._id,
        mustResetPassword: i === 1 // test password reset flag on 2nd manager
      });
      managers.push(mgr);
    }

    // 8. Players (20) — fictional, generic footballer names only. No real
    // athletes' names or likenesses (per platform policy). Players without an
    // uploaded image render the frontend's generic SVG placeholder.
    const playerNames = [
      'Ayan Rahman', 'Fahim Chowdhury', 'Nabil Hossain', 'Tanvir Ahmed', 'Arif Uddin',
      'Sakib Karim', 'Rafiul Islam', 'Mahfuz Alam', 'Jubair Hasan', 'Shakil Ahmed',
      'Rakib Sheikh', 'Imran Kabir', 'Sajid Mahmud', 'Zubayer Khan', 'Nayem Hossain',
      'Ashraful Islam', 'Tanim Sarkar', 'Saad Chowdhury', 'Mehedi Karim', 'Wasif Ahmed'
    ];

    const sizes = ['S', 'M', 'L', 'XL', 'XXL'];
    const players = [];
    for (let i = 0; i < playerNames.length; i++) {
      const email = `player_${i + 1}@auction.com`;
      const playerUser = await User.create({
        name: playerNames[i],
        email,
        passwordHash: defaultPassword,
        role: 'PLAYER'
      });

      const p = await Player.create({
        name: playerNames[i],
        email,
        userId: playerUser._id,
        studentId: `STU-2024-${100 + i}`,
        session: i % 2 === 0 ? '22-23 Academic Session' : '23-24 Academic Session',
        jerseyName: `${playerNames[i].split(' ')[0].toUpperCase()} ${10 + i}`,
        tShirtSize: sizes[i % sizes.length],
        tShirtNumber: String(10 + i),
        positions: [positions[i % positions.length].code],
        primaryPosition: positions[i % positions.length].code,
        imageUrl: null,
        category: i < 4 ? 'Icon Category' : i < 10 ? 'A Grade' : 'B Grade',
        basePrice: i < 4 ? 5000000 : i < 10 ? 3000000 : 1500000,
        status: i === 0 ? 'ON_PODIUM' : 'APPROVED'
      });
      players.push(p);
    }

    console.log(`\n=============================================================`);
    console.log(`✅ DEMO DATA SEEDED SUCCESSFULLY!`);
    console.log(`=============================================================`);
    console.log(`1 Super Admin:   admin@auction.com / password123`);
    console.log(`1 Podium Admin:  podium@auction.com / password123`);
    console.log(`6 Team Managers: manager_dhd@auction.com / password123`);
    console.log(`                manager_ctg@auction.com / password123 (First-reset required)`);
    console.log(`                manager_syl@auction.com / password123`);
    console.log(`20 Registered Players Seeded in Pool`);
    console.log(`=============================================================\n`);

    process.exit(0);
  } catch (error) {
    console.error('Seeding Error:', error);
    process.exit(1);
  }
};

seedData();
