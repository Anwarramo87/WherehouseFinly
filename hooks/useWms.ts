/**
 * React Query bindings for the WMS extension.
 *
 * One file rather than eleven: every hook here is a thin call plus a cache
 * invalidation, and the interesting part is which keys a mutation touches —
 * which is far easier to keep correct when it is all visible at once. Posting
 * an invoice, for example, moves stock, batches and analytics, so it has to
 * invalidate all three.
 */
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import apiClient from "@/lib/api-client";
import { QUERY_GC_TIME, QUERY_STALE_TIME } from "@/lib/query-cache";
import { queryKeys } from "@/lib/query-keys";
import type {
  AllocationPlan,
  BatchLabel,
  BinSuggestion,
  Carrier,
  CycleCount,
  ExpiryDashboard,
  ExpiryRule,
  ForecastReport,
  IntegrationConnection,
  Paginated,
  PickList,
  PriceTier,
  ProductBatch,
  ProductPrice,
  PurchaseInvoice,
  PutawayTask,
  QualityInspection,
  Quote,
  SalesInvoice,
  Shipment,
  ShippingLabel,
  StorageBin,
  TaxRate,
  VarianceReport,
  WarehouseZone,
  WebhookEndpoint,
  WmsKpis,
  ZoneOccupancy,
} from "@/types/wms";

const message = (error: unknown, fallback: string) => {
  const err = error as { response?: { data?: { message?: string; error?: { message?: string } } } };
  return err?.response?.data?.error?.message || err?.response?.data?.message || fallback;
};

/** Stock, batches and every derived report move together. */
const useInvalidateStock = () => {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: queryKeys.inventory.all });
    void qc.invalidateQueries({ queryKey: queryKeys.batches.all });
    void qc.invalidateQueries({ queryKey: queryKeys.expiry.all });
    void qc.invalidateQueries({ queryKey: queryKeys.wmsAnalytics.all });
  };
};

// =========================================================== batches & expiry

export interface BatchFilters {
  page?: number;
  limit?: number;
  sku?: string;
  search?: string;
  status?: string;
  expiringWithinDays?: number;
  onlyInStock?: boolean;
}

export const useBatches = (params?: BatchFilters) =>
  useQuery({
    queryKey: queryKeys.batches.list(params as Record<string, unknown>),
    queryFn: async () => {
      const res = await apiClient.get<Paginated<ProductBatch>>("/batches", { params });
      return res.data;
    },
    staleTime: QUERY_STALE_TIME.RELAXED,
    gcTime: QUERY_GC_TIME.RELAXED,
    placeholderData: keepPreviousData,
  });

export const useBatch = (batchId?: string) =>
  useQuery({
    queryKey: queryKeys.batches.detail(batchId ?? ""),
    queryFn: async () => (await apiClient.get<ProductBatch>(`/batches/${batchId}`)).data,
    enabled: Boolean(batchId),
  });

export const useBatchLabel = (batchId?: string) =>
  useQuery({
    queryKey: queryKeys.batches.label(batchId ?? ""),
    queryFn: async () => (await apiClient.get<BatchLabel>(`/batches/${batchId}/label`)).data,
    enabled: Boolean(batchId),
    // The symbol is derived from immutable batch facts, so it can be held far
    // longer than a stock figure.
    staleTime: QUERY_STALE_TIME.RELAXED,
  });

export const useCreateBatch = () => {
  const invalidate = useInvalidateStock();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) =>
      (await apiClient.post<ProductBatch>("/batches", payload)).data,
    onSuccess: () => {
      toast.success("تم إنشاء الدفعة");
      invalidate();
    },
    onError: (error) => toast.error(message(error, "فشل إنشاء الدفعة")),
  });
};

export const useUpdateBatchStatus = () => {
  const invalidate = useInvalidateStock();
  return useMutation({
    mutationFn: async ({ batchId, status, reason }: { batchId: string; status: string; reason?: string }) =>
      (await apiClient.put<ProductBatch>(`/batches/${batchId}/status`, { status, reason })).data,
    onSuccess: (_data, variables) => {
      toast.success(
        variables.status === "QUARANTINE" ? "تم حجر الدفعة" : "تم تحديث حالة الدفعة",
      );
      invalidate();
    },
    onError: (error) => toast.error(message(error, "فشل تحديث حالة الدفعة")),
  });
};

/** Read-only FEFO preview: what would ship, and what is being held back. */
export const useAllocateBatches = () =>
  useMutation({
    mutationFn: async (payload: { sku: string; quantity: number; location?: string; strategy?: "FEFO" | "FIFO" }) =>
      (await apiClient.post<AllocationPlan>("/batches/allocate", payload)).data,
    onError: (error) => toast.error(message(error, "تعذّر حساب توزيع الدفعات")),
  });

