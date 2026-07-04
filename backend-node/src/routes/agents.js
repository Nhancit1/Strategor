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
import { buildDocumentsContext } from '../utils/documentsContext.js';

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
  // editedOutput is an agent's structured JSON: accept only an object/array, and cap its
  // size so an oversized payload can't bloat the document or downstream exports/prompts.
  const body = req.body;
  if (body === null || typeof body !== 'object') throw new ApiError(400, 'Sortie invalide');
  if (JSON.stringify(body).length > 500_000) throw new ApiError(413, 'Sortie trop volumineuse');
  exec.editedOutput = body;
  exec.validatedAt = new Date();
  exec.stale = false; // this module was just (re)validated by hand
  await exec.save();

  // Materiality gate: a cosmetic edit (style/typo) must not invalidate the whole
  // downstream chain. The client passes ?propagate=false for "correction de forme";
  // default remains true (substantive edit) so existing behavior is unchanged.
  const propagate = req.query.propagate !== 'false';
  if (propagate) {
    // Propagate: editing an upstream module makes its downstream dependents stale.
    const dependents = transitiveDependents(agentId);
    if (dependents.length) {
      await AgentExecution.updateMany(
        { project: req.params.projectId, agentId: { $in: dependents }, status: 'DONE' },
        { $set: { stale: true } }
      );
    }
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
    documentsContext: (await buildDocumentsContext(project._id)) || null,
  }).catch((err) => console.error('[rederive-stale] Python handoff failed:', err.message));

  res.status(202).json({ rederived: staleIds });
}));

// Resume an interrupted analysis: one agent failure aborts the run and marks every
// downstream agent SKIPPED, but retrying that single agent left the SKIPPED ones
// unreachable (rederive-stale only picks stale ones). This route re-runs every
// ERROR/SKIPPED agent as a subset, in topological order, seeding all DONE outputs.
router.post('/resume', analyzeLimiter, asyncHandler(async (req, res) => {
  const project = await loadOwnedProject(req.params.projectId, req.user.id);
  const pending = await AgentExecution.find({
    project: project._id, status: { $in: ['ERROR', 'SKIPPED'] },
  });
  const resumeIds = pending.map((e) => e.agentId);
  if (!resumeIds.length) return res.status(200).json({ resumed: [] });

  const user = await User.findById(req.user.id).select('lang');
  const lang = user?.lang || 'fr';
  const profile = await OnboardingProfile.findOne({ project: project._id });
  const finance = await FinanceLite.findOne({ project: project._id });

  const doneExecs = await AgentExecution.find({ project: project._id, status: 'DONE' });
  const seedOutputs = {};
  for (const e of doneExecs) seedOutputs[e.agentId] = e.editedOutput ?? e.output;

  await AgentExecution.updateMany(
    { project: project._id, agentId: { $in: resumeIds } },
    { $set: { status: 'PENDING', errorMessage: null, statusMessage: null } }
  );
  project.status = 'ANALYZING';
  await project.save();

  startAnalysis({
    projectId: project.id.toString(),
    mode: project.analysisMode || 'standard',
    language: lang,
    phase: 'subset',
    targetAgentIds: resumeIds,
    seedOutputs,
    profile: profile ? profile.toJSON() : null,
    financeLite: finance ? finance.toJSON() : null,
    documentsContext: (await buildDocumentsContext(project._id)) || null,
  }).catch((err) => console.error('[resume] Python handoff failed:', err.message));

  res.status(202).json({ resumed: resumeIds });
}));

async function relaunch(req, res) {
  const project = await loadOwnedProject(req.params.projectId, req.user.id);
  const agentId = Number(req.params.agentId);
  const exec = await getExec(req.params.projectId, agentId);
  exec.status = 'PENDING';
  exec.retryCount += 1;
  exec.errorMessage = null;
  await exec.save();

  // A regeneration can change this agent's conclusions at least as much as a manual
  // edit — mark its transitive dependents stale so the validation page proposes a
  // targeted re-derivation instead of silently keeping outputs based on the old version.
  const dependents = transitiveDependents(agentId);
  if (dependents.length) {
    await AgentExecution.updateMany(
      { project: project._id, agentId: { $in: dependents }, status: 'DONE' },
      { $set: { stale: true } }
    );
  }

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
    documentsContext: (await buildDocumentsContext(project._id)) || null,
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
