"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2, Circle, ArrowRight, ArrowLeft, Warehouse, Package,
  Factory, Layers, DollarSign, Tag, ClipboardCheck, Rocket, Settings2,
} from "lucide-react";
import {
  useWmsSetupState, useSaveSetupStep, useGoToSetupStep, useCompleteSetup,
} from "@/hooks/useRepresentatives";
import { Button, Field, Loading, inputClass } from "@/components/wms/primitives";
import apiClient from "@/lib/api-client";
import { toast } from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

const STEP_ICONS = [Warehouse, Package, Factory, Layers, DollarSign, Tag, ClipboardCheck, Rocket];
const STEP_COLORS = ["#3b82f6","#10b981","#f59e0b","#8b5cf6","#ef4444","#C89355","#14b8a6","#22c55e"];

export default function WmsSetupPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: state, isLoading } = useWmsSetupState();
  const saveStep = useSaveSetupStep();
  const goTo = useGoToSetupStep();
  const complete = useCompleteSetup();

  const [form, setForm] = useState<Record<string, string>>({});

  if (isLoading || !state) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f0f4f8] to-[#e8edf2]">
      <Loading label="جارٍ تحميل حالة الإعداد..." />
    </div>
  );

  if (state.isCompleted) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f0f4f8] to-[#e8edf2] p-6">
      <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] border-2 border-white shadow-2xl p-10 max-w-md w-full text-center">
        <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 size={40} className="text-emerald-600" />
        </div>
        <h1 className="text-2xl font-black text-[#263544] mb-2">WMS جاهز للعمل</h1>
        <p className="text-sm font-bold text-[#263544]/60 mb-8">تم إكمال إعداد النظام بنجاح. يمكنك الآن استخدام كل وظائف WMS.</p>
        <div className="flex flex-col gap-3">
          <Button onClick={() => router.push("/inventory")} className="w-full">
            <Package size={16} /> دخول المخزن
          </Button>
          <Button variant="ghost" onClick={() => router.push("/wms/production")} className="w-full">
            <Factory size={16} /> إدارة الإنتاج
          </Button>
        </div>
      </div>
    </div>
  );

  const currentStep = state.currentStep;
  const steps = state.steps;
  const progress = Math.round(((steps.filter(s => s.completed).length) / state.totalSteps) * 100);

  const handleNext = async () => {
    if (currentStep === state.totalSteps) {
      await complete.mutateAsync(undefined as unknown as void);
      return;
    }
    // Validate step before saving
    try {
      await saveStep.mutateAsync({ step: currentStep, data: { confirmed: true, ...form } });
    } catch {
      // Error handled by mutation
    }
  };

  const handleBack = () => {
    if (currentStep > 1) goTo.mutate(currentStep - 1);
  };

  const step = steps.find(s => s.step === currentStep);
  const Icon = STEP_ICONS[(currentStep - 1)] ?? Circle;
  const color = STEP_COLORS[(currentStep - 1)] ?? "#C89355";

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f0f4f8] to-[#e8edf2] flex flex-col items-center justify-center p-4 sm:p-8" dir="rtl">

      {/* Header */}
      <div className="w-full max-w-3xl mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Settings2 size={22} className="text-[#C89355]" />
          <h1 className="text-xl font-black text-[#263544]">إعداد نظام WMS</h1>
        </div>
        <p className="text-sm font-bold text-[#263544]/50">
          أكمل الخطوات التالية لبدء استخدام المخزن والتصنيع والمبيعات
        </p>
      </div>

      {/* Progress Bar */}
      <div className="w-full max-w-3xl mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-black text-[#263544]/60">الخطوة {currentStep} من {state.totalSteps}</span>
          <span className="text-xs font-black text-[#C89355]">{progress}% مكتمل</span>
        </div>
        <div className="h-2.5 bg-[#263544]/10 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${progress}%`, backgroundColor: color }}
          />
        </div>
      </div>

      {/* Step Dots */}
      <div className="w-full max-w-3xl flex items-center gap-1 mb-8 overflow-x-auto pb-2">
        {steps.map((s) => {
          const StepIcon = STEP_ICONS[(s.step - 1)] ?? Circle;
          const isActive = s.step === currentStep;
          const isDone = s.completed;
          return (
            <button
              key={s.step}
              onClick={() => s.completed || s.step <= currentStep ? goTo.mutate(s.step) : null}
              disabled={s.step > currentStep && !s.completed}
              className={`flex-1 min-w-[60px] flex flex-col items-center gap-1.5 p-2 rounded-2xl transition-all
                ${isActive ? "bg-white/90 shadow-md" : isDone ? "bg-emerald-50" : "opacity-40"}
              `}
            >
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: isDone ? "#10b981" : isActive ? color : "#263544" }}
              >
                {isDone
                  ? <CheckCircle2 size={16} className="text-white" />
                  : <StepIcon size={14} className="text-white" />
                }
              </div>
              <span className="text-[10px] font-black text-[#263544] text-center leading-tight hidden sm:block">
                {s.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Step Content */}
      <div className="w-full max-w-3xl bg-white/70 backdrop-blur-xl rounded-[2.5rem] border-2 border-white shadow-2xl overflow-hidden">
        {/* Step Header */}
        <div className="p-8 border-b border-white/80 flex items-center gap-5">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
            style={{ backgroundColor: color }}
          >
            <Icon size={28} className="text-white" />
          </div>
          <div>
            <p className="text-xs font-black text-[#263544]/50 uppercase tracking-wide mb-1">
              الخطوة {currentStep}
            </p>
            <h2 className="text-xl font-black text-[#263544]">{step?.label}</h2>
            {step?.prefilled && (
              <span className="text-xs font-bold text-emerald-600">✓ تم اكتشاف بيانات موجودة</span>
            )}
          </div>
        </div>

        {/* Step Body */}
        <div className="p-8">
          <StepBody
            step={currentStep}
            form={form}
            setForm={setForm}
            onRefresh={() => void qc.invalidateQueries({ queryKey: queryKeys.wmsSetup.all })}
          />
        </div>

        {/* Navigation */}
        <div className="p-6 border-t border-white/80 bg-white/30 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={currentStep === 1}
          >
            <ArrowRight size={16} /> رجوع
          </Button>

          <div className="flex items-center gap-2">
            {step?.completed && (
              <span className="text-xs font-black text-emerald-600 flex items-center gap-1">
                <CheckCircle2 size={14} /> مكتملة
              </span>
            )}
            <Button
              onClick={handleNext}
              loading={saveStep.isPending || complete.isPending}
            >
              {currentStep === state.totalSteps ? (
                <><Rocket size={16} /> دخول WMS</>
              ) : (
                <><ArrowLeft size={16} /> التالي</>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step Body: renders different content per step
// ─────────────────────────────────────────────────────────────────────────────

function StepBody({
  step,
  form,
  setForm,
  onRefresh,
}: {
  step: number;
  form: Record<string, string>;
  setForm: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onRefresh: () => void;
}) {
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  switch (step) {
    case 1: return <Step1Warehouse />;
    case 2: return <Step2RawMaterials form={form} set={set} onRefresh={onRefresh} />;
    case 3: return <Step3FinishedProducts form={form} set={set} onRefresh={onRefresh} />;
    case 4: return <Step4BOM />;
    case 5: return <Step5Cost />;
    case 6: return <Step6Pricing />;
    case 7: return <Step7Review />;
    case 8: return <Step8Enter />;
    default: return <div className="text-center py-8 text-[#263544]/50 font-bold">خطوة غير معروفة</div>;
  }
}

function Step1Warehouse() {
  const [warehouses, setWarehouses] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [loaded, setLoaded] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", address: "" });

  useState(() => {
    apiClient.get("/inventory/warehouses").then(r => {
      setWarehouses((r.data as { data?: unknown[] }).data as Array<{ id: string; name: string; code: string }> ?? []);
      setLoaded(true);
    }).catch(() => setLoaded(true));
  });

  const create = async () => {
    if (!form.name || !form.code) return toast.error("الاسم والكود مطلوبان");
    setCreating(true);
    try {
      await apiClient.post("/inventory/warehouses", form);
      toast.success("تم إنشاء المخزن");
      const r = await apiClient.get("/inventory/warehouses");
      setWarehouses((r.data as { data?: unknown[] }).data as Array<{ id: string; name: string; code: string }> ?? []);
    } catch { toast.error("فشل إنشاء المخزن"); }
    finally { setCreating(false); }
  };

  if (!loaded) return <Loading />;
  return (
    <div className="space-y-6">
      <p className="text-sm font-bold text-[#263544]/70">
        نظام الإدارة يعمل بمخزن واحد. تأكد من وجود مخزن رئيسي لبدء العمل.
      </p>
      {warehouses.length > 0 ? (
        <div className="space-y-2">
          {warehouses.map(w => (
            <div key={w.id} className="flex items-center gap-3 p-4 bg-emerald-50 rounded-2xl border border-emerald-200">
              <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
              <div>
                <p className="font-black text-[#263544]">{w.name}</p>
                <p className="text-xs font-bold text-[#263544]/50">كود: {w.code}</p>
              </div>
            </div>
          ))}
          <p className="text-xs font-bold text-emerald-700 bg-emerald-50 p-3 rounded-xl">
            ✓ المخزن موجود — يمكنك المتابعة للخطوة التالية
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm font-bold text-amber-700 bg-amber-50 p-3 rounded-xl border border-amber-200">
            لا يوجد مخزن حتى الآن. أنشئ واحداً للمتابعة.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <Field label="اسم المخزن">
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className={inputClass} placeholder="المخزن الرئيسي" />
            </Field>
            <Field label="كود المخزن">
              <input value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} className={inputClass} placeholder="WH-A" />
            </Field>
            <Field label="العنوان (اختياري)">
              <input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} className={`${inputClass} col-span-2`} />
            </Field>
          </div>
          <Button onClick={create} loading={creating}>
            <Warehouse size={16} /> إنشاء المخزن
          </Button>
        </div>
      )}
    </div>
  );
}

function Step2RawMaterials({ form, set, onRefresh }: { form: Record<string, string>; set: (k: string, v: string) => void; onRefresh: () => void }) {
  const [count, setCount] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [local, setLocal] = useState({ sku: "", name: "", unit: "متر", costPrice: "" });

  useEffect(() => {
    apiClient.get("/inventory/products?productType=RAW_MATERIAL&limit=1").then(r => {
      setCount((r.data as { total?: number }).total ?? 0);
    }).catch(() => setCount(0));
  }, []);

  const add = async () => {
    if (!local.sku || !local.name || !local.costPrice) return toast.error("SKU والاسم والتكلفة مطلوبة");
    setAdding(true);
    try {
      await apiClient.post("/inventory/products", { ...local, costPrice: Number(local.costPrice), unitPrice: Number(local.costPrice), category: "مواد خام", productType: "RAW_MATERIAL" });
      toast.success("تمت إضافة المادة");
      const r = await apiClient.get("/inventory/products?productType=RAW_MATERIAL&limit=1");
      setCount((r.data as { total?: number }).total ?? 0);
      setLocal({ sku: "", name: "", unit: "متر", costPrice: "" });
      onRefresh();
    } catch { toast.error("فشل إضافة المادة"); }
    finally { setAdding(false); }
  };

  return (
    <div className="space-y-5">
      <p className="text-sm font-bold text-[#263544]/70">أضف المواد الخام التي تستخدمها في الإنتاج (أقمشة، خيوط، أزرار...).</p>
      {count !== null && (
        <div className={`p-3 rounded-xl text-sm font-bold ${count > 0 ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
          {count > 0 ? `✓ ${count} مادة خام موجودة` : "لا توجد مواد خام بعد"}
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <Field label="كود المادة (SKU)"><input value={local.sku} onChange={e => setLocal(p => ({ ...p, sku: e.target.value }))} className={inputClass} placeholder="RM-001" /></Field>
        <Field label="الاسم"><input value={local.name} onChange={e => setLocal(p => ({ ...p, name: e.target.value }))} className={inputClass} placeholder="قماش قطني" /></Field>
        <Field label="الوحدة">
          <select value={local.unit} onChange={e => setLocal(p => ({ ...p, unit: e.target.value }))} className={inputClass}>
            {["متر","كغ","قطعة","لتر","علبة","رزمة"].map(u => <option key={u}>{u}</option>)}
          </select>
        </Field>
        <Field label="تكلفة الوحدة (ل.س)"><input type="number" value={local.costPrice} onChange={e => setLocal(p => ({ ...p, costPrice: e.target.value }))} className={inputClass} /></Field>
      </div>
      <Button onClick={add} loading={adding}><Package size={16} /> إضافة مادة</Button>
    </div>
  );
}

function Step3FinishedProducts({ form, set, onRefresh }: { form: Record<string, string>; set: (k: string, v: string) => void; onRefresh: () => void }) {
  const [count, setCount] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [local, setLocal] = useState({ sku: "", name: "", unit: "قطعة", unitPrice: "" });

  useEffect(() => {
    apiClient.get("/inventory/products?productType=FINISHED&limit=1").then(r => {
      setCount((r.data as { total?: number }).total ?? 0);
    }).catch(() => setCount(0));
  }, []);

  const add = async () => {
    if (!local.sku || !local.name) return toast.error("SKU والاسم مطلوبان");
    setAdding(true);
    try {
      await apiClient.post("/inventory/products", { ...local, unitPrice: Number(local.unitPrice) || 0, costPrice: 0, category: "منتجات نهائية", productType: "FINISHED" });
      toast.success("تمت إضافة المنتج");
      const r = await apiClient.get("/inventory/products?productType=FINISHED&limit=1");
      setCount((r.data as { total?: number }).total ?? 0);
      setLocal({ sku: "", name: "", unit: "قطعة", unitPrice: "" });
      onRefresh();
    } catch { toast.error("فشل إضافة المنتج"); }
    finally { setAdding(false); }
  };

  return (
    <div className="space-y-5">
      <p className="text-sm font-bold text-[#263544]/70">أضف المنتجات النهائية التي تصنعها (ستربطها بالمواد الخام في الخطوة التالية).</p>
      {count !== null && (
        <div className={`p-3 rounded-xl text-sm font-bold ${count > 0 ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
          {count > 0 ? `✓ ${count} منتج نهائي موجود` : "لا توجد منتجات نهائية بعد"}
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <Field label="كود المنتج (SKU)"><input value={local.sku} onChange={e => setLocal(p => ({ ...p, sku: e.target.value }))} className={inputClass} placeholder="FP-001" /></Field>
        <Field label="الاسم"><input value={local.name} onChange={e => setLocal(p => ({ ...p, name: e.target.value }))} className={inputClass} placeholder="قميص قطني" /></Field>
        <Field label="الوحدة"><input value={local.unit} onChange={e => setLocal(p => ({ ...p, unit: e.target.value }))} className={inputClass} /></Field>
        <Field label="سعر البيع الأولي (ل.س)"><input type="number" value={local.unitPrice} onChange={e => setLocal(p => ({ ...p, unitPrice: e.target.value }))} className={inputClass} /></Field>
      </div>
      <Button onClick={add} loading={adding}><Factory size={16} /> إضافة منتج</Button>
    </div>
  );
}

function Step4BOM() {
  return (
    <div className="space-y-4">
      <p className="text-sm font-bold text-[#263544]/70">
        قائمة المواد (BOM) تحدد ماذا تحتاج من مواد خام لإنتاج وحدة واحدة من كل منتج.
      </p>
      <div className="p-4 bg-sky-50 rounded-2xl border border-sky-200">
        <p className="text-sm font-black text-sky-800 mb-2">📋 مثال:</p>
        <ul className="text-sm font-bold text-sky-700 space-y-1 list-disc list-inside">
          <li>قميص قطني ← 1.8 متر قماش + 35 متر خيط + 8 أزرار</li>
        </ul>
      </div>
      <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200">
        <p className="text-sm font-bold text-amber-800">
          🔧 لإنشاء BOM، انتقل بعد الإعداد إلى: <strong>WMS → الإنتاج → قوائم المواد</strong>
        </p>
      </div>
      <p className="text-xs font-bold text-[#263544]/50">
        إذا كانت لديك BOMs موجودة، اضغط التالي للمتابعة.
      </p>
    </div>
  );
}

function Step5Cost() {
  return (
    <div className="space-y-4">
      <p className="text-sm font-bold text-[#263544]/70">
        التكلفة تُحسب تلقائياً من مواد الـBOM. يمكنك إضافة تكاليف إضافية عند إنشاء أمر الإنتاج.
      </p>
      <div className="grid grid-cols-2 gap-3">
        {["تكلفة المواد الخام","تكلفة العمالة","التكاليف العامة","تكلفة التغليف"].map((item, i) => (
          <div key={i} className="p-4 bg-white/60 rounded-2xl border border-white/80 flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-[#C89355]" />
            <span className="text-sm font-bold text-[#263544]">{item}</span>
          </div>
        ))}
      </div>
      <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
        <p className="text-sm font-bold text-emerald-700">
          ✓ النظام يحسب تكلفة الوحدة تلقائياً = إجمالي التكاليف ÷ عدد الوحدات المنتجة
        </p>
      </div>
    </div>
  );
}

function Step6Pricing() {
  const [products, setProducts] = useState<Array<{ id: string; sku: string; name: string; costPrice: number; unitPrice: number }>>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [prices, setPrices] = useState<Record<string, string>>({});

  useEffect(() => {
    apiClient.get("/inventory/products?productType=FINISHED&limit=50").then(r => {
      const data = (r.data as { data?: unknown[] }).data as typeof products ?? [];
      setProducts(data);
      const init: Record<string, string> = {};
      data.forEach(p => { init[p.sku] = String(p.unitPrice || ""); });
      setPrices(init);
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, []);

  const save = async (product: { id: string; sku: string }) => {
    const price = Number(prices[product.sku]);
    if (!price || price <= 0) return toast.error("أدخل سعراً صحيحاً");
    setSaving(product.sku);
    try {
      await apiClient.put(`/inventory/products/${product.id}`, { unitPrice: price });
      toast.success("تم حفظ السعر");
      const r = await apiClient.get("/inventory/products?productType=FINISHED&limit=50");
      setProducts((r.data as { data?: unknown[] }).data as typeof products ?? []);
    } catch { toast.error("فشل حفظ السعر"); }
    finally { setSaving(null); }
  };

  if (!loaded) return <Loading />;
  return (
    <div className="space-y-4">
      <p className="text-sm font-bold text-[#263544]/70">حدد سعر البيع لكل منتج نهائي. سيحسب النظام هامش الربح تلقائياً.</p>
      {products.length === 0 ? (
        <p className="text-sm font-bold text-amber-700 bg-amber-50 p-3 rounded-xl border border-amber-200">لا توجد منتجات نهائية — عد للخطوة 3</p>
      ) : (
        <div className="space-y-3">
          {products.map(p => {
            const cost = Number(p.costPrice);
            const price = Number(prices[p.sku] ?? p.unitPrice);
            const margin = price > 0 && cost > 0 ? (((price - cost) / price) * 100).toFixed(1) : null;
            return (
              <div key={p.sku} className="p-4 bg-white/60 rounded-2xl border border-white/80">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p className="font-black text-[#263544]">{p.name}</p>
                    <p className="text-xs font-bold text-[#263544]/50">{p.sku}</p>
                    {cost > 0 && <p className="text-xs font-bold text-sky-700 mt-1">التكلفة: {cost.toLocaleString("ar-SY")} ل.س</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={prices[p.sku] ?? ""}
                      onChange={e => setPrices(prev => ({ ...prev, [p.sku]: e.target.value }))}
                      className={`${inputClass} w-36`}
                      placeholder="سعر البيع"
                    />
                    <Button onClick={() => save(p)} loading={saving === p.sku}>حفظ</Button>
                  </div>
                </div>
                {margin && <p className="text-xs font-bold text-emerald-700 mt-2">هامش الربح: {margin}%</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Step7Review() {
  const [summary, setSummary] = useState<{
    warehouses: number; rawMaterials: number; finishedProducts: number; boms: number;
  } | null>(null);

  useEffect(() => {
    Promise.all([
      apiClient.get("/inventory/warehouses"),
      apiClient.get("/inventory/products?productType=RAW_MATERIAL&limit=1"),
      apiClient.get("/inventory/products?productType=FINISHED&limit=1"),
      apiClient.get("/manufacturing/summary"),
    ]).then(([w, rm, fp, mfg]) => {
      setSummary({
        warehouses: (w.data as { total?: number }).total ?? 0,
        rawMaterials: (rm.data as { total?: number }).total ?? 0,
        finishedProducts: (fp.data as { total?: number }).total ?? 0,
        boms: (mfg.data as { totalActiveBOMs?: number }).totalActiveBOMs ?? 0,
      });
    }).catch(() => setSummary({ warehouses: 0, rawMaterials: 0, finishedProducts: 0, boms: 0 }));
  }, []);

  if (!summary) return <Loading />;
  const items = [
    { label: "المخازن", value: summary.warehouses, ok: summary.warehouses > 0 },
    { label: "المواد الخام", value: summary.rawMaterials, ok: summary.rawMaterials > 0 },
    { label: "المنتجات النهائية", value: summary.finishedProducts, ok: summary.finishedProducts > 0 },
    { label: "قوائم المواد (BOM)", value: summary.boms, ok: summary.boms > 0 },
  ];
  const allGood = items.every(i => i.ok);
  return (
    <div className="space-y-4">
      <p className="text-sm font-bold text-[#263544]/70">مراجعة سريعة قبل دخول WMS:</p>
      <div className="grid grid-cols-2 gap-3">
        {items.map((item) => (
          <div key={item.label} className={`p-4 rounded-2xl border flex items-center gap-3 ${item.ok ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
            {item.ok ? <CheckCircle2 size={18} className="text-emerald-600 shrink-0" /> : <Circle size={18} className="text-red-400 shrink-0" />}
            <div>
              <p className="text-xs font-black text-[#263544]/60">{item.label}</p>
              <p className={`text-xl font-black tabular-nums ${item.ok ? "text-emerald-700" : "text-red-600"}`}>{item.value}</p>
            </div>
          </div>
        ))}
      </div>
      {allGood ? (
        <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200">
          <p className="text-sm font-black text-emerald-700">🎉 كل شيء جاهز! اضغط التالي لدخول WMS.</p>
        </div>
      ) : (
        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200">
          <p className="text-sm font-bold text-amber-700">⚠️ بعض الخطوات غير مكتملة. يمكنك المتابعة لكن بعض الوظائف قد لا تعمل.</p>
        </div>
      )}
    </div>
  );
}

function Step8Enter() {
  return (
    <div className="text-center space-y-6 py-4">
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#C89355] to-[#8a5f2a] flex items-center justify-center mx-auto shadow-lg">
        <Rocket size={36} className="text-white" />
      </div>
      <div>
        <h3 className="text-xl font-black text-[#263544] mb-2">نظام WMS جاهز!</h3>
        <p className="text-sm font-bold text-[#263544]/60 max-w-sm mx-auto">
          تم إعداد النظام بنجاح. اضغط الزر أدناه لإنهاء الإعداد وبدء استخدام WMS.
        </p>
      </div>
      <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto text-center">
        {["المخزن","التصنيع","المندوبين"].map((f,i) => (
          <div key={i} className="p-3 bg-white/60 rounded-2xl border border-white/80">
            <p className="text-xs font-black text-[#263544]/60">{f}</p>
            <p className="text-sm font-black text-emerald-600 mt-1">✓ جاهز</p>
          </div>
        ))}
      </div>
    </div>
  );
}
