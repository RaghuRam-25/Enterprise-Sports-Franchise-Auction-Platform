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
    const { status, tournament, search } = req.query;
    const filter = { isPublished: { $ne: false } };
    if (status) filter.status = status;
    if (tournament) filter.tournament = tournament;

    let matchesFromDb = await Match.find(filter)
      .populate({
        path: 'teamA',
        select: 'name shortCode logo logoUrl icon primaryColor secondaryColor gradient borderColor glowColor logoSvg logoKey managerId currentRoster',
        populate: [
          { path: 'currentRoster', select: 'name primaryPosition imageUrl finalPrice' },
          { path: 'managerId', select: 'name email' }
        ]
      })
      .populate({
        path: 'teamB',
        select: 'name shortCode logo logoUrl icon primaryColor secondaryColor gradient borderColor glowColor logoSvg logoKey managerId currentRoster',
        populate: [
          { path: 'currentRoster', select: 'name primaryPosition imageUrl finalPrice' },
          { path: 'managerId', select: 'name email' }
        ]
      })
      .sort({ matchDate: 1, matchTime: 1 })
      .lean();

    // Map to a consistent DTO
    let data = matchesFromDb.map(m => ({
      ...m,
      homeTeam: m.teamAName || m.teamA?.name,
      awayTeam: m.teamBName || m.teamB?.name,
      homeTeamLogo: m.teamA?.logoUrl || m.teamA?.logo || m.teamALogo || '',
      awayTeamLogo: m.teamB?.logoUrl || m.teamB?.logo || m.teamBLogo || '',
      teamAName: m.teamA?.name || m.teamAName,
      teamALogo: m.teamA?.logoUrl || m.teamA?.logo || m.teamALogo || '',
      teamBName: m.teamB?.name || m.teamBName,
      teamBLogo: m.teamB?.logoUrl || m.teamB?.logo || m.teamBLogo || '',
    }));

    if (search) {
      const q = search.trim().toLowerCase();
      data = data.filter(m =>
        (m.teamAName || '').toLowerCase().includes(q) ||
        (m.teamBName || '').toLowerCase().includes(q) ||
        (m.venue || '').toLowerCase().includes(q) ||
        (m.matchNumber || '').toLowerCase().includes(q)
      );
    }

    res.json({ success: true, count: data.length, data });
  } catch (e) { next(e); }
};

// POST /api/matches — Create Match (SUPER_ADMIN only)
export const createMatch = async (req, res, next) => {
  try {
    const {
      teamAId, teamBId, teamA, teamB, homeTeam, awayTeam,
      teamAName, teamBName, teamALogo, teamBLogo, homeTeamLogo, awayTeamLogo,
      matchDate, matchTime, venue, status, scoreA, scoreB, winnerNotes,
      matchNumber, tournament, round, description, isPublished, liveScore
    } = req.body;

    const actualTeamAId = teamAId || teamA;
    const actualTeamBId = teamBId || teamB;

    let finalTeamAName = teamAName || homeTeam;
    let finalTeamALogo = teamALogo || homeTeamLogo || '';
    let finalTeamBName = teamBName || awayTeam;
    let finalTeamBLogo = teamBLogo || awayTeamLogo || '';

    if (actualTeamAId) {
      const tA = await Team.findById(actualTeamAId);
      if (tA) {
        finalTeamAName = tA.name;
        finalTeamALogo = tA.logoUrl || tA.logo || '';
      }
    }

    if (actualTeamBId) {
      const tB = await Team.findById(actualTeamBId);
      if (tB) {
        finalTeamBName = tB.name;
        finalTeamBLogo = tB.logoUrl || tB.logo || '';
      }
    }

    if (!finalTeamAName || !finalTeamBName) {
      return res.status(400).json({ success: false, message: 'Please select both Team A and Team B.' });
    }

    const match = await Match.create({
      teamA: actualTeamAId || null,
      teamB: actualTeamBId || null,
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
      winnerNotes: winnerNotes || '',
      matchNumber: matchNumber || '',
      tournament: tournament || 'Championship',
      round: round || 'Group Stage',
      description: description || '',
      isPublished: isPublished !== undefined ? isPublished : true,
      liveScore: liveScore || ''
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

    // Whitelist fields to prevent mass-assignment of arbitrary schema fields.
    const ALLOWED = ['teamA','teamB','teamAName','teamALogo','teamBName','teamBLogo','matchDate','matchTime','venue','status','scoreA','scoreB','winnerNotes','matchNumber','tournament','round','description','isPublished','liveScore'];
    const updates = {};
    for (const key of ALLOWED) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    if (req.body.status && !['Upcoming', 'Live', 'Finished', 'Cancelled'].includes(req.body.status)) {
      return res.status(400).json({ success: false, message: 'Invalid match status' });
    }

    if (req.body.teamAId) {
      const tA = await Team.findById(req.body.teamAId);
      if (tA) {
        updates.teamA = tA._id;
        updates.teamAName = tA.name;
        updates.teamALogo = tA.logoUrl || tA.logo || '';
      }
    }

    if (req.body.teamBId) {
      const tB = await Team.findById(req.body.teamBId);
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