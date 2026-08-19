import { chooseAiCard } from "../lib/tarneeb/ai";
import { createHomeState, createRound } from "../lib/tarneeb/engine";
import type { Card, MatchState } from "../lib/tarneeb/types";

const card = (suit: Card["suit"], rank: Card["rank"]): Card => ({ id: `${suit}-${rank}`, suit, rank });

const round = createRound(createHomeState(), true);
const state: MatchState = {
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
  trick: { leaderId: 1 as any, leadSuit: null, plays: [] },
};
const hand = [card("hearts", 13), card("clubs", 3)];
const withHand: MatchState = {
  ...state,
  players: state.players.map((player) =>
    player.id === 1 ? { ...player, hand, handCount: hand.length } : player,
  ),
};
console.log("الفرق teams:", withHand.players.map((p) => [p.id, p.team]));
const result = chooseAiCard(withHand, 1, "خبير", "متوازن", "layaan");
console.log("النتيجة:", result?.suit, result?.rank);
