// "use client";

// import { useState, useEffect, useRef } from "react";
// import { Bell, AlertTriangle, X, Menu, BellRing } from "lucide-react";
// import Sidebar from "@/components/Sidebar";

// export default function DashboardLayout({ children }: { children: React.ReactNode }) {
//   const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
//   const [isCollapsed, setIsCollapsed] = useState(false);

//   const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
//   const [notifications, setNotifications] = useState([
//     { id: 1, text: 'الموظف أحمد تأخر 15 دقيقة', type: 'warning', time: '10 د' },
//     { id: 2, text: 'نقص في مخزون القماش', type: 'error', time: '1 س' },
//   ]);

//   const dropdownRef = useRef<HTMLDivElement>(null);

//   // يتقلص الـ Sidebar تلقائياً بمجرد أن تصغر الشاشة قليلاً (مقاس xl وما دون)
//   useEffect(() => {
//     const handleResize = () => {
//       if (window.innerWidth < 1280) { 
//         setIsCollapsed(true);
//       } else {
//         setIsCollapsed(false);
//       }
//     };
    
//     handleResize();
//     window.addEventListener("resize", handleResize);
//     return () => window.removeEventListener("resize", handleResize);
//   }, []);

//   useEffect(() => {
//     function handleClickOutside(event: MouseEvent) {
//       if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
//         setIsNotificationsOpen(false);
//       }
//     }
//     document.addEventListener("mousedown", handleClickOutside);
//     return () => document.removeEventListener("mousedown", handleClickOutside);
//   }, []);

//   const dismissNotification = (id: number) => {
//     setNotifications(notifications.filter(n => n.id !== id));
//   };

//   return (
//     <div className="flex h-screen bg-[#f4f6f8] overflow-hidden" dir="rtl">
      
//       {isMobileMenuOpen && (
//         <div 
//           className="fixed inset-0 bg-[#263544]/20 backdrop-blur-sm z-9998 lg:hidden transition-opacity duration-300"
//           onClick={() => setIsMobileMenuOpen(false)}
//         />
//       )}

//       <div 
//         className={`fixed inset-y-0 right-0 z-9999 h-screen transform transition-all duration-300 ease-in-out lg:relative lg:translate-x-0 ${
//           isMobileMenuOpen ? "translate-x-0" : "translate-x-full"
//         } ${isCollapsed ? "lg:w-20" : "lg:w-64 xl:w-72"}`}
//       >
//         {/* مررنا دالة toggleCollapse ليعمل السهم العائم */}
//         <Sidebar 
//           isCollapsed={isCollapsed} 
//           onClose={() => setIsMobileMenuOpen(false)} 
//           toggleCollapse={() => setIsCollapsed(!isCollapsed)}
//         />
//       </div>

//       <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        
//         <header className="flex items-center justify-between p-2 md:px-4 md:py-3 z-9998">
          
//           {/* زر القائمة هذا يظهر في الموبايل فقط (lg:hidden) */}
//           <button 
//             onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
//             className="lg:hidden relative p-2 bg-white/60 backdrop-blur-md rounded-xl text-[#263544] hover:text-[#C89355] border-2 border-white/90 hover:border-[#C89355]/40 shadow-sm hover:shadow-md transition-all active:scale-95 group/menu"
//           >
//             <div className="absolute inset-1 rounded-lg border border-dashed border-[#263544]/10 group-hover/menu:border-[#C89355]/30 pointer-events-none transition-colors" />
//             <Menu size={20} className="relative z-10" />
//           </button>

//           <div className="relative flex items-center mr-auto" ref={dropdownRef}>
            
//             {/* زر الإشعارات - تم إضافة overflow-visible لمنع قص النقطة الحمراء */}
//             <button 
//               onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
//               className={`relative overflow-visible p-2 rounded-xl transition-all active:scale-95 border-2 shadow-sm hover:shadow-md group/bell
//                 ${isNotificationsOpen || notifications.length > 0 
//                   ? 'bg-[#1a2530] text-[#C89355] border-[#C89355]/40 shadow-[0_8px_15px_rgba(38,53,68,0.3)]' 
//                   : 'bg-white/60 backdrop-blur-md text-[#263544] hover:text-[#C89355] border-white/90 hover:border-[#C89355]/40'}
//               `}
//             >
//               <div className={`absolute inset-1 rounded-lg border border-dashed pointer-events-none transition-colors ${isNotificationsOpen || notifications.length > 0 ? 'border-[#C89355]/30' : 'border-[#263544]/10 group-hover/bell:border-[#C89355]/30'}`} />
              
//               {notifications.length > 0 ? <BellRing size={20} className="group-hover/bell:animate-bounce relative z-10" /> : <Bell size={20} className="relative z-10" />}
              
//               {notifications.length > 0 && (
//                 <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[9px] font-black text-white border-2 border-[#1a2530] shadow-sm z-50">
//                   {notifications.length}
//                 </span>
//               )}
//             </button>

