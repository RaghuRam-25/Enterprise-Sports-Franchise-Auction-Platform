import { Session } from '../models/Session.js';
import { Position } from '../models/Position.js';
import { PlayerCategory } from '../models/PlayerCategory.js';
import { BiddingTier } from '../models/BiddingTier.js';
import { Team } from '../models/Team.js';
import { User } from '../models/User.js';
import { AuditLog } from '../models/AuditLog.js';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

// --- Zod Validation Schemas ---
const sessionSchema = z.object({ name: z.string().min(2) });
const positionSchema = z.object({ code: z.string().min(1), name: z.string().min(2) });
const categorySchema = z.object({ name: z.string().min(2), priorityLevel: z.number().min(1), basePrice: z.number().min(0) });
const biddingTierSchema = z.object({ minPercent: z.number().min(0), maxPercent: z.number().min(0), raisePercent: z.number().min(0) });
const teamSchema = z.object({ name: z.string().min(2), shortCode: z.string().min(2), totalBudget: z.number().min(0), minRoster: z.number().min(1) });

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
    if (exists) return res.status(400).json({ success: false, message: 'Session already exists' });

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
    if (exists) return res.status(400).json({ success: false, message: 'Position code already exists' });

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
    if (exists) return res.status(400).json({ success: false, message: 'Category name already exists' });

    const category = await PlayerCategory.create(parsed);
    await logAdminAction('CREATE_CATEGORY', req.user?.email || 'admin', category);
    res.status(201).json({ success: true, data: category });
  } catch (e) { next(e); }
};

export const deleteCategory = async (req, res, next) => {
  try {
    await PlayerCategory.findByIdAndDelete(req.params.id);
    await logAdminAction('DELETE_CATEGORY', req.user?.email || 'admin', { id: req.params.id });
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

// --- TEAMS ---
export const getTeams = async (req, res, next) => {
  try {
    const teams = await Team.find().sort({ name: 1 });
    res.json({ success: true, count: teams.length, data: teams });
  } catch (e) { next(e); }
};

export const createTeam = async (req, res, next) => {
  try {
    const parsed = teamSchema.parse(req.body);
    const exists = await Team.findOne({ name: parsed.name });
    if (exists) return res.status(400).json({ success: false, message: 'Team name already exists' });

    const team = await Team.create({
      ...parsed,
      shortCode: parsed.shortCode.toUpperCase(),
      remainingBudget: parsed.totalBudget
    });
    await logAdminAction('CREATE_TEAM', req.user?.email || 'admin', team);
    res.status(201).json({ success: true, data: team });
  } catch (e) { next(e); }
};

// --- MANAGERS ---
export const getManagers = async (req, res, next) => {
  try {
    const managers = await User.find({ role: 'TEAM_MANAGER' }).populate('teamId').select('-passwordHash');
    res.json({ success: true, count: managers.length, data: managers });
  } catch (e) { next(e); }
};

export const createManager = async (req, res, next) => {
  try {
    const { name, email, password, teamId } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ success: false, message: 'Manager email already exists' });

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password || 'password123', salt);

    const manager = await User.create({
      name,
      email,
      passwordHash,
      role: 'TEAM_MANAGER',
      teamId,
      mustResetPassword: true
    });

    await logAdminAction('CREATE_MANAGER', req.user?.email || 'admin', { email, name });
    res.status(201).json({ success: true, data: { id: manager._id, name: manager.name, email: manager.email } });
  } catch (e) { next(e); }
};
