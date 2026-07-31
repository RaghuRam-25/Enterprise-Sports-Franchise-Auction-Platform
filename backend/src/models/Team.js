import mongoose from 'mongoose';

const teamSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  shortCode: { type: String, required: true, uppercase: true },
  logoUrl: { type: String, default: '' },
  logo: { type: String, default: '' }, // emoji/short logo field for UI
  totalBudget: { type: Number, required: true, default: 100000000 },
  remainingBudget: { type: Number, required: true, default: 100000000 },
  minRoster: { type: Number, required: true, default: 11 },
  maxRoster: { type: Number, default: 15 },
  description: { type: String, default: '' },
  currentRosterCount: { type: Number, default: 0 },
  // GAP 7 FIX: Store references to acquired players
  currentRoster: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Player' }]
}, { timestamps: true });

export const Team = mongoose.model('Team', teamSchema);
