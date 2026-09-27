"use client";
import { useState } from "react";
import {
  Users, Plus, UserCheck, Package, DollarSign, Eye,
  ArrowDownToLine, Send, X, ShieldAlert,
} from "lucide-react";
import {
  Pill, Button, Field, Loading, Empty,
  fmtMoney, fmtInt, inputClass,
} from "@/components/wms/primitives";
import {
  useRepresentatives, useRepresentative,
  useCreateRepresentative,
  useAssignCustomers, useCreateAndAssignCustomer, useAssignProducts, useTransferStock,
  useApproveSettlement, useRepSettlements, useEmployeeOptions,
  type Representative,
} from "@/hooks/useRepresentatives";
import { useCustomers } from "@/hooks/useWms";
import { useInventory } from "@/hooks/useInventory";
import apiClient from "@/lib/api-client";
import EntityCustomFieldsForm from "@/components/EntityCustomFieldsForm";
import { toast } from "react-hot-toast";
import { useAuthStore } from "@/stores/auth-store";

const STATUS_TONE: Record<string, "green"|"red"|"amber"|"slate"> = {
  active: "green", inactive: "red", suspended: "amber",
};
const STATUS_LABEL: Record<string, string> = {
  active: "نشط", inactive: "غير نشط", suspended: "موقوف",
};

function repInitials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  if (parts.length === 1) return parts[0].slice(0, 2);
  return parts[0][0] + (parts[1]?.[0] ?? "");
}

