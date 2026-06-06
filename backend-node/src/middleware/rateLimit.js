import rateLimit from 'express-rate-limit';

// Consistent JSON 429 (matches the global error-handler shape).
const json429 = (msg) => (_req, res) =>
  res.status(429).json({ error: 'TooManyRequests', message: msg, status: 429 });

const common = { standardHeaders: 'draft-7', legacyHeaders: false };

// Generous global ceiling — a backstop against floods, not normal traffic (per IP).
export const globalLimiter = rateLimit({
  ...common,
  windowMs: 15 * 60 * 1000,
  limit: 1000,
  handler: json429('Trop de requêtes. Réessayez dans un moment.'),
});

// Tight on auth — brute-force / credential-stuffing protection (per IP).
export const authLimiter = rateLimit({
  ...common,
  windowMs: 15 * 60 * 1000,
  limit: 20,
  handler: json429("Trop de tentatives d'authentification. Réessayez dans 15 minutes."),
});

// Admin surface — moderate ceiling (per IP).
export const adminLimiter = rateLimit({
  ...common,
  windowMs: 15 * 60 * 1000,
  limit: 120,
  handler: json429('Trop de requêtes administrateur. Réessayez dans un moment.'),
});

// Per-USER quota on the expensive analyze/retry calls. Anti-abuse only — cost is
// also tracked + alerted elsewhere, and this never affects an in-flight run.
export const analyzeLimiter = rateLimit({
  ...common,
  windowMs: 60 * 60 * 1000,
  limit: 30,
  keyGenerator: (req) => (req.user?.id ? String(req.user.id) : req.ip),
  handler: json429("Limite d'analyses atteinte pour le moment. Réessayez plus tard."),
});
