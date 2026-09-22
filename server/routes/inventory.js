import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { Batch, Branch, Medicine, StockMovement } from '../models/index.js';
import { allowRoles, requireAuth, resolveBranch } from '../middleware/auth.js';
import { asyncHandler, writeAudit } from '../utils/helpers.js';

const router = Router();
router.use(requireAuth);

router.get('/branches', allowRoles('admin', 'manager', 'inventory'), asyncHandler(async (_req, res) => {
  const data = await Branch.find({ isActive: true }).sort({ isMain: -1, name: 1 }).lean();
  res.json({ data });
}));

router.get('/batches', allowRoles('admin', 'manager', 'inventory'), asyncHandler(async (req, res) => {
  const branchId = resolveBranch(req);
  const filter = { isActive: true };
  if (branchId) filter.branch = branchId;
  if (req.query.medicineId) filter.medicine = req.query.medicineId;
  if (req.query.inStock === 'true') filter.quantity = { $gt: 0 };
  const data = await Batch.find(filter)
    .populate('medicine', 'brandName genericName strength sku barcode sellingPrice reorderLevel stripsPerBox unitsPerStrip')
    .populate('branch', 'name code')
    .sort({ expiryDate: 1 })
    .limit(1000)
    .lean();
  res.json({ data });
}));

const receiveSchema = z.object({
  medicineId: z.string().min(1),
  branchId: z.string().optional().nullable(),
  batchNumber: z.string().trim().min(1).max(80),
  manufacturingDate: z.string().optional().nullable(),
  expiryDate: z.string().min(1),
  quantity: z.coerce.number().int().positive(),
  unit: z.enum(['unit', 'strip', 'box']).default('unit'),
  costPrice: z.coerce.number().min(0),
  note: z.string().max(500).optional().default(''),
});

router.post('/batches', allowRoles('admin', 'manager', 'inventory'), asyncHandler(async (req, res) => {
  const input = receiveSchema.parse(req.body);
  const branchId = req.user.role === 'admin' && input.branchId ? input.branchId : (req.user.branch?._id ?? req.user.branch);
  if (!branchId) return res.status(400).json({ message: 'Branch is required' });
  const branch = await Branch.findOne({ _id: branchId, isActive: true }).lean();
  if (!branch) return res.status(400).json({ message: 'Valid active branch is required' });
  const medicine = await Medicine.findById(input.medicineId);
  if (!medicine || !medicine.isActive) return res.status(404).json({ message: 'Medicine not found' });
  const multiplier = input.unit === 'box' ? medicine.stripsPerBox * medicine.unitsPerStrip : input.unit === 'strip' ? medicine.unitsPerStrip : 1;
  const baseQuantity = input.quantity * multiplier;
  const expiry = new Date(input.expiryDate);
  if (Number.isNaN(expiry.getTime())) return res.status(400).json({ message: 'Invalid expiry date' });
  const today = new Date(); today.setHours(0, 0, 0, 0);
  if (expiry < today) return res.status(400).json({ message: 'Cannot receive an already expired batch' });

  const session = await mongoose.startSession();
  let batch;
  await session.withTransaction(async () => {
    batch = await Batch.findOneAndUpdate(
      { medicine: medicine._id, branch: branchId, batchNumber: input.batchNumber, expiryDate: expiry },
      {
        $inc: { quantity: baseQuantity },
        $set: { costPrice: input.costPrice, manufacturingDate: input.manufacturingDate ? new Date(input.manufacturingDate) : null, isActive: true },
        $setOnInsert: { medicine: medicine._id, branch: branchId, batchNumber: input.batchNumber, expiryDate: expiry },
      },
      { new: true, upsert: true, session, setDefaultsOnInsert: true, runValidators: true }
    );
    await StockMovement.create([{
      medicine: medicine._id, batch: batch._id, branch: branchId, type: 'purchase', quantity: baseQuantity,
      referenceType: 'manual_receive', note: input.note || 'Inventory received', createdBy: req.user._id,
    }], { session });
    await writeAudit(req, { action: 'RECEIVE_STOCK', entity: 'Batch', entityId: batch._id, newValues: { ...input, baseQuantity } }, session);
  });
  await session.endSession();
  res.status(201).json({ data: batch });
}));

const adjustSchema = z.object({
  newQuantity: z.coerce.number().int().min(0),
  reason: z.string().trim().min(3).max(500),
});
router.patch('/batches/:id/adjust', allowRoles('admin', 'manager', 'inventory'), asyncHandler(async (req, res) => {
  const input = adjustSchema.parse(req.body);
  const session = await mongoose.startSession();
  let updated;
  await session.withTransaction(async () => {
    const batch = await Batch.findById(req.params.id).session(session);
    if (!batch) throw Object.assign(new Error('Batch not found'), { status: 404, expose: true });
    const branchId = req.user.branch?._id ?? req.user.branch;
    if (req.user.role !== 'admin' && branchId && batch.branch.toString() !== branchId.toString()) {
      throw Object.assign(new Error('Batch belongs to another branch'), { status: 403, expose: true });
    }
    const oldQuantity = batch.quantity;
    const delta = input.newQuantity - oldQuantity;
    batch.quantity = input.newQuantity;
    updated = await batch.save({ session });
    if (delta !== 0) {
      await StockMovement.create([{
        medicine: batch.medicine, batch: batch._id, branch: batch.branch,
        type: delta > 0 ? 'adjustment_in' : 'adjustment_out', quantity: Math.abs(delta),
        referenceType: 'stock_adjustment', note: input.reason, createdBy: req.user._id,
      }], { session });
    }
    await writeAudit(req, { action: 'ADJUST_STOCK', entity: 'Batch', entityId: batch._id, oldValues: { quantity: oldQuantity }, newValues: { quantity: input.newQuantity, reason: input.reason } }, session);
  });
  await session.endSession();
  res.json({ data: updated });
}));

router.get('/movements', allowRoles('admin', 'manager', 'inventory'), asyncHandler(async (req, res) => {
  const branchId = resolveBranch(req);
  const filter = {};
  if (branchId) filter.branch = branchId;
  if (req.query.medicineId) filter.medicine = req.query.medicineId;
  const data = await StockMovement.find(filter)
    .populate('medicine', 'brandName genericName sku')
    .populate('batch', 'batchNumber expiryDate')
    .populate('createdBy', 'fullName')
    .sort({ createdAt: -1 })
    .limit(1000)
    .lean();
  res.json({ data });
}));

export default router;
