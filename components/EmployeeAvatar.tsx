"use client";

import { useState } from "react";
import Link from "next/link";
import { User } from "lucide-react";

type EmployeeAvatarProps = {
  src?: string | null;
  name?: string;
  gender?: string | null;
  employeeId?: string;
  size?: number;
  className?: string;
  /** عندما تُمرَّر تُغلَّف الصورة برابط لبروفايل الموظف */
  href?: string;
};

const isFemale = (gender?: string | null) => {
  const g = String(gender || "").trim().toLowerCase();
  return g === "female" || g === "f" || g === "أنثى" || g === "انثى";
};

const isMale = (gender?: string | null) => {
  const g = String(gender || "").trim().toLowerCase();
  return g === "male" || g === "m" || g === "ذكر";
};

function AvatarContent({
  src,
  name,
  gender,
  size = 40,
  className,
}: Omit<EmployeeAvatarProps, "href" | "employeeId">) {
  const [imgFailed, setImgFailed] = useState(false);

  const female = isFemale(gender);
  const male = isMale(gender);
  const bubbleClass = female
    ? "bg-rose-100 text-rose-500 border-rose-200"
    : male
      ? "bg-slate-200 text-[#263544] border-slate-300"
      : "bg-slate-100 text-[#263544]/60 border-slate-200";

  const fallback = (
    <div
      className={`rounded-full flex items-center justify-center border-2 shrink-0 shadow-sm select-none ${bubbleClass} ${className}`}
      style={{ width: size, height: size }}
      title={name || (female ? "أنثى" : male ? "ذكر" : "بدون صورة")}
      aria-label={name || "صورة الموظف"}
    >
      <User size={size * 0.5} strokeWidth={2} />
    </div>
  );

  if (src && !imgFailed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name || "صورة الموظف"}
        width={size}
        height={size}
        className={`rounded-full object-cover border-2 border-white/70 shadow-sm shrink-0 ${className}`}
        style={{ width: size, height: size }}
        onError={() => setImgFailed(true)}
      />
    );
  }

  return fallback;
}

export default function EmployeeAvatar(props: EmployeeAvatarProps) {
  const { href } = props;

  if (href) {
    return (
      <Link
        href={href}
        className="inline-flex shrink-0 transition-transform duration-300 hover:scale-110"
        title={props.name || "عرض بروفايل الموظف"}
      >
        <AvatarContent {...props} />
      </Link>
    );
  }

  return <AvatarContent {...props} />;
}
