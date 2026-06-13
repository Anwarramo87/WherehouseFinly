import dynamic from "next/dynamic";

const Sidebar = dynamic(() => import("@/components/Sidebar"), {
  loading: () => <aside className="hidden w-72 shrink-0 lg:block" aria-hidden="true" />,
});

export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const toggleCollapse = useCallback(() => setIsCollapsed((v) => !v), []);
  const openMobile = useCallback(() => setIsMobileOpen(true), []);
  const closeMobile = useCallback(() => setIsMobileOpen(false), []);

  return (
    <div className="flex min-h-screen h-screen overflow-hidden" dir="rtl">
      {/* ── Desktop Sidebar ── */}
      <div
        className={`hidden lg:block shrink-0 h-screen transition-all duration-300 ${
          isCollapsed ? "w-20" : "w-72"
        }`}
      >
        <Sidebar
          isCollapsed={isCollapsed}
          toggleCollapse={toggleCollapse}
        />
      </div>

      {/* ── Mobile overlay ── */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={closeMobile}
          aria-hidden="true"
        />
      )}

      {/* ── Mobile Sidebar ── */}
      <div
        className={`lg:hidden fixed top-0 right-0 h-full w-72 z-50 transition-transform duration-300 ${
          isMobileOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <Sidebar onClose={closeMobile} />
      </div>

      {/* ── Main content ── */}
      <main className="flex-1 min-w-0 overflow-y-auto relative">
        {/* Mobile menu button */}
        <button
          onClick={openMobile}
          className="lg:hidden fixed top-4 right-4 z-30 p-2.5 bg-[#1a2530] text-[#C89355] rounded-xl border border-[#C89355]/30 shadow-lg transition-colors hover:bg-[#263544]"
          aria-label="فتح القائمة"
        >
          <Menu size={22} />
        </button>

        {children}
      </main>
    </div>
  );
}
