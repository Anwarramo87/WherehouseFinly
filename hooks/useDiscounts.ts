// import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
// import { useRouter } from "next/navigation";
// import apiClient from "@/lib/api-client";
// import { toast } from "react-hot-toast";
// import { QUERY_GC_TIME, QUERY_STALE_TIME } from "@/lib/query-cache";
// import { getApiErrorMessage as normalizeError } from "@/lib/http/error";

// export type DiscountRecord = {
//   id: string;
//   employeeId: string;
//   type: string;
//   kind: "advance" | "penalty" | "assistance" | "reward";
//   amount: number;
//   date: string;
//   notes?: string;
//   advanceType?: string;
//   category?: string;
//   backendModel?: "advance" | "penalty";
//   createdAt?: string;
// };

// export type DiscountPayload = {
//   employeeId: string;
//   kind: "advance" | "penalty" | "assistance" | "reward";
//   type: string;
//   amount: number;
//   date: string;
//   notes?: string;
// };


// const mapBackendKindToType = (record: Record<string, unknown>): { type: string; kind: "advance" | "penalty" | "assistance" } => {
//   // استقبال البيانات من الـ discounts endpoint الموحد
//   // السجلات تأتي بخاصية kind من الـ backend
//   if (record.kind === 'advance') {
//     const advanceType = record.advanceType as string;
//     if (advanceType === "clothing") return { type: "شراء ملابس", kind: "advance" as const };
//     return { type: "سلفة مالية", kind: "advance" as const };
//   }
  
//   if (record.kind === 'reward') {
//     return { type: record.type as string || 'مكافأة', kind: "reward" as const };
//   }

//   if (record.kind === 'penalty') {
//     return { type: record.type as string || 'عقوبة إدارية', kind: "penalty" as const };
//   }
  
//   if (record.kind === 'assistance') {
//     return { type: record.type as string || 'خصم متنوع', kind: "assistance" as const };
//   }
  
//   // السجلات القديمة من جدول EmployeeAdvance فقط (fallback)
//   if (record.advanceType || record.totalAmount !== undefined) {
//     const advanceType = record.advanceType as string;
//     if (advanceType === "clothing") return { type: "شراء ملابس", kind: "advance" as const };
//     return { type: "سلفة مالية", kind: "advance" as const };
//   }
//   if (record.category) {
//     return { type: "عقوبة إدارية", kind: "penalty" as const };
//   }
//   return { type: "أخرى", kind: "advance" as const };
// };

// export const useDiscounts = (employeeId?: string, period?: string, enabled = true) => {
//   const queryClient = useQueryClient();
//   const router = useRouter();

//   const currentPeriod = new Date().toISOString().slice(0, 7);
//   const isPastPeriod = period ? period < currentPeriod : false;

//   const query = useQuery<DiscountRecord[]>({
//     queryKey: ["discounts", employeeId || "all", period || "current"],
//     queryFn: async () => {
//       const params: Record<string, string> = {};
//       if (employeeId) params.employeeId = employeeId;
//       if (period) params.period = period;
//       const res = await apiClient.get("/discounts", { params });
//       const data = res.data;

//       if (!Array.isArray(data)) {
//         console.warn('Discounts API returned non-array data:', data);
//         return [];
//       }

//       return data.map((record: Record<string, unknown>) => {
//         const { type, kind } = mapBackendKindToType(record);
//         return {
//           id: record.id as string,
//           employeeId: record.employeeId as string,
//           type,
//           kind,
//           backendModel: kind === "advance" ? "advance" : "penalty",
//           amount: Number(record.amount || record.totalAmount || 0),
//           date: (record.issueDate as string || record.date as string || "").split("T")[0],
//           notes: (record.notes as string) || (record.reason as string) || "",
//           advanceType: record.advanceType as string | undefined,
//           category: record.category as string | undefined,
//         };
//       });
//     },
//     enabled,
//     staleTime: isPastPeriod ? 10 * 60_000 : QUERY_STALE_TIME.FAST,
//     gcTime: QUERY_GC_TIME.STANDARD,
//     refetchOnWindowFocus: true,
//   });

