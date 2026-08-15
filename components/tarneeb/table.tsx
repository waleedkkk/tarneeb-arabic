import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { PlayingCard, CardBack } from "./card";
import { cardLabel, legalCards, suitName, suitSymbol } from "@/lib/tarneeb/engine";
import type { MatchState } from "@/lib/tarneeb/types";
import { useEffect } from "react";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

export function GameTable({ state, onCardPress }: { state: MatchState; onCardPress: (cardId: string) => void }) {
  const { width } = useWindowDimensions();
  const humanTurn = state.phase === "playing" && (state.trick.plays.length === 0 ? state.trick.leaderId === 0 : (state.trick.plays.at(-1)?.playerId ?? 3) === 3);
  const playable = humanTurn ? legalCards(state.players[0].hand, state.trick).map((card) => card.id) : [];
  const cardBySeat = Object.fromEntries(state.trick.plays.map((play) => [play.playerId, play.card]));
  const trump = state.bidding.trumpSuit;
  const hand = state.players[0].hand;
  const fanWidth = Math.min(Math.max(width - 30, 270), 340);
  const fanSpacing = hand.length > 1 ? (fanWidth - 60) / (hand.length - 1) : 0;

  return (
    <View style={styles.screen}>
      <View style={styles.statusRow}>
        <View style={styles.scorePill}><Text style={styles.scoreLabel}>فريقك</Text><Text style={styles.scoreValue}>{state.scores[0]}</Text></View>
        <View style={styles.contractPill}><Text style={styles.contractText}>الطلب {state.bidding.highestBid} · {trump ? `${suitName(trump)} ${suitSymbol(trump)}` : "بانتظار الطرنيب"}</Text></View>
        <View style={styles.scorePill}><Text style={styles.scoreLabel}>الخصم</Text><Text style={styles.scoreValue}>{state.scores[1]}</Text></View>
      </View>

      <View style={styles.table}>
        <PlayerSeat name={state.players[2].name} cards={state.players[2].hand.length} position="top" active={currentSeat(state) === 2} />
        <PlayerSeat name={state.players[3].name} cards={state.players[3].hand.length} position="left" active={currentSeat(state) === 3} />
        <PlayerSeat name={state.players[1].name} cards={state.players[1].hand.length} position="right" active={currentSeat(state) === 1} />

        <View style={styles.trickArea}>
          <View style={[styles.playSlot, styles.playTop]}>{cardBySeat[2] && <PlayingCard card={cardBySeat[2]} compact />}</View>
          <View style={[styles.playSlot, styles.playLeft]}>{cardBySeat[3] && <PlayingCard card={cardBySeat[3]} compact />}</View>
          <View style={[styles.playSlot, styles.playRight]}>{cardBySeat[1] && <PlayingCard card={cardBySeat[1]} compact />}</View>
          <View style={[styles.playSlot, styles.playBottom]}>{cardBySeat[0] && <PlayingCard card={cardBySeat[0]} compact />}</View>
          {state.trick.plays.length === 0 && <Text style={styles.tableHint}>{humanTurn ? "اختر ورقة للعب" : "ينتظر اللاعبون"}</Text>}
        </View>
      </View>

      <View style={styles.handArea}>
        <View style={styles.handHeader}><Text style={styles.handTitle}>أوراقك</Text><Text style={styles.handHint}>{humanTurn ? "اضغط على ورقة متاحة" : "دور الخصم"}</Text></View>
        <View style={[styles.fanHand, { width: fanWidth }]} accessibilityLabel="يدك مرتبة كمروحة أوراق">
          {hand.map((card, index) => <View key={card.id} style={[styles.fanCardSlot, fanCardStyle(index, hand.length, fanSpacing)]}><PlayingCard card={card} entranceDelay={index * 26} disabled={!humanTurn || !playable.includes(card.id)} onPress={() => onCardPress(card.id)} /></View>)}
        </View>
      </View>
    </View>
  );
}

function currentSeat(state: MatchState) {
  if (state.phase !== "playing") return null;
  return state.trick.plays.length === 0 ? state.trick.leaderId : ((state.trick.plays.at(-1)!.playerId + 1) % 4);
}

