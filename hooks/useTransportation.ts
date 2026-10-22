import { useQuery, useMutation, useQueryClient, useQueries } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/api-client";
import { toast } from "react-hot-toast";
import { QUERY_GC_TIME, QUERY_STALE_TIME } from "@/lib/query-cache";
import { queryKeys } from "@/lib/query-keys";
import { getApiErrorMessage as normalizeError } from "@/lib/http/error";

export interface BusResponse {
  id: string;
  busId: string;
  route: string;
  plateNumber: string;
  driverName: string;
  driverPhone: string;
  totalCost: number;
  /** التكلفة اليومية للباص — الأساس في احتساب التكلفة الشهرية */
  dailyCost?: number;
  /** التكلفة الشهرية المحسوبة (تكلفة يومية × أيام العمل) */
  monthlyCost?: number;
  /** مساهمة المعمل في تكلفة هذا الباص */
  companyDeduction?: number;
  /** صافي التكلفة بعد حسم مساهمة المعمل */
  netCost?: number;
  /** الحصة الفردية لكل مشترك (متساوية بين كل المشتركين) */
  perEmployeeShare?: number;
  companyDeductionPct: number;
  employeeDeductionPct: number;
  capacity: number;
  status: string;
  activePassengers: number;
  companyDeductionAmount: number;
  createdAt: string;
  updatedAt: string;
  passengers?: PassengerResponse[];
}

export interface PassengerResponse {
  id: string;
  employeeId: string;
  name?: string;
  paidAmount?: number;
  isManual?: boolean;
  joinDate?: string;
  subscriptionDate?: string;
  terminationDate?: string;
  status?: string;
  employeeStatus?: string;
}

export interface BusDetailsResponse extends BusResponse {
  passengers: PassengerResponse[];
}

const fetchBusDetails = async (busId: string): Promise<BusDetailsResponse> => {
  const res = await apiClient.get(`/transportation/buses/${busId}`);
  return res.data;
};

/**
 * Hook to fetch details (passengers) for multiple buses in parallel via React Query.
 * Replaces the manual useState + useEffect + fetchingRef pattern.
 */
export function useBusDetails(busIds: string[]) {
  return useQueries({
    queries: busIds.map((busId) => ({
      queryKey: queryKeys.buses.detail(busId),
      queryFn: () => fetchBusDetails(busId),
      staleTime: QUERY_STALE_TIME.FAST,
      gcTime: QUERY_GC_TIME.STANDARD,
      enabled: !!busId,
    })),
  });
}

export function useTransportation() {
  const queryClient = useQueryClient();
  const router = useRouter();

  const query = useQuery<BusResponse[]>({
    queryKey: queryKeys.buses.all,
    queryFn: async () => {
      const res = await apiClient.get("/transportation/buses");
      return res.data;
    },
    staleTime: QUERY_STALE_TIME.FAST,
    gcTime: QUERY_GC_TIME.STANDARD,
    refetchOnWindowFocus: true,
  });

  const createBus = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const payload: Record<string, unknown> = {
        route: data.route,
        plateNumber: data.busNumber || data.plateNumber,
        driverName: data.driverName,
        driverPhone: data.driverPhone,
        totalCost: Number(data.totalCost),
        companyDeductionPct: Number(data.discountPercent || data.companyDeductionPct || 0),
        employeeDeductionPct: Number(data.employeeDeductionPct ?? 0),
        capacity: Number(data.capacity),
      };
      return await apiClient.post("/transportation/buses", payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.buses.all });
      router.refresh();
      toast.success("تم إضافة الباص بنجاح");
    },
    onError: (error: unknown) => {
      toast.error(normalizeError(error, "فشلت العملية"));
    },
  });

  const updateBus = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const payload: Record<string, unknown> = {};
      if (data.route !== undefined) payload.route = data.route;
      if (data.plateNumber !== undefined) payload.plateNumber = data.plateNumber;
      if (data.busNumber !== undefined) payload.plateNumber = data.busNumber;
      if (data.driverName !== undefined) payload.driverName = data.driverName;
      if (data.driverPhone !== undefined) payload.driverPhone = data.driverPhone;
      if (data.totalCost !== undefined) payload.totalCost = Number(data.totalCost);
      if (data.discountPercent !== undefined)
        payload.companyDeductionPct = Number(data.discountPercent);
      if (data.companyDeductionPct !== undefined)
        payload.companyDeductionPct = Number(data.companyDeductionPct);
      if (data.employeeDeductionPct !== undefined)
        payload.employeeDeductionPct = Number(data.employeeDeductionPct);
      if (data.capacity !== undefined) payload.capacity = Number(data.capacity);
      return await apiClient.put(`/transportation/buses/${id}`, payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.buses.all });
      router.refresh();
      toast.success("تم تحديث الباص بنجاح");
    },
    onError: (error: unknown) => {
      toast.error(normalizeError(error, "فشلت العملية"));
    },
  });

  const deleteBus = useMutation({
    mutationFn: async (id: string) => {
      return await apiClient.delete(`/transportation/buses/${id}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.buses.all });
      router.refresh();
      toast.success("تم نقل الباص إلى سلة المهملات");
    },
    onError: (error: unknown) => {
      toast.error(normalizeError(error, "فشلت العملية"));
    },
  });

  const addPassenger = useMutation({
    mutationFn: async ({
      busId,
      payload,
    }: {
      busId: string;
      payload: { employeeId: string; name?: string; subscriptionDate?: string };
    }) => {
      const body: Record<string, unknown> = { employeeId: payload.employeeId };
      if (payload.name !== undefined) body.name = payload.name;
      if (payload.subscriptionDate !== undefined) body.subscriptionDate = payload.subscriptionDate;
      const res = await apiClient.post(`/transportation/buses/${busId}/passengers`, body);
      return res.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.buses.all });
      await queryClient.invalidateQueries({ queryKey: ["bus"] });
      await queryClient.invalidateQueries({ queryKey: queryKeys.discounts.all });
      router.refresh();
      toast.success("تمت إضافة الموظف للباص");
    },
    onError: (error: unknown) => {
      toast.error(normalizeError(error, "فشلت العملية"));
    },
  });

  const removePassenger = useMutation({
    mutationFn: async ({ busId, employeeId }: { busId: string; employeeId: string }) => {
      return await apiClient.delete(`/transportation/buses/${busId}/passengers/${employeeId}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.buses.all });
      await queryClient.invalidateQueries({ queryKey: ["bus"] });
      await queryClient.invalidateQueries({ queryKey: queryKeys.discounts.all });
      router.refresh();
      toast.success("تمت إزالة الموظف من الباص");
    },
    onError: (error: unknown) => {
      toast.error(normalizeError(error, "فشلت العملية"));
    },
  });

  return {
    ...query,
    createBus,
    updateBus,
    deleteBus,
    addPassenger,
    removePassenger,
  };
}

