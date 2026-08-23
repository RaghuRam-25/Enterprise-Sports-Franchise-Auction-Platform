import { Player } from '../models/Player.js';
import { PlayerCategory } from '../models/PlayerCategory.js';
import { Session } from '../models/Session.js';
import { Position } from '../models/Position.js';
import { Team } from '../models/Team.js';
import { User } from '../models/User.js';
import { SystemConfig, getConfig, setConfig } from '../models/SystemConfig.js';
import { isRegistrationFrozen as isRegFrozenByPhase, getCurrentPhase } from '../services/phaseService.js';
import { evaluateRegistrationAccess, getRegistrationSchedule, resolveRegistrationWindow, isRegistrationOpen, describeWindowState } from '../services/registrationSchedule.js';
import { processAndUploadImage, deleteCloudinaryAsset } from '../services/imageService.js';
import { resolveFieldCoords } from '../utils/fieldPositions.js';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

// ── GET OWN PLAYER PROFILE ───────────────────────────────────────────────────
export const getMyPlayerProfile = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const player = await Player.findOne({ userId: req.user.id });

    if (!player) {
      return res.status(404).json({ success: false, message: 'Player profile not found for this user account.' });
    }

    res.json({ success: true, data: player });
  } catch (e) {
    next(e);
  }
};

// ── Registration Status — event phase + AUTOMATIC scheduled window ────────────
// The phase state machine is the lifecycle upper bound; the Super-Admin-set
// registration window (start/end times) drives open/close automatically:
// before start → closed, at start → open, after end → closed.
export const getRegistrationStatus = async (req, res, next) => {
  try {
    const access = await evaluateRegistrationAccess();
    res.json({
      success: true,
      isRegistrationFrozen: !access.isOpen,
      isOpen: access.isOpen,
      phase: access.phase,
      registrationWindow: access.win,
      message: access.message,
      serverTime: new Date().toISOString(),
    });
  } catch (e) {
    // Surface failures instead of silently claiming "frozen" (which would lock
    // the registration UI on a DB/phase-service outage).
    next(e);
  }
};

// Retained endpoint: registration open/closed is controlled by advancing the
// phase (PATCH /api/phase), so this now reports guidance rather than flipping a
// standalone boolean that could drift from the phase.
export const toggleRegistrationFreeze = async (req, res) => {
  try {
    const phase = await getCurrentPhase();
    const isRegistrationFrozen = await isRegFrozenByPhase();
    res.status(409).json({
      success: false,
      isRegistrationFrozen,
      phase,
      message:
        'Registration open/closed is now controlled by the event phase. ' +
        'Advance the phase via PATCH /api/phase (SETUP → REGISTRATION opens it, ' +
        'REGISTRATION → AUCTION freezes it).',
    });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to read registration phase' });
  }
};

// ── Validation Schemas ────────────────────────────────────────────────────────
const registerPlayerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  studentId: z.string().min(3),
  session: z.string().min(2),
  jerseyName: z.string().max(15),
  tShirtSize: z.enum(['S', 'M', 'L', 'XL', 'XXL']),
  tShirtNumber: z.string().optional(),
  positions: z.union([z.array(z.string()), z.string()]),
  primaryPosition: z.string().min(1),
  category: z.string().optional()
});

const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  bio: z.string().optional(),
  address: z.string().optional(),
  session: z.string().min(2).optional(),
  jerseyName: z.string().max(15).optional(),
  positions: z.union([z.array(z.string()), z.string()]).optional(),
  primaryPosition: z.string().optional(),
  tShirtSize: z.enum(['S', 'M', 'L', 'XL', 'XXL']).optional(),
  tShirtNumber: z.string().optional(),
  imageUrl: z.string().optional(),
  // Premium profile card attributes
  age: z.union([z.number().int().min(5).max(120), z.string(), z.null()]).optional(),
  height: z.string().max(20).optional(),
  preferredFoot: z.enum(['', 'Left', 'Right', 'Both']).optional(),
  nationality: z.string().max(80).optional(),
  // Performance statistics
  matchesPlayed: z.union([z.number().int().min(0).max(99), z.string(), z.null()]).optional(),
  goals: z.union([z.number().int().min(0).max(99), z.string(), z.null()]).optional(),
  assists: z.union([z.number().int().min(0).max(99), z.string(), z.null()]).optional(),
  yellowCards: z.union([z.number().int().min(0).max(99), z.string(), z.null()]).optional(),
  redCards: z.union([z.number().int().min(0).max(99), z.string(), z.null()]).optional(),
  cleanSheets: z.union([z.number().int().min(0).max(99), z.string(), z.null()]).optional()
}).partial();

