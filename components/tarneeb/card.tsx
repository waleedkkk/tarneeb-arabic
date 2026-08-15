import { Pressable, StyleSheet, Text, View } from "react-native";
import { cardLabel, rankLabel, suitSymbol } from "@/lib/tarneeb/engine";
import type { Card as CardType } from "@/lib/tarneeb/types";
import { useEffect } from "react";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from "react-native-reanimated";

interface CardProps {
  card: CardType;
  onPress?: () => void;
  disabled?: boolean;
  selected?: boolean;
  compact?: boolean;
  entranceDelay?: number;
}

export function PlayingCard({ card, onPress, disabled = false, selected = false, compact = false, entranceDelay = 0 }: CardProps) {
  const red = card.suit === "hearts" || card.suit === "diamonds";
  const reveal = useSharedValue(0);
  const lift = useSharedValue(selected ? -8 : 0);

  useEffect(() => {
    reveal.value = withDelay(entranceDelay, withTiming(1, { duration: compact ? 190 : 260, easing: Easing.out(Easing.cubic) }));
  }, [compact, entranceDelay, reveal]);

  useEffect(() => {
    lift.value = withTiming(selected ? -8 : 0, { duration: 150, easing: Easing.out(Easing.cubic) });
  }, [lift, selected]);

  const revealStyle = useAnimatedStyle(() => ({
    opacity: reveal.value,
    transform: [
      { translateY: (1 - reveal.value) * (compact ? 12 : 18) + lift.value },
      { scale: 0.84 + reveal.value * 0.16 },
    ],
  }));
  const content = (
    <Animated.View style={[styles.card, compact && styles.compactCard, selected && styles.selectedCard, disabled && styles.disabledCard, revealStyle]}>
      <Text style={[styles.rank, compact && styles.compactRank, red ? styles.red : styles.black]}>{rankLabel(card.rank)}</Text>
      <Text style={[styles.suit, compact && styles.compactSuit, red ? styles.red : styles.black]}>{suitSymbol(card.suit)}</Text>
      {!compact && <Text style={[styles.centerSuit, red ? styles.red : styles.black]}>{suitSymbol(card.suit)}</Text>}
    </Animated.View>
  );
  if (!onPress) return content;
  return (
    <Pressable
      accessibilityLabel={`ورقة ${cardLabel(card)}`}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.pressable, pressed && !disabled && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

export function CardBack({ compact = false }: { compact?: boolean }) {
  return (
    <View style={[styles.back, compact && styles.compactBack]}>
      <View style={styles.backInner}><Text style={styles.backMark}>ط</Text></View>
    </View>
  );
}

const styles = StyleSheet.create({
  pressable: { marginHorizontal: 2 },
  pressed: { transform: [{ translateY: -8 }], opacity: 0.9 },
  card: { width: 60, height: 90, borderRadius: 10, backgroundColor: "#FFF8E7", borderWidth: 1, borderColor: "#D8CDAF", padding: 6, justifyContent: "space-between", shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 4, elevation: 3 },
  compactCard: { width: 48, height: 68, borderRadius: 8, padding: 4 },
  selectedCard: { borderWidth: 2.5, borderColor: "#38BDF8" },
  disabledCard: { opacity: 0.42 },
  rank: { fontSize: 18, fontWeight: "800", lineHeight: 20 },
  compactRank: { fontSize: 14, lineHeight: 16 },
  suit: { fontSize: 16, fontWeight: "800", lineHeight: 18 },
  compactSuit: { fontSize: 12, lineHeight: 14 },
  centerSuit: { alignSelf: "center", fontSize: 32, fontWeight: "700", lineHeight: 34 },
  red: { color: "#C9413A" },
  black: { color: "#17211D" },
  back: { width: 35, height: 50, padding: 3, borderRadius: 7, backgroundColor: "#E3B341", borderWidth: 1, borderColor: "#F5D889" },
  compactBack: { width: 27, height: 38, borderRadius: 6 },
  backInner: { flex: 1, borderRadius: 4, borderWidth: 1.5, borderColor: "#0E3B2E", alignItems: "center", justifyContent: "center", backgroundColor: "#16624A" },
  backMark: { color: "#E3B341", fontWeight: "900", fontSize: 18 },
});
