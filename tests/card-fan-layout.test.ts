import { describe, expect, it } from "vitest";

import { getFanEdgeHitSlop, getResponsiveFanMetrics, getRtlSlopeFanCardPosition } from "../lib/tarneeb/card-fan-layout";

describe("RTL sloped card hand layout", () => {
  it("keeps the center card upright within the curved descending hand", () => {
    const center = getRtlSlopeFanCardPosition(3, 7, 340);
    const left = getRtlSlopeFanCardPosition(0, 7, 340);
    const right = getRtlSlopeFanCardPosition(6, 7, 340);

    expect(center.rotation).toBe(0);
    expect(center.bottom).toBeGreaterThan(left.bottom);
    expect(right.bottom).toBeGreaterThan(center.bottom);
  });

  it("lifts the middle of the hand above the straight RTL slope", () => {
    const left = getRtlSlopeFanCardPosition(0, 7, 340);
    const middle = getRtlSlopeFanCardPosition(3, 7, 340);
    const right = getRtlSlopeFanCardPosition(6, 7, 340);
    const straightMidpoint = (left.bottom + right.bottom) / 2;

    expect(middle.bottom).toBeGreaterThan(straightMidpoint);
  });

  it("raises and layers the physical right side above the left side", () => {
    const left = getRtlSlopeFanCardPosition(0, 13, 340);
    const right = getRtlSlopeFanCardPosition(12, 13, 340);

    expect(right.bottom).toBeGreaterThan(left.bottom);
    expect(left.rotation).toBe(-right.rotation);
    expect(right.zIndex).toBeGreaterThan(left.zIndex);
    expect(left.left + right.left).toBe(276);
  });

  it("uses compact cards and remains within a narrow 320px phone viewport", () => {
    const metrics = getResponsiveFanMetrics(320);
    const finalCard = getRtlSlopeFanCardPosition(12, 13, metrics.fanWidth, metrics.cardFootprint, metrics.compact);

    expect(metrics.compact).toBe(true);
    expect(metrics.fanWidth).toBeLessThanOrEqual(320);
    expect(finalCard.left + metrics.cardFootprint).toBe(metrics.fanWidth);
  });

  it("keeps the compact hand sloped toward the physical right on a narrow display", () => {
    const metrics = getResponsiveFanMetrics(300);
    const left = getRtlSlopeFanCardPosition(0, 13, metrics.fanWidth, metrics.cardFootprint, metrics.compact);
    const right = getRtlSlopeFanCardPosition(12, 13, metrics.fanWidth, metrics.cardFootprint, metrics.compact);

    expect(right.bottom).toBeGreaterThan(left.bottom);
    expect(left.rotation).toBe(-right.rotation);
  });

  it("expands compact fan edge hit areas only toward the exposed side", () => {
    expect(getFanEdgeHitSlop(0, 13, true)).toMatchObject({ left: 14, right: 4 });
    expect(getFanEdgeHitSlop(12, 13, true)).toMatchObject({ left: 4, right: 14 });
    expect(getFanEdgeHitSlop(6, 13, true)).toBeUndefined();
    expect(getFanEdgeHitSlop(0, 13, false)).toBeUndefined();
  });
});
