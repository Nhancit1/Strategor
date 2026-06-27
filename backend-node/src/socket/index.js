import { Server } from 'socket.io';
import mongoose from 'mongoose';
import { verifyToken } from '../utils/jwt.js';
import { config } from '../config/env.js';
import { Project } from '../models/Project.js';

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
      // Reject refresh tokens (30-day TTL): only short-lived access tokens may open a stream.
      if (claims.type === 'refresh') return next(new Error('unauthorized'));
      socket.data.userId = claims.sub;
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    // Client asks to follow a project's agent stream.
    // Only the project's owner may join its room (prevents cross-tenant data leak).
    socket.on('subscribe:project', async (projectId) => {
      try {
        if (!projectId || !mongoose.isValidObjectId(projectId)) return;
        const project = await Project.findOne({ _id: projectId, deletedAt: null })
          .select('user')
          .lean();
        if (!project || String(project.user) !== String(socket.data.userId)) return; // silent refusal
        socket.join(roomFor(projectId));
      } catch {
        /* ignore */
      }
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
