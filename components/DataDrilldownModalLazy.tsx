"use client";

/**
 * Lazy wrapper for DataDrilldownModal that preserves generic type parameters.
 * Dynamic imports lose generics, so we wrap here and cast at usage site.
 */
import dynamic from "next/dynamic";
import type { DataDrilldownModalProps } from "@/components/DataDrilldownModal";

const Lazy = dynamic(
  () => import("@/components/DataDrilldownModal").then((m) => ({ default: m.DataDrilldownModal })),
  { ssr: false },
);

export function DataDrilldownModalLazy<T>(props: DataDrilldownModalProps<T>) {
  // Cast through unknown to satisfy dynamic import's non-generic default export
  const Component = Lazy as React.ComponentType<DataDrilldownModalProps<T>>;
  return <Component {...props} />;
}
