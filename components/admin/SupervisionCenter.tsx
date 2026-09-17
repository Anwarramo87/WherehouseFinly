"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import {
  Building2,
  Users,
  HandCoins,
  UserMinus,
  LayoutDashboard,
  Loader2,
  ShieldAlert,
  KeyRound,
  AlertTriangle,
  Database,
  Activity,
  RefreshCw,
  Search,
  X,
  ChevronLeft,
  CircleCheck,
  Cpu,
  HardDrive,
  MemoryStick,
  Wifi,
  LogIn,
  FileJson,
  Layers,
  ArrowLeft,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import apiClient from "@/lib/api-client";
import { useFactories, type FactorySummary } from "@/hooks/useSuperAdmin";
import { useAuthStore } from "@/stores/auth-store";
import { useFactoryScopeStore } from "@/stores/factory-scope-store";

/* ── types from real APIs ─────────────────────────────────────────── */

type BackupJobState = "queued" | "running" | "done" | "failed";
type BackupJob = {
  id: string;
  tenantId: string;
  tenantName: string;
  state: BackupJobState;
  error: string | null;
  file: { fileName: string; sizeBytes: number } | null;
};

type AuditRow = {
  id: string;
  action: string;
  actorUsername?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  createdAt: string;
};

type HealthReport = {
  status: "ok" | "degraded";
  timestamp: string;
  services: {
    database: { status: "up" | "down"; latencyMs?: number };
    redis: { status: "up" | "down" | "disabled"; latencyMs?: number };
    memory: { status: "ok" | "warn"; heapUsedMb: number; heapTotalMb: number; rssMemMb: number };
    disk: { status: "ok" | "warn"; freePercent: number };
  };
};

type HealthWithRtt = HealthReport & { _rttMs: number };

/* ── small utilities ──────────────────────────────────────────────── */

