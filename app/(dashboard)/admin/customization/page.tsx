"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import {
  Building2,
  Eye,
  LayoutTemplate,
  Palette,
  RefreshCcw,
  Save,
  ShieldAlert,
  Sparkles,
  Upload,
} from "lucide-react";
import apiClient from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { useFactories } from "@/hooks/useSuperAdmin";

type TabKey = "branding" | "theme" | "layout" | "navigation" | "dashboard" | "preview";

type ModuleItem = {
  id: string;
  label: string;
  path: string;
  icon: string;
  visible: boolean;
  order: number;
};

type DashboardWidget = {
  id: string;
  title: string;
  type: string;
  visible: boolean;
  size: "sm" | "md" | "lg";
};

type CustomizationState = {
  status?: string;
  version?: number;
  branding: {
    companyName?: string;
    displayName?: string;
    appName?: string;
    contactEmail?: string;
    phone?: string;
    address?: string;
    welcomeText?: string;
  };
  theme: {
    mode?: string;
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    background?: string;
    surface?: string;
    text?: string;
    border?: string;
    sidebar?: string;
    header?: string;
    borderRadius?: number;
    density?: string;
    typographyScale?: string;
    fontPreset?: string;
    customCss?: string;
  };
  layout: {
    sidebarPosition?: string;
    sidebarStyle?: string;
    headerStyle?: string;
    contentWidth?: string;
    pageSpacing?: string;
    cardLayout?: string;
    tableDensity?: string;
    breadcrumbVisible?: boolean;
    pageHeaderStyle?: string;
  };
  navigation: {
    defaultRoute?: string;
    modules: ModuleItem[];
  };
  dashboard: {
    columns?: number;
    widgets: DashboardWidget[];
  };
  settings?: {
    mode?: string;
    customCss?: string;
  };
};

const defaultCustomization: CustomizationState = {
  status: "draft",
  version: 1,
  branding: {
    companyName: "مصنع الشرق",
    displayName: "Factory ERP",
    appName: "Factory ERP",
    contactEmail: "info@factory.com",
    phone: "+966500000000",
    address: "الرياض، المملكة العربية السعودية",
    welcomeText: "مرحباً بكم في نظام المعمل",
  },
  theme: {
    mode: "light",
    primaryColor: "#1f2937",
    secondaryColor: "#475569",
    accentColor: "#c89355",
    background: "#f8fafc",
    surface: "#ffffff",
    text: "#0f172a",
    border: "#e2e8f0",
    sidebar: "#0f172a",
    header: "#ffffff",
    borderRadius: 16,
    density: "comfortable",
    typographyScale: "medium",
    fontPreset: "system",
    customCss: "",
  },
  layout: {
    sidebarPosition: "right",
    sidebarStyle: "modern",
    headerStyle: "compact",
    contentWidth: "wide",
    pageSpacing: "comfortable",
    cardLayout: "grid",
    tableDensity: "comfortable",
    breadcrumbVisible: true,
    pageHeaderStyle: "standard",
  },
  navigation: {
    defaultRoute: "/dashboard/home",
    modules: [
      { id: "home", label: "الرئيسية", path: "/dashboard/home", icon: "home", visible: true, order: 1 },
      { id: "employees", label: "الموظفين", path: "/dashboard/employees", icon: "users", visible: true, order: 2 },
      { id: "inventory", label: "المخزون", path: "/dashboard/inventory", icon: "box", visible: true, order: 3 },
      { id: "sales", label: "المبيعات", path: "/dashboard/sales", icon: "chart", visible: true, order: 4 },
    ],
  },
  dashboard: {
    columns: 12,
    widgets: [
      { id: "kpi", title: "KPI Overview", type: "kpi", visible: true, size: "lg" },
      { id: "orders", title: "Orders", type: "list", visible: true, size: "md" },
      { id: "revenue", title: "Revenue", type: "chart", visible: true, size: "md" },
    ],
  },
  settings: {
    mode: "light",
    customCss: "",
  },
};

