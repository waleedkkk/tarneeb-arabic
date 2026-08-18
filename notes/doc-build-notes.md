# ملاحظات لبناء الوثيقة الشاملة (جمع من الملفات الفعلية)

## من engine.ts (مكتمل)
- RANKS 2-14، SUIT_ORDER: clubs=0, diamonds=1, hearts=2, spades=3. HIGH_CARD_WEIGHTS: 10→1, 11→2, 12→3, 13→4, 14→5.
- DEFAULT_SETTINGS: targetScore=31, aiLevel/AiStyle="متوازن", tableTheme="emerald", cardFaceTheme="ivory", soundProfile/animationSpeed="متوازنة", hapticsEnabled/soundEnabled/showStrengthIndicator/showOpponentProfileCards=true, cardFanCurve/cardBackPattern/cardDensity="balanced", tableTextSize="normal", turnTimerSeconds=0.
- أسماء عربية: نوادي/ديناري/كبة/بستوني، رموز ♣♦♥♠.
- sortHand: ترتيب حسب SUIT_ORDER تصاعدي ثم الرتبة تنازليًا.
- suitStrength (مؤشر القوة): score = count*2 + highCardScore + lengthBonus(7+=4, 5+=2); bars=ceil(score/5) محصورة 1-5; label: ≥18 قوي، ≥10 متوسط، أقل محدود.
- dealPlayers: توزيع 13 لكل مقعد seat*13..seat*13+13، أسماء: seat0="أنت"، الباقي من personas، teamOf=seat%2.
- createHomeState→createRound→(solo) أو createNetworkRound (matchMode="localRoom"، كلهم isHuman، أسماء playerNames).
- bidding: currentPlayer=0، minBid=highestBid(6)+1؛ آخر نشط بلا طلب سابق يُلزَم 7؛ تمرير=activeSeats=false؛ عند بقاء نشط واحد بمزايدة → phase trump.
- selectTrump: فقط صاحب المزايدة، phase→playing، trick=emptyTrick(bidder).
- playCard: تحقق الدور (leader أو التالي)، legalCards (follow-suit إجباري)، إزالة الورقة، trickResult بعد 4 لعبات؛ بعد 13 لمّة → scoreRound.
- scoreRound: bidderTeam إذا madeContract(ترم≥طلب) يربح عدد اللمم، وإلا −bid؛ الفريق الآخر ربح لممه. phase=roundResult.
- advanceTrick: leader=winnerId.
- MatchState: matchMode, phase, round, players, bidding, trick, lastTrick, tricksWon{0,1}, scores, roundSummary, matchLog{bids,tricks}.

## من types.ts (مكتمل)
- كل الأنواع: Suit, Rank, Seat, Team, GamePhase(solo→home|bidding|trump|playing|trickResult|roundResult), MatchMode(solo|localRoom), CardFanCurve, CardBackPattern(royal|navy|emerald), TableTextSize, OpponentCardDensity, TurnTimerSeconds(0|30|45|60), AiLevel(مبتدئ|متوازن|خبير), AiStyle(حذر|متوازن|مبادر), AiPersonaId, AiPersonaTendency, TableTheme(emerald|midnight|sand), CardFaceTheme(ivory|parchment|midnight), SoundProfile(هادئة|متوازنة|بارزة), AnimationSpeed(هادئة|متوازنة|سريعة).
- RoundRecord: لقطة جولة محلية (أحدث 100).

## من local-room-transport.ts (مكتمل — انظر notes/architecture-network-ai.md)
## من ai.ts + personas.ts (مكتمل — انظر notes/architecture-network-ai.md)

