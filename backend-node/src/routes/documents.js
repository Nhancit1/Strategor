import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { z } from 'zod';
import { asyncHandler, ApiError } from '../middleware/error.js';
import { requireAuth } from '../middleware/auth.js';
import { loadOwnedProject } from '../utils/ownership.js';
import { config } from '../config/env.js';
import { ProjectDocument } from '../models/ProjectDocument.js';
import { Citation } from '../models/Citation.js';
import { startParse } from '../services/pythonClient.js';

const router = Router({ mergeParams: true });
router.use(requireAuth);

// Only these document types are accepted (text-extraction targets of the Python parser).
// Key = client-declared MIME; we ALSO check the file extension and the real magic bytes.
const isZip = (b) => b[0] === 0x50 && b[1] === 0x4b && (b[2] === 0x03 || b[2] === 0x05 || b[2] === 0x07); // "PK.." (OOXML = zip)
const isPdf = (b) => b.slice(0, 5).toString('latin1') === '%PDF-';
const ALLOWED = new Map([
  ['application/pdf', { exts: ['.pdf'], magic: isPdf }],
  ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', { exts: ['.docx'], magic: isZip }],
  ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', { exts: ['.xlsx'], magic: isZip }],
  ['application/vnd.openxmlformats-officedocument.presentationml.presentation', { exts: ['.pptx'], magic: isZip }],
  ['text/plain', { exts: ['.txt'], magic: () => true }], // plain text has no signature
]);

// Reject early (before writing to disk) on a bad MIME / extension. Blocks .exe, scripts, etc.
const fileFilter = (_req, file, cb) => {
  const spec = ALLOWED.get(file.mimetype);
  const ext = path.extname(file.originalname).toLowerCase();
  if (!spec || !spec.exts.includes(ext)) {
    return cb(new ApiError(400, 'Type de fichier non autorisé (PDF, Word, Excel, PowerPoint ou texte uniquement).'));
  }
  cb(null, true);
};

// Read the first bytes of the stored file and confirm they match the claimed type.
// Defeats a renamed/spoofed file (e.g. an .exe disguised as .pdf). Deletes the file on failure.
function assertRealType(file) {
  let buf = Buffer.alloc(0);
  try {
    const fd = fs.openSync(file.path, 'r');
    buf = Buffer.alloc(8);
    fs.readSync(fd, buf, 0, 8, 0);
    fs.closeSync(fd);
  } catch {
    /* unreadable -> treated as invalid below */
  }
  const spec = ALLOWED.get(file.mimetype);
  const bad =
    (buf[0] === 0x4d && buf[1] === 0x5a) || // "MZ" Windows executable — always refused
    !spec ||
    !spec.magic(buf);
  if (bad) {
    try { fs.unlinkSync(file.path); } catch { /* ignore */ }
    throw new ApiError(400, "Le contenu du fichier ne correspond pas à son type déclaré.");
  }
}

// Store uploads on the shared volume: <UPLOAD_PATH>/<projectId>/<uuid>-<safe-name>
const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    // Validate projectId BEFORE building a filesystem path (prevents path traversal via the URL param).
    if (!mongoose.isValidObjectId(req.params.projectId)) {
      return cb(new ApiError(400, 'Projet invalide'), '');
    }
    const dir = path.join(config.upload.dir, req.params.projectId);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${crypto.randomUUID()}-${safe}`);
  },
});
const upload = multer({ storage, limits: { fileSize: config.upload.maxBytes }, fileFilter });

router.post('/documents', upload.single('file'), asyncHandler(async (req, res) => {
  await loadOwnedProject(req.params.projectId, req.user.id);
  if (!req.file) throw new ApiError(400, 'Fichier manquant');

  // Confirm the saved bytes really match the declared type (anti-spoofing); deletes on failure.
  assertRealType(req.file);

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

// Whitelist exactly the fields a citation may carry; unknown keys are dropped (no
// mass-assignment) and the URL must be http(s) (blocks `javascript:`/`data:` link XSS).
const citationSchema = z.object({
  citationId: z.string().min(1).max(64),
  type: z.string().min(1).max(64),
  label: z.string().min(1).max(500),
  url: z.string().max(2048).url().refine((u) => /^https?:\/\//i.test(u), 'http(s) only').nullish(),
  excerpt: z.string().max(5000).nullish(),
  confidence: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  sourceDocument: z.string().regex(/^[0-9a-fA-F]{24}$/, 'invalid id').nullish(),
});

router.post('/citations', asyncHandler(async (req, res) => {
  await loadOwnedProject(req.params.projectId, req.user.id);
  const parsed = citationSchema.safeParse(req.body || {});
  if (!parsed.success) throw new ApiError(400, 'Données de citation invalides');
  const c = await Citation.create({ ...parsed.data, project: req.params.projectId });
  res.json(c.toJSON());
}));

export default router;
