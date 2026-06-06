import { Router } from 'express';
import mongoose from 'mongoose';
import { asyncHandler, ApiError } from '../middleware/error.js';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { config } from '../config/env.js';
import { User } from '../models/User.js';
import { Project } from '../models/Project.js';
import { AgentExecution } from '../models/AgentExecution.js';
import { Session } from '../models/Session.js';
import { hashPassword } from '../utils/hash.js';
import { sendAccessEmail } from '../services/emailService.js';

// All admin endpoints require an authenticated ADMIN (checked against the DB).
const router = Router();
router.use(requireAuth, requireAdmin);

const cents = (c) => +(((c || 0) / 100).toFixed(2)); // cents -> dollars, rounded
const allIn = (p) => (p.costTotalCents || 0) + (p.groundingCostCents || 0);

// ── Overview: org-wide totals ────────────────────────────────────────────────
router.get('/overview', asyncHandler(async (_req, res) => {
  const [users, agg] = await Promise.all([
    User.countDocuments({ deletedAt: null }),
    Project.aggregate([
      { $match: { deletedAt: null } },
      {
        $group: {
          _id: null,
          projects: { $sum: 1 },
          costCents: { $sum: { $add: ['$costTotalCents', '$groundingCostCents'] } },
          tokens: { $sum: '$tokensTotal' },
          alerts: { $sum: { $cond: ['$costAlert', 1, 0] } },
        },
      },
    ]),
  ]);
  const a = agg[0] || { projects: 0, costCents: 0, tokens: 0, alerts: 0 };
  res.json({
    users,
    projects: a.projects,
    costCents: a.costCents,
    costUsd: cents(a.costCents),
    tokens: a.tokens,
    alerts: a.alerts,
    alertThresholdUsd: cents(config.cost.alertThresholdCents),
  });
}));

// ── Users list: each user + project count + total cost ───────────────────────
router.get('/users', asyncHandler(async (_req, res) => {
  const [users, agg] = await Promise.all([
    User.find({ deletedAt: null })
      .select('email firstName lastName role mustChangePassword createdAt')
      .sort({ createdAt: -1 })
      .lean(),
    Project.aggregate([
      { $match: { deletedAt: null } },
      {
        $group: {
          _id: '$user',
          projectCount: { $sum: 1 },
          costCents: { $sum: { $add: ['$costTotalCents', '$groundingCostCents'] } },
        },
      },
    ]),
  ]);
  const byUser = new Map(agg.map((x) => [String(x._id), x]));
  res.json(
    users.map((u) => {
      const x = byUser.get(String(u._id));
      return {
        id: String(u._id),
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        mustChangePassword: !!u.mustChangePassword,
        createdAt: u.createdAt,
        projectCount: x?.projectCount || 0,
        costUsd: cents(x?.costCents),
      };
    })
  );
}));

// ── A user's projects, with cost per project ─────────────────────────────────
router.get('/users/:id/projects', asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(400, 'Id invalide');
  const projects = await Project.find({ user: req.params.id, deletedAt: null })
    .select('name status analysisMode costTotalCents groundingCostCents tokensTotal costAlert createdAt')
    .sort({ createdAt: -1 })
    .lean();
  res.json(
    projects.map((p) => ({
      id: String(p._id),
      name: p.name,
      status: p.status,
      analysisMode: p.analysisMode,
      costUsd: cents(allIn(p)),
      tokens: p.tokensTotal || 0,
      costAlert: !!p.costAlert,
      createdAt: p.createdAt,
    }))
  );
}));

