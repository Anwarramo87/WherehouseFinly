"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { User, Lock, Loader2, AlertCircle, Eye, EyeOff, Shield, Tag } from "lucide-react";
import apiClient from "@/lib/api-client";
import axios from "axios";
import { resetAuthVerificationCache, verifyAuthSession } from "@/lib/auth-verify";
import { useAuthStore } from "@/stores/auth-store";
import { clearAuthAccessToken, setAuthAccessToken } from "@/lib/auth-session";
import { resolveApiUrl } from "@/lib/api-url";

// Safe debug logger - no-op if not defined
const reportDebug = (...args: unknown[]) => {
  if (process.env.NODE_ENV === "development") {
    console.debug("[Login Debug]", ...args);
  }
};

const _backendBaseUrl = resolveApiUrl(process.env.NEXT_PUBLIC_API_URL);

// Safe navigation helper that handles HMR router initialization errors
const safeNavigate = (router: ReturnType<typeof useRouter>, path: string) => {
  try {
    router.replace(path);
  } catch (_e) {
    // Fallback to window.location if router fails (HMR race condition)
    if (typeof window !== "undefined") {
      window.location.href = path;
    }
  }
};


export default function LoginPage() {
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);
  const setStatus = useAuthStore((state) => state.setStatus);
  const authStatus = useAuthStore((state) => state.status);
  const clear = useAuthStore((state) => state.clear);
  const skipInitialSessionProbeRef = useRef(false);

  useEffect(() => {
    let active = true;

    if (authStatus === "authenticated") {
      safeNavigate(router, "/home");
      return () => {
        active = false;
      };
    }

    const checkExistingSession = async () => {
      const result = await verifyAuthSession();

      if (!active || skipInitialSessionProbeRef.current) {
        return;
      }

      if (result.authorized) {
        setStatus("authenticated");
        safeNavigate(router, "/home");
        return;
      }

      if (result.status === 401 || result.status === 403) {
        setStatus("unauthenticated");
        clear();
      }
    };

    checkExistingSession();

    return () => {
      active = false;
    };
  }, [authStatus, router, clear, setStatus]);
  
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    skipInitialSessionProbeRef.current = true;
    setIsLoading(true);
    setErrorMessage("");

    const normalizedUsername = username.trim().replace(/^"+|"+$/g, "");
    const normalizedPassword = password;

    // #region debug-point A:login-submit
    reportDebug?.("A", "Login submit started", {
      usernameLength: normalizedUsername.length,
      hasPassword: Boolean(normalizedPassword),
      windowOrigin: typeof window !== "undefined" ? window.location.origin : null,
    });
    // #endregion

    if (!normalizedUsername || !normalizedPassword) {
      setErrorMessage("يرجى إدخال اسم المستخدم وكلمة المرور.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await apiClient.post("/auth/login", {
        username: normalizedUsername,
        password: normalizedPassword,
      }, {
        timeout: 15_000,
      });

      const authResponse = response.data as {
        user?: unknown;
        token?: string;
        accessToken?: string;
        access_token?: string;
      };
      const token = authResponse.token || authResponse.accessToken || authResponse.access_token;
      // #region debug-point C:login-success
      reportDebug?.("C", "Login request resolved", {
        responseStatus: response.status,
        hasToken: Boolean(token),
        hasUser: Boolean(authResponse.user),
      });
      // #endregion
      setAuthAccessToken(token);
      setUser((authResponse.user ?? null) as { name?: string; username?: string; role?: string } | null);
      resetAuthVerificationCache();

      setStatus("authenticated");
      safeNavigate(router, "/home");

    } catch (error: unknown) {
      // #region debug-point D:login-final-error
      reportDebug?.("D", "Login failed after retries", {
        status: axios.isAxiosError(error) ? error.response?.status ?? null : null,
        message: axios.isAxiosError(error) ? error.message : error instanceof Error ? error.message : String(error),
        responseData: axios.isAxiosError(error) ? error.response?.data ?? null : null,
      });
      // #endregion
      if (axios.isAxiosError<{ message?: string }>(error) && error.response) {
        const status = error.response.status;
        const serverMessage = error.response.data?.message;
        if (status >= 500) {
          setErrorMessage("خادم المصادقة يواجه مشكلة حالياً (500). تأكد من تشغيل الـ Backend وصحة إعداد NEXT_PUBLIC_API_URL.");
        } else {
          setErrorMessage(typeof serverMessage === "string" && serverMessage.trim()
            ? serverMessage
            : "بيانات الدخول غير صحيحة");
        }
      } else if (axios.isAxiosError(error) && error.request) {
          setErrorMessage("تعذر الوصول لخادم المصادقة. تحقق من تشغيل الخادم الخلفي وإعدادات CORS/Proxy.");
      } else if (error instanceof Error) {
          setErrorMessage(error.message || "حدث خطأ غير متوقع.");
      } else {
        setErrorMessage("حدث خطأ غير متوقع.");
      }

      setStatus("unauthenticated");
      clearAuthAccessToken();
      resetAuthVerificationCache();
      clear();

      skipInitialSessionProbeRef.current = false;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    /* خلفية هادئة (رمادي مزرق) تبرز فخامة الكحلي */
    <div className="min-h-screen flex items-center justify-center bg-slate-100 font-sans p-4 md:p-8 relative overflow-hidden" dir="rtl">
      
      {/* نقشة نسيج الجينز في الخلفية بشكل خفيف جداً */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none z-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='12' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 12L12 0M-2 2L2 -2M10 14L14 10' stroke='%23263544' stroke-width='1' fill='none'/%3E%3C/svg%3E")`,
          backgroundSize: '12px 12px'
        }}
      />

      {/* أشكال خلفية مائية للبراند */}
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-[#263544]/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-[#C89355]/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* الحاوية الرئيسية (البطاقة الزجاجية) */}
      <div className="bg-white/80 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_30px_60px_-15px_rgba(38,53,68,0.3)] border border-white w-full max-w-5xl flex overflow-hidden relative z-10 min-h-150 animate-in fade-in zoom-in-95 duration-500">
        
        {/* القسم الأيمن (هوية KU&M JEANS) - يظهر في الشاشات المتوسطة والكبيرة فقط */}
        {/* استخدمنا اللون الكحلي الخاص باللوغو #263544 */}
        <div className="hidden md:flex md:w-5/12 bg-[#263544] flex-col items-center justify-center p-12 text-center relative overflow-hidden outline-dashed outline-1 outline-white/20 outline-offset-[-12px]">
          
          {/* زخارف مائية مأخوذة من فكرة اللوغو */}
          <div className="absolute top-12 right-12 text-white opacity-[0.03] -rotate-12 pointer-events-none">
            <Shield size={180} />
          </div>
          
          <div className="relative z-10 flex flex-col items-center w-full">
            {/* أيقونة تعبر عن اللوغو مع لون رقعة الجلد #C89355 */}
            <div className="p-5 bg-[#1a2530] rounded-2xl shadow-[0_15px_30px_rgba(0,0,0,0.5)] border border-[#C89355]/30 mb-8 relative outline-dashed outline-1 outline-[#C89355]/50 outline-offset-[-6px]">
              {/* لمحاكاة البرغي النحاسي (الزر) الموجود في الجينز */}
              <div className="absolute -top-3 -right-3 w-6 h-6 bg-[#C89355] rounded-full border-2 border-[#1a2530] shadow-inner flex items-center justify-center">
                 <div className="w-2 h-2 bg-[#8c6032] rounded-full"></div>
              </div>
              <div className="absolute -bottom-3 -left-3 w-6 h-6 bg-[#C89355] rounded-full border-2 border-[#1a2530] shadow-inner flex items-center justify-center">
                 <div className="w-2 h-2 bg-[#8c6032] rounded-full"></div>
              </div>
              
              <Shield size={56} className="text-[#C89355]" strokeWidth={1.5} />
            </div>
            
            <h1 className="text-5xl font-serif font-black text-white tracking-wider mb-2" style={{ textShadow: "0 4px 10px rgba(0,0,0,0.5)" }}>KU&M</h1>
            <p className="text-sm font-black text-[#C89355] uppercase tracking-[0.4em] mb-10 border-b border-[#C89355]/30 pb-4 w-full">J E A N S</p>
            
            <h2 className="text-2xl font-bold text-white mb-3 tracking-wide">أصالة الصناعة</h2>
            <p className="text-slate-400 font-medium leading-relaxed text-sm px-4">
              نظام الإدارة المتكامل. يرجى تسجيل الدخول للوصول إلى لوحة تحكم الموظفين والرواتب.
            </p>
          </div>
        </div>

        {/* القسم الأيسر (نموذج الدخول) */}
        <div className="w-full md:w-7/12 p-8 md:p-16 flex flex-col justify-center items-center bg-transparent">
          
          <div className="w-full max-w-sm relative z-20">
            <div className="text-center mb-10">
              <div className="md:hidden flex flex-col items-center justify-center mb-8">
                <h1 className="text-4xl font-serif font-black text-[#263544] tracking-wider mb-1">KU&M</h1>
                <p className="text-xs font-black text-[#C89355] uppercase tracking-[0.3em]">J E A N S</p>
              </div>
              <h2 className="text-3xl font-black text-[#263544] mb-2">تسجيل الدخول</h2>
              <p className="text-slate-500 font-bold text-sm">أدخل بيانات الاعتماد الخاصة بك للوصول</p>
            </div>

            {errorMessage && (
              <div className="mb-6 p-4 bg-rose-50 border-r-4 border-rose-500 text-rose-700 rounded-xl flex items-center gap-3 text-sm font-bold shadow-sm animate-in slide-in-from-top-2">
                <AlertCircle size={20} className="shrink-0" />
                <p>{errorMessage}</p>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5 flex flex-col text-right w-full">
              
              {/* حقل اسم المستخدم */}
              <div className="w-full relative group">
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                  <User className="text-slate-400 group-focus-within:text-[#263544] transition-colors" size={20} />
                </div>
                <input
                  type="text"
                  required
                  className="w-full pl-4 pr-12 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-[#263544]/20 focus:border-[#263544] outline-none transition-all shadow-sm text-[#263544] font-bold placeholder:text-slate-400 placeholder:font-medium"
                  placeholder="اسم المستخدم أو الإيميل"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  dir="rtl"
                />
              </div>

              {/* حقل كلمة المرور */}
              <div className="w-full relative group">
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                  <Lock className="text-slate-400 group-focus-within:text-[#263544] transition-colors" size={20} />
                </div>
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400 hover:text-[#263544] transition-colors"
                  title={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  className="w-full pl-12 pr-12 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-[#263544]/20 focus:border-[#263544] outline-none transition-all shadow-sm text-[#263544] font-bold placeholder:text-slate-400 placeholder:font-medium"
                  placeholder="كلمة المرور"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  dir="ltr"
                />
              </div>

              <div className="flex justify-start w-full px-1">
                <button type="button" className="text-xs font-bold text-[#C89355] hover:text-[#a67741] transition-colors">
                  نسيت كلمة المرور؟
                </button>
              </div>

              {/* زر الدخول بلون الجلد/الذهبي الخاص بالماركة */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full relative overflow-hidden bg-[#263544] hover:bg-[#1a2530] active:scale-[0.98] text-[#C89355] font-black py-4 rounded-2xl transition-all shadow-[0_10px_20px_rgba(38,53,68,0.2)] flex justify-center items-center h-14 mt-4 disabled:opacity-70 disabled:cursor-not-allowed group"
              >
                {/* خطوط خياطة داخلية للزر */}
                <div className="absolute inset-1 rounded-xl border border-dashed border-[#C89355]/30 pointer-events-none"></div>
                
                {isLoading ? <Loader2 className="animate-spin relative z-10 text-[#C89355]" size={24} /> : (
                  <span className="flex items-center gap-2 relative z-10 tracking-wide">
                    <Tag size={18} className="text-[#C89355]" />
                    دخول إلى النظام
                  </span>
                )}
              </button>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}
