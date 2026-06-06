import { Router } from 'express';
import { asyncHandler, ApiError } from '../middleware/error.js';
import { requireAuth } from '../middleware/auth.js';
import { loadOwnedProject } from '../utils/ownership.js';
import { analyzeLimiter } from '../middleware/rateLimit.js';
import { Project } from '../models/Project.js';
import { User } from '../models/User.js';
import { OnboardingProfile } from '../models/OnboardingProfile.js';
import { FinanceLite } from '../models/FinanceLite.js';
import { ProjectDocument } from '../models/ProjectDocument.js';
import { AgentExecution } from '../models/AgentExecution.js';
import { startAnalysis } from '../services/pythonClient.js';

const router = Router();

const projectDto = (p) => ({
  id: p.id.toString(),
  name: p.name,
  status: p.status,
  currentStep: p.currentStep,
  analysisMode: p.analysisMode,
  createdAt: p.createdAt ? p.createdAt.toISOString() : null,
});

const ONBOARDING_FIELDS = [
  'companyName', 'userRole', 'sectors', 'territories', 'marketTypes', 'objectives',
  'stage', 'revenueRange', 'teamSize', 'territoryDetail', 'customerDescription',
  'objectiveDetail', 'startingPoint',
  'activityPrecise', 'positioning', 'valueScope', 'strengths', 'weaknesses', 'portfolio',
];

// Assemble parsed-document context (sentinel for the AI), capped at 8000 chars.
async function buildDocumentsContext(projectId) {
  const docs = await ProjectDocument.find({ project: projectId }).sort({ uploadedAt: -1 });
  let ctx = '';
  const MAX = 8000;
  for (const doc of docs) {
    if (doc.parseStatus !== 'DONE' || !doc.parsedContent) continue;
    if (ctx.length >= MAX) break;
    const remaining = MAX - ctx.length;
    let content = doc.parsedContent;
    if (content.length > remaining) content = content.slice(0, remaining) + '\n[…tronqué]';
    ctx += `─── ${doc.filename} (${doc.docType}) ───\n${content}\n\n`;
  }
  return ctx;
}

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const projects = await Project.find({ user: req.user.id, deletedAt: null }).sort({ createdAt: -1 });
  res.json(projects.map(projectDto));
}));

router.post('/', requireAuth, asyncHandler(async (req, res) => {
  const project = await Project.create({
    user: req.user.id,
    name: req.body?.name || 'Nouveau projet',
    status: 'ONBOARDING',
    currentStep: 1,
    analysisMode: 'comprehensive', // single mode: full 12-agent analysis
  });
  await OnboardingProfile.create({ project: project._id });
  res.json(projectDto(project));
}));

router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
  const project = await loadOwnedProject(req.params.id, req.user.id);
  res.json(projectDto(project));
}));

router.delete('/:id', requireAuth, asyncHandler(async (req, res) => {
  const project = await loadOwnedProject(req.params.id, req.user.id);
  project.deletedAt = new Date();
  await project.save();
  res.status(204).end();
}));

router.get('/:id/onboarding', requireAuth, asyncHandler(async (req, res) => {
  await loadOwnedProject(req.params.id, req.user.id);
  let profile = await OnboardingProfile.findOne({ project: req.params.id });
  if (!profile) profile = await OnboardingProfile.create({ project: req.params.id });
  res.json(profile.toJSON());
}));

router.put('/:id/onboarding', requireAuth, asyncHandler(async (req, res) => {
  await loadOwnedProject(req.params.id, req.user.id);
  let profile = await OnboardingProfile.findOne({ project: req.params.id });
  if (!profile) profile = new OnboardingProfile({ project: req.params.id });
  for (const f of ONBOARDING_FIELDS) {
    if (req.body?.[f] != null) profile[f] = req.body[f];
  }
  await profile.save();
  res.json(profile.toJSON());
}));

router.post('/:id/analyze', requireAuth, analyzeLimiter, asyncHandler(async (req, res) => {
  const project = await loadOwnedProject(req.params.id, req.user.id);
  if (project.status === 'ANALYZING') throw new ApiError(409, 'Analyse déjà en cours');
  const user = await User.findById(req.user.id).select('lang');
  const lang = user?.lang || 'fr';

  const profile = await OnboardingProfile.findOne({ project: project._id });
  const finance = await FinanceLite.findOne({ project: project._id });
  const documentsContext = await buildDocumentsContext(project._id);

  project.status = 'ANALYZING';
  await project.save();

  const phase = req.body?.phase || 'all';

  // Phase "all" runs all agents sequentially. "profile" only runs Agent 1.
  startAnalysis({
    projectId: project.id.toString(),
    mode: project.analysisMode || 'standard',
    language: lang,
    phase: phase,
    profile: profile ? profile.toJSON() : null,
    financeLite: finance ? finance.toJSON() : null,
    documentsContext: documentsContext || null,
  }).catch(async (err) => {
    console.error('[analyze] Python handoff failed:', err.message);
    project.status = 'FAILED';
    await project.save();
  });

  res.status(202).json(projectDto(project));
}));

router.post('/:id/analyze/continue', requireAuth, analyzeLimiter, asyncHandler(async (req, res) => {
  const project = await loadOwnedProject(req.params.id, req.user.id);
  if (project.status !== 'PROFILE_REVIEW') {
    throw new ApiError(409, 'Aucune revue de profil en attente pour ce projet');
  }
  const user = await User.findById(req.user.id).select('lang');
  const lang = user?.lang || 'fr';

  // The reviewed Agent 1 output (user edits win over the raw output).
  const agent1 = await AgentExecution.findOne({ project: project._id, agentId: 1 });
  const agent1Output = agent1 ? (agent1.editedOutput ?? agent1.output) : null;
  if (!agent1Output) {
    throw new ApiError(409, "Le profil (Agent 1) n'est pas disponible");
  }

  const profile = await OnboardingProfile.findOne({ project: project._id });
  const finance = await FinanceLite.findOne({ project: project._id });
  const documentsContext = await buildDocumentsContext(project._id);

  project.status = 'ANALYZING';
  await project.save();

  // Phase 2 — run the remaining agents, seeding the reviewed Agent 1 output so
  // its dependents (PESTEL, SWOT, Concurrence, Chaîne de valeur…) build on it.
  startAnalysis({
    projectId: project.id.toString(),
    mode: project.analysisMode || 'standard',
    language: lang,
    phase: 'full',
    seedOutputs: { 1: agent1Output },
    profile: profile ? profile.toJSON() : null,
    financeLite: finance ? finance.toJSON() : null,
    documentsContext: documentsContext || null,
  }).catch(async (err) => {
    console.error('[analyze/continue] Python handoff failed:', err.message);
    project.status = 'FAILED';
    await project.save();
  });

  res.status(202).json(projectDto(project));
}));

export default router;
