import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import apiClient from "@/lib/api-client";
import {
  AdjustStockInput,
  InventoryItem,
  InventoryItemInput,
  InventoryStats,
  MovementType,
  PaginatedResult,
  ProductEnriched,
  StockMovementRecord,
  Warehouse,
  WarehouseInput,
} from "@/types/inventory";
import { QUERY_GC_TIME, QUERY_STALE_TIME } from "@/lib/query-cache";
import { queryKeys } from "@/lib/query-keys";

const toInventoryItem = (product: ProductEnriched): InventoryItem => ({
  id: product.id,
  name: product.name,
  sku: product.sku,
  category: product.category,
  quantity: Number(product.totalAvailable ?? 0),
  unit: product.unit || "قطعة",
  minStockLevel: Number(product.reorderLevel || 0),
  unitPrice: product.unitPrice ? Number(product.unitPrice) : undefined,
  costPrice: product.costPrice ? Number(product.costPrice) : undefined,
  photo: product.photo || null,
});

const extractMessage = (error: unknown, fallback: string) => {
  const err = error as { response?: { data?: { message?: string; error?: { message?: string } } } };
  return err?.response?.data?.error?.message || err?.response?.data?.message || fallback;
};

type InventoryProductsParams = {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  status?: string;
};

export const useProducts = (params?: InventoryProductsParams) => {
  return useQuery({
    queryKey: queryKeys.inventory.products(params),
    queryFn: async () => {
      const res = await apiClient.get<PaginatedResult<ProductEnriched>>("/inventory/products", {
        params,
      });
      const products = Array.isArray(res.data?.data) ? res.data.data : [];
      return {
        products,
        items: products.map(toInventoryItem),
        pagination: res.data,
      };
    },
    staleTime: QUERY_STALE_TIME.RELAXED,
    gcTime: QUERY_GC_TIME.RELAXED,
    placeholderData: keepPreviousData,
  });
};

export const useStockMovements = (params?: {
  page?: number;
  limit?: number;
  sku?: string;
  type?: MovementType;
  location?: string;
}) => {
  return useQuery({
    queryKey: queryKeys.inventory.movements(params),
    queryFn: async () => {
      const res = await apiClient.get<PaginatedResult<StockMovementRecord>>("/inventory/movements", {
        params,
      });
      return res.data;
    },
    staleTime: QUERY_STALE_TIME.FAST,
    gcTime: QUERY_GC_TIME.STANDARD,
    placeholderData: keepPreviousData,
  });
};

export const useWarehouses = () => {
  return useQuery({
    queryKey: queryKeys.inventory.warehouses(),
    queryFn: async () => {
      const res = await apiClient.get<Warehouse[]>("/inventory/warehouses");
      return Array.isArray(res.data) ? res.data : [];
    },
    staleTime: QUERY_STALE_TIME.STANDARD,
    gcTime: QUERY_GC_TIME.STANDARD,
  });
};

export const useCategories = () => {
  return useQuery({
    queryKey: queryKeys.inventory.categories(),
    queryFn: async () => {
      const res = await apiClient.get<string[]>("/inventory/categories");
      return Array.isArray(res.data) ? res.data : [];
    },
    staleTime: QUERY_STALE_TIME.RELAXED,
    gcTime: QUERY_GC_TIME.RELAXED,
  });
};

export const useInventoryStats = () => {
  return useQuery({
    queryKey: queryKeys.inventory.stats(),
    queryFn: async () => {
      const res = await apiClient.get<InventoryStats>("/inventory/stats");
      return res.data;
    },
    staleTime: QUERY_STALE_TIME.FAST,
    gcTime: QUERY_GC_TIME.STANDARD,
  });
};

export const useInventory = (params?: InventoryProductsParams) => {
  const queryClient = useQueryClient();

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all, exact: false });
  };

  const createItem = useMutation({
    mutationFn: async (payload: InventoryItemInput) => {
      return await apiClient.post("/inventory/products", {
        sku: payload.sku,
        name: payload.name,
        category: payload.category,
        unitPrice: Number(payload.unitPrice),
        costPrice: Number(payload.costPrice),
        reorderLevel: Number(payload.reorderLevel),
        unit: payload.unit,
        photo: payload.photo || undefined,
      });
    },
    onSuccess: () => {
      invalidateAll();
      toast.success("تمت إضافة الصنف بنجاح");
    },
    onError: (error: unknown) => {
      toast.error(extractMessage(error, "فشل إضافة الصنف"));
    },
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InventoryItemInput> }) => {
      return await apiClient.put(`/inventory/products/${id}`, {
        sku: data.sku,
        name: data.name,
        category: data.category,
        unitPrice: data.unitPrice !== undefined ? Number(data.unitPrice) : undefined,
        costPrice: data.costPrice !== undefined ? Number(data.costPrice) : undefined,
        reorderLevel: data.reorderLevel !== undefined ? Number(data.reorderLevel) : undefined,
        unit: data.unit,
        photo: data.photo !== undefined ? data.photo : undefined,
      });
    },
    onSuccess: () => {
      invalidateAll();
      toast.success("تم تحديث الصنف بنجاح");
    },
    onError: (error: unknown) => {
      toast.error(extractMessage(error, "فشل تحديث الصنف"));
    },
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      return await apiClient.delete(`/inventory/products/${id}`);
    },
    onSuccess: () => {
      invalidateAll();
      toast.success("تم نقل الصنف إلى سلة المهملات");
    },
    onError: (error: unknown) => {
      toast.error(extractMessage(error, "فشل حذف الصنف"));
    },
  });

  const adjustStock = useMutation({
    mutationFn: async (input: AdjustStockInput) => {
      const quantity = Number(input.quantity || 0);
      const change = input.type === "IN" ? quantity : -quantity;

      const productRes = await apiClient.get<{ product: { sku: string } }>(
        `/inventory/products/${input.productId}`,
      );
      const sku = productRes?.data?.product?.sku;
      if (!sku) {
        throw new Error("تعذر تحديد SKU للصنف المحدد");
      }

      const reasonMap: Record<AdjustStockInput["type"], string> = {
        IN: "إضافة مخزون",
        OUT: "صرف مخزون",
        ADJUSTMENT: "تسوية جرد",
      };

      return await apiClient.post("/inventory/stock/adjust", {
        sku,
        location: input.location || "MAIN",
        change,
        type: input.type,
        reason: input.note || reasonMap[input.type],
      });
    },
    onSuccess: () => {
      invalidateAll();
      toast.success("تم تعديل المخزون بنجاح");
    },
    onError: (error: unknown) => {
      toast.error(extractMessage(error, "فشل تعديل المخزون"));
    },
  });

  const createWarehouse = useMutation({
    mutationFn: async (payload: WarehouseInput) => {
      return await apiClient.post("/inventory/warehouses", {
        name: payload.name,
        code: payload.code,
        address: payload.address,
      });
    },
    onSuccess: () => {
      invalidateAll();
      toast.success("تمت إضافة المخزن بنجاح");
    },
    onError: (error: unknown) => {
      toast.error(extractMessage(error, "فشل إضافة المخزن"));
    },
  });

  const productsQuery = useProducts(params);

  return {
    ...productsQuery,
    createItem,
    updateItem,
    deleteItem,
    adjustStock,
    createWarehouse,
  };
};
