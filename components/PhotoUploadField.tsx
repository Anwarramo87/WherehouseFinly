"use client";

import { useCallback, useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";

interface PhotoUploadFieldProps {
  value?: string | null;
  onChange: (dataUrl: string | null) => void;
  label?: string;
  className?: string;
  labelClassName?: string;
  rounded?: string;
}

const MAX_DIMENSION = 500;
const JPEG_QUALITY = 0.72;

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });

const resizeImage = (source: string): Promise<string> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, MAX_DIMENSION / Math.max(image.width, image.height));
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) {
        resolve(source);
        return;
      }

      context.drawImage(image, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", JPEG_QUALITY));
    };
    image.onerror = () => reject(new Error("Invalid image"));
    image.src = source;
  });

export default function PhotoUploadField({
  value,
  onChange,
  label = "صورة",
  className = "",
  labelClassName = "text-slate-700",
  rounded = "rounded-2xl",
}: PhotoUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);

  const handleFile = useCallback(
    async (file?: File | null) => {
      if (!file) return;
      if (!file.type.startsWith("image/")) return;

      setBusy(true);
      try {
        const raw = await fileToDataUrl(file);
        const resized = await resizeImage(raw);
        onChange(resized);
      } catch {
        onChange(null);
      } finally {
        setBusy(false);
      }
    },
    [onChange],
  );

  return (
    <div className={className}>
      <label className={`block text-sm font-bold mb-2 ${labelClassName}`}>{label}</label>

      {value ? (
        <div className={`relative overflow-hidden ${rounded} border-2 border-slate-200 bg-slate-50`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt={label} className="w-full h-36 object-cover" />
          <button
            type="button"
            onClick={() => {
              onChange(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
            className="absolute top-2 left-2 p-2 bg-rose-500 text-white rounded-xl shadow-lg hover:bg-rose-600 transition-all active:scale-95"
            title="حذف الصورة"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={`w-full h-28 border-2 border-dashed border-slate-300 hover:border-[#C89355] hover:bg-[#C89355]/5 ${rounded} flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-[#C89355] transition-all`}
        >
          {busy ? (
            <Loader2 className="animate-spin text-[#C89355]" size={22} />
          ) : (
            <ImagePlus size={22} />
          )}
          <span className="text-xs font-bold">اضغط لاختيار صورة</span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          handleFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
