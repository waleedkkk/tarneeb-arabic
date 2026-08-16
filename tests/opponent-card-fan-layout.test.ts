import { describe, expect, it } from "vitest";
import { getOpponentCardFanLayout } from "../lib/tarneeb/opponent-card-fan-layout";

describe("مروحة أوراق الخصوم", () => {
  it("تعرض ورقة لكل عنصر متبقٍ في اليد حتى 13 ورقة", () => {
    expect(getOpponentCardFanLayout(13, "top")).toHaveLength(13);
    expect(getOpponentCardFanLayout(7, "left")).toHaveLength(7);
    expect(getOpponentCardFanLayout(0, "right")).toHaveLength(0);
  });

  it("تضغط تباعد المروحة الطويلة داخل مساحة ثابتة", () => {
    const shortHand = getOpponentCardFanLayout(4, "top");
    const fullHand = getOpponentCardFanLayout(13, "top");
    expect(fullHand[0].step).toBeLessThan(shortHand[0].step);
  });

  it("يحافظ على صف مستقيم ومتوازن في مقعد الشريك العلوي", () => {
    const layout = getOpponentCardFanLayout(5, "top");
    expect(layout.every((card) => card.rotation === 0)).toBe(true);
    expect(layout.every((card) => card.lift === 0)).toBe(true);
  });

  it("يغيّر تباعد أوراق الخصوم حسب كثافة التكديس المختارة", () => {
    const compact = getOpponentCardFanLayout(13, "right", "compact");
    const spacious = getOpponentCardFanLayout(13, "right", "spacious");

    expect(compact[0].step).toBeLessThan(spacious[0].step);
  });
});