//   const createDiscount = useMutation({
//     mutationFn: async (payload: DiscountPayload) => {
//       if (payload.kind === "penalty") {
//         const body: Record<string, unknown> = {
//           employeeId: payload.employeeId,
//           category: payload.type === "عقوبة" ? "عقوبة ادارية" : payload.type,
//           amount: payload.amount,
//           issueDate: payload.date,
//           reason: payload.notes || undefined,
//           period: payload.date?.slice(0, 7),
//         };
//         return await apiClient.post("/penalties", body);
//       }

//       const body: Record<string, unknown> = {
//         employeeId: payload.employeeId,
//         type: payload.type,
//         kind: payload.kind,
//         amount: payload.amount,
//         date: payload.date,
//         notes: payload.notes,
//       };

//       if (payload.kind === "advance") {
//         body.advanceType = payload.type === "شراء ملابس" ? "clothing" : "salary";
//       }

//       return await apiClient.post("/discounts", body);
//     },
//     onSuccess: (response) => {
//       console.log('Discount created successfully:', response.data);
//       queryClient.invalidateQueries({ queryKey: ["discounts"], exact: false });
//       queryClient.invalidateQueries({ queryKey: ["bonuses"], exact: false });
//       queryClient.invalidateQueries({ queryKey: ["advances"], exact: false });
//       queryClient.invalidateQueries({ queryKey: ["penalties"], exact: false });
//       queryClient.invalidateQueries({ queryKey: ["dashboard"], exact: false });
//       router.refresh();
//       toast.success("تم إضافة السجل بنجاح");
//     },
//     onError: (error: unknown) => {
//       console.error('Failed to create discount:', error);
//       toast.error(normalizeError(error, "فشل إضافة الخصم"));
//     },
//   });

//   const updateDiscount = useMutation({
//     mutationFn: async ({ id, payload }: { id: string; payload: DiscountPayload }) => {
//       if (payload.kind === "penalty") {
//         const body: Record<string, unknown> = {
//           category: payload.type === "عقوبة" ? "عقوبة ادارية" : payload.type,
//           amount: Number(payload.amount),
//           reason: payload.notes || undefined,
//           issueDate: payload.date,
//         };
//         return await apiClient.put(`/penalties/${id}`, body);
//       }

//       if (payload.kind === "advance") {
//         const body: Record<string, unknown> = {
//           remainingAmount: Number(payload.amount),
//           installmentAmount: 0,
//           notes: payload.notes,
//         };
//         return await apiClient.put(`/advances/${id}`, body);
//       }

//       if (payload.kind === "penalty") {
//         return await apiClient.put(`/penalties/${id}`, {
//           amount: Number(payload.amount),
//           category: payload.type,
//           reason: payload.notes,
//         });
//       }

//       const body: Record<string, unknown> = {
//         bonusReason: payload.type,
//         period: payload.date?.slice(0, 7),
//       };

//       if (payload.kind === "reward") {
//         body.bonusAmount = Number(payload.amount);
//         body.assistanceAmount = 0;
//       } else {
//         body.assistanceAmount = Number(payload.amount);
//       }

//       return await apiClient.put(`/bonuses/${id}`, body);
//     },
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ["discounts"], exact: false });
//       queryClient.invalidateQueries({ queryKey: ["bonuses"], exact: false });
//       queryClient.invalidateQueries({ queryKey: ["advances"], exact: false });
//       queryClient.invalidateQueries({ queryKey: ["penalties"], exact: false });
//       queryClient.invalidateQueries({ queryKey: ["dashboard"], exact: false });
//       toast.success("تم تحديث السجل بنجاح");
//     },
//     onError: (error: unknown) => {
//       toast.error(normalizeError(error, "فشل تحديث السجل"));
//     },
//   });

