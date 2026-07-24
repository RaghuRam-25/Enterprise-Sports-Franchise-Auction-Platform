import mongoose from 'mongoose';

const positionSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true },
  name: { type: String, required: true },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

export const Position = mongoose.model('Position', positionSchema);
