"use client";

import { useMemo, useState } from "react";
import {
  Factory,
  Plus,
  Scissors,
  Shirt,
  PackageCheck,
  Boxes,
  Search,
  X,
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  Clock,
  RotateCcw,
  Calculator,
  Lock,
  Unlock,
  Warehouse,
  ArrowRightLeft,
  Layers,
} from "lucide-react";
import WmsPageShell from "@/components/wms/WmsPageShell";
import {
  Panel,
  Stat,
  Pill,
  Button,
  Field,
  Loading,
  Empty,
  fmtMoney,
  fmtInt,
  fmtDate,
  inputClass,
} from "@/components/wms/primitives";
import {
  useProductionDashboard,
  useProductionBatches,
  useProductionBatch,
  useStartProductionStage,
  useCompleteProductionStage,
  useReturnProductionStage,
  useCalculateProductionCost,
  useCreateProductionBatch,
  useLockProductionCost,
  useUnlockProductionCost,
  type ProductionBatchView,
  type ProductionStageType,
  type ProductionStageView,
} from "@/hooks/useProduction";
import { toast } from "react-hot-toast";

// ─────────────────────────────────────────────────────────────────────────────
// Stage presentation
// ─────────────────────────────────────────────────────────────────────────────

const STAGE_ORDER: ProductionStageType[] = ["CUTTING", "SEWING", "ASSEMBLY", "FINISHED"];

const STAGE_ICON: Record<ProductionStageType, typeof Scissors> = {
  CUTTING: Scissors,
  SEWING: Shirt,
  ASSEMBLY: Boxes,
  FINISHED: PackageCheck,
};

const STAGE_STATUS: Record<string, { label: string; tone: "slate" | "blue" | "green" | "amber" }> = {
  PENDING: { label: "لم تبدأ", tone: "slate" },
  IN_PROGRESS: { label: "قيد التنفيذ", tone: "blue" },
  COMPLETED: { label: "مكتملة", tone: "green" },
  REJECTED: { label: "مرفوضة", tone: "amber" },
};

