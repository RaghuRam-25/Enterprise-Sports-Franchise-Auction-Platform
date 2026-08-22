import { Session } from '../models/Session.js';
import { Position } from '../models/Position.js';
import { PlayerCategory } from '../models/PlayerCategory.js';
import { BiddingTier } from '../models/BiddingTier.js';
import { Team } from '../models/Team.js';
import { User } from '../models/User.js';
import { Player } from '../models/Player.js';
import { AuditLog } from '../models/AuditLog.js';
import { deletePlayerEverywhere } from '../services/playerCleanup.js';
import { buildCompleteTeamTheme, buildCategoryTheme, buildCategoryThemeFromColor } from '../services/ThemeGenerator.js';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

// --- Zod Validation Schemas ---
const sessionSchema = z.object({ name: z.string().min(2) });
const positionSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(2),
  fieldX: z.number().min(0).max(100).optional(),
  fieldY: z.number().min(0).max(100).optional()
});
const categorySchema = z.object({
  name: z.string().min(2),
  priorityLevel: z.number().min(1),
  basePrice: z.number().min(0),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a valid hex code (e.g. #3b82f6)').optional(),
  icon: z.string().max(30).optional()
});
const categoryUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  priorityLevel: z.number().min(1).optional(),
  basePrice: z.number().min(0).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a valid hex code (e.g. #3b82f6)').optional(),
  icon: z.string().max(30).optional()
});
const biddingTierSchema = z.object({ minPercent: z.number().min(0), maxPercent: z.number().min(0), raisePercent: z.number().min(0) });
const teamSchema = z.object({
  name: z.string().min(2),
  shortCode: z.string().min(2),
  totalBudget: z.number().min(0),
  minRoster: z.number().min(1),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Primary color must be a valid hex code').optional(),
  secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Secondary color must be a valid hex code').optional(),
  icon: z.string().max(30).optional()
});
const editTeamSchema = z.object({
  name: z.string().min(2).optional(),
  shortCode: z.string().min(2).optional(),
  totalBudget: z.number().min(0).optional(),
  remainingBudget: z.number().min(0).optional(),
  minRoster: z.number().min(1).optional(),
  maxRoster: z.number().min(1).optional(),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Primary color must be a valid hex code').optional(),
  secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Secondary color must be a valid hex code').optional(),
  icon: z.string().max(30).optional(),
}).partial();
const editPlayerSchema = z.object({
  name: z.string().min(2).optional(),
  jerseyName: z.string().max(15).optional(),
  positions: z.array(z.string()).optional(),
  primaryPosition: z.string().optional(),
  category: z.string().optional(),
  session: z.string().optional(),
  tShirtSize: z.enum(['S', 'M', 'L', 'XL', 'XXL']).optional(),
  tShirtNumber: z.string().optional(),
  status: z.string().optional(),
  basePrice: z.number().min(0).optional(),
  imageUrl: z.string().url().optional(),
  matchesPlayed: z.number().int().min(0).max(99).optional(),
  goals: z.number().int().min(0).max(99).optional(),
  assists: z.number().int().min(0).max(99).optional(),
  yellowCards: z.number().int().min(0).max(99).optional(),
  redCards: z.number().int().min(0).max(99).optional(),
  cleanSheets: z.number().int().min(0).max(99).optional(),
}).partial();

// Audit log helper
const logAdminAction = async (action, performedBy, details) => {
  try {
    await AuditLog.create({ action, performedBy, details });
  } catch (e) {
    // silent fallback
  }
};

// --- SESSIONS ---
export const getSessions = async (req, res, next) => {
  try {
    const sessions = await Session.find().sort({ createdAt: -1 });
    res.json({ success: true, count: sessions.length, data: sessions });
  } catch (e) { next(e); }
};

export const createSession = async (req, res, next) => {
  try {
    const parsed = sessionSchema.parse(req.body);
    const exists = await Session.findOne({ name: parsed.name });
    if (exists) return res.status(409).json({ success: false, message: 'Session already exists' });

    const session = await Session.create(parsed);
    await logAdminAction('CREATE_SESSION', req.user?.email || 'admin', session);
    res.status(201).json({ success: true, data: session });
  } catch (e) { next(e); }
};

