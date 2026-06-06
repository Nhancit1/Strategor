import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';

// Socket.IO replaces the old STOMP/SockJS transport. Same hook signature and
// same event shape the store already parses: { agentId, status, progress, agentName, ... }.
//
// Connects to the same origin by default (Vite proxy in dev, nginx in prod
// forward /socket.io -> Node). Override with VITE_WS_URL if needed.
const WS_URL = import.meta.env.VITE_WS_URL || undefined;

/**
 * @param {string|null} projectId - if null, does not connect
 * @param {(event) => void} onEvent - called on each agent event
 */
export function useAgentWebSocket(projectId, onEvent) {
  const socketRef = useRef(null);

  useEffect(() => {
    if (!projectId) return undefined;

    const token = useAuthStore.getState().accessToken;
    const socket = io(WS_URL, {
      path: '/app2/socket.io',
      transports: ['websocket', 'polling'],
      auth: { token },
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('subscribe:project', projectId);
    });

    socket.on('agent_event', (event) => {
      try {
        onEvent(event);
      } catch {
        // ignore handler errors
      }
    });

    socket.on('connect_error', (err) => {
      console.warn('socket.io connect_error:', err?.message || err);
    });

    return () => {
      try {
        socket.emit('unsubscribe:project', projectId);
        socket.disconnect();
      } catch {
        // ignore
      }
    };
  }, [projectId, onEvent]);
}
