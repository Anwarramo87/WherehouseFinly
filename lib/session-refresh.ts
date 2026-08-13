import { performTokenRefresh } from "@/lib/api-client";

const REFRESH_INTERVAL_MS = 14 * 60 * 1000; // 14 دقيقة — قبل انتهاء الـ token بدقيقة

let refreshTimer: ReturnType<typeof setInterval> | null = null;

export async function refreshAuthSession(): Promise<boolean> {
  // Shared single-flight refresh مع الـ interceptor لمنع سباق الـ refresh token
  const success = await performTokenRefresh();
  if (!success) {
    stopSessionRefreshLoop();
  }
  return success;
}

export function startSessionRefreshLoop() {
  if (typeof window === "undefined" || refreshTimer) return;

  refreshTimer = setInterval(() => {
    void refreshAuthSession();
  }, REFRESH_INTERVAL_MS);
}

export function stopSessionRefreshLoop() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
}
