"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Fingerprint,
  KeyRound,
  Loader2,
  LogIn,
  LogOut,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import axios from "axios";
import { toast } from "react-hot-toast";
import apiClient from "@/lib/api-client";
import {
  biometricApi,
  buildBiometricPayload,
  type BiometricAttendanceResult,
} from "@/lib/biometric-api";
import { useAuthStore } from "@/stores/auth-store";

type StoredBiometricKey = {
  keyId: string;
  publicKeyBase64: string;
  privateKeyBase64: string;
  createdAt: string;
};

type AuthMeResponse = {
  id?: string;
  name?: string;
  username?: string;
  email?: string;
  role?: string;
  employeeId?: string | null;
};

const BIOMETRIC_STORAGE_KEY = "factory_biometric_key_v1";
const EMPLOYEE_ID_REGEX = /^EMP[0-9]{3,}$/;
const textEncoder = new TextEncoder();

const toBase64Url = (data: ArrayBuffer | Uint8Array) => {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const fromBase64Url = (value: string) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = normalized.length % 4 === 0 ? 0 : 4 - (normalized.length % 4);
  const padded = `${normalized}${"=".repeat(padLength)}`;
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
};

const readStoredKey = (): StoredBiometricKey | null => {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(BIOMETRIC_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<StoredBiometricKey>;
    if (
      !parsed ||
      typeof parsed.keyId !== "string" ||
      typeof parsed.publicKeyBase64 !== "string" ||
      typeof parsed.privateKeyBase64 !== "string"
    ) {
      return null;
    }

    return {
      keyId: parsed.keyId,
      publicKeyBase64: parsed.publicKeyBase64,
      privateKeyBase64: parsed.privateKeyBase64,
      createdAt: parsed.createdAt || new Date().toISOString(),
    };
  } catch {
    return null;
  }
};

const saveStoredKey = (key: StoredBiometricKey) => {
  localStorage.setItem(BIOMETRIC_STORAGE_KEY, JSON.stringify(key));
};

const clearStoredKey = () => {
  localStorage.removeItem(BIOMETRIC_STORAGE_KEY);
};

const ensureCryptoSupport = () => {
  if (typeof window === "undefined") {
    throw new Error("لا يمكن تنفيذ البصمة خارج المتصفح.");
  }

  if (!window.isSecureContext) {
    throw new Error("ميزة البصمة تتطلب HTTPS أو localhost.");
  }

  if (!window.crypto?.subtle) {
    throw new Error("المتصفح الحالي لا يدعم Web Crypto المطلوبة لتوقيع البصمة.");
  }
};

const randomHex = (bytesLength: number) => {
  const bytes = new Uint8Array(bytesLength);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
};

const generateBiometricKeyPair = async (): Promise<StoredBiometricKey> => {
  ensureCryptoSupport();

  const keyPair = (await window.crypto.subtle.generateKey(
    { name: "Ed25519" } as AlgorithmIdentifier,
    true,
    ["sign", "verify"],
  )) as CryptoKeyPair;

  const publicKeyRaw = await window.crypto.subtle.exportKey("raw", keyPair.publicKey);
  const privateKeyPkcs8 = await window.crypto.subtle.exportKey("pkcs8", keyPair.privateKey);

  const key: StoredBiometricKey = {
    keyId: `WEB-${Date.now().toString(36).toUpperCase()}-${randomHex(4).toUpperCase()}`,
    publicKeyBase64: toBase64Url(publicKeyRaw),
    privateKeyBase64: toBase64Url(privateKeyPkcs8),
    createdAt: new Date().toISOString(),
  };

  saveStoredKey(key);
  return key;
};

const signPayload = async (privateKeyBase64: string, payload: string) => {
  ensureCryptoSupport();

  const privateKeyBytes = fromBase64Url(privateKeyBase64);
  const privateKey = await window.crypto.subtle.importKey(
    "pkcs8",
    privateKeyBytes,
    { name: "Ed25519" } as AlgorithmIdentifier,
    false,
    ["sign"],
  );

  const signature = await window.crypto.subtle.sign(
    { name: "Ed25519" } as AlgorithmIdentifier,
    privateKey,
    textEncoder.encode(payload),
  );

  return toBase64Url(signature);
};

const formatAttendanceTime = (timestamp: string) => {
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) return "--:--";

  return new Intl.DateTimeFormat("ar-SY", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(parsed);
};