export const deleteSession = async (req, res, next) => {
  try {
    await Session.findByIdAndDelete(req.params.id);
    await logAdminAction('DELETE_SESSION', req.user?.email || 'admin', { id: req.params.id });
    res.json({ success: true, message: 'Session deleted' });
  } catch (e) { next(e); }
};

// --- POSITIONS ---
export const getPositions = async (req, res, next) => {
  try {
    const positions = await Position.find().sort({ code: 1 });
    res.json({ success: true, count: positions.length, data: positions });
  } catch (e) { next(e); }
};

export const createPosition = async (req, res, next) => {
  try {
    const parsed = positionSchema.parse(req.body);
    const exists = await Position.findOne({ code: parsed.code.toUpperCase() });
    if (exists) return res.status(409).json({ success: false, message: 'Position code already exists' });

    const position = await Position.create({ ...parsed, code: parsed.code.toUpperCase() });
    await logAdminAction('CREATE_POSITION', req.user?.email || 'admin', position);
    res.status(201).json({ success: true, data: position });
  } catch (e) { next(e); }
};

export const deletePosition = async (req, res, next) => {
  try {
    await Position.findByIdAndDelete(req.params.id);
    await logAdminAction('DELETE_POSITION', req.user?.email || 'admin', { id: req.params.id });
    res.json({ success: true, message: 'Position deleted' });
  } catch (e) { next(e); }
};

// --- CATEGORIES ---
export const getCategories = async (req, res, next) => {
  try {
    const categories = await PlayerCategory.find().sort({ priorityLevel: 1 });
    res.json({ success: true, count: categories.length, data: categories });
  } catch (e) { next(e); }
};

export const createCategory = async (req, res, next) => {
  try {
    const parsed = categorySchema.parse(req.body);
    const exists = await PlayerCategory.findOne({ name: parsed.name });
    if (exists) return res.status(409).json({ success: false, message: 'Category name already exists' });

    const existingCategories = await PlayerCategory.find().lean();
    const categoryTheme = parsed.color
      ? buildCategoryThemeFromColor(parsed.color)
      : buildCategoryTheme(parsed.name, existingCategories);

    const category = await PlayerCategory.create({
      ...parsed,
      ...categoryTheme
    });
    await logAdminAction('CREATE_CATEGORY', req.user?.email || 'admin', category);

    // Broadcast WebSocket event
    const io = req.app?.get('io');
    if (io) io.emit('category:created', category);

    res.status(201).json({ success: true, data: category });
  } catch (e) { next(e); }
};

export const updateCategory = async (req, res, next) => {
  try {
    const parsed = categoryUpdateSchema.parse(req.body);
    const category = await PlayerCategory.findById(req.params.id);
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });

    if (parsed.name) category.name = parsed.name;
    if (parsed.priorityLevel !== undefined) category.priorityLevel = parsed.priorityLevel;
    if (parsed.basePrice !== undefined) category.basePrice = parsed.basePrice;
    if (parsed.color) Object.assign(category, buildCategoryThemeFromColor(parsed.color));
    if (parsed.icon) category.icon = parsed.icon;

    await category.save();
    await logAdminAction('UPDATE_CATEGORY', req.user?.email || 'admin', category);

    // Broadcast WebSocket event
    const io = req.app?.get('io');
    if (io) io.emit('category:updated', category);

    res.json({ success: true, data: category });
  } catch (e) { next(e); }
};

export const deleteCategory = async (req, res, next) => {
  try {
    const category = await PlayerCategory.findByIdAndDelete(req.params.id);
    await logAdminAction('DELETE_CATEGORY', req.user?.email || 'admin', { id: req.params.id });

    // Broadcast WebSocket event
    const io = req.app?.get('io');
    if (io) io.emit('category:deleted', { id: req.params.id });

    res.json({ success: true, message: 'Category deleted' });
  } catch (e) { next(e); }
};

// --- BIDDING TIERS ---
export const getBiddingTiers = async (req, res, next) => {
  try {
    const tiers = await BiddingTier.find().sort({ minPercent: 1 });
    res.json({ success: true, count: tiers.length, data: tiers });
  } catch (e) { next(e); }
};

