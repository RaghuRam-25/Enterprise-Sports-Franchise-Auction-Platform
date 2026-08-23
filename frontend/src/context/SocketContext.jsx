import  { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth, getDashboardForRole, ROLE_MAP, VALID_ROLES } from './AuthContext';

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

export const SocketProvider = ({ children }) => {
  const { updateUser, user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    const socketInstance = io(BACKEND_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socketInstance;

    // Join the manager's private team room so backend can push target-player
    // alerts and private blind-bid errors straight to this browser. Re-joined on
    // every (re)connect and whenever the current user's team changes.
    const joinTeamRoom = () => {
      const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
      const teamId = user?.teamId || storedUser?.teamId || null;
      if (teamId) {
        socketInstance.emit('join:team-room', teamId);
      }
    };

    socketInstance.on('connect', () => {
      console.log('[Socket.IO] Connected:', socketInstance.id);
      setIsConnected(true);
      socketInstance.emit('auction:sync-request');
      joinTeamRoom();
    });

    socketInstance.on('disconnect', (reason) => {
      console.warn('[Socket.IO] Disconnected:', reason);
      setIsConnected(false);
    });

    socketInstance.on('connect_error', (err) => {
      console.warn('[Socket.IO] Connection error (backend may be offline):', err.message);
      setIsConnected(false);
    });

    // ── REAL-TIME ROLE UPDATE ──────────────────────────────────────────────────
    // Emitted by backend when Super Admin approves/rejects a manager request.
    // Only applies to the specific user whose ID matches.
    socketInstance.on('user:role_updated', (payload) => {
      const currentUser = JSON.parse(localStorage.getItem('user') || 'null');
      if (!currentUser) return;

      const currentUserId = currentUser._id || currentUser.id;
      if (!payload?.userId || String(payload.userId) !== String(currentUserId)) return;

      console.log('[Socket.IO] Role update received for current user:', payload);

      const normalizedRole = ROLE_MAP[payload.newRole] || payload.newRole;
      if (!VALID_ROLES.includes(normalizedRole)) return;

      // Build the partial update object
      const updates = { role: normalizedRole };
      if (payload.managerRequestStatus) {
        updates.managerRequestStatus = payload.managerRequestStatus;
      } else {
        // Approval sets APPROVED, rejection sets REJECTED
        updates.managerRequestStatus = normalizedRole === 'TEAM_MANAGER' ? 'APPROVED' : 'REJECTED';
      }
      if (payload.teamId) {
        updates.teamId = payload.teamId;
      }

      // Update AuthContext user state + localStorage
      if (typeof updateUser === 'function') {
        updateUser(updates);
      }

      // Redirect to the correct dashboard for the new role
      const targetPath = getDashboardForRole(normalizedRole);
      // Use setTimeout to let state update propagate before navigation
      setTimeout(() => {
        window.location.href = targetPath;
      }, 800);
    });

    // ── REAL-TIME MANAGER REQUEST CANCELLED ─────────────────────────────────
    // Emitted by backend when the requesting player withdraws a PENDING
    // manager request. Keeps every open session of that user in sync (status
    // back to NONE) without forcing a redirect.
    socketInstance.on('user:request_cancelled', (payload) => {
      const currentUser = JSON.parse(localStorage.getItem('user') || 'null');
      if (!currentUser || !payload?.userId) return;

      const currentUserId = currentUser._id || currentUser.id;
      if (String(payload.userId) !== String(currentUserId)) return;

      console.log('[Socket.IO] Manager request cancelled for current user:', payload);
      if (typeof updateUser === 'function') {
        updateUser({ managerRequestStatus: payload.managerRequestStatus || 'NONE' });
      }
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.off('user:role_updated');
      socketInstance.off('user:request_cancelled');
      socketInstance.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-join the private team room whenever the logged-in user's team changes
  // (e.g. after a manager request is approved and a team is assigned).
  useEffect(() => {
    if (!socket || !isConnected) return;
    const teamId = user?.teamId || null;
    if (teamId) {
      socket.emit('join:team-room', teamId);
    }
  }, [socket, isConnected, user?.teamId]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};