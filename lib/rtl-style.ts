import { I18nManager, Platform, type ViewStyle, type TextStyle } from "react-native";

/**
 * مصدر حقيقة واحد لاتجاه RTL عبر المنصات:
 * - على Android/iOS (APK): يعتمد التطبيق الآن على I18nManager.isRTL الذي يفعّل
 *   عبر enableRTL() في app/_layout.tsx؛ React Native يقلب row إلى row-reverse تلقائيًا.
 * - على الويب: I18nManager.isRTL عادة false، لكن مستند HTML يحمل dir="rtl"
 *   فيقلب CSS منطقيًا. لذا يُعامل الويب أيضًا كـ RTL لأغراض التنسيق.
 */
export const isNativeRTL: boolean = I18nManager.isRTL;
export const isWebRTL: boolean =
  Platform.OS === "web" &&
  typeof document !== "undefined" &&
  document.documentElement.dir === "rtl";
export const isRTL: boolean = isNativeRTL || isWebRTL;

/**
 * اتجاه صف عربي يجب أن يبدأ فيه العنصر الأول من اليمين.
 * قبل تفعيل RTL الأصلي: root LTR + row-reverse يدوي.
 * بعد التفعيل: RTL أصلي يقلب row تلقائيًا، لذا يصبح row العادي RTL بصريًا.
 * على الويب (dir=rtl) يُعامل row أيضًا كـ RTL بصريًا، لكن NativeWind/CSS
 * لا يقلب row العادي؛ لذلك على الويب نحتاج row-reverse يدويًا ما لم يكن
 * dir="rtl" مفعّلًا على جذر الحاوية (وهو كذلك في معاينة التطبيق).
 */
export function arabicRow(): ViewStyle["flexDirection"] {
  if (isNativeRTL) return "row";
  return "row-reverse";
}

/** محاذاة نص بداية السطر العربي: يمين. */
export function startAlign(): TextStyle["textAlign"] {
  return "right";
}

/** اتجاه كتابة السطر العربي — يبقى rtl صراحةً لضمان سلوك المخطوط. */
export function rtlText(): TextStyle["writingDirection"] {
  return "rtl";
}