export default function RepresentativesAdminPage() {
  const roles = useAuthStore((state) => state.user?.roles);
  const role = useAuthStore((state) => state.user?.role);
  const isAdmin = roles?.includes("admin") || role === "admin" || roles?.includes("superadmin") || role === "superadmin";
  const { data, isLoading } = useRepresentatives();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedRepId, setSelectedRepId] = useState<string | null>(null);

  if (!isAdmin) {
    return (
      <main className="p-2" dir="rtl">
        <div className="mx-auto max-w-md rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
            <ShieldAlert size={26} aria-hidden="true" />
          </div>
          <h1 className="mb-1 text-lg font-black text-[#263544]">هذه الصفحة للمسؤول فقط</h1>
          <p className="text-sm text-slate-500">لا تملك صلاحية إدارة المندوبين.</p>
        </div>
      </main>
    );
  }

  const reps = data?.data ?? [];

  const totalStockValue = reps.reduce((s, r) => s + (r.summary?.stockValue ?? 0), 0);
  const totalOutstanding = reps.reduce((s, r) => s + (r.summary?.outstanding ?? 0), 0);
  const activeCount = reps.filter(r => r.status === "active").length;

  return (
    <div dir="rtl" className="w-full max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      {/* ── Dark brand header banner ── */}
      <header className="relative overflow-hidden bg-gradient-to-l from-[#1a2530] to-[#263544] rounded-[2.5rem] px-6 md:px-10 py-7 md:py-9 border border-[#C89355]/40 shadow-[0_30px_60px_-20px_rgba(38,53,68,0.5)] outline outline-dashed outline-1 outline-[#C89355]/40 -outline-offset-4">
        <div className="absolute -left-12 top-1/2 -translate-y-1/2 w-56 h-56 rounded-full bg-[#C89355]/10 blur-3xl pointer-events-none" />
        <div className="absolute right-8 bottom-4 w-32 h-32 rounded-full bg-[#C89355]/5 blur-2xl pointer-events-none" />
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#C89355]/15 border border-[#C89355]/40 flex items-center justify-center shadow-inner">
              <Users size={26} className="text-[#C89355]" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-white drop-shadow-md">إدارة المندوبين</h1>
              <p className="text-xs md:text-sm font-bold text-[#C89355] mt-1">
                توزيع البضاعة، تتبع المبيعات والتحصيلات، اعتماد التسويات
              </p>
            </div>
          </div>
          <Button
            onClick={() => setShowCreate(true)}
            className="!bg-[#C89355] !text-[#1a2530] hover:!bg-[#b9844e] text-sm font-black px-6 py-3 rounded-2xl shadow-[0_10px_20px_rgba(200,147,85,0.35)] border-0"
          >
            <Plus size={16} /> مندوب جديد
          </Button>
        </div>
      </header>

      {/* ── KPI row ── */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        <KpiCard label="المندوبون النشطون" value={fmtInt(activeCount)} icon={<UserCheck size={18} />} tone="gold" />
        <KpiCard label="إجمالي المندوبين" value={fmtInt(reps.length)} icon={<Users size={18} />} />
        <KpiCard label="قيمة المخزون الموزع" value={`${fmtMoney(totalStockValue, 0)} ل.س`} icon={<Package size={18} />} />
        <KpiCard
          label="مستحق التحصيل"
          value={`${fmtMoney(totalOutstanding, 0)} ل.س`}
          icon={<DollarSign size={18} />}
          tone="alert"
          pulse={totalOutstanding > 0}
        />
      </section>

      {/* ── Rep cards ── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <UserCheck size={18} className="text-[#C89355]" />
          <h2 className="text-lg font-black text-[#263544]">قائمة المندوبين</h2>
          <span className="text-xs font-bold text-slate-400">({reps.length})</span>
        </div>

        {isLoading ? (
          <div className="bg-white/50 backdrop-blur-2xl rounded-[2.5rem] border-2 border-dashed border-[#C89355]/50 p-12">
            <Loading />
          </div>
        ) : !reps.length ? (
          <Empty message="لا يوجد مندوبون — أضف مندوباً جديداً" />
        ) : (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {reps.map(rep => (
              <RepCard key={rep.id} rep={rep} onManage={() => setSelectedRepId(rep.id)} />
            ))}
          </div>
        )}
      </section>

      {/* Modals / Drawer */}
      {showCreate && <CreateRepModal onClose={() => setShowCreate(false)} />}
      {selectedRepId && <RepManageDrawer repId={selectedRepId} onClose={() => setSelectedRepId(null)} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// KPI Card
// ─────────────────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, icon, tone = "neutral", pulse = false,
}: {
  label: string; value: string; icon: React.ReactNode; tone?: "neutral" | "gold" | "alert"; pulse?: boolean;
}) {
  const chip =
    tone === "alert"
      ? "bg-rose-500/10 text-rose-600 border-rose-200"
      : tone === "gold"
        ? "bg-[#C89355]/10 text-[#C89355] border-[#C89355]/30"
        : "bg-[#263544]/[0.06] text-[#263544] border-[#263544]/10";

  return (
    <article className="relative bg-white/60 backdrop-blur-2xl rounded-[2rem] border-2 border-white/90 shadow-[0_15px_40px_rgba(38,53,68,0.08)] p-5 overflow-hidden transition-all hover:shadow-[0_20px_50px_rgba(38,53,68,0.14)]">
      <div className="absolute inset-1.5 rounded-[1.7rem] border border-dashed border-[#C89355]/25 pointer-events-none" />
      <div className="relative flex items-center gap-4">
        <div className={`w-12 h-12 shrink-0 rounded-2xl border flex items-center justify-center shadow-sm ${chip}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-black text-[#263544]/50">{label}</p>
          <p className="text-xl md:text-2xl font-black text-[#263544] tabular-nums mt-1 truncate">
            {value}
          </p>
        </div>
      </div>
      {pulse && (
        <span className="absolute top-4 left-4 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
        </span>
      )}
    </article>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Representative Card
// ─────────────────────────────────────────────────────────────────────────────

function RepCard({ rep, onManage }: { rep: Representative; onManage: () => void }) {
  const { data: settlements } = useRepSettlements(rep.id);
  const approveSettlement = useApproveSettlement();
  const pending = settlements?.filter(s => s.status === "SUBMITTED") ?? [];
  const s = rep.summary;
  const outstanding = s?.outstanding ?? 0;

  const num = (label: string, value: number | undefined, extra = "") => (
    <div className="rounded-2xl bg-white/70 border border-white/90 px-3 py-2.5 shadow-sm">
      <p className="text-[10px] font-black text-[#263544]/45">{label}</p>
      <p className="text-sm font-black text-[#263544] tabular-nums mt-0.5 truncate">
        {fmtMoney(value ?? 0, 0)} {extra}
      </p>
    </div>
  );

  return (
    <article className="group relative bg-white/60 backdrop-blur-2xl rounded-[2rem] border-2 border-white/90 shadow-[0_15px_40px_rgba(38,53,68,0.08)] p-5 overflow-hidden transition-all hover:shadow-[0_22px_55px_rgba(38,53,68,0.15)] flex flex-col">
      <div className="absolute inset-1.5 rounded-[1.7rem] border border-dashed border-[#C89355]/25 pointer-events-none transition-colors group-hover:border-[#C89355]/50" />

      {/* Header */}
      <div className="relative flex items-center gap-3">
        <div className="w-12 h-12 shrink-0 rounded-2xl bg-[#1a2530] border border-[#C89355]/40 flex items-center justify-center text-[#C89355] font-black text-base shadow-inner">
          {repInitials(rep.name)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-black text-[#263544] truncate">{rep.name}</p>
          <p className="text-[11px] font-bold text-[#263544]/40 truncate">
            {rep.code} · {rep.user?.username}
          </p>
        </div>
        <Pill tone={STATUS_TONE[rep.status] ?? "slate"}>{STATUS_LABEL[rep.status] ?? rep.status}</Pill>
      </div>

      {/* Numbers */}
      <div className="relative grid grid-cols-2 gap-2.5 mt-5">
        {num("قيمة المخزون", s?.stockValue)}
        {num("المبيعات", s?.totalSold)}
        {num("المحصّل", s?.totalCollected)}
        <div className="rounded-2xl bg-white/70 border border-white/90 px-3 py-2.5 shadow-sm">
          <p className="text-[10px] font-black text-[#263544]/45">المتبقي</p>
          <p className={`text-sm font-black tabular-nums mt-0.5 truncate ${outstanding > 0 ? "text-rose-600" : "text-emerald-600"}`}>
            {fmtMoney(outstanding, 0)} ل.س
          </p>
        </div>
      </div>

      {/* Pending settlements */}
      {pending.length > 0 && (
        <div className="relative mt-4 rounded-2xl bg-amber-50 border border-amber-200 p-3 space-y-2">
          <p className="text-xs font-black text-amber-700 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
            {pending.length} تسوية بانتظار الاعتماد
          </p>
          {pending.map(s => (
            <div key={s.id} className="flex items-center justify-between gap-2 text-[11px]">
              <span className="font-bold text-amber-800 truncate">
                {new Date(s.periodStart).toLocaleDateString("ar-SY")} — {new Date(s.periodEnd).toLocaleDateString("ar-SY")} · {fmtMoney(s.outstandingAmount, 0)} ل.س
              </span>
              <div className="flex shrink-0 gap-1.5">
                <button
                  onClick={() => approveSettlement.mutate({ id: s.id, approved: true })}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-black hover:bg-emerald-700 transition-colors"
                >
                  اعتماد
                </button>
                <button
                  onClick={() => approveSettlement.mutate({ id: s.id, approved: false })}
                  className="px-2.5 py-1 rounded-lg bg-rose-500 text-white text-[11px] font-black hover:bg-rose-600 transition-colors"
                >
                  رفض
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Manage */}
      <button
        onClick={onManage}
        className="relative mt-4 inline-flex items-center justify-center gap-2 rounded-2xl bg-[#1a2530] hover:bg-[#263544] text-[#C89355] text-sm font-black py-3 transition-all border border-[#C89355]/30 hover:border-[#C89355]/60 shadow-[0_10px_20px_rgba(38,53,68,0.3)] active:scale-[0.98]"
      >
        <Eye size={15} /> إدارة المندوب
      </button>
    </article>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Create Representative Modal
// ─────────────────────────────────────────────────────────────────────────────

function CreateRepModal({ onClose }: { onClose: () => void }) {
  const createRep = useCreateRepresentative();
  const { data: employees, isLoading: loadingEmployees } = useEmployeeOptions();
  const [form, setForm] = useState<{
    employeeId: string; userId: string; name: string; code: string;
    phone: string; email: string; notes: string;
  }>({ employeeId: "", userId: "", name: "", code: "", phone: "", email: "", notes: "" });
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, unknown>>({});

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const pickEmployee = (employeeId: string) => {
    const emp = (employees ?? []).find(e => e.id === employeeId);
    if (!emp) {
      setForm(p => ({ ...p, employeeId: "", userId: "", name: "", phone: "" }));
      return;
    }
    setForm(p => ({
      ...p,
      employeeId: emp.id,
      userId: emp.userId ?? "",
      name: emp.name || p.name,
      phone: emp.mobile ?? p.phone,
    }));
  };

  const handleSubmit = async () => {
    if (!form.employeeId || !form.userId) return toast.error("اختر الموظف المراد تحويله لمندوب");
    if (!form.code) return toast.error("كود المندوب مطلوب");
    const result = await createRep.mutateAsync({
      userId: form.userId,
      employeeId: form.employeeId,
      name: form.name,
      code: form.code,
      phone: form.phone || undefined,
      email: form.email || undefined,
      notes: form.notes || undefined,
    });
    const repId = (result as { id?: string } | undefined)?.id ?? "";
    if (repId && Object.keys(customFieldValues).length > 0) {
      await apiClient.post(`/customization/tenant/custom-field-values/representative/${repId}`, customFieldValues);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a1520]/70 backdrop-blur-md" dir="rtl">
      <div className="bg-white/90 backdrop-blur-xl rounded-[2.5rem] border-2 border-white shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="p-6 border-b border-white/80 bg-white/50 flex items-center justify-between">
          <h2 className="text-lg font-black text-[#263544] flex items-center gap-2">
            <UserCheck size={20} className="text-[#C89355]" /> مندوب جديد
          </h2>
          <button onClick={onClose} className="text-2xl text-[#263544]/40 font-black">×</button>
        </div>
        <div className="p-6 space-y-4">
          <Field label="الموظف (المندوب هو موظف بخاصية مندوب)">
            {loadingEmployees ? <Loading /> : (
              <select value={form.employeeId} onChange={e => pickEmployee(e.target.value)} className={inputClass}>
                <option value="">— اختر موظفاً (له حساب دخول) —</option>
                {employees?.map(e => (
                  <option key={e.id} value={e.id}>
                    {e.name} · {e.employeeId}{e.department ? ` · ${e.department}` : ""}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="الاسم الكامل">
              <input value={form.name} onChange={e => set("name", e.target.value)} className={inputClass} placeholder="أحمد محمد" />
            </Field>
            <Field label="كود المندوب">
              <input value={form.code} onChange={e => set("code", e.target.value)} className={inputClass} placeholder="REP-001" />
            </Field>
            <Field label="الهاتف">
              <input value={form.phone} onChange={e => set("phone", e.target.value)} className={inputClass} />
            </Field>
            <Field label="البريد الإلكتروني">
              <input value={form.email} onChange={e => set("email", e.target.value)} className={inputClass} />
            </Field>
          </div>
          <Field label="ملاحظات">
            <textarea value={form.notes} onChange={e => set("notes", e.target.value)} className={`${inputClass} h-20 resize-none`} />
          </Field>
          <EntityCustomFieldsForm entity="representative" onChange={setCustomFieldValues} />
        </div>
        <div className="p-6 border-t border-white/80 bg-white/40 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>إلغاء</Button>
          <Button onClick={handleSubmit} loading={createRep.isPending}>
            <Plus size={16} /> إنشاء المندوب
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// QuickAddCustomerForm (إضافة عميل جديد وربطه بالمندوب فوراً)
// ─────────────────────────────────────────────────────────────────────────────

function QuickAddCustomerForm({ repId }: { repId: string }) {
  const createAndAssign = useCreateAndAssignCustomer(repId);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl border-2 border-dashed border-[#C89355]/50 text-sm font-black text-[#C89355] hover:bg-[#C89355]/5 transition-colors"
      >
        <Plus size={16} /> إضافة عميل جديد وربطه بالمندوب
      </button>
    );
  }

  return (
    <form
      className="space-y-2 p-4 rounded-2xl bg-[#C89355]/5 border border-[#C89355]/30"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!name.trim()) return toast.error("اسم العميل مطلوب");
        await createAndAssign.mutateAsync({ name: name.trim(), phone: phone.trim() || undefined, address: address.trim() || undefined });
        setName(""); setPhone(""); setAddress(""); setOpen(false);
      }}
    >
      <p className="text-sm font-black text-[#263544]">عميل جديد لهذا المندوب</p>
      <Field label="اسم العميل *">
        <input value={name} onChange={e => setName(e.target.value)} className={inputClass} placeholder="مثال: محل النور" />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="الهاتف">
          <input value={phone} onChange={e => setPhone(e.target.value)} className={inputClass} placeholder="09xxxxxxxx" />
        </Field>
        <Field label="العنوان">
          <input value={address} onChange={e => setAddress(e.target.value)} className={inputClass} placeholder="المدينة - الشارع" />
        </Field>
      </div>
      <div className="flex gap-2">
        <Button type="submit" loading={createAndAssign.isPending} className="flex-1">
          <Plus size={16} /> إنشاء وربط
        </Button>
        <Button type="button" onClick={() => setOpen(false)} className="bg-white text-slate-600 ring-1 ring-slate-200">
          <X size={16} />
        </Button>
      </div>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Rep Manage Drawer (حساب المندوب بإدارة الأسهم، العملاء، المنتجات، التسليم)
// ─────────────────────────────────────────────────────────────────────────────

function RepManageDrawer({ repId, onClose }: { repId: string; onClose: () => void }) {
  const { data: rep, isLoading } = useRepresentative(repId);
  const [activeTab, setActiveTab] = useState<"stock"|"customers"|"products"|"transfer">("stock");
  const assignCustomers = useAssignCustomers(repId);
  const assignProducts = useAssignProducts(repId);
  const transferStock = useTransferStock(repId);

  const { data: customersData } = useCustomers();
  const { data: inventoryData } = useInventory({ limit: 200 });

  const allCustomers = (customersData?.data ?? []) as Array<{ id: string; name: string }>;
  const allProducts = (inventoryData?.items ?? []) as Array<{ sku: string; name: string; unit: string }>;

  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [seededRepId, setSeededRepId] = useState<string | null>(null);
  const [transferItems, setTransferItems] = useState<Record<string, string>>({});
  const [transferLocation, setTransferLocation] = useState("WH-A");

  // Seed the checkbox selections from the rep's assigned customers/products.
  // Done during render (React's documented "adjust state when a prop changes"
  // pattern) with a per-rep guard, not in an effect — the drawer remounts per
  // repId and rep data arrives async.
  if (rep && seededRepId !== rep.id) {
    setSeededRepId(rep.id);
    setSelectedCustomers(rep.customers?.map((c: { customerId: string }) => c.customerId) ?? []);
    setSelectedProducts(rep.products?.map((p: { sku: string }) => p.sku) ?? []);
  }

  const handleTransfer = async () => {
    const items = Object.entries(transferItems)
      .filter(([, qty]) => Number(qty) > 0)
      .map(([sku, qty]) => ({ sku, quantity: Number(qty) }));
    if (!items.length) return toast.error("أضف كمية لصنف واحد على الأقل");
    await transferStock.mutateAsync({ items, warehouseLocation: transferLocation });
    setTransferItems({});
    toast.success("تم تسليم البضاعة للمندوب");
  };

  const TABS = [
    { key: "stock", label: "المخزون الحالي", icon: Package },
    { key: "customers", label: "العملاء", icon: Users },
    { key: "products", label: "المنتجات", icon: Package },
    { key: "transfer", label: "تسليم بضاعة", icon: ArrowDownToLine },
  ] as const;

  return (
    // Right-anchored drawer (main-start in RTL = sidebar side).
    <div className="fixed inset-0 z-50 flex items-stretch justify-start bg-[#0a1520]/50 backdrop-blur-sm" dir="rtl" onClick={onClose}>
      <div
        className="w-full max-w-3xl h-full bg-white/95 backdrop-blur-xl shadow-2xl border border-white/60 flex flex-col overflow-hidden rounded-l-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative px-7 py-5 bg-gradient-to-l from-[#1a2530] to-[#263544] flex items-center justify-between border-b border-[#C89355]/30 overflow-hidden">
          <div className="absolute -left-8 top-1/2 -translate-y-1/2 w-40 h-40 rounded-full bg-[#C89355]/10 blur-3xl pointer-events-none" />
          <div className="relative flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#C89355]/15 border border-[#C89355]/40 flex items-center justify-center text-[#C89355] font-black text-lg">
              {rep ? repInitials(rep.name) : "…"}
            </div>
            <div>
              <h2 className="text-xl font-black text-white">{rep?.name ?? "جارٍ التحميل…"}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs font-bold text-[#C89355]">{rep?.code}</span>
                {rep && <Pill tone={STATUS_TONE[rep.status] ?? "slate"}>{STATUS_LABEL[rep.status] ?? rep.status}</Pill>}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="إغلاق"
            className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white/70 hover:text-white flex items-center justify-center transition-colors border border-white/10"
          >
            <X size={20} />
          </button>
        </div>

        {/* Summary Bar */}
        {rep?.summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-6 py-4 bg-[#263544]/[0.04] border-b border-[#263544]/10">
            {[
              { label: "قيمة المخزون", value: `${fmtMoney(rep.summary.stockValue, 0)} ل.س` },
              { label: "إجمالي المبيعات", value: `${fmtMoney(rep.summary.totalSold, 0)} ل.س` },
              { label: "المحصّل", value: `${fmtMoney(rep.summary.totalCollected, 0)} ل.س` },
              { label: "المتبقي", value: `${fmtMoney(rep.summary.outstanding, 0)} ل.س`, danger: rep.summary.outstanding > 0 },
            ].map(item => (
              <div key={item.label} className="rounded-2xl bg-white/80 border border-white/90 px-3.5 py-3 shadow-sm">
                <p className="text-[10px] font-black text-[#263544]/45">{item.label}</p>
                <p className={`text-sm font-black tabular-nums mt-0.5 ${item.danger ? "text-rose-600" : "text-[#263544]"}`}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-[#263544]/10 bg-white/40 overflow-x-auto px-3">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex-none min-w-[120px] py-3.5 px-4 text-sm font-black flex items-center justify-center gap-1.5 transition-colors border-b-2 ${
                activeTab === t.key
                  ? "border-[#C89355] text-[#1a2530] bg-white/60"
                  : "border-transparent text-[#263544]/50 hover:text-[#263544]"
              }`}
            >
              <t.icon size={15} /> {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {isLoading ? <Loading /> : (
            <>
              {/* Stock Tab */}
              {activeTab === "stock" && (
                <div className="space-y-3">
                  {!(rep?.stockItems?.length) ? (
                    <Empty message="لا يوجد مخزون لدى هذا المندوب" />
                  ) : (
                    <div className="overflow-hidden rounded-2xl border border-[#263544]/10 bg-white shadow-sm">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="bg-[#1a2530] text-[11px] font-black text-[#C89355]">
                            <th className="px-4 py-3 text-right">المنتج</th>
                            <th className="px-4 py-3 text-right">الكمية</th>
                            <th className="px-4 py-3 text-right">تكلفة الوحدة</th>
                            <th className="px-4 py-3 text-right">الإجمالي</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#263544]/5">
                          {rep.stockItems.map((item: { sku: string; quantity: number; unitCost: number; totalValue: number }) => (
                            <tr key={item.sku} className="bg-white/50">
                              <td className="px-4 py-3 font-bold text-[#263544]">{item.sku}</td>
                              <td className="px-4 py-3 tabular-nums font-black">{fmtInt(item.quantity)}</td>
                              <td className="px-4 py-3 tabular-nums">{fmtMoney(item.unitCost, 0)}</td>
                              <td className="px-4 py-3 tabular-nums font-black text-[#C89355]">{fmtMoney(item.totalValue, 0)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Customers Tab */}
              {activeTab === "customers" && (
                <div className="space-y-4">
                  <p className="text-sm font-bold text-[#263544]/50">حدد العملاء المخصصين لهذا المندوب</p>
                  <QuickAddCustomerForm repId={repId} />
                  <div className="space-y-2 max-h-[55vh] overflow-y-auto">
                    {allCustomers.map(c => (
                      <label key={c.id} className="flex items-center gap-3 p-3 bg-white/70 rounded-2xl border border-white/90 cursor-pointer hover:bg-white shadow-sm transition-colors">
                        <input
                          type="checkbox"
                          checked={selectedCustomers.includes(c.id)}
                          onChange={e => setSelectedCustomers(prev =>
                            e.target.checked ? [...prev, c.id] : prev.filter(id => id !== c.id)
                          )}
                          className="w-4 h-4 accent-[#C89355]"
                        />
                        <span className="font-bold text-[#263544]">{c.name}</span>
                      </label>
                    ))}
                  </div>
                  <Button
                    onClick={() => assignCustomers.mutate(selectedCustomers)}
                    loading={assignCustomers.isPending}
                    className="w-full"
                  >
                    <UserCheck size={16} /> حفظ العملاء ({selectedCustomers.length})
                  </Button>
                </div>
              )}

              {/* Products Tab */}
              {activeTab === "products" && (
                <div className="space-y-4">
                  <p className="text-sm font-bold text-[#263544]/50">حدد المنتجات المسموحة لهذا المندوب</p>
                  <div className="space-y-2 max-h-[55vh] overflow-y-auto">
                    {allProducts.map(p => (
                      <label key={p.sku} className="flex items-center gap-3 p-3 bg-white/70 rounded-2xl border border-white/90 cursor-pointer hover:bg-white shadow-sm transition-colors">
                        <input
                          type="checkbox"
                          checked={selectedProducts.includes(p.sku)}
                          onChange={e => setSelectedProducts(prev =>
                            e.target.checked ? [...prev, p.sku] : prev.filter(s => s !== p.sku)
                          )}
                          className="w-4 h-4 accent-[#C89355]"
                        />
                        <div>
                          <p className="font-bold text-[#263544]">{p.name}</p>
                          <p className="text-[11px] text-[#263544]/40">{p.sku}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                  <Button
                    onClick={() => assignProducts.mutate(selectedProducts)}
                    loading={assignProducts.isPending}
                    className="w-full"
                  >
                    <Package size={16} /> حفظ المنتجات ({selectedProducts.length})
                  </Button>
                </div>
              )}

              {/* Transfer Tab */}
              {activeTab === "transfer" && (
                <div className="space-y-4">
                  <p className="text-sm font-bold text-[#263544]/50">
                    سلّم بضاعة من المخزن الرئيسي لهذا المندوب. البضاعة تُخصم من المخزن وتُضاف لمخزون المندوب.
                  </p>
                  <Field label="موقع المخزن">
                    <input value={transferLocation} onChange={e => setTransferLocation(e.target.value)} className={inputClass} placeholder="WH-A" />
                  </Field>
                  <div className="space-y-2 max-h-[45vh] overflow-y-auto">
                    {allProducts.filter(p => selectedProducts.includes(p.sku)).map(p => (
                      <div key={p.sku} className="flex items-center gap-3 p-3 bg-white/70 rounded-2xl border border-white/90 shadow-sm">
                        <div className="flex-1">
                          <p className="font-bold text-[#263544]">{p.name}</p>
                          <p className="text-[11px] text-[#263544]/40">{p.sku}</p>
                        </div>
                        <input
                          type="number"
                          min="0"
                          placeholder="الكمية"
                          value={transferItems[p.sku] ?? ""}
                          onChange={e => setTransferItems(prev => ({ ...prev, [p.sku]: e.target.value }))}
                          className={`${inputClass} w-28`}
                        />
                      </div>
                    ))}
                  </div>
                  {selectedProducts.length === 0 && (
                    <p className="text-xs font-bold text-amber-700 bg-amber-50 p-3 rounded-xl border border-amber-200">
                      ⚠️ لم تُعيَّن منتجات لهذا المندوب بعد — اذهب لتبويب «المنتجات» أولاً
                    </p>
                  )}
                  <Button
                    onClick={handleTransfer}
                    loading={transferStock.isPending}
                    disabled={!Object.values(transferItems).some(q => Number(q) > 0)}
                    className="w-full bg-[#C89355] text-[#1a2530] hover:bg-[#b9844e]"
                  >
                    <Send size={16} /> تسليم البضاعة
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}