function timeAgoAr(value: string): string {
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return "—";
  const mins = Math.max(0, Math.floor((Date.now() - then) / 60000));
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${mins} د`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `منذ ${hours} س`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `منذ ${days} يوم`;
  return new Date(value).toLocaleDateString("ar");
}

/** Animated counter — counts up on mount/value change, respects reduced motion. */
function useAnimatedNumber(target: number, durationMs = 900): number {
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
  // Lazy initial state keeps SSR/first paint honest without a sync setState.
  const [display, setDisplay] = useState(() => (prefersReducedMotion ? target : 0));
  const fromRef = useRef(prefersReducedMotion ? target : 0);
  useEffect(() => {
    if (prefersReducedMotion) return;
    const from = fromRef.current;
    if (from === target) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (target - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs, prefersReducedMotion]);
  return display;
}

function actionIcon(action: string) {
  const a = action.toLowerCase();
  if (a.startsWith("auth.")) return LogIn;
  if (a.startsWith("backup.")) return Database;
  if (a.startsWith("entitlements.")) return KeyRound;
  if (a.startsWith("user.")) return Users;
  if (a.startsWith("employee")) return Users;
  if (a.includes("restore") || a.includes("snapshot")) return FileJson;
  return Activity;
}

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
function ChartTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div dir="rtl" className="rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-lg backdrop-blur">
      {label != null && label !== "" && <p className="mb-1 font-black text-[#263544]">{label}</p>}
      {payload.map((entry: { name?: string; value?: number | string; color?: string }, i: number) => (
        <p key={i} className="flex items-center gap-1.5 font-bold text-slate-600">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: entry.color ?? "#263544" }}
            aria-hidden="true"
          />
          {entry.name}: <span className="text-[#263544]">{entry.value}</span>
        </p>
      ))}
    </div>
  );
}

/* ── main component ───────────────────────────────────────────────── */

type StatusFilter = "all" | "active" | "attention";

export default function SupervisionCenter() {
  const roles = useAuthStore((state) => state.user?.roles);
  const role = useAuthStore((state) => state.user?.role);
  const isSuperAdmin = roles?.includes("superadmin") || role === "superadmin";

  const enter = useFactoryScopeStore((state) => state.enter);
  const queryClient = useQueryClient();
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [moduleFocus, setModuleFocus] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const { data: factories = [], isLoading, isError } = useFactories();

  const { data: jobs = [] } = useQuery<BackupJob[]>({
    queryKey: ["super-admin", "backup-jobs"],
    enabled: isSuperAdmin,
    queryFn: async () => (await apiClient.get("/admin/tenants/backups")).data as BackupJob[],
    staleTime: 30_000,
    retry: 1,
  });

  const { data: auditResp } = useQuery<{ auditLogs?: AuditRow[] }>({
    queryKey: ["super-admin", "audit-feed"],
    enabled: isSuperAdmin,
    queryFn: async () =>
      (await apiClient.get("/audit-log", { params: { page: 1, limit: 10 } })).data as {
        auditLogs?: AuditRow[];
      },
    staleTime: 30_000,
    retry: 1,
  });
  const activity = useMemo(() => auditResp?.auditLogs ?? [], [auditResp]);

  const { data: health } = useQuery<HealthWithRtt>({
    queryKey: ["super-admin", "health"],
    enabled: isSuperAdmin,
    queryFn: async () => {
      const t0 = performance.now();
      const res = await apiClient.get("/health");
      return { ...(res.data as HealthReport), _rttMs: Math.round(performance.now() - t0) };
    },
    staleTime: 30_000,
    retry: 1,
    refetchInterval: 60_000,
  });

  /** Open a factory and land directly on the requested page. */
  const drillInto = (factory: FactorySummary, target: string) => {
    enter(factory.id, factory.name);
    queryClient.clear();
    router.push(target);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["super-admin", "factories"] }),
        queryClient.invalidateQueries({ queryKey: ["super-admin", "backup-jobs"] }),
        queryClient.invalidateQueries({ queryKey: ["super-admin", "audit-feed"] }),
        queryClient.invalidateQueries({ queryKey: ["super-admin", "health"] }),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  // ── derived platform intelligence (all from real payloads) ──
  const totalEmployees = factories.reduce((s, f) => s + (f.employees ?? 0), 0);
  const totalUsers = factories.reduce((s, f) => s + (f.users ?? 0), 0);
  const activeFactories = factories.filter((f) => f.status === "active");
  const totalEnabledPages = factories.reduce((s, f) => s + (f.enabledPageCount ?? 0), 0);
  const totalPages = factories.reduce((s, f) => s + (f.totalPageCount ?? 0), 0);
  const coverage = totalPages > 0 ? Math.round((totalEnabledPages / totalPages) * 100) : 0;

  const attention = factories
    .map((factory) => ({ factory, reasons: attentionReasons(factory) }))
    .filter((e) => e.reasons.length > 0);

  const failedJobs = jobs.filter((j) => j.state === "failed");
  const runningJobs = jobs.filter((j) => j.state === "queued" || j.state === "running");
  const backedUpTenantIds = new Set(
    jobs.filter((j) => j.state === "done" && j.file).map((j) => j.tenantId),
  );

  // Per-module adoption across factories — straight from each factory's modules[].
  const moduleAdoption = useMemo(() => {
    const map = new Map<string, { key: string; label: string; all: number; partial: number; none: number }>();
    for (const f of factories) {
      for (const m of f.modules ?? []) {
        let entry = map.get(m.key);
        if (!entry) {
          entry = { key: m.key, label: m.label, all: 0, partial: 0, none: 0 };
          map.set(m.key, entry);
        }
        if (m.state === "all") entry.all += 1;
        else if (m.state === "partial") entry.partial += 1;
        else entry.none += 1;
      }
    }
    return [...map.values()].sort((a, b) => b.all + b.partial * 0.5 - (a.all + a.partial * 0.5));
  }, [factories]);

  const focusedModule = moduleFocus ? moduleAdoption.find((m) => m.key === moduleFocus) ?? null : null;

  const visibleFactories = factories.filter((f) => {
    if (statusFilter === "active" && f.status !== "active") return false;
    if (statusFilter === "attention" && !attention.some((a) => a.factory.id === f.id)) return false;
    if (moduleFocus) {
      const mod = (f.modules ?? []).find((m) => m.key === moduleFocus);
      if (!mod || mod.state === "all") return false;
    }
    const q = search.trim().toLowerCase();
    if (q && !`${f.name} ${f.code}`.toLowerCase().includes(q)) return false;
    return true;
  });

  const topFactories = [...factories].sort((a, b) => (b.employees ?? 0) - (a.employees ?? 0)).slice(0, 5);
  const maxTopEmployees = Math.max(1, ...topFactories.map((f) => f.employees ?? 0));

  const alerts: Array<{ id: string; tone: "red" | "amber"; text: string; onClick: () => void }> = [
    ...failedJobs.map((j) => ({
      id: `backup-${j.id}`,
      tone: "red" as const,
      text: `فشل النسخ الاحتياطي لمصنع ${j.tenantName}${j.error ? ` — ${j.error}` : ""}`,
      onClick: () => router.push("/admin/backups"),
    })),
    ...attention.map(({ factory, reasons }) => ({
      id: `factory-${factory.id}`,
      tone: "amber" as const,
      text: `${factory.name}: ${reasons.join("، ")}`,
      onClick: () => drillInto(factory, "/home"),
    })),
  ];
  if (health && health.status !== "ok") {
    alerts.unshift({
      id: "health-degraded",
      tone: "red",
      text: "حالة النظام متدهورة — راجع قسم صحة النظام بالأسفل",
      onClick: () => {},
    });
  }

  const kpiFilterActive = statusFilter !== "all" || moduleFocus !== null || search.trim() !== "";

  // Guard sits after every hook so hook order is identical on all renders;
  // the data queries above are already disabled for non-superadmins.
  if (!isSuperAdmin) {
    return (
      <main className="p-8" dir="rtl">
        <div className="max-w-md rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-800">
          <ShieldAlert className="mb-3" size={24} aria-hidden="true" />
          <h1 className="mb-1 text-lg font-bold">هذه الصفحة للمشرف العام فقط</h1>
          <p className="text-sm">لا تملك صلاحية الإشراف على المصانع.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="p-6 md:p-8" dir="rtl">
      {/* ── command header ─────────────────────────────── */}
      <header className="relative mb-8 overflow-hidden rounded-2xl border border-[#263544]/10 bg-gradient-to-l from-[#263544] via-[#263544] to-[#33465a] p-6 text-white shadow-lg md:p-7">
        <div
          className="pointer-events-none absolute -left-20 -top-24 h-64 w-64 rounded-full bg-[#C89355]/20 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute bottom-0 left-1/3 h-32 w-96 rounded-full bg-white/5 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-[#C89355]">
              <Activity size={12} aria-hidden="true" />
              غرفة التحكم · Super Admin
            </p>
            <h1 className="text-2xl font-black md:text-3xl">مركز القيادة</h1>
            <p className="mt-1.5 max-w-xl text-sm leading-6 text-slate-300">
              نبض المنصة كاملة في شاشة واحدة — المصانع، الوحدات، النسخ، الصحة والنشاط الأخير،
              كلها من بيانات حية.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold text-slate-200 backdrop-blur">
              {new Date().toLocaleDateString("ar", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
            <button
              type="button"
              onClick={() => void handleRefresh()}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#C89355] px-3.5 py-2 text-xs font-black text-[#263544] shadow transition-all hover:bg-[#d8a861] disabled:opacity-60"
            >
              <RefreshCw size={14} aria-hidden="true" className={refreshing ? "animate-spin" : ""} />
              {refreshing ? "جارٍ التحديث…" : "تحديث البيانات"}
            </button>
          </div>
        </div>
      </header>

      {isLoading && <CommandSkeleton />}

      {isError && (
        <div role="alert" className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">
          تعذّر تحميل بيانات المنصة. حدّث الصفحة أو تحقق من الخادم.
        </div>
      )}

      {!isLoading && !isError && factories.length === 0 && (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
          لا توجد مصانع بعد.
        </p>
      )}

      {!isLoading && !isError && factories.length > 0 && (
        <div className="flex flex-col gap-6">
          {/* ── 1. executive KPIs ─────────────────────── */}
          <section aria-label="مؤشرات تنفيذية" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <KpiCard
              label="المصانع"
              value={factories.length}
              hint={`${activeFactories.length} نشط`}
              icon={<Building2 size={18} aria-hidden="true" />}
              tone="dark"
              onClick={() => {
                setStatusFilter("all");
                setModuleFocus(null);
              }}
              active={!kpiFilterActive}
            />
            <KpiCard
              label="الموظفون"
              value={totalEmployees}
              hint="كل المصانع"
              icon={<Users size={18} aria-hidden="true" />}
              tone="gold"
            />
            <KpiCard
              label="حسابات الدخول"
              value={totalUsers}
              hint="آدمن وموظفون"
              icon={<KeyRound size={18} aria-hidden="true" />}
              tone="slate"
            />
            <KpiCard
              label="تغطية الصفحات"
              value={coverage}
              suffix="%"
              hint={`${totalEnabledPages} / ${totalPages} صفحة`}
              icon={<Layers size={18} aria-hidden="true" />}
              tone="blue"
              onClick={() => {
                setStatusFilter("all");
                document.getElementById("module-adoption")?.scrollIntoView({ behavior: "smooth" });
              }}
            />
            <KpiCard
              label="تنبيهات"
              value={alerts.length}
              hint={alerts.length === 0 ? "كل شيء سليم" : "تتطلب تدخلاً"}
              icon={
                alerts.length === 0 ? (
                  <CircleCheck size={18} aria-hidden="true" />
                ) : (
                  <AlertTriangle size={18} aria-hidden="true" />
                )
              }
              tone={alerts.length === 0 ? "green" : "red"}
              onClick={() => {
                setStatusFilter("attention");
                document.getElementById("alerts-center")?.scrollIntoView({ behavior: "smooth" });
              }}
              active={statusFilter === "attention"}
            />
          </section>

          {/* ── 2. analytics: adoption + coverage ─────── */}
          <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
            <section
              id="module-adoption"
              aria-label="اعتماد الوحدات"
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <SectionHead
                title="اعتماد الوحدات عبر المصانع"
                hint="مفعّلة بالكامل · جزئياً · موقوفة — اضغط أي وحدة لتصفية المصانع"
              />
              {moduleAdoption.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500">لا توجد بيانات وحدات.</p>
              ) : (
                <div dir="ltr" className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={moduleAdoption} layout="vertical" margin={{ left: 8, right: 16 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                      <XAxis type="number" hide />
                      <YAxis
                        type="category"
                        dataKey="label"
                        width={118}
                        tick={{ fontSize: 11, fill: "#475569", fontWeight: 700 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<ChartTip />} cursor={{ fill: "#f1f5f9" }} />
                      <Bar
                        dataKey="all"
                        name="مفعّلة"
                        stackId="a"
                        fill="#10b981"
                        radius={[0, 6, 6, 0]}
                        onClick={(d) => setModuleFocus(String((d as { key?: string })?.key ?? ""))}
                        cursor="pointer"
                      />
                      <Bar
                        dataKey="partial"
                        name="جزئياً"
                        stackId="a"
                        fill="#f59e0b"
                        onClick={(d) => setModuleFocus(String((d as { key?: string })?.key ?? ""))}
                        cursor="pointer"
                      />
                      <Bar
                        dataKey="none"
                        name="موقوفة"
                        stackId="a"
                        fill="#cbd5e1"
                        radius={[6, 0, 0, 6]}
                        onClick={(d) => setModuleFocus(String((d as { key?: string })?.key ?? ""))}
                        cursor="pointer"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              {focusedModule && (
                <button
                  type="button"
                  onClick={() => setModuleFocus(null)}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#263544] px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-[#1e2a36]"
                >
                  <X size={12} aria-hidden="true" />
                  التصفية: {focusedModule.label} (غير مفعّلة بالكامل) — إلغاء
                </button>
              )}
            </section>

            <section
              aria-label="تغطية الصفحات"
              className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <SectionHead title="تغطية الصفحات" hint="المفعّل من إجمالي الكتالوج" />
              <div className="relative mx-auto h-44 w-44" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: "مفعّلة", value: totalEnabledPages },
                        { name: "موقوفة", value: Math.max(0, totalPages - totalEnabledPages) },
                      ]}
                      dataKey="value"
                      innerRadius={58}
                      outerRadius={78}
                      paddingAngle={3}
                      strokeWidth={0}
                      startAngle={90}
                      endAngle={-270}
                    >
                      <Cell fill="#C89355" />
                      <Cell fill="#e2e8f0" />
                    </Pie>
                    <Tooltip content={<ChartTip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-black tabular-nums text-[#263544]">{coverage}%</span>
                  <span className="text-[11px] font-bold text-slate-500">مفعّل</span>
                </div>
              </div>
              <div className="mx-auto mt-3 flex items-center gap-4 text-xs font-bold text-slate-600">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#C89355]" aria-hidden="true" />
                  {totalEnabledPages} مفعّلة
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-300" aria-hidden="true" />
                  {Math.max(0, totalPages - totalEnabledPages)} موقوفة
                </span>
              </div>
              <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs leading-6 text-slate-600">
                <p className="flex items-center justify-between font-bold">
                  <span>نسخ احتياطية سليمة</span>
                  <span className="tabular-nums text-[#263544]">
                    {backedUpTenantIds.size} / {factories.length} مصنع
                  </span>
                </p>
                <p className="flex items-center justify-between font-bold">
                  <span>مهام نسخ جارية</span>
                  <span className="tabular-nums text-[#263544]">{runningJobs.length}</span>
                </p>
              </div>
            </section>
          </div>

          {/* ── 3. tenants + activity ─────────────────── */}
          <div className="grid gap-6 xl:grid-cols-2">
            <section
              aria-label="أنشط المصانع"
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <SectionHead title="أنشط المصانع" hint="حسب عدد الموظفين — اضغط للدخول" />
              <ul className="flex flex-col gap-3">
                {topFactories.map((f, i) => (
                  <li key={f.id}>
                    <button
                      type="button"
                      onClick={() => drillInto(f, "/home")}
                      className="group block w-full rounded-xl border border-slate-100 bg-slate-50/60 p-3 text-right transition-all hover:border-[#C89355]/40 hover:bg-white hover:shadow-sm"
                    >
                      <span className="mb-1.5 flex items-center justify-between gap-2">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#263544] text-[11px] font-black text-[#C89355]">
                            {i + 1}
                          </span>
                          <span className="truncate text-sm font-bold text-[#263544]">{f.name}</span>
                        </span>
                        <span className="flex shrink-0 items-center gap-1 text-xs font-black tabular-nums text-[#263544]">
                          {f.employees}
                          <ArrowLeft size={12} aria-hidden="true" className="text-slate-300 transition-transform group-hover:-translate-x-0.5 group-hover:text-[#C89355]" />
                        </span>
                      </span>
                      <span className="block h-1.5 overflow-hidden rounded-full bg-slate-200/70">
                        <span
                          className="block h-full rounded-full bg-gradient-to-l from-[#C89355] to-[#e3b96f] transition-all"
                          style={{ width: `${Math.round(((f.employees ?? 0) / maxTopEmployees) * 100)}%` }}
                        />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            <section
              aria-label="النشاط الأخير"
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <SectionHead title="النشاط الأخير" hint="سجل التدقيق الحي — آخر 10 أحداث" />
              {activity.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">لا نشاط مسجل بعد.</p>
              ) : (
                <ul className="relative flex flex-col gap-0">
                  {activity.map((row, i) => {
                    const Icon = actionIcon(row.action ?? "");
                    const last = i === activity.length - 1;
                    return (
                      <li key={row.id} className="relative flex gap-3 pb-4 last:pb-0">
                        {!last && (
                          <span className="absolute right-[13px] top-8 h-[calc(100%-2rem)] w-px bg-slate-200" aria-hidden="true" />
                        )}
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#263544]/5 text-[#263544] ring-1 ring-slate-200">
                          <Icon size={13} aria-hidden="true" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-bold text-[#263544]">
                            {row.actorUsername ?? "—"}
                            <span className="font-normal text-slate-400"> · </span>
                            <span className="font-mono text-[11px] font-bold text-slate-500" dir="ltr">
                              {row.action}
                            </span>
                          </p>
                          <p className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-500">
                            {row.targetType && (
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 font-bold">
                                {row.targetType}
                              </span>
                            )}
                            <span>{timeAgoAr(row.createdAt)}</span>
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>

          {/* ── 4. health + alerts ────────────────────── */}
          <div className="grid gap-6 xl:grid-cols-2">
            <section
              aria-label="صحة النظام"
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <SectionHead title="صحة النظام" hint="فحص حي من الخادم — يتحدث كل دقيقة" />
              {!health ? (
                <p className="flex items-center gap-2 py-6 text-sm text-slate-500">
                  <Loader2 size={15} className="animate-spin" aria-hidden="true" />
                  جارٍ فحص صحة النظام…
                </p>
              ) : (
                <div className="flex flex-col gap-2.5">
                  <HealthRow
                    icon={<Wifi size={15} aria-hidden="true" />}
                    label="الـ API"
                    detail={`${health._rttMs}ms زمن الاستجابة`}
                    ok
                  />
                  <HealthRow
                    icon={<Database size={15} aria-hidden="true" />}
                    label="قاعدة البيانات"
                    detail={health.services.database.latencyMs != null ? `${health.services.database.latencyMs}ms` : "—"}
                    ok={health.services.database.status === "up"}
                  />
                  <HealthRow
                    icon={<Activity size={15} aria-hidden="true" />}
                    label="Redis / الطوابير"
                    detail={
                      health.services.redis.status === "disabled"
                        ? "معطّل"
                        : (health.services.redis.latencyMs != null ? `${health.services.redis.latencyMs}ms` : "—")
                    }
                    ok={health.services.redis.status !== "down"}
                  />
                  <HealthRow
                    icon={<MemoryStick size={15} aria-hidden="true" />}
                    label="الذاكرة"
                    detail={`${health.services.memory.heapUsedMb} / ${health.services.memory.heapTotalMb} MB`}
                    ok={health.services.memory.status === "ok"}
                  />
                  <HealthRow
                    icon={<HardDrive size={15} aria-hidden="true" />}
                    label="القرص"
                    detail={`${health.services.disk.freePercent}% متاح`}
                    ok={health.services.disk.status === "ok"}
                  />
                  <HealthRow
                    icon={<Cpu size={15} aria-hidden="true" />}
                    label="الحالة العامة"
                    detail={health.status === "ok" ? "سليم" : "متدهور"}
                    ok={health.status === "ok"}
                  />
                </div>
              )}
            </section>

            <section
              id="alerts-center"
              aria-label="مركز التنبيهات"
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <SectionHead title={`مركز التنبيهات (${alerts.length})`} hint="اضغط أي تنبيه للانتقال لمعالجته" />
              {alerts.length === 0 ? (
                <p className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-6 text-sm font-bold text-emerald-700 ring-1 ring-emerald-200">
                  <CircleCheck size={16} aria-hidden="true" />
                  كل شيء سليم — لا تنبيهات حالياً.
                </p>
              ) : (
                <ul className="flex max-h-72 flex-col gap-2 overflow-y-auto">
                  {alerts.map((alert) => (
                    <li key={alert.id}>
                      <button
                        type="button"
                        onClick={alert.onClick}
                        className={`flex w-full items-start gap-2.5 rounded-xl border px-3.5 py-3 text-right text-[13px] font-bold leading-6 transition-all hover:shadow-sm ${
                          alert.tone === "red"
                            ? "border-rose-200 bg-rose-50/70 text-rose-900 hover:bg-rose-50"
                            : "border-amber-200 bg-amber-50/70 text-amber-900 hover:bg-amber-50"
                        }`}
                      >
                        <AlertTriangle size={15} aria-hidden="true" className="mt-1 shrink-0" />
                        <span className="min-w-0 flex-1">{alert.text}</span>
                        <ChevronLeft size={14} aria-hidden="true" className="mt-1 shrink-0 opacity-50" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {/* ── 5. factory browser ────────────────────── */}
          <section
            aria-label="المصانع"
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <h2 className="flex items-center gap-2 text-base font-black text-[#263544]">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#263544]/5 text-[#C89355]">
                  <Building2 size={15} aria-hidden="true" />
                </span>
                المصانع
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                  {visibleFactories.length} / {factories.length}
                </span>
              </h2>
              <span className="h-px flex-1 bg-slate-100" aria-hidden="true" />
              <div className="relative">
                <Search
                  size={14}
                  aria-hidden="true"
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="بحث بالاسم أو الرمز…"
                  aria-label="بحث عن مصنع"
                  className="w-52 rounded-xl border border-slate-200 bg-slate-50 py-2 pl-3 pr-9 text-sm outline-none transition-all placeholder:text-slate-400 focus:border-[#263544] focus:bg-white focus:ring-2 focus:ring-[#263544]/10"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    aria-label="مسح البحث"
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X size={13} aria-hidden="true" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 text-xs font-bold" role="group" aria-label="تصفية المصانع">
                {(
                  [
                    ["all", "الكل"],
                    ["active", "النشط"],
                    ["attention", "يحتاج انتباه"],
                  ] as Array<[StatusFilter, string]>
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setStatusFilter(key)}
                    aria-pressed={statusFilter === key}
                    className={`rounded-lg px-3 py-1.5 transition-all ${
                      statusFilter === key
                        ? "bg-white text-[#263544] shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {visibleFactories.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                لا مصانع مطابقة للبحث أو التصفية الحالية.
              </p>
            ) : (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {visibleFactories.map((factory) => (
                  <FactoryDrillCard
                    key={factory.id}
                    factory={factory}
                    onEnter={(target) => drillInto(factory, target)}
                  />
                ))}
              </div>
            )}
          </section>

          {/* ── 6. cross-factory tools ────────────────── */}
          <section
            aria-label="إدارة عامة"
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <SectionHead title="إدارة عامة" hint="صلاحيات، سجلات، نسخ — لكل المصانع" />
            <div className="grid gap-4 sm:grid-cols-3">
              <QuickLink
                title="حسابات وصلاحيات المصانع"
                description="آدمن كل مصنع ووحداتهم وصفحاتهم لكل حساب على حدة"
                icon={<KeyRound size={18} aria-hidden="true" />}
                onClick={() => router.push("/admin/factories")}
              />
              <QuickLink
                title="كل الموظفين"
                description="سجل موحد عبر كل المصانع للمراقبة"
                icon={<Users size={18} aria-hidden="true" />}
                onClick={() => router.push("/admin/employees")}
              />
              <QuickLink
                title="النسخ الاحتياطي"
                description="نسخ كل مصنع واستعادتها وتشغيلها"
                icon={<Database size={18} aria-hidden="true" />}
                onClick={() => router.push("/admin/backups")}
              />
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

