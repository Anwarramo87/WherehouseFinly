// "use client";

// import { useState, useEffect } from "react";
// import { createPortal } from "react-dom";
// import { X, Save, Bus, User, Phone, Hash, MapPin, Coins, Percent } from "lucide-react";

// interface Props {
//   isOpen: boolean;
//   onClose: () => void;
//   onSave: (data: any) => void;
// }

// export default function AddBusModal({ isOpen, onClose, onSave }: Props) {
//   const [mounted, setMounted] = useState(false);
//   const [formData, setFormData] = useState({
//     driverName: "",
//     driverPhone: "",
//     busNumber: "",
//     capacity: "",
//     route: "",
//     totalCost: "",
//     discountPercent: "0",
//   });

//   useEffect(() => {
//     setMounted(true);
//     if (isOpen) document.body.style.overflow = "hidden";
//     else document.body.style.overflow = "unset";
//     return () => { document.body.style.overflow = "unset"; };
//   }, [isOpen]);

//   if (!isOpen || !mounted) return null;

//   const handleSubmit = (e: React.FormEvent) => {
//     e.preventDefault();
//     onSave({
//       ...formData,
//       capacity: Number(formData.capacity),
//       totalCost: Number(formData.totalCost),
//       discountPercent: Number(formData.discountPercent),
//     });
//   };

//   return createPortal(
//     <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-md transition-all duration-300" dir="rtl">
//       <div className="bg-[#101720] rounded-[2.5rem] shadow-[0_30px_90px_-15px_rgba(0,0,0,0.9)] w-full max-w-3xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-300 border border-white/10 outline outline-dashed outline-1 outline-[#C89355]/30 outline-offset-[-8px]">

//         {/* الترويسة */}
//         <div className="p-6 sm:p-8 border-b border-white/5 flex justify-between items-center bg-[#1a2530]/80 shrink-0 relative z-10">
//           <div className="flex items-center gap-4">
//             <div className="bg-[#C89355]/10 p-3 rounded-2xl border border-[#C89355]/20 shadow-[0_0_20px_rgba(200,147,85,0.15)]">
//                <Bus className="text-[#C89355]" size={28} />
//             </div>
//             <div>
//               <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">تسجيل باص جديد</h2>
//               <p className="text-[10px] text-[#C89355] font-bold uppercase tracking-[0.2em] mt-0.5">Transport Management</p>
//             </div>
//           </div>
//           <button onClick={onClose} className="text-slate-500 hover:text-white bg-[#263544] p-2.5 rounded-2xl border border-transparent hover:border-[#C89355]/30 transition-all active:scale-90">
//             <X size={24} />
//           </button>
//         </div>

//         {/* جسم الفورم */}
//         <div className="overflow-y-auto custom-scrollbar p-8 sm:p-10 relative">
//           <form id="busForm" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 text-right">

//             <div>
//               <label className="block text-xs font-black text-[#C89355] mb-2 uppercase mr-1">الخط / مسار الرحلة</label>
//               <div className="relative group">
//                 <input type="text" required placeholder="مثال: دمشق - الكسوة" className="w-full p-4 bg-[#1a2530] border border-[#263544] rounded-2xl focus:ring-2 focus:ring-[#C89355]/30 focus:border-[#C89355] outline-none transition-all text-white font-bold shadow-inner pr-12" value={formData.route} onChange={(e) => setFormData({...formData, route: e.target.value})} />
//                 <MapPin className="absolute right-4 top-4 text-slate-500 group-focus-within:text-[#C89355] transition-colors" size={22} />
//               </div>
//             </div>

//             <div>
//               <label className="block text-xs font-black text-[#C89355] mb-2 uppercase mr-1">رقم لوحة الباص</label>
//               <div className="relative group">
//                 <input type="text" required className="w-full p-4 bg-[#1a2530] border border-[#263544] rounded-2xl focus:ring-2 focus:ring-[#C89355]/30 focus:border-[#C89355] outline-none transition-all text-white font-mono font-bold shadow-inner pr-12 text-left dir-ltr" value={formData.busNumber} onChange={(e) => setFormData({...formData, busNumber: e.target.value})} />
//                 <Hash className="absolute right-4 top-4 text-slate-500 group-focus-within:text-[#C89355]" size={22} />
//               </div>
//             </div>

