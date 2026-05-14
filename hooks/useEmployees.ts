// import { useQuery } from "@tanstack/react-query";
// import apiClient from "@/lib/api-client";
// import { Employee } from "@/types/employee";

// export const useEmployees = () => {
//   return useQuery<Employee[]>({
//     queryKey: ["employees"], // مفتاح فريد لتخزين البيانات في الذاكرة
//     queryFn: async () => {
//       console.log("🌐 [Fetch] جاري طلب قائمة الموظفين من السيرفر...");
//       console.time("⏱️ [Fetch Employees Time]");

//       try {
//         const response = await apiClient.get("/employees");
//         console.log("✅ [Fetch] تم استلام بيانات الموظفين:", response.data);
//         return response.data;
//       } catch (error: any) {
//         console.error("❌ [Fetch Error] فشل جلب الموظفين:", error.response?.data || error.message);
//         throw error;
//       } finally {
//         console.timeEnd("⏱️ [Fetch Employees Time]");
//       }
//     },
//   });
// };


// import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
// import apiClient from "@/lib/api-client";
// import { Employee } from "@/types/employee";
// import { toast } from "react-hot-toast";

// export const useEmployees = () => {
//   const queryClient = useQueryClient();

//   // 1. جلب البيانات
//   const query = useQuery<Employee[]>({
//     queryKey: ["employees"],
//     queryFn: async () => {
//       const response = await apiClient.get("/employees");
//       const employeesData = response.data?.employees;
      
//       if (Array.isArray(employeesData)) {
//         return employeesData;
//       }
//       return [];
//     }
//   });

//   // 2. إضافة موظف
//   const createMutation = useMutation({
//     mutationFn: async (newEmployee: any) => {
//       // تحويل الأجر إلى رقم لتجنب أخطاء الباك إند
//       const payload = {
//         ...newEmployee,
//         hourlyRate: Number(newEmployee.hourlyRate)
//       };
//       return await apiClient.post("/employees", payload);
//     },
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ["employees"] });
//       toast.success("تم إضافة الموظف بنجاح!");
//     },
//     onError: (error: any) => {
//       console.error("❌ [Error]:", error.response?.data);
//       const serverMessage = error.response?.data?.error?.message;
//       let finalMessage = "حدث خطأ غير متوقع";
//       if (Array.isArray(serverMessage)) {
//         finalMessage = serverMessage.join(" | "); // دمج الأخطاء لو كانت كتيرة
//       } else if (typeof serverMessage === "string") {
//         finalMessage = serverMessage;
//       }

//       // 3. عرض رسالة الخطأ الحقيقية للمستخدم
//       // رح نستخدم نسخة مترجمة بسيطة لبعض الأخطاء الشائعة ليكون النظام عالمي
//       if (finalMessage.includes("employeeId must match")) {
//         finalMessage = "خطأ في كود الموظف: يجب أن يبدأ بـ EMP متبوعاً بـ 3 أرقام على الأقل (مثال: EMP001)";
//       }
//       toast.error(finalMessage, {
//         duration: 5000, // خليها تظهر لفترة أطول ليقدر يقرأها
//       });
//     }
//   });

//   // أضف هذه الدوال داخل الـ Hook useEmployees
  
//   // 3. تعديل موظف
//   const updateMutation = useMutation({
//     mutationFn: async ({ id, data }: { id: string; data: any }) => {
//       return await apiClient.put(`/employees/${id}`, data);
//     },
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ["employees"] });
//       toast.success("تم تحديث بيانات الموظف");
//     },
//     onError: (error: any) => {
//       toast.error(error.response?.data?.message || "فشل التحديث");
//     }
//   });

//   // 4. حذف موظف
//   const deleteMutation = useMutation({
//     mutationFn: async (id: string) => {
//       return await apiClient.delete(`/employees/${id}`);
//     },
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ["employees"] });
//       toast.success("تم حذف الموظف بنجاح");
//     },
//     onError: (error: any) => {
//       toast.error(error.response?.data?.message || "فشل الحذف");
//     }
//   });

//   return { 
//     ...query, 
//     createEmployee: createMutation, 
//     updateEmployee: updateMutation, 
//     deleteEmployee: deleteMutation 
//   };

//   // إرجاع كل شيء بشكل صحيح
//   return { ...query, createEmployee: createMutation };
// };



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

const getErrorMessage = (error: unknown, fallback: string) => {
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

  if (shouldExcludeTerminated) {
    return employees.filter((employee) => employee.status !== "terminated");
  }

  return employees;
};

export const useEmployees = (options?: UseEmployeesOptions) => {
  const queryClient = useQueryClient();

  const safeLimit = Math.min(Math.max(options?.limit ?? 200, 1), 200);
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

      const firstPage = options?.page || 1;
      const response = await requestEmployees(firstPage);

      const resolveEmployees = (payload: unknown): Employee[] => {
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
    staleTime: QUERY_STALE_TIME.STANDARD,
    gcTime: QUERY_GC_TIME.RELAXED,
  });

  // 2. إضافة موظف
  const createMutation = useMutation({
    mutationFn: async (newEmployee: Employee) => {
      const hourlyRate = toHourlyRateNumber(newEmployee.hourlyRate);
      assertHourlyRate(hourlyRate);
      const payload = { ...newEmployee, hourlyRate };
      return await apiClient.post("/employees", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
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
      toast.success("تم حذف الموظف بنجاح!");
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "فشل حذف الموظف"));
    }
  });

  // إرجاع كل الدوال لتعمل في الصفحة
  return { 
    ...query, 
    createEmployee: createMutation, 
    updateEmployee: updateMutation, 
    deleteEmployee: deleteMutation 
  };
};

export const useResignedEmployees = () => useEmployees({ status: "terminated", includeTerminated: true });
