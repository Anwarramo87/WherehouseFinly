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

export type InsuranceRecord = {
  employeeId: string;
  insuranceSalary: number | string;
  socialSecurityNumber?: string;
  registrationDate?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type InsuranceInput = {
  insuranceSalary: number;
  socialSecurityNumber?: string;
  registrationDate?: string;
};

export const useInsurance = (employeeId?: string) => {
  const queryClient = useQueryClient();

  const insuranceQuery = useQuery<InsuranceRecord | null>({
    queryKey: ["insurance", employeeId],
    queryFn: async () => {
      if (!employeeId) return null;
      try {
        const res = await apiClient.get(`/insurance/${employeeId}`);
        return res.data;
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          return null;
        }
        throw error;
      }
    },
    enabled: !!employeeId,
    staleTime: QUERY_STALE_TIME.STANDARD,
    gcTime: QUERY_GC_TIME.RELAXED,
  });

  const upsertInsurance = useMutation({
    mutationFn: async ({ empId, data }: { empId: string; data: InsuranceInput }) => {
      return await apiClient.put(`/insurance/${empId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["insurance"], exact: false });
      toast.success("تم تحديث بيانات التأمين بنجاح");
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "فشل تحديث بيانات التأمين"));
    },
  });

  return {
    ...insuranceQuery,
    upsertInsurance,
  };
};