export const useScanBarcode = () =>
  useMutation({
    mutationFn: async (code: string) =>
      (await apiClient.get(`/batches/scan/${encodeURIComponent(code)}`)).data,
    onError: (error) => toast.error(message(error, "لم يُعثر على الكود الممسوح")),
  });

export const useExpiryDashboard = (horizonDays?: number) =>
  useQuery({
    queryKey: queryKeys.expiry.dashboard(horizonDays),
    queryFn: async () =>
      (await apiClient.get<ExpiryDashboard>("/batches/expiry/dashboard", { params: { horizonDays } }))
        .data,
    staleTime: QUERY_STALE_TIME.RELAXED,
  });

export const useExpiryRules = () =>
  useQuery({
    queryKey: queryKeys.expiry.rules(),
    queryFn: async () => (await apiClient.get<ExpiryRule[]>("/batches/expiry/rules")).data,
  });

export const useSaveExpiryRule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ruleId, ...payload }: Partial<ExpiryRule> & { ruleId?: string }) =>
      ruleId
        ? (await apiClient.put<ExpiryRule>(`/batches/expiry/rules/${ruleId}`, payload)).data
        : (await apiClient.post<ExpiryRule>("/batches/expiry/rules", payload)).data,
    onSuccess: () => {
      toast.success("تم حفظ قاعدة التنبيه");
      void qc.invalidateQueries({ queryKey: queryKeys.expiry.all });
    },
    onError: (error) => toast.error(message(error, "فشل حفظ القاعدة")),
  });
};

export const useDeleteExpiryRule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ruleId: string) => apiClient.delete(`/batches/expiry/rules/${ruleId}`),
    onSuccess: () => {
      toast.success("تم حذف القاعدة");
      void qc.invalidateQueries({ queryKey: queryKeys.expiry.all });
    },
    onError: (error) => toast.error(message(error, "فشل حذف القاعدة")),
  });
};

export const useRunExpiryScan = () => {
  const invalidate = useInvalidateStock();
  return useMutation({
    mutationFn: async () =>
      (
        await apiClient.post<{ expired: number; quarantined: number; notified: number; scanned: number }>(
          "/batches/expiry/scan",
        )
      ).data,
    onSuccess: (result) => {
      toast.success(
        `فُحصت ${result.scanned} دفعة — ${result.expired} منتهية، ${result.quarantined} محجورة`,
      );
      invalidate();
    },
    onError: (error) => toast.error(message(error, "فشل تشغيل فحص الصلاحية")),
  });
};

// ====================================================================== pricing

export const useTaxRates = () =>
  useQuery({
    queryKey: queryKeys.pricing.taxRates(),
    queryFn: async () => (await apiClient.get<TaxRate[]>("/pricing/tax-rates")).data,
  });

export const usePriceTiers = () =>
  useQuery({
    queryKey: queryKeys.pricing.tiers(),
    queryFn: async () => (await apiClient.get<PriceTier[]>("/pricing/tiers")).data,
  });

export const useProductPrices = (params?: { sku?: string; priceTierId?: string }) =>
  useQuery({
    queryKey: queryKeys.pricing.productPrices(params),
    queryFn: async () =>
      (await apiClient.get<ProductPrice[]>("/pricing/product-prices", { params })).data,
  });

export const usePricingMutation = <T,>(path: string, successText: string, method: "post" | "put" | "delete" = "post") => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload?: Record<string, unknown>) => {
      if (method === "delete") return (await apiClient.delete<T>(path)).data;
      if (method === "put") return (await apiClient.put<T>(path, payload)).data;
      return (await apiClient.post<T>(path, payload)).data;
    },
    onSuccess: () => {
      toast.success(successText);
      void qc.invalidateQueries({ queryKey: queryKeys.pricing.all });
    },
    onError: (error) => toast.error(message(error, "فشلت العملية")),
  });
};

export const useSaveTaxRate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ taxRateId, ...payload }: Record<string, unknown> & { taxRateId?: string }) =>
      taxRateId
        ? (await apiClient.put<TaxRate>(`/pricing/tax-rates/${taxRateId}`, payload)).data
        : (await apiClient.post<TaxRate>("/pricing/tax-rates", payload)).data,
    onSuccess: () => {
      toast.success("تم حفظ نسبة الضريبة");
      void qc.invalidateQueries({ queryKey: queryKeys.pricing.all });
    },
    onError: (error) => toast.error(message(error, "فشل حفظ الضريبة")),
  });
};

