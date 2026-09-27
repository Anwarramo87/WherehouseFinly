"use client";
import { ReturnsView } from "@/components/representatives-workspace/sections";
import { useRepWorkspace } from "@/components/representatives-workspace/shell";

export default function ReturnsPage() {
  const { repId } = useRepWorkspace();
  return <ReturnsView repId={repId} />;
}