import { describe, expect, it } from "vitest";
import { storageKeyFor } from "./storage";

describe("storageKeyFor", () => {
  it("namespaces data per user", () => {
    expect(storageKeyFor("rooznegar-v2", "user-1")).toBe("rooznegar-v2:user-1");
  });

  it("keeps an unscoped key before login", () => {
    expect(storageKeyFor("rooznegar-v2", null)).toBe("rooznegar-v2");
  });
});