// ── Public player fields (visible to Spectators / unauthenticated) ────────────
const PUBLIC_PLAYER_FIELDS = 'name jerseyName studentId basePrice positions primaryPosition category session imageUrl status soldToTeam finalPrice tShirtNumber';

// ── REGISTER PLAYER ───────────────────────────────────────────────────────────
export const registerPlayer = async (req, res, next) => {
  try {
    // Server-side AUTOMATIC registration window check (defense in depth — the
    // route middleware already gates this). A configured start/end window is
    // authoritative: before startTime → blocked, at startTime → open,
    // after endTime → blocked. Without a window, the legacy phase rule
    // (SETUP or REGISTRATION) applies. SUPER_ADMIN retains a bypass.
    const currentPhase = await getCurrentPhase();
    const schedule = await getRegistrationSchedule();
    const win = resolveRegistrationWindow(schedule, new Date());

    if (!isRegistrationOpen(currentPhase, win) && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        message: `Registration is currently closed. ${describeWindowState(win)}.`,
        registrationWindow: win,
        serverTime: new Date().toISOString(),
      });
    }

    const body = req.body;
    let positionsArr = Array.isArray(body.positions)
      ? body.positions
      : typeof body.positions === 'string'
        ? JSON.parse(body.positions)
        : [body.positions];

    const parsed = registerPlayerSchema.parse({ ...body, positions: positionsArr });

    // 1. Check unique studentId and email
    const existingPlayer = await Player.findOne({ studentId: parsed.studentId });
    if (existingPlayer) {
      return res.status(409).json({ success: false, message: `Student ID ${parsed.studentId} is already registered.` });
    }

    const existingUser = await User.findOne({ email: parsed.email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ success: false, message: `Email ${parsed.email} is already registered.` });
    }

    // 2. Validate session exists in DB
    const sessionExists = await Session.findOne({ name: parsed.session });
    if (!sessionExists) {
      return res.status(400).json({ success: false, message: `Session '${parsed.session}' does not exist. Please select a valid session.` });
    }

    // 3. Validate positions exist in DB
    if (!positionsArr || positionsArr.length === 0) {
      return res.status(400).json({ success: false, message: 'Must select at least one position' });
    }

    const validPositions = await Position.find({ code: { $in: positionsArr } });
    const validCodes = validPositions.map(p => p.code);
    const invalidCodes = positionsArr.filter(c => !validCodes.includes(c));
    if (invalidCodes.length > 0) {
      return res.status(400).json({ success: false, message: `Invalid position code(s): ${invalidCodes.join(', ')}` });
    }

    if (!positionsArr.includes(parsed.primaryPosition)) {
      return res.status(400).json({ success: false, message: 'Primary position must be one of the selected positions' });
    }

    // 3. Create User account for authentication
    const passwordHash = await bcrypt.hash(parsed.password, 10);
    const user = await User.create({
      name: parsed.name,
      email: parsed.email.toLowerCase(),
      passwordHash,
      role: 'PLAYER'
    });

    // 4. Image upload processing using Sharp WebP pipeline.
    //    processAndUploadImage returns { url, publicId }; url is a permanent
    //    Cloudinary secure_url in production (persisted in DB) or null when the
    //    upload failed — in that case imageUrl stays null and the frontend
    //    renders its generic footballer placeholder. Default imageUrl is null.
    let imageUrl = null;
    let imagePublicId = null;
    if (req.file) {
      const uploaded = await processAndUploadImage(req.file.buffer, parsed.studentId);
      imageUrl = uploaded.url || null;
      imagePublicId = uploaded.publicId || null;
    }

    // 5. Default the player to the LAST category in the list (the one with the
import { z } from 'zod';

// ── GET OWN PLAYER PROFILE ───────────────────────────────────────────────────
export const getMyPlayerProfile = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const player = await Player.findOne({ userId: req.user.id });

    if (!player) {
      return res.status(404).json({ success: false, message: 'Player profile not found for this user account.' });
    }

    res.json({ success: true, data: player });
  } catch (e) {
    next(e);
  }
};

