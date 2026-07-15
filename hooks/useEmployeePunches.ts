import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import apiClient from "@/lib/api-client";
import { getApiErrorMessage } from "@/lib/http/error";

export interface RawPunch {
  id: string;
  employeeId: string;
  type: "IN" | "OUT";
  timestamp: string;
  date: string;
  source?: string;
  notes?: string;
}

const buildTimestamp = (date: string, hhmm: string) => {
  const local = new Date(`${date}T${hhmm}:00`);
  const off = -local.getTimezoneOffset();
  const sign = off >= 0 ? "+" : "-";
  const abs = Math.abs(off);
  const hh = String(Math.floor(abs / 60)).padStart(2, "0");
  const mm = String(abs % 60).padStart(2, "0");
  return `${date}T${hhmm}:00${sign}${hh}:${mm}`;
};

export const useEmployeePunches = (employeeId: string, date: string) => {
  const queryClient = useQueryClient();
  const qk = ["punches", employeeId, date];

  const query = useQuery<RawPunch[]>({
    queryKey: qk,
    enabled: !!employeeId && !!date,
    queryFn: async () => {
      const res = await apiClient.get(`/attendance/employee/${employeeId}/date/${date}`);
      const records: RawPunch[] = Array.isArray(res.data?.records) ? res.data.records : [];
      return records.sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
    },
    staleTime: 15_000,
  });

  const addPunch = useMutation({
    mutationFn: async ({ type, hhmm }: { type: "IN" | "OUT"; hhmm: string }) => {
      await apiClient.post("/attendance", {
        employeeId,
        timestamp: buildTimestamp(date, hhmm),
        type,
        source: "manual",
      });
    },
    onSuccess: () => {
      toast.success("تم تسجيل البصمة");
      queryClient.invalidateQueries({ queryKey: qk });
      queryClient.invalidateQueries({ queryKey: ["attendance", "daily-view", date] });
    },
    onError: (e) => toast.error(getApiErrorMessage(e, "فشل تسجيل البصمة")),
  });

  const deletePunch = useMutation({
    mutationFn: async (recordId: string) => {
      await apiClient.delete(`/attendance/${recordId}`);
    },
    onSuccess: () => {
      toast.success("تم حذف البصمة");
      queryClient.invalidateQueries({ queryKey: qk });
      queryClient.invalidateQueries({ queryKey: ["attendance", "daily-view", date] });
    },
    onError: (e) => toast.error(getApiErrorMessage(e, "فشل حذف البصمة")),
  });

  return { ...query, addPunch, deletePunch };
};
