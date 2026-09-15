import { describe, expect, it } from "vitest";
import { resolveEmployeePhotoSrc } from "@/lib/employee-photo";

/*
 * The employees list used to carry `photo` — a ~41 KB base64 data URL per row,
 * ~8 MB per page at the backend's 200-row cap, paid on every dashboard load
 * whether or not an avatar was ever rendered. List rows now carry `photoUrl`
 * instead, and this resolver is what keeps both shapes rendering.
 */
describe("resolveEmployeePhotoSrc", () => {
  it("prefers an inlined data URL, which costs no extra request", () => {
    const src = resolveEmployeePhotoSrc({
      photo: "data:image/jpeg;base64,AAAA",
      photoUrl: "/employees/EMP1/photo",
    });

    expect(src).toBe("data:image/jpeg;base64,AAAA");
  });

  it("prefixes a list row's photoUrl with the proxy mount", () => {
    // The browser never reaches the backend directly; everything goes via /api.
    expect(resolveEmployeePhotoSrc({ photoUrl: "/employees/EMP1/photo" })).toBe(
      "/api/employees/EMP1/photo",
    );
  });

  it("falls back to a legacy avatar field", () => {
    expect(resolveEmployeePhotoSrc({ avatar: "https://cdn/x.png" })).toBe(
      "https://cdn/x.png",
    );
  });

  it("returns undefined when there is no photo, so the placeholder shows", () => {
    expect(resolveEmployeePhotoSrc({})).toBeUndefined();
    expect(resolveEmployeePhotoSrc({ photo: null, photoUrl: null })).toBeUndefined();
  });

  it("tolerates a missing employee", () => {
    expect(resolveEmployeePhotoSrc(null)).toBeUndefined();
    expect(resolveEmployeePhotoSrc(undefined)).toBeUndefined();
  });

  it("does not treat an empty string as a usable source", () => {
    expect(resolveEmployeePhotoSrc({ photo: "", photoUrl: "" })).toBeUndefined();
  });
});