// ── Registration Status — event phase + AUTOMATIC scheduled window ────────────
// The phase state machine is the lifecycle upper bound; the Super-Admin-set
// registration window (start/end times) drives open/close automatically:
// before start → closed, at start → open, after end → closed.
export const getRegistrationStatus = async (req, res, next) => {
  try {
    const access = await evaluateRegistrationAccess();
    res.json({
      success: true,
      isRegistrationFrozen: !access.isOpen,
      isOpen: access.isOpen,
      phase: access.phase,
      registrationWindow: access.win,
      message: access.message,
      serverTime: new Date().toISOString(),
    });
  } catch (e) {
    // Surface failures instead of silently claiming "frozen" (which would lock
    // the registration UI on a DB/phase-service outage).
    next(e);
  }
};

// Retained endpoint: registration open/closed is controlled by advancing the
// phase (PATCH /api/phase), so this now reports guidance rather than flipping a
// standalone boolean that could drift from the phase.
export const toggleRegistrationFreeze = async (req, res) => {
  try {
    const phase = await getCurrentPhase();
    const isRegistrationFrozen = await isRegFrozenByPhase();
    res.status(409).json({
      success: false,
      isRegistrationFrozen,
      phase,
      message:
        'Registration open/closed is now controlled by the event phase. ' +
        'Advance the phase via PATCH /api/phase (SETUP → REGISTRATION opens it, ' +
        'REGISTRATION → AUCTION freezes it).',
    });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to read registration phase' });
  }
};

// ── Validation Schemas ────────────────────────────────────────────────────────
const registerPlayerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  studentId: z.string().min(3),
  session: z.string().min(2),
  jerseyName: z.string().max(15),
  tShirtSize: z.enum(['S', 'M', 'L', 'XL', 'XXL']),
  tShirtNumber: z.string().optional(),
  positions: z.union([z.array(z.string()), z.string()]),
  primaryPosition: z.string().min(1),
  category: z.string().optional()
});

const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  bio: z.string().optional(),
  address: z.string().optional(),
  session: z.string().min(2).optional(),
  jerseyName: z.string().max(15).optional(),
  positions: z.union([z.array(z.string()), z.string()]).optional(),
  primaryPosition: z.string().optional(),
  tShirtSize: z.enum(['S', 'M', 'L', 'XL', 'XXL']).optional(),
  tShirtNumber: z.string().optional(),
  imageUrl: z.string().optional(),
  // Premium profile card attributes
  age: z.union([z.number().int().min(5).max(120), z.string(), z.null()]).optional(),
  height: z.string().max(20).optional(),
  preferredFoot: z.enum(['', 'Left', 'Right', 'Both']).optional(),
  nationality: z.string().max(80).optional(),
  // Performance statistics
  matchesPlayed: z.union([z.number().int().min(0).max(99), z.string(), z.null()]).optional(),
  goals: z.union([z.number().int().min(0).max(99), z.string(), z.null()]).optional(),
  assists: z.union([z.number().int().min(0).max(99), z.string(), z.null()]).optional(),
  yellowCards: z.union([z.number().int().min(0).max(99), z.string(), z.null()]).optional(),
  redCards: z.union([z.number().int().min(0).max(99), z.string(), z.null()]).optional(),
  cleanSheets: z.union([z.number().int().min(0).max(99), z.string(), z.null()]).optional()
}).partial();

// ── Public player fields (visible to Spectators / unauthenticated) ────────────
const PUBLIC_PLAYER_FIELDS = 'name jerseyName studentId basePrice positions primaryPosition category session imageUrl status soldToTeam finalPrice tShirtNumber';

