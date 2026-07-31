import { Match } from '../models/Match.js';
import { Team } from '../models/Team.js';

// Helper to broadcast socket events if io is available
const notifyClients = (req, event, data) => {
  const io = req.app.get('io');
  if (io) {
    io.emit(event, data);
  }
};

// GET /api/matches — View all matches (Public/All Roles)
export const getMatches = async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const matches = await Match.find(filter)
      .populate('teamA', 'name logo logoUrl code')
      .populate('teamB', 'name logo logoUrl code')
      .sort({ matchDate: 1, matchTime: 1 });
    res.json({ success: true, count: matches.length, data: matches });
  } catch (e) { next(e); }
};

// POST /api/matches — Create Match (SUPER_ADMIN only)
export const createMatch = async (req, res, next) => {
  try {
    const { teamAId, teamBId, teamAName, teamBName, teamALogo, teamBLogo, matchDate, matchTime, venue, status, scoreA, scoreB, winnerNotes } = req.body;

    let finalTeamAName = teamAName;
    let finalTeamALogo = teamALogo || '';
    let finalTeamBName = teamBName;
    let finalTeamBLogo = teamBLogo || '';

    if (teamAId) {
      const tA = await Team.findById(teamAId);
      if (tA) {
        finalTeamAName = tA.name;
        finalTeamALogo = tA.logoUrl || tA.logo || '';
      }
    }

    if (teamBId) {
      const tB = await Team.findById(teamBId);
      if (tB) {
        finalTeamBName = tB.name;
        finalTeamBLogo = tB.logoUrl || tB.logo || '';
      }
    }

    if (!finalTeamAName || !finalTeamBName || !matchDate || !matchTime || !venue) {
      return res.status(400).json({ success: false, message: 'Please provide Team A, Team B, Date, Time, and Venue.' });
    }

    const match = await Match.create({
      teamA: teamAId || null,
      teamB: teamBId || null,
      teamAName: finalTeamAName,
      teamALogo: finalTeamALogo,
      teamBName: finalTeamBName,
      teamBLogo: finalTeamBLogo,
      matchDate,
      matchTime,
      venue,
      status: status || 'Upcoming',
      scoreA: scoreA || '0',
      scoreB: scoreB || '0',
      winnerNotes: winnerNotes || ''
    });

    notifyClients(req, 'match_updated', { action: 'create', match });
    res.status(201).json({ success: true, message: 'Match created successfully', data: match });
  } catch (e) { next(e); }
};

// PUT /api/matches/:id — Update Match (SUPER_ADMIN only)
export const updateMatch = async (req, res, next) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });

    const updates = req.body;

    if (updates.teamAId) {
      const tA = await Team.findById(updates.teamAId);
      if (tA) {
        updates.teamA = tA._id;
        updates.teamAName = tA.name;
        updates.teamALogo = tA.logoUrl || tA.logo || '';
      }
    }

    if (updates.teamBId) {
      const tB = await Team.findById(updates.teamBId);
      if (tB) {
        updates.teamB = tB._id;
        updates.teamBName = tB.name;
        updates.teamBLogo = tB.logoUrl || tB.logo || '';
      }
    }

    const updatedMatch = await Match.findByIdAndUpdate(req.params.id, updates, { new: true });
    notifyClients(req, 'match_updated', { action: 'update', match: updatedMatch });
    res.json({ success: true, message: 'Match updated successfully', data: updatedMatch });
  } catch (e) { next(e); }
};

// DELETE /api/matches/:id — Delete Match (SUPER_ADMIN only)
export const deleteMatch = async (req, res, next) => {
  try {
    const match = await Match.findByIdAndDelete(req.params.id);
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });

    notifyClients(req, 'match_updated', { action: 'delete', matchId: req.params.id });
    res.json({ success: true, message: 'Match deleted successfully' });
  } catch (e) { next(e); }
};