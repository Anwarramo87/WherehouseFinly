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

export default useTransportation;
