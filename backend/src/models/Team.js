import mongoose from 'mongoose';

const teamSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  shortCode: { type: String, required: true, uppercase: true },
  logoUrl: { type: String, default: '' },
  totalBudget: { type: Number, required: true, default: 100000000 },
  remainingBudget: { type: Number, required: true, default: 100000000 },
  minRoster: { type: Number, required: true, default: 11 },
  currentRosterCount: { type: Number, default: 0 }
}, { timestamps: true });

export const Team = mongoose.model('Team', teamSchema);
