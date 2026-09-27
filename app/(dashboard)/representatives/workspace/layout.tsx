"use client";

import RepWorkspaceShell from "@/components/representatives-workspace/shell";

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return <RepWorkspaceShell>{children}</RepWorkspaceShell>;
}