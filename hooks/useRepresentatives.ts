"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import apiClient from "@/lib/api-client";
import { QUERY_GC_TIME, QUERY_STALE_TIME } from "@/lib/query-cache";
import { queryKeys } from "@/lib/query-keys";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface RepSummary {
  stockValue: number;
  totalSold: number;
  totalCollected: number;
  outstanding: number;
  pendingReturns: number;
  lastSettlement?: { periodEnd: string; status: string; outstandingAmount: number } | null;
}

export interface Representative {
  id: string;
  name: string;
  code: string;
  phone?: string;
  email?: string;
  status: string;
  userId: string;
  user?: { username: string; email?: string };
  summary?: RepSummary;
  // Relations returned by getRepresentative() endpoint
  customers?: Array<{ customerId: string; isActive: boolean }>;
  products?: Array<{ sku: string; isActive: boolean }>;
  stockItems?: Array<{ id: string; sku: string; quantity: number; unitCost: number; totalValue: number }>;
  routes?: Array<{ id: string; name: string; isActive: boolean }>;
}

export interface RepStock {
  id: string;
  sku: string;
  quantity: number;
  unitCost: number;
  totalValue: number;
  product?: { name: string; unit: string };
}

export interface RepSale {
  id: string;
  saleNumber: string;
  customerId: string;
  saleDate: string;
  totalAmount: number;
  paidAmount: number;
  status: "PENDING" | "PARTIAL" | "PAID" | "CANCELLED";
  items: RepSaleItem[];
}

export interface RepSaleItem {
  sku: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  lineTotal: number;
}

export interface RepCollection {
  id: string;
  customerId: string;
  saleId?: string;
  amount: number;
  method: string;
  collectionDate: string;
  notes?: string;
}

export interface RepReturn {
  id: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  totalValue: number;
  returnDate: string;
  status: string;
  reason?: string;
}

export interface RepSettlement {
  id: string;
  periodStart: string;
  periodEnd: string;
  receivedValue: number;
  soldValue: number;
  collectedValue: number;
  returnedValue: number;
  outstandingAmount: number;
  stockVarianceValue: number;
  status: "PENDING" | "SUBMITTED" | "APPROVED" | "DISPUTED" | "CLOSED";
  notes?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const errMsg = (e: unknown, fallback: string) => {
  const err = e as { response?: { data?: { message?: string } } };
  return err?.response?.data?.message ?? fallback;
};

const useInvalidateRep = (repId?: string) => {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: queryKeys.representatives.all });
    if (repId) {
      void qc.invalidateQueries({ queryKey: queryKeys.representatives.detail(repId) });
      void qc.invalidateQueries({ queryKey: queryKeys.representatives.stock(repId) });
      void qc.invalidateQueries({ queryKey: queryKeys.representatives.summary(repId) });
    }
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// Admin — List & Detail
// ─────────────────────────────────────────────────────────────────────────────

export const useRepresentatives = (params?: { status?: string; page?: number }) =>
  useQuery({
    queryKey: queryKeys.representatives.list(params as Record<string, unknown>),
    queryFn: async () => {
      const res = await apiClient.get<{ data: Representative[]; total: number }>(
        "/representatives",
        { params },
      );
      return res.data;
    },
    staleTime: QUERY_STALE_TIME.STANDARD,
    gcTime: QUERY_GC_TIME.STANDARD,
  });

export const useRepresentative = (repId: string) =>
  useQuery({
    queryKey: queryKeys.representatives.detail(repId),
    queryFn: async () => {
      const res = await apiClient.get<Representative & { summary: RepSummary }>(
        `/representatives/${repId}`,
      );
      return res.data;
    },
    enabled: !!repId,
    staleTime: QUERY_STALE_TIME.FAST,
  });

// ─────────────────────────────────────────────────────────────────────────────
// Admin — Create / Update / Assign
// ─────────────────────────────────────────────────────────────────────────────

