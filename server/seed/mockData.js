import mongoose from 'mongoose';
import {
  AuditLog,
  Batch,
  Branch,
  Category,
  Counter,
  Customer,
  Medicine,
  Sale,
  StockMovement,
  User,
} from '../models/index.js';

const DEMO_PASSWORD = process.env.MOCK_USER_PASSWORD || 'Demo12345!';
const SEED_KEY = 'mock-seed:v1';

function dayOffset(daysAgo, hour = 12, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function dateOffset(daysFromNow) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(0, 0, 0, 0);
  return d;
}

function datePart(date) {
  return date.toISOString().slice(0, 10).replaceAll('-', '');
}

const medicineSeeds = [
  { brandName: 'Napa 500', genericName: 'Paracetamol', manufacturer: 'Beximco Pharmaceuticals', category: 'Analgesics', strength: '500 mg', dosageForm: 'Tablet', barcode: '8801000000011', sku: 'DEMO-NAPA500', rackLocation: 'A-01', stripsPerBox: 20, unitsPerStrip: 10, purchasePrice: 0.80, mrp: 1.20, sellingPrice: 1.10, reorderLevel: 120 },
  { brandName: 'Napa Extra', genericName: 'Paracetamol + Caffeine', manufacturer: 'Beximco Pharmaceuticals', category: 'Analgesics', strength: '500 mg + 65 mg', dosageForm: 'Tablet', barcode: '8801000000028', sku: 'DEMO-NAPAEX', rackLocation: 'A-02', stripsPerBox: 20, unitsPerStrip: 10, purchasePrice: 1.45, mrp: 2.10, sellingPrice: 2.00, reorderLevel: 100 },
  { brandName: 'Seclo 20', genericName: 'Omeprazole', manufacturer: 'Square Pharmaceuticals', category: 'Gastrointestinal', strength: '20 mg', dosageForm: 'Capsule', barcode: '8801000000035', sku: 'DEMO-SECLO20', rackLocation: 'B-01', stripsPerBox: 10, unitsPerStrip: 10, purchasePrice: 4.30, mrp: 6.00, sellingPrice: 5.50, reorderLevel: 60 },
  { brandName: 'Sergel 20', genericName: 'Esomeprazole', manufacturer: 'Healthcare Pharmaceuticals', category: 'Gastrointestinal', strength: '20 mg', dosageForm: 'Capsule', barcode: '8801000000042', sku: 'DEMO-SERGEL20', rackLocation: 'B-02', stripsPerBox: 10, unitsPerStrip: 10, purchasePrice: 5.10, mrp: 7.00, sellingPrice: 6.50, reorderLevel: 50 },
  { brandName: 'Alatrol 10', genericName: 'Cetirizine Hydrochloride', manufacturer: 'Square Pharmaceuticals', category: 'Antihistamines', strength: '10 mg', dosageForm: 'Tablet', barcode: '8801000000059', sku: 'DEMO-ALATROL10', rackLocation: 'C-01', stripsPerBox: 20, unitsPerStrip: 10, purchasePrice: 1.75, mrp: 3.00, sellingPrice: 2.50, reorderLevel: 80 },
  { brandName: 'Zimax 500', genericName: 'Azithromycin', manufacturer: 'Square Pharmaceuticals', category: 'Antibiotics', strength: '500 mg', dosageForm: 'Tablet', barcode: '8801000000066', sku: 'DEMO-ZIMAX500', rackLocation: 'D-01', stripsPerBox: 5, unitsPerStrip: 3, purchasePrice: 31.00, mrp: 40.00, sellingPrice: 38.00, reorderLevel: 20 },
  { brandName: 'DP Done 10', genericName: 'Domperidone', manufacturer: 'Drug International', category: 'Gastrointestinal', strength: '10 mg', dosageForm: 'Tablet', barcode: '8801000000073', sku: 'DEMO-DPDONE10', rackLocation: 'B-03', stripsPerBox: 20, unitsPerStrip: 10, purchasePrice: 1.55, mrp: 2.50, sellingPrice: 2.20, reorderLevel: 70 },
  { brandName: 'Monas 10', genericName: 'Montelukast', manufacturer: 'ACME Laboratories', category: 'Respiratory', strength: '10 mg', dosageForm: 'Tablet', barcode: '8801000000080', sku: 'DEMO-MONAS10', rackLocation: 'E-01', stripsPerBox: 10, unitsPerStrip: 10, purchasePrice: 14.00, mrp: 20.00, sellingPrice: 18.00, reorderLevel: 30 },
  { brandName: 'Ceevit 250', genericName: 'Vitamin C', manufacturer: 'Square Pharmaceuticals', category: 'Vitamins & Supplements', strength: '250 mg', dosageForm: 'Tablet', barcode: '8801000000097', sku: 'DEMO-CEEVIT250', rackLocation: 'F-01', stripsPerBox: 20, unitsPerStrip: 10, purchasePrice: 1.45, mrp: 2.50, sellingPrice: 2.20, reorderLevel: 90 },
  { brandName: 'Orsaline-N', genericName: 'Oral Rehydration Salts', manufacturer: 'SMC', category: 'Other', strength: '10.25 g', dosageForm: 'Sachet', barcode: '8801000000103', sku: 'DEMO-ORSALINE', rackLocation: 'F-02', stripsPerBox: 25, unitsPerStrip: 1, purchasePrice: 5.00, mrp: 6.00, sellingPrice: 6.00, reorderLevel: 60 },
  { brandName: 'Losar 50', genericName: 'Losartan Potassium', manufacturer: 'Square Pharmaceuticals', category: 'Cardiovascular', strength: '50 mg', dosageForm: 'Tablet', barcode: '8801000000110', sku: 'DEMO-LOSAR50', rackLocation: 'G-01', stripsPerBox: 10, unitsPerStrip: 10, purchasePrice: 7.20, mrp: 10.00, sellingPrice: 9.50, reorderLevel: 50 },
  { brandName: 'Comet 500', genericName: 'Metformin Hydrochloride', manufacturer: 'Square Pharmaceuticals', category: 'Diabetes', strength: '500 mg', dosageForm: 'Tablet', barcode: '8801000000127', sku: 'DEMO-COMET500', rackLocation: 'G-02', stripsPerBox: 10, unitsPerStrip: 10, purchasePrice: 3.50, mrp: 5.00, sellingPrice: 4.50, reorderLevel: 50 },
  { brandName: 'Napa Syrup', genericName: 'Paracetamol', manufacturer: 'Beximco Pharmaceuticals', category: 'Analgesics', strength: '120 mg/5 ml', dosageForm: 'Syrup', barcode: '8801000000134', sku: 'DEMO-NAPASYR', rackLocation: 'H-01', stripsPerBox: 1, unitsPerStrip: 1, purchasePrice: 28.00, mrp: 40.00, sellingPrice: 38.00, reorderLevel: 12 },
  { brandName: 'Savlon Cream', genericName: 'Cetrimide + Chlorhexidine', manufacturer: 'ACI Limited', category: 'Dermatology', strength: '30 g', dosageForm: 'Cream', barcode: '8801000000141', sku: 'DEMO-SAVLON30', rackLocation: 'H-02', stripsPerBox: 1, unitsPerStrip: 1, purchasePrice: 45.00, mrp: 60.00, sellingPrice: 58.00, reorderLevel: 10 },
];

