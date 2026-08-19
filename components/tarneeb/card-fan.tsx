import { useState } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withSequence, withTiming } from "react-native-reanimated";

import { PlayingCard } from "./card";
import { getBalancedFanCardPosition, getCardDragDropThreshold, getFanEdgeHitSlop, getResponsiveFanMetrics, isCardDragDrop } from "@/lib/tarneeb/card-fan-layout";
import type { AnimationSpeed, Card, CardBackPattern, CardFaceTheme, CardFanCurve } from "@/lib/tarneeb/types";

interface CurvedCardHandProps {
  cards: Card[];
  accessibilityLabel: string;
  disabledCardIds?: string[];
  entranceStep?: number;
  curveStrength?: CardFanCurve;
  cardBackPattern?: CardBackPattern;
  cardFaceTheme?: CardFaceTheme;
  animationSpeed?: AnimationSpeed;
  dealFlip?: boolean;
  compactLayout?: boolean;
  dragEnabled?: boolean;
  onCardDragStateChange?: (dragging: boolean) => void;
  onCardPress?: (cardId: string) => void;
}

/** A shared, balanced card fan used anywhere the player reviews their hand. */
export function CurvedCardHand({
  cards,
  accessibilityLabel,
  disabledCardIds = [],
  entranceStep = 22,
  curveStrength = "balanced",
  cardBackPattern = "royal",
  cardFaceTheme = "ivory",
  animationSpeed = "متوازنة",
  dealFlip = true,
  compactLayout = false,
  dragEnabled = false,
  onCardDragStateChange,
  onCardPress,
}: CurvedCardHandProps) {
  const { width } = useWindowDimensions();
  const metrics = getResponsiveFanMetrics(width, compactLayout);

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      style={[styles.fan, { width: metrics.fanWidth, height: metrics.fanHeight }]}
    >
      {cards.map((card, index) => {
        const position = getBalancedFanCardPosition(
          index,
          cards.length,
          metrics.fanWidth,
          metrics.cardFootprint,
          metrics.compact,
          curveStrength,
        );
        const disabled = disabledCardIds.includes(card.id);
        return <FanCardSlot key={card.id} card={card} compact={metrics.compact} disabled={disabled} dragEnabled={dragEnabled} entranceDelay={index * entranceStep * (animationSpeed === "هادئة" ? 1.25 : animationSpeed === "سريعة" ? 0.72 : 1)} cardBackPattern={cardBackPattern} cardFaceTheme={cardFaceTheme} animationSpeed={animationSpeed} dealFlip={dealFlip} edgeFeedback={metrics.compact && (index === 0 || index === cards.length - 1)} hitSlop={getFanEdgeHitSlop(index, cards.length, metrics.compact)} position={position} onDragStateChange={onCardDragStateChange} onPlay={onCardPress ? () => onCardPress(card.id) : undefined} />;
      })}
    </View>
  );
}

