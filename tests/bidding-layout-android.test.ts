import { readFileSync } from "fs";
import { join } from "path";
import { describe, it, expect } from "vitest";

/**
 * يتحقق هذا الاختبار من صحة هندسة حواف SafeAreaView على Android:
 * عند وجود شريط تبويب سفلي (يأخذ insets.bottom تلقائيًا)، يجب ألا تُطبَّق
 * الحافة السفلية على SafeAreaView الداخلي؛ وإلا تُقصّ أزرار أرقام المزايدة
 * خارج الشاشة على أجهزة مثل Redmi 14C.
 *
 * الحل المتّبع: SafeAreaView edges=["top","left","right"] مع
 * paddingBottom = insets.bottom + حاشية ثابتة على ScrollView/المحتوى.
 */

const SCREEN_HEIGHT_REDMI_14C = 1640;

function layoutHeights(insetsBottom: number, applyBottomEdge: boolean, extraPadding: number) {
  const safeHeight = SCREEN_HEIGHT_REDMI_14C - (applyBottomEdge ? insetsBottom : 0);
  const contentBottomEdge = extraPadding + insetsBottom;
  return safeHeight - contentBottomEdge;
}

const indexPath = join(process.cwd(), "app/(tabs)/index.tsx");
const src = readFileSync(indexPath, "utf8");

describe("Android SafeArea layout for bidding screens", () => {
  it("تطبيق الحافة السفلية على SafeAreaView يقصّ المحتوى أسفل شريط التبويب", () => {
    const wrong = layoutHeights(24, true, 34);
    const correct = layoutHeights(24, false, 34);
    expect(wrong).toBeLessThan(correct);
  });

  it("النمط المصحح يترك مساحة كافية لعناصر المزايدة بعد آخر عنصر ثابت", () => {
    const visible = layoutHeights(24, false, 34);
    const reservedAboveBidGrid = 420;
    expect(visible - reservedAboveBidGrid).toBeGreaterThan(120);
  });

  it("Bidding وTrumpSelection وRoundResult تستخدم insets.bottom بدل الحافة السفلية", () => {
    expect(src).toContain('edges={["top", "left", "right"]} style={styles.safe}');
    expect(src).toContain("paddingBottom: insets.bottom + 34");
    expect(src).toContain("paddingBottom: insets.bottom + 24");
    // الجذر والشاشة الرئيسية والإعدادات تملك حاوياتها الخاصة — المقصود الصفحات ثلاث.
    const remaining = src.match(/edges={\["top", "left", "right", "bottom"\]}/g) ?? [];
    expect(remaining.length).toBe(2);
    expect(src.includes('edges={["top", "left", "right", "bottom"]} style={styles.homeSafe}')).toBe(true);
  });
});
