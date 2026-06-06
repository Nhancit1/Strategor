import { Router } from 'express';
import { asyncHandler, ApiError } from '../middleware/error.js';
import { requireAuth } from '../middleware/auth.js';
import { loadOwnedProject } from '../utils/ownership.js';
import { analyzeLimiter } from '../middleware/rateLimit.js';
import { AgentExecution } from '../models/AgentExecution.js';
import { OnboardingProfile } from '../models/OnboardingProfile.js';
import { FinanceLite } from '../models/FinanceLite.js';
import { startAnalysis } from '../services/pythonClient.js';

// mergeParams so :projectId from the parent mount is available.
const router = Router({ mergeParams: true });

router.use(requireAuth);

async function getExec(projectId, agentId) {
  const exec = await AgentExecution.findOne({ project: projectId, agentId });
  if (!exec) throw new ApiError(404, `Agent ${agentId} non exécuté`);
  return exec;
}

router.get('/', asyncHandler(async (req, res) => {
  await loadOwnedProject(req.params.projectId, req.user.id);
  const execs = await AgentExecution.find({ project: req.params.projectId }).sort({ agentId: 1 });
  res.json(execs.map((e) => e.toJSON()));
}));

router.get('/:agentId', asyncHandler(async (req, res) => {
  await loadOwnedProject(req.params.projectId, req.user.id);
  res.json((await getExec(req.params.projectId, Number(req.params.agentId))).toJSON());
}));

router.put('/:agentId/output', asyncHandler(async (req, res) => {
  await loadOwnedProject(req.params.projectId, req.user.id);
  const exec = await getExec(req.params.projectId, Number(req.params.agentId));
  exec.editedOutput = req.body;
  exec.validatedAt = new Date();
  await exec.save();
  res.json(exec.toJSON());
}));

async function relaunch(req, res) {
  const project = await loadOwnedProject(req.params.projectId, req.user.id);
  const agentId = Number(req.params.agentId);
  const exec = await getExec(req.params.projectId, agentId);
  exec.status = 'PENDING';
  exec.retryCount += 1;
  exec.errorMessage = null;
  await exec.save();

  const profile = await OnboardingProfile.findOne({ project: project._id });
  const finance = await FinanceLite.findOne({ project: project._id });
  project.status = 'ANALYZING';
  await project.save();

  // Re-run only the target agent (+ its deps from existing outputs).
  startAnalysis({
    projectId: project.id.toString(),
    mode: project.analysisMode || 'standard',
    language: 'fr',
    phase: 'single',
    targetAgentId: agentId,
    profile: profile ? profile.toJSON() : null,
    financeLite: finance ? finance.toJSON() : null,
    documentsContext: null,
  }).catch((err) => console.error('[retry] Python handoff failed:', err.message));

  res.status(202).end();
}

router.post('/:agentId/retry', analyzeLimiter, asyncHandler(relaunch));
router.post('/:agentId/regenerate', analyzeLimiter, asyncHandler(relaunch)); // logical alias

router.get('/:agentId/versions', asyncHandler(async (req, res) => {
  await loadOwnedProject(req.params.projectId, req.user.id);
  const exec = await getExec(req.params.projectId, Number(req.params.agentId));
  res.json(exec.versions ?? null);
}));

export default router;
