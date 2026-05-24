// "use client";

// import { useState, useSyncExternalStore } from 'react';
// import Link from 'next/link';
// import { usePathname, useRouter } from 'next/navigation';
// import {
//   LayoutDashboard, Users, ClipboardList,
//   Wallet, Box, FileInput, Settings, Fingerprint,
//   ChevronDown, LogOut, Hexagon,
//   ChevronsRight, UserMinus
// } from 'lucide-react';

// import { useAuthStore } from '@/stores/auth-store';
// import { resetAuthVerificationCache } from '@/lib/auth-verify';
// import apiClient from '@/lib/api-client';

// const menuItems = [
//   { name: 'الرئيسية: إحصائيات', icon: LayoutDashboard, href: '/home' },
//   { name: 'إدارة الموظفين', icon: Users, href: '/employees', roles: ['admin', 'hr', 'manager'] },
//   { name: 'المستقيلون', icon: UserMinus, href: '/resigned', roles: ['admin', 'hr', 'manager'] },
//   { name: 'سجل الحضور', icon: ClipboardList, href: '/attendance', roles: ['admin', 'hr', 'manager'] },
//   {
//     name: 'الرواتب', icon: Wallet, roles: ['admin', 'finance', 'manager'],
//     subItems: [
//       { name: 'إعدادات الرواتب', href: '/salaries' },
//       { name: 'السلف', href: '/salaries/advances' },
//       { name: 'المكافآت والخصومات', href: '/salaries/bonuses' },
//       { name: 'مسير الرواتب', href: '/salaries/payroll' },
//     ]
//   },
//   { name: 'بصمتي وحضوري', icon: Fingerprint, href: '/biometric' },
//   { name: 'مخزن الشغل', icon: Box, href: '/inventory', roles: ['admin', 'warehouse', 'manager'] },
//   { name: 'استيراد البيانات', icon: FileInput, href: '/importData', roles: ['admin', 'manager'] },
//   { name: 'الإعدادات', icon: Settings, href: '/settings', roles: ['admin'] },
// ];

// function useIsHydrated() {
//   return useSyncExternalStore(
//     () => () => {},
//     () => true,
//     () => false,
//   );
// }

// export default function Sidebar() {
//   const pathname = usePathname();
//   const router = useRouter();
//   const isHydrated = useIsHydrated();

//   const currentUser = useAuthStore((state) => state.user);
//   const clear = useAuthStore((state) => state.clear);
//   const hasAnyRole = useAuthStore((state) => state.hasAnyRole);

//   const [isCollapsed, setIsCollapsed] = useState(false);
//   const [openMenu, setOpenMenu] = useState<string | null>(null);

//   const displayName = currentUser?.name || currentUser?.username || 'مدير النظام';
//   const displayRole = currentUser?.role || 'مشرف عام';

//   const visibleMenuItems = menuItems.filter((item) => {
//     if (!item.roles || item.roles.length === 0) return true;
//     if (!isHydrated) return false;
//     return hasAnyRole(item.roles);
//   });

//   const activeSubMenu = menuItems.find(item =>
//     item.subItems?.some(sub => pathname.startsWith(sub.href))
//   )?.name;

//   const toggleSubMenu = (menuName: string) => {
//     if (isCollapsed) setIsCollapsed(false);
//     setOpenMenu(openMenu === menuName ? null : menuName);
//   };

//   const handleLogout = async () => {
//     try { await apiClient.post('/auth/logout'); } catch {}
//     clear();
//     resetAuthVerificationCache();
//     router.replace('/login');
//   };

//   return (
//     <div className="h-screen sticky top-0 flex bg-slate-50 font-sans" dir="rtl">
//       <aside
//         className={`relative h-full bg-white/70 backdrop-blur-2xl border-y border-l border-white/80 shadow-[0_20px_60px_-15px_rgba(0,187,167,0.15)] rounded-l-4xl flex flex-col transition-all duration-500 ease-out z-50
//           ${isCollapsed ? 'w-24' : 'w-72'}
//         `}
//       >
//         <button
//           onClick={() => setIsCollapsed(!isCollapsed)}
//           className="absolute -left-4 top-10 bg-white border border-slate-100 shadow-lg shadow-[#00bba7]/10 p-2 rounded-full text-[#E7C873] hover:text-[#00bba7] hover:scale-110 transition-all duration-300 z-50 group"
//           aria-label="Toggle Sidebar"
//         >
//           <ChevronsRight size={18} className={`transition-transform duration-500 ease-out ${isCollapsed ? 'rotate-180 text-[#00bba7]' : ''}`} />
//         </button>