// ── One project: per-agent cost breakdown ────────────────────────────────────
router.get('/projects/:id', asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(400, 'Id invalide');
  const project = await Project.findOne({ _id: req.params.id, deletedAt: null })
    .select('name status analysisMode costTotalCents groundingCostCents tokensTotal costAlert createdAt')
    .lean();
  if (!project) throw new ApiError(404, 'Projet introuvable');
  const agents = await AgentExecution.find({ project: req.params.id })
    .select('agentId agentName status modelUsed tokensInput tokensOutput costEstimateCents groundingCostCents')
    .sort({ agentId: 1 })
    .lean();
  res.json({
    id: String(project._id),
    name: project.name,
    status: project.status,
    analysisMode: project.analysisMode,
    costUsd: cents(allIn(project)),
    tokens: project.tokensTotal || 0,
    costAlert: !!project.costAlert,
    agents: agents.map((a) => ({
      agentId: a.agentId,
      agentName: a.agentName,
      status: a.status,
      modelUsed: a.modelUsed,
      tokensInput: a.tokensInput || 0,
      tokensOutput: a.tokensOutput || 0,
      costUsd: cents((a.costEstimateCents || 0) + (a.groundingCostCents || 0)),
    })),
  });
}));

// ── Create a user (admin-provisioned; trusted, so email is pre-verified) ──────
router.post('/users', asyncHandler(async (req, res) => {
  const { email, firstName, lastName, password, role, lang } = req.body || {};
  if (!email || typeof email !== 'string') throw new ApiError(400, 'Email requis');
  if (!password || typeof password !== 'string' || password.length < 8) {
    throw new ApiError(400, 'Mot de passe initial requis (8 caractères minimum)');
  }
  const normalized = email.toLowerCase().trim();
  if (await User.findOne({ email: normalized })) {
    throw new ApiError(409, 'Un utilisateur avec cet email existe déjà');
  }
  const user = await User.create({
    email: normalized,
    passwordHash: await hashPassword(password),
    firstName: typeof firstName === 'string' ? firstName : null,
    lastName: typeof lastName === 'string' ? lastName : null,
    lang: lang === 'en' ? 'en' : 'fr',
    role: role === 'ADMIN' ? 'ADMIN' : 'USER',
    emailVerified: true, // admin-created accounts are trusted
    mustChangePassword: true, // force change on first login
  });
  // Email the credentials (dev: logged to console). Non-blocking so a mail
  // failure never fails the already-created account.
  sendAccessEmail(user.email, { firstName: user.firstName, tempPassword: password })
    .catch((e) => console.error('[admin] access email failed:', e.message));
  console.log(`[admin] user created id=${user.id} role=${user.role} by=${req.user.id}`);
  res.status(201).json(user.toJSON());
}));

// ── Reset a user's password (forces change on next login + kills sessions) ────
router.put('/users/:id/password', asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(400, 'Id invalide');
  const { password } = req.body || {};
  if (!password || typeof password !== 'string' || password.length < 8) {
    throw new ApiError(400, 'Nouveau mot de passe requis (8 caractères minimum)');
  }
  const user = await User.findOne({ _id: req.params.id, deletedAt: null });
  if (!user) throw new ApiError(404, 'Utilisateur introuvable');
  user.passwordHash = await hashPassword(password);
  user.mustChangePassword = true;
  await user.save();
  await Session.deleteMany({ user: user._id }); // invalidate every session -> re-login
  console.log(`[admin] password reset for user=${user.id} by=${req.user.id}`);
  res.json({ ok: true });
}));

// ── Soft-delete a user (RGPD-friendly; admin cannot delete themselves) ────────
router.delete('/users/:id', asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(400, 'Id invalide');
  if (String(req.params.id) === String(req.user.id)) {
    throw new ApiError(400, 'Un administrateur ne peut pas se supprimer lui-même');
  }
  const user = await User.findOne({ _id: req.params.id, deletedAt: null });
  if (!user) throw new ApiError(404, 'Utilisateur introuvable');
  user.deletedAt = new Date();
  await user.save();
  await Session.deleteMany({ user: user._id });
  console.log(`[admin] user soft-deleted id=${user.id} by=${req.user.id}`);
  res.json({ ok: true });
}));

export default router;
