# وثيقة بناء مشروع تطبيق طرنيب

**النسخة المرجعية:** تطبيق «طرنيب» — لعبة ورق عربية (ترنِب/طرنيب) للهواتف، مبني بـ Expo SDK 54 / React Native 0.81 / TypeScript 5.9.
**الغرض من هذه الوثيقة:** تمكين أي نموذج برمجي أو مطوّر من إعادة بناء التطبيق بالكامل — بكل قواعده، خوارزمياته، بروتوكولاته، أنماطه، وأدواره — من هذا المستند دون الرجوع إلى الكود المصدر.
**إعداد:** Manus AI

---

## 1. نظرة عامة على المنتج

تطبيق هاتف (عمودي — portrait فقط) بلعبة طرنيب الكاملة باللغة العربية وواجهة RTL. يدعم وضعين للعب:

| الوضع | الوصف |
|-------|-------|
| **solo (فردي محلي)** | اللاعب ضد 3 خصوم آليين على الجهاز نفسه. |
| **localRoom (شبكة محلية)** | 4 لاعبين بشريين على 4 أجهزة في نفس الشبكة (Wi-Fi/نقطة اتصال)، دون إنترنت. نموذج مضيف-عميل. |

ميزات المنتج: مزايدة كاملة (7–13) مع تمرير، اختيار الطرنيب مع مؤشر قوة الأنواع، 13 لمّة لكل جولة، احتساب نقاط (نجاح الطلب / خصم الطلب)، هدف نقاط قابل للتعديل (31/41/61)، سجل مزايدات ولمم داخل المباراة، مؤقّت دور اختياري، شاشة إحصاءات محلية (أحدث 100 جولة)، 5 شخصيات خصوم بسلوكيات مستقلة، 3 مستويات ذكاء × 3 أساليب لعب، تخصيصات كاملة (ثيم الطاولة، وجه/ظهر البطاقات، الأصوات، سرعة الحركات، انحناء القوس، تكديس أوراق الخصوم، حجم نص)، مؤثرات صوتية واهتزاز، حركات بطاقات (رمي، تجميع، مسح الفائز)، سحب وإفلات ورقة إلى الطاولة، QR للانضمام للغرفة مع عد تنازلي وإعادة محاولة.

---

## 2. حزمة التقنية والتبعيات

| المكوّن | التقنية | ملاحظة بناء |
|---------|---------|--------------|
| الإطار | Expo SDK 54 (React Native 0.81، React 19) | typedRoutes + reactCompiler مفعّلان |
| التوجيه | Expo Router 6 (file-based) | شريط تبويب سفلي: اللعبة، الإحصاءات، القواعد، الإعدادات |
| التنسيق العام | NativeWind 4 (Tailwind) | الأصناف على View/Text؛ Pressable ممنوعة من استخدام className |
| مكوّنات اللعبة الحرجة | StyleSheet.create | طاولة/قوس/لمم — لا NativeWind للأداء الحركي |
| الحركات | react-native-reanimated 4.x + gesture-handler | قوس اليد باللمس، رمي البطاقة |
| الصوت | expo-audio | `import * as FileSystem from "expo-file-system/legacy"` |
| الكاميرا/QR | expo-camera + react-native-qrcode-svg | مولّد QR للمضيف، ماسح للعميل |
| الشبكة | react-native-tcp-socket (ESM-only!) + react-native-zeroconf | TCP على المنفذ 42872 + ZeroConf للاكتشاف |
| التخزين | AsyncStorage | 3 مفاتيح فقط (انظر قسم 8) |
| الشيفرة/الأداء | expo-haptics، expo-keep-awake، expo-network | `Network.getIpAddressAsync` لعنوان المضيف |
| الاختبارات | vitest + mock لوحدات native | 48+ اختبارًا (انظر قسم 13) |

### التكوين في app.config.ts

- `name: "طرنيب"`، `orientation: "portrait"`.
- Android: `edgeToEdgeEnabled: true`، `predictiveBackGestureEnabled: false`، أبنية `armeabi-v7a, arm64-v8a`، `minSdkVersion: 24`.
- plugins: expo-router، expo-audio، expo-video، expo-splash-screen (صورة 200 عرض، resizeMode contain)، expo-build-properties.
- scheme من bundle ID بصيغة `manus<timestamp>`.

### التبعيات الإضافية (خارج القالب الافتراضي)

```json
"expo-camera": "~17.0.10",
"expo-network": "~8.0.8",
"react-native-qrcode-svg": "^6.3.21",
"react-native-tcp-socket": "^6.4.2",
"react-native-zeroconf": "^0.14.0"
```
وdev: `qrcode`، `@expo/ngrok`، `vitest`، `@types/qrcode`.

### الثيم العالمي (theme.config.js) — ثيم داكن دائم (light = dark)

| المفتاح | القيمة |
|---------|--------|
| primary | `#E3B341` (ذهبي) |
| background | `#0E3B2E` (أخضر داكن) |
| surface | `#16624A` |
| foreground | `#FFF8E7` (عاجي) |
| muted | `#B4D6C7` |
| border | `#2C765B` |
| success / warning / error | `#6EE7B7` / `#F5D889` / `#F59892` |

### الأصوات (assets/sounds/)

خمسة ملفات MP3: `card-shuffle.mp3` (التوزيع)، `card-place.mp3` (لعب ورقة)، `card-play.mp3` (قديم — ما زال موجودًا)، `trick-win.mp3` (حسم اللمّة)، `timer-alert.mp3` (تنبيه المؤقّت). ملف ATTRIBUTION.md يوثّق المصادر.

---

## 3. بنية الملفات

