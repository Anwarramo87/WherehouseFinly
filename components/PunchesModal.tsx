"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { X, LogIn, LogOut, Plus, Trash2, Loader2, Fingerprint, Clock } from "lucide-react";
import { useEmployeePunches } from "@/hooks/useEmployeePunches";

interface Props {
  employeeId: string;
  employeeName: string;
  date: string;
  onClose: () => void;
}

const toLocalHHmm = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso.slice(11, 16);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

const getNowHHmm = () => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
};

const formatDate = (date: string) => {
  const d = new Date(`${date}T00:00:00`);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

export default function PunchesModal({ employeeId, employeeName, date, onClose }: Props) {
  const { data: punches = [], isLoading, addPunch, deletePunch } = useEmployeePunches(employeeId, date);
  const [newType, setNewType] = useState<"IN" | "OUT">("IN");
  const [newTime, setNewTime] = useState("08:00");
  const [showAdd, setShowAdd] = useState(false);

  const handleAdd = () => {
    addPunch.mutate({ type: newType, hhmm: newTime }, {
      onSuccess: () => { setShowAdd(false); setNewTime("08:00"); },
    });
  };

  const handleQuickPunch = (type: "IN" | "OUT", hhmm: string) => {
    addPunch.mutate({ type, hhmm });
  };

  // آخر بصمة مسجلة لتحديد النوع المتوقع التالي
  const lastPunchType = punches.length > 0 ? punches[punches.length - 1].type : null;
  const nextExpectedType: "IN" | "OUT" = lastPunchType === "IN" ? "OUT" : "IN";

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" dir="rtl">
      <div className="bg-[#101720] rounded-[2rem] border border-white/10 shadow-[0_30px_80px_rgba(0,0,0,0.5)] w-full max-w-md flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-[#1a2530]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#C89355]/10 rounded-xl border border-[#C89355]/20">
              <Fingerprint size={20} className="text-[#C89355]" />
            </div>
            <div>
              <p className="text-white font-black text-sm">{employeeName}</p>
              <p className="text-slate-400 text-xs font-mono mt-0.5">{formatDate(date)}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-rose-400 p-2 rounded-xl hover:bg-rose-500/10 transition-all">
            <X size={20} />
          </button>
        </div>

        {/* Quick punch buttons */}
        <div className="px-5 pt-4 pb-2 grid grid-cols-2 gap-2">
          <button
            onClick={() => handleQuickPunch("IN", getNowHHmm())}
            disabled={addPunch.isPending || nextExpectedType !== "IN"}
            className={`flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm transition-all border
              ${nextExpectedType === "IN"
                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30"
                : "bg-white/5 text-slate-600 border-white/5 opacity-40 cursor-not-allowed"}`}
          >
            {addPunch.isPending ? <Loader2 size={14} className="animate-spin" /> : <LogIn size={14} />}
            دخول الآن
          </button>
          <button
            onClick={() => handleQuickPunch("OUT", getNowHHmm())}
            disabled={addPunch.isPending || nextExpectedType !== "OUT"}
            className={`flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm transition-all border
              ${nextExpectedType === "OUT"
                ? "bg-rose-500/20 text-rose-400 border-rose-500/40 hover:bg-rose-500/30"
                : "bg-white/5 text-slate-600 border-white/5 opacity-40 cursor-not-allowed"}`}
          >
            {addPunch.isPending ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
            خروج الآن
          </button>
        </div>

        {/* Punches list */}
        <div className="flex-1 overflow-y-auto px-5 pb-2 space-y-2 max-h-64 custom-scrollbar">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 size={24} className="animate-spin text-[#C89355]" />
            </div>
          ) : punches.length === 0 ? (
            <p className="text-center text-slate-500 font-bold text-sm py-6">لا توجد بصمات مسجلة</p>
          ) : (
            punches.map((p, i) => (
              <div key={p.id} className="flex items-center justify-between bg-[#1a2530] rounded-xl px-4 py-3 border border-white/5">
                <div className="flex items-center gap-3">
                  <span className="text-slate-500 font-mono text-xs w-5">{i + 1}</span>
                  <div className={`p-1.5 rounded-lg ${p.type === "IN" ? "bg-emerald-500/10" : "bg-rose-500/10"}`}>
                    {p.type === "IN"
                      ? <LogIn size={14} className="text-emerald-400" />
                      : <LogOut size={14} className="text-rose-400" />}
                  </div>
                  <div>
                    <span className={`text-xs font-black ${p.type === "IN" ? "text-emerald-400" : "text-rose-400"}`}>
                      {p.type === "IN" ? "دخول" : "خروج"}
                    </span>
                    <p className="text-white font-mono font-black text-base">{toLocalHHmm(p.timestamp)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-500 font-bold px-2 py-0.5 bg-white/5 rounded-lg">
                    {p.source === "device" ? "جهاز" : "يدوي"}
                  </span>
                  <button
                    onClick={() => deletePunch.mutate(p.id)}
                    disabled={deletePunch.isPending}
                    className="p-1.5 text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add punch with custom time */}
        <div className="p-5 border-t border-white/5 bg-[#1a2530]/50">
          {!showAdd ? (
            <button
              onClick={() => {
                setNewType(nextExpectedType);
                setNewTime(getNowHHmm());
                setShowAdd(true);
              }}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#C89355]/10 hover:bg-[#C89355]/20 border border-[#C89355]/30 text-[#C89355] font-black text-sm transition-all"
            >
              <Clock size={16} /> إضافة بصمة بوقت محدد
            </button>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setNewType("IN")}
                  className={`py-2.5 rounded-xl text-sm font-black border transition-all flex items-center justify-center gap-2
                    ${newType === "IN" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" : "bg-white/5 text-slate-400 border-white/10 hover:border-emerald-500/30"}`}
                >
                  <LogIn size={14} /> دخول
                </button>
                <button
                  onClick={() => setNewType("OUT")}
                  className={`py-2.5 rounded-xl text-sm font-black border transition-all flex items-center justify-center gap-2
                    ${newType === "OUT" ? "bg-rose-500/20 text-rose-400 border-rose-500/40" : "bg-white/5 text-slate-400 border-white/10 hover:border-rose-500/30"}`}
                >
                  <LogOut size={14} /> خروج
                </button>
              </div>
              <input
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="w-full p-3 bg-[#101720] border border-white/10 rounded-xl text-white font-mono font-black text-xl text-center outline-none focus:border-[#C89355]/50"
                dir="ltr"
              />
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleAdd}
                  disabled={addPunch.isPending}
                  className="py-3 rounded-xl bg-[#C89355] text-[#101720] font-black text-sm flex items-center justify-center gap-2 hover:bg-[#d0b468] transition-all disabled:opacity-50"
                >
                  {addPunch.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  حفظ
                </button>
                <button
                  onClick={() => setShowAdd(false)}
                  className="py-3 rounded-xl bg-white/5 text-slate-400 font-black text-sm hover:bg-white/10 transition-all border border-white/10"
                >
                  إلغاء
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