export const updateBiddingTier = async (req, res, next) => {
  try {
    const parsed = biddingTierSchema.parse(req.body);
    const tier = await BiddingTier.findByIdAndUpdate(req.params.id, parsed, { new: true });
    await logAdminAction('UPDATE_BIDDING_TIER', req.user?.email || 'admin', tier);
    res.json({ success: true, data: tier });
  } catch (e) { next(e); }
};

export const createBiddingTier = async (req, res, next) => {
  try {
    const parsed = biddingTierSchema.parse(req.body);
    const tier = await BiddingTier.create(parsed);
    await logAdminAction('CREATE_BIDDING_TIER', req.user?.email || 'admin', tier);
    res.status(201).json({ success: true, data: tier });
  } catch (e) { next(e); }
};

export const deleteBiddingTier = async (req, res, next) => {
  try {
    await BiddingTier.findByIdAndDelete(req.params.id);
    await logAdminAction('DELETE_BIDDING_TIER', req.user?.email || 'admin', { id: req.params.id });
    res.json({ success: true, message: 'Bidding tier deleted' });
  } catch (e) { next(e); }
};

// --- TEAMS ---
// GAP 11 FIX: populate currentRoster so PublicTeamsView can show roster players
export const getTeams = async (req, res, next) => {
  try {
    const teams = await Team.find()
      .populate('currentRoster', 'name jerseyName primaryPosition category finalPrice imageUrl')
      .populate('managerId', 'name email')
      .sort({ name: 1 });
    res.json({ success: true, count: teams.length, data: teams });
  } catch (e) { next(e); }
};

export const createTeam = async (req, res, next) => {
  try {
    const parsed = teamSchema.parse(req.body);
    const exists = await Team.findOne({ name: parsed.name });
    if (exists) return res.status(409).json({ success: false, message: 'Team name already exists' });

    // Auto theme calculation (Colors, Icon, Logo SVG)
    const existingTeams = await Team.find().lean();
    const teamTheme = buildCompleteTeamTheme(parsed.name, existingTeams);

    // Manual color selection overrides the auto palette
    if (parsed.primaryColor || parsed.secondaryColor) {
      const primary = (parsed.primaryColor || teamTheme.primaryColor).toLowerCase();
      const secondary = (parsed.secondaryColor || '#0f172a').toLowerCase();
      parsed.primaryColor = primary;
      parsed.secondaryColor = secondary;
      parsed.accentColor = primary;
      parsed.gradient = `from-[${primary}] to-[${secondary}]`;
      parsed.glowColor = `${primary}4d`;
    }

    const team = await Team.create({
      ...teamTheme,
      ...parsed,
      shortCode: parsed.shortCode.toUpperCase(),
      remainingBudget: parsed.totalBudget,
      // Manual icon selection overrides the auto-generated one
      ...(parsed.icon ? { icon: parsed.icon } : {})
    });
    await logAdminAction('CREATE_TEAM', req.user?.email || 'admin', team);

    // Broadcast real-time creation to all connected clients
    const io = req.app?.get('io');
    if (io) io.emit('teams:created', team);

    res.status(201).json({ success: true, data: team });
  } catch (e) { next(e); }
};

export const editTeam = async (req, res, next) => {
  try {
    const parsed = editTeamSchema.parse(req.body);
    if (parsed.shortCode) parsed.shortCode = parsed.shortCode.toUpperCase();

    // When colors are manually chosen, derive the dependent theme fields
    if (parsed.primaryColor || parsed.secondaryColor) {
      const existing = await Team.findById(req.params.id).select('primaryColor secondaryColor');
      const primary = (parsed.primaryColor || existing?.primaryColor || '#3b82f6').toLowerCase();
      const secondary = (parsed.secondaryColor || existing?.secondaryColor || '#0f172a').toLowerCase();
      parsed.primaryColor = primary;
      parsed.secondaryColor = secondary;
      parsed.gradient = `from-[${primary}] to-[${secondary}]`;
      parsed.glowColor = `${primary}4d`;
    }

    const team = await Team.findByIdAndUpdate(req.params.id, parsed, { new: true });
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });

    await logAdminAction('EDIT_TEAM', req.user?.email || 'admin', { id: req.params.id, changes: parsed });

    // Broadcast real-time update to all clients
    const io = req.app?.get('io');
    if (io) io.emit('teams:updated', team);

    res.json({ success: true, data: team });
  } catch (e) { next(e); }
};

