"use client";
import { RouteView } from "@/components/representatives-workspace/sections";
import { useRepWorkspace } from "@/components/representatives-workspace/shell";

export default function RoutePage() {
  const { repId } = useRepWorkspace();
  return <RouteView repId={repId} />;
}