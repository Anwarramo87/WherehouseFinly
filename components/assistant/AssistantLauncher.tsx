"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import apiClient from "@/lib/api-client";

// The panel pulls in the streaming hook and the trace renderer; keep it out of
// the initial dashboard bundle until someone actually opens it.
const AssistantPanel = dynamic(() => import("./AssistantPanel"), { ssr: false });

interface Status {
  configured: boolean;
  provider: string;
}

export default function AssistantLauncher() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    let cancelled = false;

    apiClient
      .get<Status>("/assistant/status")
      .then((res) => {
        if (cancelled) return;
        setStatus({
          configured: Boolean(res.data?.configured),
          provider: res.data?.provider ?? "unknown",
        });
      })
      .catch((error) => {
        if (cancelled) return;
        // A 403 is the normal answer for a user with no read permission at all,
        // and hiding is right there. Anything else is worth saying out loud.
        setStatus(null);
        console.warn(
          "[assistant] hidden: /assistant/status failed —",
          (error as { response?: { status?: number } })?.response?.status ??
            (error as Error)?.message,
        );
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Only permission hides the button. A missing API key does not: the panel
  // explains that instead, because a feature that silently fails to appear is
  // indistinguishable from one that was never deployed.
  if (!status) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={
          status.configured
            ? "المساعد الذكي"
            : "المساعد الذكي — يحتاج إلى إعداد"
        }
        aria-label="فتح المساعد الذكي"
        className="group fixed bottom-6 left-6 z-[60] flex items-center gap-2.5 rounded-2xl border border-[#C89355]/40 bg-[#1a2530] py-3.5 pl-5 pr-4 shadow-[0_10px_30px_rgba(38,53,68,0.4)] transition-all hover:scale-105 hover:bg-[#263544] active:scale-95"
      >
        <span className="relative shrink-0">
          <Sparkles
            size={20}
            className="text-[#C89355] transition-transform group-hover:rotate-12"
          />
          {!status.configured && (
            <span
              className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-amber-400"
              aria-hidden
            />
          )}
        </span>
        <span className="hidden text-sm font-black text-[#C89355] sm:inline">
          المساعد الذكي
        </span>
      </button>

      {open && (
        <AssistantPanel
          onClose={() => setOpen(false)}
          configured={status.configured}
          provider={status.provider}
        />
      )}
    </>
  );
}
