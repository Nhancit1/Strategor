import { Router } from 'express';
import { asyncHandler, ApiError } from '../middleware/error.js';
import { requireAuth } from '../middleware/auth.js';
import { loadOwnedProject } from '../utils/ownership.js';
import { analyzeLimiter } from '../middleware/rateLimit.js';
import { AgentExecution } from '../models/AgentExecution.js';
import { OnboardingProfile } from '../models/OnboardingProfile.js';
import { FinanceLite } from '../models/FinanceLite.js';
import { User } from '../models/User.js';
import { startAnalysis } from '../services/pythonClient.js';
import { translateExecutionIfNeeded } from '../services/translator.js';
import { transitiveDependents } from '../utils/agentGraph.js';

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
  const user = await User.findById(req.user.id).select('lang');
  const targetLang = user?.lang || 'fr';
  const translated = await Promise.all(
    execs.map((e) => translateExecutionIfNeeded(e, targetLang))
  );
  res.json(translated);
}));

router.get('/:agentId', asyncHandler(async (req, res) => {
  await loadOwnedProject(req.params.projectId, req.user.id);
  const exec = await getExec(req.params.projectId, Number(req.params.agentId));
  const user = await User.findById(req.user.id).select('lang');
  const targetLang = user?.lang || 'fr';
  const translated = await translateExecutionIfNeeded(exec, targetLang);
  res.json(typeof translated.toJSON === 'function' ? translated.toJSON() : translated);
}));

router.put('/:agentId/output', asyncHandler(async (req, res) => {
  await loadOwnedProject(req.params.projectId, req.user.id);
  const agentId = Number(req.params.agentId);
  const exec = await getExec(req.params.projectId, agentId);
  exec.editedOutput = req.body;
  exec.validatedAt = new Date();
  exec.stale = false; // this module was just (re)validated by hand
  await exec.save();

  // Propagate: editing an upstream module makes its downstream dependents stale.
  const dependents = transitiveDependents(agentId);
  if (dependents.length) {
    await AgentExecution.updateMany(
      { project: req.params.projectId, agentId: { $in: dependents }, status: 'DONE' },
      { $set: { stale: true } }
    );
  }
  res.json(exec.toJSON());
}));

// One-click re-derivation of every module marked stale by an upstream edit.
// Re-runs only the stale agents (deps seeded from current outputs) in topo order.
router.post('/rederive-stale', analyzeLimiter, asyncHandler(async (req, res) => {
  const project = await loadOwnedProject(req.params.projectId, req.user.id);
  const staleExecs = await AgentExecution.find({ project: project._id, stale: true });
  const staleIds = staleExecs.map((e) => e.agentId);
  if (!staleIds.length) return res.status(200).json({ rederived: [] });

  const user = await User.findById(req.user.id).select('lang');
  const lang = user?.lang || 'fr';
  const profile = await OnboardingProfile.findOne({ project: project._id });
  const finance = await FinanceLite.findOne({ project: project._id });

  // Seed every completed output (edited wins); stale agents recompute from these.
  const allExecs = await AgentExecution.find({ project: project._id, status: 'DONE' });
  const seedOutputs = {};
  for (const e of allExecs) seedOutputs[e.agentId] = e.editedOutput ?? e.output;

  await AgentExecution.updateMany(
    { project: project._id, agentId: { $in: staleIds } },
    { $set: { status: 'PENDING', stale: false, errorMessage: null } }
  );
  project.status = 'ANALYZING';
  await project.save();

  startAnalysis({
    projectId: project.id.toString(),
    mode: project.analysisMode || 'standard',
    language: lang,
    phase: 'subset',
    targetAgentIds: staleIds,
    seedOutputs,
    profile: profile ? profile.toJSON() : null,
    financeLite: finance ? finance.toJSON() : null,
    documentsContext: null,
  }).catch((err) => console.error('[rederive-stale] Python handoff failed:', err.message));

  res.status(202).json({ rederived: staleIds });
}));

async function relaunch(req, res) {
  const project = await loadOwnedProject(req.params.projectId, req.user.id);
  const agentId = Number(req.params.agentId);
  const exec = await getExec(req.params.projectId, agentId);
  exec.status = 'PENDING';
  exec.retryCount += 1;
  exec.errorMessage = null;
  await exec.save();

  const user = await User.findById(req.user.id).select('lang');
  const lang = user?.lang || 'fr';

  const profile = await OnboardingProfile.findOne({ project: project._id });
  const finance = await FinanceLite.findOne({ project: project._id });
  project.status = 'ANALYZING';
  await project.save();

  // Fetch all other agents' outputs to seed the context for this single run
  const allExecs = await AgentExecution.find({ project: project._id, status: 'DONE' });
  const seedOutputs = {};
  for (const e of allExecs) {
    if (e.agentId !== agentId) {
      seedOutputs[e.agentId] = e.editedOutput ?? e.output;
    }
  }

  // Re-run only the target agent (+ its deps from existing outputs).
  startAnalysis({
    projectId: project.id.toString(),
    mode: project.analysisMode || 'standard',
    language: lang,
    phase: 'single',
    targetAgentId: agentId,
    seedOutputs,
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
