import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { CardBack, PlayingCard } from "./card";
import { CurvedCardHand } from "./card-fan";
import { cardLabel, legalCards, suitName, suitSymbol } from "@/lib/tarneeb/engine";
import { getNativeTableLayout } from "@/lib/tarneeb/native-ui-layout";
import { getOpponentCardFanLayout } from "@/lib/tarneeb/opponent-card-fan-layout";
import type { AnimationSpeed, CardBackPattern, CardFaceTheme, CardFanCurve, MatchState, OpponentCardDensity, TableTextSize, TableTheme, TurnTimerSeconds } from "@/lib/tarneeb/types";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { Easing, FadeIn, FadeOut, LinearTransition, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from "react-native-reanimated";

export function GameTable({ state, onCardPress, action, fanCurve, cardBackPattern, cardFaceTheme, tableTheme, animationSpeed, tableTextSize, opponentCardDensity, turnTimer }: { state: MatchState; onCardPress: (cardId: string) => void; action?: ReactNode; fanCurve: CardFanCurve; cardBackPattern: CardBackPattern; cardFaceTheme: CardFaceTheme; tableTheme: TableTheme; animationSpeed: AnimationSpeed; tableTextSize: TableTextSize; opponentCardDensity: OpponentCardDensity; turnTimer: { durationSeconds: TurnTimerSeconds; remainingSeconds: number; isActive: boolean; isExpired: boolean } }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const nativeLayout = getNativeTableLayout({ width, height, insets });
  const humanTurn = state.phase === "playing" && (state.trick.plays.length === 0 ? state.trick.leaderId === 0 : (state.trick.plays.at(-1)?.playerId ?? 3) === 3);
  const playable = humanTurn ? legalCards(state.players[0].hand, state.trick).map((card) => card.id) : [];
  const cardBySeat = Object.fromEntries(state.trick.plays.map((play) => [play.playerId, play.card]));
  const trump = state.bidding.trumpSuit;
  const bidder = state.bidding.highestBidder === null ? null : state.players[state.bidding.highestBidder];
  const hand = state.players[0].hand;
  const [draggingCard, setDraggingCard] = useState(false);
  const largeText = tableTextSize === "large";
  const theme = TABLE_THEMES[tableTheme];

  return (
    <View style={[styles.screen, { backgroundColor: theme.screen, paddingHorizontal: nativeLayout.horizontalPadding, paddingTop: nativeLayout.topSafeFallback }]}> 
      <View style={[styles.statusRow, { minHeight: nativeLayout.statusHeight }]}>
        <View style={styles.scorePill}>
          <View style={styles.teamHeading}><Text style={[styles.scoreLabel, largeText && styles.scoreLabelLarge]}>فريقك</Text><View style={styles.trickBadge}><Text style={[styles.trickBadgeValue, largeText && styles.trickBadgeValueLarge]}>{state.tricksWon[0]}</Text><Text style={[styles.trickBadgeLabel, largeText && styles.trickBadgeLabelLarge]}>لمم</Text></View></View>
          <Text style={[styles.scoreValue, largeText && styles.scoreValueLarge]}>{state.scores[0]}</Text>
        </View>
        <View style={[styles.contractPill, trump && styles.contractPillTrump]}>
          {action}
          <View style={styles.contractCopy}>
            <Text numberOfLines={1} style={[styles.contractText, largeText && styles.contractTextLarge]}>{trump ? `الطرنيب: ${suitName(trump)} ${suitSymbol(trump)}` : "بانتظار اختيار الطرنيب"}</Text>
            <Text numberOfLines={1} style={[styles.contractBidder, largeText && styles.contractBidderLarge]}>{bidder ? `طلبه ${bidder.name} · الطلب ${state.bidding.highestBid}` : "لم يُحسم صاحب الطلب بعد"}</Text>
          </View>
        </View>
        <View style={styles.scorePill}>
          <View style={styles.teamHeading}><Text style={[styles.scoreLabel, largeText && styles.scoreLabelLarge]}>الخصم</Text><View style={styles.trickBadge}><Text style={[styles.trickBadgeValue, largeText && styles.trickBadgeValueLarge]}>{state.tricksWon[1]}</Text><Text style={[styles.trickBadgeLabel, largeText && styles.trickBadgeLabelLarge]}>لمم</Text></View></View>
          <Text style={[styles.scoreValue, largeText && styles.scoreValueLarge]}>{state.scores[1]}</Text>
        </View>
      </View>

      <View style={[styles.table, { backgroundColor: theme.table, borderColor: theme.border, minHeight: nativeLayout.tableMinHeight, maxHeight: nativeLayout.tableMaxHeight, marginTop: nativeLayout.tableTopMargin }]}>
        <PlayerSeat name={state.players[2].name} cards={state.players[2].handCount} position="top" active={currentSeat(state) === 2} cardBackPattern={cardBackPattern} density={opponentCardDensity} largeText={largeText} />
        <PlayerSeat name={state.players[3].name} cards={state.players[3].handCount} position="left" active={currentSeat(state) === 3} cardBackPattern={cardBackPattern} density={opponentCardDensity} largeText={largeText} />
        <PlayerSeat name={state.players[1].name} cards={state.players[1].handCount} position="right" active={currentSeat(state) === 1} cardBackPattern={cardBackPattern} density={opponentCardDensity} largeText={largeText} />

        <View style={styles.trickArea}>
          {humanTurn && (
            <View pointerEvents="none" style={[styles.dropTarget, draggingCard && styles.dropTargetActive]}>
              <Text style={[styles.dropTargetText, draggingCard && styles.dropTargetTextActive]}>{draggingCard ? "أفلت الورقة هنا" : "اسحب ورقة إلى الطاولة"}</Text>
            </View>
          )}
          {cardBySeat[2] && <TrickCard card={cardBySeat[2]} seat={2} cardFaceTheme={cardFaceTheme} animationSpeed={animationSpeed} collectingWinner={state.phase === "trickResult" ? state.lastTrick?.winnerId ?? null : null} />}
          {cardBySeat[3] && <TrickCard card={cardBySeat[3]} seat={3} cardFaceTheme={cardFaceTheme} animationSpeed={animationSpeed} collectingWinner={state.phase === "trickResult" ? state.lastTrick?.winnerId ?? null : null} />}
          {cardBySeat[1] && <TrickCard card={cardBySeat[1]} seat={1} cardFaceTheme={cardFaceTheme} animationSpeed={animationSpeed} collectingWinner={state.phase === "trickResult" ? state.lastTrick?.winnerId ?? null : null} />}
          {cardBySeat[0] && <TrickCard card={cardBySeat[0]} seat={0} cardFaceTheme={cardFaceTheme} animationSpeed={animationSpeed} collectingWinner={state.phase === "trickResult" ? state.lastTrick?.winnerId ?? null : null} />}
          {state.trick.plays.length === 0 && <Text style={[styles.tableHint, largeText && styles.tableHintLarge]}>{humanTurn ? "اختر ورقة للعب" : "ينتظر اللاعبون"}</Text>}
        </View>
      </View>

      <View style={[styles.handArea, { height: nativeLayout.handAreaHeight, marginTop: nativeLayout.handTopMargin }]}> 
        <View style={styles.handHeader}><Text style={[styles.handTitle, largeText && styles.handTitleLarge]}>أوراقك</Text><View style={styles.handMeta}>{turnTimer.durationSeconds > 0 && (turnTimer.isActive || turnTimer.isExpired) && <TurnTimerBadge timer={turnTimer} />}<Text style={[styles.handHint, largeText && styles.handHintLarge]}>{humanTurn ? "اسحب ورقة للطاولة أو اضغط عليها" : "دور الخصم"}</Text></View></View>
        <CurvedCardHand cards={hand} accessibilityLabel="يدك مرتبة ضمن قوس متساوٍ" dragEnabled={humanTurn} entranceStep={26} curveStrength={fanCurve} cardBackPattern={cardBackPattern} cardFaceTheme={cardFaceTheme} animationSpeed={animationSpeed} dealFlip={false} disabledCardIds={!humanTurn ? hand.map((card) => card.id) : hand.filter((card) => !playable.includes(card.id)).map((card) => card.id)} onCardDragStateChange={setDraggingCard} onCardPress={onCardPress} />
      </View>
    </View>
  );
}

function TurnTimerBadge({ timer }: { timer: { durationSeconds: TurnTimerSeconds; remainingSeconds: number; isActive: boolean; isExpired: boolean } }) {
  const isUrgent = timer.isExpired || timer.remainingSeconds <= 5;
  const isWarning = !isUrgent && timer.remainingSeconds <= 10;
  const progress = timer.durationSeconds === 0 ? 0 : (timer.remainingSeconds / timer.durationSeconds) * 100;
  return <View style={[styles.timerBadge, isWarning && styles.timerBadgeWarning, isUrgent && styles.timerBadgeUrgent]}><Text style={styles.timerLabel}>{timer.isExpired ? "انتهى الوقت" : `وقت الدور ${timer.remainingSeconds} ث`}</Text><View style={styles.timerTrack}><View style={[styles.timerFill, isWarning && styles.timerFillWarning, isUrgent && styles.timerFillUrgent, { width: `${progress}%` }]} /></View></View>;
}

function TrickCard({ card, seat, cardFaceTheme, animationSpeed, collectingWinner }: { card: MatchState["trick"]["plays"][number]["card"]; seat: 0 | 1 | 2 | 3; cardFaceTheme: CardFaceTheme; animationSpeed: AnimationSpeed; collectingWinner: 0 | 1 | 2 | 3 | null }) {
  const progress = useSharedValue(0);
  const gather = useSharedValue(0);
  const sweep = useSharedValue(0);
  const travel = TRICK_TRAVEL[seat];
  const motion = animationSpeed === "هادئة" ? 1.28 : animationSpeed === "سريعة" ? 0.72 : 1;

  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(1, { duration: 320 * motion, easing: Easing.out(Easing.cubic) });
  }, [card.id, motion, progress]);

  useEffect(() => {
    gather.value = 0;
    sweep.value = 0;
    if (collectingWinner === null) return;
    gather.value = withDelay(360 * motion, withTiming(1, { duration: 170 * motion, easing: Easing.inOut(Easing.cubic) }));
    sweep.value = withDelay(610 * motion, withTiming(1, { duration: 280 * motion, easing: Easing.in(Easing.cubic) }));
  }, [collectingWinner, gather, motion, sweep]);

  const travelStyle = useAnimatedStyle(() => ({
    opacity: (0.28 + progress.value * 0.72) * (1 - sweep.value),
    transform: [
      { translateX: (1 - progress.value) * travel.x },
      { translateY: (1 - progress.value) * travel.y },
      { translateX: gather.value * GATHER_TO_CENTER[seat].x + (collectingWinner === null ? 0 : sweep.value * SWEEP_TO_WINNER[collectingWinner].x) },
      { translateY: gather.value * GATHER_TO_CENTER[seat].y + (collectingWinner === null ? 0 : sweep.value * SWEEP_TO_WINNER[collectingWinner].y) },
      { scale: (0.78 + progress.value * 0.22) * (1 - sweep.value * 0.18) },
      { rotate: travel.rotation },
    ],
  }));

  return <Animated.View style={[styles.playSlot, styles[travel.slot], travelStyle]}><PlayingCard card={card} compact cardFaceTheme={cardFaceTheme} animationSpeed={animationSpeed} /></Animated.View>;
}

