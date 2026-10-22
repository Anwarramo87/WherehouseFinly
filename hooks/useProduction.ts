"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import apiClient from "@/lib/api-client";
import { QUERY_GC_TIME, QUERY_STALE_TIME } from "@/lib/query-cache";
import { queryKeys } from "@/lib/query-keys";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type ProductionStageType = "CUTTING" | "SEWING" | "ASSEMBLY" | "FINISHED";
export type ProductionStageStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "REJECTED";

export interface ProductionStageView {
  stageType: ProductionStageType;
  label: string;
  status: ProductionStageStatus;
  responsibleId: string | null;
  startedAt: string | null;
  completedAt: string | null;
  inputQty: number;
  outputQty: number;
  wasteQty: number;
  defectiveQty: number;
  notes: string | null;
  stageCost: number;
}

export interface ProductionVariantView {
  id: string;
  color: string;
  size: string;
  quantity: number;
  cutQty: number;
  sewnQty: number;
  packedQty: number;
  finishedQty: number;
}

export interface ProductionBatchView {
  id: string;
  batchNumber: string;
  name: string | null;
  productSku: string;
  productType: string | null;
  plannedQty: number;
  actualQty: number;
  wasteQty: number;
  status: string;
  plannedDate: string;
  createdDate: string | null;
  variants: ProductionVariantView[];
  stages: ProductionStageView[];
  currentStage: ProductionStageType | null;
  currentStageLabel: string | null;
  completedStages: number;
  totalStages: number;
  progressPercent: number;
  isInProgress: boolean;
  isCompleted: boolean;
}

export interface ProductionCostView {
  id: string;
  productionOrderId: string;
  materialCost: number;
  directCost: number;
  overheadCost: number;
  totalActualCost: number;
  unitActualCost: number;
  unitFinalCost: number;
  goodQty: number;
  wasteQty: number;
  defectiveQty: number;
  currency: string;
  exchangeRate: number;
  exchangeRateDate: string | null;
  isLocked: boolean;
}

export interface ProductionWarehouseView {
  id: string;
  name: string;
  code: string;
  stageType: ProductionStageType | null;
  stageLabel: string | null;
  location: string | null;
  isActive: boolean;
  balances: Array<{ sku: string; quantity: number; available: number; reserved: number }>;
  totalQuantity: number;
}

export interface CreateBatchPayload {
  name: string;
  productSku: string;
  productType?: string;
  totalQty: number;
  createdDate?: string;
  bomId?: string;
  notes?: string;
  variants?: Array<{ color: string; size: string; quantity: number }>;
}

export interface BatchListParams {
  search?: string;
  productSku?: string;
  stageType?: ProductionStageType;
  stageStatus?: ProductionStageStatus;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
  /**
   * The query key wants a plain record. The typed fields above are spread
   * into it so a caller cannot accidentally pass an unserialisable value.
   */
  [key: string]: unknown;
}

// ─────────────────────────────────────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────────────────────────────────────

/** لوحة الإنتاج — الإجماليات وخط سير كل دفعة. */
export function useProductionDashboard() {
  return useQuery({
    queryKey: queryKeys.manufacturing.dashboard(),
    queryFn: async () => {
      const res = await apiClient.get<{
        totals: { all: number; inProgress: number; completed: number; late: number; pending: number };
        batches: ProductionBatchView[];
      }>("/manufacturing/dashboard");
      return res.data;
    },
    staleTime: QUERY_STALE_TIME.STANDARD,
    gcTime: QUERY_GC_TIME.STANDARD,
  });
}

/** قائمة الدفعات مع البحث والتصفية. */
export function useProductionBatches(params: BatchListParams = {}) {
  return useQuery({
    queryKey: queryKeys.manufacturing.batches(params),
    queryFn: async () => {
      const res = await apiClient.get<{
        data: ProductionBatchView[];
        pagination: { page: number; limit: number; total: number; totalPages: number };
      }>("/manufacturing/batches", { params });
      return res.data;
    },
    staleTime: QUERY_STALE_TIME.STANDARD,
    gcTime: QUERY_GC_TIME.STANDARD,
  });
}