```
app/
  _layout.tsx                جذر التطبيق + enableRTL + الموفّرات
  (tabs)/
    _layout.tsx              شريط التبويب السفلي (4 تبويبات عربية)
    index.tsx                الشاشة الرئيسية + جميع مراحل المباراة (442 سطرًا)
    stats.tsx                الإحصاءات المحلية
    rules.tsx                قواعد اللعبة
    settings.tsx             الإعدادات/التخصيصات
  dev/theme-lab.tsx          مختبر الثيم (تطوير فقط)
  oauth/callback.tsx         (قالب — غير مستخدم)
components/
  screen-container.tsx       غلاف SafeArea
  themed-view.tsx            خلفية ثيم
  haptic-tab.tsx             زر تبويب بلمسة اهتزازية
  tarneeb/
    card.tsx                 ورقة اللعب (وجه + ظهر + حركات دخول/قلب)
    card-fan.tsx             قوس يد اللاعب (سحب/إفلات/لمس)
    table.tsx                طاولة اللعب والمقاعد واللمم (339 سطرًا)
    local-room-sheet.tsx     واجهة الشبكة/QR
lib/
  rtl.ts                     enableRTL (I18nManager)
  rtl-style.ts               arabicRow/rowDirection (مصدر الحقيقة للاتجاه)
  haptics.ts                 اهتزاز light/success/error
  theme-provider.tsx         الوضع الليلي
  tarneeb/
    types.ts                 كل تعريفات الأنواع
    engine.ts                محرك القواعد النقي (329 سطرًا)
    ai.ts                    منطق قرارات الذكاء الاصطناعي
    personas.ts              5 شخصيات بمعدلات سلوكية
    game-context.tsx         GameProvider (useReducer + حفظ + AI turns + مؤقّت)
    storage.ts               AsyncStorage (مفاتيح + تحقق + ترحيل)
    stats.ts                 سجل الإحصاءات (100 جولة)
    native-ui-layout.ts      هندسة حاوية الطاولة حسب حجم الشاشة
    card-fan-layout.ts       معادلات قوس اليد المتجاوب
    opponent-card-fan-layout.ts معادلات تكديس أوراق الخصوم
    local-room-transport.ts  طبقة النقل TCP + ZeroConf
    local-room-utils.ts      stateForViewer + QR + مهل
    local-room-context.tsx   LocalRoomProvider (مضيف/عميل/بروتوكول)
    local-room-protocol.md   توثيق بروتوكول الشبكة
    use-game-sounds.ts       4 مسارات صوتية بأحجام حسب SoundProfile
tests/                       48+ اختبار وحدة (انظر قسم 13)
```

---

## 4. نظام الأنواع الكامل (lib/tarneeb/types.ts)

```ts
const SUITS = ["clubs", "diamonds", "hearts", "spades"] as const
type Suit = (typeof SUITS)[number]
type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14
type Seat = 0 | 1 | 2 | 3            // 0=اللاعب/المضيف، 1=يمين، 2=أعلى (الشريك)، 3=يسار
type Team = 0 | 1                     // 0=فريق اللاعب (زوجي)، 1=الخصوم (فردي)
type GamePhase = "home" | "bidding" | "trump" | "playing" | "trickResult" | "roundResult"
type MatchMode = "solo" | "localRoom"
type CardFanCurve = "gentle" | "balanced" | "deep"
type CardBackPattern = "royal" | "navy" | "emerald"   // 3 نقوش ظهر كلاسيكية
type TableTextSize = "normal" | "large"
type OpponentCardDensity = "compact" | "balanced" | "spacious"
type TurnTimerSeconds = 0 | 30 | 45 | 60              // 0 = معطّل
type AiLevel = "مبتدئ" | "متوازن" | "خبير"
type AiStyle = "حذر" | "متوازن" | "مبادر"
type AiPersonaId = "layaan" | "faris" | "samar" | "rania" | "nader"
type AiPersonaTendency = "تحفّظ" | "دعم" | "ضغط" | "استدراج" | "تحكّم"
type OpponentPersonaAssignments = Record<1 | 2 | 3, AiPersonaId>
type TableTheme = "emerald" | "midnight" | "sand"
type CardFaceTheme = "ivory" | "parchment" | "midnight"
type SoundProfile = "هادئة" | "متوازنة" | "بارزة"
type AnimationSpeed = "هادئة" | "متوازنة" | "سريعة"

interface Card { id: string; suit: Suit; rank: Rank }
interface Player {
  id: Seat; name: string; seat: Seat; team: Team;
  hand: Card[]; handCount: number;   // handCount يبقى ظاهرًا للخصوم حتى مع يد فارغة عبر الشبكة
  isHuman: boolean; personaId?: AiPersonaId;
}
interface Play { playerId: Seat; card: Card }
interface Trick { leaderId: Seat; leadSuit: Suit | null; plays: Play[] }
interface ResolvedTrick extends Trick { winnerId: Seat }
interface BiddingState {
  currentPlayer: Seat;
  highestBid: number | null;         // يبدأ فعليًا من 6 داخل الحساب (أدنى طلب 7)
  highestBidder: Seat | null;
  activeSeats: Record<Seat, boolean>;
  bids: Array<{ playerId: Seat; bid: number | null }>;   // null = تمرير
  trumpSuit: Suit | null;
}
interface BidLogEntry { playerId: Seat; playerName: string; bid: number | null }
interface TrickLogEntry {
  trickNumber: number; winnerId: Seat; winnerName: string;
  plays: Array<Play & { playerName: string }>;
}
interface MatchLog { bids: BidLogEntry[]; tricks: TrickLogEntry[] }
interface RoundSummary {
  bid: number; bidderTeam: Team; madeContract: boolean;
  roundTricks: Record<Team, number>; scoreChange: Record<Team, number>;
}
interface RoundRecord {   // لقطة جولة محفوظة محليًا للإحصاءات
  roundNumber: number; bid: number; bidderName: string; bidderTeam: Team;
  trump: Suit; madeContract: boolean; tricksTeam0: number; tricksTeam1: number;
  scoreChange0: number; scoreChange1: number; timestamp: number;
}
interface GameSettings {
  targetScore: 31 | 41 | 61;
  aiLevel: AiLevel; aiStyle: AiStyle; opponentPersonas: OpponentPersonaAssignments;
  tableTheme: TableTheme; cardFaceTheme: CardFaceTheme;
  soundProfile: SoundProfile; animationSpeed: AnimationSpeed;
  hapticsEnabled: boolean; soundEnabled: boolean;
  showStrengthIndicator: boolean; showOpponentProfileCards: boolean;
  cardFanCurve: CardFanCurve; cardBackPattern: CardBackPattern;
  tableTextSize: TableTextSize; opponentCardDensity: OpponentCardDensity;
  turnTimerSeconds: TurnTimerSeconds;
}
interface MatchState {
  matchMode: MatchMode; phase: GamePhase; round: number; players: Player[];
  bidding: BiddingState; trick: Trick; lastTrick: ResolvedTrick | null;
  tricksWon: Record<Team, number>; scores: Record<Team, number>;
  roundSummary: RoundSummary | null; matchLog: MatchLog;
}
```

### الإعدادات الافتراضية (DEFAULT_SETTINGS في engine.ts)

`targetScore=31`، `aiLevel="متوازن"`، `aiStyle="متوازن"`، `opponentPersonas={1:"layaan",2:"faris",3:"samar"}`، `tableTheme="emerald"`، `cardFaceTheme="ivory"`، `cardBackPattern="royal"`، `soundProfile="متوازنة"`، `animationSpeed="متوازنة"`، `hapticsEnabled/soundEnabled/showStrengthIndicator/showOpponentProfileCards=true`، `cardFanCurve="balanced"`، `opponentCardDensity="balanced"`، `tableTextSize="normal"`، `turnTimerSeconds=0`.

