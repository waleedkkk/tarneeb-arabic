import { createDeck, teamOf } from "./engine";
import { buildAiVisibleKnowledge } from "./ai-knowledge";
import type { Card, MatchState, Seat, Suit } from "./types";
import { SUITS } from "./types";

const SEATS: Seat[] = [0, 1, 2, 3];

export interface AiDistributionEstimate {
  /** الأوراق التي لا يملك AI معلومات مؤكدة عنها؛ لا تُستمد من أيدي الخصوم. */
  unseenCards: Card[];
  /** احتمال أن يملك مقعد ما ورقة واحدة على الأقل من النوع. */
  suitPresenceBySeat: Record<Seat, Record<Suit, number>>;
  /** العدد المتوقع من أوراق كل نوع لدى المقعد، بعد تطبيق قيود الفراغ المعروفة. */
  expectedSuitCardsBySeat: Record<Seat, Record<Suit, number>>;
}

function emptySuitRecord(): Record<Suit, number> {
  return Object.fromEntries(SUITS.map((suit) => [suit, 0])) as Record<Suit, number>;
}

function emptySeatSuitRecord(): Record<Seat, Record<Suit, number>> {
  return { 0: emptySuitRecord(), 1: emptySuitRecord(), 2: emptySuitRecord(), 3: emptySuitRecord() };
}

function clampProbability(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/** مقعد الشريك ثابت في لعبة الفرق ذات المقاعد الأربعة. */
export function aiPartnerSeat(playerId: Seat): Seat {
  return ((playerId + 2) % 4) as Seat;
}

/**
 * يقدر توزيع الأوراق غير المرئية عبر اليد الخاصة، سجل اللمم، وعدد أوراق المقاعد فقط.
 * لا يقرأ هذا الملف `hand` لأي مقعد آخر، لذلك يبقى عادلاً حتى عندما تكون أيدي الخصوم موجودة
 * محلياً في حالة محرك اللعبة.
 */
export function estimateAiDistribution(state: MatchState, playerId: Seat): AiDistributionEstimate {
  const knowledge = buildAiVisibleKnowledge(state, playerId);
  const knownIds = new Set(knowledge.knownCards.map((card) => card.id));
  const unseenCards = createDeck().filter((card) => !knownIds.has(card.id));
  const suitPresenceBySeat = emptySeatSuitRecord();
  const expectedSuitCardsBySeat = emptySeatSuitRecord();

  SUITS.forEach((suit) => {
    const unseenSuitCount = unseenCards.filter((card) => card.suit === suit).length;
    const eligibleSeats = SEATS.filter((seat) =>
      seat !== playerId
      && state.players[seat]?.handCount > 0
      && !knowledge.voidSuitsBySeat[seat].includes(suit),
    );
    const eligibleSlots = eligibleSeats.reduce<number>((total, seat) => total + state.players[seat].handCount, 0);

    eligibleSeats.forEach((seat) => {
      const handCount = state.players[seat].handCount;
      const expected = eligibleSlots === 0 ? 0 : unseenSuitCount * handCount / eligibleSlots;
      expectedSuitCardsBySeat[seat][suit] = expected;
      // تقريب بواسون ثابت: تحويل العدد المتوقع إلى احتمال امتلاك ورقة واحدة على الأقل.
      suitPresenceBySeat[seat][suit] = clampProbability(1 - Math.exp(-expected));
    });
  });

  return { unseenCards, suitPresenceBySeat, expectedSuitCardsBySeat };
}

/** احتمال أن يستطيع خصم واحد أو أكثر قطع قيادة من نوع آخر بالطرنيب. */
export function estimateOpponentTrumpRisk(
  state: MatchState,
  playerId: Seat,
  leadSuit: Suit,
  trumpSuit: Suit,
  estimate = estimateAiDistribution(state, playerId),
): number {
  if (leadSuit === trumpSuit) return 0;
  const knowledge = buildAiVisibleKnowledge(state, playerId);
  const opposingTeam = teamOf(playerId) === 0 ? 1 : 0;
  const voidOpponents = SEATS.filter((seat) =>
    teamOf(seat) === opposingTeam && knowledge.voidSuitsBySeat[seat].includes(leadSuit),
  );
  return clampProbability(1 - voidOpponents.reduce<number>(
    (noTrumpChance, seat) => noTrumpChance * (1 - estimate.suitPresenceBySeat[seat][trumpSuit]),
    1,
  ));
}

/** مقدار ثقة AI بأن شريكه يستطيع اتباع نوع القيادة والمشاركة في اللمّة. */
export function estimatePartnerSuitSupport(
  state: MatchState,
  playerId: Seat,
  suit: Suit,
  estimate = estimateAiDistribution(state, playerId),
): number {
  return estimate.suitPresenceBySeat[aiPartnerSeat(playerId)][suit];
}
