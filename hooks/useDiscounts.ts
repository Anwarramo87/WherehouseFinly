import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api-client";
import { toast } from "react-hot-toast";
import { QUERY_GC_TIME, QUERY_STALE_TIME } from "@/lib/query-cache";

export type DiscountRecord = {
  id: string;
  employeeId: string;
  type: string;
  kind: "advance" | "penalty" | "assistance";
  amount: number;
  date: string;
  notes?: string;
  advanceType?: string;
  category?: string;
  backendModel?: "advance" | "penalty";
};

export type DiscountPayload = {
  employeeId: string;
  kind: "advance" | "penalty" | "assistance";
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

const mapBackendKindToType = (record: Record<string, unknown>): { type: string; kind: "advance" | "penalty" | "assistance" } => {
  if (record.advanceType) {
    const advanceType = record.advanceType as string;
    if (advanceType === "clothing") return { type: "شراء ملابس", kind: "advance" as const };
    if (advanceType === "assistance") return { type: "مساعدة", kind: "assistance" as const };
    return { type: "سلفة", kind: "advance" as const };
  }
  if (record.category) {
    return { type: "عقوبة", kind: "penalty" as const };
  }
  return { type: "أخرى", kind: "advance" as const };
};

export const useDiscounts = (employeeId?: string) => {
  const queryClient = useQueryClient();

  const resolveUpdateEndpoint = (recordKind: DiscountRecord["kind"]) => {
    return recordKind === "advance" ? "/advances" : "/bonuses";
  };

  const query = useQuery<DiscountRecord[]>({
    queryKey: ["discounts", employeeId || "all"],
    queryFn: async () => {
      const params = employeeId ? { employeeId } : {};
      const res = await apiClient.get("/discounts", { params });
      const data = res.data;

      if (!Array.isArray(data)) {
        return [];
      }

      return data.map((record: Record<string, unknown>) => {
        const { type, kind } = mapBackendKindToType(record);
        return {
          id: record.id as string,
          employeeId: record.employeeId as string,
          type,
          kind,
          backendModel: kind === "advance" ? "advance" : "penalty",
          amount: Number(record.amount || record.totalAmount || 0),
          date: (record.issueDate as string || record.date as string || "").split("T")[0],
          notes: (record.notes as string) || (record.reason as string) || "",
          advanceType: record.advanceType as string | undefined,
          category: record.category as string | undefined,
        };
      });
    },
    staleTime: QUERY_STALE_TIME.STANDARD,
    gcTime: QUERY_GC_TIME.RELAXED,
  });

  const createDiscount = useMutation({
    mutationFn: async (payload: DiscountPayload) => {
      const body: Record<string, unknown> = {
        employeeId: payload.employeeId,
        kind: payload.kind === "advance" ? "advance" : "assistance",
        amount: payload.amount,
        date: payload.date,
        notes: payload.notes,
      };

      if (payload.kind === "advance") {
        body.advanceType = payload.type === "شراء ملابس" ? "clothing" : payload.type === "مساعدة" ? "assistance" : "salary";
      }

      return await apiClient.post("/discounts", body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discounts"], exact: false });
      toast.success("تم إضافة الخصم بنجاح");
    },
    onError: (error: unknown) => {
      toast.error(normalizeError(error));
    },
  });

  const updateDiscount = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: DiscountPayload }) => {
      if (payload.kind === "advance") {
        const body: Record<string, unknown> = {
          remainingAmount: Number(payload.amount),
          installmentAmount: 0,
          notes: payload.notes,
        };

        return await apiClient.put(`/advances/${id}`, body);
      }

      const body: Record<string, unknown> = {
        assistanceAmount: Number(payload.amount),
        bonusReason: payload.type,
        period: payload.date?.slice(0, 7),
      };

      return await apiClient.put(`/bonuses/${id}`, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discounts"], exact: false });
      toast.success("تم تحديث الخصم بنجاح");
    },
    onError: (error: unknown) => {
      toast.error(normalizeError(error));
    },
  });

  const deleteDiscount = useMutation({
    mutationFn: async ({ id, kind }: { id: string; kind: "advance" | "penalty" | "assistance" }) => {
      const backendKind = kind === "advance" ? "advance" : "assistance";
      return await apiClient.delete(`/discounts/${id}?kind=${backendKind}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discounts"], exact: false });
      toast.success("تم حذف الخصم بنجاح");
    },
    onError: (error: unknown) => {
      toast.error(normalizeError(error));
    },
  });

  return {
    ...query,
    createDiscount,
    updateDiscount,
    deleteDiscount,
  };
};