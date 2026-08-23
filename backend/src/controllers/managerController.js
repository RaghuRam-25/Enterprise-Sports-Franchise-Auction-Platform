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

    const { name, shortCode, description, motto, teamColor } = req.body;
    const updateData = {};

    if (name) updateData.name = name;
    if (shortCode) updateData.shortCode = shortCode.toUpperCase();
    if (description !== undefined) updateData.description = description;
    if (motto !== undefined) updateData.motto = motto;
    // Frontend sends teamColor; the Team schema uses primaryColor (themeConfig reads team.primaryColor).
    if (teamColor) updateData.primaryColor = teamColor;

    // Image uploads return { url, publicId } — the permanent Cloudinary
    // secure_url is what gets persisted. Old assets are destroyed only AFTER
    // the database update succeeds; a failed DB write triggers rollback of the
    // freshly uploaded asset so nothing is orphaned.
    let newLogo = null;
    let newBanner = null;
    if (req.files) {
      const { processAndUploadImage } = await import('../services/imageService.js');
      if (req.files.logo && req.files.logo[0]) {
        const uploaded = await processAndUploadImage(req.files.logo[0].buffer, `team_logo_${team._id}`);
        if (uploaded.url) {
          newLogo = uploaded;
          updateData.logoUrl = uploaded.url;
          updateData.logoPublicId = uploaded.publicId || null;
        }
      }
      if (req.files.banner && req.files.banner[0]) {
        const uploaded = await processAndUploadImage(req.files.banner[0].buffer, `team_banner_${team._id}`);
        if (uploaded.url) {
          newBanner = uploaded;
          updateData.bannerUrl = uploaded.url;
          updateData.bannerPublicId = uploaded.publicId || null;
        }
      }
    }

    let updatedTeam;
    try {
      updatedTeam = await Team.findByIdAndUpdate(teamId, updateData, { new: true });
    } catch (dbErr) {
      const { deleteCloudinaryAsset } = await import('../services/imageService.js');
      if (newLogo?.publicId) await deleteCloudinaryAsset(newLogo.publicId);
      if (newBanner?.publicId) await deleteCloudinaryAsset(newBanner.publicId);
      throw dbErr;
    }

    // DB update won — safe to retire the replaced assets now.
    try {
      const { deleteCloudinaryAsset } = await import('../services/imageService.js');
      if (newLogo?.publicId && team.logoPublicId && team.logoPublicId !== newLogo.publicId) {
        await deleteCloudinaryAsset(team.logoPublicId);
      }
      if (newBanner?.publicId && team.bannerPublicId && team.bannerPublicId !== newBanner.publicId) {
        await deleteCloudinaryAsset(team.bannerPublicId);
      }
    } catch (cleanupErr) {
      console.error('[updateOwnTeam] Old asset cleanup failed:', cleanupErr?.message || cleanupErr);
    }

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
// SQUAD BUILDER LINEUP (formation, starting XI, substitutes, strength)
// Tournament squad rules — server-owned so the UI never hardcodes them.
const SQUAD_RULES = {
  maxSquadSize: 23,
  startingXI: 11,
  maxSubstitutes: 7,
  foreignPlayerLimit: null,
  localPlayerMinimum: null,
  goalkeeperRequired: 1
};

const resolveManagerTeamId = async (req) => {
  let teamId = req.user.teamId;
  if (!teamId) {
    const foundTeam = await Team.findOne({ managerId: req.user._id || req.user.id });
    if (foundTeam) teamId = foundTeam._id;
  }
  return teamId;
};

export const getOwnLineup = async (req, res, next) => {
  try {
    const teamId = await resolveManagerTeamId(req);
    if (!teamId) {
      return res.json({ success: true, data: { formation: '4-3-3', lineup: [], substitutes: [], chemistry: 0, collectiveStrength: 0, squadStatus: 'DRAFT', rules: SQUAD_RULES } });
    }

    const team = await Team.findById(teamId).select('formation lineup substitutes chemistry collectiveStrength squadStatus');
    return res.json({
      success: true,
      data: {
        formation: team?.formation || '4-3-3',
        lineup: team?.lineup || [],
        substitutes: team?.substitutes || [],
        chemistry: team?.chemistry || 0,
        collectiveStrength: team?.collectiveStrength || 0,
        squadStatus: team?.squadStatus || 'DRAFT',
        rules: SQUAD_RULES
      }
    });
  } catch (e) { next(e); }
};

