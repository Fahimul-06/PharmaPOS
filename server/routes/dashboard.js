import { Router } from 'express';
import mongoose from 'mongoose';
import { Batch, Medicine, Sale } from '../models/index.js';
import { requireAuth, resolveBranch } from '../middleware/auth.js';
import { asyncHandler } from '../utils/helpers.js';

const router = Router();
router.use(requireAuth);

router.get('/', asyncHandler(async (req, res) => {
  const branchId = resolveBranch(req);
  if (!branchId) return res.status(400).json({ message: 'A branch must be assigned' });
  const branchObjectId = new mongoose.Types.ObjectId(branchId);
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(); end.setHours(23, 59, 59, 999);
  const now = new Date();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const in30 = new Date(now.getTime() + 30 * 86400000);

  const [salesSummary, medicineCount, lowStock, expiryCount, recentSales] = await Promise.all([
    Sale.aggregate([
      { $match: { branch: branchObjectId, saleDate: { $gte: start, $lte: end }, status: 'completed' } },
      { $group: { _id: null, revenue: { $sum: '$total' }, profit: { $sum: '$grossProfit' }, invoices: { $sum: 1 }, due: { $sum: '$dueAmount' } } },
    ]),
    Medicine.countDocuments({ isActive: true }),
    Batch.aggregate([
      { $match: { branch: branchObjectId, isActive: true, expiryDate: { $gte: today } } },
      { $group: { _id: '$medicine', stock: { $sum: '$quantity' } } },
      { $lookup: { from: 'medicines', localField: '_id', foreignField: '_id', as: 'medicine' } },
      { $unwind: '$medicine' },
      { $match: { $expr: { $lte: ['$stock', '$medicine.reorderLevel'] } } },
      { $count: 'count' },
    ]),
    Batch.countDocuments({ branch: branchObjectId, quantity: { $gt: 0 }, expiryDate: { $gt: now, $lte: in30 }, isActive: true }),
    Sale.find({ branch: branchObjectId, status: 'completed' }).populate('customer', 'name').sort({ saleDate: -1 }).limit(8).lean(),
  ]);
  const summary = salesSummary[0] ?? { revenue: 0, profit: 0, invoices: 0, due: 0 };
  res.json({ data: { ...summary, medicineCount, lowStock: lowStock[0]?.count ?? 0, expiring30: expiryCount, recentSales } });
}));

export default router;
