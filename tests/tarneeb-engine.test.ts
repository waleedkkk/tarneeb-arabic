import { describe, expect, it } from "vitest";
import { cardBeats, createHomeState, createRound, DEFAULT_SETTINGS, legalCards, playCard, resolveTrick, submitBid, suitName, suitStrength } from "../lib/tarneeb/engine";
import type { Card, Trick } from "../lib/tarneeb/types";

const card = (suit: Card["suit"], rank: Card["rank"]): Card => ({ id: `${suit}-${rank}`, suit, rank });

describe("محرك طرنيب", () => {
  it("يعرض clubs باسم سباتي مع إبقاء المفتاح الداخلي ثابتًا", () => {
    expect(suitName("clubs")).toBe("سباتي");
  });

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

  it("يحفظ أسماء أصحاب المزايدات واللمم في سجل المباراة", () => {
    const bidState = createRound(createHomeState(), true);
    const afterBid = submitBid(bidState, 0, 8);
    expect(afterBid.matchLog.bids).toEqual([{ playerId: 0, playerName: "أنت", bid: 8 }]);

    const cards = [card("clubs", 10), card("clubs", 13), card("spades", 2), card("clubs", 14)];
    const playingState = {
      ...afterBid,
      phase: "playing" as const,
      bidding: { ...afterBid.bidding, trumpSuit: "spades" as const },
      trick: { leaderId: 0 as const, leadSuit: null, plays: [] },
      players: afterBid.players.map((player, index) => ({ ...player, hand: [cards[index]], handCount: 1 })),
    };
    const afterTrick = cards.reduce<import("../lib/tarneeb/types").MatchState>((current, item, playerId) => playCard(current, playerId as 0 | 1 | 2 | 3, item.id), playingState);

    expect(afterTrick.matchLog.tricks).toHaveLength(1);
    expect(afterTrick.matchLog.tricks[0]).toMatchObject({ trickNumber: 1, winnerId: 2, winnerName: "فارس" });
    expect(afterTrick.matchLog.tricks[0].plays.map((play) => play.playerName)).toEqual(["أنت", "ليان", "فارس", "سامر"]);
  });

  it("يعيد بدء المباراة بجولة مزايدة جديدة مع تصفير النقاط واللمم", () => {
    const inProgress = {
      ...createRound(createHomeState(), true),
      round: 4,
      scores: { 0: 19, 1: 14 },
      tricksWon: { 0: 5, 1: 3 },
    };
    const restarted = createRound(createHomeState(), true);

    expect(inProgress.scores).toEqual({ 0: 19, 1: 14 });
    expect(restarted.phase).toBe("bidding");
    expect(restarted.round).toBe(1);
    expect(restarted.scores).toEqual({ 0: 0, 1: 0 });
    expect(restarted.tricksWon).toEqual({ 0: 0, 1: 0 });
    expect(restarted.players).toHaveLength(4);
  });

  it("يقيم النوع الطويل ذي الأوراق العالية باعتباره أقوى للطرنيب", () => {
    const hand = [card("spades", 14), card("spades", 13), card("spades", 12), card("spades", 11), card("spades", 8), card("spades", 3), card("hearts", 14), card("hearts", 2)];
    const spades = suitStrength(hand, "spades");
    const hearts = suitStrength(hand, "hearts");
    expect(spades.score).toBeGreaterThan(hearts.score);
    expect(spades.label).toBe("قوي");
    expect(spades.bars).toBeGreaterThan(hearts.bars);
  });

  it("يضبط تفضيلات العرض الافتراضية بصورة آمنة", () => {
    expect(DEFAULT_SETTINGS.showStrengthIndicator).toBe(true);
    expect(DEFAULT_SETTINGS.cardFanCurve).toBe("balanced");
    expect(DEFAULT_SETTINGS.cardBackPattern).toBe("royal");
    expect(DEFAULT_SETTINGS.tableTextSize).toBe("normal");
    expect(DEFAULT_SETTINGS.opponentCardDensity).toBe("balanced");
    expect(DEFAULT_SETTINGS.turnTimerSeconds).toBe(0);
    expect(DEFAULT_SETTINGS.aiLevel).toBe("متوازن");
    expect(DEFAULT_SETTINGS.aiStyle).toBe("متوازن");
  });
});
