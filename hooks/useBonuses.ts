import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import apiClient from "@/lib/api-client";
import { Bonus, BonusInput } from "@/types/bonus";
import { QUERY_GC_TIME, QUERY_STALE_TIME } from "@/lib/query-cache";
import { getApiErrorMessage as getErrorMessage } from "@/lib/http/error";

export const useBonuses = (params?: { employeeId?: string; period?: string }) => {
  const queryClient = useQueryClient();
  const router = useRouter();

  const bonusesQuery = useQuery<Bonus[]>({
    queryKey: ["bonuses", params?.employeeId || "all", params?.period || "all-periods"],
    queryFn: async () => {
      const res = await apiClient.get("/bonuses", {
        params: {
          employeeId: params?.employeeId,
          period: params?.period,
        },
      });
      
      const data = res.data;
      
      // التحقق من أن البيانات array
      if (Array.isArray(data)) {
        return data;
      }
      
      // إذا كانت البيانات في خاصية rewards
      if (data && Array.isArray(data.rewards)) {
        return data.rewards;
      }
      
      // إذا كانت البيانات في خاصية bonuses
      if (data && Array.isArray(data.bonuses)) {
        return data.bonuses;
      }
      
      // إذا كانت البيانات في خاصية data
      if (data && Array.isArray(data.data)) {
        return data.data;
      }
      
      // إرجاع array فارغ كـ fallback
      return [];
    },
    staleTime: QUERY_STALE_TIME.RELAXED,
    gcTime: QUERY_GC_TIME.RELAXED,
  });

  const createBonus = useMutation({
    mutationFn: async (payload: BonusInput) => {
      const data = {
        employeeId: payload.employeeId,
        bonusAmount: Number(payload.bonusAmount || 0),
        bonusReason: payload.bonusReason,
        assistanceAmount: Number(payload.assistanceAmount || 0),
        period: payload.period,
      };
      return await apiClient.post("/bonuses", data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["bonuses"], exact: false });
      await queryClient.invalidateQueries({ queryKey: ["discounts"], exact: false });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"], exact: false });
      router.refresh();
      toast.success("تمت إضافة المكافأة بنجاح");
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "فشل إضافة المكافأة"));
    },
  });

  const updateBonus = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<BonusInput> }) => {
      const payload = {
        bonusAmount: data.bonusAmount !== undefined ? Number(data.bonusAmount) : undefined,
        bonusReason: data.bonusReason,
        assistanceAmount: data.assistanceAmount !== undefined ? Number(data.assistanceAmount) : undefined,
        period: data.period,
      };
      return await apiClient.put(`/bonuses/${id}`, payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["bonuses"], exact: false });
      await queryClient.invalidateQueries({ queryKey: ["discounts"], exact: false });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"], exact: false });
      router.refresh();
      toast.success("تم تحديث المكافأة");
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "فشل تحديث المكافأة"));
    },
  });

  const deleteBonus = useMutation({
    mutationFn: async (id: string) => {
      return await apiClient.delete(`/bonuses/${id}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["bonuses"], exact: false });
      await queryClient.invalidateQueries({ queryKey: ["discounts"], exact: false });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"], exact: false });
      router.refresh();
      toast.success("تم نقل المكافأة إلى سلة المهملات");
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "فشل حذف المكافأة"));
    },
  });

  return {
    ...bonusesQuery,
    createBonus,
    updateBonus,
    deleteBonus,
  };
};