const batchSeeds = [
  ['DEMO-NAPA500', 'DEMO-NP-A1', 500, 0.78, 18],
  ['DEMO-NAPA500', 'DEMO-NP-B1', 700, 0.82, 360],
  ['DEMO-NAPAEX', 'DEMO-NX-A1', 450, 1.42, 220],
  ['DEMO-SECLO20', 'DEMO-SC-A1', 180, 4.20, 25],
  ['DEMO-SECLO20', 'DEMO-SC-B1', 300, 4.35, 300],
  ['DEMO-SERGEL20', 'DEMO-SG-A1', 240, 5.00, 120],
  ['DEMO-ALATROL10', 'DEMO-AL-A1', 95, 1.70, 12],
  ['DEMO-ZIMAX500', 'DEMO-ZM-A1', 42, 30.50, 150],
  ['DEMO-DPDONE10', 'DEMO-DP-A1', 220, 1.50, 80],
  ['DEMO-MONAS10', 'DEMO-MN-A1', 55, 13.50, 210],
  ['DEMO-CEEVIT250', 'DEMO-CV-A1', 260, 1.40, 240],
  ['DEMO-ORSALINE', 'DEMO-OR-A1', 75, 4.80, 60],
  ['DEMO-LOSAR50', 'DEMO-LS-A1', 100, 7.00, 330],
  ['DEMO-COMET500', 'DEMO-CM-A1', 115, 3.35, 280],
  ['DEMO-NAPASYR', 'DEMO-NS-A1', 16, 27.00, 20],
  ['DEMO-SAVLON30', 'DEMO-SV-A1', 14, 44.00, 400],
];

