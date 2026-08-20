# إصلاح تعطل Worklet عند إفلات بطاقة

**التاريخ:** 20 أغسطس 2026  
**الحالة:** مُعالج ومغطى باختبار انحدار.

## العرَض

في APK على Android، كان إنهاء إيماءة سحب بطاقة من مروحة اليد يؤدي إلى الاستثناء الأصلي الآتي:

> `com.facebook.jni.CppException: Object is not a function` في `cardFanTsx` ضمن مسار `runWorklet`.

## السبب

تنفذ دالة `Gesture.Pan().onEnd()` على مسار Reanimated الأصلي كـ **Worklet**. كان هذا المسار يستدعي `isCardDragDrop(event.translationY, compact)`، وهي دالة TypeScript عادية مستوردة من `card-fan-layout.ts`. لا تُحوّل هذه الدالة تلقائيًا إلى Worklet، ولذلك لا يكون مرجعها قابلًا للاستدعاء عند الإفلات على Android.

## الإصلاح

يُحسب حدّ الإفلات `dropThreshold` مسبقًا في مسار React العادي، ثم يستخدم `onEnd()` مقارنة رقمية مستقلة:

```ts
const reachesTable = event.translationY <= -dropThreshold;
```

وهذا يبقي كل ما يُنفّذ داخل Worklet قابلًا للتسلسل إلى المسار الأصلي. تبقى استدعاءات تحديث React مثل `playCard` و`notifyDragState` خلف `runOnJS` عمدًا.

| جانب التحقق | النتيجة |
|---|---|
| اختبارات Vitest | 71 ناجحًا، 1 متخطى عمدًا |
| TypeScript | ناجح |
| Expo ESLint | ناجح |
| اختبار الانحدار | يمنع استدعاء `isCardDragDrop()` من `card-fan.tsx` |

## ملاحظة للبناء التالي

يتطلب اختبار السلوك على الهاتف إنشاء APK جديد من هذه النسخة، لأن التعطل كان في مسار الإيماءات الأصلي ولا يمكن محاكاته بصورة موثوقة في معاينة الويب.