/** تفاصيل دفعة — خط السير، التكلفة، سجل الحركات وسجل التدقيق. */
export function useProductionBatch(id: string | null) {
  return useQuery({
    queryKey: queryKeys.manufacturing.batch(id ?? ""),
    queryFn: async () => {
      const res = await apiClient.get<ProductionBatchView & {
        cost: ProductionCostView | null;
        transfers: Array<Record<string, unknown>>;
        audit: Array<Record<string, unknown>>;
      }>(`/manufacturing/batches/${id}`);
      return res.data;
    },
    enabled: !!id,
    staleTime: QUERY_STALE_TIME.STANDARD,
    gcTime: QUERY_GC_TIME.STANDARD,
  });
}

/** المستودعات الفرعية للإنتاج. */
export function useProductionWarehouses() {
  return useQuery({
    queryKey: queryKeys.manufacturing.warehouses(),
    queryFn: async () => {
      const res = await apiClient.get<{ data: ProductionWarehouseView[] }>(
        "/manufacturing/warehouses",
      );
      return res.data?.data ?? [];
    },
    staleTime: QUERY_STALE_TIME.STANDARD,
    gcTime: QUERY_GC_TIME.STANDARD,
  });
}

/** أرصدة المستودعات. */
export function useProductionWarehouseBalances(warehouseId?: string) {
  return useQuery({
    queryKey: queryKeys.manufacturing.warehouseBalances(warehouseId),
    queryFn: async () => {
      const res = await apiClient.get<{
        data: Array<{
          warehouseId: string;
          warehouseName: string;
          code: string;
          stageType: ProductionStageType | null;
          stageLabel: string | null;
          items: Array<{ sku: string; quantity: number; available: number; reserved: number }>;
          totalQuantity: number;
        }>;
      }>("/manufacturing/warehouses/balances", { params: { warehouseId } });
      return res.data?.data ?? [];
    },
    staleTime: QUERY_STALE_TIME.STANDARD,
    gcTime: QUERY_GC_TIME.STANDARD,
  });
}

/** One row of the production-warehouse transfer log. */
export interface StockTransferRow {
  id: string;
  transferNumber: string;
  sku: string;
  quantity: number;
  referenceType: string | null;
  referenceId: string | null;
  notes: string | null;
  createdAt: string;
  fromWarehouse?: { code: string; name: string } | null;
  toWarehouse?: { code: string; name: string } | null;
}

/** سجل حركات النقل بين المستودعات. */
export function useStockTransfers(params: { sku?: string; from?: string; to?: string } = {}) {
  return useQuery({
    queryKey: queryKeys.manufacturing.transfers(params),
    queryFn: async () => {
      const res = await apiClient.get<{ data: StockTransferRow[] }>(
        "/manufacturing/transfers",
        { params },
      );
      return res.data?.data ?? [];
    },
    staleTime: QUERY_STALE_TIME.STANDARD,
    gcTime: QUERY_GC_TIME.STANDARD,
  });
}

/** تقرير تكلفة دفعة. */
export function useProductionCostReport(id: string | null) {
  return useQuery({
    queryKey: queryKeys.manufacturing.costReport(id ?? ""),
    queryFn: async () => {
      const res = await apiClient.get<Record<string, unknown>>(
        `/manufacturing/batches/${id}/cost-report`,
      );
      return res.data;
    },
    enabled: !!id,
    staleTime: QUERY_STALE_TIME.STANDARD,
    gcTime: QUERY_GC_TIME.STANDARD,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────────────────────────────────────

/** يبطل كل استعلامات الإنتاج بعد أي تعديل — حتى لا تبقى الأرقام قديمة على الشاشة. */
function useInvalidateProduction() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: queryKeys.manufacturing.all });
  };
}

export function useCreateProductionBatch() {
  const invalidate = useInvalidateProduction();
  return useMutation({
    mutationFn: async (payload: CreateBatchPayload) => {
      const res = await apiClient.post("/manufacturing/batches", payload);
      return res.data;
    },
    onSuccess: (data: { batchNumber?: string }) => {
      invalidate();
      toast.success(`تم إنشاء دفعة الإنتاج ${data?.batchNumber ?? ""}`);
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(error?.response?.data?.message ?? "تعذّر إنشاء دفعة الإنتاج");
    },
  });
}

/** استلام الدفعة في مرحلة. */
export function useStartProductionStage() {
  const invalidate = useInvalidateProduction();
  return useMutation({
    mutationFn: async (input: {
      batchId: string;
      stage: ProductionStageType;
      responsibleId?: string;
      inputQty: number;
      notes?: string;
    }) => {
      const res = await apiClient.post(
        `/manufacturing/batches/${input.batchId}/stages/${input.stage}/start`,
        { responsibleId: input.responsibleId, inputQty: input.inputQty, notes: input.notes },
      );
      return res.data;
    },
    onSuccess: () => {
      invalidate();
      toast.success("تم استلام الدفعة في المرحلة");
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(error?.response?.data?.message ?? "تعذّر استلام الدفعة");
    },
  });
}

