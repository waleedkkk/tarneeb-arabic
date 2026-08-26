import { getAiPersona } from "./personas";
import type { AiPersonaId, LocalRoomMember, NetworkPlayerConfig, Seat } from "./types";

export const LOCAL_ROOM_SEATS: Seat[] = [0, 1, 2, 3];
const DEFAULT_PERSONAS: Record<Seat, AiPersonaId> = { 0: "layaan", 1: "faris", 2: "samar", 3: "rania" };

export function partnerSeat(seat: Seat): Seat {
  return ((seat + 2) % 4) as Seat;
}

export function virtualMember(seat: Seat, personaId: AiPersonaId = DEFAULT_PERSONAS[seat]): LocalRoomMember {
  return { seat, name: getAiPersona(personaId).name, connected: false, isVirtual: true, personaId };
}

export function createFlexibleLobby(hostName: string): LocalRoomMember[] {
  return LOCAL_ROOM_SEATS.map((seat) => seat === 0
    ? { seat, name: hostName, connected: true, isVirtual: false }
    : virtualMember(seat));
}

export function connectedHumanCount(members: LocalRoomMember[]) {
  return members.filter((member) => member.connected && !member.isVirtual).length;
}

export function canStartFlexibleRoom(members: LocalRoomMember[]) {
  return connectedHumanCount(members) >= 2 && members.length === 4;
}

export function toNetworkPlayerConfig(members: LocalRoomMember[]): Record<Seat, NetworkPlayerConfig> {
  return LOCAL_ROOM_SEATS.reduce<Record<Seat, NetworkPlayerConfig>>((config, seat) => {
    const member = members.find((item) => item.seat === seat);
    if (!member) throw new Error(`المقعد ${seat + 1} غير موجود في الغرفة.`);
    if (member.connected && !member.isVirtual) {
      config[seat] = { name: member.name, isHuman: true };
      return config;
    }
    const personaId = member.personaId ?? DEFAULT_PERSONAS[seat];
    config[seat] = { name: getAiPersona(personaId).name, isHuman: false, personaId };
    return config;
  }, {} as Record<Seat, NetworkPlayerConfig>);
}
