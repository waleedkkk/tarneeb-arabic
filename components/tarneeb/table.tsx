import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { CardBack, PlayingCard } from "./card";
import { CurvedCardHand } from "./card-fan";
import { cardLabel, legalCards, suitName, suitSymbol } from "@/lib/tarneeb/engine";
import { getNativeTableLayout } from "@/lib/tarneeb/native-ui-layout";
import type { CardFanCurve, MatchState } from "@/lib/tarneeb/types";
import { useEffect, type ReactNode } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from "react-native-reanimated";

export function GameTable({ state, onCardPress, action, fanCurve }: { state: MatchState; onCardPress: (cardId: string) => void; action?: ReactNode; fanCurve: CardFanCurve }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const nativeLayout = getNativeTableLayout({ width, height, insets });
  const humanTurn = state.phase === "playing" && (state.trick.plays.length === 0 ? state.trick.leaderId === 0 : (state.trick.plays.at(-1)?.playerId ?? 3) === 3);
  const playable = humanTurn ? legalCards(state.players[0].hand, state.trick).map((card) => card.id) : [];
  const cardBySeat = Object.fromEntries(state.trick.plays.map((play) => [play.playerId, play.card]));
  const trump = state.bidding.trumpSuit;
  const hand = state.players[0].hand;

  return (
    <View style={[styles.screen, { paddingHorizontal: nativeLayout.horizontalPadding }]}> 
      <View style={[styles.statusRow, { minHeight: nativeLayout.statusHeight }]}>
        <View style={styles.scorePill}>
          <View style={styles.teamHeading}><Text style={styles.scoreLabel}>فريقك</Text><View style={styles.trickBadge}><Text style={styles.trickBadgeValue}>{state.tricksWon[0]}</Text><Text style={styles.trickBadgeLabel}>لمم</Text></View></View>
          <Text style={styles.scoreValue}>{state.scores[0]}</Text>
        </View>
        <View style={styles.contractPill}>{action}<Text style={styles.contractText}>الطلب {state.bidding.highestBid} · {trump ? `${suitName(trump)} ${suitSymbol(trump)}` : "بانتظار الطرنيب"}</Text></View>
        <View style={styles.scorePill}>
          <View style={styles.teamHeading}><Text style={styles.scoreLabel}>الخصم</Text><View style={styles.trickBadge}><Text style={styles.trickBadgeValue}>{state.tricksWon[1]}</Text><Text style={styles.trickBadgeLabel}>لمم</Text></View></View>
          <Text style={styles.scoreValue}>{state.scores[1]}</Text>
        </View>
      </View>

      <View style={[styles.table, { minHeight: nativeLayout.tableMinHeight, maxHeight: nativeLayout.tableMaxHeight, marginTop: nativeLayout.tableTopMargin }]}>
        <PlayerSeat name={state.players[2].name} cards={state.players[2].handCount} position="top" active={currentSeat(state) === 2} />
        <PlayerSeat name={state.players[3].name} cards={state.players[3].handCount} position="left" active={currentSeat(state) === 3} />
        <PlayerSeat name={state.players[1].name} cards={state.players[1].handCount} position="right" active={currentSeat(state) === 1} />

        <View style={styles.trickArea}>
          {cardBySeat[2] && <TrickCard card={cardBySeat[2]} seat={2} collectingWinner={state.phase === "trickResult" ? state.lastTrick?.winnerId ?? null : null} />}
          {cardBySeat[3] && <TrickCard card={cardBySeat[3]} seat={3} collectingWinner={state.phase === "trickResult" ? state.lastTrick?.winnerId ?? null : null} />}
          {cardBySeat[1] && <TrickCard card={cardBySeat[1]} seat={1} collectingWinner={state.phase === "trickResult" ? state.lastTrick?.winnerId ?? null : null} />}
          {cardBySeat[0] && <TrickCard card={cardBySeat[0]} seat={0} collectingWinner={state.phase === "trickResult" ? state.lastTrick?.winnerId ?? null : null} />}
          {state.trick.plays.length === 0 && <Text style={styles.tableHint}>{humanTurn ? "اختر ورقة للعب" : "ينتظر اللاعبون"}</Text>}
        </View>
      </View>

      <View style={[styles.handArea, { height: nativeLayout.handAreaHeight, marginTop: nativeLayout.handTopMargin }]}>
        <View style={styles.handHeader}><Text style={styles.handTitle}>أوراقك</Text><Text style={styles.handHint}>{humanTurn ? "اضغط على ورقة متاحة" : "دور الخصم"}</Text></View>
        <CurvedCardHand cards={hand} accessibilityLabel="يدك مرتبة ضمن قوس متساوٍ" entranceStep={26} curveStrength={fanCurve} disabledCardIds={!humanTurn ? hand.map((card) => card.id) : hand.filter((card) => !playable.includes(card.id)).map((card) => card.id)} onCardPress={onCardPress} />
      </View>
    </View>
  );
}

function TrickCard({ card, seat, collectingWinner }: { card: MatchState["trick"]["plays"][number]["card"]; seat: 0 | 1 | 2 | 3; collectingWinner: 0 | 1 | 2 | 3 | null }) {
  const progress = useSharedValue(0);
  const gather = useSharedValue(0);
  const sweep = useSharedValue(0);
  const travel = TRICK_TRAVEL[seat];

  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) });
  }, [card.id, progress]);

  useEffect(() => {
    gather.value = 0;
    sweep.value = 0;
    if (collectingWinner === null) return;
    gather.value = withDelay(360, withTiming(1, { duration: 170, easing: Easing.inOut(Easing.cubic) }));
    sweep.value = withDelay(610, withTiming(1, { duration: 280, easing: Easing.in(Easing.cubic) }));
  }, [collectingWinner, gather, sweep]);

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

  return <Animated.View style={[styles.playSlot, styles[travel.slot], travelStyle]}><PlayingCard card={card} compact /></Animated.View>;
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

