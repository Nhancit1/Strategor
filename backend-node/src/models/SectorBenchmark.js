import mongoose from 'mongoose';
import { baseToJSON } from './_transform.js';

const sectorBenchmarkSchema = new mongoose.Schema(
  {
    sector: { type: String, required: true },
    companySize: { type: String, default: null }, // small | medium | large
    geography: { type: String, default: 'FR' },
    metricKey: { type: String, required: true },
    metricValue: { type: mongoose.Schema.Types.Mixed, required: true },
    source: { type: String, default: null },
    confidence: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'], default: 'MEDIUM' },
  },
  { timestamps: true, toJSON: baseToJSON() }
);

sectorBenchmarkSchema.index({ sector: 1, companySize: 1, geography: 1, metricKey: 1 });

export const SectorBenchmark = mongoose.model('SectorBenchmark', sectorBenchmarkSchema);