---

## 5. محرك قواعد اللعبة (lib/tarneeb/engine.ts)

محرك نقي بلا اعتماد على React — كل الدوال Pure عدا مولّدات الحالة. هذا هو مصدر الحقيقة لكل قاعدة في اللعبة.

### الثوابت الداخلية

```ts
RANKS = [2..14]      // 14 = الآص (الأعلى)، 2 الأدنى
SUIT_ORDER = { clubs: 0, diamonds: 1, hearts: 2, spades: 3 }
HIGH_CARD_WEIGHTS (مؤشر القوة للواجهة) = { 10:1, 11:2, 12:3, 13:4, 14:5 }
```

الأسماء العربية: نوادي (♣)، ديناري (♦)، كبة (♥)، بستوني (♠). `rankLabel`: 11=J، 12=Q، 13=K، 14=A. `cardLabel` = الرتبة + الرمز.

### توزيع الأوراق

1. `createDeck()`: 52 بطاقة بمعرفات `${suit}-${rank}`.
2. `shuffle()`: خلط Fisher-Yates قياسي على الرزمة.
3. `dealPlayers()`: توزيع متتابع — المقعد i يأخذ `deck.slice(i*13, i*13+13)`، ثم `sortHand`: ترتيب بالنوع تصاعديًا (نوادي → ديناري → كبة → بستوني) ثم بالرتبة تنازليًا. أسماء: seat0 = «أنت»، الباقون من personas.
4. `teamOf(seat) = seat % 2` — الأزواج: (0,2) فريق اللاعب، (1,3) فريق الخصم.

### متابعة اللمّة

```ts
legalCards(hand, trick):
  إن leadSuit غير موجود → كل اليد قانونية.
  وإلا → أوراق نوع القيادة إن وُجدت، وإلا كل اليد (اتباع النوع إجباري).

cardBeats(candidate, current, leadSuit, trumpSuit):
  - نفس النوع → رتبة أعلى.
  - مرشوم (مرشوح/طرنيب) على غير مرشوم → رابح دائمًا.
  - current مرشوم → مرشح فقط إن كان مرشومًا وأعلى.
  - غير مرشوم من نوع القيادة على نوع آخر → رابح.

resolveTrick(trick, trumpSuit):
  يجب أن يكون leadSuit موجودًا و4 أوراق، وإلا استثناء «لا يمكن حسم لمّة غير مكتملة».
  يبدأ بالفائز الافتراضي = play[0]، ثم يمر على الباقي: الفائز = play الحالي إن cardBeats(play, winner).
  يعيد ResolvedTrick بـ winnerId.
```

### المزايدة

```ts
submitBid(state, playerId, proposedBid):
  - تحقّقات: phase==="bidding" && currentPlayer===playerId && activeSeats[playerId]===true.
  - minBid = (highestBid ?? 6) + 1   // أدنى طلب 7.
  - إن هذا آخر نشط ولم يطلب أحد قط → يُلزَم bid=7.
  - bid صالح فقط إن null أو (minBid ≤ bid ≤ 13).
  - bid===null → activeSeats[playerId]=false (تجاوز).
  - bid!==null → highestBid/highestBidder يتحدّثان.
  - إن remaining actives===1 وhighestBidder موجود → phase="trump".
  - وإلا currentPlayer = nextActiveSeat.
```

التمرير في طرنيب الحقيقي: اللاعب الملتزم (آخر نشط بلا طلب سابق، أي لم يمرر قط) يُلزم بطلب 7 ولا يُسمح له بالتمرير — مطبّق في شرط `bid === null && isLastActive && highestBidder === null`.

### اختيار الطرنيب واللعب

```ts
selectTrump(state, playerId, trumpSuit):
  ينجح فقط إن phase==="trump" && highestBidder===playerId.
  → phase="playing"، bidding.trumpSuit=suit، trick=emptyTrick(playerId) (صاحب الطلب يقود اللمّة الأولى).

playCard(state, playerId, cardId):
  - phase==="playing" && plays.length<4 && لم يلعب هذا اللاعب بعد.
  - تسلسل إجباري: expected = leaderId إن plays فارغ، وإلا nextSeat(آخر لاعب).
  - الورقة في اليد وقانونية (legalCards).
  - يُزال card من hand ويُنقص handCount.
  - leadSuit = نوع أول ورقة.
  - إن plays تصبح 4 → resolveTrick → phase="trickResult" + lastTrick + trick log.
  - إن مجموع اللمم المنجزة = 13 → scoreRound فورًا.

advanceTrick(state):
  من trickResult → phase="playing"، leader = lastTrick.winnerId.
```

### احتساب نقاط الجولة

```ts
scoreRound(state, nextTricks):
  bidder = highestBidder؛ bidderTeam = teamOf(bidder).
  madeContract = nextTricks[bidderTeam] >= bid.
  scoreChange[bidderTeam] = madeContract ? nextTricks[bidderTeam] : -bid   // النجاح: لممهم تضاف، الفشل: خصم قيمة الطلب.
  scoreChange[opponentTeam] = nextTricks[opponentTeam]                     // الخصم يأخذ لممه دائمًا.
  → phase="roundResult" مع roundSummary كامل (bid، bidderTeam، madeContract، roundTricks، scoreChange).
```

**قاعدة طرنيب مطبّقة هنا:** الفريق الذي يفشل في طلبه يُخصَم منه قيمة الطلب، ويأخذ الخصم لممه كإضافية موجبة.

### مولّدات الحالة

`createHomeState()` → phase="home"، `createRound(prev, resetScores?)` → distribution + bidding، `createNetworkRound(prev, playerNames, resetScores?)` → مثل createRound لكن `matchMode="localRoom"` وكل اللاعبين `isHuman=true` بأسماء playerNames. لا استئناف (hydration) لوضع الشبكة — المحفوظ يُنزَّل فقط في وضع solo.

---

## 6. الذكاء الاصطناعي (lib/tarneeb/ai.ts + personas.ts)

نقي بالكامل (لا React) — قابل للاختبار وحدة. يعمل على MatchState كامل للمضيف.

### نقاط الأوراق عند الذكاء الاصطناعي (مختلفة عن واجهة مؤشر القوة)

```ts
HIGH_CARD_POINTS = { 10: 0.5, 11: 0.9, 12: 1.25, 13: 2, 14: 3.25 }
```

### تقدير قوة النوع

```ts
aiSuitStrength(hand, suit):
  highPoints = مجموع نقاط الأوراق العالية في النوع.
  lengthBonus = (count≥7 → 2.3) (≥6 → 1.25) (≥5 → 0.55) else 0.
  return count * 1.15 + highPoints + lengthBonus
```

### تقدير المزايدة

