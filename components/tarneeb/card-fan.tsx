import { StyleSheet, useWindowDimensions, View } from "react-native";

import { PlayingCard } from "./card";
import { getEqualFanCardPosition } from "@/lib/tarneeb/card-fan-layout";
import type { Card } from "@/lib/tarneeb/types";

const MAX_FAN_WIDTH = 340;
const MIN_FAN_WIDTH = 270;
const HORIZONTAL_INSET = 44;

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
  const fanWidth = Math.min(Math.max(width - HORIZONTAL_INSET, MIN_FAN_WIDTH), MAX_FAN_WIDTH);

  return (
    <View accessibilityLabel={accessibilityLabel} style={[styles.fan, { width: fanWidth }]}>
      {cards.map((card, index) => {
        const position = getEqualFanCardPosition(index, cards.length, fanWidth);
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
              entranceDelay={index * entranceStep}
              disabled={disabled}
              onPress={onCardPress ? () => onCardPress(card.id) : undefined}
            />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  fan: { height: 112, position: "relative", alignSelf: "center" },
  cardSlot: { position: "absolute" },
});
