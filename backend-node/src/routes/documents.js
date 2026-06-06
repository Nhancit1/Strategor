import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { asyncHandler, ApiError } from '../middleware/error.js';
import { requireAuth } from '../middleware/auth.js';
import { loadOwnedProject } from '../utils/ownership.js';
import { config } from '../config/env.js';
import { ProjectDocument } from '../models/ProjectDocument.js';
import { Citation } from '../models/Citation.js';
import { startParse } from '../services/pythonClient.js';

const router = Router({ mergeParams: true });
router.use(requireAuth);

// Store uploads on the shared volume: <UPLOAD_PATH>/<projectId>/<uuid>-<safe-name>
const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const dir = path.join(config.upload.dir, req.params.projectId);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${crypto.randomUUID()}-${safe}`);
  },
});
const upload = multer({ storage, limits: { fileSize: config.upload.maxBytes } });

router.post('/documents', upload.single('file'), asyncHandler(async (req, res) => {
  await loadOwnedProject(req.params.projectId, req.user.id);
  if (!req.file) throw new ApiError(400, 'Fichier manquant');

  const count = await ProjectDocument.countDocuments({ project: req.params.projectId });
  if (count >= config.upload.maxPerProject) {
    fs.unlinkSync(req.file.path);
    throw new ApiError(400, `Limite atteinte (${config.upload.maxPerProject} documents par projet)`);
  }

  const doc = await ProjectDocument.create({
    project: req.params.projectId,
    filename: req.file.originalname,
    docType: req.body?.docType || 'other',
    storagePath: req.file.path,
    sizeBytes: req.file.size,
    mimeType: req.file.mimetype,
    parseStatus: 'PENDING',
  });

  // Async parse in Python (reads file from the shared volume, calls back).
  startParse({
    documentId: doc.id.toString(),
    storagePath: doc.storagePath,
    filename: doc.filename,
    mimeType: doc.mimeType,
  }).catch((err) => console.error('[parse] Python handoff failed:', err.message));

  res.json(doc.toJSON());
}));

router.get('/documents', asyncHandler(async (req, res) => {
  await loadOwnedProject(req.params.projectId, req.user.id);
  const docs = await ProjectDocument.find({ project: req.params.projectId }).sort({ uploadedAt: -1 });
  res.json(docs.map((d) => d.toJSON()));
}));

router.delete('/documents/:docId', asyncHandler(async (req, res) => {
  await loadOwnedProject(req.params.projectId, req.user.id);
  const doc = await ProjectDocument.findOne({ _id: req.params.docId, project: req.params.projectId });
  if (!doc) throw new ApiError(404, 'Document introuvable');
  try { if (doc.storagePath && fs.existsSync(doc.storagePath)) fs.unlinkSync(doc.storagePath); }
  catch (e) { console.warn('[documents] unlink failed:', e.message); }
  await doc.deleteOne();
  res.status(204).end();
}));

router.get('/citations', asyncHandler(async (req, res) => {
  await loadOwnedProject(req.params.projectId, req.user.id);
  const items = await Citation.find({ project: req.params.projectId }).sort({ citationId: 1 });
  res.json(items.map((c) => c.toJSON()));
}));

router.post('/citations', asyncHandler(async (req, res) => {
  await loadOwnedProject(req.params.projectId, req.user.id);
  const c = await Citation.create({ ...req.body, project: req.params.projectId });
  res.json(c.toJSON());
}));

export default router;
