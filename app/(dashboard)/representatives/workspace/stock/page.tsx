"use client";
import { StockView } from "@/components/representatives-workspace/sections";
import { useRepWorkspace } from "@/components/representatives-workspace/shell";

export default function StockPage() {
  const { repId } = useRepWorkspace();
  return <StockView repId={repId} />;
}