//         <div className="flex items-center gap-4 p-6 mb-4">
//           <div className="relative group shrink-0">
//             <div className="absolute inset-0 bg-[#00bba7] blur-md opacity-30 group-hover:opacity-60 transition-opacity duration-300 rounded-xl" />
//             <div className="relative bg-linear-to-br from-[#00bba7] to-[#009485] p-2.5 rounded-xl shadow-md border border-white/20">
//               <Hexagon size={26} className="fill-[#E7C873] text-[#E7C873] animate-[spin_10s_linear_infinite]" style={{ animationPlayState: 'paused' }} onMouseEnter={(e) => e.currentTarget.style.animationPlayState = 'running'} onMouseLeave={(e) => e.currentTarget.style.animationPlayState = 'paused'} />
//             </div>
//           </div>
//           <div className={`overflow-hidden transition-all duration-500 ease-out ${isCollapsed ? 'w-0 opacity-0' : 'w-full opacity-100'}`}>
//             <h1 className="text-2xl font-black bg-linear-to-l from-slate-800 to-slate-500 bg-clip-text text-transparent tracking-tight">BookS</h1>
//             <p className="text-[10px] font-bold text-[#00bba7] uppercase tracking-widest mt-0.5">Clothes Factory</p>
//           </div>
//         </div>

//         <nav className="flex-1 space-y-2 px-4 pb-4 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
//           {visibleMenuItems.map((item) => {
//             const hasSubItems = !!item.subItems;
//             const isMainActive = (item.href && pathname.startsWith(item.href)) || 
//                                  (hasSubItems && item.subItems?.some(sub => pathname.startsWith(sub.href)));
//             const isOpen = openMenu === item.name || activeSubMenu === item.name;

//             return (
//               <div key={item.name} className="relative">
//                 <div className={`absolute right-0 top-1/2 -translate-y-1/2 w-1.5 bg-[#E7C873] rounded-l-full shadow-[0_0_12px_rgba(231,200,115,0.8)] transition-all duration-500 z-10 ${isMainActive ? 'h-8 opacity-100' : 'h-0 opacity-0'}`} />

//                 {hasSubItems ? (
//                   <button
//                     onClick={() => toggleSubMenu(item.name)}
//                     className={`w-full flex items-center justify-between py-2.5 px-4 rounded-xl transition-all duration-300 group relative overflow-hidden
//                       ${isMainActive || isOpen ? 'bg-linear-to-l from-[#00bba7]/10 to-transparent' : 'hover:bg-slate-50/80'}
//                     `}
//                   >
//                     <div className="flex items-center gap-3 relative z-10">
//                       <div className={`p-2 rounded-xl transition-all duration-300 flex items-center justify-center
//                         ${isMainActive || isOpen 
//                           ? 'bg-[#00bba7] text-[#E7C873] shadow-md shadow-[#00bba7]/30' 
//                           : 'bg-slate-100 text-[#E7C873] group-hover:bg-[#E7C873]/10'}
//                       `}>
//                         <item.icon 
//                           size={20} 
//                           strokeWidth={isMainActive ? 2.5 : 2} 
//                           className="transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3" 
//                         />
//                       </div>
//                       {!isCollapsed && (
//                         <span className={`text-sm transition-all duration-300 ${isMainActive || isOpen ? 'font-bold text-[#00bba7]' : 'font-semibold text-slate-500 group-hover:text-slate-800'}`}>
//                           {item.name}
//                         </span>
//                       )}
//                     </div>
//                     {!isCollapsed && (
//                       <ChevronDown size={18} className={`transition-transform duration-300 ${isOpen ? 'text-[#00bba7] rotate-180' : 'text-[#E7C873]/70 group-hover:text-[#E7C873] group-hover:translate-y-0.5'}`} />
//                     )}
//                   </button>
//                 ) : (
//                   <Link
//                     href={item.href || '#'}
//                     onClick={() => setOpenMenu(null)}
//                     className={`flex items-center gap-3 py-2.5 px-4 rounded-xl transition-all duration-300 group relative overflow-hidden
//                       ${isMainActive ? 'bg-linear-to-l from-[#00bba7]/10 to-transparent' : 'hover:bg-slate-50/80'}
//                     `}
//                   >
//                     <div className={`p-2 rounded-xl transition-all duration-300 flex items-center justify-center
//                       ${isMainActive 
//                         ? 'bg-[#00bba7] text-[#E7C873] shadow-md shadow-[#00bba7]/30' 
//                         : 'bg-slate-100 text-[#E7C873] group-hover:bg-[#E7C873]/10'}
//                     `}>
//                       <item.icon 
//                         size={20} 
//                         strokeWidth={isMainActive ? 2.5 : 2} 
//                         className="transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3" 
//                       />
//                     </div>
//                     {!isCollapsed && (
//                       <span className={`text-sm transition-all duration-300 ${isMainActive ? 'font-bold text-[#00bba7]' : 'font-semibold text-slate-500 group-hover:text-slate-800'}`}>
//                         {item.name}
//                       </span>
//                     )}
//                   </Link>
//                 )}

