/**
 * Types for the WMS extension: batches and expiry, invoicing, pricing,
 * slotting, quality, counting, fulfilment, analytics and integrations.
 *
 * Money and quantities arrive from the API as strings (Prisma `Decimal`
 * serialises that way). They are typed as `Numeric` rather than `number` so a
 * caller is forced to run them through `toNum` instead of silently getting
 * `"1234.50" + 1 === "1234.501"`.
 */
export type Numeric = string | number;

export const toNum = (value: Numeric | null | undefined): number => {
  if (value === null || value === undefined) return 0;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ------------------------------------------------------------------- batches

export type BatchStatus =
  | "AVAILABLE"
  | "QUARANTINE"
  | "NEAR_EXPIRY"
  | "EXPIRED"
  | "CONSUMED"
  | "REJECTED";

export interface BatchStockLevel {
  id: string;
  batchId: string;
  sku: string;
  location: string;
  quantity: number;
  reserved: number;
  available: number;
}

export interface ProductBatch {
  id: string;
  sku: string;
  batchNumber: string;
  productionDate: string | null;
  expiryDate: string | null;
  status: BatchStatus;
  initialQuantity: number;
  quantity: number;
  reserved: number;
  available: number;
  unitCost: Numeric;
  barcode: string | null;
  supplierId: string | null;
  quarantineReason: string | null;
  notes: string | null;
  createdAt: string;
  /** Derived server-side; negative once the batch is past its date. */
  daysToExpiry: number | null;
  isExpired: boolean;
  stockLevels?: BatchStockLevel[];
}

export interface BatchAllocation {
  batchId: string;
  batchNumber: string;
  sku: string;
  location: string;
  quantity: number;
  unitCost: Numeric;
  expiryDate: string | null;
}

export interface AllocationPlan {
  sku: string;
  strategy: "FEFO" | "FIFO";
  requested: number;
  allocated: number;
  shortfall: number;
  allocations: BatchAllocation[];
  blocked: Array<{ batchNumber: string; status: BatchStatus; quantity: number; reason: string }>;
}

export interface BatchLabel {
  barcode: string;
  gs1: string;
  sku: string;
  productName: string;
  batchNumber: string;
  productionDate: string | null;
  expiryDate: string | null;
  quantity: number;
  unit: string;
  status: BatchStatus;
  /** Inline Code128 symbol, ready to drop into the print sheet. */
  svg: string;
}

// -------------------------------------------------------------------- expiry

export type ExpiryLevel = "expired" | "critical" | "warning";

export interface ExpiryRow {
  batchId: string;
  sku: string;
  productName: string;
  category: string | null;
  unit: string;
  batchNumber: string;
  expiryDate: string;
  daysLeft: number;
  quantity: number;
  reserved: number;
  status: BatchStatus;
  unitCost: Numeric;
  value: Numeric;
  locations: Array<{ location: string; quantity: number }>;
  rule: string;
  willBlockInDays: number | null;
}

export interface ExpiryDashboard {
  generatedAt: string;
  horizonDays: number;
  summary: {
    expired: { count: number; value: Numeric };
    critical: { count: number; value: Numeric };
    warning: { count: number; value: Numeric };
    totalAtRisk: number;
    totalValueAtRisk: Numeric;
  };
  expired: ExpiryRow[];
  critical: ExpiryRow[];
  warning: ExpiryRow[];
}

export interface ExpiryRule {
  id: string;
  name: string;
  category: string | null;
  sku: string | null;
  warnDays: number;
  criticalDays: number;
  /** 0 disables the automatic quarantine. */
  blockDays: number;
  notifyEmails: string[];
  notifySales: boolean;
  isActive: boolean;
}

// ------------------------------------------------------------------- pricing

export interface TaxRate {
  id: string;
  code: string;
  name: string;
  rate: Numeric;
  isDefault: boolean;
  isActive: boolean;
}

export interface PriceTier {
  id: string;
  code: string;
  name: string;
  discountPercent: Numeric;
  isDefault: boolean;
  isActive: boolean;
  _count?: { prices: number; customers: number };
}

export interface ProductPrice {
  id: string;
  sku: string;
  priceTierId: string;
  price: Numeric;
  minQuantity: number;
  validFrom: string | null;
  validTo: string | null;
  priceTier?: { code: string; name: string };
}

export interface QuoteLine {
  sku: string;
  quantity: number;
  listPrice: Numeric;
  unitPrice: Numeric;
  discountPercent: Numeric;
  discountAmount: Numeric;
  taxRate: Numeric;
  taxAmount: Numeric;
  lineSubtotal: Numeric;
  lineTotal: Numeric;
  /** Which rule set the price — shown so a seller can explain the number. */
  priceSource: string;
}

export interface Quote {
  priceTier: { id: string; code: string; name: string } | null;
  lines: QuoteLine[];
  subtotal: Numeric;
  discountAmount: Numeric;
  taxAmount: Numeric;
  total: Numeric;
}

// ------------------------------------------------------------------ invoices

export type DocumentStatus = "DRAFT" | "POSTED" | "PARTIALLY_PAID" | "PAID" | "CANCELLED";

export interface PurchaseInvoiceItem {
  id: string;
  sku: string;
  batchNumber: string | null;
  productionDate: string | null;
  expiryDate: string | null;
  quantity: number;
  unitCost: Numeric;
  discountPercent: Numeric;
  discountAmount: Numeric;
  taxRate: Numeric;
  taxAmount: Numeric;
  lineTotal: Numeric;
  allocatedLandedCost: Numeric;
  finalUnitCost: Numeric;
  location: string;
}

export interface LandedCost {
  id: string;
  type: string;
  description: string | null;
  amount: Numeric;
  allocationMethod: "VALUE" | "QUANTITY" | "WEIGHT" | "MANUAL";
}

export interface PurchaseInvoice {
  id: string;
  invoiceNumber: string;
  supplierInvoiceNumber: string | null;
  supplierId: string;
  purchaseOrderId: string | null;
  invoiceDate: string;
  dueDate: string | null;
  status: DocumentStatus;
  subtotal: Numeric;
  discountAmount: Numeric;
  taxAmount: Numeric;
  landedCostTotal: Numeric;
  totalAmount: Numeric;
  paidAmount: Numeric;
  balance?: Numeric;
  currency: string;
  notes: string | null;
  postedAt: string | null;
  createdAt: string;
  supplier?: { id: string; name: string };
  items?: PurchaseInvoiceItem[];
  landedCosts?: LandedCost[];
  payments?: Array<{ id: string; amount: Numeric; method: string; createdAt: string }>;
  purchaseOrder?: { id: string; poNumber: string; status: string } | null;
  _count?: { items: number; payments: number };
}

export interface SalesInvoiceItem {
  id: string;
  sku: string;
  batchId: string | null;
  batchNumber: string | null;
  expiryDate: string | null;
  quantity: number;
  unitPrice: Numeric;
  discountPercent: Numeric;
  discountAmount: Numeric;
  taxRate: Numeric;
  taxAmount: Numeric;
  lineTotal: Numeric;
  unitCost: Numeric;
  location: string;
  batch?: { batchNumber: string; expiryDate: string | null } | null;
}

export interface SalesInvoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  salesOrderId: string | null;
  priceTierId: string | null;
  invoiceDate: string;
  dueDate: string | null;
  status: DocumentStatus;
  subtotal: Numeric;
  discountAmount: Numeric;
  taxAmount: Numeric;
  totalAmount: Numeric;
  paidAmount: Numeric;
  cogsAmount: Numeric;
  balance?: Numeric;
  margin?: Numeric;
  currency: string;
  notes: string | null;
  postedAt: string | null;
  createdAt: string;
  customer?: { id: string; name: string };
  priceTier?: { code: string; name: string } | null;
  items?: SalesInvoiceItem[];
  deliveryNotes?: DeliveryNote[];
  /** FEFO proposals returned alongside a freshly created draft. */
  fefo?: AllocationPlan[];
  _count?: { items: number };
}

