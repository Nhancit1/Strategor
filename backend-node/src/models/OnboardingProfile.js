import mongoose from 'mongoose';
import { baseToJSON } from './_transform.js';

const onboardingSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, unique: true, index: true },
    companyName: { type: String, default: null },
    userRole: { type: String, default: null },
    sectors: { type: [String], default: undefined },
    subSectors: { type: [String], default: undefined }, // "Secteur — Sous-secteur" (NACE niveau 2)
    territories: { type: [String], default: undefined },
    marketTypes: { type: [String], default: undefined },
    objectives: { type: [String], default: undefined },
    stage: { type: String, default: null },
    revenueRange: { type: String, default: null },
    teamSize: { type: String, default: null },
    territoryDetail: { type: String, default: null },
    customerDescription: { type: String, default: null },
    objectiveDetail: { type: String, default: null },
    startingPoint: { type: String, default: null }, // zero | structure | challenge

    // ── Levier 1-bis : enriched brief (drives agent specificity) ──
    activityPrecise: { type: String, default: null },
    positioning: { type: String, default: null },
    valueScope: { type: String, default: null },
    strengths: { type: String, default: null },
    weaknesses: { type: String, default: null },
    portfolio: {
      type: [{
        _id: false,
        name: { type: String, default: '' },
        revenueShare: { type: Number, default: null }, // % du CA
        growth: { type: Number, default: null },        // croissance du segment (%)
        marketShare: { type: Number, default: null },   // part de marché relative
      }],
      default: undefined,
    },
  },
  { timestamps: true, toJSON: baseToJSON() }
);

export const OnboardingProfile = mongoose.model('OnboardingProfile', onboardingSchema);
