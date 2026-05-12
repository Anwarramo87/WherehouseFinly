"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useImports } from "@/hooks/useImports";
import { useFiles } from "@/hooks/useFiles";
import { Upload, Users, Clock, Package, CheckCircle2, Download, Eye, Save, XCircle, Loader2, FileText, Sparkles, ChevronLeft } from "lucide-react";

type ImportErrorShape = {
  message?: string;
};

type ImportValidationError = {
  row?: number;
  error?: string;
};

type ImportValidationResult = {
  totalRows?: number;
  errorRows?: number;
  errors?: ImportValidationError[];
  successRows?: number;
};

type PreviewRow = {
  rowNumber: number;
  values: Record<string, string>;
};

type PreviewState = {
  entity: string;
  fileName: string;
  headers: string[];
  rows: PreviewRow[];
};

type ParsedPreviewFile = {
  headers: string[];
  rows: Array<Record<string, string>>;
};

type GeneralListedFile = {
  id?: string;
  originalName?: string;
  storedName?: string;
  path?: string;
  mimeType?: string | null;
  size?: number;
  extension?: string;
  uploadedAt?: string;
};

const PREVIEW_ROWS_LIMIT = 100;
const SUPPORTED_IMPORT_ACCEPT = ".xlsx,.csv,.tsv,.txt,.json";
const SUPPORTED_IMPORT_EXTENSIONS = new Set([
  "xlsx",
  "csv",
  "tsv",
  "txt",
  "json",
]);
const SUPPORTED_GENERAL_ACCEPT = ".pdf,.doc,.docx,.odt,.rtf,.txt,.md,.png,.jpg,.jpeg,.webp";

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === "object" && "message" in error) {
    const candidate = (error as ImportErrorShape).message;
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate;
    }
  }

  return fallback;
};

const toCellText = (value: unknown) => {
  if (value === null || value === undefined) return "";
  return String(value).trim();
};

const makeUniqueHeaders = (rawHeaders: string[]) => {
  const counts = new Map<string, number>();

  return rawHeaders.map((header, index) => {
    const base = header.trim() || `column_${index + 1}`;
    const normalized = base.toLowerCase();
    const count = counts.get(normalized) || 0;
    counts.set(normalized, count + 1);
    return count === 0 ? base : `${base}_${count + 1}`;
  });
};

const parseDelimitedText = (content: string, delimiter: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let inQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const nextChar = content[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        value += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      row.push(value);
      value = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }

      row.push(value);
      rows.push(row);
      row = [];
      value = "";
      continue;
    }

    value += char;
  }

  if (value.length > 0 || row.length > 0) {
    row.push(value);
    rows.push(row);
  }

  return rows;
};

const matrixToPreview = (matrix: unknown[][]): ParsedPreviewFile => {
  if (!Array.isArray(matrix) || matrix.length === 0) {
    throw new Error("الملف فارغ ولا يحتوي بيانات للمعاينة");
  }

  const firstRow = Array.isArray(matrix[0]) ? matrix[0] : [];
  const headers = makeUniqueHeaders(firstRow.map((cell) => toCellText(cell)));

  const rows = matrix
    .slice(1)
    .map((cells) => {
      const rowObject: Record<string, string> = {};
      headers.forEach((header, columnIndex) => {
        rowObject[header] = toCellText(Array.isArray(cells) ? cells[columnIndex] : "");
      });
      return rowObject;
    })
    .filter((row) => headers.some((header) => (row[header] || "").trim() !== ""));

  return { headers, rows };
};

const parseJsonPreview = (content: string): ParsedPreviewFile => {
  let payload: unknown;

  try {
    payload = JSON.parse(content);
  } catch {
    throw new Error("ملف JSON غير صالح. تأكد من صيغة الملف");
  }

  const rawRows = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object" && "rows" in payload && Array.isArray((payload as { rows?: unknown[] }).rows)
      ? (payload as { rows: unknown[] }).rows
      : null;

  if (!rawRows) {
    throw new Error("ملف JSON يجب أن يحتوي مصفوفة بيانات أو خاصية rows");
  }

  if (rawRows.length === 0) {
    throw new Error("ملف JSON فارغ ولا يحتوي بيانات للمعاينة");
  }

  if (rawRows.every((row) => Array.isArray(row))) {
    return matrixToPreview(rawRows as unknown[][]);
  }

  const objectRows = rawRows.filter((row) => row && typeof row === "object" && !Array.isArray(row)) as Array<Record<string, unknown>>;

  if (objectRows.length === 0) {
    throw new Error("بنية JSON غير مدعومة. استخدم مصفوفة كائنات أو مصفوفة صفوف");
  }

  const headerSet = new Set<string>();
  objectRows.forEach((row) => {
    Object.keys(row).forEach((key) => headerSet.add(key));
  });

  const headers = makeUniqueHeaders(Array.from(headerSet));
  const rows = objectRows.map((row) => {
    const normalized: Record<string, string> = {};
    headers.forEach((header) => {
      normalized[header] = toCellText(row[header]);
    });
    return normalized;
  });

  return { headers, rows };
};

