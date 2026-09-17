"use client";

import { useRef, useState } from "react";
import {
  FolderOpen,
  UploadCloud,
  Loader2,
  Download,
  Eye,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useFiles } from "@/hooks/useFiles";

const MAX_SIZE_BYTES = 15 * 1024 * 1024;

function formatSize(bytes?: number | null) {
  if (bytes === undefined || bytes === null || Number.isNaN(bytes)) return "—";
  if (bytes < 1024) return `${bytes} بايت`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} ك.ب`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} م.ب`;
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("ar", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

export default function FilesPage() {
  const { list, upload } = useFiles();
  const files = list.data?.files ?? [];
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const sendFiles = async (picked: FileList | File[]) => {
    const arr = Array.from(picked ?? []);
    if (arr.length === 0) return;
    for (const file of arr) {
      if (file.size > MAX_SIZE_BYTES) {
        toast.error(`"${file.name}" أكبر من 15 م.ب — تم تخطيه`);
        continue;
      }
      try {
        await upload.mutateAsync({ file });
        toast.success(`تم رفع "${file.name}"`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "فشل رفع الملف");
      }
    }
  };

  return (
    <main className="p-6 md:p-8" dir="rtl">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#263544] text-[#C89355] shadow-sm">
            <FolderOpen size={20} aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[#263544]">الملفات</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              رفع وعرض وتنزيل ملفات المصنع العامة (حتى 15 م.ب للملف).
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={upload.isPending}
          className="inline-flex items-center gap-2 rounded-xl bg-[#263544] px-4 py-2.5 text-sm font-bold text-[#C89355] shadow-sm transition-all hover:bg-[#1e2a36] disabled:opacity-50"
        >
          {upload.isPending ? (
            <Loader2 size={15} className="animate-spin" aria-hidden="true" />
          ) : (
            <UploadCloud size={15} aria-hidden="true" />
          )}
          {upload.isPending ? "جارٍ الرفع…" : "رفع ملف"}
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            void sendFiles(e.target.files ?? []);
            e.target.value = "";
          }}
        />
      </header>

      {/* drop zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label="إسقاط الملفات هنا للرفع"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          void sendFiles(e.dataTransfer.files);
        }}
        className={`mb-6 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
          dragOver
            ? "border-[#C89355] bg-[#C89355]/10"
            : "border-slate-300 bg-white hover:border-[#C89355]/60 hover:bg-slate-50"
        }`}
      >
        <UploadCloud size={28} className="text-[#C89355]" aria-hidden="true" />
        <p className="text-sm font-bold text-[#263544]">اسحب الملفات هنا أو اضغط للاختيار</p>
        <p className="text-xs text-slate-500">الحد الأقصى 15 م.ب للملف الواحد</p>
      </div>

      {/* list */}
      {list.isLoading && (
        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-8 text-sm text-slate-500">
          <Loader2 size={16} className="animate-spin" aria-hidden="true" />
          جارٍ تحميل الملفات…
        </div>
      )}

      {list.isError && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-bold text-rose-700"
        >
          <AlertTriangle size={16} aria-hidden="true" />
          تعذّر تحميل قائمة الملفات.
        </div>
      )}

      {!list.isLoading && !list.isError && files.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <FileText size={24} className="mx-auto mb-2 text-slate-300" aria-hidden="true" />
          <p className="text-sm font-bold text-slate-600">لا توجد ملفات بعد</p>
          <p className="mt-1 text-xs text-slate-500">ارفع أول ملف من الزر أعلاه أو بالإسقاط هنا.</p>
        </div>
      )}

      {files.length > 0 && (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {files.map((file) => {
            const id = file.id ?? file.path ?? file.originalName ?? "";
            const name = file.originalName ?? file.storedName ?? id;
            return (
              <li
                key={id}
                className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                  <FileText size={18} aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-[#263544]" title={name}>
                    {name}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {formatSize(file.size)} · {formatDate(file.uploadedAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <a
                    href={`/api/files/${encodeURIComponent(id)}/preview`}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`معاينة ${name}`}
                    title="معاينة"
                    className="rounded-lg border border-slate-200 p-2 text-slate-600 transition-colors hover:border-[#C89355]/40 hover:bg-[#C89355]/10 hover:text-[#263544]"
                  >
                    <Eye size={15} aria-hidden="true" />
                  </a>
                  <a
                    href={`/api/files/${encodeURIComponent(id)}/download`}
                    aria-label={`تنزيل ${name}`}
                    title="تنزيل"
                    className="rounded-lg bg-[#263544] p-2 text-[#C89355] transition-colors hover:bg-[#1e2a36]"
                  >
                    <Download size={15} aria-hidden="true" />
                  </a>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
