"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import {
  Building2,
  Database,
  Loader2,
  ShieldAlert,
  Download,
  UploadCloud,
  RotateCcw,
  FileJson,
  CheckCircle2,
  XCircle,
  FlaskConical,
  Play,
  ChevronDown,
  HardDriveDownload,
} from "lucide-react";
import apiClient from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { useFactories } from "@/hooks/useSuperAdmin";

interface BackupJob {
  id: string;
  tenantId: string;
  tenantName: string;
  state: "queued" | "running" | "done" | "failed";
  startedAt: string;
  finishedAt: string | null;
  error: string | null;
  file: { fileName: string; sizeBytes: number } | null;
}

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

/**
 * Per-factory backups.
 *
 * Starting one returns immediately — a snapshot walks every model and would
 * block the API for everyone if it ran inside the request, which is exactly what
 * inline payroll already does. The list polls only while something is running.
 */
export default function BackupsPage() {
  const roles = useAuthStore((state) => state.user?.roles);
  const role = useAuthStore((state) => state.user?.role);
  const isSuperAdmin = roles?.includes("superadmin") || role === "superadmin";

  const queryClient = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data: factories = [], isLoading: factoriesLoading } = useFactories();

  const { data: jobs = [] } = useQuery<BackupJob[]>({
    queryKey: ["super-admin", "backup-jobs"],
    enabled: isSuperAdmin,
    queryFn: async () => (await apiClient.get("/admin/tenants/backups")).data as BackupJob[],
    // Poll only while work is outstanding — a finished list does not need to be
    // re-fetched every two seconds forever.
    refetchInterval: (query) => {
      const data = query.state.data as BackupJob[] | undefined;
      const active = data?.some((job) => job.state === "queued" || job.state === "running");
      return active ? 2000 : false;
    },
  });

  const startBackup = useMutation({
    mutationFn: async (tenantId: string) =>
      (await apiClient.post(`/admin/tenants/${tenantId}/backups`)).data as BackupJob,
    onMutate: (tenantId) => setBusyId(tenantId),
    onSuccess: () => {
      toast.success("بدأت عملية النسخ الاحتياطي");
      void queryClient.invalidateQueries({ queryKey: ["super-admin", "backup-jobs"] });
    },
    onError: () => toast.error("تعذّر بدء النسخ الاحتياطي"),
    onSettled: () => setBusyId(null),
  });

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const downloadSnapshotNow = async () => {
    try {
      toast.loading("جارٍ تجهيز النسخة الفورية…", { id: "snapshot-now" });
      const res = await apiClient.get("/backup/snapshot", { responseType: "blob" });
      triggerBlobDownload(res.data as Blob, `snapshot-now-${new Date().toISOString().slice(0, 10)}.json`);
      toast.success("تم تنزيل النسخة الفورية", { id: "snapshot-now" });
    } catch {
      toast.error("تعذّر تنزيل النسخة الفورية", { id: "snapshot-now" });
    }
  };

  if (!isSuperAdmin) {
    return (
      <main className="p-8" dir="rtl">
        <div className="max-w-md rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-800">
          <ShieldAlert className="mb-3" size={24} aria-hidden="true" />
          <h1 className="mb-1 text-lg font-bold">هذه الصفحة للمشرف العام فقط</h1>
        </div>
      </main>
    );
  }

  const latestFor = (tenantId: string) => jobs.find((job) => job.tenantId === tenantId) ?? null;

  return (
    <main className="p-6 md:p-8" dir="rtl">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#263544]">النسخ الاحتياطي</h1>
          <p className="mt-1 text-sm text-slate-500">
            نسخة احتياطية مستقلة لكل مصنع. افتح أي مصنع لتنزيل نسخه المحفوظة أو استعادتها وتشغيلها.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void downloadSnapshotNow()}
          className="inline-flex items-center gap-2 rounded-xl border border-[#263544] px-4 py-2.5 text-xs font-bold text-[#263544] transition-colors hover:bg-[#263544] hover:text-white"
        >
          <HardDriveDownload size={15} aria-hidden="true" />
          تنزيل نسخة فورية الآن
        </button>
      </header>

      {factoriesLoading && (
        <div className="flex items-center gap-3 text-slate-500">
          <Loader2 className="animate-spin" size={18} aria-hidden="true" />
          <span>جارٍ التحميل…</span>
        </div>
      )}

      <ul className="flex flex-col gap-3">
        {factories.map((factory) => {
          const job = latestFor(factory.id);
          const isRunning = job?.state === "queued" || job?.state === "running";
          const isOpen = expandedId === factory.id;

          return (
            <li
              key={factory.id}
              className={`rounded-2xl border bg-white transition-colors ${
                isOpen ? "border-[#C89355]/50 shadow-sm" : "border-slate-200"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-4 p-4">
                <button
                  type="button"
                  onClick={() => setExpandedId(isOpen ? null : factory.id)}
                  aria-expanded={isOpen}
                  className="flex min-w-0 flex-1 items-center gap-2 text-right"
                >
                  <Building2 size={16} aria-hidden="true" className="shrink-0 text-[#C89355]" />
                  <span className="min-w-0">
                    <span className="block truncate font-bold text-[#263544]">
                      {factory.name}
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-500">
                      {factory.employees} موظف · {factory.code}
                    </span>
                  </span>
                  <ChevronDown
                    size={15}
                    aria-hidden="true"
                    className={`shrink-0 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>

                <div className="flex items-center gap-3">
                  {job && <JobState job={job} />}

                  <button
                    type="button"
                    disabled={isRunning || busyId === factory.id}
                    onClick={() => startBackup.mutate(factory.id)}
                    aria-busy={isRunning}
                    className="flex items-center gap-1.5 rounded-lg bg-[#263544] px-4 py-2 text-xs font-bold text-[#C89355] transition-colors hover:bg-[#1a2530] disabled:opacity-50"
                  >
                    {isRunning ? (
                      <Loader2 className="animate-spin" size={14} aria-hidden="true" />
                    ) : (
                      <Database size={14} aria-hidden="true" />
                    )}
                    {isRunning ? "جارٍ النسخ…" : "نسخ احتياطي"}
                  </button>
                </div>
              </div>

              {isOpen && (
                <div className="border-t border-slate-100 px-4 py-4">
                  <FactoryStoredBackups tenantId={factory.id} factoryName={factory.name} />
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <p className="mt-6 max-w-2xl rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
        النسخ تُحفظ على قرص دائم (mounted volume) وتبقى بعد إعادة النشر، لكنها ليست نسخة
        خارجية: إذا تعطّل القرص تضيع معه. انسخها خارج الخادم دورياً.
      </p>
    </main>
  );
}

function JobState({ job }: { job: BackupJob }) {
  if (job.state === "done") {
    return (
      <span className="rounded px-2 py-1 text-[11px] font-bold text-emerald-800 bg-emerald-100">
        اكتملت{job.file ? ` · ${formatSize(job.file.sizeBytes)}` : ""}
      </span>
    );
  }

  if (job.state === "failed") {
    return (
      <span
        title={job.error ?? undefined}
        className="rounded bg-rose-100 px-2 py-1 text-[11px] font-bold text-rose-800"
      >
        فشلت
      </span>
    );
  }

  return (
    <span className="rounded bg-amber-100 px-2 py-1 text-[11px] font-bold text-amber-800">
      {job.state === "queued" ? "في الانتظار" : "جارٍ التنفيذ"}
    </span>
  );
}

// ── stored files + restore ──────────────────────────────────────────────

type StoredBackupFile = {
  id?: string;
  fileName: string;
  sizeBytes: number;
  createdAt: string;
};

type RestoreReport = {
  valid?: boolean;
  errors?: string[];
  totals?: Record<string, number>;
  tenantId?: string | null;
  strategy?: string;
  durationMs?: number;
};

function triggerBlobDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

const formatBackupSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

const formatBackupDate = (value: string) => {
  try {
    return new Date(value).toLocaleDateString("ar", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
};

function FactoryStoredBackups({ tenantId, factoryName }: { tenantId: string; factoryName: string }) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["super-admin", "factory-backups", tenantId],
    queryFn: async () =>
      (
        await apiClient.get(`/admin/tenants/${tenantId}/backups`)
      ).data as { files?: StoredBackupFile[] },
  });
  const [restoreSource, setRestoreSource] = useState<{ name: string; blob: Blob } | null>(null);

  const files = data?.files ?? [];

  const downloadStored = async (fileName: string) => {
    try {
      toast.loading("جارٍ تنزيل النسخة…", { id: `dl-${fileName}` });
      const res = await apiClient.get(
        `/admin/tenants/${tenantId}/backups/files/${encodeURIComponent(fileName)}`,
        { responseType: "blob" },
      );
      triggerBlobDownload(res.data as Blob, fileName);
      toast.success("تم التنزيل", { id: `dl-${fileName}` });
    } catch {
      toast.error("تعذّر تنزيل النسخة", { id: `dl-${fileName}` });
    }
  };

  const prepareRestore = async (fileName: string) => {
    try {
      toast.loading("جارٍ تجهيز النسخة للاستعادة…", { id: `prep-${fileName}` });
      const res = await apiClient.get(
        `/admin/tenants/${tenantId}/backups/files/${encodeURIComponent(fileName)}`,
        { responseType: "blob" },
      );
      setRestoreSource({ name: fileName, blob: res.data as Blob });
      toast.success("النسخة جاهزة — اختر وضع الاستعادة بالأسفل", { id: `prep-${fileName}` });
    } catch {
      toast.error("تعذّر تجهيز النسخة", { id: `prep-${fileName}` });
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-1.5 text-sm font-black text-[#263544]">
          <FileJson size={15} className="text-[#C89355]" aria-hidden="true" />
          النسخ المحفوظة لـ{factoryName}
        </h3>
        <button
          type="button"
          onClick={() => void refetch()}
          className="text-xs font-bold text-slate-500 transition-colors hover:text-[#263544]"
        >
          تحديث القائمة
        </button>
      </div>

      {isLoading && (
        <p className="flex items-center gap-2 text-xs text-slate-500">
          <Loader2 size={14} className="animate-spin" aria-hidden="true" />
          جارٍ تحميل النسخ المحفوظة…
        </p>
      )}
      {isError && <p className="text-xs font-bold text-rose-600">تعذّر تحميل النسخ المحفوظة.</p>}
      {!isLoading && !isError && files.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-center text-xs text-slate-500">
          لا توجد نسخ محفوظة بعد لهذا المصنع. ابدأ نسخة من الزر أعلاه.
        </p>
      )}

      {files.length > 0 && (
        <ul className="flex flex-col gap-2">
          {files.map((file) => (
            <li
              key={file.fileName}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate font-mono text-xs font-bold text-[#263544]" dir="ltr">
                  {file.fileName}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  {formatBackupSize(file.sizeBytes)} · {formatBackupDate(file.createdAt)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => void downloadStored(file.fileName)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition-colors hover:border-[#C89355]/40 hover:text-[#263544]"
                >
                  <Download size={13} aria-hidden="true" />
                  نسخ (تنزيل)
                </button>
                <button
                  type="button"
                  onClick={() => void prepareRestore(file.fileName)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#263544] px-3 py-1.5 text-xs font-bold text-[#C89355] transition-colors hover:bg-[#1e2a36]"
                >
                  <RotateCcw size={13} aria-hidden="true" />
                  استعادة وتشغيل
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <RestorePanel
        key={restoreSource ? `stored-${restoreSource.name}` : "upload"}
        tenantId={tenantId}
        sourceName={restoreSource?.name ?? null}
        sourceBlob={restoreSource?.blob ?? null}
        onClearSource={() => setRestoreSource(null)}
      />
    </div>
  );
}

function RestorePanel({
  tenantId,
  sourceName,
  sourceBlob,
  onClearSource,
}: {
  tenantId: string;
  sourceName: string | null;
  sourceBlob: Blob | null;
  onClearSource: () => void;
}) {
  const [pickedFile, setPickedFile] = useState<File | null>(null);
  const [strategy, setStrategy] = useState<"merge" | "replace">("merge");
  const [confirm, setConfirm] = useState("");
  const [busyMode, setBusyMode] = useState<string | null>(null);
  const [report, setReport] = useState<RestoreReport | null>(null);
  const [reportMode, setReportMode] = useState<string | null>(null);

  const activeFile: File | Blob | null = pickedFile ?? sourceBlob;
  const activeName = pickedFile?.name ?? sourceName ?? null;

  const runRestore = async (mode: "validate" | "dryRun" | "apply") => {
    if (!activeFile) {
      toast.error("اختر ملف نسخة أولاً (من القائمة أعلاه أو ارفع ملفاً)");
      return;
    }
    const fileToSend =
      activeFile instanceof File
        ? activeFile
        : new File([activeFile], activeName ?? "snapshot.json", { type: "application/json" });
    const form = new FormData();
    form.append("file", fileToSend);
    form.append("mode", mode);
    form.append("strategy", strategy);
    if (strategy === "replace") form.append("confirm", confirm);

    setBusyMode(mode);
    setReport(null);
    try {
      const res = await apiClient.post("/backup/restore", form, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 120_000,
      });
      setReport(res.data as RestoreReport);
      setReportMode(mode);
      if ((res.data as RestoreReport)?.valid === false) {
        toast.error("الفحص رفض النسخة — راجع الأخطاء بالأسفل");
      } else if (mode === "apply") {
        toast.success("تم تطبيق الاستعادة وتشغيل النسخة");
      } else {
        toast.success(mode === "validate" ? "النسخة سليمة" : "التجربة الجافة نجحت");
      }
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "فشلت الاستعادة";
      toast.error(typeof message === "string" ? message : "فشلت الاستعادة");
    } finally {
      setBusyMode(null);
    }
  };

  return (
    <div className="rounded-xl border border-[#263544]/15 bg-white p-4">
      <h4 className="mb-1 flex items-center gap-1.5 text-sm font-black text-[#263544]">
        <UploadCloud size={15} className="text-[#C89355]" aria-hidden="true" />
        استعادة وتشغيل نسخة
      </h4>
      <p className="mb-3 text-xs leading-5 text-slate-500">
        اختر نسخة محفوظة من القائمة أو ارفع ملف <span className="font-mono" dir="ltr">.json</span> من
        جهازك، ثم افحصها أولاً قبل التطبيق.
      </p>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 transition-colors hover:border-[#C89355]/50 hover:text-[#263544]">
          <UploadCloud size={13} aria-hidden="true" />
          {pickedFile ? pickedFile.name : "رفع نسخة من الجهاز"}
          <input
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setPickedFile(f);
              setReport(null);
              if (f) onClearSource();
              e.target.value = "";
            }}
          />
        </label>
        {activeName && (
          <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 font-mono text-[11px] font-bold text-emerald-800 ring-1 ring-emerald-200">
            <FileJson size={12} aria-hidden="true" />
            <span className="truncate" dir="ltr">
              {activeName}
            </span>
          </span>
        )}
      </div>

      <div className="mb-3 grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`strategy-${tenantId}`} className="text-xs font-bold text-slate-600">
            الاستراتيجية
          </label>
          <select
            id={`strategy-${tenantId}`}
            value={strategy}
            onChange={(e) => {
              setStrategy(e.target.value as "merge" | "replace");
              setReport(null);
            }}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#263544]"
          >
            <option value="merge">دمج — يضيف الناقص ويحدّث الموجود ولا يحذف</option>
            <option value="replace">استبدال — يحذف ثم يدرج (خطير، سوبر آدمن فقط)</option>
          </select>
        </div>
        {strategy === "replace" && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`confirm-${tenantId}`} className="text-xs font-bold text-rose-700">
              تأكيد الاستبدال: اكتب REPLACE ثم مسافة ثم معرّف المصنع
            </label>
            <input
              id={`confirm-${tenantId}`}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder={`REPLACE ${tenantId}`}
              dir="ltr"
              className="rounded-lg border border-rose-200 bg-rose-50/50 px-3 py-2 font-mono text-sm outline-none focus:border-rose-400"
            />
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={!activeFile || busyMode !== null}
          onClick={() => void runRestore("validate")}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
        >
          {busyMode === "validate" ? (
            <Loader2 size={13} className="animate-spin" aria-hidden="true" />
          ) : (
            <FlaskConical size={13} aria-hidden="true" />
          )}
          1) فحص فقط
        </button>
        <button
          type="button"
          disabled={!activeFile || busyMode !== null}
          onClick={() => void runRestore("dryRun")}
          className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-bold text-amber-800 transition-colors hover:bg-amber-100 disabled:opacity-50"
        >
          {busyMode === "dryRun" ? (
            <Loader2 size={13} className="animate-spin" aria-hidden="true" />
          ) : (
            <Play size={13} aria-hidden="true" />
          )}
          2) تجربة جافة
        </button>
        <button
          type="button"
          disabled={!activeFile || busyMode !== null}
          onClick={() => void runRestore("apply")}
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
        >
          {busyMode === "apply" ? (
            <Loader2 size={13} className="animate-spin" aria-hidden="true" />
          ) : (
            <CheckCircle2 size={13} aria-hidden="true" />
          )}
          3) تطبيق وتشغيل
        </button>
      </div>

      {report && (
        <div
          className={`mt-3 rounded-xl border p-3 text-xs leading-6 ${
            report.valid === false
              ? "border-rose-200 bg-rose-50 text-rose-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-900"
          }`}
        >
          <p className="flex items-center gap-1.5 font-black">
            {report.valid === false ? (
              <XCircle size={14} aria-hidden="true" />
            ) : (
              <CheckCircle2 size={14} aria-hidden="true" />
            )}
            نتيجة {reportMode === "validate" ? "الفحص" : reportMode === "dryRun" ? "التجربة" : "التطبيق"}:
            {report.valid === false ? " مرفوضة" : " سليمة"}
            {typeof report.durationMs === "number" && (
              <span className="font-normal opacity-70">({report.durationMs}ms)</span>
            )}
          </p>
          {report.errors && report.errors.length > 0 && (
            <ul className="mt-1.5 list-disc space-y-0.5 pr-5 font-bold">
              {report.errors.slice(0, 10).map((err, i) => (
                <li key={i} dir="auto">
                  {err}
                </li>
              ))}
            </ul>
          )}
          {report.totals && Object.keys(report.totals).length > 0 && (
            <p className="mt-1.5 font-bold">
              الإجماليات:{" "}
              {Object.entries(report.totals)
                .map(([k, v]) => `${k}: ${v}`)
                .join(" · ")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
