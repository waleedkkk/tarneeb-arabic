import { describe, expect, it } from "vitest";
import { ANDROID_TEST_VIEWPORTS, getNativeTableLayout, NATIVE_LAYOUT_DIRECTION } from "../lib/tarneeb/native-ui-layout";

describe("native Android table layout", () => {
  it.each(Object.entries(ANDROID_TEST_VIEWPORTS))("keeps the playable table and hand inside the safe frame on %s", (_, viewport) => {
    const layout = getNativeTableLayout(viewport);

    expect(layout.contentHeight).toBe(viewport.height - viewport.insets.top - viewport.insets.bottom);
    expect(layout.tableMaxHeight + layout.reservedHeight).toBeLessThanOrEqual(layout.contentHeight);
    expect(layout.tableMaxHeight).toBeGreaterThanOrEqual(layout.tableMinHeight);
    expect(layout.topSafeFallback).toBe(0);
    expect(layout.handAreaHeight).toBeGreaterThan(120);
    expect(layout.horizontalPadding).toBeGreaterThanOrEqual(12);
  });

  it("reserves a visual top guard when the host does not expose safe-area insets", () => {
    const layout = getNativeTableLayout({ width: 390, height: 844, insets: { top: 0, bottom: 0, left: 0, right: 0 } });

    expect(layout.topSafeFallback).toBe(48);
    expect(layout.playableContentHeight).toBe(layout.contentHeight - layout.topSafeFallback);
    expect(layout.tableMaxHeight + layout.reservedHeight).toBeLessThanOrEqual(layout.playableContentHeight);
  });

  it("uses the measured tab-screen frame on Redmi 14C instead of subtracting system insets twice", () => {
    const viewport = ANDROID_TEST_VIEWPORTS.redmi14cGameFrame;
    const layout = getNativeTableLayout(viewport);

    expect(layout.contentHeight).toBe(viewport.height);
    expect(layout.topSafeFallback).toBe(0);
    expect(layout.compact).toBe(true);
    expect(layout.tableMaxHeight + layout.reservedHeight).toBeLessThanOrEqual(viewport.height);
    expect(layout.handAreaHeight).toBe(124);
  });

  it("uses controlled LTR geometry with explicit RTL rows, preventing native double mirroring", () => {
    const layout = getNativeTableLayout(ANDROID_TEST_VIEWPORTS.standard);

    expect(layout.direction).toEqual(NATIVE_LAYOUT_DIRECTION);
    expect(layout.direction.root).toBe("ltr");
    expect(layout.direction.arabicRow).toBe("row-reverse");
    expect(layout.direction.leftSeat).toBe("left");
    expect(layout.direction.rightSeat).toBe("right");
  });
});
