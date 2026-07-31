import { Team } from '../models/Team.js';
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

// ── UPDATE OWN TEAM (Team Manager Profile Edit) ───────────────────────────────
export const updateOwnTeam = async (req, res, next) => {
  try {
    const teamId = req.user.teamId;
    if (!teamId) {
      return res.status(404).json({ success: false, message: 'No team assigned to this manager' });
    }

    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });

    // Ownership guard: only the assigned manager or Super Admin can edit
    const isOwner = String(team.managerId) === String(req.user._id || req.user.id);
    const isSuperAdmin = req.user.role === 'SUPER_ADMIN';
    if (!isOwner && !isSuperAdmin) {
      return res.status(403).json({ success: false, message: 'You can only edit your own team' });
    }

    const { name, shortCode, description, motto } = req.body;
    const updateData = {};

    if (name) updateData.name = name;
    if (shortCode) updateData.shortCode = shortCode.toUpperCase();
    if (description !== undefined) updateData.description = description;
    if (motto !== undefined) updateData.motto = motto;

    if (req.file) {
      const { processAndUploadImage } = await import('../services/imageService.js');
      updateData.logoUrl = await processAndUploadImage(req.file.buffer, `team_${team._id}`);
    } else if (req.body.removeLogo === 'true') {
      // Restore to default generated avatar
      const teamName = updateData.name || team.name;
      updateData.logoUrl = `https://ui-avatars.com/api/?background=059669&color=fff&size=256&bold=true&name=${encodeURIComponent(teamName)}`;
    }

    const updatedTeam = await Team.findByIdAndUpdate(teamId, updateData, { new: true });

    // Emit real-time update so all connected clients refresh instantly
    const io = req.app.get('io');
    if (io) {
      io.emit('teams:updated', updatedTeam);
    }

    res.json({ success: true, message: 'Team profile updated successfully', data: updatedTeam });
  } catch (e) { next(e); }
};

// ── GET OWN BUDGET ────────────────────────────────────────────────────────────
export const getOwnBudget = async (req, res, next) => {
  try {
    const teamId = req.user.teamId;
    if (!teamId) {
      return res.status(404).json({ success: false, message: 'No team assigned to this manager' });
    }

    const team = await Team.findById(teamId)
      .select('name totalBudget remainingBudget currentRosterCount minRoster maxRoster');
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

// ── GET OWN ROSTER ─────────────────────────────────────────────────────────────
export const getOwnRoster = async (req, res, next) => {
  try {
    let teamId = req.user.teamId;

    // If teamId missing from JWT/user, try to find team by managerId from DB
    if (!teamId) {
      const foundTeam = await Team.findOne({ managerId: req.user._id || req.user.id });
      if (foundTeam) {
        teamId = foundTeam._id;
        // Sync teamId back to user record
        await User.findByIdAndUpdate(req.user._id || req.user.id, { teamId: foundTeam._id });
      }
    }

    // No team assigned — return empty state (do NOT fall back to any random team)
    if (!teamId) {
      return res.json({
        success: true,
        data: {
          team: {
            name: 'No Team Assigned',
            totalBudget: 0,
            remainingBudget: 0,
            spentBudget: 0,
            currentRosterCount: 0,
            minRoster: 11
          },
          players: []
        }
      });
    }

    const { Player } = await import('../models/Player.js');
    const team = await Team.findById(teamId)
      .select('name totalBudget remainingBudget currentRosterCount minRoster managerId');

    if (!team) {
      return res.json({
        success: true,
        data: {
          team: {
            name: 'Team Not Found',
            totalBudget: 0,
            remainingBudget: 0,
            spentBudget: 0,
            currentRosterCount: 0,
            minRoster: 11
          },
          players: []
        }
      });
    }

    const players = await Player.find({ soldToTeam: teamId, status: 'SOLD' })
      .select('name jerseyName primaryPosition positions category finalPrice imageUrl studentId')
      .sort({ finalPrice: -1 });

    res.json({
      success: true,
      data: {
        team: {
          name: team.name,
          totalBudget: team.totalBudget || 0,
          remainingBudget: team.remainingBudget || 0,
          spentBudget: (team.totalBudget || 0) - (team.remainingBudget || 0),
          currentRosterCount: team.currentRosterCount || players.length,
          minRoster: team.minRoster || 11
        },
        players: players || []
      }
    });
  } catch (e) { next(e); }
};


// ── PLACE NORMAL BID — GAP 3 & 12 FIX ────────────────────────────────────────
export const placeBid = async (req, res, next) => {
  try {
    const teamId = req.user.teamId;
    if (!teamId) {
      return res.status(400).json({ success: false, message: 'No team assigned to this manager' });
    }

    // Check auction is active
    const state = auctionEngine.getState();
    if (!state.podiumPlayer) {
      return res.status(400).json({ success: false, message: 'No player is currently on the podium' });
    }

    // GAP 12 FIX: timer state is nested under state.timer.status (not state.timerStatus)
    if (state.timer?.status !== 'RUNNING' || state.timer?.isPaused) {
      return res.status(400).json({ success: false, message: 'Auction clock is not running' });
    }

    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });

    // GAP 3 FIX: use placeNormalBid (placeBid method did not exist on engine)
    const result = await auctionEngine.placeNormalBid({
      id: team._id.toString(),
      _id: team._id,
      name: team.name,
      totalBudget: team.totalBudget,
      remainingBudget: team.remainingBudget,
      minRoster: team.minRoster,
      currentRosterCount: team.currentRosterCount || 0
    });

    if (!result?.success) {
      return res.status(400).json({ success: false, message: result?.error || 'Bid rejected by engine' });
    }

    await logAction('PLACE_BID', req.user.email || req.user.name, {
      teamId,
      teamName: team.name,
      amount: result.nextAmount,
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

    const { PlayerCategory } = await import('../models/PlayerCategory.js');
    const cheapestCategory = await PlayerCategory.findOne().sort({ basePrice: 1 });
    const lowestBasePrice = cheapestCategory?.basePrice || 1000000;

    const result = auctionEngine.placeBlindBid(
      {
        id: team._id.toString(),
        _id: team._id,
        name: team.name,
        totalBudget: team.totalBudget,
        remainingBudget: team.remainingBudget,
        minRoster: team.minRoster,
        currentRosterCount: team.currentRosterCount || 0
      },
      parsed.amount,
      lowestBasePrice
    );

    if (!result?.success) {
      return res.status(400).json({ success: false, message: result?.error || 'Blind bid rejected by guardrail' });
    }

    await logAction('PLACE_BLIND_BID', req.user.email || req.user.name, {
      teamId,
      teamName: team.name,
      amount: parsed.amount,
      playerId: parsed.playerId
    });

    res.status(201).json({ success: true, message: 'Blind bid submitted successfully' });
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
