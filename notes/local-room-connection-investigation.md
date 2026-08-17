# تحقيق خلل اتصال الشبكة المحلية (إدخال رمز الغرفة)

## البلاغ
المستخدم جرب اللعب الجماعي (4 أجهزة، نفس الشبكة المحلية، Redmi 14C). أدخل رمز الغرفة ولم يحدث أي شيء: لا اتصال، لا رسالة خطأ ظاهرة.

## ملاحظات أولية من `local-room-transport.ts` (تم الفحص)
- `getTcp()` يعود null على web → على APK الأصلي يعمل.
- `LocalRoomClient.connect` يرمي أخطاء، لكن قد لا تُلتقط في الواجهة.
- `server.listen({ host: "0.0.0.0" })` للمضيف.
- zeroconf DNSSD للنشر والاكتشاف.
- منفذ ثابت 42872.

## نقاط محتملة للخلل
1. `connectTimeout` في createConnection — بعض إصدارات react-native-tcp-socket قد تتجاهل الخيار أو يرفضه Android 9+.
2. Android 9+ يقيد استخدام الشبكة عبر `AndroidManifest: usesCleartextTraffic` وNetwork Security Config — الاتصال المباشر بعنوان IP على منفذ خاص قد يُحظر افتراضيًا. هذا سبب شائع جدًا لعدم ظهور أي شيء.
3. فشل `onError` بدون معالجة واضحة في الواجهة (فشل صامت).
4. جدار حماية HyperOS/Mi Firewalls قد يمنع الاتصال الوارد للمضيف.

## ملفات متعلقة
- lib/tarneeb/local-room-transport.ts
- lib/tarneeb/local-room-utils.ts
- lib/tarneeb/local-room-context.tsx
- lib/tarneeb/local-room-protocol.md
- app/(tabs)/network.tsx أو شاشة الشبكة (يحتاج فحص)

## فحص Android
- يحتاج فحص android/app/src/main/AndroidManifest.xml وapp.config.ts (network_security_config).
- ملاحظة: في هذا القالب يُبنى APK عبر نشر Manus، لذا يجب تعديل app.config.ts (expo-build-properties / android.config).

## نتائج الفحص الكامل (بعد قراءة كل الطبقة)

### 1. شاشة الانضمام (components/tarneeb/local-room-sheet.tsx)
- `JoinForm` معرّفة بشكل صحيح وتعرض `busy={room.status === "joining"}` وعد تنازلي.
- `join()` تتحقق من الرمز ثم تستدعي `room.joinRoom`.
- العد التنازلي يبدأ من useEffect عند `room.status === "joining"` (12 ثانية) ثم يعرض خطأ "انتهت مهلة الاتصال" وزر إعادة المحاولة.
- إذن `CHANGE_WIFI_MULTICAST_STATE` موجود في app.config.ts.

### 2. السبب الجذري الأرجح: **عدم تضمين الحزم الأصلية في بناء APK**
- `react-native-tcp-socket@6.4.2` و`react-native-zeroconf@0.14.0` في package.json كـ dependencies عادية فقط.
- **لا يوجد config plugin** لإضافتهما إلى APK (expo-managed build لا يضيف native modules تلقائيًا من package.json).
- بدون prebuild/config plugin، في APK: `require("react-native-tcp-socket")` في getTcp() سيرمي استثناءً (Cannot find native module) خارج try/catch في `connect()`، فيعلق الوعد (promise) الذي لم يُرْفَض، وتبقى الشاشة على `busy="يتصل بالمضيف…"` حتى انتهاء 12 ثانية ثم مهلة عامة.
- المستخدم: "لم يحدث شيء" = ربما العد التنازلي لم يظهر أصلًا (خطأ require حدث قبل setStatus) أو ظهرت مهلة دون اتصال.

### ملاحظة من وكيل التصحيح
- cleartext ليس السبب الأساسي لأن TCP raw sockets ليست HTTP.
- التوصية: لف require بـ try/catch آمن + إضافة config plugin أو تثبيت الحزم كمكونات buildpack في بيئة Manus build.

