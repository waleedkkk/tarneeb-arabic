import type {
  BiddingState,
  Card,
  GameSettings,
  MatchState,
  Player,
  Rank,
  ResolvedTrick,
  Seat,
  Suit,
  Team,
  Trick,
} from "./types";
import { SUITS } from "./types";

const RANKS: Rank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
const SEATS: Seat[] = [0, 1, 2, 3];
const SUIT_ORDER: Record<Suit, number> = { clubs: 0, diamonds: 1, hearts: 2, spades: 3 };
const HIGH_CARD_WEIGHTS: Partial<Record<Rank, number>> = { 10: 1, 11: 2, 12: 3, 13: 4, 14: 5 };

export const DEFAULT_SETTINGS: GameSettings = {
  targetScore: 31,
  aiLevel: "متوازن",
  hapticsEnabled: true,
  soundEnabled: true,
  showStrengthIndicator: true,
  cardFanCurve: "balanced",
  cardBackPattern: "royal",
  tableTextSize: "normal",
  opponentCardDensity: "balanced",
};

export function teamOf(seat: Seat): Team {
  return seat % 2 === 0 ? 0 : 1;
}

export function nextSeat(seat: Seat): Seat {
  return ((seat + 1) % 4) as Seat;
}

export function suitSymbol(suit: Suit): string {
  return { clubs: "♣", diamonds: "♦", hearts: "♥", spades: "♠" }[suit];
}

export function suitName(suit: Suit): string {
  return { clubs: "نوادي", diamonds: "ديناري", hearts: "كبة", spades: "بستوني" }[suit];
}

export function rankLabel(rank: Rank): string {
  return ({ 11: "J", 12: "Q", 13: "K", 14: "A" } as Record<number, string>)[rank] ?? String(rank);
}

export function cardLabel(card: Card): string {
  return `${rankLabel(card.rank)}${suitSymbol(card.suit)}`;
}

export function sortHand(hand: Card[]): Card[] {
  return [...hand].sort((a, b) => SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit] || b.rank - a.rank);
}

export function suitStrength(hand: Card[], suit: Suit) {
  const cards = hand.filter((card) => card.suit === suit);
  const highCards = cards.filter((card) => card.rank >= 10);
  const highCardScore = highCards.reduce((total, card) => total + (HIGH_CARD_WEIGHTS[card.rank] ?? 0), 0);
  const lengthBonus = cards.length >= 7 ? 4 : cards.length >= 5 ? 2 : 0;
  const score = cards.length * 2 + highCardScore + lengthBonus;
  const bars = cards.length === 0 ? 0 : Math.min(5, Math.max(1, Math.ceil(score / 5)));
  const label = score >= 18 ? "قوي" : score >= 10 ? "متوسط" : "محدود";
  return { suit, count: cards.length, highCount: highCards.length, score, bars, label };
}

export function createDeck(): Card[] {
  return SUITS.flatMap((suit) => RANKS.map((rank) => ({ id: `${suit}-${rank}`, suit, rank })));
}

export function shuffle<T>(items: T[]): T[] {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }
  return shuffled;
}

function dealPlayers(): Player[] {
  const deck = shuffle(createDeck());
  const names = ["أنت", "ليان", "شريكك", "سامر"];
  return SEATS.map((seat) => ({
    id: seat,
    name: names[seat],
    seat,
    team: teamOf(seat),
    hand: sortHand(deck.slice(seat * 13, seat * 13 + 13)),
    handCount: 13,
    isHuman: seat === 0,
  }));
}

function emptyBidding(): BiddingState {
  return {
    currentPlayer: 0,
    highestBid: null,
    highestBidder: null,
    activeSeats: { 0: true, 1: true, 2: true, 3: true },
    bids: [],
    trumpSuit: null,
  };
}

function emptyTrick(leaderId: Seat): Trick {
  return { leaderId, leadSuit: null, plays: [] };
}

export function createHomeState(): MatchState {
  return {
    matchMode: "solo",
    phase: "home",
    round: 0,
    players: [],
    bidding: emptyBidding(),
    trick: emptyTrick(0),
    lastTrick: null,
    tricksWon: { 0: 0, 1: 0 },
    scores: { 0: 0, 1: 0 },
    roundSummary: null,
  };
}

export function createRound(previous: MatchState, resetScores = false): MatchState {
  return {
    matchMode: "solo",
    phase: "bidding",
    round: previous.round + 1,
    players: dealPlayers(),
    bidding: emptyBidding(),
    trick: emptyTrick(0),
    lastTrick: null,
    tricksWon: { 0: 0, 1: 0 },
    scores: resetScores ? { 0: 0, 1: 0 } : previous.scores,
    roundSummary: null,
  };
}

/** ينشئ جولة شبكة محلية مع الإبقاء على توزيع وحسم القواعد داخل المحرك نفسه. */
export function createNetworkRound(previous: MatchState, playerNames: Record<Seat, string>, resetScores = false): MatchState {
  const round = createRound(previous, resetScores);
  return {
    ...round,
    matchMode: "localRoom",
    players: round.players.map((player) => ({
      ...player,
      name: playerNames[player.id],
      isHuman: true,
    })),
  };
}

function activeCount(bidding: BiddingState): number {
  return SEATS.filter((seat) => bidding.activeSeats[seat]).length;
}

function nextActiveSeat(bidding: BiddingState, fromSeat: Seat): Seat {
  let candidate = nextSeat(fromSeat);
  while (!bidding.activeSeats[candidate]) candidate = nextSeat(candidate);
  return candidate;
}