// ── REGISTER PLAYER ───────────────────────────────────────────────────────────
export const registerPlayer = async (req, res, next) => {
  try {
    const currentPhase = await getCurrentPhase();
    const schedule = await getRegistrationSchedule();
    const win = resolveRegistrationWindow(schedule, new Date());

    if (!isRegistrationOpen(currentPhase, win) && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        message: `Registration is currently closed. ${describeWindowState(win)}.`,
        registrationWindow: win,
        serverTime: new Date().toISOString(),
      });
    }

    const body = req.body;
    let positionsArr = Array.isArray(body.positions)
      ? body.positions
      : typeof body.positions === 'string'
        ? JSON.parse(body.positions)
        : [body.positions];

    const parsed = registerPlayerSchema.parse({ ...body, positions: positionsArr });

    const existingPlayer = await Player.findOne({ studentId: parsed.studentId });
    if (existingPlayer) {
      return res.status(409).json({ success: false, message: `Student ID ${parsed.studentId} is already registered.` });
    }

    const existingUser = await User.findOne({ email: parsed.email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ success: false, message: `Email ${parsed.email} is already registered.` });
    }

    const sessionExists = await Session.findOne({ name: parsed.session });
    if (!sessionExists) {
      return res.status(400).json({ success: false, message: `Session '${parsed.session}' does not exist. Please select a valid session.` });
    }

    if (!positionsArr || positionsArr.length === 0) {
      return res.status(400).json({ success: false, message: 'Must select at least one position' });
    }

    const validPositions = await Position.find({ code: { $in: positionsArr } });
    const validCodes = validPositions.map(p => p.code);
    const invalidCodes = positionsArr.filter(c => !validCodes.includes(c));
    if (invalidCodes.length > 0) {
      return res.status(400).json({ success: false, message: `Invalid position code(s): ${invalidCodes.join(', ')}` });
    }

    if (!positionsArr.includes(parsed.primaryPosition)) {
      return res.status(400).json({ success: false, message: 'Primary position must be one of the selected positions' });
    }

    const passwordHash = await bcrypt.hash(parsed.password, 10);
    const user = await User.create({
      name: parsed.name,
      email: parsed.email.toLowerCase(),
      passwordHash,
      role: 'PLAYER'
    });

    let imageUrl = null;
    let imagePublicId = null;
    if (req.file) {
      const uploaded = await processAndUploadImage(req.file.buffer, parsed.studentId);
      imageUrl = uploaded.url || null;
      imagePublicId = uploaded.publicId || null;
    }

    let category = parsed.category || 'B Grade';
    let basePrice = 2000000;
    if (!parsed.category) {
      const defaultCategoryDoc = await PlayerCategory.findOne({ isActive: true }).sort({ priorityLevel: -1 });
      if (defaultCategoryDoc) {
        category = defaultCategoryDoc.name;
        basePrice = defaultCategoryDoc.basePrice;
      }
    }

    let player;
    try {
      player = await Player.create({
        name: parsed.name,
        email: parsed.email.toLowerCase(),
        userId: user._id,
        studentId: parsed.studentId,
        session: parsed.session,
        jerseyName: parsed.jerseyName.toUpperCase(),
        tShirtSize: parsed.tShirtSize,
        tShirtNumber: parsed.tShirtNumber || '',
        positions: positionsArr,
        primaryPosition: parsed.primaryPosition,
        imageUrl,
        imagePublicId,
        category,
        basePrice,
        status: 'REGISTERED'
      });
    } catch (dbErr) {
      if (imagePublicId) await deleteCloudinaryAsset(imagePublicId);
      throw dbErr;
    }

    const io = req.app?.get('io');
    if (io) {
      io.emit('player:updated', player);
    }

    res.status(201).json({
      success: true,
      message: 'Player registered successfully',
      data: player
    });
  } catch (e) { next(e); }
};

// ── GET ALL PLAYERS (role-tiered response) ────────────────────────────────────
export const getPlayers = async (req, res, next) => {
  try {
    const { status, category, search } = req.query;
    let query = {};

    if (status) query.status = status;
    if (category) query.category = category;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { studentId: { $regex: search, $options: 'i' } }
      ];
    }

    const role = req.user?.role;
    const isPrivileged = ['TEAM_MANAGER', 'PODIUM_ADMIN', 'SUPER_ADMIN'].includes(role);

    const projection = isPrivileged ? undefined : PUBLIC_PLAYER_FIELDS;

    let players = await Player.find(query, projection).sort({ createdAt: -1 }).lean();

    const ownerIds = [...new Set(players.map((p) => p.userId?.toString()).filter(Boolean))];
    if (ownerIds.length > 0) {
      const existingUsers = await User.find({ _id: { $in: ownerIds } }).select('_id').lean();
      const validOwnerIds = new Set(existingUsers.map((u) => u._id.toString()));
      players = players.filter((p) => !p.userId || validOwnerIds.has(p.userId.toString()));
    }

    res.json({ success: true, count: players.length, data: players });
  } catch (e) { next(e); }
};