const parseErrorMessage = (error: unknown, fallback: string) => {
  if (axios.isAxiosError(error)) {
    const payload = error.response?.data as
      | { message?: string | string[]; error?: { message?: string | string[] } }
      | undefined;
    const message = payload?.error?.message ?? payload?.message;

    if (Array.isArray(message)) {
      return message.join(" | ");
    }

    if (typeof message === "string" && message.trim()) {
      return message;
    }

    if (typeof error.message === "string" && error.message.trim()) {
      return error.message;
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
};

export default function BiometricPage() {
  const currentUser = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);

  const [storedKey, setStoredKey] = useState<StoredBiometricKey | null>(() => readStoredKey());
  const [employeeId, setEmployeeId] = useState(() => currentUser?.employeeId || "");
  const [latestAttendance, setLatestAttendance] =
    useState<BiometricAttendanceResult | null>(null);
  const [isHydratingProfile, setIsHydratingProfile] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [clockingType, setClockingType] = useState<"IN" | "OUT" | null>(null);

  const username = useMemo(
    () => (currentUser?.username || currentUser?.email || "").trim(),
    [currentUser?.email, currentUser?.username],
  );

  useEffect(() => {
    let active = true;

    const hydrateUserProfile = async () => {
      setIsHydratingProfile(true);
      try {
        const response = await apiClient.get<AuthMeResponse>("/auth/me");
        const profile = response.data;

        if (!active || !profile) return;

        setUser({
          id: profile.id,
          name: profile.name,
          username: profile.username,
          email: profile.email,
          role: profile.role,
          employeeId: profile.employeeId || undefined,
        });

        if (profile.employeeId && !employeeId) {
          setEmployeeId(profile.employeeId);
        }
      } catch {
        // Silent failure: page can still work using current store data.
      } finally {
        if (active) {
          setIsHydratingProfile(false);
        }
      }
    };

    void hydrateUserProfile();

    return () => {
      active = false;
    };
  }, [employeeId, setUser]);

  const ensureKey = async () => {
    const cached = storedKey || readStoredKey();
    if (cached) {
      setStoredKey(cached);
      return cached;
    }

    const generated = await generateBiometricKeyPair();
    setStoredKey(generated);
    return generated;
  };

  const handleRegisterBiometric = async () => {
    setIsEnrolling(true);

    try {
      const key = await ensureKey();
      const start = await biometricApi.registerStart({
        keyId: key.keyId,
        publicKeyBase64: key.publicKeyBase64,
        deviceName: `Factory Web (${navigator.platform || "browser"})`,
      });

      const payload = buildBiometricPayload(
        "REGISTER",
        start.challengeId,
        start.challengeBase64,
      );
      const signatureBase64 = await signPayload(key.privateKeyBase64, payload);

      await biometricApi.registerFinish({
        challengeId: start.challengeId,
        challengeBase64: start.challengeBase64,
        signatureBase64,
      });

      toast.success("تم تسجيل بصمتك على هذا الجهاز بنجاح.");
    } catch (error: unknown) {
      toast.error(parseErrorMessage(error, "فشل تسجيل البصمة. حاول مرة أخرى."));
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleBiometricAttendance = async (attendanceType: "IN" | "OUT") => {
    if (!username) {
      toast.error("لا يمكن تنفيذ البصمة لأن اسم المستخدم غير متوفر.");
      return;
    }

    const normalizedEmployeeId = employeeId.trim().toUpperCase();
    if (!EMPLOYEE_ID_REGEX.test(normalizedEmployeeId)) {
      toast.error("أدخل رقم موظف صحيح بصيغة EMP001.");
      return;
    }

    setClockingType(attendanceType);

    try {
      const key = await ensureKey();
      const start = await biometricApi.loginStart({ username });

      if (!start.allowedKeyIds.includes(key.keyId)) {
        throw new Error("هذا الجهاز غير مسجل بصمة لهذا الحساب. سجل البصمة أولاً.");
      }

      const payload = buildBiometricPayload("LOGIN", start.challengeId, start.challengeBase64);
      const signatureBase64 = await signPayload(key.privateKeyBase64, payload);

      const finish = await biometricApi.loginFinish({
        challengeId: start.challengeId,
        challengeBase64: start.challengeBase64,
        keyId: key.keyId,
        signatureBase64,
        markAttendance: true,
        employeeId: normalizedEmployeeId,
        attendanceType,
        attendanceDeviceId: key.keyId,
        attendanceLocation: "factory-web",
      });

      if (finish.user) {
        setUser({
          id: finish.user.id,
          name: finish.user.name,
          username: finish.user.username,
          role: finish.user.role,
          employeeId: normalizedEmployeeId,
        });
      }

      if (finish.attendance) {
        setLatestAttendance(finish.attendance);

        const attendanceTime = formatAttendanceTime(finish.attendance.timestamp);
        const actionLabel = finish.attendance.type === "IN" ? "دخول" : "خروج";

        toast.success(`تم تسجيل ${actionLabel} الساعة ${attendanceTime}`);
      } else {
        toast.success("تم التحقق بالبصمة لكن لم يتم تسجيل الحضور.");
      }
    } catch (error: unknown) {
      toast.error(parseErrorMessage(error, "فشلت عملية البصمة أو تسجيل الحضور."));
    } finally {
      setClockingType(null);
    }
  };

  const handleClearBiometric = async () => {
    if (!storedKey) return;

    const shouldProceed = window.confirm("هل تريد حذف البصمة من هذا الجهاز؟");
    if (!shouldProceed) return;

    try {
      await biometricApi.revoke({ keyId: storedKey.keyId });
    } catch {
      // If server-side credential is missing (e.g., restart in testing mode), still clear local key.
    } finally {
      clearStoredKey();
      setStoredKey(null);
      toast.success("تم حذف بيانات البصمة من هذا الجهاز.");
    }
  };

  return (
    /* الحاوية الرئيسية: تأثير زجاجي مع درازة خارجية */
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
          
          <header className="mb-10 text-right border-b border-[#263544]/10 pb-6 relative">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-[#1a2530] rounded-2xl shadow-[0_15px_25px_rgba(38,53,68,0.4)] border border-[#C89355]/40 relative outline outline-dashed outline-1 outline-[#C89355]/50 outline-offset-[-4px]">
                <Fingerprint size={24} className="text-[#C89355] animate-bounce" strokeWidth={2.5} />
              </div>
              <h1 className="text-3xl font-black text-[#263544] tracking-tight drop-shadow-sm">بصمتي وحضوري</h1>
            </div>
            <p className="text-slate-600 text-sm font-bold pr-14 mt-1">
              سجل بصمتك مرة واحدة، وبعدها بصمة واحدة تسجل الحضور مباشرة مع الوقت بالدقيقة.
            </p>
          </header>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            
            {/* كارد تسجيل البصمة (Glassmorphism + درازة) */}
            <section className="relative overflow-hidden bg-white/60 backdrop-blur-2xl rounded-[2.5rem] border-2 border-white/90 shadow-[0_15px_40px_rgba(38,53,68,0.08)] hover:shadow-[0_20px_50px_rgba(38,53,68,0.12)] transition-all p-8 group">
              <div className="absolute inset-1.5 rounded-[2.2rem] border border-dashed border-[#C89355]/30 pointer-events-none transition-colors group-hover:border-[#C89355]/50" />
              
              <div className="flex items-center gap-3 mb-6 relative z-10">
                <div className="p-3 rounded-xl bg-[#263544] text-[#C89355] border border-[#C89355]/30 shadow-sm">
                  <ShieldCheck size={22} className="group-hover:animate-pulse" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-[#263544]">تسجيل البصمة</h2>
                  <p className="text-xs text-slate-500 font-bold mt-1">ربط هذا الجهاز بحسابك البيومتري</p>
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-[#263544]/10 shadow-sm p-5 mb-6 hover:border-[#C89355]/30 transition-colors relative z-10 group/card">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-[#1a2530] rounded-xl shadow-inner border border-[#C89355]/20">
                    <KeyRound className="text-[#C89355] shrink-0" size={20} />
                  </div>
                  <div className="text-sm text-[#263544] w-full">
                    <p className="font-black text-[#263544]">حالة الجهاز:</p>
                    {storedKey ? (
                      <div className="mt-3 bg-[#1a2530] p-4 rounded-xl border border-[#C89355]/30 shadow-inner relative overflow-hidden">
                        <div className="absolute inset-1 rounded-lg border border-dashed border-[#C89355]/20 pointer-events-none" />
                        <p className="text-emerald-400 font-black text-xs mb-2 flex items-center gap-1.5 relative z-10"><CheckCircle2 size={16}/> مسجل محلياً وموثق</p>
                        <p className="text-xs text-slate-400 relative z-10">معرف المفتاح: <span className="font-mono font-bold text-[#C89355] block mt-1">{storedKey.keyId}</span></p>
                      </div>
                    ) : (
                      <p className="mt-3 text-rose-500 font-black text-xs bg-rose-50/80 backdrop-blur-sm p-4 rounded-xl border border-rose-100 flex items-center gap-1.5 shadow-sm"><AlertCircle size={16}/> لا يوجد مفتاح بصمة محلي على هذا الجهاز بعد.</p>
                    )}
                    <p className="mt-4 text-xs font-black text-[#263544]/60 flex items-center justify-between border-t border-[#263544]/10 pt-4">
                      <span>المستخدم الحالي:</span>
                      <span className="text-[#1a2530] px-3 py-1.5 bg-[#C89355]/10 rounded-lg font-mono font-bold border border-[#C89355]/20">
                        {isHydratingProfile ? "تحديث..." : (username || "غير متوفر")}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 relative z-10">
                <button
                  type="button"
                  onClick={handleRegisterBiometric}
                  disabled={isEnrolling}
                  className="relative overflow-hidden flex-1 inline-flex justify-center items-center gap-2 px-4 py-3.5 rounded-2xl bg-[#1a2530] hover:bg-[#263544] text-[#C89355] font-black text-sm shadow-[0_10px_20px_rgba(38,53,68,0.4)] active:scale-95 disabled:opacity-60 transition-all border border-[#C89355]/40 group/btn"
                >
                  <div className="absolute inset-1 rounded-xl border border-dashed border-[#C89355]/30 pointer-events-none transition-colors group-hover/btn:border-[#C89355]/50" />
                  {isEnrolling ? <Loader2 size={18} className="animate-spin relative z-10" /> : <Fingerprint size={18} className="relative z-10" />}
                  <span className="relative z-10">{isEnrolling ? "جارٍ التسجيل..." : "تسجيل بصمة هذا الجهاز"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleClearBiometric}
                  disabled={!storedKey}
                  className="relative overflow-hidden flex-none inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-white/80 backdrop-blur-md border-2 border-white hover:border-rose-300 text-rose-600 font-black text-sm hover:bg-rose-50 shadow-sm active:scale-95 disabled:opacity-50 transition-all group/del"
                  title="حذف البصمة من الجهاز"
                >
                  <div className="absolute inset-1 rounded-xl border border-dashed border-rose-200 pointer-events-none transition-colors group-hover/del:border-rose-400" />
                  <Trash2 size={18} className="relative z-10" />
                </button>
              </div>
            </section>

            {/* كارد تسجيل الحضور (Glassmorphism + درازة) */}
            <section className="relative overflow-hidden bg-white/60 backdrop-blur-2xl rounded-[2.5rem] border-2 border-white/90 shadow-[0_15px_40px_rgba(38,53,68,0.08)] hover:shadow-[0_20px_50px_rgba(38,53,68,0.12)] transition-all p-8 group">
              <div className="absolute inset-1.5 rounded-[2.2rem] border border-dashed border-[#C89355]/30 pointer-events-none transition-colors group-hover:border-[#C89355]/50" />
              
              <div className="flex items-center gap-3 mb-6 relative z-10">
                <div className="p-3 rounded-xl bg-[#C89355] text-[#1a2530] border border-[#1a2530]/20 shadow-sm">
                  <Clock3 size={22} className="group-hover:animate-pulse" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-[#263544]">تسجيل الحضور بالبصمة</h2>
                  <p className="text-xs text-slate-500 font-bold mt-1">بصمة واحدة = حفظ وقت الدخول أو الخروج</p>
                </div>
              </div>

              <div className="mb-8 relative z-10">
                <label className="block text-sm font-black text-[#263544] mb-3">رقم الموظف الخاص بك</label>
                <div className="relative">
                  <div className="absolute inset-1 rounded-[14px] border border-dashed border-[#C89355]/30 pointer-events-none z-10" />
                  <input
                    type="text"
                    value={employeeId}
                    onChange={(event) => setEmployeeId(event.target.value.toUpperCase())}
                    placeholder="EMP001"
                    className="w-full rounded-2xl border-2 border-white bg-white/80 backdrop-blur-md px-5 py-4 font-mono font-black text-[#263544] outline-none focus:ring-2 focus:ring-[#C89355]/40 focus:border-[#C89355] shadow-inner transition-all text-xl text-center relative z-0"
                    dir="ltr"
                  />
                </div>
                <p className="text-[11px] font-bold text-[#263544]/60 mt-3 flex items-center justify-center gap-1.5">
                  <AlertCircle size={14} className="text-[#C89355]"/>
                  يجب أن يكون رقم الموظف مطابقاً لحسابك البيومتري.
                </p>
              </div>

              <div className="flex flex-wrap gap-4 relative z-10">
                <button
                  type="button"
                  onClick={() => void handleBiometricAttendance("IN")}
                  disabled={clockingType !== null}
                  className="relative overflow-hidden flex-1 inline-flex justify-center items-center gap-2 px-4 py-4 rounded-2xl bg-[#1a2530] hover:bg-[#263544] text-[#C89355] font-black text-sm shadow-[0_10px_20px_rgba(38,53,68,0.4)] active:scale-95 disabled:opacity-60 transition-all border border-[#C89355]/40 group/btn"
                >
                  <div className="absolute inset-1 rounded-xl border border-dashed border-[#C89355]/30 pointer-events-none transition-colors group-hover/btn:border-[#C89355]/50" />
                  {clockingType === "IN" ? <Loader2 size={20} className="animate-spin relative z-10" /> : <LogIn size={20} className="group-hover/btn:animate-bounce relative z-10" />}
                  <span className="relative z-10 text-base">بصمة دخول</span>
                </button>

                <button
                  type="button"
                  onClick={() => void handleBiometricAttendance("OUT")}
                  disabled={clockingType !== null}
                  className="relative overflow-hidden flex-1 inline-flex justify-center items-center gap-2 px-4 py-4 rounded-2xl border-2 border-white bg-white/80 backdrop-blur-md shadow-sm text-[#263544] font-black text-sm hover:bg-white hover:border-[#C89355]/40 active:scale-95 disabled:opacity-60 transition-all group/btn"
                >
                  <div className="absolute inset-1 rounded-xl border border-dashed border-[#263544]/10 pointer-events-none transition-colors group-hover/btn:border-[#C89355]/30" />
                  {clockingType === "OUT" ? <Loader2 size={20} className="animate-spin text-[#C89355] relative z-10" /> : <LogOut size={20} className="text-[#C89355] group-hover/btn:animate-bounce relative z-10" />}
                  <span className="relative z-10 text-base">بصمة خروج</span>
                </button>
              </div>

              {/* النتيجة / آخر سجل */}
              <div className="mt-8 relative overflow-hidden rounded-2xl border-2 border-white/80 bg-white/50 backdrop-blur-xl p-5 shadow-[0_8px_20px_rgba(38,53,68,0.04)] group/res">
                <div className="absolute inset-1 rounded-xl border border-dashed border-[#C89355]/20 pointer-events-none transition-colors group-hover/res:border-[#C89355]/40" />
                {latestAttendance ? (
                  <div className="flex items-start gap-4 relative z-10">
                    <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl border border-emerald-200 shadow-inner shrink-0">
                      <CheckCircle2 size={24} />
                    </div>
                    <div className="text-[#263544] w-full">
                      <p className="font-black text-[#263544] text-lg">
                        آخر عملية: <span className={latestAttendance.type === "IN" ? "text-[#C89355]" : "text-rose-500"}>{latestAttendance.type === "IN" ? "دخول" : "خروج"}</span>
                      </p>
                      <div className="mt-3 bg-white/80 p-4 rounded-xl border border-white shadow-sm flex items-center justify-between">
                        <span className="text-xs font-black text-slate-500">الوقت المسجل:</span>
                        <span className="font-mono font-black text-xl text-[#263544] drop-shadow-sm">{formatAttendanceTime(latestAttendance.timestamp)}</span>
                      </div>
                      <p className="text-[11px] font-black text-[#C89355] mt-3 text-center bg-[#1a2530] py-1.5 rounded-lg shadow-inner">
                        {latestAttendance.action === "created" ? "سجل جديد" : "تحديث سجل اليوم"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-3 text-sm text-[#263544]/40 py-6 relative z-10">
                    <Fingerprint className="text-[#C89355]/40" size={40} />
                    <span className="font-black text-[#263544]/60">لا يوجد تسجيل حضور بالبصمة بعد.</span>
                  </div>
                )}
              </div>
            </section>
          </div>
          
        </div>
    </div>
  );
}