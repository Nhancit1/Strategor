import crypto from 'crypto';
import { config } from '../config/env.js';
import { ApiError } from './error.js';

const expectedToken = Buffer.from(config.aiService.internalToken);

// Guards the /internal/* endpoints the Python service calls back into.
// Constant-time comparison so an attacker cannot recover the token byte-by-byte via timing.
export function requireInternal(req, _res, next) {
  const provided = Buffer.from(String(req.headers['x-internal-token'] || ''));
  if (provided.length !== expectedToken.length || !crypto.timingSafeEqual(provided, expectedToken)) {
    return next(new ApiError(401, 'Internal auth failed'));
  }
  next();
}