```ts
estimateAiBid(hand, level, style, personaId?):
  strongestSuit = أعلى aiSuitStrength بين الأنواع الأربعة.
  outsideControls = مجموع: آص في أنواع غير الأقوى ×0.45 + ملك ×0.25.
  skillOffset  = خبير +0.35 / متوازن 0 / مبتدئ -0.55
  styleOffset  = مبادر +0.65 / متوازن 0 / حذر -0.6
  raw = 6 + floor((strongestSuit + outsideControls + styleOffset + skillOffset + persona.bidBias) / 3.7)
  return clamp(raw, 7, 13)
```

### قرار المزايدة

```ts
chooseAiBid(hand, highestBid, level, style, personaId?):
  estimate = estimateAiBid(...)
  إن highestBid===null (الفتح):
    openThreshold = مبتدئ 8 وإلا 7
    return estimate >= threshold ? estimate : null   // null = تمرير
  وإلا:
    margin = مبتدئ 2 وإلا 1
    return estimate >= highestBid + margin ? estimate : null
```

المبتدئ لا يفتح من يد ضعيفة؛ المتوازن/الخبير يثقان بتقديرهما من 7.

### اختيار الطرنيب

```ts
chooseAiTrump(hand, level, style, personaId?):
  يرتّب الأنواع تنازليًا بمجموع:
    طول النوع × (1.1 + levelWeight + persona.trumpLengthBias × 0.45)
    + aiSuitStrength × (1 + persona.trumpHonorBias × 0.08)
    + (مبادر والنوع يحوي الآص → +0.4)
  levelWeight = مبتدئ 0.2 / متوازن 0.7 / خبير 1.2
  كسر التعادل: الطول الأكبر، ثم اسم النوع تصاعديًا.
```

### اختيار الورقة

**عند قيادة اللمّة (`chooseLeadCard`):**

```ts
- مبتدئ: الأعلى أو الأدنى رتبة حسب persona.leadRankBias > 0.1 → الأعلى وإلا الأدنى.
- غير مبتدئ:
  المرشحون = أوراق غير الطرنيب إن وجدت، وإلا كل اليد.
  لكل مرشح:
    exposedVoidPenalty = (خبير && خصم كشف فراغًا في هذا النوع من سجل اللمم) → 4 (+1.2 إن tendency="تحكّم") else 0
    rankIntent = (مبادر → rank×0.12 | حذر → -rank×0.04 | متوازن → 0) + rank × persona.leadRankBias
    score = aiSuitStrength(hand, card.suit) + suitCards.length × 0.35 + rankIntent - exposedVoidPenalty
  يختار أعلى score؛ كسر التعادل: الأعلى رتبة (مبادر أو ضغط فوز) وإلا الأدنى.
```

**عند عدم القيادة (`chooseAiCard`):**

```ts
1. إن plays فارغ (قيادة) → chooseLeadCard.
2. winner = currentWinningPlay (reduce بـ cardBeats).
3. إن الشريك يقود اللمّة حاليًا && level≠مبتدئ && persona.preserveTrump:
   → لا يُهدر ورقة فوق لمّة محسومة: يلعب الأدنى ورقة غير طرنيب إن وجدت، وإلا الأدنى مطلقًا.
4. إن توجد أوراق رابحة على current winner (cardBeats) → الأعلى رتبة (مبادر مع مستوى≠مبتدئ، أو persona.preferWinningPressure) وإلا الأدنى.
5. خبير بلا رابحة → يتخلص من أعلى ورقة غير طرنيب إن وجدت (حذر/استدراج → الأدنى)، حفاظًا على الطرنيب.
6. غير ذلك → الأدنى رتبة مطلقًا.
```

**قراءة طاولة الخبير:** `opponentsHaveShownVoid(state, team, suit)` يفحص matchLog.tricks: لمّة قادها النوع suit ولعب فيها خصم (خارج فريق team) ورقة من نوع آخر → كشف فراغ.

### تأخيرات الرد (game-context.tsx)

| القرار | مبتدئ | متوازن | خبير |
|--------|-------|--------|------|
| لعب ورقة (ms) | 520 | 650 | 760 |
| مزايدة/طرنيب (ms) | 620 | 800 | 920 |

كلها مضروبة بمعامل سرعة الحركة: هادئة 1.24، متوازنة 1.0، سريعة 0.74.

### الشخصيات الخمس ومعدلاتها الدقيقة

```ts
const AI_PERSONAS: Record<AiPersonaId, AiPersona> = {
  layaan: { name:"ليان", title:"الحارسة", tendency:"تحفّظ",
    bidBias:-0.45, trumpLengthBias:0.1, trumpHonorBias:0.85, leadRankBias:-0.12,
    preserveTrump:true, preferWinningPressure:false },
  faris: { name:"فارس", title:"الشريك الوفي", tendency:"دعم",
    bidBias:0, trumpLengthBias:0.5, trumpHonorBias:0.4, leadRankBias:-0.03,
    preserveTrump:true, preferWinningPressure:false },
  samar: { name:"سامر", title:"المبادر", tendency:"ضغط",
    bidBias:0.6, trumpLengthBias:0.8, trumpHonorBias:0.25, leadRankBias:0.18,
    preserveTrump:false, preferWinningPressure:true },
  rania: { name:"رانيا", title:"المستدرِجة", tendency:"استدراج",
    bidBias:0.2, trumpLengthBias:0.25, trumpHonorBias:0.65, leadRankBias:-0.05,
    preserveTrump:true, preferWinningPressure:false },
  nader: { name:"نادر", title:"قارئ الطاولة", tendency:"تحكّم",
    bidBias:0.1, trumpLengthBias:0.35, trumpHonorBias:0.7, leadRankBias:0.06,
    preserveTrump:true, preferWinningPressure:false },
};
DEFAULT_OPPONENT_PERSONAS = { 1:"layaan", 2:"faris", 3:"samar" };
getAiPersona(id) = AI_PERSONAS[id ?? "faris"];
```

- `bidBias`: يضاف إلى بسط تقدير المزايدة (سالب = تحفّظ في الطلب).
- `trumpLengthBias`/`trumpHonorBias`: وزنان في اختيار الطرنيب (الطول/الشرف).
- `leadRankBias`: نزعة قيادة الأنواع العالية (سالب = قيادة منخفضة).
- `preserveTrump`: لا يهدر الطرنيب فوق لمّة الشريك المحسومة.
- `preferWinningPressure`: يختار الأعلى رتبة رابحة (الضغط).
- `tendency` لا يغيّر المعادلات إلا في exposedVoidPenalty (+1.2 للتحكّم) ورمي الخبير (استدراج → الأدنى).

---

## 7. إدارة حالة المباراة (lib/tarneeb/game-context.tsx)

`GameProvider` يدير:

