export interface FanCardPosition {
  left: number;
  bottom: number;
  rotation: number;
  zIndex: number;
}

const STANDARD_CARD_FOOTPRINT = 64;
const COMPACT_CARD_FOOTPRINT = 52;
const MAX_FAN_WIDTH = 340;

export interface ResponsiveFanMetrics {
  fanWidth: number;
  fanHeight: number;
  cardFootprint: number;
  compact: boolean;
}

/**
 * Keeps the complete hand within narrow phone screens. Compact cards retain a
 * 48px visual width plus their touch margin, while regular cards are used when
 * there is room for the full 60px card treatment.
 */
export function getResponsiveFanMetrics(viewportWidth: number): ResponsiveFanMetrics {
  const compact = viewportWidth < 344;
  const cardFootprint = compact ? COMPACT_CARD_FOOTPRINT : STANDARD_CARD_FOOTPRINT;
  const horizontalInset = compact ? 24 : 44;
  const availableWidth = Math.max(viewportWidth - horizontalInset, cardFootprint);
  const fanWidth = Math.min(availableWidth, MAX_FAN_WIDTH);

  return {
    fanWidth,
    fanHeight: compact ? 88 : 112,
    cardFootprint,
    compact,
  };
}

/**
 * توسّع الهدف التفاعلي لبطاقتي طرف القوس من الجهة المكشوفة فقط، لتفادي
 * التداخل مع بقية الأوراق في الشاشات الضيقة.
 */
export function getFanEdgeHitSlop(index: number, total: number, compact: boolean) {
  if (!compact || total < 2) return undefined;
  const isFirst = index === 0;
  const isLast = index === total - 1;
  if (!isFirst && !isLast) return undefined;

  return {
    top: 7,
    bottom: 7,
    left: isFirst ? 14 : 4,
    right: isLast ? 14 : 4,
  };
}

/**
 * Returns a balanced fan: both sides begin at the same baseline, while the
 * center rises gently to form an even arc. Cards retain symmetric rotation
 * and left-to-right stacking so their exposed edges stay easy to select.
 */
export function getBalancedFanCardPosition(
  index: number,
  total: number,
  fanWidth: number,
  cardFootprint = STANDARD_CARD_FOOTPRINT,
  compact = false,
): FanCardPosition {
  const cardCount = Math.max(total, 1);
  const safeIndex = Math.min(Math.max(index, 0), cardCount - 1);
  const progress = cardCount === 1 ? 0.5 : safeIndex / (cardCount - 1);
  const usableWidth = Math.max(fanWidth - cardFootprint, 0);
  const left = cardCount === 1 ? usableWidth / 2 : (safeIndex / (cardCount - 1)) * usableWidth;
  const baseline = compact ? 2 : 4;
  const curveLift = compact ? 11 : 16;
  const maxRotation = compact ? 7 : 10;
  const centeredProgress = progress - 0.5;
  const curve = 1 - Math.abs(centeredProgress * 2);

  return {
    left,
    bottom: baseline + curve * curveLift,
    rotation: centeredProgress * maxRotation,
    zIndex: 10 + safeIndex,
  };
}
