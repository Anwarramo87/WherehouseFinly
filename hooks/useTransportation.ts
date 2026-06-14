import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api-client";
import { toast } from "react-hot-toast";
import { QUERY_GC_TIME, QUERY_STALE_TIME } from "@/lib/query-cache";
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
  status?: string;
}

export interface BusDetailsResponse extends BusResponse {
  passengers: PassengerResponse[];
}



export function useTransportation() {
  const queryClient = useQueryClient();

  const query = useQuery<BusResponse[]>({
    queryKey: ["buses"],
    queryFn: async () => {
      const res = await apiClient.get("/transportation/buses");
      return res.data;
    },
    staleTime: QUERY_STALE_TIME.FAST, // تقليل stale time لتحديث أسرع
    gcTime: QUERY_GC_TIME.STANDARD,
    refetchOnWindowFocus: true, // تحديث تلقائي عند العودة للصفحة
  });

  const getBus = async (busId: string): Promise<BusDetailsResponse> => {
    const res = await apiClient.get(`/transportation/buses/${busId}`);
    return res.data;
  };

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buses"] });
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
      if (data.discountPercent !== undefined) payload.companyDeductionPct = Number(data.discountPercent);
      if (data.companyDeductionPct !== undefined) payload.companyDeductionPct = Number(data.companyDeductionPct);
      if (data.employeeDeductionPct !== undefined) payload.employeeDeductionPct = Number(data.employeeDeductionPct);
      if (data.capacity !== undefined) payload.capacity = Number(data.capacity);
      return await apiClient.put(`/transportation/buses/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buses"] });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buses"] });
      toast.success("تم حذف الباص");
    },
    onError: (error: unknown) => {
      toast.error(normalizeError(error, "فشلت العملية"));
    },
  });

  const addPassenger = useMutation({
    mutationFn: async ({ busId, payload }: { busId: string; payload: { employeeId: string; name?: string; subscriptionDate?: string } }) => {
      const body: Record<string, unknown> = { employeeId: payload.employeeId };
      if (payload.name !== undefined) body.name = payload.name;
      if (payload.subscriptionDate !== undefined) body.subscriptionDate = payload.subscriptionDate;
      const res = await apiClient.post(`/transportation/buses/${busId}/passengers`, body);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buses"] });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buses"] });
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
    getBus,
  };
}

export default useTransportation;