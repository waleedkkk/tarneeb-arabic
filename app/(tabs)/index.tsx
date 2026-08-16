import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useGame } from "@/lib/tarneeb/game-context";
import { useLocalRoom } from "@/lib/tarneeb/local-room-context";
import { legalCards, suitName, suitStrength, suitSymbol } from "@/lib/tarneeb/engine";
import type { MatchState, Suit } from "@/lib/tarneeb/types";
import { GameTable, LastTrickBanner } from "@/components/tarneeb/table";
import { CurvedCardHand } from "@/components/tarneeb/card-fan";
import { LocalRoomSheet } from "@/components/tarneeb/local-room-sheet";

const SUITS: Suit[] = ["spades", "hearts", "diamonds", "clubs"];

export default function GameScreen() {
  const game = useGame();
  const room = useLocalRoom();
  const { state } = game;
  const [roomSheetVisible, setRoomSheetVisible] = useState(false);
  const isNetworkMatch = state.matchMode === "localRoom";

  if (isNetworkMatch && room.status === "error") return <ConnectionLostScreen message={room.error ?? "تعذر متابعة الغرفة المحلية."} onReturn={() => { void room.leaveRoom(); game.exitMatch(); }} />;
  if (state.phase === "home") return <><Home onStart={game.startMatch} onLocal={() => setRoomSheetVisible(true)} /><LocalRoomSheet visible={roomSheetVisible} onClose={() => setRoomSheetVisible(false)} /></>;
  if (state.phase === "bidding") return <Bidding />;
  if (state.phase === "trump") return <TrumpSelection />;
  if (state.phase === "roundResult") return <RoundResult />;

  return (
    <SafeAreaView edges={["top", "left", "right", "bottom"]} style={styles.safe}>
      <GameTable action={<MatchActions />} fanCurve={game.settings.cardFanCurve} cardBackPattern={game.settings.cardBackPattern} tableTextSize={game.settings.tableTextSize} opponentCardDensity={game.settings.opponentCardDensity} state={state} onCardPress={(cardId) => {
        const card = state.players[0].hand.find((item) => item.id === cardId);
        if (card && legalCards(state.players[0].hand, state.trick).some((item) => item.id === card.id)) {
          if (isNetworkMatch) room.requestCard(card.id);
          else game.playHumanCard(card);
        }
      }} />
      {state.phase === "trickResult" && <TrickResultOverlay state={state} onNext={isNetworkMatch ? room.requestNextTrick : game.nextTrick} canAdvance={!isNetworkMatch || room.role === "host"} />}
    </SafeAreaView>
  );
}

function TrickResultOverlay({ state, onNext, canAdvance }: { state: MatchState; onNext: () => void; canAdvance: boolean }) {
  const [isAdvancing, setIsAdvancing] = useState(false);
  const advancedTrickKey = useRef<string | null>(null);
  const trickKey = state.lastTrick ? `${state.lastTrick.winnerId}-${state.lastTrick.plays.map((play) => play.card.id).join("-")}` : null;

  useEffect(() => {
    setIsAdvancing(false);
    if (!trickKey || !canAdvance || advancedTrickKey.current === trickKey) return;
    const timer = setTimeout(() => {
      if (advancedTrickKey.current === trickKey) return;
      advancedTrickKey.current = trickKey;
      setIsAdvancing(true);
      onNext();
    }, 1250);
    return () => clearTimeout(timer);
  }, [canAdvance, onNext, trickKey]);

  return <View style={styles.resultOverlay}><LastTrickBanner state={state} /><Text style={styles.collectionWait}>{canAdvance ? (isAdvancing ? "تبدأ اللمّة التالية…" : "تبدأ اللمّة التالية تلقائيًا…") : "بانتظار المضيف لبدء اللمّة التالية…"}</Text></View>;
}

function Home({ onStart, onLocal }: { onStart: () => void; onLocal: () => void }) {
  return (
    <SafeAreaView edges={["top", "left", "right", "bottom"]} style={styles.homeSafe}>
      <View style={styles.homeAccentOne} /><View style={styles.homeAccentTwo} />
      <View style={styles.homeContent}>
        <View style={styles.logoMark}><Text style={styles.logoMarkText}>ط</Text></View>
        <Text style={styles.title}>طرنيب</Text>
        <Text style={styles.subtitle}>اجمع اللمم، ارفع الطلب، وكن أول من يصل إلى الهدف.</Text>
        <View style={styles.featureGrid}>
          <Feature label="4 لاعبين" text="فريقان متقابلان" />
          <Feature label="محلي" text="دون اتصال" />
          <Feature label="هدف 31" text="قابل للتغيير" />
        </View>
        <View style={styles.homeSpacer} />
        <PrimaryButton label="ابدأ مباراة جديدة" onPress={onStart} large />
        <Pressable onPress={onLocal} style={({ pressed }) => [styles.localMatchButton, pressed && styles.buttonPressed]}><Text style={styles.localMatchButtonText}>لعب محلي عبر الشبكة</Text><Text style={styles.localMatchButtonHint}>4 أجهزة · دون إنترنت</Text></Pressable>
        <Text style={styles.homeFootnote}>خصوم آليون بثلاثة أنماط لعب وإعدادات محفوظة على جهازك.</Text>
      </View>
    </SafeAreaView>
  );
}

function ConnectionLostScreen({ message, onReturn }: { message: string; onReturn: () => void }) {
  return <SafeAreaView edges={["top", "left", "right", "bottom"]} style={styles.safe}><View style={styles.centerPage}><Text style={styles.connectionKicker}>الغرفة المحلية</Text><Text style={styles.pageTitle}>انقطع الاتصال</Text><Text style={styles.connectionMessage}>{message}</Text><PrimaryButton label="العودة للرئيسية" onPress={onReturn} /></View></SafeAreaView>;
}

