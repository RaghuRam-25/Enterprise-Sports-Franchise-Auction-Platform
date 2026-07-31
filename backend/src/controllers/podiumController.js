import { auctionEngine } from '../services/auctionEngine.js';
import { Player } from '../models/Player.js';
import { Team } from '../models/Team.js';
import { AuctionLedger } from '../models/AuctionLedger.js';
import { AuditLog } from '../models/AuditLog.js';

const logPodiumAction = async (action, performedBy, details) => {
  try {
    await AuditLog.create({ action, performedBy, details });
  } catch (_) { /* silent */ }
};

export const launchPlayer = async (req, res, next) => {
  try {
    const { playerId, duration, mode } = req.body;
    let player = await Player.findById(playerId);

    if (!player) {
      // Fallback mock player if db unseeded
      player = {
        _id: playerId || 'p-1',
        name: 'Shakib Al Hasan',
        studentId: 'STU-2023-089',
        session: '22-23',
        jerseyName: 'SHAKIB 75',
        category: 'Icon Category',
        basePrice: 5000000,
        imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80'
      };
    } else {
      player.status = 'ON_PODIUM';
      await player.save();
    }

    const state = auctionEngine.launchPlayer(player, duration || 60, mode || 'NORMAL');
    await logPodiumAction('LAUNCH_PLAYER', req.user?.email || 'podium', { playerId, mode, duration });
    res.json({ success: true, message: 'Player launched to live podium', data: state });
  } catch (e) { next(e); }
};

export const selectUnsoldPlayer = async (req, res, next) => {
  try {
    const { playerId, duration, mode } = req.body;

    let player = await Player.findOne({ _id: playerId, status: { $in: ['UNSOLD', 'REGISTERED'] } });
    if (!player) {
      return res.status(404).json({ success: false, message: 'Player not found or not available for selection' });
    }

    player.status = 'ON_PODIUM';
    await player.save();

    const state = auctionEngine.launchPlayer(player, duration || 60, mode || 'NORMAL');
    await logPodiumAction('SELECT_UNSOLD_PLAYER', req.user?.email || 'podium', { playerId, mode });
    res.json({ success: true, message: 'Unsold player selected and launched', data: state });
  } catch (e) { next(e); }
};

export const moveNextPlayer = async (req, res, next) => {
  try {
    // Mark current player as unsold, reset state, ready for next selection
    if (auctionEngine.podiumPlayer?._id) {
      await Player.findByIdAndUpdate(auctionEngine.podiumPlayer._id, { status: 'UNSOLD' });
    }
    auctionEngine.cancel();

    await logPodiumAction('MOVE_NEXT_PLAYER', req.user?.email || 'podium', {
      previousPlayer: auctionEngine.podiumPlayer?.name
    });

    res.json({ success: true, message: 'Moved to next player. Podium is ready.' });
  } catch (e) { next(e); }
};

export const declareWinner = async (req, res, next) => {
  try {
    const result = auctionEngine.hammerSell();

    if (result.player && result.winner) {
      await AuctionLedger.create({
        playerId: result.player._id || result.player.id,
        playerName: result.player.name,
        soldPrice: result.soldPrice,
        teamId: result.winner._id || result.winner.id,
        teamName: result.winner.name
      });

      const playerId = result.player._id || result.player.id;
      const teamId = result.winner._id || result.winner.id;

      await Player.findByIdAndUpdate(playerId, {
        status: 'SOLD',
        finalPrice: result.soldPrice,
        soldToTeam: teamId
      });

      // GAP 7 FIX: push player into currentRoster array
      await Team.findByIdAndUpdate(teamId, {
        $inc: { remainingBudget: -result.soldPrice, currentRosterCount: 1 },
        $push: { currentRoster: playerId }
      });

      await logPodiumAction('DECLARE_WINNER', req.user?.email || 'podium', {
        player: result.player.name,
        team: result.winner.name,
        price: result.soldPrice
      });
    }

    res.json({ success: true, message: 'Winner declared!', data: result });
  } catch (e) { next(e); }
};

export const pauseAuction = (req, res) => {
  auctionEngine.pause();
  res.json({ success: true, message: 'Auction clock paused' });
};

export const resumeAuction = (req, res) => {
  auctionEngine.resume();
  res.json({ success: true, message: 'Auction clock resumed' });
};

export const rollbackAuction = (req, res) => {
  auctionEngine.rollback();
  res.json({ success: true, message: 'Auction bid rolled back' });
};

export const cancelAuction = async (req, res, next) => {
  try {
    if (auctionEngine.podiumPlayer?._id) {
      await Player.findByIdAndUpdate(auctionEngine.podiumPlayer._id, { status: 'UNSOLD' });
    }
    auctionEngine.cancel();
    await logPodiumAction('CANCEL_AUCTION', req.user?.email || 'podium', {});
    res.json({ success: true, message: 'Auction cancelled and player returned to unsold pool' });
  } catch (e) { next(e); }
};

export const forceSellAuction = async (req, res, next) => {
  try {
    const result = auctionEngine.hammerSell();
    if (result.player && result.winner) {
      await AuctionLedger.create({
        playerId: result.player._id || result.player.id,
        playerName: result.player.name,
        soldPrice: result.soldPrice,
        teamId: result.winner._id || result.winner.id,
        teamName: result.winner.name
      });

      const fsPlayerId = result.player._id || result.player.id;
      const fsTeamId = result.winner._id || result.winner.id;

      await Player.findByIdAndUpdate(fsPlayerId, {
        status: 'SOLD',
        finalPrice: result.soldPrice,
        soldToTeam: fsTeamId
      });

      // GAP 7 FIX: push player into currentRoster array
      await Team.findByIdAndUpdate(fsTeamId, {
        $inc: { remainingBudget: -result.soldPrice, currentRosterCount: 1 },
        $push: { currentRoster: fsPlayerId }
      });

      await logPodiumAction('FORCE_SELL', req.user?.email || 'podium', {
        player: result.player.name,
        price: result.soldPrice
      });
    }

    res.json({ success: true, message: 'HAMMER DOWN! Player sold successfully', data: result });
  } catch (e) { next(e); }
};

export const getAuctionState = (req, res) => {
  res.json({ success: true, data: auctionEngine.getState() });
};

// GET available players for Podium to select — GAP 9 FIX: include APPROVED
export const getAvailablePlayers = async (req, res, next) => {
  try {
    // APPROVED = Super Admin approved the registration; UNSOLD = previously on podium but unsold
    const players = await Player.find({ status: { $in: ['APPROVED', 'UNSOLD'] } })
      .sort({ category: 1, name: 1 });
    res.json({ success: true, count: players.length, data: players });
  } catch (e) { next(e); }
};