const TRICK_TRAVEL = {
  0: { x: 0, y: 112, rotation: "0deg", slot: "playBottom" },
  1: { x: 108, y: 0, rotation: "90deg", slot: "playRight" },
  2: { x: 0, y: -112, rotation: "180deg", slot: "playTop" },
  3: { x: -108, y: 0, rotation: "-90deg", slot: "playLeft" },
} as const;

const GATHER_TO_CENTER = {
  0: { x: 0, y: -54 },
  1: { x: -48, y: 0 },
  2: { x: 0, y: 54 },
  3: { x: 48, y: 0 },
} as const;

const SWEEP_TO_WINNER = {
  0: { x: 0, y: 112 },
  1: { x: 108, y: 0 },
  2: { x: 0, y: -112 },
  3: { x: -108, y: 0 },
} as const;

const TABLE_THEMES = {
  emerald: { screen: "#0E3B2E", table: "#16624A", border: "rgba(245,216,137,0.4)" },
  midnight: { screen: "#101D33", table: "#1D385C", border: "rgba(183,214,239,0.46)" },
  sand: { screen: "#583A21", table: "#80603B", border: "rgba(255,234,188,0.52)" },
} as const;

function currentSeat(state: MatchState) {
  if (state.phase !== "playing") return null;
  return state.trick.plays.length === 0 ? state.trick.leaderId : ((state.trick.plays.at(-1)!.playerId + 1) % 4);
}

