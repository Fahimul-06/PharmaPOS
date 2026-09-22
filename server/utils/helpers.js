import { AuditLog, Counter } from '../models/index.js';

export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

export function clientIp(req) {
  return (req.headers['x-forwarded-for']?.toString().split(',')[0] || req.ip || '').trim();
}

export async function writeAudit(req, { action, entity, entityId, oldValues, newValues }, session = null) {
  const doc = {
    user: req.user?._id ?? null,
    userName: req.user?.fullName ?? 'System',
    action,
    entity,
    entityId: entityId ?? null,
    oldValues: oldValues ?? null,
    newValues: newValues ?? null,
    ipAddress: clientIp(req),
    userAgent: req.get('user-agent') ?? '',
  };
  return AuditLog.create([doc], session ? { session } : undefined);
}

export async function nextInvoiceNumber(session) {
  const date = new Date();
  const keyDate = date.toISOString().slice(0, 10).replaceAll('-', '');
  const counter = await Counter.findOneAndUpdate(
    { key: `invoice:${keyDate}` },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, session, setDefaultsOnInsert: true }
  );
  return `INV-${keyDate}-${String(counter.seq).padStart(5, '0')}`;
}

export function escapeRegex(value = '') {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
