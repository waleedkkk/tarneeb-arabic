import { describe, expect, it } from "vitest";

import { solveEndgame } from "../lib/tarneeb/ai-endgame";
import type { BiddingState, Card, MatchState, MatchMode, Suit, Team } from "../lib/tarneeb/types";
import type { Rank, Seat } from "../lib/tarneeb/types";

const SUITS: Suit[] = ["spades", "hearts", "diamonds", "clubs"];
let cardId = 0;

function makeCard(suit: Suit, rank: Rank): Card {
  cardId += 1;
  return { id: `endgame-${suit}-${rank}-${cardId}`, suit, rank };
}

function makeHand(cards: Array<[Suit, Rank]>): Card[] {
  return cards.map(([suit, rank]) => makeCard(suit, rank));
}

function makeMatchState(hand: Card[]): MatchState {
  const allRanks: Rank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
  const used = new Set(hand.map((card) => `${card.suit}-${card.rank}`));
  const remaining: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of allRanks) {
      if (!used.has(`${suit}-${rank}`)) remaining.push(makeCard(suit, rank));
    }
  }
  // اليد الممررة تخص اللاعب المستهدف (playerId=1). المتبقي يمثل أوراق
  // بقية الجولة غير المرئية: يُوزع جزؤه الأول على بقية المقاعد بأعداد متساوية
  // لتبدو كأيدٍ لنهاية جولة، والجزء الأخير يمثل الأوراق الخارجة فعلًا من الجولة
  // (غير موجودة لدى أي مقعد) — لأن محكّي النهاية يعرف عدد أوراقه الحقيقية فقط
  // ويعيّن الأعداد عبر handCount، فنترك unseen يتسع لكل الاحتمالات.
  const othersTotal = 13 - hand.length;
  const otherCount = Math.max(0, Math.floor(othersTotal / 3));
  const hands: Card[][] = [
    remaining.slice(0, otherCount),
    hand,
    remaining.slice(otherCount, otherCount * 2),
    remaining.slice(otherCount * 2, otherCount * 3),
  ];

  const players = hands.map((playerHand, index) => ({
    id: index as Seat,
    name: `p${index}`,
    seat: index as Seat,
    team: (index % 2) as Team,
    hand: playerHand,
    handCount: playerHand.length,
    isHuman: index === 0,
    personaId: undefined,
  }));

  const bidding: BiddingState = {
    currentPlayer: 2 as Seat,
    highestBid: 10,
    highestBidder: 1 as Seat,
    activeSeats: { 0: true, 1: true, 2: true, 3: true },
    bids: [
      { playerId: 0 as Seat, bid: null },
      { playerId: 1 as Seat, bid: 10 },
      { playerId: 2 as Seat, bid: null },
      { playerId: 3 as Seat, bid: null },
    ],
    trumpSuit: "spades",
  };

  return {
    matchMode: "solo" as MatchMode,
    phase: "playing",
    round: 1,
    players,
    bidding,
    trick: { leaderId: 1 as Seat, leadSuit: null, plays: [] },
    lastTrick: null,
    tricksWon: { 0: 0, 1: 0 } as Record<Team, number>,
    scores: { 0: 0, 1: 0 } as Record<Team, number>,
    roundSummary: null,
    matchLog: { bids: [], tricks: [] } as never,
  };
}