function MatchActions() {
  const game = useGame();
  const room = useLocalRoom();
  const [visible, setVisible] = useState(false);
  const [confirmation, setConfirmation] = useState<"restart" | "exit" | null>(null);
  const isRoomMatch = game.state.matchMode === "localRoom";
  const canRestart = !isRoomMatch || room.role === "host";
  const isRestartConfirmation = confirmation === "restart";

  const close = () => {
    setConfirmation(null);
    setVisible(false);
  };
  const restart = () => {
    close();
    if (isRoomMatch) room.startRoomMatch();
    else game.startMatch();
  };
  const exit = () => {
    close();
    if (isRoomMatch) {
      void room.leaveRoom().finally(() => game.exitMatch());
      return;
    }
    game.exitMatch();
  };

  return <><Pressable accessibilityRole="button" accessibilityLabel="خيارات المباراة" hitSlop={8} onPress={() => setVisible(true)} style={({ pressed }) => [styles.matchActionsButton, pressed && styles.matchActionsButtonPressed]}><Text style={styles.matchActionsButtonText}>⋮</Text></Pressable><Modal transparent visible={visible} animationType="fade" onRequestClose={close}><View style={styles.gameMenuModal}><Pressable accessibilityLabel="إغلاق خيارات المباراة" style={styles.gameMenuBackdrop} onPress={() => confirmation ? setConfirmation(null) : close()} />{confirmation ? <View style={styles.gameMenuSheet}><View style={styles.gameMenuHandle} /><Text style={styles.gameMenuTitle}>{isRestartConfirmation ? "إعادة بدء المباراة؟" : "العودة للرئيسية؟"}</Text><Text style={styles.gameMenuDescription}>{isRestartConfirmation ? (isRoomMatch ? "ستبدأ مباراة جديدة لجميع لاعبي الغرفة وستعود النقاط إلى الصفر." : "سيجري توزيع أوراق جديدة وستعود نقاط الفريقين إلى الصفر.") : (isRoomMatch ? "ستغادر الغرفة المحلية ولن تستطيع متابعة هذه المباراة من هذا الجهاز." : "ستنهي المباراة الحالية وسيُحذف التقدم المحفوظ لهذه المباراة.")}</Text><View style={styles.confirmationButtons}><Pressable onPress={() => setConfirmation(null)} style={({ pressed }) => [styles.confirmationCancel, pressed && styles.buttonPressed]}><Text style={styles.confirmationCancelText}>إلغاء</Text></Pressable><Pressable onPress={isRestartConfirmation ? restart : exit} style={({ pressed }) => [styles.confirmationDestructive, pressed && styles.buttonPressed]}><Text style={styles.confirmationDestructiveText}>{isRestartConfirmation ? "إعادة البدء" : "إنهاء المباراة"}</Text></Pressable></View></View> : <View style={styles.gameMenuSheet}><View style={styles.gameMenuHandle} /><Text style={styles.gameMenuTitle}>خيارات المباراة</Text><Text style={styles.gameMenuDescription}>تحكم في المباراة الحالية من دون مغادرة الطاولة.</Text>{canRestart ? <Pressable accessibilityRole="button" accessibilityLabel="إعادة بدء المباراة" onPress={() => setConfirmation("restart")} style={({ pressed }) => [styles.matchAction, styles.matchActionRestart, pressed && styles.buttonPressed]}><View style={styles.matchActionIcon}><Text style={styles.matchActionIconText}>↻</Text></View><View style={styles.matchActionContent}><Text style={styles.matchActionTitle}>إعادة بدء المباراة</Text><Text style={styles.matchActionSubtitle}>توزيع جديد وتصفير النقاط</Text></View></Pressable> : <View style={[styles.matchAction, styles.matchActionDisabled]}><View style={styles.matchActionIcon}><Text style={styles.matchActionIconText}>↻</Text></View><View style={styles.matchActionContent}><Text style={styles.matchActionTitle}>إعادة بدء المباراة</Text><Text style={styles.matchActionSubtitle}>متاح للمضيف فقط</Text></View></View>}<Pressable accessibilityRole="button" accessibilityLabel="إنهاء المباراة والعودة للرئيسية" onPress={() => setConfirmation("exit")} style={({ pressed }) => [styles.matchAction, styles.matchActionExit, pressed && styles.buttonPressed]}><View style={styles.matchActionIcon}><Text style={styles.matchActionIconText}>⌂</Text></View><View style={styles.matchActionContent}><Text style={styles.matchActionTitle}>إنهاء المباراة</Text><Text style={styles.matchActionSubtitle}>العودة إلى الشاشة الرئيسية</Text></View></Pressable><Pressable onPress={close} style={({ pressed }) => [styles.gameMenuCancel, pressed && styles.buttonPressed]}><Text style={styles.gameMenuCancelText}>إلغاء</Text></Pressable></View>}</View></Modal></>;
}

function Feature({ label, text }: { label: string; text: string }) {
  return <View style={styles.feature}><Text style={styles.featureLabel}>{label}</Text><Text style={styles.featureText}>{text}</Text></View>;
}

