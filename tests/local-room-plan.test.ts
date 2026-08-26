import { describe, expect, it } from "vitest";
import { createNetworkRound, createHomeState } from "../lib/tarneeb/engine";
import { canStartFlexibleRoom, connectedHumanCount, createFlexibleLobby, partnerSeat, toNetworkPlayerConfig, virtualMember } from "../lib/tarneeb/local-room-plan";

describe("تشكيل الغرفة المحلية المرنة", () => {
  it("يبدأ البهو بمضيف بشري وثلاثة مقاعد افتراضية", () => {
    const lobby = createFlexibleLobby("أحمد");

    expect(lobby).toHaveLength(4);
    expect(connectedHumanCount(lobby)).toBe(1);
    expect(lobby[0]).toMatchObject({ seat: 0, name: "أحمد", connected: true, isVirtual: false });
    expect(lobby.slice(1).every((member) => member.isVirtual && !member.connected)).toBe(true);
    expect(canStartFlexibleRoom(lobby)).toBe(false);
  });

  it("يبني مباراة للاعبين بشريين مع شريك افتراضي لكل منهما", () => {
    const lobby = createFlexibleLobby("أحمد").map((member) => {
      if (member.seat === 1) return { seat: 1 as const, name: "سارة", connected: true, isVirtual: false };
      return member.seat === 2 ? virtualMember(2, "nader") : member;
    });
    const config = toNetworkPlayerConfig(lobby);
    const round = createNetworkRound(createHomeState(), config, true);

    expect(canStartFlexibleRoom(lobby)).toBe(true);
    expect(config).toMatchObject({
      0: { name: "أحمد", isHuman: true },
      1: { name: "سارة", isHuman: true },
      2: { name: "نادر", isHuman: false, personaId: "nader" },
      3: { isHuman: false },
    });
    expect(round.players[2]).toMatchObject({ isHuman: false, personaId: "nader", name: "نادر" });
  });

  it("يضيف لاعبًا افتراضيًا واحدًا تلقائيًا عند اتصال ثلاثة بشر", () => {
    const lobby = createFlexibleLobby("أحمد").map((member) => {
      if (member.seat === 1) return { seat: 1 as const, name: "سارة", connected: true, isVirtual: false };
      if (member.seat === 2) return { seat: 2 as const, name: "خالد", connected: true, isVirtual: false };
      return member;
    });
    const config = toNetworkPlayerConfig(lobby);

    expect(connectedHumanCount(lobby)).toBe(3);
    expect(canStartFlexibleRoom(lobby)).toBe(true);
    expect(config[3]).toMatchObject({ isHuman: false, personaId: "rania" });
  });

  it("يحافظ على مباراة بشرية كاملة عندما تملأ الأجهزة الأربعة المقاعد", () => {
    const lobby = [
      { seat: 0 as const, name: "أحمد", connected: true, isVirtual: false },
      { seat: 1 as const, name: "سارة", connected: true, isVirtual: false },
      { seat: 2 as const, name: "خالد", connected: true, isVirtual: false },
      { seat: 3 as const, name: "نور", connected: true, isVirtual: false },
    ];
    const config = toNetworkPlayerConfig(lobby);
    const round = createNetworkRound(createHomeState(), config, true);

    expect(connectedHumanCount(lobby)).toBe(4);
    expect(round.players.every((player) => player.isHuman)).toBe(true);
  });

  it("يثبت الشراكة في المقاعد المتقابلة ويحتفظ بالشخصية الافتراضية المختارة", () => {
    expect(partnerSeat(0)).toBe(2);
    expect(partnerSeat(1)).toBe(3);
    expect(virtualMember(3, "nader")).toMatchObject({ isVirtual: true, personaId: "nader", name: "نادر" });
  });
});