describe("AI 3.0 — حلّ نهاية الجولة", () => {
  it("يرفض الحالات غير المؤهلة: يد طويلة", () => {
    const state = makeMatchState(makeHand([["spades", 14], ["spades", 13], ["spades", 12], ["spades", 11], ["hearts", 14]]));
    expect(solveEndgame(state, 1 as Seat, "خبير", { allowPureEndgame: true })).toBeNull();
  });

  it("يرفض الحالات غير المؤهلة: يد بمؤشر وحيد فقط", () => {
    const state = makeMatchState(makeHand([["spades", 14]]));
    expect(solveEndgame(state, 1 as Seat, "خبير", { allowPureEndgame: true })).toBeNull();
  });

  it("يصل لقرار صحيح في نهاية الجولة: الخبير يقود الآص عندما يضمن اللمّة", () => {
    // يد الخبير: آص قلب + آص طرنيب؛ إزالة كل القلب من الأيدي المخفية لتأكيد سيطرته
    const hand = makeHand([
      ["hearts", 14],
      ["spades", 14],
    ]);
    const state = makeMatchState(hand);
    state.players[1].hand = state.players[1].hand.filter((card) => card.suit !== "hearts" || card.rank === 14);
    state.players[2].hand = state.players[2].hand.filter((card) => card.suit !== "hearts");
    state.players[3].hand = state.players[3].hand.filter((card) => card.suit !== "hearts");
    state.players.forEach((player) => (player.handCount = player.hand.length));
    const decision = solveEndgame(state, 1 as Seat, "خبير", { allowPureEndgame: true });
    expect(decision).not.toBeNull();
    expect(decision!.card.suit).toBe("hearts");
    expect(decision!.card.rank).toBe(14);
  });

  it("يختار الورقة الرابحة الأقل عند وجود منافس أقوى محتمل", () => {
    // الخبير لديه قلبان (14 و12) وآخر قلب (13) لدى خصم؛ يقود 12 لا 14
    const hand = makeHand([
      ["hearts", 14],
      ["hearts", 12],
    ]);
    const state = makeMatchState(hand);
    state.players[2].hand = state.players[2].hand.filter((card) => card.suit !== "hearts");
    state.players[3].hand = state.players[3].hand.filter((card) => card.suit !== "hearts");
    state.players[1].hand = state.players[1].hand.filter((card) => card.suit !== "hearts" || card.rank === 14 || card.rank === 12);
    state.players.forEach((player) => (player.handCount = player.hand.length));
    const decision = solveEndgame(state, 1 as Seat, "خبير", { allowPureEndgame: true });
    expect(decision).not.toBeNull();
    expect(decision!.card.suit).toBe("hearts");
    expect(decision!.card.rank).toBe(12);
  });

  it("لا يتحيز لورقة محددة بسبب معرفته بالأيدي المخفية (مبدأ العدالة)", () => {
    // عند عدم وجود أي معلومات ظاهرة إضافية عن الأنواع، يبقى القرار مستقرًا عبر عدة استدعاءات
    const hand = makeHand([["diamonds", 14], ["diamonds", 13], ["clubs", 14]]);
    const results = new Set<string>();
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const state = makeMatchState(hand);
      const decision = solveEndgame(state, 1 as Seat, "خبير", { allowPureEndgame: true });
      if (decision) results.add(`${decision.card.suit}-${decision.card.rank}`);
    }
    expect(results.size).toBeLessThanOrEqual(1);
  });

  it("المتوازن يستخدم حلّ نهاية الجولة فقط عند يد قصيرة جدًا (≤2)", () => {
    const shortHand = makeHand([["spades", 14], ["spades", 13]]);
    const longHand = makeHand([
      ["spades", 14],
      ["spades", 13],
      ["hearts", 14],
      ["clubs", 14],
    ]);
    expect(solveEndgame(makeMatchState(shortHand), 1 as Seat, "متوازن", { allowPureEndgame: true })).not.toBeNull();
    expect(solveEndgame(makeMatchState(longHand), 1 as Seat, "متوازن", { allowPureEndgame: true })).toBeNull();
  });

  it("المبتدئ لا يستخدم حلّ نهاية الجولة", () => {
    const hand = makeHand([["spades", 14], ["spades", 13]]);
    expect(solveEndgame(makeMatchState(hand), 1 as Seat, "مبتدئ", { allowPureEndgame: true })).toBeNull();
  });

  it("يحترم حالة الطرنيب في المحاكاة ولا يظن ورقة عادية تهزم الطرنيب", () => {
    // الخبير يقود قلب 14 وخصمه قد يقطع بالطرنيب؛ يحاكي ذلك بدقة ويختار قلبًا
    const hand = makeHand([["hearts", 14], ["hearts", 12]]);
    const state = makeMatchState(hand);
    state.players[2].hand = state.players[2].hand.filter((card) => card.suit !== "hearts");
    state.players[3].hand = state.players[3].hand.filter((card) => card.suit !== "hearts");
    const decision = solveEndgame(state, 1 as Seat, "خبير", { allowPureEndgame: true });
    expect(decision).not.toBeNull();
    expect(decision!.card.suit).toBe("hearts");
  });
});
