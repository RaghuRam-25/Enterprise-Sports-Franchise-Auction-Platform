import mongoose from 'mongoose';

const playerCategorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  priorityLevel: { type: Number, required: true, default: 1 },
  basePrice: { type: Number, required: true, default: 1000000 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

export const PlayerCategory = mongoose.model('PlayerCategory', playerCategorySchema);
