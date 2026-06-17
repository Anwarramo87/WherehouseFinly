import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/api-client";
import { toast } from "react-hot-toast";
import { QUERY_GC_TIME, QUERY_STALE_TIME } from "@/lib/query-cache";

export type PayrollInputRecord = {
  id?: string;
  employeeId: string;
  periodStart: string;
  periodEnd: string;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  absenceDays: number;
  sickLeaveDays: number;
  adminLeaveDays: number;
  unpaidLeaveDays: number;
  deathLeaveDays: number;
  unpaidHours: number;
  overtimeRegularMinutes: number;
  overtimeWeekendDays: number;
  penaltyAmount?: number;
  clothingDeduction?: number;
  bonusAdjustment?: number;
  advanceAmount?: number;
  insuranceAmount?: number;
  transportAllowanceOverride?: number;
  notes?: string;
};

export type UpsertPayrollInputPayload = Omit<PayrollInputRecord, 'id'>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const normalizeError = (error: any): string => {
  const message = error?.response?.data?.message || error?.message || "حدث خطأ غير معروف";
  if (Array.isArray(message)) {
    return message.join(" | ");
  }
  return message;
};

export const usePayrollInputs = (periodStart?: string, periodEnd?: string) => {
  const queryClient = useQueryClient();
  const router = useRouter();

  const query = useQuery<PayrollInputRecord[]>({
    queryKey: ["payrollInputs", periodStart, periodEnd],
    queryFn: async () => {
      if (!periodStart || !periodEnd) return [];

      const params = { periodStart, periodEnd };
      const res = await apiClient.get("/payroll/inputs", { params });

      const data = Array.isArray(res.data) ? res.data : res.data?.data || [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return data.map((item: any) => ({
        id: item.id,
        employeeId: item.employeeId,
        periodStart: item.periodStart?.split("T")[0] || periodStart,
        periodEnd: item.periodEnd?.split("T")[0] || periodEnd,
        lateMinutes: Number(item.lateMinutes || 0),
        earlyLeaveMinutes: Number(item.earlyLeaveMinutes || 0),
        absenceDays: Number(item.absenceDays || 0),
        sickLeaveDays: Number(item.sickLeaveDays || 0),
        adminLeaveDays: Number(item.adminLeaveDays || 0),
        unpaidLeaveDays: Number(item.unpaidLeaveDays || 0),
        deathLeaveDays: Number(item.deathLeaveDays || 0),
        unpaidHours: Number(item.unpaidHours || 0),
        overtimeRegularMinutes: Number(item.overtimeRegularMinutes || 0),
        overtimeWeekendDays: Number(item.overtimeWeekendDays || 0),
        penaltyAmount: Number(item.penaltyAmount || 0),
        clothingDeduction: Number(item.clothingDeduction || 0),
        bonusAdjustment: Number(item.bonusAdjustment || 0),
        advanceAmount: Number(item.advanceAmount || 0),
        insuranceAmount: item.insuranceAmount ? Number(item.insuranceAmount) : undefined,
        transportAllowanceOverride: item.transportAllowanceOverride ? Number(item.transportAllowanceOverride) : undefined,
        notes: item.notes || "",
      }));
    },
    enabled: !!periodStart && !!periodEnd,
    staleTime: QUERY_STALE_TIME.RELAXED,
    gcTime: QUERY_GC_TIME.RELAXED,
  });

  const upsertMutation = useMutation({
    mutationFn: async (payload: UpsertPayrollInputPayload) => {
      const formattedPayload = {
        ...payload,
        periodStart: payload.periodStart?.split('T')[0] || payload.periodStart,
        periodEnd: payload.periodEnd?.split('T')[0] || payload.periodEnd,
      };

      return apiClient.post("/payroll/inputs", formattedPayload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["payrollInputs"] });
      // Also invalidate deductions so the UI picks up fresh EARLY_LEAVE_MINUTES
      await queryClient.invalidateQueries({ queryKey: ["attendance-deductions"] });
      router.refresh();
      toast.success("تم الحفظ بنجاح!");
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      toast.error(normalizeError(error));
    }
  });

  return {
    ...query,
    upsertPayrollInput: upsertMutation
  };
};
