import { describe, expect, it } from "vitest";
import { cardBeats, createHomeState, createRound, DEFAULT_SETTINGS, legalCards, resolveTrick, submitBid, suitStrength } from "../lib/tarneeb/engine";
import type { Card, Trick } from "../lib/tarneeb/types";

const card = (suit: Card["suit"], rank: Card["rank"]): Card => ({ id: `${suit}-${rank}`, suit, rank });

describe("محرك طرنيب", () => {
  it("يلزم اللاعب باتباع النوع المقاد عند توفره", () => {
    const hand = [card("hearts", 2), card("spades", 14)];
    const trick: Trick = { leaderId: 1, leadSuit: "hearts", plays: [{ playerId: 1, card: card("hearts", 8) }] };
    expect(legalCards(hand, trick)).toEqual([hand[0]]);
  });

  it("يعطي الأفضلية للطرنيب فوق النوع المقاد", () => {
    expect(cardBeats(card("spades", 2), card("hearts", 14), "hearts", "spades")).toBe(true);
  });

  it("يحسم اللمّة لأعلى طرنيب", () => {
    const trick: Trick = { leaderId: 0, leadSuit: "clubs", plays: [
      { playerId: 0, card: card("clubs", 14) }, { playerId: 1, card: card("clubs", 13) }, { playerId: 2, card: card("spades", 3) }, { playerId: 3, card: card("spades", 10) },
    ] };
    expect(resolveTrick(trick, "spades").winnerId).toBe(3);
  });

  it("يسجل أعلى عرض وينقل الدور", () => {
    const state = createRound(createHomeState(), true);
    const next = submitBid(state, 0, 8);
    expect(next.bidding.highestBid).toBe(8);
    expect(next.bidding.highestBidder).toBe(0);
    expect(next.bidding.currentPlayer).toBe(1);
  });

  it("يقيم النوع الطويل ذي الأوراق العالية باعتباره أقوى للطرنيب", () => {
    const hand = [card("spades", 14), card("spades", 13), card("spades", 12), card("spades", 11), card("spades", 8), card("spades", 3), card("hearts", 14), card("hearts", 2)];
    const spades = suitStrength(hand, "spades");
    const hearts = suitStrength(hand, "hearts");
    expect(spades.score).toBeGreaterThan(hearts.score);
    expect(spades.label).toBe("قوي");
    expect(spades.bars).toBeGreaterThan(hearts.bars);
  });

  it("يبقي مؤشر القوة ظاهرًا افتراضيًا مع إمكان تعطيله من الإعدادات", () => {
    expect(DEFAULT_SETTINGS.showStrengthIndicator).toBe(true);
  });
});
