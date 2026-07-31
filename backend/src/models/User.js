import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  role: {
    type: String,
    enum: ['SUPER_ADMIN', 'PODIUM_ADMIN', 'TEAM_MANAGER', 'PLAYER', 'SPECTATOR'],
    default: 'SPECTATOR'
  },
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
  isActive: { type: Boolean, default: true },
  mustResetPassword: { type: Boolean, default: false },
  managerRequestStatus: {
    type: String,
    enum: ['NONE', 'PENDING', 'APPROVED', 'REJECTED'],
    default: 'NONE'
  },
  managerRequestNote: { type: String, default: '' }
}, { timestamps: true });

export const User = mongoose.model('User', userSchema);
