import mongoose from 'mongoose';
import { baseToJSON } from './_transform.js';

const financeSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, unique: true, index: true },
    data: { type: mongoose.Schema.Types.Mixed, required: true }, // free-form indicators (jsonb equivalent)
    completenessScore: { type: Number, default: 0 },
  },
  { timestamps: true, toJSON: baseToJSON() }
);

export const FinanceLite = mongoose.model('FinanceLite', financeSchema);
