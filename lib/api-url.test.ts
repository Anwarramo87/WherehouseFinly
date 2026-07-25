import { describe, expect, it } from "vitest";
import { normalizeApiUrl } from "@/lib/api-url";

describe("api-url", () => {
  it("adds /api/v1 when missing", () => {
    expect(normalizeApiUrl("http://127.0.0.1:5001", "http://127.0.0.1:5001/api/v1")).toBe(
      "http://127.0.0.1:5001/api/v1",
    );
  });

  it("keeps /api path when already provided", () => {
    expect(
      normalizeApiUrl(
        "https://werehouse-production-4cba.up.railway.app/api/v1",
        "http://127.0.0.1:5001/api/v1",
      ),
    ).toBe("https://werehouse-production-4cba.up.railway.app/api/v1");
  });

  it("supports relative api URLs", () => {
    expect(normalizeApiUrl("/api", "http://127.0.0.1:5001/api")).toBe("/api");
  });
});
