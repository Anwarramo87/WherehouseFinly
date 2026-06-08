import { QueryClient, QueryCache, MutationCache } from "@tanstack/react-query";
import { toast } from "react-hot-toast";

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
        // إعادة المحاولة 3 مرات مع تأخير أسرع
        retry: 3,
        retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(1.5, attemptIndex), 3000),
        // staleTime: البيانات تعتبر fresh لمدة 5 دقيقة
        staleTime: 5 * 60 * 1000,
        // gcTime: البيانات تبقى في الذاكرة لمدة 10 دقائق
        gcTime: 10 * 60 * 1000,
        // عدم إعادة fetch عند focus
        refetchOnWindowFocus: false,
        // إعادة fetch عند reconnect
        refetchOnReconnect: true,
        // إعادة fetch عند mount فقط إذا كانت البيانات stale
        refetchOnMount: "always",
        // استخدام network mode "always" للسماح بفك تشفير البيانات حتى بدون إنترنت
        networkMode: "always",
        // عرض placeholder data أثناء التحميل
        placeholderData: (previousData: unknown) => previousData,
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
