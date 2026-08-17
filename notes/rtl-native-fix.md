# تفعيل RTL أصلي عبر I18nManager (نسخة APK)

## طلب المستخدم (المذكور حرفيًا)
السبب الحقيقي لانعكاس الاتجاه في APK: نسخة Preview تشتغل على Expo Web وتأخذ الاتجاه من dir="rtl" في HTML، أما APK فهو React Native حقيقي يعتمد على I18nManager. الحل المطلوب:
1. في app/_layout.tsx قبل أي رندر: `I18nManager.allowRTL(true)` و`I18nManager.forceRTL(true)` خارج أي component.
2. Restart كامل (ليس Fast Refresh) لأن forceRTL يكتب flag في SharedPreferences على Android ويُقرأ عند إنشاء Activity.
3. التأكد من edgeToEdgeEnabled في app.config.ts (متوفرة).
4. أي flexDirection: 'row' ينعكس تلقائيًا إلى row-reverse عند تفعيل RTL — يجب مراجعة الـ row-reverse اليدوية المكتوبة كحل مؤقت لأنها ستنعكس مرتين.

## التنفيذ المنجز
- `lib/rtl.ts` (جديد): دالة enableRTL() تستدعي allowRTL+forceRTL وتعيد false/true (true = يحتاج إعادة تحميل).
- `app/_layout.tsx`: استدعاء enableRTL() على مستوى الوحدة قبل أي رندر، + useEffect يستدعي require("react-native").RestartAndroid?.() بعد 600ms إذا فعّلنا RTL للتو (web excluded).
- TypeScript clean، ESLint clean.

## نقاط تحتاج مراجعة دقيقة (row-reverse اليدوي)
48 موضع row-reverse في app/ + components/ + lib/، و6 مواضع direction: "ltr" كحاوية حاكمة:
- app/(tabs)/index.tsx safe/homeSafe (الأسطر 257-258)
- app/(tabs)/settings.tsx safe (سطر 113)
- app/(tabs)/stats.tsx safe (سطر 67)
- components/tarneeb/table.tsx screen (سطر 261)
- components/tarneeb/local-room-sheet.tsx page (سطر 208)

### قرار معماري حاسم (لم يُتخذ بعد):
عند تفعيل I18nManager RTL: كل row-reverse المكتوب يدويًا سينعكس لـ row (لأن RTL يقلب row إلى row-reverse تلقائيًا)، فيُنكس كل التوجيه المكتوب. الحلان:
(أ) إزالة جميع row-reverse اليدوية والاعتماد على RTL الأصلي تلقائيًا، وإبقاء direction:"ltr" فقط للحاويات البصرية التي لا تخضع للاتجاه (مثل قوس البطاقات والأفكار الرسومية الثابتة).
(ب) تثبيت forceRTL(false)؟ غير منطقي للتطبيق العربي.
الاختيار: (أ) — مع إبقاء direction ltr للحاويات الرسومية الخاصة (الطاولة، القوس، غرفة الشبكة).

### ملاحظة كتابة اتجاه RTL الأصلي
التطبيق كتبه أصلًا بيدوي row-reverse + writingDirection rtl + textAlign right — أي أنه صُمم ليعمل لTR أصليًا مع انعكاس يدوي. تفعيل RTL الأصلي سيعكس كل شيء، لذا يجب إما:
- إزالة كل row-reverse وجعل RTL الأصلي يدير الاتجاه، مع إزالة direction ltr من كل حاوية (بما فيها الطرنيب الطاولة!) — خطر على هندسة الطاولة المرسومة يدويًا.
- أو الأسلم: تثبيت حاوية لTR واحدة في الجذر؟ لا، المستخدم طلب forceRTL.

## الخطوات المتبقية
1. قرار ومراجعة row-reverse/align-items flex-end مع I18nManager.isRTL (اختبار وحدة يحاكي isRTL=true).
2. pnpm test / check / lint.
3. todo.md: بنود RTL native جديدة [x].
4. checkpoint + إبلاغ المستخدم بأن APK جديد يحتاج إعادة تثبيت كاملة (وليس hot reload).

## اختبار مقترح
إضافة اختبار يقرأ ملفات التطبيق ويعدّ row-reverse المكتوبة، ويوثق الحاويات ltr الحاكمة، ويحاكي أن isRTL عند التشغيل سيكون true.

## حالة التنفيذ (17 أغسطس)
- lib/rtl.ts: enableRTL() مفعّل. lib/rtl-style.ts: isRTL/isNativeRTL/isWebRTL + arabicRow().
- app/_layout.tsx: enableRTL() عند مستوى الوحدة + RestartAndroid بعد 600ms عند أول تفعيل.
- tsc + ESLint نظيفان.
- تمت ترقية 5 ملفات بـ arabicRow(): index.tsx (شاشة المباراة)، settings.tsx، rules.tsx، stats.tsx، local-room-sheet.tsx. لم يبقَ فيها row-reverse يدوي.
- **قرار جزيرة الطاولة**: components/tarneeb/table.tsx حاويته screen تحمل direction:"ltr" عمدًا (جزر هندسية: مقاعد مطلقة، قوس، مواضع playLeft/playRight، trickArea مع transform). صفوفها العربية داخل الجزيرة تبقى row-reverse يدويًا عمدًا لأنها معزولة عن RTL الأصلي. native-ui-layout.ts وُثّق بذلك.
- ملاحظة: restart loop غير ممكن لأن enableRTL() يعود false عند I18nManager.isRTL=true.

## التحقق البصري (بعد الترقية)
الشاشات الرئيسية (الرئيسية، الإعدادات، القواعد) تظهر سليمة RTL على المعاينة: العناوين والنصوص متراصة يمين، البطاقات المصفوفة تبدأ من اليمين (4 لاعبين/محلي/هدف 31، خيارات المستوى، بطاقات القواعد). ESLint: أزيل تحذير الاستيراد المكرر. التبقّي الوحيد: تحذير package.json بلا type:module (خارج النطاق).
متبقٍ: اختبار وحدة لـ rtl-style (isRTL helper)، التقاط /stats، todo.md بند RTL native، checkpoint، تسليم للمستخدم مع إرشاد: APK جديد يحتاج uninstall/reinstall (flag يكتب عند أول إقلاع Activity، وإعادة تشغيل كامل بعد التثبيت).
ملاحظة: RestartAndroid غير موجودة في واجهات RN 0.81 — استخدمت ?.() اختياريًا؛ إن لم تعمل يجب إبلاغ المستخدم بأن قفل التطبيق وفتحه يدويًا يكفي.
