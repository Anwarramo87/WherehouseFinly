"use client";

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import apiClient from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import {
  useNotificationStore,
  type NotificationItem,
} from "@/stores/notification-store";

type ListParams = {
  unreadOnly?: boolean;
  type?: string;
  limit?: number;
  cursor?: string;
};

export const useNotifications = (params?: ListParams) => {
  const query = useQuery<{ items: NotificationItem[]; nextCursor: string | null; hasMore: boolean }>({
    queryKey: queryKeys.notifications.list(params),
    queryFn: async () => {
      const res = await apiClient.get("/notifications", {
        params: {
          unreadOnly: params?.unreadOnly ? "true" : undefined,
          type: params?.type,
          limit: params?.limit ?? 30,
          cursor: params?.cursor,
        },
      });
      return res.data;
    },
    staleTime: 30_000,
  });

  // مزامنة القائمة المجلوبة مع الستور الحي عند نجاح الجلب (وليس أثناء الرندر)
  useEffect(() => {
    if (query.data?.items && !params?.cursor) {
      useNotificationStore.getState().prependMany(query.data.items);
    }
  }, [query.data, params?.cursor]);

  return { ...query };
};

export const useUnreadNotificationCount = () => {
  const query = useQuery<number>({
    queryKey: queryKeys.notifications.unreadCount(),
    queryFn: async () => {
      const res = await apiClient.get("/notifications/unread-count");
      const count = typeof res.data === "number" ? res.data : res.data?.count ?? 0;
      useNotificationStore.getState().setUnreadCount(count);
      return count;
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
  return query;
};

export const useMarkAllNotificationsRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await apiClient.post("/notifications/mark-all-read");
      return res.data;
    },
    onSuccess: () => {
      useNotificationStore.getState().markAllRead();
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all, exact: false });
      toast.success("تم تعليم جميع الإشعارات كمقروءة");
    },
    onError: (error: unknown) => {
      toast.error("تعذر تعليم الإشعارات كمقروءة");
      console.error(error);
    },
  });
};

export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.post("/notifications/mark-read", { id });
      return res.data;
    },
    onSuccess: (_data, id) => {
      useNotificationStore.getState().setRead(id);
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount() });
    },
  });
};

export const useDismissNotification = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id?: string; dedupeKey?: string }) => {
      const res = await apiClient.post("/notifications/dismiss", input);
      return res.data;
    },
    onSuccess: (_data, input) => {
      if (input.id) {
        useNotificationStore.getState().remove(input.id);
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all, exact: false });
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount() });
      toast.success("تم تجاهل التنبيه نهائياً");
    },
    onError: () => {
      toast.error("تعذر تجاهل التنبيه");
    },
  });
};