// ── WITHDRAW PLAYER (own-resource guard enforced in route layer) ──────────────
export const withdrawPlayer = async (req, res, next) => {
  try {
    const isRegistrationFrozen = await isRegFrozenByPhase();

    if (isRegistrationFrozen && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ success: false, message: 'Cannot withdraw: Registration freeze is active.' });
    }

    if (req.user?.role === 'PLAYER') {
      const player = await Player.findById(req.params.id);
      if (!player) return res.status(404).json({ success: false, message: 'Player not found' });
      if (player.userId?.toString() !== req.user._id?.toString()) {
        return res.status(403).json({ success: false, message: 'You can only withdraw your own registration' });
      }
    }

    const player = await Player.findByIdAndUpdate(
      req.params.id,
      { status: 'WITHDRAWN' },
      { new: true }
    );

    const io = req.app?.get('io');
    if (io) {
      io.emit('player:updated', player);
    }

    res.json({ success: true, message: 'Participation withdrawn successfully', data: player });
  } catch (e) { next(e); }
};

// Helper: Resolve player's position in sold team lineup (single source of truth)
export const getPlayerLineupPosition = async (player) => {
  if (player.status !== 'SOLD' || !player.soldToTeam) {
    return { assignedPosition: player.primaryPosition, slot: null, isStarter: false, isSub: false };
  }
  const teamId = player.soldToTeam._id || player.soldToTeam;
  const team = await Team.findById(teamId).select('formation lineup substitutes');
  if (!team) {
    return { assignedPosition: player.primaryPosition, slot: null, isStarter: false, isSub: false };
  }
  const playerIdStr = String(player._id || player.id);
  if (Array.isArray(team.lineup)) {
    const item = team.lineup.find(l => l && l.playerId && String(l.playerId) === playerIdStr);
    if (item && item.slot) {
      const posCode = String(item.slot).replace(/\d+$/, '').toUpperCase();
      return { assignedPosition: posCode, slot: item.slot, isStarter: true, isSub: false, formation: team.formation };
    }
  }
  if (Array.isArray(team.substitutes) && team.substitutes.some(id => String(id) === playerIdStr)) {
    return { assignedPosition: 'SUB', slot: 'SUB', isStarter: false, isSub: true, formation: team.formation };
  }
  return { assignedPosition: player.primaryPosition, slot: null, isStarter: false, isSub: false, formation: team.formation };
};

// ── GET OWN PLAYER PROFILE (/api/players/me) ─────────────────────────────────
export const getMyProfile = async (req, res, next) => {
  try {
    const userId = req.user._id;
    let player = await Player.findOne({ userId }).populate('soldToTeam', 'name logo logoUrl shortCode');
    if (!player && req.user.email) {
      player = await Player.findOne({ email: req.user.email }).populate('soldToTeam', 'name logo logoUrl shortCode');
    }
    if (!player) {
      return res.status(404).json({ success: false, message: 'No player profile found for this account' });
    }

    const playerObj = player.toObject();
    if (player.status === 'SOLD' && player.soldToTeam) {
      const posInfo = await getPlayerLineupPosition(player);
      playerObj.assignedTeamPosition = posInfo.assignedPosition;
      playerObj.assignedTeamSlot = posInfo.slot;
    } else {
      playerObj.assignedTeamPosition = player.primaryPosition;
    }

    res.json({ success: true, data: playerObj });
  } catch (e) { next(e); }
};

// ── GET OWN FIELD POSITION (/api/players/field-position) ─────────────────────
// Powers the full-screen "Field Position Reveal" page. Returns the sold
// player's assigned team, their position code, and the pitch coordinates
// (percentages, attacking-right) used to place the marker.
export const getMyFieldPosition = async (req, res, next) => {
  try {
    const userId = req.user._id;

    let player = await Player.findOne({ userId }).populate('soldToTeam', 'name logo logoUrl shortCode');
    if (!player && req.user.email) {
      player = await Player.findOne({ email: req.user.email }).populate('soldToTeam', 'name logo logoUrl shortCode');
    }

    if (!player) {
      return res.status(404).json({ success: false, message: 'No player profile found for this account' });
    }

    // Only sold players have a field position to reveal.
    if (player.status !== 'SOLD' || !player.soldToTeam) {
      return res.status(404).json({
        success: false,
        code: 'NOT_SOLD',
        message: 'You have not been drafted yet.'
      });
    }

    // Single Source of Truth: Get position from Manager's saved squad lineup
    const posInfo = await getPlayerLineupPosition(player);
    const code = posInfo.assignedPosition || player.primaryPosition;
    const positionDoc = code ? await Position.findOne({ code }) : null;
    const { fieldX, fieldY } = resolveFieldCoords(code, positionDoc);

    const team = player.soldToTeam;

    res.json({
      success: true,
      data: {
        team: {
          name: team?.name || 'Franchise Team',
          logoUrl: team?.logoUrl || team?.logo || '',
          shortCode: team?.shortCode || ''
        },
        assignedFieldPosition: code || null,
        positionName: positionDoc?.name || code || null,
        fieldX,
        fieldY,
        soldPrice: player.finalPrice || 0
      }
    });
  } catch (e) { next(e); }
};

