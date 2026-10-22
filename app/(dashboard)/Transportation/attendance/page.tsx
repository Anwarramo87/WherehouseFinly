"use client";

import { useState } from "react";
import { Bus, CalendarDays, CheckCircle2, XCircle, Save, Settings2 } from "lucide-react";
import { toast } from "react-hot-toast";
import WmsPageShell from "@/components/wms/WmsPageShell";
import {
  Panel,
  Stat,
  Pill,
  Button,
  Field,
  Loading,
  Empty,
  fmtInt,
  fmtMoney,
  inputClass,
} from "@/components/wms/primitives";
import {
  useTransportationSummary,
  useTransportationSettings,
  useBusAttendance,
  useRecordBusAttendance,
} from "@/hooks/useTransportation";
import apiClient from "@/lib/api-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { getApiErrorMessage as normalizeError } from "@/lib/http/error";

const TODAY = () => new Date().toISOString().slice(0, 10);

export default function BusAttendancePage() {
  const [busId, setBusId] = useState<string>("");
  const [date, setDate] = useState<string>(TODAY());
  const [attended, setAttended] = useState(true);
  const [notes, setNotes] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  const { data: summary, isLoading: loadingSummary } = useTransportationSummary();
  const { data: settings } = useTransportationSettings();
  const { data: attendance, isLoading: loadingAttendance } = useBusAttendance(
    busId || null,
  );

  const record = useRecordBusAttendance();

  // The bus is chosen once so the page does not jump between buses on every
  // render; the first bus in the list is a sensible default.
  const selectedBusId = busId || summary?.buses?.[0]?.id || "";

  const handleRecord = async () => {
    if (!selectedBusId) {
      toast.error("اختر الباص أولاً");
      return;
    }
    await record.mutateAsync({
      busId: selectedBusId,
      attendDate: date,
      attended,
      notes: notes || undefined,
    });
    setNotes("");
  };

  return (
    <WmsPageShell
      group="hr"
      title="حضور الباص اليومي"
      subtitle="تسجيل حضور كل باص يوم بيوم — مع التكلفة والحصة لكل باص على حدة"
      actions={
        <Button variant="ghost" onClick={() => setShowSettings((v) => !v)}>
          <Settings2 size={15} /> إعدادات النقل
        </Button>
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Stat
          label="عدد الباصات"
          value={fmtInt(summary?.activeBuses ?? 0)}
          tone="info"
          icon={<Bus size={16} />}
        />
        <Stat
          label="عدد المستفيدين"
          value={fmtInt(summary?.totalPassengers ?? 0)}
          tone="success"
          icon={<CheckCircle2 size={16} />}
        />
        <Stat
          label="التكلفة الشهرية"
          value={fmtMoney(summary?.totalMonthlyCost ?? 0, 0)}
          tone="neutral"
          icon={<CalendarDays size={16} />}
        />
        <Stat
          label="حصة الموظف الواحدة"
          value={fmtMoney(
            summary && summary.totalPassengers > 0
              ? summary.totalNetCost / summary.totalPassengers
              : 0,
            0,
          )}
          tone="warning"
          icon={<CalendarDays size={16} />}
        />
      </div>

      {showSettings ? <SettingsCard /> : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ── record ── */}
        <Panel title="تسجيل يوم" icon={<CalendarDays size={20} />}>
          <div className="p-5 space-y-4">
            <Field label="الباص">
              <select
                value={selectedBusId}
                onChange={(e) => setBusId(e.target.value)}
                className={inputClass}
              >
                {(summary?.buses ?? []).map((bus) => (
                  <option key={bus.id} value={bus.id}>
                    {bus.route} — {bus.plateNumber}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="التاريخ">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={inputClass}
              />
            </Field>

            <Field label="حالة الباص">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setAttended(true)}
                  className={`rounded-2xl border px-3 py-3 text-sm font-black transition-all ${
                    attended
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-white text-slate-500"
                  }`}
                >
                  <CheckCircle2 size={16} className="mx-auto" />
                  حضر
                </button>
                <button
                  onClick={() => setAttended(false)}
                  className={`rounded-2xl border px-3 py-3 text-sm font-black transition-all ${
                    !attended
                      ? "border-red-400 bg-red-50 text-red-700"
                      : "border-slate-200 bg-white text-slate-500"
                  }`}
                >
                  <XCircle size={16} className="mx-auto" />
                  لم يحضر
                </button>
              </div>
            </Field>

            <Field label="ملاحظات">
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="مثال: تأخر الوصول — طابور"
                className={inputClass}
              />
            </Field>

            <Button
              onClick={handleRecord}
              loading={record.isPending}
              disabled={!selectedBusId}
              className="w-full justify-center"
            >
              <Save size={15} /> حفظ التسجيل
            </Button>

            <p className="text-[11px] font-bold text-[#263544]/50 leading-relaxed">
              تسجيل اليوم نفسه مرة أخرى يُحدّث السجل ولا يُنشئ سجلاً ثانياً.
              الحصة الشهرية لا تتأثر بغياب الباص — كل مشترك يدفع المبلغ كاملاً
              بالتساوي.
            </p>
          </div>
        </Panel>

        {/* ── per-bus cost ── */}
        <Panel title="حساب كل باص" icon={<Bus size={20} />}>
          <div className="p-5 space-y-3">
            {loadingSummary ? (
              <Loading />
            ) : (summary?.buses ?? []).length === 0 ? (
              <Empty message="لا توجد باصات مسجلة" />
            ) : (
              (summary?.buses ?? []).map((bus) => (
                <div
                  key={bus.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-black text-[#263544]">{bus.route}</p>
                      <p className="text-[11px] font-bold text-[#263544]/45">
                        {bus.plateNumber} · {bus.driverName}
                      </p>
                    </div>
                    <Pill tone={bus.status === "active" ? "green" : "slate"}>
                      {bus.status === "active" ? "نشط" : "موقوف"}
                    </Pill>
                  </div>

                  <dl className="mt-3 space-y-1.5 text-[11px]">
                    <div className="flex justify-between">
                      <dt className="font-bold text-[#263544]/55">التكلفة اليومية</dt>
                      <dd className="font-black tabular-nums">
                        {fmtMoney(bus.dailyCost, 0)}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="font-bold text-[#263544]/55">التكلفة الشهرية</dt>
                      <dd className="font-black tabular-nums">
                        {fmtMoney(bus.monthlyCost, 0)}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="font-bold text-[#263544]/55">مساهمة المعمل</dt>
                      <dd className="font-black tabular-nums text-emerald-700">
                        {fmtMoney(bus.companyDeduction, 0)}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="font-bold text-[#263544]/55">صافي التكلفة</dt>
                      <dd className="font-black tabular-nums">
                        {fmtMoney(bus.netCost, 0)}
                      </dd>
                    </div>
                    <div className="flex justify-between border-t border-slate-100 pt-1.5">
                      <dt className="font-bold text-[#263544]/55">حصة الموظف</dt>
                      <dd className="font-black tabular-nums text-[#8a5f26]">
                        {fmtMoney(bus.perEmployeeShare, 0)}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="font-bold text-[#263544]/55">المستفيدون</dt>
                      <dd className="font-black tabular-nums">
                        {fmtInt(bus.activePassengers)}
                      </dd>
                    </div>
                  </dl>
                </div>
              ))
            )}
          </div>
        </Panel>

        {/* ── the log ── */}
        <Panel title="سجل الحضور" icon={<CalendarDays size={20} />}>
          <div className="p-5">
            {loadingAttendance ? (
              <Loading />
            ) : !selectedBusId ? (
              <Empty message="اختر باصاً لعرض سجله" />
            ) : (attendance?.data ?? []).length === 0 ? (
              <Empty message="لا توجد أيام مسجلة لهذا الباص بعد" />
            ) : (
              <ul className="space-y-2 max-h-[520px] overflow-y-auto">
                {(attendance?.data ?? []).map((row) => (
                  <li
                    key={row.id}
                    className="flex items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      {row.attended ? (
                        <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                      ) : (
                        <XCircle size={16} className="text-red-500 shrink-0" />
                      )}
                      <div>
                        <p className="text-xs font-black text-[#263544] tabular-nums">
                          {row.attendDate}
                        </p>
                        {row.notes ? (
                          <p className="text-[10px] font-bold text-[#263544]/50">
                            {row.notes}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <Pill tone={row.attended ? "green" : "slate"}>
                      {row.attended ? "حضر" : "لم يحضر"}
                    </Pill>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Panel>
      </div>
    </WmsPageShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Settings
// ─────────────────────────────────────────────────────────────────────────────

function SettingsCard() {
  const queryClient = useQueryClient();
  const { data: settings } = useTransportationSettings();

  const [dailyCost, setDailyCost] = useState("");
  const [workingDays, setWorkingDays] = useState("");

  const currentDaily = dailyCost || String(settings?.defaultDailyCost ?? 200000);
  const currentDays = workingDays || String(settings?.workingDaysPerMonth ?? 26);

  const save = useMutation({
    mutationFn: async () => {
      const res = await apiClient.put("/transportation/settings", {
        defaultDailyCost: Number(currentDaily),
        workingDaysPerMonth: Number(currentDays),
      });
      return res.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.buses.all });
      toast.success("تم حفظ إعدادات النقل");
    },
    onError: (error: unknown) => {
      toast.error(normalizeError(error, "تعذّر حفظ الإعدادات"));
    },
  });

  return (
    <div className="mb-6">
      <Panel title="إعدادات النقل" icon={<Settings2 size={20} />}>
        <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <Field label="التكلفة اليومية الافتراضية للباص (ل.س)">
            <input
              type="number"
              min={0}
              value={currentDaily}
              onChange={(e) => setDailyCost(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="أيام العمل في الشهر">
            <input
              type="number"
              min={1}
              max={31}
              value={currentDays}
              onChange={(e) => setWorkingDays(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Button onClick={() => save.mutate()} loading={save.isPending}>
            <Save size={15} /> حفظ
          </Button>
        </div>
      </Panel>
    </div>
  );
}
