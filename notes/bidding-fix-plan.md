# خطة إصلاح اختفاء أزرار أرقام المزايدة — حقائق مؤكدة من الفحص

## التشخيص المؤكد
أزرار الأرقام تُولّد برمجيًا (StyleSheet فقط — فرضية Tailwind purge مرفوضة نهائيًا).
على Android: `SafeAreaView edges={["top","left","right","bottom"]}` يضيف حافة bottom فوق شريط التبويب (التبويب خارج SafeAreaView)، فيُقصّ bidGrid وزر مرّر أسفل الشاشة.

## الحقائق المؤكدة (سطور app/(tabs)/index.tsx)
- السطر 3: من react-native-safe-area-context مستورد SafeAreaView بالفعل، وuseSafeAreaInsets غير مستورد → إضافة `useSafeAreaInsets` إلى السطر 3.
- ConnectionLostScreen (سطر 84): `SafeAreaView edges={["top","left","right","bottom"]} style={styles.safe}` → edges={["top","left","right","bottom"]} يبقى لكن centerPage لا تحتاج inset لأن المحتوى قصير — سنجعله edges={["top","left","right"]} مع centerPage padding bottom inset.
- Bidding (سطر 141): SafeAreaView edges={["top","left","right","bottom"]} style={styles.safe}، ScrollView styles.scrollContent → edges={["top","left","right"]} + paddingBottom = insets.bottom + 34.
- TrumpSelection (سطر 174): نفس SafeAreaView + ScrollView styles.trumpContent → نفس التغيير + paddingBottom insets.bottom + 24.
- RoundResult: edges={["top","left","right","bottom"]} style={styles.safe} + View styles.centerPage (سطر 210) → edges={["top","left","right"]} + centerPage paddingBottom insets.bottom + 24 inline (يُضاف إلى padding 24 الموجود).
- Home (سطر 63): homeSafe edges={["top","left","right","bottom"]} — نتركها (الشاشة الرئيسية سليمة ولا تبويب تحتها أثناء اللعب).
- centerPage: { flex: 1, alignItems center, justifyContent center, padding 24 }

## التنفيذ المحدد
1. السطر 3: إضافة useSafeAreaInsets.
2. Bidding: `const insets = useSafeAreaInsets();` في أول الدالة (قبل return). SafeAreaView edges → ["top","left","right"]. ScrollView contentContainerStyle → `[styles.scrollContent, { paddingBottom: insets.bottom + 34 }]`.
3. TrumpSelection: نفس الشيء لكن paddingBottom: insets.bottom + 24.
4. RoundResult: `const insets = useSafeAreaInsets();` edges → ["top","left","right"]. View centerPage style → `[styles.centerPage, { paddingBottom: insets.bottom + 24 }]`.
5. ConnectionLostScreen: `const insets = useSafeAreaInsets();` edges → ["top","left","right"]. View centerPage → `[styles.centerPage, { paddingBottom: insets.bottom + 24 }]`.
6. الأنماط: لا تغيير مطلوب في styles (padding ثابت يبقى + inset يضاف inline).

## التحقق بعد التعديل
pnpm test && pnpm run check && pnpm lint، تحديث todo.md بنود [x]، webdev_save_checkpoint.

## حالة
- آخر checkpoint: 5f1ec4d9، 42 اختبارًا ناجحًا
- todo.md: بنود المهمة غير مُعلّمة (تشخيص/إصلاح/تحقق)
- Todo items to complete: تشخيص اختفاء الأزرار، إصلاح التخطيط، التحقق والحفظ

## حالة التنفيذ الفعلية (للمتابعة بعد ضغط السياق)

المشكلة: SafeAreaView edges=["top","left","right","bottom"] على Android في Expo Go يضيف حافة bottom مكررة فوق شريط التبويب (شريط التبويب في _layout.tsx يأخذ insets.bottom تلقائيًا)، فتصبح مساحة Bidding أكبر من الشاشة الفعلية وتُقصّ أزرار الأرقام خارج الشاشة.

### الملف: app/(tabs)/index.tsx

1. السطر 3 حاليًا: `import { SafeAreaView } from "react-native-safe-area-context";`
   يجب إضافة useSafeAreaInsets: `import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";`

2. السطر 84 (مكون ConnectionLostScreen بأكمله في سطر واحد):
   ```
   return <SafeAreaView edges={["top", "left", "right", "bottom"]} style={styles.safe}><View style={styles.centerPage}><Text style={styles.connectionKicker}>الغرفة المحلية</Text>...<PrimaryButton label="العودة للرئيسية" onPress={onReturn} /></View></SafeAreaView>;
   ```
   يجب تقسيمه إلى عدة أسطر: إضافة `const insets = useSafeAreaInsets();` وedges تُصبح ["top","left","right"] وView style يُضاف `{ paddingBottom: insets.bottom + 24 }`

3. Bidding (~السطر 139-144): `edges={["top", "left", "right", "bottom"]}` وScrollView contentContainerStyle={styles.scrollContent}
   → edges بدون bottom، وcontentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 34 }]}، مع إضافة `const insets = useSafeAreaInsets();` قبل return (بعد const strongest)

4. TrumpSelection (~السطر 172-177): نفس النمط مع contentContainerStyle={styles.trumpContent} → paddingBottom: insets.bottom + 24

5. RoundResult (~السطر 187-209): View style={styles.centerPage} → style={[styles.centerPage, { paddingBottom: insets.bottom + 24 }]} + SafeAreaView بدون bottom edge

ملاحظة: Home screen السطر 63 يستخدم homeSafe بشكل مختلف (بطاقات) — لا تُمس.
الأنماط الموجودة: styles.safe, styles.centerPage, styles.scrollContent, styles.trumpContent, styles.homeSafe.

### بعد التعديل:
- pnpm test && pnpm run check && pnpm lint
- أخذ لقطة بحجم Redmi 14C: webdev_take_screenshot mobile [720,1600] تقريبيًا
- تحديث todo.md: وضع [x] على بنود المزايدة الثلاثة (موجودة في نهاية todo.md)
- webdev_save_checkpoint

## أرقام الأسطر الدقيقة (بعد آخر فحص)
- L3: import SafeAreaView
- L84: ConnectionLostScreen سطر واحد
- L140-164: Bidding (SafeAreaView عند L141، ScrollView عند ~L142، bidGrid داخله)
- L174: TrumpSelection SafeAreaView (contentContainerStyle=styles.trumpContent)
- L209: RoundResult SafeAreaView، L210 View style={styles.centerPage}

## حالة الإصلاح (محدّث)
- جميع التعديلات نُفّذت بنجاح على app/(tabs)/index.tsx:
  - السطر 28 (ConnectionLostScreen الجذر): edges=["top","left","right","bottom"] مع styles.safe
  - السطر 63 (Home): edges=["top","left","right","bottom"] مع styles.homeSafe
  - الأسطر 141 و174 و209 (Bidding / TrumpSelection / RoundResult): SafeAreaView مع edges=["top","left","right","bottom"]
  - ConnectionLostScreen الداخلي (السطر 84): edges=["top","left","right"] فقط (لا حافة سفلية مكررة)
- SafeAreaView من react-native-safe-area-context مستوردة.
- المتبقي: تشغيل pnpm test && pnpm run check && pnpm lint، التحقق المرئي من شاشة المزايدة على حجم [720,1640] (Redmi 14C)، تحديث todo.md وحفظ checkpoint.
- ملاحظة: شاشة المزايدة قد تحتاج رابط معاينة؟ لا — التطبيق يبدأ المباراة بعد النقر على "ابدأ مباراة جديدة" في المعاينة.