//             <div>
//               <label className="block text-xs font-black text-[#C89355] mb-2 uppercase mr-1">اسم السائق</label>
//               <div className="relative group">
//                 <input type="text" required className="w-full p-4 bg-[#1a2530] border border-[#263544] rounded-2xl focus:ring-2 focus:ring-[#C89355]/30 focus:border-[#C89355] outline-none text-white font-bold pr-12" value={formData.driverName} onChange={(e) => setFormData({...formData, driverName: e.target.value})} />
//                 <User className="absolute right-4 top-4 text-slate-500 group-focus-within:text-[#C89355]" size={22} />
//               </div>
//             </div>

//             <div>
//               <label className="block text-xs font-black text-[#C89355] mb-2 uppercase mr-1">رقم السائق</label>
//               <div className="relative group">
//                 <input type="tel" required className="w-full p-4 bg-[#1a2530] border border-[#263544] rounded-2xl focus:ring-2 focus:ring-[#C89355]/30 focus:border-[#C89355] outline-none text-white font-mono font-bold pr-12 dir-ltr text-right" value={formData.driverPhone} onChange={(e) => setFormData({...formData, driverPhone: e.target.value})} />
//                 <Phone className="absolute right-4 top-4 text-slate-500 group-focus-within:text-[#C89355]" size={22} />
//               </div>
//             </div>

//             <div>
//               <label className="block text-xs font-black text-[#C89355] mb-2 uppercase mr-1">التكلفة الإجمالية (ل.س)</label>
//               <div className="relative group">
//                 <input type="number" required min={0} className="w-full p-4 bg-[#1a2530] border border-[#263544] rounded-2xl focus:ring-2 focus:ring-[#C89355]/30 focus:border-[#C89355] outline-none text-[#C89355] text-lg font-black font-mono pr-12 shadow-inner" value={formData.totalCost} onChange={(e) => setFormData({...formData, totalCost: e.target.value})} />
//                 <Coins className="absolute right-4 top-4.5 text-slate-500 group-focus-within:text-[#C89355]" size={22} />
//               </div>
//             </div>

//             <div className="grid grid-cols-2 gap-4">
//               <div>
//                 <label className="block text-xs font-black text-[#C89355] mb-2 uppercase mr-1">حسم الشركة</label>
//                 <div className="relative group">
//                   <input type="number" required min={0} max={100} className="w-full p-4 bg-[#1a2530] border border-[#263544] rounded-2xl focus:ring-2 focus:ring-[#C89355]/30 focus:border-[#C89355] outline-none text-white font-mono font-bold pr-10 text-left dir-ltr" value={formData.discountPercent} onChange={(e) => setFormData({...formData, discountPercent: e.target.value})} />
//                   <Percent className="absolute right-4 top-4 text-slate-500 group-focus-within:text-[#C89355]" size={18} />
//                 </div>
//               </div>
//               <div>
//                 <label className="block text-xs font-black text-[#C89355] mb-2 uppercase mr-1">سعة الركاب</label>
//                 <div className="relative group">
//                   <input type="number" required min={1} className="w-full p-4 bg-[#1a2530] border border-[#263544] rounded-2xl focus:ring-2 focus:ring-[#C89355]/30 focus:border-[#C89355] outline-none text-white font-mono font-bold px-4 text-center dir-ltr" value={formData.capacity} onChange={(e) => setFormData({...formData, capacity: e.target.value})} />
//                 </div>
//               </div>
//             </div>
//           </form>
//         </div>

