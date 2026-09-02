"use client";

import { useEffect, useRef, useState } from "react";
import {
  Send,
  X,
  Sparkles,
  RotateCcw,
  Square,
  ArrowLeftRight,
  KeyRound,
  Pencil,
  RefreshCw,
} from "lucide-react";
import { useAssistant } from "@/hooks/useAssistant";
import ToolTrace from "./ToolTrace";

const SUGGESTIONS = [
  "من غاب أكثر من 10 أيام الشهر الماضي؟",
  "الموظفون الذين رواتبهم أقل من 2000000",
  "ما الأصناف التي نفد رصيدها؟",
  "من أخذ 20 يوم إجازة أو أكثر؟",
];

/** Which environment variable turns each provider on. */
const KEY_FOR: Record<string, string> = {
  anthropic: "ANTHROPIC_API_KEY",
  gemini: "GEMINI_API_KEY",
  groq: "GROQ_API_KEY",
};

interface Props {
  onClose: () => void;
  configured: boolean;
  provider: string;
}

export default function AssistantPanel({ onClose, configured, provider }: Props) {
  const { messages, isStreaming, send, stop, reset, editLast, retryLast } =
    useAssistant();
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = () => {
    if (!draft.trim() || isStreaming) return;
    send(draft);
    setDraft("");
  };

  /** Pull the last question back into the composer so a typo can be corrected. */
  const startEdit = () => {
    const text = editLast();
    if (text === null) return;
    setDraft(text);
    // Put the caret at the end rather than selecting, so a small fix is one
    // keystroke away instead of one keystroke from wiping the whole line.
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(text.length, text.length);
    });
  };

  const lastUserId = [...messages].reverse().find((m) => m.role === "user")?.id;

  return (
    <div className="fixed inset-0 z-[70] flex justify-start" role="dialog" aria-modal="true" aria-label="المساعد الذكي">
      <button
        type="button"
        aria-label="إغلاق"
        onClick={onClose}
        className="absolute inset-0 bg-[#263544]/30 backdrop-blur-sm"
      />

      <aside className="relative flex h-full w-full max-w-lg flex-col border-l-2 border-white/80 bg-[#F7F5F2]/95 shadow-[0_0_60px_rgba(38,53,68,0.25)] backdrop-blur-2xl">
        <header className="flex items-center justify-between gap-3 border-b border-white/80 bg-white/60 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#C89355]/40 bg-[#1a2530]">
              <Sparkles size={18} className="text-[#C89355]" />
            </div>
            <div>
              <h2 className="text-sm font-black text-[#263544]">المساعد الذكي</h2>
              <p className="text-[11px] font-bold text-[#263544]/50">
                يقرأ بياناتك ويجيب — لا يعدّل شيئاً
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={reset}
              title="محادثة جديدة"
              className="rounded-xl p-2 text-[#263544]/50 transition-colors hover:bg-[#263544]/5 hover:text-[#263544]"
            >
              <RotateCcw size={16} />
            </button>
            <button
              type="button"
              onClick={onClose}
              title="إغلاق"
              className="rounded-xl p-2 text-[#263544]/50 transition-colors hover:bg-[#263544]/5 hover:text-[#263544]"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-5">
          {!configured ? (
            <div className="flex h-full flex-col items-center justify-center gap-5 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-300 bg-amber-50">
                <KeyRound size={26} className="text-amber-600" />
              </div>
              <div>
                <p className="text-base font-black text-[#263544]">
                  المساعد جاهز — ينقصه مفتاح الوصول فقط
                </p>
                <p className="mt-1 max-w-xs text-xs font-bold text-[#263544]/55">
                  كل شيء آخر مثبّت ويعمل: الأدوات، الصلاحيات، والاتصال بقاعدة
                  البيانات. أضف المفتاح ثم أعد تشغيل الخادم.
                </p>
              </div>
              <div className="w-full rounded-2xl border border-white bg-white/80 p-4 text-right">
                <p className="mb-2 text-[11px] font-black text-[#263544]/50">
                  في الملف back/werehouse/backend-nest/.env
                </p>
                <code className="block overflow-x-auto rounded-xl bg-[#1a2530] px-3 py-2 text-left font-mono text-xs text-[#C89355]">
                  {KEY_FOR[provider] ?? "ANTHROPIC_API_KEY"}=...
                </code>
                <p className="mt-2 text-[11px] font-bold text-[#263544]/45">
                  المزوّد الحالي: {provider}
                </p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-5 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[#C89355]/30 bg-[#1a2530]">
                <Sparkles size={26} className="text-[#C89355]" />
              </div>
              <div>
                <p className="text-base font-black text-[#263544]">
                  اسأل عن أي شيء في المصنع
                </p>
                <p className="mt-1 max-w-xs text-xs font-bold text-[#263544]/50">
                  الموظفون، الحضور والغياب، الرواتب، المخزون، والمبيعات — بالعربية أو الإنجليزية.
                </p>
              </div>
              <div className="flex w-full flex-col gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="rounded-2xl border border-white bg-white/70 px-4 py-3 text-right text-xs font-black text-[#263544] transition-all hover:border-[#C89355]/40 hover:bg-white"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {messages.map((m) =>
                m.role === "user" ? (
                  <div key={m.id} className="group/msg flex items-center justify-start gap-1.5">
                    <div className="max-w-[85%] rounded-2xl rounded-tr-md bg-[#1a2530] px-4 py-2.5 text-sm font-black text-white">
                      {m.text}
                    </div>
                    {m.id === lastUserId && !isStreaming && (
                      <button
                        type="button"
                        onClick={startEdit}
                        title="تعديل السؤال"
                        aria-label="تعديل السؤال"
                        className="shrink-0 rounded-lg p-1.5 text-[#263544]/35 opacity-0 transition-all hover:bg-[#263544]/8 hover:text-[#263544] focus-visible:opacity-100 group-hover/msg:opacity-100"
                      >
                        <Pencil size={13} />
                      </button>
                    )}
                  </div>
                ) : (
                  <div key={m.id} className="flex justify-end">
                    <div
                      className={`max-w-[92%] rounded-2xl rounded-tl-md border px-4 py-3 ${
                        m.failed
                          ? "border-rose-200 bg-rose-50"
                          : "border-white bg-white/80"
                      }`}
                    >
                      {m.text ? (
                        <p
                          className={`whitespace-pre-wrap text-sm font-bold leading-relaxed ${
                            m.failed ? "text-rose-800" : "text-[#263544]"
                          }`}
                        >
                          {m.text}
                        </p>
                      ) : (
                        <p className="text-sm font-bold text-[#263544]/40">…</p>
                      )}

                      {m.failed && !isStreaming && (
                        <button
                          type="button"
                          onClick={retryLast}
                          className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-rose-100 px-2.5 py-1 text-[11px] font-black text-rose-800 transition-colors hover:bg-rose-200"
                        >
                          <RefreshCw size={12} />
                          إعادة المحاولة
                        </button>
                      )}

                      {m.navigatedTo && (
                        <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[#C89355]/12 px-2 py-1 text-[11px] font-black text-[#8a5f26]">
                          <ArrowLeftRight size={12} />
                          فُتحت صفحة {m.navigatedTo.route}
                        </p>
                      )}

                      <ToolTrace steps={m.steps} />
                    </div>
                  </div>
                ),
              )}
            </div>
          )}
        </div>

        <footer className="border-t border-white/80 bg-white/60 px-4 py-3">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={draft}
              rows={1}
              disabled={!configured}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder={configured ? "اكتب سؤالك…" : "غير متاح حتى يُضاف المفتاح"}
              className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl border-none bg-white/90 px-4 py-3 text-sm font-black text-[#263544] shadow-inner outline-none focus:ring-2 focus:ring-[#C89355]/50"
            />

            {isStreaming ? (
              <button
                type="button"
                onClick={stop}
                title="إيقاف"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-500 text-white transition-all hover:bg-rose-600 active:scale-95"
              >
                <Square size={16} />
              </button>
            ) : (
              <button
                type="button"
                onClick={submit}
                disabled={!draft.trim() || !configured}
                title="إرسال"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#C89355]/40 bg-[#1a2530] text-[#C89355] transition-all hover:bg-[#263544] disabled:opacity-40 active:scale-95"
              >
                <Send size={16} className="-scale-x-100" />
              </button>
            )}
          </div>
          <p className="mt-2 text-center text-[10px] font-bold text-[#263544]/40">
            قد يخطئ المساعد — راجع الأرقام المهمة على صفحتها. المحادثة محفوظة حتى
            تغلق التبويب، ويمكنك بدء محادثة جديدة من الأعلى.
          </p>
        </footer>
      </aside>
    </div>
  );
}
