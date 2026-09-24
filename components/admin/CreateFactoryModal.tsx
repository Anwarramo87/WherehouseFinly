"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Building2, Factory, Loader2, Save, X } from "lucide-react";
import { useCreateFactory, useNextFactoryCode } from "@/hooks/useSuperAdmin";
import { getApiErrorMessage } from "@/lib/http/error";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const emptyForm = { name: "", code: "", description: "" };

export default function CreateFactoryModal({ isOpen, onClose }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const createFactory = useCreateFactory();
  const { data: nextCode, isLoading: codeLoading } = useNextFactoryCode();

  useEffect(() => {
    if (!isOpen) {
      document.body.style.overflow = "unset";
      return;
    }

    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm({ name: "", code: nextCode ?? "", description: "" });
    setErrorMessage(null);
  }, [isOpen, nextCode]);

  useEffect(() => {
    if (!isOpen) {
      document.body.style.overflow = "unset";
      return;
    }

    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm({ name: "", code: nextCode ?? "", description: "" });
    setErrorMessage(null);
  }, [isOpen, nextCode]);

  if (!isOpen || typeof document === "undefined") return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = form.name.trim();
    if (!name || isSubmitting) return;

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await createFactory.mutateAsync({
        name,
        code: form.code.trim(),
        description: form.description.trim() || undefined,
      });
      onClose();
    } catch (error) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        setErrorMessage(`الكود «${form.code.trim()}» مستخدم لمصنع آخر. اختر كوداً مختلفاً.`);
      } else {
        setErrorMessage(getApiErrorMessage(error, "تعذّر إنشاء المصنع حالياً. حاول مرة أخرى."));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-999999 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md sm:p-6"
      dir="rtl"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-slate-50/60 p-6">
          <div className="flex items-center gap-3">
            <span className="rounded-2xl border border-[#C89355]/20 bg-[#C89355]/10 p-3">
              <Factory size={22} className="text-[#C89355]" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-xl font-black text-[#263544]">إنشاء معمل جديد</h2>
              <p className="mt-0.5 text-xs font-bold text-slate-500">
                يُنشأ المعمل فارغاً — بدون أقسام أو موظفين.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="إغلاق"
            className="rounded-2xl border border-transparent bg-slate-100 p-2.5 text-slate-500 transition-all hover:border-rose-400/30 hover:text-rose-500 active:scale-90 disabled:opacity-60"
          >
            <X size={22} />
          </button>
        </div>

        <div className="relative flex-1 overflow-y-auto p-6 sm:p-8">
          <form id="createFactoryForm" onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 text-right">
            <div>
              <label className="mb-2 block text-xs font-black uppercase text-[#C89355]" htmlFor="factory-name">
                اسم المعمل <span className="text-rose-500">*</span>
              </label>
              <div className="relative group">
                <input
                  id="factory-name"
                  type="text"
                  required
                  maxLength={120}
                  autoFocus
                  placeholder="مثال: مصنع النور"
                  className="w-full rounded-2xl border border-slate-200 bg-white p-4 pr-12 text-sm font-bold text-[#263544] shadow-sm outline-none placeholder:text-slate-400 focus:border-[#C89355]"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
                <Building2
                  size={20}
                  aria-hidden="true"
                  className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#C89355]"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-black uppercase text-[#C89355]" htmlFor="factory-code">
                الكود <span className="text-rose-500">*</span>
              </label>
              <input
                id="factory-code"
                type="text"
                required
                maxLength={64}
                dir="ltr"
                placeholder=""
                readOnly={!!nextCode}
                className="w-full rounded-2xl border border-slate-200 bg-white p-4 font-mono text-sm font-bold text-[#263544] shadow-sm outline-none placeholder:font-sans placeholder:text-slate-400 focus:border-[#C89355]"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-black uppercase text-[#C89355]" htmlFor="factory-description">
                الوصف (اختياري)
              </label>
              <textarea
                id="factory-description"
                rows={3}
                maxLength={500}
                placeholder="ملاحظة قصيرة عن المعمل…"
                className="w-full resize-y rounded-2xl border border-slate-200 bg-white p-4 text-sm font-bold text-[#263544] shadow-sm outline-none placeholder:text-slate-400 focus:border-[#C89355]"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            {errorMessage && (
              <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-600">
                {errorMessage}
              </div>
            )}
          </form>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 p-6">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-2xl border border-slate-200 bg-white px-8 py-3.5 text-sm font-bold text-slate-500 transition-all hover:text-slate-700 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            إلغاء
          </button>
          <button
            type="submit"
            form="createFactoryForm"
            disabled={isSubmitting}
            className="flex items-center gap-3 rounded-2xl bg-[#C89355] px-10 py-3.5 text-sm font-black text-[#101720] shadow-[0_0_20px_rgba(200,147,85,0.3)] transition-all hover:bg-[#d0b468] active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? <Loader2 size={20} className="animate-spin" aria-hidden="true" /> : <Save size={20} aria-hidden="true" />}
            {isSubmitting ? "جارٍ الإنشاء…" : "إنشاء المعمل"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