function Bidding() {
  const game = useGame();
  const room = useLocalRoom();
  const { state } = game;
  const highest = state.bidding.highestBid;
  const minBid = (highest ?? 6) + 1;
  const isHumanTurn = state.bidding.currentPlayer === 0;
  const strengths = SUITS.map((suit) => suitStrength(state.players[0].hand, suit));
  const strongest = [...strengths].sort((a, b) => b.score - a.score)[0];
  return (
    <SafeAreaView edges={["top", "left", "right", "bottom"]} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <RoundHeader round={state.round} label="المزايدة" action={<MatchActions />} />
        <View style={styles.panel}>
          <Text style={styles.panelEyebrow}>العرض الأعلى</Text>
          <Text style={styles.bidValue}>{highest ?? "—"}</Text>
          <Text style={styles.panelText}>{highest === null ? "لم يُسجل عرض بعد" : `صاحب الطلب: ${state.players[state.bidding.highestBidder!].name}`}</Text>
        </View>
        <View style={styles.playerStrip}>{state.players.map((player) => <View key={player.id} style={[styles.playerChip, state.bidding.currentPlayer === player.id && styles.playerChipActive, !state.bidding.activeSeats[player.id] && styles.playerChipPassed]}><Text style={styles.playerChipText}>{player.name}</Text><Text style={styles.playerChipSub}>{state.bidding.activeSeats[player.id] ? (state.bidding.currentPlayer === player.id ? "دوره" : "بالانتظار") : "مرّ"}</Text></View>)}</View>
        <View style={styles.biddingHand} accessibilityLabel="أوراقك الحالية للمزايدة">
          <View style={styles.biddingHandHeader}><View><Text style={styles.biddingHandTitle}>أوراقك</Text><Text style={styles.biddingHandHint}>اسحب لمراجعة جميع الأوراق قبل الطلب</Text></View><Text style={styles.biddingHandCount}>{state.players[0].hand.length} ورقة</Text></View>
          <CurvedCardHand cards={state.players[0].hand} curveStrength={game.settings.cardFanCurve} cardBackPattern={game.settings.cardBackPattern} accessibilityLabel="أوراقك الحالية مرتبة ضمن قوس متساوٍ للمزايدة" />
        </View>
        {game.settings.showStrengthIndicator && <View style={styles.strengthPanel} accessibilityLabel="مؤشر قوة أنواع أوراقك">
          <View style={styles.strengthHeader}><View><View style={styles.strengthTitleRow}><Text style={styles.strengthTitle}>قوة الأنواع</Text><StrengthInfoButton /></View><Text style={styles.strengthDescription}>تُحسب من عدد الأوراق وA وK وQ وJ و10</Text></View><Text style={styles.strengthSuggestion}>الأقوى: {suitName(strongest.suit)}</Text></View>
          <View style={styles.strengthGrid}>{strengths.map((strength) => <SuitStrengthCard key={strength.suit} {...strength} />)}</View>
        </View>}
        <Text style={styles.sectionTitle}>{isHumanTurn ? "اختر عرضك" : "يفكر الخصوم في المزايدة…"}</Text>
        <Text style={styles.sectionText}>{isHumanTurn ? `يمكنك طلب ${minBid} أو أكثر.` : "ستظهر نتيجتهم بعد لحظات."}</Text>
        <View style={styles.bidGrid}>{Array.from({ length: 13 - minBid + 1 }, (_, index) => minBid + index).map((bid) => <NumberButton key={bid} label={String(bid)} disabled={!isHumanTurn} onPress={() => state.matchMode === "localRoom" ? room.requestBid(bid) : game.submitHumanBid(bid)} />)}</View>
        <Pressable disabled={!isHumanTurn} onPress={() => state.matchMode === "localRoom" ? room.requestBid(null) : game.submitHumanBid(null)} style={({ pressed }) => [styles.secondaryButton, pressed && isHumanTurn && styles.buttonPressed, !isHumanTurn && styles.buttonDisabled]}><Text style={styles.secondaryButtonText}>مرّر</Text></Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function TrumpSelection() {
  const game = useGame();
  const room = useLocalRoom();
  const { state } = game;
  const humanIsBidder = state.bidding.highestBidder === 0;
  const strengths = SUITS.map((suit) => suitStrength(state.players[0].hand, suit));
  return (
    <SafeAreaView edges={["top", "left", "right", "bottom"]} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.trumpContent}>
        <View style={styles.trumpTopBar}><MatchActions /></View>
        <Text style={styles.kicker}>الطلب {state.bidding.highestBid}</Text>
        <Text style={styles.pageTitle}>{humanIsBidder ? "اختر الطرنيب" : "يختار الخصم الطرنيب"}</Text>
        <Text style={styles.pageSubtitle}>{humanIsBidder ? "حدد النوع الذي يمنح فريقك أفضل فرصة للفوز باللمم." : `${state.players[state.bidding.highestBidder!].name} يراجع أوراقه…`}</Text>
        {humanIsBidder && game.settings.showStrengthIndicator && <View style={styles.trumpStrengthPanel}><View style={styles.strengthTitleRow}><Text style={styles.trumpStrengthTitle}>مؤشر قوة أوراقك</Text><StrengthInfoButton /></View><View style={styles.strengthGrid}>{strengths.map((strength) => <SuitStrengthCard key={strength.suit} {...strength} />)}</View></View>}
        <View style={styles.suitGrid}>{SUITS.map((suit) => <Pressable key={suit} disabled={!humanIsBidder} onPress={() => state.matchMode === "localRoom" ? room.requestTrump(suit) : game.selectHumanTrump(suit)} style={({ pressed }) => [styles.suitButton, pressed && humanIsBidder && styles.buttonPressed, !humanIsBidder && styles.buttonDisabled]}><Text style={[styles.suitSymbol, (suit === "hearts" || suit === "diamonds") && styles.suitRed]}>{suitSymbol(suit)}</Text><Text style={styles.suitName}>{suitName(suit)}</Text></Pressable>)}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

function RoundResult() {
  const game = useGame();
  const room = useLocalRoom();
  const { state } = game;
  const summary = state.roundSummary!;
  const matchWinner = state.scores[0] >= game.settings.targetScore ? "فريقك" : state.scores[1] >= game.settings.targetScore ? "الفريق المنافس" : null;
  const [exitConfirmationVisible, setExitConfirmationVisible] = useState(false);
  const isRoomMatch = state.matchMode === "localRoom";
  const canRestart = !isRoomMatch || room.role === "host";
  const restart = () => {
    if (isRoomMatch) room.startRoomMatch();
    else game.startMatch();
  };
  const exit = () => {
    setExitConfirmationVisible(false);
    if (isRoomMatch) {
      void room.leaveRoom().finally(() => game.exitMatch());
      return;
    }
    game.exitMatch();
  };
  return (
    <SafeAreaView edges={["top", "left", "right", "bottom"]} style={styles.safe}>
      <View style={styles.centerPage}>
        <Text style={styles.kicker}>نهاية الجولة {state.round}</Text>
        <Text style={styles.pageTitle}>{matchWinner ? `فاز ${matchWinner} بالمباراة` : summary.madeContract ? "تم تحقيق الطلب" : "لم يتحقق الطلب"}</Text>
        <Text style={styles.pageSubtitle}>كان الطلب {summary.bid}، وحصل فريقك على {summary.roundTricks[0]} لمم مقابل {summary.roundTricks[1]} للخصم.</Text>
        <View style={styles.finalScore}><ScoreBlock label="فريقك" score={state.scores[0]} change={summary.scoreChange[0]} /><View style={styles.scoreDivider} /><ScoreBlock label="الخصم" score={state.scores[1]} change={summary.scoreChange[1]} /></View>
        {!matchWinner && (isRoomMatch && room.role !== "host" ? <Text style={styles.collectionWait}>بانتظار المضيف للمتابعة</Text> : <PrimaryButton label="الجولة التالية" onPress={isRoomMatch ? room.requestNextRound : game.nextRound} />)}
        <View style={styles.roundShortcutRow}>
          <Pressable accessibilityRole="button" accessibilityLabel="إعادة اللعب مباشرة" disabled={!canRestart} onPress={restart} style={({ pressed }) => [styles.roundShortcut, styles.roundShortcutReplay, pressed && canRestart && styles.buttonPressed, !canRestart && styles.roundShortcutDisabled]}><Text style={styles.roundShortcutIcon}>↻</Text><View><Text style={styles.roundShortcutTitle}>إعادة اللعب</Text><Text style={styles.roundShortcutHint}>{canRestart ? "مباراة جديدة فورًا" : "للمضيف فقط"}</Text></View></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="خروج سريع من المباراة" onPress={() => setExitConfirmationVisible(true)} style={({ pressed }) => [styles.roundShortcut, styles.roundShortcutExit, pressed && styles.buttonPressed]}><Text style={styles.roundShortcutIcon}>⌂</Text><View><Text style={styles.roundShortcutTitle}>خروج سريع</Text><Text style={styles.roundShortcutHint}>العودة للرئيسية</Text></View></Pressable>
        </View>
      </View>
      <Modal transparent visible={exitConfirmationVisible} animationType="fade" onRequestClose={() => setExitConfirmationVisible(false)}><View style={styles.gameMenuModal}><Pressable accessibilityLabel="إلغاء الخروج" style={styles.gameMenuBackdrop} onPress={() => setExitConfirmationVisible(false)} /><View style={styles.gameMenuSheet}><View style={styles.gameMenuHandle} /><Text style={styles.gameMenuTitle}>إنهاء المباراة؟</Text><Text style={styles.gameMenuDescription}>{isRoomMatch ? "ستغادر الغرفة المحلية ولن تستطيع متابعة هذه المباراة من هذا الجهاز." : "ستنهي المباراة الحالية وسيُحذف التقدم المحفوظ لهذه المباراة."}</Text><View style={styles.confirmationButtons}><Pressable onPress={() => setExitConfirmationVisible(false)} style={({ pressed }) => [styles.confirmationCancel, pressed && styles.buttonPressed]}><Text style={styles.confirmationCancelText}>إلغاء</Text></Pressable><Pressable onPress={exit} style={({ pressed }) => [styles.confirmationDestructive, pressed && styles.buttonPressed]}><Text style={styles.confirmationDestructiveText}>إنهاء المباراة</Text></Pressable></View></View></View></Modal>
    </SafeAreaView>
  );
}

function RoundHeader({ round, label, action }: { round: number; label: string; action?: ReactNode }) {
  return <View style={styles.roundHeader}><Text style={styles.roundBrand}>طرنيب</Text><View><Text style={styles.roundNumber}>الجولة {round}</Text><Text style={styles.roundLabel}>{label}</Text></View>{action}</View>;
}

function ScoreBlock({ label, score, change }: { label: string; score: number; change: number }) {
  return <View style={styles.scoreBlock}><Text style={styles.scoreBlockLabel}>{label}</Text><Text style={styles.scoreBlockValue}>{score}</Text><Text style={[styles.scoreChange, change < 0 && styles.negativeChange]}>{change > 0 ? `+${change}` : change}</Text></View>;
}

function PrimaryButton({ label, onPress, large = false }: { label: string; onPress: () => void; large?: boolean }) {
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.primaryButton, large && styles.primaryButtonLarge, pressed && styles.buttonPressed]}><Text style={styles.primaryButtonText}>{label}</Text></Pressable>;
}

function NumberButton({ label, disabled, onPress }: { label: string; disabled: boolean; onPress: () => void }) {
  return <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.numberButton, pressed && !disabled && styles.buttonPressed, disabled && styles.buttonDisabled]}><Text style={styles.numberText}>{label}</Text></Pressable>;
}

