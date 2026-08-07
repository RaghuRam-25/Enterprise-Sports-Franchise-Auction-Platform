import { Player } from '../models/Player.js';
import { Session } from '../models/Session.js';
import { Position } from '../models/Position.js';
import { Team } from '../models/Team.js';
import { User } from '../models/User.js';
import { SystemConfig, getConfig, setConfig } from '../models/SystemConfig.js';
import { isRegistrationFrozen as isRegFrozenByPhase, getCurrentPhase } from '../services/phaseService.js';
import { processAndUploadImage } from '../services/imageService.js';
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

// ── Registration Freeze — now DERIVED from the global event phase ─────────────
// Registration is "frozen" whenever the phase is not REGISTRATION. The phase
// state machine (services/phaseService.js) is the single source of truth; this
// endpoint is retained for backward compatibility with the existing frontend.
export const getRegistrationStatus = async (req, res, next) => {
  try {
    const isRegistrationFrozen = await isRegFrozenByPhase();
    const phase = await getCurrentPhase();
    res.json({ success: true, isRegistrationFrozen, phase });
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
  imageUrl: z.string().optional()
}).partial();

// ── Public player fields (visible to Spectators / unauthenticated) ────────────
const PUBLIC_PLAYER_FIELDS = 'name jerseyName studentId basePrice positions primaryPosition category session imageUrl status';

// ── REGISTER PLAYER ───────────────────────────────────────────────────────────
export const registerPlayer = async (req, res, next) => {
  try {
    // Registration freeze is derived from the event phase (single source of truth).
    const isRegistrationFrozen = await isRegFrozenByPhase();

    if (isRegistrationFrozen && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ success: false, message: 'Registration is currently frozen by Super Admin' });
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

    // 4. Image upload processing using Sharp WebP pipeline
    // Default imageUrl is null so the frontend renders its generic footballer
    // placeholder (original SVG artwork — never a copyrighted athlete photo).
    let imageUrl = null;
    if (req.file) {
      imageUrl = await processAndUploadImage(req.file.buffer, parsed.studentId);
    }

    const player = await Player.create({
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
      category: parsed.category || 'B Grade',
      basePrice: 2000000,
      status: 'REGISTERED'
    });

    // Real-time Socket.IO emission to update all connected clients instantly
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

    // Determine caller's privilege level
    const role = req.user?.role;
    const isPrivileged = ['TEAM_MANAGER', 'PODIUM_ADMIN', 'SUPER_ADMIN'].includes(role);

    // Privileged users get full documents; public gets only safe fields
    const players = isPrivileged
      ? await Player.find(query).sort({ createdAt: -1 })
      : await Player.find(query).select(PUBLIC_PLAYER_FIELDS).sort({ createdAt: -1 });

    res.json({ success: true, count: players.length, data: players });
  } catch (e) { next(e); }
};

// ── WITHDRAW PLAYER (own-resource guard enforced in route layer) ──────────────
export const withdrawPlayer = async (req, res, next) => {
  try {
    // Registration freeze is derived from the event phase (single source of truth).
    const isRegistrationFrozen = await isRegFrozenByPhase();

    if (isRegistrationFrozen && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ success: false, message: 'Cannot withdraw: Registration freeze is active.' });
    }

    // For PLAYER role: verify they own this player record
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
    res.json({ success: true, data: player });
  } catch (e) { next(e); }
};

// ── GET OWN FIELD POSITION (/api/players/field-position) ─────────────────────
// Powers the full-screen "Field Position Reveal" page. Returns the sold
// player's assigned team, their position code, and the pitch coordinates
// (percentages, attacking-right) used to place the marker.
//
// Returns 404 when the requesting player has NOT been sold yet — the frontend
// treats that as the "you haven't been drafted yet" state (not an error).
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

    // Resolve pitch coordinates from the player's primary position. Prefer the
    // Position document's own fieldX/fieldY; fall back to the canonical map so
    // positions created before those fields existed still render correctly.
    const code = player.primaryPosition;
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

// ── UPDATE OWN PLAYER PROFILE ────────────────────────────────────────────────
export const updatePlayerProfile = async (req, res, next) => {
  try {
    const isRegistrationFrozen = await isRegFrozenByPhase();

    const player = await Player.findById(req.params.id);
    if (!player) return res.status(404).json({ success: false, message: 'Player not found' });

    // Ownership check for PLAYER role
    if (req.user?.role === 'PLAYER') {
      if (player.userId?.toString() !== req.user._id?.toString()) {
        return res.status(403).json({ success: false, message: 'You can only update your own profile' });
      }
    }

    const parsed = updateProfileSchema.parse(req.body);

    // Handle photo upload if provided
    if (req.file) {
      parsed.imageUrl = await processAndUploadImage(req.file.buffer, player.studentId);
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
      ? ['name', 'phone', 'bio', 'address', 'session', 'jerseyName', 'positions', 'primaryPosition', 'tShirtSize', 'tShirtNumber', 'imageUrl']
      : Object.keys(parsed);

    const update = {};
    for (const key of allowedFields) {
      if (parsed[key] !== undefined) update[key] = parsed[key];
    }

    if (update.jerseyName) update.jerseyName = update.jerseyName.toUpperCase();

    if (update.positions && update.primaryPosition && !update.positions.includes(update.primaryPosition)) {
      return res.status(400).json({ success: false, message: 'Primary position must be one of the selected positions' });
    }

    const updatedPlayer = await Player.findByIdAndUpdate(req.params.id, update, { new: true });

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

// ── REQUEST TEAM MANAGER ROLE (Player -> Team Manager Request) ─────────────
export const requestManagerRole = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User account not found' });

    if (user.role === 'TEAM_MANAGER') {
      return res.status(400).json({ success: false, message: 'You are already a Team Manager.' });
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
