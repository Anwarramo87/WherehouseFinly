"use client";

import { useEffect } from "react";
import { startSessionRefreshLoop, stopSessionRefreshLoop } from "@/lib/session-refresh";

export default function SessionRefresh() {
  useEffect(() => {
    startSessionRefreshLoop();
    return () => stopSessionRefreshLoop();
  }, []);

  return null;
}
