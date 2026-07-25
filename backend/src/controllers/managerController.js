import { Team } from '../models/Team.js';
import { Bid } from '../models/Bid.js';
import { User } from '../models/User.js';
import { auctionEngine } from '../services/auctionEngine.js';
import { AuditLog } from '../models/AuditLog.js';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

// Audit log helper
const logAction = async (action, performedBy, details) => {
  try {
    await AuditLog.create({ action, performedBy, details });
  } catch (_) { /* silent */ }
};

// ── GET OWN TEAM ──────────────────────────────────────────────────────────────
export const getOwnTeam = async (req, res, next) => {
  try {
    const teamId = req.user.teamId;
    if (!teamId) {
      return res.status(404).json({ success: false, message: 'No team assigned to this manager' });
    }

    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });

    res.json({ success: true, data: team });
  } catch (e) { next(e); }
};

// ── GET OWN BUDGET ────────────────────────────────────────────────────────────
export const getOwnBudget = async (req, res, next) => {
  try {
    const teamId = req.user.teamId;
    if (!teamId) {
      return res.status(404).json({ success: false, message: 'No team assigned to this manager' });
    }

    const team = await Team.findById(teamId).select('name totalBudget remainingBudget currentRosterCount minRoster maxRoster');
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });

    res.json({
      success: true,
      data: {
        teamName: team.name,
        totalBudget: team.totalBudget,
        remainingBudget: team.remainingBudget,
        spentBudget: team.totalBudget - team.remainingBudget,
        currentRosterCount: team.currentRosterCount,
        rosterSlots: {
          minimum: team.minRoster,
          maximum: team.maxRoster,
          remaining: (team.maxRoster || 15) - team.currentRosterCount
        }
      }
    });
  } catch (e) { next(e); }
};

// ── PLACE NORMAL BID ──────────────────────────────────────────────────────────
const bidSchema = z.object({
  amount: z.number().positive('Bid amount must be positive')
});

export const placeBid = async (req, res, next) => {
  try {
    const parsed = bidSchema.parse(req.body);
    const teamId = req.user.teamId;

    if (!teamId) {
      return res.status(400).json({ success: false, message: 'No team assigned to this manager' });
    }

    // Check auction is active
    const state = auctionEngine.getState();
    if (!state.podiumPlayer) {
      return res.status(400).json({ success: false, message: 'No player is currently on the podium' });
    }

    if (state.timerStatus !== 'running') {
      return res.status(400).json({ success: false, message: 'Auction clock is not running' });
    }

    // Check budget
    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });

    if (parsed.amount > team.remainingBudget) {
      return res.status(400).json({
        success: false,
        message: `Insufficient budget. Remaining: ${team.remainingBudget.toLocaleString()}`
      });
    }

    if (parsed.amount <= (state.currentBid || 0)) {
      return res.status(400).json({
        success: false,
        message: `Bid must be higher than current bid of ${state.currentBid?.toLocaleString()}`
      });
    }

    // Submit bid to auction engine
    const result = auctionEngine.placeBid(team, parsed.amount);

    await logAction('PLACE_BID', req.user.email || req.user.name, {
      teamId,
      teamName: team.name,
      amount: parsed.amount,
      playerId: state.podiumPlayer._id
    });

    res.json({ success: true, message: 'Bid placed successfully', data: result });
  } catch (e) { next(e); }
};

// ── PLACE BLIND BID ───────────────────────────────────────────────────────────
const blindBidSchema = z.object({
  amount: z.number().positive('Blind bid amount must be positive'),
  playerId: z.string().min(1)
});

export const placeBlindBid = async (req, res, next) => {
  try {
    const parsed = blindBidSchema.parse(req.body);
    const teamId = req.user.teamId;

    if (!teamId) {
      return res.status(400).json({ success: false, message: 'No team assigned to this manager' });
    }

    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });

    if (parsed.amount > team.remainingBudget) {
      return res.status(400).json({
        success: false,
        message: `Insufficient budget. Remaining: ${team.remainingBudget.toLocaleString()}`
      });
    }

    // Record the blind bid
    const bid = await Bid.create({
      teamId,
      playerId: parsed.playerId,
      amount: parsed.amount,
      type: 'BLIND',
      status: 'PENDING'
    });

    await logAction('PLACE_BLIND_BID', req.user.email || req.user.name, {
      teamId,
      teamName: team.name,
      amount: parsed.amount,
      playerId: parsed.playerId
    });

    res.status(201).json({ success: true, message: 'Blind bid submitted successfully', data: bid });
  } catch (e) { next(e); }
};

// ── CHANGE OWN PASSWORD ───────────────────────────────────────────────────────
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6, 'New password must be at least 6 characters')
});

export const changeOwnPassword = async (req, res, next) => {
  try {
    const parsed = changePasswordSchema.parse(req.body);

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const isMatch = await bcrypt.compare(parsed.currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    user.passwordHash = await bcrypt.hash(parsed.newPassword, 10);
    user.mustResetPassword = false;
    await user.save();

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (e) { next(e); }
};

// ── GET AUCTION HISTORY (read-only for Manager) ───────────────────────────────
export const getAuctionHistory = async (req, res, next) => {
  try {
    const { AuctionLedger } = await import('../models/AuctionLedger.js');
    const history = await AuctionLedger.find()
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({ success: true, count: history.length, data: history });
  } catch (e) { next(e); }
};