const parseFileForPreview = async (file: File): Promise<ParsedPreviewFile> => {
  const extension = file.name.split(".").pop()?.toLowerCase() || "";

  if (!SUPPORTED_IMPORT_EXTENSIONS.has(extension)) {
    throw new Error("صيغة الملف غير مدعومة للاستيراد. استخدم ملفات الجداول أو JSON فقط");
  }

  if (extension === "json") {
    return parseJsonPreview(await file.text());
  }

  let matrix: unknown[][] = [];

  if (extension === "csv") {
    matrix = parseDelimitedText(await file.text(), ",");
  } else if (extension === "tsv") {
    matrix = parseDelimitedText(await file.text(), "\t");
  } else if (extension === "txt") {
    const text = await file.text();
    matrix = parseDelimitedText(text, text.includes("\t") ? "\t" : ",");
  } else if (extension === "xlsx") {
    try {
      const { default: readXlsxFile } = await import("read-excel-file/browser");
      const workbookSheets = await readXlsxFile(file);
      const firstSheet = Array.isArray(workbookSheets) ? workbookSheets[0] : undefined;

      if (!firstSheet?.data || !Array.isArray(firstSheet.data)) {
        throw new Error("الملف لا يحتوي أي Sheet يمكن قراءتها");
      }

      matrix = firstSheet.data as unknown[][];
    } catch {
      throw new Error("تعذر قراءة ملف XLSX. يرجى حفظ الملف كـ XLSX/CSV وإعادة المحاولة");
    }
  } else {
    throw new Error("صيغة الملف غير مدعومة للمعاينة. استخدم .xlsx أو .csv أو .tsv أو .txt أو .json");
  }

  return matrixToPreview(matrix);
};

