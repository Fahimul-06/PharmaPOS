import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { Batch, Customer, Medicine, Sale, StockMovement } from '../models/index.js';
import { allowRoles, requireAuth, resolveBranch } from '../middleware/auth.js';
import { asyncHandler, nextInvoiceNumber, writeAudit } from '../utils/helpers.js';

const router = Router();
router.use(requireAuth);

router.get('/catalog', allowRoles('admin', 'manager', 'pharmacist', 'cashier'), asyncHandler(async (req, res) => {
  const branchId = resolveBranch(req);
  if (!branchId) return res.status(400).json({ message: 'A branch must be assigned before using POS' });
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const batches = await Batch.find({ branch: branchId, isActive: true, quantity: { $gt: 0 }, expiryDate: { $gte: today } })
    .populate({ path: 'medicine', match: { isActive: true }, select: 'brandName genericName strength dosageForm barcode sku sellingPrice mrp stripsPerBox unitsPerStrip' })
    .sort({ expiryDate: 1 })
    .lean();
  const map = new Map();
  for (const b of batches) {
    if (!b.medicine) continue;
    const id = b.medicine._id.toString();
    const current = map.get(id) ?? { ...b.medicine, stock: 0, nearestExpiry: b.expiryDate };
    current.stock += b.quantity;
    if (new Date(b.expiryDate) < new Date(current.nearestExpiry)) current.nearestExpiry = b.expiryDate;
    map.set(id, current);
  }
  res.json({ data: [...map.values()] });
}));

router.get('/customers', asyncHandler(async (_req, res) => {
  const data = await Customer.find({ isActive: true }).sort({ name: 1 }).limit(300).lean();
  res.json({ data });
}));

router.post('/customers', allowRoles('admin', 'manager', 'pharmacist', 'cashier'), asyncHandler(async (req, res) => {
  const input = z.object({ name: z.string().trim().min(2).max(120), phone: z.string().trim().max(40).optional().default('') }).parse(req.body);
  let customer = input.phone ? await Customer.findOne({ phone: input.phone, isActive: true }) : null;
  if (!customer) customer = await Customer.create({ name: input.name, phone: input.phone, balance: 0, isActive: true });
  await writeAudit(req, { action: 'CREATE_CUSTOMER', entity: 'Customer', entityId: customer._id, newValues: { name: customer.name, phone: customer.phone } });
  res.status(201).json({ data: customer });
}));

const saleSchema = z.object({
  customerId: z.string().nullable().optional(),
  items: z.array(z.object({
    medicineId: z.string().min(1),
    unit: z.enum(['unit', 'strip', 'box']).default('unit'),
    quantity: z.coerce.number().int().positive().max(100000),
  })).min(1).max(100),
  discount: z.coerce.number().min(0).default(0),
  paymentMethod: z.enum(['cash', 'card', 'bkash', 'nagad', 'bangla_qr', 'due']),
  paidAmount: z.coerce.number().min(0).default(0),
  notes: z.string().max(1000).optional().default(''),
});

