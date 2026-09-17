import { QueryClient, QueryCache, MutationCache } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import axios from "axios";
import { PERSISTED_QUERY_CACHE_KEY } from "@/lib/query-cache";

/**
 * Drops everything cached for the user who is signing out — the in-memory
 * cache and the copy on disk.
 */
export function purgePersistedQueryCache(queryClient?: QueryClient) {
  (queryClient ?? activeQueryClient)?.clear();

  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(PERSISTED_QUERY_CACHE_KEY);
  } catch {
    // Storage can be unavailable (private mode, blocked cookies); the
    // in-memory clear above is the part that matters for this session.
  }
}

// The live QueryClient, registered by <Providers/>. Lets non-React modules
// (api-client's forceLogout) wipe in-memory state on session end — otherwise
// the next login reuses the previous user's rows until staleTime expires.
let activeQueryClient: QueryClient | null = null;

export function setActiveQueryClient(client: QueryClient | null) {
  activeQueryClient = client;
}

/** Wipe in-memory + persisted caches without needing React context. */
export function clearAllQueryCaches() {
  try {
    activeQueryClient?.clear();
  } catch {
    // ignore — client may be mid-teardown
  }
  purgePersistedQueryCache();
}

/**
 * إنشاء QueryClient محسّن للأداء
 * يحل مشكلة الصفحات الفارغة في التحميل الأول
 */
export function createQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        // عرض الأخطاء للمستخدم
        if (query.meta?.errorMessage) {
          toast.error(query.meta.errorMessage as string);
        }
      },
    }),
    mutationCache: new MutationCache({
      onError: (error) => {
        // الأخطاء في mutations يتم التعامل معها في الـ hooks نفسها
        console.error("Mutation error:", error);
      },
    }),
    defaultOptions: {
      queries: {
        // تفعيل الـ queries فوراً
        enabled: true,
        // إعادة المحاولة: تجنب 4xx (أخطاء منطقية)، أقصاه مرتان للأخطاء الحقيقية
        retry: (failureCount: number, error: unknown) => {
          if (axios.isAxiosError(error)) {
            const status = error.response?.status;
            if (status && status >= 400 && status < 500) return false;
          }
          return failureCount < 2;
        },
        retryDelay: (attemptIndex: number) => Math.min(500 * Math.pow(2, attemptIndex), 5000),
        // staleTime: 2min = البيانات تبقى صالحة دقيقتين (يقلل الطلبات المتكررة بشكل كبير)
        staleTime: 2 * 60 * 1000,
        // gcTime: البيانات تبقى في الذاكرة لمدة 10 دقائق
        gcTime: 10 * 60 * 1000,
        // تعطيل refetch عند focus — يُسبب loop على صفحات الحضور الثقيلة
        // الـ socket يتولى التحديث الفوري للبيانات اللحظية
        refetchOnWindowFocus: false,
        // إعادة fetch عند reconnect
        refetchOnReconnect: true,
        // إعادة fetch عند mount إذا كانت البيانات stale
        refetchOnMount: true,
        // استخدام network mode "always"
        networkMode: "always",
        // عرض last successful data during refetch
        refetchIntervalInBackground: false,
      },
      mutations: {
        retry: 1,
        networkMode: "always",
      },
    },
  });
}
