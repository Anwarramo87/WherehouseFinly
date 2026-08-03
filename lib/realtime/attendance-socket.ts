"use client";

import { io, type Socket } from "socket.io-client";

const DEPLOYED_BACKEND = "https://werehouse-production-4cba.up.railway.app";

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

  const socket = io(`${DEPLOYED_BACKEND}/realtime`, {
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

