// "use client";

// import { useState, useMemo } from "react";
// import dynamic from "next/dynamic";
// import { Plus, Bus, ChevronLeft, MapPin, Users, Coins, BadgePercent, UserCheck } from "lucide-react";

// const AddBusModal = dynamic(() => import("@/components/AddBusModal"), { loading: () => null });
// const AddPassengerModal = dynamic(() => import("@/components/AddPassengerModal"), { loading: () => null });

// export interface Passenger {
//   employeeId: string;
//   name: string;
//   paidAmount: number;
//   isManual: boolean; // هل المبلغ يدوي أم تلقائي
// }

// export interface BusData {
//   id: string;
//   driverName: string;
//   driverPhone: string;
//   busNumber: string;
//   route: string;
//   capacity: number;
//   totalCost: number;
//   discountPercent: number;
//   passengers: Passenger[];
// }

// export default function TransportationPage() {
//   const [isAddBusOpen, setIsAddBusOpen] = useState(false);
//   const [isAddPassengerOpen, setIsAddPassengerOpen] = useState(false);
//   const [selectedBus, setSelectedBus] = useState<BusData | null>(null);

//   const [buses, setBuses] = useState<BusData[]>([
//     {
//       id: "1", driverName: "أبو محمد", driverPhone: "0933123456", busNumber: "123456",
//       route: "خط صحنايا - الكسوة", capacity: 30, totalCost: 1500000, discountPercent: 20,
//       passengers: [] 
//     }
//   ]);

//   const handleSaveBus = (newBus: any) => {
//     setBuses([...buses, { ...newBus, id: Date.now().toString(), passengers: [] }]);
//     setIsAddBusOpen(false);
//   };

//   const handleSavePassenger = (passengerData: Passenger) => {
//     setBuses(buses.map(bus => 
//       bus.id === selectedBus?.id 
//         ? { ...bus, passengers: [...bus.passengers, passengerData] }
//         : bus
//     ));
//     setIsAddPassengerOpen(false);
//   };

//   return (
//     <div className="relative z-10 w-full max-w-7xl min-h-[85vh] mx-auto bg-[#101720]/80 backdrop-blur-2xl rounded-[3rem] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.8)] border border-white/5 flex flex-col overflow-hidden" dir="rtl">

//         <div className="absolute inset-0 opacity-[0.06] pointer-events-none z-0"
//           style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='24' height='24' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 12h24M12 0v24' stroke='%23C89355' stroke-width='1' stroke-dasharray='4 4' fill='none'/%3E%3C/svg%3E")`, backgroundSize: '24px 24px' }}
//         />

//         <div className="p-6 md:p-10 h-full overflow-y-auto custom-scrollbar relative z-10">
//           <nav className="mb-6 relative overflow-hidden flex items-center gap-2 text-xs font-black text-slate-400 bg-[#1a2530]/60 backdrop-blur-xl w-fit px-4 py-2.5 rounded-2xl border border-white/5 shadow-sm group">
//             <div className="absolute inset-1 rounded-xl border border-dashed border-[#C89355]/30 pointer-events-none" />
//             <span className="text-white relative z-10">إدارة الخدمات</span>
//             <ChevronLeft size={14} className="text-[#C89355] relative z-10" />
//             <span className="text-white relative z-10">نقل الموظفين</span>
//           </nav>

//           <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-6">
//             <div>
//               <div className="flex items-center gap-4 mb-2">
//                 <div className="p-3 bg-[#1a2530] rounded-2xl shadow-lg border border-[#C89355]/40 relative outline-dashed outline-1 outline-[#C89355]/50 outline-offset-4">
//                   <Bus size={24} className="text-[#C89355]" strokeWidth={2.5} />
//                 </div>
//                 <h1 className="text-3xl font-black text-white tracking-tight">مواصلات الموظفين</h1>
//               </div>
//             </div>

