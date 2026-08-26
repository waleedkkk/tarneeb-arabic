import { Pressable, StyleSheet, Text, type Insets, View } from "react-native";
import { cardLabel, rankLabel, suitSymbol } from "@/lib/tarneeb/engine";
import type { AnimationSpeed, Card as CardType, CardBackPattern, CardFaceTheme } from "@/lib/tarneeb/types";
import { memo, useEffect, useRef } from "react";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from "react-native-reanimated";

interface CardProps {
  card: CardType;
  onPress?: () => void;
  /** إشارة خارجية لإطلاق وميض الحافة عندما يدير GestureDetector اللمس. */
  pressSignal?: number;
  disabled?: boolean;
  selected?: boolean;
  compact?: boolean;
  hitSlop?: Insets;
  edgeFeedback?: boolean;
  entranceDelay?: number;
  dealFlip?: boolean;
  cardBackPattern?: CardBackPattern;
  cardFaceTheme?: CardFaceTheme;
  animationSpeed?: AnimationSpeed;
}

export const PlayingCard = memo(function PlayingCard({ card, onPress, pressSignal, disabled = false, selected = false, compact = false, hitSlop, edgeFeedback = false, entranceDelay = 0, dealFlip = false, cardBackPattern = "royal", cardFaceTheme = "ivory", animationSpeed = "متوازنة" }: CardProps) {
  const red = card.suit === "hearts" || card.suit === "diamonds";
  const faceTheme = CARD_FACE_THEMES[cardFaceTheme];
  const motion = animationSpeed === "هادئة" ? 1.28 : animationSpeed === "سريعة" ? 0.72 : 1;
  const reveal = useSharedValue(0);
  const flip = useSharedValue(dealFlip ? 0 : 1);
  const lift = useSharedValue(selected ? -8 : 0);
  const edgeGlow = useSharedValue(0);

  useEffect(() => {
    reveal.value = 0;
    flip.value = dealFlip ? 0 : 1;
    reveal.value = withDelay(entranceDelay, withTiming(1, { duration: (compact ? 190 : 260) * motion, easing: Easing.out(Easing.cubic) }));
    if (dealFlip) flip.value = withDelay(entranceDelay + 45 * motion, withTiming(1, { duration: (compact ? 210 : 270) * motion, easing: Easing.inOut(Easing.cubic) }));
  }, [animationSpeed, compact, dealFlip, entranceDelay, flip, motion, reveal]);

  useEffect(() => {
    lift.value = withTiming(selected ? -8 : 0, { duration: 150 * motion, easing: Easing.out(Easing.cubic) });
  }, [lift, motion, selected]);

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
  const faceFlipStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 680 }, { rotateY: `${(1 - flip.value) * 180}deg` }],
  }));
  const backFlipStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 680 }, { rotateY: `${flip.value * -180}deg` }],
  }));
  const showEdgeFeedback = () => {
    if (!edgeFeedback || disabled) return;
    edgeGlow.value = withSequence(
      withTiming(1, { duration: 80, easing: Easing.out(Easing.cubic) }),
      withTiming(0, { duration: 250, easing: Easing.out(Easing.cubic) }),
    );
  };
  const isFirstPressSignal = useRef(true);
  useEffect(() => {
    if (pressSignal === undefined) return;
    if (isFirstPressSignal.current) {
      isFirstPressSignal.current = false;
      return;
    }
    showEdgeFeedback();
    // showEdgeFeedback يعتمد على قيم العرض الحالية؛ تتغير الإشارة فقط عند النقر.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pressSignal]);
  const content = (
    <Animated.View style={[styles.cardStage, compact && styles.compactCardStage, revealStyle]}>
      <Animated.View style={[styles.card, styles.cardFace, faceTheme.card, compact && styles.compactCard, selected && styles.selectedCard, disabled && styles.disabledCard, faceFlipStyle]}>
        {edgeFeedback && !disabled && <Animated.View pointerEvents="none" style={[styles.edgeGlow, edgeGlowStyle]} />}
        <Text style={[styles.rank, compact && styles.compactRank, red ? [styles.red, faceTheme.red] : faceTheme.black]}>{rankLabel(card.rank)}</Text>
        <Text style={[styles.suit, compact && styles.compactSuit, red ? [styles.red, faceTheme.red] : faceTheme.black]}>{suitSymbol(card.suit)}</Text>
        {!compact && <Text style={[styles.centerSuit, red ? [styles.red, faceTheme.red] : faceTheme.black]}>{suitSymbol(card.suit)}</Text>}
      </Animated.View>
      {dealFlip && <Animated.View pointerEvents="none" style={[styles.cardBackFace, backFlipStyle]}><CardBack compact={compact} pattern={cardBackPattern} size="card" /></Animated.View>}
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
});

export const CardBack = memo(function CardBack({ compact = false, pattern = "royal", size = "seat" }: { compact?: boolean; pattern?: CardBackPattern; size?: "seat" | "card" }) {
  const theme = CARD_BACK_THEMES[pattern];
  return (
    <View style={[styles.back, compact && styles.compactBack, size === "card" && styles.fullCardBack, size === "card" && compact && styles.compactFullCardBack]}>
      <View style={[styles.backFrame, theme.frame]}>
        <View style={[styles.backInner, theme.inner]}>
          <BackPattern pattern={pattern} colorStyle={theme.pattern} />
          <View style={[styles.backMedallion, theme.medallion]}>
            <View style={[styles.backMedallionInner, theme.medallionInner]}>
              <Text style={[styles.backMark, theme.mark, compact && styles.compactBackMark]}>ط</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
});

function BackPattern({ pattern, colorStyle }: { pattern: CardBackPattern; colorStyle: object }) {
  if (pattern === "navy") {
    return <View pointerEvents="none" style={styles.backPattern}>
      <View style={[styles.weaveLine, styles.weaveLineOne, colorStyle]} />
      <View style={[styles.weaveLine, styles.weaveLineTwo, colorStyle]} />
      <View style={[styles.weaveLine, styles.weaveLineThree, colorStyle]} />
      <View style={[styles.weaveLine, styles.weaveLineFour, colorStyle]} />
    </View>;
  }
  if (pattern === "emerald") {
    return <View pointerEvents="none" style={styles.backPattern}>
      <View style={[styles.rosette, styles.rosetteTopLeft, colorStyle]} />
      <View style={[styles.rosette, styles.rosetteTopRight, colorStyle]} />
      <View style={[styles.rosette, styles.rosetteBottomLeft, colorStyle]} />
      <View style={[styles.rosette, styles.rosetteBottomRight, colorStyle]} />
      <View style={[styles.rosette, styles.rosetteCenter, colorStyle]} />
    </View>;
  }
  return <View pointerEvents="none" style={styles.backPattern}>
    <View style={[styles.patternDiamond, styles.patternDiamondTop, colorStyle]} />
    <View style={[styles.patternDiamond, styles.patternDiamondUpperLeft, colorStyle]} />
    <View style={[styles.patternDiamond, styles.patternDiamondUpperRight, colorStyle]} />
    <View style={[styles.patternDiamond, styles.patternDiamondLowerLeft, colorStyle]} />
    <View style={[styles.patternDiamond, styles.patternDiamondLowerRight, colorStyle]} />
    <View style={[styles.patternDiamond, styles.patternDiamondBottom, colorStyle]} />
  </View>;
}

const styles = StyleSheet.create({
  pressable: { marginHorizontal: 2 },
  pressed: { transform: [{ translateY: -8 }], opacity: 0.9 },
  cardStage: { width: 68, height: 102 },
  compactCardStage: { width: 54, height: 78 },
  card: { width: 68, height: 102, borderRadius: 11, backgroundColor: "#FFF8E7", borderWidth: 1, borderColor: "#D8CDAF", padding: 7, justifyContent: "space-between", shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 4, elevation: 3 },
  compactCard: { width: 54, height: 78, borderRadius: 9, padding: 5 },
  cardFace: { position: "absolute", backfaceVisibility: "hidden" },
  cardBackFace: { position: "absolute", top: 0, left: 0, backfaceVisibility: "hidden" },
  edgeGlow: { ...StyleSheet.absoluteFillObject, borderRadius: 11, backgroundColor: "rgba(227, 179, 65, 0.22)", borderColor: "#E3B341", borderWidth: 2 },
  selectedCard: { borderWidth: 2.5, borderColor: "#38BDF8" },
  disabledCard: { opacity: 0.42 },
  rank: { fontSize: 21, fontWeight: "800", lineHeight: 24 },
  compactRank: { fontSize: 17, lineHeight: 20 },
  suit: { fontSize: 20, fontWeight: "800", lineHeight: 23 },
  compactSuit: { fontSize: 17, lineHeight: 20 },
  centerSuit: { alignSelf: "center", fontSize: 38, fontWeight: "700", lineHeight: 42 },
  red: { color: "#C9413A" },
  black: { color: "#17211D" },
  back: { width: 35, height: 50, padding: 2, borderRadius: 7, backgroundColor: "#FFF8E7", borderWidth: 1, borderColor: "#D8CDAF", shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 2, elevation: 2 },
  compactBack: { width: 27, height: 38, borderRadius: 6 },
  fullCardBack: { width: 68, height: 102, borderRadius: 11, padding: 4 },
  compactFullCardBack: { width: 54, height: 78, borderRadius: 9, padding: 3 },
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
  weaveLine: { position: "absolute", width: "150%", height: 1, opacity: 0.6 },
  weaveLineOne: { top: "21%", left: "-26%", transform: [{ rotate: "35deg" }] },
  weaveLineTwo: { top: "43%", left: "-26%", transform: [{ rotate: "-35deg" }] },
  weaveLineThree: { bottom: "21%", left: "-26%", transform: [{ rotate: "35deg" }] },
  weaveLineFour: { bottom: "43%", left: "-26%", transform: [{ rotate: "-35deg" }] },
  rosette: { position: "absolute", width: 7, height: 7, borderRadius: 3.5, borderWidth: 1.25, opacity: 0.72 },
  rosetteTopLeft: { top: "20%", left: "18%" },
  rosetteTopRight: { top: "20%", right: "18%" },
  rosetteBottomLeft: { bottom: "20%", left: "18%" },
  rosetteBottomRight: { bottom: "20%", right: "18%" },
  rosetteCenter: { top: "43%", left: "39%" },
  backMedallion: { width: 17, height: 17, borderRadius: 9, padding: 1.5, borderWidth: 1, borderColor: "#FBE7AF", backgroundColor: "#8C1727", alignItems: "center", justifyContent: "center" },
  backMedallionInner: { width: "100%", height: "100%", borderRadius: 8, borderWidth: 1, borderColor: "#F2C765", alignItems: "center", justifyContent: "center", backgroundColor: "#B82738" },
  backMark: { color: "#FFF4CE", fontWeight: "900", fontSize: 11, lineHeight: 13 },
  compactBackMark: { fontSize: 9, lineHeight: 11 },
  royalFrame: { backgroundColor: "#F5DDA0", borderColor: "#9E1F2E" },
  royalInner: { backgroundColor: "#A61E2D", borderColor: "#FDEEC5" },
  royalPattern: { backgroundColor: "#F8D987" },
  royalMedallion: { backgroundColor: "#8C1727", borderColor: "#FBE7AF" },
  royalMedallionInner: { backgroundColor: "#B82738", borderColor: "#F2C765" },
  royalMark: { color: "#FFF4CE" },
  navyFrame: { backgroundColor: "#DDE7F0", borderColor: "#1B3857" },
  navyInner: { backgroundColor: "#173653", borderColor: "#F1F6FA" },
  navyPattern: { backgroundColor: "#9FC5DD", borderColor: "#9FC5DD" },
  navyMedallion: { backgroundColor: "#102B46", borderColor: "#D9EBF6" },
  navyMedallionInner: { backgroundColor: "#245177", borderColor: "#9FC5DD" },
  navyMark: { color: "#EFF8FF" },
  emeraldFrame: { backgroundColor: "#E2E7D0", borderColor: "#295B44" },
  emeraldInner: { backgroundColor: "#1F674D", borderColor: "#F1F4DF" },
  emeraldPattern: { backgroundColor: "#D4DD9A", borderColor: "#D4DD9A" },
  emeraldMedallion: { backgroundColor: "#16513D", borderColor: "#EDF0C8" },
  emeraldMedallionInner: { backgroundColor: "#2E795A", borderColor: "#D4DD9A" },
  emeraldMark: { color: "#FFFFE6" },
  parchmentCard: { backgroundColor: "#F1E3C1", borderColor: "#B8955D" },
  parchmentBlack: { color: "#3B2B1B" },
  parchmentRed: { color: "#AA3B32" },
  midnightCard: { backgroundColor: "#24344D", borderColor: "#A8C3D8" },
  midnightBlack: { color: "#F3F8FC" },
  midnightRed: { color: "#FF9A8D" },
});

const CARD_BACK_THEMES = {
  royal: { frame: styles.royalFrame, inner: styles.royalInner, pattern: styles.royalPattern, medallion: styles.royalMedallion, medallionInner: styles.royalMedallionInner, mark: styles.royalMark },
  navy: { frame: styles.navyFrame, inner: styles.navyInner, pattern: styles.navyPattern, medallion: styles.navyMedallion, medallionInner: styles.navyMedallionInner, mark: styles.navyMark },
  emerald: { frame: styles.emeraldFrame, inner: styles.emeraldInner, pattern: styles.emeraldPattern, medallion: styles.emeraldMedallion, medallionInner: styles.emeraldMedallionInner, mark: styles.emeraldMark },
} as const;

const CARD_FACE_THEMES = {
  ivory: { card: {} as object, black: styles.black, red: styles.red },
  parchment: { card: styles.parchmentCard, black: styles.parchmentBlack, red: styles.parchmentRed },
  midnight: { card: styles.midnightCard, black: styles.midnightBlack, red: styles.midnightRed },
} as const;
