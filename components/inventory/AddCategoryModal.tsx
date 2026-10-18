"use client";

import { useEffect, useState } from "react";
import { Loader2, Save, X, Tag } from "lucide-react";
import { CreateCategoryInput, CATEGORY_TYPES } from "@/types/inventory";
import { toast } from "react-hot-toast";

interface AddCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateCategoryInput) => Promise<void> | void;
  isPending?: boolean;
}

const defaultForm: CreateCategoryInput = {
  name: "",
  type: "RAW_MATERIALS",
  customTypeName: "",
};

export default function AddCategoryModal({ isOpen, onClose, onSave, isPending = false }: AddCategoryModalProps) {
  const [form, setForm] = useState(defaultForm);
  const [showCustomType, setShowCustomType] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm(defaultForm);
      setShowCustomType(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("اسم التصنيف مطلوب");
      return;
    }
    if (form.type === "OTHER" && !form.customTypeName?.trim()) {
      toast.error("اسم النوع الجديد مطلوب");
      return;
    }
    onSave({
      name: form.name.trim(),
      type: form.type === "OTHER" ? (form.customTypeName?.trim() ?? "CUSTOM") : form.type,
    });
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4"
      dir="rtl"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200 border-2 border-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative p-6 border-b border-slate-100 bg-white/90 backdrop-blur-xl">
          <div className="absolute inset-1 rounded-[1.4rem] border border-dashed border-[#C89355]/30 pointer-events-none" />
          <div className="flex justify-between items-center relative z-10">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#1a2530] rounded-2xl shadow-[0_10px_20px_rgba(38,53,68,0.4)] border border-[#C89355]/40">
                <Tag size={20} className="text-[#C89355]" />
              </div>
              <div>
                <h2 className="text-xl font-black text-[#263544]">إضافة تصنيف جديد</h2>
                <p className="text-xs font-bold text-slate-500 mt-0.5">تصنيف المجموعات وأنواع الأصناف</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-rose-500 transition-colors active:scale-95 p-2 rounded-xl hover:bg-rose-50"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 text-right relative">
          <div className="absolute inset-2 rounded-[2rem] border border-dashed border-[#C89355]/20 pointer-events-none" />

          <div className="relative z-10">
            <label className="block text-sm font-black text-[#263544] mb-2">
              اسم التصنيف <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="مثال: كريمات، شامبوهات، عبوات بلاستيكية..."
              className="w-full p-3.5 bg-white/90 backdrop-blur border-2 border-white rounded-2xl text-sm font-black text-[#263544] outline-none focus:ring-2 focus:ring-[#C89355]/50 focus:border-[#C89355]/50 shadow-inner transition-all"
            />
          </div>

          <div className="relative z-10">
            <label className="block text-sm font-black text-[#263544] mb-2">
              نوع التصنيف <span className="text-rose-500">*</span>
            </label>
            <select
              value={form.type}
              onChange={(e) => {
                setForm((p) => ({ ...p, type: e.target.value }));
                setShowCustomType(e.target.value === "OTHER");
              }}
              className="w-full p-3.5 bg-white/90 backdrop-blur border-2 border-white rounded-2xl text-sm font-black text-[#263544] outline-none focus:ring-2 focus:ring-[#C89355]/50 focus:border-[#C89355]/50 shadow-inner cursor-pointer appearance-none"
            >
              {CATEGORY_TYPES.map((ct) => (
                <option key={ct.id} value={ct.name}>
                  {ct.label}
                </option>
              ))}
            </select>
          </div>

          {showCustomType && (
            <div className="relative z-10 rounded-2xl border-2 border-[#C89355]/30 bg-[#C89355]/5 p-5">
              <label className="block text-sm font-black text-[#263544] mb-2">
                اسم النوع الجديد <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={form.customTypeName || ""}
                onChange={(e) => setForm((p) => ({ ...p, customTypeName: e.target.value }))}
                placeholder="مثال: ملحقات، عطور، معدات..."
                className="w-full p-3.5 bg-white/95 backdrop-blur border-2 border-white rounded-2xl text-sm font-black text-[#263544] outline-none focus:ring-2 focus:ring-[#C89355]/50 focus:border-[#C89355]/50 shadow-inner"
              />
            </div>
          )}

          <div className="relative z-10 pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="relative overflow-hidden w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-[#1a2530] hover:bg-[#263544] text-[#C89355] font-black text-sm shadow-[0_15px_30px_rgba(38,53,68,0.4)] disabled:opacity-60 transition-all active:scale-95 border-2 border-[#C89355]/40 group"
            >
              <div className="absolute inset-1 rounded-xl border border-dashed border-[#C89355]/30 pointer-events-none transition-colors group-hover:border-[#C89355]/50" />
              {isPending ? (
                <Loader2 className="animate-spin relative z-10" size={18} />
              ) : (
                <Save size={18} className="group-hover:-translate-y-0.5 transition-transform relative z-10" />
              )}
              <span className="relative z-10">حفظ التصنيف</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
