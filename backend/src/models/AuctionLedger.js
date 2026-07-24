import mongoose from 'mongoose';

const auctionLedgerSchema = new mongoose.Schema({
  playerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true },
  playerName: { type: String },
  soldPrice: { type: Number, required: true },
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  teamName: { type: String },
  soldAt: { type: Date, default: Date.now }
}, { timestamps: true });

export const AuctionLedger = mongoose.model('AuctionLedger', auctionLedgerSchema);
