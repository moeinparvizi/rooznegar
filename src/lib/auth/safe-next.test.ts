import { describe, expect, it } from "vitest";
import { safeNext } from "./safe-next";

describe("safeNext", () => {
  it("defaults to today", () => {
    expect(safeNext(null)).toBe("/today/");
    expect(safeNext("")).toBe("/today/");
  });

  it("rejects external and protocol-relative URLs", () => {
    expect(safeNext("https://evil.example")).toBe("/today/");
    expect(safeNext("//evil.example")).toBe("/today/");
    expect(safeNext("javascript:alert(1)")).toBe("/today/");
  });

  it("allows planner routes and nested pages", () => {
    expect(safeNext("/me")).toBe("/me/");
    expect(safeNext("/me/template")).toBe("/me/template/");
    expect(safeNext("/today?x=1")).toBe("/today/");
  });

  it("rejects unknown internal routes", () => {
    expect(safeNext("/auth/")).toBe("/today/");
    expect(safeNext("/admin")).toBe("/today/");
  });
});
