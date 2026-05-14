import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api-client";
import { toast } from "react-hot-toast";
import { QUERY_GC_TIME, QUERY_STALE_TIME } from "@/lib/query-cache";

export type DiscountRecord = {
  id: string;
  employeeId: string;
  type: string; // 'سلفة' | 'شراء ملابس' | 'عقوبة'
  amount: number;
  date: string;
  notes?: string;
  backendModel: "advance" | "penalty";
};

export type DiscountPayload = {
  employeeId: string;
  type: string;
  amount: number;
  date: string;
  notes?: string;
};

const normalizeError = (error: unknown): string => {
  const err = error as { response?: { data?: { message?: string | string[] } }; message?: string };
  const message = err?.response?.data?.message || err?.message || "حدث خطأ غير معروف";
  if (Array.isArray(message)) {
    return message.join(" | ");
  }
  return message;
};

// Map UI types to backend values
const mapTypeToBackend = (type: string): { model: "advance" | "penalty"; backendTypeOrCategory: string } => {
  switch (type) {
    case "سلفة":
      return { model: "advance", backendTypeOrCategory: "salary" };
    case "شراء ملابس":
      return { model: "advance", backendTypeOrCategory: "clothing" };
    case "عقوبة":
    default:
      return { model: "penalty", backendTypeOrCategory: "عقوبة" };
  }
};

const mapBackendToType = (model: "advance" | "penalty", backendTypeOrCategory: string): string => {
  if (model === "advance") {
    if (backendTypeOrCategory === "clothing") return "شراء ملابس";
    return "سلفة";
  } else {
    // Penalty
    return "عقوبة";
  }
};

export const useDiscounts = (employeeId?: string) => {
  const queryClient = useQueryClient();

  const query = useQuery<DiscountRecord[]>({
    queryKey: ["discounts", employeeId || "all"],
    queryFn: async () => {
      const params = employeeId ? { employeeId } : {};
      
      const [advancesRes, penaltiesRes] = await Promise.all([
        apiClient.get("/advances", { params }).catch(() => ({ data: [] })),
        apiClient.get("/penalties", { params }).catch(() => ({ data: [] }))
      ]);

      const advancesData = Array.isArray(advancesRes.data) ? advancesRes.data : advancesRes.data?.data || [];
      const penaltiesData = Array.isArray(penaltiesRes.data) ? penaltiesRes.data : penaltiesRes.data?.data || [];

      const mappedAdvances: DiscountRecord[] = advancesData.map((adv: { id: string; employeeId: string; advanceType: string; totalAmount: number; issueDate?: string; notes?: string }) => ({
        id: adv.id,
        employeeId: adv.employeeId,
        type: mapBackendToType("advance", adv.advanceType),
        amount: Number(adv.totalAmount),
        date: adv.issueDate?.split("T")[0] || new Date().toISOString().split("T")[0],
        notes: adv.notes || "",
        backendModel: "advance",
      }));

      const mappedPenalties: DiscountRecord[] = penaltiesData.map((pen: { id: string; employeeId: string; category: string; amount: number; issueDate?: string; reason?: string }) => ({
        id: pen.id,
        employeeId: pen.employeeId,
        type: mapBackendToType("penalty", pen.category),
        amount: Number(pen.amount),
        date: pen.issueDate?.split("T")[0] || new Date().toISOString().split("T")[0],
        notes: pen.reason || "",
        backendModel: "penalty",
      }));

      const combined = [...mappedAdvances, ...mappedPenalties];
      // Sort by date descending
      combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return combined;
    },
    staleTime: QUERY_STALE_TIME.STANDARD,
    gcTime: QUERY_GC_TIME.RELAXED,
  });

  const createMutation = useMutation({
    mutationFn: async (payload: DiscountPayload) => {
      const { model, backendTypeOrCategory } = mapTypeToBackend(payload.type);
      
      if (model === "advance") {
        return apiClient.post("/advances", {
          employeeId: payload.employeeId,
          advanceType: backendTypeOrCategory,
          totalAmount: payload.amount,
          notes: payload.notes,
          issueDate: new Date(payload.date).toISOString(),
        });
      } else {
        return apiClient.post("/penalties", {
          employeeId: payload.employeeId,
          category: backendTypeOrCategory,
          amount: payload.amount,
          reason: payload.notes,
          issueDate: new Date(payload.date).toISOString(),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discounts"] });
      toast.success("تم الحفظ بنجاح!");
    },
    onError: (error: unknown) => {
      toast.error(normalizeError(error));
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, backendModel, payload }: { id: string; backendModel: "advance" | "penalty"; payload: DiscountPayload }) => {
      const { model, backendTypeOrCategory } = mapTypeToBackend(payload.type);
      
      // If the backend model is penalty, we can simply PUT
      if (backendModel === "penalty" && model === "penalty") {
        return apiClient.put(`/penalties/${id}`, {
          category: backendTypeOrCategory,
          amount: payload.amount,
          reason: payload.notes,
          issueDate: new Date(payload.date).toISOString(),
        });
      }
      
      // If the backend model is advance, we cannot update totalAmount, advanceType, or issueDate via PUT
      // due to backend restrictions. We must delete and recreate.
      // Also, if the model changed (e.g. advance -> penalty), we must delete and recreate.
      if (backendModel === "advance") {
        await apiClient.delete(`/advances/${id}`);
      } else {
        await apiClient.delete(`/penalties/${id}`);
      }
      
      // Recreate with new data
      if (model === "advance") {
        return apiClient.post("/advances", {
          employeeId: payload.employeeId,
          advanceType: backendTypeOrCategory,
          totalAmount: payload.amount,
          notes: payload.notes,
          issueDate: new Date(payload.date).toISOString(),
        });
      } else {
        return apiClient.post("/penalties", {
          employeeId: payload.employeeId,
          category: backendTypeOrCategory,
          amount: payload.amount,
          reason: payload.notes,
          issueDate: new Date(payload.date).toISOString(),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discounts"] });
      toast.success("تم التعديل بنجاح!");
    },
    onError: (error: unknown) => {
      toast.error(normalizeError(error));
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id, backendModel }: { id: string; backendModel: "advance" | "penalty" }) => {
      if (backendModel === "advance") {
        return apiClient.delete(`/advances/${id}`);
      } else {
        return apiClient.delete(`/penalties/${id}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discounts"] });
      toast.success("تم الحذف بنجاح!");
    },
    onError: (error: unknown) => {
      toast.error(normalizeError(error));
    }
  });

  return {
    ...query,
    createDiscount: createMutation,
    updateDiscount: updateMutation,
    deleteDiscount: deleteMutation
  };
};
