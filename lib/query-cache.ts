export const QUERY_STALE_TIME = {
  FAST: 2 * 60 * 1000,      // دقيقتان — حضور يومي (السوكيت يتولى التحديث الفوري)
  STANDARD: 3 * 60 * 1000, // 3 دقائق — بيانات متوسطة التغيير
  RELAXED: 5 * 60 * 1000,  // 5 دقائق — موظفون، رواتب
} as const;

export const QUERY_GC_TIME = {
  STANDARD: 10 * 60 * 1000, // 10 دقائق
  RELAXED: 15 * 60 * 1000,  // 15 دقيقة (كانت 30 دقيقة)
} as const;

