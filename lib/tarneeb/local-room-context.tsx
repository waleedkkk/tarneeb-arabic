import * as Network from "expo-network";
import { Platform } from "react-native";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type Socket from "react-native-tcp-socket/lib/types/Socket";

import { useGame } from "./game-context";
import { roomDetailsToQrData, stateForViewer, type RoomConnectionDetails } from "./local-room-utils";
import {
  LOCAL_ROOM_PORT,
  discoverLocalRooms,
  LocalRoomClient,
  LocalRoomHost,
  publishLocalRoom,
  type DiscoveredLocalRoom,
  type LocalRoomSocketMessage,
} from "./local-room-transport";
import type { MatchState, Seat, Suit } from "./types";

const SEATS: Seat[] = [0, 1, 2, 3];
const PROTOCOL_VERSION = 1;

export type LocalRoomStatus = "idle" | "hosting" | "joining" | "ready" | "playing" | "error";
export type LocalRoomRole = "host" | "client" | null;

export interface RoomMember {
  seat: Seat;
  name: string;
  connected: boolean;
}

interface LocalRoomContextValue {
  status: LocalRoomStatus;
  role: LocalRoomRole;
  members: RoomMember[];
  localSeat: Seat;
  roomDetails: RoomConnectionDetails | null;
  roomQrData: string | null;
  error: string | null;
  discoveredRooms: DiscoveredLocalRoom[];
  isNativeSupported: boolean;
  createRoom: (name: string) => Promise<void>;
  joinRoom: (details: RoomConnectionDetails, name: string) => Promise<void>;
  startRoomMatch: () => void;
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