function currentSeat(state: MatchState) {
  if (state.phase !== "playing") return null;
  return state.trick.plays.length === 0 ? state.trick.leaderId : ((state.trick.plays.at(-1)!.playerId + 1) % 4);
}

function PlayerSeat({ name, cards, position, active }: { name: string; cards: number; position: "top" | "left" | "right"; active: boolean }) {
  const isSideSeat = position !== "top";
  const cardRotation = position === "left" ? "90deg" : "-90deg";
  return (
    <View style={[styles.playerSeat, styles[position], active && styles.activeSeat]}>
      <View style={styles.avatar}><Text style={styles.avatarText}>{name.slice(0, 1)}</Text></View>
      <View style={styles.seatDetails}>
        <Text style={styles.playerName}>{name}</Text>
        <View style={[styles.cardBacks, isSideSeat ? styles.sideCardBacks : styles.topCardBacks]}>
          {Array.from({ length: Math.min(cards, 4) }).map((_, index) => (
            <View key={`${name}-${index}`} style={[isSideSeat ? (index === 0 ? styles.firstSideCard : styles.sideCardStack) : styles.topCardStack, isSideSeat && { transform: [{ rotate: cardRotation }] }]}>
              <CardBack compact />
            </View>
          ))}
        </View>
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
  scoreLabel: { color: "#D9EEE4", fontSize: 11, writingDirection: "rtl" },
  scoreValue: { color: "#FFF8E7", fontSize: 20, fontWeight: "800", lineHeight: 24 },
  trickBadge: { flexDirection: "row", alignItems: "baseline", gap: 2, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 9, backgroundColor: "#E3B341" },
  trickBadgeValue: { color: "#173C2F", fontSize: 12, fontWeight: "900" },
  trickBadgeLabel: { color: "#173C2F", fontSize: 9, fontWeight: "900" },
  contractPill: { flex: 1, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 5, paddingHorizontal: 4 },
  contractText: { flexShrink: 1, color: "#F5D889", fontSize: 12, fontWeight: "700", textAlign: "center", writingDirection: "rtl" },
  table: { flex: 1, minHeight: 330, marginTop: 10, borderRadius: 28, backgroundColor: "#16624A", borderWidth: 1, borderColor: "rgba(245,216,137,0.4)", overflow: "hidden" },
  playerSeat: { position: "absolute", flexDirection: "row", alignItems: "center", gap: 5, padding: 6, borderRadius: 16, borderWidth: 1, borderColor: "transparent" },
  top: { top: 10, alignSelf: "center", flexDirection: "column", alignItems: "center" },
  left: { left: 8, top: "42%" },
  right: { right: 8, top: "42%", flexDirection: "row-reverse" },
  activeSeat: { backgroundColor: "rgba(56,189,248,0.16)", borderColor: "#38BDF8" },
  avatar: { width: 26, height: 26, borderRadius: 13, backgroundColor: "#E3B341", alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#17211D", fontWeight: "900", fontSize: 13 },
  seatDetails: { alignItems: "center" },
  playerName: { color: "#FFF8E7", fontWeight: "700", fontSize: 12, writingDirection: "rtl" },
  cardBacks: { marginTop: 4 },
  topCardBacks: { flexDirection: "row-reverse", alignSelf: "center" },
  topCardStack: { marginRight: -8 },
  sideCardBacks: { alignItems: "center" },
  firstSideCard: { width: 27, height: 38, alignItems: "center", justifyContent: "center" },
  sideCardStack: { width: 27, height: 22, marginTop: -16, alignItems: "center", justifyContent: "center" },
  trickArea: { position: "absolute", width: 190, height: 205, alignSelf: "center", top: "28%", left: "50%", transform: [{ translateX: -95 }], borderRadius: 95, borderWidth: 1, borderColor: "rgba(255,248,231,0.18)" },
  playSlot: { position: "absolute" },
  playTop: { top: 8, alignSelf: "center" },
  playBottom: { bottom: 8, alignSelf: "center" },
  playLeft: { left: 8, top: 68 },
  playRight: { right: 8, top: 68 },
  tableHint: { alignSelf: "center", marginTop: 92, color: "#D9EEE4", fontSize: 13, writingDirection: "rtl" },
  handArea: { height: 140, marginTop: 10, paddingBottom: 8, alignItems: "center" },
  handHeader: { alignSelf: "stretch", flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 4, marginBottom: 6 },
  handTitle: { color: "#FFF8E7", fontSize: 16, fontWeight: "800", writingDirection: "rtl" },
  handHint: { color: "#B4D6C7", fontSize: 12, writingDirection: "rtl" },
  lastTrick: { margin: 12, backgroundColor: "#FFF8E7", borderRadius: 18, padding: 14, alignItems: "center" },
  lastTrickTitle: { color: "#0E3B2E", fontSize: 16, fontWeight: "900", writingDirection: "rtl" },
  lastTrickDetail: { color: "#52635C", fontSize: 13, marginTop: 3, writingDirection: "rtl" },
});
