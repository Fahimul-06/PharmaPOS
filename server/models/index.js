import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const { Schema, model } = mongoose;
const baseOptions = { timestamps: true, versionKey: false };

const branchSchema = new Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  address: { type: String, trim: true, default: '' },
  phone: { type: String, trim: true, default: '' },
  isActive: { type: Boolean, default: true },
  isMain: { type: Boolean, default: false },
}, baseOptions);
export const Branch = model('Branch', branchSchema);

const userSchema = new Schema({
  fullName: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, trim: true, default: '' },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['admin', 'manager', 'pharmacist', 'cashier', 'inventory'], default: 'cashier' },
  branch: { type: Schema.Types.ObjectId, ref: 'Branch', default: null },
  isActive: { type: Boolean, default: true },
  lastLoginAt: Date,
}, baseOptions);
userSchema.methods.verifyPassword = function (password) { return bcrypt.compare(password, this.passwordHash); };
userSchema.statics.hashPassword = function (password) { return bcrypt.hash(password, 12); };
export const User = model('User', userSchema);

const categorySchema = new Schema({
  name: { type: String, required: true, unique: true, trim: true },
  description: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
}, baseOptions);
export const Category = model('Category', categorySchema);

const medicineSchema = new Schema({
  brandName: { type: String, required: true, trim: true, index: true },
  genericName: { type: String, required: true, trim: true, index: true },
  manufacturer: { type: String, trim: true, default: '', index: true },
  category: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
  strength: { type: String, trim: true, default: '' },
  dosageForm: { type: String, trim: true, default: '' },
  barcode: { type: String, trim: true, sparse: true, unique: true, index: true },
  sku: { type: String, trim: true, uppercase: true, sparse: true, unique: true, index: true },
  rackLocation: { type: String, trim: true, default: '' },
  stripsPerBox: { type: Number, min: 1, default: 1 },
  unitsPerStrip: { type: Number, min: 1, default: 1 },
  purchasePrice: { type: Number, min: 0, default: 0 },
  mrp: { type: Number, min: 0, default: 0 },
  sellingPrice: { type: Number, min: 0, default: 0 },
  reorderLevel: { type: Number, min: 0, default: 10 },
  description: { type: String, default: '' },
  isActive: { type: Boolean, default: true, index: true },
}, baseOptions);
medicineSchema.index({ brandName: 'text', genericName: 'text', manufacturer: 'text', sku: 'text', barcode: 'text' });
export const Medicine = model('Medicine', medicineSchema);

const batchSchema = new Schema({
  medicine: { type: Schema.Types.ObjectId, ref: 'Medicine', required: true, index: true },
  branch: { type: Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
  batchNumber: { type: String, required: true, trim: true },
  manufacturingDate: Date,
  expiryDate: { type: Date, required: true, index: true },
  quantity: { type: Number, min: 0, required: true, default: 0 }, // always base units
  costPrice: { type: Number, min: 0, required: true }, // per base unit
  isActive: { type: Boolean, default: true },
}, baseOptions);
batchSchema.index({ medicine: 1, branch: 1, batchNumber: 1, expiryDate: 1 }, { unique: true });
export const Batch = model('Batch', batchSchema);

const customerSchema = new Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, trim: true, default: '', index: true },
  email: { type: String, lowercase: true, trim: true, default: '' },
  address: { type: String, default: '' },
  balance: { type: Number, default: 0, min: 0 },
  isActive: { type: Boolean, default: true },
}, baseOptions);
export const Customer = model('Customer', customerSchema);

const allocationSchema = new Schema({
  batch: { type: Schema.Types.ObjectId, ref: 'Batch', required: true },
  batchNumber: String,
  quantity: Number,
  unitCost: Number,
}, { _id: false });
const saleItemSchema = new Schema({
  medicine: { type: Schema.Types.ObjectId, ref: 'Medicine', required: true },
  medicineName: String,
  sku: String,
  saleUnit: { type: String, enum: ['unit', 'strip', 'box'], default: 'unit' },
  saleUnitQuantity: Number,
  baseQuantity: Number,
  unitPrice: Number, // price per chosen sale unit
  discount: { type: Number, default: 0 },
  lineTotal: Number,
  cogs: Number,
  allocations: [allocationSchema],
}, { _id: true });
const saleSchema = new Schema({
  invoiceNumber: { type: String, required: true, unique: true, index: true },
  branch: { type: Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
  cashier: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  customer: { type: Schema.Types.ObjectId, ref: 'Customer', default: null },
  items: [saleItemSchema],
  subtotal: Number,
  discount: Number,
  total: Number,
  paidAmount: Number,
  tenderedAmount: { type: Number, default: 0 },
  changeAmount: { type: Number, default: 0 },
  dueAmount: Number,
  paymentMethod: { type: String, enum: ['cash', 'card', 'bkash', 'nagad', 'bangla_qr', 'due'], required: true },
  status: { type: String, enum: ['completed', 'voided', 'refunded'], default: 'completed', index: true },
  totalCogs: Number,
  grossProfit: Number,
  notes: { type: String, default: '' },
  saleDate: { type: Date, default: Date.now, index: true },
}, baseOptions);
saleSchema.index({ branch: 1, saleDate: -1 });
export const Sale = model('Sale', saleSchema);

const movementSchema = new Schema({
  medicine: { type: Schema.Types.ObjectId, ref: 'Medicine', required: true, index: true },
  batch: { type: Schema.Types.ObjectId, ref: 'Batch', default: null },
  branch: { type: Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
  type: { type: String, enum: ['purchase', 'sale', 'adjustment_in', 'adjustment_out', 'return_in', 'return_out', 'transfer_in', 'transfer_out'], required: true },
  quantity: { type: Number, required: true },
  referenceType: String,
  referenceId: Schema.Types.ObjectId,
  note: String,
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, baseOptions);
movementSchema.index({ branch: 1, medicine: 1, createdAt: -1 });
export const StockMovement = model('StockMovement', movementSchema);

const auditSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  userName: String,
  action: { type: String, required: true, index: true },
  entity: String,
  entityId: Schema.Types.ObjectId,
  oldValues: Schema.Types.Mixed,
  newValues: Schema.Types.Mixed,
  ipAddress: String,
  userAgent: String,
}, baseOptions);
auditSchema.index({ createdAt: -1 });
export const AuditLog = model('AuditLog', auditSchema);

const counterSchema = new Schema({
  key: { type: String, required: true, unique: true },
  seq: { type: Number, default: 0 },
}, { versionKey: false });
export const Counter = model('Counter', counterSchema);
