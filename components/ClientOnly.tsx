"use client";

import { useState, useEffect, ReactNode } from "react";

export default function ClientOnly({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true); }, []);
  return mounted ? <>{children}</> : <>{fallback}</>;
}
