import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import apiClient from "@/lib/api-client";
import type { Employee } from "@/types/employee";
import { QUERY_GC_TIME, QUERY_STALE_TIME } from "@/lib/query-cache";
import { getApiErrorMessage } from "@/lib/http/error";

/** Re-export for backwards-compat with components that import getErrorMessage from here */
export const getErrorMessage = getApiErrorMessage;

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

export const filterEmployeesByOptions = (employees: Employee[], options?: UseEmployeesOptions) => {
  const shouldExcludeTerminated = !options?.status && options?.includeTerminated !== true;

  if (options?.status) {
    return employees.filter((employee) => employee.status === options.status);
  }

  // التعديل الأول: إخفاء المستقيلين والمقالين من القائمة الرئيسية
  if (shouldExcludeTerminated) {
    return employees.filter((employee) => employee.status !== "terminated" && employee.status !== "resigned");
  }

  return employees;
};

export const useEmployees = (options?: UseEmployeesOptions) => {
  const queryClient = useQueryClient();
  const router = useRouter();

  const safeLimit = Math.min(Math.max(options?.limit ?? 500, 1), 500); // Changed from 200 to 500
  const fetchAll = options?.fetchAll ?? false;

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

      // Only send fields accepted by CreateEmployeeDto
      // forbidNonWhitelisted:true on the backend rejects any unknown fields
      const payload: Record<string, unknown> = {
        employeeId:            newEmployee.employeeId,
        name:                  newEmployee.name,
        username:              (newEmployee as unknown as Record<string, unknown>).username,
        password:              (newEmployee as unknown as Record<string, unknown>).password,
        mobile:                newEmployee.mobile,
        nationalId:            newEmployee.nationalId,
        dateOfBirth:           newEmployee.dateOfBirth,
        gender:                newEmployee.gender,
        jobTitle:              newEmployee.jobTitle,
        profession:            newEmployee.profession,
        department:            newEmployee.department,
        hourlyRate:            hourlyRate,
        baseSalary:            typeof newEmployee.baseSalary === 'object' && newEmployee.baseSalary && '$numberDecimal' in newEmployee.baseSalary
                                 ? Number((newEmployee.baseSalary as { $numberDecimal: string }).$numberDecimal)
                                 : newEmployee.baseSalary,
        lumpSumSalary:         typeof newEmployee.lumpSumSalary === 'object' && newEmployee.lumpSumSalary && '$numberDecimal' in newEmployee.lumpSumSalary
                                 ? Number((newEmployee.lumpSumSalary as { $numberDecimal: string }).$numberDecimal)
                                 : newEmployee.lumpSumSalary,
        livingAllowance:       typeof newEmployee.livingAllowance === 'object' && newEmployee.livingAllowance && '$numberDecimal' in newEmployee.livingAllowance
                                 ? Number((newEmployee.livingAllowance as { $numberDecimal: string }).$numberDecimal)
                                 : newEmployee.livingAllowance,
        roleId:                newEmployee.roleId,
        scheduledStart:        newEmployee.scheduledStart,
        scheduledEnd:          newEmployee.scheduledEnd,
        employmentStartDate:   newEmployee.employmentStartDate,
        gracePeriodMinutes:    newEmployee.gracePeriodMinutes,
        workDaysInPeriod:      newEmployee.workDaysInPeriod,
        hoursPerDay:           newEmployee.hoursPerDay,
        residence:             newEmployee.residence,
      };

      // Remove undefined values so they don't get sent
      Object.keys(payload).forEach(key => {
        if (payload[key] === undefined) delete payload[key];
      });

      console.log('Creating employee with payload:', payload);
      const response = await apiClient.post("/employees", payload);
      console.log('Employee created response:', response);
      return response;
    },
    onSuccess: async (response) => {
      console.log('onSuccess called, invalidating queries');
      await queryClient.invalidateQueries({ queryKey: ["employees"] });
      await queryClient.invalidateQueries({ queryKey: ["salaries"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      router.refresh();
      toast.success("تم إضافة الموظف بنجاح!");
    },
    onError: (error: unknown) => {
      console.error('Create employee error:', error);
      let finalMessage = getErrorMessage(error, "حدث خطأ غير متوقع");

      if (finalMessage.includes("employeeId must match")) {
        finalMessage = "خطأ: يجب أن يبدأ كود الموظف بـ EMP متبوعاً بأرقام (مثال: EMP001)";
      }

      // Backend: 400 Employee ID already exists
      if (
        finalMessage.includes("Employee ID already exists") ||
        (finalMessage.includes("already exists") && finalMessage.includes("Employee ID"))
      ) {
        finalMessage = "خطأ: كود الموظف موجود مسبقاً. لازم يكون employeeId جديد (النظام لن يسمح بتكراره).";
      }


      toast.error(finalMessage, { duration: 8000 });
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
      toast.success("تم نقل الموظف إلى سلة المهملات");
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "فشل حذف الموظف"));
    }
  });

  
  // 5. إقالة أو استقالة موظف
  const terminateMutation = useMutation<unknown, unknown, TerminateEmployeeVariables>({
    mutationFn: async ({ id, data }) => {
      const terminationType = data.status === "resigned" ? "resignation" : "termination";
      const payload = {
        terminationDate: data.terminationDate,
        terminationType,
        terminationReason: data.terminationReason,
        ...(data.notes ? { terminationNotes: data.notes } : {}),
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

  const bulkTerminateDepartmentMutation = useMutation({
    mutationFn: async (payload: { department: string; status: "terminated" | "resigned"; terminationDate: string; terminationReason?: string; notes?: string }) => {
      const terminationType = payload.status === "resigned" ? "resignation" : "termination";
      return await apiClient.post("/employees/bulk-terminate-department", {
        department: payload.department,
        terminationDate: payload.terminationDate,
        terminationType,
        terminationReason: payload.terminationReason,
        terminationNotes: payload.notes,
      });
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["resigned-employees"] });
      const message = (response as unknown as { data?: { message?: string } }).data?.message || "تم الإقالة الجماعية بنجاح";
      toast.success(message);
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "فشل في الإقالة الجماعية"));
    },
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
    bulkTerminateDepartment: bulkTerminateDepartmentMutation,
    settleEmployee: settleMutation
  };
};

// التعديل الرابع: جلب الأرشيف (المقالين والمستقيلين معاً)
// يستخدم نقطة النهاية المخصصة GET /employees/resigned بدلاً من القائمة العامة
export const useResignedEmployees = () => {
  const queryClient = useQueryClient();

  const query = useQuery<Employee[]>({
    queryKey: ['resigned-employees'],
    queryFn: async () => {
      const response = await apiClient.get('/employees/resigned', {
        params: { limit: 500, page: 1 },
      });

      const payload = response.data;
      if (payload && Array.isArray(payload.data)) {
        return payload.data as Employee[];
      }
      if (payload && Array.isArray(payload.employees)) {
        return payload.employees as Employee[];
      }
      if (Array.isArray(payload)) {
        return payload as Employee[];
      }
      return [];
    },
    staleTime: QUERY_STALE_TIME.RELAXED,
    gcTime: QUERY_GC_TIME.RELAXED,
  });

  // تصفية مستحقات موظف (للمحاسب)
  const settleMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiClient.patch(`/employees/${id}/settle`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resigned-employees"] });
      toast.success("تم تصفية حقوق الموظف بنجاح وإغلاق ملفه المالي!");
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "فشل في تصفية الموظف"));
    },
  });

  return {
    ...query,
    settleEmployee: settleMutation,
  };
};