export const useCreateRepresentative = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      userId: string; name: string; code: string;
      phone?: string; email?: string; employeeId?: string; notes?: string;
    }) => apiClient.post<Representative>("/representatives", payload).then((r) => r.data),
    onSuccess: () => {
      toast.success("تم إنشاء المندوب");
      void qc.invalidateQueries({ queryKey: queryKeys.representatives.all });
    },
    onError: (e) => toast.error(errMsg(e, "فشل إنشاء المندوب")),
  });
};

export const useUpdateRepresentative = (repId: string) => {
  const invalidate = useInvalidateRep(repId);
  return useMutation({
    mutationFn: (payload: { name?: string; phone?: string; email?: string; status?: string }) =>
      apiClient.patch(`/representatives/${repId}`, payload).then((r) => r.data),
    onSuccess: () => { toast.success("تم التحديث"); invalidate(); },
    onError: (e) => toast.error(errMsg(e, "فشل التحديث")),
  });
};

export const useAssignCustomers = (repId: string) => {
  const invalidate = useInvalidateRep(repId);
  return useMutation({
    mutationFn: (customerIds: string[]) =>
      apiClient.post(`/representatives/${repId}/customers`, { customerIds }).then((r) => r.data),
    onSuccess: () => { toast.success("تم تعيين العملاء"); invalidate(); },
    onError: (e) => toast.error(errMsg(e, "فشل تعيين العملاء")),
  });
};

export const useAssignProducts = (repId: string) => {
  const invalidate = useInvalidateRep(repId);
  return useMutation({
    mutationFn: (skus: string[]) =>
      apiClient.post(`/representatives/${repId}/products`, { skus }).then((r) => r.data),
    onSuccess: () => { toast.success("تم تعيين المنتجات"); invalidate(); },
    onError: (e) => toast.error(errMsg(e, "فشل تعيين المنتجات")),
  });
};

export const useTransferStock = (repId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      items: { sku: string; quantity: number }[];
      warehouseLocation?: string;
      notes?: string;
    }) =>
      apiClient.post(`/representatives/${repId}/transfer`, payload).then((r) => r.data),
    onSuccess: () => {
      toast.success("تم تسليم البضاعة للمندوب");
      void qc.invalidateQueries({ queryKey: queryKeys.representatives.all });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.all });
    },
    onError: (e) => toast.error(errMsg(e, "فشل التسليم")),
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// Rep-Scoped — Stock
// ─────────────────────────────────────────────────────────────────────────────

export const useRepStock = (repId: string) =>
  useQuery({
    queryKey: queryKeys.representatives.stock(repId),
    queryFn: async () => {
      const res = await apiClient.get<RepStock[]>(`/representatives/${repId}/stock`);
      return res.data;
    },
    enabled: !!repId,
    staleTime: QUERY_STALE_TIME.FAST,
    gcTime: QUERY_GC_TIME.STANDARD,
  });

export const useRepMovements = (repId: string, params?: { from?: string; to?: string; page?: number }) =>
  useQuery({
    queryKey: queryKeys.representatives.movements(repId, params as Record<string, unknown>),
    queryFn: async () => {
      const res = await apiClient.get(`/representatives/${repId}/movements`, { params });
      return res.data;
    },
    enabled: !!repId,
    staleTime: QUERY_STALE_TIME.FAST,
  });

// ─────────────────────────────────────────────────────────────────────────────
// Rep-Scoped — Sales
// ─────────────────────────────────────────────────────────────────────────────

export const useRepSales = (repId: string, params?: { status?: string; from?: string; to?: string; page?: number }) =>
  useQuery({
    queryKey: queryKeys.representatives.sales(repId, params as Record<string, unknown>),
    queryFn: async () => {
      const res = await apiClient.get<{ data: RepSale[]; total: number }>(
        `/representatives/${repId}/sales`,
        { params },
      );
      return res.data;
    },
    enabled: !!repId,
    staleTime: QUERY_STALE_TIME.FAST,
  });

