import { Player } from '../models/Player.js';
import { Session } from '../models/Session.js';
import { Position } from '../models/Position.js';
import { User } from '../models/User.js';
import { processAndUploadImage } from '../services/imageService.js';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

// ── Registration Freeze Global Flag ─────────────────────────────────────────
let isRegistrationFrozen = false;

export const getRegistrationStatus = (req, res) => {
  res.json({ success: true, isRegistrationFrozen });
};

export const toggleRegistrationFreeze = (req, res) => {
  isRegistrationFrozen = !isRegistrationFrozen;
  res.json({
    success: true,
    isRegistrationFrozen,
    message: isRegistrationFrozen ? 'Registration is now FROZEN' : 'Registration is now ACTIVE'
  });
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
  positions: z.union([z.array(z.string()), z.string()]),
  primaryPosition: z.string().min(1),
  category: z.string().optional()
});

const updateProfileSchema = z.object({
  jerseyName: z.string().max(15).optional(),
  positions: z.array(z.string()).optional(),
  primaryPosition: z.string().optional(),
  tShirtSize: z.enum(['S', 'M', 'L', 'XL', 'XXL']).optional(),
}).partial();

// ── Public player fields (visible to Spectators / unauthenticated) ────────────
const PUBLIC_PLAYER_FIELDS = 'name jerseyName positions primaryPosition category session imageUrl status';

// ── REGISTER PLAYER ───────────────────────────────────────────────────────────
export const registerPlayer = async (req, res, next) => {
  try {
    // Only bypass freeze check for SUPER_ADMIN
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
      return res.status(400).json({ success: false, message: `Student ID ${parsed.studentId} is already registered.` });
    }

    const existingUser = await User.findOne({ email: parsed.email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ success: false, message: `Email ${parsed.email} is already registered.` });
    }

    // 2. Validate positions
    if (!positionsArr || positionsArr.length === 0) {
      return res.status(400).json({ success: false, message: 'Must select at least one position' });
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
    let imageUrl = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80';
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
      positions: positionsArr,
      primaryPosition: parsed.primaryPosition,
      imageUrl,
      category: parsed.category || 'B Grade',
      basePrice: 2000000,
      status: 'REGISTERED'
    });

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

    res.json({ success: true, message: 'Participation withdrawn successfully', data: player });
  } catch (e) { next(e); }
};

// ── UPDATE OWN PLAYER PROFILE (Player: own only; Super Admin: any) ────────────
export const updatePlayerProfile = async (req, res, next) => {
  try {
    // Freeze check: players cannot update profile when registration is frozen
    // Super Admin is exempt
    if (isRegistrationFrozen && req.user?.role === 'PLAYER') {
      return res.status(403).json({ success: false, message: 'Profile updates are locked during registration freeze' });
    }

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
      // Super Admin can replace any image; Player can upload own
      parsed.imageUrl = await processAndUploadImage(req.file.buffer, player.studentId);
    }

    // For Player role: restrict which fields are editable
    const allowedFields = req.user?.role === 'PLAYER'
      ? ['jerseyName', 'positions', 'primaryPosition', 'tShirtSize', 'imageUrl']
      : Object.keys(parsed); // Super Admin can edit anything passed

    const update = {};
    for (const key of allowedFields) {
      if (parsed[key] !== undefined) update[key] = parsed[key];
    }

    if (update.jerseyName) update.jerseyName = update.jerseyName.toUpperCase();

    if (update.positions && update.primaryPosition && !update.positions.includes(update.primaryPosition)) {
      return res.status(400).json({ success: false, message: 'Primary position must be one of the selected positions' });
    }

    const updatedPlayer = await Player.findByIdAndUpdate(req.params.id, update, { new: true });
    res.json({ success: true, message: 'Profile updated successfully', data: updatedPlayer });
  } catch (e) { next(e); }
};
