import mongoose from 'mongoose';
import { baseToJSON } from './_transform.js';

const agentExecutionSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    agentId: { type: Number, required: true },
    agentName: { type: String, default: null },
    status: {
      type: String,
      enum: ['PENDING', 'RUNNING', 'DONE', 'ERROR', 'SKIPPED'],
      default: 'PENDING',
      index: true,
    },
    output: { type: mongoose.Schema.Types.Mixed, default: null },
    editedOutput: { type: mongoose.Schema.Types.Mixed, default: null },
    versions: { type: mongoose.Schema.Types.Mixed, default: null },
    modelUsed: { type: String, default: null },
    tokensInput: { type: Number, default: null },
    tokensOutput: { type: Number, default: null },
    costEstimateCents: { type: Number, default: null },
    groundingCostCents: { type: Number, default: null },
    progressPercent: { type: Number, default: 0 },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    validatedAt: { type: Date, default: null },
    errorMessage: { type: String, default: null },
    retryCount: { type: Number, default: 0 },
  },
  { timestamps: true, toJSON: baseToJSON(['tokensInput', 'tokensOutput', 'costEstimateCents', 'groundingCostCents']) }
);

agentExecutionSchema.index({ project: 1, agentId: 1 }, { unique: true });

export const AgentExecution = mongoose.model('AgentExecution', agentExecutionSchema);
