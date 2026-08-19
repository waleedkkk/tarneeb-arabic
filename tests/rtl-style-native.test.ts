import { beforeEach, describe, expect, it, vi } from "vitest";

describe("RTL الأصلي بعد إعادة تشغيل Android", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("تعيد arabicRow قيمة row عندما يكون I18nManager.isRTL مفعّلًا", async () => {
    vi.doMock("react-native", () => ({
      I18nManager: { isRTL: true, allowRTL: vi.fn(), forceRTL: vi.fn() },
      Platform: { OS: "android", select: (options: { android?: unknown; default?: unknown }) => options.android ?? options.default },
    }));
    const { arabicRow, isNativeRTL, isRTL } = await import("../lib/rtl-style");
    expect(isNativeRTL).toBe(true);
    expect(isRTL).toBe(true);
    expect(arabicRow()).toBe("row");
  });

  it("لا يعيد طلب RTL عند تفعيله سابقًا", async () => {
    const allowRTL = vi.fn();
    const forceRTL = vi.fn();
    vi.doMock("react-native", () => ({
      I18nManager: { isRTL: true, allowRTL, forceRTL },
      Platform: { OS: "android", select: (options: { android?: unknown; default?: unknown }) => options.android ?? options.default },
    }));
    const { enableRTL } = await import("../lib/rtl");
    expect(enableRTL()).toBe(false);
    expect(allowRTL).not.toHaveBeenCalled();
    expect(forceRTL).not.toHaveBeenCalled();
  });

  it("يطلب forceRTL(true) عندما لا يكون RTL مفعّلًا", async () => {
    const forceRTL = vi.fn();
    const allowRTL = vi.fn();
    vi.doMock("react-native", () => ({
      I18nManager: { isRTL: false, allowRTL, forceRTL },
      Platform: { OS: "android", select: (options: { android?: unknown; default?: unknown }) => options.android ?? options.default },
    }));
    const { enableRTL } = await import("../lib/rtl");
    expect(enableRTL()).toBe(true);
    expect(allowRTL).toHaveBeenCalledWith(true);
    expect(forceRTL).toHaveBeenCalledWith(true);
  });
});
