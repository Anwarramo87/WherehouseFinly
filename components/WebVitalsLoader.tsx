"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";

const WebVitalsReporter = dynamic(() => import("@/components/WebVitalsReporter"), {
  ssr: false,
});

export default function WebVitalsLoader() {
  return useMemo(() => (process.env.NODE_ENV === "production" ? <WebVitalsReporter /> : null), []);
}
