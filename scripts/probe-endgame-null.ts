import { createDeck } from "../lib/tarneeb/engine";
import type { Card, Suit } from "../lib/tarneeb/types";
import { solveEndgame } from "../lib/tarneeb/ai-endgame";
import type { MatchState, BiddingState, MatchMode, Team } from "../lib/tarneeb/types";
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

// اختبار 1: الخبير يقود الآص
console.log("=== اختبار 1: الخبير يقود الآص ===");
{
  const hand = makeHand([
    ["hearts", 14],
    ["spades", 14],
  ]);
  const state = makeMatchState(hand);
  state.players[1].hand = state.players[1].hand.filter((card) => card.suit !== "hearts" || card.rank === 14);
  state.players[2].hand = state.players[2].hand.filter((card) => card.suit !== "hearts");
  state.players[3].hand = state.players[3].hand.filter((card) => card.suit !== "hearts");
  state.players.forEach((player) => (player.handCount = player.hand.length));

  console.log("playerId=1 hand lengths:", state.players.map((p) => p.hand.length));
  console.log("playerId=1 handCount:", state.players.map((p) => p.handCount));

  // حساب unseen يدويًا كما يحسبه solveEndgame
  const knownKeys = new Set(
    state.players[1].hand.map((card) => `${card.suit}-${card.rank}`),
  );
  const unseen = createDeck().filter((card) => !knownKeys.has(`${card.suit}-${card.rank}`));
  console.log("knownKeys size:", knownKeys.size, "unseen:", unseen.length);

  const decision = solveEndgame(state, 1 as Seat, "خبير");
  console.log("decision:", decision ? `${decision.card.suit}-${decision.card.rank} diff=${decision.expectedTricksDiff}` : "null");
}

// اختبار 2: الورقة الرابحة الأقل
console.log("\n=== اختبار 2: الورقة الرابحة الأقل ===");
{
  const hand = makeHand([
    ["hearts", 14],
    ["hearts", 12],
  ]);
  const state = makeMatchState(hand);
  state.players[2].hand = state.players[2].hand.filter((card) => card.suit !== "hearts");
  state.players[3].hand = state.players[3].hand.filter((card) => card.suit !== "hearts");
  state.players[1].hand = state.players[1].hand.filter((card) => card.rank > 13 || card.suit !== "hearts");
  state.players.forEach((player) => (player.handCount = player.hand.length));

  console.log("playerId=1 hand lengths:", state.players.map((p) => p.hand.length));

  const knownKeys = new Set(
    state.players[1].hand.map((card) => `${card.suit}-${card.rank}`),
  );
  const unseen = createDeck().filter((card) => !knownKeys.has(`${card.suit}-${card.rank}`));
  console.log("knownKeys size:", knownKeys.size, "unseen:", unseen.length);
  const heartsUnseen = unseen.filter((c) => c.suit === "hearts");
  console.log("hearts unseen ranks:", heartsUnseen.map((c) => c.rank));

  const decision = solveEndgame(state, 1 as Seat, "خبير");
  console.log("decision:", decision ? `${decision.card.suit}-${decision.card.rank} diff=${decision.expectedTricksDiff}` : "null");
}

// اختبار 3: العدالة
console.log("\n=== اختبار 3: العدالة ===");
{
  const hand = makeHand([["diamonds", 14], ["diamonds", 13], ["clubs", 14]]);
  const results = new Set<string>();
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const state = makeMatchState(hand);
    const decision = solveEndgame(state, 1 as Seat, "خبير");
    if (decision) results.add(`${decision.card.suit}-${decision.card.rank}`);
    else results.add("null");
  }
  console.log("results:", [...results]);
}
