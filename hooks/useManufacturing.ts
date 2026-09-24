"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import apiClient from "@/lib/api-client";
import { QUERY_GC_TIME, QUERY_STALE_TIME } from "@/lib/query-cache";
import { queryKeys } from "@/lib/query-keys";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface BOMItem {
  id: string;
  materialSku: string;
  quantity: number;
  unit: string;
  wastePercent: number;
  notes?: string;
}

export interface BOM {
  id: string;
  productSku: string;
  version: number;
  isActive: boolean;
  notes?: string;
  items: BOMItem[];
  calculatedCost?: { materialCost: number; breakdown: BOMCostLine[] };
}

export interface BOMCostLine {
  sku: string;
  name: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export interface CreateBOMPayload {
  productSku: string;
  items: Omit<BOMItem, "id">[];
  notes?: string;
}

export interface ProductionOrder {
  id: string;
  orderNumber: string;
  bomId: string;
  productSku: string;
  plannedQty: number;
  actualQty: number;
  wasteQty: number;
  status: "DRAFT" | "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  plannedDate: string;
  startedAt?: string;
  completedAt?: string;
  materialCost: number;
  laborCost: number;
  overheadCost: number;
  packagingCost: number;
  otherCost: number;
  totalCost: number;
  unitCost: number;
  notes?: string;
}

export interface CreateOrderPayload {
  bomId: string;
  plannedQty: number;
  plannedDate: string;
  laborCost?: number;
  overheadCost?: number;
  packagingCost?: number;
  otherCost?: number;
  notes?: string;
}

export interface CompleteOrderPayload {
  actualQty: number;
  wasteQty?: number;
  laborCost?: number;
  overheadCost?: number;
  packagingCost?: number;
  otherCost?: number;
  warehouseLocation?: string;
  batchNumber?: string;
  batchExpiryDate?: string;
  notes?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Invalidation helper
// ─────────────────────────────────────────────────────────────────────────────

const useInvalidateMfg = () => {
  const qc = useQueryClient();
  return () => void qc.invalidateQueries({ queryKey: queryKeys.manufacturing.all });
};

// ─────────────────────────────────────────────────────────────────────────────
// BOM Hooks
// ─────────────────────────────────────────────────────────────────────────────

export const useBOM = (productSku: string) =>
  useQuery({
    queryKey: queryKeys.manufacturing.bom(productSku),
    queryFn: async () => {
      const res = await apiClient.get<BOM>(`/manufacturing/bom/${productSku}`);
      return res.data;
    },
    enabled: !!productSku,
    staleTime: QUERY_STALE_TIME.STANDARD,
    gcTime: QUERY_GC_TIME.STANDARD,
    retry: false,
  });

export const useBOMCost = (bomId: string) =>
  useQuery({
    queryKey: queryKeys.manufacturing.bomCost(bomId),
    queryFn: async () => {
      const res = await apiClient.get<{ materialCost: number; breakdown: BOMCostLine[] }>(
        `/manufacturing/bom/cost/${bomId}`,
      );
      return res.data;
    },
    enabled: !!bomId,
    staleTime: QUERY_STALE_TIME.STANDARD,
  });

export const useCreateBOM = () => {
  const invalidate = useInvalidateMfg();
  return useMutation({
    mutationFn: (payload: CreateBOMPayload) =>
      apiClient.post<BOM>("/manufacturing/bom", payload).then((r) => r.data),
    onSuccess: () => {
      toast.success("تم إنشاء قائمة المواد");
      invalidate();
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? "فشل إنشاء BOM");
    },
  });
};

export const useUpdateBOM = () => {
  const invalidate = useInvalidateMfg();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string; items?: Omit<BOMItem, "id">[]; isActive?: boolean; notes?: string }) =>
      apiClient.put<BOM>(`/manufacturing/bom/${id}`, payload).then((r) => r.data),
    onSuccess: () => {
      toast.success("تم تحديث BOM");
      invalidate();
    },
    onError: () => toast.error("فشل تحديث BOM"),
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// Production Order Hooks
// ─────────────────────────────────────────────────────────────────────────────

export const useProductionOrders = (params?: { status?: string; productSku?: string; page?: number }) =>
  useQuery({
    queryKey: queryKeys.manufacturing.orders(params as Record<string, unknown>),
    queryFn: async () => {
      const res = await apiClient.get<{ data: ProductionOrder[]; total: number }>("/manufacturing/orders", { params });
      return res.data;
    },
    staleTime: QUERY_STALE_TIME.FAST,
    gcTime: QUERY_GC_TIME.STANDARD,
  });

export const useProductionOrder = (id: string) =>
  useQuery({
    queryKey: queryKeys.manufacturing.order(id),
    queryFn: async () => {
      const res = await apiClient.get<ProductionOrder>(`/manufacturing/orders/${id}`);
      return res.data;
    },
    enabled: !!id,
    staleTime: QUERY_STALE_TIME.FAST,
  });

export const useManufacturingSummary = () =>
  useQuery({
    queryKey: queryKeys.manufacturing.summary(),
    queryFn: async () => {
      const res = await apiClient.get("/manufacturing/summary");
      return res.data;
    },
    staleTime: QUERY_STALE_TIME.STANDARD,
    gcTime: QUERY_GC_TIME.STANDARD,
  });

export const useCreateProductionOrder = () => {
  const invalidate = useInvalidateMfg();
  return useMutation({
    mutationFn: (payload: CreateOrderPayload) =>
      apiClient.post<ProductionOrder>("/manufacturing/orders", payload).then((r) => r.data),
    onSuccess: () => { toast.success("تم إنشاء أمر الإنتاج"); invalidate(); },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? "فشل إنشاء أمر الإنتاج");
    },
  });
};

export const useStartProductionOrder = () => {
  const invalidate = useInvalidateMfg();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.patch(`/manufacturing/orders/${id}/start`).then((r) => r.data),
    onSuccess: () => { toast.success("تم بدء التصنيع"); invalidate(); },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? "فشل بدء التصنيع");
    },
  });
};

export const useCancelProductionOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.patch(`/manufacturing/orders/${id}/cancel`).then((r) => r.data),
    onSuccess: () => {
      toast.success("تم إلغاء الأمر وإفراج الحجوزات");
      void qc.invalidateQueries({ queryKey: queryKeys.manufacturing.all });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.all });
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? "فشل إلغاء الأمر");
    },
  });
};

export const useCompleteProductionOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string } & CompleteOrderPayload) =>
      apiClient.patch(`/manufacturing/orders/${id}/complete`, payload).then((r) => r.data),
    onSuccess: () => {
      toast.success("تم إتمام التصنيع وإضافة المنتج للمخزن");
      void qc.invalidateQueries({ queryKey: queryKeys.manufacturing.all });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.all });
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? "فشل إتمام التصنيع");
    },
  });
};
