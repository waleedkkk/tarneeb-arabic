export const SUITS = ["clubs", "diamonds", "hearts", "spades"] as const;
export type Suit = (typeof SUITS)[number];
export type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14;
export type Seat = 0 | 1 | 2 | 3;
export type Team = 0 | 1;
export type GamePhase = "home" | "bidding" | "trump" | "playing" | "trickResult" | "roundResult";
export type MatchMode = "solo" | "localRoom";
export type CardFanCurve = "gentle" | "balanced" | "deep";
export type CardBackPattern = "royal" | "navy" | "emerald";
export type TableTextSize = "normal" | "large";
export type OpponentCardDensity = "compact" | "balanced" | "spacious";

export interface Card {
  id: string;
  suit: Suit;
  rank: Rank;
}

export interface Player {
  id: Seat;
  name: string;
  seat: Seat;
  team: Team;
  hand: Card[];
  /** عدد الأوراق الفعلي؛ يبقى ظاهرًا للخصوم حتى عندما لا تُرسل أوراقهم الخاصة عبر الشبكة. */
  handCount: number;
  isHuman: boolean;
}

export interface Play {
  playerId: Seat;
  card: Card;
}

export interface Trick {
  leaderId: Seat;
  leadSuit: Suit | null;
  plays: Play[];
}

export interface ResolvedTrick extends Trick {
  winnerId: Seat;
}

export interface BiddingState {
  currentPlayer: Seat;
  highestBid: number | null;
  highestBidder: Seat | null;
  activeSeats: Record<Seat, boolean>;
  bids: Array<{ playerId: Seat; bid: number | null }>;
  trumpSuit: Suit | null;
}

export interface RoundSummary {
  bid: number;
  bidderTeam: Team;
  madeContract: boolean;
  roundTricks: Record<Team, number>;
  scoreChange: Record<Team, number>;
}

export interface GameSettings {
  targetScore: 31 | 41 | 61;
  aiLevel: "هادئ" | "متوازن" | "جريء";
  hapticsEnabled: boolean;
  soundEnabled: boolean;
  showStrengthIndicator: boolean;
  cardFanCurve: CardFanCurve;
  cardBackPattern: CardBackPattern;
  tableTextSize: TableTextSize;
  opponentCardDensity: OpponentCardDensity;
}

export interface MatchState {
  matchMode: MatchMode;
  phase: GamePhase;
  round: number;
  players: Player[];
  bidding: BiddingState;
  trick: Trick;
  lastTrick: ResolvedTrick | null;
  tricksWon: Record<Team, number>;
  scores: Record<Team, number>;
  roundSummary: RoundSummary | null;
}
