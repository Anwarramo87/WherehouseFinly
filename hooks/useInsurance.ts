import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import axios from "axios";
import apiClient from "@/lib/api-client";
import { QUERY_GC_TIME, QUERY_STALE_TIME } from "@/lib/query-cache";
import { getApiErrorMessage as getErrorMessage } from "@/lib/http/error";export type InsuranceRecord = {
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
    staleTime: QUERY_STALE_TIME.RELAXED,
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