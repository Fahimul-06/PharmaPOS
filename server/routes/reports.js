import { Router } from 'express';
import mongoose from 'mongoose';
import { Sale } from '../models/index.js';
import { allowRoles, requireAuth, resolveBranch } from '../middleware/auth.js';
import { asyncHandler } from '../utils/helpers.js';

const router = Router();
router.use(requireAuth, allowRoles('admin', 'manager'));

router.get('/sales', asyncHandler(async (req, res) => {
  const branchId = resolveBranch(req);
  const from = req.query.from ? new Date(`${req.query.from}T00:00:00`) : new Date(new Date().setDate(new Date().getDate() - 30));
  const to = req.query.to ? new Date(`${req.query.to}T23:59:59.999`) : new Date();
  const match = { saleDate: { $gte: from, $lte: to }, status: 'completed' };
  if (branchId) match.branch = new mongoose.Types.ObjectId(branchId);

  const [rows, summary, paymentBreakdown, daily] = await Promise.all([
    Sale.find(match).populate('customer', 'name phone').populate('cashier', 'fullName').sort({ saleDate: -1 }).limit(5000).lean(),
    Sale.aggregate([
      { $match: match },
      { $group: { _id: null, revenue: { $sum: '$total' }, cogs: { $sum: '$totalCogs' }, profit: { $sum: '$grossProfit' }, discount: { $sum: '$discount' }, due: { $sum: '$dueAmount' }, count: { $sum: 1 }, avg: { $avg: '$total' } } },
    ]),
    Sale.aggregate([
      { $match: match },
      { $group: { _id: '$paymentMethod', total: { $sum: '$total' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
    ]),
    Sale.aggregate([
      { $match: match },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$saleDate' } }, revenue: { $sum: '$total' }, profit: { $sum: '$grossProfit' }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
  ]);
  res.json({ data: rows, summary: summary[0] ?? { revenue: 0, cogs: 0, profit: 0, discount: 0, due: 0, count: 0, avg: 0 }, paymentBreakdown, daily });
}));

export default router;