function PlayerSeat({ name, cards, position, active, cardBackPattern, density, largeText }: { name: string; cards: number; position: "top" | "left" | "right"; active: boolean; cardBackPattern: CardBackPattern; density: OpponentCardDensity; largeText: boolean }) {
  const isSideSeat = position !== "top";
  const cardRotation = position === "left" ? "90deg" : "-90deg";
  const fan = getOpponentCardFanLayout(cards, position, density);
  const previousCards = useRef(cards);
  const handPulse = useSharedValue(0);

  useEffect(() => {
    if (position === "top" && cards < previousCards.current) {
      handPulse.value = 0;
      handPulse.value = withSequence(
        withTiming(1, { duration: 130, easing: Easing.out(Easing.cubic) }),
        withTiming(0, { duration: 210, easing: Easing.inOut(Easing.cubic) }),
      );
    }
    previousCards.current = cards;
  }, [cards, handPulse, position]);

  const partnerHandLossStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -4 * handPulse.value }, { scale: 1 + 0.025 * handPulse.value }],
  }));

  return (
      <View style={[styles.playerSeat, styles[position], active && styles.activeSeat]}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{name.slice(0, 1)}</Text></View>
        <View style={styles.seatDetails}>
          <View style={styles.nameRow}>
            <Text style={[styles.playerName, largeText && styles.playerNameLarge]}>{name}</Text>
            {active && <View style={styles.turnMarker}><Text style={styles.turnArrow}>{position === "top" ? "↓" : position === "left" ? "→" : "←"}</Text><Text style={styles.turnText}>دوره</Text></View>}
          </View>
        <Animated.View style={[styles.cardBacks, isSideSeat ? styles.sideCardBacks : styles.topCardBacks, position === "top" && partnerHandLossStyle]}>
          {fan.map((card, index) => (
            <Animated.View key={`${name}-${index}`} layout={LinearTransition.duration(160)} entering={FadeIn.duration(130)} exiting={position === "top" ? FadeOut.duration(130) : undefined} style={[
              isSideSeat ? styles.sideCardStack : styles.topCardStack,
              isSideSeat
                ? { marginTop: index === 0 ? 0 : -(62 - card.step), zIndex: index, transform: [{ rotate: cardRotation }, { rotate: `${card.rotation}deg` }] }
                : { marginLeft: index === 0 ? 0 : -(27 - card.step), zIndex: index, transform: [{ translateY: card.lift }] },
            ]}>
              <CardBack compact pattern={cardBackPattern} />
            </Animated.View>
          ))}
        </Animated.View>
      </View>
    </View>
  );
}

