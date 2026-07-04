import { Router } from 'express';
import { asyncHandler, ApiError } from '../middleware/error.js';
import { requireAuth } from '../middleware/auth.js';
import { loadOwnedProject } from '../utils/ownership.js';
import { AgentExecution } from '../models/AgentExecution.js';
import { User } from '../models/User.js';
import { generateExport } from '../services/pythonClient.js';
import { translateExecutionIfNeeded } from '../services/translator.js';

const router = Router({ mergeParams: true });
router.use(requireAuth);

const MIME = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  html: 'text/html; charset=utf-8',
};

// POST /api/projects/:projectId/export/:format  (pdf|docx|html)
// Node gathers data from Mongo, Python renders the file, Node streams it back.
router.post('/:format', asyncHandler(async (req, res) => {
  const format = req.params.format.toLowerCase();
  if (!MIME[format]) throw new ApiError(400, `Format non supporté : ${format}`);

  const project = await loadOwnedProject(req.params.projectId, req.user.id);
  const execs = await AgentExecution.find({ project: project._id }).sort({ agentId: 1 });
  const user = await User.findById(req.user.id).select('lang');
  const targetLang = user?.lang || 'fr';

  const translatedExecs = await Promise.all(
    execs.map((e) => translateExecutionIfNeeded(e, targetLang))
  );

  const payload = {
    language: targetLang,
    project: { id: project.id.toString(), name: project.name, analysisMode: project.analysisMode },
    executions: translatedExecs.map((e) => ({
      agentId: e.agentId,
      agentName: e.agentName,
      status: e.status,
      output: e.editedOutput ?? e.output,
      modelUsed: e.modelUsed,
      tokensInput: e.tokensInput,
      tokensOutput: e.tokensOutput,
    })),
  };

  let buffer;
  try {
    buffer = await generateExport(format, payload);
  } catch (exportErr) {
    const pyStatus = exportErr.response?.status;
    const pyMessage = exportErr.response?.data
      ? (typeof exportErr.response.data === 'string'
        ? exportErr.response.data
        : JSON.stringify(exportErr.response.data))
      : exportErr.message;

    if (exportErr.code === 'ECONNREFUSED' || exportErr.code === 'ECONNABORTED') {
      throw new ApiError(503, 'Le service d\'export (Python) n\'est pas démarré. Lancez-le : cd ai-python && uvicorn app.main:app --reload --port 8000');
    }
    throw new ApiError(pyStatus || 502, `Export ${format} échoué : ${pyMessage}`);
  }

  const filename = `strategie-${project.id}.${format}`;
  res.setHeader('Content-Type', MIME[format]);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);

}));

export default router;