1. **reducer للعبة** بعمليات: `START_MATCH`، `BID` (submitHumanBid)، `TRUMP`، `PLAY` (playHumanCard)، `NEXT_TRICK`، `NEXT_ROUND`، `START_NETWORK_MATCH`، `NEXT_NETWORK_ROUND`، `NETWORK_STATE` (applyNetworkState)، `EXIT`، `HYDRATE`.
2. **reducer للإعدادات** مع `saveSettings` بعد كل تحديث.
3. **Hydration عند أول تحميل:** `Promise.all(loadStoredMatch, loadStoredSettings)` → HYDRATE. الحفظ بعد كل تغيير (debounced) عبر `saveStoredMatch`/`saveStoredSettings`.
4. **دوران قرارات AI:** setTimeout يتحقق قبل التنفيذ أن الدور ما زال للـ AI وأن الطور لم يتغير.
5. **مؤقّت الدور:** يفعّل عند: (بداية المباراة في المزايدة ودوره currentPlayer===0) أو (اختيار الطرنيب وصاحب الطلب 0) أو (اللعب ودوره (last+1)%4===0 أو leader===0). تحديث كل 500ms؛ تنبيه صوتي عند ≤5 ثوانٍ.
6. **تسجيل إحصاء:** عند roundResult في وضع solo مع bidder — RoundRecord بمفتاح dedup: `${round}-${scores[0]}-${scores[1]}`.
7. **Haptics:** light للأزرار، success للنجاح، error للخطأ — كلها خاضعة لـ hapticsEnabled.

API المكشوف عبر `useGame()`: `startMatch`، `submitHumanBid(bid|null)`، `selectHumanTrump(suit)`، `playHumanCard(cardId)`، `nextTrick()`، `nextRound()`، `exitMatch()`، `updateSettings(partial)`، ومتغيرات الشبكة (`startNetworkMatch`، `submitNetworkBid`، `selectNetworkTrump`، `playNetworkCard`، `nextNetworkTrick`، `nextNetworkRound`، `applyNetworkState`).

---

## 8. التخزين المحلي (lib/tarneeb/storage.ts)

| المفتاح | المحتوى | ملاحظات |
|---------|---------|---------|
| `tarneeb.match.v1` | MatchState كامل (solo فقط) | لا استئناف لوضع localRoom؛ يُمسح عند exit |
| `tarneeb.settings.v1` | GameSettings | تحقق من القيم المسموحة + fallbacks افتراضية |
| `tarneeb.stats.v1` | RoundRecord[] (أحدث 100) | FIFO عند الامتلاء |

- **ترحيل legacy:** قيم aiStyle القديمة "هادئ"→"حذر"، "جريء"→"مبادر".
- **تحقق match:** يجب phase من نوع string وplayers مصفوفة — وإلا discard وإرجاع home.
- **تحقق settings:** كل قيمة تُختبر ضد union الخاص بها؛ القيم الخاطئة تستبدل بالافتراضية مع الحفظ.

---

## 9. هندسة الشبكة المحلية (lib/tarneeb/local-room-*)

### النموذج المعماري

مضيف واحد (الحكم) يتحقق من كل قرار؛ العملاء يرسلون **نوايا** والمضيف يبث **حالة معتمدة** بعد تطبيقها على MatchState الحقيقي. لا يوجد حسم قواعد على أي عميل.

### طبقة النقل (local-room-transport.ts)

```ts
LOCAL_ROOM_PORT = 42872
LOCAL_ROOM_JOIN_TIMEOUT_MS = 12000   // في local-room-utils.ts (ملاحظة: الثابت 12s ظاهر للمستخدم)
```

**TCP (`react-native-tcp-socket` — ESM-only):**

```ts
getTcp(): تحميل ديناميكي async `await import("react-native-tcp-socket")`
  مع كاش لكل منصة (cachedTcp). Platform.OS==="web" → null.
  (استيراد ESM ديناميكي ضروري — require() يفشل صامتًا بالوحدات ESM.)
  حماية callback المتصل من TDZ بـ `let socketRef` قبل `socketRef = tcp.createConnection(...)`.

LocalRoomHost:
  - tcp.createServer على {port, host:"0.0.0.0", reuseAddress:true}
  - لكل socket: setEncoding("utf8")، setNoDelay(true)، setKeepAlive(true)
  - مخزن buffer لكل socket في Map<Socket,string>
  - onConnect/onClose تحافظان على Set<Socket> للمراسلة
```

**تنسيق الرسائل:** سطر-delimited JSON: `socket.write(JSON.stringify(msg) + "\n")`. `parseChunk`: يضم المعلق الحالي + chunk، يقسم على "\n"، يحلل كل سطر (يتجاهل الفارغ وغير الصالح JSON أو بلا type).

```ts
LocalRoomClient:
  - connectTimeout = المهلة + 1000ms
  - حماية TDZ بـ socketRef (let قبل التعيين)
  - finishOnce(callback): يمنع تنفيذ reject المزدوج عند connect→close متزامن
```

**الاكتشاف (ZeroConf):**

```ts
publishLocalRoom(name, roomId, port):
  zeroconf.publishService("tarneeb", "tcp", "local.", name, port,
    { roomId, protocol: "1" }, "DNSSD")

discoverLocalRooms(onRoom):
  zeroconf.scan("tarneeb", "tcp", "local.", "DNSSD")
  on resolved: يقبل فقط إن addresses تحوي IPv4 صالح (regex) وroomId/key protocol==="1"
```

### البروتوكول (7 أنواع رسائل)

| الرسالة | الاتجاه | الحقل | المعنى |
|---------|---------|-------|--------|
| `hello` | عميل→مضيف | `{protocol:1, roomId, key, name}` | طلب انضمام |
| `error` | مضيف→عميل | `{message}` | رفض/خطأ |
| `welcome` | مضيف→عميل | `{seat, roomId}` | قبول مع المقعد |
| `lobby` | مضيف→عملاء | `{members:[{seat,name,connected}]}` | قائمة الأعضاء (كل تغيّر) |
| `intent` | عميل→مضيف | `{intent:"bid", bid}` / `{intent:"trump", suit}` / `{intent:"card", cardId}` | قرار اللاعب |
| `state` | مضيف→عميل | `{state: MatchState مرئي}` | الحالة المعتمدة الكاملة |
| (close) | — | — | انقطاع → connected:false في lobby |

### تدفق المضيف (createRoom في local-room-context.tsx)

