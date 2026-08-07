import mongoose from 'mongoose';

const teamSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  shortCode: { type: String, required: true, uppercase: true },
  logoUrl: { type: String, default: '' },
  bannerUrl: { type: String, default: '' },
  logo: { type: String, default: '' }, // emoji/short logo field for UI
  totalBudget: { type: Number, required: true, default: 100000000 },
  remainingBudget: { type: Number, required: true, default: 100000000 },
  minRoster: { type: Number, required: true, default: 11 },
  maxRoster: { type: Number, default: 15 },
  description: { type: String, default: '' },
  motto: { type: String, default: '' },
  managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  currentRosterCount: { type: Number, default: 0 },
  // GAP 7 FIX: Store references to acquired players
  currentRoster: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Player' }],
  // Dynamic Auto-Theme & Branding Fields
  icon: { type: String, default: 'Shield' },
  primaryColor: { type: String, default: '#3b82f6' },
  secondaryColor: { type: String, default: '#1d4ed8' },
  gradient: { type: String, default: 'from-blue-600 to-indigo-800' },
  textColor: { type: String, default: '#ffffff' },
  borderColor: { type: String, default: 'border-blue-500/40' },
  glowColor: { type: String, default: 'rgba(59,130,246,0.3)' },
  logoSvg: { type: String, default: '' },
  logoKey: { type: String, default: '' }
}, { timestamps: true });

export const Team = mongoose.model('Team', teamSchema);
