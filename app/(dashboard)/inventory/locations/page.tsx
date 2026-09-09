"use client";

import { useState } from "react";
import { Map, Plus, Grid3x3, PackageOpen, Sparkles, Check } from "lucide-react";
import WmsPageShell from "@/components/wms/WmsPageShell";
import {
  Button,
  Empty,
  Field,
  Loading,
  Panel,
  Pill,
  Stat,
  StatusPill,
  TableFrame,
  fmtInt,
  fmtPercent,
  inputClass,
} from "@/components/wms/primitives";
import {
  useBins,
  useBulkCreateBins,
  useCompletePutaway,
  useCreatePutawayTask,
  useOccupancy,
  usePutawayTasks,
  useSaveBin,
  useSaveZone,
  useSuggestPutaway,
  useZones,
} from "@/hooks/useWms";
import { useWarehouses } from "@/hooks/useInventory";
import type { BinSuggestion, ZoneType } from "@/types/wms";
import { toast } from "react-hot-toast";

const ZONE_LABELS: Record<ZoneType, string> = {
  RECEIVING: "استلام",
  PICKING: "التقاط",
  BULK: "تخزين كثيف",
  QUARANTINE: "حجر صحي",
  PACKING: "تغليف",
  STAGING: "تجهيز",
  SHIPPING: "شحن",
  RETURNS: "مرتجعات",
};

