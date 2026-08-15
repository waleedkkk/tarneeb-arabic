import { describe, expect, it } from "vitest";
import { ANDROID_TEST_VIEWPORTS, getNativeTableLayout, NATIVE_LAYOUT_DIRECTION } from "../lib/tarneeb/native-ui-layout";

describe("native Android table layout", () => {
  it.each(Object.entries(ANDROID_TEST_VIEWPORTS))("keeps the playable table and hand inside the safe frame on %s", (_, viewport) => {
    const layout = getNativeTableLayout(viewport);

    expect(layout.contentHeight).toBe(viewport.height - viewport.insets.top - viewport.insets.bottom);
    expect(layout.tableMaxHeight + layout.reservedHeight).toBeLessThanOrEqual(layout.contentHeight);
    expect(layout.tableMaxHeight).toBeGreaterThanOrEqual(layout.tableMinHeight);
    expect(layout.handAreaHeight).toBeGreaterThan(120);
    expect(layout.horizontalPadding).toBeGreaterThanOrEqual(12);
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