1. يتطلب نسخة أصلية (nativeSupported عبر `getLocalRoomTransport`)، وإلا رسالة عربية خطأ.
2. `Network.getIpAddressAsync()` — إن "0.0.0.0" → خطأ «اتصل بشبكة أولًا».
3. `details = {host, port, roomId: randomToken(6), key: randomToken(12)}`.
   - أبجدية الرمز: `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (بدون I/O/0/1).
4. المضيف = seat 0. `sessionsRef: Map<Socket, Seat>`.
5. عند `hello`: فحص protocol===1 && roomId && key && name (مقصوص ≤20) وإلا error + socket.destroy.
6. `availableSeat` = أول seat ≠ 0 غير مشغول؛ إن room مكتمل أو المباراة بدأت → error.
7. يرسل welcome، يبث lobby محدثًا.
8. أي `intent` → `dispatchHostIntent` → `game.submitNetworkBid/selectNetworkTrump/playNetworkCard(seat, ...)`.
9. `broadcastGameState`: عند كل تغيّر state → لكل socket يرسل `stateForViewer(state, seat)`.

### تدفق العميل (joinRoom)

1. الحالة `joining`، مع `clearJoinTimeout` عند أي إتمام أو خطأ؛ مهلة 12 ثانية (`LOCAL_ROOM_JOIN_TIMEOUT_MS`).
2. عند الاتصال → يرسل hello تلقائيًا (onConnect).
3. الرسائل: `error` → setStatus("error") مع message؛ `welcome` → status="ready" + localSeat؛ `lobby` → members (إن 4 متصلين → ready)؛ `state` → `game.applyNetworkState` + status="playing".
4. انتهاء المهلة (12s): `client.disconnect()` + رسالة عربية: «انتهت مهلة الاتصال. تأكد من بقاء جهاز المضيف مفتوحًا وأن الأجهزة على الشبكة المحلية نفسها، ثم حاول مجددًا».
5. الأزرار: إعادة المحاولة (joinRoom بنفس details) دون مسح رمز جديد.

### حماية الرؤية (local-room-utils.ts)

```ts
rotateSeat(seat, viewerSeat) = ((seat - viewerSeat + 4) % 4) as Seat
stateForViewer(source, viewerSeat):
  - يد اللاعب المحلي (localSeat===0) فقط تُرسل؛ باقي الأيدي مصفوفات فارغة (handCount يبقى صحيحًا).
  - التدوير: مقعد المشاهد دائمًا 0 (أسفل الشاشة)، فريقه فريق 0.
  - bidding: currentPlayer/highestBidder/activeSeats/bids تُدار seats بالدوران.
  - trick/lastTrick: leaderId/winnerId/plays تُدار seats.
  - tricksWon/scores: [0]=فريق المشاهد، [1]=الآخر.
  - roundSummary: bidderTeam وroundTricks وscoreChange بنفس المبدأ.

roomDetailsToQrData:
  `tarneeb://local?host=${host}&port=${port}&room=${roomId}&key=${key}`

validateRoomQrData(value):
  - يبدأ بـ "tarneeb://local?" وإلا خطأ عربي.
  - host: IPv4 كل جزء ≤255. port: 1024–65535. roomId/key موجودان.
```

### واجهة الشبكة (components/tarneeb/local-room-sheet.tsx)

أوضاع: `menu | create | host | join | scanner`. إنشاء غرفة (اسم ≤20) → hosting + عرض QR + كود نصي. انضمام: إدخال الكود يدويًا (validateRoomQrData) أو مسح QR بكاميرا expo-camera. عد تنازلي مرئي كل 250ms بصيغة «تنتهي المحاولة خلال N ث». انضمام ناجح → رسالة نجاح متحركة 1600ms. انقطاع أثناء اللعب → ConnectionLostScreen بزر إعادة/خروج.

---

## 10. هندسة واجهة الطاولة والمقاييس (lib/tarneeb/*-layout.ts)

### حاوية الطاولة (native-ui-layout.ts)

```ts
ANDROID_TEST_VIEWPORTS = {
  compact: {width:360, height:800, insets:{top:24,bottom:24}},
  standard: {width:412, height:915, insets:{top:28,bottom:24}},
  redmi14cGameFrame: {width:360, height:710, safeFrame:true}
}
getNativeTableLayout(width, height, insetsTop, insetsBottom):
  compact = width <= 375
  contentHeight = safeFrame ? height : height - insetsTop - insetsBottom
  topSafeFallback = compact ? 44 : 48   // إن insetsTop===0
  playableContentHeight = contentHeight - topSafeFallback
  denseLayout = compact || playableContentHeight <= 700
  horizontalPadding = compact ? 12 : 14
  handAreaHeight = 124 (compact) / 140
  tableTopMargin = 8/10، handTopMargin = 6/10
  preferredTableMinHeight = 286/330
  reservedHeight = statusRow + handArea + margins...
  tableMaxHeight = max(0, playableContentHeight - reservedHeight)
  tableMinHeight = min(preferredTableMinHeight, tableMaxHeight)
```

**NATIVE_LAYOUT_DIRECTION:** الجذر ltr، صفوف المحتوى العربي row-reverse، لكن مقاعد الطاولة (جزيرة هندسية) تبقى بالاتجاهات المطلقة: leftSeat left، rightSeat right — أي أن الطاولة المرسومة يدويًا معزولة عن مرآة RTL عبر حاوية `direction:"ltr"`، والنصوص العربية تُكتب صراحة.

### قوس يد اللاعب (card-fan-layout.ts)

```ts
STANDARD_CARD_FOOTPRINT = 64، COMPACT = 52، MAX_FAN_WIDTH = 340
getResponsiveFanMetrics(viewportWidth, areaWidth):
  compact = viewportWidth < 344
  footprint = 52/64، inset = 24/44
  fanWidth = min(areaWidth - inset, 340)
  fanHeight = 88 (compact) / 112

getBalancedFanCardPosition(index, count, metrics, curve):
  progress = index / (count - 1)        // 0 يمين، 1 يسار
  usableWidth = fanWidth - footprint
  naturalStep = compact ? 20 : 28
  spreadWidth = min(usableWidth, (count - 1) * naturalStep)
  left = (usableWidth - spreadWidth) / 2 + progress * spreadWidth
  baseline = footprint * (2/4)
  curve = { gentle:{lift:10,maxRot:6}, balanced:{lift:16,maxRot:10}, deep:{lift:22,maxRot:14} } × (scale 0.7 إن compact)
  centeredProgress = progress - 0.5
  curveProgress = 1 - |centeredProgress * 2|     // القمة في المنتصف
  bottom = baseline + curveProgress * lift * scale
  rotation = centeredProgress * maxRotation * scale
  zIndex = 10 + index        // اليسار (الأحدث) فوق اليمين
