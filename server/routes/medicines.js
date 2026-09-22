import { Router } from 'express';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import { z } from 'zod';
import mongoose from 'mongoose';
import { Medicine, Category, Batch } from '../models/index.js';
import { allowRoles, requireAuth, resolveBranch } from '../middleware/auth.js';
import { asyncHandler, escapeRegex, writeAudit } from '../utils/helpers.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const medicineSchema = z.object({
  brandName: z.string().trim().min(1).max(160),
  genericName: z.string().trim().min(1).max(160),
  manufacturer: z.string().trim().max(160).optional().default(''),
  categoryId: z.string().nullable().optional(),
  categoryName: z.string().trim().max(100).optional(),
  strength: z.string().trim().max(80).optional().default(''),
  dosageForm: z.string().trim().max(80).optional().default(''),
  barcode: z.string().trim().max(80).optional().default(''),
  sku: z.string().trim().max(80).optional().default(''),
  rackLocation: z.string().trim().max(80).optional().default(''),
  stripsPerBox: z.coerce.number().int().min(1).max(10000).default(1),
  unitsPerStrip: z.coerce.number().int().min(1).max(10000).default(1),
  purchasePrice: z.coerce.number().min(0).default(0),
  mrp: z.coerce.number().min(0).default(0),
  sellingPrice: z.coerce.number().min(0).default(0),
  reorderLevel: z.coerce.number().int().min(0).default(10),
  description: z.string().max(2000).optional().default(''),
  isActive: z.coerce.boolean().optional().default(true),
});

async function resolveCategory(data, session = null) {
  if (data.categoryId && mongoose.isValidObjectId(data.categoryId)) return data.categoryId;
  if (!data.categoryName) return null;
  const category = await Category.findOneAndUpdate(
    { name: data.categoryName.trim() },
    { $setOnInsert: { name: data.categoryName.trim(), isActive: true } },
    { new: true, upsert: true, session }
  );
  return category._id;
}

router.use(requireAuth);

router.get('/categories', asyncHandler(async (_req, res) => {
  const rows = await Category.find({ isActive: true }).sort({ name: 1 }).lean();
  res.json({ data: rows });
}));

router.get('/', asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
  const q = String(req.query.q ?? '').trim();
  const filter = {};
  if (req.query.active === 'true') filter.isActive = true;
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ brandName: rx }, { genericName: rx }, { manufacturer: rx }, { sku: rx }, { barcode: rx }];
  }
  const [items, total] = await Promise.all([
    Medicine.find(filter).populate('category', 'name').sort({ brandName: 1 }).skip((page - 1) * limit).limit(limit).lean(),
    Medicine.countDocuments(filter),
  ]);
  const ids = items.map((m) => m._id);
  const branchId = resolveBranch(req);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const match = { medicine: { $in: ids }, isActive: true, expiryDate: { $gte: today } };
  if (branchId) match.branch = new mongoose.Types.ObjectId(branchId);
  const stockRows = ids.length ? await Batch.aggregate([
    { $match: match },
    { $group: { _id: '$medicine', stock: { $sum: '$quantity' } } },
  ]) : [];
  const stockMap = new Map(stockRows.map((r) => [r._id.toString(), r.stock]));
  res.json({ data: items.map((m) => ({ ...m, stock: stockMap.get(m._id.toString()) ?? 0 })), pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
}));

router.post('/', allowRoles('admin', 'manager', 'inventory'), asyncHandler(async (req, res) => {
  const data = medicineSchema.parse(req.body);
  const category = await resolveCategory(data);
  const medicine = await Medicine.create({
    ...data,
    category,
    barcode: data.barcode || undefined,
    sku: data.sku ? data.sku.toUpperCase() : undefined,
  });
  await writeAudit(req, { action: 'CREATE_MEDICINE', entity: 'Medicine', entityId: medicine._id, newValues: medicine.toObject() });
  res.status(201).json({ data: medicine });
}));

router.put('/:id', allowRoles('admin', 'manager', 'inventory'), asyncHandler(async (req, res) => {
  const old = await Medicine.findById(req.params.id).lean();
  if (!old) return res.status(404).json({ message: 'Medicine not found' });
  const data = medicineSchema.parse(req.body);
  const category = await resolveCategory(data);
  const setValues = { ...data, category };
  delete setValues.categoryId;
  delete setValues.categoryName;
  if (data.barcode) setValues.barcode = data.barcode; else delete setValues.barcode;
  if (data.sku) setValues.sku = data.sku.toUpperCase(); else delete setValues.sku;
  const update = { $set: setValues };
  const unset = {};
  if (!data.barcode) unset.barcode = 1;
  if (!data.sku) unset.sku = 1;
  if (Object.keys(unset).length) update.$unset = unset;
  const medicine = await Medicine.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true }).populate('category', 'name');
  await writeAudit(req, { action: 'UPDATE_MEDICINE', entity: 'Medicine', entityId: medicine._id, oldValues: old, newValues: medicine.toObject() });
  res.json({ data: medicine });
}));

router.patch('/:id/status', allowRoles('admin', 'manager'), asyncHandler(async (req, res) => {
  const isActive = z.object({ isActive: z.boolean() }).parse(req.body).isActive;
  const medicine = await Medicine.findByIdAndUpdate(req.params.id, { isActive }, { new: true });
  if (!medicine) return res.status(404).json({ message: 'Medicine not found' });
  await writeAudit(req, { action: isActive ? 'ACTIVATE_MEDICINE' : 'DEACTIVATE_MEDICINE', entity: 'Medicine', entityId: medicine._id });
  res.json({ data: medicine });
}));

router.post('/import', allowRoles('admin', 'inventory'), upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'CSV file is required' });
  const rows = parse(req.file.buffer, { columns: true, skip_empty_lines: true, trim: true, bom: true });
  if (!Array.isArray(rows) || rows.length === 0) return res.status(400).json({ message: 'CSV has no data rows' });
  if (rows.length > 5000) return res.status(400).json({ message: 'Maximum 5000 medicines per upload' });

  let success = 0;
  const errors = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    try {
      const data = medicineSchema.parse({
        brandName: r.brand_name,
        genericName: r.generic_name,
        manufacturer: r.manufacturer,
        categoryName: r.category,
        strength: r.strength,
        dosageForm: r.dosage_form,
        barcode: r.barcode,
        sku: r.sku,
        rackLocation: r.rack_location,
        stripsPerBox: r.strips_per_box || r.box_size || 1,
        unitsPerStrip: r.units_per_strip || r.strip_size || 1,
        purchasePrice: r.purchase_price || 0,
        mrp: r.mrp || 0,
        sellingPrice: r.selling_price || 0,
        reorderLevel: r.reorder_level || 10,
        description: r.description || '',
        isActive: true,
      });
      const category = await resolveCategory(data);
      await Medicine.create({ ...data, category, barcode: data.barcode || undefined, sku: data.sku ? data.sku.toUpperCase() : undefined });
      success++;
    } catch (error) {
      errors.push({ row: i + 2, message: error?.code === 11000 ? 'Duplicate SKU or barcode' : error.message });
    }
  }
  await writeAudit(req, { action: 'IMPORT_MEDICINES', entity: 'Medicine', newValues: { filename: req.file.originalname, totalRows: rows.length, success, failed: errors.length } });
  res.json({ success, failed: errors.length, errors: errors.slice(0, 100) });
}));

export default router;
