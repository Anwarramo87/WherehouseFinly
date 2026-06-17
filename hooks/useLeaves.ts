import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import apiClient from "@/lib/api-client";
import { QUERY_GC_TIME, QUERY_STALE_TIME } from "@/lib/query-cache";
import { getApiErrorMessage as getErrorMessage } from "@/lib/http/error";

export type LeaveRequest = {
  id: string;
  employeeId: string;
  leaveType: string;
  status: string;
  isPaid: boolean;
  startDate: string;
  endDate: string;
  reason?: string;
  notes?: string;
  employee?: {
    employeeId: string;
    name: string;
    department: string;
    departmentId: string;
  };
  createdAt: string;
  updatedAt: string;
};

export type LeaveInput = {
  employeeId: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason?: string;
  notes?: string;
  isPaid?: boolean;
  status?: string;
};

export const useLeaves = (params?: { employeeId?: string; status?: string; leaveType?: string; startDate?: string; endDate?: string }) => {
  const queryClient = useQueryClient();
  const router = useRouter();

  const leavesQuery = useQuery<LeaveRequest[]>({
    queryKey: ["leaves", params?.employeeId || "all", params?.status || "all-statuses", params?.leaveType || "all-types", params?.startDate || "no-start", params?.endDate || "no-end"],
    queryFn: async () => {
      const res = await apiClient.get("/leaves", {
        params: {
          employeeId: params?.employeeId,
          status: params?.status,
          leaveType: params?.leaveType,
          startDate: params?.startDate,
          endDate: params?.endDate,
          limit: 500,
        },
      });
      const raw = res.data;
      // الباك إند يعيد { data: [...], total, page, ... } عبر paginatedResponse
      // LeaveListResponse القديم (leaveRequests) لم يعد مستخدماً
      const list: LeaveRequest[] = Array.isArray(raw?.data)
        ? raw.data
        : Array.isArray(raw?.leaveRequests)
          ? raw.leaveRequests
          : Array.isArray(raw)
            ? raw
            : [];

      // توحيد صيغة التواريخ: الباك إند يعيد ISO datetime (2026-06-10T00:00:00.000Z)
      // نحوّلها إلى YYYY-MM-DD لضمان عمل مقارنات النطاق بشكل صحيح
      return list.map((leave) => ({
        ...leave,
        startDate: leave.startDate?.slice(0, 10) ?? leave.startDate,
        endDate: leave.endDate?.slice(0, 10) ?? leave.endDate,
      }));
    },
    staleTime: QUERY_STALE_TIME.RELAXED,
    gcTime: QUERY_GC_TIME.RELAXED,
  });

  const createLeave = useMutation({
    mutationFn: async (payload: LeaveInput) => {
      return await apiClient.post("/leaves", payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["leaves"], exact: false });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"], exact: false });
      router.refresh();
      toast.success("تمت إضافة طلب الإجازة بنجاح");
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "فشل إضافة طلب الإجازة"));
    },
  });

  const updateLeaveStatus = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<LeaveInput> }) => {
      return await apiClient.patch(`/leaves/${id}`, data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["leaves"], exact: false });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"], exact: false });
      router.refresh();
      toast.success("تم تحديث طلب الإجازة");
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "فشل تحديث طلب الإجازة"));
    },
  });

  const deleteLeave = useMutation({
    mutationFn: async (id: string) => {
      return await apiClient.delete(`/leaves/${id}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["leaves"], exact: false });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"], exact: false });
      router.refresh();
      toast.success("تم نقل طلب الإجازة إلى سلة المهملات");
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "فشل حذف طلب الإجازة"));
    },
  });

  return {
    ...leavesQuery,
    createLeave,
    updateLeaveStatus,
    deleteLeave,
  };
};