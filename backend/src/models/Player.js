import mongoose from 'mongoose';

const playerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  studentId: { type: String, required: true, unique: true },
  session: { type: String, required: true },
  email: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  jerseyName: { type: String, required: true, maxlength: 15 },
  tShirtSize: {
    type: String,
    enum: ['S', 'M', 'L', 'XL', 'XXL'],
    required: true
  },
  tShirtNumber: { type: String, default: '' },
  positions: [{ type: String, required: true }],
  primaryPosition: { type: String, required: true },
  imageUrl: { type: String, default: '' },
  phone: { type: String, default: '' },
  bio: { type: String, default: '' },
  address: { type: String, default: '' },
  category: { type: String, required: true, default: 'B Grade' },
  basePrice: { type: Number, default: 1000000 },
  status: {
    type: String,
    enum: ['REGISTERED', 'APPROVED', 'ON_PODIUM', 'SOLD', 'UNSOLD', 'WITHDRAWN', 'BANNED'],
    default: 'REGISTERED'
  },
  finalPrice: { type: Number, default: 0 },
  soldToTeam: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null }
}, { timestamps: true });

export const Player = mongoose.model('Player', playerSchema);
