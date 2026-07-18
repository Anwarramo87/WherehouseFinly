"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bell,
  CheckCheck,
  X,
  Clock,
  LogIn,
  LogOut,
  Gift,
  MinusCircle,
  HandCoins,
  CalendarOff,
  UserMinus,
  UserX,
  AlertTriangle,
} from "lucide-react";
import {
  useNotificationStore,
  type NotificationItem,
  type NotificationType,
  type NotificationSeverity,
} from "@/stores/notification-store";
import {
  useNotifications,
  useUnreadNotificationCount,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useDismissNotification,
} from "@/hooks/useNotifications";

const TYPE_ICON: Record<NotificationType, typeof Bell> = {
  CHECK_IN: LogIn,
  CHECK_OUT: LogOut,
  BONUS: Gift,
  PENALTY: MinusCircle,
  ADVANCE: HandCoins,
  LEAVE: CalendarOff,
  TERMINATION: UserX,
  RESIGNATION: UserMinus,
  LATE: Clock,
  ABSENT: AlertTriangle,
};

const TYPE_LABEL: Record<NotificationType, string> = {
  CHECK_IN: "دخول",
  CHECK_OUT: "خروج",
  BONUS: "مكافأة",
  PENALTY: "خصم",
  ADVANCE: "سلفة",
  LEAVE: "إجازة",
  TERMINATION: "إنهاء خدمة",
  RESIGNATION: "استقالة",
  LATE: "تأخير",
  ABSENT: "غياب",
};

const SEVERITY_STYLE: Record<NotificationSeverity, { icon: string; border: string; bar: string }> = {
  INFO: { icon: "bg-sky-100 text-sky-700", border: "border-sky-200", bar: "bg-sky-500" },
  SUCCESS: { icon: "bg-emerald-100 text-emerald-700", border: "border-emerald-200", bar: "bg-emerald-500" },
  WARNING: { icon: "bg-amber-100 text-amber-700", border: "border-amber-200", bar: "bg-amber-500" },
  DANGER: { icon: "bg-rose-100 text-rose-700", border: "border-rose-200", bar: "bg-rose-500" },
};

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function NotificationRow({
  item,
  onRead,
  onDismiss,
}: {
  item: NotificationItem;
  onRead: (id: string) => void;
  onDismiss: (input: { id?: string; dedupeKey?: string }) => void;
}) {
  const Icon = TYPE_ICON[item.type] ?? Bell;
  const style = SEVERITY_STYLE[item.severity];
  const isDismissable = item.type === "ABSENT" || item.type === "LATE";

  return (
    <div
      className={`group relative flex gap-3 px-4 py-3 border-b border-slate-100 transition-colors hover:bg-slate-50 ${
        item.isRead ? "bg-white" : "bg-[#f8fafc]"
      }`}
    >
      {/* شريط جانبي بلون الخطورة */}
      <span className={`absolute inset-y-0 right-0 w-1 ${style.bar} ${item.isRead ? "opacity-30" : "opacity-100"}`} />

      {/* نقطة غير مقروء */}
      {!item.isRead && (
        <span className="absolute top-3 left-3 w-2 h-2 rounded-full bg-[#C89355] shadow-[0_0_0_3px_rgba(200,147,85,0.2)]" />
      )}

      <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center border ${style.icon} ${style.border}`}>
        <Icon size={18} />
      </div>

      <div className="flex-1 min-w-0 pl-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-bold text-[13px] text-[#1a2530] leading-tight truncate">{item.title}</p>
            <span className="inline-block mt-0.5 text-[10px] font-bold text-slate-400 bg-slate-100 rounded px-1.5 py-0.5">
              {TYPE_LABEL[item.type] ?? item.type}
            </span>
          </div>
          <span className="shrink-0 text-[10px] text-slate-400 whitespace-nowrap">{formatTime(item.createdAt)}</span>
        </div>

        <p className="text-[12px] text-slate-600 mt-1 leading-snug">{item.message}</p>

        <div className="flex items-center gap-4 mt-1.5">
          {!item.isRead && (
            <button
              type="button"
              onClick={() => onRead(item.id)}
              className="text-[11px] font-semibold text-sky-600 hover:text-sky-800 hover:underline"
            >
              تعليم كمقروء
            </button>
          )}
          {isDismissable && (
            <button
              type="button"
              onClick={() => onDismiss({ id: item.id, dedupeKey: item.dedupeKey ?? undefined })}
              className="flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-800 hover:underline"
            >
              <X size={12} /> تجاهل نهائياً
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function NotificationBell() {
  const items = useNotificationStore((s) => s.items);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const markAllRead = useMarkAllNotificationsRead();
  const markRead = useMarkNotificationRead();
  const dismiss = useDismissNotification();

  // جلب أحدث الإشعارات + عداد غير المقروء عند تحميل الجرس
  useNotifications({ limit: 50 });
  useUnreadNotificationCount();

  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const visibleItems = items.slice(0, 50);

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="الإشعارات"
        className="relative p-2.5 bg-[#1a2530] text-[#C89355] rounded-xl border border-[#C89355]/30 shadow-lg transition-all duration-200 hover:bg-[#263544] hover:scale-105 active:scale-95"
      >
        <Bell size={22} className={unreadCount > 0 ? "animate-pulse" : ""} />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -left-1.5 min-w-[20px] h-5 px-1 rounded-full bg-rose-600 text-white text-[11px] font-black flex items-center justify-center border-2 border-white shadow-md">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute left-0 top-full mt-3 w-[380px] max-w-[92vw] bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden z-50 print:hidden"
          dir="rtl"
        >
          {/* رأس اللوحة */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-l from-[#1a2530] to-[#263544] text-white">
            <span className="flex items-center gap-2 font-black text-sm">
              <Bell size={16} className="text-[#C89355]" />
              الإشعارات
              {unreadCount > 0 && (
                <span className="text-[10px] bg-[#C89355] text-[#1a2530] rounded-full px-2 py-0.5 font-black">
                  {unreadCount} جديد
                </span>
              )}
            </span>
            <button
              type="button"
              onClick={() => markAllRead.mutate()}
              disabled={unreadCount === 0}
              className="flex items-center gap-1 text-[11px] text-[#C89355] hover:text-white hover:underline disabled:opacity-40 transition-colors"
            >
              <CheckCheck size={14} /> تعليم الكل كمقروء
            </button>
          </div>

          {/* القائمة */}
          <div className="max-h-[60vh] overflow-y-auto">
            {visibleItems.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <div className="w-14 h-14 mx-auto rounded-full bg-slate-100 flex items-center justify-center mb-3">
                  <Bell size={26} className="text-slate-300" />
                </div>
                <p className="text-slate-400 text-sm font-semibold">لا توجد إشعارات بعد</p>
                <p className="text-slate-300 text-[11px] mt-1">ستظهر هنا كل التحركات والعمليات</p>
              </div>
            ) : (
              visibleItems.map((item) => (
                <NotificationRow
                  key={item.id}
                  item={item}
                  onRead={(id) => markRead.mutate(id)}
                  onDismiss={(input) => dismiss.mutate(input)}
                />
              ))
            )}
          </div>

          {visibleItems.length > 0 && (
            <div className="px-4 py-2 border-t border-slate-100 text-center text-[10px] text-slate-400 bg-slate-50">
              آخر تحديث فوري عبر الاتصال المباشر
            </div>
          )}
        </div>
      )}
    </div>
  );
}