//             {isNotificationsOpen && (
//               <div className="absolute left-0 top-[calc(100%+10px)] w-72 md:w-80 bg-white/80 backdrop-blur-3xl border-2 border-white/90 rounded-4xl shadow-[0_25px_60px_rgba(38,53,68,0.15)] overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300 z-99999 group/notif">
//                 <div className="absolute inset-1.5 rounded-[1.7rem] border border-dashed border-[#C89355]/30 pointer-events-none z-0" />
//                 <div className="relative z-10 p-4 border-b border-white/60 bg-white/40 flex items-center justify-between">
//                   <h3 className="font-black text-[#263544] text-sm flex items-center gap-2">
//                     <div className="p-1.5 bg-[#1a2530] rounded-lg shadow-inner border border-[#C89355]/30">
//                       <Bell size={14} className="text-[#C89355]" />
//                     </div>
//                     الإشعارات
//                   </h3>
//                 </div>

//                 <div className="relative z-10 max-h-87.5 overflow-y-auto custom-scrollbar p-3">
//                   {notifications.length === 0 ? (
//                     <div className="p-6 text-center flex flex-col items-center justify-center gap-3">
//                       <div className="w-12 h-12 bg-white/60 border border-white shadow-inner rounded-2xl flex items-center justify-center">
//                         <Bell size={20} className="text-[#263544]/30" />
//                       </div>
//                       <p className="text-[#263544]/60 text-sm font-black">لا توجد إشعارات جديدة</p>
//                     </div>
//                   ) : (
//                     notifications.map((notif) => (
//                       <div key={notif.id} className="p-3 mb-2 last:mb-0 rounded-xl border border-white/60 bg-white/40 hover:bg-white/90 shadow-sm hover:shadow-md hover:border-white flex items-start gap-3 group transition-all">
//                         <div className={`mt-0.5 p-2 rounded-lg shadow-inner border ${notif.type === 'warning' ? 'bg-orange-50 border-orange-100 text-orange-600' : 'bg-rose-50 border-rose-100 text-rose-600'}`}>
//                           <AlertTriangle size={14} />
//                         </div>
//                         <div className="flex-1 min-w-0">
//                           <p className="text-[11px] md:text-xs text-[#263544] font-black leading-relaxed">{notif.text}</p>
//                           <p className="text-[10px] text-[#263544]/60 mt-1.5 font-bold font-mono">{notif.time}</p>
//                         </div>
//                         <button 
//                           onClick={() => dismissNotification(notif.id)}
//                           className="opacity-0 group-hover:opacity-100 p-1.5 bg-white/80 border border-white/90 rounded-md text-[#263544]/40 hover:text-rose-500 hover:border-rose-200 hover:bg-rose-50 shadow-sm transition-all shrink-0 active:scale-95"
//                         >
//                           <X size={12} />
//                         </button>
//                       </div>
//                     ))
//                   )}
//                 </div>
//               </div>
//             )}
//           </div>
//         </header>

//         <main className="flex-1 overflow-y-auto px-2 pb-2 md:px-4 md:pb-4 custom-scrollbar relative z-0">
//           {children}
//         </main>

//       </div>
//     </div>
//   );
// }

"use client";

import { useState, useEffect } from "react";
import { Menu } from "lucide-react";
import Sidebar from "@/components/Sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // يتقلص الـ Sidebar تلقائياً بمجرد أن تصغر الشاشة قليلاً (مقاس xl وما دون)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1280) { 
        setIsCollapsed(true);
      } else {
        setIsCollapsed(false);
      }
    };
    
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="flex h-screen bg-[#f4f6f8] overflow-hidden" dir="rtl">
      
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-[#263544]/20 backdrop-blur-sm z-9998 lg:hidden transition-opacity duration-300"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <div 
        className={`fixed inset-y-0 right-0 z-9999 h-screen transform transition-all duration-300 ease-in-out lg:relative lg:translate-x-0 ${
          isMobileMenuOpen ? "translate-x-0" : "translate-x-full"
        } ${isCollapsed ? "lg:w-20" : "lg:w-64 xl:w-72"}`}
      >
        <Sidebar 
          isCollapsed={isCollapsed} 
          onClose={() => setIsMobileMenuOpen(false)} 
          toggleCollapse={() => setIsCollapsed(!isCollapsed)}
        />
      </div>

      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        
        <header className="flex items-center justify-between p-2 md:px-4 md:py-3 z-9998">
          
          {/* زر القائمة للموبايل */}
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden relative p-2 bg-white/60 backdrop-blur-md rounded-xl text-[#263544] hover:text-[#C89355] border-2 border-white/90 hover:border-[#C89355]/40 shadow-sm hover:shadow-md transition-all active:scale-95 group/menu"
          >
            <div className="absolute inset-1 rounded-lg border border-dashed border-[#263544]/10 group-hover/menu:border-[#C89355]/30 pointer-events-none transition-colors" />
            <Menu size={20} className="relative z-10" />
          </button>

          {/* مساحة فارغة للحفاظ على التنسيق أو لإضافة عناصر أخرى مستقبلاً */}
          <div className="mr-auto" />
          
        </header>

        <main className="flex-1 overflow-y-auto px-2 pb-2 md:px-4 md:pb-4 custom-scrollbar relative z-0">
          {children}
        </main>

      </div>
    </div>
  );
}