export const saveOwnLineup = async (req, res, next) => {
  try {
    const teamId = await resolveManagerTeamId(req);
    if (!teamId) return res.status(400).json({ success: false, message: 'No team assigned to this manager' });

    const { formation, lineup, substitutes, chemistry, collectiveStrength } = req.body || {};
    if (formation && typeof formation !== 'string') {
      return res.status(400).json({ success: false, message: 'Invalid formation.' });
    }
    if (lineup !== undefined && !Array.isArray(lineup)) {
      return res.status(400).json({ success: false, message: 'Invalid lineup payload.' });
    }
    if (substitutes !== undefined && !Array.isArray(substitutes)) {
      return res.status(400).json({ success: false, message: 'Invalid substitutes payload.' });
    }
    if (Array.isArray(substitutes) && substitutes.length > SQUAD_RULES.maxSubstitutes) {
      return res.status(400).json({ success: false, message: `Maximum ${SQUAD_RULES.maxSubstitutes} substitutes allowed.` });
    }

    const update = {};
    if (formation) update.formation = formation.slice(0, 12);
    if (Array.isArray(lineup)) {
      update.lineup = lineup
        .filter((l) => l && typeof l.slot === 'string' && l.playerId)
        .slice(0, SQUAD_RULES.startingXI)
        .map((l) => ({ slot: String(l.slot).slice(0, 12), playerId: l.playerId }));
    }
    if (Array.isArray(substitutes)) update.substitutes = substitutes.slice(0, SQUAD_RULES.maxSubstitutes);
    if (Number.isFinite(Number(chemistry))) update.chemistry = Math.max(0, Math.min(100, Number(chemistry)));
    if (Number.isFinite(Number(collectiveStrength))) update.collectiveStrength = Math.max(0, Number(collectiveStrength));
    update.squadStatus = 'SAVED';

    const team = await Team.findByIdAndUpdate(teamId, update, { new: true }).select('formation lineup substitutes chemistry collectiveStrength squadStatus');
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });

    const io = req.app?.get('io');
    if (io) {
      io.emit('teams:updated', { teamId: String(teamId) });
      io.emit('lineup:updated', { teamId: String(teamId) });
    }

    return res.json({
      success: true,
      message: 'Squad saved successfully.',
      data: {
        formation: team.formation,
        lineup: team.lineup,
        substitutes: team.substitutes,
        chemistry: team.chemistry,
        collectiveStrength: team.collectiveStrength,
        squadStatus: team.squadStatus,
        rules: SQUAD_RULES
      }
    });
  } catch (e) { next(e); }
};
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
    const teamId = req.user.teamId;

    // Privacy: a manager may only see their own franchise's auction history,
    // never the competing teams' spend (previously the full ledger leaked).
    const history = teamId
      ? await AuctionLedger.find({ teamId })
          .sort({ createdAt: -1 })
          .limit(100)
      : [];

    res.json({ success: true, count: history.length, data: history });
  } catch (e) { next(e); }
};

// ── GET TARGET PLAYERS LIST (Private to Manager) ──────────────────────────────
export const getTargetPlayers = async (req, res, next) => {
  try {
    const managerId = req.user._id || req.user.id;
    const { ManagerTargetPlayer } = await import('../models/ManagerTargetPlayer.js');

    const targets = await ManagerTargetPlayer.find({ managerId })
      .sort({ priority: 1 })
      .populate({
        path: 'playerId',
        select: 'name jerseyName studentId primaryPosition positions category basePrice session imageUrl status soldToTeam finalPrice'
      });

    res.json({ success: true, count: targets.length, data: targets });
  } catch (e) { next(e); }
};