export const useSavePriceTier = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ tierId, ...payload }: Record<string, unknown> & { tierId?: string }) =>
      tierId
        ? (await apiClient.put<PriceTier>(`/pricing/tiers/${tierId}`, payload)).data
        : (await apiClient.post<PriceTier>("/pricing/tiers", payload)).data,
    onSuccess: () => {
      toast.success("تم حفظ فئة التسعير");
      void qc.invalidateQueries({ queryKey: queryKeys.pricing.all });
    },
    onError: (error) => toast.error(message(error, "فشل حفظ فئة التسعير")),
  });
};

export const useUpsertProductPrice = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) =>
      (await apiClient.post<ProductPrice>("/pricing/product-prices", payload)).data,
    onSuccess: () => {
      toast.success("تم حفظ السعر");
      void qc.invalidateQueries({ queryKey: queryKeys.pricing.all });
    },
    onError: (error) => toast.error(message(error, "فشل حفظ السعر")),
  });
};

export const useSeedPricingDefaults = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () =>
      (await apiClient.post<{ message: string; created: string[] }>("/pricing/seed-defaults")).data,
    onSuccess: (result) => {
      toast.success(result.message);
      void qc.invalidateQueries({ queryKey: queryKeys.pricing.all });
    },
    onError: (error) => toast.error(message(error, "فشل إنشاء الإعدادات الافتراضية")),
  });
};

/** Prices a basket without saving — drives the live totals on invoice forms. */
export const useQuote = () =>
  useMutation({
    mutationFn: async (payload: Record<string, unknown>) =>
      (await apiClient.post<Quote>("/pricing/quote", payload)).data,
    onError: (error) => toast.error(message(error, "تعذّر تسعير البنود")),
  });

// ============================================================ purchase invoices

export const usePurchaseInvoices = (params?: Record<string, unknown>) =>
  useQuery({
    queryKey: queryKeys.purchasing.invoices(params),
    queryFn: async () =>
      (await apiClient.get<Paginated<PurchaseInvoice>>("/purchasing/invoices", { params })).data,
    placeholderData: keepPreviousData,
  });

export const usePurchaseInvoice = (invoiceId?: string) =>
  useQuery({
    queryKey: queryKeys.purchasing.invoice(invoiceId ?? ""),
    queryFn: async () =>
      (await apiClient.get<PurchaseInvoice>(`/purchasing/invoices/${invoiceId}`)).data,
    enabled: Boolean(invoiceId),
  });

export const useSuppliers = (params?: Record<string, unknown>) =>
  useQuery({
    queryKey: queryKeys.purchasing.suppliers(params),
    queryFn: async () =>
      (await apiClient.get<Paginated<{ id: string; name: string; phone: string | null; status: string }>>(
        "/purchasing/suppliers",
        { params: { limit: 200, ...params } },
      )).data,
  });

export const usePurchaseOrders = (params?: Record<string, unknown>) =>
  useQuery({
    queryKey: queryKeys.purchasing.orders(params),
    queryFn: async () =>
      (await apiClient.get<Paginated<Record<string, unknown>>>("/purchasing/purchase-orders", { params }))
        .data,
    placeholderData: keepPreviousData,
  });

const usePurchaseInvoiceMutation = <TPayload,>(
  request: (payload: TPayload) => Promise<unknown>,
  successText: string,
  fallback: string,
  movesStock = false,
) => {
  const qc = useQueryClient();
  const invalidateStock = useInvalidateStock();
  return useMutation({
    mutationFn: request,
    onSuccess: () => {
      toast.success(successText);
      void qc.invalidateQueries({ queryKey: queryKeys.purchasing.all });
      if (movesStock) invalidateStock();
    },
    onError: (error) => toast.error(message(error, fallback)),
  });
};

export const useCreatePurchaseInvoice = () =>
  usePurchaseInvoiceMutation(
    async (payload: Record<string, unknown>) =>
      (await apiClient.post<PurchaseInvoice>("/purchasing/invoices", payload)).data,
    "تم إنشاء فاتورة الشراء كمسودة",
    "فشل إنشاء الفاتورة",
  );

export const useUpdatePurchaseInvoice = () =>
  usePurchaseInvoiceMutation(
    async ({ invoiceId, ...payload }: Record<string, unknown> & { invoiceId: string }) =>
      (await apiClient.put(`/purchasing/invoices/${invoiceId}`, payload)).data,
    "تم تحديث الفاتورة",
    "فشل تحديث الفاتورة",
  );