function fanCardStyle(index: number, total: number, spacing: number) {
  const center = (total - 1) / 2;
  const offset = index - center;
  return {
    left: index * spacing,
    bottom: Math.max(0, 12 - Math.abs(offset) * 2.2),
    zIndex: total - Math.round(Math.abs(offset)),
    transform: [{ rotate: `${offset * 2.2}deg` }],
  };
}

function PlayerSeat({ name, cards, position, active }: { name: string; cards: number; position: "top" | "left" | "right"; active: boolean }) {
  return (
    <View style={[styles.playerSeat, styles[position], active && styles.activeSeat]}>
      <View style={styles.avatar}><Text style={styles.avatarText}>{name.slice(0, 1)}</Text></View>
      <View><Text style={styles.playerName}>{name}</Text><View style={styles.cardBacks}>{Array.from({ length: Math.min(cards, 4) }).map((_, index) => <CardBack compact key={`${name}-${index}`} />)}</View></View>
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
  screen: { flex: 1, backgroundColor: "#0E3B2E", paddingHorizontal: 14 },
  statusRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 8, gap: 8 },
  scorePill: { minWidth: 66, alignItems: "center", backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6 },
  scoreLabel: { color: "#D9EEE4", fontSize: 11, writingDirection: "rtl" },
  scoreValue: { color: "#FFF8E7", fontSize: 20, fontWeight: "800", lineHeight: 24 },
  contractPill: { flex: 1, alignItems: "center", paddingHorizontal: 4 },
  contractText: { color: "#F5D889", fontSize: 12, fontWeight: "700", textAlign: "center", writingDirection: "rtl" },
  table: { flex: 1, minHeight: 330, marginTop: 10, borderRadius: 28, backgroundColor: "#16624A", borderWidth: 1, borderColor: "rgba(245,216,137,0.4)", overflow: "hidden" },
  playerSeat: { position: "absolute", flexDirection: "row", alignItems: "center", gap: 5, padding: 6, borderRadius: 16, borderWidth: 1, borderColor: "transparent" },
  top: { top: 6, alignSelf: "center" },
  left: { left: 5, top: "46%" },
  right: { right: 5, top: "46%", flexDirection: "row-reverse" },
  activeSeat: { backgroundColor: "rgba(56,189,248,0.16)", borderColor: "#38BDF8" },
  avatar: { width: 26, height: 26, borderRadius: 13, backgroundColor: "#E3B341", alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#17211D", fontWeight: "900", fontSize: 13 },
  playerName: { color: "#FFF8E7", fontWeight: "700", fontSize: 12, writingDirection: "rtl" },
  cardBacks: { flexDirection: "row", marginTop: 3 },
  trickArea: { position: "absolute", width: 190, height: 205, alignSelf: "center", top: "28%", left: "50%", transform: [{ translateX: -95 }], borderRadius: 95, borderWidth: 1, borderColor: "rgba(255,248,231,0.18)" },
  playSlot: { position: "absolute" },
  playTop: { top: 8, alignSelf: "center" },
  playBottom: { bottom: 8, alignSelf: "center" },
  playLeft: { left: 8, top: 68 },
  playRight: { right: 8, top: 68 },
  tableHint: { alignSelf: "center", marginTop: 92, color: "#D9EEE4", fontSize: 13, writingDirection: "rtl" },
  handArea: { height: 140, marginTop: 10, paddingBottom: 8, alignItems: "center" },
  handHeader: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 4, marginBottom: 6 },
  handTitle: { color: "#FFF8E7", fontSize: 16, fontWeight: "800", writingDirection: "rtl" },
  handHint: { color: "#B4D6C7", fontSize: 12, writingDirection: "rtl" },
  fanHand: { height: 112, position: "relative", alignSelf: "center" },
  fanCardSlot: { position: "absolute", bottom: 0 },
  lastTrick: { margin: 12, backgroundColor: "#FFF8E7", borderRadius: 18, padding: 14, alignItems: "center" },
  lastTrickTitle: { color: "#0E3B2E", fontSize: 16, fontWeight: "900", writingDirection: "rtl" },
  lastTrickDetail: { color: "#52635C", fontSize: 13, marginTop: 3, writingDirection: "rtl" },
});