//   const deleteDiscount = useMutation({
//     mutationFn: async ({ id, kind }: { id: string; kind: "advance" | "penalty" | "assistance" }) => {
//       const backendKind = kind === "advance" ? "advance" : "assistance";
//       return await apiClient.delete(`/discounts/${id}?kind=${backendKind}`);
//     },
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ["discounts"], exact: false });
//       queryClient.invalidateQueries({ queryKey: ["bonuses"], exact: false });
//       queryClient.invalidateQueries({ queryKey: ["advances"], exact: false });
//       queryClient.invalidateQueries({ queryKey: ["penalties"], exact: false });
//       queryClient.invalidateQueries({ queryKey: ["dashboard"], exact: false });
//       toast.success("تم نقل السجل إلى سلة المهملات");
//     },
//     onError: (error: unknown) => {
//       toast.error(normalizeError(error, "فشل حذف السجل"));
//     },
//   });

//   return {
//     ...query,
//     createDiscount,
//     updateDiscount,
//     deleteDiscount,
//   };
// };


import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/api-client";
import { toast } from "react-hot-toast";
import { QUERY_GC_TIME, QUERY_STALE_TIME } from "@/lib/query-cache";
import { getApiErrorMessage as normalizeError } from "@/lib/http/error";

export type DiscountRecord = {
  id: string;
  employeeId: string;
  type: string;
  kind: "advance" | "penalty" | "assistance" | "reward";
  amount: number;
  date: string;
  notes?: string;
  advanceType?: string;
  category?: string;
  backendModel?: "advance" | "penalty" | "bonus" | "assistance";
  createdAt?: string;
};

export type DiscountPayload = {
  employeeId: string;
  kind: "advance" | "penalty" | "assistance" | "reward";
  type: string;
  amount: number;
  date: string;
  notes?: string;
};

// دالة تحويل البيانات القادمة من الباك إند لتناسب الواجهة
const mapBackendKindToType = (record: Record<string, unknown>): { type: string; kind: DiscountRecord["kind"] } => {
  if (record.kind === 'penalty') {
    return { type: record.type as string || 'عقوبة إدارية', kind: "penalty" as const };
  }
  
  if (record.kind === 'advance') {
    const advanceType = record.advanceType as string;
    if (advanceType === "clothing") return { type: "شراء ملابس", kind: "advance" as const };
    return { type: "سلفة مالية", kind: "advance" as const };
  }

  if (record.kind === 'reward') {
    return { type: record.type as string || 'مكافأة', kind: "reward" as const };
  }
  
  if (record.kind === 'assistance') {
    return { type: record.type as string || 'خصم متنوع', kind: "assistance" as const };
  }
  
  // حالات التوافق مع السجلات القديمة (Fallback)
  if (record.advanceType || record.totalAmount !== undefined) {
    const advanceType = record.advanceType as string;
    if (advanceType === "clothing") return { type: "شراء ملابس", kind: "advance" as const };
    return { type: "سلفة مالية", kind: "advance" as const };
  }
  if (record.category) {
    return { type: "عقوبة إدارية", kind: "penalty" as const };
  }
  return { type: "أخرى", kind: "advance" as const };
};

