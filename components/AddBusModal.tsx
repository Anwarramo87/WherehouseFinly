"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Save, Bus, User, Phone, Hash, MapPin, Coins, Percent } from "lucide-react";

type BusFormData = {
  id?: string;
  driverName: string;
  driverPhone: string;
  plateNumber: string;
  capacity: string;
  route: string;
  totalCost: string;
  discountPercent: string;
};

type BusPayload = {
  id?: string;
  driverName: string;
  driverPhone: string;
  plateNumber: string;
  capacity: number;
  route: string;
  totalCost: number;
  companyDeductionPct: number;
  employeeDeductionPct: number;
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: BusPayload) => void;
  initialData?: Partial<BusPayload> & { employeeDeductionPct?: number };
}

export default function AddBusModal({ isOpen, onClose, onSave, initialData }: Props) {
  const [formData, setFormData] = useState<BusFormData>(() => {
    if (initialData) {
      return {
        id: initialData.id,
        driverName: initialData.driverName || "",
        driverPhone: initialData.driverPhone || "",
        plateNumber: initialData.plateNumber || "",
        capacity: String(initialData.capacity ?? ""),
        route: initialData.route || "",
        totalCost: String(initialData.totalCost ?? ""),
        discountPercent: String(initialData.companyDeductionPct ?? "0"),
      };
    }
    return { driverName: "", driverPhone: "", plateNumber: "", capacity: "", route: "", totalCost: "", discountPercent: "0" };
  });

  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "unset";

    const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (isOpen) document.addEventListener("keydown", handleEsc);

    return () => {
      document.body.style.overflow = "unset";
      document.removeEventListener("keydown", handleEsc);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  if (typeof document === "undefined") return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      capacity: Number(formData.capacity),
      totalCost: Number(formData.totalCost),
      companyDeductionPct: Number(formData.discountPercent),
      employeeDeductionPct: initialData?.employeeDeductionPct ?? 0,
    });
  };

  return createPortal(
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 sm:p-6 bg-black/50 backdrop-blur-md transition-all duration-300" dir="rtl" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-[2.5rem] shadow-[0_30px_90px_-15px_rgba(38,53,68,0.4)] w-full max-w-3xl overflow-hidden flex flex-col border-2 border-dashed border-[#C89355]/40 animate-in fade-in zoom-in-95 duration-300">

        <div className="p-6 sm:p-8 border-b border-[#263544]/10 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-4">
            <div className="bg-[#C89355]/10 p-3 rounded-2xl border border-[#C89355]/20">
              <Bus className="text-[#C89355]" size={28} />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-[#263544] tracking-wide">{initialData ? "تعديل بيانات الباص" : "تسجيل باص جديد"}</h2>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-[#263544] bg-white hover:bg-slate-100 p-2.5 rounded-2xl border border-slate-200 transition-all active:scale-90"><X size={22} /></button>
        </div>

        <div className="overflow-y-auto custom-scrollbar p-8 sm:p-10 relative">
          <form id="busForm" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 text-right">
            <div>
              <label className="block text-xs font-black text-[#C89355] mb-2 uppercase">الخط / مسار الرحلة</label>
              <div className="relative group"><input type="text" required className="w-full p-4 bg-slate-50 border border-[#263544]/15 rounded-2xl focus:border-[#C89355] outline-none text-[#263544] font-bold pr-12" value={formData.route} onChange={(e) => setFormData({ ...formData, route: e.target.value })} /><MapPin className="absolute right-4 top-4 text-slate-400 group-focus-within:text-[#C89355]" size={22} /></div>
            </div>
            <div>
              <label className="block text-xs font-black text-[#C89355] mb-2 uppercase">رقم اللوحة</label>
              <div className="relative group"><input type="text" required className="w-full p-4 bg-slate-50 border border-[#263544]/15 rounded-2xl focus:border-[#C89355] outline-none text-[#263544] font-mono font-bold pr-12 dir-ltr text-left" value={formData.plateNumber} onChange={(e) => setFormData({ ...formData, plateNumber: e.target.value })} /><Hash className="absolute right-4 top-4 text-slate-400 group-focus-within:text-[#C89355]" size={22} /></div>
            </div>
            <div>
              <label className="block text-xs font-black text-[#C89355] mb-2 uppercase">اسم السائق</label>
              <div className="relative group"><input type="text" required className="w-full p-4 bg-slate-50 border border-[#263544]/15 rounded-2xl focus:border-[#C89355] outline-none text-[#263544] font-bold pr-12" value={formData.driverName} onChange={(e) => setFormData({ ...formData, driverName: e.target.value })} /><User className="absolute right-4 top-4 text-slate-400 group-focus-within:text-[#C89355]" size={22} /></div>
            </div>
            <div>
              <label className="block text-xs font-black text-[#C89355] mb-2 uppercase">رقم السائق</label>
              <div className="relative group">
                <input
                  type="tel"
                  required
                  className="w-full p-4 bg-slate-50 border border-[#263544]/15 rounded-2xl focus:border-[#C89355] outline-none text-[#263544] font-mono font-bold pr-12 dir-ltr text-right"
                  value={formData.driverPhone}
                  onChange={(e) => setFormData({ ...formData, driverPhone: e.target.value.replace(/\D/g, '') })}
                />
                <Phone className="absolute right-4 top-4 text-slate-400 group-focus-within:text-[#C89355]" size={22} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-black text-[#C89355] mb-2 uppercase">التكلفة الإجمالية (ل.س)</label>
              <div className="relative group"><input type="number" required min={0} className="w-full p-4 bg-slate-50 border border-[#263544]/15 rounded-2xl focus:border-[#C89355] outline-none text-[#C89355] text-lg font-black font-mono pr-12" value={formData.totalCost} onChange={(e) => setFormData({ ...formData, totalCost: e.target.value })} /><Coins className="absolute right-4 top-4.5 text-slate-400 group-focus-within:text-[#C89355]" size={22} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-[#C89355] mb-2 uppercase">حسم الشركة %</label>
                <div className="relative group"><input type="number" required min={0} max={100} className="w-full p-4 bg-slate-50 border border-[#263544]/15 rounded-2xl focus:border-[#C89355] outline-none text-[#263544] font-mono font-bold pr-10 text-left dir-ltr" value={formData.discountPercent} onChange={(e) => setFormData({ ...formData, discountPercent: e.target.value })} /><Percent className="absolute right-4 top-4 text-slate-400 group-focus-within:text-[#C89355]" size={18} /></div>
              </div>
              <div>
                <label className="block text-xs font-black text-[#C89355] mb-2 uppercase">سعة الركاب</label>
                <input type="number" required min={1} className="w-full p-4 bg-slate-50 border border-[#263544]/15 rounded-2xl focus:border-[#C89355] outline-none text-[#263544] font-mono font-bold text-center dir-ltr" value={formData.capacity} onChange={(e) => setFormData({ ...formData, capacity: e.target.value })} />
              </div>
            </div>
          </form>
        </div>

        <div className="p-6 sm:p-8 bg-slate-50 border-t border-[#263544]/10 flex justify-end">
          <button type="submit" form="busForm" className="bg-[#C89355] text-white px-10 py-4 rounded-2xl font-black flex items-center gap-3 hover:bg-[#b07d45] active:scale-95 transition-all shadow-[0_5px_15px_rgba(200,147,85,0.3)]">
            <Save size={20} /> {initialData ? "تحديث البيانات" : "حفظ بيانات الباص"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}