export const useCreateRepSale = (repId: string) => {
  const invalidate = useInvalidateRep(repId);
  return useMutation({
    mutationFn: (payload: {
      customerId: string;
      saleDate: string;
      items: { sku: string; quantity: number; unitPrice: number; discountPercent?: number }[];
      discountAmount?: number;
      notes?: string;
    }) => apiClient.post<RepSale>(`/representatives/${repId}/sales`, payload).then((r) => r.data),
    onSuccess: () => { toast.success("تم تسجيل البيع"); invalidate(); },
    onError: (e) => toast.error(errMsg(e, "فشل تسجيل البيع")),
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// Rep-Scoped — Collections
// ─────────────────────────────────────────────────────────────────────────────

export const useRepCollections = (repId: string, params?: { from?: string; to?: string; page?: number }) =>
  useQuery({
    queryKey: queryKeys.representatives.collections(repId, params as Record<string, unknown>),
    queryFn: async () => {
      const res = await apiClient.get<{ data: RepCollection[]; total: number }>(
        `/representatives/${repId}/collections`,
        { params },
      );
      return res.data;
    },
    enabled: !!repId,
    staleTime: QUERY_STALE_TIME.FAST,
  });

export const useCreateRepCollection = (repId: string) => {
  const invalidate = useInvalidateRep(repId);
  return useMutation({
    mutationFn: (payload: {
      customerId: string; saleId?: string;
      amount: number; method?: string;
      collectionDate: string; notes?: string;
    }) => apiClient.post(`/representatives/${repId}/collections`, payload).then((r) => r.data),
    onSuccess: () => { toast.success("تم تسجيل التحصيل"); invalidate(); },
    onError: (e) => toast.error(errMsg(e, "فشل تسجيل التحصيل")),
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// Rep-Scoped — Returns
// ─────────────────────────────────────────────────────────────────────────────

export const useRepReturns = (repId: string, params?: { from?: string; to?: string; page?: number }) =>
  useQuery({
    queryKey: queryKeys.representatives.returns(repId, params as Record<string, unknown>),
    queryFn: async () => {
      const res = await apiClient.get<{ data: RepReturn[]; total: number }>(
        `/representatives/${repId}/returns`,
        { params },
      );
      return res.data;
    },
    enabled: !!repId,
    staleTime: QUERY_STALE_TIME.FAST,
  });

export const useCreateRepReturn = (repId: string) => {
  const invalidate = useInvalidateRep(repId);
  return useMutation({
    mutationFn: (payload: {
      customerId: string; saleId?: string; sku: string;
      quantity: number; unitPrice: number;
      reason?: string; returnDate: string; notes?: string;
    }) => apiClient.post(`/representatives/${repId}/returns`, payload).then((r) => r.data),
    onSuccess: () => { toast.success("تم تسجيل المرتجع"); invalidate(); },
    onError: (e) => toast.error(errMsg(e, "فشل تسجيل المرتجع")),
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// Rep-Scoped — Settlement
// ─────────────────────────────────────────────────────────────────────────────

export const useRepSettlements = (repId: string) =>
  useQuery({
    queryKey: queryKeys.representatives.settlements(repId),
    queryFn: async () => {
      const res = await apiClient.get<RepSettlement[]>(
        `/representatives/${repId}/settlements`,
      );
      return res.data;
    },
    enabled: !!repId,
    staleTime: QUERY_STALE_TIME.STANDARD,
  });

export const useCreateSettlement = (repId: string) => {
  const invalidate = useInvalidateRep(repId);
  return useMutation({
    mutationFn: (payload: {
      periodStart: string; periodEnd: string;
      actualStock?: { sku: string; quantity: number }[];
      varianceReason?: string; notes?: string;
    }) =>
      apiClient.post<RepSettlement>(`/representatives/${repId}/settlement`, payload).then((r) => r.data),
    onSuccess: () => { toast.success("تم إنشاء التسوية"); invalidate(); },
    onError: (e) => toast.error(errMsg(e, "فشل إنشاء التسوية")),
  });
};

export const useApproveSettlement = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, approved, notes }: { id: string; approved?: boolean; notes?: string }) =>
      apiClient.patch(`/representatives/settlements/${id}/approve`, { approved, notes }).then((r) => r.data),
    onSuccess: () => {
      toast.success("تم معالجة التسوية");
      void qc.invalidateQueries({ queryKey: queryKeys.representatives.all });
    },
    onError: (e) => toast.error(errMsg(e, "فشل معالجة التسوية")),
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// Rep-Scoped — Summary
// ─────────────────────────────────────────────────────────────────────────────

export const useRepSummary = (repId: string) =>
  useQuery({
    queryKey: queryKeys.representatives.summary(repId),
    queryFn: async () => {
      const res = await apiClient.get<RepSummary>(`/representatives/${repId}/summary`);
      return res.data;
    },
    enabled: !!repId,
    staleTime: QUERY_STALE_TIME.FAST,
    gcTime: QUERY_GC_TIME.STANDARD,
  });

// ─────────────────────────────────────────────────────────────────────────────
// WMS Setup hooks
// ─────────────────────────────────────────────────────────────────────────────

export interface WmsSetupState {
  currentStep: number;
  isCompleted: boolean;
  totalSteps: number;
  steps: Array<{
    step: number;
    key: string;
    label: string;
    required: boolean;
    completed: boolean;
    completedAt?: string | null;
    prefilled?: boolean;
  }>;
}

export const useWmsSetupState = () =>
  useQuery({
    queryKey: queryKeys.wmsSetup.state(),
    queryFn: async () => {
      const res = await apiClient.get<WmsSetupState>("/wms-setup/state");
      return res.data;
    },
    staleTime: QUERY_STALE_TIME.FAST,
    gcTime: QUERY_GC_TIME.STANDARD,
  });

export const useWmsSetupCompleted = () =>
  useQuery({
    queryKey: queryKeys.wmsSetup.completed(),
    queryFn: async () => {
      const res = await apiClient.get<{ isCompleted: boolean }>("/wms-setup/completed");
      return res.data;
    },
    staleTime: QUERY_STALE_TIME.STANDARD,
  });

export const useSaveSetupStep = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ step, data }: { step: number; data: Record<string, unknown> }) =>
      apiClient.post(`/wms-setup/step/${step}`, data).then((r) => r.data),
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.wmsSetup.all }),
    onError: (e) => toast.error(errMsg(e, "فشل حفظ الخطوة")),
  });
};

