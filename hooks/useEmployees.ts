import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api-client";
import { toast } from "react-hot-toast";
import axios from "axios";
import type { Employee } from "@/types/employee";
import { QUERY_GC_TIME, QUERY_STALE_TIME } from "@/lib/query-cache";

export type UseEmployeesOptions = {
  status?: Employee["status"];
  includeTerminated?: boolean;
  department?: string;
  search?: string;
  page?: number;
  limit?: number;
  fetchAll?: boolean;
};

type TerminateEmployeeData = {
  terminationDate: string;
  terminationReason: string;
  notes?: string;
  status: "terminated" | "resigned";
};

type TerminateEmployeeVariables = {
  id: string;
  data: TerminateEmployeeData;
};

type ApiErrorBody = {
  message?: string | string[];
  error?: { message?: string | string[] };
};

const normalizeMessage = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) {
    return value.join(" | ");
  }
  if (typeof value === "string") {
    return value;
  }
  return "";
};

export const getErrorMessage = (error: unknown, fallback: string) => {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    const message =
      normalizeMessage(error.response?.data?.error?.message) ||
      normalizeMessage(error.response?.data?.message);
    if (message.trim()) {
      return message;
    }
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
};

export const toHourlyRateNumber = (value: Employee["hourlyRate"]) => {
  if (value && typeof value === "object" && "$numberDecimal" in value) {
    return Number(value.$numberDecimal || 0);
  }
  if (typeof value === "string") {
    const normalized = value.replace(/,/g, "").trim();
    return Number(normalized || 0);
  }
  return Number(value || 0);
};

export const assertHourlyRate = (hourlyRate: number) => {
  if (!Number.isFinite(hourlyRate)) {
    throw new Error("أجر الساعة يجب أن يكون رقمًا صالحًا");
  }
};

export const filterEmployeesByOptions = (employees: Employee[], options?: UseEmployeesOptions) => {
  const shouldExcludeTerminated = !options?.status && options?.includeTerminated !== true;

  if (options?.status) {
    return employees.filter((employee) => employee.status === options.status);
  }

  // التعديل الأول: إخفاء المستقيلين والمقالين من القائمة الرئيسية
  if (shouldExcludeTerminated) {
    return employees.filter((employee) => employee.status !== "terminated");
  }

  return employees;
};