/**
 * The fleet summary card: totals plus one line per bus, so nothing is merged
 * away and the user can always see which bus produced which number.
 */
export interface TransportationSummary {
  totalBuses: number;
  activeBuses: number;
  totalPassengers: number;
  totalMonthlyCost: number;
  totalCompanyDeduction: number;
  totalNetCost: number;
  totalDeducted: number;
  defaultDailyCost: number;
  workingDaysPerMonth: number;
  buses: Array<
    BusResponse & {
      dailyCost: number;
      monthlyCost: number;
      companyDeduction: number;
      netCost: number;
      perEmployeeShare: number;
    }
  >;
}

export function useTransportationSummary() {
  return useQuery({
    queryKey: queryKeys.buses.summary(),
    queryFn: async () => {
      const res = await apiClient.get<TransportationSummary>("/transportation/summary");
      return res.data;
    },
    staleTime: QUERY_STALE_TIME.FAST,
    gcTime: QUERY_GC_TIME.STANDARD,
  });
}

/** The per-factory transportation settings: the daily cost and the work days. */
export interface TransportationSettings {
  defaultDailyCost: number;
  workingDaysPerMonth: number;
}

export function useTransportationSettings() {
  return useQuery({
    queryKey: queryKeys.buses.settings(),
    queryFn: async () => {
      const res = await apiClient.get<TransportationSettings>("/transportation/settings");
      return res.data;
    },
    staleTime: QUERY_STALE_TIME.RELAXED,
    gcTime: QUERY_GC_TIME.RELAXED,
  });
}

/** One day of attendance for one bus. */
export interface BusAttendanceRecord {
  id: string;
  busId: string;
  attendDate: string;
  attended: boolean;
  notes: string | null;
  recordedBy: string | null;
  createdAt: string;
}

export function useBusAttendance(
  busId: string | null,
  params: { from?: string; to?: string } = {},
) {
  return useQuery({
    queryKey: queryKeys.buses.attendance(busId ?? "", params),
    queryFn: async () => {
      const res = await apiClient.get<{
        data: BusAttendanceRecord[];
        summary: { recordedDays: number; attendedDays: number; absentDays: number };
      }>(`/transportation/buses/${busId}/attendance`, { params });
      return res.data;
    },
    enabled: !!busId,
    staleTime: QUERY_STALE_TIME.FAST,
    gcTime: QUERY_GC_TIME.STANDARD,
  });
}

/**
 * Records one day of attendance.
 *
 * The server UPDATES the row when the same day is recorded again rather than
 * adding a second one, so a re-submission never turns into "attended twice".
 */
export function useRecordBusAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      busId: string;
      attendDate: string;
      attended: boolean;
      notes?: string;
    }) => {
      const res = await apiClient.post(
        `/transportation/buses/${input.busId}/attendance`,
        {
          attendDate: input.attendDate,
          attended: input.attended,
          notes: input.notes,
        },
      );
      return res.data;
    },
    onSuccess: async (data: { updated?: boolean }) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.buses.all });
      toast.success(data?.updated ? "تم تحديث تسجيل اليوم" : "تم تسجيل الحضور");
    },
    onError: (error: unknown) => {
      toast.error(normalizeError(error, "تعذّر تسجيل الحضور"));
    },
  });
}

export default useTransportation;
