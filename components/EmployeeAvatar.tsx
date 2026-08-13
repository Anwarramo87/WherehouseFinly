"use client";

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

function ManIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="10" cy="10" r="6" />
      <path d="M14.5 6.5L20 1" />
      <path d="M16 1h4v4" />
    </svg>
  );
}

function WomanIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="9" r="6" />
      <path d="M12 15v7" />
      <path d="M9 19h6" />
    </svg>
  );
}

function AvatarContent({
  src,
  name,
  gender,
  size = 40,
  className,
}: Omit<EmployeeAvatarProps, "href" | "employeeId">) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name || "صورة الموظف"}
        width={size}
        height={size}
        className={`rounded-full object-cover border-2 border-white/70 shadow-sm shrink-0 ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  const female = isFemale(gender);
  const male = isMale(gender);
  const bubbleClass = female
    ? "bg-rose-100 text-rose-500 border-rose-200"
    : male
      ? "bg-slate-200 text-[#263544] border-slate-300"
      : "bg-slate-100 text-[#263544]/60 border-slate-200";

  return (
    <div
      className={`rounded-full flex items-center justify-center border-2 shrink-0 shadow-sm select-none ${bubbleClass} ${className}`}
      style={{ width: size, height: size }}
      title={name || (female ? "أنثى" : male ? "ذكر" : "بدون صورة")}
      aria-label={name || "صورة الموظف"}
    >
      {female ? (
        <WomanIcon size={size * 0.5} />
      ) : male ? (
        <ManIcon size={size * 0.5} />
      ) : (
        <User size={size * 0.5} strokeWidth={2.5} />
      )}
    </div>
  );
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
