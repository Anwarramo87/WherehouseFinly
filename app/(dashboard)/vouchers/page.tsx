import { Suspense } from "react";
import VouchersClient from "./VouchersClient";

export default function VouchersPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-[#263544]/60 font-black">جارٍ التحميل...</div>}>
      <VouchersClient />
    </Suspense>
  );
}
