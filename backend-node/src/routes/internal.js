import { Router } from 'express';
import mongoose from 'mongoose';
import { asyncHandler, ApiError } from '../middleware/error.js';
import { requireInternal } from '../middleware/internalAuth.js';
import { config } from '../config/env.js';
import { Project } from '../models/Project.js';
import { AgentExecution } from '../models/AgentExecution.js';
import { ProjectDocument } from '../models/ProjectDocument.js';
import { broadcastAgentEvent } from '../socket/index.js';

// These endpoints are called ONLY by the Python service (shared internal token).
const router = Router();
router.use(requireInternal);

// ── Input guards (defence-in-depth even though the route is internal-token gated) ──
const VALID_STATUS = new Set(['PENDING', 'RUNNING', 'DONE', 'ERROR', 'SKIPPED']);

// Reject anything that isn't a real Mongo ObjectId (avoids CastErrors + injection of objects).
const requireObjectId = (id, label) => {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, `Invalid ${label}`);
  return id;
};

// Coerce to a non-negative finite number, capped to a sane maximum (blocks cost/token inflation).
const safeNum = (v, max) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return 0;
  return max != null && n > max ? max : n;
};

// Python pushes one event per agent state transition.
// body: { agentId, agentName, status, progress, message, doneCount,
//         output?, modelUsed?, tokensInput?, tokensOutput?, costEstimateCents? }
router.post('/projects/:projectId/agent-events', asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  requireObjectId(projectId, 'projectId');
  const b = req.body || {};

  const agentId = Number(b.agentId);
  if (!Number.isInteger(agentId) || agentId < 1 || agentId > 100) {
    throw new ApiError(400, 'Invalid agentId');
  }
  if (b.status !== undefined && !VALID_STATUS.has(b.status)) {
    throw new ApiError(400, 'Invalid status');
  }

  const update = {
    agentName: b.agentName,
    status: b.status,
    progressPercent: safeNum(b.progress, 100),
  };
  if (b.status === 'RUNNING') update.startedAt = new Date();
  if (b.output !== undefined) update.output = b.output;
  if (b.language !== undefined) update.lang = b.language;
  if (b.modelUsed !== undefined) update.modelUsed = b.modelUsed;
  if (b.tokensInput !== undefined) update.tokensInput = safeNum(b.tokensInput, 1e8);
  if (b.tokensOutput !== undefined) update.tokensOutput = safeNum(b.tokensOutput, 1e8);
  if (b.costEstimateCents !== undefined) update.costEstimateCents = safeNum(b.costEstimateCents, 100000);
  if (b.groundingCostCents !== undefined) update.groundingCostCents = safeNum(b.groundingCostCents, 100000);
  if (b.sources !== undefined) update.sources = b.sources;
  if (b.errorMessage !== undefined) update.errorMessage = b.errorMessage;
  if (b.status === 'DONE' || b.status === 'ERROR') update.completedAt = new Date();

  // "Latest deliverable" snapshot — only a SUCCESSFUL run defines the agent's current
  // output and its headline cost. A failed attempt must not overwrite these.
  if (b.status === 'DONE') {
    if (b.modelUsed !== undefined) update.modelUsed = b.modelUsed;
    if (b.tokensInput !== undefined) update.tokensInput = safeNum(b.tokensInput, 1e8);
    if (b.tokensOutput !== undefined) update.tokensOutput = safeNum(b.tokensOutput, 1e8);
    if (b.costEstimateCents !== undefined) update.costEstimateCents = safeNum(b.costEstimateCents, 100000);
    if (b.groundingCostCents !== undefined) update.groundingCostCents = safeNum(b.groundingCostCents, 100000);
  }

  // ACTUAL consumption: every billed call is real spend and must be SUMMED (not delta-ed),
  // so the dashboard matches the provider bill — regenerations, self-correction passes and
  // billed-but-failed attempts all count. (DONE carries cost; ERROR carries it too when the
  // call was billed before failing.)
  const billed = b.status === 'DONE' || b.status === 'ERROR';
  const runCost = billed ? safeNum(b.costEstimateCents, 100000) : 0;
  const runGrounding = billed ? safeNum(b.groundingCostCents, 100000) : 0;
  const runTokens = billed ? safeNum(b.tokensInput, 1e8) + safeNum(b.tokensOutput, 1e8) : 0;

  const inc = {};
  if (runCost) inc.costConsumedCents = runCost;
  if (runGrounding) inc.groundingConsumedCents = runGrounding;
  if (runTokens) inc.tokensConsumed = runTokens;

  await AgentExecution.findOneAndUpdate(
    { project: projectId, agentId: agentId },
    {
      $set: update,
      $setOnInsert: { project: projectId, agentId: agentId },
      ...(Object.keys(inc).length ? { $inc: inc } : {}),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // Roll the same consumption onto the project (sum — every run counts).
  if (runCost || runGrounding || runTokens) {
    const proj = await Project.findByIdAndUpdate(
      projectId,
      { $inc: { costTotalCents: runCost, groundingCostCents: runGrounding, tokensTotal: runTokens } },
      { new: true }
    );
    const threshold = config.cost.alertThresholdCents;
    if (
      proj &&
      threshold > 0 &&
      !proj.costAlert &&
      proj.costTotalCents + proj.groundingCostCents >= threshold
    ) {
      await Project.updateOne({ _id: projectId }, { $set: { costAlert: true } });
    }
  }

  // Relay to subscribed clients (same shape the React app already parses).
  broadcastAgentEvent(projectId, {
    projectId,
    agentId: agentId,
    agentName: b.agentName,
    status: b.status,
    progress: b.progress ?? 0,
    message: b.message ?? null,
    doneCount: b.doneCount ?? 0,
    timestamp: new Date().toISOString(),
  });

  res.status(204).end();
}));

// Python signals the whole pipeline finished -> flip project to VALIDATING.
router.post('/projects/:projectId/analysis-complete', asyncHandler(async (req, res) => {
  requireObjectId(req.params.projectId, 'projectId');
  const b = req.body || {};
  let status;
  if (b.failed) status = 'FAILED';
  else if (b.phase === 'profile') status = 'PROFILE_REVIEW'; // Agent 1 done -> awaiting review
  else if (b.phase === 'diagnostic') status = 'DIAGNOSTIC_REVIEW'; // Diagnostic done -> awaiting review
  else status = 'VALIDATING';
  await Project.findByIdAndUpdate(req.params.projectId, { $set: { status } });
  res.status(204).end();
}));

// Python pushes the deterministic numeric-integrity report (cross-agent consistency).
// body: { report: { status, summary, checks, semantic } }
router.post('/projects/:projectId/consistency-report', asyncHandler(async (req, res) => {
  requireObjectId(req.params.projectId, 'projectId');
  const report = req.body?.report ?? null;
  await Project.findByIdAndUpdate(req.params.projectId, { $set: { consistencyReport: report } });
  res.status(204).end();
}));

// Python returns parsed document text.
// body: { parsedContent, status: 'DONE'|'ERROR', parseError? }
router.post('/documents/:documentId/parsed', asyncHandler(async (req, res) => {
  requireObjectId(req.params.documentId, 'documentId');
  const b = req.body || {};
  await ProjectDocument.findByIdAndUpdate(req.params.documentId, {
    $set: {
      parsedContent: b.parsedContent ?? null,
      parseStatus: b.status || 'DONE',
      parseError: b.parseError ?? null,
      parsedAt: new Date(),
    },
  });
  res.status(204).end();
}));

export default router;