router.post('/', allowRoles('admin', 'manager', 'pharmacist', 'cashier'), asyncHandler(async (req, res) => {
  const input = saleSchema.parse(req.body);
  const branchId = resolveBranch(req);
  if (!branchId) return res.status(400).json({ message: 'A branch must be assigned before using POS' });
  const session = await mongoose.startSession();
  let createdSale;

  try {
    await session.withTransaction(async () => {
      const invoiceNumber = await nextInvoiceNumber(session);
      const medicineIds = input.items.map((i) => i.medicineId);
      const meds = await Medicine.find({ _id: { $in: medicineIds }, isActive: true }).session(session);
      const medMap = new Map(meds.map((m) => [m._id.toString(), m]));
      if (medMap.size !== new Set(medicineIds).size) throw Object.assign(new Error('One or more medicines are unavailable'), { status: 400, expose: true });

      const saleItems = [];
      let subtotal = 0;
      let totalCogs = 0;
      const today = new Date(); today.setHours(0, 0, 0, 0);

      for (const item of input.items) {
        const med = medMap.get(item.medicineId);
        const multiplier = item.unit === 'box' ? med.stripsPerBox * med.unitsPerStrip : item.unit === 'strip' ? med.unitsPerStrip : 1;
        const baseQuantity = item.quantity * multiplier;
        const saleUnitPrice = item.unit === 'box' ? med.sellingPrice * med.stripsPerBox * med.unitsPerStrip : item.unit === 'strip' ? med.sellingPrice * med.unitsPerStrip : med.sellingPrice;
        const lineTotal = saleUnitPrice * item.quantity;

        const batches = await Batch.find({ medicine: med._id, branch: branchId, isActive: true, quantity: { $gt: 0 }, expiryDate: { $gte: today } })
          .sort({ expiryDate: 1, createdAt: 1 }).session(session);
        const available = batches.reduce((sum, b) => sum + b.quantity, 0);
        if (available < baseQuantity) throw Object.assign(new Error(`Insufficient stock for ${med.brandName}. Available: ${available} base units`), { status: 409, expose: true });

        let remaining = baseQuantity;
        let cogs = 0;
        const allocations = [];
        for (const batch of batches) {
          if (remaining <= 0) break;
          const take = Math.min(batch.quantity, remaining);
          const result = await Batch.updateOne({ _id: batch._id, quantity: { $gte: take } }, { $inc: { quantity: -take } }, { session });
          if (result.modifiedCount !== 1) throw Object.assign(new Error('Stock changed during checkout. Please retry.'), { status: 409, expose: true });
          const allocationCost = take * batch.costPrice;
          cogs += allocationCost;
          allocations.push({ batch: batch._id, batchNumber: batch.batchNumber, quantity: take, unitCost: batch.costPrice });
          remaining -= take;
        }
        subtotal += lineTotal;
        totalCogs += cogs;
        saleItems.push({
          medicine: med._id, medicineName: med.brandName, sku: med.sku || '', saleUnit: item.unit,
          saleUnitQuantity: item.quantity, baseQuantity, unitPrice: saleUnitPrice, discount: 0, lineTotal, cogs, allocations,
        });
      }

      const discount = Math.min(input.discount, subtotal);
      const total = Math.max(0, subtotal - discount);
      const tenderedAmount = input.paymentMethod === 'cash'
        ? Math.max(input.paidAmount || total, 0)
        : input.paymentMethod === 'due'
          ? Math.max(input.paidAmount, 0)
          : total;
      const paidAmount = Math.min(tenderedAmount, total);
      const changeAmount = input.paymentMethod === 'cash' ? Math.max(0, tenderedAmount - total) : 0;
      const dueAmount = Math.max(0, total - paidAmount);
      if (dueAmount > 0 && !input.customerId) throw Object.assign(new Error('Customer is required for due sales'), { status: 400, expose: true });
      if (input.customerId) {
        const customerExists = await Customer.exists({ _id: input.customerId, isActive: true }).session(session);
        if (!customerExists) throw Object.assign(new Error('Selected customer is unavailable'), { status: 400, expose: true });
      }

      const [sale] = await Sale.create([{
        invoiceNumber, branch: branchId, cashier: req.user._id, customer: input.customerId || null,
        items: saleItems, subtotal, discount, total, paidAmount, tenderedAmount, changeAmount, dueAmount, paymentMethod: input.paymentMethod,
        totalCogs, grossProfit: total - totalCogs, notes: input.notes, saleDate: new Date(),
      }], { session });
      createdSale = sale;

      const movementDocs = saleItems.flatMap((si) => si.allocations.map((a) => ({
        medicine: si.medicine, batch: a.batch, branch: branchId, type: 'sale', quantity: a.quantity,
        referenceType: 'sale', referenceId: sale._id, note: invoiceNumber, createdBy: req.user._id,
      })));
      if (movementDocs.length) await StockMovement.insertMany(movementDocs, { session });
      if (dueAmount > 0) await Customer.updateOne({ _id: input.customerId }, { $inc: { balance: dueAmount } }, { session });
      await writeAudit(req, { action: 'CREATE_SALE', entity: 'Sale', entityId: sale._id, newValues: { invoiceNumber, total, dueAmount, itemCount: saleItems.length } }, session);
    });
  } finally {
    await session.endSession();
  }
  const populated = await Sale.findById(createdSale._id).populate('cashier', 'fullName').populate('customer', 'name phone').lean();
  res.status(201).json({ data: populated });
}));

router.get('/recent', asyncHandler(async (req, res) => {
  const branchId = resolveBranch(req);
  const filter = { status: 'completed' };
  if (branchId) filter.branch = branchId;
  const data = await Sale.find(filter).populate('cashier', 'fullName').populate('customer', 'name phone').sort({ saleDate: -1 }).limit(50).lean();
  res.json({ data });
}));

export default router;