const tabs: Array<{ key: TabKey; label: string; icon: typeof Palette }> = [
  { key: "branding", label: "Branding", icon: Building2 },
  { key: "theme", label: "Theme", icon: Palette },
  { key: "layout", label: "Layout", icon: LayoutTemplate },
  { key: "navigation", label: "Navigation", icon: Sparkles },
  { key: "dashboard", label: "Dashboard", icon: Eye },
  { key: "preview", label: "Preview", icon: Eye },
];

function buildPreviewStyle(draft: CustomizationState): CSSProperties {
  return {
    "--brand-primary": draft.theme.primaryColor ?? "#1f2937",
    "--brand-secondary": draft.theme.secondaryColor ?? "#475569",
    "--brand-accent": draft.theme.accentColor ?? "#c89355",
    "--brand-bg": draft.theme.background ?? "#f8fafc",
    "--brand-surface": draft.theme.surface ?? "#ffffff",
    "--brand-text": draft.theme.text ?? "#0f172a",
    "--brand-border": draft.theme.border ?? "#e2e8f0",
    "--brand-sidebar": draft.theme.sidebar ?? "#0f172a",
    "--brand-header": draft.theme.header ?? "#ffffff",
    "--brand-radius": `${draft.theme.borderRadius ?? 16}px`,
  } as CSSProperties;
}