## ما تبقى فحصه للوثيقة:
- [ ] components/tarneeb/table.tsx (هندسة الطاولة، المقاعد، الألوان)
- [ ] components/tarneeb/card.tsx + card-fan.tsx (قوس اليد، الأبعاد)
- [ ] lib/tarneeb/native-ui-layout.ts + card-fan-layout.ts + opponent-card-fan-layout.ts (معادلات القوس)
- [ ] lib/tarneeb/game-context.tsx + storage.ts (الحفظ AsyncStorage، مفاتيح)
- [ ] lib/tarneeb/use-game-sounds.ts + lib/haptics.ts (الأصوات، ملفات mp3، الشدة)
- [ ] app/(tabs)/index.tsx (هيكل الشاشات، phases)
- [ ] app.config.ts (bundle، plugins)، package.json deps
- [ ] theme.config.js + lib/tarneeb/native-ui-layout.ts ثيمات الطاولة
- [ ] app/_layout.tsx + (tabs)/_layout.tsx + tabs
- [ ] rtl.ts + rtl-style.ts

## من native-ui-layout.ts
- ANDROID_TEST_VIEWPORTS: compact 360×800 (t24 b24), standard 412×915 (t28 b24), redmi14cGameFrame 360×710 safeFrame=true.
- NATIVE_LAYOUT_DIRECTION: root ltr, arabicRow row-reverse, leftSeat left, rightSeat right (جزيرة الطاولة).
- getNativeTableLayout: compact=width<=375؛ contentHeight=safeFrame?h:h-top-bottom؛ topSafeFallback: compact?44:48 إذا insets.top===0؛ playableContentHeight=contentHeight-topSafeFallback؛ denseLayout=compact||playable<=700؛ horizontalPadding compact?12:14؛ statusHeight 46/50؛ handAreaHeight 124/140؛ tableTopMargin 8/10؛ handTopMargin 6/10؛ preferredTableMinHeight 286/330؛ reservedHeight مجموع؛ tableMaxHeight=max(0, playableContentHeight-reservedHeight)؛ tableMinHeight=min(preferred, tableMaxHeight).

## من card-fan-layout.ts
- STANDARD_CARD_FOOTPRINT=64, COMPACT=52, MAX_FAN_WIDTH=340.
- getResponsiveFanMetrics: compact=viewportWidth<344؛ footprint 52/64؛ inset 24/44؛ fanWidth=min(width-inset, 340)؛ fanHeight 88/112.
- getFanEdgeHitSlop: أطراف القوس فقط؛ top/bottom 7، side 14 للكشف و4 للداخل.
- getCardDragDropThreshold: compact?54:66؛ isCardDragDrop: translationY<=-threshold.
- getBalancedFanCardPosition: progress=index/(n-1)؛ usableWidth=fanWidth-footprint؛ naturalStep compact?20:28؛ spreadWidth=min(usableWidth,(n-1)*step)؛ left=(usableWidth-spread)/2+progress*spread (أو الوسط لورقة واحدة)؛ baseline 2/4؛ curve: gentle{10,6}, balanced{16,10}, deep{22,14} × scale(0.7 إذا compact)؛ centeredProgress=progress-0.5؛ curveProgress=1-|centeredProgress*2|؛ bottom=baseline+curveProgress*lift؛ rotation=centeredProgress*maxRotation؛ zIndex=10+index.

## من opponent-card-fan-layout.ts
- densityScale: compact 0.78, spacious 1.18؛ span=66*scale؛ maxStep=(top?19:15)*scale؛ step=min(maxStep, span/(count-1))؛ الصف الأعلى مستقيم (rotation=0, lift=0)؛ الجانبان عموديان.