export const deleteTeam = async (req, res, next) => {
  try {
    const team = await Team.findByIdAndDelete(req.params.id);
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });

    await logAdminAction('DELETE_TEAM', req.user?.email || 'admin', { id: req.params.id, name: team.name });

    // Broadcast real-time deletion to all clients
    const io = req.app?.get('io');
    if (io) io.emit('teams:deleted', { id: req.params.id });

    res.json({ success: true, message: `Team '${team.name}' deleted` });
  } catch (e) { next(e); }
};

// --- MANAGERS, PODIUM ADMINS & USER ACCOUNTS ---
export const getManagers = async (req, res, next) => {
  try {
    const managers = await User.find({ role: { $in: ['TEAM_MANAGER', 'PODIUM_ADMIN', 'SUPER_ADMIN', 'PLAYER', 'GENERAL_USER', 'SPECTATOR'] } })
      .populate('teamId')
      .select('-passwordHash')
      .sort({ role: 1, createdAt: -1 });
    res.json({ success: true, count: managers.length, data: managers });
  } catch (e) { next(e); }
};

export const createManager = async (req, res, next) => {
  try {
    const { name, email, password, teamId, role } = req.body;
    if (!name || !email) return res.status(400).json({ success: false, message: 'Name and email are required' });

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(409).json({ success: false, message: 'User email already exists' });

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password || 'user12345', salt);

    const targetRole = (role && ['TEAM_MANAGER', 'PODIUM_ADMIN', 'SUPER_ADMIN', 'PLAYER'].includes(role)) ? role : 'TEAM_MANAGER';

    const manager = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: targetRole,
      teamId: teamId || null,
      mustResetPassword: true
    });

    // Mirror user.teamId → Team.managerId so the two links never diverge.
    if (teamId) {
      await Team.findByIdAndUpdate(teamId, { managerId: manager._id });
    }

    await logAdminAction('CREATE_USER', req.user?.email || 'admin', { email, name, role: targetRole });
    res.status(201).json({ success: true, data: { id: manager._id, name: manager.name, email: manager.email, role: manager.role } });
  } catch (e) { next(e); }
};

export const editManager = async (req, res, next) => {
  try {
    const { name, email, role, teamId } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User account not found' });

    if (name) user.name = name;
    if (email) user.email = email.toLowerCase();
    if (role && ['TEAM_MANAGER', 'PODIUM_ADMIN', 'SUPER_ADMIN', 'PLAYER'].includes(role)) {
      user.role = role;
    }
    if (teamId !== undefined) {
      const oldTeamId = user.teamId;
      user.teamId = teamId || null;

      // Mirror user.teamId ↔ Team.managerId so the two links stay consistent:
      // release the previous team, claim the new one.
      if (oldTeamId && String(oldTeamId) !== String(teamId || '')) {
        await Team.findByIdAndUpdate(oldTeamId, { managerId: null });
      }
      if (teamId) {
        await Team.findByIdAndUpdate(teamId, { managerId: user._id });
      }
    }

    await user.save();
    await logAdminAction('EDIT_USER', req.user?.email || 'admin', { id: user._id, name: user.name, role: user.role, teamId: user.teamId });
    res.json({ success: true, message: `Account '${user.name}' updated to role '${user.role}'`, data: user });
  } catch (e) { next(e); }
};

