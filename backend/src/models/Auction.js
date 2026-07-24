import mongoose from 'mongoose';

const auctionSchema = new mongoose.Schema({
  currentPlayer: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', default: null },
  mode: { type: String, enum: ['NORMAL', 'BLIND'], default: 'NORMAL' },
  timerDuration: { type: Number, default: 60 },
  remainingSeconds: { type: Number, default: 60 },
  currentBid: { type: Number, default: 0 },
  highestBidder: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
  isPaused: { type: Boolean, default: false },
  status: { type: String, enum: ['IDLE', 'RUNNING', 'PAUSED', 'ENDED'], default: 'IDLE' }
}, { timestamps: true });

export const Auction = mongoose.model('Auction', auctionSchema);
