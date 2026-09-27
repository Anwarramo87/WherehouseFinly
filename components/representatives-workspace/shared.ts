export type SaleStatus = "PENDING" | "PARTIAL" | "PAID" | "CANCELLED";

export const SALE_STATUS: Record<string, { label: string; tone: "slate" | "blue" | "green" | "red" | "amber" }> = {
  PENDING: { label: "بانتظار التحصيل", tone: "amber" },
  PARTIAL: { label: "مدفوع جزئياً", tone: "blue" },
  PAID: { label: "مدفوع", tone: "green" },
  CANCELLED: { label: "ملغى", tone: "red" },
};

export const COLLECTION_METHODS: Record<string, string> = {
  cash: "نقدي",
  transfer: "تحويل",
  check: "شيك",
};

export const SETTLEMENT_STATUS: Record<string, { label: string; tone: "slate" | "blue" | "green" | "red" | "amber" }> = {
  PENDING: { label: "قيد الإعداد", tone: "slate" },
  SUBMITTED: { label: "مقدَّمة", tone: "blue" },
  APPROVED: { label: "معتمدة", tone: "green" },
  DISPUTED: { label: "متنازع عليها", tone: "red" },
  CLOSED: { label: "مغلقة", tone: "slate" },
};