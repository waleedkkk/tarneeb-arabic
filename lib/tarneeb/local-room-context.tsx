import * as Network from "expo-network";
import { Platform } from "react-native";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type Socket from "react-native-tcp-socket/lib/types/Socket";

import { useGame } from "./game-context";
import { chooseAiBid, chooseAiCard, chooseAiTrump } from "./ai";
import { LOCAL_ROOM_JOIN_TIMEOUT_MS, roomDetailsToQrData, stateForViewer, type RoomConnectionDetails } from "./local-room-utils";
import { canStartFlexibleRoom, createFlexibleLobby, LOCAL_ROOM_SEATS, partnerSeat, toNetworkPlayerConfig, virtualMember } from "./local-room-plan";
import {
  LOCAL_ROOM_PORT,
  discoverLocalRooms,
  getLocalRoomTransport,
  LocalRoomClient,
  LocalRoomHost,
  publishLocalRoom,
  type DiscoveredLocalRoom,
  type LocalRoomSocketMessage,
} from "./local-room-transport";
import type { AiPersonaId, LocalRoomMember, MatchState, Seat, Suit } from "./types";

const SEATS = LOCAL_ROOM_SEATS;
const PROTOCOL_VERSION = 1;

export type LocalRoomStatus = "idle" | "hosting" | "joining" | "ready" | "playing" | "error";
export type LocalRoomRole = "host" | "client" | null;

export type RoomMember = LocalRoomMember;

interface LocalRoomContextValue {
  status: LocalRoomStatus;
  role: LocalRoomRole;
  members: RoomMember[];
  localSeat: Seat;
  roomDetails: RoomConnectionDetails | null;
  roomQrData: string | null;
  error: string | null;
  discoveredRooms: DiscoveredLocalRoom[];
  nativeSupported: boolean;
  createRoom: (name: string) => Promise<void>;
  joinRoom: (details: RoomConnectionDetails, name: string) => Promise<void>;
  startRoomMatch: () => void;
  setVirtualPersona: (seat: Seat, personaId: AiPersonaId) => void;
  leaveRoom: () => Promise<void>;
  discoverRooms: () => void;
  stopDiscovering: () => void;
  requestBid: (bid: number | null) => void;
  requestTrump: (suit: Suit) => void;
  requestCard: (cardId: string) => void;
  requestNextTrick: () => void;
  requestNextRound: () => void;
}

const LocalRoomContext = createContext<LocalRoomContextValue | null>(null);

function randomToken(length: number) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

