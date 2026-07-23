"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getAttendanceSocket,
  type AttendanceRealtimeEventPayload,
} from "@/lib/realtime/attendance-socket";
import { useNotificationStore, type NotificationItem } from "@/stores/notification-store";
import { queryKeys } from "@/lib/query-keys";

type NotificationRealtimePayload = {
  id: string;
  type: string;
  severity: string;
  title: string;
  message: string;
  employeeId?: string | null;
  employeeName?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  createdAt: string;
};

/**
 * مستمع سوكيت عام (mounted مرة واحدة على مستوى التطبيق).
 *
 * عند وصول أي حدث حضور لحظي (`attendanceUpdate`) يُبطل كاش الكويريز
 * المرتبطة بالحضور والرواتب مهما كانت الصفحة المفتوحة — بحيث تتحدث
 * صفحات timeTable / payroll / salaries فوراً دون الحاجة لإعادة تشغيل
 * الباك اند (الذي كان يعمل refetch عرَضياً عبر refetchOnReconnect).
 *
 * كما يستمع لحدث `notification` ويضخه فوراً إلى الستور الحي للإشعارات.
 */
export default function RealtimeInvalidator() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = getAttendanceSocket();
    if (!socket) return () => {};

    const onAttendanceUpdate = (payload: AttendanceRealtimeEventPayload) => {
      if (!payload?.employeeId) return;
      const keys = [
        ["attendance"],
        ["attendance-deductions"],
        ["salaries"],
        ["payroll"],
        ["dashboard"],
        // punch modals / monthly leave calendars keyed by employeeId+date
        ["punches"],
        ["employeeMonthlyLeaves"],
      ];
      for (const queryKey of keys) {
        void queryClient.invalidateQueries({ queryKey, exact: false });
      }
    };

    const onNotification = (payload: NotificationRealtimePayload) => {
      if (!payload?.id) return;
      const item: NotificationItem = {
        id: payload.id,
        type: payload.type as NotificationItem["type"],
        severity: payload.severity as NotificationItem["severity"],
        title: payload.title,
        message: payload.message,
        employeeId: payload.employeeId ?? null,
        employeeName: payload.employeeName ?? null,
        entityType: payload.entityType ?? null,
        entityId: payload.entityId ?? null,
        createdAt: payload.createdAt,
        isRead: false,
        isDismissed: false,
      };
      useNotificationStore.getState().upsert(item);
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount() });
    };

    socket.on("attendanceUpdate", onAttendanceUpdate);
    socket.on("notification", onNotification);
    return () => {
      socket.off("attendanceUpdate", onAttendanceUpdate);
      socket.off("notification", onNotification);
    };
  }, [queryClient]);

  return null;
}
