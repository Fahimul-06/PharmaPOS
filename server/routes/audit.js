import { Router } from 'express';
import { AuditLog } from '../models/index.js';
import { allowRoles, requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/helpers.js';

const router = Router();
router.use(requireAuth, allowRoles('admin'));
router.get('/', asyncHandler(async (req, res) => {
  const limit = Math.min(1000, Math.max(1, Number(req.query.limit) || 300));
  const data = await AuditLog.find({}).populate('user', 'fullName email role').sort({ createdAt: -1 }).limit(limit).lean();
  res.json({ data });
}));
export default router;
