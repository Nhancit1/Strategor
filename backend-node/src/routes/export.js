import { Router } from 'express';
import { asyncHandler, ApiError } from '../middleware/error.js';
import { requireAuth } from '../middleware/auth.js';
import { loadOwnedProject } from '../utils/ownership.js';
import { AgentExecution } from '../models/AgentExecution.js';
import { generateExport } from '../services/pythonClient.js';

const router = Router({ mergeParams: true });
router.use(requireAuth);

const MIME = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

// POST /api/projects/:projectId/export/:format  (pdf|docx|pptx|xlsx)
// Node gathers data from Mongo, Python renders the file, Node streams it back.
router.post('/:format', asyncHandler(async (req, res) => {
  const format = req.params.format.toLowerCase();
  if (!MIME[format]) throw new ApiError(400, `Format non supporté : ${format}`);

  const project = await loadOwnedProject(req.params.projectId, req.user.id);
  const execs = await AgentExecution.find({ project: project._id }).sort({ agentId: 1 });

  const payload = {
    project: { id: project.id.toString(), name: project.name, analysisMode: project.analysisMode },
    executions: execs.map((e) => ({
      agentId: e.agentId,
      agentName: e.agentName,
      status: e.status,
      output: e.editedOutput ?? e.output,
      modelUsed: e.modelUsed,
      tokensInput: e.tokensInput,
      tokensOutput: e.tokensOutput,
    })),
  };

  const buffer = await generateExport(format, payload);
  const filename = `strategie-${project.id}.${format}`;
  res.setHeader('Content-Type', MIME[format]);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
}));

export default router;
