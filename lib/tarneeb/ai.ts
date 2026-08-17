import { cardBeats, legalCards, teamOf } from "./engine";
import { getAiPersona } from "./personas";
import type { AiLevel, AiPersonaId, AiStyle, Card, MatchState, Seat, Suit } from "./types";
import { SUITS } from "./types";

const HIGH_CARD_POINTS: Partial<Record<Card["rank"], number>> = { 10: 0.5, 11: 0.9, 12: 1.25, 13: 2, 14: 3.25 };

function byLowestRank(left: Card, right: Card) {
  return left.rank - right.rank || left.suit.localeCompare(right.suit);
}

function byHighestRank(left: Card, right: Card) {
  return right.rank - left.rank || left.suit.localeCompare(right.suit);
}

function cardsOfSuit(hand: Card[], suit: Suit) {
  return hand.filter((card) => card.suit === suit);
}

/** يقدّر متانة النوع من طوله والأوراق العالية التي تتحكم فيه. */
export function aiSuitStrength(hand: Card[], suit: Suit): number {
  const cards = cardsOfSuit(hand, suit);
  const highPoints = cards.reduce((total, card) => total + (HIGH_CARD_POINTS[card.rank] ?? 0), 0);
  const lengthBonus = cards.length >= 7 ? 2.3 : cards.length >= 6 ? 1.25 : cards.length >= 5 ? 0.55 : 0;
  return cards.length * 1.15 + highPoints + lengthBonus;
}

function styleOffset(style: AiStyle) {
  return style === "مبادر" ? 0.65 : style === "حذر" ? -0.6 : 0;
}

/** يعيد تقديرًا مُقيَّدًا من 7 إلى 13 قبل مقارنته بالطلب الحالي. */
export function estimateAiBid(hand: Card[], level: AiLevel, style: AiStyle, personaId?: AiPersonaId): number {
  const persona = getAiPersona(personaId);
  const suitScores = SUITS.map((suit) => aiSuitStrength(hand, suit));
  const strongestSuit = Math.max(...suitScores);
  const outsideControls = hand
    .filter((card) => card.rank >= 13)
    .reduce((total, card) => total + (card.rank === 14 ? 0.45 : 0.25), 0);
  const skillOffset = level === "خبير" ? 0.35 : level === "مبتدئ" ? -0.55 : 0;
  const raw = 6 + Math.floor((strongestSuit + outsideControls + styleOffset(style) + skillOffset + persona.bidBias) / 3.7);
  return Math.max(7, Math.min(13, raw));
}

export function chooseAiBid(hand: Card[], highestBid: number | null, level: AiLevel, style: AiStyle, personaId?: AiPersonaId): number | null {
  const estimate = estimateAiBid(hand, level, style, personaId);
  if (highestBid === null) {
    // المبتدئ يفضّل عدم فتح مزايدة من يد ضعيفة؛ الخصم الخبير يثق بتقديره عندما تكون اليد متماسكة.
    const openThreshold = level === "مبتدئ" ? 8 : 7;
    return estimate >= openThreshold ? estimate : null;
  }
  const requiredMargin = level === "مبتدئ" ? 2 : 1;
  return estimate >= highestBid + requiredMargin ? estimate : null;
}

export function chooseAiTrump(hand: Card[], level: AiLevel, style: AiStyle, personaId?: AiPersonaId): Suit {
  const persona = getAiPersona(personaId);
  return [...SUITS].sort((left, right) => {
    const leftCards = cardsOfSuit(hand, left);
    const rightCards = cardsOfSuit(hand, right);
    const levelWeight = level === "مبتدئ" ? 0.2 : level === "خبير" ? 1.2 : 0.7;
    const leftScore = leftCards.length * (1.1 + levelWeight + persona.trumpLengthBias * 0.45) + aiSuitStrength(hand, left) * (1 + persona.trumpHonorBias * 0.08) + (style === "مبادر" && leftCards.some((card) => card.rank === 14) ? 0.4 : 0);
    const rightScore = rightCards.length * (1.1 + levelWeight + persona.trumpLengthBias * 0.45) + aiSuitStrength(hand, right) * (1 + persona.trumpHonorBias * 0.08) + (style === "مبادر" && rightCards.some((card) => card.rank === 14) ? 0.4 : 0);
    return rightScore - leftScore || rightCards.length - leftCards.length || left.localeCompare(right);
  })[0];
}