const escapeCsvCell = (value: string) => {
  const normalized = value.replace(/\r\n/g, "\n");
  if (/[",\n]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
};

const rowsToCsv = (headers: string[], rows: Array<Record<string, string>>) => {
  const headerLine = headers.map(escapeCsvCell).join(",");
  const dataLines = rows.map((row) => headers.map((header) => escapeCsvCell(row[header] || "")).join(","));
  return [headerLine, ...dataLines].join("\n");
};

const makeEditKey = (rowNumber: number, header: string) => `${rowNumber}::${header}`;

const formatBytes = (value?: number) => {
  if (!Number.isFinite(value) || (value as number) < 0) return "-";
  const bytes = value as number;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const formatDateTime = (value?: string) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("ar-EG");
};

// 1. البيانات الثابتة للبطاقات بتصميم يتوافق مع الهوية الفاخرة
const importSections = [
  {
    title: "بيانات الموظفين",
    description: "ملف Excel يحتوي الاسم، المنصب، الأجر، أوقات الدوام",
    icon: Users,
    iconColor: "text-[#C89355]",
    bgColor: "bg-[#1a2530] border border-[#C89355]/30 shadow-inner",
    entity: "employees",
    enabled: true,
    templateEntity: "employees",
  },
  {
    title: "سجلات الحضور",
    description: "ملف CSV/Excel بتوقيتات الدخول والخروج من جهاز البصمة",
    icon: Clock,
    iconColor: "text-rose-600",
    bgColor: "bg-rose-500/10 border border-rose-500/20 shadow-inner",
    entity: "attendance",
    enabled: true,
    templateEntity: null,
  },
  {
    title: "جرد المخزون",
    description: "ملف Excel بأسماء المنتجات والكميات والأسعار",
    icon: Package,
    iconColor: "text-[#263544]",
    bgColor: "bg-white/80 border border-white shadow-inner",
    entity: "inventory",
    enabled: true,
    templateEntity: "products",
  },
];

const instructions = [
  "الملفات المدعومة: .xlsx, .csv, .tsv, .txt, .json",
  "ملفات Word/PDF غير مناسبة لاستيراد جداول الموظفين أو المخزون",
  "لرفع الملفات العامة (PDF/Word/صور) استخدم بطاقة (رفع ملفات عامة) بالأسفل",
  "يجب أن يحتوي السطر الأول على عناوين الأعمدة",
  "سيتم عرض البيانات للمراجعة قبل الحفظ",
  "يمكنك تعديل أي سجل بعد الاستيراد",
];

export default function ImportPage() {
  const router = useRouter();
  const { validate, template, upload } = useImports();
  const { upload: uploadGeneralFile, list: generalFilesList } = useFiles();
  const [status, setStatus] = useState<string | null>(null);
  const [generalFilePath, setGeneralFilePath] = useState<string | null>(null);
  const [reviewPath, setReviewPath] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [cellEdits, setCellEdits] = useState<Record<string, string>>({});
  const [isPreparingPreview, setIsPreparingPreview] = useState(false);
  const [isSubmittingImport, setIsSubmittingImport] = useState(false);
  const [isUploadingGeneralFile, setIsUploadingGeneralFile] = useState(false);
  const [dragEntity, setDragEntity] = useState<string | null>(null);
  const activeOperationRef = useRef(0);
  const previewSectionRef = useRef<HTMLDivElement | null>(null);

  const visiblePreviewRows = useMemo(() => {
    if (!preview) return [];
    return preview.rows.slice(0, PREVIEW_ROWS_LIMIT);
  }, [preview]);

  const hiddenPreviewRows = preview ? Math.max(preview.rows.length - PREVIEW_ROWS_LIMIT, 0) : 0;
  const editedCellsCount = useMemo(() => Object.keys(cellEdits).length, [cellEdits]);
  const recentGeneralFiles = useMemo(() => {
    const files = (generalFilesList.data?.files || []) as GeneralListedFile[];
    return files.slice(0, 8);
  }, [generalFilesList.data?.files]);

  const startOperation = () => {
    activeOperationRef.current += 1;
    return activeOperationRef.current;
  };

  const isCurrentOperation = (operationId: number) => activeOperationRef.current === operationId;

  const clearPreview = () => {
    setPreview(null);
    setCellEdits({});
  };

  const openPreview = () => {
    previewSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const resolveEditPath = (entity: string) => {
    if (entity === "employees") return "/employees";
    if (entity === "inventory" || entity === "products") return "/inventory";
    return null;
  };

  const getEditedCellValue = (row: PreviewRow, header: string) => {
    const key = makeEditKey(row.rowNumber, header);
    if (Object.prototype.hasOwnProperty.call(cellEdits, key)) {
      return cellEdits[key];
    }
    return row.values[header] || "";
  };

  const buildRowsForUpload = () => {
    if (!preview) return [];

    return preview.rows.map((row) => {
      const next: Record<string, string> = {};
      preview.headers.forEach((header) => {
        next[header] = getEditedCellValue(row, header);
      });
      return next;
    });
  };

  const cancelPreview = () => {
    startOperation();
    clearPreview();
    setDragEntity(null);
    setReviewPath(null);
    setIsPreparingPreview(false);
    setIsSubmittingImport(false);
    setStatus("تم إلغاء المعاينة الحالية");
  };

  const handleDragOver = (event: React.DragEvent<HTMLLabelElement>, entity: string) => {
    event.preventDefault();
    event.stopPropagation();
    if (dragEntity !== entity) {
      setDragEntity(entity);
    }
  };

  const handleDragLeave = (event: React.DragEvent<HTMLLabelElement>, entity: string) => {
    event.preventDefault();
    event.stopPropagation();
    if (dragEntity === entity) {
      setDragEntity(null);
    }
  };

  const handleDrop = async (event: React.DragEvent<HTMLLabelElement>, entity: string) => {
    event.preventDefault();
    event.stopPropagation();
    setDragEntity(null);

    const section = importSections.find((item) => item.entity === entity);
    if (!section?.enabled || isPreparingPreview || isSubmittingImport) {
      return;
    }

    const file = event.dataTransfer.files?.[0];
    if (!file) {
      return;
    }

    await onFile(file, entity);
  };

  const downloadTemplate = async (entity: string) => {
    setStatus("جاري تحميل القالب...");
    try {
      const result = await template.mutateAsync(entity);

      const mimeType = result?.type || "text/csv;charset=utf-8;";
      const blob = result instanceof Blob ? result : new Blob([result], { type: mimeType });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = entity === "employees" ? "employees-template.csv" : "products-template.csv";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);

      setStatus("تم تحميل القالب بنجاح");
    } catch (error) {
      setStatus(getErrorMessage(error, "فشل تحميل القالب"));
    }
  };

  const onGeneralFile = async (file: File) => {
    setGeneralFilePath(null);
    setStatus("جاري رفع الملف العام بشكل آمن...");
    setIsUploadingGeneralFile(true);

    try {
      const response = await uploadGeneralFile.mutateAsync({ file });
      const uploadedPath = response?.file?.path || null;
      setGeneralFilePath(uploadedPath);

      setStatus(
        `تم رفع الملف العام بنجاح: ${response?.file?.originalName || file.name}${uploadedPath ? ` (المسار: ${uploadedPath})` : ""}`,
      );
    } catch (error) {
      setStatus(getErrorMessage(error, "فشل رفع الملف العام"));
    } finally {
      setIsUploadingGeneralFile(false);
    }
  };

  const onFile = async (file: File, entity: string) => {
    const operationId = startOperation();
    setReviewPath(null);
    clearPreview();
    setStatus(`جاري قراءة ملف ${entity}...`);
    setIsPreparingPreview(true);

    try {
      const parsed = await parseFileForPreview(file);
      if (!isCurrentOperation(operationId)) return;

      if (parsed.rows.length === 0) {
        throw new Error("الملف لا يحتوي أي صف بيانات بعد العناوين");
      }

      setPreview({
        entity,
        fileName: file.name,
        headers: parsed.headers,
        rows: parsed.rows.map((values, index) => ({
          rowNumber: index + 1,
          values,
        })),
      });

      setStatus("تمت قراءة الملف. اضغط زر (عرض المعاينة) أو انزل للأسفل لتعديل البيانات ثم اضغط تأكيد الاستيراد.");
    } catch (error) {
      if (isCurrentOperation(operationId)) {
        clearPreview();
        setStatus(getErrorMessage(error, "فشل تجهيز معاينة الملف"));
      }
    } finally {
      if (isCurrentOperation(operationId)) {
        setIsPreparingPreview(false);
      }
    }
  };

  const onEditCell = (rowNumber: number, header: string, value: string) => {
    setCellEdits((previous) => ({
      ...previous,
      [makeEditKey(rowNumber, header)]: value,
    }));
  };

  const confirmImport = async () => {
    if (!preview) return;

    const operationId = startOperation();
    setReviewPath(null);
    setIsSubmittingImport(true);

    try {
      const editedRows = buildRowsForUpload();
      if (editedRows.length === 0) {
        throw new Error("لا توجد صفوف صالحة لإرسالها");
      }

      const csvBody = rowsToCsv(preview.headers, editedRows);
      const baseName = preview.fileName.replace(/\.(xlsx|csv|tsv|txt|json)$/i, "");
      const payloadFile = new File([csvBody], `${baseName || preview.entity}-edited.csv`, {
        type: "text/csv",
      });

      setStatus("جاري التحقق النهائي من النسخة المعدلة...");
      const validationResult = (await validate.mutateAsync({ entity: preview.entity, file: payloadFile })) as ImportValidationResult;
      if (!isCurrentOperation(operationId)) return;

      const errorRows = Number(validationResult.errorRows || 0);
      if (errorRows > 0) {
        const errors = Array.isArray(validationResult.errors) ? validationResult.errors : [];
        const first = errors[0];
        setStatus(
          `لا يمكن إكمال الاستيراد: يوجد ${errorRows} صف غير صالح${first?.row ? ` (السطر ${first.row}: ${first.error})` : ""}.`,
        );
        return;
      }

      setStatus("تم التحقق النهائي بنجاح، جاري رفع البيانات للحفظ...");
      const uploadResult = await upload.mutateAsync({ entity: preview.entity, file: payloadFile });
      if (!isCurrentOperation(operationId)) return;

      const uploadedRows = Number(uploadResult?.successRows || 0);
      const uploadedErrors = Number(uploadResult?.errorRows || 0);
      const totalRows = Number(uploadResult?.totalRows || 0);

      if (uploadedErrors > 0) {
        setReviewPath(resolveEditPath(preview.entity));
        setStatus(
          `تمت عملية الاستيراد مع ملاحظات: ${uploadedRows} ناجح من أصل ${totalRows}، وعدد ${uploadedErrors} صف غير صالح`,
        );
        return;
      }

      setReviewPath(resolveEditPath(preview.entity));
      setStatus(
        `تم رفع الملف واستيراد البيانات بنجاح (${uploadedRows || totalRows} سجل). رقم العملية: ${uploadResult?.jobId || "N/A"}`,
      );
    } catch (error) {
      if (isCurrentOperation(operationId)) {
        setStatus(getErrorMessage(error, "فشل استيراد الملف"));
      }
    } finally {
      if (isCurrentOperation(operationId)) {
        setIsSubmittingImport(false);
      }
    }
  };

  return (
    /* الحاوية الرئيسية: تأثير زجاجي مع درازة خارجية متطابقة مع باقي النظام */
    <div className="relative z-10 w-full max-w-7xl min-h-[85vh] mx-auto bg-white/50 backdrop-blur-[40px] rounded-[3rem] shadow-[0_40px_80px_-20px_rgba(38,53,68,0.2)] border-2 border-dashed border-[#C89355]/60 flex flex-col overflow-hidden" dir="rtl">
        
        {/* نقشة الفايبر (القماش) الثابتة والشفافة */}
        <div 
          className="absolute inset-0 opacity-[0.04] pointer-events-none z-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='24' height='24' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 12h24M12 0v24' stroke='%23263544' stroke-width='1' stroke-dasharray='4 4' fill='none'/%3E%3C/svg%3E")`,
            backgroundSize: '24px 24px'
          }}
        />

        {/* المحتوى الداخلي */}
        <div className="p-6 md:p-10 h-full overflow-y-auto custom-scrollbar relative z-10">
          
          {/* مسار التنقل (Breadcrumbs) - زجاجي مع درازة */}
          <nav className="mb-6 relative overflow-hidden flex items-center gap-2 text-xs font-black text-slate-500 bg-white/60 backdrop-blur-xl w-fit px-4 py-2.5 rounded-2xl border border-white/80 shadow-[0_5px_15px_rgba(38,53,68,0.05)] group">
            <div className="absolute inset-1 rounded-xl border border-dashed border-[#C89355]/30 pointer-events-none transition-colors group-hover:border-[#C89355]/50" />
            <span className="hover:text-[#263544] cursor-pointer transition-colors relative z-10">لوحة التحكم</span>
            <ChevronLeft size={14} className="text-[#C89355] relative z-10" />
            <span className="text-[#263544] relative z-10">استيراد البيانات</span>
          </nav>

          {/* الهيدر */}
          <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#263544]/10 pb-8 relative">
            <div>
              <div className="flex items-center gap-3 mb-2">
                {/* أيقونة العنوان بهوية الماركة الكحلية والنحاسية مع الدرزة */}
                <div className="p-3 bg-[#1a2530] rounded-2xl shadow-[0_15px_25px_rgba(38,53,68,0.4)] border border-[#C89355]/40 relative outline outline-dashed outline-1 outline-[#C89355]/50 outline-offset-[-4px] group">
                  <Upload size={22} className="text-[#C89355] group-hover:animate-bounce transition-all duration-300" strokeWidth={2.5} />
                </div>
                <h1 className="text-3xl font-black text-[#263544] tracking-tight drop-shadow-sm">استيراد البيانات</h1>
              </div>
              <p className="text-slate-600 text-sm font-bold pr-14 mt-1">رفع ملفات جداول متعددة (Excel/CSV/TSV/TXT/JSON) لتحديث البيانات بضغطة زر.</p>
            </div>
          </header>

          {/* منطقة عرض حالة الرفع إن وجدت */}
          {status && (
            <div className="mb-8 text-center p-5 relative overflow-hidden bg-white/80 backdrop-blur-xl rounded-[2rem] border-2 border-white/90 shadow-[0_15px_30px_rgba(38,53,68,0.06)] animate-in slide-in-from-top-4 duration-300 group/status">
              <div className="absolute inset-1.5 rounded-[1.7rem] border border-dashed border-[#C89355]/30 pointer-events-none transition-colors group-hover/status:border-[#C89355]/50 z-0" />
              <p className="text-sm font-black text-[#263544] flex items-center justify-center gap-2 relative z-10">
                <Sparkles size={16} className="group-hover/status:animate-pulse transition-all duration-300 text-[#C89355]" /> {status}
              </p>
              {generalFilePath ? <p className="mt-2 text-[11px] font-mono font-bold text-slate-500 relative z-10">المسار المخزن: {generalFilePath}</p> : null}
              
              <div className="mt-4 flex flex-wrap items-center justify-center gap-3 relative z-10">
                {preview ? (
                  <button
                    type="button"
                    onClick={openPreview}
                    className="relative overflow-hidden inline-flex items-center gap-2 rounded-xl bg-[#1a2530] hover:bg-[#263544] px-5 py-2.5 text-xs font-black text-[#C89355] shadow-[0_10px_20px_rgba(38,53,68,0.3)] active:scale-95 transition-all border border-[#C89355]/40 group/btn"
                  >
                    <div className="absolute inset-1 rounded-lg border border-dashed border-[#C89355]/30 pointer-events-none transition-colors group-hover/btn:border-[#C89355]/50" />
                    <Eye size={16} className="relative z-10 group-hover/btn:animate-pulse transition-all duration-300" /> 
                    <span className="relative z-10">عرض المعاينة</span>
                  </button>
                ) : null}
                {reviewPath ? (
                  <button
                    type="button"
                    onClick={() => router.push(reviewPath)}
                    className="relative overflow-hidden inline-flex items-center gap-2 rounded-xl bg-white/80 backdrop-blur-md border-2 border-white hover:border-[#C89355]/30 text-[#263544] px-5 py-2.5 text-xs font-black shadow-sm active:scale-95 transition-all group/btn"
                  >
                    <div className="absolute inset-1 rounded-lg border border-dashed border-[#263544]/10 pointer-events-none transition-colors group-hover/btn:border-[#C89355]/30" />
                    <span className="relative z-10">فتح صفحة البيانات بعد الاستيراد</span>
                  </button>
                ) : null}
              </div>
            </div>
          )}

          {/* البطاقات */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
            {importSections.map((section, index) => (
              <div key={index} className="relative bg-white/60 backdrop-blur-2xl rounded-[2.5rem] border-2 border-white/90 shadow-[0_15px_40px_rgba(38,53,68,0.08)] hover:shadow-[0_20px_50px_rgba(38,53,68,0.12)] transition-all p-6 md:p-8 flex flex-col items-center text-center group overflow-hidden">
                <div className="absolute inset-1.5 rounded-[2.2rem] border border-dashed border-[#C89355]/30 pointer-events-none transition-colors group-hover:border-[#C89355]/50 z-0" />
                
                <div className={`w-16 h-16 ${section.bgColor} shadow-inner rounded-2xl flex items-center justify-center mb-5 group-hover:animate-pulse transition-all relative z-10`}>
                  <section.icon size={28} className={section.iconColor} />
                </div>
                
                <h3 className="font-black text-[#263544] text-lg mb-2 relative z-10">{section.title}</h3>
                <p className="text-xs font-bold text-slate-500 mb-6 leading-relaxed px-2 relative z-10">
                  {section.description}
                </p>

                {section.templateEntity ? (
                  <button
                    onClick={() => downloadTemplate(section.templateEntity)}
                    className="mb-4 inline-flex items-center gap-2 text-xs font-black text-[#263544] bg-white/80 backdrop-blur-md border border-white hover:bg-white hover:border-[#C89355]/30 px-4 py-2.5 rounded-xl transition-all shadow-sm w-full justify-center active:scale-95 relative z-10 group/dl"
                  >
                    <Download size={14} className="text-[#C89355] group-hover/dl:-translate-y-1 transition-transform" />
                    تحميل قالب مطابق
                  </button>
                ) : null}

                {/* منطقة السحب والإفلات */}
                <label
                  onDragOver={(event) => handleDragOver(event, section.entity)}
                  onDragLeave={(event) => handleDragLeave(event, section.entity)}
                  onDrop={(event) => handleDrop(event, section.entity)}
                  className={`w-full border-2 border-dashed rounded-2xl p-6 transition-all cursor-pointer group/drop flex-1 flex flex-col justify-center relative z-10 ${
                    dragEntity === section.entity
                      ? "border-[#C89355] bg-[#C89355]/10 shadow-inner"
                      : "border-slate-300/50 bg-white/50 hover:border-[#C89355]/60 hover:bg-white/80"
                  }`}
                >
                  <input
                    type="file"
                    accept={SUPPORTED_IMPORT_ACCEPT}
                    className="hidden"
                    disabled={!section.enabled || isPreparingPreview || isSubmittingImport}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) onFile(f, section.entity);
                      e.currentTarget.value = "";
                    }}
                  />
                  <div className="flex flex-col items-center gap-2">
                    <Upload size={24} className={`transition-all duration-300 ${dragEntity === section.entity ? 'text-[#C89355] animate-bounce' : 'text-slate-400 group-hover/drop:text-[#C89355] group-hover/drop:animate-bounce'}`} />
                    <p className="text-xs font-black text-[#263544] mt-2">
                      {section.enabled
                        ? dragEntity === section.entity
                          ? "أفلت الملف هنا الآن"
                          : "اسحب الملف أو انقر للرفع"
                        : "غير مدعوم حالياً"}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono font-bold mt-1">.xlsx, .csv, .json</p>
                  </div>
                </label>

              </div>
            ))}
          </div>

          {/* رفع الملفات العامة */}
          <div className="relative bg-white/60 backdrop-blur-2xl rounded-[2.5rem] border-2 border-white/90 shadow-[0_15px_40px_rgba(38,53,68,0.08)] hover:shadow-[0_20px_50px_rgba(38,53,68,0.12)] p-8 mb-10 overflow-hidden group/gen">
            <div className="absolute inset-1.5 rounded-[2.2rem] border border-dashed border-[#C89355]/30 pointer-events-none transition-colors group-hover/gen:border-[#C89355]/50 z-0" />
            
            <div className="flex items-center gap-4 mb-6 relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-white/80 border border-white shadow-sm flex items-center justify-center">
                <FileText size={24} className="text-[#263544]" />
              </div>
              <div className="text-right">
                <h3 className="font-black text-[#263544] text-xl">رفع ملفات عامة</h3>
                <p className="text-xs font-bold text-slate-500 mt-1">
                  لرفع ملفات PDF/Word/صور بشكل آمن. (هذا القسم لا يستورد بيانات إلى الجداول).
                </p>
              </div>
            </div>

            <label className="w-full block relative z-10 border-2 border-dashed border-slate-300/50 bg-white/40 hover:border-[#C89355]/60 hover:bg-white/80 rounded-[2rem] p-10 cursor-pointer transition-all group/drop">
              <input
                type="file"
                accept={SUPPORTED_GENERAL_ACCEPT}
                className="hidden"
                disabled={isPreparingPreview || isSubmittingImport || isUploadingGeneralFile}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    onGeneralFile(file);
                  }
                  event.currentTarget.value = "";
                }}
              />

              <div className="flex flex-col items-center gap-3 text-center">
                {isUploadingGeneralFile ? (
                  <Loader2 size={36} className="text-[#C89355] animate-spin" />
                ) : (
                  <Upload size={36} className="text-slate-400 group-hover/drop:text-[#C89355] transition-colors group-hover/drop:-translate-y-2 duration-300" />
                )}

                <p className="text-sm font-black text-[#263544] mt-2">
                  {isUploadingGeneralFile ? "جاري رفع الملف..." : "اسحب الملف العام هنا أو انقر للرفع"}
                </p>
                <p className="text-[11px] text-slate-400 font-mono font-bold">.pdf, .docx, .png, .jpg ...</p>
              </div>
            </label>

            <div className="mt-8 border-2 border-white/80 rounded-3xl p-6 bg-white/40 backdrop-blur-md shadow-sm relative z-10">
              <div className="flex items-center justify-between mb-5">
                <h4 className="text-sm font-black text-[#263544]">آخر الملفات المرفوعة</h4>
                <button
                  type="button"
                  onClick={() => generalFilesList.refetch()}
                  className="text-xs font-black text-[#263544] hover:text-[#C89355] bg-white px-4 py-2 rounded-xl border border-white hover:border-[#C89355]/30 shadow-sm active:scale-95 transition-all"
                >
                  تحديث القائمة
                </button>
              </div>

              {generalFilesList.isLoading ? (
                <div className="text-xs font-black text-[#263544] inline-flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin text-[#C89355]" />
                  جاري تحميل قائمة الملفات...
                </div>
              ) : generalFilesList.isError ? (
                <p className="text-xs font-black text-rose-600 bg-rose-50/80 p-3 rounded-xl border border-rose-100">فشل تحميل قائمة الملفات المرفوعة</p>
              ) : recentGeneralFiles.length === 0 ? (
                <p className="text-xs font-bold text-slate-400 text-center py-6">لا توجد ملفات مرفوعة حتى الآن</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {recentGeneralFiles.map((item, index) => (
                    <div
                      key={`${item.path || item.storedName || "file"}-${index}`}
                      className="rounded-2xl border border-white/80 bg-white/70 backdrop-blur-sm p-4 shadow-sm hover:shadow-md hover:border-[#C89355]/40 transition-all group/file"
                    >
                      <p className="text-xs font-black text-[#263544] break-all mb-1 group-hover/file:text-[#C89355] transition-colors">{item.originalName || item.storedName || "-"}</p>
                      <p className="text-[10px] font-mono text-slate-500 bg-white/80 px-2 py-1 rounded truncate border border-slate-100 shadow-inner">{item.path || "-"}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-black text-[#263544] bg-[#263544]/10 px-2 py-1 rounded-md">{formatBytes(item.size)}</span>
                        <span className="text-[10px] font-black text-[#C89355] bg-[#C89355]/10 px-2 py-1 rounded-md uppercase border border-[#C89355]/20">{item.extension || "-"}</span>
                        <span className="text-[10px] font-bold text-slate-400 mr-auto">{formatDateTime(item.uploadedAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* قسم المعاينة */}
          {preview ? (
            <div ref={previewSectionRef} className="relative bg-white/60 backdrop-blur-2xl rounded-[2.5rem] p-8 border-2 border-white/90 shadow-[0_20px_50px_rgba(38,53,68,0.08)] mb-10 animate-in slide-in-from-bottom-8 duration-500 group/prev">
              <div className="absolute inset-1.5 rounded-[2.2rem] border border-dashed border-[#C89355]/30 pointer-events-none transition-colors group-hover/prev:border-[#C89355]/50 z-0" />
              
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 border-b border-white/80 pb-6 relative z-10">
                <div>
                  <h2 className="text-xl font-black text-[#263544] inline-flex items-center gap-3">
                    <div className="p-2 bg-[#1a2530] rounded-xl shadow-inner border border-[#C89355]/30"><Eye size={20} className="text-[#C89355]" /></div>
                    معاينة الملف وتعديله قبل الاستيراد
                  </h2>
                  <p className="text-xs font-bold text-slate-500 mt-3 flex items-center gap-2">
                    <span className="bg-white/80 px-3 py-1.5 rounded-lg border border-white shadow-sm font-mono text-[#263544]">{preview.fileName}</span>
                    <span className="bg-white/80 px-3 py-1.5 rounded-lg border border-white shadow-sm text-[#263544]">{preview.rows.length} صف</span>
                    <span className="bg-[#C89355]/10 text-[#C89355] px-3 py-1.5 rounded-lg border border-[#C89355]/20 font-black">{editedCellsCount} تعديل</span>
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={cancelPreview}
                    disabled={isSubmittingImport}
                    className="relative overflow-hidden inline-flex items-center gap-2 rounded-2xl border-2 border-white bg-white/80 backdrop-blur-md px-5 py-3 text-xs font-black text-[#263544] hover:bg-white hover:border-[#C89355]/30 disabled:opacity-60 shadow-sm active:scale-95 transition-all group/btn"
                  >
                    <div className="absolute inset-1 rounded-xl border border-dashed border-[#263544]/10 pointer-events-none transition-colors group-hover/btn:border-[#C89355]/30" />
                    <XCircle size={16} className="text-rose-500 relative z-10" />
                    <span className="relative z-10">إلغاء المعاينة</span>
                  </button>

                  <button
                    type="button"
                    onClick={confirmImport}
                    disabled={isPreparingPreview || isSubmittingImport}
                    className="relative overflow-hidden inline-flex items-center gap-2 rounded-2xl bg-[#1a2530] hover:bg-[#263544] px-6 py-3 text-xs font-black text-[#C89355] shadow-[0_10px_20px_rgba(38,53,68,0.4)] disabled:opacity-60 active:scale-95 transition-all border border-[#C89355]/40 group/btn"
                  >
                    <div className="absolute inset-1 rounded-xl border border-dashed border-[#C89355]/30 pointer-events-none transition-colors group-hover/btn:border-[#C89355]/50" />
                    {isSubmittingImport ? <Loader2 size={18} className="animate-spin relative z-10" /> : <Save size={18} className="relative z-10" />}
                    <span className="relative z-10">تأكيد الاستيراد والحفظ</span>
                  </button>
                </div>
              </div>

              {isPreparingPreview ? (
                <div className="text-sm font-black text-[#263544] mb-6 p-4 bg-white/60 backdrop-blur-md rounded-2xl border border-white shadow-sm inline-flex items-center gap-3 relative z-10">
                  <Loader2 size={18} className="animate-spin text-[#C89355]" />
                  جاري فحص الملف والتحقق من البيانات...
                </div>
              ) : null}

              <div className="overflow-hidden border-2 border-white/90 rounded-3xl shadow-sm relative z-10">
                <div className="w-full overflow-x-auto custom-scrollbar">
                  <table className="min-w-full text-right border-collapse">
                    <thead className="bg-white/60 border-b border-white/80">
                      <tr>
                        <th className="p-4 border-b border-white/80 text-[#C89355] font-black text-xs sticky right-0 bg-white backdrop-blur-xl z-10 w-12 text-center shadow-[2px_0_10px_rgba(0,0,0,0.05)]">#</th>
                        {preview.headers.map((header) => (
                          <th key={header} className="p-4 border-b border-white/80 text-[#263544] font-black text-xs whitespace-nowrap bg-white/40">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/40 bg-white/40 backdrop-blur-sm">
                      {visiblePreviewRows.map((row) => (
                        <tr key={row.rowNumber} className="hover:bg-white/90 transition-colors group/row">
                          <td className="p-3 border-b border-white/40 text-slate-400 font-mono font-bold text-xs sticky right-0 bg-white group-hover/row:bg-white/90 group-hover/row:text-[#263544] transition-colors text-center shadow-[2px_0_10px_rgba(0,0,0,0.02)]">{row.rowNumber}</td>
                          {preview.headers.map((header) => (
                            <td key={`${row.rowNumber}-${header}`} className="p-2 border-b border-white/40 min-w-40">
                              <input
                                value={getEditedCellValue(row, header)}
                                onChange={(e) => onEditCell(row.rowNumber, header, e.target.value)}
                                className="w-full rounded-xl border border-transparent bg-white/50 hover:bg-white px-3 py-2.5 text-xs font-black text-[#263544] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#C89355]/40 focus:border-[#C89355] transition-all shadow-inner"
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {hiddenPreviewRows > 0 ? (
                <p className="mt-5 text-xs font-black text-slate-500 bg-white/60 backdrop-blur-sm p-4 rounded-xl border border-white shadow-sm text-center relative z-10">
                  يتم عرض أول <span className="text-[#C89355]">{PREVIEW_ROWS_LIMIT}</span> صف فقط لتسريع الشاشة. سيتم إرسال جميع الصفوف عند التأكيد.
                </p>
              ) : null}
            </div>
          ) : null}

          {/* قسم التعليمات */}
          <div className="relative bg-white/60 backdrop-blur-2xl rounded-[2.5rem] p-8 border-2 border-white/90 shadow-[0_15px_30px_rgba(38,53,68,0.06)] group/inst overflow-hidden">
            <div className="absolute inset-1.5 rounded-[2.2rem] border border-dashed border-[#C89355]/30 pointer-events-none transition-colors group-hover/inst:border-[#C89355]/50 z-0" />
            <h2 className="text-xl font-black text-[#263544] mb-8 flex items-center gap-3 relative z-10">
              <CheckCircle2 className="text-[#C89355] group-hover/inst:animate-pulse transition-all duration-300" size={24} /> تعليمات وإرشادات الاستيراد
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 relative z-10">
              {instructions.map((text, index) => (
                <div key={index} className="flex items-start gap-4 bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-white shadow-sm hover:border-[#C89355]/30 hover:shadow-md transition-all">
                  <div className="w-7 h-7 rounded-xl bg-[#1a2530] flex items-center justify-center shrink-0 mt-0.5 border border-[#C89355]/30 shadow-inner">
                    <span className="text-xs font-black text-[#C89355]">{index + 1}</span>
                  </div>
                  <span className="text-sm text-[#263544] font-bold leading-relaxed">{text}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
    </div>
  );
}