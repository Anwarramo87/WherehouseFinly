import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import apiClient from "@/lib/api-client";
import { AdjustStockInput, InventoryItem, InventoryItemInput, StockMovement } from "@/types/inventory";
import { QUERY_GC_TIME, QUERY_STALE_TIME } from "@/lib/query-cache";

type InventoryListResponse = {
  products: Array<{
    id: string;
    sku: string;
    name: string;
    category: string;
    reorderLevel?: number;
  }>;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};

type StockBySkuResponse = {
  sku: string;
  stockLevels: Array<{
    quantity: number;
    available: number;
  }>;
};

const STOCK_CACHE_TTL_MS = 45_000;
const STOCK_CACHE_MAX_ITEMS = 1_000;

const stockQuantityCache = new Map<string, { quantity: number; expiresAt: number }>();
const stockQuantityInFlight = new Map<string, Promise<number>>();

const now = () => Date.now();

const pruneStockCache = () => {
  const currentTime = now();

  for (const [sku, value] of stockQuantityCache.entries()) {
    if (value.expiresAt <= currentTime) {
      stockQuantityCache.delete(sku);
    }
  }

  while (stockQuantityCache.size > STOCK_CACHE_MAX_ITEMS) {
    const oldestKey = stockQuantityCache.keys().next().value as string | undefined;
    if (!oldestKey) break;
    stockQuantityCache.delete(oldestKey);
  }
};

const getCachedStockQuantity = (sku: string): number | null => {
  const cached = stockQuantityCache.get(sku);
  if (!cached) return null;

  if (cached.expiresAt <= now()) {
    stockQuantityCache.delete(sku);
    return null;
  }

  return cached.quantity;
};

const fetchStockQuantityBySku = async (sku: string): Promise<number> => {
  const cached = getCachedStockQuantity(sku);
  if (cached !== null) {
    return cached;
  }

  const inFlight = stockQuantityInFlight.get(sku);
  if (inFlight) {
    return inFlight;
  }

  const request = (async () => {
    try {
      const stockRes = await apiClient.get<StockBySkuResponse>(`/inventory/stock/${sku}`);
      const levels = Array.isArray(stockRes.data?.stockLevels) ? stockRes.data.stockLevels : [];
      const quantity = levels.reduce((sum, level) => sum + Number(level.available ?? level.quantity ?? 0), 0);

      stockQuantityCache.set(sku, {
        quantity,
        expiresAt: now() + STOCK_CACHE_TTL_MS,
      });
      pruneStockCache();

      return quantity;
    } catch {
      return 0;
    } finally {
      stockQuantityInFlight.delete(sku);
    }
  })();

  stockQuantityInFlight.set(sku, request);
  return request;
};

const toInventoryItem = (product: InventoryListResponse["products"][number], quantity: number): InventoryItem => ({
  id: product.id,
  name: product.name,
  sku: product.sku,
  category: product.category,
  quantity,
  unit: "قطعة",
  minStockLevel: Number(product.reorderLevel || 0),
});

const extractMessage = (error: unknown, fallback: string) => {
  const err = error as { response?: { data?: { message?: string; error?: { message?: string } } } };
  return err?.response?.data?.error?.message || err?.response?.data?.message || fallback;
};

export const useProducts = (params?: { page?: number; limit?: number; search?: string; category?: string; status?: string }) => {
  return useQuery({
    queryKey: ["inventory", "products", params],
    queryFn: async () => {
      const res = await apiClient.get<InventoryListResponse>("/inventory/products", { params });
      const products = Array.isArray(res.data?.products) ? res.data.products : [];

      if (products.length === 0) {
        return {
          products,
          items: [],
          pagination: res.data?.pagination,
        };
      }

      const stockResponses = await Promise.all(
        products.map(async (product) => {
          const quantity = await fetchStockQuantityBySku(product.sku);
          return [product.sku, quantity] as const;
        }),
      );

      const quantityBySku = new Map<string, number>(stockResponses);

      return {
        products,
        items: products.map((product) => toInventoryItem(product, quantityBySku.get(product.sku) || 0)),
        pagination: res.data?.pagination,
      };
    },
    staleTime: QUERY_STALE_TIME.RELAXED,
    gcTime: QUERY_GC_TIME.RELAXED,
    placeholderData: keepPreviousData,
  });
};

export const useInventory = (params?: { page?: number; limit?: number; search?: string; category?: string; status?: string }) => {
  const queryClient = useQueryClient();

  const productsQuery = useProducts(params);

  const createItem = useMutation({
    mutationFn: async (payload: InventoryItemInput) => {
      const body = {
        sku: payload.sku,
        name: payload.name,
        category: payload.category,
        unitPrice: Number(payload.unitPrice),
        costPrice: Number(payload.costPrice),
        reorderLevel: Number(payload.reorderLevel),
      };

      return await apiClient.post("/inventory/products", body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"], exact: false });
      toast.success("تمت إضافة الصنف بنجاح");
    },
    onError: (error: unknown) => {
      toast.error(extractMessage(error, "فشل إضافة الصنف"));
    },
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InventoryItemInput> }) => {
      const body = {
        sku: data.sku,
        name: data.name,
        category: data.category,
        unitPrice: data.unitPrice !== undefined ? Number(data.unitPrice) : undefined,
        costPrice: data.costPrice !== undefined ? Number(data.costPrice) : undefined,
        reorderLevel: data.reorderLevel !== undefined ? Number(data.reorderLevel) : undefined,
      };

      return await apiClient.put(`/inventory/products/${id}`, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"], exact: false });
      toast.success("تم تحديث الصنف بنجاح");
    },
    onError: (error: unknown) => {
      toast.error(extractMessage(error, "فشل تحديث الصنف"));
    },
  });

  // NOTE: backend currently has no DELETE /inventory/products/:id endpoint.
  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      return await apiClient.delete(`/inventory/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"], exact: false });
      toast.success("تم حذف الصنف");
    },
    onError: (error: unknown) => {
      toast.error(extractMessage(error, "الحذف غير مدعوم حالياً من الخادم"));
    },
  });

  const adjustStock = useMutation({
    mutationFn: async (input: AdjustStockInput) => {
      const quantity = Number(input.quantity || 0);
      const change = input.type === "IN" ? quantity : -quantity;

      const movementPayload = {
        type: input.type,
        quantity,
        date: new Date().toISOString(),
        note: input.note,
      } satisfies StockMovement;

      // Resolve SKU for the product and call stock adjust endpoint
      const productRes = await apiClient.get(`/inventory/products/${input.productId}`);
      const sku = productRes?.data?.product?.sku;
      if (!sku) {
        throw new Error('تعذر تحديد SKU للصنف المحدد');
      }

      return await apiClient.post('/inventory/stock/adjust', {
        sku,
        location: input.location || 'MAIN',
        change,
        reason: input.note || (input.type === 'IN' ? 'إضافة مخزون' : 'صرف مخزون'),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"], exact: false });
      toast.success("تم تعديل المخزون بنجاح");
    },
    onError: (error: unknown) => {
      toast.error(extractMessage(error, "فشل تعديل المخزون"));
    },
  });

  return {
    ...productsQuery,
    createItem,
    updateItem,
    deleteItem,
    adjustStock,
  };
};