function currentWinningPlay(state: MatchState) {
  const leadSuit = state.trick.leadSuit!;
  const trumpSuit = state.bidding.trumpSuit!;
  return state.trick.plays.reduce((winner, play) => cardBeats(play.card, winner.card, leadSuit, trumpSuit) ? play : winner);
}

function opponentsHaveShownVoid(state: MatchState, team: 0 | 1, suit: Suit) {
  return state.matchLog.tricks.some((entry) => {
    const leadSuit = entry.plays[0]?.card.suit;
    return leadSuit === suit && entry.plays.slice(1).some((play) => teamOf(play.playerId) !== team && play.card.suit !== suit);
  });
}

function chooseLeadCard(state: MatchState, playerId: Seat, playable: Card[], level: AiLevel, style: AiStyle, personaId?: AiPersonaId) {
  const persona = getAiPersona(personaId);
  if (level === "مبتدئ") return [...playable].sort(persona.leadRankBias > 0.1 ? byHighestRank : byLowestRank)[0];
  const trump = state.bidding.trumpSuit!;
  const team = teamOf(playerId);
  const candidates = playable.filter((card) => card.suit !== trump);
  const pool = candidates.length > 0 ? candidates : playable;
  const scored = pool.map((card) => {
    const suitCards = cardsOfSuit(state.players[playerId].hand, card.suit);
    const exposedVoidPenalty = level === "خبير" && opponentsHaveShownVoid(state, team, card.suit) ? 4 + (persona.tendency === "تحكّم" ? 1.2 : 0) : 0;
    const rankIntent = (style === "مبادر" ? card.rank * 0.12 : style === "حذر" ? -card.rank * 0.04 : 0) + card.rank * persona.leadRankBias;
    return { card, score: aiSuitStrength(state.players[playerId].hand, card.suit) + suitCards.length * 0.35 + rankIntent - exposedVoidPenalty };
  });
  const bestScore = Math.max(...scored.map((entry) => entry.score));
  const bestSuitCards = scored.filter((entry) => entry.score === bestScore).map((entry) => entry.card);
  return [...bestSuitCards].sort(style === "مبادر" || persona.preferWinningPressure ? byHighestRank : byLowestRank)[0];
}

export function chooseAiCard(state: MatchState, playerId: 1 | 2 | 3, level: AiLevel, style: AiStyle, personaId?: AiPersonaId): Card {
  const persona = getAiPersona(personaId);
  const hand = state.players[playerId].hand;
  const playable = legalCards(hand, state.trick);
  const leadSuit = state.trick.leadSuit;
  const trumpSuit = state.bidding.trumpSuit!;
  if (!leadSuit || state.trick.plays.length === 0) return chooseLeadCard(state, playerId, playable, level, style, personaId);

  const winner = currentWinningPlay(state);
  const winningOptions = playable.filter((card) => cardBeats(card, winner.card, leadSuit, trumpSuit));
  const partnerIsWinning = teamOf(winner.playerId) === teamOf(playerId);
  if (partnerIsWinning && level !== "مبتدئ" && persona.preserveTrump) {
    // لا يهدر الخصم المتوازن أو الخبير ورقة رابحة فوق لمّة محسومة لفريقه.
    const nonTrump = playable.filter((card) => card.suit !== trumpSuit);
    return [...(nonTrump.length > 0 ? nonTrump : playable)].sort(byLowestRank)[0];
  }
  if (winningOptions.length > 0) {
    const ordered = [...winningOptions].sort((style === "مبادر" && level !== "مبتدئ") || persona.preferWinningPressure ? byHighestRank : byLowestRank);
    return ordered[0];
  }
  if (level === "خبير") {
    // عند عدم الإمكان، يتخلص الخبير من أعلى ورقة غير رابحة مع الحفاظ على الطرنيب ما استطاع.
    const discardPool = playable.filter((card) => card.suit !== trumpSuit);
    return [...(discardPool.length > 0 ? discardPool : playable)].sort(style === "حذر" || persona.tendency === "استدراج" ? byLowestRank : byHighestRank)[0];
  }
  return [...playable].sort(byLowestRank)[0];
}