export const useDiscounts = (employeeId?: string, period?: string, enabled = true) => {
  const queryClient = useQueryClient();
  const router = useRouter();

  const currentPeriod = new Date().toISOString().slice(0, 7);
  const isPastPeriod = period ? period < currentPeriod : false;

  const query = useQuery<DiscountRecord[]>({
    queryKey: ["discounts", employeeId || "all", period || "current"],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (employeeId) params.employeeId = employeeId;
      if (period) params.period = period;
      const res = await apiClient.get("/discounts", { params });
      const data = res.data;

      if (!Array.isArray(data)) {
        console.warn('Discounts API returned non-array data:', data);
        return [];
      }

      return data.map((record: Record<string, unknown>) => {
        const { type, kind } = mapBackendKindToType(record);
        const rawId = record.id as string;
        const id = kind === "reward" || kind === "assistance" ? `${rawId}_${kind}` : rawId;

        return {
          id,
          employeeId: record.employeeId as string,
          type,
          kind,
          backendModel: kind === "advance" ? "advance" : kind === "penalty" ? "penalty" : kind === "reward" ? "bonus" : "assistance",
          amount: Number(record.amount || record.totalAmount || 0),
          date: (record.issueDate as string || record.date as string || "").split("T")[0],
          notes: (record.notes as string) || (record.reason as string) || "",
          advanceType: record.advanceType as string | undefined,
          category: record.category as string | undefined,
        };
      });
    },
    enabled,
    staleTime: isPastPeriod ? 10 * 60_000 : QUERY_STALE_TIME.FAST,
    gcTime: QUERY_GC_TIME.STANDARD,
    refetchOnWindowFocus: true,
  });

  const createDiscount = useMutation({
    mutationFn: async (payload: DiscountPayload) => {
      // 1. معالجة العقوبات وإرسالها لمسارها الخاص
      if (payload.kind === "penalty") {
        const body: Record<string, unknown> = {
          employeeId: payload.employeeId,
          category: payload.type === "عقوبة" ? "عقوبة ادارية" : payload.type,
          amount: payload.amount,
          issueDate: payload.date,
          reason: payload.notes || undefined,
          period: payload.date?.slice(0, 7),
        };
        return await apiClient.post("/penalties", body);
      }

      // 2. معالجة السلف والخصومات والمكافآت
      const body: Record<string, unknown> = {
        employeeId: payload.employeeId,
        type: payload.type,
        kind: payload.kind === "advance" ? "advance" : payload.kind === "reward" ? "reward" : "assistance",
        amount: payload.amount,
        date: payload.date,
        notes: payload.notes,
      };

      // تحديد نوع السلفة (مالية أم ملابس)
      if (payload.kind === "advance") {
        body.advanceType = payload.type === "شراء ملابس" ? "clothing" : "salary";
      }

      return await apiClient.post("/discounts", body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discounts"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["bonuses"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["advances"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["penalties"], exact: false }); // تمت الإضافة من الكود 2
      queryClient.invalidateQueries({ queryKey: ["dashboard"], exact: false });
      router.refresh();
      toast.success("تم إضافة السجل بنجاح");
    },
    onError: (error: unknown) => {
      toast.error(normalizeError(error, "فشل إضافة السجل"));
    },
  });

  const updateDiscount = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: DiscountPayload }) => {
      // 1. تحديث العقوبة
      if (payload.kind === "penalty") {
        const body: Record<string, unknown> = {
          category: payload.type === "عقوبة" ? "عقوبة ادارية" : payload.type,
          amount: Number(payload.amount),
          reason: payload.notes || undefined,
          issueDate: payload.date,
        };
        return await apiClient.put(`/penalties/${id}`, body);
      }

      // 2. تحديث السلفة
      if (payload.kind === "advance") {
        const body: Record<string, unknown> = {
          remainingAmount: Number(payload.amount),
          installmentAmount: 0,
          notes: payload.notes,
        };
        return await apiClient.put(`/advances/${id}`, body);
      }

      // 3. تحديث المكافآت أو الخصم المتنوع
      const body: Record<string, unknown> = {
        bonusReason: payload.type,
        period: payload.date?.slice(0, 7),
      };

      if (payload.kind === "reward") {
        body.bonusAmount = Number(payload.amount);
        body.assistanceAmount = 0;
      } else {
        body.assistanceAmount = Number(payload.amount);
      }

      return await apiClient.put(`/bonuses/${id}`, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discounts"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["bonuses"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["advances"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["penalties"], exact: false }); // تمت الإضافة من الكود 2
      queryClient.invalidateQueries({ queryKey: ["dashboard"], exact: false });
      toast.success("تم تحديث السجل بنجاح");
    },
    onError: (error: unknown) => {
      toast.error(normalizeError(error, "فشل تحديث السجل"));
    },
  });

  const deleteDiscount = useMutation({
    mutationFn: async ({ id, kind }: { id: string; kind: DiscountRecord["kind"] }) => {
      return await apiClient.delete(`/discounts/${id}?kind=${kind}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discounts"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["bonuses"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["advances"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["penalties"], exact: false }); // تمت الإضافة من الكود 2
      queryClient.invalidateQueries({ queryKey: ["dashboard"], exact: false });
      toast.success("تم نقل السجل إلى سلة المهملات");
    },
    onError: (error: unknown) => {
      toast.error(normalizeError(error, "فشل حذف السجل"));
    },
  });

  return {
    ...query,
    createDiscount,
    updateDiscount,
    deleteDiscount,
  };
};