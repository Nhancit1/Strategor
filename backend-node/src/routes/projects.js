import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, ApiError } from '../middleware/error.js';
import { requireAuth } from '../middleware/auth.js';
import { loadOwnedProject } from '../utils/ownership.js';
import { analyzeLimiter } from '../middleware/rateLimit.js';
import { Project } from '../models/Project.js';
import { User } from '../models/User.js';
import { OnboardingProfile } from '../models/OnboardingProfile.js';
import { FinanceLite } from '../models/FinanceLite.js';
import { AgentExecution } from '../models/AgentExecution.js';
import { startAnalysis, cancelAnalysis } from '../services/pythonClient.js';
import { buildDocumentsContext } from '../utils/documentsContext.js';

const router = Router();

const projectDto = (p) => ({
  id: p.id.toString(),
  name: p.name,
  status: p.status,
  currentStep: p.currentStep,
  analysisMode: p.analysisMode,
  consistencyReport: p.consistencyReport ?? null,
  createdAt: p.createdAt ? p.createdAt.toISOString() : null,
});

const ONBOARDING_FIELDS = [
  'companyName', 'userRole', 'sectors', 'territories', 'marketTypes', 'objectives',
  'stage', 'revenueRange', 'teamSize', 'territoryDetail', 'customerDescription',
  'objectiveDetail', 'startingPoint',
  'activityPrecise', 'positioning', 'valueScope', 'strengths', 'weaknesses', 'portfolio',
];


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

const patchProjectSchema = z.object({
  name: z.string().max(200).optional(),
  analysisMode: z.enum(['quick', 'standard', 'comprehensive']).optional(),
});

router.patch('/:id', requireAuth, asyncHandler(async (req, res) => {
  const project = await loadOwnedProject(req.params.id, req.user.id);
  const parsed = patchProjectSchema.safeParse(req.body || {});
  if (!parsed.success) throw new ApiError(400, 'Données de projet invalides');
  if (parsed.data.name) {
    project.name = parsed.data.name.trim() || 'Projet sans nom';
  }
  if (parsed.data.analysisMode) {
    project.analysisMode = parsed.data.analysisMode;
  }
  await project.save();
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

  // Reset all agent executions to PENDING for a fresh analysis run
  if (phase === 'all' || phase === 'profile') {
    await AgentExecution.updateMany(
      { project: project._id },
      {
        $set: {
          status: 'PENDING',
          output: null,
          editedOutput: null,
          errorMessage: null,
          progressPercent: 0,
          modelUsed: null,
          tokensInput: null,
          tokensOutput: null,
          costEstimateCents: null,
          groundingCostCents: null,
          sources: null,
          startedAt: null,
          completedAt: null,
          validatedAt: null,
          stale: false,
        }
      }
    );
  }

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

  // Phase 2 — run up to AND INCLUDING the Diagnostic (Agent 5), then pause for the
  // diagnostic review. Seeds the reviewed Agent 1 output for its dependents.
  startAnalysis({
    projectId: project.id.toString(),
    mode: project.analysisMode || 'standard',
    language: lang,
    phase: 'diagnostic',
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

// Phase 3 — after the diagnostic review, run the remaining agents (Axes, KPIs,
// Risques, Finance, Changement, Livrables, Cohérence…), seeding every output
// produced so far (Agents 1..5, with the reviewed Diagnostic winning).
router.post('/:id/analyze/continue-diagnostic', requireAuth, analyzeLimiter, asyncHandler(async (req, res) => {
  const project = await loadOwnedProject(req.params.id, req.user.id);
  if (project.status !== 'DIAGNOSTIC_REVIEW') {
    throw new ApiError(409, 'Aucune revue de diagnostic en attente pour ce projet');
  }
  const user = await User.findById(req.user.id).select('lang');
  const lang = user?.lang || 'fr';

  // Seed every completed output so far (edited output wins over the raw output).
  const execs = await AgentExecution.find({ project: project._id });
  const seedOutputs = {};
  for (const e of execs) {
    if (e.status === 'DONE') seedOutputs[e.agentId] = e.editedOutput ?? e.output;
  }
  if (!seedOutputs[5]) {
    throw new ApiError(409, "Le diagnostic (Agent 5) n'est pas disponible");
  }

  const profile = await OnboardingProfile.findOne({ project: project._id });
  const finance = await FinanceLite.findOne({ project: project._id });
  const documentsContext = await buildDocumentsContext(project._id);

  project.status = 'ANALYZING';
  await project.save();

  startAnalysis({
    projectId: project.id.toString(),
    mode: project.analysisMode || 'standard',
    language: lang,
    phase: 'post_diagnostic',
    seedOutputs,
    profile: profile ? profile.toJSON() : null,
    financeLite: finance ? finance.toJSON() : null,
    documentsContext: documentsContext || null,
  }).catch(async (err) => {
    console.error('[analyze/continue-diagnostic] Python handoff failed:', err.message);
    project.status = 'FAILED';
    await project.save();
  });

  res.status(202).json(projectDto(project));
}));

// Phase 4 — cancel / stop the running analysis.
router.post('/:id/analyze/cancel', requireAuth, asyncHandler(async (req, res) => {
  const project = await loadOwnedProject(req.params.id, req.user.id);
  try {
    await cancelAnalysis(project.id.toString());
  } catch (err) {
    console.error('[analyze/cancel] Python cancel failed:', err.message);
  }
  // Immediately update project status to FAILED
  project.status = 'FAILED';
  await project.save();
  res.status(200).json(projectDto(project));
}));

export default router;
