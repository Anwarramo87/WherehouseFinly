export const QUERY_STALE_TIME = {
  FAST: 2 * 60 * 1000,       // دقيقتان — حضور يومي (السوكيت يتولى التحديث الفوري)
  STANDARD: 5 * 60 * 1000,   // 5 دقائق — بيانات متوسطة التغيير
  RELAXED: 10 * 60 * 1000,   // 10 دقائق — موظفون، رواتب (تقليل إعادة الجلب)
} as const;

export const QUERY_GC_TIME = {
  STANDARD: 15 * 60 * 1000,  // 15 دقيقة
  RELAXED: 30 * 60 * 1000,   // 30 دقيقة — الاحتفاظ بالذاكرة لفترة أطول
} as const;


/**
 * Where the persisted query cache lives in localStorage.
 *
 * Declared here, in a module with no dependencies, because both the provider
 * that writes it and the sign-out path that must delete it need the name — and
 * sign-out must not have to pull in the whole QueryClient to learn it.
 *
 * The cache holds employee records, salaries, advances and stock. It used to
 * survive signing out, so the next person to use the browser was served the
 * previous user's data while their own queries were still in flight.
 */
export const PERSISTED_QUERY_CACHE_KEY = "REACT_QUERY_OFFLINE_CACHE";