function StrengthInfoButton() {
  const [visible, setVisible] = useState(false);
  return <><Pressable accessibilityRole="button" accessibilityLabel="شرح احتساب قوة الأنواع" onPress={() => setVisible(true)} style={({ pressed }) => [styles.infoButton, pressed && styles.infoButtonPressed]}><Text style={styles.infoButtonText}>i</Text></Pressable><Modal transparent visible={visible} animationType="fade" onRequestClose={() => setVisible(false)}><View style={styles.infoModal}><Pressable accessibilityLabel="إغلاق الشرح" style={styles.infoBackdrop} onPress={() => setVisible(false)} /><View style={styles.infoSheet}><View style={styles.infoSheetHeader}><View><Text style={styles.infoTitle}>كيف نحسب قوة النوع؟</Text><Text style={styles.infoIntro}>هذا مؤشر إرشادي يساعدك على مقارنة أنواع يدك قبل اختيار الطرنيب.</Text></View><Pressable accessibilityLabel="إغلاق" onPress={() => setVisible(false)} style={styles.infoClose}><Text style={styles.infoCloseText}>×</Text></Pressable></View><View style={styles.infoSection}><Text style={styles.infoSectionTitle}>أولًا: عدد الأوراق</Text><Text style={styles.infoBody}>كل ورقة من النوع تضيف نقطتين. ويُضاف +2 عند امتلاك 5 أو 6 أوراق، و+4 عند امتلاك 7 أوراق أو أكثر.</Text></View><View style={styles.infoSection}><Text style={styles.infoSectionTitle}>ثانيًا: الأوراق العالية</Text><View style={styles.rankPoints}><Text style={styles.rankPoint}>A = 5</Text><Text style={styles.rankPoint}>K = 4</Text><Text style={styles.rankPoint}>Q = 3</Text><Text style={styles.rankPoint}>J = 2</Text><Text style={styles.rankPoint}>10 = 1</Text></View></View><View style={styles.infoLevels}><Text style={styles.infoLevelsTitle}>المستويات</Text><Text style={styles.infoLevel}>محدود: أقل من 10</Text><Text style={styles.infoLevel}>متوسط: من 10 إلى 17</Text><Text style={styles.infoLevel}>قوي: 18 فأكثر</Text></View><Text style={styles.infoFootnote}>الأشرطة الخمسة تلخص إجمالي القوة بصريًا؛ وهي ليست ضمانًا للفوز، بل أداة للمقارنة بين الأنواع.</Text><Pressable onPress={() => setVisible(false)} style={({ pressed }) => [styles.infoDone, pressed && styles.buttonPressed]}><Text style={styles.infoDoneText}>فهمت</Text></Pressable></View></View></Modal></>;
}

