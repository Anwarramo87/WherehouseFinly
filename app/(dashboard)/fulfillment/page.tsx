"use client";

import { useState } from "react";
import {
  ClipboardCheck,
  Plus,
  Play,
  Save,
  ChevronLeft,
  Route,
  AlertTriangle,
  Gauge,
} from "lucide-react";
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
  fmtDate,
  fmtInt,
  fmtPercent,
  inputClass,
} from "@/components/wms/primitives";
import {
  useCreatePickList,
  usePickList,
  usePickLists,
  usePickPerformance,
  useRecordPicks,
  useSalesOrders,
  useStartPickList,
  useZones,
} from "@/hooks/useWms";
import type { PickStrategy } from "@/types/wms";
import { toast } from "react-hot-toast";

const STRATEGY_LABELS: Record<PickStrategy, string> = {
  SINGLE: "طلب واحد",
  BATCH: "تجميع طلبات (Batch)",
  ZONE: "حسب المنطقة (Zone)",
  WAVE: "موجة (Wave)",
};

export default function FulfillmentPage() {
  const [openId, setOpenId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const { data, isLoading } = usePickLists({ limit: 25 });
  const { data: perf } = usePickPerformance(30);

  if (openId) return <PickListDetail pickListId={openId} onBack={() => setOpenId(null)} />;

  const lists = data?.data ?? [];
  const active = lists.filter((l) => l.status === "IN_PROGRESS" || l.status === "ASSIGNED").length;

  const performance = perf as
    | { totalLists: number; pickers: Array<{ userId: string; lists: number; lines: number; units: number; linesPerHour: number | null; shortPickRate: number }> }
    | undefined;

  return (
    <WmsPageShell
      group="fulfillment"
      title="جولات الالتقاط"
      subtitle="بناء جولات مرتّبة على مسار المخزن الحقيقي، مع اقتراح الدفعات وفق FEFO وتجميع الطلبات."
      actions={
        <Button onClick={() => setShowCreate(true)}>
          <Plus size={16} />
          جولة جديدة
        </Button>
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Stat label="الجولات" value={fmtInt(data?.total)} icon={<ClipboardCheck size={16} />} />
        <Stat label="نشطة الآن" value={fmtInt(active)} tone={active > 0 ? "info" : "neutral"} />
        <Stat
          label="جولات مكتملة (30 يوم)"
          value={fmtInt(performance?.totalLists ?? 0)}
          tone="success"
        />
        <Stat
          label="أسطر/ساعة (متوسط)"
          value={fmtInt(
            performance?.pickers.length
              ? Math.round(
                  performance.pickers.reduce((s, p) => s + (p.linesPerHour ?? 0), 0) /
                    performance.pickers.length,
                )
              : 0,
          )}
          tone="info"
          icon={<Gauge size={16} />}
        />
      </div>

      <Panel title="الجولات" icon={<ClipboardCheck size={20} />} className="mb-6">
        {isLoading ? (
          <Loading />
        ) : lists.length === 0 ? (
          <Empty message="لا توجد جولات التقاط. أنشئ واحدة من طلبات بيع مؤكّدة." />
        ) : (
          <TableFrame
            head={
              <>
                <th>الرقم</th>
                <th>الاستراتيجية</th>
                <th>المنطقة</th>
                <th>الأسطر</th>
                <th>المنجز</th>
                <th>مسافة تقديرية</th>
                <th>الحالة</th>
                <th>التاريخ</th>
                <th />
              </>
            }
          >
            {lists.map((list) => (
              <tr
                key={list.id}
                onClick={() => setOpenId(list.id)}
                className="bg-white/50 hover:bg-white/90 transition-colors cursor-pointer [&>td]:px-4 [&>td]:py-3"
              >
                <td className="font-black text-[#263544]">{list.pickNumber}</td>
                <td>
                  <Pill tone="gold">{STRATEGY_LABELS[list.strategy]}</Pill>
                </td>
                <td className="text-xs font-bold">{list.zoneCode ?? "—"}</td>
                <td className="tabular-nums">{fmtInt(list.totalLines)}</td>
                <td className="tabular-nums font-bold">
                  {fmtInt(list.completedLines)} / {fmtInt(list.totalLines)}
                </td>
                <td className="tabular-nums text-xs">
                  <span className="inline-flex items-center gap-1">
                    <Route size={12} className="text-[#C89355]" />
                    {fmtInt(list.estimatedDistanceM)} م
                  </span>
                </td>
                <td>
                  <StatusPill status={list.status} />
                </td>
                <td className="text-xs font-bold">{fmtDate(list.createdAt)}</td>
                <td>
                  <ChevronLeft size={16} className="text-[#C89355]" />
                </td>
              </tr>
            ))}
          </TableFrame>
        )}
      </Panel>

      {performance && performance.pickers.length > 0 ? (
        <Panel title="إنتاجية الملتقطين (آخر 30 يوم)" icon={<Gauge size={20} />}>
          <TableFrame
            head={
              <>
                <th>الموظف</th>
                <th>الجولات</th>
                <th>الأسطر</th>
                <th>الوحدات</th>
                <th>أسطر/ساعة</th>
                <th>نسبة النقص</th>
              </>
            }
          >
            {performance.pickers.map((picker) => (
              <tr key={picker.userId} className="bg-white/50 [&>td]:px-4 [&>td]:py-3">
                <td className="font-mono text-xs font-bold">{picker.userId.slice(0, 8)}</td>
                <td className="tabular-nums">{fmtInt(picker.lists)}</td>
                <td className="tabular-nums">{fmtInt(picker.lines)}</td>
                <td className="tabular-nums">{fmtInt(picker.units)}</td>
                <td className="tabular-nums font-black">{picker.linesPerHour ?? "—"}</td>
                <td>
                  <Pill tone={picker.shortPickRate > 5 ? "red" : picker.shortPickRate > 2 ? "amber" : "green"}>
                    {fmtPercent(picker.shortPickRate)}
                  </Pill>
                </td>
              </tr>
            ))}
          </TableFrame>
        </Panel>
      ) : null}

      {showCreate ? <CreatePickListModal onClose={() => setShowCreate(false)} /> : null}
    </WmsPageShell>
  );
}

function PickListDetail({ pickListId, onBack }: { pickListId: string; onBack: () => void }) {
  const { data: list, isLoading } = usePickList(pickListId);
  const start = useStartPickList();
  const record = useRecordPicks();
  const [entries, setEntries] = useState<Record<string, string>>({});

  const working = list?.status === "IN_PROGRESS";
  const dirty = Object.keys(entries).length > 0;

  return (
    <WmsPageShell
      group="fulfillment"
      title={list?.pickNumber ?? "جولة التقاط"}
      subtitle={
        list
          ? `${STRATEGY_LABELS[list.strategy]} — ${fmtInt(list.totalLines)} سطر — مسافة تقديرية ${fmtInt(list.estimatedDistanceM)} متر`
          : ""
      }
      actions={
        <>
          <Button variant="ghost" onClick={onBack}>
            رجوع
          </Button>
          {list && list.status !== "COMPLETED" && list.status !== "CANCELLED" && !working ? (
            <Button onClick={() => start.mutate(pickListId)} loading={start.isPending}>
              <Play size={16} />
              بدء الجولة
            </Button>
          ) : null}
          {working && dirty ? (
            <Button
              onClick={async () => {
                const lines = Object.entries(entries)
                  .filter(([, v]) => v !== "")
                  .map(([itemId, v]) => ({ itemId, quantityPicked: Number(v) }));
                if (lines.length === 0) return;
                await record.mutateAsync({ pickListId, lines });
                setEntries({});
              }}
              loading={record.isPending}
            >
              <Save size={16} />
              حفظ {Object.keys(entries).length} سطر
            </Button>
          ) : null}
        </>
      }
    >
      {isLoading || !list ? (
        <Loading />
      ) : (
        <Panel title="مسار الالتقاط" icon={<Route size={20} />}>
          <TableFrame
            head={
              <>
                <th>#</th>
                <th>الموقع</th>
                <th>الصنف</th>
                <th>الدفعة</th>
                <th>الصلاحية</th>
                <th>المطلوب</th>
                <th>الملتقَط</th>
                <th>الحالة</th>
              </>
            }
          >
            {(list.items ?? []).map((item) => {
              const pending = entries[item.id];
              const shown = pending !== undefined ? pending : String(item.quantityPicked || "");
              const short = shown !== "" && Number(shown) < item.quantityRequested;

              return (
                <tr key={item.id} className="bg-white/50 [&>td]:px-4 [&>td]:py-3">
                  <td className="font-black text-[#C89355] tabular-nums">{item.sequence}</td>
                  <td className="font-mono text-sm font-black text-[#263544]">{item.location}</td>
                  <td>
                    <p className="font-black text-[#263544]">{item.productName ?? item.sku}</p>
                    <p className="text-[11px] font-bold text-[#263544]/50">{item.sku}</p>
                  </td>
                  <td className="font-mono text-xs">
                    {item.batch?.batchNumber ? (
                      <Pill tone="gold">{item.batch.batchNumber}</Pill>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="text-xs font-bold">{fmtDate(item.batch?.expiryDate)}</td>
                  <td className="tabular-nums font-black">{fmtInt(item.quantityRequested)}</td>
                  <td>
                    {working ? (
                      <input
                        type="number"
                        min={0}
                        max={item.quantityRequested}
                        value={shown}
                        onChange={(e) => setEntries((prev) => ({ ...prev, [item.id]: e.target.value }))}
                        className="w-24 px-2 py-1.5 rounded-lg border border-slate-200 text-sm font-black tabular-nums outline-none focus:border-[#C89355]"
                      />
                    ) : (
                      <span className="tabular-nums font-black">{fmtInt(item.quantityPicked)}</span>
                    )}
                  </td>
                  <td>
                    {short ? (
                      <Pill tone="amber">
                        <AlertTriangle size={12} />
                        نقص
                      </Pill>
                    ) : (
                      <StatusPill status={item.status} />
                    )}
                  </td>
                </tr>
              );
            })}
          </TableFrame>

          <p className="px-6 py-4 text-[11px] font-bold text-[#263544]/50 bg-white/30 border-t border-white/70">
            الترتيب مبنيّ على مسار المخزن: تسلسل المنطقة، ثم الممر، ثم أولوية الخانة. تسجيل الالتقاط لا يخصم
            المخزون — الخصم يتمّ عند ترحيل فاتورة البيع، حيث يبقى متّسقاً مع تكلفة المبيع وإذن الخروج.
          </p>
        </Panel>
      )}
    </WmsPageShell>
  );
}

function CreatePickListModal({ onClose }: { onClose: () => void }) {
  const create = useCreatePickList();
  const { data: orders } = useSalesOrders({ limit: 100, status: "confirmed" });
  const { data: zones } = useZones();

  const [strategy, setStrategy] = useState<PickStrategy>("SINGLE");
  const [selected, setSelected] = useState<string[]>([]);
  const [zoneCode, setZoneCode] = useState("");
  const [maxOrders, setMaxOrders] = useState(20);

  const orderRows = (orders?.data ?? []) as Array<{ id: string; soNumber: string; totalAmount: string }>;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="bg-white rounded-[2rem] max-w-2xl w-full p-8 max-h-[85vh] overflow-y-auto" dir="rtl">
        <h3 className="text-xl font-black text-[#263544] mb-6">جولة التقاط جديدة</h3>

        <form
          className="space-y-5"
          onSubmit={async (e) => {
            e.preventDefault();
            if (strategy !== "WAVE" && selected.length === 0) {
              toast.error("اختر طلباً واحداً على الأقل");
              return;
            }
            if (strategy === "ZONE" && !zoneCode) {
              toast.error("اختر المنطقة");
              return;
            }
            await create.mutateAsync({
              strategy,
              salesOrderIds: strategy === "WAVE" && selected.length === 0 ? undefined : selected,
              zoneCode: strategy === "ZONE" ? zoneCode : undefined,
              maxOrders: strategy === "WAVE" ? maxOrders : undefined,
            });
            onClose();
          }}
        >
          <Field label="الاستراتيجية">
            <select
              value={strategy}
              onChange={(e) => setStrategy(e.target.value as PickStrategy)}
              className={inputClass}
            >
              {Object.entries(STRATEGY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>

          <div className="p-4 rounded-2xl bg-slate-50 text-[11px] font-bold text-slate-600">
            {strategy === "SINGLE"
              ? "طلب واحد في جولة واحدة — الأبسط، والأنسب للطلبات الكبيرة."
              : strategy === "BATCH"
                ? "عدة طلبات مدمجة: الأسطر المتطابقة في نفس الخانة تُدمج فتُزار الخانة مرة واحدة بدل خمس."
                : strategy === "ZONE"
                  ? "الجولة محصورة بمنطقة واحدة — تُعمَل مناطق متعددة بالتوازي وتلتقي الأجزاء عند التغليف."
                  : "موجة مجدولة تكنس الطلبات المؤكّدة المفتوحة وتدمجها في جولة واحدة."}
          </div>

          {strategy === "ZONE" ? (
            <Field label="المنطقة">
              <select value={zoneCode} onChange={(e) => setZoneCode(e.target.value)} className={inputClass}>
                <option value="">— اختر —</option>
                {(zones ?? []).map((z) => (
                  <option key={z.id} value={z.code}>
                    {z.name} ({z.code})
                  </option>
                ))}
              </select>
            </Field>
          ) : null}

          {strategy === "WAVE" ? (
            <Field label="أقصى عدد طلبات في الموجة">
              <input
                type="number"
                min={1}
                max={100}
                value={maxOrders}
                onChange={(e) => setMaxOrders(Number(e.target.value))}
                className={inputClass}
              />
            </Field>
          ) : null}

          <div>
            <p className="text-xs font-black text-[#263544]/70 mb-2">
              طلبات البيع المؤكّدة {strategy === "WAVE" ? "(اتركها فارغة لتُختار تلقائياً)" : ""}
            </p>
            <div className="border border-slate-200 rounded-2xl max-h-64 overflow-y-auto">
              {orderRows.length === 0 ? (
                <p className="p-6 text-center text-sm font-bold text-slate-400">
                  لا توجد طلبات مؤكّدة جاهزة للتجهيز.
                </p>
              ) : (
                orderRows.map((order) => (
                  <label
                    key={order.id}
                    className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selected.includes(order.id)}
                      onChange={(e) =>
                        setSelected((prev) =>
                          e.target.checked ? [...prev, order.id] : prev.filter((id) => id !== order.id),
                        )
                      }
                      disabled={strategy === "SINGLE" && selected.length >= 1 && !selected.includes(order.id)}
                      className="accent-[#C89355]"
                    />
                    <span className="font-black text-sm text-[#263544]">{order.soNumber}</span>
                    <span className="text-xs font-bold text-slate-500 mr-auto">{order.totalAmount}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              إلغاء
            </Button>
            <Button type="submit" loading={create.isPending}>
              إنشاء الجولة
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
