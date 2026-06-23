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

  const currentPeriod = new Date().toISOString().slice(0, 7);
  const isPastPeriod = params?.period ? params.period < currentPeriod : false;

  const bonusesQuery = useQuery<Bonus[]>({
    queryKey: ["bonuses", params?.employeeId || "all", params?.period || "all-periods"],
    queryFn: async () => {
      const requestParams = {
        employeeId: params?.employeeId,
        period: params?.period,
        limit: 500,
      };
      console.log('[useBonuses] Making API request with params:', requestParams);
      
      const res = await apiClient.get("/bonuses", {
        params: requestParams,
      });
      
      const data = res.data;
      console.log('[useBonuses] Full API response:', JSON.stringify(data, null, 2));
      console.log('[useBonuses] Response type:', typeof data, 'IsArray:', Array.isArray(data));
      
      if (data && typeof data === 'object') {
        console.log('[useBonuses] Response keys:', Object.keys(data));
        if (data.data) {
          console.log('[useBonuses] data.data is array:', Array.isArray(data.data), 'length:', data.data?.length);
          if (Array.isArray(data.data) && data.data.length > 0) {
            console.log('[useBonuses] First bonus item:', data.data[0]);
          }
        }
      }
      
      // التحقق من أن البيانات array مباشرة
      if (Array.isArray(data)) {
        console.log('[useBonuses] ✅ Returning direct array, count:', data.length);
        return data;
      }
      
      // إذا كانت البيانات في خاصية data (paginated response)
      if (data && Array.isArray(data.data)) {
        console.log('[useBonuses] ✅ Returning data.data array, count:', data.data.length);
        return data.data;
      }
      
      // إذا كانت البيانات في خاصية rewards
      if (data && Array.isArray(data.rewards)) {
        console.log('[useBonuses] ✅ Returning data.rewards array, count:', data.rewards.length);
        return data.rewards;
      }
      
      // إذا كانت البيانات في خاصية bonuses
      if (data && Array.isArray(data.bonuses)) {
        console.log('[useBonuses] ✅ Returning data.bonuses array, count:', data.bonuses.length);
        return data.bonuses;
      }
      
      console.warn('[useBonuses] ❌ Unexpected format, returning empty array. Response:', data);
      return [];
    },
    staleTime: isPastPeriod ? 10 * 60_000 : QUERY_STALE_TIME.FAST,
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