export const handleManagerRequest = async (req, res, next) => {
  try {
    const { action } = req.body; // 'APPROVE' or 'REJECT'
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const io = req.app?.get('io');

    if (action === 'APPROVE') {
      // 1. Promote user to TEAM_MANAGER
      user.role = 'TEAM_MANAGER';
      user.managerRequestStatus = 'APPROVED';

      // 2. Find an unassigned team (managerId is null)
      let assignedTeam = null;
      const unassignedTeam = await Team.findOne({ managerId: null });

      if (unassignedTeam) {
        // 3a. Assign the unassigned team to this new manager
        unassignedTeam.managerId = user._id;
        await unassignedTeam.save();
        user.teamId = unassignedTeam._id;
        assignedTeam = unassignedTeam;

        await logAdminAction('AUTO_ASSIGN_TEAM', req.user?.email || 'admin', {
          managerId: user._id,
          managerName: user.name,
          teamId: unassignedTeam._id,
          teamName: unassignedTeam.name
        });

        // 4. Broadcast real-time team update to all clients
        if (io) {
          const populatedTeam = await Team.findById(unassignedTeam._id)
            .populate('managerId', 'name email')
            .populate('currentRoster', 'name jerseyName primaryPosition');
          io.emit('teams:updated', populatedTeam);
        }
      } else {
        // 3b. No unassigned team available — notify admin via console
        console.warn(`[handleManagerRequest] APPROVED user '${user.name}' but no unassigned teams are available.`);
      }

      await user.save();
      await logAdminAction('APPROVE_MANAGER_REQUEST', req.user?.email || 'admin', {
        id: user._id,
        email: user.email,
        teamAssigned: assignedTeam ? assignedTeam.name : 'None (no available teams)'
      });

      // 5. Emit role update so the user's browser updates without refresh
      if (io) {
        io.emit('user:role_updated', {
          userId: user._id.toString(),
          newRole: 'TEAM_MANAGER',
          teamId: user.teamId ? user.teamId.toString() : null,
          teamName: assignedTeam ? assignedTeam.name : null
        });
      }

      const message = assignedTeam
        ? `Manager request APPROVED for '${user.name}'. Assigned to team: ${assignedTeam.name}`
        : `Manager request APPROVED for '${user.name}'. No unassigned teams available — please create or assign a team manually.`;

      return res.json({
        success: true,
        message,
        data: user,
        teamAssigned: assignedTeam || null,
        noTeamAvailable: !assignedTeam
      });

    } else if (action === 'REJECT') {
      user.managerRequestStatus = 'REJECTED';
      // Keep role as PLAYER — do not promote
      await user.save();
      await logAdminAction('REJECT_MANAGER_REQUEST', req.user?.email || 'admin', { id: user._id, email: user.email });

      // Notify the user's browser about rejection
      if (io) {
        io.emit('user:role_updated', {
          userId: user._id.toString(),
          newRole: user.role, // stays PLAYER
          managerRequestStatus: 'REJECTED'
        });
      }

      return res.json({ success: true, message: `Manager request REJECTED for '${user.name}'.`, data: user });
    } else {
      return res.status(400).json({ success: false, message: "Invalid action. Must be 'APPROVE' or 'REJECT'." });
    }
  } catch (e) { next(e); }
};

export const handlePlayerRequest = async (req, res, next) => {
  try {
    const { action } = req.body; // 'APPROVE' or 'REJECT'
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const io = req.app?.get('io');

    if (action === 'APPROVE') {
      user.role = 'PLAYER';
      user.playerRequestStatus = 'APPROVED';

      // Create a Player record for this user if one doesn't exist
      let player = await Player.findOne({ userId: user._id });
      if (!player) {
        const currentSession = await Session.findOne({ isCurrent: true }) || await Session.findOne();
        const playerCode = 'GEN-' + Math.floor(1000 + Math.random() * 9000);
        player = await Player.create({
          userId: user._id,
          name: user.name,
          studentId: playerCode,
          email: user.email,
          session: currentSession?.name || '2026',
          jerseyName: user.name.split(' ')[0].toUpperCase(),
          tShirtSize: 'L',
          positions: ['Forward'],
          primaryPosition: 'Forward',
          status: 'UNSOLD',
          registrationStatus: 'APPROVED',
          category: 'SILVER',
          basePrice: 50000,
          imageUrl: user.profilePhoto || ''
        });
      }

      await user.save();
      await logAdminAction('APPROVE_PLAYER_REQUEST', req.user?.email || 'admin', { id: user._id, email: user.email });

      if (io) {
        io.emit('user:role_updated', {
          userId: user._id.toString(),
          newRole: 'PLAYER',
          playerRequestStatus: 'APPROVED'
        });
        io.emit('players:updated', player);
      }

      return res.json({
        success: true,
        message: `Player request APPROVED for '${user.name}'. Account promoted to Player role.`,
        data: user,
        player
      });
    } else if (action === 'REJECT') {
      user.playerRequestStatus = 'REJECTED';
      await user.save();
      await logAdminAction('REJECT_PLAYER_REQUEST', req.user?.email || 'admin', { id: user._id, email: user.email });

      if (io) {
        io.emit('user:role_updated', {
          userId: user._id.toString(),
          newRole: user.role,
          playerRequestStatus: 'REJECTED'
        });
      }

      return res.json({ success: true, message: `Player request REJECTED for '${user.name}'.`, data: user });
    } else {
      return res.status(400).json({ success: false, message: "Invalid action. Must be 'APPROVE' or 'REJECT'." });
    }
  } catch (e) { next(e); }
};

