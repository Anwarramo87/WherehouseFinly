import { clearAuthSession, getStoredUser, setAuthSession } from "@/lib/auth-session";
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
});

