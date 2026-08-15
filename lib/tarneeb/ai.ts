import { cardBeats, legalCards } from "./engine";
import type { Card, MatchState, Suit } from "./types";
import { SUITS } from "./types";

export function chooseAiBid(hand: Card[], highestBid: number | null, style: "هادئ" | "متوازن" | "جريء"): number | null {
  const aces = hand.filter((card) => card.rank === 14).length;
  const kings = hand.filter((card) => card.rank === 13).length;
  const longestSuit = Math.max(...SUITS.map((suit) => hand.filter((card) => card.suit === suit).length));
  const base = 6 + Math.min(5, Math.floor((aces * 1.3 + kings * 0.5 + longestSuit) / 2));
  const modifier = style === "جريء" ? 1 : style === "هادئ" ? -1 : 0;
  const estimate = Math.max(7, Math.min(13, base + modifier));
  if (highestBid === null) return estimate;
  return estimate > highestBid ? estimate : null;
}

export function chooseAiTrump(hand: Card[]): Suit {
  return [...SUITS].sort((left, right) => {
    const rightCount = hand.filter((card) => card.suit === right).length;
    const leftCount = hand.filter((card) => card.suit === left).length;
    return rightCount - leftCount;
  })[0];
}

export function chooseAiCard(state: MatchState, playerId: 1 | 2 | 3): Card {
  const hand = state.players[playerId].hand;
  const playable = legalCards(hand, state.trick);
  const leadSuit = state.trick.leadSuit;
  const trumpSuit = state.bidding.trumpSuit!;
  if (!leadSuit || state.trick.plays.length === 0) return [...playable].sort((a, b) => a.rank - b.rank)[0];

  let currentWinner = state.trick.plays[0].card;
  state.trick.plays.slice(1).forEach((play) => {
    if (cardBeats(play.card, currentWinner, leadSuit, trumpSuit)) currentWinner = play.card;
  });
  const winningOptions = playable.filter((card) => cardBeats(card, currentWinner, leadSuit, trumpSuit));
  return [...(winningOptions.length > 0 ? winningOptions : playable)].sort((a, b) => a.rank - b.rank)[0];
}
