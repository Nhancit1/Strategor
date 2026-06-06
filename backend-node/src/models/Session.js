import mongoose from 'mongoose';
import { baseToJSON } from './_transform.js';

const sessionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    refreshTokenHash: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true },
    ipAddress: { type: String, default: null },
    userAgent: { type: String, default: null },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true, toJSON: baseToJSON() }
);

export const Session = mongoose.model('Session', sessionSchema);
