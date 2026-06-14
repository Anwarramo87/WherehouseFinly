"use client";

import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { Plus, Bus, ChevronLeft, Edit2, Scissors, Trash2 } from "lucide-react";
import useTransportation, { type BusDetailsResponse } from "@/hooks/useTransportation";
import { useEmployees } from "@/hooks/useEmployees";

const AddBusModal = dynamic(() => import("@/components/AddBusModal"), { loading: () => null });
const AddPassengerModal = dynamic(() => import("@/components/AddPassengerModal"), { loading: () => null });
import PassengerDetailModal from "../../../components/PassengerDetailModal";

export interface Passenger {
  id?: string;
  employeeId: string;
  name?: string;
  subscriptionDate?: string;
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
      subscriptionDate: (passenger as any).subscriptionDate ?? passenger.joinDate,
    })),
  };
}

function CostCard({ label, value, isGold }: { label: string; value: string | number; isGold: boolean }) {
  return (
    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
      <span className="text-[10px] font-black text-slate-400 block mb-1.5 uppercase tracking-wider">{label}</span>
      <span className={`text-base font-mono font-black ${isGold ? 'text-[#C89355]' : 'text-[#1a2530]'}`}>
        {typeof value === 'number' ? value.toLocaleString() : value}
        {typeof value === 'number' && <span className="text-[9px] mr-1 text-slate-400 font-bold">ل.س</span>}
      </span>
    </div>
  );
}

