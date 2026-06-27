import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import { config } from './config/env.js';
import { errorHandler } from './middleware/error.js';
import { enforcePasswordChange } from './middleware/auth.js';
import { antiScan } from './middleware/antiScan.js';
import { globalLimiter, authLimiter, adminLimiter } from './middleware/rateLimit.js';

import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import adminRoutes from './routes/admin.js';
import projectRoutes from './routes/projects.js';
import agentRoutes from './routes/agents.js';
import financeRoutes from './routes/finance.js';
import documentRoutes from './routes/documents.js';
import exportRoutes from './routes/export.js';
import internalRoutes from './routes/internal.js';

export function createApp() {
  const app = express();

  // Correct client IP behind the nginx reverse proxy (for rate limits, logs).
  app.set('trust proxy', 1);

  // Security headers. This API serves ONLY JSON / file downloads (the SPA is served by
  // nginx), so a strict CSP here is safe and adds defence-in-depth. (The SPA's own CSP
  // lives in nginx.) Adds HSTS, X-Frame-Options: DENY, nosniff, no-referrer.
  app.use(helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"], baseUri: ["'none'"] },
    },
    hsts: { maxAge: 31536000, includeSubDomains: true },
    referrerPolicy: { policy: 'no-referrer' },
    crossOriginResourcePolicy: { policy: 'same-site' },
  }));
  app.use(cors({ origin: config.cors.origins, credentials: true }));
  // Block automated scanners / path probes as early as possible (returns 404, no signal).
  app.use(antiScan);
  app.use(express.json({ limit: '5mb' }));
  // Strip `$` / `.` operators from inputs (NoSQL-injection prevention).
  app.use(mongoSanitize());
  app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));

  // Health (parity with the old /actuator/health) — registered BEFORE the
  // global limiter so monitoring probes are never throttled.
  app.get('/health', (_req, res) => res.json({ status: 'UP' }));
  app.get('/api/health', (_req, res) => res.json({ status: 'UP' }));

  // Generous global ceiling on the whole API surface.
  app.use('/api', globalLimiter);
  // Force a password change before any non-auth API use (admin-set passwords).
  app.use('/api', enforcePasswordChange);

  // Public + authed API (auth & admin get their own tighter limiters).
  app.use('/api/auth', authLimiter, authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/admin', adminLimiter, adminRoutes); // requireAuth + requireAdmin enforced inside
  app.use('/api/projects', projectRoutes);

  // Nested under a project (mergeParams pulls :projectId)
  app.use('/api/projects/:projectId/agents', agentRoutes);
  app.use('/api/projects/:projectId/export', exportRoutes);
  app.use('/api/projects/:projectId', financeRoutes);   // /finance, /finance/benchmark
  app.use('/api/projects/:projectId', documentRoutes);  // /documents, /citations

  // Internal (Python -> Node callbacks; guarded by shared token)
  app.use('/internal', internalRoutes);

  // Anti-enumeration: every unknown route returns a uniform 404 (a scanner cannot tell a
  // protected route from a non-existent one). Must come AFTER all real routes.
  app.use((_req, res) => res.status(404).json({ status: 404, message: 'Not Found' }));

  app.use(errorHandler);
  return app;
}
