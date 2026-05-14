// import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
// import apiClient from "@/lib/api-client";
// import { toast } from "react-hot-toast";
// import { Salary, SalaryInput } from "@/types/salary";

// // Hook that provides salaries list + helpers for single salary + mutations
// export const useSalaries = () => {
//   const queryClient = useQueryClient();

//   const salariesQuery = useQuery<Salary[]>({
//     queryKey: ["salaries"],
//     queryFn: async () => {
//       const res = await apiClient.get("/salary");
//       // backend might return array directly or wrap it
//       const data = res.data?.salaries ?? res.data;
//       return Array.isArray(data) ? data : [];
//     },
//   });

//   // convenience hook for a single employee salary
//   const useEmployeeSalary = (employeeId?: string) =>
//     useQuery<Salary | null>({
//       queryKey: ["salary", employeeId],
//       enabled: !!employeeId,
//       queryFn: async () => {
//         try {
//           const res = await apiClient.get(`/salary/${employeeId}`);
//           return res.data ?? null;
//         } catch (err: any) {
//           const status = err?.response?.status;
//           // If not found or bad request because salary record doesn't exist, return null silently
//           if (status === 404 || status === 400) {
//             return null;
//           }
//           // rethrow other errors (connection, 500, etc.) so react-query handles retries and error states
//           throw err;
//         }
//       },
//     });

//   const updateSalary = useMutation({
//     mutationFn: async ({ employeeId, data }: { employeeId: string; data: SalaryInput }) => {
//       // ensure numeric fields are numbers
//       const payload = {
//         ...data,
//         baseSalary: Number(data.baseSalary),
//         responsibilityAllowance: Number(data.responsibilityAllowance),
//         productionIncentive: Number(data.productionIncentive),
//         transportAllowance: Number(data.transportAllowance),
//       };
//       return await apiClient.put(`/salary/${employeeId}`, payload);
//     },
//     onSuccess: (_data, variables) => {
//       queryClient.invalidateQueries({ queryKey: ["salaries"] });
//       if (variables?.employeeId) queryClient.invalidateQueries({ queryKey: ["salary", variables.employeeId] });
//       toast.success("تم حفظ مكونات الراتب بنجاح");
//     },
//     onError: (error: any) => {
//       const msg = error?.response?.data?.message || "فشل حفظ الراتب";
//       toast.error(msg);
//     },
//   });

//   const deleteSalary = useMutation({
//     mutationFn: async (employeeId: string) => {
//       return await apiClient.delete(`/salary/${employeeId}`);
//     },
//     onSuccess: (_data, employeeId) => {
//       queryClient.invalidateQueries({ queryKey: ["salaries"] });
//       if (employeeId) queryClient.invalidateQueries({ queryKey: ["salary", employeeId] });
//       toast.success("تم حذف بيانات الراتب");
//     },
//     onError: (error: any) => {
//       toast.error(error?.response?.data?.message || "فشل حذف الراتب");
//     },
//   });

//   return {
//     // list query props
//     ...salariesQuery,
//     // helpers
//     useEmployeeSalary,
//     updateSalary,
//     deleteSalary,
//   };
// };

// export default useSalaries;


import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api-client";
import { toast } from "react-hot-toast";
import axios from "axios";
import { Salary, SalaryInput } from "@/types/salary";
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

// Hook that provides salaries list + helpers for single salary + mutations
export const useSalaries = () => {
  const queryClient = useQueryClient();

  const salariesQuery = useQuery<Salary[]>({
    queryKey: ["salaries"],
    queryFn: async () => {
      const res = await apiClient.get("/salary");
      const data = res.data?.salaries ?? res.data;
      return Array.isArray(data) ? data : [];
    },
    staleTime: QUERY_STALE_TIME.STANDARD,
    gcTime: QUERY_GC_TIME.RELAXED,
  });

  const useEmployeeSalary = (employeeId?: string) =>
    useQuery<Salary | null>({
      queryKey: ["salary", employeeId],
      enabled: !!employeeId,
      queryFn: async () => {
        try {
          const res = await apiClient.get(`/salary/${employeeId}`);
          const data = res.data ?? null;

          // تحويل extraEffortAllowance -> extraEffort للتوافقية
          if (data && data.extraEffortAllowance !== undefined && data.extraEffort === undefined) {
            data.extraEffort = data.extraEffortAllowance;
          }

          return data;
        } catch (error: unknown) {
          const status = axios.isAxiosError(error) ? error.response?.status : undefined;
          if (status === 404 || status === 400) {
            return null;
          }
          throw error;
        }
      },
      retry: false,
      staleTime: QUERY_STALE_TIME.STANDARD,
      gcTime: QUERY_GC_TIME.RELAXED,
    });

  const updateSalary = useMutation({
    mutationFn: async ({ employeeId, data }: { employeeId: string; data: SalaryInput }) => {
      // Include all numeric salary components the modal may send (including computed extras)
      // `data` is a SalaryInput but form inputs may come as strings; coerce safely.
      const safe = data as Partial<SalaryInput>;
      const payload = {
        profession: safe.profession ?? "",
        baseSalary: Number(safe.baseSalary ?? 0),
        responsibilityAllowance: Number(safe.responsibilityAllowance ?? 0),
        productionIncentive: Number(safe.productionIncentive ?? 0),
        transportAllowance: Number(safe.transportAllowance ?? 0),
        extraEffortAllowance: Number(safe.extraEffortAllowance ?? safe.extraEffort ?? 0),
        insuranceAmount: Number(safe.insurances ?? 0),
      };

      console.log(`📤 [Put] Sending cleaned payload to /salary/${employeeId}`, payload);

      return await apiClient.put(`/salary/${employeeId}`, payload);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["salaries"] });
      if (variables?.employeeId) {
        queryClient.invalidateQueries({ queryKey: ["salary", variables.employeeId] });
      }
      toast.success("تم حفظ مكونات الراتب بنجاح");
    },
    onError: (error: unknown) => {
      const msg = getErrorMessage(error, "فشل حفظ الراتب");
      toast.error(msg);
      if (axios.isAxiosError(error)) {
        console.error("❌ Salary Update Error:", error.response?.data);
      } else {
        console.error("❌ Salary Update Error:", error);
      }
    },
  });

  const deleteSalary = useMutation({
    mutationFn: async (employeeId: string) => {
      return await apiClient.delete(`/salary/${employeeId}`);
    },
    onSuccess: (_data, employeeId) => {
      queryClient.invalidateQueries({ queryKey: ["salaries"] });
      if (employeeId) {
        queryClient.invalidateQueries({ queryKey: ["salary", employeeId] });
      }
      toast.success("تم حذف بيانات الراتب");
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "فشل حذف الراتب"));
    },
  });

  return {
    ...salariesQuery,
    useEmployeeSalary,
    updateSalary,
    deleteSalary,
  };
};

export default useSalaries;
