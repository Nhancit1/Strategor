import { AuditLog } from '../models/AuditLog.js';

/**
 * Fire-and-forget audit logging. NEVER throws and NEVER blocks the caller: a failure to
 * write the audit row must not break authentication. Truncates the UA to a sane length.
 */
export function audit({ action, email = null, user = null, status = 'SUCCESS', req = null, detail = null }) {
  try {
    AuditLog.create({
      action,
      email: email ? String(email).toLowerCase().slice(0, 320) : null,
      user,
      status,
      ipAddress: req?.ip || null,
      userAgent: (req?.headers?.['user-agent'] || '').slice(0, 512) || null,
      detail: detail ? String(detail).slice(0, 1000) : null,
    }).catch(() => { /* swallow: audit must never break the request */ });
  } catch {
    /* swallow */
  }
}
