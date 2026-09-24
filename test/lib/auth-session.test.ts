import { clearAuthSession, getStoredUser, setAuthSession } from "@/lib/auth-session";
import { PERSISTED_QUERY_CACHE_KEY } from "@/lib/query-cache";
import { useAuthStore } from "@/stores/auth-store";
import { getActiveFactoryId, useFactoryScopeStore } from "@/stores/factory-scope-store";
import { describe, expect, it } from "vitest";

describe("auth-session", () => {
  it("stores and reads user profile only", () => {
    const user = { id: 1, name: "Admin" };
    setAuthSession(user);
    expect(getStoredUser<typeof user>()).toEqual(user);
  });

  it("clears stored user profile", () => {
    setAuthSession({ name: "Temp" });
    clearAuthSession();
    expect(getStoredUser<{ name: string }>()).toBeNull();
  });

  it("removes stored profile when setAuthSession receives null", () => {
    setAuthSession({ name: "Temp" });
    setAuthSession(null);
    expect(getStoredUser<{ name: string }>()).toBeNull();
  });

  // The persisted query cache holds employee records, salaries and stock. It
  // lives in localStorage, so clearing sessionStorage never touched it, and it
  // was rehydrated for whoever signed in next on the same browser.
  it("drops the persisted query cache so the next user cannot read it", () => {
    localStorage.setItem(
      PERSISTED_QUERY_CACHE_KEY,
      JSON.stringify({ clientState: { queries: [{ queryKey: ["employees"] }] } }),
    );

    clearAuthSession();

    expect(localStorage.getItem(PERSISTED_QUERY_CACHE_KEY)).toBeNull();
  });

  it("clears a stale factory scope when auth ends", () => {
    useFactoryScopeStore.getState().enter("tenant-123", "Factory A");
    expect(getActiveFactoryId()).toBe("tenant-123");

    useAuthStore.getState().clear();

    expect(getActiveFactoryId()).toBeNull();
  });
});

