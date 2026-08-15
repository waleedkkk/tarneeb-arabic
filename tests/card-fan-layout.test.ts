import { describe, expect, it } from "vitest";

import { getEqualFanCardPosition } from "../lib/tarneeb/card-fan-layout";

describe("equal card fan layout", () => {
  it("keeps the center card upright and highest", () => {
    const center = getEqualFanCardPosition(3, 7, 340);
    const edge = getEqualFanCardPosition(0, 7, 340);

    expect(center.rotation).toBe(0);
    expect(center.bottom).toBeGreaterThan(edge.bottom);
  });

  it("mirrors both edges of an odd card hand", () => {
    const left = getEqualFanCardPosition(0, 13, 340);
    const right = getEqualFanCardPosition(12, 13, 340);

    expect(left.bottom).toBe(right.bottom);
    expect(left.rotation).toBe(-right.rotation);
    expect(left.zIndex).toBe(right.zIndex);
    expect(left.left + right.left).toBe(276);
  });
});
