export type UserRole = 'admin' | 'manager' | 'pharmacist' | 'cashier' | 'inventory';

export interface BranchRef {
  _id: string;
  name: string;
  code: string;
}

export interface UserProfile {
  _id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: UserRole;
  branch: BranchRef | null;
  isActive: boolean;
}

export interface Category {
  _id: string;
  name: string;
}

export interface Medicine {
  _id: string;
  brandName: string;
  genericName: string;
  manufacturer: string;
  category?: Category | null;
  strength: string;
  dosageForm: string;
  barcode?: string;
  sku?: string;
  rackLocation: string;
  stripsPerBox: number;
  unitsPerStrip: number;
  purchasePrice: number;
  mrp: number;
  sellingPrice: number;
  reorderLevel: number;
  description: string;
  isActive: boolean;
  stock?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Batch {
  _id: string;
  medicine: Medicine;
  branch: BranchRef;
  batchNumber: string;
  manufacturingDate?: string | null;
  expiryDate: string;
  quantity: number;
  costPrice: number;
  isActive: boolean;
}

export interface CatalogMedicine {
  _id: string;
  brandName: string;
  genericName: string;
  strength: string;
  dosageForm: string;
  barcode?: string;
  sku?: string;
  sellingPrice: number;
  mrp: number;
  stripsPerBox: number;
  unitsPerStrip: number;
  stock: number;
  nearestExpiry: string;
}

export interface Sale {
  _id: string;
  invoiceNumber: string;
  subtotal: number;
  discount: number;
  total: number;
  paidAmount: number;
  tenderedAmount?: number;
  changeAmount?: number;
  dueAmount: number;
  paymentMethod: string;
  totalCogs: number;
  grossProfit: number;
  saleDate: string;
  customer?: { _id: string; name: string; phone?: string } | null;
  cashier?: { _id: string; fullName: string } | null;
  items: Array<{
    medicineName: string;
    saleUnit: 'unit' | 'strip' | 'box';
    saleUnitQuantity: number;
    baseQuantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
}
