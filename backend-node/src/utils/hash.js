import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// Bcrypt work factor. 12 is the bank-grade baseline (cost 10 is too fast on modern HW).
// Backward compatible: existing cost-10 hashes still verify (the cost is embedded in the hash).
const SALT_ROUNDS = 12;

export async function hashPassword(plain) {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

// Precomputed ONCE at load. Compared against when a login email is unknown so
// response time is constant whether or not the account exists (defeats
// user enumeration via timing). Uses the SAME cost so the timing matches a real verify.
export const DUMMY_PASSWORD_HASH = bcrypt.hashSync('timing-safe-dummy-password', SALT_ROUNDS);

// SHA-256 hex of the refresh token, stored in sessions (matches AuthService.sha256).
export function sha256(input) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

export function randomToken() {
  return crypto.randomUUID();
}
