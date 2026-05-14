import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api-client";
import { toast } from "react-hot-toast";
import axios from "axios";
import type { Reward, RewardInput } from "@/types/reward";
import { QUERY_GC_TIME, QUERY_STALE_TIME } from "@/lib/query-cache";

export type RewardQueryOptions = {
  search?: string;
  employeeId?: string;
  type?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
};

type RewardsResponse = {
  rewards?: unknown;
};

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

const resolveRewards = (payload: unknown): Reward[] => {
  if (Array.isArray(payload)) {
    return payload as Reward[];
  }

  if (payload && typeof payload === "object" && Array.isArray((payload as RewardsResponse).rewards)) {
    return (payload as RewardsResponse).rewards as Reward[];
  }

  return [];
};

export const useRewards = (options?: RewardQueryOptions) => {
  const queryClient = useQueryClient();

  const normalizedSearch = options?.search?.trim();
  const params = {
    ...(normalizedSearch ? { search: normalizedSearch } : {}),
    ...(options?.employeeId ? { employeeId: options.employeeId } : {}),
    ...(options?.type ? { type: options.type } : {}),
    ...(options?.from ? { from: options.from } : {}),
    ...(options?.to ? { to: options.to } : {}),
    ...(options?.page ? { page: options.page } : {}),
    ...(options?.limit ? { limit: options.limit } : {}),
  };

  const query = useQuery<Reward[]>({
    queryKey: [
      "rewards",
      normalizedSearch || "no-search",
      options?.employeeId || "all-employees",
      options?.type || "all-types",
      options?.from || "no-from",
      options?.to || "no-to",
      options?.page || 1,
      options?.limit || 200,
    ],
    queryFn: async () => {
      const response = await apiClient.get("/rewards", { params });
      return resolveRewards(response.data);
    },
    staleTime: QUERY_STALE_TIME.STANDARD,
    gcTime: QUERY_GC_TIME.RELAXED,
  });

  const createReward = useMutation({
    mutationFn: async (payload: RewardInput) => {
      const safeAmount = Number(payload.amount);
      const normalized: RewardInput = {
        ...payload,
        amount: Number.isFinite(safeAmount) ? safeAmount : 0,
      };

      return apiClient.post("/rewards", normalized);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rewards"] });
      toast.success("تم إضافة المكافأة بنجاح");
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "فشل إضافة المكافأة"));
    },
  });

  const deleteReward = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.delete(`/rewards/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rewards"] });
      toast.success("تم حذف المكافأة بنجاح");
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "فشل حذف المكافأة"));
    },
  });

  return { ...query, createReward, deleteReward };
};
