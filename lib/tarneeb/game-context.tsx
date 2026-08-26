import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { chooseAiBid, chooseAiCard, chooseAiTrump } from "./ai";
import { advanceTrick, createHomeState, createNetworkRound, createRound, DEFAULT_SETTINGS, playCard, selectTrump, submitBid } from "./engine";
import { haptic } from "@/lib/haptics";
import type { Card, GameSettings, MatchState, NetworkPlayerConfig, OpponentPersonaAssignments, RoundRecord, Seat, Suit, TurnTimerSeconds } from "./types";
import { appendRoundRecord, loadStoredMatch, loadStoredSettings, saveStoredMatch, saveStoredSettings } from "./storage";
import { useGameSounds } from "./use-game-sounds";

type Action =
  | { type: "START_MATCH"; personas: OpponentPersonaAssignments }
  | { type: "BID"; playerId: Seat; bid: number | null }
  | { type: "TRUMP"; playerId: Seat; suit: Suit }
  | { type: "PLAY"; playerId: Seat; cardId: string }
  | { type: "NEXT_TRICK" }
  | { type: "NEXT_ROUND"; personas: OpponentPersonaAssignments }
  | { type: "START_NETWORK_MATCH"; playerConfig: Record<Seat, NetworkPlayerConfig> }
  | { type: "NEXT_NETWORK_ROUND" }
  | { type: "NETWORK_STATE"; state: MatchState }
  | { type: "EXIT" }
  | { type: "HYDRATE"; state: MatchState };

interface TurnTimerState {
  durationSeconds: TurnTimerSeconds;
  remainingSeconds: number;
  isActive: boolean;
  isExpired: boolean;
}

function reducer(state: MatchState, action: Action): MatchState {
  switch (action.type) {
    case "START_MATCH":
      return createRound(createHomeState(), true, action.personas);
    case "BID":
      return submitBid(state, action.playerId, action.bid);
    case "TRUMP":
      return selectTrump(state, action.playerId, action.suit);
    case "PLAY":
      return playCard(state, action.playerId, action.cardId);
    case "NEXT_TRICK":
      return advanceTrick(state);
    case "NEXT_ROUND":
      return createRound(state, false, action.personas);
    case "START_NETWORK_MATCH":
      return createNetworkRound(createHomeState(), action.playerConfig, true);
    case "NEXT_NETWORK_ROUND": {
      const playerConfig = state.players.reduce<Record<Seat, NetworkPlayerConfig>>((config, player) => {
        config[player.id] = { name: player.name, isHuman: player.isHuman, personaId: player.personaId };
        return config;
      }, {} as Record<Seat, NetworkPlayerConfig>);
      return createNetworkRound(state, playerConfig);
    }
    case "NETWORK_STATE":
      return action.state;
    case "EXIT":
      return createHomeState();
    case "HYDRATE":
      return action.state;
    default:
      return state;
  }
}

