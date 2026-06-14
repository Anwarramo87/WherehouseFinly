import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api-client";
import { QUERY_GC_TIME, QUERY_STALE_TIME } from "@/lib/query-cache";

export interface PenaltyRecord {
  id: string;
  employeeId: string;
  category: string;
  amount: number;
  reason?: string | null;
  issueDate: string;
  createdAt?: string;
}

export const usePenalties = (params?: {
  employeeId?: string;
  startDate?: string;
  endDate?: string;
}) => {
  return useQuery<PenaltyRecord[]>({
    queryKey: [
      "penalties",
      params?.employeeId || "all",
      params?.startDate || "all-start",
      params?.endDate || "all-end",
    ],
    queryFn: async () => {
      const res = await apiClient.get("/penalties", {
        params: {
          employeeId: params?.employeeId,
          startDate: params?.startDate,
          endDate: params?.endDate,
        },
      });
      const data = res.data;
      if (!Array.isArray(data)) return [];
      return data.map((r: Record<string, unknown>) => ({
        id: String(r.id ?? ""),
        employeeId: String(r.employeeId ?? ""),
        category: String(r.category ?? ""),
        amount: Number(r.amount || 0),
        reason: (r.reason as string) || null,
        issueDate: String(r.issueDate ?? "").split("T")[0],
        createdAt: String(r.createdAt ?? ""),
      }));
    },
    staleTime: QUERY_STALE_TIME.FAST,
    gcTime: QUERY_GC_TIME.STANDARD,
    refetchOnWindowFocus: true,
  });
};

export default usePenalties;