/** The irreversible one: stock, batches and weighted-average cost all move. */
export const usePostPurchaseInvoice = () =>
  usePurchaseInvoiceMutation(
    async (invoiceId: string) => (await apiClient.post(`/purchasing/invoices/${invoiceId}/post`)).data,
    "تم ترحيل الفاتورة — تحدّث المخزون والتكلفة",
    "فشل ترحيل الفاتورة",
    true,
  );

export const useCancelPurchaseInvoice = () =>
  usePurchaseInvoiceMutation(
    async ({ invoiceId, reason }: { invoiceId: string; reason: string }) =>
      (await apiClient.post(`/purchasing/invoices/${invoiceId}/cancel`, { reason })).data,
    "تم إلغاء الفاتورة",
    "فشل إلغاء الفاتورة",
    true,
  );

export const useAddLandedCost = () =>
  usePurchaseInvoiceMutation(
    async ({ invoiceId, ...payload }: Record<string, unknown> & { invoiceId: string }) =>
      (await apiClient.post(`/purchasing/invoices/${invoiceId}/landed-costs`, payload)).data,
    "تمت إضافة المصروف الملحق",
    "فشل إضافة المصروف",
  );

export const useAddPurchasePayment = () =>
  usePurchaseInvoiceMutation(
    async ({ invoiceId, ...payload }: Record<string, unknown> & { invoiceId: string }) =>
      (await apiClient.post(`/purchasing/invoices/${invoiceId}/payments`, payload)).data,
    "تم تسجيل الدفعة",
    "فشل تسجيل الدفعة",
  );

// =============================================================== sales invoices

export const useSalesInvoices = (params?: Record<string, unknown>) =>
  useQuery({
    queryKey: queryKeys.salesDomain.invoices(params),
    queryFn: async () =>
      (await apiClient.get<Paginated<SalesInvoice>>("/sales/invoices", { params })).data,
    placeholderData: keepPreviousData,
  });

export const useSalesInvoice = (invoiceId?: string) =>
  useQuery({
    queryKey: queryKeys.salesDomain.invoice(invoiceId ?? ""),
    queryFn: async () => (await apiClient.get<SalesInvoice>(`/sales/invoices/${invoiceId}`)).data,
    enabled: Boolean(invoiceId),
  });

export const useCustomers = (params?: Record<string, unknown>) =>
  useQuery({
    queryKey: queryKeys.salesDomain.customers(params),
    queryFn: async () =>
      (await apiClient.get<Paginated<{ id: string; name: string; phone: string | null; status: string }>>(
        "/sales/customers",
        { params: { limit: 200, ...params } },
      )).data,
  });

export const useSalesOrders = (params?: Record<string, unknown>) =>
  useQuery({
    queryKey: queryKeys.salesDomain.orders(params),
    queryFn: async () =>
      (await apiClient.get<Paginated<Record<string, unknown>>>("/sales/orders", { params })).data,
    placeholderData: keepPreviousData,
  });

export const useDeliveryNotes = (params?: Record<string, unknown>) =>
  useQuery({
    queryKey: queryKeys.salesDomain.deliveryNotes(params),
    queryFn: async () =>
      (await apiClient.get<Paginated<Record<string, unknown>>>("/sales/invoices/delivery-notes", {
        params,
      })).data,
  });

const useSalesInvoiceMutation = <TPayload,>(
  request: (payload: TPayload) => Promise<unknown>,
  successText: string,
  fallback: string,
  movesStock = false,
) => {
  const qc = useQueryClient();
  const invalidateStock = useInvalidateStock();
  return useMutation({
    mutationFn: request,
    onSuccess: () => {
      toast.success(successText);
      void qc.invalidateQueries({ queryKey: queryKeys.salesDomain.all });
      if (movesStock) invalidateStock();
    },
    onError: (error) => toast.error(message(error, fallback)),
  });
};

export const useCreateSalesInvoice = () =>
  useSalesInvoiceMutation(
    async (payload: Record<string, unknown>) =>
      (await apiClient.post<SalesInvoice>("/sales/invoices", payload)).data,
    "تم إنشاء فاتورة البيع كمسودة",
    "فشل إنشاء الفاتورة",
  );

export const useUpdateSalesInvoice = () =>
  useSalesInvoiceMutation(
    async ({ invoiceId, ...payload }: Record<string, unknown> & { invoiceId: string }) =>
      (await apiClient.put(`/sales/invoices/${invoiceId}`, payload)).data,
    "تم تحديث الفاتورة",
    "فشل تحديث الفاتورة",
  );

/** Deducts stock through FEFO and issues the delivery note. */
export const usePostSalesInvoice = () =>
  useSalesInvoiceMutation(
    async (invoiceId: string) => (await apiClient.post(`/sales/invoices/${invoiceId}/post`)).data,
    "تم ترحيل الفاتورة — خُصم المخزون وصدر إذن الخروج",
    "فشل ترحيل الفاتورة",
    true,
  );

