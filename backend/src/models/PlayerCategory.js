import mongoose from 'mongoose';

const playerCategorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  priorityLevel: { type: Number, required: true, default: 1 },
  basePrice: { type: Number, required: true, default: 1000000 },
  isActive: { type: Boolean, default: true },
  // Dynamic Auto-Theme Fields
  color: { type: String, default: '#3b82f6' },
  gradient: { type: String, default: 'from-blue-600 to-cyan-500' },
  borderColor: { type: String, default: 'border-blue-500/60' },
  glowColor: { type: String, default: 'rgba(59,130,246,0.3)' },
  badgeColor: { type: String, default: 'bg-blue-500/15 text-blue-300 border-blue-500/40' }
}, { timestamps: true });

export const PlayerCategory = mongoose.model('PlayerCategory', playerCategorySchema);