//                 {hasSubItems && !isCollapsed && (
//                   <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isOpen ? 'max-h-60 opacity-100 mt-2' : 'max-h-0 opacity-0'}`}>
//                     <div className="flex flex-col gap-1 pr-14 pl-2 relative before:absolute before:right-8 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100 before:rounded-full">
//                       {item.subItems?.map((sub) => {
//                         const isSubActive = pathname.startsWith(sub.href);
//                         return (
//                           <Link
//                             key={sub.name}
//                             href={sub.href}
//                             prefetch={false}
//                             className={`relative text-sm py-2.5 px-4 rounded-xl transition-all duration-300 flex items-center gap-3
//                               ${isSubActive ? 'font-bold text-[#00bba7] bg-white shadow-sm ring-1 ring-slate-100' : 'font-medium text-slate-400 hover:text-slate-700 hover:bg-slate-50 hover:-translate-x-1'}
//                             `}
//                           >
//                             <div className={`absolute -right-5.75 w-3 h-3 rounded-full border-2 border-white transition-all duration-300 ${isSubActive ? 'bg-[#E7C873] scale-100' : 'bg-slate-200 scale-0'}`} />
//                             {sub.name}
//                           </Link>
//                         );
//                       })}
//                     </div>
//                   </div>
//                 )}
//               </div>
//             );
//           })}
//         </nav>

//         <div className="p-4 mt-auto shrink-0">
//           <div className={`relative overflow-hidden bg-linear-to-br from-[#00bba7] to-[#008f80] rounded-3xl shadow-xl shadow-[#00bba7]/30 transition-all duration-500 ${isCollapsed ? 'p-3' : 'p-4'}`}>
//             <div className="absolute -right-4 -top-4 w-20 h-20 bg-[#E7C873]/20 rounded-full blur-2xl pointer-events-none" />
//             <div className="absolute -left-4 -bottom-4 w-16 h-16 bg-white/20 rounded-full blur-xl pointer-events-none" />

//             <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} relative z-10`}>
//               <div className={`flex items-center gap-3 overflow-hidden transition-all duration-500 ${isCollapsed ? 'w-0 opacity-0 hidden' : 'w-[70%] opacity-100'}`}>
//                 <div className="relative">
//                   <div className="w-11 h-11 rounded-full bg-white/20 backdrop-blur-sm border border-white/40 flex items-center justify-center text-white text-lg font-bold shadow-inner">
//                     {displayName.slice(0, 1)}
//                   </div>
//                   <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#E7C873] border-2 border-[#00bba7] rounded-full" />
//                 </div>
//                 <div className="overflow-hidden flex-1">
//                   <p className="text-sm font-bold text-white truncate">{displayName}</p>
//                   <p className="text-xs text-white/80 truncate mt-0.5 font-medium">{displayRole}</p>
//                 </div>
//               </div>

//               <button
//                 onClick={handleLogout}
//                 className={`group flex items-center justify-center bg-white/10 hover:bg-rose-500/90 text-[#E7C873] hover:text-white p-2.5 rounded-xl transition-all duration-300 backdrop-blur-sm border border-white/10 hover:border-rose-400 hover:shadow-lg hover:shadow-rose-500/40
//                   ${isCollapsed ? 'w-full' : 'w-auto'}
//                 `}
//                 title="تسجيل الخروج"
//               >
//                 <LogOut 
//                   size={18} 
//                   strokeWidth={2.5}
//                   className={`transition-all duration-300 group-hover:scale-110 group-hover:-translate-x-1 ${isCollapsed ? 'rotate-180' : ''}`} 
//                 />
//               </button>
//             </div>
//           </div>
//         </div>
//       </aside>
//     </div>
//   );
// }