  const isNativeSupported = Platform.OS !== "web";
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
  }, [game]);

  const updateHostMembersForDisconnect = useCallback((socket: Socket) => {
    const seat = sessionsRef.current.get(socket);
    sessionsRef.current.delete(socket);
    if (seat === undefined) return;
    setMemberList(membersRef.current.map((member) => member.seat === seat ? { ...member, connected: false } : member));
    broadcastLobby();
  }, [broadcastLobby, setMemberList]);

  const createRoom = useCallback(async (name: string) => {
    const hostName = name.trim() || "صاحب الغرفة";
    closingRoomRef.current = false;
    if (!isNativeSupported) {
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
      setMemberList([{ seat: 0, name: hostName, connected: true }]);
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
            const availableSeat = SEATS.find((seat) => seat !== 0 && !membersRef.current.some((member) => member.seat === seat && member.connected));
            const seat = existingSeat ?? availableSeat;
            if (seat === undefined || game.state.phase !== "home") {
              host.send(socket, { type: "error", message: game.state.phase === "home" ? "الغرفة مكتملة." : "بدأت المباراة بالفعل." });
              socket.destroy();
              return;
            }
            sessionsRef.current.set(socket, seat);
            const remaining = membersRef.current.filter((member) => member.seat !== seat);
            setMemberList([...remaining, { seat, name: nameValue, connected: true }]);
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
  }, [broadcastLobby, dispatchHostIntent, game.state.phase, isNativeSupported, setMemberList, updateHostMembersForDisconnect]);

  const joinRoom = useCallback(async (details: RoomConnectionDetails, name: string) => {
    const playerName = name.trim() || "لاعب";
    closingRoomRef.current = false;
    if (!isNativeSupported) {
      setError("الانضمام إلى غرفة يحتاج نسخة أصلية على هاتف Android أو iPhone.");
      setStatus("error");
      return;
    }
    setError(null);
    setStatus("joining");
    setRole("client");
    setRoomDetails(details);
    roomRef.current = details;
    try {
      let client: LocalRoomClient;
      client = new LocalRoomClient({
        onConnect: () => client.send({ type: "hello", protocol: PROTOCOL_VERSION, roomId: details.roomId, key: details.key, name: playerName }),
        onClose: () => {
          if (!closingRoomRef.current) {
            setStatus("error");
            setError("انقطع الاتصال بمضيف الغرفة.");
          }
        },
        onError: (message) => setError(`تعذر الاتصال بالمضيف: ${message}`),
        onMessage: (message) => {
          if (message.type === "error" && typeof message.message === "string") {
            setStatus("error");
            setError(message.message);
            return;
          }
          if (message.type === "welcome" && typeof message.seat === "number" && SEATS.includes(message.seat as Seat)) {
            setLocalSeat(message.seat as Seat);
            setStatus("ready");
            return;
          }
          if (message.type === "lobby" && Array.isArray(message.members)) {
            const parsedMembers = message.members.filter(isRoomMember);
            setMemberList(parsedMembers);
            if (parsedMembers.length === 4 && parsedMembers.every((member) => member.connected)) setStatus("ready");
            return;
          }
          if (message.type === "state" && isMatchState(message.state)) {
            game.applyNetworkState(message.state);
            setStatus("playing");
          }
        },
      });
      await client.connect(details.host, details.port);
      clientRef.current = client;
    } catch (cause) {
      setStatus("error");
      setError(cause instanceof Error ? cause.message : "تعذر الانضمام إلى الغرفة.");
      clientRef.current?.disconnect();
      clientRef.current = null;
    }
  }, [game, isNativeSupported, setMemberList, status]);

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

  const startRoomMatch = useCallback(() => {
    if (role !== "host") return;
    const readyMembers = membersRef.current.filter((member) => member.connected);
    if (readyMembers.length !== 4) {
      setError("انتظر انضمام أربعة لاعبين قبل بدء المباراة.");
      return;
    }
    const names = readyMembers.reduce<Record<Seat, string>>((next, member) => {
      next[member.seat] = member.name;
      return next;
    }, {} as Record<Seat, string>);
    game.startNetworkMatch(names);
  }, [game, role]);

  const leaveRoom = useCallback(async () => {
    closingRoomRef.current = true;
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
  }, []);

  const discoverRooms = useCallback(() => {
    if (!isNativeSupported) return;
    stopDiscoveringRef.current?.();
    setDiscoveredRooms([]);
    stopDiscoveringRef.current = discoverLocalRooms((room) => {
      setDiscoveredRooms((current) => current.some((item) => item.roomId === room.roomId && item.host === room.host) ? current : [...current, room]);
    });
  }, [isNativeSupported]);

  const stopDiscovering = useCallback(() => {
    stopDiscoveringRef.current?.();
    stopDiscoveringRef.current = null;
  }, []);

  const sendIntent = useCallback((message: LocalRoomSocketMessage) => {
    try {
      clientRef.current?.send(message);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر إرسال الأمر إلى المضيف.");
    }
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
    stopDiscoveringRef.current?.();
    stopPublishingRef.current?.();
    clientRef.current?.disconnect();
    void hostRef.current?.stop();
  }, []);

  const value = useMemo<LocalRoomContextValue>(() => ({
    status,
    role,
    members,
    localSeat,
    roomDetails,
    roomQrData: roomDetails ? roomDetailsToQrData(roomDetails) : null,
    error,
    discoveredRooms,
    isNativeSupported,
    createRoom,
    joinRoom,
    startRoomMatch,
    leaveRoom,
    discoverRooms,
    stopDiscovering,
    requestBid,
    requestTrump,
    requestCard,
    requestNextTrick,
    requestNextRound,
  }), [createRoom, discoverRooms, discoveredRooms, error, isNativeSupported, joinRoom, leaveRoom, localSeat, members, requestBid, requestCard, requestNextRound, requestNextTrick, requestTrump, role, roomDetails, startRoomMatch, status, stopDiscovering]);

  return <LocalRoomContext.Provider value={value}>{children}</LocalRoomContext.Provider>;
}

function isRoomMember(value: unknown): value is RoomMember {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.name === "string" && typeof candidate.connected === "boolean" && typeof candidate.seat === "number" && SEATS.includes(candidate.seat as Seat);
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
