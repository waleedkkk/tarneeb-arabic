import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { chooseAiBid, chooseAiCard, chooseAiTrump } from "./ai";
import { advanceTrick, createHomeState, createNetworkRound, createRound, DEFAULT_SETTINGS, playCard, selectTrump, submitBid } from "./engine";
import { haptic } from "@/lib/haptics";
import type { Card, GameSettings, MatchState, Seat, Suit } from "./types";
import { loadStoredMatch, loadStoredSettings, saveStoredMatch, saveStoredSettings } from "./storage";
import { useGameSounds } from "./use-game-sounds";

type Action =
  | { type: "START_MATCH" }
  | { type: "BID"; playerId: Seat; bid: number | null }
  | { type: "TRUMP"; playerId: Seat; suit: Suit }
  | { type: "PLAY"; playerId: Seat; cardId: string }
  | { type: "NEXT_TRICK" }
  | { type: "NEXT_ROUND" }
  | { type: "START_NETWORK_MATCH"; playerNames: Record<Seat, string> }
  | { type: "NEXT_NETWORK_ROUND" }
  | { type: "NETWORK_STATE"; state: MatchState }
  | { type: "EXIT" }
  | { type: "HYDRATE"; state: MatchState };

function reducer(state: MatchState, action: Action): MatchState {
  switch (action.type) {
    case "START_MATCH":
      return createRound(createHomeState(), true);
    case "BID":
      return submitBid(state, action.playerId, action.bid);
    case "TRUMP":
      return selectTrump(state, action.playerId, action.suit);
    case "PLAY":
      return playCard(state, action.playerId, action.cardId);
    case "NEXT_TRICK":
      return advanceTrick(state);
    case "NEXT_ROUND":
      return createRound(state);
    case "START_NETWORK_MATCH":
      return createNetworkRound(createHomeState(), action.playerNames, true);
    case "NEXT_NETWORK_ROUND": {
      const playerNames = state.players.reduce<Record<Seat, string>>((names, player) => {
        names[player.id] = player.name;
        return names;
      }, {} as Record<Seat, string>);
      return createNetworkRound(state, playerNames);
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
  startNetworkMatch: (playerNames: Record<Seat, string>) => void;
  submitNetworkBid: (playerId: Seat, bid: number | null) => void;
  selectNetworkTrump: (playerId: Seat, suit: Suit) => void;
  playNetworkCard: (playerId: Seat, cardId: string) => void;
  nextNetworkTrick: () => void;
  nextNetworkRound: () => void;
  applyNetworkState: (state: MatchState) => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, createHomeState);
  const [settings, setSettings] = useReducer(
    (current: GameSettings, patch: Partial<GameSettings>) => ({ ...current, ...patch }),
    DEFAULT_SETTINGS,
  );
  const [hydrated, setHydrated] = useState(false);
  const sounds = useGameSounds(settings.soundEnabled);
  const previousTrick = useRef<string | null>(null);

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
    const signature = state.lastTrick
      ? `${state.lastTrick.winnerId}-${state.lastTrick.plays.map((play) => play.card.id).join("-")}`
      : null;
    if (signature && signature !== previousTrick.current) sounds.playTrick();
    previousTrick.current = signature;
  }, [sounds, state.lastTrick]);

  const feedback = useCallback(
    (kind: "light" | "success" | "error" = "light") => {
      if (settings.hapticsEnabled) haptic[kind]();
    },
    [settings.hapticsEnabled],
  );

  useEffect(() => {
    const hasAiOpponent = state.players.some((player) => !player.isHuman);
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
        const bid = chooseAiBid(state.players[playerId].hand, state.bidding.highestBid, settings.aiLevel);
        dispatch({ type: "BID", playerId, bid });
      }
      if (isAiTrumpTurn) {
        const playerId = state.bidding.highestBidder as 1 | 2 | 3;
        dispatch({ type: "TRUMP", playerId, suit: chooseAiTrump(state.players[playerId].hand) });
      }
      if (isAiPlayTurn) {
        const lastPlayer = state.trick.plays.length > 0 ? state.trick.plays.at(-1)!.playerId : state.trick.leaderId;
        const playerId = ((lastPlayer + (state.trick.plays.length > 0 ? 1 : 0)) % 4) as 1 | 2 | 3;
        const card = chooseAiCard(state, playerId);
        sounds.playCard();
        dispatch({ type: "PLAY", playerId, cardId: card.id });
      }
    }, isAiPlayTurn ? 650 : 800);
    return () => clearTimeout(timeout);
  }, [settings.aiLevel, sounds, state]);

  const value = useMemo<GameContextValue>(
    () => ({
      state,
      settings,
      startMatch: () => {
        feedback();
        sounds.playShuffle();
        dispatch({ type: "START_MATCH" });
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
        dispatch({ type: "NEXT_ROUND" });
      },
      exitMatch: () => dispatch({ type: "EXIT" }),
      updateSettings: (patch) => {
        feedback();
        setSettings(patch);
      },
      startNetworkMatch: (playerNames) => {
        feedback("success");
        sounds.playShuffle();
        dispatch({ type: "START_NETWORK_MATCH", playerNames });
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
    }),
    [feedback, settings, sounds, state],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) throw new Error("يجب استخدام useGame داخل GameProvider");
  return context;
}
