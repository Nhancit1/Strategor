import { User } from '../models/User.js';
import { Session } from '../models/Session.js';
import { generateAccessToken, generateRefreshToken, verifyToken } from '../utils/jwt.js';
import { hashPassword, verifyPassword, sha256, DUMMY_PASSWORD_HASH } from '../utils/hash.js';
import { config } from '../config/env.js';
import { ApiError } from '../middleware/error.js';
import { audit } from './auditService.js';

function userDto(u) {
  return {
    id: u.id.toString(),
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    role: u.role || 'USER',
    mustChangePassword: !!u.mustChangePassword,
    lang: u.lang,
    emailVerified: !!u.emailVerified,
  };
}

async function issueTokens(user, req) {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  await Session.create({
    user: user._id,
    refreshTokenHash: sha256(refreshToken),
    expiresAt: new Date(Date.now() + config.jwt.refreshTtlSeconds * 1000),
    ipAddress: req?.ip || null,
    userAgent: req?.headers?.['user-agent'] || null,
  });

  return { accessToken, refreshToken, user: userDto(user) };
}

export async function login(body, req) {
  const user = await User.findOne({ email: body.email.toLowerCase() });
  // Always run a bcrypt compare (against a dummy hash when the account is
  // missing/disabled) so timing is constant, and return ONE generic error so
  // attackers can't tell which emails exist.
  const hash = user && !user.deletedAt ? user.passwordHash : DUMMY_PASSWORD_HASH;
  const ok = await verifyPassword(body.password, hash);
  if (!user || user.deletedAt || !ok) {
    audit({ action: 'LOGIN_FAILED', email: body.email, status: 'FAILURE', req, detail: 'Identifiants invalides' });
    throw new ApiError(400, 'Identifiants invalides');
  }
  audit({ action: 'LOGIN_SUCCESS', email: user.email, user: user._id, status: 'SUCCESS', req });
  return issueTokens(user, req);
}

export async function refresh(refreshToken, req) {
  let claims;
  try {
    claims = verifyToken(refreshToken);
  } catch {
    throw new ApiError(400, 'Token de refresh invalide');
  }
  if (claims.type !== 'refresh') throw new ApiError(400, 'Token de refresh invalide');

  const session = await Session.findOne({ refreshTokenHash: sha256(refreshToken) }).populate('user');
  if (!session) throw new ApiError(400, 'Session inconnue');
  if (session.revokedAt || session.expiresAt < new Date()) {
    throw new ApiError(400, 'Session expirée');
  }
  // Rotate: revoke the old session, issue a fresh pair.
  session.revokedAt = new Date();
  await session.save();
  return issueTokens(session.user, req);
}

export async function logout(refreshToken, req) {
  if (!refreshToken) return;
  await Session.updateOne(
    { refreshTokenHash: sha256(refreshToken), revokedAt: null },
    { $set: { revokedAt: new Date() } }
  );
  audit({ action: 'LOGOUT', status: 'SUCCESS', req });
}

export async function changePassword(userId, { currentPassword, newPassword }, req) {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(400, 'Utilisateur inconnu');
  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    throw new ApiError(400, 'Mot de passe actuel incorrect');
  }
  user.passwordHash = await hashPassword(newPassword);
  user.mustChangePassword = false;
  await user.save();
  audit({ action: 'PASSWORD_CHANGED', email: user.email, user: user._id, status: 'SUCCESS', req });
  // Re-issue tokens so the cleared mustChangePassword flag takes effect now.
  return issueTokens(user, req);
}

export async function deleteAccount(userId) {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(400, 'Utilisateur inconnu');
  user.deletedAt = new Date();
  user.email = `deleted-${user.id}@strategor.local`;
  await user.save();
  await Session.updateMany({ user: user._id, revokedAt: null }, { $set: { revokedAt: new Date() } });
}

export { userDto };
