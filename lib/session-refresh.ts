import apiClient from "@/lib/api-client";

const REFRESH_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

let refreshTimer: ReturnType<typeof setInterval> | null = null;
let refreshInFlight: Promise<boolean> | null = null;

export async function refreshAuthSession(): Promise<boolean> {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = (async () => {
    try {
      await apiClient.post("/auth/refresh", {}, { timeout: 10_000 });
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

export function startSessionRefreshLoop() {
  if (typeof window === "undefined" || refreshTimer) {
    return;
  }

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
