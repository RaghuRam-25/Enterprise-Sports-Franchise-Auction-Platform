import  { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth, getDashboardForRole, ROLE_MAP, VALID_ROLES } from './AuthContext';

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

export const SocketProvider = ({ children }) => {
  const {  updateUser } = useAuth();
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

    socketInstance.on('connect', () => {
      console.log('[Socket.IO] Connected:', socketInstance.id);
      setIsConnected(true);
      socketInstance.emit('auction:sync-request');
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

    setSocket(socketInstance);

    return () => {
      socketInstance.off('user:role_updated');
      socketInstance.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};