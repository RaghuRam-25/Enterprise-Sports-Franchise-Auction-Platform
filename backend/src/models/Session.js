import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

export const Session = mongoose.model('Session', sessionSchema);