export interface DeliveryNote {
  id: string;
  noteNumber: string;
  salesInvoiceId: string | null;
  customerId: string;
  status: string;
  issuedAt: string | null;
  deliveredAt: string | null;
  receivedBy: string | null;
  items?: Array<{
    id: string;
    sku: string;
    batchNumber: string | null;
    quantity: number;
    location: string;
  }>;
  salesInvoice?: { invoiceNumber: string };
}

// ----------------------------------------------------------------- locations

export type ZoneType =
  | "RECEIVING"
  | "PICKING"
  | "BULK"
  | "QUARANTINE"
  | "PACKING"
  | "STAGING"
  | "SHIPPING"
  | "RETURNS";

export interface WarehouseZone {
  id: string;
  warehouseId: string;
  code: string;
  name: string;
  type: ZoneType;
  pickSequence: number;
  isActive: boolean;
  warehouse?: { id: string; code: string; name: string };
  _count?: { bins: number };
}

export interface StorageBin {
  id: string;
  zoneId: string;
  code: string;
  name: string | null;
  aisle: string | null;
  rack: string | null;
  level: string | null;
  position: string | null;
  capacityUnits: number | null;
  currentUnits: number;
  pickPriority: number;
  dedicatedSku: string | null;
  isActive: boolean;
  status: string;
  onHand?: number;
  utilization?: number | null;
  zone?: { code: string; name: string; type: ZoneType };
}

export interface BinSuggestion {
  binCode: string;
  zoneCode: string;
  zoneType: ZoneType;
  score: number;
  rule: string;
  freeUnits: number | null;
  reasons: string[];
}