export const deleteManager = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Cascade: deleting a user account must also remove the player profile it
    // owns. Previously only the User document was deleted, leaving an orphaned
    // Player record that every list endpoint kept returning — the "deleted
    // player still shows in the frontend" bug.
    let removedPlayers = 0;
    const ownedPlayers = await Player.find({ userId: user._id }).select('_id');
    for (const p of ownedPlayers) {
      const result = await deletePlayerEverywhere(p._id, req.app?.get('io'));
      if (result.found) removedPlayers += 1;
    }

    await User.findByIdAndDelete(req.params.id);
    await logAdminAction('DELETE_USER', req.user?.email || 'admin', { id: req.params.id, email: user.email, playersRemoved: removedPlayers });
    res.json({ success: true, message: `Account '${user.name}' deleted` });
  } catch (e) { next(e); }
};

export const resetManagerPassword = async (req, res, next) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.mustResetPassword = true;
    await user.save();

    await logAdminAction('RESET_PASSWORD', req.user?.email || 'admin', { id: req.params.id, email: user.email });
    res.json({ success: true, message: `Password reset for ${user.name}. They must change it on next login.` });
  } catch (e) { next(e); }
};

export const createPodiumAdmin = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email) return res.status(400).json({ success: false, message: 'Name and email are required' });

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(400).json({ success: false, message: 'Email already registered' });

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password || 'podium123', salt);

    const podiumAdmin = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: 'PODIUM_ADMIN',
      mustResetPassword: true
    });

    await logAdminAction('CREATE_PODIUM_ADMIN', req.user?.email || 'admin', { email, name });
    res.status(201).json({ success: true, data: { id: podiumAdmin._id, name: podiumAdmin.name, email: podiumAdmin.email, role: podiumAdmin.role } });
  } catch (e) { next(e); }
};

