import { auctionEngine } from '../services/auctionEngine.js';
import { Player } from '../models/Player.js';

export const handleSocketConnections = (io) => {
  auctionEngine.init(io);

  io.on('connection', (socket) => {
    console.log(`[Socket Connected] ID: ${socket.id}`);

    // Send initial auction state upon connection
    socket.emit('auction:state', auctionEngine.getState());

    // Join team private socket room for blind bid notifications
    socket.on('join:team-room', (teamId) => {
      if (teamId) {
        socket.join(`team:${teamId}`);
        console.log(`[Socket Room] Socket ${socket.id} joined team:${teamId}`);
      }
    });

    // Client requests state sync
    socket.on('auction:sync-request', () => {
      socket.emit('auction:state', auctionEngine.getState());
    });

    // Handle Podium Video Control
    socket.on('podium:video-control', (data) => {
      auctionEngine.setVideoUrl(data?.url || null);
    });

    // Handle Podium Intro Loop Control
    socket.on('podium:intro-loop-control', async (data) => {
      const { action } = data || {};

      if (action === 'start') {
        const durationSeconds = data.durationSeconds || (data.durationMinutes ? data.durationMinutes * 60 : 4);
        const repeat = Boolean(data.repeat);

        let playersList = data.players || [];
        if (!playersList || playersList.length === 0) {
          try {
            // Auto fetch and group registered players by category order:
            // ICON Players -> A Grade -> B Grade -> C Grade -> D Grade (or remaining)
            const allPlayers = await Player.find({ status: { $in: ['REGISTERED', 'APPROVED', 'UNSOLD'] } }).lean();

            const categoryPriority = {
              'ICON Players': 1,
              'Icon Category': 1,
              'A Grade': 2,
              'B Grade': 3,
              'C Grade': 4,
              'D Grade': 5,
              'Emerging Youth': 6
            };

            playersList = allPlayers.sort((a, b) => {
              const pA = categoryPriority[a.category] || 99;
              const pB = categoryPriority[b.category] || 99;
              if (pA !== pB) return pA - pB;
              return (a.name || '').localeCompare(b.name || '');
            });
          } catch (err) {
            console.error('[SocketHandler] Failed to query players for intro loop:', err);
          }
        }

        auctionEngine.startIntroLoop(playersList, durationSeconds, repeat);
      } else if (action === 'pause') {
        auctionEngine.pauseIntroLoop();
      } else if (action === 'resume') {
        auctionEngine.resumeIntroLoop();
      } else if (action === 'stop') {
        auctionEngine.stopIntroLoop(true);
      } else if (action === 'skip') {
        auctionEngine.skipIntroPlayer(data.direction || 1);
      } else if (action === 'prev') {
        auctionEngine.skipIntroPlayer(-1);
      } else if (action === 'restart') {
        auctionEngine.restartIntroLoop();
      }
    });

    // Client places Normal Bid
    socket.on('bid:place', async (data) => {
      const result = await auctionEngine.placeNormalBid(data.team);
      if (!result?.success) {
        socket.emit('bid:error', { error: result?.error || 'Bid placement failed' });
      }
    });

    // Client places Blind Bid
    socket.on('bid:blind', (data) => {
      const result = auctionEngine.placeBlindBid(data.team, data.amount, data.lowestBasePrice || 1000000);
      if (!result?.success) {
        socket.emit('bid:error', { error: result?.error || 'Blind bid failed' });
      }
    });

    socket.on('disconnect', (reason) => {
      console.log(`[Socket Disconnected] ID: ${socket.id}, Reason: ${reason}`);
    });
  });
};
