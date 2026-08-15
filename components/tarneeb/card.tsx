import { Pressable, StyleSheet, Text, type Insets, View } from "react-native";
import { cardLabel, rankLabel, suitSymbol } from "@/lib/tarneeb/engine";
import type { Card as CardType } from "@/lib/tarneeb/types";
import { useEffect } from "react";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from "react-native-reanimated";

interface CardProps {
  card: CardType;
  onPress?: () => void;
  disabled?: boolean;
  selected?: boolean;
  compact?: boolean;
  hitSlop?: Insets;
  edgeFeedback?: boolean;
  entranceDelay?: number;
}

export function PlayingCard({ card, onPress, disabled = false, selected = false, compact = false, hitSlop, edgeFeedback = false, entranceDelay = 0 }: CardProps) {
  const red = card.suit === "hearts" || card.suit === "diamonds";
  const reveal = useSharedValue(0);
  const lift = useSharedValue(selected ? -8 : 0);
  const edgeGlow = useSharedValue(0);

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
  const edgeGlowStyle = useAnimatedStyle(() => ({
    opacity: edgeGlow.value,
    transform: [{ scale: 1 + edgeGlow.value * 0.025 }],
  }));
  const showEdgeFeedback = () => {
    if (!edgeFeedback || disabled) return;
    edgeGlow.value = withSequence(
      withTiming(1, { duration: 80, easing: Easing.out(Easing.cubic) }),
      withTiming(0, { duration: 250, easing: Easing.out(Easing.cubic) }),
    );
  };
  const content = (
    <Animated.View style={[styles.card, compact && styles.compactCard, selected && styles.selectedCard, disabled && styles.disabledCard, revealStyle]}>
      {edgeFeedback && !disabled && <Animated.View pointerEvents="none" style={[styles.edgeGlow, edgeGlowStyle]} />}
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
      hitSlop={hitSlop}
      onPressIn={showEdgeFeedback}
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
      <View style={styles.backFrame}>
        <View style={styles.backInner}>
          <View pointerEvents="none" style={styles.backPattern}>
            <View style={[styles.patternDiamond, styles.patternDiamondTop]} />
            <View style={[styles.patternDiamond, styles.patternDiamondUpperLeft]} />
            <View style={[styles.patternDiamond, styles.patternDiamondUpperRight]} />
            <View style={[styles.patternDiamond, styles.patternDiamondLowerLeft]} />
            <View style={[styles.patternDiamond, styles.patternDiamondLowerRight]} />
            <View style={[styles.patternDiamond, styles.patternDiamondBottom]} />
          </View>
          <View style={styles.backMedallion}>
            <View style={styles.backMedallionInner}>
              <Text style={[styles.backMark, compact && styles.compactBackMark]}>ط</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pressable: { marginHorizontal: 2 },
  pressed: { transform: [{ translateY: -8 }], opacity: 0.9 },
  card: { width: 60, height: 90, borderRadius: 10, backgroundColor: "#FFF8E7", borderWidth: 1, borderColor: "#D8CDAF", padding: 6, justifyContent: "space-between", shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 4, elevation: 3 },
  compactCard: { width: 48, height: 68, borderRadius: 8, padding: 4 },
  edgeGlow: { ...StyleSheet.absoluteFillObject, borderRadius: 10, backgroundColor: "rgba(227, 179, 65, 0.22)", borderColor: "#E3B341", borderWidth: 2 },
  selectedCard: { borderWidth: 2.5, borderColor: "#38BDF8" },
  disabledCard: { opacity: 0.42 },
  rank: { fontSize: 18, fontWeight: "800", lineHeight: 20 },
  compactRank: { fontSize: 14, lineHeight: 16 },
  suit: { fontSize: 16, fontWeight: "800", lineHeight: 18 },
  compactSuit: { fontSize: 12, lineHeight: 14 },
  centerSuit: { alignSelf: "center", fontSize: 32, fontWeight: "700", lineHeight: 34 },
  red: { color: "#C9413A" },
  black: { color: "#17211D" },
  back: { width: 35, height: 50, padding: 2, borderRadius: 7, backgroundColor: "#FFF8E7", borderWidth: 1, borderColor: "#D8CDAF", shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 2, elevation: 2 },
  compactBack: { width: 27, height: 38, borderRadius: 6 },
  backFrame: { flex: 1, borderRadius: 5, borderWidth: 1, borderColor: "#9E1F2E", padding: 1.5, backgroundColor: "#F5DDA0" },
  backInner: { flex: 1, overflow: "hidden", borderRadius: 3, borderWidth: 1, borderColor: "#FDEEC5", alignItems: "center", justifyContent: "center", backgroundColor: "#A61E2D" },
  backPattern: { ...StyleSheet.absoluteFillObject },
  patternDiamond: { position: "absolute", width: 5, height: 5, backgroundColor: "#F8D987", opacity: 0.58, transform: [{ rotate: "45deg" }] },
  patternDiamondTop: { top: 3, left: "42%" },
  patternDiamondUpperLeft: { top: "31%", left: 3 },
  patternDiamondUpperRight: { top: "31%", right: 3 },
  patternDiamondLowerLeft: { bottom: "31%", left: 3 },
  patternDiamondLowerRight: { bottom: "31%", right: 3 },
  patternDiamondBottom: { bottom: 3, left: "42%" },
  backMedallion: { width: 17, height: 17, borderRadius: 9, padding: 1.5, borderWidth: 1, borderColor: "#FBE7AF", backgroundColor: "#8C1727", alignItems: "center", justifyContent: "center" },
  backMedallionInner: { width: "100%", height: "100%", borderRadius: 8, borderWidth: 1, borderColor: "#F2C765", alignItems: "center", justifyContent: "center", backgroundColor: "#B82738" },
  backMark: { color: "#FFF4CE", fontWeight: "900", fontSize: 11, lineHeight: 13 },
  compactBackMark: { fontSize: 9, lineHeight: 11 },
});
