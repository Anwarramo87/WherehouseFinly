"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { Building2, Database, Loader2, ShieldAlert } from "lucide-react";
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
      <header className="mb-6">
        <h1 className="text-2xl font-black text-[#263544]">النسخ الاحتياطي</h1>
        <p className="mt-1 text-sm text-slate-500">
          نسخة احتياطية مستقلة لكل مصنع. تعمل في الخلفية ولا تُعطّل النظام.
        </p>
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

          return (
            <li
              key={factory.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4"
            >
              <div>
                <p className="flex items-center gap-2 font-bold text-[#263544]">
                  <Building2 size={16} aria-hidden="true" className="text-[#C89355]" />
                  {factory.name}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {factory.employees} موظف · {factory.code}
                </p>
              </div>

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