export const useEmployees = (options?: UseEmployeesOptions) => {
  const queryClient = useQueryClient();

  const safeLimit = Math.min(Math.max(options?.limit ?? 500, 1), 500);
  const fetchAll = options?.fetchAll ?? true;

  const shouldExcludeTerminated = !options?.status && options?.includeTerminated !== true;

  // 1. جلب الموظفين
  const query = useQuery<Employee[]>({
    queryKey: [
      "employees",
      options?.status || "all-statuses",
      shouldExcludeTerminated ? "exclude-terminated" : "include-terminated",
      options?.department || "all-departments",
      options?.search || "no-search",
      options?.page || 1,
      safeLimit,
      fetchAll ? "fetch-all" : "first-page-only",
    ],
    queryFn: async () => {
      const requestEmployees = async (page?: number) => {
        const params = {
          ...(options?.status ? { status: options.status } : {}),
          ...(options?.department ? { department: options.department } : {}),
          ...(options?.search ? { search: options.search } : {}),
          ...(page ? { page } : {}),
          limit: safeLimit,
        };

        return apiClient.get("/employees", { params });
      };

      const unwrapEmployeeList = (payload: unknown): unknown => {
        if (!payload || typeof payload !== "object") {
          return payload;
        }

        const record = payload as Record<string, unknown>;

        if (Array.isArray(record.employees)) {
          return record.employees;
        }

        if (Array.isArray(record.items)) {
          return record.items;
        }

        if (Array.isArray(record.results)) {
          return record.results;
        }

        if (Array.isArray(record.data)) {
          return record.data;
        }

        if (record.data && typeof record.data === "object") {
          return unwrapEmployeeList(record.data);
        }

        return payload;
      };

      const firstPage = options?.page || 1;
      const response = await requestEmployees(firstPage);

      const resolveEmployees = (payload: unknown): Employee[] => {
        const normalizedPayload = unwrapEmployeeList(payload);

        if (Array.isArray(normalizedPayload)) {
          return normalizedPayload as Employee[];
        }

        if (
          normalizedPayload &&
          typeof normalizedPayload === "object" &&
          Array.isArray((normalizedPayload as { employees?: unknown }).employees)
        ) {
          return (normalizedPayload as { employees: Employee[] }).employees;
        }

        if (
          normalizedPayload &&
          typeof normalizedPayload === "object" &&
          Array.isArray((normalizedPayload as { data?: unknown }).data)
        ) {
          return (normalizedPayload as { data: Employee[] }).data;
        }

        if (Array.isArray(payload)) {
          return payload as Employee[];
        }

        if (
          payload &&
          typeof payload === "object" &&
          Array.isArray((payload as { employees?: unknown }).employees)
        ) {
          return (payload as { employees: Employee[] }).employees;
        }

        return [];
      };

      let employeesData: Employee[] = resolveEmployees(response.data);

      const pagination = response.data?.pagination;

      if (fetchAll && !options?.page && pagination?.pages && pagination.pages > firstPage) {
        for (let page = firstPage + 1; page <= pagination.pages; page += 1) {
          const pageResponse = await requestEmployees(page);
          const pageEmployees: Employee[] = resolveEmployees(pageResponse.data);
          employeesData = employeesData.concat(pageEmployees);
        }
      }

      return filterEmployeesByOptions(employeesData, options);
    },
    staleTime: QUERY_STALE_TIME.RELAXED,
    gcTime: QUERY_GC_TIME.RELAXED,
  });

  // 2. إضافة موظف
  const createMutation = useMutation({
    mutationFn: async (newEmployee: Employee) => {
      const hourlyRate =
        newEmployee.hourlyRate !== undefined && newEmployee.hourlyRate !== null
          ? toHourlyRateNumber(newEmployee.hourlyRate)
          : undefined;

      if (hourlyRate !== undefined) {
        assertHourlyRate(hourlyRate);
      }

      const payload = {
        ...newEmployee,
        ...(hourlyRate !== undefined ? { hourlyRate } : {}),
      };
      return await apiClient.post("/employees", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["salaries"] });
      toast.success("تم إضافة الموظف بنجاح!");
    },
    onError: (error: unknown) => {
      let finalMessage = getErrorMessage(error, "حدث خطأ غير متوقع");
      if (finalMessage.includes("employeeId must match")) {
        finalMessage = "خطأ: يجب أن يبدأ كود الموظف بـ EMP متبوعاً بأرقام (مثال: EMP001)";
      }
      toast.error(finalMessage, { duration: 5000 });
    }
  });

  // 3. تعديل موظف (استخدمنا employeeId بناءً على الباك إند)
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Employee> }) => {
      const normalizedHourlyRate =
        data.hourlyRate !== undefined ? toHourlyRateNumber(data.hourlyRate) : undefined;

      if (normalizedHourlyRate !== undefined) {
        assertHourlyRate(normalizedHourlyRate);
      }

      const payload = {
        ...data,
        ...(normalizedHourlyRate !== undefined ? { hourlyRate: normalizedHourlyRate } : {}),
      };
      return await apiClient.put(`/employees/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["salaries"] });
      toast.success("تم تحديث بيانات الموظف بنجاح!");
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "فشل تحديث بيانات الموظف"));
    }
  });

  // 4. حذف موظف
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiClient.delete(`/employees/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["salaries"] });
      toast.success("تم حذف الموظف بنجاح!");
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "فشل حذف الموظف"));
    }
  });

  
  // 5. إقالة أو استقالة موظف
  const terminateMutation = useMutation<unknown, unknown, TerminateEmployeeVariables>({
    mutationFn: async ({ id, data }) => {
      const payload = {
        terminationDate: data.terminationDate,
        terminationReason: data.terminationReason,
      };

      const endpoint = data.status === "resigned" ? "resign" : "terminate";
      return await apiClient.patch(`/employees/${id}/${endpoint}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success("تم نقل الموظف للأرشيف بنجاح!");
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "فشل في إنهاء الخدمة"));
    }
  });

  // التعديل الثاني: تصفية مستحقات موظف (للمحاسب)
  const settleMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiClient.patch(`/employees/${id}/settle`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success("تم تصفية حقوق الموظف بنجاح وإغلاق ملفه المالي!");
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "فشل في تصفية الموظف"));
    }
  });

  // التعديل الثالث: إرجاع كل الدوال لتعمل في الصفحة
  return { 
    ...query, 
    createEmployee: createMutation, 
    updateEmployee: updateMutation, 
    deleteEmployee: deleteMutation,
    terminateEmployee: terminateMutation,
    settleEmployee: settleMutation
  };
};

// التعديل الرابع: جلب الأرشيف (المقالين والمستقيلين معاً)
export const useResignedEmployees = () =>
   useEmployees({ includeTerminated: true });