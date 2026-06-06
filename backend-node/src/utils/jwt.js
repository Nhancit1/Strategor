import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

// Mirrors the Spring JwtService: HS256, subject = user id, custom claims.
export function generateAccessToken(user) {
  return jwt.sign(
    { email: user.email, role: user.role || 'USER', mcp: !!user.mustChangePassword },
    config.jwt.secret,
    { algorithm: 'HS256', subject: user.id.toString(), expiresIn: config.jwt.accessTtlSeconds }
  );
}

export function generateRefreshToken(user) {
  return jwt.sign(
    { type: 'refresh' },
    config.jwt.secret,
    { algorithm: 'HS256', subject: user.id.toString(), expiresIn: config.jwt.refreshTtlSeconds }
  );
}

export function verifyToken(token) {
  return jwt.verify(token, config.jwt.secret, { algorithms: ['HS256'] });
}
