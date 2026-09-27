"use client";
import { SalesView } from "@/components/representatives-workspace/sections";
import { useRepWorkspace } from "@/components/representatives-workspace/shell";

export default function SalesPage() {
  const { repId } = useRepWorkspace();
  return <SalesView repId={repId} />;
}