export const useCancelSalesInvoice = () =>
  useSalesInvoiceMutation(
    async ({ invoiceId, reason }: { invoiceId: string; reason: string }) =>
      (await apiClient.post(`/sales/invoices/${invoiceId}/cancel`, { reason })).data,
    "تم إلغاء الفاتورة",
    "فشل إلغاء الفاتورة",
    true,
  );

export const useAddSalesPayment = () =>
  useSalesInvoiceMutation(
    async ({ invoiceId, ...payload }: Record<string, unknown> & { invoiceId: string }) =>
      (await apiClient.post(`/sales/invoices/${invoiceId}/payments`, payload)).data,
    "تم تسجيل الدفعة",
    "فشل تسجيل الدفعة",
  );

// ==================================================================== locations

export const useZones = (warehouseId?: string) =>
  useQuery({
    queryKey: queryKeys.locations.zones(warehouseId),
    queryFn: async () =>
      (await apiClient.get<WarehouseZone[]>("/locations/zones", { params: { warehouseId } })).data,
  });

export const useBins = (params?: Record<string, unknown>) =>
  useQuery({
    queryKey: queryKeys.locations.bins(params),
    queryFn: async () =>
      (await apiClient.get<Paginated<StorageBin>>("/locations/bins", { params })).data,
    placeholderData: keepPreviousData,
  });

export const useOccupancy = (warehouseId?: string) =>
  useQuery({
    queryKey: queryKeys.locations.occupancy(warehouseId),
    queryFn: async () =>
      (await apiClient.get<ZoneOccupancy[]>("/locations/occupancy", { params: { warehouseId } })).data,
  });

export const usePutawayTasks = (params?: Record<string, unknown>) =>
  useQuery({
    queryKey: queryKeys.locations.putaway(params),
    queryFn: async () =>
      (await apiClient.get<Paginated<PutawayTask>>("/locations/putaway/tasks", { params })).data,
  });

const useLocationsMutation = <TPayload,>(
  request: (payload: TPayload) => Promise<unknown>,
  successText: string,
  fallback: string,
  movesStock = false,
) => {
  const qc = useQueryClient();
  const invalidateStock = useInvalidateStock();
  return useMutation({
    mutationFn: request,
    onSuccess: () => {
      toast.success(successText);
      void qc.invalidateQueries({ queryKey: queryKeys.locations.all });
      if (movesStock) invalidateStock();
    },
    onError: (error) => toast.error(message(error, fallback)),
  });
};

export const useSaveZone = () =>
  useLocationsMutation(
    async ({ zoneId, ...payload }: Record<string, unknown> & { zoneId?: string }) =>
      zoneId
        ? (await apiClient.put(`/locations/zones/${zoneId}`, payload)).data
        : (await apiClient.post("/locations/zones", payload)).data,
    "تم حفظ المنطقة",
    "فشل حفظ المنطقة",
  );

export const useSaveBin = () =>
  useLocationsMutation(
    async ({ binId, ...payload }: Record<string, unknown> & { binId?: string }) =>
      binId
        ? (await apiClient.put(`/locations/bins/${binId}`, payload)).data
        : (await apiClient.post("/locations/bins", payload)).data,
    "تم حفظ الخانة",
    "فشل حفظ الخانة",
  );

export const useBulkCreateBins = () =>
  useLocationsMutation(
    async (payload: Record<string, unknown>) =>
      (await apiClient.post<{ message: string; created: number }>("/locations/bins/bulk", payload)).data,
    "تم توليد الخانات",
    "فشل توليد الخانات",
  );

export const useSuggestPutaway = () =>
  useMutation({
    mutationFn: async (payload: { sku: string; quantity: number; warehouseId?: string }) =>
      (
        await apiClient.post<{ sku: string; quantity: number; suggestions: BinSuggestion[]; best: BinSuggestion | null }>(
          "/locations/putaway/suggest",
          payload,
        )
      ).data,
    onError: (error) => toast.error(message(error, "تعذّر اقتراح موقع تخزين")),
  });

export const useCreatePutawayTask = () =>
  useLocationsMutation(
    async (payload: Record<string, unknown>) =>
      (await apiClient.post<PutawayTask>("/locations/putaway/tasks", payload)).data,
    "تم إنشاء مهمة التخزين",
    "فشل إنشاء المهمة",
  );

export const useCompletePutaway = () =>
  useLocationsMutation(
    async ({ taskId, actualBin }: { taskId: string; actualBin?: string }) =>
      (await apiClient.post(`/locations/putaway/tasks/${taskId}/complete`, { actualBin })).data,
    "تم تنفيذ التخزين ونقل الكمية",
    "فشل تنفيذ المهمة",
    true,
  );

