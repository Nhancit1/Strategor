import mongoose from 'mongoose';
import { baseToJSON } from './_transform.js';

const projectDocumentSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    filename: { type: String, required: true },
    docType: { type: String, default: 'other' },
    storagePath: { type: String, required: true },
    sizeBytes: { type: Number, default: null },
    mimeType: { type: String, default: null },
    parsedContent: { type: String, default: null },
    parsedMetadata: { type: mongoose.Schema.Types.Mixed, default: null },
    parseStatus: { type: String, enum: ['PENDING', 'PARSING', 'DONE', 'ERROR'], default: 'PENDING' },
    parseError: { type: String, default: null },
    uploadedAt: { type: Date, default: Date.now },
    parsedAt: { type: Date, default: null },
  },
  // storagePath hidden from API responses; parsedContent kept (used by validation UI if needed)
  { timestamps: false, toJSON: baseToJSON(['storagePath']) }
);

export const ProjectDocument = mongoose.model('ProjectDocument', projectDocumentSchema);
