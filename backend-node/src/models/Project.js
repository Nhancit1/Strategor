import mongoose from 'mongoose';
import { baseToJSON } from './_transform.js';

const projectSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, default: 'Nouveau projet' },
    status: {
      type: String,
      enum: ['ONBOARDING', 'ANALYZING', 'PROFILE_REVIEW', 'DIAGNOSTIC_REVIEW', 'VALIDATING', 'DONE', 'FAILED'],
      default: 'ONBOARDING',
    },
    currentStep: { type: Number, default: 1 },
    analysisMode: { type: String, default: 'comprehensive' }, // forced comprehensive (12 agents)
    // ── AI cost roll-up (admin reporting only; hidden from user-facing JSON) ──
    costTotalCents: { type: Number, default: 0 },     // sum of agent LLM costs
    groundingCostCents: { type: Number, default: 0 }, // web-search / grounding cost
    tokensTotal: { type: Number, default: 0 },
    costAlert: { type: Boolean, default: false },     // crossed alert threshold (informational)
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true, toJSON: baseToJSON(['costTotalCents', 'groundingCostCents', 'tokensTotal', 'costAlert']) }
);

export const Project = mongoose.model('Project', projectSchema);