export function legalCards(hand: Card[], trick: Trick): Card[] {
  if (!trick.leadSuit) return hand;
  const followingSuit = hand.filter((card) => card.suit === trick.leadSuit);
  return followingSuit.length > 0 ? followingSuit : hand;
}

export function cardBeats(candidate: Card, current: Card, leadSuit: Suit, trumpSuit: Suit): boolean {
  if (candidate.suit === current.suit) return candidate.rank > current.rank;
  if (candidate.suit === trumpSuit && current.suit !== trumpSuit) return true;
  if (current.suit === trumpSuit) return false;
  return candidate.suit === leadSuit && current.suit !== leadSuit;
}

export function resolveTrick(trick: Trick, trumpSuit: Suit): ResolvedTrick {
  const leadSuit = trick.leadSuit;
  if (!leadSuit || trick.plays.length !== 4) throw new Error("لا يمكن حسم لمّة غير مكتملة");
  let winningPlay = trick.plays[0];
  trick.plays.slice(1).forEach((play) => {
    if (cardBeats(play.card, winningPlay.card, leadSuit, trumpSuit)) winningPlay = play;
  });
  return { ...trick, winnerId: winningPlay.playerId };
}

export function submitBid(state: MatchState, playerId: Seat, proposedBid: number | null): MatchState {
  if (state.phase !== "bidding" || state.bidding.currentPlayer !== playerId || !state.bidding.activeSeats[playerId]) return state;

  const isLastActive = activeCount(state.bidding) === 1;
  const minBid = (state.bidding.highestBid ?? 6) + 1;
  const bid = proposedBid === null && isLastActive && state.bidding.highestBidder === null ? 7 : proposedBid;
  if (bid !== null && (bid < minBid || bid > 13)) return state;

  const bidding: BiddingState = {
    ...state.bidding,
    activeSeats: { ...state.bidding.activeSeats },
    bids: [...state.bidding.bids, { playerId, bid }],
  };

  if (bid === null) {
    bidding.activeSeats[playerId] = false;
  } else {
    bidding.highestBid = bid;
    bidding.highestBidder = playerId;
  }

  if (bidding.highestBidder !== null && activeCount(bidding) === 1) {
    return { ...state, phase: "trump", bidding };
  }

  bidding.currentPlayer = nextActiveSeat(bidding, playerId);
  return { ...state, bidding };
}

export function selectTrump(state: MatchState, playerId: Seat, trumpSuit: Suit): MatchState {
  if (state.phase !== "trump" || state.bidding.highestBidder !== playerId) return state;
  const bidding = { ...state.bidding, trumpSuit };
  return {
    ...state,
    phase: "playing",
    bidding,
    trick: emptyTrick(playerId),
    lastTrick: null,
  };
}

function scoreRound(state: MatchState, nextTricks: Record<Team, number>): MatchState {
  const bidder = state.bidding.highestBidder;
  const bid = state.bidding.highestBid;
  if (bidder === null || bid === null) return state;
  const bidderTeam = teamOf(bidder);
  const opponentTeam = bidderTeam === 0 ? 1 : 0;
  const madeContract = nextTricks[bidderTeam] >= bid;
  const scoreChange: Record<Team, number> = {
    0: 0,
    1: 0,
  };
  scoreChange[bidderTeam] = madeContract ? nextTricks[bidderTeam] : -bid;
  scoreChange[opponentTeam] = nextTricks[opponentTeam];
  return {
    ...state,
    phase: "roundResult",
    tricksWon: nextTricks,
    scores: {
      0: state.scores[0] + scoreChange[0],
      1: state.scores[1] + scoreChange[1],
    },
    roundSummary: { bid, bidderTeam, madeContract, roundTricks: nextTricks, scoreChange },
  };
}

export function playCard(state: MatchState, playerId: Seat, cardId: string): MatchState {
  if (state.phase !== "playing" || state.trick.plays.length >= 4) return state;
  if (state.trick.plays.length > 0 && state.trick.plays.some((play) => play.playerId === playerId)) return state;
  const expectedPlayer = state.trick.plays.length === 0 ? state.trick.leaderId : nextSeat(state.trick.plays.at(-1)!.playerId);
  if (expectedPlayer !== playerId) return state;
  const player = state.players[playerId];
  const card = player.hand.find((item) => item.id === cardId);
  if (!card || !legalCards(player.hand, state.trick).some((item) => item.id === card.id)) return state;

  const players = state.players.map((item) =>
    item.id === playerId
      ? { ...item, hand: item.hand.filter((handCard) => handCard.id !== card.id), handCount: Math.max(0, item.handCount - 1) }
      : item,
  );
  const trick: Trick = {
    ...state.trick,
    leadSuit: state.trick.leadSuit ?? card.suit,
    plays: [...state.trick.plays, { playerId, card }],
  };

  if (trick.plays.length < 4) return { ...state, players, trick };

  const resolved = resolveTrick(trick, state.bidding.trumpSuit!);
  const winnerTeam = teamOf(resolved.winnerId);
  const nextTricks: Record<Team, number> = { ...state.tricksWon, [winnerTeam]: state.tricksWon[winnerTeam] + 1 };
  const completed = state.tricksWon[0] + state.tricksWon[1] + 1;
  const withResult: MatchState = { ...state, players, phase: "trickResult", trick, lastTrick: resolved, tricksWon: nextTricks };
  return completed === 13 ? scoreRound(withResult, nextTricks) : withResult;
}

export function advanceTrick(state: MatchState): MatchState {
  if (state.phase !== "trickResult" || !state.lastTrick) return state;
  return {
    ...state,
    phase: "playing",
    trick: emptyTrick(state.lastTrick.winnerId),
    lastTrick: null,
  };
}
