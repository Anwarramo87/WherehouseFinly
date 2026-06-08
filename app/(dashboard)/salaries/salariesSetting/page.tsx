import { Suspense } from "react";
import SalariesSettingClient from "./SalariesSettingClient";

export default function SalariesSettingPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-[#263544]/60 font-black">جارٍ التحميل...</div>}>
      <SalariesSettingClient />
    </Suspense>
  );
}
