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
  // Cloudinary public_id for the stored image — enables permanent asset
  // lifecycle (replace/delete cleanup). Null when imageUrl is a dev-only
  // local /uploads path or a placeholder.
  imagePublicId: { type: String, default: null },
  phone: { type: String, default: '' },
  bio: { type: String, default: '' },
  address: { type: String, default: '' },
  // Premium profile card attributes (optional, populated via profile edit)
  age: { type: Number, default: null },
  height: { type: String, default: '' },
  preferredFoot: { type: String, default: '', enum: ['', 'Left', 'Right', 'Both'] },
  nationality: { type: String, default: '' },
  // Performance statistics (optional, populated via profile edit)
  matchesPlayed: { type: Number, default: 0 },
  goals: { type: Number, default: 0 },
  assists: { type: Number, default: 0 },
  yellowCards: { type: Number, default: 0 },
  redCards: { type: Number, default: 0 },
  cleanSheets: { type: Number, default: 0 },
  category: { type: String, required: true, default: 'B Grade', index: true },
  basePrice: { type: Number, default: 1000000 },
  status: {
    type: String,
    enum: ['REGISTERED', 'APPROVED', 'ON_PODIUM', 'SOLD', 'UNSOLD', 'WITHDRAWN', 'BANNED'],
    default: 'REGISTERED',
    index: true
  },
  finalPrice: { type: Number, default: 0 },
  soldToTeam: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null }
}, { timestamps: true });

export const Player = mongoose.model('Player', playerSchema);