```

**استجابة اللمس على الأطراف:** `getFanEdgeHitSlop`: top/bottom 7، جانبي 14 للكشف و4 للداخل؛ `getCardDragDropThreshold`: 54 (compact) / 66؛ `isCardDragDrop = translationY <= -threshold` (سحب للأعلى = رمي).

### تكديس أوراق الخصوم (opponent-card-fan-layout.ts)

```ts
densityScale: compact 0.78 / balanced 1.0 / spacious 1.18
span = 66 * scale؛ maxStep = (صف أعلى 19 : جانبيان 15) * scale
step = min(maxStep, span / (count - 1))
الصف الأعلى (الشريك): صف مستقيم، rotation=0، lift=0 (بدون قوس لمنع التشابك).
الجانبان: صفوف عمودية بدوران ±90°.
```

### حركة اللمّة (components/tarneeb/table.tsx)

```ts
TRICK_TRAVEL (من المقعد إلى موقعها في وسط الطاولة — قيم x/y كإزاحات نهائية وrotation كنص):
  seat0: {x:0, y:112, rotation:"0deg", slot:"playBottom"}
  seat1: {x:108, y:0, rotation:"90deg", slot:"playRight"}
  seat2: {x:0, y:-112, rotation:"180deg", slot:"playTop"}
  seat3: {x:-108, y:0, rotation:"-90deg", slot:"playLeft"}
GATHER_TO_CENTER (سحب الأوراق إلى الوسط للفائز):
  seat0: {0,-54}، seat1: {-48,0}، seat2: {0,54}، seat3: {48,0}
SWEEP_TO_WINNER: الإزاحة المعكوسة نحو الفائز.

الرسوم الزمني:
  - travel: 320ms cubic-out
  - gather: تأخير 360ms + 170ms ease-in-out
  - sweep: تأخير 610ms + 280ms cubic-in
  - opacity = 0.28 + 0.72 × progress
  - scale = 0.78 + 0.22 × progress (عند sweep ينقص −18%)
  - معامل سرعة الحركة: هادئة 1.28 / متوازنة 1.0 / سريعة 0.72
```

### ثيمات الطاولة

```ts
TABLE_THEMES = {
  emerald: { screen:"#0E3B2E", table:"#16624A", border:"rgba(245,216,137,.4)" },
  midnight:{ screen:"#101D33", table:"#1D385C", border:"rgba(183,214,239,.46)" },
  sand:    { screen:"#583A21", table:"#80603B", border:"rgba(255,234,188,.52)" },
}
```

### مكوّنات شاشة الطاولة

- **statusRow:** فريقك pill (اسم + badge لمم + نقاط)، contractPill وسط (رمز الطرنيب بلون ذهبي مميز + اسم صاحب الطلب + قيمة الطلب)، خصم pill.
- **مقاعد:** top=seat2 (الشريك)، left=seat3، right=seat1؛ left يدور 90deg، right −90deg.
- **currentSeat:** leader إن plays فارغ، وإلا (last+1)%4 — يُعرض بسهم داخل بطاقة اللاعب صاحب الدور.
- **TurnTimerBadge:** warning ≤10 ث، urgent ≤5 ث، مع progress bar.
- **dropTarget:** نص «اسحب ورقة إلى الطاولة» / «أفلت الورقة هنا» عند سحب بطاقة.
- **LastTrickBanner:** بانر متحرك بعد حسم اللمّة يسمّي الفريق الفائز والورقة الرابحة.
- **TrickResultOverlay (index.tsx):** يظهر النتيجة ثم يتقدم تلقائيًا بعد 1250ms.
- **PersonaInfoCard:** تفتح بالنقر على أفاتار الخصم (اسم، لقب، أسلوب، وصف) وتخضع لتفضيل showOpponentProfileCards.
- **مروحة الشريك:** عند نقصان أوراقه تتقلص المروحة بحركة انتقالية سلسة تعكس العدد الحقيقي دون رقم.

### ورقة اللعب (components/tarneeb/card.tsx)

PlayingCard بحالتين compact/full، disabled/selected مع hitSlop، توهج طرف عند اللمس، حركة دخول، حركة قلب عند التوزيع (deal flip). ثيمات الوجه: ivory/parchment/midnight. الظهر: 3 نقوش (royal/navy/emerald) — إطار مزدوج، حقل خمري، زخارف ماسية ذهبية، وسام مركزي بعلامة «ط» — قابلة للتبديل من الإعدادات (تطبق على بطاقات الخصوم فورًا).

### شاشات المراحل (app/(tabs)/index.tsx)

GameScreen router حسب phase + حالة الشبكة:
- `home` → Home (زر «ابدأ مباراة جديدة» + بطاقة اللعب عبر الشبكة)
- `bidding` → Bidding: شريط اللاعبين بالأفاتارات، معاينة قوس اليد، مؤشر قوة الأنواع (5 أشرطة، قابل للإخفاء + أيقونة معلومات بشرح الحساب)، شبكة أزرار 7–13 ديناميكية حسب minBid، زر تمرير. **إصلاح Android:** SafeAreaView الداخلية بلا حافة سفلية + paddingBottom ديناميكي = insets.bottom على محتوى التمرير.
- `trump` → TrumpSelection: الأربعة أنواع بمؤشرات قوتها.
- `playing/trickResult` → GameTable + TrickResultOverlay + سجل المباراة (modal بمزايدات ولمم).
- `roundResult` → RoundResult: ملخص (نجح/فشل + تغيّر النقاط)، اختصارات إعادة/خروج (بدون زر «ابدأ اللمّة التالية» — تلقائي عبر roundSummary)، سلوك host-only لبدء الجولة في الشبكة.
- ConnectionLostScreen: fallback عند انقطاع الشبكة أثناء playing.
- MatchActions: إعادة تشغيل/خروج مع تأكيدات.

### الإحصاءات (stats.tsx)

4 بطاقات: إجمالي الجولات، نسبة نجاح طلباتك، مجموع لمم الفريقين، صافي النقاط. قائمة السجل (أحدث 100 RoundRecord) مع مسح وتأكيد.

### الإعدادات (settings.tsx)

خيارات كاملة: targetScore (31/41/61)، aiLevel، aiStyle، opponentPersonas لكل مقعد (مع ضمان تفرّد الأسماء)، soundProfile، animationSpeed، turnTimerSeconds، cardFanCurve، cardBackPattern، cardFaceTheme، tableTheme، tableTextSize، opponentCardDensity، ومفاتيح: haptics، الصوت، مؤشر القوة، بطاقات تعريف الخصوم.

---

## 11. نظام الاتجاه RTL الأصلي

```ts
// lib/rtl.ts — يُستدعى عند تحميل الملف قبل أي رندر:
import { I18nManager } from "react-native";
if (!I18nManager.isRTL) {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);   // يكتب علم native يُقرأ عند إنشاء Activity
}
// ثم في useEffect بالجذر: RestartAndroid بعد 600ms إن فُعّل لأول مرة (بديل Updates.reloadAsync).

