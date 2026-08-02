import mongoose from 'mongoose';

const positionSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true },
  name: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  // Field-map coordinates as PERCENTAGES (0–100) of a pitch rendered with the
  // attacking direction pointing RIGHT. Drives the Player "Field Position
  // Reveal" marker (left: fieldX%, top: fieldY%). Percentages keep the marker
  // correct at any screen size. Default is midfield-center until an admin (or
  // the seed) assigns a position-specific spot.
  fieldX: { type: Number, default: 50, min: 0, max: 100 },
  fieldY: { type: Number, default: 50, min: 0, max: 100 }
}, { timestamps: true });

export const Position = mongoose.model('Position', positionSchema);