export interface PutawayTask {
  id: string;
  taskNumber: string;
  sku: string;
  batchId: string | null;
  quantity: number;
  fromLocation: string;
  suggestedBin: string | null;
  suggestionRule: string | null;
  actualBin: string | null;
  status: "PENDING" | "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  assignedTo: string | null;
  completedAt: string | null;
  createdAt: string;
  batch?: { batchNumber: string; expiryDate: string | null } | null;
}

export interface ZoneOccupancy {
  zoneId: string;
  code: string;
  name: string;
  type: ZoneType;
  binCount: number;
  occupiedBins: number;
  totalUnits: number;
  averageUtilization: number | null;
  bins: Array<{
    code: string;
    aisle: string | null;
    rack: string | null;
    level: string | null;
    capacityUnits: number | null;
    onHand: number;
    utilization: number | null;
    isActive: boolean;
    dedicatedSku: string | null;
  }>;
}

// ------------------------------------------------------------- cycle counts

export type CountStatus = "DRAFT" | "IN_PROGRESS" | "REVIEW" | "COMPLETED" | "CANCELLED";

export interface CycleCountItem {
  id: string;
  sku: string;
  productName?: string;
  unit?: string;
  batchId: string | null;
  location: string;
  systemQuantity: number;
  countedQuantity: number | null;
  variance: number;
  varianceValue: Numeric;
  status: "PENDING" | "COUNTED" | "RECOUNT" | "APPROVED" | "REJECTED";
  recountRequired: boolean;
  notes: string | null;
  batch?: { batchNumber: string; expiryDate: string | null } | null;
}

export interface CycleCount {
  id: string;
  countNumber: string;
  type: string;
  scope: string;
  scopeValue: string | null;
  status: CountStatus;
  scheduledDate: string | null;
  startedAt: string | null;
  completedAt: string | null;
  totalLines: number;
  countedLines: number;
  varianceLines: number;
  varianceValue: Numeric;
  adjustmentsPosted: boolean;
  notes: string | null;
  createdAt: string;
  items?: CycleCountItem[];
  _count?: { items: number };
}

export interface VarianceReport {
  countNumber: string;
  status: CountStatus;
  totalLines: number;
  countedLines: number;
  varianceLines: number;
  accuracyPercent: number | null;
  shortages: { count: number; units: number; value: Numeric; lines: CycleCountItem[] };
  overages: { count: number; units: number; value: Numeric; lines: CycleCountItem[] };
  netValue: Numeric;
  pendingRecounts: number;
}

// ------------------------------------------------------------------- quality

export type QcStatus = "PENDING" | "PASSED" | "FAILED" | "PARTIAL";

export interface QualityInspection {
  id: string;
  inspectionNumber: string;
  sku: string;
  batchId: string | null;
  quantityInspected: number;
  quantityPassed: number;
  quantityFailed: number;
  status: QcStatus;
  checklist: Array<Record<string, unknown>> | null;
  failureReason: string | null;
  notes: string | null;
  inspectedAt: string | null;
  createdAt: string;
}

// --------------------------------------------------------------- fulfillment

export type PickStrategy = "SINGLE" | "BATCH" | "ZONE" | "WAVE";
export type PickStatus = "PENDING" | "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export interface PickListItem {
  id: string;
  salesOrderId: string | null;
  sku: string;
  productName?: string;
  unit?: string;
  productBarcode?: string | null;
  batchId: string | null;
  location: string;
  quantityRequested: number;
  quantityPicked: number;
  sequence: number;
  status: PickStatus;
  batch?: { batchNumber: string; expiryDate: string | null } | null;
}

export interface PickList {
  id: string;
  pickNumber: string;
  strategy: PickStrategy;
  status: PickStatus;
  salesOrderIds: string[];
  zoneCode: string | null;
  assignedTo: string | null;
  totalLines: number;
  completedLines: number;
  estimatedDistanceM: number;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  items?: PickListItem[];
  shortfalls?: Array<{ sku: string; short: number; orderId: string }>;
  _count?: { items: number };
}

export type ShipmentStatus =
  | "PENDING"
  | "LABELED"
  | "DISPATCHED"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "RETURNED"
  | "CANCELLED";

export interface Carrier {
  id: string;
  code: string;
  name: string;
  contactPhone: string | null;
  trackingUrlTemplate: string | null;
  isActive: boolean;
}

export interface Shipment {
  id: string;
  shipmentNumber: string;
  salesOrderId: string | null;
  salesInvoiceId: string | null;
  carrierId: string | null;
  trackingNumber: string | null;
  trackingUrl?: string | null;
  status: ShipmentStatus;
  totalWeightKg: Numeric;
  packageCount: number;
  shippingCost: Numeric;
  recipientName: string | null;
  recipientPhone: string | null;
  address: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  carrier?: { code: string; name: string; trackingUrlTemplate: string | null } | null;
  salesInvoice?: { invoiceNumber: string } | null;
  packages?: PackageRecord[];
  _count?: { packages: number };
}

