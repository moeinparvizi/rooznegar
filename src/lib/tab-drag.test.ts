import { describe, expect, it } from "vitest";
import { rtlTabPosition } from "./tab-drag";

describe("RTL tab dragging", () => {
  it("maps right-to-left tab centers and clamps outside the bar", () => {
    expect(rtlTabPosition(460, 60, 450, 5)).toBeCloseTo(0.0556, 3);
    expect(rtlTabPosition(285, 60, 450, 5)).toBe(2);
    expect(rtlTabPosition(105, 60, 450, 5)).toBe(4);
    expect(rtlTabPosition(600, 60, 450, 5)).toBe(0);
    expect(rtlTabPosition(0, 60, 450, 5)).toBe(4);
  });
});
