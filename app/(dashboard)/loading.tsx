import { Loader2 } from "lucide-react";

export default function DashboardLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="rounded-2xl border border-white/5 bg-[#101720]/80 backdrop-blur px-6 py-5 flex items-center gap-3">
        <Loader2 className="animate-spin text-[#C89355]" size={22} />
        <p className="text-sm font-semibold text-slate-300">جاري تحميل الصفحة...</p>
      </div>
    </div>
  );
}
