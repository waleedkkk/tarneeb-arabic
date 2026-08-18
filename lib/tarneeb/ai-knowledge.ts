import { teamOf } from "./engine";
import type { Card, MatchState, Seat, Suit, Team } from "./types";
import { SUITS } from "./types";

const SEATS: Seat[] = [0, 1, 2, 3];

/**
 * معرفة الخصم المسموح بها فقط: أوراقه، الأوراق الظاهرة على الطاولة،
 * والاستنتاجات الحتمية من عدم اتباع النوع. لا تُقرأ أي يد خصم مخفية.
 */
export interface AiVisibleKnowledge {
  /** أوراق خرجت بالفعل وظهرت لجميع اللاعبين. */
  seenCards: Card[];
  /** أوراق الخصم نفسه إضافة إلى الأوراق الظاهرة؛ تستعمل لمعرفة السيطرة على نوع. */
  knownCards: Card[];
  /** الأنواع التي ثبت أن كل مقعد خالٍ منها. */
  voidSuitsBySeat: Record<Seat, Suit[]>;
}

export type AiContractPosture = "neutral" | "secure" | "make-contract" | "urgent-attack" | "measured-defence" | "set-pressure";

function emptyVoids(): Record<Seat, Suit[]> {
  return { 0: [], 1: [], 2: [], 3: [] };
}

function uniqueCards(cards: Card[]): Card[] {
  return [...new Map(cards.map((card) => [card.id, card])).values()];
}

function registerVoids(voidSuitsBySeat: Record<Seat, Suit[]>, plays: Array<{ playerId: Seat; card: Card }>, leadSuit: Suit | null) {
  if (!leadSuit) return;
  plays.slice(1).forEach((play) => {
    if (play.card.suit !== leadSuit && !voidSuitsBySeat[play.playerId].includes(leadSuit)) {
      voidSuitsBySeat[play.playerId].push(leadSuit);
    }
  });
}

/** يبني معرفة الخصم من السجل العام واللمّة الجارية، مع يده الخاصة فقط. */
export function buildAiVisibleKnowledge(state: MatchState, playerId: Seat): AiVisibleKnowledge {
  const voidSuitsBySeat = emptyVoids();
  const completedPlays = state.matchLog.tricks.flatMap((trick) => {
    registerVoids(voidSuitsBySeat, trick.plays, trick.plays[0]?.card.suit ?? null);
    return trick.plays;
  });
  registerVoids(voidSuitsBySeat, state.trick.plays, state.trick.leadSuit ?? state.trick.plays[0]?.card.suit ?? null);

  const seenCards = uniqueCards([...completedPlays.map((play) => play.card), ...state.trick.plays.map((play) => play.card)]);
  const ownHand = state.players[playerId]?.hand ?? [];
  return { seenCards, knownCards: uniqueCards([...ownHand, ...seenCards]), voidSuitsBySeat };
}

/** هل كل الأوراق الأعلى من الورقة معروفة للخصم بأنها خرجت أو في يده؟ */
export function isKnownSuitControl(card: Card, knowledge: AiVisibleKnowledge): boolean {
  const knownRanks = new Set(knowledge.knownCards.filter((known) => known.suit === card.suit).map((known) => known.rank));
  for (let rank = card.rank + 1; rank <= 14; rank += 1) {
    if (!knownRanks.has(rank as Card["rank"])) return false;
  }
  return true;
}

/** عدد لاعبي الفريق المقابل الذين ثبت أنهم خالون من نوع ما. */
export function countShownVoids(knowledge: AiVisibleKnowledge, team: Team, suit: Suit): number {
  return SEATS.filter((seat) => teamOf(seat) === team && knowledge.voidSuitsBySeat[seat].includes(suit)).length;
}

/**
 * يحدد أولوية الفريق من حالة العقد الحالية. هذه الأولوية لا تحتاج إلى أي ورقة مخفية.
 */
export function getAiContractPosture(state: MatchState, playerId: Seat): AiContractPosture {
  const bidder = state.bidding.highestBidder;
  const bid = state.bidding.highestBid;
  if (bidder === null || bid === null) return "neutral";

  const bidderTeam = teamOf(bidder);
  const aiTeam = teamOf(playerId);
  const completed = state.tricksWon[0] + state.tricksWon[1];
  const remaining = Math.max(0, 13 - completed);
  const contractTricksNeeded = Math.max(0, bid - state.tricksWon[bidderTeam]);

  if (aiTeam === bidderTeam) {
    if (contractTricksNeeded === 0) return "secure";
    return contractTricksNeeded / Math.max(1, remaining) >= 0.7 ? "urgent-attack" : "make-contract";
  }

  // لإسقاط العقد، يحتاج الفريق المدافع لترك الفريق الطالب دون الرقم المطلوب.
  const defensiveTricksNeeded = Math.max(0, remaining - contractTricksNeeded + 1);
  if (contractTricksNeeded > remaining || defensiveTricksNeeded === 0) return "secure";
  return defensiveTricksNeeded <= 2 ? "set-pressure" : "measured-defence";
}

/** يعيد فريق صاحب العقد إن وُجد، لتقييم مخاطر الفراغات أثناء القيادة. */
export function contractTeamOf(state: MatchState): Team | null {
  return state.bidding.highestBidder === null ? null : teamOf(state.bidding.highestBidder);
}

/** نسخة ثابتة للاختبارات وللتأكد من أن كل الأنواع ممثلة في النتيجة. */
export function emptySuitMemory(): Record<Suit, number> {
  return Object.fromEntries(SUITS.map((suit) => [suit, 0])) as Record<Suit, number>;
}
