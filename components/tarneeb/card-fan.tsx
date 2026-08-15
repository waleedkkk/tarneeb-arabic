import { StyleSheet, useWindowDimensions, View } from "react-native";

import { PlayingCard } from "./card";
import { getEqualFanCardPosition, getFanEdgeHitSlop, getResponsiveFanMetrics } from "@/lib/tarneeb/card-fan-layout";
import type { Card } from "@/lib/tarneeb/types";

interface CurvedCardHandProps {
  cards: Card[];
  accessibilityLabel: string;
  disabledCardIds?: string[];
  entranceStep?: number;
  onCardPress?: (cardId: string) => void;
}

/** A shared, symmetric card fan used anywhere the player reviews their hand. */
export function CurvedCardHand({
  cards,
  accessibilityLabel,
  disabledCardIds = [],
  entranceStep = 22,
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
        const position = getEqualFanCardPosition(
          index,
          cards.length,
          metrics.fanWidth,
          metrics.cardFootprint,
          metrics.compact,
        );
        const disabled = disabledCardIds.includes(card.id);
        return (
          <View
            key={card.id}
            style={[
              styles.cardSlot,
              {
                left: position.left,
                bottom: position.bottom,
                zIndex: position.zIndex,
                transform: [{ rotate: `${position.rotation}deg` }],
              },
            ]}
          >
            <PlayingCard
              card={card}
              compact={metrics.compact}
              entranceDelay={index * entranceStep}
              disabled={disabled}
              hitSlop={getFanEdgeHitSlop(index, cards.length, metrics.compact)}
              onPress={onCardPress ? () => onCardPress(card.id) : undefined}
            />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  fan: { position: "relative", alignSelf: "center" },
  cardSlot: { position: "absolute" },
});
