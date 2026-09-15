"use client";

import { usePathname } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { useEntitlements } from "@/hooks/useEntitlements";
import { isRouteEnabled } from "@/lib/entitlements";
import { useAuthStore } from "@/stores/auth-store";

/**
 * Refuses to render a dashboard page whose factory has not been sold it.
 *
 * The sidebar already hides entries a factory does not hold, but the menu and
 * the address bar are different doors. Typing a path in bypasses the menu, so
 * this gate sits inside the dashboard layout and repeats the check on the
 * current route. The backend PageAccessGuard remains the real control — a
 * stale cache here at worst shows the refusal panel too briefly.
 */
export default function EntitlementGate({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const { data: entitlements } = useEntitlements();
  const user = useAuthStore((state) => state.user);

  const isSuperAdmin =
    user?.roles?.includes("superadmin") || user?.role === "superadmin";

  // Unknown entitlements renders children while the request is in flight,
  // matching the sidebar's rule; the API still decides.
  const allowed = isSuperAdmin || isRouteEnabled(pathname, entitlements);

  if (allowed) return <>{children}</>;

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center p-8">
      <div className="w-16 h-16 rounded-2xl bg-[#C89355]/10 border border-[#C89355]/30 flex items-center justify-center">
        <ShieldAlert className="text-[#C89355]" size={28} />
      </div>
      <div>
        <h1 className="text-xl font-black text-[#263544] mb-2">
          هذه الوحدة غير مفعّلة لمصنعك
        </h1>
        <p className="text-slate-500 font-bold text-sm max-w-md">
          لم يتم شراء هذه الصفحة بعد، أو قام المشرف العام بإيقافها. راسل مدير
          النظام إن كنت تعتقد أن هذا خطأ.
        </p>
      </div>
    </div>
  );
}