// ================================================================ cycle counts

export const useCycleCounts = (params?: Record<string, unknown>) =>
  useQuery({
    queryKey: queryKeys.cycleCounts.list(params),
    queryFn: async () =>
      (await apiClient.get<Paginated<CycleCount>>("/cycle-counts", { params })).data,
    placeholderData: keepPreviousData,
  });

export const useCycleCount = (countId?: string) =>
  useQuery({
    queryKey: queryKeys.cycleCounts.detail(countId ?? ""),
    queryFn: async () => (await apiClient.get<CycleCount>(`/cycle-counts/${countId}`)).data,
    enabled: Boolean(countId),
  });

export const useVarianceReport = (countId?: string) =>
  useQuery({
    queryKey: queryKeys.cycleCounts.variances(countId ?? ""),
    queryFn: async () =>
      (await apiClient.get<VarianceReport>(`/cycle-counts/${countId}/variances`)).data,
    enabled: Boolean(countId),
  });

const useCountMutation = <TPayload,>(
  request: (payload: TPayload) => Promise<unknown>,
  successText: string,
  fallback: string,
  movesStock = false,
) => {
  const qc = useQueryClient();
  const invalidateStock = useInvalidateStock();
  return useMutation({
    mutationFn: request,
    onSuccess: () => {
      toast.success(successText);
      void qc.invalidateQueries({ queryKey: queryKeys.cycleCounts.all });
      if (movesStock) invalidateStock();
    },
    onError: (error) => toast.error(message(error, fallback)),
  });
};

export const useCreateCycleCount = () =>
  useCountMutation(
    async (payload: Record<string, unknown>) =>
      (await apiClient.post<CycleCount>("/cycle-counts", payload)).data,
    "تم فتح جرد جديد",
    "فشل إنشاء الجرد",
  );

export const useStartCycleCount = () =>
  useCountMutation(
    async (countId: string) => (await apiClient.post(`/cycle-counts/${countId}/start`)).data,
    "بدأ الجرد",
    "فشل بدء الجرد",
  );

export const useRecordCount = () =>
  useCountMutation(
    async ({ countId, lines }: { countId: string; lines: Array<{ itemId: string; countedQuantity: number; notes?: string }> }) =>
      (await apiClient.post(`/cycle-counts/${countId}/record`, { lines })).data,
    "تم تسجيل الجرد",
    "فشل تسجيل الجرد",
  );

/** Posts the variances into the stock ledger. Irreversible. */
export const useApproveCycleCount = () =>
  useCountMutation(
    async ({ countId, force }: { countId: string; force?: boolean }) =>
      (await apiClient.post(`/cycle-counts/${countId}/approve`, { force })).data,
    "أُقفل الجرد وطُبِّقت التسويات",
    "فشل إقفال الجرد",
    true,
  );

export const useRunAbcAnalysis = () =>
  useCountMutation(
    async (days?: number) => (await apiClient.post("/cycle-counts/abc-analysis", { days })).data,
    "تم تحديث تصنيف ABC",
    "فشل تحليل ABC",
    true,
  );

// ===================================================================== quality

export const useInspections = (params?: Record<string, unknown>) =>
  useQuery({
    queryKey: queryKeys.quality.list(params),
    queryFn: async () =>
      (await apiClient.get<Paginated<QualityInspection>>("/quality/inspections", { params })).data,
  });

export const usePendingQc = () =>
  useQuery({
    queryKey: queryKeys.quality.pending(),
    queryFn: async () =>
      (
        await apiClient.get<{
          pendingInspections: number;
          quarantinedBatches: number;
          quarantinedUnits: number;
          inspections: QualityInspection[];
          quarantined: ProductBatch[];
        }>("/quality/pending")
      ).data,
  });

export const useCreateInspection = () => {
  const qc = useQueryClient();
  const invalidateStock = useInvalidateStock();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) =>
      (await apiClient.post<QualityInspection>("/quality/inspections", payload)).data,
    onSuccess: () => {
      toast.success("فُتح فحص جودة وحُجرت الدفعة");
      void qc.invalidateQueries({ queryKey: queryKeys.quality.all });
      invalidateStock();
    },
    onError: (error) => toast.error(message(error, "فشل فتح الفحص")),
  });
};

