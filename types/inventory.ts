export type InventoryProductType = "RAW_MATERIAL" | "SEMI_FINISHED" | "FINISHED";

export const INVENTORY_PRODUCT_TYPES: ReadonlyArray<{
  value: InventoryProductType;
  label: string;
}> = [
  { value: "RAW_MATERIAL", label: "مادة خام" },
  { value: "SEMI_FINISHED", label: "منتج نصف مُصنّع" },
  { value: "FINISHED", label: "منتج نهائي" },
];

export const isInventoryProductType = (value: string): value is InventoryProductType =>
  INVENTORY_PRODUCT_TYPES.some((type) => type.value === value);

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  /** Available to sell or issue — on hand minus reserved. */
  quantity: number;
  unit: string;
  minStockLevel: number;
  unitPrice?: number;
  costPrice?: number;
  /** نسبة الربح % على التكلفة (مشتقة من السعر/التكلفة) */
  profitPercent?: number;
  /** الهامش % (الربح ÷ سعر البيع) — مُحسوبة من الخادم */
  marginPercent?: number;
  photo?: string | null;
  /** Physically on hand, including anything reserved. */
  onHand?: number;
  /** Committed to a confirmed order and not available to anyone else. */
  reserved?: number;
  /** active | inactive */
  status?: string;
  /** نوع المنتج: مادة خام، نصف مصنّع، منتج نهائي */
  productType?: InventoryProductType;
  size?: string;
  feature?: string;
  color?: string;
  barcode?: string;
  description?: string;
}

export interface ProductEnriched {
  id: string;
  sku: string;
  name: string;
  category: string;
  unitPrice: number;
  costPrice: number;
  profitPercent?: number;
  marginPercent?: number;
  reorderLevel: number;
  unit: string;
  status: string;
  photo?: string | null;
  createdAt: string;
  updatedAt: string;
  totalQuantity: number;
  totalReserved: number;
  totalAvailable: number;
  productType?: InventoryProductType;
  size?: string;
  feature?: string;
  color?: string;
  barcode?: string;
  description?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type MovementType = "IN" | "OUT" | "ADJUSTMENT" | "RESERVE" | "RELEASE" | "PURCHASE_RECEIPT" | "PRODUCTION_OUTPUT" | "RETURN_TO_STOCK" | "SALES_SHIPMENT" | "PRODUCTION_CONSUMPTION" | "DAMAGE_LOSS" | "WAREHOUSE_TRANSFER";

export interface StockMovementRecord {
  id: string;
  sku: string;
  type: MovementType;
  quantity: number;
  location: string;
  reason?: string;
  referenceType?: string;
  referenceId?: string;
  createdById?: string;
  createdAt: string;
  product?: { name: string } | null;
}

export interface Warehouse {
  id: string;
  name: string;
  code: string;
  address?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  totalQuantity?: number;
  totalAvailable?: number;
  totalReserved?: number;
  stockRecordCount?: number;
}

export interface InventoryStats {
  totalProducts: number;
  totalStockRecords: number;
  totalQuantity: number;
  totalAvailable: number;
  totalReserved: number;
  lowStockCount: number;
  totalWarehouses: number;
}

export interface InventoryItemInput {
  sku?: string;
  name: string;
  category: string;
  unitPrice?: number | string;
  costPrice?: number | string;
  profitPercent?: number | string;
  reorderLevel: number | string;
  unit?: string;
  photo?: string | null;
  productType?: InventoryProductType;
  size?: string;
  feature?: string;
  color?: string;
  barcode?: string;
  description?: string;
}

export interface AdjustStockInput {
  productId: string;
  type: "IN" | "OUT" | "ADJUSTMENT" | "PURCHASE_RECEIPT" | "PRODUCTION_OUTPUT" | "RETURN_TO_STOCK" | "SALES_SHIPMENT" | "PRODUCTION_CONSUMPTION" | "DAMAGE_LOSS" | "WAREHOUSE_TRANSFER";
  quantity: number | string;
  note: string;
  location?: string;
  category?: string;
}

export interface WarehouseInput {
  name: string;
  code: string;
  address?: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  type: string;
  tenantId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CategoryType {
  id: string;
  name: string;
  label: string;
}

export const CATEGORY_TYPES: CategoryType[] = [
  { id: "RAW_MATERIALS", name: "RAW_MATERIALS", label: "مواد خام" },
  { id: "PACKAGING", name: "PACKAGING", label: "مواد تغليف" },
  { id: "SERVICES", name: "SERVICES", label: "خدمات" },
  { id: "FINISHED_GOODS", name: "FINISHED_GOODS", label: "منتجات نهائية" },
  { id: "OTHER", name: "OTHER", label: "إضافة نوع جديد" },
];

export interface CreateCategoryInput {
  name: string;
  type: string;
  customTypeName?: string;
}

export interface ProductInput {
  name: string;
  productType?: InventoryProductType;
  sku?: string;
  size?: string;
  color?: string;
  costPrice: number | string;
  unitPrice: number | string;
}
