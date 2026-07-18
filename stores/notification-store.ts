"use client";

import { create } from "zustand";

export type NotificationType =
  | "CHECK_IN"
  | "CHECK_OUT"
  | "BONUS"
  | "PENALTY"
  | "ADVANCE"
  | "LEAVE"
  | "TERMINATION"
  | "RESIGNATION"
  | "LATE"
  | "ABSENT";

export type NotificationSeverity = "INFO" | "SUCCESS" | "WARNING" | "DANGER";

export type NotificationItem = {
  id: string;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  message: string;
  employeeId?: string | null;
  employeeName?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  createdAt: string;
  isRead?: boolean;
  isDismissed?: boolean;
  dedupeKey?: string | null;
};

type NotificationState = {
  items: NotificationItem[];
  unreadCount: number;
  /** وقت آخر استقبال للإشعارات عبر السوكيت (لإجبار التحديث) */
  lastReceivedAt: number;
  upsert: (item: NotificationItem) => void;
  prependMany: (items: NotificationItem[]) => void;
  markAllRead: () => void;
  setRead: (id: string) => void;
  remove: (id: string) => void;
  setUnreadCount: (count: number) => void;
  reset: () => void;
};

export const useNotificationStore = create<NotificationState>()((set) => ({
  items: [],
  unreadCount: 0,
  lastReceivedAt: 0,
  upsert: (item) =>
    set((state) => {
      const exists = state.items.some((n) => n.id === item.id);
      const items = exists
        ? state.items.map((n) => (n.id === item.id ? item : n))
        : [item, ...state.items].slice(0, 100);
      const unreadCount = items.filter((n) => !n.isRead && !n.isDismissed).length;
      return { items, unreadCount, lastReceivedAt: Date.now() };
    }),
  prependMany: (incoming) =>
    set((state) => {
      const map = new Map<string, NotificationItem>();
      for (const n of [...incoming, ...state.items]) map.set(n.id, n);
      const items = Array.from(map.values())
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 100);
      const unreadCount = items.filter((n) => !n.isRead && !n.isDismissed).length;
      return { items, unreadCount };
    }),
  markAllRead: () =>
    set((state) => ({
      items: state.items.map((n) => ({ ...n, isRead: true })),
      unreadCount: 0,
    })),
  setRead: (id) =>
    set((state) => {
      const items = state.items.map((n) => (n.id === id ? { ...n, isRead: true } : n));
      return { items, unreadCount: items.filter((n) => !n.isRead && !n.isDismissed).length };
    }),
  remove: (id) =>
    set((state) => {
      const items = state.items.filter((n) => n.id !== id);
      return { items, unreadCount: items.filter((n) => !n.isRead && !n.isDismissed).length };
    }),
  setUnreadCount: (count) => set({ unreadCount: count }),
  reset: () => set({ items: [], unreadCount: 0, lastReceivedAt: 0 }),
}));
