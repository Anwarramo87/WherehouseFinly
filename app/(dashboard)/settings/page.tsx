"use client";

import { useState } from "react";
import { 
  Save, Building2, Users, Fingerprint, 
  Bell, ShieldCheck, Box, Server, Settings,
  Database, Download, Calendar
} from "lucide-react";

export default function SettingsPage() {
  // حالة التبويب النشط
  const [activeTab, setActiveTab] = useState("hr");

  // التبويبات المتاحة
  const tabs = [
    { id: "general", name: "إعدادات عامة", icon: Building2 },
    { id: "hr", name: "قواعد الرواتب والحضور", icon: Users },
    { id: "devices", name: "أجهزة البصمة والربط", icon: Fingerprint },
    { id: "inventory", name: "المخزون والتنبيهات", icon: Box },
    { id: "security", name: "الأمان والصلاحيات", icon: ShieldCheck },
    { id: "backup", name: "النسخ الاحتياطي", icon: Database },
  ];

  return (
    /* الحاوية الرئيسية: تأثير زجاجي مع درازة خارجية متطابقة مع باقي النظام */
    <div className="relative z-10 w-full max-w-7xl min-h-[85vh] mx-auto bg-white/50 backdrop-blur-[40px] rounded-[3rem] shadow-[0_40px_80px_-20px_rgba(38,53,68,0.2)] border-2 border-dashed border-[#C89355]/60 flex flex-col overflow-hidden" dir="rtl">
        
        {/* نقشة الفايبر (القماش) الثابتة والشفافة */}
        <div 
          className="absolute inset-0 opacity-[0.04] pointer-events-none z-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='24' height='24' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 12h24M12 0v24' stroke='%23263544' stroke-width='1' stroke-dasharray='4 4' fill='none'/%3E%3C/svg%3E")`,
            backgroundSize: '24px 24px'
          }}
        />

        {/* المحتوى الداخلي */}
        <div className="p-6 md:p-10 h-full overflow-y-auto custom-scrollbar relative z-10">
          
          {/* الهيدر وزر الحفظ العام */}
          <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#263544]/10 pb-8 relative">
            <div>
              <div className="flex items-center gap-3 mb-2">
                {/* أيقونة العنوان بهوية الماركة الكحلية والنحاسية مع الدرزة */}
                <div className="p-3 bg-[#1a2530] rounded-2xl shadow-[0_15px_25px_rgba(38,53,68,0.4)] border border-[#C89355]/40 relative outline outline-dashed outline-1 outline-[#C89355]/50 outline-offset-[-4px]">
                  <Settings size={22} className="text-[#C89355] animate-[spin_4s_linear_infinite]" strokeWidth={2.5} />
                </div>
                <h1 className="text-3xl font-black text-[#263544] tracking-tight drop-shadow-sm">الإعدادات</h1>
              </div>
              <p className="text-slate-600 text-sm font-bold pr-14 mt-1">إعدادات النظام، قواعد المحاسبة، وتفضيلات المعمل</p>
            </div>

            <button className="relative overflow-hidden inline-flex items-center gap-2 rounded-2xl bg-[#1a2530] hover:bg-[#263544] px-6 py-3.5 text-sm font-black text-[#C89355] shadow-[0_10px_20px_rgba(38,53,68,0.4)] transition-all active:scale-95 border border-[#C89355]/40 group/btn w-full md:w-auto justify-center">
              <div className="absolute inset-1 rounded-xl border border-dashed border-[#C89355]/30 pointer-events-none transition-colors group-hover/btn:border-[#C89355]/50" />
              <Save size={18} className="group-hover/btn:-translate-y-1 transition-transform relative z-10" />
              <span className="relative z-10">حفظ التعديلات</span>
            </button>
          </header>

          <div className="flex flex-col lg:flex-row gap-8">
            
            {/* القائمة الجانبية للإعدادات (Tabs) بتصميم Glassmorphism */}
            <div className="w-full lg:w-72 shrink-0">
              <div className="relative bg-white/60 backdrop-blur-2xl rounded-[2.5rem] border-2 border-white/90 shadow-[0_15px_40px_rgba(38,53,68,0.08)] p-4 flex flex-col gap-2 overflow-hidden group/sidebar">
                <div className="absolute inset-1.5 rounded-[2.2rem] border border-dashed border-[#C89355]/30 pointer-events-none transition-colors group-hover/sidebar:border-[#C89355]/50 z-0" />
                
                <div className="relative z-10 flex flex-col gap-2">
                  {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`relative overflow-hidden flex items-center gap-3 w-full text-right px-4 py-3.5 rounded-2xl transition-all group/tab ${
                          isActive
                            ? "bg-[#1a2530] shadow-[0_8px_20px_rgba(38,53,68,0.3)] border border-[#C89355]/30"
                            : "bg-white/40 hover:bg-white/80 border border-white hover:border-[#C89355]/30 shadow-sm"
                        }`}
                      >
                        {isActive && <div className="absolute inset-1 rounded-xl border border-dashed border-[#C89355]/20 pointer-events-none" />}
                        
                        <div className={`p-2.5 rounded-xl transition-all duration-300 relative z-10 shadow-sm border ${
                          isActive 
                            ? 'bg-[#263544] text-[#C89355] border-[#C89355]/30 shadow-inner' 
                            : 'bg-white text-slate-400 group-hover/tab:text-[#C89355] border-slate-100 group-hover/tab:border-[#C89355]/30'
                        }`}>
                          <tab.icon size={18} className={`transition-all duration-300 group-hover/tab:animate-pulse ${isActive ? "" : "group-hover/tab:scale-110"}`} />
                        </div>
                        <span className={`text-sm relative z-10 transition-colors ${
                          isActive ? 'font-black text-[#C89355]' : 'font-bold text-[#263544]/70 group-hover/tab:text-[#263544]'
                        }`}>
                          {tab.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* محتوى الإعدادات */}
            <div className="flex-1">
              
              {/* --- قسم الموارد البشرية والرواتب --- */}
              {activeTab === "hr" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  
                  {/* بطاقة قواعد التأخير */}
                  <div className="relative bg-white/60 backdrop-blur-2xl rounded-[2.5rem] border-2 border-white/90 shadow-[0_15px_40px_rgba(38,53,68,0.08)] p-8 group/card overflow-hidden">
                    <div className="absolute inset-1.5 rounded-[2.2rem] border border-dashed border-[#C89355]/30 pointer-events-none transition-colors group-hover/card:border-[#C89355]/50 z-0" />
                    
                    <div className="relative z-10">
                      <h2 className="text-xl font-black text-[#263544] mb-8 flex items-center gap-3 border-b border-white/80 pb-6">
                        <div className="p-2.5 bg-[#C89355]/10 rounded-xl border border-[#C89355]/30 shadow-inner">
                          <ClockIcon className="text-[#C89355] group-hover/card:animate-[spin_6s_linear_infinite] transition-all duration-300" />
                        </div>
                        قواعد التأخير والانصراف
                      </h2>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                          <label className="block text-sm font-black text-[#263544] mb-3">مدة السماح (بالدقائق)</label>
                          <input 
                            type="number" 
                            defaultValue="5"
                            className="w-full bg-white/80 backdrop-blur-sm border-2 border-white rounded-2xl px-5 py-3 text-xl font-black text-[#263544] focus:outline-none focus:ring-2 focus:ring-[#C89355]/40 focus:border-[#C89355] shadow-inner transition-all"
                          />
                          <p className="text-[11px] font-bold text-slate-500 mt-3 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[#C89355] shadow-[0_0_8px_rgba(200,147,85,0.6)] animate-pulse"></span> 
                            الدقائق المسموح بها بعد بدء الدوام دون خصم.
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-black text-[#263544] mb-3">نسبة خصم التأخير</label>
                          <div className="relative">
                            <input 
                              type="number" 
                              defaultValue="100"
                              className="w-full bg-white/80 backdrop-blur-sm border-2 border-white rounded-2xl px-5 py-3 text-xl font-black text-[#263544] focus:outline-none focus:ring-2 focus:ring-[#C89355]/40 focus:border-[#C89355] shadow-inner transition-all pl-14"
                            />
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-[#1a2530] rounded-xl flex items-center justify-center text-[#C89355] font-black border border-[#C89355]/30 shadow-md">
                              %
                            </div>
                          </div>
                          <p className="text-[11px] font-bold text-slate-500 mt-3 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)] animate-pulse"></span> 
                            100% تعني خصم الدقيقة بدقيقة من الراتب.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* بطاقة حساب الأجر الإضافي */}
                  <div className="relative bg-white/60 backdrop-blur-2xl rounded-[2.5rem] border-2 border-white/90 shadow-[0_15px_40px_rgba(38,53,68,0.08)] p-8 group/card overflow-hidden">
                    <div className="absolute inset-1.5 rounded-[2.2rem] border border-dashed border-[#C89355]/30 pointer-events-none transition-colors group-hover/card:border-[#C89355]/50 z-0" />
                    
                    <div className="relative z-10">
                      <h2 className="text-xl font-black text-[#263544] mb-8 flex items-center gap-3 border-b border-white/80 pb-6">
                        <div className="p-2.5 bg-[#1a2530] rounded-xl border border-[#C89355]/40 shadow-inner">
                          <CalculatorIcon className="text-[#C89355] group-hover/card:animate-bounce transition-all duration-300" />
                        </div>
                        حساب الأجر الإضافي
                      </h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                          <label className="block text-sm font-black text-[#263544] mb-3">مُعامل الإضافي (الأيام العادية)</label>
                          <input 
                            type="number" 
                            step="0.1"
                            defaultValue="1.5"
                            className="w-full bg-white/80 backdrop-blur-sm border-2 border-white rounded-2xl px-5 py-3 text-xl font-black text-[#263544] focus:outline-none focus:ring-2 focus:ring-[#C89355]/40 focus:border-[#C89355] shadow-inner transition-all"
                          />
                          <p className="text-[11px] font-bold text-slate-500 mt-3 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[#263544] shadow-[0_0_8px_rgba(38,53,68,0.6)]"></span> 
                            تحسب الساعة بساعة ونصف.
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-black text-[#263544] mb-3">مُعامل الإضافي (العطل الرسمية)</label>
                          <input 
                            type="number" 
                            step="0.1"
                            defaultValue="2.0"
                            className="w-full bg-white/80 backdrop-blur-sm border-2 border-white rounded-2xl px-5 py-3 text-xl font-black text-[#263544] focus:outline-none focus:ring-2 focus:ring-[#C89355]/40 focus:border-[#C89355] shadow-inner transition-all"
                          />
                          <p className="text-[11px] font-bold text-slate-500 mt-3 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[#C89355] shadow-[0_0_8px_rgba(200,147,85,0.6)] animate-pulse"></span> 
                            تحسب الساعة بساعتين.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* --- قسم أجهزة البصمة --- */}
              {activeTab === "devices" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  
                  <div className="relative bg-white/60 backdrop-blur-2xl rounded-[2.5rem] border-2 border-white/90 shadow-[0_15px_40px_rgba(38,53,68,0.08)] p-8 group/card overflow-hidden">
                    <div className="absolute inset-1.5 rounded-[2.2rem] border border-dashed border-[#C89355]/30 pointer-events-none transition-colors group-hover/card:border-[#C89355]/50 z-0" />
                    
                    <div className="relative z-10">
                      <h2 className="text-xl font-black text-[#263544] mb-8 flex items-center gap-3 border-b border-white/80 pb-6">
                        <div className="p-2.5 bg-[#1a2530] rounded-xl border border-[#C89355]/40 shadow-inner">
                          <Server className="text-[#C89355] group-hover/card:animate-pulse transition-all duration-300" />
                        </div>
                        إعدادات جهاز البصمة الأساسي
                      </h2>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                          <label className="block text-sm font-black text-[#263544] mb-3">عنوان IP للجهاز</label>
                          <input 
                            type="text" 
                            defaultValue="192.168.1.100"
                            className="w-full bg-white/80 backdrop-blur-sm border-2 border-white rounded-2xl px-5 py-3 text-xl font-black text-[#263544] focus:outline-none focus:ring-2 focus:ring-[#C89355]/40 focus:border-[#C89355] font-mono text-left dir-ltr shadow-inner transition-all tracking-widest"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-black text-[#263544] mb-3">منفذ الاتصال (Port)</label>
                          <input 
                            type="text" 
                            defaultValue="4370"
                            className="w-full bg-white/80 backdrop-blur-sm border-2 border-white rounded-2xl px-5 py-3 text-xl font-black text-[#263544] focus:outline-none focus:ring-2 focus:ring-[#C89355]/40 focus:border-[#C89355] font-mono text-left dir-ltr shadow-inner transition-all tracking-widest"
                          />
                        </div>
                      </div>

                      <div className="mt-8 pt-8 border-t border-white/80">
                        <div className="flex items-center justify-between bg-white/60 backdrop-blur-md p-5 rounded-2xl border border-white shadow-sm hover:shadow-md transition-all">
                          <div>
                            <h4 className="text-sm font-black text-[#263544]">المزامنة التلقائية</h4>
                            <p className="text-[11px] font-bold text-slate-500 mt-1">سحب سجلات الحضور تلقائياً من الجهاز كل ساعة.</p>
                          </div>
                          {/* Toggle Button UI */}
                          <div className="w-14 h-7 bg-[#1a2530] rounded-full relative cursor-pointer shadow-inner border border-[#C89355]/40">
                            <div className="w-5 h-5 bg-[#C89355] rounded-full absolute top-1 left-1 shadow-[0_0_10px_rgba(200,147,85,0.8)] transition-transform translate-x-7"></div>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* --- قسم الإعدادات العامة --- */}
              {activeTab === "general" && (
                <div className="relative bg-white/60 backdrop-blur-2xl rounded-[2.5rem] border-2 border-white/90 shadow-[0_15px_40px_rgba(38,53,68,0.08)] p-8 group/card animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-hidden">
                  <div className="absolute inset-1.5 rounded-[2.2rem] border border-dashed border-[#C89355]/30 pointer-events-none transition-colors group-hover/card:border-[#C89355]/50 z-0" />
                  
                  <div className="relative z-10">
                    <h2 className="text-xl font-black text-[#263544] mb-8 flex items-center gap-3 border-b border-white/80 pb-6">
                      <div className="p-2.5 bg-[#C89355]/20 rounded-xl border border-[#C89355]/30 shadow-inner">
                        <Building2 className="text-[#1a2530] group-hover/card:animate-pulse transition-all duration-300" />
                      </div>
                      بيانات المنشأة
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div>
                        <label className="block text-sm font-black text-[#263544] mb-3">اسم المعمل / المنشأة</label>
                        <input 
                          type="text" 
                          defaultValue="KU&M JEANS" 
                          className="w-full bg-white/80 backdrop-blur-sm border-2 border-white rounded-2xl px-5 py-3 text-xl font-black text-[#263544] focus:outline-none focus:ring-2 focus:ring-[#C89355]/40 focus:border-[#C89355] shadow-inner transition-all" 
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* --- قسم النسخ الاحتياطي --- */}
              {activeTab === "backup" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  
                  {/* بطاقة النسخ الاحتياطي الكامل */}
                  <div className="relative bg-white/60 backdrop-blur-2xl rounded-[2.5rem] border-2 border-white/90 shadow-[0_15px_40px_rgba(38,53,68,0.08)] p-8 group/card overflow-hidden">
                    <div className="absolute inset-1.5 rounded-[2.2rem] border border-dashed border-[#C89355]/30 pointer-events-none transition-colors group-hover/card:border-[#C89355]/50 z-0" />
                    
                    <div className="relative z-10">
                      <h2 className="text-xl font-black text-[#263544] mb-8 flex items-center gap-3 border-b border-white/80 pb-6">
                        <div className="p-2.5 bg-[#1a2530] rounded-xl border border-[#C89355]/40 shadow-inner">
                          <Database className="text-[#C89355] group-hover/card:animate-pulse transition-all duration-300" />
                        </div>
                        النسخ الاحتياطي
                      </h2>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* نسخة احتياطية كاملة */}
                        <div className="bg-white/60 backdrop-blur-md p-6 rounded-2xl border border-white shadow-sm hover:shadow-md transition-all">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 bg-[#C89355]/10 rounded-xl border border-[#C89355]/30">
                              <Download size={20} className="text-[#C89355]" />
                            </div>
                            <h3 className="text-lg font-black text-[#263544]">نسخة احتياطية كاملة</h3>
                          </div>
                          <p className="text-sm text-slate-600 font-bold mb-6">
                            تصدير جميع بيانات النظام (الموظفين، الحضور، الرواتب، السلف، الخصومات، المكافآت) في ملف Excel واحد.
                          </p>
                          <button
                            onClick={() => {
                              const link = document.createElement("a");
                              link.href = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/backup/export/full`;
                              link.click();
                            }}
                            className="w-full relative overflow-hidden bg-[#1a2530] hover:bg-[#263544] text-[#C89355] px-6 py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-[0_10px_20px_rgba(38,53,68,0.3)] transition-all active:scale-95 text-sm font-black border border-[#C89355]/40 group/btn"
                          >
                            <div className="absolute inset-1.5 rounded-xl border border-dashed border-[#C89355]/30 pointer-events-none transition-colors group-hover/btn:border-[#C89355]/50" />
                            <Download size={18} className="group-hover/btn:-translate-y-1 transition-transform relative z-10" />
                            <span className="relative z-10">تحميل النسخة الكاملة</span>
                          </button>
                        </div>

                        {/* نسخة احتياطية شهرية */}
                        <div className="bg-white/60 backdrop-blur-md p-6 rounded-2xl border border-white shadow-sm hover:shadow-md transition-all">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 bg-[#C89355]/10 rounded-xl border border-[#C89355]/30">
                              <Calendar size={20} className="text-[#C89355]" />
                            </div>
                            <h3 className="text-lg font-black text-[#263544]">نسخة احتياطية شهرية</h3>
                          </div>
                          <p className="text-sm text-slate-600 font-bold mb-6">
                            تصدير بيانات شهر محدد فقط (الحضور، الرواتب، السلف، الخصومات، المكافآت).
                          </p>
                          <div className="flex items-center gap-3">
                            <input
                              type="month"
                              defaultValue={new Date().toISOString().slice(0, 7)}
                              id="backup-month"
                              className="flex-1 bg-white/80 backdrop-blur-sm border-2 border-white rounded-2xl px-5 py-3 text-lg font-black text-[#263544] focus:outline-none focus:ring-2 focus:ring-[#C89355]/40 focus:border-[#C89355] shadow-inner transition-all font-mono"
                            />
                            <button
                              onClick={() => {
                                const input = document.getElementById("backup-month") as HTMLInputElement;
                                const period = input?.value;
                                if (!period) return;
                                const link = document.createElement("a");
                                link.href = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/backup/export/month?period=${period}`;
                                link.click();
                              }}
                              className="relative overflow-hidden bg-[#C89355] hover:bg-[#b8834a] text-[#1a2530] px-5 py-3 rounded-2xl flex items-center gap-2 shadow-[0_10px_20px_rgba(200,147,85,0.3)] transition-all active:scale-95 text-sm font-black group/btn"
                            >
                              <Download size={18} className="group-hover/btn:-translate-y-1 transition-transform" />
                              <span>تحميل</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="mt-8 p-4 bg-amber-50/80 border border-amber-200 rounded-2xl">
                        <p className="text-sm font-bold text-amber-700 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                          تذكير: يُنصح بالاحتفاظ بنسخ احتياطية منتظمة لضمان سلامة البيانات.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* أقسام قيد التطوير */}
              {(activeTab === "inventory" || activeTab === "security") && (
                <div className="relative bg-white/40 backdrop-blur-2xl rounded-[2.5rem] border-2 border-dashed border-[#C89355]/40 p-16 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in-95 duration-500 shadow-[0_15px_40px_rgba(38,53,68,0.05)] overflow-hidden group">
                  <div className="relative z-10 w-20 h-20 bg-white/80 backdrop-blur-md rounded-3xl flex items-center justify-center mb-6 shadow-sm border border-white">
                    <Bell size={40} className="text-[#C89355] group-hover:animate-pulse transition-all duration-300" />
                  </div>
                  <h3 className="relative z-10 text-2xl text-[#263544] font-black mb-3">هذا القسم قيد التطوير</h3>
                  <p className="relative z-10 text-[#263544]/60 text-sm font-bold">يمكنك إضافة إعدادات التنبيهات والصلاحيات المخصصة هنا قريباً.</p>
                </div>
              )}

            </div>
          </div>
        </div>
    </div>
  );
}

// الأيقونات بصيغة SVG متوافقة
function ClockIcon(props: React.SVGProps<SVGSVGElement>) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
}
function CalculatorIcon(props: React.SVGProps<SVGSVGElement>) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="16" height="20" x="4" y="2" rx="2"/><line x1="8" x2="16" y1="6" y2="6"/><line x1="16" x2="16" y1="14" y2="18"/><path d="M16 10h.01"/><path d="M12 10h.01"/><path d="M8 10h.01"/><path d="M12 14h.01"/><path d="M8 14h.01"/><path d="M12 18h.01"/><path d="M8 18h.01"/></svg>
}