// ── GET PLAYER'S MY TEAM SQUAD LINEUP (/api/players/my-team) ─────────────────
export const getMyTeamLineup = async (req, res, next) => {
  try {
    const userId = req.user._id;
    let player = await Player.findOne({ userId }).populate('soldToTeam');
    if (!player && req.user.email) {
      player = await Player.findOne({ email: req.user.email }).populate('soldToTeam');
    }

    if (!player) {
      return res.status(404).json({ success: false, message: 'No player profile found for this account' });
    }

    if (player.status !== 'SOLD' || !player.soldToTeam) {
      return res.status(404).json({
        success: false,
        code: 'NOT_SOLD',
        message: 'You have not been drafted yet.'
      });
    }

    const teamId = player.soldToTeam._id || player.soldToTeam;
    const team = await Team.findById(teamId)
      .populate({ path: 'lineup.playerId', select: 'name jerseyName primaryPosition positions category finalPrice imageUrl studentId tShirtNumber' })
      .populate({ path: 'substitutes', select: 'name jerseyName primaryPosition positions category finalPrice imageUrl studentId tShirtNumber' })
      .populate('managerId', 'name email');

    if (!team) {
      return res.status(404).json({ success: false, message: 'Assigned franchise team not found' });
    }

    // Get all players sold to this team
    const allRoster = await Player.find({ soldToTeam: team._id, status: 'SOLD' })
      .select('name jerseyName primaryPosition positions category finalPrice imageUrl studentId tShirtNumber')
      .sort({ finalPrice: -1 });

    const posInfo = await getPlayerLineupPosition(player);

    res.json({
      success: true,
      data: {
        team: {
          id: team._id,
          name: team.name,
          logoUrl: team.logoUrl || team.logo || '',
          shortCode: team.shortCode,
          primaryColor: team.primaryColor || '#0B2B26',
          totalBudget: team.totalBudget || 0,
          remainingBudget: team.remainingBudget || 0,
        },
        manager: team.managerId ? { name: team.managerId.name, email: team.managerId.email } : null,
        formation: team.formation || '4-3-3',
        lineup: team.lineup || [],
        substitutes: team.substitutes || [],
        roster: allRoster || [],
        chemistry: team.chemistry || 0,
        collectiveStrength: team.collectiveStrength || 0,
        squadStatus: team.squadStatus || 'DRAFT',
        myPosition: posInfo.assignedPosition
      }
    });
  } catch (e) { next(e); }
};

