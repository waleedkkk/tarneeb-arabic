import { useState } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withSequence, withTiming } from "react-native-reanimated";

import { PlayingCard } from "./card";
import { getBalancedFanCardPosition, getFanEdgeHitSlop, getResponsiveFanMetrics } from "@/lib/tarneeb/card-fan-layout";
import type { Card, CardFanCurve } from "@/lib/tarneeb/types";

interface CurvedCardHandProps {
  cards: Card[];
  accessibilityLabel: string;
  disabledCardIds?: string[];
  entranceStep?: number;
  curveStrength?: CardFanCurve;
  onCardPress?: (cardId: string) => void;
}

/** A shared, balanced card fan used anywhere the player reviews their hand. */
export function CurvedCardHand({
  cards,
  accessibilityLabel,
  disabledCardIds = [],
  entranceStep = 22,
  curveStrength = "balanced",
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
        return <FanCardSlot key={card.id} card={card} compact={metrics.compact} disabled={disabled} entranceDelay={index * entranceStep} edgeFeedback={metrics.compact && (index === 0 || index === cards.length - 1)} hitSlop={getFanEdgeHitSlop(index, cards.length, metrics.compact)} position={position} onPlay={onCardPress ? () => onCardPress(card.id) : undefined} />;
      })}
    </View>
  );
}

function FanCardSlot({ card, compact, disabled, entranceDelay, edgeFeedback, hitSlop, position, onPlay }: {
  card: Card;
  compact: boolean;
  disabled: boolean;
  entranceDelay: number;
  edgeFeedback: boolean;
  hitSlop: ReturnType<typeof getFanEdgeHitSlop>;
  position: ReturnType<typeof getBalancedFanCardPosition>;
  onPlay?: () => void;
}) {
  const departure = useSharedValue(0);
  const [departing, setDeparting] = useState(false);

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
  const departureStyle = useAnimatedStyle(() => ({
    opacity: 1 - departure.value * 0.62,
    transform: [
      { translateX: position.rotation * departure.value * 0.45 },
      { translateY: -20 * Math.min(departure.value / 0.34, 1) - 38 * departure.value },
      { scale: 1 + departure.value * 0.08 },
      { rotate: `${position.rotation * (1 - departure.value * 0.55)}deg` },
    ],
  }));

  return (
    <Animated.View style={[styles.cardSlot, { left: position.left, bottom: position.bottom, zIndex: position.zIndex }, departureStyle]}>
      <PlayingCard card={card} compact={compact} entranceDelay={entranceDelay} disabled={disabled || departing} hitSlop={hitSlop} edgeFeedback={edgeFeedback} onPress={onPlay ? playCard : undefined} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fan: { position: "relative", alignSelf: "center" },
  cardSlot: { position: "absolute" },
});
