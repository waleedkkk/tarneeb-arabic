import { teamOf } from "./engine";
import type { MatchState, Seat, Team } from "./types";

const SEATS: Seat[] = [0, 1, 2, 3];

export interface RoomConnectionDetails {
  host: string;
  port: number;
  roomId: string;
  key: string;
}

function rotateSeat(seat: Seat, viewerSeat: Seat): Seat {
  return ((seat - viewerSeat + 4) % 4) as Seat;
}

function rotateRecord<T>(record: Record<Seat, T>, viewerSeat: Seat): Record<Seat, T> {
  return SEATS.reduce<Record<Seat, T>>((next, sourceSeat) => {
    next[rotateSeat(sourceSeat, viewerSeat)] = record[sourceSeat];
    return next;
  }, {} as Record<Seat, T>);
}

/** يرسل المضيف لكل لاعب يده فقط ويجعل فريقه يظهر دائمًا في جهة اللاعب. */
export function stateForViewer(source: MatchState, viewerSeat: Seat): MatchState {
  const viewerTeam = teamOf(viewerSeat);
  const remapSeat = (seat: Seat) => rotateSeat(seat, viewerSeat);
  const remapTeam = (team: Team): Team => (team === viewerTeam ? 0 : 1);
  const players = SEATS.map((localSeat) => {
    const sourceSeat = ((viewerSeat + localSeat) % 4) as Seat;
    const player = source.players[sourceSeat];
    return { ...player, id: localSeat, seat: localSeat, team: teamOf(localSeat), hand: localSeat === 0 ? player.hand : [] };
  });

  return {
    ...source,
    players,
    bidding: {
      ...source.bidding,
      currentPlayer: remapSeat(source.bidding.currentPlayer),
      highestBidder: source.bidding.highestBidder === null ? null : remapSeat(source.bidding.highestBidder),
      activeSeats: rotateRecord(source.bidding.activeSeats, viewerSeat),
      bids: source.bidding.bids.map((bid) => ({ ...bid, playerId: remapSeat(bid.playerId) })),
    },
    trick: { ...source.trick, leaderId: remapSeat(source.trick.leaderId), plays: source.trick.plays.map((play) => ({ ...play, playerId: remapSeat(play.playerId) })) },
    lastTrick: source.lastTrick ? { ...source.lastTrick, leaderId: remapSeat(source.lastTrick.leaderId), winnerId: remapSeat(source.lastTrick.winnerId), plays: source.lastTrick.plays.map((play) => ({ ...play, playerId: remapSeat(play.playerId) })) } : null,
    tricksWon: { 0: source.tricksWon[viewerTeam], 1: source.tricksWon[viewerTeam === 0 ? 1 : 0] },
    scores: { 0: source.scores[viewerTeam], 1: source.scores[viewerTeam === 0 ? 1 : 0] },
    roundSummary: source.roundSummary ? { ...source.roundSummary, bidderTeam: remapTeam(source.roundSummary.bidderTeam), roundTricks: { 0: source.roundSummary.roundTricks[viewerTeam], 1: source.roundSummary.roundTricks[viewerTeam === 0 ? 1 : 0] }, scoreChange: { 0: source.roundSummary.scoreChange[viewerTeam], 1: source.roundSummary.scoreChange[viewerTeam === 0 ? 1 : 0] } } : null,
  };
}

export function roomDetailsToQrData(details: RoomConnectionDetails) {
  return `tarneeb://local?host=${encodeURIComponent(details.host)}&port=${details.port}&room=${encodeURIComponent(details.roomId)}&key=${encodeURIComponent(details.key)}`;
}

export function parseRoomQrData(value: string): RoomConnectionDetails | null {
  const normalized = value.trim();
  if (!normalized.startsWith("tarneeb://local?")) return null;
  const parameters = new URLSearchParams(normalized.slice("tarneeb://local?".length));
  const host = parameters.get("host")?.trim() ?? "";
  const port = Number(parameters.get("port"));
  const roomId = parameters.get("room")?.trim() ?? "";
  const key = parameters.get("key")?.trim() ?? "";
  const validIpv4 = /^\d{1,3}(\.\d{1,3}){3}$/.test(host) && host.split(".").every((part) => Number(part) <= 255);
  if (!validIpv4 || !Number.isInteger(port) || port < 1024 || port > 65535 || !roomId || !key) return null;
  return { host, port, roomId, key };
}
