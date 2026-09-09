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

  const backendUrl = resolveSocketUrl({
    socketUrl: process.env.NEXT_PUBLIC_SOCKET_URL,
    apiUrl: process.env.NEXT_PUBLIC_API_URL,
    origin: window.location.origin,
  });

  const socket = io(`${backendUrl}/realtime`, {
    path: "/socket.io",
    transports: ["websocket", "polling"],
    withCredentials: true,
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 3,
    reconnectionDelay: 5000,
    reconnectionDelayMax: 30000,
    timeout: 10000,
    auth: authToken
      ? {
          token: authToken,
        }
      : undefined,
  });

  // Suppress connection errors — socket is optional (realtime biometric updates)
  socket.on("connect_error", () => {
    // Silently ignore — realtime updates are a nice-to-have, not required
  });

  window.__factoryAttendanceSocket = socket;
  return socket;
};