// lib/rtl-style.ts — مصدر الحقيقة للاتجاه:
arabicRow() → flexDirection: I18nManager.isRTL ? "row-reverse" : "row"
rowDirection(side) لمقاعد الطاولة → قيم مطلقة (جزيرة الجزيرة المعزولة)
```

قاعدة إعادة البناء: عند تفعيل forceRTL تنعكس صفوف row تلقائيًا؛ أي row-reverse مكتوب يدويًا فوق ذلك يسبب انعكاسًا مزدوجًا. لذا كل الأنماط تمر عبر arabicRow()، وجزيرة الطاولة تبقى معزولة (direction:"ltr" على حاويتها).

**فخ بيئة Expo Go/الويب:** dir="rtl" في HTML يكفي للمعاينة لكن APK يعتمد على I18nManager حصريًا.

---

## 12. الجذر والموفّرات (app/_layout.tsx)

```
GestureHandlerRootView
  → SafeAreaProvider
    → ThemeProvider
      → GameProvider
        → LocalRoomProvider
          → Stack (headerShown:false)
```

استدعاء `enableRTL()` خارج المكوّن قبل أي رندر + إعادة تشغيل تلقائية (RestartAndroid، 600ms) عند أول تشغيل بعد التثبيت.

شريط التبويب (app/(tabs)/_layout.tsx): 4 تبويبات — الطرنيب (index)، الإحصاءات، القواعد، الإعدادات — بارتفاع ديناميكي `56 + max(insets.bottom, 8)` paddingTop 8.

مكوّن `ScreenContainer` الافتراضي: SafeAreaView بالحواف `["top","left","right"]` فقط (لا bottom) لأن شريط التبويب يعالج القاع؛ داخل المباراة تُدار القيعان يدويًا بـ insets.bottom.

---

## 13. الاختبارات (tests/ — vitest)

48+ اختبار وحدة تغطي: tarneeb-engine (قواعد المزايدة/اللمم/النقاط/الفوز بالهدف)، tarneeb-ai (تقديرات/قرارات/شخصيات)، local-room-transport (كاش الوحدات، parseChunk، host/client)، local-room-utils (stateForViewer بالتدوير، QR validation، المهل)، card-fan-layout / opponent-card-fan-layout / native-ui-layout (مقاييس Redmi 14C)، rtl-style (arabicRow في بيئات RTL/LTR)، bidding-layout-android (لا حواف سفلية مكررة في Bidding/TrumpSelection/RoundResult)، tarneeb-stats (dedup وFIFO)، auth.logout (قالب).

**تنبيه مهم لإعادة البناء:** vitest يكسر rollup عند تحليل مصدر react-native الحقيقي؛ الاختبارات التي تلامس وحدات native تستخدم `vi.mock("react-native")` قبل الاستيراد (نمط local-room-transport.test.ts). TCP/ZeroConf تُحمَّل ديناميكيًا في الإنتاج، لذا يُعاد ضبط كاش النقل بعد `vi.resetModules`.

---

## 14. قرارات معمارية حاسمة (لماذا؟)

1. **المحرك نقي (engine/ai/personas بلا React):** قابلية اختبار كاملة وسرعة؛ GameProvider هو الوحيد الملتف حول UI.
2. **المرآة عند المضيف لا العملاء:** stateForViewer يدير التدوير وإخفاء الأيدي — العملاء لا يحسبون قواعد أصلًا، فلا اختلاف رأي في الحسم.
3. **TCP بدل HTTP/WebSocket:** شبكة محلية بلا إنترنت؛ JSON سطر-delimited مع buffer parsing يعالج التجزئة.
4. **ESM ديناميكي لـ react-native-tcp-socket:** المكتبة ESM-only؛ require() صامت الفشل → يجب import() await.
5. **جزيرة طاولة ltr داخل RTL أصلي:** إحداثيات القوس والمقاعد مطلقة؛ RTL عبر حاوية معزولة.
6. **I18nManager.forceRTL في الجذر + RestartAndroid:** الاتجاه الصحيح في APK (الويب يعتمد dir="rtl" وحده).
7. **StyleSheet لمكوّنات اللعب الحرجة + NativeWind للشاشات:** أداء الحركات دون إعادة إنشاء الأنماط.
8. **AsyncStorage بمفاتيح v1 مع تحقق وfallbacks:** منع تحطم الحالة بعد ترقية الإعدادات.
9. **مؤشرات قوة UI ≠ نقاط AI:** الأولى (count×2+أوزان UI) للعرض فقط؛ الثانية (HIGH_CARD_POINTS الدقيقة) لمنطق القرار.
10. **handCount منفصل عن hand في الشبكة:** عرض العدد الحقيقي ليد الشريك مع إخفاء أوراق الخصوم.

---

## 15. خطوات البناء الكاملة (checklist)

1. `pnpm install` + `npx expo start`.
2. `pnpm run check` (TypeScript)، `pnpm lint` (Expo ESLint)، `pnpm test` (48+ اختبارًا) — يجب أن تجتاز جميعها.
3. الشعار: icon.png + splash-icon.png + favicon.png + android-icon-foreground.png (نفس الشعار في المواضع الأربعة)، وتحديث app.config.ts (appName، logoUrl).
4. الأصوات: mp3 الخمسة في assets/sounds/ + ATTRIBUTION.md.
5. الأفاتارات: 5 صور PNG مرسومة متسقة لشخصيات الخصوم (المسارات في personas.ts — تستبدل بروابط S3 بعد الرفع).
6. بناء APK: عبر زر Publish في واجهة المشروع (EAS build) — الأبنية armeabi-v7a + arm64-v8a، minSdk 24.
7. عند أول تشغيل APK: إعادة تشغيل تلقائية واحدة لتفعيل I18nManager؛ إن لم تتحقق فاحذف وثبّت مجددًا.
8. الشبكة المحلية: تحتاج APK حقيقي (الويب لا يدعم TCP/ZeroConf) + اتصال الأجهزة بنفس الشبكة.

---

## 16. المرفقات والمراجع الداخلية

- `lib/tarneeb/local-room-protocol.md` — توثيق بروتوكول الشبكة التفصيلي.
- `notes/architecture-network-ai.md` — تحليل بنية الشبكة والذكاء الاصطناعي.
- `notes/rtl-native-fix.md` — توثيق إصلاح RTL الأصلي.
- `notes/bidding-fix-plan.md` — توثيق إصلاح أزرار المزايدة على Android.
- `tests/` — مجموعة الاختبارات المرجعية.

*انتهت الوثيقة — أي نموذج برمجي يستلم هذا المستند مع حزمة الأصوات والأفاتارات يستطيع إعادة بناء التطبيق مطابقًا.*