export default function LocationsPage() {
  const [tab, setTab] = useState<"map" | "bins" | "putaway">("map");
  const { data: warehouses } = useWarehouses();
  const { data: zones } = useZones();
  const { data: occupancy, isLoading: occLoading } = useOccupancy();

  const totalBins = (occupancy ?? []).reduce((s, z) => s + z.binCount, 0);
  const occupiedBins = (occupancy ?? []).reduce((s, z) => s + z.occupiedBins, 0);
  const totalUnits = (occupancy ?? []).reduce((s, z) => s + z.totalUnits, 0);

  return (
    <WmsPageShell
      group="inventory"
      title="المواقع والخانات"
      subtitle="هيكلة المخزن إلى مناطق وممرات وخانات، مع محرّك اقتراح موقع التخزين ومهامه."
      actions={
        <div className="flex gap-2">
          {(
            [
              { key: "map", label: "خريطة الإشغال", icon: Map },
              { key: "bins", label: "المناطق والخانات", icon: Grid3x3 },
              { key: "putaway", label: "مهام التخزين", icon: PackageOpen },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black transition-all ${
                tab === t.key
                  ? "bg-[#1a2530] text-[#C89355] border border-[#C89355]/40"
                  : "bg-white/70 text-[#263544]/70 border border-white hover:bg-white"
              }`}
            >
              <t.icon size={14} />
              {t.label}
            </button>
          ))}
        </div>
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Stat label="المناطق" value={fmtInt(zones?.length ?? 0)} icon={<Map size={16} />} />
        <Stat label="الخانات" value={fmtInt(totalBins)} />
        <Stat
          label="خانات مشغولة"
          value={fmtInt(occupiedBins)}
          hint={totalBins > 0 ? `${Math.round((occupiedBins / totalBins) * 100)}% من الخانات` : undefined}
          tone="info"
        />
        <Stat label="إجمالي الوحدات المخزّنة" value={fmtInt(totalUnits)} tone="success" />
      </div>

      {tab === "map" ? (
        occLoading ? (
          <Loading />
        ) : (occupancy?.length ?? 0) === 0 ? (
          <Panel title="خريطة الإشغال" icon={<Map size={20} />}>
            <Empty message="لم تُعرَّف أي منطقة بعد. ابدأ من تبويب «المناطق والخانات»." />
          </Panel>
        ) : (
          <div className="space-y-6">
            {(occupancy ?? []).map((zone) => (
              <Panel
                key={zone.zoneId}
                title={`${zone.name} (${zone.code})`}
                icon={<Grid3x3 size={20} />}
                badge={<Pill tone="gold">{ZONE_LABELS[zone.type]}</Pill>}
                actions={
                  <div className="flex items-center gap-3 text-xs font-black text-[#263544]/70">
                    <span>{fmtInt(zone.occupiedBins)} / {fmtInt(zone.binCount)} خانة مشغولة</span>
                    <span>{fmtInt(zone.totalUnits)} وحدة</span>
                    {zone.averageUtilization !== null ? (
                      <Pill tone={zone.averageUtilization > 85 ? "red" : zone.averageUtilization > 60 ? "amber" : "green"}>
                        إشغال {fmtPercent(zone.averageUtilization)}
                      </Pill>
                    ) : null}
                  </div>
                }
              >
                <div className="p-6 flex flex-wrap gap-2">
                  {zone.bins.map((bin) => {
                    const util = bin.utilization;
                    // Colour is the whole point of a heat map: an operator
                    // should see a full aisle without reading a number.
                    const tone =
                      !bin.isActive
                        ? "bg-slate-200 text-slate-500 border-slate-300"
                        : bin.onHand === 0
                          ? "bg-white text-[#263544]/50 border-slate-200"
                          : util === null
                            ? "bg-sky-100 text-sky-800 border-sky-300"
                            : util > 85
                              ? "bg-red-100 text-red-800 border-red-300"
                              : util > 60
                                ? "bg-amber-100 text-amber-800 border-amber-300"
                                : "bg-emerald-100 text-emerald-800 border-emerald-300";

                    return (
                      <div
                        key={bin.code}
                        title={`${bin.code} — ${bin.onHand} وحدة${
                          bin.dedicatedSku ? ` — مخصّصة لـ ${bin.dedicatedSku}` : ""
                        }`}
                        className={`px-3 py-2 rounded-xl border text-[11px] font-black min-w-[5.5rem] text-center ${tone}`}
                      >
                        <p className="font-mono">{bin.code}</p>
                        <p className="tabular-nums opacity-80">{fmtInt(bin.onHand)}</p>
                        {util !== null ? <p className="opacity-60">{util}%</p> : null}
                      </div>
                    );
                  })}
                  {zone.bins.length === 0 ? (
                    <p className="text-sm font-bold text-[#263544]/40">لا توجد خانات في هذه المنطقة.</p>
                  ) : null}
                </div>
              </Panel>
            ))}
          </div>
        )
      ) : null}

      {tab === "bins" ? <BinsTab warehouses={warehouses ?? []} /> : null}
      {tab === "putaway" ? <PutawayTab /> : null}
    </WmsPageShell>
  );
}

// ------------------------------------------------------------------ bins tab

function BinsTab({ warehouses }: { warehouses: Array<{ id: string; name: string; code: string }> }) {
  const { data: zones } = useZones();
  const [zoneFilter, setZoneFilter] = useState("");
  const { data: bins, isLoading } = useBins({ zoneId: zoneFilter || undefined, limit: 200 });

  const saveZone = useSaveZone();
  const saveBin = useSaveBin();
  const bulk = useBulkCreateBins();

  const [zoneForm, setZoneForm] = useState({ warehouseId: "", code: "", name: "", type: "PICKING" });
  const [layout, setLayout] = useState({ zoneId: "", aisles: "A,B,C", racksPerAisle: 4, levelsPerRack: 3, capacityUnits: 100 });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="المناطق" icon={<Map size={20} />}>
          {(zones?.length ?? 0) === 0 ? (
            <Empty message="لا توجد مناطق." />
          ) : (
            <TableFrame
              head={
                <>
                  <th>الكود</th>
                  <th>الاسم</th>
                  <th>النوع</th>
                  <th>المخزن</th>
                  <th>الخانات</th>
                  <th>ترتيب المرور</th>
                </>
              }
            >
              {(zones ?? []).map((zone) => (
                <tr key={zone.id} className="bg-white/50 [&>td]:px-4 [&>td]:py-3">
                  <td className="font-mono text-xs font-black">{zone.code}</td>
                  <td className="font-black text-[#263544]">{zone.name}</td>
                  <td>
                    <Pill tone="gold">{ZONE_LABELS[zone.type]}</Pill>
                  </td>
                  <td className="text-xs font-bold">{zone.warehouse?.name ?? "—"}</td>
                  <td className="tabular-nums">{zone._count?.bins ?? 0}</td>
                  <td className="tabular-nums text-xs">{zone.pickSequence}</td>
                </tr>
              ))}
            </TableFrame>
          )}

          <form
            className="p-6 grid grid-cols-2 gap-3 border-t border-white/70 bg-white/30"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!zoneForm.warehouseId || !zoneForm.code.trim() || !zoneForm.name.trim()) {
                toast.error("المخزن والكود والاسم مطلوبة");
                return;
              }
              await saveZone.mutateAsync({
                warehouseId: zoneForm.warehouseId,
                code: zoneForm.code.trim().toUpperCase(),
                name: zoneForm.name.trim(),
                type: zoneForm.type,
              });
              setZoneForm({ ...zoneForm, code: "", name: "" });
            }}
          >
            <Field label="المخزن">
              <select
                value={zoneForm.warehouseId}
                onChange={(e) => setZoneForm((p) => ({ ...p, warehouseId: e.target.value }))}
                className={inputClass}
              >
                <option value="">— اختر —</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="النوع">
              <select
                value={zoneForm.type}
                onChange={(e) => setZoneForm((p) => ({ ...p, type: e.target.value }))}
                className={inputClass}
              >
                {Object.entries(ZONE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="كود المنطقة">
              <input
                value={zoneForm.code}
                onChange={(e) => setZoneForm((p) => ({ ...p, code: e.target.value }))}
                placeholder="PICK-A"
                className={inputClass}
              />
            </Field>
            <Field label="الاسم">
              <input
                value={zoneForm.name}
                onChange={(e) => setZoneForm((p) => ({ ...p, name: e.target.value }))}
                className={inputClass}
              />
            </Field>
            <div className="col-span-2">
              <Button type="submit" loading={saveZone.isPending}>
                <Plus size={16} />
                إضافة منطقة
              </Button>
            </div>
          </form>
        </Panel>

        <Panel title="توليد رفوف دفعة واحدة" icon={<Sparkles size={20} />}>
          <form
            className="p-6 grid grid-cols-2 gap-3"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!layout.zoneId) {
                toast.error("اختر المنطقة");
                return;
              }
              await bulk.mutateAsync({
                zoneId: layout.zoneId,
                aisles: layout.aisles.split(",").map((a) => a.trim()).filter(Boolean),
                racksPerAisle: layout.racksPerAisle,
                levelsPerRack: layout.levelsPerRack,
                capacityUnits: layout.capacityUnits || undefined,
              });
            }}
          >
            <Field label="المنطقة">
              <select
                value={layout.zoneId}
                onChange={(e) => setLayout((p) => ({ ...p, zoneId: e.target.value }))}
                className={inputClass}
              >
                <option value="">— اختر —</option>
                {(zones ?? []).map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name} ({z.code})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="الممرات (مفصولة بفاصلة)">
              <input
                value={layout.aisles}
                onChange={(e) => setLayout((p) => ({ ...p, aisles: e.target.value }))}
                className={inputClass}
              />
            </Field>
            <Field label="رفوف لكل ممر">
              <input
                type="number"
                min={1}
                max={100}
                value={layout.racksPerAisle}
                onChange={(e) => setLayout((p) => ({ ...p, racksPerAisle: Number(e.target.value) }))}
                className={inputClass}
              />
            </Field>
            <Field label="طوابق لكل رف">
              <input
                type="number"
                min={1}
                max={20}
                value={layout.levelsPerRack}
                onChange={(e) => setLayout((p) => ({ ...p, levelsPerRack: Number(e.target.value) }))}
                className={inputClass}
              />
            </Field>
            <Field label="سعة الخانة (وحدة)">
              <input
                type="number"
                min={0}
                value={layout.capacityUnits}
                onChange={(e) => setLayout((p) => ({ ...p, capacityUnits: Number(e.target.value) }))}
                className={inputClass}
              />
            </Field>
            <div className="flex items-end">
              <Button type="submit" loading={bulk.isPending}>
                توليد الخانات
              </Button>
            </div>

            <p className="col-span-2 text-[11px] font-bold text-[#263544]/50">
              سيولّد{" "}
              <span className="font-black text-[#8a5f2a]">
                {layout.aisles.split(",").filter((a) => a.trim()).length *
                  layout.racksPerAisle *
                  layout.levelsPerRack}
              </span>{" "}
              خانة بصيغة <span className="font-mono">CODE-A-01-1</span>. الطوابق السفلى تأخذ أولوية مرور
              أعلى تلقائياً لأنها أسهل وصولاً، وعليها يُبنى مسار الالتقاط.
            </p>
          </form>
        </Panel>
      </div>

      <Panel
        title="الخانات"
        icon={<Grid3x3 size={20} />}
        actions={
          <select
            value={zoneFilter}
            onChange={(e) => setZoneFilter(e.target.value)}
            className={`${inputClass} w-56`}
          >
            <option value="">كل المناطق</option>
            {(zones ?? []).map((z) => (
              <option key={z.id} value={z.id}>
                {z.name}
              </option>
            ))}
          </select>
        }
      >
        {isLoading ? (
          <Loading />
        ) : (bins?.data.length ?? 0) === 0 ? (
          <Empty message="لا توجد خانات." />
        ) : (
          <TableFrame
            head={
              <>
                <th>الكود</th>
                <th>المنطقة</th>
                <th>الممر</th>
                <th>الرف</th>
                <th>الطابق</th>
                <th>السعة</th>
                <th>الموجود</th>
                <th>الإشغال</th>
                <th>مخصّصة لـ</th>
                <th>الحالة</th>
              </>
            }
          >
            {(bins?.data ?? []).map((bin) => (
              <tr key={bin.id} className="bg-white/50 [&>td]:px-4 [&>td]:py-3">
                <td className="font-mono text-xs font-black">{bin.code}</td>
                <td className="text-xs font-bold">{bin.zone?.name ?? "—"}</td>
                <td className="text-xs">{bin.aisle ?? "—"}</td>
                <td className="text-xs">{bin.rack ?? "—"}</td>
                <td className="text-xs">{bin.level ?? "—"}</td>
                <td className="tabular-nums text-xs">{bin.capacityUnits ?? "∞"}</td>
                <td className="tabular-nums font-black">{fmtInt(bin.onHand ?? 0)}</td>
                <td>
                  {bin.utilization === null || bin.utilization === undefined ? (
                    <span className="text-[11px] text-[#263544]/40">—</span>
                  ) : (
                    <Pill tone={bin.utilization > 85 ? "red" : bin.utilization > 60 ? "amber" : "green"}>
                      {bin.utilization}%
                    </Pill>
                  )}
                </td>
                <td className="text-xs font-mono">{bin.dedicatedSku ?? "—"}</td>
                <td>{bin.isActive ? <Pill tone="green">فعّالة</Pill> : <Pill>موقوفة</Pill>}</td>
              </tr>
            ))}
          </TableFrame>
        )}
      </Panel>
    </div>
  );
}

// --------------------------------------------------------------- putaway tab

function PutawayTab() {
  const { data: tasks, isLoading } = usePutawayTasks({ limit: 100 });
  const suggest = useSuggestPutaway();
  const createTask = useCreatePutawayTask();
  const complete = useCompletePutaway();

  const [form, setForm] = useState({ sku: "", quantity: 1, fromLocation: "RECEIVING" });
  const [suggestions, setSuggestions] = useState<BinSuggestion[] | null>(null);

  return (
    <div className="space-y-6">
      <Panel title="اقتراح موقع تخزين" icon={<Sparkles size={20} />}>
        <form
          className="p-6 grid grid-cols-1 md:grid-cols-4 gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!form.sku.trim()) {
              toast.error("أدخل SKU");
              return;
            }
            const result = await suggest.mutateAsync({ sku: form.sku.trim(), quantity: form.quantity });
            setSuggestions(result.suggestions);
            if (result.suggestions.length === 0) {
              toast.error("لا توجد خانة تتّسع لهذه الكمية");
            }
          }}
        >
          <Field label="SKU">
            <input
              value={form.sku}
              onChange={(e) => setForm((p) => ({ ...p, sku: e.target.value }))}
              className={inputClass}
            />
          </Field>
          <Field label="الكمية">
            <input
              type="number"
              min={1}
              value={form.quantity}
              onChange={(e) => setForm((p) => ({ ...p, quantity: Number(e.target.value) }))}
              className={inputClass}
            />
          </Field>
          <Field label="الموقع الحالي">
            <input
              value={form.fromLocation}
              onChange={(e) => setForm((p) => ({ ...p, fromLocation: e.target.value }))}
              className={inputClass}
            />
          </Field>
          <div className="flex items-end gap-2">
            <Button type="submit" loading={suggest.isPending}>
              اقترح
            </Button>
            <Button
              type="button"
              variant="ghost"
              loading={createTask.isPending}
              onClick={async () => {
                if (!form.sku.trim()) return;
                await createTask.mutateAsync({
                  sku: form.sku.trim(),
                  quantity: form.quantity,
                  fromLocation: form.fromLocation,
                });
                setSuggestions(null);
              }}
            >
              أنشئ مهمة
            </Button>
          </div>
        </form>

        {suggestions ? (
          <div className="px-6 pb-6">
            {suggestions.length === 0 ? (
              <Empty message="لا توجد خانة مناسبة — تحقّق من السعات أو حرّر خانات." />
            ) : (
              <div className="space-y-2">
                {suggestions.map((s, index) => (
                  <div
                    key={s.binCode}
                    className={`flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl border ${
                      index === 0
                        ? "bg-emerald-50 border-emerald-200"
                        : "bg-white/70 border-white"
                    }`}
                  >
                    <div>
                      <p className="font-black text-[#263544] font-mono">
                        {index === 0 ? "★ " : ""}
                        {s.binCode}
                      </p>
                      <p className="text-[11px] font-bold text-[#263544]/60">
                        {s.zoneCode} — {ZONE_LABELS[s.zoneType]}
                        {s.freeUnits !== null ? ` — متبقٍ ${s.freeUnits} وحدة` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {s.reasons.map((reason) => (
                        <Pill key={reason} tone={index === 0 ? "green" : "slate"}>
                          {reason}
                        </Pill>
                      ))}
                    </div>
                    <Pill tone="gold">نقاط {s.score}</Pill>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </Panel>

      <Panel title="مهام التخزين" icon={<PackageOpen size={20} />}>
        {isLoading ? (
          <Loading />
        ) : (tasks?.data.length ?? 0) === 0 ? (
          <Empty message="لا توجد مهام تخزين." />
        ) : (
          <TableFrame
            head={
              <>
                <th>رقم المهمة</th>
                <th>الصنف</th>
                <th>الدفعة</th>
                <th>الكمية</th>
                <th>من</th>
                <th>الخانة المقترحة</th>
                <th>سبب الاقتراح</th>
                <th>الحالة</th>
                <th>إجراء</th>
              </>
            }
          >
            {(tasks?.data ?? []).map((task) => (
              <tr key={task.id} className="bg-white/50 [&>td]:px-4 [&>td]:py-3">
                <td className="font-mono text-xs font-black">{task.taskNumber}</td>
                <td className="font-black text-[#263544]">{task.sku}</td>
                <td className="font-mono text-xs">{task.batch?.batchNumber ?? "—"}</td>
                <td className="tabular-nums font-black">{fmtInt(task.quantity)}</td>
                <td className="text-xs font-bold">{task.fromLocation}</td>
                <td className="font-mono text-xs font-black text-emerald-700">
                  {task.actualBin ?? task.suggestedBin ?? "—"}
                </td>
                <td className="text-[11px] font-bold text-[#263544]/60">{task.suggestionRule ?? "—"}</td>
                <td>
                  <StatusPill status={task.status} />
                </td>
                <td>
                  {task.status !== "COMPLETED" && task.status !== "CANCELLED" ? (
                    <button
                      onClick={() => {
                        const bin = window.prompt("الخانة الفعلية؟", task.suggestedBin ?? "");
                        if (bin) complete.mutate({ taskId: task.id, actualBin: bin });
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] font-black text-emerald-700 hover:bg-emerald-100 transition-colors"
                    >
                      <Check size={13} />
                      تنفيذ
                    </button>
                  ) : (
                    <span className="text-[11px] font-bold text-[#263544]/40">—</span>
                  )}
                </td>
              </tr>
            ))}
          </TableFrame>
        )}
      </Panel>
    </div>
  );
}