export function LastTrickBanner({ state }: { state: MatchState }) {
  const progress = useSharedValue(0);
  const trickKey = state.lastTrick
    ? `${state.lastTrick.winnerId}-${state.lastTrick.plays.map((play) => play.card.id).join("-")}`
    : null;

  useEffect(() => {
    if (!trickKey) {
      progress.value = 0;
      return;
    }
    progress.value = 0;
    progress.value = withTiming(1, { duration: 240, easing: Easing.out(Easing.cubic) });
  }, [progress, trickKey]);

  const revealStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 12 }, { scale: 0.94 + progress.value * 0.06 }],
  }));
  if (!state.lastTrick) return null;
  const winner = state.players[state.lastTrick.winnerId];
  return (
    <Animated.View style={[styles.lastTrick, revealStyle]}>
      <Text style={styles.lastTrickTitle}>فاز {winner.team === 0 ? "فريقك" : "الفريق المنافس"} باللمّة</Text>
      <Text style={styles.lastTrickDetail}>{winner.name} حسمها بـ {cardLabel(state.lastTrick.plays.find((play) => play.playerId === winner.id)!.card)}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#0E3B2E", paddingHorizontal: 14, direction: "ltr" },
  statusRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 8, gap: 8 },
  scorePill: { minWidth: 66, alignItems: "center", backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6 },
  teamHeading: { flexDirection: "row-reverse", alignItems: "center", gap: 5 },
  scoreLabel: { color: "#D9EEE4", fontSize: 11, writingDirection: "rtl" }, scoreLabelLarge: { fontSize: 12 },
  scoreValue: { color: "#FFF8E7", fontSize: 20, fontWeight: "800", lineHeight: 24 }, scoreValueLarge: { fontSize: 23, lineHeight: 27 },
  trickBadge: { flexDirection: "row", alignItems: "baseline", gap: 2, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 9, backgroundColor: "#E3B341" },
  trickBadgeValue: { color: "#173C2F", fontSize: 12, fontWeight: "900" }, trickBadgeValueLarge: { fontSize: 13 },
  trickBadgeLabel: { color: "#173C2F", fontSize: 9, fontWeight: "900" }, trickBadgeLabelLarge: { fontSize: 10 },
  contractPill: { flex: 1, minHeight: 48, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 7, paddingHorizontal: 7, borderWidth: 1, borderColor: "rgba(227,179,65,0.4)", borderRadius: 14, backgroundColor: "rgba(14,59,46,0.42)" },
  contractPillTrump: { backgroundColor: "#7C2D12", borderColor: "#FBBF24", shadowColor: "#FBBF24", shadowOpacity: 0.28, shadowRadius: 7, shadowOffset: { width: 0, height: 2 }, elevation: 4 },
  contractCopy: { flex: 1, alignItems: "center", justifyContent: "center", minWidth: 0 },
  contractText: { alignSelf: "stretch", flexShrink: 1, color: "#F5D889", fontSize: 12, fontWeight: "900", lineHeight: 16, textAlign: "center", writingDirection: "rtl" }, contractTextLarge: { fontSize: 13, lineHeight: 17 },
  contractBidder: { alignSelf: "stretch", flexShrink: 1, color: "#D9EEE4", fontSize: 10, fontWeight: "700", lineHeight: 13, textAlign: "center", writingDirection: "rtl" }, contractBidderLarge: { fontSize: 11, lineHeight: 14 },
  table: { flex: 1, minHeight: 330, marginTop: 10, borderRadius: 28, backgroundColor: "#16624A", borderWidth: 1, borderColor: "rgba(245,216,137,0.4)", overflow: "hidden" },
  playerSeat: { position: "absolute", flexDirection: "row", alignItems: "center", gap: 5, padding: 6, borderRadius: 16, borderWidth: 1, borderColor: "transparent" },
  top: { top: 10, alignSelf: "center", flexDirection: "column", alignItems: "center" },
  left: { left: 8, top: "50%", transform: [{ translateY: -103 }] },
  right: { right: 8, top: "50%", flexDirection: "row-reverse", transform: [{ translateY: -103 }] },
  activeSeat: { backgroundColor: "rgba(251,191,36,0.2)", borderColor: "#FBBF24", shadowColor: "#FBBF24", shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 0 }, elevation: 5 },
  avatar: { width: 26, height: 26, borderRadius: 13, backgroundColor: "#E3B341", alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#17211D", fontWeight: "900", fontSize: 13 },
  seatDetails: { alignItems: "center" },
  nameRow: { flexDirection: "row-reverse", alignItems: "center", gap: 4 },
  playerName: { color: "#FFF8E7", fontWeight: "700", fontSize: 12, writingDirection: "rtl" }, playerNameLarge: { fontSize: 14 },
  turnMarker: { flexDirection: "row-reverse", alignItems: "center", gap: 2, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 8, backgroundColor: "#FBBF24" },
  turnArrow: { color: "#17211D", fontSize: 13, lineHeight: 14, fontWeight: "900" },
  turnText: { color: "#17211D", fontSize: 9, fontWeight: "900", writingDirection: "rtl" },
  cardBacks: { marginTop: 4 },
  topCardBacks: { flexDirection: "row", alignSelf: "center", height: 40, alignItems: "center" },
  topCardStack: { width: 27, height: 38, alignItems: "center", justifyContent: "center" },
  sideCardBacks: { width: 48, height: 206, alignItems: "center", justifyContent: "center" },
  sideCardStack: { width: 27, height: 38, alignItems: "center", justifyContent: "center" },
  trickArea: { position: "absolute", width: 190, height: 205, alignSelf: "center", top: "28%", left: "50%", transform: [{ translateX: -95 }], borderRadius: 95, borderWidth: 1, borderColor: "rgba(255,248,231,0.18)" },
  dropTarget: { position: "absolute", top: 64, left: 20, right: 20, height: 78, borderRadius: 18, borderWidth: 1, borderStyle: "dashed", borderColor: "rgba(217,238,228,0.45)", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(14,59,46,0.18)" },
  dropTargetActive: { borderColor: "#E3B341", backgroundColor: "rgba(227,179,65,0.18)", transform: [{ scale: 1.04 }] },
  dropTargetText: { color: "#B4D6C7", fontSize: 12, fontWeight: "700", writingDirection: "rtl" },
  dropTargetTextActive: { color: "#FFF8E7" },
  playSlot: { position: "absolute" },
  playTop: { top: 8, alignSelf: "center" },
  playBottom: { bottom: 8, alignSelf: "center" },
  playLeft: { left: 8, top: 68 },
  playRight: { right: 8, top: 68 },
  tableHint: { alignSelf: "center", marginTop: 92, color: "#D9EEE4", fontSize: 13, writingDirection: "rtl" }, tableHintLarge: { fontSize: 15 },
  handArea: { height: 140, marginTop: 10, paddingBottom: 8, alignItems: "center" },
  handHeader: { alignSelf: "stretch", flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 4, marginBottom: 6 },
  handMeta: { flexDirection: "row", alignItems: "center", gap: 7, flexShrink: 1 },
  handTitle: { color: "#FFF8E7", fontSize: 16, fontWeight: "800", writingDirection: "rtl" }, handTitleLarge: { fontSize: 18 },
  handHint: { color: "#B4D6C7", fontSize: 12, writingDirection: "rtl" }, handHintLarge: { fontSize: 14 },
  timerBadge: { minWidth: 74, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 9, backgroundColor: "rgba(217,238,228,0.14)", borderWidth: 1, borderColor: "rgba(217,238,228,0.32)" },
  timerBadgeWarning: { backgroundColor: "rgba(227,179,65,0.22)", borderColor: "#E3B341" },
  timerBadgeUrgent: { backgroundColor: "rgba(196,68,58,0.28)", borderColor: "#F59892" },
  timerLabel: { color: "#FFF8E7", fontSize: 9, lineHeight: 12, fontWeight: "900", textAlign: "center", writingDirection: "rtl" },
  timerTrack: { height: 3, borderRadius: 3, marginTop: 3, overflow: "hidden", backgroundColor: "rgba(255,248,231,0.2)" },
  timerFill: { height: "100%", borderRadius: 3, backgroundColor: "#9EE0C6" },
  timerFillWarning: { backgroundColor: "#E3B341" },
  timerFillUrgent: { backgroundColor: "#F59892" },
  lastTrick: { margin: 12, backgroundColor: "#FFF8E7", borderRadius: 18, padding: 14, alignItems: "center" },
  lastTrickTitle: { color: "#0E3B2E", fontSize: 16, fontWeight: "900", writingDirection: "rtl" },
  lastTrickDetail: { color: "#52635C", fontSize: 13, marginTop: 3, writingDirection: "rtl" },
});
