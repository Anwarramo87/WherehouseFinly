/**
 * تحويل قيمة إلى رقم بطريقة آمنة
 * يدعم MongoDB Decimal128 والأرقام العربية
 */
export const toNumber = (value: unknown): number => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "object" && value && "$numberDecimal" in value) {
    const n = Number((value as { $numberDecimal?: string }).$numberDecimal);
    return Number.isFinite(n) ? n : 0;
  }
  if (typeof value === "string") {
    return Number.isFinite(Number(normalizeArabicDigits(value))) ? Number(normalizeArabicDigits(value)) : 0;
  }
  return 0;
};

/**
 * تطبيع الأرقام العربية (٠-٩) إلى ASCII (0-9).
 */
export const normalizeArabicDigits = (s: string): string => {
  const arabicDigits: Record<string, string> = {
    "٠": "0",
    "١": "1",
    "٢": "2",
    "٣": "3",
    "٤": "4",
    "٥": "5",
    "٦": "6",
    "٧": "7",
    "٨": "8",
    "٩": "9",
  };
  return s.replace(/[٠-٩]/g, (c: string) => arabicDigits[c] || c);
};

/** تنسيق رقم لعرضه مع فواصل (أرقام عربية ٠١٢٣٤٥٦٧٨٩) */
export const formatNumber = (value: number, decimals = 0): string => value.toLocaleString("ar-EG", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

/** تنسيق رقم لعرضه مع فواصل (أرقام إنجليزية 0123456789) */
export const formatNumberEn = (value: number, decimals = 0): string => value.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });


