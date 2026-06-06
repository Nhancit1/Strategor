import mongoose from 'mongoose';
import { baseToJSON } from './_transform.js';

const citationSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    citationId: { type: String, required: true },
    type: { type: String, required: true },
    label: { type: String, required: true },
    url: { type: String, default: null },
    excerpt: { type: String, default: null },
    confidence: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'], default: 'MEDIUM' },
    sourceDocument: { type: mongoose.Schema.Types.ObjectId, ref: 'ProjectDocument', default: null },
  },
  { timestamps: true, toJSON: baseToJSON() }
);

citationSchema.index({ project: 1, citationId: 1 }, { unique: true });

export const Citation = mongoose.model('Citation', citationSchema);
