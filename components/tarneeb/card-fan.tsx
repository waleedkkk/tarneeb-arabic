import { useState } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withSequence, withTiming } from "react-native-reanimated";

import { PlayingCard } from "./card";
import { getBalancedFanCardPosition, getCardDragDropThreshold, getFanEdgeHitSlop, getResponsiveFanMetrics, isCardDragDrop } from "@/lib/tarneeb/card-fan-layout";
import type { Card, CardBackPattern, CardFanCurve } from "@/lib/tarneeb/types";

interface CurvedCardHandProps {
  cards: Card[];
  accessibilityLabel: string;
  disabledCardIds?: string[];
  entranceStep?: number;
  curveStrength?: CardFanCurve;
  cardBackPattern?: CardBackPattern;
  dealFlip?: boolean;
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
  dealFlip = true,
  dragEnabled = false,
  onCardDragStateChange,
  onCardPress,
}: CurvedCardHandProps) {
  const { width } = useWindowDimensions();
  const metrics = getResponsiveFanMetrics(width);

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
        return <FanCardSlot key={card.id} card={card} compact={metrics.compact} disabled={disabled} dragEnabled={dragEnabled} entranceDelay={index * entranceStep} cardBackPattern={cardBackPattern} dealFlip={dealFlip} edgeFeedback={metrics.compact && (index === 0 || index === cards.length - 1)} hitSlop={getFanEdgeHitSlop(index, cards.length, metrics.compact)} position={position} onDragStateChange={onCardDragStateChange} onPlay={onCardPress ? () => onCardPress(card.id) : undefined} />;
      })}
    </View>
  );
}

function FanCardSlot({ card, compact, disabled, dragEnabled, entranceDelay, cardBackPattern, dealFlip, edgeFeedback, hitSlop, position, onDragStateChange, onPlay }: {
  card: Card;
  compact: boolean;
  disabled: boolean;
  dragEnabled: boolean;
  entranceDelay: number;
  cardBackPattern: CardBackPattern;
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
  const dropThreshold = getCardDragDropThreshold(compact);

  const finishDeparture = () => {
    setDeparting(false);
    onPlay?.();
  };
  const playCard = () => {
    if (!onPlay || departing) return;
    setDeparting(true);
    departure.value = withSequence(
      withTiming(0.34, { duration: 95, easing: Easing.out(Easing.cubic) }),
      withTiming(1, { duration: 190, easing: Easing.in(Easing.cubic) }, (finished) => {
        if (finished) runOnJS(finishDeparture)();
      }),
    );
  };
  const notifyDragState = (dragging: boolean) => onDragStateChange?.(dragging);
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
      dragLift.value = withTiming(1, { duration: 90, easing: Easing.out(Easing.cubic) });
      runOnJS(notifyDragState)(true);
    })
    .onUpdate((event) => {
      dragX.value = event.translationX;
      dragY.value = Math.min(event.translationY, 16);
    })
    .onEnd((event) => {
      const reachesTable = isCardDragDrop(event.translationY, compact);
      if (reachesTable) {
        dragX.value = withTiming(event.translationX * 0.25, { duration: 110, easing: Easing.out(Easing.cubic) });
        dragY.value = withTiming(-dropThreshold - 28, { duration: 110, easing: Easing.out(Easing.cubic) });
        dragLift.value = withTiming(0, { duration: 110, easing: Easing.out(Easing.cubic) });
        runOnJS(playCard)();
      } else {
        dragX.value = withTiming(0, { duration: 170, easing: Easing.out(Easing.cubic) });
        dragY.value = withTiming(0, { duration: 170, easing: Easing.out(Easing.cubic) });
        dragLift.value = withTiming(0, { duration: 130, easing: Easing.out(Easing.cubic) });
      }
      runOnJS(notifyDragState)(false);
    })
    .onFinalize(() => {
      runOnJS(notifyDragState)(false);
    });

  return (
    <Animated.View style={[styles.cardSlot, { left: position.left, bottom: position.bottom, zIndex: position.zIndex }, departureStyle]}>
      <GestureDetector gesture={drag}>
        <View>
          <PlayingCard card={card} compact={compact} entranceDelay={entranceDelay} cardBackPattern={cardBackPattern} dealFlip={dealFlip} disabled={disabled || departing} hitSlop={hitSlop} edgeFeedback={edgeFeedback} onPress={onPlay ? playCard : undefined} />
        </View>
      </GestureDetector>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fan: { position: "relative", alignSelf: "center" },
  cardSlot: { position: "absolute" },
});