//         <div className="p-6 sm:p-8 bg-[#1a2530]/80 border-t border-white/5 flex justify-end shrink-0 relative z-10">
//           <button type="submit" form="busForm" className="bg-[#C89355] text-[#101720] px-10 py-4 rounded-2xl font-black flex items-center gap-3 hover:bg-[#d0b468] active:scale-95 transition-all shadow-[0_0_20px_rgba(200,147,85,0.3)]">
//             <Save size={20}/> حفظ بيانات الباص
//           </button>
//         </div>
//       </div>
//     </div>,
//     document.body
//   );
// }

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
    return () => { document.body.style.overflow = "unset"; };
  }, [isOpen]);

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
    <div className="fixed inset-0 z-999999 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-md transition-all duration-300" dir="rtl">
      <div className="bg-[#101720] rounded-[2.5rem] shadow-[0_30px_90px_-15px_rgba(0,0,0,0.9)] w-full max-w-3xl overflow-hidden flex flex-col border border-white/10 outline-dashed outline-1 outline-[#C89355]/30 -outline-offset-8 animate-in fade-in zoom-in-95 duration-300">

        <div className="p-6 sm:p-8 border-b border-white/5 flex justify-between items-center bg-[#1a2530]/80">
          <div className="flex items-center gap-4">
            <div className="bg-[#C89355]/10 p-3 rounded-2xl border border-[#C89355]/20">
              <Bus className="text-[#C89355]" size={28} />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">{initialData ? "تعديل بيانات الباص" : "تسجيل باص جديد"}</h2>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white bg-[#263544] p-2.5 rounded-2xl"><X size={24} /></button>
        </div>

        <div className="overflow-y-auto custom-scrollbar p-8 sm:p-10 relative">
          <form id="busForm" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 text-right">
            <div>
              <label className="block text-xs font-black text-[#C89355] mb-2 uppercase">الخط / مسار الرحلة</label>
              <div className="relative group"><input type="text" required className="w-full p-4 bg-[#1a2530] border border-[#263544] rounded-2xl focus:border-[#C89355] outline-none text-white font-bold pr-12" value={formData.route} onChange={(e) => setFormData({ ...formData, route: e.target.value })} /><MapPin className="absolute right-4 top-4 text-slate-500" size={22} /></div>
            </div>
            <div>
              <label className="block text-xs font-black text-[#C89355] mb-2 uppercase">رقم اللوحة</label>
              <div className="relative group"><input type="text" required className="w-full p-4 bg-[#1a2530] border border-[#263544] rounded-2xl focus:border-[#C89355] outline-none text-white font-mono font-bold pr-12 dir-ltr text-left" value={formData.plateNumber} onChange={(e) => setFormData({ ...formData, plateNumber: e.target.value })} /><Hash className="absolute right-4 top-4 text-slate-500" size={22} /></div>
            </div>
            <div>
              <label className="block text-xs font-black text-[#C89355] mb-2 uppercase">اسم السائق</label>
              <div className="relative group"><input type="text" required className="w-full p-4 bg-[#1a2530] border border-[#263544] rounded-2xl focus:border-[#C89355] outline-none text-white font-bold pr-12" value={formData.driverName} onChange={(e) => setFormData({ ...formData, driverName: e.target.value })} /><User className="absolute right-4 top-4 text-slate-500" size={22} /></div>
            </div>
            <div>
              <label className="block text-xs font-black text-[#C89355] mb-2 uppercase">رقم السائق</label>
              <div className="relative group">
                <input
                  type="tel"
                  required
                  className="w-full p-4 bg-[#1a2530] border border-[#263544] rounded-2xl focus:border-[#C89355] outline-none text-white font-mono font-bold pr-12 dir-ltr text-right"
                  value={formData.driverPhone}
                  // التعديل في السطر التالي فقط
                  onChange={(e) => setFormData({ ...formData, driverPhone: e.target.value.replace(/\D/g, '') })}
                />
                <Phone className="absolute right-4 top-4 text-slate-500" size={22} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-black text-[#C89355] mb-2 uppercase">التكلفة الإجمالية (ل.س)</label>
              <div className="relative group"><input type="number" required min={0} className="w-full p-4 bg-[#1a2530] border border-[#263544] rounded-2xl focus:border-[#C89355] outline-none text-[#C89355] text-lg font-black font-mono pr-12" value={formData.totalCost} onChange={(e) => setFormData({ ...formData, totalCost: e.target.value })} /><Coins className="absolute right-4 top-4.5 text-slate-500" size={22} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-[#C89355] mb-2 uppercase">حسم الشركة %</label>
                <div className="relative group"><input type="number" required min={0} max={100} className="w-full p-4 bg-[#1a2530] border border-[#263544] rounded-2xl focus:border-[#C89355] outline-none text-white font-mono font-bold pr-10 text-left dir-ltr" value={formData.discountPercent} onChange={(e) => setFormData({ ...formData, discountPercent: e.target.value })} /><Percent className="absolute right-4 top-4 text-slate-500" size={18} /></div>
              </div>
              <div>
                <label className="block text-xs font-black text-[#C89355] mb-2 uppercase">سعة الركاب</label>
                <input type="number" required min={1} className="w-full p-4 bg-[#1a2530] border border-[#263544] rounded-2xl focus:border-[#C89355] outline-none text-white font-mono font-bold text-center dir-ltr" value={formData.capacity} onChange={(e) => setFormData({ ...formData, capacity: e.target.value })} />
              </div>
            </div>
          </form>
        </div>

        <div className="p-6 sm:p-8 bg-[#1a2530]/80 border-t border-white/5 flex justify-end">
          <button type="submit" form="busForm" className="bg-[#C89355] text-[#101720] px-10 py-4 rounded-2xl font-black flex items-center gap-3 hover:bg-[#d0b468] active:scale-95 transition-all">
            <Save size={20} /> {initialData ? "تحديث البيانات" : "حفظ بيانات الباص"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}