/* ── building blocks ─────────────────────────────────────────────── */

function attentionReasons(factory: FactorySummary): string[] {
  const reasons: string[] = [];
  if (factory.status !== "active") reasons.push("المصنع غير نشط");
  if ((factory.users ?? 0) === 0) reasons.push("بلا حسابات دخول");
  if ((factory.enabledPageCount ?? 0) === 0) reasons.push("بلا صفحات مفعّلة");
  const sub = factory.subscription;
  if (sub?.status === "expired") reasons.push("الاشتراك منتهٍ — المصنع مغلق");
  else if (sub && sub.status === "active" && sub.daysLeft <= 7) {
    reasons.push(`ينتهي الاشتراك خلال ${sub.daysLeft} يوم`);
  }
  return reasons;
}

function SectionHead({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-base font-black text-[#263544]">{title}</h2>
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

function KpiCard({
  label,
  value,
  suffix,
  hint,
  icon,
  tone,
  onClick,
  active,
}: {
  label: string;
  value: number;
  suffix?: string;
  hint: string;
  icon: React.ReactNode;
  tone: "dark" | "gold" | "slate" | "blue" | "green" | "red";
  onClick?: () => void;
  active?: boolean;
}) {
  const animated = useAnimatedNumber(value);
  const tones: Record<string, string> = {
    dark: "bg-[#263544] text-[#C89355]",
    gold: "bg-[#C89355]/15 text-[#8a6a2f]",
    slate: "bg-slate-100 text-slate-600",
    blue: "bg-sky-50 text-sky-600",
    green: "bg-emerald-50 text-emerald-600",
    red: "bg-rose-50 text-rose-600",
  };
  const clickable = typeof onClick === "function";
  const cls = `group flex items-center gap-3 rounded-2xl border bg-white p-4 text-right shadow-sm transition-all ${
    clickable ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-md hover:border-[#C89355]/40" : ""
  } ${active ? "border-[#C89355] ring-1 ring-[#C89355]/40" : "border-slate-200"}`;
  const inner = (
    <>
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`} aria-hidden="true">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-2xl font-black leading-7 tabular-nums text-[#263544]">
          {animated.toLocaleString("ar")}
          {suffix && <span className="text-base">{suffix}</span>}
        </div>
        <div className="truncate text-xs font-bold text-slate-500">
          {label} · <span className="font-normal">{hint}</span>
        </div>
      </div>
    </>
  );
  return clickable ? (
    <button type="button" onClick={onClick} className={cls} aria-label={label}>
      {inner}
    </button>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

function HealthRow({
  icon,
  label,
  detail,
  ok,
}: {
  icon: React.ReactNode;
  label: string;
  detail: string;
  ok: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-3.5 py-2.5">
      <span className="flex items-center gap-2 text-[13px] font-bold text-[#263544]">
        <span className={ok ? "text-emerald-600" : "text-rose-500"} aria-hidden="true">
          {icon}
        </span>
        {label}
      </span>
      <span className="flex items-center gap-2">
        <span className="font-mono text-xs font-bold text-slate-500" dir="ltr">
          {detail}
        </span>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
            ok ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-emerald-500" : "bg-rose-500"}`} aria-hidden="true" />
          {ok ? "سليم" : "خلل"}
        </span>
      </span>
    </div>
  );
}

function QuickLink({
  title,
  description,
  icon,
  onClick,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-right shadow-sm transition-all hover:border-[#C89355]/50 hover:shadow"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#263544] text-[#C89355] transition-colors group-hover:bg-[#1e2a36]">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-black text-[#263544]">{title}</span>
        <span className="mt-0.5 block text-xs leading-5 text-slate-500">{description}</span>
      </span>
    </button>
  );
}

function FactoryDrillCard({
  factory,
  onEnter,
}: {
  factory: FactorySummary;
  onEnter: (target: string) => void;
}) {
  return (
    <article className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#263544] text-[#C89355]">
            <Building2 size={22} aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-base font-black text-[#263544]">{factory.name}</h2>
            <p className="font-mono text-xs text-slate-400">{factory.code}</p>
          </div>
        </div>
        <span
          className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
            factory.status === "active"
              ? "bg-emerald-100 text-emerald-800"
              : "bg-amber-100 text-amber-800"
          }`}
        >
          {factory.status}
        </span>
      </div>

      <div className="mb-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <Users size={13} aria-hidden="true" />
          {factory.employees} موظف · {factory.users} حساب
        </span>
        <span>
          {factory.enabledPageCount} / {factory.totalPageCount} صفحة
        </span>
      </div>

      <div className="mt-auto grid grid-cols-2 gap-2">
        <DrillButton
          label="لوحة المصنع"
          icon={<LayoutDashboard size={15} aria-hidden="true" />}
          onClick={() => onEnter("/home")}
          primary
        />
        <DrillButton
          label="الموظفون"
          icon={<Users size={15} aria-hidden="true" />}
          onClick={() => onEnter("/employees")}
        />
        <DrillButton
          label="المكافآت"
          icon={<HandCoins size={15} aria-hidden="true" />}
          onClick={() => onEnter("/salaries/rewards")}
        />
        <DrillButton
          label="المستقيلون"
          icon={<UserMinus size={15} aria-hidden="true" />}
          onClick={() => onEnter("/resigned")}
        />
      </div>
    </article>
  );
}

function DrillButton({
  label,
  icon,
  onClick,
  primary = false,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-colors disabled:opacity-50 ${
        primary
          ? "bg-[#263544] text-[#C89355] hover:bg-[#1a2530]"
          : "border border-slate-200 text-[#263544] hover:border-[#C89355] hover:bg-[#C89355]/10"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function CommandSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-hidden="true">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-[92px] animate-pulse rounded-2xl bg-slate-200/70" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="h-80 animate-pulse rounded-2xl bg-slate-200/70" />
        <div className="h-80 animate-pulse rounded-2xl bg-slate-200/70" />
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="h-64 animate-pulse rounded-2xl bg-slate-200/70" />
        <div className="h-64 animate-pulse rounded-2xl bg-slate-200/70" />
      </div>
    </div>
  );
}
