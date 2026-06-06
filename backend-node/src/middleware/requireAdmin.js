import { ApiError } from './error.js';
import { User } from '../models/User.js';

// Must run AFTER requireAuth. Confirms the caller is an admin by reading the
// DB (not just trusting the token), so a revoked or soft-deleted admin is
// rejected immediately rather than living until their token expires.
export async function requireAdmin(req, _res, next) {
  try {
    if (!req.user?.id) return next(new ApiError(401, 'Non authentifié'));
    const user = await User.findById(req.user.id).select('role deletedAt').lean();
    if (!user || user.deletedAt || user.role !== 'ADMIN') {
      return next(new ApiError(403, 'Accès réservé aux administrateurs'));
    }
    next();
  } catch (err) {
    next(err);
  }
}
