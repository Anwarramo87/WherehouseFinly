"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/** Mirrors AssistantEvent on the backend. */
export type AssistantEvent =
  | { type: "text"; text: string }
  | { type: "tool_start"; name: string; args: Record<string, unknown> }
  | { type: "tool_result"; name: string; rowCount: number; ms: number }
  | { type: "tool_error"; name: string; message: string }
  | { type: "navigate"; route: string; params?: Record<string, string>; reason: string }
  | { type: "done"; conversationId?: string }
  | { type: "error"; message: string };

/** One thing the assistant did while answering, shown in the trace. */
export interface ToolStep {
  name: string;
  args: Record<string, unknown>;
  status: "running" | "done" | "error";
  rowCount?: number;
  ms?: number;
  message?: string;
}

export interface AssistantMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  steps: ToolStep[];
  navigatedTo?: { route: string; reason: string };
  failed?: boolean;
}

const newId = () => Math.random().toString(36).slice(2);

/**
 * The conversation outlives the panel.
 *
 * The panel unmounts when it is closed, which used to take the whole thread
 * with it. Session storage keeps it across closing, reopening and reloading,
 * while still clearing when the tab does.
 */
const STORAGE_KEY = "assistant:conversation:v1";

interface Persisted {
  messages: AssistantMessage[];
  conversationId?: string;
}

function readStored(): Persisted {
  if (typeof window === "undefined") return { messages: [] };
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { messages: [] };
    const parsed = JSON.parse(raw) as Persisted;
    return Array.isArray(parsed?.messages) ? parsed : { messages: [] };
  } catch {
    // Private windows and blocked site data both throw here; an empty thread
    // is the right fallback, never a crash.
    return { messages: [] };
  }
}

export function useAssistant() {
  const router = useRouter();
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const conversationRef = useRef<string | undefined>(undefined);
  const abortRef = useRef<AbortController | null>(null);
  const restored = useRef(false);

  // Restore once, after mount, so server and client render the same empty list.
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    const stored = readStored();
    if (stored.messages.length) setMessages(stored.messages);
    conversationRef.current = stored.conversationId;
  }, []);

  const persist = useCallback((next: AssistantMessage[]) => {
    try {
      window.sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ messages: next, conversationId: conversationRef.current }),
      );
    } catch {
      // Storage being unavailable must never break the chat.
    }
  }, []);

  useEffect(() => {
    if (restored.current && messages.length) persist(messages);
  }, [messages, persist]);

  const patchLast = useCallback((patch: (m: AssistantMessage) => AssistantMessage) => {
    setMessages((prev) => {
      if (prev.length === 0) return prev;
      const next = [...prev];
      next[next.length - 1] = patch(next[next.length - 1]);
      return next;
    });
  }, []);

  const apply = useCallback(
    (event: AssistantEvent) => {
      switch (event.type) {
        case "text":
          // Turns arrive whole, so join rather than replace: a question that
          // needed two rounds of tools produces two pieces of prose.
          patchLast((m) => ({
            ...m,
            text: m.text ? `${m.text}\n\n${event.text}` : event.text,
          }));
          break;

        case "tool_start":
          patchLast((m) => ({
            ...m,
            steps: [...m.steps, { name: event.name, args: event.args, status: "running" }],
          }));
          break;

        case "tool_result":
          patchLast((m) => ({
            ...m,
            steps: m.steps.map((s, i) =>
              i === m.steps.length - 1
                ? { ...s, status: "done", rowCount: event.rowCount, ms: event.ms }
                : s,
            ),
          }));
          break;

        case "tool_error":
          patchLast((m) => ({
            ...m,
            steps: m.steps.map((s, i) =>
              i === m.steps.length - 1
                ? { ...s, status: "error", message: event.message }
                : s,
            ),
          }));
          break;

        case "navigate": {
          const query = event.params
            ? `?${new URLSearchParams(event.params).toString()}`
            : "";
          patchLast((m) => ({
            ...m,
            navigatedTo: { route: event.route, reason: event.reason },
          }));
          router.push(`${event.route}${query}`);
          break;
        }

        case "done":
          conversationRef.current = event.conversationId;
          break;

        case "error":
          patchLast((m) => ({ ...m, text: event.message, failed: true }));
          break;
      }
    },
    [patchLast, router],
  );

  const send = useCallback(
    async (message: string) => {
      const trimmed = message.trim();
      if (!trimmed || isStreaming) return;

      setMessages((prev) => [
        ...prev,
        { id: newId(), role: "user", text: trimmed, steps: [] },
        { id: newId(), role: "assistant", text: "", steps: [] },
      ]);
      setIsStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await fetch("/api/assistant/chat", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: trimmed,
            conversationId: conversationRef.current,
          }),
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          const detail = await response.text().catch(() => "");
          throw new Error(
            response.status === 403
              ? "حسابك لا يملك صلاحية استخدام المساعد."
              : detail || `تعذر الاتصال بالمساعد (${response.status}).`,
          );
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        // SSE frames are separated by a blank line, and a chunk can split one
        // in half -- so keep the remainder in the buffer rather than parsing
        // whatever happened to arrive.
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const frames = buffer.split("\n\n");
          buffer = frames.pop() ?? "";

          for (const frame of frames) {
            const line = frame.split("\n").find((l) => l.startsWith("data: "));
            if (!line) continue;
            try {
              apply(JSON.parse(line.slice(6)) as AssistantEvent);
            } catch {
              // A malformed frame is not worth killing the answer over.
            }
          }
        }
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          patchLast((m) => ({ ...m, text: m.text || "تم الإيقاف." }));
        } else {
          patchLast((m) => ({
            ...m,
            text: (error as Error).message || "حدث خطأ غير متوقع.",
            failed: true,
          }));
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [apply, isStreaming, patchLast],
  );

  /**
   * Take back the last question so it can be corrected.
   *
   * Returns its text for the composer and drops that exchange. The server-side
   * thread is abandoned too: the model has already seen the mistyped question,
   * and letting it keep that in context is exactly what the user is trying to
   * undo.
   */
  const editLast = useCallback((): string | null => {
    if (isStreaming) return null;

    // Computed outside the state updater on purpose: this project runs React
    // strict mode, which invokes updaters twice, so an updater that also writes
    // storage and assigns to an outer variable is a trap.
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser) return null;

    const next = messages.slice(
      0,
      messages.findIndex((m) => m.id === lastUser.id),
    );
    conversationRef.current = undefined;
    setMessages(next);
    try {
      window.sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ messages: next, conversationId: undefined }),
      );
    } catch {
      /* storage optional */
    }
    return lastUser.text;
  }, [isStreaming, messages]);

  /** Ask the last question again, unchanged — for when it failed, not misfired. */
  const retryLast = useCallback(() => {
    if (isStreaming) return;
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser) return;
    setMessages(
      messages.slice(0, messages.findIndex((m) => m.id === lastUser.id)),
    );
    void send(lastUser.text);
  }, [isStreaming, messages, send]);

  const stop = useCallback(() => abortRef.current?.abort(), []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    conversationRef.current = undefined;
    setMessages([]);
    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* storage optional */
    }
  }, []);

  return { messages, isStreaming, send, stop, reset, editLast, retryLast };
}