const PRODUCT_TYPES = [
  { value: "jeans", label: "جينز" },
  { value: "dress", label: "فستان" },
  { value: "suit", label: "بدلة" },
  { value: "shirt", label: "قميص" },
  { value: "other", label: "أخرى" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function ProductionStagesPage() {
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<"" | ProductionStageType>("");
  const [statusFilter, setStatusFilter] = useState("");
  const [openBatchId, setOpenBatchId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const params = useMemo(
    () => ({
      search: search || undefined,
      stageType: stageFilter || undefined,
      stageStatus: (statusFilter || undefined) as never,
      limit: 50,
    }),
    [search, stageFilter, statusFilter],
  );

  const { data: dashboard, isLoading: loadingDashboard } = useProductionDashboard();
  const { data: batches, isLoading: loadingBatches } = useProductionBatches(params);

  const rows = batches?.data ?? [];
  const totals = dashboard?.totals;

  return (
    <WmsPageShell
      group="production"
      title="لوحة الإنتاج"
      subtitle="متابعة دفعات الإنتاج من شراء المواد حتى المنتج التام"
      actions={
        <div className="flex gap-2 items-center">
          <div className="relative">
            <Search
              size={15}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#263544]/35 pointer-events-none"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث برقم الدفعة أو المنتج…"
              className={`${inputClass} w-64 pr-9`}
            />
          </div>
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value as "" | ProductionStageType)}
            className={`${inputClass} w-40`}
          >
            <option value="">كل المراحل</option>
            {STAGE_ORDER.map((s) => (
              <option key={s} value={s}>
                {STAGE_ICON[s] ? "" : ""}
                {s === "CUTTING" && "القص"}
                {s === "SEWING" && "الخياطة"}
                {s === "ASSEMBLY" && "الأمبلاج"}
                {s === "FINISHED" && "المنتج التام"}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`${inputClass} w-36`}
          >
            <option value="">كل الحالات</option>
            {Object.entries(STAGE_STATUS).map(([v, m]) => (
              <option key={v} value={v}>
                {m.label}
              </option>
            ))}
          </select>
          <Button onClick={() => setShowCreate(true)}>
            <Plus size={15} /> دفعة جديدة
          </Button>
        </div>
      }
    >
      {/* ── KPI ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Stat
          label="إجمالي الدفعات"
          value={fmtInt(totals?.all ?? 0)}
          tone="info"
          icon={<Layers size={16} />}
        />
        <Stat
          label="قيد التنفيذ"
          value={fmtInt(totals?.inProgress ?? 0)}
          tone="warning"
          icon={<Factory size={16} />}
        />
        <Stat
          label="مكتملة"
          value={fmtInt(totals?.completed ?? 0)}
          tone="success"
          icon={<CheckCircle2 size={16} />}
        />
        <Stat
          label="متأخرة"
          value={fmtInt(totals?.late ?? 0)}
          tone="danger"
          icon={<AlertTriangle size={16} />}
        />
      </div>

      {/* ── Batch cards ── */}
      <Panel title="الدفعات" icon={<Layers size={20} />}>
        {loadingBatches || loadingDashboard ? (
          <Loading />
        ) : rows.length === 0 ? (
          <Empty message="لا توجد دفعات إنتاج — ابدأ بإنشاء دفعة جديدة" />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-5">
            {rows.map((batch) => (
              <BatchCard key={batch.id} batch={batch} onOpen={() => setOpenBatchId(batch.id)} />
            ))}
          </div>
        )}
      </Panel>

      {showCreate ? <CreateBatchModal onClose={() => setShowCreate(false)} /> : null}

      {openBatchId ? (
        <BatchDetailModal batchId={openBatchId} onClose={() => setOpenBatchId(null)} />
      ) : null}
    </WmsPageShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Batch card — a visual stage line, no dense table
// ─────────────────────────────────────────────────────────────────────────────

function BatchCard({
  batch,
  onOpen,
}: {
  batch: ProductionBatchView;
  onOpen: () => void;
}) {
  return (
    <button
      onClick={onOpen}
      className="text-right w-full rounded-3xl border border-slate-200/80 bg-white/85 hover:shadow-lg hover:border-[#C89355]/50 transition-all p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-black text-[#263544] text-base">{batch.name || batch.batchNumber}</p>
          <p className="text-[11px] font-bold text-[#263544]/50 mt-0.5">
            {batch.batchNumber} · {batch.productSku}
            {batch.productType
              ? ` · ${PRODUCT_TYPES.find((t) => t.value === batch.productType)?.label ?? batch.productType}`
              : ""}
          </p>
        </div>
        <div className="text-left shrink-0">
          <Pill tone={batch.isCompleted ? "green" : batch.isInProgress ? "blue" : "slate"}>
            {batch.isCompleted ? "مكتملة" : batch.currentStageLabel ?? "بالانتظار"}
          </Pill>
          <p className="text-[11px] font-black text-[#263544]/60 mt-1.5 tabular-nums">
            {fmtInt(batch.plannedQty)} قطعة
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-4 h-2 rounded-full bg-slate-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-l from-[#C89355] to-[#8a5f26] transition-all"
          style={{ width: `${batch.progressPercent}%` }}
        />
      </div>

      {/* The stage line */}
      <div className="mt-4 flex items-center gap-1">
        {batch.stages.map((stage, index) => {
          const Icon = STAGE_ICON[stage.stageType] ?? CircleDashed;
          const meta = STAGE_STATUS[stage.status] ?? STAGE_STATUS.PENDING;
          return (
            <div key={stage.stageType} className="flex items-center gap-1 flex-1 min-w-0">
              <div
                className={`flex-1 min-w-0 rounded-2xl px-2 py-2 text-center border ${
                  stage.status === "COMPLETED"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                    : stage.status === "IN_PROGRESS"
                      ? "bg-sky-50 border-sky-200 text-sky-700"
                      : "bg-slate-50 border-slate-200 text-slate-400"
                }`}
              >
                <Icon size={13} className="mx-auto" />
                <p className="text-[9px] font-black mt-0.5 truncate">{stage.label}</p>
                <p className="text-[9px] font-bold opacity-70">{meta.label}</p>
              </div>
              {index < batch.stages.length - 1 ? (
                <div className="w-3 h-px bg-slate-200 shrink-0" />
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Variants */}
      {batch.variants.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {batch.variants.slice(0, 6).map((v) => (
            <span
              key={v.id}
              className="px-2 py-1 rounded-xl bg-slate-50 border border-slate-200 text-[10px] font-black text-[#263544]/70"
            >
              {v.color} / {v.size} — {fmtInt(v.quantity)}
            </span>
          ))}
          {batch.variants.length > 6 ? (
            <span className="px-2 py-1 rounded-xl bg-slate-50 border border-slate-200 text-[10px] font-black text-[#263544]/50">
              +{batch.variants.length - 6}
            </span>
          ) : null}
        </div>
      ) : null}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Create batch modal
// ─────────────────────────────────────────────────────────────────────────────

function CreateBatchModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [productSku, setProductSku] = useState("");
  const [productType, setProductType] = useState("jeans");
  const [totalQty, setTotalQty] = useState("10");
  const [notes, setNotes] = useState("");
  const [variants, setVariants] = useState<Array<{ color: string; size: string; quantity: string }>>([
    { color: "", size: "", quantity: "" },
  ]);

  const createBatch = useCreateProductionBatch();

  const handleSubmit = async () => {
    const parsed = variants
      .filter((v) => v.color && v.size && v.quantity)
      .map((v) => ({ color: v.color, size: v.size, quantity: Number(v.quantity) }));

    // The server refuses a batch whose variants do not add up to the total,
    // so the form checks it here first to give an immediate, local message.
    if (parsed.length > 0) {
      const sum = parsed.reduce((s, v) => s + v.quantity, 0);
      if (sum !== Number(totalQty)) {
        toast.error(
          `مجموع كميات المقاسات والألوان (${sum}) لا يساوي الكمية الإجمالية (${totalQty})`,
        );
        return;
      }
    }

    await createBatch.mutateAsync({
      name,
      productSku,
      productType,
      totalQty: Number(totalQty),
      notes: notes || undefined,
      variants: parsed.length ? parsed : undefined,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
      dir="rtl"
    >
      <div className="bg-white rounded-[2rem] w-full max-w-2xl p-6 my-8">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-black text-[#263544] flex items-center gap-2">
            <Plus size={20} className="text-[#C89355]" /> دفعة إنتاج جديدة
          </h2>
          <button onClick={onClose} className="text-[#263544]/40 hover:text-[#263544]">
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="اسم الدفعة">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: دفعة جينز cruiser — آب"
              className={inputClass}
            />
          </Field>

          <Field label="رمز المنتج (SKU)">
            <input
              value={productSku}
              onChange={(e) => setProductSku(e.target.value)}
              placeholder="JEANS-BLUE-32"
              className={`${inputClass} font-mono`}
            />
          </Field>

          <Field label="نوع المنتج">
            <select
              value={productType}
              onChange={(e) => setProductType(e.target.value)}
              className={inputClass}
            >
              {PRODUCT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="الكمية الإجمالية">
            <input
              type="number"
              min={1}
              value={totalQty}
              onChange={(e) => setTotalQty(e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-black text-[#263544]/70">
              المقاسات والألوان (اختياري — لكل تركيبة كميتها المستقلة)
            </p>
            <button
              onClick={() =>
                setVariants((v) => [...v, { color: "", size: "", quantity: "" }])
              }
              className="text-[11px] font-black text-[#8a5f26] hover:underline"
            >
              + إضافة تركيبة
            </button>
          </div>

          <div className="space-y-2">
            {variants.map((v, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-center">
                <input
                  value={v.color}
                  onChange={(e) =>
                    setVariants((prev) =>
                      prev.map((x, i) => (i === index ? { ...x, color: e.target.value } : x)),
                    )
                  }
                  placeholder="اللون"
                  className={`${inputClass} col-span-4`}
                />
                <input
                  value={v.size}
                  onChange={(e) =>
                    setVariants((prev) =>
                      prev.map((x, i) => (i === index ? { ...x, size: e.target.value } : x)),
                    )
                  }
                  placeholder="المقاس"
                  className={`${inputClass} col-span-3`}
                />
                <input
                  type="number"
                  min={0}
                  value={v.quantity}
                  onChange={(e) =>
                    setVariants((prev) =>
                      prev.map((x, i) =>
                        i === index ? { ...x, quantity: e.target.value } : x,
                      ),
                    )
                  }
                  placeholder="الكمية"
                  className={`${inputClass} col-span-4`}
                />
                <button
                  onClick={() => setVariants((prev) => prev.filter((_, i) => i !== index))}
                  className="col-span-1 text-red-500 hover:text-red-700"
                  disabled={variants.length === 1}
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <Field label="ملاحظات">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className={inputClass}
            />
          </Field>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            إلغاء
          </Button>
          <Button
            onClick={handleSubmit}
            loading={createBatch.isPending}
            disabled={!name || !productSku || Number(totalQty) < 1}
          >
            <Plus size={15} /> إنشاء الدفعة
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Batch detail modal — the production line
// ─────────────────────────────────────────────────────────────────────────────

function BatchDetailModal({
  batchId,
  onClose,
}: {
  batchId: string;
  onClose: () => void;
}) {
  const { data: batch, isLoading } = useProductionBatch(batchId);
  const [activeStage, setActiveStage] = useState<ProductionStageType | null>(null);
  const [showReturn, setShowReturn] = useState(false);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
      dir="rtl"
    >
      <div className="bg-white rounded-[2rem] w-full max-w-4xl p-6 my-8">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-black text-[#263544] flex items-center gap-2">
            <Factory size={20} className="text-[#C89355]" />
            {batch?.name || batch?.batchNumber || "تفاصيل الدفعة"}
          </h2>
          <button onClick={onClose} className="text-[#263544]/40 hover:text-[#263544]">
            <X size={20} />
          </button>
        </div>

        {isLoading || !batch ? (
          <Loading />
        ) : (
          <>
            {/* Header facts */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
              <Fact label="رقم الدفعة" value={batch.batchNumber} />
              <Fact label="المنتج" value={batch.productSku} />
              <Fact label="الكمية المخططة" value={fmtInt(batch.plannedQty)} />
              <Fact label="التاريخ" value={fmtDate(batch.createdDate)} />
            </div>

            {/* The production line */}
            <div className="rounded-3xl border border-slate-200 bg-slate-50/60 p-4 mb-5">
              <p className="text-xs font-black text-[#263544]/70 mb-3">خط السير</p>
              <div className="flex flex-col md:flex-row gap-2">
                {batch.stages.map((stage, index) => (
                  <div key={stage.stageType} className="flex-1 flex items-center gap-2">
                    <StageCard
                      stage={stage}
                      selected={activeStage === stage.stageType}
                      onClick={() =>
                        setActiveStage(activeStage === stage.stageType ? null : stage.stageType)
                      }
                    />
                    {index < batch.stages.length - 1 ? (
                      <ArrowRightLeft size={14} className="text-slate-300 shrink-0 hidden md:block" />
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            {/* Selected stage actions */}
            {activeStage ? (
              <StageActions
                batchId={batch.id}
                stage={batch.stages.find((s) => s.stageType === activeStage)!}
                onReturn={() => setShowReturn(true)}
              />
            ) : (
              <p className="text-xs font-bold text-[#263544]/50 text-center py-3">
                اختر مرحلة من خط السير لعرض إجراءاتها
              </p>
            )}

            {/* Variants */}
            {batch.variants.length > 0 ? (
              <div className="mt-5">
                <p className="text-xs font-black text-[#263544]/70 mb-2">
                  المقاسات والألوان
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-right">
                    <thead className="bg-[#1a2530] text-[#C89355]">
                      <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:font-black [&>th]:text-[11px]">
                        <th>اللون</th>
                        <th>المقاس</th>
                        <th>المطلوب</th>
                        <th>مقصوص</th>
                        <th>مخيط</th>
                        <th>مُعبّأ</th>
                        <th>نهائي</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {batch.variants.map((v) => (
                        <tr key={v.id} className="text-[#263544]/80">
                          <td className="px-3 py-2 font-black">{v.color}</td>
                          <td className="px-3 py-2">{v.size}</td>
                          <td className="px-3 py-2 tabular-nums">{fmtInt(v.quantity)}</td>
                          <td className="px-3 py-2 tabular-nums">{fmtInt(v.cutQty)}</td>
                          <td className="px-3 py-2 tabular-nums">{fmtInt(v.sewnQty)}</td>
                          <td className="px-3 py-2 tabular-nums">{fmtInt(v.packedQty)}</td>
                          <td className="px-3 py-2 tabular-nums font-black">{fmtInt(v.finishedQty)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            {/* Cost */}
            <CostBlock batchId={batch.id} cost={batch.cost} />

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowReturn(true)}>
                <RotateCcw size={15} /> إرجاع لمرحلة سابقة
              </Button>
              <Button onClick={() => window.print()}>
                <PackageCheck size={15} /> طباعة
              </Button>
            </div>

            {showReturn ? (
              <ReturnStageModal
                batchId={batch.id}
                stages={batch.stages}
                onClose={() => setShowReturn(false)}
              />
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 border border-slate-200 px-3 py-2">
      <p className="text-[10px] font-black text-[#263544]/45">{label}</p>
      <p className="text-sm font-black text-[#263544] mt-0.5">{value}</p>
    </div>
  );
}

function StageCard({
  stage,
  selected,
  onClick,
}: {
  stage: ProductionStageView;
  selected: boolean;
  onClick: () => void;
}) {
  const Icon = STAGE_ICON[stage.stageType] ?? CircleDashed;
  const meta = STAGE_STATUS[stage.status] ?? STAGE_STATUS.PENDING;

  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-2xl border p-3 text-right transition-all ${
        selected
          ? "border-[#C89355] bg-white shadow-md"
          : stage.status === "COMPLETED"
            ? "border-emerald-200 bg-emerald-50/60"
            : stage.status === "IN_PROGRESS"
              ? "border-sky-200 bg-sky-50/60"
              : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-center gap-2">
        <Icon size={15} className="text-[#C89355]" />
        <p className="text-xs font-black text-[#263544]">{stage.label}</p>
      </div>
      <p className="text-[10px] font-bold text-[#263544]/55 mt-1">{meta.label}</p>
      <p className="text-[10px] font-bold text-[#263544]/45 mt-0.5 tabular-nums">
        داخل {fmtInt(stage.inputQty)} · خارج {fmtInt(stage.outputQty)}
        {stage.wasteQty > 0 ? ` · هدر ${fmtInt(stage.wasteQty)}` : ""}
        {stage.defectiveQty > 0 ? ` · معيب ${fmtInt(stage.defectiveQty)}` : ""}
      </p>
      {stage.notes ? (
        <p className="text-[10px] font-bold text-amber-700 mt-1 truncate">📝 {stage.notes}</p>
      ) : null}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Stage actions
// ─────────────────────────────────────────────────────────────────────────────

function StageActions({
  batchId,
  stage,
  onReturn,
}: {
  batchId: string;
  stage: ProductionStageView;
  onReturn: () => void;
}) {
  const [outputQty, setOutputQty] = useState("");
  const [wasteQty, setWasteQty] = useState("0");
  const [defectiveQty, setDefectiveQty] = useState("0");
  const [notes, setNotes] = useState("");
  const [stageCost, setStageCost] = useState("");

  const startStage = useStartProductionStage();
  const completeStage = useCompleteProductionStage();

  const input = stage.inputQty;
  const accounted =
    Number(outputQty || 0) + Number(wasteQty || 0) + Number(defectiveQty || 0);
  const over = accounted > input && input > 0;

  if (stage.status === "COMPLETED") {
    return (
      <div className="rounded-3xl border border-emerald-200 bg-emerald-50/60 p-4 text-center">
        <CheckCircle2 size={22} className="mx-auto text-emerald-600" />
        <p className="text-sm font-black text-emerald-800 mt-1">
          اكتملت مرحلة {stage.label}
        </p>
        <p className="text-[11px] font-bold text-emerald-700/70 mt-0.5">
          صالحة {fmtInt(stage.outputQty)} · هدر {fmtInt(stage.wasteQty)} · معيب{" "}
          {fmtInt(stage.defectiveQty)}
        </p>
        <button
          onClick={onReturn}
          className="text-[11px] font-black text-amber-700 hover:underline mt-2"
        >
          إرجاع الدفعة إلى مرحلة سابقة
        </button>
      </div>
    );
  }

  if (stage.status === "IN_PROGRESS") {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-4">
        <p className="text-xs font-black text-[#263544]/70 mb-3">
          إنهاء مرحلة {stage.label} — المستلم {fmtInt(input)}
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Field label="الكمية الصالحة">
            <input
              type="number"
              min={0}
              value={outputQty}
              onChange={(e) => setOutputQty(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="الهدر">
            <input
              type="number"
              min={0}
              value={wasteQty}
              onChange={(e) => setWasteQty(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="المعيب">
            <input
              type="number"
              min={0}
              value={defectiveQty}
              onChange={(e) => setDefectiveQty(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="تكلفة المرحلة">
            <input
              type="number"
              min={0}
              value={stageCost}
              onChange={(e) => setStageCost(e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>

        <div className="mt-3">
          <Field label="ملاحظات (مثل: الحاجة إلى عراوي أو أزرار)">
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>

        {over ? (
          <p className="mt-2 text-[11px] font-black text-red-600">
            الكميات غير متوازنة: المستلم {fmtInt(input)} — المجموع {fmtInt(accounted)}
          </p>
        ) : null}

        <div className="mt-4 flex justify-end gap-2">
          <Button
            onClick={() =>
              completeStage.mutate({
                batchId,
                stage: stage.stageType,
                outputQty: Number(outputQty || 0),
                wasteQty: Number(wasteQty || 0),
                defectiveQty: Number(defectiveQty || 0),
                notes: notes || undefined,
                stageCost: stageCost ? Number(stageCost) : undefined,
              })
            }
            loading={completeStage.isPending}
            disabled={over || outputQty === ""}
          >
            <CheckCircle2 size={15} /> إنهاء المرحلة
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-black text-[#263544]/70 mb-3">
        استلام دفعة في مرحلة {stage.label}
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="الكمية المستلمة">
          <input
            type="number"
            min={0}
            value={outputQty}
            onChange={(e) => setOutputQty(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="ملاحظات">
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>
      <div className="mt-4 flex justify-end">
        <Button
          onClick={() =>
            startStage.mutate({
              batchId,
              stage: stage.stageType,
              inputQty: Number(outputQty || 0),
              notes: notes || undefined,
            })
          }
          loading={startStage.isPending}
        >
          <Clock size={15} /> استلام الدفعة
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Cost block
// ─────────────────────────────────────────────────────────────────────────────

function CostBlock({
  batchId,
  cost,
}: {
  batchId: string;
  cost: {
    materialCost: number;
    directCost: number;
    overheadCost: number;
    totalActualCost: number;
    unitActualCost: number;
    goodQty: number;
    wasteQty: number;
    defectiveQty: number;
    currency: string;
    exchangeRate: number;
    exchangeRateDate: string | null;
    isLocked: boolean;
  } | null;
}) {
  const calculate = useCalculateProductionCost();
  const lock = useLockProductionCost();
  const unlock = useUnlockProductionCost();
  const [directCost, setDirectCost] = useState("");
  const [overheadCost, setOverheadCost] = useState("");

  return (
    <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50/60 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-black text-[#263544]/70 flex items-center gap-2">
          <Calculator size={15} className="text-[#C89355]" /> تكلفة الدفعة
        </p>
        {cost ? (
          cost.isLocked ? (
            <Button
              variant="ghost"
              onClick={() => unlock.mutate(batchId)}
              loading={unlock.isPending}
            >
              <Unlock size={14} /> فتح القفل
            </Button>
          ) : (
            <Button variant="ghost" onClick={() => lock.mutate(batchId)} loading={lock.isPending}>
              <Lock size={14} /> قفل التكلفة
            </Button>
          )
        ) : null}
      </div>

      {cost ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Fact label="تكلفة المواد" value={fmtMoney(cost.materialCost, 0)} />
            <Fact label="تكاليف مباشرة" value={fmtMoney(cost.directCost, 0)} />
            <Fact label="تكاليف إضافية" value={fmtMoney(cost.overheadCost, 0)} />
            <Fact label="تكلفة الوحدة" value={fmtMoney(cost.unitActualCost, 0)} />
          </div>
          <p className="text-[11px] font-bold text-[#263544]/55 mt-3">
            الكمية السليمة {fmtInt(cost.goodQty)} · الهدر {fmtInt(cost.wasteQty)} · المعيب{" "}
            {fmtInt(cost.defectiveQty)} · العملة {cost.currency}
            {cost.exchangeRate > 0
              ? ` · سعر الصرف ${cost.exchangeRate}${
                  cost.exchangeRateDate ? ` بتاريخ ${cost.exchangeRateDate}` : ""
                }`
              : ""}
          </p>
        </>
      ) : (
        <>
          <p className="text-[11px] font-bold text-[#263544]/55 mb-3">
            لم تُحتسب التكلفة بعد. الاحتساب لا يُحتسب مرتين — إعادة التشغيل تستبدل
            الأرقام.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="تكلفة مباشرة إضافية">
              <input
                type="number"
                min={0}
                value={directCost}
                onChange={(e) => setDirectCost(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="تكاليف إضافية مشتركة">
              <input
                type="number"
                min={0}
                value={overheadCost}
                onChange={(e) => setOverheadCost(e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
          <div className="mt-3 flex justify-end">
            <Button
              onClick={() =>
                calculate.mutate({
                  batchId,
                  directCost: directCost ? Number(directCost) : undefined,
                  overheadCost: overheadCost ? Number(overheadCost) : undefined,
                })
              }
              loading={calculate.isPending}
            >
              <Calculator size={15} /> احتساب التكلفة
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Return stage modal
// ─────────────────────────────────────────────────────────────────────────────

function ReturnStageModal({
  batchId,
  stages,
  onClose,
}: {
  batchId: string;
  stages: ProductionStageView[];
  onClose: () => void;
}) {
  const [stageType, setStageType] = useState<ProductionStageType>("CUTTING");
  const [reason, setReason] = useState("");
  const returnStage = useReturnProductionStage();

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      dir="rtl"
    >
      <div className="bg-white rounded-[2rem] w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-black text-[#263544] flex items-center gap-2">
            <RotateCcw size={18} className="text-amber-600" /> إرجاع الدفعة
          </h2>
          <button onClick={onClose} className="text-[#263544]/40">
            <X size={20} />
          </button>
        </div>

        <p className="text-[11px] font-bold text-[#263544]/60 mb-3">
          الإرجاع عملية موثّقة: تُصفَّر المراحل التي تلي المرحلة المطلوبة وتُسجَّل
          في سجل التدقيق. لا يمكن التراجع عن الكميات بصمت.
        </p>

        <Field label="العودة إلى مرحلة">
          <select
            value={stageType}
            onChange={(e) => setStageType(e.target.value as ProductionStageType)}
            className={inputClass}
          >
            {stages.map((s) => (
              <option key={s.stageType} value={s.stageType}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>

        <div className="mt-3">
          <Field label="سبب الإرجاع (إلزامي)">
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className={inputClass}
              placeholder="مثال: خطأ في الخياطة — إعادة القطع"
            />
          </Field>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            إلغاء
          </Button>
          <Button
            variant="danger"
            loading={returnStage.isPending}
            disabled={!reason.trim()}
            onClick={async () => {
              await returnStage.mutateAsync({ batchId, stageType, reason: reason.trim() });
              onClose();
            }}
          >
            <RotateCcw size={15} /> تأكيد الإرجاع
          </Button>
        </div>
      </div>
    </div>
  );
}
