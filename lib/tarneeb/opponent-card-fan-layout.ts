export type OpponentSeatPosition = "top" | "left" | "right";
export type OpponentCardDensity = "compact" | "balanced" | "spacious";

export interface OpponentCardFanLayout {
  count: number;
  step: number;
  rotation: number;
  lift: number;
}

/**
 * يوزّع ظهور أوراق الخصوم ضمن مروحة مصغرة. تُعرض كل الأوراق، بينما يتقلص
 * التباعد تدريجيًا كي لا تتجاوز المروحة المساحة المتاحة حول الطاولة.
 */
export function getOpponentCardFanLayout(cards: number, position: OpponentSeatPosition, density: OpponentCardDensity = "balanced"): OpponentCardFanLayout[] {
  const count = Math.max(0, Math.min(13, Math.floor(cards)));
  if (count === 0) return [];

  const isTop = position === "top";
  const densityScale = density === "compact" ? 0.78 : density === "spacious" ? 1.18 : 1;
  const span = 66 * densityScale;
  const maxStep = (isTop ? 19 : 15) * densityScale;
  const step = count === 1 ? 0 : Math.min(maxStep, span / (count - 1));
  const center = (count - 1) / 2;
  const rotationStep = 0;

  return Array.from({ length: count }, (_, index) => {
    const offset = index - center;
    return {
      count,
      step,
      rotation: offset * rotationStep,
      lift: 0,
    };
  });
}
