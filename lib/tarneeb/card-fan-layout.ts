export interface FanCardPosition {
  left: number;
  bottom: number;
  rotation: number;
  zIndex: number;
}

const CARD_FOOTPRINT = 64;
const BASELINE = 4;
const ARC_LIFT = 14;
const MAX_ROTATION = 12;

/**
 * Returns a symmetric, shallow arc for a hand of cards. The center card stays
 * upright and highest, while matching cards on both sides mirror each other.
 */
export function getEqualFanCardPosition(index: number, total: number, fanWidth: number): FanCardPosition {
  const cardCount = Math.max(total, 1);
  const safeIndex = Math.min(Math.max(index, 0), cardCount - 1);
  const center = (cardCount - 1) / 2;
  const normalizedDistance = center === 0 ? 0 : (safeIndex - center) / center;
  const usableWidth = Math.max(fanWidth - CARD_FOOTPRINT, 0);
  const left = cardCount === 1 ? usableWidth / 2 : (safeIndex / (cardCount - 1)) * usableWidth;

  return {
    left,
    bottom: BASELINE + (1 - normalizedDistance ** 2) * ARC_LIFT,
    rotation: normalizedDistance === 0 ? 0 : -normalizedDistance * MAX_ROTATION,
    zIndex: 20 - Math.round(Math.abs(normalizedDistance) * 8),
  };
}
