"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getAttendanceSocket,
  type AttendanceRealtimeEventPayload,
} from "@/lib/realtime/attendance-socket";

/**
 * مستمع سوكيت عام (mounted مرة واحدة على مستوى التطبيق).
 *
 * عند وصول أي حدث حضور لحظي (`attendanceUpdate`) يُبطل كاش الكويريز
 * المرتبطة بالحضور والرواتب مهما كانت الصفحة المفتوحة — بحيث تتحدث
 * صفحات timeTable / payroll / salaries فوراً دون الحاجة لإعادة تشغيل
 * الباك اند (الذي كان يعمل refetch عرَضياً عبر refetchOnReconnect).
 *
 * ملاحظة: لا يعرض هذا المستمع أي toast لتفادي التكرار مع مستمع صفحة
 * الحضور الذي يتكفل بالإشعار وتحديث الـ daily-view.
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
      ];
      for (const queryKey of keys) {
        void queryClient.invalidateQueries({ queryKey, exact: false });
      }
    };

    socket.on("attendanceUpdate", onAttendanceUpdate);
    return () => {
      socket.off("attendanceUpdate", onAttendanceUpdate);
    };
  }, [queryClient]);

  return null;
}