// ── UPDATE OWN PLAYER PROFILE ────────────────────────────────────────────────
export const updatePlayerProfile = async (req, res, next) => {
  try {
    const player = await Player.findById(req.params.id);
    if (!player) return res.status(404).json({ success: false, message: 'Player not found' });

    // Authorization: User can update their own profile, Super Admins can update any
    if (req.user?.role === 'PLAYER' && player.userId?.toString() !== req.user._id?.toString()) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const isRegistrationFrozen = await isRegFrozenByPhase();
    const body = req.body;
    const parsed = updateProfileSchema.parse(body);

    // url=null and the existing photo is kept untouched.
    let uploadedImage = null;
    if (req.file) {
      uploadedImage = await processAndUploadImage(req.file.buffer, player.studentId);
    }

    // Positions parser helper
    if (parsed.positions && typeof parsed.positions === 'string') {
      try { parsed.positions = JSON.parse(parsed.positions); }
      catch (_) { parsed.positions = [parsed.positions]; }
    }

    // Freeze enforcement check
    if (isRegistrationFrozen && req.user?.role === 'PLAYER') {
      if (parsed.session !== undefined && parsed.session !== player.session) {
        return res.status(403).json({ success: false, message: 'Academic session cannot be modified during Registration Freeze' });
      }
      if (parsed.primaryPosition !== undefined && parsed.primaryPosition !== player.primaryPosition) {
        return res.status(403).json({ success: false, message: 'Primary position cannot be modified during Registration Freeze' });
      }
    }

    // For Player role: studentId and email are NEVER editable
    delete parsed.studentId;
    delete parsed.email;

    const allowedFields = req.user?.role === 'PLAYER'
      ? ['name', 'phone', 'bio', 'address', 'session', 'jerseyName', 'positions', 'primaryPosition', 'tShirtSize', 'tShirtNumber', 'imageUrl', 'age', 'height', 'preferredFoot', 'nationality', 'matchesPlayed', 'goals', 'assists', 'yellowCards', 'redCards', 'cleanSheets']
      : Object.keys(parsed);

    const update = {};
    for (const key of allowedFields) {
      if (parsed[key] !== undefined) update[key] = parsed[key];
    }

    // New photo wins over any imageUrl string the client may have sent, and
    // its Cloudinary public_id is persisted alongside for lifecycle cleanup.
    // Image fields are set explicitly so they apply for every caller role.
    if (uploadedImage && uploadedImage.url) {
      update.imageUrl = uploadedImage.url;
      update.imagePublicId = uploadedImage.publicId || null;
    }

    // FormData sends numbers as strings — normalize before persisting.
    if (update.age === '' || update.age === null || update.age === undefined) {
      update.age = null;
    } else {
      const age = Number(update.age);
      update.age = Number.isFinite(age) ? age : null;
    }

    // Performance stats — FormData sends them as strings; coerce to non-negative ints.
    ['matchesPlayed', 'goals', 'assists', 'yellowCards', 'redCards', 'cleanSheets'].forEach((key) => {
      if (update[key] === undefined || update[key] === null || update[key] === '') return;
      const n = Number(update[key]);
      update[key] = Number.isFinite(n) ? Math.max(0, Math.min(99, Math.floor(n))) : 0;
    });

    if (update.jerseyName) update.jerseyName = update.jerseyName.toUpperCase();

    if (update.positions && update.primaryPosition && !update.positions.includes(update.primaryPosition)) {
      return res.status(400).json({ success: false, message: 'Primary position must be one of the selected positions' });
    }

    // Persist the profile update with compensating image-asset handling:
    //   - DB update FAILS  → destroy the freshly uploaded asset (no orphans)
    //   - DB update SUCCEEDS → destroy the replaced OLD asset (after success,
    //     never before — the old photo must stay live until the new one wins)
    const oldImagePublicId = player.imagePublicId || null;
    let updatedPlayer;
    try {
      updatedPlayer = await Player.findByIdAndUpdate(req.params.id, update, { new: true });
    } catch (dbErr) {
      if (uploadedImage?.publicId) await deleteCloudinaryAsset(uploadedImage.publicId);
      throw dbErr;
    }

    if (
      uploadedImage?.url &&
      uploadedImage.publicId &&
      oldImagePublicId &&
      oldImagePublicId !== uploadedImage.publicId
    ) {
      await deleteCloudinaryAsset(oldImagePublicId);
    }

    // Synchronize User collection name if player name was updated
    if (update.name && player.userId) {
      await User.findByIdAndUpdate(player.userId, { name: update.name });
    }

    const io = req.app?.get('io');
    if (io) {
      io.emit('player:updated', updatedPlayer);
    }

    res.json({ success: true, message: 'Profile updated successfully', data: updatedPlayer });
  } catch (e) { next(e); }
};

// ── REQUEST TEAM MANAGER ROLE (Player or General User -> Team Manager Request) ─────
// ─── REQUEST PODIUM ADMIN / SUPER ADMIN ROLE (General member upgrades) ───────
const ADMIN_REQUEST_TARGETS = {
  PODIUM_ADMIN: { statusField: 'podiumAdminRequestStatus', noteField: 'podiumAdminRequestNote', label: 'Podium Admin' },
  SUPER_ADMIN:  { statusField: 'superAdminRequestStatus',  noteField: 'superAdminRequestNote',  label: 'Super Admin' },
};

