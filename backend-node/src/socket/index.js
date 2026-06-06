import { Server } from 'socket.io';
import { verifyToken } from '../utils/jwt.js';
import { config } from '../config/env.js';

let io = null;

const roomFor = (projectId) => `project:${projectId}`;

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    path: '/socket.io',
    cors: { origin: config.cors.origins, credentials: true },
  });

  // JWT handshake auth (token passed via socket.io `auth` payload or query).
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) return next(new Error('unauthorized'));
    try {
      const claims = verifyToken(token);
      socket.data.userId = claims.sub;
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    // Client asks to follow a project's agent stream.
    socket.on('subscribe:project', (projectId) => {
      if (projectId) socket.join(roomFor(projectId));
    });
    socket.on('unsubscribe:project', (projectId) => {
      if (projectId) socket.leave(roomFor(projectId));
    });
  });

  console.log('[socket] Socket.IO initialised on /socket.io');
  return io;
}

// Broadcast an agent progress event to everyone following the project.
// Event shape matches the legacy STOMP contract the frontend already parses.
export function broadcastAgentEvent(projectId, event) {
  if (!io) return;
  io.to(roomFor(projectId)).emit('agent_event', event);
}
