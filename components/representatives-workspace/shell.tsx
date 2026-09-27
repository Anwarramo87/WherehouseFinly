"use client";
import { createContext, useContext } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle, User, Plus,
} from "lucide-react";
import { Loading } from "@/components/wms/primitives";
import { useAuthStore } from "@/stores/auth-store";
import { queryKeys } from "@/lib/query-keys";
import apiClient from "@/lib/api-client";

export interface RepProfile {
  id: string;
  name: string;
  code: string;
  customers: Array<{ customerId: string }>;
  products: Array<{ sku: string }>;
}

// Fetch this user's representative record (called once in the shell layout
// and shared across every workspace page via context).
export function useMyRepId() {
  return useQuery({
    queryKey: queryKeys.representatives.myProfile(),
    queryFn: async () => {
      const res = await apiClient.get<RepProfile>("/representatives/me/profile");
      return res.data;
    },
    staleTime: 10 * 60 * 1000,
    retry: false,
  });
}

const RepCtx = createContext<{ repId: string; repProfile: RepProfile } | null>(null);

export function useRepWorkspace() {
  const v = useContext(RepCtx);
  if (!v) throw new Error("useRepWorkspace must be used inside the rep workspace layout");
  return v;
}

export default function RepWorkspaceShell({ children }: { children: React.ReactNode }) {
  const user = useAuthStore(s => s.user);
  const { data: myProfile, isLoading: profileLoading, error: profileError } = useMyRepId();

  if (profileLoading) return (
    <div className="min-h-screen flex items-center justify-center" dir="rtl">
      <Loading label="جارٍ تحميل ملفك الشخصي..." />
    </div>
  );

  // The workspace is the rep's own personal screen. An admin or overseer
  // account has no rep record, so we explain the screen instead of telling
  // them to "contact admin" (they ARE the admin).
  const isPrivileged =
    user?.roles?.includes("admin") || user?.role === "admin" ||
    user?.roles?.includes("superadmin") || user?.role === "superadmin";

  if (profileError || !myProfile) return (
    <div className="min-h-screen flex items-center justify-center p-8" dir="rtl">
      <div className="bg-white/80 rounded-[2.5rem] border-2 border-white shadow-xl p-10 max-w-md text-center">
        <AlertTriangle size={40} className="text-amber-500 mx-auto mb-4" />
        {isPrivileged ? (
          <>
            <h2 className="text-xl font-black text-[#263544] mb-2">هذه شاشة المندوب الشخصية</h2>
            <p className="text-sm font-bold text-[#263544]/60 leading-6">
              «مساحة المندوب» خاصة بحساب المندوب نفسه — فيها مخزونه وفواتيره وتحصيلاته
              ومرتجعاته وتسويته وخطّه ومحلاته.
            </p>
            <p className="text-sm font-bold text-[#263544]/60 mt-3 leading-6">
              حسابك ({user?.username}) حساب إداري، فلا يوجد له سجل مندوب.
              سجّل دخول بحساب أحد المندوبين لاستخدام هذه المساحة، وادارة المندوبين
              تتمّ من قسم «إدارة المندوبين».
            </p>
          </>
        ) : (
          <>
            <h2 className="text-xl font-black text-[#263544] mb-2">لا يوجد حساب مندوب</h2>
            <p className="text-sm font-bold text-[#263544]/60">
              حسابك ({user?.username}) غير مرتبط بمندوب. تواصل مع المسؤول.
            </p>
          </>
        )}
      </div>
    </div>
  );

  return (
    <RepCtx.Provider value={{ repId: myProfile.id, repProfile: myProfile }}>
      <div className="min-h-screen bg-gradient-to-br from-[#f0f4f8] to-[#e8edf2]" dir="rtl">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1a2530] to-[#263544] px-6 py-5">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#C89355]/20 flex items-center justify-center">
                <User size={24} className="text-[#C89355]" />
              </div>
              <div>
                <h1 className="text-lg font-black text-white">{myProfile.name}</h1>
                <p className="text-xs font-bold text-[#C89355]">مندوب مبيعات · {myProfile.code}</p>
              </div>
            </div>
            <Link
              href="/representatives/workspace/sales"
              className="inline-flex items-center gap-2 bg-[#C89355] hover:bg-[#b9844e] text-white text-xs font-black px-4 py-2.5 rounded-xl transition-colors"
            >
              <Plus size={15} /> فاتورة جديدة
            </Link>
          </div>
        </div>

        {/* Page body */}
        <div className="max-w-5xl mx-auto px-6 py-6">{children}</div>
      </div>
    </RepCtx.Provider>
  );
}