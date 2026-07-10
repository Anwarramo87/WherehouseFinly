export const QUERY_STALE_TIME = {
  FAST: 30 * 1000,          // 30 ثانية — حضور يومي، بيانات لحظية
  STANDARD: 2 * 60 * 1000, // دقيقتان — بيانات متوسطة التغيير
  RELAXED: 3 * 60 * 1000,  // 3 دقائق — موظفون، رواتب (كانت 5 دقائق)
} as const;

export const QUERY_GC_TIME = {
  STANDARD: 10 * 60 * 1000, // 10 دقائق
  RELAXED: 15 * 60 * 1000,  // 15 دقيقة (كانت 30 دقيقة)
} as const;

