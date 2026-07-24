import mongoose from 'mongoose';

const biddingTierSchema = new mongoose.Schema({
  minPercent: { type: Number, required: true, default: 0 },
  maxPercent: { type: Number, required: true, default: 100 },
  raisePercent: { type: Number, required: true, default: 0.15 }
}, { timestamps: true });

export const BiddingTier = mongoose.model('BiddingTier', biddingTierSchema);
