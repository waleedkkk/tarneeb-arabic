import { readFileSync } from "fs";
import { join } from "path";
import { describe, it, expect } from "vitest";
import { getTabScreenBottomPadding, TAB_SCREEN_SAFE_EDGES } from "../lib/tarneeb/native-screen-layout";

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
const settingsPath = join(process.cwd(), "app/(tabs)/settings.tsx");
const settingsSrc = readFileSync(settingsPath, "utf8");

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

  it("شاشات التبويب تستخدم عقد الحافة المشترك بدلاً من الحافة السفلية", () => {
    expect(TAB_SCREEN_SAFE_EDGES).toEqual(["top", "left", "right"]);
    expect(src).toContain("edges={TAB_SCREEN_SAFE_EDGES} style={styles.safe}");
    expect(src).toContain("getTabScreenBottomPadding(insets.bottom, 34)");
    expect(src).toContain("getTabScreenBottomPadding(insets.bottom, 24)");
    expect(settingsSrc).toContain("edges={TAB_SCREEN_SAFE_EDGES}");
    expect(settingsSrc).toContain("getTabScreenBottomPadding(insets.bottom, 40)");
    // تبقى الحافة السفلية للطاولة والشاشة الرئيسية فقط، لأنهما لا يمران تحت شريط التبويب.
    const remaining = src.match(/edges={\["top", "left", "right", "bottom"\]}/g) ?? [];
    expect(remaining.length).toBe(2);
    expect(src.includes('edges={["top", "left", "right", "bottom"]} style={styles.homeSafe}')).toBe(true);
  });

  it.each([0, 24, 36])("تحافظ الحاشية السفلية على المسافة المقصودة على inset=%i", (insetBottom) => {
    expect(getTabScreenBottomPadding(insetBottom, 34)).toBe(insetBottom + 34);
    expect(getTabScreenBottomPadding(insetBottom, 24)).toBe(insetBottom + 24);
    expect(getTabScreenBottomPadding(insetBottom, 40)).toBe(insetBottom + 40);
  });

  it("تربط المزايدة واختيار الطرنيب والنتيجة بارتفاع الحاوية الأصلي وتسمح للمحتوى بالتمدد", () => {
    expect(src).toContain('<ScrollView style={styles.formScroll} contentContainerStyle={[styles.scrollContent, { paddingBottom: getTabScreenBottomPadding(insets.bottom, 34) }]}>');
    expect(src).toContain('<ScrollView style={styles.formScroll} contentContainerStyle={[styles.trumpContent, { paddingBottom: getTabScreenBottomPadding(insets.bottom, 24) }]}>');
    expect(src).toContain('<ScrollView style={styles.formScroll} contentContainerStyle={[styles.resultContent, { paddingBottom: getTabScreenBottomPadding(insets.bottom, 24) }]}>');
    expect(src).toContain('formScroll: { flex: 1 }');
    expect(src).toContain('scrollContent: { flexGrow: 1, padding: 20, paddingBottom: 34 }');
    expect(src).toContain('resultContent: { flexGrow: 1, alignItems: "center", justifyContent: "center", padding: 24 }');
  });
});
