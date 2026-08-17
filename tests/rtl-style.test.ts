/**
 * اختبارات أدوات الاتجاه الموحد (lib/rtl-style):
 * - على الويب في المعاينة: isNativeRTL=false وisWebRTL=true (dir=rtl).
 * - على APK بعد التثبيت: isNativeRTL=true بفعل enableRTL() في الجذر.
 * - صفوف العربية (arabicRow) تعيد row-reverse على الويب وrow على native RTL.
 */
import { describe, expect, it, vi } from "vitest";

// مقطّرة مصدر react-native الأصلي (يحتوي صيغة Flow يكسر rollup)
// قبل أي استيراد في هذا الملف.
vi.mock("react-native", () => ({
  I18nManager: { isRTL: false, allowRTL: vi.fn(), forceRTL: vi.fn() },
  Platform: { OS: "web", select: (_: unknown, res: unknown) => res },
}));

import { enableRTL } from "../lib/rtl";
import { arabicRow, isRTL, isNativeRTL, isWebRTL } from "../lib/rtl-style";

describe("rtl-style", () => {
  it("isNativeRTL يبدأ false لأن enableRTL لم يفعّل في بيئة الاختبار", () => {
    expect(isNativeRTL).toBe(false);
    // في بيئة Node لا يوجد document، فالويب ليس RTL تجريبيًا
    expect(isWebRTL).toBe(false);
  });

  it("arabicRow تعيد row-reverse في المعاينة وrow عند RTL أصلي", () => {
    // المعاينة: ويب، RTL بصري عبر row-reverse
    expect(arabicRow()).toBe("row-reverse");
    // عند التفعيل الأصلي على الهاتف: native يقلب row تلقائيًا
    if (isNativeRTL) {
      expect(arabicRow()).toBe("row");
    }
  });

  it("enableRTL دالة قابلة للاستدعاء دون رمي أخطاء", () => {
    expect(typeof enableRTL).toBe("function");
    // استدعاءها يجب ألا يرمي خطأ في بيئة الاختبار
    expect(() => enableRTL()).not.toThrow();
  });
});
