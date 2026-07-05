"use client";
import dynamic from "next/dynamic";

const TransportationClient = dynamic(() => import("./TransportationClient"), { ssr: false, loading: () => null });

export default function TransportationPage() {
  return <TransportationClient />;
}