/** إنجاز مرحلة. */
export function useCompleteProductionStage() {
  const invalidate = useInvalidateProduction();
  return useMutation({
    mutationFn: async (input: {
      batchId: string;
      stage: ProductionStageType;
      outputQty: number;
      wasteQty?: number;
      defectiveQty?: number;
      notes?: string;
      stageCost?: number;
    }) => {
      const res = await apiClient.post(
        `/manufacturing/batches/${input.batchId}/stages/${input.stage}/complete`,
        {
          outputQty: input.outputQty,
          wasteQty: input.wasteQty,
          defectiveQty: input.defectiveQty,
          notes: input.notes,
          stageCost: input.stageCost,
        },
      );
      return res.data;
    },
    onSuccess: () => {
      invalidate();
      toast.success("تم إنجاز المرحلة");
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(error?.response?.data?.message ?? "تعذّر إنجاز المرحلة");
    },
  });
}

/** إرجاع موثّق إلى مرحلة سابقة. */
export function useReturnProductionStage() {
  const invalidate = useInvalidateProduction();
  return useMutation({
    mutationFn: async (input: {
      batchId: string;
      stageType: ProductionStageType;
      reason: string;
    }) => {
      const res = await apiClient.post(
        `/manufacturing/batches/${input.batchId}/stages/return`,
        { stageType: input.stageType, reason: input.reason },
      );
      return res.data;
    },
    onSuccess: () => {
      invalidate();
      toast.success("تم إرجاع الدفعة إلى المرحلة السابقة");
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(error?.response?.data?.message ?? "تعذّر إرجاع الدفعة");
    },
  });
}

/** احتساب تكلفة الدفعة. */
export function useCalculateProductionCost() {
  const invalidate = useInvalidateProduction();
  return useMutation({
    mutationFn: async (input: {
      batchId: string;
      directCost?: number;
      overheadCost?: number;
      currency?: string;
      exchangeRate?: number;
      exchangeRateDate?: string;
    }) => {
      const res = await apiClient.post(`/manufacturing/batches/${input.batchId}/cost`, {
        directCost: input.directCost,
        overheadCost: input.overheadCost,
        currency: input.currency,
        exchangeRate: input.exchangeRate,
        exchangeRateDate: input.exchangeRateDate,
      });
      return res.data;
    },
    onSuccess: () => {
      invalidate();
      toast.success("تم احتساب تكلفة الدفعة");
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(error?.response?.data?.message ?? "تعذّر احتساب التكلفة");
    },
  });
}

export function useLockProductionCost() {
  const invalidate = useInvalidateProduction();
  return useMutation({
    mutationFn: async (batchId: string) => {
      const res = await apiClient.post(`/manufacturing/batches/${batchId}/cost/lock`);
      return res.data;
    },
    onSuccess: () => {
      invalidate();
      toast.success("تم قفل تكلفة الدفعة");
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(error?.response?.data?.message ?? "تعذّر قفل التكلفة");
    },
  });
}

export function useUnlockProductionCost() {
  const invalidate = useInvalidateProduction();
  return useMutation({
    mutationFn: async (batchId: string) => {
      const res = await apiClient.post(`/manufacturing/batches/${batchId}/cost/unlock`);
      return res.data;
    },
    onSuccess: () => {
      invalidate();
      toast.success("تم فتح قفل التكلفة");
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(error?.response?.data?.message ?? "تعذّر فتح قفل التكلفة");
    },
  });
}

/** نقل مخزون بين مستودعات الإنتاج. */
export function useCreateStockTransfer() {
  const invalidate = useInvalidateProduction();
  return useMutation({
    mutationFn: async (payload: {
      fromWarehouseId: string;
      toWarehouseId: string;
      sku: string;
      quantity: number;
      referenceType?: string;
      referenceId?: string;
      notes?: string;
    }) => {
      const res = await apiClient.post("/manufacturing/transfers", payload);
      return res.data;
    },
    onSuccess: () => {
      invalidate();
      toast.success("تم نقل المخزون");
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(error?.response?.data?.message ?? "تعذّر نقل المخزون");
    },
  });
}
