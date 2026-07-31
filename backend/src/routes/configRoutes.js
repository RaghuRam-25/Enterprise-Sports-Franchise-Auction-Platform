import express from 'express';
import { optionalAuth } from '../middleware/auth.js';
import { Session } from '../models/Session.js';
import { Position } from '../models/Position.js';
import { PlayerCategory } from '../models/PlayerCategory.js';
import { BiddingTier } from '../models/BiddingTier.js';
import { Team } from '../models/Team.js';

const router = express.Router();

router.get('/sessions', optionalAuth, async (req, res, next) => {
  try {
    const sessions = await Session.find().sort({ createdAt: -1 });
    res.json({ success: true, count: sessions.length, data: sessions });
  } catch (e) { next(e); }
});

router.get('/positions', optionalAuth, async (req, res, next) => {
  try {
    const positions = await Position.find().sort({ code: 1 });
    res.json({ success: true, count: positions.length, data: positions });
  } catch (e) { next(e); }
});

router.get('/categories', optionalAuth, async (req, res, next) => {
  try {
    const categories = await PlayerCategory.find().sort({ priorityLevel: 1 });
    res.json({ success: true, count: categories.length, data: categories });
  } catch (e) { next(e); }
});

router.get('/bidding-tiers', optionalAuth, async (req, res, next) => {
  try {
    const tiers = await BiddingTier.find().sort({ minPercent: 1 });
    res.json({ success: true, count: tiers.length, data: tiers });
  } catch (e) { next(e); }
});

router.get('/teams', optionalAuth, async (req, res, next) => {
  try {
    const teams = await Team.find()
      .populate('currentRoster', 'name jerseyName primaryPosition category finalPrice imageUrl')
      .populate('managerId', 'name email')
      .sort({ name: 1 });
    res.json({ success: true, count: teams.length, data: teams });
  } catch (e) { next(e); }
});

router.post('/calculate-raise', optionalAuth, async (req, res, next) => {
  try {
    const { currentBid = 0, totalPurse = 100000000 } = req.body || {};
    const { auctionEngine } = await import('../services/auctionEngine.js');
    await auctionEngine.loadTiers();
    const nextBidAmount = auctionEngine.calculateNextBidAmount(Number(currentBid), Number(totalPurse));
    const monetaryRaise = nextBidAmount - Number(currentBid);
    const raisePercent = Number(totalPurse) > 0 ? (monetaryRaise / Number(totalPurse)) * 100 : 0;
    
    res.json({
      success: true,
      data: {
        currentBid: Number(currentBid),
        totalPurse: Number(totalPurse),
        raisePercent: parseFloat(raisePercent.toFixed(4)),
        monetaryRaise,
        nextBidAmount
      }
    });
  } catch (e) { next(e); }
});

export default router;