export default function TransportationPage() {
  const { data: buses = [], createBus, updateBus, deleteBus, addPassenger, removePassenger, getBus } = useTransportation();
  const { data: employees = [] } = useEmployees({ fetchAll: true });
  const [busDetails, setBusDetails] = useState<Record<string, BusData | null>>({});
  const [modalContext, setModalContext] = useState<{ busId: string; passenger: Passenger } | null>(null);
  const [isAddBusOpen, setIsAddBusOpen] = useState(false);
  const [isAddPassengerOpen, setIsAddPassengerOpen] = useState(false);
  const [selectedBus, setSelectedBus] = useState<BusData | null>(null);
  const [editingBus, setEditingBus] = useState<BusData | null>(null);
  const [lastAddedPassengerId, setLastAddedPassengerId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      return sessionStorage.getItem("lastAddedPassengerId");
    } catch {
      return null;
    }
  });

  const safeEmployees = Array.isArray(employees) ? employees : [];
  const employeeNameMap = new Map(
    safeEmployees.map((employee: { employeeId: string; name: string }) => [employee.employeeId, employee.name])
  );

  const resolvePassengerName = (passenger: Passenger) => {
    return passenger.name || employeeNameMap.get(passenger.employeeId) || passenger.employeeId;
  };

  // Global Pooling Logic
  const { totalFleetCost, totalSubscribers, baseShare } = useMemo(() => {
    let totalCost = 0;
    let totalSubs = 0;
    let netCost = 0;

    Object.values(busDetails).forEach(bus => {
      if (!bus) return;
      totalCost += Number(bus.totalCost) || 0;
      totalSubs += bus.passengers.length;
      netCost += (Number(bus.totalCost) || 0) * (1 - (Number(bus.companyDeductionPct) || 0) / 100);
    });

    const share = totalSubs > 0 ? Number((netCost / totalSubs).toFixed(2)) : 0;

    return {
      totalFleetCost: totalCost,
      totalSubscribers: totalSubs,
      baseShare: share,
    };
  }, [busDetails]);

  const handleDeleteBus = async (busId: string, route: string) => {
    if (!confirm(`هل أنت متأكد من حذف الباص "${route}"؟\nسيتم حذف جميع اشتراكات الموظفين المرتبطة بهذا الباص.`)) return;
    try {
      await deleteBus.mutateAsync(busId);
      // Remove cached details
      setBusDetails((prev) => {
        const next = { ...prev };
        delete next[busId];
        return next;
      });
    } catch {
      // handled by hook
    }
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
      setEditingBus(null);
    }
  };

  const handleSavePassenger = async (passengerData: Passenger) => {
    if (!selectedBus) return;
    try {
      await addPassenger.mutateAsync({
        busId: selectedBus.id,
        payload: {
          employeeId: passengerData.employeeId,
          name: passengerData.name,
          subscriptionDate: passengerData.subscriptionDate,
        },
      });
      // Clear cached details so useEffect re-fetches on buses refetch
      setBusDetails((prev) => {
        const next = { ...prev };
        delete next[selectedBus.id];
        return next;
      });
      
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
      await removePassenger.mutateAsync({ busId, employeeId: passengerId });
      // Clear cached details so useEffect re-fetches on buses refetch
      setBusDetails((prev) => {
        const next = { ...prev };
        delete next[busId];
        return next;
      });
    } catch {
      // handled by hook
    }
  };

  useEffect(() => {
    if (!buses || buses.length === 0) return;
    buses.forEach((b) => {
      if (busDetails[b.id as string] !== undefined) return;
      (async () => {
        try {
          const details = await getBus(b.id as string);
          setBusDetails((prev) => ({ ...prev, [b.id as string]: normalizeBusDetails(details) }));
        } catch {
          setBusDetails((prev) => ({ ...prev, [b.id as string]: null }));
        }
      })();
    });
  }, [buses, getBus, busDetails]);

  return (
    <div className="relative z-10 w-full max-w-7xl min-h-[85vh] mx-auto flex flex-col overflow-hidden" dir="rtl">
      <div className="p-6 md:p-10 h-full overflow-y-auto custom-scrollbar relative z-10">

        {/* ─── Breadcrumb ─── */}
        <nav className="mb-6 flex items-center gap-2 text-xs font-black text-slate-500 bg-white w-fit px-4 py-2.5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="hover:text-[#1a2530] cursor-pointer transition-colors">إدارة الخدمات</span>
          <ChevronLeft size={14} className="text-[#C89355]" />
          <span className="text-[#1a2530]">نقل الموظفين</span>
        </nav>

        {/* ─── Header ─── */}
        <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <div className="p-3.5 bg-[#1a2530] rounded-2xl shadow-[0_12px_24px_rgba(26,37,48,0.35)] border border-[#C89355]/30">
                <Bus size={24} className="text-[#C89355]" strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-3xl font-black text-[#1a2530] tracking-tight">مواصلات الموظفين</h1>
                <p className="text-slate-500 text-sm font-bold mt-1 flex items-center gap-1.5">
                  <Scissors size={13} className="text-[#C89355]" />
                  إدارة الباصات، الاشتراكات، وتكاليف النقل
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => { setEditingBus(null); setIsAddBusOpen(true); }}
            className="bg-[#1a2530] hover:bg-[#263544] text-white px-6 py-3.5 rounded-2xl flex items-center gap-2.5 shadow-[0_8px_20px_rgba(26,37,48,0.3)] transition-all active:scale-[0.97] text-sm font-black group"
          >
            <Plus size={18} className="group-hover:rotate-90 transition-transform duration-200" />
            <span>إضافة حافلة</span>
          </button>
        </header>

        {/* ─── Summary Cards ─── */}
        {buses.length > 0 && (
          <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-[0_4px_20px_rgba(38,53,68,0.08)]">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-[#1a2530] flex items-center justify-center">
                  <span className="text-[#C89355] text-lg font-black">$</span>
                </div>
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider">إجمالي تكلفة الأسطول</h3>
              </div>
              <p className="text-2xl font-mono font-black text-[#1a2530]">{totalFleetCost.toLocaleString()} <span className="text-sm text-slate-400 font-bold">ل.س</span></p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-[0_4px_20px_rgba(38,53,68,0.08)]">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-[#1a2530] flex items-center justify-center">
                  <Bus size={16} className="text-[#C89355]" />
                </div>
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider">إجمالي المشتركين</h3>
              </div>
              <p className="text-2xl font-mono font-black text-[#1a2530]">{totalSubscribers} <span className="text-sm text-slate-400 font-bold">موظف</span></p>
            </div>
            <div className="bg-[#1a2530] p-6 rounded-2xl shadow-[0_8px_30px_rgba(26,37,48,0.3)] border border-[#C89355]/20 relative overflow-hidden">
              <div className="absolute -top-10 -left-10 w-32 h-32 rounded-full bg-[#C89355]/10 blur-2xl pointer-events-none" />
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-[#C89355]/20 flex items-center justify-center">
                  <span className="text-[#C89355] text-lg font-black">÷</span>
                </div>
                <h3 className="text-xs font-black text-[#C89355]/80 uppercase tracking-wider">الحصة الأساسية للموظف</h3>
              </div>
              <p className="text-2xl font-mono font-black text-[#C89355]">{baseShare.toLocaleString()} <span className="text-sm text-[#C89355]/60 font-bold">ل.س</span></p>
            </div>
          </div>
        )}

        {/* ─── Empty State ─── */}
        {buses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
            <div className="bg-[#1a2530] p-6 rounded-full mb-5 shadow-[0_12px_24px_rgba(26,37,48,0.3)]">
              <Bus size={40} className="text-[#C89355]" />
            </div>
            <h3 className="text-2xl font-black text-[#1a2530] mb-2">لا يوجد باصات مسجلة</h3>
            <p className="text-slate-500 font-bold mb-8 max-w-md">قم بإضافة باص جديد للبدء بتسجيل اشتراكات الموظفين وتتبع تكاليف النقل.</p>
            <button
              onClick={() => { setEditingBus(null); setIsAddBusOpen(true); }}
              className="bg-[#1a2530] hover:bg-[#263544] text-white px-6 py-3.5 rounded-2xl flex items-center gap-2.5 shadow-[0_8px_20px_rgba(26,37,48,0.3)] transition-all active:scale-[0.97] text-sm font-black group"
            >
              <Plus size={18} className="group-hover:rotate-90 transition-transform duration-200" />
              <span>إضافة باص</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-7">
            {buses.map((bus) => {
              const details = busDetails[bus.id];
              const passengers = details?.passengers ?? [];
              const currentPassengers = passengers.length || (bus.activePassengers ?? 0);
              const isFull = currentPassengers >= bus.capacity;

              return (
                <div key={bus.id} className="bg-white rounded-3xl shadow-[0_8px_30px_rgba(38,53,68,0.1)] border border-slate-200/80 overflow-hidden flex flex-col">

                  {/* ── Dark Navy Card Header ── */}
                  <div className="bg-[#1a2530] px-6 py-5 flex justify-between items-center">
                    <div>
                      <h2 className="text-xl font-black text-white">{bus.route}</h2>
                      <p className="text-sm text-slate-400 mt-0.5 font-bold">{bus.driverName} &middot; {bus.plateNumber}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const busData: BusData = details ?? { ...bus, passengers: [], companyDeductionPct: Number(bus.companyDeductionPct) || 0, employeeDeductionPct: Number(bus.employeeDeductionPct) || 0 };
                          setEditingBus(busData);
                          setIsAddBusOpen(true);
                        }}
                        className="p-2.5 rounded-xl bg-white/10 hover:bg-[#C89355]/20 border border-white/10 hover:border-[#C89355]/40 text-slate-300 hover:text-[#C89355] transition-all active:scale-95"
                        title="تعديل بيانات الباص"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => handleDeleteBus(bus.id, bus.route)}
                        className="p-2.5 rounded-xl bg-white/10 hover:bg-rose-500/20 border border-white/10 hover:border-rose-400/40 text-slate-300 hover:text-rose-400 transition-all active:scale-95"
                        title="حذف الباص"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* ── Gold Accent Bar ── */}
                  <div className="h-1 bg-gradient-to-l from-[#C89355] via-[#C89355]/80 to-transparent" />

                  {/* ── Card Body ── */}
                  <div className="p-6 flex flex-col flex-1">
                    {/* Stats Row */}
                    <div className="flex items-center gap-3 mb-5">
                      <div className={`flex-1 flex items-center justify-between p-3.5 rounded-2xl border ${isFull ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">الركاب</span>
                        <div className="flex items-baseline gap-1 dir-ltr">
                          <span className={`text-2xl font-black ${isFull ? 'text-rose-500' : 'text-[#1a2530]'}`}>{currentPassengers}</span>
                          <span className="text-slate-400 text-sm font-bold">/{bus.capacity}</span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <CostCard label="التكلفة الكلية" value={Number(bus.totalCost) || 0} isGold={false} />
                      </div>
                      <div className="flex-1">
                        <CostCard label="حسم الشركة" value={`${bus.companyDeductionPct}%`} isGold={false} />
                      </div>
                    </div>

                    {/* Passenger List */}
                    <div className="mb-5 flex-1">
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="font-black text-[#1a2530] text-sm">قائمة المشتركين</h3>
                        <span className="text-xs text-slate-400 font-bold bg-slate-100 px-2.5 py-1 rounded-lg">{passengers.length} مشترك</span>
                      </div>

                      {passengers.length > 0 ? (
                        <div className="border border-slate-200 rounded-2xl overflow-hidden">
                          <table className="w-full text-right">
                            <thead className="bg-[#1a2530]/[0.03]">
                              <tr className="border-b border-slate-100">
                                <th className="p-3 text-slate-400 font-black text-[10px] uppercase text-center w-20 tracking-wider">الكود</th>
                                <th className="p-3 text-slate-400 font-black text-[10px] uppercase text-right pr-3 tracking-wider">الاسم</th>
                                <th className="p-3 text-slate-400 font-black text-[10px] uppercase text-center w-20 tracking-wider">إجراء</th>
                              </tr>
                            </thead>
                            <tbody>
                              {passengers.map((p) => {
                                const isNew = lastAddedPassengerId && String(lastAddedPassengerId) === String(p.id || p.employeeId);
                                const displayName = resolvePassengerName(p);
                                return (
                                  <tr
                                    key={p.id ?? p.employeeId}
                                    onClick={() => setModalContext({ busId: bus.id, passenger: p })}
                                    className={`cursor-pointer transition-colors ${isNew ? 'bg-emerald-50 ring-1 ring-emerald-200' : 'hover:bg-slate-50'}`}
                                  >
                                    <td className="p-3 text-center font-mono text-xs text-[#1a2530] font-bold">{p.employeeId}</td>
                                    <td className="p-3 text-right font-bold text-[#1a2530] text-sm">{displayName}</td>
                                    <td className="p-3 text-center">
                                      <button onClick={(e) => { e.stopPropagation(); handleRemovePassenger(bus.id, p.employeeId); }} className="text-rose-500 hover:text-rose-600 font-black text-[11px] bg-rose-50 hover:bg-rose-100 px-3 py-1 rounded-lg transition-all">إزالة</button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed border-slate-200 rounded-2xl">
                          <Bus size={24} className="text-slate-300 mb-2" />
                          <p className="text-slate-400 text-sm font-bold">لا يوجد مشتركين حالياً</p>
                        </div>
                      )}
                    </div>

                    {/* Add Passenger Button */}
                    <button
                      onClick={() => { setSelectedBus(busDetails[bus.id] ?? { ...bus, passengers: [], companyDeductionPct: Number(bus.companyDeductionPct) || 0, employeeDeductionPct: Number(bus.employeeDeductionPct) || 0 }); setIsAddPassengerOpen(true); }}
                      disabled={isFull}
                      className="w-full bg-[#1a2530] hover:bg-[#263544] text-white py-3.5 rounded-2xl flex justify-center items-center gap-2 shadow-[0_6px_16px_rgba(26,37,48,0.2)] transition-all font-black text-sm disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
                    >
                      <Plus size={18} strokeWidth={3} />
                      إضافة موظف للباص
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {isAddBusOpen && <AddBusModal isOpen={isAddBusOpen} onClose={() => { setIsAddBusOpen(false); setEditingBus(null); }} onSave={handleSaveBus} initialData={editingBus ?? undefined} />}
      {isAddPassengerOpen && selectedBus && <AddPassengerModal isOpen={isAddPassengerOpen} onClose={() => setIsAddPassengerOpen(false)} onSave={handleSavePassenger} busData={selectedBus} />}
      {modalContext && (
        <PassengerDetailModal
          passenger={modalContext.passenger}
          busId={modalContext.busId}
          displayAmount={baseShare}
          onClose={() => setModalContext(null)}
          onRemove={handleRemovePassenger}
        />
      )}
    </div>
  );
}
