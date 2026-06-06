import { config } from '../config/env.js';
import { ApiError } from './error.js';

// Guards the /internal/* endpoints the Python service calls back into.
export function requireInternal(req, _res, next) {
  const token = req.headers['x-internal-token'];
  if (!token || token !== config.aiService.internalToken) {
    return next(new ApiError(401, 'Internal auth failed'));
  }
  next();
}
