import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import apiClient from "@/lib/api-client";
import { usePermissionOrPrivilege } from "@/lib/permissions/hooks";
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
  profitPercent: product.profitPercent,
  marginPercent: product.marginPercent,
  photo: product.photo || null,
  onHand: Number(product.totalQuantity ?? 0),
  reserved: Number(product.totalReserved ?? 0),
  status: product.status,
  productType: product.productType,
});

const extractMessage = (error: unknown, fallback: string) => {
  const err = error as { response?: { data?: { message?: string; error?: { message?: string } } } };
  return err?.response?.data?.error?.message || err?.response?.data?.message || fallback;
};

/**
 * Prices are optional. An empty field must be sent as `undefined` (omitted) so the
 * backend applies its own default instead of receiving NaN or a misleading zero.
 */
const toOptionalNumber = (value: number | string | null | undefined): number | undefined => {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

/** Columns the API will sort on. Mirrors the whitelist in the backend DTO. */
export type ProductSortField =
  | "name"
  | "sku"
  | "category"
  | "unitPrice"
  | "costPrice"
  | "reorderLevel"
  | "status"
  | "createdAt";

export type SortDirection = "asc" | "desc";

type InventoryProductsParams = {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  status?: string;
  productType?: string;
  sortBy?: ProductSortField;
  sortDir?: SortDirection;
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
  const canView = usePermissionOrPrivilege("view_inventory");
  return useQuery({
    queryKey: queryKeys.inventory.warehouses(),
    queryFn: async () => {
      const res = await apiClient.get<Warehouse[]>("/inventory/warehouses");
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: canView,
    staleTime: QUERY_STALE_TIME.STANDARD,
    gcTime: QUERY_STALE_TIME.STANDARD,
  });
};

export const useNextWarehouseCode = () => {
  return useQuery({
    queryKey: queryKeys.inventory.warehousesNextCode(),
    queryFn: async () => {
      const res = await apiClient.get<{ code: string }>("/inventory/warehouses/next-code");
      return res.data?.code ?? "";
    },
    staleTime: 0,
    gcTime: 0,
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
        unitPrice: toOptionalNumber(payload.unitPrice),
        costPrice: toOptionalNumber(payload.costPrice),
        profitPercent:
          payload.profitPercent !== undefined && payload.profitPercent !== null && payload.profitPercent !== ""
            ? Number(payload.profitPercent)
            : undefined,
        reorderLevel: toOptionalNumber(payload.reorderLevel),
        unit: payload.unit,
        photo: payload.photo || undefined,
        productType: payload.productType,
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
        unitPrice: data.unitPrice !== undefined ? toOptionalNumber(data.unitPrice) : undefined,
        costPrice: data.costPrice !== undefined ? toOptionalNumber(data.costPrice) : undefined,
        profitPercent:
          data.profitPercent !== undefined && data.profitPercent !== null && data.profitPercent !== ""
            ? Number(data.profitPercent)
            : undefined,
        reorderLevel: data.reorderLevel !== undefined ? toOptionalNumber(data.reorderLevel) : undefined,
        unit: data.unit,
        photo: data.photo !== undefined ? data.photo : undefined,
        productType: data.productType,
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
        PURCHASE_RECEIPT: "استلام شراء",
        PRODUCTION_OUTPUT: "إنتاج",
        RETURN_TO_STOCK: "إعادة مخزون",
        SALES_SHIPMENT: "شحن بيع",
        PRODUCTION_CONSUMPTION: "استهلاك إنتاجي",
        DAMAGE_LOSS: "تلف/خسارة",
        WAREHOUSE_TRANSFER: "تحويل بين مخازن",
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
      const res = await apiClient.post<{ code: string }>("/inventory/warehouses", {
        name: payload.name,
        code: payload.code,
        address: payload.address,
      });
      return res.data;
    },
    onSuccess: () => {
      invalidateAll();
      toast.success("تمت إضافة المخزن بنجاح");
    },
    onError: (error: unknown) => {
      toast.error(extractMessage(error, "فشل إضافة المخزن"));
    },
  });

  const deleteWarehouse = useMutation({
    mutationFn: async (id: string) => {
      return await apiClient.delete(`/inventory/warehouses/${id}`);
    },
    onSuccess: () => {
      invalidateAll();
      toast.success("تم حذف المخزن بنجاح");
    },
    onError: (error: unknown) => {
      toast.error(extractMessage(error, "فشل حذف المخزن"));
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
    deleteWarehouse,
  };
};