export interface PackageRecord {
  id: string;
  packageNumber: string;
  shipmentId: string | null;
  salesOrderId: string | null;
  weightKg: Numeric;
  lengthCm: Numeric;
  widthCm: Numeric;
  heightCm: Numeric;
  packagingType: string | null;
  barcode: string | null;
  packedAt: string | null;
  items?: Array<{ id: string; sku: string; batchNumber: string | null; quantity: number }>;
}

export interface ShippingLabel {
  shipmentNumber: string;
  trackingNumber: string | null;
  carrier: string | null;
  recipient: { name: string | null; phone: string | null; address: string | null };
  packageCount: number;
  totalWeightKg: Numeric;
  payload: string;
  format: string;
  svg: string;
  packages: Array<{ packageNumber: string; weightKg: Numeric; barcode: string | null; svg: string | null }>;
}

// ----------------------------------------------------------------- analytics

export interface TurnoverReport {
  cogs: Numeric;
  inventoryValue: Numeric;
  turnoverRatio: Numeric | null;
  averageDaysOnHand: number | null;
  fastMovers: Array<{ sku: string; name: string; turnover: number | null; unitsOut: number; onHand: number }>;
  slowMovers: Array<{ sku: string; name: string; turnover: number | null; unitsOut: number; onHand: number }>;
  deadStock: {
    count: number;
    value: Numeric;
    items: Array<{ sku: string; name: string; onHand: number; value: Numeric }>;
  };
}

export interface WmsKpis {
  windowDays: number;
  generatedAt: string;
  turnover: TurnoverReport;
  fulfillment: {
    invoicesShipped: number;
    averageHoursToShip: number | null;
    medianHoursToShip: number | null;
    p90HoursToShip: number | null;
    pickRounds: number;
    averagePickMinutes: number | null;
    averageLinesPerRound: number | null;
  };
  accuracy: {
    pickedLines: number;
    exactLines: number;
    shortLines: number;
    linePickAccuracy: number | null;
    postedInvoices: number;
    cancelledInvoices: number;
    invoiceAccuracy: number | null;
  };
  expiry: {
    trackedBatches: number;
    expiredCount: number;
    expiredValue: Numeric;
    within30Count: number;
    within30Value: Numeric;
    within90Value: Numeric;
    totalAtRisk: Numeric;
  };
  receiving: {
    completedTasks: number;
    pendingTasks: number;
    averageHoursToPutaway: number | null;
    suggestionAcceptanceRate: number | null;
  };
}

export interface ForecastRow {
  sku: string;
  name: string;
  unit: string;
  abcClass: string | null;
  onHand: number;
  onOrder: number;
  dailyRate: number;
  forecastDemand: number;
  daysOfCover: number | null;
  currentReorderLevel: number;
  suggestedReorderPoint: number;
  reorderLevelIsStale: boolean;
  projectedShortfall: number;
  suggestedOrderQuantity: number;
  estimatedCost: Numeric;
  confidence: "high" | "medium" | "low";
  observations: number;
}

export interface ForecastReport {
  leadTimeDays: number;
  horizonDays: number;
  generatedAt: string;
  method: string;
  summary: {
    productsAnalysed: number;
    needingReorder: number;
    estimatedPurchaseValue: Numeric;
    staleReorderLevels: number;
  };
  needsReorder: ForecastRow[];
  all: ForecastRow[];
}

// -------------------------------------------------------------- integrations

export type IntegrationProvider = "ODOO" | "SAP" | "ORACLE" | "SHOPIFY" | "WOOCOMMERCE" | "CUSTOM";

export interface IntegrationConnection {
  id: string;
  provider: IntegrationProvider;
  name: string;
  baseUrl: string | null;
  /** Credentials are never returned — only whether they are set. */
  hasApiKey: boolean;
  hasApiSecret: boolean;
  config: Record<string, unknown> | null;
  syncEntities: string[];
  syncInterval: number;
  status: string;
  lastSyncAt: string | null;
  lastError: string | null;
  isActive: boolean;
  syncLogs?: IntegrationSyncLog[];
}

export interface IntegrationSyncLog {
  id: string;
  direction: "INBOUND" | "OUTBOUND";
  entity: string;
  status: "RUNNING" | "SUCCESS" | "FAILED" | "PARTIAL";
  recordsProcessed: number;
  recordsFailed: number;
  error: string | null;
  startedAt: string;
  finishedAt: string | null;
}

export interface WebhookEndpoint {
  id: string;
  name: string;
  url: string;
  events: string[];
  isActive: boolean;
  lastFiredAt: string | null;
  failureCount: number;
}
