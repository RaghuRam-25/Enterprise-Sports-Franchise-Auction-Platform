import { auctionEngine } from '../services/auctionEngine.js';
import { Player } from '../models/Player.js';
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
      // Fallback mock player if db unseeded — generic fictional footballer,
      // never a copyrighted photo or a real athlete's name/likeness.
      player = {
        _id: playerId || 'p-1',
        name: 'Ayan Rahman',
        studentId: 'STU-2023-089',
        session: '22-23',
        jerseyName: 'AYAN 10',
        category: 'Icon Category',
        basePrice: 5000000,
        imageUrl: null
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
    // Capture the player BEFORE cancel() clears the podium (log fix).
    const previousPlayer = auctionEngine.podiumPlayer;

    // Mark current player as unsold, reset state, ready for next selection
    if (previousPlayer?._id) {
      await Player.findByIdAndUpdate(previousPlayer._id, { status: 'UNSOLD' });
    }
    auctionEngine.cancel();

    await logPodiumAction('MOVE_NEXT_PLAYER', req.user?.email || 'podium', {
      previousPlayer: previousPlayer?.name
    });

    res.json({ success: true, message: 'Moved to next player. Podium is ready.' });
  } catch (e) { next(e); }
};



export const declareWinner = async (req, res, next) => {
  try {
    // hammerSell persists the sale + broadcasts `auction:completed` atomically
    // (persist-before-broadcast), so budget/roster/status stay consistent.
    const result = await auctionEngine.hammerSell();

    if (result.player && result.winner) {
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
    const result = await auctionEngine.hammerSell();

    if (result.player && result.winner) {
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
      .select('name jerseyName studentId primaryPosition positions category basePrice session imageUrl status tShirtNumber soldToTeam finalPrice')
      .sort({ category: 1, name: 1 })
      .lean();
    res.json({ success: true, count: players.length, data: players });
  } catch (e) { next(e); }
};
