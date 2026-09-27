"use client";
import { SettlementView } from "@/components/representatives-workspace/sections";
import { useRepWorkspace } from "@/components/representatives-workspace/shell";

export default function SettlementPage() {
  const { repId } = useRepWorkspace();
  return <SettlementView repId={repId} />;
}