function FanCardSlot({ card, compact, disabled, dragEnabled, entranceDelay, cardBackPattern, cardFaceTheme, animationSpeed, dealFlip, edgeFeedback, hitSlop, position, onDragStateChange, onPlay }: {
  card: Card;
  compact: boolean;
  disabled: boolean;
  dragEnabled: boolean;
  entranceDelay: number;
  cardBackPattern: CardBackPattern;
  cardFaceTheme: CardFaceTheme;
  animationSpeed: AnimationSpeed;
  dealFlip: boolean;
  edgeFeedback: boolean;
  hitSlop: ReturnType<typeof getFanEdgeHitSlop>;
  position: ReturnType<typeof getBalancedFanCardPosition>;
  onDragStateChange?: (dragging: boolean) => void;
  onPlay?: () => void;
}) {
  const departure = useSharedValue(0);
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const dragLift = useSharedValue(0);
  const [departing, setDeparting] = useState(false);
  const [pressTick, setPressTick] = useState(0);
  const dropThreshold = getCardDragDropThreshold(compact);
  const motion = animationSpeed === "هادئة" ? 1.28 : animationSpeed === "سريعة" ? 0.72 : 1;

  const finishDeparture = () => {
    setDeparting(false);
    onPlay?.();
  };
  const playCard = () => {
    if (!onPlay || departing) return;
    setDeparting(true);
    departure.value = withSequence(
      withTiming(0.34, { duration: 95 * motion, easing: Easing.out(Easing.cubic) }),
      withTiming(1, { duration: 190 * motion, easing: Easing.in(Easing.cubic) }, (finished) => {
        if (finished) runOnJS(finishDeparture)();
      }),
    );
  };
  const notifyDragState = (dragging: boolean) => onDragStateChange?.(dragging);
  const bumpPressSignal = () => setPressTick((tick) => tick + 1);
  const departureStyle = useAnimatedStyle(() => ({
    opacity: 1 - departure.value * 0.62,
    transform: [
      { translateX: dragX.value + position.rotation * departure.value * 0.45 },
      { translateY: dragY.value - 20 * Math.min(departure.value / 0.34, 1) - 38 * departure.value },
      { scale: 1 + dragLift.value * 0.06 + departure.value * 0.08 },
      { rotate: `${position.rotation * (1 - departure.value * 0.55)}deg` },
    ],
  }));
  const drag = Gesture.Pan()
    .enabled(Boolean(onPlay) && dragEnabled && !disabled && !departing)
    .activeOffsetY([-8, 8])
    .onBegin(() => {
      dragLift.value = withTiming(1, { duration: 90 * motion, easing: Easing.out(Easing.cubic) });
      runOnJS(notifyDragState)(true);
    })
    .onUpdate((event) => {
      dragX.value = event.translationX;
      dragY.value = Math.min(event.translationY, 16);
    })
    .onEnd((event) => {
      const reachesTable = isCardDragDrop(event.translationY, compact);
      if (reachesTable) {
        dragX.value = withTiming(event.translationX * 0.25, { duration: 110 * motion, easing: Easing.out(Easing.cubic) });
        dragY.value = withTiming(-dropThreshold - 28, { duration: 110 * motion, easing: Easing.out(Easing.cubic) });
        dragLift.value = withTiming(0, { duration: 110 * motion, easing: Easing.out(Easing.cubic) });
        runOnJS(playCard)();
      } else {
        dragX.value = withTiming(0, { duration: 170 * motion, easing: Easing.out(Easing.cubic) });
        dragY.value = withTiming(0, { duration: 170 * motion, easing: Easing.out(Easing.cubic) });
        dragLift.value = withTiming(0, { duration: 130 * motion, easing: Easing.out(Easing.cubic) });
      }
      runOnJS(notifyDragState)(false);
    })
    .onFinalize(() => {
      runOnJS(notifyDragState)(false);
    });
  // يُدار النقر والسحب عبر GestureDetector واحد. لا نمرر onPress إلى
  // PlayingCard كي لا تختلط Pressable الداخلية مع RNGH على Android الحقيقي.
  const tap = Gesture.Tap()
    .enabled(Boolean(onPlay) && !disabled && !departing)
    .maxDuration(400)
    .hitSlop(hitSlop)
    .onBegin(() => {
      runOnJS(bumpPressSignal)();
    })
    .onEnd((_event, success) => {
      if (success) runOnJS(playCard)();
    });
  const composedGesture = Gesture.Race(drag, tap);

  return (
    <Animated.View style={[styles.cardSlot, { left: position.left, bottom: position.bottom, zIndex: position.zIndex }, departureStyle]}>
      <GestureDetector gesture={composedGesture}>
        <View collapsable={false}>
          <PlayingCard card={card} compact={compact} entranceDelay={entranceDelay} cardBackPattern={cardBackPattern} cardFaceTheme={cardFaceTheme} animationSpeed={animationSpeed} dealFlip={dealFlip} disabled={disabled || departing} edgeFeedback={edgeFeedback} pressSignal={pressTick} />
        </View>
      </GestureDetector>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fan: { position: "relative", alignSelf: "center" },
  cardSlot: { position: "absolute" },
});
