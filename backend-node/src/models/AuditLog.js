import mongoose from 'mongoose';
import { baseToJSON } from './_transform.js';

/**
 * AuditLog — persistent security audit trail (banking-compliance requirement).
 *
 * Records authentication-relevant events (login success/failure, logout, password
 * change, account deletion) with who / when / from where, so an investigator can
 * reconstruct access. Append-only by convention: the app never updates or deletes rows.
 */
const auditLogSchema = new mongoose.Schema(
  {
    action: { type: String, required: true, index: true },          // e.g. LOGIN_SUCCESS
    email: { type: String, default: null, index: true },            // attempted/affected account
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    status: { type: String, enum: ['SUCCESS', 'FAILURE', 'BLOCKED'], default: 'SUCCESS', index: true },
    ipAddress: { type: String, default: null },
    userAgent: { type: String, default: null },
    detail: { type: String, default: null },
  },
  { timestamps: true, toJSON: baseToJSON() }
);

auditLogSchema.index({ createdAt: -1 });

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