### 3. الحل المقترح (متوافق مع بناء Manus)
- حماية getTcp()/getZeroconf() بـ try/catch وإرجاع null مع رسالة عربية واضحة تظهر كخطأ.
- في LocalRoomClient.connect: معالجة استثناءات require.
- **الأهم**: التحقق من كيفية إضافة native modules في بناء APK لمنصة Manus (قد يوجد plugin مخصص في .project-config.json أو يمكن استخدام expo-build-properties لتضمينها؟ لا - build-properties لا تضيف حزمًا).
- خيار واقعي: إنشاء config plugin مخصص محلي في مجلد plugins/ يضيف react-native-tcp-socket وreact-native-zeroconf كـ gradle dependencies وnative modules، ثم إضافته إلى app.config.ts plugins.
- بديل أبسط وقوي: التحقق من أن بيئة بناء Manus تستخدم npx expo prebuild تلقائيًا (حزم native مدرجة في package.json تُضمَّن عادةً في prebuild الافتراضي لأنها react-native modules قياسية). لذا السبب الأرجح هو getTcp() يرمي خطأً غير ممسوك وليس غياب الحزم.

### خطة الإصلاح
1. جعل require آمنًا (try/catch + logging).
2. إصلاح connect: رفض الوعد عند فشل تحميل الوحدة الأصلية بدل التعليق.
3. اختبار وحدة جديد يحاكي فشل require.
4. التحقق من فحوص المشروع وحفظ النسخة.

## حالة الإصلاح الحالية
- ✅ تم تعديل `local-room-transport.ts`: getTcp() محمي بـ try/catch مع caching.
- ✅ تم تعديل `LocalRoomClient.connect()`: try/catch حول createConnection + finishOnce لمنع الرفض المزدوج.
- ✅ تم تعديل `getZeroconf()` و`loadZeroconf()`: محمي بـ try/catch.
- ✅ تم تعديل `local-room-context.tsx`: isNativeSupported = transport !== null && transport.tcp !== null.
- ✅ تم إضافة `getLocalRoomTransport()` في transport module.
- ❌ خطأ TypeScript في `tests/local-room-transport.test.ts`: vi.doMock يأخذ 1-2 arguments فقط (ليس 3). يجب استخدام vi.doMock(name, factory) فقط.
- الحل: إزالة الوسيطة الثالثة `{ virtual: true }` من vi.doMock().

## تحديث: 2026-08-17 — تشخيص TDZ وإصلاحه

### السبب الجذري (TDZ):
الحزمة `react-native-tcp-socket` v6 هي **ESM-only** (src/index.js بـ import، لا exports map).
1. `require()` في getTcp كان يفشل بصمت → cachedTcp = null → "لا يحدث شيء" عند إدخال رمز الغرفة.
2. حتى مع mock vi.doMock، كانت require تلتف حول ESM في vitest ولا يعمل mock.

### الحل المطبق:
- حوّلت getTcp من require() إلى `await import()` (async dynamic import) — يعمل مع vi.doMock في vitest.
- LocalRoomHost.start وLocalRoomClient.connect وgetLocalRoomTransport أصبحت async.
- context: فحص الدعم nativeSupported أصبح useState(false) + useEffect مع async getLocalRoomTransport().
- TDZ في connect: callback المتزامن من createConnection يُنفذ قبل تهيئة `const socket` → ReferenceError. أُصلح بـ `let socketRef; socketRef = tcp.createConnection(...)` مع حراسة `if (socketRef)`.

### الحالة الحالية بعد آخر إصلاح TDZ في الكود الإنتاجي:
- الأخطاء أصبحت: `TypeError: [Function onConnect] is not a spy or a call to a spy!` في السطر 109 (expect(handlers.onConnect).toHaveBeenCalled()).
- handlers.onConnect كان `() => undefined` (دالة عادية، ليست vi.fn()). يجب تغييره إلى `onConnect: vi.fn()`.

### الخطوات المتبقية:
1. تعديل handlers.onConnect إلى vi.fn() في الاختبار الأخير
2. pnpm test && pnpm run check && pnpm lint
3. todo.md: تحديث بنود تشخيص الاتصال (علامة [x])
4. webdev_save_checkpoint
5. رسالة للمستخدم: السبب كان require ESM-only الفاشل (TDZ ورفض فوري)؛ APK يجب أن يتضمن native modules عبر expo prebuild