"use client";

import { useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  LayoutDashboard, Users, ClipboardList,
  Wallet, Box, Bus, FileInput, Settings, Fingerprint,
  ChevronDown, LogOut, Shield,
  UserMinus, X, ChevronsRight // أعدنا استيراد السهم هنا
} from 'lucide-react';

import { useAuthStore } from '@/stores/auth-store';
import { resetAuthVerificationCache } from '@/lib/auth-verify';
import apiClient from '@/lib/api-client';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_STALE_TIME } from '@/lib/query-cache';

interface SidebarProps {
  isCollapsed?: boolean;
  onClose?: () => void;
  toggleCollapse?: () => void; // دالة السهم العائم
}

const menuItems = [
  { name: 'الرئيسية: إحصائيات', icon: LayoutDashboard, href: '/home' },
  { name: 'إدارة الموظفين', icon: Users, href: '/employees', roles: ['admin', 'hr', 'manager'] },
  { name: 'المستقيلون', icon: UserMinus, href: '/resigned', roles: ['admin', 'hr', 'manager'] },
  { name: 'سجل الحضور', icon: ClipboardList, href: '/attendance', roles: ['admin', 'hr', 'manager'] },
  {
    name: 'الرواتب', icon: Wallet, roles: ['admin', 'finance', 'manager'],
    subItems: [
      { name: 'إعدادات الرواتب', href: '/salaries/salariesSetting' },
      { name: 'السلف', href: '/advances' },
      { name: 'المكافآت والحوافز', href: '/salaries/rewards' },
      { name: 'الخصومات', href: '/salaries/discounts' },
      { name: 'جدول الدوام', href: '/salaries/timeTable' },
      { name: 'تقارير الرواتب', href: '/salaries/payroll' },
    ]
  },
  { name: 'بصمتي وحضوري', icon: Fingerprint, href: '/biometric' },
  { name: 'مخزن الشغل', icon: Box, href: '/inventory', roles: ['admin', 'warehouse', 'manager'] },
  { name: 'الباص', icon: Bus, href: '/Transportation', roles: ['admin', 'warehouse', 'manager'] },
  { name: 'استيراد البيانات', icon: FileInput, href: '/importData', roles: ['admin', 'manager'] },
  { name: 'الإعدادات', icon: Settings, href: '/settings', roles: ['admin'] },
];

function useIsHydrated() {
  return useSyncExternalStore(
    () => () => { },
    () => true,
    () => false,
  );
}