export const requestAdminRole = async (req, res, next) => {
  try {
    const target = ADMIN_REQUEST_TARGETS[req.params.targetRole];
    if (!target) return res.status(400).json({ success: false, message: 'Invalid role requested.' });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User account not found' });

    if (user.role === 'SUPER_ADMIN' || user.role === 'PODIUM_ADMIN') {
      return res.status(400).json({ success: false, message: 'You already have an admin role.' });
    }

    if (user[target.statusField] === 'PENDING') {
      return res.status(400).json({ success: false, message: `Your ${target.label} request is already PENDING review.` });
    }

    const { note } = req.body;
    user[target.statusField] = 'PENDING';
    user[target.noteField] = note || `Interested in ${target.label} access.`;
    await user.save();

    const io = req.app?.get('io');
    if (io) io.emit('user:role_updated', { userId: user._id.toString(), [target.statusField]: 'PENDING' });

    res.json({
      success: true,
      message: `${target.label} request submitted successfully to Super Admin.`,
      data: { [target.statusField]: user[target.statusField], [target.noteField]: user[target.noteField] }
    });
  } catch (e) { next(e); }
};

export const cancelAdminRoleRequest = async (req, res, next) => {
  try {
    const target = ADMIN_REQUEST_TARGETS[req.params.targetRole];
    if (!target) return res.status(400).json({ success: false, message: 'Invalid role requested.' });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User account not found' });

    if (user[target.statusField] !== 'PENDING') {
      return res.status(400).json({ success: false, message: `No pending ${target.label} request to cancel.` });
    }

    user[target.statusField] = 'NONE';
    user[target.noteField] = '';
    await user.save();

    const io = req.app?.get('io');
    if (io) io.emit('user:request_cancelled', { userId: String(user._id), [target.statusField]: 'NONE' });

    res.json({
      success: true,
      message: `${target.label} request cancelled successfully.`,
      data: { [target.statusField]: 'NONE' }
    });
  } catch (e) { next(e); }
};
export const requestManagerRole = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User account not found' });

    if (user.role === 'TEAM_MANAGER' || user.role === 'SUPER_ADMIN') {
      return res.status(400).json({ success: false, message: 'You are already a Team Manager or Admin.' });
    }

    if (user.managerRequestStatus === 'PENDING') {
      return res.status(400).json({ success: false, message: 'Your request for Team Manager role is already PENDING review.' });
    }

    const { note } = req.body;
    user.managerRequestStatus = 'PENDING';
    user.managerRequestNote = note || 'Interested in managing a franchise team.';
    await user.save();

    res.json({
      success: true,
      message: 'Team Manager request submitted successfully to Super Admin.',
      data: {
        managerRequestStatus: user.managerRequestStatus,
        managerRequestNote: user.managerRequestNote
      }
    });
  } catch (e) { next(e); }
};

// ── CANCEL TEAM MANAGER REQUEST (withdraw a PENDING request) ────────────────
export const cancelManagerRequest = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User account not found' });

    if (user.role === 'TEAM_MANAGER' || user.role === 'SUPER_ADMIN') {
      return res.status(400).json({ success: false, message: 'You are already a Team Manager or Admin.' });
    }

    if (user.managerRequestStatus !== 'PENDING') {
      return res.status(400).json({ success: false, message: 'No pending Team Manager request to cancel.' });
    }

    user.managerRequestStatus = 'NONE';
    user.managerRequestNote = '';
    await user.save();

    // Broadcast so any other open session of this user stays in sync and the
    // Super Admin requests view can drop the withdrawn request live.
    const io = req.app?.get('io');
    if (io) {
      io.emit('user:request_cancelled', {
        userId: String(user._id),
        managerRequestStatus: 'NONE'
      });
    }

    res.json({
      success: true,
      message: 'Team Manager request cancelled successfully.',
      data: { managerRequestStatus: user.managerRequestStatus }
    });
  } catch (e) { next(e); }
};

// ── REQUEST PLAYER ROLE (General User -> Player Request) ────────────────────
export const requestPlayerRole = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User account not found' });

    if (user.role === 'PLAYER' || user.role === 'TEAM_MANAGER' || user.role === 'SUPER_ADMIN') {
      return res.status(400).json({ success: false, message: 'You are already a player or higher role.' });
    }

    if (user.playerRequestStatus === 'PENDING') {
      return res.status(400).json({ success: false, message: 'Your request for Player role is already PENDING review.' });
    }

    const { note } = req.body;
    user.playerRequestStatus = 'PENDING';
    user.playerRequestNote = note || 'Interested in entering the player pool.';
    await user.save();

    res.json({
      success: true,
      message: 'Player request submitted successfully to Super Admin.',
      data: {
        playerRequestStatus: user.playerRequestStatus,
        playerRequestNote: user.playerRequestNote
      }
    });
  } catch (e) { next(e); }
};