const customersSeed = [
  { name: 'Rahim Ahmed', phone: '01710000001', email: 'rahim@mock.pharmapos', address: 'Dhanmondi, Dhaka' },
  { name: 'Nusrat Jahan', phone: '01810000002', email: 'nusrat@mock.pharmapos', address: 'Mirpur, Dhaka' },
  { name: 'Mahmud Hasan', phone: '01910000003', email: 'mahmud@mock.pharmapos', address: 'Mohammadpur, Dhaka' },
  { name: 'Sadia Islam', phone: '01610000004', email: 'sadia@mock.pharmapos', address: 'Uttara, Dhaka' },
  { name: 'Tanvir Hossain', phone: '01510000005', email: 'tanvir@mock.pharmapos', address: 'Farmgate, Dhaka' },
];

const saleSeeds = [
  { daysAgo: 6, hour: 10, customer: 0, paymentMethod: 'cash', discount: 5, items: [['DEMO-NAPA500', 'strip', 2], ['DEMO-SECLO20', 'strip', 1], ['DEMO-ORSALINE', 'unit', 3]] },
  { daysAgo: 5, hour: 15, customer: 1, paymentMethod: 'bkash', discount: 0, items: [['DEMO-ALATROL10', 'strip', 1], ['DEMO-CEEVIT250', 'strip', 2]] },
  { daysAgo: 4, hour: 11, customer: 2, paymentMethod: 'cash', discount: 10, items: [['DEMO-ZIMAX500', 'strip', 2], ['DEMO-NAPA500', 'strip', 1]] },
  { daysAgo: 3, hour: 18, customer: 3, paymentMethod: 'card', discount: 0, items: [['DEMO-MONAS10', 'strip', 1], ['DEMO-SERGEL20', 'strip', 1]] },
  { daysAgo: 2, hour: 13, customer: 4, paymentMethod: 'due', discount: 5, paidRatio: 0.5, items: [['DEMO-LOSAR50', 'strip', 2], ['DEMO-COMET500', 'strip', 2]] },
  { daysAgo: 1, hour: 19, customer: 0, paymentMethod: 'nagad', discount: 3, items: [['DEMO-DPDONE10', 'strip', 1], ['DEMO-NAPAEX', 'strip', 2]] },
  { daysAgo: 0, hour: 9, customer: 1, paymentMethod: 'cash', discount: 0, items: [['DEMO-NAPA500', 'strip', 3], ['DEMO-ORSALINE', 'unit', 4]] },
  { daysAgo: 0, hour: 13, customer: 2, paymentMethod: 'bangla_qr', discount: 8, items: [['DEMO-SECLO20', 'strip', 2], ['DEMO-ALATROL10', 'strip', 1], ['DEMO-CEEVIT250', 'strip', 1]] },
  { daysAgo: 0, hour: 17, customer: 3, paymentMethod: 'cash', discount: 0, items: [['DEMO-NAPASYR', 'unit', 1], ['DEMO-SAVLON30', 'unit', 1], ['DEMO-NAPAEX', 'strip', 1]] },
];