export default function Sidebar({ isCollapsed = false, onClose, toggleCollapse }: SidebarProps) {
  const queryClient = useQueryClient();

  const prefetchMap: Record<string, () => void> = {
    '/employees': () => queryClient.prefetchQuery({
      queryKey: ['employees', 'all-statuses', 'exclude-terminated', 'all-departments', 'no-search', 1, 500, 'fetch-all'],
      queryFn: () => apiClient.get('/employees', { params: { limit: 500 } }).then((r) => r.data),
      staleTime: QUERY_STALE_TIME.RELAXED,
    }),
    '/salaries/payroll': () => queryClient.prefetchQuery({
      queryKey: ['payroll', 'runs'],
      queryFn: () => apiClient.get(`/payroll/report/${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`).then((r) => r.data),
      staleTime: QUERY_STALE_TIME.RELAXED,
    }),
    '/salaries/discounts': () => queryClient.prefetchQuery({
      queryKey: ['discounts', 'all'],
      queryFn: () => apiClient.get('/discounts').then((r) => r.data ?? []),
      staleTime: QUERY_STALE_TIME.RELAXED,
    }),
    '/salaries/rewards': () => queryClient.prefetchQuery({
      queryKey: ['bonuses', 'all', 'all-periods'],
      queryFn: () => apiClient.get('/bonuses').then((r) => r.data?.rewards ?? r.data ?? []),
      staleTime: QUERY_STALE_TIME.RELAXED,
    }),
    '/salaries/salariesSetting': () => queryClient.prefetchQuery({
      queryKey: ['salaries'],
      queryFn: () => apiClient.get('/salary').then((r) => r.data?.salaries ?? r.data ?? []),
      staleTime: QUERY_STALE_TIME.RELAXED,
    }),
    '/advances': () => queryClient.prefetchQuery({
      queryKey: ['advances', 'all'],
      queryFn: () => apiClient.get('/advances').then((r) => r.data ?? []),
      staleTime: QUERY_STALE_TIME.RELAXED,
    }),
    '/attendance': () => queryClient.prefetchQuery({
      queryKey: ['attendance'],
      queryFn: () => apiClient.get('/attendance').then((r) => r.data),
      staleTime: QUERY_STALE_TIME.STANDARD,
    }),
  };
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isHydrated = useIsHydrated();

  const currentUser = useAuthStore((state) => state.user);
  const clear = useAuthStore((state) => state.clear);
  const hasAnyRole = useAuthStore((state) => state.hasAnyRole);

  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const displayName = currentUser?.name || currentUser?.username || 'مدير النظام';
  const displayRole = currentUser?.role || 'مشرف عام';

  const visibleMenuItems = menuItems.filter((item) => {
    if (!item.roles || item.roles.length === 0) return true;
    if (!isHydrated) return false;
    return hasAnyRole(item.roles);
  });

  const isHrefActive = (href: string) => {
    const [targetPath, queryString] = href.split('?');
    if (!pathname.startsWith(targetPath)) return false;

    if (!queryString) return true;

    const targetParams = new URLSearchParams(queryString);
    for (const [key, expectedValue] of targetParams.entries()) {
      const currentValue = searchParams.get(key);
      if (key === 'tab' && expectedValue === 'salary-config' && (currentValue === null || currentValue === 'salary-config')) {
        continue;
      }
      if (currentValue !== expectedValue) return false;
    }
    return true;
  }

  const activeSubMenu = menuItems.find(item =>
    item.subItems?.some(sub => isHrefActive(sub.href))
  )?.name;

  const toggleSubMenu = (menuName: string) => {
    setOpenMenu(openMenu === menuName ? null : menuName);
  };

  const handleLogout = async () => {
    try { await apiClient.post('/auth/logout'); } catch { }
    clear();
    resetAuthVerificationCache();
    router.replace('/login');
  };

  return (
    <aside
      className="h-full relative bg-[#101720]/80 backdrop-blur-3xl border-y border-l border-white/5 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] rounded-l-[2.5rem] flex flex-col transition-all duration-300 ease-out z-9999 overflow-visible w-full"
      dir="rtl"
    >
      {/* زر إغلاق للموبايل فقط */}
      <button
        onClick={onClose}
        className="lg:hidden absolute top-6 left-4 p-2 bg-[#1a2530] text-slate-400 hover:text-[#C89355] rounded-xl border border-[#C89355]/30 z-99999 transition-colors"
      >
        <X size={18} />
      </button>

      {/* زر الطي العائم للديسكتوب فقط */}
      {toggleCollapse && (
        <button
          onClick={toggleCollapse}
          className="hidden lg:flex absolute -left-4 top-10 bg-[#1a2530] border border-[#C89355]/30 shadow-[0_0_15px_rgba(200,147,85,0.15)] p-2.5 rounded-full text-slate-400 hover:text-[#C89355] hover:scale-110 transition-all duration-300 z-99999 group"
        >
          <ChevronsRight size={18} className={`transition-transform duration-500 ease-out ${isCollapsed ? 'rotate-180 text-[#C89355]' : ''}`} />
        </button>
      )}

      {/* لوغو KU&M JEANS */}
      <div className={`flex items-center gap-4 p-6 mb-2 transition-all duration-300 ${isCollapsed ? 'justify-center px-2' : ''}`}>
        <div className="relative group shrink-0">
          <div className="absolute inset-0 bg-[#C89355] blur-md opacity-20 group-hover:opacity-40 transition-opacity duration-300 rounded-xl" />
          <div className="relative bg-[#1a2530] p-2.5 rounded-xl shadow-[0_5px_15px_rgba(0,0,0,0.5)] border border-[#C89355]/40 outline outline-dashed outline-[#C89355]/50 -outline-offset-4">
            <Shield size={24} className="text-[#C89355]" strokeWidth={2} />
          </div>
        </div>
        <div className={`overflow-hidden transition-all duration-300 ease-out flex flex-col justify-center ${isCollapsed ? 'w-0 opacity-0 hidden' : 'w-full opacity-100'}`}>
          <h1 className="text-3xl font-serif font-black text-white tracking-widest leading-none drop-shadow-md">KU&M</h1>
          <p className="text-[9px] font-black text-[#C89355] uppercase tracking-[0.4em] mt-1 border-b border-[#C89355]/20 w-fit pb-1">J E A N S</p>
        </div>
      </div>

      {/* الروابط */}
      <nav className="flex-1 space-y-2 px-3 pb-4 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {visibleMenuItems.map((item) => {
          const hasSubItems = !!item.subItems;
          const isMainActive = (item.href && isHrefActive(item.href)) ||
            (hasSubItems && item.subItems?.some(sub => isHrefActive(sub.href)));
          const isOpen = openMenu === item.name || activeSubMenu === item.name;

          return (
            <div key={item.name} className="relative group/nav">
              <div className={`absolute right-0 top-1/2 -translate-y-1/2 w-1.5 bg-[#C89355] rounded-l-full shadow-[0_0_15px_rgba(200,147,85,0.8)] transition-all duration-500 z-10 ${isMainActive ? 'h-8 opacity-100' : 'h-0 opacity-0'}`} />

              {/* التلميح الذكي */}
              {isCollapsed && (
                <div className="absolute top-1/2 -translate-y-1/2 left-0 -translate-x-[calc(100%+12px)] bg-[#C89355] text-[#1a2530] text-xs font-black px-3 py-2 rounded-lg shadow-xl opacity-0 invisible group-hover/nav:opacity-100 group-hover/nav:visible transition-all duration-300 z-50 whitespace-nowrap before:absolute before:top-1/2 before:-translate-y-1/2 before:-right-1 before:border-4 before:border-transparent before:border-l-[#C89355]">
                  {item.name}
                </div>
              )}

              {hasSubItems ? (
                <>
                  <button
                    onClick={() => {
                      if (isCollapsed && toggleCollapse) toggleCollapse();
                      toggleSubMenu(item.name);
                    }}
                    className={`w-full flex items-center justify-between py-2.5 px-3 rounded-xl transition-all duration-300 group relative overflow-hidden
                      ${isMainActive || isOpen ? 'bg-linear-to-l from-[#C89355]/10 to-transparent' : 'hover:bg-[#263544]/50'}
                    `}
                  >
                    <div className="flex items-center gap-3 relative z-10">
                      <div className={`p-2 rounded-xl transition-all duration-300 flex items-center justify-center relative
                        ${isMainActive || isOpen
                          ? 'bg-[#C89355] text-[#1a2530] shadow-md shadow-[#C89355]/20'
                          : 'bg-[#263544] text-slate-400 group-hover:bg-[#1a2530] group-hover:text-[#C89355] border border-transparent group-hover:border-[#C89355]/20'}
                      `}>
                        <item.icon
                          size={20}
                          strokeWidth={isMainActive ? 2.5 : 2}
                          className="relative z-10 transition-transform duration-300 group-hover/nav:scale-110 group-hover/nav:-rotate-3"
                        />
                      </div>
                      {!isCollapsed && (
                        <span className={`text-sm transition-all duration-300 ${isMainActive || isOpen ? 'font-bold text-[#C89355]' : 'font-medium text-slate-400 group-hover:text-white'}`}>
                          {item.name}
                        </span>
                      )}
                    </div>
                    {!isCollapsed && (
                      <ChevronDown size={18} className={`transition-transform duration-300 ${isOpen ? 'text-[#C89355] rotate-180' : 'text-slate-500 group-hover:text-[#C89355] group-hover:translate-y-0.5'}`} />
                    )}
                  </button>

                  {isOpen && !isCollapsed && (
                    <div className="overflow-hidden max-h-72 opacity-100 mt-1 transition-all duration-500 ease-in-out">
                      <div className="flex flex-col gap-1 pr-12 pl-2 relative">
                        <div className="absolute right-6 top-2 bottom-2 w-0.5 bg-linear-to-b from-transparent via-[#263544] to-transparent rounded-full" />

                        {item.subItems?.map((sub) => {
                          const isSubActive = isHrefActive(sub.href);
                          return (
                            <Link
                              key={sub.name}
                              href={sub.href}
                              prefetch={false}
                              onMouseEnter={() => prefetchMap[sub.href ?? '']?.()}
                              onClick={() => {
                                if (onClose && window.innerWidth < 1024) onClose();
                              }}
                              className={`relative text-sm py-2 px-3 rounded-xl transition-all duration-300 flex items-center gap-3
                                ${isSubActive ? 'font-bold text-[#C89355] bg-[#1a2530] shadow-sm ring-1 ring-[#C89355]/30' : 'font-medium text-slate-500 hover:text-white hover:bg-[#263544]/60 hover:-translate-x-1'}
                              `}
                            >
                              <div className="absolute -right-6.5 flex items-center justify-center">
                                <div className={`absolute w-4 h-4 bg-[#C89355]/20 rounded-full blur-sm transition-all duration-300 ${isSubActive ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`} />
                                <div className={`w-2.5 h-2.5 rounded-full border-2 transition-all duration-300 ${isSubActive ? 'bg-[#C89355] border-[#1a2530] scale-100' : 'bg-[#263544] border-transparent scale-50 group-hover:scale-100 group-hover:bg-slate-400'}`} />
                              </div>
                              {sub.name}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <Link
                  href={item.href || '#'}
                  onMouseEnter={() => prefetchMap[item.href ?? '']?.()}
                  onClick={() => {
                    setOpenMenu(null);
                    if (onClose && window.innerWidth < 1024) onClose();
                  }}
                  className={`flex items-center gap-3 py-2.5 px-3 rounded-xl transition-all duration-300 group relative overflow-hidden
                    ${isMainActive ? 'bg-linear-to-l from-[#C89355]/10 to-transparent' : 'hover:bg-[#263544]/50'}
                  `}
                >
                  <div className={`p-2 rounded-xl transition-all duration-300 flex items-center justify-center relative
                    ${isMainActive
                      ? 'bg-[#C89355] text-[#1a2530] shadow-md shadow-[#C89355]/20'
                      : 'bg-[#263544] text-slate-400 group-hover:bg-[#1a2530] group-hover:text-[#C89355] border border-transparent group-hover:border-[#C89355]/20'}
                  `}>
                    <item.icon
                      size={20}
                      strokeWidth={isMainActive ? 2.5 : 2}
                      className="relative z-10 transition-transform duration-300 group-hover/nav:scale-110 group-hover/nav:-rotate-3"
                    />
                  </div>
                  {!isCollapsed && (
                    <span className={`text-sm transition-all duration-300 ${isMainActive ? 'font-bold text-[#C89355]' : 'font-medium text-slate-400 group-hover:text-white'}`}>
                      {item.name}
                    </span>
                  )}
                </Link>
              )}
            </div>
          );
        })}
      </nav>

      {/* بطاقة المستخدم السفلية */}
      <div className="p-3 mt-auto shrink-0 relative z-20 mb-2 mx-2">
        <div className={`relative overflow-hidden bg-[#1a2530] rounded-2xl shadow-[0_10px_25px_-5px_rgba(0,0,0,0.5)] border border-[#C89355]/20 outline outline-dashed outline-[#C89355]/30 -outline-offset-4 transition-all duration-300 ${isCollapsed ? 'p-2' : 'p-3'} group`}>

          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} relative z-10`}>
            <div className={`flex items-center gap-3 overflow-hidden transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0 hidden' : 'w-[70%] opacity-100'}`}>
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-[#C89355] border-2 border-[#1a2530] flex items-center justify-center text-[#1a2530] text-lg font-black shadow-inner">
                  {displayName.slice(0, 1)}
                </div>
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-[#1a2530] rounded-full shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
              </div>
              <div className="overflow-hidden flex-1">
                <p className="text-sm font-bold text-white truncate">{displayName}</p>
                <p className="text-[10px] text-[#C89355] truncate mt-0.5 font-bold tracking-wider uppercase">{displayRole}</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className={`group/logout flex items-center justify-center bg-[#263544] hover:bg-rose-500/90 text-slate-400 hover:text-white p-2.5 rounded-xl transition-all duration-300 border border-transparent hover:border-rose-400 hover:shadow-[0_0_15px_rgba(244,63,94,0.3)]
                ${isCollapsed ? 'w-full' : 'w-auto'}
              `}
              title="تسجيل الخروج"
            >
              <LogOut
                size={18}
                strokeWidth={2}
                className={`transition-all duration-300 group-hover/logout:scale-110 group-hover/logout:-translate-x-1 ${isCollapsed ? 'rotate-180' : ''}`}
              />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}