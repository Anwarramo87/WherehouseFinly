"use client";

import { io, type Socket } from "socket.io-client";
import { DEFAULT_API_URL } from "@/lib/api-url";

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

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const stripApiSuffix = (pathname: string) => {
  const cleanPath = trimTrailingSlash(pathname || "");
  if (!cleanPath) return "";
  if (cleanPath.toLowerCase().endsWith("/api")) {
    return cleanPath.slice(0, -4);
  }
  return cleanPath;
};

const resolveSocketBaseUrl = () => {
  if (typeof window === "undefined") {
    return "";
  }

  const rawApiUrl = String(process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL).trim();

  if (!rawApiUrl) {
    return window.location.origin;
  }

  if (rawApiUrl.startsWith("/")) {
    return window.location.origin;
  }

  try {
    const parsed = new URL(rawApiUrl);
    const maybeBasePath = stripApiSuffix(parsed.pathname || "");
    const basePath = maybeBasePath === "/" ? "" : maybeBasePath;
    return `${parsed.origin}${basePath}`;
  } catch {
    return window.location.origin;
  }
};

const getAuthToken = (): string | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    // Try to get auth token from localStorage (auth store may have persisted it)
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

  const socketBase = trimTrailingSlash(resolveSocketBaseUrl());
  const authToken = getAuthToken();

  const socket = io(`${socketBase}/realtime`, {
    path: "/socket.io",
    transports: ["websocket", "polling"],
    withCredentials: true,
    autoConnect: true,
    // Include auth token in handshake for token-based auth systems
    auth: authToken
      ? {
          token: authToken,
        }
      : undefined,
  });

  // Re-authenticate on disconnect/reconnect if token available
  if (authToken) {
    socket.on("disconnect", () => {
      // Optional: log disconnect for debugging
      console.debug("Attendance socket disconnected; will re-auth on reconnect");
    });

    socket.on("connect_error", (error) => {
      // Log auth errors if they occur
      if (error.message && error.message.includes("auth")) {
        console.warn("Attendance socket auth error:", error.message);
      }
    });
  }

  window.__factoryAttendanceSocket = socket;
  return socket;
};

