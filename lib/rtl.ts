import { I18nManager } from "react-native";

/**
 * تفعيل اتجاه RTL على مستوى React Native الأصلي (native bridge).
 *
 * نسخة الويب تأخذ الاتجاه من dir="rtl" في مستند HTML، أما نسخة APK
 * (React Native الحقيقي) فتعتمد على I18nManager. دون تفعيله هنا يظهر
 * التطبيق معكوس الاتجاه في APK على الرغم من سلامة الواجهة في المعاينة.
 *
 * يُنفَّذ هذا الملف فور الاستيراد قبل أي مكوّن، ويُستدعى من app/_layout.tsx.
 *
 * ملاحظة تشغيلية مهمة: forceRTL يكتب علمًا على مستوى native (SharedPreferences
 * في Android) يُقرأ مرة واحدة عند إنشاء Activity، لذا Fast Refresh لا يكفي
 * ويجب عمل إعادة تشغيل كامل للتطبيق (قفل وفتح).
 */
export function enableRTL(): boolean {
  if (I18nManager.isRTL) {
    return false; // مفعّل فعلًا — لا حاجة لإعادة تحميل
  }
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
  return true; // يحتاج إعادة تحميل ليقع التفعيل موضع التنفيذ
}
