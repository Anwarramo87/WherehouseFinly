import { describe, expect, it } from "vitest";
import { resolveSocketUrl } from "@/lib/realtime/attendance-socket";

/**
 * The notification bell never moved during local development because the
 * socket host was hard-coded to the deployed backend. REST calls went to
 * localhost:5003 while the socket listened to production, so every live
 * notification and attendance punch was emitted by a server the developer was
 * not looking at.
 *
 * The rule these pin down is simply: the socket follows the API.
 */
describe("resolveSocketUrl", () => {
  it("follows a local API base", () => {
    expect(
      resolveSocketUrl({ apiUrl: "http://localhost:5003/api/v1" }),
    ).toBe("http://localhost:5003");
  });

  it("follows a deployed API base", () => {
    expect(
      resolveSocketUrl({
        apiUrl: "https://warehousebackend-depolyemnt-production.up.railway.app/api/v1",
      }),
    ).toBe("https://warehousebackend-depolyemnt-production.up.railway.app");
  });

  it("lets an explicit socket URL win", () => {
    expect(
      resolveSocketUrl({
        socketUrl: "https://realtime.example.com",
        apiUrl: "http://localhost:5003/api/v1",
      }),
    ).toBe("https://realtime.example.com");
  });

  it("trims a trailing slash from an explicit socket URL", () => {
    expect(
      resolveSocketUrl({ socketUrl: "https://realtime.example.com/" }),
    ).toBe("https://realtime.example.com");
  });

  it("uses the page origin for a same-origin API base", () => {
    expect(
      resolveSocketUrl({ apiUrl: "/api", origin: "https://factory.example.com" }),
    ).toBe("https://factory.example.com");
  });

  it("ignores a blank socket URL rather than connecting to nowhere", () => {
    expect(
      resolveSocketUrl({ socketUrl: "   ", apiUrl: "http://localhost:5003/api/v1" }),
    ).toBe("http://localhost:5003");
  });

  it("does not point at production when the API is local", () => {
    // The regression itself, stated directly.
    const resolved = resolveSocketUrl({ apiUrl: "http://localhost:5003/api/v1" });
    expect(resolved).not.toContain("railway.app");
  });
});
