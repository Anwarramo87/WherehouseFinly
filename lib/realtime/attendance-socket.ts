"use client";

import { io, type Socket } from "socket.io-client";
import { resolveApiUrl } from "@/lib/api-url";

/**
 * Which host the realtime socket connects to.
 *
 * It follows the API host by default. Hard-coding the deployed backend here
 * meant a developer running against localhost:5003 still opened their socket
 * against production: REST calls hit the local server, live notifications and
 * attendance events came from another database, and the bell never moved. The
 * socket and the API must agree on which backend they are talking to.
 *
 * Exported for tests -- the environment is read by the caller, not in here.
 */
export const resolveSocketUrl = (env: {
  socketUrl?: string;
  apiUrl?: string;
  origin?: string;
}): string => {
  const explicit = env.socketUrl?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");

  const api = resolveApiUrl(env.apiUrl);

  // A relative API base ("/api") means same-origin: the socket belongs there too.
  if (api.startsWith("/")) return env.origin ?? "";

  try {
    return new URL(api).origin;
  } catch {
    return env.origin ?? "";
  }
};

export type AttendanceRealtimeEventPayload = {
  employeeId: string;
  employeeName: string;
  type: "IN" | "OUT";
  timestamp: string;
  date: string;
  time: string;
  source: "biometric";
  status: "success";
  action: "created" | "updated";
  message: string;
};

declare global {
  interface Window {
    __factoryAttendanceSocket?: Socket;
  }
}

const getAuthToken = (): string | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const authJson = localStorage.getItem("auth-store");
    if (!authJson) {
      return null;
    }

    const auth = JSON.parse(authJson);
    return auth?.state?.token || null;
  } catch {
    return null;
  }
};

export const getAttendanceSocket = () => {
  if (typeof window === "undefined") {
    return null;
  }

  if (window.__factoryAttendanceSocket) {
    return window.__factoryAttendanceSocket;
  }

  const authToken = getAuthToken();
  // Don't open a socket at all when unauthenticated — prevents WS 401 spam
  // when the session has expired (which also explains the /api 401s above).
  if (!authToken) return null;

  const backendUrl = resolveSocketUrl({
    socketUrl: process.env.NEXT_PUBLIC_SOCKET_URL,
    apiUrl: process.env.NEXT_PUBLIC_API_URL,
    origin: window.location.origin,
  });

  // Same-origin fallback with no backendUrl means no socket to open.
  if (!backendUrl) return null;

  const socket = io(`${backendUrl}/realtime`, {
    path: "/socket.io",
    transports: ["websocket", "polling"],
    withCredentials: true,
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 2,
    reconnectionDelay: 8000,
    reconnectionDelayMax: 30000,
    timeout: 8000,
    auth: { token: authToken },
  });

  // Realtime is optional — never spam console when backend is down.
  socket.on("connect_error", () => {
    // Silently ignore — attendance live updates are nice-to-have.
  });
  // Also silence low-level engine errors that bypass connect_error in some browsers
  const engine: unknown = (socket as unknown as { io?: { engine?: unknown } }).io?.engine;
  if (engine && typeof (engine as { on?: unknown }).on === "function") {
    try {
      (engine as { on: (ev: string, fn: () => void) => void }).on("upgradeError", () => {});
    } catch {}
  }

  window.__factoryAttendanceSocket = socket;
  return socket;
};

/** Tear down the realtime socket (call on logout so a stale authenticated
 *  socket never lingers or spams reconnect errors after the session ends). */
export const disconnectAttendanceSocket = () => {
  if (typeof window === "undefined") return;
  try {
    window.__factoryAttendanceSocket?.disconnect();
  } catch {
    // ignore — socket may already be closed
  }
  window.__factoryAttendanceSocket = undefined;
};

