import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const cardSource = readFileSync(join(process.cwd(), "components/tarneeb/card.tsx"), "utf8");

describe("player card readability", () => {
  it("uses larger face-card dimensions and suit symbols for the player's hand", () => {
    expect(cardSource).toContain('cardStage: { width: 68, height: 102 }');
    expect(cardSource).toContain('compactCardStage: { width: 54, height: 78 }');
    expect(cardSource).toContain('rank: { fontSize: 21');
    expect(cardSource).toContain('suit: { fontSize: 20');
    expect(cardSource).toContain('centerSuit: { alignSelf: "center", fontSize: 38');
    expect(cardSource).toContain('compactSuit: { fontSize: 17');
  });
});
