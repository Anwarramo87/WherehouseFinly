import { QueryClient, QueryCache, MutationCache } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import axios from "axios";

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
        // staleTime: 0 = دائماً stale → كل mount يُعيد الجلب (مناسب لبيانات HR المتغيرة)
        staleTime: 0,
        // gcTime: البيانات تبقى في الذاكرة لمدة 10 دقائق
        gcTime: 10 * 60 * 1000,
        // إعادة fetch عند focus (لو زميل عدّل من تبويب آخر)
        refetchOnWindowFocus: true,
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