## من game-context.tsx
- GameProvider: useReducer على MatchState (reducer يحوي: START_MATCH, BID, TRUMP, PLAY, NEXT_TRICK, NEXT_ROUND, START_NETWORK_MATCH, NEXT_NETWORK_ROUND, NETWORK_STATE, EXIT, HYDRATE) + useReducer لإعدادات + useState hydrated.
- hydration: loadStoredMatch+loadStoredSettings عند أول تحميل (Promise.all) → HYDRATE.
- الحفظ: كل تغير state→saveStoredMatch، settings→saveStoredSettings.
- إحصاء: عند roundResult solo مع bidder — RoundRecord مع مفتاح round-scores[0]-scores[1] لمنع التكرار.
- turnTimer: humanSoloTurn= solo && (bidding && currentPlayer===0) || (trump && bidder===0) || (playing && (plays===0? leader===0 : last===3))؛ تحديث كل 500ms؛ تنبيه صوتي عند ≤5 ث؛ مدة 30/45/60.
- AI turns: isAiBidTurn=bidding && currentPlayer!==0؛ isAiTrumpTurn=trump && bidder!==0؛ isAiPlayTurn=playing && ((last+1)%4!==0) أو leader!==0 عند بداية اللمّة. setTimeout بعد: لعب 760/520/650 (خبير/مبتدئ/متوازن) × معامل سرعة (1.24/0.74)؛ مزايدة/طرنيب 920/620/800.
- feedback: haptic light/success/error من lib/haptics حسب الإعداد.
- useGame hook: startMatch/submitHumanBid/selectHumanTrump/playHumanCard/nextTrick/nextRound/exitMatch/updateSettings + network variants + applyNetworkState + turnTimer.

## من storage.ts
- مفاتيح AsyncStorage: tarneeb.match.v1 (match solo فقط — لا استئناف localRoom)، tarneeb.settings.v1، tarneeb.stats.v1 (100 سجل أحدث).
- ترحيل legacy: aiLevel "هادئ"→حذر، "جريء"→مبادر.
- validation: match يجب phase string وplayers array؛ settings تحقق القيم المسموحة مع fallbacks للقيم الافتراضية.

## من local-room-sheet.tsx
- Modes: menu|create|host|join|scanner. expo-camera + react-native-qrcode-svg.
- عد تنازلي للانضمام كل 250ms من LOCAL_ROOM_JOIN_TIMEOUT_MS؛ انتهاء المهلة→خطأ + زر إعادة محاولة + leaveRoom.
- انضمام ناجح: نجاح متحرك 1600ms.
- زر إنشاء غرفة (name) → hosting مع QR؛ انضمام بكود (validateRoomQrData) أو ماسح.

