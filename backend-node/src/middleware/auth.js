import { verifyToken } from '../utils/jwt.js';
import { ApiError } from './error.js';

// Bearer JWT guard. Populates req.user = { id, email, role }.
export function requireAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    return next(new ApiError(401, 'Token manquant'));
  }
  const token = header.slice(7);
  try {
    const claims = verifyToken(token);
    if (claims.type === 'refresh') throw new Error('refresh token not allowed here');
    req.user = { id: claims.sub, email: claims.email, role: claims.role || 'USER', mustChangePassword: !!claims.mcp };
    next();
  } catch {
    next(new ApiError(401, 'Token invalide ou expiré'));
  }
}

// Blocks app access for accounts flagged mustChangePassword, EXCEPT the auth
// endpoints (so they can still log in, change the password, refresh, log out).
// The flag travels in the access token; a successful change-password re-issues
// a clean token. Mounted at the /api level, so req.path is mount-relative.
export function enforcePasswordChange(req, res, next) {
  if (req.path.startsWith('/auth/')) return next(); // auth ops always allowed
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return next(); // requireAuth will handle a missing token
  try {
    const claims = verifyToken(header.slice(7));
    if (claims.type !== 'refresh' && claims.mcp) {
      return res.status(403).json({
        error: 'PasswordChangeRequired',
        message: 'Vous devez changer votre mot de passe avant de continuer.',
        code: 'PASSWORD_CHANGE_REQUIRED',
        status: 403,
      });
    }
  } catch {
    return next(); // invalid/expired token -> let requireAuth return 401
  }
  next();
}
