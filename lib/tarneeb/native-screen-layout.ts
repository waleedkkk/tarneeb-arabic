import type { Edge } from "react-native-safe-area-context";

/**
 * صفحات التبويب ذات المحتوى القابل للتمرير لا تطبّق الحافة السفلية مرتين:
 * شريط التبويب يحجز مساحة النظام، بينما ScrollView يضيف فقط inset.bottom
 * إلى الحاشية البصرية المقصودة للمحتوى.
 */
export const TAB_SCREEN_SAFE_EDGES: Edge[] = ["top", "left", "right"];

export function getTabScreenBottomPadding(insetBottom: number, contentPadding: number) {
  return Math.max(0, insetBottom) + contentPadding;
}
