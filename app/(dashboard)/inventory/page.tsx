"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function InventoryRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/inventory/raw-materials");
  }, [router]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4">
      <div className="p-5 rounded-3xl bg-[#1a2530] border border-[#C89355]/30 shadow-[0_20px_50px_rgba(26,37,48,0.25)]">
        <Loader2 size={32} className="animate-spin text-[#C89355]" />
      </div>
      <div className="text-center">
        <h2 className="text-lg font-black text-[#263544]">جارٍ التوجيه إلى صفحة المواد الخام...</h2>
        <p className="text-xs font-bold text-slate-500 mt-1">
          تم إعادة تسمية صفحة الأصناف إلى المواد الخام
        </p>
      </div>
    </div>
  );
}