export const useRecordInspection = () => {
  const qc = useQueryClient();
  const invalidateStock = useInvalidateStock();
  return useMutation({
    mutationFn: async ({ inspectionId, ...payload }: Record<string, unknown> & { inspectionId: string }) =>
      (await apiClient.post(`/quality/inspections/${inspectionId}/record`, payload)).data,
    onSuccess: () => {
      toast.success("تم تسجيل نتيجة الفحص");
      void qc.invalidateQueries({ queryKey: queryKeys.quality.all });
      invalidateStock();
    },
    onError: (error) => toast.error(message(error, "فشل تسجيل النتيجة")),
  });
};

// ================================================================= fulfillment

export const usePickLists = (params?: Record<string, unknown>) =>
  useQuery({
    queryKey: queryKeys.fulfillment.pickLists(params),
    queryFn: async () =>
      (await apiClient.get<Paginated<PickList>>("/fulfillment/pick-lists", { params })).data,
    placeholderData: keepPreviousData,
  });

export const usePickList = (pickListId?: string) =>
  useQuery({
    queryKey: queryKeys.fulfillment.pickList(pickListId ?? ""),
    queryFn: async () =>
      (await apiClient.get<PickList>(`/fulfillment/pick-lists/${pickListId}`)).data,
    enabled: Boolean(pickListId),
  });

export const usePickPerformance = (days?: number) =>
  useQuery({
    queryKey: queryKeys.fulfillment.performance(days),
    queryFn: async () =>
      (await apiClient.get("/fulfillment/pick-lists/performance", { params: { days } })).data,
  });

export const useCarriers = () =>
  useQuery({
    queryKey: queryKeys.fulfillment.carriers(),
    queryFn: async () => (await apiClient.get<Carrier[]>("/fulfillment/carriers")).data,
  });

export const useShipments = (params?: Record<string, unknown>) =>
  useQuery({
    queryKey: queryKeys.fulfillment.shipments(params),
    queryFn: async () =>
      (await apiClient.get<Paginated<Shipment>>("/fulfillment/shipments", { params })).data,
    placeholderData: keepPreviousData,
  });

const useFulfillmentMutation = <TPayload,>(
  request: (payload: TPayload) => Promise<unknown>,
  successText: string,
  fallback: string,
) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: request,
    onSuccess: () => {
      toast.success(successText);
      void qc.invalidateQueries({ queryKey: queryKeys.fulfillment.all });
    },
    onError: (error) => toast.error(message(error, fallback)),
  });
};

export const useCreatePickList = () =>
  useFulfillmentMutation(
    async (payload: Record<string, unknown>) =>
      (await apiClient.post<PickList>("/fulfillment/pick-lists", payload)).data,
    "تم إنشاء جولة الالتقاط",
    "فشل إنشاء الجولة",
  );

export const useStartPickList = () =>
  useFulfillmentMutation(
    async (pickListId: string) =>
      (await apiClient.post(`/fulfillment/pick-lists/${pickListId}/start`)).data,
    "بدأت الجولة",
    "فشل بدء الجولة",
  );

export const useRecordPicks = () =>
  useFulfillmentMutation(
    async ({ pickListId, lines }: { pickListId: string; lines: Array<{ itemId: string; quantityPicked: number }> }) =>
      (await apiClient.post(`/fulfillment/pick-lists/${pickListId}/record`, { lines })).data,
    "تم تسجيل الالتقاط",
    "فشل تسجيل الالتقاط",
  );

export const useSaveCarrier = () =>
  useFulfillmentMutation(
    async ({ carrierId, ...payload }: Record<string, unknown> & { carrierId?: string }) =>
      carrierId
        ? (await apiClient.put(`/fulfillment/carriers/${carrierId}`, payload)).data
        : (await apiClient.post("/fulfillment/carriers", payload)).data,
    "تم حفظ شركة الشحن",
    "فشل حفظ شركة الشحن",
  );

export const useCreateShipment = () =>
  useFulfillmentMutation(
    async (payload: Record<string, unknown>) =>
      (await apiClient.post<Shipment>("/fulfillment/shipments", payload)).data,
    "تم إنشاء الشحنة",
    "فشل إنشاء الشحنة",
  );

export const useCreatePackage = () =>
  useFulfillmentMutation(
    async (payload: Record<string, unknown>) =>
      (await apiClient.post("/fulfillment/packages", payload)).data,
    "تم تسجيل الطرد",
    "فشل تسجيل الطرد",
  );

export const useGenerateShippingLabel = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (shipmentId: string) =>
      (await apiClient.post<ShippingLabel>(`/fulfillment/shipments/${shipmentId}/label`)).data,
    onSuccess: () => {
      toast.success("تم توليد ملصق الشحن");
      void qc.invalidateQueries({ queryKey: queryKeys.fulfillment.all });
    },
    onError: (error) => toast.error(message(error, "فشل توليد الملصق")),
  });
};