## من table.tsx
- game screen: statusRow (فريقك pill: اسم+لمم badge+نقاط، contractPill في الوسط: الطرنيب واسم وقيمة الطلب، خصم pill).
- مقاعد: top=seat2, left=seat3, right=seat1.
- trickArea: بطاقات TRICK_TRAVEL seats: 0{x0,y112,0°,bottom}, 1{108,0,90°,right}, 2{0,-112,180°,top}, 3{-108,0,-90°,left}. GATHER_TO_CENTER: 0{0,-54},1{-48,0},2{0,54},3{48,0}. SWEEP_TO_WINNER: نفس الإزاحة الأصلية للفائز.
- رسوم الحركة: progress 320ms cubic-out؛ gather delay360+170ms inOut؛ sweep delay610+280ms cubic-in؛ opacity 0.28+0.72*progress؛ scale 0.78+0.22*progress (−18% عند sweep)؛ معامل السرعة 1.28/0.72.
- TABLE_THEMES: emerald{screen #0E3B2E, table #16624A, border rgba(245,216,137,.4)}, midnight{#101D33, #1D385C, rgba(183,214,239,.46)}, sand{#583A21, #80603B, rgba(255,234,188,.52)}.
- TurnTimerBadge: warning ≤10ث، urgent ≤5ث/انتهى؛ progress bar.
- dropTarget: «اسحب ورقة إلى الطاولة» / «أفلت الورقة هنا».
- PlayerSeat: left rotation 90deg, right -90deg؛ active=currentSeat.
- currentSeat: leader إن plays فارغ، وإلا (last+1)%4.

## من app/_layout.tsx (نظرة عامة)
- GestureHandlerRootView → SafeAreaProvider → ThemeProvider → GameProvider → LocalRoomProvider → Stack بدون header؛ enableRTL() عند تحميل الملف + RestartAndroid بعد 600ms إن فُعّل RTL لأول مرة.

## من use-game-sounds.ts (نظرة عامة)
- expo-audio؛ 4 ملفات: card-shuffle, card-place, trick-win, timer-alert (.mp3 في assets/sounds)؛ playsInSilentModeIOS=true؛ أحجام: هادئة 0.42 / متوازنة 0.7 / بارزة 0.95.

## من settings.tsx (نظرة عامة)
- خيارات: targetScore 31|41|61، aiLevel، aiStyle، opponentPersonas لكل مقعد، soundProfile، animationSpeed، turnTimer، cardFanCurve، cardBackPattern، cardFaceTheme، tableTheme، tableTextSize، opponentCardDensity، toggles: haptics/sound/strengthIndicator/profileCards.

## من stats.tsx (نظرة عامة)
- 4 بطاقات ملخص: إجمالي الجولات، نسبة نجاح طلباتك، مجموع لمم كل فريق، صافي النقاط؛ قائمة السجل؛ زر مسح مع تأكيد.

## من card.tsx (نظرة عامة)
- PlayingCard: compact/full، disabled/selected، hitSlop، توهج طرف، entrance، deal flip، ثيمات: cardBackPattern 3 نقوش (royal/navy/emerald)، cardFaceTheme: ivory/parchment/midnight. CardBack مركزه علامة ط عربية.

## من index.tsx (نظرة عامة)
- phase router: Home/Bidding(132-167)/TrumpSelection(169-188)/GameTable/TrickResultOverlay/RoundResult(190-229)/ConnectionLostScreen. ستايلات 257-442.

## theme.config.js (فعلي)
primary #E3B341 (ذهبي)، background #0E3B2E (أخضر داكن)، surface #16624A، foreground #FFF8E7 (عاجي)، muted #B4D6C7، border #2C765B، success #6EE7B7، warning #F5D889، error #F59892. light=dark (ثيم داكن دائم).

## app.config.ts
appName "طرنيب"، appSlug "tarneeb-arabic"، logoUrl "/manus-storage/tarneeb-app-icon_dcc2adb6.png"، orientation portrait، edgeToEdgeEnabled، build-properties (armeabi-v7a, arm64-v8a, minSdk 24)، plugins: expo-router, expo-audio, expo-video, expo-splash-screen (image 200 width contain bg #ffffff)، typedRoutes، reactCompiler.

## الأصوات assets/sounds/
card-shuffle.mp3، card-place.mp3، card-play.mp3، trick-win.mp3، timer-alert.mp3 + ATTRIBUTION.md. ملاحظة: use-game-sounds يستخدم card-place للعب (card-place.mp3 هو «صوت اللعب» الأحدث بدل card-play).

## deps إضافية ملاحظة
expo-camera ~17.0.10، expo-network ~8.0.8، react-native-qrcode-svg ^6.3.21، react-native-tcp-socket ^6.4.2، react-native-zeroconf ^0.14.0، qrcode ^1.5.4 (dev)، @expo/ngrok.

## من ai.ts (تفاصيل دقيقة)
HIGH_CARD_POINTS: 10→0.5, 11→0.9, 12→1.25, 13→2, 14→3.25 (للـ AI فقط — مختلف عن UI).
aiSuitStrength = count*1.15 + highPoints + lengthBonus(7+→2.3, 6+→1.25, 5+→0.55).
estimateAiBid: raw = 6 + floor((strongestSuit + outsideControls + styleOffset + skillOffset + persona.bidBias)/3.7) مقيد 7-13؛ outsideControls = الأوراق ≥13 (آص 0.45، ملك 0.25)؛ skillOffset: خبير +0.35، مبتدئ -0.55؛ styleOffset: مبادر +0.65، حذر -0.6.
chooseAiBid: أول لاعب — مبتدئ عتبة 8 وإلا 7؛ لاحقًا هامش مطلوب: مبتدئ 2 وإلا 1.
chooseAiTrump: ترتيب الأنواع بمجموع: طول*(1.1+levelWeight[مبتدئ 0.2، خبير 1.2، متوازن 0.7]+trumpLengthBias*0.45) + strength*(1+trumpHonorBias*0.08) + (مبادر وفيها آص: 0.4)؛ كسر التعادل بالطول ثم الاسم.
chooseLeadCard: مبتدئ highest أو lowest حسب leadRankBias؛ خبير: عقوبة كشف فراغ 4 (+1.2 تحكّم)؛ rankIntent=(مبادر +rank*0.12، حذر -rank*0.04، متوازن 0)+rank*leadRankBias؛ score=strength+طول*0.35+rankIntent-عقوبة.
chooseAiCard: إن lead فارغ → chooseLeadCard؛ إن الشريك يقود واللمّة محسومة وpreserveTrump → أقل ورقة غير طرنيب (وإلا الأقل)؛ إن توجد رابحة → الأعلى (مبادر أو ضغط فوز) وإلا الأدنى؛ خبير يتخلص من أعلى غير طرنيب؛ غير ذلك الأدنى.

## من personas.ts (معدلات دقيقة)
layaan ليان «الحارسة»: bidBias -0.45، length 0.1، honor 0.85، lead -0.12، preserveTrump=true، pressure=false.
faris فارس «الشريك الوفي»: bidBias 0، length 0.5، honor 0.4، lead -0.03، preserveTrump=true، pressure=false.
samar سامر «المبادر»: bidBias 0.6، length 0.8، honor 0.25، lead 0.18، preserveTrump=false، pressure=true.
rania رانيا «المستدرِجة»: bidBias 0.2، length 0.25، honor 0.65، lead -0.05، preserveTrump=true، pressure=false.
nader نادر «قارئ الطاولة»: bidBias 0.1، length 0.35، honor 0.7، lead 0.06، preserveTrump=true، pressure=false.
DEFAULT_OPPONENT_PERSONAS: {1: layaan, 2: faris, 3: samar} (seat1 يمين=الشريك؟ لا: seat1 يمين، seat2 أعلى=الشريك، seat3 يسار).

## من engine.ts (تفاصيل دقيقة)
RANKS 2-14؛ SUIT_ORDER: clubs 0, diamonds 1, hearts 2, spades 3؛ HIGH_CARD_WEIGHTS UI: 10→1, 11→2, 12→3, 13→4, 14→5.
teamOf=seat%2 (زوجي=فريقك 0، فردي=الخصم 1). seat0=أنت/مضيف، seat1 يمين، seat2 أعلى (شريك)، seat3 يسار.
dealPlayers: توزيع متتابع seat*13..+13 من رزمة مقلوبة Fisher-Yates؛ sortHand: نوع تصاعدي ثم رتبة تنازلية.
suitStrength UI: score=count*2+highScore+bonus(7+→4،5+→2)؛ bars=ceil(score/5) 1-5؛ label ≥18 قوي، ≥10 متوسط، أقل محدود.
cardLabel: 11=J,12=Q,13=K,14=A + رمز النوع.
legalCards: إن lead موجود يجب اتباعه وإلا كل اليد.
cardBeats: نفس النوع أعلى رتبة؛ مرشوم على غير مرشوم رابح؛ مرشوم على مرشوم أعلى رتبة؛ غير مرشوم من نوع القيادة على نوع آخر رابح.
resolveTrick: reduce بالترتيب مع cardBeats.
submitBid: currentPlayer فقط؛ minBid=highest(6)+1؛ آخر نشط بلا مزايدة ملزم 7؛ تمرير يعطل activeSeat؛ انتهاء الباقين بمزايِد → trump.
playCard: ترتيب التسلسل؛ إزالة الورقة؛ leadSuit من أول ورقة؛ بعد 4 → resolve → trickResult؛ بعد 13 لمّة → scoreRound: madeContract=nextTricks[bidderTeam]>=bid؛ bidderTeam +nextTricks أو -bid، opponentTeam +nextTricks.
advanceTrick: leader=winnerId.
createNetworkRound: كل اللاعبين human، أسماء من playerNames، كل الحسم يبقى في محرك المضيف.

## من local-room-context.tsx (بروتوكول دقيق)
PROTOCOL_VERSION=1. Status: idle|hosting|joining|ready|playing|error. Role: host|client|null.
randomToken: أبجدية "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" (بدون I O 0 1)؛ roomId 6، key 12.
createRoom (مضيف): Network.getIpAddressAsync؛ error إن "0.0.0.0"؛ details={host,port,roomId,key}؛ seat0 للمضيف؛ جلسات socket→seat.
رسائل: hello{name,protocol,roomId,key} → فحص roomId+key+protocol+اسم(≤20) وإلا error+destroy؛ availableSeat=أول seat≠0 غير مشغول؛ إن كامل أو matchStarted → error؛ welcome{seat,roomId}؛ lobby{members}.
joinRoom (عميل): حالة joining؛ timeout 30s → error عربي؛ hello عند onConnect؛ welcome→ready+localSeat؛ lobby→members(إن 4 متصلين→ready)؛ state→applyNetworkState+playing؛ error→error.
dispatchHostIntent: intent bid/trump/card → game.submitNetworkBid/selectNetworkTrump/playNetworkCard(seat,...).
broadcastGameState: host يرسل {type:state, state: stateForViewer(game.state, seat)} لكل socket عند كل تغير.
requestBid host → تنفيذ مباشر seat0؛ client → intent.
startRoomMatch: host فقط، يشترط 4 متصلين، startNetworkMatch(names).
leaveRoom: closingRoomRef لتمييز الانقطاع المتعمد.

## من local-room-transport.ts (نقل دقيق)
LOCAL_ROOM_PORT=42872. TCP: react-native-tcp-socket استيراد ديناميكي async مع كاش لكل منصة؛ web → null.
رسائل سطر-delimited JSON + "\n"؛ parseChunk بمخزن معلق لكل socket؛ رسائل بدون type تُتجاهل.
مضيف: listen 0.0.0.0 reuseAddress؛ noDelay+keepAlive؛ clients Set؛ broadcast/send.
عميل: connectTimeout=المهلة+1000ms؛ حماية TDZ بـ socketRef.
ZeroConf: نوع "tarneeb"/tcp/local، TXT {roomId, protocol:"1"}، implType DNSSD؛ discovered يفلتر عنوان IPv4 صالح فقط.

## من local-room-sheet.tsx (UI الشبكة)
Modes menu|create|host|join|scanner؛ كاميرا expo-camera + react-native-qrcode-svg؛ عد تنازلي 30s كل 250ms؛ انضمام ناجح توست 1600ms؛ خطأ "انتهت مهلة الاتصال..." + retry.

## من index.tsx (مراحل UI)
GameScreen router: phase home→Home، bidding→Bidding، trump→TrumpSelection، playing/trickResult→GameTable+TrickResultOverlay، roundResult→RoundResult (مع fallback ConnectionLostScreen عند انقطاع الشبكة أثناء playing).
TrickResultOverlay: auto-advance 1250ms. Bidding: player strip + قوس معاينة + strength indicator اختياري + شبكة طلب ديناميكية (7-13 مع minBid) + LAN routing. RoundResult: nextRound gating + replay/exit shortcuts + host/client.
Android fix: إزالة bottom edge من SafeAreaView داخل Bidding/TrumpSelection/RoundResult + insets.bottom padding على content.

## من local-room-utils.ts (دقيق)
LOCAL_ROOM_JOIN_TIMEOUT_MS=12000. QR format: tarneeb://local?host=...&port=...&room=...&key=... ؛ validate يفحص بادئة، IPv4 ≤255، منفذ 1024-65535، roomId/key.
stateForViewer: دوران المقاعد rotateSeat=(seat-viewerSeat+4)%4؛ يد اللاعب المحلي فقط (الأخرى فارغة)؛ activeSeats/bids/lead/plays/lastTrick تُدار seats؛ tricksWon/scores: [0]=فريق المشاهد؛ roundSummary bidderTeam remapped.