interface GameContextValue {
  state: MatchState;
  settings: GameSettings;
  startMatch: () => void;
  submitHumanBid: (bid: number | null) => void;
  selectHumanTrump: (suit: Suit) => void;
  playHumanCard: (card: Card) => void;
  nextTrick: () => void;
  nextRound: () => void;
  exitMatch: () => void;
  updateSettings: (patch: Partial<GameSettings>) => void;
  startNetworkMatch: (playerConfig: Record<Seat, NetworkPlayerConfig>) => void;
  submitNetworkBid: (playerId: Seat, bid: number | null) => void;
  selectNetworkTrump: (playerId: Seat, suit: Suit) => void;
  playNetworkCard: (playerId: Seat, cardId: string) => void;
  nextNetworkTrick: () => void;
  nextNetworkRound: () => void;
  applyNetworkState: (state: MatchState) => void;
  turnTimer: TurnTimerState;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, createHomeState);
  const [settings, setSettings] = useReducer(
    (current: GameSettings, patch: Partial<GameSettings>) => ({ ...current, ...patch }),
    DEFAULT_SETTINGS,
  );
  const [hydrated, setHydrated] = useState(false);
  const [turnTimer, setTurnTimer] = useState<TurnTimerState>({ durationSeconds: 0, remainingSeconds: 0, isActive: false, isExpired: false });
  const sounds = useGameSounds(settings.soundEnabled, settings.soundProfile);
  const previousTrick = useRef<string | null>(null);
  const recordedRoundKey = useRef<string | null>(null);
  const readyToRecordStats = useRef(false);

  useEffect(() => {
    let mounted = true;
    Promise.all([loadStoredMatch(), loadStoredSettings()]).then(([storedMatch, storedSettings]) => {
      if (!mounted) return;
      if (storedMatch) dispatch({ type: "HYDRATE", state: storedMatch });
      if (storedSettings) setSettings(storedSettings);
      setHydrated(true);
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (hydrated) saveStoredMatch(state);
  }, [hydrated, state]);

  useEffect(() => {
    if (hydrated) saveStoredSettings(settings);
  }, [hydrated, settings]);

  useEffect(() => {
    if (!hydrated) return;
    if (!readyToRecordStats.current) {
      readyToRecordStats.current = true;
      if (state.phase === "roundResult") {
        recordedRoundKey.current = `${state.round}-${state.scores[0]}-${state.scores[1]}`;
      }
      return;
    }
    if (state.phase !== "roundResult" || state.matchMode !== "solo" || !state.roundSummary || state.bidding.highestBidder === null || !state.bidding.trumpSuit) {
      if (state.phase !== "roundResult") recordedRoundKey.current = null;
      return;
    }

    const recordKey = `${state.round}-${state.scores[0]}-${state.scores[1]}`;
    if (recordedRoundKey.current === recordKey) return;
    const bidder = state.players.find((player) => player.id === state.bidding.highestBidder);
    const record: RoundRecord = {
      roundNumber: state.round,
      bid: state.roundSummary.bid,
      bidderName: bidder?.name ?? `اللاعب ${(state.bidding.highestBidder ?? 0) + 1}`,
      bidderTeam: state.roundSummary.bidderTeam,
      trump: state.bidding.trumpSuit,
      madeContract: state.roundSummary.madeContract,
      tricksTeam0: state.roundSummary.roundTricks[0],
      tricksTeam1: state.roundSummary.roundTricks[1],
      scoreChange0: state.roundSummary.scoreChange[0],
      scoreChange1: state.roundSummary.scoreChange[1],
      timestamp: Date.now(),
    };
    recordedRoundKey.current = recordKey;
    void appendRoundRecord(record);
  }, [hydrated, state]);

  useEffect(() => {
    const signature = state.lastTrick
      ? `${state.lastTrick.winnerId}-${state.lastTrick.plays.map((play) => play.card.id).join("-")}`
      : null;
    if (signature && signature !== previousTrick.current) sounds.playTrick();
    previousTrick.current = signature;
  }, [sounds, state.lastTrick]);

  const humanSoloTurn = state.matchMode === "solo" && (
    (state.phase === "bidding" && state.bidding.currentPlayer === 0)
    || (state.phase === "trump" && state.bidding.highestBidder === 0)
    || (state.phase === "playing" && (state.trick.plays.length === 0
      ? state.trick.leaderId === 0
      : state.trick.plays.at(-1)?.playerId === 3))
  );
  const timerTurnKey = `${state.round}-${state.phase}-${state.bidding.currentPlayer}-${state.bidding.highestBidder ?? "none"}-${state.trick.leaderId}-${state.trick.plays.map((play) => play.card.id).join("-")}`;

  useEffect(() => {
    const durationSeconds = settings.turnTimerSeconds;
    if (!humanSoloTurn || durationSeconds === 0) {
      setTurnTimer({ durationSeconds, remainingSeconds: 0, isActive: false, isExpired: false });
      return;
    }

    const startedAt = Date.now();
    let alertPlayed = false;
    const updateRemainingTime = () => {
      const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);
      const remainingSeconds = Math.max(0, durationSeconds - elapsedSeconds);
      if (!alertPlayed && remainingSeconds <= 5) {
        alertPlayed = true;
        sounds.playTimerAlert();
      }
      setTurnTimer({
        durationSeconds,
        remainingSeconds,
        isActive: remainingSeconds > 0,
        isExpired: remainingSeconds === 0,
      });
    };

    updateRemainingTime();
    const interval = setInterval(updateRemainingTime, 500);
    return () => clearInterval(interval);
  }, [humanSoloTurn, settings.turnTimerSeconds, sounds.playTimerAlert, timerTurnKey]);

  const feedback = useCallback(
    (kind: "light" | "success" | "error" = "light") => {
      if (settings.hapticsEnabled) haptic[kind]();
    },
    [settings.hapticsEnabled],
  );

  useEffect(() => {
    const hasAiOpponent = state.matchMode === "solo" && state.players.some((player) => !player.isHuman);
    if (!hasAiOpponent) return;
    const isAiBidTurn = state.phase === "bidding" && state.bidding.currentPlayer !== 0;
    const isAiTrumpTurn = state.phase === "trump" && state.bidding.highestBidder !== 0;
    const isAiPlayTurn = state.phase === "playing" && state.trick.plays.length > 0
      ? ((state.trick.plays.at(-1)!.playerId + 1) % 4 !== 0)
      : state.phase === "playing" && state.trick.leaderId !== 0;

    if (!isAiBidTurn && !isAiTrumpTurn && !isAiPlayTurn) return;
    const timeout = setTimeout(() => {
      if (isAiBidTurn) {
        const playerId = state.bidding.currentPlayer as 1 | 2 | 3;
        const bid = chooseAiBid(state.players[playerId].hand, state.bidding.highestBid, settings.aiLevel, settings.aiStyle, state.players[playerId].personaId);
        dispatch({ type: "BID", playerId, bid });
      }
      if (isAiTrumpTurn) {
        const playerId = state.bidding.highestBidder as 1 | 2 | 3;
        dispatch({ type: "TRUMP", playerId, suit: chooseAiTrump(state.players[playerId].hand, settings.aiLevel, settings.aiStyle, state.players[playerId].personaId) });
      }
      if (isAiPlayTurn) {
        const lastPlayer = state.trick.plays.length > 0 ? state.trick.plays.at(-1)!.playerId : state.trick.leaderId;
        const playerId = ((lastPlayer + (state.trick.plays.length > 0 ? 1 : 0)) % 4) as 1 | 2 | 3;
        const card = chooseAiCard(state, playerId, settings.aiLevel, settings.aiStyle, state.players[playerId].personaId);
        sounds.playCard();
        dispatch({ type: "PLAY", playerId, cardId: card.id });
      }
    }, (isAiPlayTurn ? (settings.aiLevel === "خبير" ? 760 : settings.aiLevel === "مبتدئ" ? 520 : 650) : (settings.aiLevel === "خبير" ? 920 : settings.aiLevel === "مبتدئ" ? 620 : 800)) * (settings.animationSpeed === "هادئة" ? 1.24 : settings.animationSpeed === "سريعة" ? 0.74 : 1));
    return () => clearTimeout(timeout);
  }, [settings.aiLevel, settings.aiStyle, settings.animationSpeed, sounds, state]);

  const value = useMemo<GameContextValue>(
    () => ({
      state,
      settings,
      startMatch: () => {
        feedback();
        sounds.playShuffle();
        dispatch({ type: "START_MATCH", personas: settings.opponentPersonas });
      },
      submitHumanBid: (bid) => {
        feedback();
        dispatch({ type: "BID", playerId: 0, bid });
      },
      selectHumanTrump: (suit) => {
        feedback();
        dispatch({ type: "TRUMP", playerId: 0, suit });
      },
      playHumanCard: (card) => {
        feedback();
        sounds.playCard();
        dispatch({ type: "PLAY", playerId: 0, cardId: card.id });
      },
      nextTrick: () => {
        feedback("success");
        dispatch({ type: "NEXT_TRICK" });
      },
      nextRound: () => {
        feedback("success");
        sounds.playShuffle();
        dispatch({ type: "NEXT_ROUND", personas: settings.opponentPersonas });
      },
      exitMatch: () => dispatch({ type: "EXIT" }),
      updateSettings: (patch) => {
        feedback();
        setSettings(patch);
      },
      startNetworkMatch: (playerConfig) => {
        feedback("success");
        sounds.playShuffle();
        dispatch({ type: "START_NETWORK_MATCH", playerConfig });
      },
      submitNetworkBid: (playerId, bid) => {
        feedback();
        dispatch({ type: "BID", playerId, bid });
      },
      selectNetworkTrump: (playerId, suit) => {
        feedback();
        dispatch({ type: "TRUMP", playerId, suit });
      },
      playNetworkCard: (playerId, cardId) => {
        feedback();
        sounds.playCard();
        dispatch({ type: "PLAY", playerId, cardId });
      },
      nextNetworkTrick: () => {
        feedback("success");
        dispatch({ type: "NEXT_TRICK" });
      },
      nextNetworkRound: () => {
        feedback("success");
        sounds.playShuffle();
        dispatch({ type: "NEXT_NETWORK_ROUND" });
      },
      applyNetworkState: (nextState) => dispatch({ type: "NETWORK_STATE", state: nextState }),
      turnTimer,
    }),
    [feedback, settings, sounds, state, turnTimer],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) throw new Error("يجب استخدام useGame داخل GameProvider");
  return context;
}