function SuitStrengthCard({ suit, count, highCount, bars, label }: ReturnType<typeof suitStrength>) {
  const red = suit === "hearts" || suit === "diamonds";
  return <View style={styles.strengthCard}><View style={styles.strengthCardTop}><Text style={[styles.strengthSuit, red && styles.strengthSuitRed]}>{suitSymbol(suit)}</Text><Text style={styles.strengthSuitName}>{suitName(suit)}</Text><Text style={[styles.strengthLabel, label === "قوي" && styles.strengthLabelStrong, label === "محدود" && styles.strengthLabelLow]}>{label}</Text></View><View style={styles.strengthBars}>{Array.from({ length: 5 }, (_, index) => <View key={index} style={[styles.strengthBar, index < bars && styles.strengthBarActive]} />)}</View><Text style={styles.strengthDetail}>{count} أوراق · {highCount} عالية</Text></View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0E3B2E", direction: "ltr" },
  homeSafe: { flex: 1, backgroundColor: "#0E3B2E", overflow: "hidden", direction: "ltr" },
  homeContent: { flex: 1, paddingHorizontal: 24, paddingTop: 30, paddingBottom: 18, alignItems: "center" },
  homeAccentOne: { position: "absolute", width: 300, height: 300, borderRadius: 150, backgroundColor: "#16624A", right: -120, top: -120 },
  homeAccentTwo: { position: "absolute", width: 230, height: 230, borderRadius: 115, borderWidth: 1, borderColor: "rgba(227,179,65,0.35)", left: -90, bottom: 70 },
  logoMark: { width: 88, height: 88, borderRadius: 28, backgroundColor: "#E3B341", alignItems: "center", justifyContent: "center", borderWidth: 5, borderColor: "#FFF8E7", shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 12, elevation: 8 },
  logoMarkText: { color: "#0E3B2E", fontSize: 50, fontWeight: "900", lineHeight: 58 },
  title: { color: "#FFF8E7", fontSize: 42, fontWeight: "900", marginTop: 16, writingDirection: "rtl" },
  subtitle: { color: "#D9EEE4", fontSize: 16, lineHeight: 25, textAlign: "center", marginTop: 6, maxWidth: 320, writingDirection: "rtl" },
  featureGrid: { flexDirection: "row-reverse", gap: 8, marginTop: 34 },
  feature: { width: 95, minHeight: 73, borderRadius: 16, padding: 10, backgroundColor: "rgba(255,248,231,0.09)", borderWidth: 1, borderColor: "rgba(255,248,231,0.16)", alignItems: "center", justifyContent: "center" },
  featureLabel: { color: "#F5D889", fontSize: 14, fontWeight: "800", writingDirection: "rtl" },
  featureText: { color: "#D9EEE4", fontSize: 11, marginTop: 4, textAlign: "center", writingDirection: "rtl" },
  homeSpacer: { height: 42 },
  homeFootnote: { color: "#B4D6C7", fontSize: 12, textAlign: "center", lineHeight: 18, marginTop: 14, writingDirection: "rtl" },
  primaryButton: { minWidth: 240, minHeight: 52, paddingHorizontal: 18, borderRadius: 16, backgroundColor: "#E3B341", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 5, elevation: 3 },
  primaryButtonLarge: { alignSelf: "stretch" },
  primaryButtonText: { color: "#17211D", fontSize: 16, fontWeight: "900", writingDirection: "rtl" },
  buttonPressed: {
    transform: [{ scale: 0.965 }],
    opacity: 0.82,
    elevation: 1,
    shadowOpacity: 0.06,
    shadowRadius: 1,
    shadowOffset: { width: 0, height: 1 },
  },
  buttonDisabled: { opacity: 0.45 },
  scrollContent: { padding: 20, paddingBottom: 34 },
  roundHeader: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  roundBrand: { color: "#E3B341", fontSize: 25, fontWeight: "900", writingDirection: "rtl" },
  roundNumber: { color: "#FFF8E7", textAlign: "right", fontWeight: "800", writingDirection: "rtl" },
  roundLabel: { color: "#B4D6C7", textAlign: "right", fontSize: 12, writingDirection: "rtl" },
  panel: { backgroundColor: "#FFF8E7", borderRadius: 24, padding: 22, alignItems: "center" },
  panelEyebrow: { color: "#52635C", fontSize: 13, writingDirection: "rtl" },
  bidValue: { color: "#0E3B2E", fontSize: 58, fontWeight: "900", lineHeight: 64, marginVertical: 4 },
  panelText: { color: "#52635C", fontSize: 14, writingDirection: "rtl" },
  playerStrip: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 8, marginTop: 16, justifyContent: "center" },
  playerChip: { width: "47%", minHeight: 58, padding: 8, borderRadius: 14, backgroundColor: "#16624A", borderWidth: 1, borderColor: "transparent", alignItems: "center" },
  playerChipActive: { borderColor: "#38BDF8", backgroundColor: "#1A7358" },
  playerChipPassed: { opacity: 0.45 },
  playerChipText: { color: "#FFF8E7", fontWeight: "800", writingDirection: "rtl" },
  playerChipSub: { color: "#B4D6C7", fontSize: 11, marginTop: 2, writingDirection: "rtl" },
  biddingHand: { backgroundColor: "rgba(255,248,231,0.08)", borderWidth: 1, borderColor: "rgba(255,248,231,0.16)", borderRadius: 20, marginTop: 18, paddingVertical: 12 },
  biddingHandHeader: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, marginBottom: 9 },
  biddingHandTitle: { color: "#FFF8E7", fontSize: 16, fontWeight: "900", textAlign: "right", writingDirection: "rtl" },
  biddingHandHint: { color: "#B4D6C7", fontSize: 11, marginTop: 2, textAlign: "right", writingDirection: "rtl" },
  biddingHandCount: { color: "#F5D889", fontSize: 12, fontWeight: "800", writingDirection: "rtl" },
  strengthPanel: { backgroundColor: "rgba(56,189,248,0.09)", borderWidth: 1, borderColor: "rgba(56,189,248,0.28)", borderRadius: 20, marginTop: 14, padding: 14 },
  strengthHeader: { flexDirection: "row-reverse", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 12 },
  strengthTitleRow: { flexDirection: "row-reverse", alignItems: "center", alignSelf: "flex-start", gap: 6 },
  strengthTitle: { color: "#FFF8E7", fontSize: 16, fontWeight: "900", textAlign: "right", writingDirection: "rtl" },
  strengthDescription: { color: "#B4D6C7", fontSize: 10, marginTop: 3, textAlign: "right", writingDirection: "rtl" },
  strengthSuggestion: { color: "#8DDBFF", backgroundColor: "rgba(56,189,248,0.15)", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 5, fontSize: 11, fontWeight: "800", textAlign: "center", writingDirection: "rtl" },
  strengthGrid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 },
  strengthCard: { width: "48%", backgroundColor: "rgba(14,59,46,0.48)", borderRadius: 13, padding: 9, borderWidth: 1, borderColor: "rgba(255,248,231,0.11)" },
  strengthCardTop: { flexDirection: "row-reverse", alignItems: "center", gap: 5 },
  strengthSuit: { color: "#FFF8E7", fontSize: 18, fontWeight: "900" },
  strengthSuitRed: { color: "#F59892" },
  strengthSuitName: { flex: 1, color: "#D9EEE4", fontSize: 12, fontWeight: "800", textAlign: "right", writingDirection: "rtl" },
  strengthLabel: { color: "#F5D889", fontSize: 10, fontWeight: "800", writingDirection: "rtl" },
  strengthLabelStrong: { color: "#6EE7B7" },
  strengthLabelLow: { color: "#B4D6C7" },
  strengthBars: { flexDirection: "row-reverse", gap: 3, marginTop: 9 },
  strengthBar: { flex: 1, height: 5, borderRadius: 3, backgroundColor: "rgba(255,248,231,0.15)" },
  strengthBarActive: { backgroundColor: "#38BDF8" },
  strengthDetail: { color: "#B4D6C7", fontSize: 10, marginTop: 6, textAlign: "right", writingDirection: "rtl" },
  infoButton: { width: 22, height: 22, borderRadius: 11, borderWidth: 1, borderColor: "#8DDBFF", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(56,189,248,0.13)" },
  infoButtonPressed: { opacity: 0.72, transform: [{ scale: 0.94 }] },
  infoButtonText: { color: "#8DDBFF", fontSize: 14, fontWeight: "900", lineHeight: 17 },
  infoModal: { flex: 1, justifyContent: "center", padding: 20 },
  infoBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(3,20,14,0.78)" },
  infoSheet: { backgroundColor: "#FFF8E7", borderRadius: 24, padding: 20, maxWidth: 420, alignSelf: "center", shadowColor: "#000", shadowOpacity: 0.35, shadowRadius: 16, elevation: 10 },
  infoSheetHeader: { flexDirection: "row-reverse", gap: 14, justifyContent: "space-between", alignItems: "flex-start" },
  infoTitle: { color: "#0E3B2E", fontSize: 20, fontWeight: "900", textAlign: "right", writingDirection: "rtl" },
  infoIntro: { color: "#52635C", fontSize: 12, lineHeight: 18, marginTop: 4, textAlign: "right", writingDirection: "rtl", maxWidth: 285 },
  infoClose: { width: 30, height: 30, borderRadius: 15, backgroundColor: "#E5E7EB", alignItems: "center", justifyContent: "center" },
  infoCloseText: { color: "#52635C", fontSize: 24, lineHeight: 26 },
  infoSection: { borderTopWidth: 1, borderTopColor: "#E7E0CE", paddingTop: 12, marginTop: 12 },
  infoSectionTitle: { color: "#0E3B2E", fontSize: 14, fontWeight: "900", textAlign: "right", writingDirection: "rtl" },
  infoBody: { color: "#52635C", fontSize: 12, lineHeight: 19, textAlign: "right", marginTop: 4, writingDirection: "rtl" },
  rankPoints: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 6, marginTop: 8 },
  rankPoint: { color: "#0E3B2E", backgroundColor: "#E6F4FE", borderRadius: 9, paddingHorizontal: 8, paddingVertical: 4, fontSize: 12, fontWeight: "800" },
  infoLevels: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 6, alignItems: "center", borderTopWidth: 1, borderTopColor: "#E7E0CE", paddingTop: 12, marginTop: 12 },
  infoLevelsTitle: { color: "#0E3B2E", fontSize: 13, fontWeight: "900", writingDirection: "rtl", marginLeft: 2 },
  infoLevel: { color: "#52635C", backgroundColor: "#F2ECDD", borderRadius: 9, paddingHorizontal: 7, paddingVertical: 4, fontSize: 10, fontWeight: "800", writingDirection: "rtl" },
  infoFootnote: { color: "#52635C", fontSize: 11, lineHeight: 17, textAlign: "right", marginTop: 14, writingDirection: "rtl" },
  infoDone: { minHeight: 44, borderRadius: 13, backgroundColor: "#0E3B2E", marginTop: 16, alignItems: "center", justifyContent: "center" },
  infoDoneText: { color: "#FFF8E7", fontSize: 14, fontWeight: "900", writingDirection: "rtl" },
  sectionTitle: { color: "#FFF8E7", fontSize: 22, fontWeight: "900", textAlign: "right", marginTop: 28, writingDirection: "rtl" },
  sectionText: { color: "#B4D6C7", textAlign: "right", fontSize: 13, marginTop: 4, writingDirection: "rtl" },
  bidGrid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 9, marginTop: 18, justifyContent: "center" },
  numberButton: { width: 59, height: 52, borderRadius: 14, backgroundColor: "#FFF8E7", alignItems: "center", justifyContent: "center" },
  numberText: { color: "#0E3B2E", fontSize: 21, fontWeight: "900" },
  secondaryButton: { minHeight: 50, borderRadius: 14, borderWidth: 1, borderColor: "#B4D6C7", alignItems: "center", justifyContent: "center", marginTop: 16 },
  secondaryButtonText: { color: "#FFF8E7", fontSize: 15, fontWeight: "800", writingDirection: "rtl" },
  centerPage: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  trumpContent: { flexGrow: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 20, paddingVertical: 24 },
  kicker: { color: "#E3B341", fontSize: 14, fontWeight: "800", writingDirection: "rtl" },
  pageTitle: { color: "#FFF8E7", fontSize: 31, fontWeight: "900", marginTop: 10, textAlign: "center", writingDirection: "rtl" },
  pageSubtitle: { color: "#B4D6C7", fontSize: 15, lineHeight: 23, textAlign: "center", marginTop: 8, writingDirection: "rtl" },
  suitGrid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 12, marginTop: 34, justifyContent: "center" },
  trumpStrengthPanel: { alignSelf: "stretch", backgroundColor: "rgba(56,189,248,0.09)", borderWidth: 1, borderColor: "rgba(56,189,248,0.28)", borderRadius: 20, padding: 14, marginTop: 18 },
  trumpStrengthTitle: { color: "#FFF8E7", fontSize: 15, fontWeight: "900", textAlign: "right", marginBottom: 10, writingDirection: "rtl" },
  suitButton: { width: 134, height: 124, borderRadius: 22, backgroundColor: "#FFF8E7", alignItems: "center", justifyContent: "center" },
  suitSymbol: { color: "#17211D", fontSize: 44, fontWeight: "900", lineHeight: 48 },
  suitRed: { color: "#C9413A" },
  suitName: { color: "#52635C", marginTop: 3, fontSize: 14, fontWeight: "800", writingDirection: "rtl" },
  finalScore: { flexDirection: "row-reverse", alignItems: "center", backgroundColor: "rgba(255,248,231,0.1)", borderRadius: 24, padding: 20, marginVertical: 30, minWidth: 270 },
  scoreBlock: { flex: 1, alignItems: "center" },
  scoreBlockLabel: { color: "#B4D6C7", fontSize: 13, writingDirection: "rtl" },
  scoreBlockValue: { color: "#FFF8E7", fontSize: 39, fontWeight: "900", marginTop: 2 },
  scoreChange: { color: "#6EE7B7", fontSize: 14, fontWeight: "800" },
  negativeChange: { color: "#F59892" },
  scoreDivider: { width: 1, height: 70, backgroundColor: "rgba(255,248,231,0.2)" },
  exitButton: { padding: 12, marginTop: 12 },
  exitText: { color: "#B4D6C7", fontSize: 14, writingDirection: "rtl" },
  resultOverlay: { position: "absolute", left: 0, right: 0, bottom: 2, alignItems: "center" },
  collectionWait: { color: "#D9EEE4", fontSize: 13, fontWeight: "800", marginBottom: 18, writingDirection: "rtl" },
  localMatchButton: { width: "100%", marginTop: 12, minHeight: 58, borderRadius: 17, borderWidth: 1, borderColor: "rgba(227,179,65,0.8)", backgroundColor: "rgba(255,248,231,0.08)", alignItems: "center", justifyContent: "center" },
  localMatchButtonText: { color: "#F5D889", fontSize: 16, fontWeight: "900", writingDirection: "rtl" },
  localMatchButtonHint: { color: "#B4D6C7", fontSize: 11, marginTop: 3, writingDirection: "rtl" },
  connectionKicker: { color: "#E3B341", fontSize: 14, fontWeight: "800", writingDirection: "rtl" },
  connectionMessage: { color: "#B4D6C7", fontSize: 15, lineHeight: 23, textAlign: "center", marginTop: 10, marginBottom: 30, writingDirection: "rtl", maxWidth: 280 },
  roundShortcutRow: { flexDirection: "row-reverse", gap: 10, width: "100%", maxWidth: 360, marginTop: 14 },
  roundShortcut: { flex: 1, minHeight: 70, borderRadius: 17, padding: 11, flexDirection: "row-reverse", alignItems: "center", justifyContent: "flex-start", gap: 8, borderWidth: 1 },
  roundShortcutReplay: { backgroundColor: "rgba(227,179,65,0.18)", borderColor: "rgba(227,179,65,0.7)" },
  roundShortcutExit: { backgroundColor: "rgba(255,248,231,0.08)", borderColor: "rgba(255,248,231,0.32)" },
  roundShortcutDisabled: { opacity: 0.5 },
  roundShortcutIcon: { color: "#F5D889", fontSize: 25, fontWeight: "900", lineHeight: 28 },
  roundShortcutTitle: { color: "#FFF8E7", fontSize: 14, fontWeight: "900", writingDirection: "rtl" },
  roundShortcutHint: { color: "#B4D6C7", fontSize: 10, marginTop: 3, writingDirection: "rtl" },
  matchActionsButton: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: "rgba(255,248,231,0.3)", backgroundColor: "rgba(255,248,231,0.12)", alignItems: "center", justifyContent: "center" },
  matchActionsButtonPressed: { transform: [{ scale: 0.94 }], opacity: 0.74 },
  matchActionsButtonText: { color: "#FFF8E7", fontSize: 24, fontWeight: "900", lineHeight: 24, marginTop: -5 },
  trumpTopBar: { alignSelf: "stretch", alignItems: "flex-start", marginBottom: 12 },
  gameMenuModal: { flex: 1, justifyContent: "flex-end", padding: 16 },
  gameMenuBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(3,20,14,0.78)" },
  gameMenuSheet: { width: "100%", maxWidth: 500, alignSelf: "center", backgroundColor: "#FFF8E7", borderRadius: 26, padding: 20, shadowColor: "#000", shadowOpacity: 0.32, shadowRadius: 18, elevation: 12 },
  gameMenuHandle: { width: 38, height: 4, borderRadius: 2, backgroundColor: "#C9C1AF", alignSelf: "center", marginBottom: 16 },
  gameMenuTitle: { color: "#0E3B2E", fontSize: 21, fontWeight: "900", textAlign: "right", writingDirection: "rtl" },
  gameMenuDescription: { color: "#52635C", fontSize: 13, lineHeight: 20, textAlign: "right", marginTop: 5, marginBottom: 18, writingDirection: "rtl" },
  matchAction: { flexDirection: "row-reverse", alignItems: "center", gap: 12, minHeight: 72, borderRadius: 17, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, marginTop: 10 },
  matchActionRestart: { backgroundColor: "#E8F6EF", borderColor: "#B9E2CC" },
  matchActionExit: { backgroundColor: "#FFF1EE", borderColor: "#F3C7C0" },
  matchActionDisabled: { backgroundColor: "#F2ECDD", borderColor: "#DED5C3", opacity: 0.64 },
  matchActionIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(14,59,46,0.1)", alignItems: "center", justifyContent: "center" },
  matchActionIconText: { color: "#0E3B2E", fontSize: 23, fontWeight: "900", lineHeight: 26 },
  matchActionContent: { flex: 1, alignItems: "flex-start" },
  matchActionTitle: { color: "#0E3B2E", fontSize: 15, fontWeight: "900", writingDirection: "rtl" },
  matchActionSubtitle: { color: "#52635C", fontSize: 11, marginTop: 3, writingDirection: "rtl" },
  gameMenuCancel: { minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: "#CFC6B5", alignItems: "center", justifyContent: "center", marginTop: 16 },
  gameMenuCancelText: { color: "#52635C", fontSize: 14, fontWeight: "900", writingDirection: "rtl" },
  confirmationButtons: { flexDirection: "row-reverse", gap: 10, marginTop: 6 },
  confirmationCancel: { flex: 1, minHeight: 48, borderRadius: 14, backgroundColor: "#E9E3D4", alignItems: "center", justifyContent: "center" },
  confirmationCancelText: { color: "#52635C", fontSize: 14, fontWeight: "900", writingDirection: "rtl" },
  confirmationDestructive: { flex: 1, minHeight: 48, borderRadius: 14, backgroundColor: "#B8463A", alignItems: "center", justifyContent: "center" },
  confirmationDestructiveText: { color: "#FFF8E7", fontSize: 14, fontWeight: "900", writingDirection: "rtl" },
});
