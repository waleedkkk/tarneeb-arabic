import { describe, expect, it } from "vitest";

import { getBalancedFanCardPosition, getFanEdgeHitSlop, getResponsiveFanMetrics } from "../lib/tarneeb/card-fan-layout";

describe("balanced card hand layout", () => {
  it("keeps the center card upright at the top of an even arc", () => {
    const center = getBalancedFanCardPosition(3, 7, 340);
    const left = getBalancedFanCardPosition(0, 7, 340);
    const right = getBalancedFanCardPosition(6, 7, 340);

    expect(center.rotation).toBe(0);
    expect(center.bottom).toBeGreaterThan(left.bottom);
    expect(left.bottom).toBe(right.bottom);
  });

  it("mirrors the sides while preserving the overlap order", () => {
    const left = getBalancedFanCardPosition(0, 13, 340);
    const right = getBalancedFanCardPosition(12, 13, 340);

    expect(left.bottom).toBe(right.bottom);
    expect(left.rotation).toBe(-right.rotation);
    expect(right.zIndex).toBeGreaterThan(left.zIndex);
    expect(left.left + right.left).toBe(276);
  });

  it("uses compact cards and remains within a narrow 320px phone viewport", () => {
    const metrics = getResponsiveFanMetrics(320);
    const firstCard = getBalancedFanCardPosition(0, 13, metrics.fanWidth, metrics.cardFootprint, metrics.compact);
    const finalCard = getBalancedFanCardPosition(12, 13, metrics.fanWidth, metrics.cardFootprint, metrics.compact);

    expect(metrics.compact).toBe(true);
    expect(metrics.fanWidth).toBeLessThanOrEqual(320);
    expect(finalCard.left + metrics.cardFootprint).toBeLessThanOrEqual(metrics.fanWidth);
    expect(firstCard.left).toBe(metrics.fanWidth - (finalCard.left + metrics.cardFootprint));
  });

  it("keeps the compact hand balanced on a narrow display", () => {
    const metrics = getResponsiveFanMetrics(300);
    const left = getBalancedFanCardPosition(0, 13, metrics.fanWidth, metrics.cardFootprint, metrics.compact);
    const center = getBalancedFanCardPosition(6, 13, metrics.fanWidth, metrics.cardFootprint, metrics.compact);
    const right = getBalancedFanCardPosition(12, 13, metrics.fanWidth, metrics.cardFootprint, metrics.compact);

    expect(center.bottom).toBeGreaterThan(left.bottom);
    expect(left.bottom).toBe(right.bottom);
    expect(left.rotation).toBe(-right.rotation);
  });

  it("centers a smaller hand while allowing a full hand to use the available fan width", () => {
    const fewFirst = getBalancedFanCardPosition(0, 5, 340);
    const fewLast = getBalancedFanCardPosition(4, 5, 340);
    const fullFirst = getBalancedFanCardPosition(0, 13, 340);
    const fullLast = getBalancedFanCardPosition(12, 13, 340);

    expect(fewFirst.left).toBeGreaterThan(0);
    expect(fewLast.left + 64).toBeLessThan(340);
    expect(fewFirst.left).toBe(340 - (fewLast.left + 64));
    expect(fullFirst.left).toBe(0);
    expect(fullLast.left + 64).toBe(340);
  });

  it("changes the height and rotation of the even arc for each curve preference", () => {
    const gentle = getBalancedFanCardPosition(3, 7, 340, 64, false, "gentle");
    const balanced = getBalancedFanCardPosition(3, 7, 340, 64, false, "balanced");
    const deep = getBalancedFanCardPosition(3, 7, 340, 64, false, "deep");
    const gentleEdge = getBalancedFanCardPosition(0, 7, 340, 64, false, "gentle");
    const deepEdge = getBalancedFanCardPosition(0, 7, 340, 64, false, "deep");

    expect(gentle.bottom).toBeLessThan(balanced.bottom);
    expect(balanced.bottom).toBeLessThan(deep.bottom);
    expect(Math.abs(gentleEdge.rotation)).toBeLessThan(Math.abs(deepEdge.rotation));
  });

  it("expands compact fan edge hit areas only toward the exposed side", () => {
    expect(getFanEdgeHitSlop(0, 13, true)).toMatchObject({ left: 14, right: 4 });
    expect(getFanEdgeHitSlop(12, 13, true)).toMatchObject({ left: 4, right: 14 });
    expect(getFanEdgeHitSlop(6, 13, true)).toBeUndefined();
    expect(getFanEdgeHitSlop(0, 13, false)).toBeUndefined();
  });
});