export default function TenantCustomizationPage() {
  const queryClient = useQueryClient();
  const isSuperAdmin = useAuthStore((state) => state.hasAnyRole(["superadmin"]));
  const { data: factories = [], isLoading: factoriesLoading } = useFactories();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("branding");
  const [draft, setDraft] = useState<CustomizationState>(defaultCustomization);

  useEffect(() => {
    if (!tenantId && factories[0]?.id) {
      setTenantId(factories[0].id);
    }
  }, [factories, tenantId]);

  const customizationQuery = useQuery({
    queryKey: ["super-admin", "customization", tenantId ?? "none"],
    enabled: Boolean(tenantId) && isSuperAdmin,
    queryFn: async () => {
      const res = await apiClient.get(`/customization/tenant/${tenantId}`);
      return (res.data ?? defaultCustomization) as CustomizationState;
    },
  });

  useEffect(() => {
    if (customizationQuery.data) {
      setDraft({
        ...defaultCustomization,
        ...customizationQuery.data,
        branding: {
          ...defaultCustomization.branding,
          ...(customizationQuery.data.branding ?? {}),
        },
        theme: {
          ...defaultCustomization.theme,
          ...(customizationQuery.data.theme ?? {}),
        },
        layout: {
          ...defaultCustomization.layout,
          ...(customizationQuery.data.layout ?? {}),
        },
        navigation: {
          ...defaultCustomization.navigation,
          ...(customizationQuery.data.navigation ?? {}),
          modules: Array.isArray(customizationQuery.data.navigation?.modules)
            ? customizationQuery.data.navigation.modules
            : defaultCustomization.navigation.modules,
        },
        dashboard: {
          ...defaultCustomization.dashboard,
          ...(customizationQuery.data.dashboard ?? {}),
          widgets: Array.isArray(customizationQuery.data.dashboard?.widgets)
            ? customizationQuery.data.dashboard.widgets
            : defaultCustomization.dashboard.widgets,
        },
        settings: {
          ...defaultCustomization.settings,
          ...(customizationQuery.data.settings ?? {}),
        },
      });
    }
  }, [customizationQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error("يرجى اختيار مصنع أولاً");
      const payload = {
        branding: draft.branding,
        theme: draft.theme,
        layout: draft.layout,
        navigation: draft.navigation,
        dashboard: draft.dashboard,
        settings: draft.settings,
        status: "draft",
      };
      const res = await apiClient.patch(`/customization/tenant/${tenantId}`, payload);
      return res.data as CustomizationState;
    },
    onSuccess: (data) => {
      setDraft((prev) => ({ ...prev, ...data }));
      void queryClient.invalidateQueries({ queryKey: ["super-admin", "customization", tenantId ?? "none"] });
      toast.success("تم حفظ التخصيص كمسودة");
    },
    onError: () => toast.error("تعذّر حفظ التخصيص"),
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error("يرجى اختيار مصنع أولاً");
      const res = await apiClient.post(`/customization/tenant/${tenantId}/publish`);
      return res.data as CustomizationState;
    },
    onSuccess: (data) => {
      setDraft((prev) => ({ ...prev, ...data }));
      toast.success("تم نشر التخصيص بنجاح");
    },
    onError: () => toast.error("تعذّر نشر التخصيص"),
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error("يرجى اختيار مصنع أولاً");
      const res = await apiClient.post(`/customization/tenant/${tenantId}/reset`);
      return res.data as CustomizationState;
    },
    onSuccess: (data) => {
      setDraft({ ...defaultCustomization, ...data });
      toast.success("تم إعادة تعيين التخصيص إلى الافتراضي");
    },
    onError: () => toast.error("تعذّر إعادة التعيين"),
  });

  const previewStyle = useMemo(() => buildPreviewStyle(draft), [draft]);

  if (!isSuperAdmin) {
    return (
      <main className="mx-auto max-w-xl p-6" dir="rtl">
        <div className="rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
            <ShieldAlert size={26} />
          </div>
          <h1 className="mb-1 text-lg font-black text-[#263544]">هذه الصفحة للمشرف العام فقط</h1>
          <p className="text-sm text-slate-500">لا تملك صلاحية White Label Studio.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-7xl p-4 sm:p-6 md:p-8" dir="rtl">
      <div className="mb-6 flex flex-col gap-4 rounded-[28px] bg-[#263544] p-5 text-white shadow-lg sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold tracking-[0.2em] text-[#C89355]">TENANT CUSTOMIZATION</p>
          <h1 className="mt-2 text-2xl font-black">White Label Studio</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setDraft((prev) => ({ ...prev, status: "draft" }))}
            className="rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm font-bold text-white"
          >
            Draft
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("preview")}
            className="rounded-xl border border-[#C89355]/40 bg-[#C89355]/10 px-3 py-2 text-sm font-bold text-[#C89355]"
          >
            Preview
          </button>
          <button
            type="button"
            onClick={() => saveMutation.mutate()}
            className="rounded-xl bg-[#C89355] px-4 py-2 text-sm font-black text-[#1a2530]"
          >
            <span className="inline-flex items-center gap-2"><Save size={16} /> حفظ</span>
          </button>
          <button
            type="button"
            onClick={() => publishMutation.mutate()}
            className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-black text-white"
          >
            <span className="inline-flex items-center gap-2"><Upload size={16} /> Publish</span>
          </button>
        </div>
      </div>

      <div className="mb-5 flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <label className="text-sm font-bold text-slate-600">المصنع</label>
          <select
            value={tenantId ?? ""}
            onChange={(e) => setTenantId(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-800 outline-none"
          >
            {factories.map((factory) => (
              <option key={factory.id} value={factory.id}>
                {factory.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => saveMutation.mutate()}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700"
          >
            <span className="inline-flex items-center gap-2"><Save size={15} /> Save</span>
          </button>
          <button
            type="button"
            onClick={() => resetMutation.mutate()}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700"
          >
            <span className="inline-flex items-center gap-2"><RefreshCcw size={15} /> Reset</span>
          </button>
          <button
            type="button"
            onClick={() => setDraft((prev) => ({ ...prev, status: "published" }))}
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700"
          >
            <span className="inline-flex items-center gap-2"><Sparkles size={15} /> Publish</span>
          </button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="rounded-[28px] border border-slate-200 bg-white p-3 shadow-sm">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`mb-2 flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-right text-sm font-bold transition ${
                activeTab === key
                  ? "bg-[#263544] text-[#C89355] shadow-sm"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </aside>

        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          {activeTab === "branding" && (
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="اسم المعمل"><input value={draft.branding.companyName ?? ""} onChange={(e) => setDraft((prev) => ({ ...prev, branding: { ...prev.branding, companyName: e.target.value } }))} className="input" /></Field>
              <Field label="اسم العرض"><input value={draft.branding.displayName ?? ""} onChange={(e) => setDraft((prev) => ({ ...prev, branding: { ...prev.branding, displayName: e.target.value } }))} className="input" /></Field>
              <Field label="App Name"><input value={draft.branding.appName ?? ""} onChange={(e) => setDraft((prev) => ({ ...prev, branding: { ...prev.branding, appName: e.target.value } }))} className="input" /></Field>
              <Field label="البريد الإلكتروني"><input value={draft.branding.contactEmail ?? ""} onChange={(e) => setDraft((prev) => ({ ...prev, branding: { ...prev.branding, contactEmail: e.target.value } }))} className="input" /></Field>
              <Field label="الهاتف"><input value={draft.branding.phone ?? ""} onChange={(e) => setDraft((prev) => ({ ...prev, branding: { ...prev.branding, phone: e.target.value } }))} className="input" /></Field>
              <Field label="العنوان"><input value={draft.branding.address ?? ""} onChange={(e) => setDraft((prev) => ({ ...prev, branding: { ...prev.branding, address: e.target.value } }))} className="input" /></Field>
              <div className="md:col-span-2">
                <Field label="نص الترحيب"><textarea value={draft.branding.welcomeText ?? ""} onChange={(e) => setDraft((prev) => ({ ...prev, branding: { ...prev.branding, welcomeText: e.target.value } }))} className="input min-h-[120px]" /></Field>
              </div>
            </div>
          )}

          {activeTab === "theme" && (
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Primary"><input type="color" value={draft.theme.primaryColor ?? "#1f2937"} onChange={(e) => setDraft((prev) => ({ ...prev, theme: { ...prev.theme, primaryColor: e.target.value } }))} className="h-12 w-full rounded-xl border border-slate-200 bg-white p-1" /></Field>
              <Field label="Secondary"><input type="color" value={draft.theme.secondaryColor ?? "#475569"} onChange={(e) => setDraft((prev) => ({ ...prev, theme: { ...prev.theme, secondaryColor: e.target.value } }))} className="h-12 w-full rounded-xl border border-slate-200 bg-white p-1" /></Field>
              <Field label="Accent"><input type="color" value={draft.theme.accentColor ?? "#c89355"} onChange={(e) => setDraft((prev) => ({ ...prev, theme: { ...prev.theme, accentColor: e.target.value } }))} className="h-12 w-full rounded-xl border border-slate-200 bg-white p-1" /></Field>
              <Field label="Background"><input type="color" value={draft.theme.background ?? "#f8fafc"} onChange={(e) => setDraft((prev) => ({ ...prev, theme: { ...prev.theme, background: e.target.value } }))} className="h-12 w-full rounded-xl border border-slate-200 bg-white p-1" /></Field>
              <Field label="Surface"><input type="color" value={draft.theme.surface ?? "#ffffff"} onChange={(e) => setDraft((prev) => ({ ...prev, theme: { ...prev.theme, surface: e.target.value } }))} className="h-12 w-full rounded-xl border border-slate-200 bg-white p-1" /></Field>
              <Field label="Text"><input type="color" value={draft.theme.text ?? "#0f172a"} onChange={(e) => setDraft((prev) => ({ ...prev, theme: { ...prev.theme, text: e.target.value } }))} className="h-12 w-full rounded-xl border border-slate-200 bg-white p-1" /></Field>
              <Field label="Border Radius"><input type="number" value={draft.theme.borderRadius ?? 16} onChange={(e) => setDraft((prev) => ({ ...prev, theme: { ...prev.theme, borderRadius: Number(e.target.value) || 0 } }))} className="input" /></Field>
              <Field label="Mode">
                <select value={draft.theme.mode ?? "light"} onChange={(e) => setDraft((prev) => ({ ...prev, theme: { ...prev.theme, mode: e.target.value } }))} className="input">
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="auto">Auto</option>
                </select>
              </Field>
              <Field label="Density">
                <select value={draft.theme.density ?? "comfortable"} onChange={(e) => setDraft((prev) => ({ ...prev, theme: { ...prev.theme, density: e.target.value } }))} className="input">
                  <option value="compact">Compact</option>
                  <option value="comfortable">Comfortable</option>
                  <option value="spacious">Spacious</option>
                </select>
              </Field>
              <Field label="Typography">
                <select value={draft.theme.typographyScale ?? "medium"} onChange={(e) => setDraft((prev) => ({ ...prev, theme: { ...prev.theme, typographyScale: e.target.value } }))} className="input">
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                </select>
              </Field>
              <div className="md:col-span-2">
                <Field label="Custom CSS (sanitized)"><textarea value={draft.theme.customCss ?? ""} onChange={(e) => setDraft((prev) => ({ ...prev, theme: { ...prev.theme, customCss: e.target.value } }))} className="input min-h-[150px]" /></Field>
              </div>
            </div>
          )}

          {activeTab === "layout" && (
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Sidebar Position">
                <select value={draft.layout.sidebarPosition ?? "right"} onChange={(e) => setDraft((prev) => ({ ...prev, layout: { ...prev.layout, sidebarPosition: e.target.value } }))} className="input">
                  <option value="right">Right</option>
                  <option value="left">Left</option>
                </select>
              </Field>
              <Field label="Sidebar Style">
                <select value={draft.layout.sidebarStyle ?? "modern"} onChange={(e) => setDraft((prev) => ({ ...prev, layout: { ...prev.layout, sidebarStyle: e.target.value } }))} className="input">
                  <option value="modern">Modern</option>
                  <option value="compact">Compact</option>
                  <option value="minimal">Minimal</option>
                </select>
              </Field>
              <Field label="Header Style">
                <select value={draft.layout.headerStyle ?? "compact"} onChange={(e) => setDraft((prev) => ({ ...prev, layout: { ...prev.layout, headerStyle: e.target.value } }))} className="input">
                  <option value="compact">Compact</option>
                  <option value="standard">Standard</option>
                  <option value="glass">Glass</option>
                </select>
              </Field>
              <Field label="Content Width">
                <select value={draft.layout.contentWidth ?? "wide"} onChange={(e) => setDraft((prev) => ({ ...prev, layout: { ...prev.layout, contentWidth: e.target.value } }))} className="input">
                  <option value="wide">Wide</option>
                  <option value="narrow">Narrow</option>
                  <option value="fluid">Fluid</option>
                </select>
              </Field>
              <Field label="Card Layout">
                <select value={draft.layout.cardLayout ?? "grid"} onChange={(e) => setDraft((prev) => ({ ...prev, layout: { ...prev.layout, cardLayout: e.target.value } }))} className="input">
                  <option value="grid">Grid</option>
                  <option value="list">List</option>
                </select>
              </Field>
              <Field label="Table Density">
                <select value={draft.layout.tableDensity ?? "comfortable"} onChange={(e) => setDraft((prev) => ({ ...prev, layout: { ...prev.layout, tableDensity: e.target.value } }))} className="input">
                  <option value="compact">Compact</option>
                  <option value="comfortable">Comfortable</option>
                  <option value="spacious">Spacious</option>
                </select>
              </Field>
              <Field label="Page Spacing">
                <select value={draft.layout.pageSpacing ?? "comfortable"} onChange={(e) => setDraft((prev) => ({ ...prev, layout: { ...prev.layout, pageSpacing: e.target.value } }))} className="input">
                  <option value="compact">Compact</option>
                  <option value="comfortable">Comfortable</option>
                  <option value="spacious">Spacious</option>
                </select>
              </Field>
              <Field label="Breadcrumbs">
                <select value={String(Boolean(draft.layout.breadcrumbVisible))} onChange={(e) => setDraft((prev) => ({ ...prev, layout: { ...prev.layout, breadcrumbVisible: e.target.value === "true" } }))} className="input">
                  <option value="true">Visible</option>
                  <option value="false">Hidden</option>
                </select>
              </Field>
            </div>
          )}

          {activeTab === "navigation" && (
            <div className="space-y-4">
              <Field label="Default Route">
                <input
                  value={draft.navigation.defaultRoute ?? "/dashboard/home"}
                  onChange={(e) => setDraft((prev) => ({ ...prev, navigation: { ...prev.navigation, defaultRoute: e.target.value } }))}
                  className="input"
                />
              </Field>
              <div className="space-y-3">
                {draft.navigation.modules.map((item, idx) => (
                  <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="font-bold text-slate-700">{item.label}</div>
                      <label className="flex items-center gap-2 text-xs text-slate-500">
                        <input
                          type="checkbox"
                          checked={item.visible}
                          onChange={(e) => setDraft((prev) => ({
                            ...prev,
                            navigation: {
                              ...prev.navigation,
                              modules: prev.navigation.modules.map((module, index) =>
                                index === idx ? { ...module, visible: e.target.checked } : module,
                              ),
                            },
                          }))}
                        />
                        Visible
                      </label>
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                      <input
                        value={item.label}
                        onChange={(e) => setDraft((prev) => ({ ...prev, navigation: { ...prev.navigation, modules: prev.navigation.modules.map((module, index) => index === idx ? { ...module, label: e.target.value } : module) } }))}
                        className="input"
                      />
                      <input
                        value={item.path}
                        onChange={(e) => setDraft((prev) => ({ ...prev, navigation: { ...prev.navigation, modules: prev.navigation.modules.map((module, index) => index === idx ? { ...module, path: e.target.value } : module) } }))}
                        className="input"
                      />
                      <input
                        value={item.order}
                        type="number"
                        onChange={(e) => setDraft((prev) => ({ ...prev, navigation: { ...prev.navigation, modules: prev.navigation.modules.map((module, index) => index === idx ? { ...module, order: Number(e.target.value) || 1 } : module) } }))}
                        className="input"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "dashboard" && (
            <div className="space-y-4">
              <Field label="Columns">
                <input
                  type="number"
                  value={draft.dashboard.columns ?? 12}
                  onChange={(e) => setDraft((prev) => ({ ...prev, dashboard: { ...prev.dashboard, columns: Number(e.target.value) || 12 } }))}
                  className="input"
                />
              </Field>
              <div className="space-y-3">
                {draft.dashboard.widgets.map((widget, idx) => (
                  <div key={widget.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="font-bold text-slate-700">{widget.title}</div>
                      <label className="flex items-center gap-2 text-xs text-slate-500">
                        <input
                          type="checkbox"
                          checked={widget.visible}
                          onChange={(e) => setDraft((prev) => ({
                            ...prev,
                            dashboard: {
                              ...prev.dashboard,
                              widgets: prev.dashboard.widgets.map((item, index) =>
                                index === idx ? { ...item, visible: e.target.checked } : item,
                              ),
                            },
                          }))}
                        />
                        Visible
                      </label>
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                      <input
                        value={widget.title}
                        onChange={(e) => setDraft((prev) => ({ ...prev, dashboard: { ...prev.dashboard, widgets: prev.dashboard.widgets.map((item, index) => index === idx ? { ...item, title: e.target.value } : item) } }))}
                        className="input"
                      />
                      <select
                        value={widget.type}
                        onChange={(e) => setDraft((prev) => ({ ...prev, dashboard: { ...prev.dashboard, widgets: prev.dashboard.widgets.map((item, index) => index === idx ? { ...item, type: e.target.value } : item) } }))}
                        className="input"
                      >
                        <option value="kpi">KPI</option>
                        <option value="chart">Chart</option>
                        <option value="list">List</option>
                      </select>
                      <select
                        value={widget.size}
                        onChange={(e) => setDraft((prev) => ({ ...prev, dashboard: { ...prev.dashboard, widgets: prev.dashboard.widgets.map((item, index) => index === idx ? { ...item, size: e.target.value as "sm" | "md" | "lg" } : item) } }))}
                        className="input"
                      >
                        <option value="sm">Small</option>
                        <option value="md">Medium</option>
                        <option value="lg">Large</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "preview" && (
            <div className="space-y-4">
              <div className="rounded-[28px] border border-slate-200 p-4" style={previewStyle}>
                <div className="rounded-[20px] border border-[var(--brand-border)] bg-[var(--brand-bg)] p-4" dir="rtl">
                  <div className="mb-4 flex items-center justify-between rounded-[16px] bg-[var(--brand-header)] p-3 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--brand-primary)] text-sm font-black text-white">
                        {draft.branding.displayName?.slice(0, 2).toUpperCase() ?? "ER"}
                      </div>
                      <div>
                        <div className="text-sm font-black text-[var(--brand-text)]">{draft.branding.displayName}</div>
                        <div className="text-xs text-slate-500">{draft.branding.companyName}</div>
                      </div>
                    </div>
                    <button className="rounded-xl px-3 py-2 text-xs font-bold text-white" style={{ background: "var(--brand-primary)" }}>
                      Publish
                    </button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
                    <aside className="rounded-[18px] p-3 text-white" style={{ background: "var(--brand-sidebar)" }}>
                      <div className="mb-3 text-xs font-bold opacity-80">Nav</div>
                      <div className="space-y-2">
                        {['الرئيسية', 'الموظفين', 'المخزون', 'المبيعات'].map((item) => (
                          <div key={item} className="rounded-xl bg-white/10 px-3 py-2 text-sm font-bold">
                            {item}
                          </div>
                        ))}
                      </div>
                    </aside>

                    <div className="space-y-4">
                      <div className="rounded-[18px] border border-[var(--brand-border)] bg-[var(--brand-surface)] p-4">
                        <div className="mb-3 text-lg font-black text-[var(--brand-text)]">{draft.branding.welcomeText}</div>
                        <div className="grid gap-3 md:grid-cols-3">
                          {["KPI", "Orders", "Revenue"].map((metric) => (
                            <div key={metric} className="rounded-[14px] border border-[var(--brand-border)] bg-slate-50 p-3">
                              <div className="text-xs text-slate-500">{metric}</div>
                              <div className="mt-2 text-xl font-black text-[var(--brand-text)]">{metric === "KPI" ? "128" : metric === "Orders" ? "46" : "$12.4K"}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-[18px] border border-[var(--brand-border)] bg-[var(--brand-surface)] p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <div className="text-sm font-black text-[var(--brand-text)]">Latest activity</div>
                          <span className="rounded-full px-2 py-1 text-xs font-bold" style={{ background: "color-mix(in srgb, var(--brand-accent) 20%, white)", color: "var(--brand-primary)" }}>
                            Live
                          </span>
                        </div>
                        <div className="space-y-2 text-sm text-slate-600">
                          <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                            <span>New sale</span>
                            <span style={{ color: "var(--brand-primary)" }}>15 min ago</span>
                          </div>
                          <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                            <span>Inventory alert</span>
                            <span style={{ color: "var(--brand-accent)" }}>Needs review</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                Status: <span className="font-black text-slate-800">{draft.status ?? "draft"}</span> · Version: <span className="font-black text-slate-800">{draft.version ?? 1}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {factoriesLoading && (
        <div className="mt-4 text-sm text-slate-500">جارٍ تحميل المصانع...</div>
      )}
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-600">{label}</span>
      {children}
    </label>
  );
}
