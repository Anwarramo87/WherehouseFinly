/**
 * تحويل قيمة إلى رقم بطريقة آمنة
 * يدعم MongoDB Decimal128 والأرقام العربية
 */
export const toNumber = (value: unknown): number => {
  // إذا كانت القيمة رقم بالفعل
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  // إذا كانت MongoDB Decimal128
  if (typeof value === "object" && value && "$numberDecimal" in value) {
    const parsed = Number((value as { $numberDecimal?: string }).$numberDecimal || 0);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  // إذا كانت نص
  if (typeof value === "string") {
    const normalized = normalizeNumericInput(value);
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
};

/**
 * تطبيع المدخلات الرقمية من العربية إلى الإنجليزية
 * وإزالة المسافات والفواصل
 */
export const normalizeNumericInput = (value: string): string => {
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

  const normalized = value
    .replace(/[٠-٩]/g, (digit) => arabicDigits[digit] || digit)
    .replace(/[ ,]/g, "")
    .replace(/[^0-9.\-]/g, "");

  // التعامل مع نقاط عشرية متعددة
  const dotCount = (normalized.match(/\./g) || []).length;
  const cleaned = dotCount > 1 ? normalized.replace(/\./g, "") : normalized;

  return cleaned.trim();
};

/**
 * التحقق من صحة الرقم
 */
export const assertNumber = (value: number, errorMessage: string = "يجب أن تكون القيمة رقمًا صالحًا"): void => {
  if (!Number.isFinite(value)) {
    throw new Error(errorMessage);
  }
};

/**
 * تنسيق رقم لعرضه مع فواصل
 */
export const formatNumber = (value: number, decimals: number = 0): string => {
  return value.toLocaleString("ar-EG", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};
