import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { User } from '../models/index.js';
import { asyncHandler, writeAudit } from '../utils/helpers.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const loginSchema = z.object({ email: z.string().email(), password: z.string().min(8).max(128) });

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 12 * 60 * 60 * 1000,
    path: '/',
  };
}

router.post('/login', asyncHandler(async (req, res) => {
  const body = loginSchema.parse(req.body);
  const user = await User.findOne({ email: body.email.toLowerCase() }).select('+passwordHash');
  if (!user || !user.isActive || !(await user.verifyPassword(body.password))) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }
  user.lastLoginAt = new Date();
  await user.save();
  const token = jwt.sign({ sub: user._id.toString(), role: user.role }, process.env.JWT_SECRET, { expiresIn: '12h' });
  res.cookie('pharmapos_session', token, cookieOptions());
  req.user = user;
  await writeAudit(req, { action: 'LOGIN', entity: 'User', entityId: user._id });
  const safe = await User.findById(user._id).populate('branch', 'name code').lean();
  res.json({ user: safe });
}));

router.get('/me', requireAuth, (req, res) => res.json({ user: req.user }));

router.post('/logout', requireAuth, asyncHandler(async (req, res) => {
  await writeAudit(req, { action: 'LOGOUT', entity: 'User', entityId: req.user._id });
  res.clearCookie('pharmapos_session', { ...cookieOptions(), maxAge: 0 });
  res.json({ ok: true });
}));

export default router;