export const useGoToSetupStep = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (step: number) =>
      apiClient.patch(`/wms-setup/goto/${step}`).then((r) => r.data),
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.wmsSetup.all }),
  });
};

export const useCompleteSetup = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post("/wms-setup/complete").then((r) => r.data),
    onSuccess: () => {
      toast.success("🎉 اكتمل إعداد WMS! مرحباً بك");
      void qc.invalidateQueries({ queryKey: queryKeys.wmsSetup.all });
    },
    onError: (e) => toast.error(errMsg(e, "فشل إكمال الإعداد")),
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// System Settings hook
// ─────────────────────────────────────────────────────────────────────────────

export interface SystemSettings {
  currency: string;
  currencySymbol: string;
  currencyDecimals: number;
  locale: string;
  timezone: string;
  textDirection: string;
}

export const useSystemSettings = () =>
  useQuery({
    queryKey: queryKeys.systemSettings.settings(),
    queryFn: async () => {
      const res = await apiClient.get<SystemSettings>("/settings/system");
      return res.data;
    },
    staleTime: QUERY_STALE_TIME.RELAXED,
    gcTime: QUERY_GC_TIME.RELAXED,
  });

export const useUpdateSystemSettings = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<SystemSettings>) =>
      apiClient.patch<SystemSettings>("/settings/system", payload).then((r) => r.data),
    onSuccess: () => {
      toast.success("تم حفظ الإعدادات");
      void qc.invalidateQueries({ queryKey: queryKeys.systemSettings.all });
    },
    onError: (e) => toast.error(errMsg(e, "فشل حفظ الإعدادات")),
  });
};