//             <button onClick={() => setIsAddBusOpen(true)} className="relative overflow-hidden bg-[#1a2530] hover:bg-[#263544] text-[#C89355] px-6 py-3 rounded-2xl flex items-center gap-2 shadow-[0_10px_20px_rgba(0,0,0,0.3)] transition-all active:scale-95 text-sm font-black border border-[#C89355]/40 group">
//               <div className="absolute inset-1.5 rounded-xl border border-dashed border-[#C89355]/30 pointer-events-none" />
//               <Plus size={18} className="group-hover:animate-spin relative z-10" /> 
//               <span className="relative z-10">إضافة حافلة</span>
//             </button>
//           </header>

//           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//             {buses.map((bus) => {
//               const currentPassengers = bus.passengers.length;
//               const isFull = currentPassengers >= bus.capacity;
//               const netCost = bus.totalCost - (bus.totalCost * (bus.discountPercent / 100));

//               return (
//                 <div key={bus.id} className="relative bg-[#1a2530]/40 backdrop-blur-2xl rounded-[2.5rem] shadow-sm border-2 border-[#263544] p-6 sm:p-8 overflow-hidden">
//                   <div className="absolute inset-1.5 rounded-[2.2rem] border border-dashed border-[#C89355]/20 pointer-events-none z-0" />

//                   <div className="relative z-10 flex flex-col h-full">
//                     <div className="flex justify-between items-start mb-6 border-b border-white/5 pb-5">
//                       <div>
//                         <h2 className="text-xl font-black text-white mb-1">{bus.route}</h2>
//                         <p className="text-sm font-bold text-slate-400">السائق: {bus.driverName} | {bus.busNumber}</p>
//                       </div>
//                       <div className={`flex flex-col items-center justify-center min-w-[70px] p-2.5 rounded-2xl border ${isFull ? 'bg-rose-500/10 border-rose-500/30' : 'bg-[#101720] border-[#C89355]/30'}`}>
//                         <div className="flex items-baseline gap-1 dir-ltr">
//                           <span className={`text-xl font-black ${isFull ? 'text-rose-500' : 'text-[#C89355]'}`}>{currentPassengers}</span>
//                           <span className="text-slate-500 text-sm font-bold">/{bus.capacity}</span>
//                         </div>
//                         <span className="text-[9px] font-bold text-slate-400">الركاب</span>
//                       </div>
//                     </div>

//                     <div className="grid grid-cols-3 gap-3 mb-8">
//                       <CostCard label="التكلفة الكلية" value={bus.totalCost} isGold={false} />
//                       <CostCard label="حسم الشركة" value={`${bus.discountPercent}%`} isGold={false} />
//                       <CostCard label="الصافي للركاب" value={netCost} isGold={true} />
//                     </div>

//                     <button onClick={() => { setSelectedBus(bus); setIsAddPassengerOpen(true); }} disabled={isFull}
//                       className="w-full bg-[#C89355] hover:bg-[#b07d45] text-[#101720] py-3.5 rounded-2xl flex justify-center items-center gap-2 shadow-[0_5px_15px_rgba(200,147,85,0.2)] transition-all font-black text-sm disabled:opacity-50">
//                       <Plus size={18} strokeWidth={3} /> إضافة موظف للباص
//                     </button>
//                   </div>
//                 </div>
//               );
//             })}
//           </div>
//         </div>

//         {isAddBusOpen && <AddBusModal isOpen={isAddBusOpen} onClose={() => setIsAddBusOpen(false)} onSave={handleSaveBus} />}
//         {isAddPassengerOpen && selectedBus && <AddPassengerModal isOpen={isAddPassengerOpen} onClose={() => setIsAddPassengerOpen(false)} onSave={handleSavePassenger} busData={selectedBus} />}
//     </div>
//   );
// }

