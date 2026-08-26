import { describe, expect, it } from "vitest";
import { createHomeState, createRound, hasCompletePlayerSeats } from "../lib/tarneeb/engine";

describe("حارس حالة المقاعد", () => {
  it("يقبل الجولة التي تضم المقاعد الأربعة وأيديهم", () => {
    expect(hasCompletePlayerSeats(createRound(createHomeState(), true))).toBe(true);
  });

  it("يرفض حالة مباراة ناقصة قبل وصولها إلى شاشة الطاولة", () => {
    const round = createRound(createHomeState(), true);
    expect(hasCompletePlayerSeats({ ...round, players: [] })).toBe(false);
    expect(hasCompletePlayerSeats({ ...round, players: round.players.slice(0, 3) })).toBe(false);
  });
});
