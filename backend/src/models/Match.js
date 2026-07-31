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
    default: 'Upcoming'
  },
  scoreA: { type: String, default: '0' },
  scoreB: { type: String, default: '0' },
  winnerNotes: { type: String, default: '' }
}, { timestamps: true });

export const Match = mongoose.model('Match', matchSchema);