async function makeDemoUsers(branch) {
  const passwordHash = await User.hashPassword(DEMO_PASSWORD);
  const users = [
    ['Demo Manager', 'demo.manager@pharmapos.local', 'manager'],
    ['Demo Pharmacist', 'demo.pharmacist@pharmapos.local', 'pharmacist'],
    ['Demo Cashier', 'demo.cashier@pharmapos.local', 'cashier'],
    ['Demo Inventory Officer', 'demo.inventory@pharmapos.local', 'inventory'],
  ];
  const out = {};
  for (const [fullName, email, role] of users) {
    const user = await User.findOneAndUpdate(
      { email },
      { $set: { fullName, role, branch: branch._id, isActive: true, passwordHash } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).select('+passwordHash');
    out[role] = user;
  }
  return out;
}

export async function seedMockData({ force = false } = {}) {
  const alreadySeeded = await Counter.exists({ key: SEED_KEY });
  if (alreadySeeded && !force) {
    console.log('Mock seed already exists; skipping. Use --force to rebuild it.');
    return { skipped: true };
  }

  const demoBranch = await Branch.findOneAndUpdate(
    { code: 'DEMO' },
    { $set: { name: 'Demo Pharmacy', address: 'Dhanmondi, Dhaka', phone: '02-00000000', isActive: true, isMain: false } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const categories = {};
  for (const row of medicineSeeds) {
    if (!categories[row.category]) {
      categories[row.category] = await Category.findOneAndUpdate(
        { name: row.category },
        { $setOnInsert: { name: row.category, isActive: true } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }
  }

  const medicines = {};
  for (const row of medicineSeeds) {
    const { category, ...data } = row;
    const med = await Medicine.findOneAndUpdate(
      { sku: row.sku },
      { $set: { ...data, category: categories[category]._id, isActive: true } },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );
    medicines[row.sku] = med;
  }

  await Sale.deleteMany({ invoiceNumber: /^MOCK-/ });
  await StockMovement.deleteMany({ branch: demoBranch._id, referenceType: { $in: ['mock_seed_stock', 'mock_seed_sale'] } });
  await AuditLog.deleteMany({ action: /^MOCK_/ });
  await Batch.deleteMany({ branch: demoBranch._id, batchNumber: /^DEMO-/ });
  await Customer.deleteMany({ email: /@mock\.pharmapos$/ });

  const batchMap = new Map();
  for (const [sku, batchNumber, quantity, costPrice, expiryDays] of batchSeeds) {
    const medicine = medicines[sku];
    const batch = await Batch.create({
      medicine: medicine._id,
      branch: demoBranch._id,
      batchNumber,
      manufacturingDate: dateOffset(-180),
      expiryDate: dateOffset(expiryDays),
      quantity,
      costPrice,
      isActive: true,
    });
    const key = medicine._id.toString();
    const list = batchMap.get(key) ?? [];
    list.push(batch);
    list.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));
    batchMap.set(key, list);
    await StockMovement.create({
      medicine: medicine._id,
      batch: batch._id,
      branch: demoBranch._id,
      type: 'purchase',
      quantity,
      referenceType: 'mock_seed_stock',
      note: 'Mock opening inventory',
    });
  }

  const customers = await Customer.insertMany(customersSeed.map((c) => ({ ...c, balance: 0, isActive: true })));
  const users = await makeDemoUsers(demoBranch);
  const cashier = users.cashier;

  const createdSales = [];
  let invoiceSeq = 1;
  for (const row of saleSeeds) {
    const saleDate = dayOffset(row.daysAgo, row.hour, 15);
    const saleItems = [];
    let subtotal = 0;
    let totalCogs = 0;

    for (const [sku, unit, saleUnitQuantity] of row.items) {
      const medicine = medicines[sku];
      const multiplier = unit === 'box'
        ? medicine.stripsPerBox * medicine.unitsPerStrip
        : unit === 'strip'
          ? medicine.unitsPerStrip
          : 1;
      const baseQuantity = saleUnitQuantity * multiplier;
      const unitPrice = medicine.sellingPrice * multiplier;
      const lineTotal = unitPrice * saleUnitQuantity;
      let remaining = baseQuantity;
      let cogs = 0;
      const allocations = [];
      const batches = batchMap.get(medicine._id.toString()) ?? [];

      for (const batch of batches) {
        if (remaining <= 0) break;
        if (batch.quantity <= 0) continue;
        const take = Math.min(batch.quantity, remaining);
        batch.quantity -= take;
        await Batch.updateOne({ _id: batch._id }, { $set: { quantity: batch.quantity } });
        allocations.push({ batch: batch._id, batchNumber: batch.batchNumber, quantity: take, unitCost: batch.costPrice });
        cogs += take * batch.costPrice;
        remaining -= take;
      }
      if (remaining > 0) throw new Error(`Mock seed stock is insufficient for ${medicine.brandName}`);

      subtotal += lineTotal;
      totalCogs += cogs;
      saleItems.push({
        medicine: medicine._id,
        medicineName: medicine.brandName,
        sku: medicine.sku,
        saleUnit: unit,
        saleUnitQuantity,
        baseQuantity,
        unitPrice,
        discount: 0,
        lineTotal,
        cogs,
        allocations,
      });
    }

    const discount = Math.min(row.discount || 0, subtotal);
    const total = subtotal - discount;
    const paidAmount = row.paymentMethod === 'due' ? Number((total * (row.paidRatio ?? 0)).toFixed(2)) : total;
    const dueAmount = Number((total - paidAmount).toFixed(2));
    const invoiceNumber = `MOCK-${datePart(saleDate)}-${String(invoiceSeq++).padStart(4, '0')}`;
    const customer = customers[row.customer];

    const sale = await Sale.create({
      invoiceNumber,
      branch: demoBranch._id,
      cashier: cashier._id,
      customer: customer?._id ?? null,
      items: saleItems,
      subtotal,
      discount,
      total,
      paidAmount,
      tenderedAmount: paidAmount,
      changeAmount: 0,
      dueAmount,
      paymentMethod: row.paymentMethod,
      status: 'completed',
      totalCogs,
      grossProfit: total - totalCogs,
      notes: 'Mock sale generated for testing',
      saleDate,
    });
    createdSales.push(sale);

    for (const item of saleItems) {
      for (const allocation of item.allocations) {
        await StockMovement.create({
          medicine: item.medicine,
          batch: allocation.batch,
          branch: demoBranch._id,
          type: 'sale',
          quantity: allocation.quantity,
          referenceType: 'mock_seed_sale',
          referenceId: sale._id,
          note: invoiceNumber,
          createdBy: cashier._id,
          createdAt: saleDate,
          updatedAt: saleDate,
        });
      }
    }

    if (dueAmount > 0 && customer) {
      customer.balance += dueAmount;
      await customer.save();
    }
  }

  await AuditLog.create({
    user: users.manager._id,
    userName: users.manager.fullName,
    action: 'MOCK_SEED_CREATED',
    entity: 'DemoData',
    newValues: { branch: demoBranch.name, medicines: medicineSeeds.length, batches: batchSeeds.length, customers: customers.length, sales: createdSales.length },
    ipAddress: '127.0.0.1',
    userAgent: 'mock-seed-script',
  });
  await Counter.findOneAndUpdate({ key: SEED_KEY }, { $set: { seq: 1 } }, { upsert: true, new: true });

  console.log(`Mock data ready in branch: ${demoBranch.name} (${demoBranch.code})`);
  console.log(`Demo manager: demo.manager@pharmapos.local / ${DEMO_PASSWORD}`);
  console.log(`Demo cashier: demo.cashier@pharmapos.local / ${DEMO_PASSWORD}`);
  console.log(`Created ${medicineSeeds.length} medicines, ${batchSeeds.length} batches, ${customers.length} customers and ${createdSales.length} sales.`);
  return { skipped: false, branchId: demoBranch._id, medicines: medicineSeeds.length, batches: batchSeeds.length, customers: customers.length, sales: createdSales.length };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_MOCK_SEED !== 'true') {
    throw new Error('Mock seeding is blocked in production. Set ALLOW_MOCK_SEED=true temporarily if you intentionally want demo data.');
  }
  const { connectDatabase } = await import('../config/db.js');
  await connectDatabase();
  try {
    await seedMockData({ force: process.argv.includes('--force') });
  } finally {
    await mongoose.disconnect();
  }
}
