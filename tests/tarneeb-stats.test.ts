import { summarizeRoundRecords } from "../lib/tarneeb/stats";
import type { RoundRecord } from "../lib/tarneeb/types";
import { describe, expect, it } from "vitest";

const record = (patch: Partial<RoundRecord>): RoundRecord => ({
  roundNumber: 1,
  bid: 7,
  bidderName: "أنت",
  bidderTeam: 0,
  trump: "spades",
  madeContract: true,
  tricksTeam0: 7,
  tricksTeam1: 6,
  scoreChange0: 7,
  scoreChange1: 6,
  timestamp: 1,
  ...patch,
});

describe("إحصاءات طرنيب المحلية", () => {
  it("يلخص الجولات ونجاح طلبات فريق اللاعب دون خلط طلبات الخصم", () => {
    const summary = summarizeRoundRecords([
      record({ roundNumber: 3, tricksTeam0: 8, tricksTeam1: 5, scoreChange0: 8, scoreChange1: 5 }),
      record({ roundNumber: 2, bidderTeam: 1, bidderName: "ليان", bid: 7, tricksTeam0: 6, tricksTeam1: 7, scoreChange0: 6, scoreChange1: 7 }),
      record({ roundNumber: 1, bid: 9, madeContract: false, tricksTeam0: 5, tricksTeam1: 8, scoreChange0: -9, scoreChange1: 8 }),
    ]);

    expect(summary).toEqual({
      totalRounds: 3,
      ownContractAttempts: 2,
      ownContractsMade: 1,
      ownContractRate: 50,
      tricksTeam0: 19,
      tricksTeam1: 20,
      netScoreTeam0: 5,
    });
  });

  it("يعرض صفرًا مفهومًا عند عدم وجود سجل سابق", () => {
    expect(summarizeRoundRecords([])).toEqual({
      totalRounds: 0,
      ownContractAttempts: 0,
      ownContractsMade: 0,
      ownContractRate: 0,
      tricksTeam0: 0,
      tricksTeam1: 0,
      netScoreTeam0: 0,
    });
  });
});
