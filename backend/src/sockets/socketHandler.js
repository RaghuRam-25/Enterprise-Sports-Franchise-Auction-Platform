import { auctionEngine } from '../services/auctionEngine.js';

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
