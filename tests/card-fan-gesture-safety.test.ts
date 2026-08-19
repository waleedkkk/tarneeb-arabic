import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

/** يحمي سحب/نقر البطاقة من خلط Pressable مع GestureDetector على Android. */
const cardFanPath = join(process.cwd(), "components/tarneeb/card-fan.tsx");
const src = readFileSync(cardFanPath, "utf8");

describe("card-fan.tsx: لا تعارض بين Pressable وGestureDetector", () => {
  it("لا يُمرَّر onPress إلى PlayingCard داخل المروحة", () => {
    const playingCardCall = src.match(/<PlayingCard[^]*?\/>/)?.[0] ?? "";
    expect(playingCardCall).not.toMatch(/onPress=/);
  });

  it("يركّب النقر والسحب عبر Gesture.Race في GestureDetector واحد", () => {
    expect(src).toMatch(/Gesture\.Race\(drag,\s*tap\)/);
    expect(src).toMatch(/<GestureDetector gesture=\{composedGesture\}>/);
  });

  it("يمرر pressSignal للوميض البصري بدل Pressable الداخلية", () => {
    const playingCardCall = src.match(/<PlayingCard[^]*?\/>/)?.[0] ?? "";
    expect(playingCardCall).toMatch(/pressSignal=/);
  });
});
