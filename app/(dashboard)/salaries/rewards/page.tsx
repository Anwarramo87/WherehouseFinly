import { Suspense } from "react";
import RewardsClient from "./RewardsClient";

export default function RewardsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full min-h-[85vh]"><p className="text-[#263544] font-black">جاري التحميل...</p></div>}>
      <RewardsClient />
    </Suspense>
  );
}
