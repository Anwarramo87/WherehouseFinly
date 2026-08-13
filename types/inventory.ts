export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  quantity: number;
  unit: string;
  minStockLevel: number;
  unitPrice?: number;
  costPrice?: number;
  photo?: string | null;
}

export interface ProductEnriched {
  id: string;
  sku: string;
  name: string;
  category: string;
  unitPrice: number;
  costPrice: number;
  reorderLevel: number;
  unit: string;
  status: string;
  photo?: string | null;
  createdAt: string;
  updatedAt: string;
  totalQuantity: number;
  totalReserved: number;
  totalAvailable: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type MovementType = "IN" | "OUT" | "ADJUSTMENT" | "RESERVE" | "RELEASE";

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
  sku: string;
  name: string;
  category: string;
  unitPrice: number | string;
  costPrice: number | string;
  reorderLevel: number | string;
  unit?: string;
  photo?: string | null;
}

export interface AdjustStockInput {
  productId: string;
  type: "IN" | "OUT" | "ADJUSTMENT";
  quantity: number | string;
  note: string;
  location?: string;
}

export interface WarehouseInput {
  name: string;
  code: string;
  address?: string;
}
