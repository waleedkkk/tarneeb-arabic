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
/** الصفر يعني إخفاء مؤقّت الدور بالكامل. */
export type TurnTimerSeconds = 0 | 30 | 45 | 60;
/** مستوى تقدير الخصم لقوة اليد وقراءته للأوراق الظاهرة. */
export type AiLevel = "مبتدئ" | "متوازن" | "خبير";
/** نزعة مستقلة تغيّر المخاطرة بعد اختيار مستوى المهارة. */
export type AiStyle = "حذر" | "متوازن" | "مبادر";
/** ميول شخصية تغيّر القرار فوق مستوى المهارة ونمط اللعب العام. */
export type AiPersonaId = "layaan" | "faris" | "samar" | "rania" | "nader";
export type AiPersonaTendency = "تحفّظ" | "دعم" | "ضغط" | "استدراج" | "تحكّم";
export type OpponentPersonaAssignments = Record<1 | 2 | 3, AiPersonaId>;
export type TableTheme = "emerald" | "midnight" | "sand";
export type CardFaceTheme = "ivory" | "parchment" | "midnight";
export type SoundProfile = "هادئة" | "متوازنة" | "بارزة";
export type AnimationSpeed = "هادئة" | "متوازنة" | "سريعة";

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
  /** ملف سلوكي محفوظ للخصم الآلي؛ لا يُستخدم في الغرفة المحلية. */
  personaId?: AiPersonaId;
}

/** توصيف المقعد الذي يبنيه مضيف الغرفة قبل بدء مباراة شبكة مختلطة. */
export interface NetworkPlayerConfig {
  name: string;
  isHuman: boolean;
  personaId?: AiPersonaId;
}

/** عضو بهو الغرفة: بشري متصل أو مقعد افتراضي يملؤه الذكاء الاصطناعي عند البدء. */
export interface LocalRoomMember {
  seat: Seat;
  name: string;
  connected: boolean;
  isVirtual: boolean;
  personaId?: AiPersonaId;
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

/** سجل مزايدة يظل متاحًا حتى بعد انتهاء مرحلة المزايدة. */
export interface BidLogEntry {
  playerId: Seat;
  playerName: string;
  bid: number | null;
}

/** سجل اللمّة المحسومة مع الأوراق وأسماء أصحابها لعرضها أثناء المباراة. */
export interface TrickLogEntry {
  trickNumber: number;
  winnerId: Seat;
  winnerName: string;
  plays: Array<Play & { playerName: string }>;
}

export interface MatchLog {
  bids: BidLogEntry[];
  tricks: TrickLogEntry[];
}

export interface RoundSummary {
  bid: number;
  bidderTeam: Team;
  madeContract: boolean;
  roundTricks: Record<Team, number>;
  scoreChange: Record<Team, number>;
}

/** لقطة خفيفة قابلة للحفظ لنتيجة جولة مكتملة على هذا الجهاز. */
export interface RoundRecord {
  roundNumber: number;
  bid: number;
  bidderName: string;
  bidderTeam: Team;
  trump: Suit;
  madeContract: boolean;
  tricksTeam0: number;
  tricksTeam1: number;
  scoreChange0: number;
  scoreChange1: number;
  timestamp: number;
}

export interface GameSettings {
  targetScore: 31 | 41 | 61;
  aiLevel: AiLevel;
  aiStyle: AiStyle;
  opponentPersonas: OpponentPersonaAssignments;
  tableTheme: TableTheme;
  cardFaceTheme: CardFaceTheme;
  soundProfile: SoundProfile;
  animationSpeed: AnimationSpeed;
  hapticsEnabled: boolean;
  soundEnabled: boolean;
  showStrengthIndicator: boolean;
  showOpponentProfileCards: boolean;
  cardFanCurve: CardFanCurve;
  cardBackPattern: CardBackPattern;
  tableTextSize: TableTextSize;
  opponentCardDensity: OpponentCardDensity;
  turnTimerSeconds: TurnTimerSeconds;
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
  matchLog: MatchLog;
}
