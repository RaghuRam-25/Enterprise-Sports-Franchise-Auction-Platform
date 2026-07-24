import { auctionEngine } from '../services/auctionEngine.js';
import { Player } from '../models/Player.js';
import { Team } from '../models/Team.js';
import { AuctionLedger } from '../models/AuctionLedger.js';

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
    res.json({ success: true, message: 'Player launched to live podium', data: state });
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
    res.json({ success: true, message: 'Auction cancelled and player returned to unsold pool' });
  } catch (e) { next(e); }
};

export const forceSellAuction = async (req, res, next) => {
  try {
    const result = auctionEngine.hammerSell();
    if (result.player && result.winner) {
      // Save ledger entry
      await AuctionLedger.create({
        playerId: result.player._id || result.player.id,
        playerName: result.player.name,
        soldPrice: result.soldPrice,
        teamId: result.winner._id || result.winner.id,
        teamName: result.winner.name
      });

      // Update Player status
      await Player.findByIdAndUpdate(result.player._id || result.player.id, {
        status: 'SOLD',
        finalPrice: result.soldPrice,
        soldToTeam: result.winner._id || result.winner.id
      });

      // Deduct budget & increment roster count
      await Team.findByIdAndUpdate(result.winner._id || result.winner.id, {
        $inc: { remainingBudget: -result.soldPrice, currentRosterCount: 1 }
      });
    }

    res.json({ success: true, message: 'HAMMER DOWN! Player sold successfully', data: result });
  } catch (e) { next(e); }
};

export const getAuctionState = (req, res) => {
  res.json({ success: true, data: auctionEngine.getState() });
};