export function LocalRoomProvider({ children }: { children: React.ReactNode }) {
  const game = useGame();
  const [status, setStatus] = useState<LocalRoomStatus>("idle");
  const [role, setRole] = useState<LocalRoomRole>(null);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [localSeat, setLocalSeat] = useState<Seat>(0);
  const [roomDetails, setRoomDetails] = useState<RoomConnectionDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [discoveredRooms, setDiscoveredRooms] = useState<DiscoveredLocalRoom[]>([]);
  const hostRef = useRef<LocalRoomHost | null>(null);
  const clientRef = useRef<LocalRoomClient | null>(null);
  const stopPublishingRef = useRef<(() => void) | null>(null);
  const stopDiscoveringRef = useRef<(() => void) | null>(null);
  const sessionsRef = useRef(new Map<Socket, Seat>());
  const membersRef = useRef<RoomMember[]>([]);
  const roomRef = useRef<RoomConnectionDetails | null>(null);
  const hostNameRef = useRef("");
  const closingRoomRef = useRef(false);
  const joinTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearJoinTimeout = useCallback(() => {
    if (joinTimeoutRef.current) clearTimeout(joinTimeoutRef.current);
    joinTimeoutRef.current = null;
  }, []);

  const [nativeSupported, setNativeSupported] = useState<boolean>(false);
  useEffect(() => {
    let mounted = true;
    void (async () => {
      const transport = await getLocalRoomTransport();
      if (mounted) setNativeSupported(transport !== null && transport.tcp !== null);
    })();
    return () => {
      mounted = false;
    };
  }, []);
  const setMemberList = useCallback((next: RoomMember[]) => {
    const normalized = [...next].sort((a, b) => a.seat - b.seat);
    membersRef.current = normalized;
    setMembers(normalized);
  }, []);

  const broadcastLobby = useCallback(() => {
    hostRef.current?.broadcast({ type: "lobby", members: membersRef.current });
  }, []);

  const dispatchHostIntent = useCallback((seat: Seat, message: LocalRoomSocketMessage) => {
    if (message.type !== "intent" || typeof message.intent !== "string") return;
    if (message.intent === "bid" && (typeof message.bid === "number" || message.bid === null)) {
      game.submitNetworkBid(seat, message.bid as number | null);
    }
    if (message.intent === "trump" && typeof message.suit === "string" && ["spades", "hearts", "diamonds", "clubs"].includes(message.suit)) {
      game.selectNetworkTrump(seat, message.suit as Suit);
    }
    if (message.intent === "card" && typeof message.cardId === "string") {
      game.playNetworkCard(seat, message.cardId);
    }
    if (message.intent === "virtualPersona" && typeof message.personaId === "string" && ["layaan", "faris", "samar", "rania", "nader"].includes(message.personaId)) {
      const virtualSeat = partnerSeat(seat);
      const selected = membersRef.current.find((member) => member.seat === virtualSeat);
      if (!selected?.isVirtual || game.state.phase !== "home") return;
      setMemberList(membersRef.current.map((member) => member.seat === virtualSeat ? virtualMember(virtualSeat, message.personaId as AiPersonaId) : member));
      broadcastLobby();
    }
  }, [broadcastLobby, game, setMemberList]);

  const updateHostMembersForDisconnect = useCallback((socket: Socket) => {
    const seat = sessionsRef.current.get(socket);
    sessionsRef.current.delete(socket);
    if (seat === undefined) return;
    setMemberList(membersRef.current.map((member) => {
      if (member.seat !== seat) return member;
      return game.state.phase === "home" ? virtualMember(seat, member.personaId) : { ...member, connected: false };
    }));
    broadcastLobby();
  }, [broadcastLobby, game.state.phase, setMemberList]);

  const createRoom = useCallback(async (name: string) => {
    const hostName = name.trim() || "صاحب الغرفة";
    closingRoomRef.current = false;
    if (!nativeSupported) {
      setError("استضافة الغرفة تحتاج نسخة أصلية على هاتف Android أو iPhone، وليست معاينة الويب.");
      setStatus("error");
      return;
    }
    setError(null);
    setStatus("hosting");
    try {
      const address = await Network.getIpAddressAsync();
      if (!address || address === "0.0.0.0") throw new Error("تعذر معرفة عنوان الشبكة. اتصل بشبكة Wi‑Fi أو نقطة اتصال أولًا.");
      const details: RoomConnectionDetails = { host: address, port: LOCAL_ROOM_PORT, roomId: randomToken(6), key: randomToken(12) };
      roomRef.current = details;
      hostNameRef.current = hostName;
      setRoomDetails(details);
      setRole("host");
      setLocalSeat(0);
      setMemberList(createFlexibleLobby(hostName));
      const host = new LocalRoomHost({
        onConnect: () => undefined,
        onClose: updateHostMembersForDisconnect,
        onError: (message) => setError(`تعذر الاتصال المحلي: ${message}`),
        onMessage: (message, socket) => {
          const detailsNow = roomRef.current;
          if (!detailsNow) return;
          if (message.type === "hello") {
            const nameValue = typeof message.name === "string" ? message.name.trim().slice(0, 20) : "";
            if (message.protocol !== PROTOCOL_VERSION || message.roomId !== detailsNow.roomId || message.key !== detailsNow.key || !nameValue) {
              host.send(socket, { type: "error", message: "بيانات الغرفة غير صالحة." });
              socket.destroy();
              return;
            }
            const existingSeat = sessionsRef.current.get(socket);
            const availableSeat = SEATS.find((seat) => seat !== 0 && membersRef.current.some((member) => member.seat === seat && member.isVirtual));
            const seat = existingSeat ?? availableSeat;
            if (seat === undefined || game.state.phase !== "home") {
              host.send(socket, { type: "error", message: game.state.phase === "home" ? "الغرفة مكتملة." : "بدأت المباراة بالفعل." });
              socket.destroy();
              return;
            }
            sessionsRef.current.set(socket, seat);
            setMemberList(membersRef.current.map((member) => member.seat === seat ? { seat, name: nameValue, connected: true, isVirtual: false } : member));
            host.send(socket, { type: "welcome", seat, roomId: detailsNow.roomId });
            broadcastLobby();
            return;
          }
          const seat = sessionsRef.current.get(socket);
          if (seat === undefined) return;
          dispatchHostIntent(seat, message);
        },
      });
      await host.start(details.port);
      hostRef.current = host;
      stopPublishingRef.current = publishLocalRoom(`طرنيب ${details.roomId}`, details.roomId, details.port);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "تعذر إنشاء الغرفة المحلية.";
      setStatus("error");
      setError(message);
      setRole(null);
      setRoomDetails(null);
      roomRef.current = null;
    }
  }, [broadcastLobby, dispatchHostIntent, game.state.phase, nativeSupported, setMemberList, updateHostMembersForDisconnect]);

  const joinRoom = useCallback(async (details: RoomConnectionDetails, name: string) => {
    const playerName = name.trim() || "لاعب";
    closingRoomRef.current = false;
    clearJoinTimeout();
    if (!nativeSupported) {
      setError("الانضمام إلى غرفة يحتاج نسخة أصلية على هاتف Android أو iPhone.");
      setStatus("error");
      return;
    }
    setError(null);
    setStatus("joining");
    setRole("client");
    setRoomDetails(details);
    roomRef.current = details;
    clientRef.current?.disconnect();
    clientRef.current = null;
    let timedOut = false;
    try {
      let client: LocalRoomClient;
      let rejectedByHost = false;
      client = new LocalRoomClient({
        onConnect: () => client.send({ type: "hello", protocol: PROTOCOL_VERSION, roomId: details.roomId, key: details.key, name: playerName }),
        onClose: () => {
          clearJoinTimeout();
          if (!closingRoomRef.current && !rejectedByHost && !timedOut) {
            setStatus("error");
            setError("انقطع الاتصال بمضيف الغرفة.");
          }
        },
        onError: (message) => {
          clearJoinTimeout();
          if (timedOut) return;
          setStatus("error");
          setError(`تعذر الاتصال بالمضيف: ${message}`);
        },
        onMessage: (message) => {
          if (message.type === "error" && typeof message.message === "string") {
            clearJoinTimeout();
            rejectedByHost = true;
            setStatus("error");
            setError(message.message);
            return;
          }
          if (message.type === "welcome" && typeof message.seat === "number" && SEATS.includes(message.seat as Seat)) {
            clearJoinTimeout();
            setLocalSeat(message.seat as Seat);
            setStatus("ready");
            return;
          }
          if (message.type === "lobby" && Array.isArray(message.members)) {
            const parsedMembers = message.members.filter(isRoomMember);
            setMemberList(parsedMembers);
            if (canStartFlexibleRoom(parsedMembers)) setStatus("ready");
            return;
          }
          if (message.type === "state" && isMatchState(message.state)) {
            game.applyNetworkState(message.state);
            setStatus("playing");
          }
        },
      });
      clientRef.current = client;
      joinTimeoutRef.current = setTimeout(() => {
        timedOut = true;
        client.disconnect();
        if (clientRef.current === client) clientRef.current = null;
        setStatus("error");
        setError("انتهت مهلة الاتصال. تأكد من بقاء جهاز المضيف مفتوحًا وأن الأجهزة على الشبكة المحلية نفسها، ثم حاول مجددًا.");
        clearJoinTimeout();
      }, LOCAL_ROOM_JOIN_TIMEOUT_MS);
      await client.connect(details.host, details.port);
      clientRef.current = client;
    } catch (cause) {
      clearJoinTimeout();
      if (!timedOut) {
        setStatus("error");
        setError(cause instanceof Error ? cause.message : "تعذر الانضمام إلى الغرفة.");
      }
      clientRef.current?.disconnect();
      clientRef.current = null;
    }
  }, [clearJoinTimeout, game, nativeSupported, setMemberList]);

  const broadcastGameState = useCallback(() => {
    if (role !== "host" || !hostRef.current || game.state.phase === "home") return;
    sessionsRef.current.forEach((seat, socket) => {
      hostRef.current?.send(socket, { type: "state", state: stateForViewer(game.state, seat) });
    });
    setStatus("playing");
  }, [game.state, role]);

  useEffect(() => {
    broadcastGameState();
  }, [broadcastGameState]);

  const sendIntent = useCallback((message: LocalRoomSocketMessage) => {
    try {
      clientRef.current?.send(message);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر إرسال الأمر إلى المضيف.");
    }
  }, []);

  const setVirtualPersona = useCallback((seat: Seat, personaId: AiPersonaId) => {
    if (game.state.phase !== "home") return;
    if (role === "host") {
      const selected = membersRef.current.find((member) => member.seat === seat);
      if (!selected?.isVirtual) return;
      setMemberList(membersRef.current.map((member) => member.seat === seat ? virtualMember(seat, personaId) : member));
      broadcastLobby();
      return;
    }
    if (role === "client" && seat === partnerSeat(localSeat)) {
      sendIntent({ type: "intent", intent: "virtualPersona", personaId });
    }
  }, [broadcastLobby, game.state.phase, localSeat, role, sendIntent, setMemberList]);

  const virtualTurn = useMemo(() => {
    if (role !== "host" || game.state.matchMode !== "localRoom" || game.state.phase === "home") return null;
    const players = game.state.players;
    if (game.state.phase === "bidding") {
      const seat = game.state.bidding.currentPlayer;
      return players[seat] && !players[seat].isHuman ? { kind: "bid" as const, seat } : null;
    }
    if (game.state.phase === "trump" && game.state.bidding.highestBidder !== null) {
      const seat = game.state.bidding.highestBidder;
      return players[seat] && !players[seat].isHuman ? { kind: "trump" as const, seat } : null;
    }
    if (game.state.phase === "playing") {
      const lastPlayer = game.state.trick.plays.at(-1)?.playerId;
      const seat = lastPlayer === undefined ? game.state.trick.leaderId : ((lastPlayer + 1) % 4) as Seat;
      return players[seat] && !players[seat].isHuman ? { kind: "card" as const, seat } : null;
    }
    return null;
  }, [game.state, role]);

  useEffect(() => {
    if (!virtualTurn) return;
    const delay = (virtualTurn.kind === "card" ? 650 : 820) * (game.settings.animationSpeed === "هادئة" ? 1.24 : game.settings.animationSpeed === "سريعة" ? 0.74 : 1);
    const timeout = setTimeout(() => {
      const player = game.state.players[virtualTurn.seat];
      if (virtualTurn.kind === "bid") {
        game.submitNetworkBid(virtualTurn.seat, chooseAiBid(player.hand, game.state.bidding.highestBid, game.settings.aiLevel, game.settings.aiStyle, player.personaId));
        return;
      }
      if (virtualTurn.kind === "trump") {
        game.selectNetworkTrump(virtualTurn.seat, chooseAiTrump(player.hand, game.settings.aiLevel, game.settings.aiStyle, player.personaId));
        return;
      }
      const card = chooseAiCard(game.state, virtualTurn.seat as 1 | 2 | 3, game.settings.aiLevel, game.settings.aiStyle, player.personaId);
      game.playNetworkCard(virtualTurn.seat, card.id);
    }, delay);
    return () => clearTimeout(timeout);
  }, [game, virtualTurn]);

  const startRoomMatch = useCallback(() => {
    if (role !== "host") return;
    if (!canStartFlexibleRoom(membersRef.current)) {
      setError("يلزم اتصال لاعبين بشريين على الأقل قبل بدء المباراة.");
      return;
    }
    game.startNetworkMatch(toNetworkPlayerConfig(membersRef.current));
  }, [game, role]);

  const leaveRoom = useCallback(async () => {
    closingRoomRef.current = true;
    clearJoinTimeout();
    stopDiscoveringRef.current?.();
    stopDiscoveringRef.current = null;
    stopPublishingRef.current?.();
    stopPublishingRef.current = null;
    clientRef.current?.disconnect();
    clientRef.current = null;
    await hostRef.current?.stop();
    hostRef.current = null;
    sessionsRef.current.clear();
    roomRef.current = null;
    setRole(null);
    setStatus("idle");
    setMembers([]);
    setRoomDetails(null);
    setError(null);
    setDiscoveredRooms([]);
  }, [clearJoinTimeout]);

  const discoverRooms = useCallback(() => {
    if (!nativeSupported) return;
    stopDiscoveringRef.current?.();
    setDiscoveredRooms([]);
    stopDiscoveringRef.current = discoverLocalRooms((room) => {
      setDiscoveredRooms((current) => current.some((item) => item.roomId === room.roomId && item.host === room.host) ? current : [...current, room]);
    });
  }, [nativeSupported]);

  const stopDiscovering = useCallback(() => {
    stopDiscoveringRef.current?.();
    stopDiscoveringRef.current = null;
  }, []);

  const requestBid = useCallback((bid: number | null) => {
    if (role === "host") game.submitNetworkBid(0, bid);
    else sendIntent({ type: "intent", intent: "bid", bid });
  }, [game, role, sendIntent]);

  const requestTrump = useCallback((suit: Suit) => {
    if (role === "host") game.selectNetworkTrump(0, suit);
    else sendIntent({ type: "intent", intent: "trump", suit });
  }, [game, role, sendIntent]);

  const requestCard = useCallback((cardId: string) => {
    if (role === "host") game.playNetworkCard(0, cardId);
    else sendIntent({ type: "intent", intent: "card", cardId });
  }, [game, role, sendIntent]);

  const requestNextTrick = useCallback(() => {
    if (role === "host") game.nextNetworkTrick();
  }, [game, role]);

  const requestNextRound = useCallback(() => {
    if (role === "host") game.nextNetworkRound();
  }, [game, role]);

  useEffect(() => () => {
    clearJoinTimeout();
    stopDiscoveringRef.current?.();
    stopPublishingRef.current?.();
    clientRef.current?.disconnect();
    void hostRef.current?.stop();
  }, [clearJoinTimeout]);

  const value = useMemo<LocalRoomContextValue>(() => ({
    status,
    role,
    members,
    localSeat,
    roomDetails,
    roomQrData: roomDetails ? roomDetailsToQrData(roomDetails) : null,
    error,
    discoveredRooms,
    nativeSupported,
    createRoom,
    joinRoom,
    startRoomMatch,
    setVirtualPersona,
    leaveRoom,
    discoverRooms,
    stopDiscovering,
    requestBid,
    requestTrump,
    requestCard,
    requestNextTrick,
    requestNextRound,
  }), [createRoom, discoverRooms, discoveredRooms, error, nativeSupported, joinRoom, leaveRoom, localSeat, members, requestBid, requestCard, requestNextRound, requestNextTrick, requestTrump, role, roomDetails, setVirtualPersona, startRoomMatch, status, stopDiscovering]);

  return <LocalRoomContext.Provider value={value}>{children}</LocalRoomContext.Provider>;
}

function isRoomMember(value: unknown): value is RoomMember {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.name === "string" && typeof candidate.connected === "boolean" && typeof candidate.isVirtual === "boolean" && typeof candidate.seat === "number" && SEATS.includes(candidate.seat as Seat);
}

function isMatchState(value: unknown): value is MatchState {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.phase === "string" && Array.isArray(candidate.players) && candidate.players.length === 4;
}

export function useLocalRoom() {
  const context = useContext(LocalRoomContext);
  if (!context) throw new Error("يجب استخدام useLocalRoom داخل LocalRoomProvider");
  return context;
}