// --- PLAYER MANAGEMENT ---
export const getAdminPlayers = async (req, res, next) => {
  try {
    const { status, category, search } = req.query;
    let query = {};
    if (status) query.status = status;
    if (category) query.category = category;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { studentId: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Only CURRENT, valid player records leave this API. Records whose owning
    // User account no longer exists (deleted directly in the DB or before the
    // cascade fix) are stale orphans and must never reach the frontend.
    let players = await Player.find(query).sort({ createdAt: -1 }).lean();
    const ownerIds = [...new Set(players.map((p) => p.userId?.toString()).filter(Boolean))];
    if (ownerIds.length > 0) {
      const existingUsers = await User.find({ _id: { $in: ownerIds } }).select('_id').lean();
      const validOwnerIds = new Set(existingUsers.map((u) => u._id.toString()));
      players = players.filter((p) => !p.userId || validOwnerIds.has(p.userId.toString()));
    }

    res.json({ success: true, count: players.length, data: players });
  } catch (e) { next(e); }
};

// DELETE /api/admin/players/:id — permanent delete + full reference & asset
// cleanup. Idempotent-safe: an already-deleted id yields a clean 404 instead
// of a crash. The response contract matches the other admin mutations.
export const deletePlayer = async (req, res, next) => {
  try {
    const result = await deletePlayerEverywhere(req.params.id, req.app?.get('io'));

    if (!result.found) {
      return res.status(404).json({ success: false, message: 'Player not found' });
    }

    await logAdminAction('DELETE_PLAYER', req.user?.email || 'admin', {
      playerId: req.params.id,
      name: result.player.name,
      cloudinaryDeleted: result.cloudinaryDeleted
    });

    res.json({
      success: true,
      message: `Player '${result.player.name}' permanently deleted`,
      data: { id: req.params.id }
    });
  } catch (e) { next(e); }
};

export const editPlayer = async (req, res, next) => {
  try {
    const { Player } = await import('../models/Player.js');
    const parsed = editPlayerSchema.parse(req.body);

    if (parsed.jerseyName) parsed.jerseyName = parsed.jerseyName.toUpperCase();

    const player = await Player.findByIdAndUpdate(req.params.id, parsed, { new: true });
    if (!player) return res.status(404).json({ success: false, message: 'Player not found' });

    await logAdminAction('EDIT_PLAYER', req.user?.email || 'admin', { id: req.params.id, changes: parsed });

    const io = req.app?.get('io');
    if (io) io.emit('player:updated', player);

    res.json({ success: true, data: player });
  } catch (e) { next(e); }
};

export const approvePlayer = async (req, res, next) => {
  try {
    const { Player } = await import('../models/Player.js');
    const player = await Player.findByIdAndUpdate(
      req.params.id,
      { status: 'APPROVED' },
      { new: true }
    );
    if (!player) return res.status(404).json({ success: false, message: 'Player not found' });

    await logAdminAction('APPROVE_PLAYER', req.user?.email || 'admin', { playerId: req.params.id, name: player.name });

    const io = req.app?.get('io');
    if (io) io.emit('player:updated', player);

    res.json({ success: true, message: `Player '${player.name}' approved`, data: player });
  } catch (e) { next(e); }
};

export const banPlayer = async (req, res, next) => {
  try {
    const { Player } = await import('../models/Player.js');
    const player = await Player.findById(req.params.id);
    if (!player) return res.status(404).json({ success: false, message: 'Player not found' });

    const newStatus = player.status === 'BANNED' ? 'REGISTERED' : 'BANNED';
    player.status = newStatus;
    await player.save();

    await logAdminAction('TOGGLE_BAN_PLAYER', req.user?.email || 'admin', { playerId: req.params.id, newStatus });

    const io = req.app?.get('io');
    if (io) io.emit('player:updated', player);

    res.json({ success: true, data: player, message: `Player ${newStatus === 'BANNED' ? 'banned' : 'unbanned'} successfully` });
  } catch (e) { next(e); }
};

// --- REPORTS ---
export const getReports = async (req, res, next) => {
  try {
    const { Player } = await import('../models/Player.js');
    const { AuctionLedger } = await import('../models/AuctionLedger.js');

    const [
      totalPlayers,
      soldPlayers,
      unsoldPlayers,
      teams,
      ledger,
      auditLogs
    ] = await Promise.all([
      Player.countDocuments(),
      Player.countDocuments({ status: 'SOLD' }),
      Player.countDocuments({ status: 'UNSOLD' }),
      Team.find().select('name totalBudget remainingBudget currentRosterCount'),
      AuctionLedger.find().sort({ createdAt: -1 }).limit(200),
      AuditLog.find().sort({ createdAt: -1 }).limit(100)
    ]);

    const totalSpent = ledger.reduce((sum, entry) => sum + (entry.soldPrice || 0), 0);

    res.json({
      success: true,
      data: {
        summary: {
          totalPlayers,
          soldPlayers,
          unsoldPlayers,
          registeredPlayers: await Player.countDocuments({ status: 'REGISTERED' }),
          totalTeams: teams.length,
          totalSpent
        },
        teams,
        recentTransactions: ledger,
        recentAuditLogs: auditLogs
      }
    });
  } catch (e) { next(e); }
};

export const exportReports = async (req, res, next) => {
  try {
    const { Player } = await import('../models/Player.js');
    const { AuctionLedger } = await import('../models/AuctionLedger.js');

    const [players, teams, ledger] = await Promise.all([
      Player.find().sort({ createdAt: -1 }),
      Team.find().sort({ name: 1 }),
      AuctionLedger.find().sort({ createdAt: -1 })
    ]);

    res.json({
      success: true,
      exportedAt: new Date().toISOString(),
      data: { players, teams, ledger }
    });
  } catch (e) { next(e); }
};