// function CostCard({ label, value, isGold }: { label: string, value: string | number, isGold: boolean }) {
//   return (
//     <div className="bg-[#101720]/60 p-3 rounded-xl border border-[#263544]">
//       <span className="text-[9px] font-black text-slate-500 block mb-1 uppercase">{label}</span>
//       <span className={`text-sm font-mono font-black ${isGold ? 'text-[#C89355]' : 'text-white'}`}>
//         {typeof value === 'number' ? value.toLocaleString() : value}
//         {typeof value === 'number' && <span className="text-[8px] mr-1">ل.س</span>}
//       </span>
//     </div>
//   );
// }

"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Plus, Bus, ChevronLeft } from "lucide-react";
import useTransportation, { type BusDetailsResponse } from "@/hooks/useTransportation";
import { useEmployees } from "@/hooks/useEmployees";

const AddBusModal = dynamic(() => import("@/components/AddBusModal"), { loading: () => null });
const AddPassengerModal = dynamic(() => import("@/components/AddPassengerModal"), { loading: () => null });
import PassengerDetailModal from "../../../components/PassengerDetailModal";

export interface Passenger {
  id?: string;
  employeeId: string;
  name?: string;
  paidAmount?: number;
  isManual?: boolean;
}

export interface BusData {
  id: string;
  driverName: string;
  driverPhone: string;
  plateNumber: string;
  route: string;
  capacity: number;
  totalCost: number;
  companyDeductionPct: number;
  employeeDeductionPct: number;
  status?: string;
  passengers: Passenger[];
}



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

type PassengerDisplayMeta = {
  id?: string;
  employeeId: string;
  name?: string;
  paidAmount?: number;
  isManual?: boolean;
};

type PassengerCache = Record<string, Record<string, PassengerDisplayMeta>>;

function normalizeBusDetails(details: BusDetailsResponse): BusData {
  return {
    id: details.id,
    driverName: details.driverName,
    driverPhone: details.driverPhone,
    plateNumber: details.plateNumber,
    route: details.route,
    capacity: details.capacity,
    totalCost: details.totalCost,
    companyDeductionPct: details.companyDeductionPct,
    employeeDeductionPct: details.employeeDeductionPct,
    status: details.status,
    passengers: (details.passengers || []).map((passenger) => ({
      id: passenger.id,
      employeeId: passenger.employeeId,
      name: passenger.name || passenger.employeeId,
      paidAmount: passenger.paidAmount === undefined ? undefined : passenger.paidAmount,
      isManual: passenger.isManual ?? false,
    })),
  };
}

function mergePassengerPresentation(bus: BusData, passenger: Passenger): BusData {
  const nextPassengers = [...bus.passengers];
  const existingIndex = nextPassengers.findIndex(
    (item) => item.id === passenger.id || item.employeeId === passenger.employeeId,
  );

  const normalizedPassenger: Passenger = {
    ...passenger,
    name: passenger.name || nextPassengers[existingIndex]?.name || passenger.employeeId,
    paidAmount: passenger.paidAmount ?? nextPassengers[existingIndex]?.paidAmount ?? 0,
    isManual: passenger.isManual ?? nextPassengers[existingIndex]?.isManual ?? false,
  };

  if (existingIndex >= 0) {
    nextPassengers[existingIndex] = {
      ...nextPassengers[existingIndex],
      ...normalizedPassenger,
    };
  } else {
    nextPassengers.push(normalizedPassenger);
  }

  return {
    ...bus,
    passengers: nextPassengers,
  };
}

function loadPassengerCache(): PassengerCache {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem("transportationPassengerCache");
    if (!raw) return {};
    const parsed = JSON.parse(raw) as PassengerCache;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function savePassengerCache(cache: PassengerCache) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem("transportationPassengerCache", JSON.stringify(cache));
  } catch {
    // ignore storage failures
  }
}

