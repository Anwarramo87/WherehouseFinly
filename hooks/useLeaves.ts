import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import axios from "axios";
import apiClient from "@/lib/api-client";
import { QUERY_GC_TIME, QUERY_STALE_TIME } from "@/lib/query-cache";

type ApiErrorBody = {
  message?: string;
  error?: { message?: string };
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    const message = error.response?.data?.error?.message ?? error.response?.data?.message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
};

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

type LeaveListResponse = {
  leaveRequests: LeaveRequest[];
};

export const useLeaves = (params?: { employeeId?: string; status?: string; leaveType?: string; startDate?: string; endDate?: string }) => {
  const queryClient = useQueryClient();

  const leavesQuery = useQuery<LeaveRequest[]>({
    queryKey: ["leaves", params?.employeeId || "all", params?.status || "all-statuses", params?.leaveType || "all-types"],
    queryFn: async () => {
      const res = await apiClient.get("/leaves", {
        params: {
          employeeId: params?.employeeId,
          status: params?.status,
          leaveType: params?.leaveType,
          startDate: params?.startDate,
          endDate: params?.endDate,
        },
      });
      const data = res.data as LeaveListResponse | undefined;
      return data?.leaveRequests ?? [];
    },
    staleTime: QUERY_STALE_TIME.RELAXED,
    gcTime: QUERY_GC_TIME.RELAXED,
  });

  const createLeave = useMutation({
    mutationFn: async (payload: LeaveInput) => {
      return await apiClient.post("/leaves", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leaves"], exact: false });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leaves"], exact: false });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leaves"], exact: false });
      toast.success("تم حذف طلب الإجازة");
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