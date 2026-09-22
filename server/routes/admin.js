import { Router } from 'express';
import { z } from 'zod';
import { Branch, User } from '../models/index.js';
import { allowRoles, requireAuth } from '../middleware/auth.js';
import { asyncHandler, writeAudit } from '../utils/helpers.js';

const router = Router();
router.use(requireAuth, allowRoles('admin'));

router.get('/users', asyncHandler(async (_req, res) => {
  const data = await User.find({}).populate('branch', 'name code').sort({ createdAt: -1 }).lean();
  res.json({ data });
}));

const userSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  phone: z.string().max(50).optional().default(''),
  role: z.enum(['admin', 'manager', 'pharmacist', 'cashier', 'inventory']),
  branchId: z.string().nullable().optional(),
});
router.post('/users', asyncHandler(async (req, res) => {
  const input = userSchema.parse(req.body);
  if (input.branchId) {
    const branch = await Branch.exists({ _id: input.branchId, isActive: true });
    if (!branch) return res.status(400).json({ message: 'Selected branch is unavailable' });
  }
  const passwordHash = await User.hashPassword(input.password);
  const user = await User.create({ fullName: input.fullName, email: input.email.toLowerCase(), phone: input.phone, role: input.role, branch: input.branchId || null, passwordHash });
  await writeAudit(req, { action: 'CREATE_USER', entity: 'User', entityId: user._id, newValues: { fullName: user.fullName, email: user.email, role: user.role } });
  const safe = await User.findById(user._id).populate('branch', 'name code').lean();
  res.status(201).json({ data: safe });
}));

router.patch('/users/:id/status', asyncHandler(async (req, res) => {
  const { isActive } = z.object({ isActive: z.boolean() }).parse(req.body);
  if (req.params.id === req.user._id.toString() && !isActive) return res.status(400).json({ message: 'You cannot disable your own account' });
  const user = await User.findByIdAndUpdate(req.params.id, { isActive }, { new: true });
  if (!user) return res.status(404).json({ message: 'User not found' });
  await writeAudit(req, { action: isActive ? 'ACTIVATE_USER' : 'DEACTIVATE_USER', entity: 'User', entityId: user._id });
  res.json({ data: user });
}));

router.get('/branches', asyncHandler(async (_req, res) => {
  const data = await Branch.find({}).sort({ isMain: -1, name: 1 }).lean();
  res.json({ data });
}));

export default router;
