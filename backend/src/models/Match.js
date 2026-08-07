import mongoose from 'mongoose';

const matchSchema = new mongoose.Schema({
  teamA: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
  teamB: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
  teamAName: { type: String, required: true },
  teamALogo: { type: String, default: '' },
  teamBName: { type: String, required: true },
  teamBLogo: { type: String, default: '' },
  matchDate: { type: String, required: true },
  matchTime: { type: String, required: true },
  venue: { type: String, required: true },
  status: {
    type: String,
    enum: ['Upcoming', 'Live', 'Finished', 'Cancelled'],
    default: 'Upcoming',
    index: true
  },
  scoreA: { type: String, default: '0' },
  scoreB: { type: String, default: '0' },
  winnerNotes: { type: String, default: '' },
  matchNumber: { type: String, default: '' },
  tournament: { type: String, default: 'Championship', index: true },
  round: { type: String, default: 'Group Stage' },
  description: { type: String, default: '' },
  isPublished: { type: Boolean, default: true },
  liveScore: { type: String, default: '' }
}, { timestamps: true });

export const Match = mongoose.model('Match', matchSchema);