export const useUpdateShipmentStatus = () =>
  useFulfillmentMutation(
    async ({ shipmentId, ...payload }: Record<string, unknown> & { shipmentId: string }) =>
      (await apiClient.put(`/fulfillment/shipments/${shipmentId}/status`, payload)).data,
    "تم تحديث حالة الشحنة",
    "فشل تحديث الحالة",
  );

// =================================================================== analytics

export const useWmsKpis = (days?: number) =>
  useQuery({
    queryKey: queryKeys.wmsAnalytics.kpis(days),
    queryFn: async () =>
      (await apiClient.get<WmsKpis>("/wms/analytics/kpis", { params: { days } })).data,
    staleTime: QUERY_STALE_TIME.RELAXED,
  });

export const useForecast = (params?: { leadTimeDays?: number; horizonDays?: number }) =>
  useQuery({
    queryKey: queryKeys.wmsAnalytics.forecast(params),
    queryFn: async () =>
      (await apiClient.get<ForecastReport>("/wms/analytics/forecast", { params })).data,
    staleTime: QUERY_STALE_TIME.RELAXED,
  });

export const useSupplierScorecard = (days?: number) =>
  useQuery({
    queryKey: queryKeys.wmsAnalytics.suppliers(days),
    queryFn: async () =>
      (await apiClient.get("/wms/analytics/suppliers", { params: { days } })).data,
  });

// ================================================================ integrations

export const useIntegrations = () =>
  useQuery({
    queryKey: queryKeys.integrations.connections(),
    queryFn: async () =>
      (await apiClient.get<IntegrationConnection[]>("/integrations/connections")).data,
  });

export const useWebhooks = () =>
  useQuery({
    queryKey: queryKeys.integrations.webhooks(),
    queryFn: async () => (await apiClient.get<WebhookEndpoint[]>("/integrations/webhooks")).data,
  });

const useIntegrationMutation = <TPayload,>(
  request: (payload: TPayload) => Promise<unknown>,
  successText: string,
  fallback: string,
) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: request,
    onSuccess: () => {
      toast.success(successText);
      void qc.invalidateQueries({ queryKey: queryKeys.integrations.all });
    },
    onError: (error) => toast.error(message(error, fallback)),
  });
};

export const useSaveIntegration = () =>
  useIntegrationMutation(
    async ({ connectionId, ...payload }: Record<string, unknown> & { connectionId?: string }) =>
      connectionId
        ? (await apiClient.put(`/integrations/connections/${connectionId}`, payload)).data
        : (await apiClient.post("/integrations/connections", payload)).data,
    "تم حفظ الاتصال",
    "فشل حفظ الاتصال",
  );

export const useDeleteIntegration = () =>
  useIntegrationMutation(
    async (connectionId: string) => apiClient.delete(`/integrations/connections/${connectionId}`),
    "تم حذف الاتصال",
    "فشل حذف الاتصال",
  );

export const useTestIntegration = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (connectionId: string) =>
      (
        await apiClient.post<{ ok: boolean; status: number | null; latencyMs: number; message: string }>(
          `/integrations/connections/${connectionId}/test`,
        )
      ).data,
    onSuccess: (result) => {
      if (result.ok) toast.success(`الاتصال ناجح (${result.latencyMs}ms)`);
      else toast.error(`فشل الاتصال: ${result.message}`);
      void qc.invalidateQueries({ queryKey: queryKeys.integrations.all });
    },
    onError: (error) => toast.error(message(error, "تعذّر اختبار الاتصال")),
  });
};

export const usePushStock = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (connectionId: string) =>
      (
        await apiClient.post<{ ok: boolean; pushed: number; error?: string }>(
          `/integrations/connections/${connectionId}/push-stock`,
        )
      ).data,
    onSuccess: (result) => {
      if (result.ok) toast.success(`تمت مزامنة ${result.pushed} صنف`);
      else toast.error(`فشلت المزامنة: ${result.error ?? ""}`);
      void qc.invalidateQueries({ queryKey: queryKeys.integrations.all });
    },
    onError: (error) => toast.error(message(error, "فشلت المزامنة")),
  });
};

export const useSaveWebhook = () =>
  useIntegrationMutation(
    async (payload: Record<string, unknown>) =>
      (await apiClient.post("/integrations/webhooks", payload)).data,
    "تم حفظ الـ webhook",
    "فشل حفظ الـ webhook",
  );

export const useDeleteWebhook = () =>
  useIntegrationMutation(
    async (webhookId: string) => apiClient.delete(`/integrations/webhooks/${webhookId}`),
    "تم حذف الـ webhook",
    "فشل الحذف",
  );
