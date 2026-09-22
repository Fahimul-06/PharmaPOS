import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';
import { asyncHandler } from '../utils/helpers.js';

export const requireAuth = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.pharmapos_session;
  if (!token) return res.status(401).json({ message: 'Authentication required' });
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ message: 'Session expired' });
  }
  const user = await User.findById(payload.sub).populate('branch', 'name code isActive').lean();
  if (!user || !user.isActive) return res.status(401).json({ message: 'Account unavailable' });
  req.user = user;
  next();
});

export function allowRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ message: 'Insufficient permission' });
    next();
  };
}

export function resolveBranch(req) {
  if (req.user.role === 'admin' && req.query.branchId) return req.query.branchId;
  return req.user.branch?._id ?? req.user.branch ?? null;
}
