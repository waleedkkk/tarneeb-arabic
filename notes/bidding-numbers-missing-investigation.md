# تشخيص اختفاء أزرار أرقام المزايدة (7-13) — ملف التحقيق (نهائي)

## وصف المشكلة (من لقطات المستخدم على Redmi 14C):
- شاشة المزايدة: يظهر «اختر عرضك» وتحته «يمكنك طلب X أو أكثر»، ثم نص «مرّر» (زر مرّر) لكن **لا تظهر أزرار الأرقام (7-13)** إطلاقًا.
- شاشة القواعد تُعرض ممتدة خلف العناصر (مما يشير لمعضلة padding السفلي).
- فرضية Tailwind purge: مرفوضة — الأزرار تستخدم StyleSheet.create (JavaScript) وليس NativeWind/classes.

## التشخيص النهائي:
`SafeAreaView` بـ `edges=["top","left","right","bottom"]` يضيف حافة سفلية = insets.bottom فوق شريط التبويب (الذي يُحسب من insets.bottom أيضًا). في Redmi 14C مع insets.bottom كبير، يصبح المحتوى المتاح أقل من ارتفاع المحتوى الكامل، فيُضغط العرض أو يُقطع:
1. bidGrid (7 أزرار بارتفاع 52 + gap 9 ≈ 395px) قد يخرج أسفل المدى ولا يُعرض أصلًا أو يُقص من عرض الصفحة.
2. ScrollView موجود لكن contentContainerStyle = { padding: 20, paddingBottom: 34 } لا يحسب ارتفاع شريط التبويب.

## الحل المحدد (قبل ضغط السياق):
1. في Bidding وTrumpSelection:
   - edges = ["top","left","right"] (إزالة bottom)
   - حساب: const insets = useSafeAreaInsets(); const tabBarHeight = Platform.OS === "web" ? 58 + 10 : 58 + Math.max(insets.bottom, 8);
   - Bidding: contentContainerStyle={[styles.scrollContent, { paddingBottom: 20 + tabBarHeight }]}
   - TrumpSelection: contentContainerStyle={[styles.trumpContent, { paddingBottom: 24 + tabBarHeight }]}
2. RoundResult: إزالة bottom من edges + استبدال centerPage padding (24) بـ { paddingBottom: 24 + tabBarHeight }
3. إضافة import useSafeAreaInsets من react-native-safe-area-context إلى index.tsx (موجود في _layout لكن يجب التحقق من index.tsx imports)
4. اختبار في tests/native-ui-layout.test.ts: محاكاة Redmi 14C مع insets.bottom > 0 والتأكد بقاء bidGrid ضمن المحتوى.

## تفاصيل الكود الحالي (index.tsx):
- Bidding: سطور 131-165، SafeAreaView عند 141، ScrollView عند 142، bidGrid عند 160، مرّر عند 161.
- TrumpSelection: سطور 167-185، SafeAreaView عند 174، ScrollView عند 175.
- RoundResult: سطور 187-225، SafeAreaView عند 209، View styles.centerPage عند 210.
- الأنماط: scrollContent (padding: 20, paddingBottom: 34) عند ~281، centerPage ({ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }) عند ~349، trumpContent ({ flexGrow: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 20, paddingVertical: 24 }) عند ~350.
- numberButton: { width: 59, height: 52 }، bidGrid: flexDirection row-reverse flexWrap gap 9.
- _layout.tsx: bottomPadding = Platform.OS === "web" ? 10 : Math.max(insets.bottom, 8)؛ tabBarStyle height = 58 + bottomPadding.

## حالة التنفيذ:
- [x] التشخيص النهائي
- [ ] تطبيق التعديلات على Bidding/TrumpSelection/RoundResult في index.tsx
- [ ] إضافة الاختبار
- [ ] فحوص وحفظ نسخة
