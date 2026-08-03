import mongoose from 'mongoose';

const managerTargetPlayerSchema = new mongoose.Schema({
  managerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  playerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: true
  },
  priority: {
    type: Number,
    required: true,
    default: 1
  },
  note: {
    type: String,
    default: '',
    maxlength: 500
  },
  optionalBudgetLimit: {
    type: Number,
    default: null
  }
}, { timestamps: true });

// Ensure a manager can only target a player once
managerTargetPlayerSchema.index({ managerId: 1, playerId: 1 }, { unique: true });
// Compound index for sorting target lists fast
managerTargetPlayerSchema.index({ managerId: 1, priority: 1 });

export const ManagerTargetPlayer = mongoose.model('ManagerTargetPlayer', managerTargetPlayerSchema);
