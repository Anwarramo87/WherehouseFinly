import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api-client";
import { QUERY_GC_TIME, QUERY_STALE_TIME } from "@/lib/query-cache";
import { getApiErrorMessage as getErrorMessage } from "@/lib/http/error";

export interface DailyViewEmployee {
  employeeId: string;
  name: string;
  department: string | null;
  date: string;
  scheduledStart: string;
  scheduledEnd: string;
  checkIn: string | null;
  checkOut: string | null;
  status: "present" | "late" | "absent";
  notes: string | null;
  source: string | null;
}

interface DailyViewResponse {
  date: string;
  employees: DailyViewEmployee[];
  summary: {
    total: number;
    present: number;
    late: number;
    absent: number;
  };
}

export const useAttendanceDailyView = (date: string) => {
  return useQuery<DailyViewResponse>({
    queryKey: ["attendance", "daily-view", date],
    queryFn: async () => {
      const res = await apiClient.get("/attendance/daily-view", {
        params: { date },
      });
      return res.data;
    },
    staleTime: QUERY_STALE_TIME.FAST,
    gcTime: QUERY_GC_TIME.RELAXED,
  });
};
