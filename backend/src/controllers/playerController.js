import { Player } from '../models/Player.js';
import { Session } from '../models/Session.js';
import { Position } from '../models/Position.js';
import { processAndUploadImage } from '../services/imageService.js';
import { z } from 'zod';

// Registration Freeze Global Flag
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

import { User } from '../models/User.js';
import bcrypt from 'bcryptjs';

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

export const registerPlayer = async (req, res, next) => {
  try {
    if (isRegistrationFrozen) {
      return res.status(403).json({ success: false, message: 'Registration is currently frozen by Super Admin' });
    }

    const body = req.body;
    let positionsArr = Array.isArray(body.positions) ? body.positions : typeof body.positions === 'string' ? JSON.parse(body.positions) : [body.positions];

    const parsed = registerPlayerSchema.parse({
      ...body,
      positions: positionsArr
    });

    // 1. Check unique studentId and email
    const existingPlayer = await Player.findOne({ studentId: parsed.studentId });
    if (existingPlayer) {
      return res.status(400).json({ success: false, message: `Student ID ${parsed.studentId} is already registered.` });
    }

    const existingUser = await User.findOne({ email: parsed.email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ success: false, message: `Email ${parsed.email} is already registered.` });
    }

    // 2. Validate positions: must have at least 1 and primary position must be included
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

    const players = await Player.find(query).sort({ createdAt: -1 });
    res.json({ success: true, count: players.length, data: players });
  } catch (e) { next(e); }
};

export const withdrawPlayer = async (req, res, next) => {
  try {
    if (isRegistrationFrozen) {
      return res.status(403).json({ success: false, message: 'Cannot withdraw: Registration freeze is active.' });
    }

    const player = await Player.findByIdAndUpdate(
      req.params.id,
      { status: 'WITHDRAWN' },
      { new: true }
    );

    res.json({ success: true, message: 'Participation withdrawn successfully', data: player });
  } catch (e) { next(e); }
};
