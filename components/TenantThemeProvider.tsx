"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";

const fallbackBrand = {
  appName: "Factory ERP",
  displayName: "Factory ERP",
  companyName: "Factory",
  primaryColor: "#1f2937",
  secondaryColor: "#475569",
  accentColor: "#c89355",
  background: "#f8fafc",
  surface: "#ffffff",
  text: "#0f172a",
  border: "#e2e8f0",
  sidebar: "#111827",
  header: "#ffffff",
};

export default function TenantThemeProvider() {
  const tenantId = useAuthStore((state) => state.user?.tenantId ?? null);
  const authStatus = useAuthStore((state) => state.status);
  const isAuthenticated = authStatus === "authenticated";

  const { data } = useQuery({
    queryKey: ["tenant-customization", tenantId ?? "none"],
    enabled: Boolean(tenantId) && isAuthenticated,
    staleTime: 60_000,
    retry: 1,
    retryDelay: 2000,
    queryFn: async () => {
      const response = await apiClient.get("/customization/tenant");
      return (response.data ?? {}) as {
        branding?: Record<string, unknown>;
        theme?: Record<string, unknown>;
      };
    },
  });

  useEffect(() => {
    const branding = ((data?.branding as Record<string, unknown>) ?? {}) as Record<string, unknown>;
    const theme = ((data?.theme as Record<string, unknown>) ?? {}) as Record<string, unknown>;
    const root = document.documentElement;
    root.style.setProperty("--brand-primary", String(theme.primaryColor ?? branding.primaryColor ?? fallbackBrand.primaryColor));
    root.style.setProperty("--brand-secondary", String(theme.secondaryColor ?? branding.secondaryColor ?? fallbackBrand.secondaryColor));
    root.style.setProperty("--brand-accent", String(theme.accentColor ?? branding.accentColor ?? fallbackBrand.accentColor));
    root.style.setProperty("--brand-bg", String(theme.background ?? branding.background ?? fallbackBrand.background));
    root.style.setProperty("--brand-surface", String(theme.surface ?? branding.surface ?? fallbackBrand.surface));
    root.style.setProperty("--brand-text", String(theme.text ?? branding.text ?? fallbackBrand.text));
    root.style.setProperty("--brand-border", String(theme.border ?? branding.border ?? fallbackBrand.border));
    root.style.setProperty("--brand-sidebar", String(theme.sidebar ?? branding.sidebar ?? fallbackBrand.sidebar));
    root.style.setProperty("--brand-header", String(theme.header ?? branding.header ?? fallbackBrand.header));
    root.style.setProperty("--brand-company", String(branding.companyName ?? fallbackBrand.companyName));
    root.style.setProperty("--brand-display", String(branding.displayName ?? branding.appName ?? fallbackBrand.displayName));
    root.style.setProperty("--brand-app", String(branding.appName ?? fallbackBrand.appName));
  }, [data]);

  return null;
}
