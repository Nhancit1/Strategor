import { Router } from 'express';
import { asyncHandler } from '../middleware/error.js';
import { requireInternal } from '../middleware/internalAuth.js';
import { config } from '../config/env.js';
import { Project } from '../models/Project.js';
import { AgentExecution } from '../models/AgentExecution.js';
import { ProjectDocument } from '../models/ProjectDocument.js';
import { broadcastAgentEvent } from '../socket/index.js';

// These endpoints are called ONLY by the Python service (shared internal token).
const router = Router();
router.use(requireInternal);

// Python pushes one event per agent state transition.
// body: { agentId, agentName, status, progress, message, doneCount,
//         output?, modelUsed?, tokensInput?, tokensOutput?, costEstimateCents? }
router.post('/projects/:projectId/agent-events', asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const b = req.body || {};

  const update = {
    agentName: b.agentName,
    status: b.status,
    progressPercent: b.progress ?? 0,
  };
  if (b.status === 'RUNNING') update.startedAt = new Date();
  if (b.output !== undefined) update.output = b.output;
  if (b.modelUsed !== undefined) update.modelUsed = b.modelUsed;
  if (b.tokensInput !== undefined) update.tokensInput = b.tokensInput;
  if (b.tokensOutput !== undefined) update.tokensOutput = b.tokensOutput;
  if (b.costEstimateCents !== undefined) update.costEstimateCents = b.costEstimateCents;
  if (b.groundingCostCents !== undefined) update.groundingCostCents = b.groundingCostCents;
  if (b.errorMessage !== undefined) update.errorMessage = b.errorMessage;
  if (b.status === 'DONE' || b.status === 'ERROR') update.completedAt = new Date();

  // On completion, read prior values FIRST so the project roll-up is retry-safe:
  // we increment by the delta, so re-running an agent never double-counts cost.
  let prior = null;
  if (b.status === 'DONE') {
    prior = await AgentExecution.findOne({ project: projectId, agentId: b.agentId })
      .select('costEstimateCents groundingCostCents tokensInput tokensOutput')
      .lean();
  }

  await AgentExecution.findOneAndUpdate(
    { project: projectId, agentId: b.agentId },
    { $set: update, $setOnInsert: { project: projectId, agentId: b.agentId } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // Atomic AI-cost roll-up onto the project (DONE only). Admin-facing reporting
  // only — this NEVER gates or blocks the run.
  if (b.status === 'DONE') {
    const deltaCost = (b.costEstimateCents ?? 0) - (prior?.costEstimateCents ?? 0);
    const deltaGrounding = (b.groundingCostCents ?? 0) - (prior?.groundingCostCents ?? 0);
    const deltaTokens =
      ((b.tokensInput ?? 0) + (b.tokensOutput ?? 0)) -
      ((prior?.tokensInput ?? 0) + (prior?.tokensOutput ?? 0));

    if (deltaCost || deltaGrounding || deltaTokens) {
      const proj = await Project.findByIdAndUpdate(
        projectId,
        {
          $inc: {
            costTotalCents: deltaCost,
            groundingCostCents: deltaGrounding,
            tokensTotal: deltaTokens,
          },
        },
        { new: true }
      );
      // Informational alert (never blocking) once all-in cost crosses the threshold.
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
  }

  // Relay to subscribed clients (same shape the React app already parses).
  broadcastAgentEvent(projectId, {
    projectId,
    agentId: b.agentId,
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
  const b = req.body || {};
  let status;
  if (b.failed) status = 'FAILED';
  else if (b.phase === 'profile') status = 'PROFILE_REVIEW'; // Agent 1 done -> awaiting review
  else if (b.phase === 'diagnostic') status = 'DIAGNOSTIC_REVIEW'; // Diagnostic done -> awaiting review
  else status = 'VALIDATING';
  await Project.findByIdAndUpdate(req.params.projectId, { $set: { status } });
  res.status(204).end();
}));

// Python returns parsed document text.
// body: { parsedContent, status: 'DONE'|'ERROR', parseError? }
router.post('/documents/:documentId/parsed', asyncHandler(async (req, res) => {
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
