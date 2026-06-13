import dynamic from "next/dynamic";

const Sidebar = dynamic(() => import("@/components/Sidebar"), {
  loading: () => <aside className="hidden w-72 shrink-0 lg:block" aria-hidden="true" />,
});

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-y-auto">{children}</main>
    </div>
  );
}
