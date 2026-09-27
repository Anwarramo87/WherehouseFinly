"use client";
import { CollectionsView } from "@/components/representatives-workspace/sections";
import { useRepWorkspace } from "@/components/representatives-workspace/shell";

export default function CollectionsPage() {
  const { repId } = useRepWorkspace();
  return <CollectionsView repId={repId} />;
}