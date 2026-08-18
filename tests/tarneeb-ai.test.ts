import { describe, expect, it } from "vitest";
import { chooseAiBid, chooseAiCard, chooseAiTrump, estimateAiBid } from "../lib/tarneeb/ai";
import { buildAiVisibleKnowledge, getAiContractPosture, isKnownSuitControl } from "../lib/tarneeb/ai-knowledge";
import { createHomeState, createRound } from "../lib/tarneeb/engine";
import type { Card, MatchState } from "../lib/tarneeb/types";

const card = (suit: Card["suit"], rank: Card["rank"]): Card => ({ id: `${suit}-${rank}`, suit, rank });

function withAiHand(state: MatchState, playerId: 1 | 2 | 3, hand: Card[]): MatchState {
  return {
    ...state,
    players: state.players.map((player) => player.id === playerId ? { ...player, hand, handCount: hand.length } : player),
  };
}

describe("ذكاء خصوم طرنيب", () => {
  const strongSpades = [
    card("spades", 14), card("spades", 13), card("spades", 12), card("spades", 10), card("spades", 8), card("spades", 4),
    card("hearts", 14), card("clubs", 7), card("diamonds", 3),
  ];

  it("يجعل المتقدم أكثر جرأة من المبتدئ عند مزايدة قريبة من تقدير اليد", () => {
    const estimate = estimateAiBid(strongSpades, "خبير", "متوازن");
    expect(chooseAiBid(strongSpades, estimate - 1, "خبير", "متوازن")).toBe(estimate);
    expect(chooseAiBid(strongSpades, estimate - 1, "مبتدئ", "متوازن")).toBeNull();
  });

  it("يختار الطرنيب من النوع الطويل المسيطر لا من أول نوع في اليد", () => {
    expect(chooseAiTrump(strongSpades, "خبير", "متوازن")).toBe("spades");
  });

  it("يحافظ الخبير على الطرنيب عندما تكون اللمّة محسومة لشريكه", () => {
    const round = createRound(createHomeState(), true);
    const state = withAiHand({
      ...round,
      phase: "playing",
      bidding: { ...round.bidding, trumpSuit: "spades" },
      trick: { leaderId: 0, leadSuit: "clubs", plays: [{ playerId: 0, card: card("clubs", 14) }, { playerId: 1, card: card("clubs", 3) }] },
    }, 2, [card("hearts", 2), card("spades", 14)]);

    expect(chooseAiCard(state, 2, "خبير", "متوازن")).toEqual(card("hearts", 2));
  });

  it("يتخلص الخبير من أعلى ورقة غير رابحة قبل الطرنيب عند العجز عن الفوز", () => {
    const round = createRound(createHomeState(), true);
    const state = withAiHand({
      ...round,
      phase: "playing",
      bidding: { ...round.bidding, trumpSuit: "spades" },
      trick: { leaderId: 0, leadSuit: "hearts", plays: [{ playerId: 0, card: card("hearts", 12) }, { playerId: 2, card: card("spades", 14) }] },
    }, 1, [card("diamonds", 13), card("spades", 2)]);

    expect(chooseAiCard(state, 1, "خبير", "متوازن")).toEqual(card("diamonds", 13));
  });

  it("يميّز بين شخصية حارسة ومبادر عند امتلاك ورقتين رابحتين في اللمّة", () => {
    const round = createRound(createHomeState(), true);
    const state = withAiHand({
      ...round,
      phase: "playing",
      bidding: { ...round.bidding, trumpSuit: "hearts" },
      trick: { leaderId: 0, leadSuit: "clubs", plays: [{ playerId: 0, card: card("clubs", 7) }] },
    }, 1, [card("clubs", 8), card("clubs", 12)]);

    expect(chooseAiCard(state, 1, "متوازن", "متوازن", "layaan")).toEqual(card("clubs", 8));
    expect(chooseAiCard(state, 1, "متوازن", "متوازن", "samar")).toEqual(card("clubs", 12));
  });

  it("يبني ذاكرة AI 2.0 من اليد الخاصة والسجل الظاهر فقط دون قراءة يد خصم مخفية", () => {
    const round = createRound(createHomeState(), true);
    const state = withAiHand({
      ...round,
      players: round.players.map((player) => player.id === 0 ? { ...player, hand: [card("clubs", 14)], handCount: 1 } : player),
    }, 1, [card("clubs", 10)]);

    const knowledge = buildAiVisibleKnowledge(state, 1);
    expect(knowledge.knownCards).toEqual([card("clubs", 10)]);
    expect(isKnownSuitControl(card("clubs", 10), knowledge)).toBe(false);
  });

  it("يستنتج فراغ اللاعب من نوع عندما يرمي نوعًا آخر بعد قيادة ذلك النوع", () => {
    const round = createRound(createHomeState(), true);
    const state = withAiHand({
      ...round,
      matchLog: {
        ...round.matchLog,
        tricks: [{
          trickNumber: 1,
          winnerId: 0,
          winnerName: "أنت",
          plays: [
            { playerId: 0, playerName: "أنت", card: card("hearts", 14) },
            { playerId: 1, playerName: "ليان", card: card("clubs", 2) },
            { playerId: 2, playerName: "فارس", card: card("hearts", 3) },
            { playerId: 3, playerName: "سامر", card: card("hearts", 4) },
          ],
        }],
      },
    }, 2, [card("spades", 6)]);

    expect(buildAiVisibleKnowledge(state, 2).voidSuitsBySeat[1]).toContain("hearts");
  });

  it("يتجنب الخبير قيادة نوع ثبت أن خصمًا خالٍ منه عندما توجد قيادة بديلة", () => {
    const round = createRound(createHomeState(), true);
    const state = withAiHand({
      ...round,
      phase: "playing",
      bidding: { ...round.bidding, trumpSuit: "spades" },
      matchLog: {
        ...round.matchLog,
        tricks: [{
          trickNumber: 1,
          winnerId: 0,
          winnerName: "أنت",
          plays: [
            { playerId: 0, playerName: "أنت", card: card("hearts", 8) },
            { playerId: 1, playerName: "ليان", card: card("hearts", 2) },
            { playerId: 2, playerName: "فارس", card: card("clubs", 3) },
            { playerId: 3, playerName: "سامر", card: card("hearts", 4) },
          ],
        }],
      },
      trick: { leaderId: 1, leadSuit: null, plays: [] },
    }, 1, [card("hearts", 13), card("clubs", 3)]);

    expect(chooseAiCard(state, 1, "خبير", "متوازن", "layaan")).toEqual(card("clubs", 3));
  });

  it("يتحول إلى ضغط العقد أو حماية النتيجة بحسب اللمم المتبقية", () => {
    const round = createRound(createHomeState(), true);
    const urgentState: MatchState = {
      ...round,
      bidding: { ...round.bidding, highestBidder: 1, highestBid: 10, trumpSuit: "spades" },
      tricksWon: { 0: 2, 1: 7 },
    };
    const secureState: MatchState = { ...urgentState, tricksWon: { 0: 2, 1: 10 } };

    expect(getAiContractPosture(urgentState, 1)).toBe("urgent-attack");
    expect(getAiContractPosture(urgentState, 2)).toBe("set-pressure");
    expect(getAiContractPosture(secureState, 1)).toBe("secure");
  });

  it("يضمن اللمّة بأقل ورقة رابحة عند ضغط العقد حتى مع شخصية مبادرة", () => {
    const round = createRound(createHomeState(), true);
    const state = withAiHand({
      ...round,
      phase: "playing",
      bidding: { ...round.bidding, highestBidder: 1, highestBid: 10, trumpSuit: "spades" },
      tricksWon: { 0: 2, 1: 7 },
      trick: { leaderId: 0, leadSuit: "clubs", plays: [{ playerId: 0, card: card("clubs", 7) }] },
    }, 1, [card("clubs", 8), card("clubs", 12)]);

    expect(chooseAiCard(state, 1, "خبير", "مبادر", "samar")).toEqual(card("clubs", 8));
  });
});