// ── ADD PLAYER TO TARGET LIST ──────────────────────────────────────────────────
export const addTargetPlayer = async (req, res, next) => {
  try {
    const managerId = req.user._id || req.user.id;
    const teamId = req.user.teamId;
    const { playerId, note, optionalBudgetLimit } = req.body;

    if (!playerId) {
      return res.status(400).json({ success: false, message: 'Player ID is required' });
    }

    const { Player } = await import('../models/Player.js');
    const playerExists = await Player.findById(playerId);
    if (!playerExists) {
      return res.status(404).json({ success: false, message: 'Player not found' });
    }

    const { ManagerTargetPlayer } = await import('../models/ManagerTargetPlayer.js');

    // Check if already in target list
    const existing = await ManagerTargetPlayer.findOne({ managerId, playerId });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Player is already in your target list' });
    }

    // Determine priority = highest priority + 1
    const highestPriorityTarget = await ManagerTargetPlayer.findOne({ managerId }).sort({ priority: -1 });
    const nextPriority = highestPriorityTarget ? highestPriorityTarget.priority + 1 : 1;

    const newTarget = await ManagerTargetPlayer.create({
      managerId,
      teamId: req.user.teamId || null,
      playerId,
      priority: nextPriority,
      note: note || '',
      optionalBudgetLimit: optionalBudgetLimit ? Number(optionalBudgetLimit) : null
    });

    const populated = await ManagerTargetPlayer.findById(newTarget._id).populate({
      path: 'playerId',
      select: 'name jerseyName studentId primaryPosition positions category basePrice session imageUrl status soldToTeam finalPrice'
    });

    res.status(201).json({ success: true, message: 'Player added to target list', data: populated });
  } catch (e) { next(e); }
};

// ── UPDATE TARGET PLAYER DETAILS (Note & Budget Cap) ──────────────────────────
export const updateTargetPlayer = async (req, res, next) => {
  try {
    const managerId = req.user._id || req.user.id;
    const { id } = req.params;
    const { note, optionalBudgetLimit, priority } = req.body;

    const { ManagerTargetPlayer } = await import('../models/ManagerTargetPlayer.js');

    const target = await ManagerTargetPlayer.findOne({ _id: id, managerId });
    if (!target) {
      return res.status(404).json({ success: false, message: 'Target entry not found' });
    }

    if (note !== undefined) target.note = note;
    if (optionalBudgetLimit !== undefined) {
      target.optionalBudgetLimit = optionalBudgetLimit !== null && optionalBudgetLimit !== '' ? Number(optionalBudgetLimit) : null;
    }
    if (priority !== undefined && !isNaN(Number(priority))) {
      target.priority = Number(priority);
    }

    await target.save();

    const populated = await ManagerTargetPlayer.findById(target._id).populate({
      path: 'playerId',
      select: 'name jerseyName studentId primaryPosition positions category basePrice session imageUrl status soldToTeam finalPrice'
    });

    res.json({ success: true, message: 'Target details updated', data: populated });
  } catch (e) { next(e); }
};

// ── REORDER TARGET PRIORITIES ─────────────────────────────────────────────────
export const reorderTargetPlayers = async (req, res, next) => {
  try {
    const managerId = req.user._id || req.user.id;
    const { targetOrder } = req.body; // Array of { id, priority }

    if (!Array.isArray(targetOrder)) {
      return res.status(400).json({ success: false, message: 'targetOrder must be an array of objects' });
    }

    const { ManagerTargetPlayer } = await import('../models/ManagerTargetPlayer.js');

    const bulkOps = targetOrder.map(item => ({
      updateOne: {
        filter: { _id: item.id, managerId },
        update: { $set: { priority: Number(item.priority) } }
      }
    }));

    if (bulkOps.length > 0) {
      await ManagerTargetPlayer.bulkWrite(bulkOps);
    }

    const updatedTargets = await ManagerTargetPlayer.find({ managerId })
      .sort({ priority: 1 })
      .populate({
        path: 'playerId',
        select: 'name jerseyName studentId primaryPosition positions category basePrice session imageUrl status soldToTeam finalPrice'
      });

    res.json({ success: true, message: 'Target priorities updated', data: updatedTargets });
  } catch (e) { next(e); }
};

// ── DELETE PLAYER FROM TARGET LIST ────────────────────────────────────────────
export const deleteTargetPlayer = async (req, res, next) => {
  try {
    const managerId = req.user._id || req.user.id;
    const { id } = req.params;

    const { ManagerTargetPlayer } = await import('../models/ManagerTargetPlayer.js');

    const deleted = await ManagerTargetPlayer.findOneAndDelete({ _id: id, managerId });
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Target entry not found' });
    }

    // Re-normalize priorities sequentially (1, 2, 3...)
    const remainingTargets = await ManagerTargetPlayer.find({ managerId }).sort({ priority: 1 });
    const bulkOps = remainingTargets.map((item, idx) => ({
      updateOne: {
        filter: { _id: item._id },
        update: { $set: { priority: idx + 1 } }
      }
    }));

    if (bulkOps.length > 0) {
      await ManagerTargetPlayer.bulkWrite(bulkOps);
    }

    res.json({ success: true, message: 'Player removed from target list' });
  } catch (e) { next(e); }
};