function CostCard({ label, value, isGold }: { label: string; value: string | number; isGold: boolean }) {
  return (
    <div className="bg-[#101720]/60 p-3 rounded-xl border border-[#263544]">
      <span className="text-[9px] font-black text-slate-500 block mb-1 uppercase">{label}</span>
      <span className={`text-sm font-mono font-black ${isGold ? 'text-[#C89355]' : 'text-white'}`}>
        {typeof value === 'number' ? value.toLocaleString() : value}
        {typeof value === 'number' && <span className="text-[8px] mr-1">ل.س</span>}
      </span>
    </div>
  );
}

export default function TransportationPage() {
  const { data: buses = [], createBus, updateBus, addPassenger, removePassenger, getBus } = useTransportation();
  const { data: employees = [] } = useEmployees({ fetchAll: true });
  const [busDetails, setBusDetails] = useState<Record<string, BusData | null>>({});
  const [passengerCache, setPassengerCache] = useState<PassengerCache>(() => loadPassengerCache());
  const [modalContext, setModalContext] = useState<{ busId: string; passenger: Passenger } | null>(null);
  const [isAddBusOpen, setIsAddBusOpen] = useState(false);
  const [isAddPassengerOpen, setIsAddPassengerOpen] = useState(false);
  const [selectedBus, setSelectedBus] = useState<BusData | null>(null);
  const [lastAddedPassengerId, setLastAddedPassengerId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      return sessionStorage.getItem("lastAddedPassengerId");
    } catch {
      return null;
    }
  });

  // Merge passenger cache presentation into bus details whenever cache updates
  useEffect(() => {
    if (!passengerCache || Object.keys(passengerCache).length === 0) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBusDetails((prev) => {
      const next = { ...prev };
      for (const busId of Object.keys(next)) {
        const bus = next[busId];
        if (!bus) continue;
        const busCache = passengerCache[busId] || {};
        const mergedPassengers = bus.passengers.map((p) => {
          const key = p.employeeId;
          const meta = busCache[key];
          if (!meta) return p;
          return {
            ...p,
            name: meta.name || p.name,
            paidAmount: typeof meta.paidAmount === 'number' ? meta.paidAmount : p.paidAmount,
            isManual: typeof meta.isManual === 'boolean' ? meta.isManual : p.isManual,
          };
        });
        next[busId] = { ...bus, passengers: mergedPassengers };
      }
      return next;
    });
  }, [passengerCache]);

  const safeEmployees = Array.isArray(employees) ? employees : [];
  const employeeNameMap = new Map(
    safeEmployees.map((employee: { employeeId: string; name: string }) => [employee.employeeId, employee.name])
  );

  const resolvePassengerName = (busId: string, passenger: Passenger) => {
    const cached = passengerCache[busId]?.[passenger.employeeId];
    return cached?.name || passenger.name || employeeNameMap.get(passenger.employeeId) || passenger.employeeId;
  };

  const resolvePassengerAmount = (busId: string, passenger: Passenger) => {
    const cached = passengerCache[busId]?.[passenger.employeeId];
    if (typeof cached?.paidAmount === "number") return cached.paidAmount;
    if (typeof passenger.paidAmount === "number") return passenger.paidAmount;
    return undefined;
  };



  const handleSaveBus = async (newBus: BusPayload) => {
    try {
      if (newBus.id) {
        await updateBus.mutateAsync({ id: newBus.id, data: newBus });
      } else {
        await createBus.mutateAsync(newBus);
      }
    } catch {
      // handled by hook
    } finally {
      setIsAddBusOpen(false);
    }
  };



  const handleSavePassenger = async (passengerData: Passenger) => {
    if (!selectedBus) return;
    try {
      await addPassenger.mutateAsync({
        busId: selectedBus.id,
        busId: selectedBus.id,
        payload: {
          employeeId: passengerData.employeeId,
          name: passengerData.name,
          paidAmount: passengerData.paidAmount,
          isManual: passengerData.isManual,
        },
      });
      const refreshedBus = await getBus(selectedBus.id);
      const refreshedWithPresentation = mergePassengerPresentation(
        normalizeBusDetails(refreshedBus),
        passengerData,
      );
      setBusDetails((prev) => ({ ...prev, [selectedBus.id]: refreshedWithPresentation }));
      const cacheEntry: PassengerDisplayMeta = {
        employeeId: passengerData.employeeId,
        name: passengerData.name || employeeNameMap.get(passengerData.employeeId) || passengerData.employeeId,
        paidAmount: passengerData.paidAmount,
        isManual: passengerData.isManual,
      };
      setPassengerCache((prev) => {
        const next = {
          ...prev,
          [selectedBus.id]: {
            ...(prev[selectedBus.id] || {}),
            [cacheEntry.employeeId]: cacheEntry,
          },
        };
        savePassengerCache(next);
        return next;
      });
      // store employeeId as lastAdded marker for reliable highlight
      const newId = passengerData.employeeId;
      try {
        sessionStorage.setItem("lastAddedPassengerId", String(newId));
      } catch {
        // ignore
      }
      setLastAddedPassengerId(String(newId));
    } catch {
      // handled by hook
    } finally {
      setIsAddPassengerOpen(false);
    }
  };

  const handleRemovePassenger = async (busId: string, passengerId: string) => {
    if (!confirm("هل أنت متأكد من إزالة هذا الموظف من الباص؟")) return;
    try {
      // passengerId here may be composite in UI; assume employeeId is the employee code
      await removePassenger.mutateAsync({ busId, employeeId: passengerId });
      const refreshedBus = await getBus(busId);
      setBusDetails((prev) => ({ ...prev, [busId]: normalizeBusDetails(refreshedBus) }));
      setPassengerCache((prev) => {
        const busCache = { ...(prev[busId] || {}) };
        delete busCache[passengerId];
        const next = { ...prev, [busId]: busCache };
        savePassengerCache(next);
        return next;
      });
    } catch {
      // handled by hook
    }
  };

  // Fetch bus details (with passengers) for display
  useEffect(() => {
    if (!buses || buses.length === 0) return;
    buses.forEach((b: Record<string, unknown>) => {
      if (busDetails[b.id as string] !== undefined) return;
      (async () => {
        try {
          const details = await getBus(b.id as string);
          // normalize then merge any cached presentation (session) immediately
          const normalized = normalizeBusDetails(details);
          const busCache = passengerCache[b.id] || {};
          normalized.passengers = normalized.passengers.map((p) => {
            const key = p.employeeId;
            const meta = busCache[key];
            if (!meta) return p;
            return {
              ...p,
              name: meta.name || p.name,
              paidAmount: typeof meta.paidAmount === 'number' ? meta.paidAmount : p.paidAmount,
              isManual: typeof meta.isManual === 'boolean' ? meta.isManual : p.isManual,
            };
          });
          setBusDetails((prev) => ({ ...prev, [b.id as string]: normalized }));
        } catch {
          // ignore per-bus failure
          setBusDetails((prev) => ({ ...prev, [b.id as string]: null }));
        }
      })();
    });
  }, [buses, getBus, busDetails, passengerCache]);

  return (
    <div className="relative z-10 w-full max-w-7xl min-h-[85vh] mx-auto bg-[#101720]/80 backdrop-blur-2xl rounded-[3rem] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.8)] border border-white/5 flex flex-col overflow-hidden" dir="rtl">
      <div
        className="absolute inset-0 opacity-[0.06] pointer-events-none z-0"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='24' height='24' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 12h24M12 0v24' stroke='%23C89355' stroke-width='1' stroke-dasharray='4 4' fill='none'/%3E%3C/svg%3E")`, backgroundSize: '24px 24px' }}
      />

      <div className="p-6 md:p-10 h-full overflow-y-auto custom-scrollbar relative z-10">
        <nav className="mb-6 relative overflow-hidden flex items-center gap-2 text-xs font-black text-slate-400 bg-[#1a2530]/60 backdrop-blur-xl w-fit px-4 py-2.5 rounded-2xl border border-white/5 shadow-sm group">
          <div className="absolute inset-1 rounded-xl border border-dashed border-[#C89355]/30 pointer-events-none" />
          <span className="text-white relative z-10">إدارة الخدمات</span>
          <ChevronLeft size={14} className="text-[#C89355] relative z-10" />
          <span className="text-white relative z-10">نقل الموظفين</span>
        </nav>

        <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-6">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <div className="p-3 bg-[#1a2530] rounded-2xl shadow-lg border border-[#C89355]/40 relative outline-dashed outline-1 outline-[#C89355]/50 outline-offset-4">
                <Bus size={24} className="text-[#C89355]" strokeWidth={2.5} />
              </div>
              <h1 className="text-3xl font-black text-white tracking-tight">مواصلات الموظفين</h1>
            </div>
          </div>

          <button onClick={() => { setSelectedBus(null); setIsAddBusOpen(true); }} className="relative overflow-hidden bg-[#1a2530] hover:bg-[#263544] text-[#C89355] px-6 py-3 rounded-2xl flex items-center gap-2 shadow-[0_10px_20px_rgba(0,0,0,0.3)] transition-all active:scale-95 text-sm font-black border border-[#C89355]/40 group">
            <div className="absolute inset-1.5 rounded-xl border border-dashed border-[#C89355]/30 pointer-events-none" />
            <Plus size={18} className="group-hover:animate-spin relative z-10" />
            <span className="relative z-10">إضافة حافلة</span>
          </button>
        </header>

        {buses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="bg-[#1a2530]/60 p-6 rounded-full mb-4 shadow-sm border border-white/5">
              <Bus size={48} className="text-slate-300" />
            </div>
            <h3 className="text-xl font-black text-slate-200 mb-2">لا يوجد باصات مسجلة</h3>
            <p className="text-slate-400 font-bold mb-6">قم بإضافة باص جديد للبدء بتسجيل اشتراكات الموظفين.</p>
            <button
              onClick={() => setIsAddBusOpen(true)}
              className="relative overflow-hidden bg-[#1a2530] hover:bg-[#263544] text-[#C89355] px-5 py-3 rounded-2xl flex items-center gap-2 shadow-[0_10px_20px_rgba(0,0,0,0.3)] transition-all active:scale-95 text-sm font-black border border-[#C89355]/40 group"
            >
              <div className="absolute inset-1.5 rounded-xl border border-dashed border-[#C89355]/30 pointer-events-none" />
              <Plus size={18} className="group-hover:animate-spin relative z-10" />
              <span className="relative z-10">إضافة باص</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {buses.map((bus) => {
              const details = busDetails[bus.id];
              const passengers = details?.passengers ?? [];
              const currentPassengers = passengers.length || (bus.activePassengers ?? 0);
              const isFull = currentPassengers >= bus.capacity;
              const netCost = bus.totalCost - (bus.totalCost * (bus.companyDeductionPct / 100));

              return (
                <div key={bus.id} className="relative bg-[#1a2530]/40 backdrop-blur-2xl rounded-[2.5rem] shadow-sm border-2 border-[#263544] p-6 sm:p-8 overflow-hidden">
                  <div className="absolute inset-1.5 rounded-[2.2rem] border border-dashed border-[#C89355]/20 pointer-events-none z-0" />

                  <div className="relative z-10 flex flex-col h-full">
                    <div className="flex justify-between items-start mb-6 border-b border-white/5 pb-5">
                      <div>
                        <h2 className="text-xl font-black text-white mb-1">{bus.route}</h2>
                        <p className="text-sm font-bold text-slate-400">السائق: {bus.driverName} | {bus.plateNumber}</p>
                      </div>
                      <div style={{ minWidth: 70 }} className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border ${isFull ? 'bg-rose-500/10 border-rose-500/30' : 'bg-[#101720] border-[#C89355]/30'}`}>
                        <div className="flex items-baseline gap-1 dir-ltr">
                          <span className={`text-xl font-black ${isFull ? 'text-rose-500' : 'text-[#C89355]'}`}>{currentPassengers}</span>
                          <span className="text-slate-500 text-sm font-bold">/{bus.capacity}</span>
                        </div>
                        <span className="text-[9px] font-bold text-slate-400">الركاب</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-6">
                      <CostCard label="التكلفة الكلية" value={bus.totalCost} isGold={false} />
                      <CostCard label="حسم الشركة" value={`${bus.companyDeductionPct}%`} isGold={false} />
                      <CostCard label="الصافي للركاب" value={netCost} isGold={true} />
                    </div>

                    {/* قائمة الركاب */}
                    <div className="mb-6">
                      <div className="flex justify-between items-end mb-3 px-2">
                        <h3 className="font-black text-[#263544]">قائمة المشتركين بالباص</h3>
                        <span className="text-sm text-slate-500">{passengers.length} مشترك</span>
                      </div>

                      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                        <table className="w-full text-right">
                          <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                              <th className="p-4 text-slate-500 font-black text-xs uppercase text-center w-24">الكود</th>
                              <th className="p-4 text-slate-500 font-black text-xs uppercase text-right pr-2">الاسم</th>
                              <th className="p-4 text-slate-500 font-black text-xs uppercase text-center">المبلغ</th>
                              <th className="p-4 text-slate-500 font-black text-xs uppercase text-center w-28">إجراء</th>
                            </tr>
                          </thead>
                          <tbody>
                            {passengers.map((p) => {
                              const isNew = lastAddedPassengerId && String(lastAddedPassengerId) === String(p.id || p.employeeId);
                              const displayName = resolvePassengerName(bus.id, p);
                              const displayAmount = resolvePassengerAmount(bus.id, p);
                              return (
                                <tr
                                  key={p.id ?? p.employeeId}
                                  onClick={() => setModalContext({ busId: bus.id, passenger: p })}
                                  className={`cursor-pointer ${isNew ? 'bg-emerald-50 ring-2 ring-emerald-200' : ''}`}
                                >
                                  <td className="p-4 text-center font-mono text-sm">{p.employeeId}</td>
                                  <td className="p-4 text-right font-bold">{displayName}</td>
                                  <td className="p-4 text-center text-sm">{typeof displayAmount === 'number' ? displayAmount.toLocaleString() : '—'}</td>
                                  <td className="p-4 text-center">
                                    <button onClick={(e) => { e.stopPropagation(); handleRemovePassenger(bus.id, p.employeeId); }} className="text-rose-600 font-black text-xs">إزالة</button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <button onClick={() => { setSelectedBus(busDetails[bus.id] ?? { ...bus, passengers: [], companyDeductionPct: bus.companyDeductionPct, employeeDeductionPct: bus.employeeDeductionPct ?? 0 }); setIsAddPassengerOpen(true); }} disabled={isFull} className="w-full bg-[#C89355] hover:bg-[#b07d45] text-[#101720] py-3.5 rounded-2xl flex justify-center items-center gap-2 shadow-[0_5px_15px_rgba(200,147,85,0.2)] transition-all font-black text-sm disabled:opacity-50">
                      <Plus size={18} strokeWidth={3} /> إضافة موظف للباص
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {isAddBusOpen && <AddBusModal isOpen={isAddBusOpen} onClose={() => setIsAddBusOpen(false)} onSave={handleSaveBus} initialData={selectedBus ?? undefined} />}
      {isAddPassengerOpen && selectedBus && <AddPassengerModal isOpen={isAddPassengerOpen} onClose={() => setIsAddPassengerOpen(false)} onSave={handleSavePassenger} busData={selectedBus} />}
      {modalContext && (
        <PassengerDetailModal
          passenger={modalContext.passenger}
          busId={modalContext.busId}
          onClose={() => setModalContext(null)}
          onRemove={handleRemovePassenger}
        />
      )}
    </div>
  );
}