import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export async function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

// Precomputed ONCE at load. Compared against when a login email is unknown so
// response time is constant whether or not the account exists (defeats
// user enumeration via timing).
export const DUMMY_PASSWORD_HASH = bcrypt.hashSync('timing-safe-dummy-password', 10);

// SHA-256 hex of the refresh token, stored in sessions (matches AuthService.sha256).
export function sha256(input) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

export function randomToken() {
  return crypto.randomUUID();
}
